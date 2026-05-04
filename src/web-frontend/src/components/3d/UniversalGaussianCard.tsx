/**
 * 通用高斯泼溅卡片组件 - 基于Spark 2.0渲染管线
 * 适用于画廊、列表、网格等所有6种布局模式
 * 
 * 核心特性：
 * - 使用SparkRenderer专用渲染器（非普通WebGL）
 * - 智能自适应居中算法
 * - 支持GLB和SPZ两种格式
 * - 统一的加载动画和错误处理
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import './UniversalGaussianCard.css';

// 模型格式类型
type ModelFormat = 'spz' | 'glb' | 'gltf';

// 组件Props接口
interface UniversalGaussianCardProps {
  // 模型URL
  modelUrl: string;
  
  // 显示信息
  title: string;
  subtitle?: string;
  description?: string;
  
  // 配置选项
  autoRotate?: boolean;
  enableControls?: boolean;
  showStats?: boolean;
  backgroundColor?: string;
  
  // 布局适配
  layout?: 'grid' | 'list' | 'carousel' | 'gallery' | 'compact' | 'featured';
  
  // 回调函数
  onClick?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

// 智能居中配置
interface FitConfig {
  margin: number;          // 边距系数（1.15 = 15%边距）
  trimThreshold: number;   // 裁剪阈值（5%）
  preferAxis: 'auto' | 'x' | 'y' | 'z'; // 优先轴向
}

export function UniversalGaussianCard({
  modelUrl,
  title,
  subtitle,
  // description,  // 未使用，已注释
  autoRotate = true,
  enableControls = true,
  showStats = false,
  backgroundColor = '#0f0f23',
  layout = 'grid',
  onClick,
  onLoadComplete,
  onError,
}: UniversalGaussianCardProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sparkRendererRef = useRef<SparkRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | SplatMesh | null>(null);
  const frameIdRef = useRef<number>(0);

  // 状态
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [fps, setFps] = useState(0);

  // FPS计数器
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({ 
    count: 0, 
    lastTime: performance.now() 
  });

  // 判断模型格式
  const getFormat = useCallback((url: string): ModelFormat => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'spz') return 'spz';
    if (ext === 'glb') return 'glb';
    if (ext === 'gltf') return 'gltf';
    return 'spz'; // 默认
  }, []);

  // 智能自适应居中算法
  const smartFitCameraToObject = useCallback(
    (object: THREE.Object3D, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, config: FitConfig = { margin: 2.5, trimThreshold: 0.05, preferAxis: 'auto' }) => {
      console.log(' 开始智能居中算法...');
      
      // Step 1: 计算精确包围盒
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      console.log('📦 模型包围盒:', { size: size.toArray(), center: center.toArray() });
      
      // 如果包围盒无效（尺寸为0或NaN），使用默认值
      if (size.x === 0 && size.y === 0 && size.z === 0) {
        console.log('⚠️ 包围盒无效，使用默认尺寸');
        size.set(1, 1, 1);
        center.set(0, 0, 0);
      }

      // Step 2: 智能裁剪空白区域
      const trimmedSize = trimEmptySpace(object, box, config.trimThreshold);
      console.log('✂️ 裁剪后尺寸:', trimmedSize.toArray());

      // Step 3: 计算最佳相机距离（参考首页，使用固定margin）
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      const aspect = canvasWidth / canvasHeight;
      const fovRad = camera.fov * Math.PI / 180;
      
      console.log('📐 画布尺寸:', { canvasWidth, canvasHeight, aspect, fov: camera.fov });
      
      // 根据画布比例选择主导维度
      const dominantSize = Math.max(trimmedSize.x, trimmedSize.y, trimmedSize.z);
      
      // 使用固定的margin值，不再根据模型类型调整
      let distance;
      if (object instanceof SplatMesh) {
        // SplatMesh: 使用标准margin
        distance = Math.max(3, dominantSize * config.margin);
        console.log(' SplatMesh相机距离:', distance);
      } else {
        // 传统模型: 使用FOV计算
        distance = (dominantSize / 2 / Math.tan(fovRad / 2)) * config.margin;
        console.log(' 传统模型相机距离:', distance);
      }

      // Step 4: 相机从正面（Z轴）观察，不调整角度
      const cameraOffset = new THREE.Vector3(0, 0, distance);
      console.log(' 相机从正面观察（Z轴方向）');
      console.log(' 相机偏移:', cameraOffset.toArray());

      // Step 5: 设置相机位置
      const finalPosition = center.clone().add(cameraOffset);
      console.log('📸 相机位置:', finalPosition.toArray());
      
      camera.position.copy(finalPosition);
      camera.lookAt(center);
      
      // 关键：确保相机Y轴向上，避免任何旋转
      camera.up.set(0, 1, 0);
      camera.updateProjectionMatrix();

      // Step 6: 参考首页SparkViewer，不做任何旋转调整
      // 让模型保持原始姿态，相机从正面观察
      object.rotation.set(0, 0, 0);
      object.quaternion.set(1, 0, 0, 0); // 重置旋转为单位四元数
      console.log('✅ 模型保持原始姿态，不做旋转调整');

      // 更新控制器
      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }

      console.log('✅ 居中算法完成');
      return { center, distance, trimmedSize };
    },
    []
  );

  // 智能裁剪空白区域
  const trimEmptySpace = useCallback(
    (object: THREE.Object3D, originalBox: THREE.Box3, threshold: number): THREE.Vector3 => {
      const originalSize = originalBox.getSize(new THREE.Vector3());
      console.log('🔍 原始包围盒尺寸:', originalSize);
      
      // 对于SplatMesh，也进行百分位数裁剪
      if (object instanceof SplatMesh) {
        // 尝试获取SplatMesh的顶点信息
        const splatMesh = object as any;
        if (splatMesh.geometry && splatMesh.geometry.attributes.position) {
          const positions = splatMesh.geometry.attributes.position;
          const vertices: THREE.Vector3[] = [];
          
          for (let i = 0; i < positions.count; i++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, i);
            object.localToWorld(vertex);
            vertices.push(vertex);
          }
          
          if (vertices.length > 0) {
            console.log('📊 SplatMesh顶点数量:', vertices.length);
            
            // 计算百分位数
            const xs = vertices.map(v => v.x).sort((a, b) => a - b);
            const ys = vertices.map(v => v.y).sort((a, b) => a - b);
            const zs = vertices.map(v => v.z).sort((a, b) => a - b);
            
            const trimIndex = Math.floor(vertices.length * threshold);
            
            const trimmedBox = new THREE.Box3(
              new THREE.Vector3(xs[trimIndex], ys[trimIndex], zs[trimIndex]),
              new THREE.Vector3(
                xs[xs.length - 1 - trimIndex],
                ys[ys.length - 1 - trimIndex],
                zs[zs.length - 1 - trimIndex]
              )
            );
            
            const trimmedSize = trimmedBox.getSize(new THREE.Vector3());
            console.log('️ 裁剪后尺寸:', trimmedSize);
            return trimmedSize;
          }
        }
        
        // 如果无法获取顶点，返回原始尺寸
        console.log('️ 无法获取SplatMesh顶点，使用原始包围盒');
        return originalSize;
      }

      // 对于GLB模型，收集顶点进行裁剪
      const vertices: THREE.Vector3[] = [];
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const positions = child.geometry.attributes.position;
          if (positions) {
            for (let i = 0; i < positions.count; i++) {
              const vertex = new THREE.Vector3();
              vertex.fromBufferAttribute(positions, i);
              child.localToWorld(vertex);
              vertices.push(vertex);
            }
          }
        }
      });

      if (vertices.length === 0) {
        return originalBox.getSize(new THREE.Vector3());
      }

      // 计算顶点分布的百分位数
      const xs = vertices.map(v => v.x).sort((a, b) => a - b);
      const ys = vertices.map(v => v.y).sort((a, b) => a - b);
      const zs = vertices.map(v => v.z).sort((a, b) => a - b);

      const trimIndex = Math.floor(vertices.length * threshold);
      
      const trimmedBox = new THREE.Box3(
        new THREE.Vector3(xs[trimIndex], ys[trimIndex], zs[trimIndex]),
        new THREE.Vector3(
          xs[xs.length - 1 - trimIndex],
          ys[ys.length - 1 - trimIndex],
          zs[zs.length - 1 - trimIndex]
        )
      );

      return trimmedBox.getSize(new THREE.Vector3());
    },
    []
  );

  // 初始化场景
  const initScene = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return false;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(0, 0, 5);
    camera.up.set(0, 1, 0); // 关键：设置Y轴向上，避免模型倒立
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 创建SparkRenderer（关键：使用Spark 2.0专用渲染管线）
    const sparkRenderer = new SparkRenderer({ renderer });
    sparkRendererRef.current = sparkRenderer;
    scene.add(sparkRenderer);

    // 添加控制器
    if (enableControls) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1;
      
      // 关键修复：限制仰角范围，防止从下方或正上方看（避免看到底座）
      controls.minPolarAngle = Math.PI / 4; // 最小仰角45度（防止从下方看）
      controls.maxPolarAngle = Math.PI / 2.5; // 最大仰角72度（防止从正上方看）
      
      // 允许水平360度自由旋转
      controls.minAzimuthAngle = -Infinity; // 无限制
      controls.maxAzimuthAngle = Infinity; // 无限制
      
      controls.enablePan = false; // 禁止平移，保持模型居中
      
      controlsRef.current = controls;
    }

    return true;
  }, [backgroundColor, enableControls, autoRotate]);

  // 加载SPZ模型（高斯泼溅）
  const loadSplatModel = useCallback(async () => {
    if (!sparkRendererRef.current) return;

    try {
      setLoading(true);
      setError(null);
      setProgress(10);

      // 创建SplatMesh
      const splat = new SplatMesh({
        url: modelUrl,
        onProgress: (event) => {
          if (event.lengthComputable) {
            setProgress(10 + Math.round((event.loaded / event.total) * 80));
          }
        }
      });
      modelRef.current = splat;

      // 添加到SparkRenderer
      sparkRendererRef.current.add(splat);

      // 等待初始化完成
      await splat.initialized;
      console.log('✅ SplatMesh初始化完成');
      
      // 等待一帧渲染，确保包围盒计算正确
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 100));

      // 智能居中
      if (cameraRef.current && canvasRef.current) {
        console.log(' 开始执行智能居中...');
        
        // 使用标准margin，不再根据模型类型调整
        const margin = 2.5;
        console.log(' 使用标准margin:', margin);
        
        smartFitCameraToObject(splat, cameraRef.current, canvasRef.current, {
          margin: margin,
          trimThreshold: 0.05,
          preferAxis: 'auto'
        });
      }
      
      // 再次等待一帧，确保相机更新生效
      await new Promise(resolve => requestAnimationFrame(resolve));

      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        onLoadComplete?.();
      }, 300);
    } catch (err) {
      console.error('Splat model load error:', err);
      setError((err as Error).message);
      setLoading(false);
      onError?.(err as Error);
    }
  }, [modelUrl, smartFitCameraToObject, onLoadComplete, onError]);

  // 加载GLB模型（传统3D）
  const loadGLBModel = useCallback(async () => {
    if (!sceneRef.current || !rendererRef.current) return;

    try {
      setLoading(true);
      setError(null);
      setProgress(50);

      // 使用Three.js的GLTFLoader加载
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
          modelRef.current = model;
          sceneRef.current?.add(model);

          // 智能居中
          if (cameraRef.current && canvasRef.current) {
            smartFitCameraToObject(model, cameraRef.current, canvasRef.current, {
              margin: 1.20,
              trimThreshold: 0.05,
              preferAxis: 'auto'
            });
          }

          setProgress(100);
          setTimeout(() => {
            setLoading(false);
            setModelLoaded(true);
            onLoadComplete?.();
          }, 300);
        },
        (progress) => {
          if (progress.total > 0) {
            setProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
        (error) => {
          throw error;
        }
      );
    } catch (err) {
      console.error('GLB model load error:', err);
      setError((err as Error).message);
      setLoading(false);
      onError?.(err as Error);
    }
  }, [modelUrl, smartFitCameraToObject, onLoadComplete, onError]);

  // 动画循环
  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const sparkRenderer = sparkRendererRef.current;
    const controls = controlsRef.current;

    if (!camera || !renderer || !scene) return;

    // 更新控制器
    if (controls) {
      controls.update();
    }

    // 使用SparkRenderer渲染（如果是SplatMesh）
    if (sparkRenderer && modelRef.current instanceof SplatMesh) {
      sparkRenderer.update({ scene, camera });
      sparkRenderer.render(scene, camera);
    } else {
      // 普通Three.js渲染（GLB模型）
      renderer.render(scene, camera);
    }

    // 更新FPS
    fpsCounterRef.current.count++;
    const now = performance.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    if (elapsed >= 1000) {
      setFps(Math.round((fpsCounterRef.current.count * 1000) / elapsed));
      fpsCounterRef.current.count = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, []);

  // 初始化
  useEffect(() => {
    const timer = setTimeout(() => {
      const success = initScene();
      if (success) {
        const format = getFormat(modelUrl);
        if (format === 'spz') {
          loadSplatModel();
        } else {
          loadGLBModel();
        }
        animate();
      } else {
        setError('Failed to initialize 3D viewer');
        setLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameIdRef.current);

      // 清理资源
      if (modelRef.current) {
        try {
          if (modelRef.current instanceof SplatMesh) {
            modelRef.current.dispose?.();
          } else {
            modelRef.current.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                  child.material.forEach(m => m.dispose());
                } else {
                  child.material?.dispose();
                }
              }
            });
          }
        } catch (e) {
          console.warn('Model cleanup warning:', e);
        }
      }

      if (sparkRendererRef.current) {
        sparkRendererRef.current = null;
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  }, [initScene, getFormat, modelUrl, loadSplatModel, loadGLBModel, animate]);

  // 窗口大小调整
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 根据布局类型返回不同的CSS类
  const getLayoutClass = () => {
    switch (layout) {
      case 'grid': return 'card-layout-grid';
      case 'list': return 'card-layout-list';
      case 'carousel': return 'card-layout-carousel';
      case 'gallery': return 'card-layout-gallery';
      case 'compact': return 'card-layout-compact';
      case 'featured': return 'card-layout-featured';
      default: return 'card-layout-grid';
    }
  };

  return (
    <div 
      className={`universal-gaussian-card ${getLayoutClass()}`}
      onClick={onClick}
    >
      <div className="card-canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} className="card-canvas" />
          
        {/* 标题叠加层 - 显示在3D画布上方，不占据额外空间 */}
        <div className="card-title-overlay">
          <h3 className="card-overlay-title">{title}</h3>
          {subtitle && <p className="card-overlay-subtitle">{subtitle}</p>}
        </div>
          
        {/* 加载动画 */}
        {loading && (
          <div className="card-loading-overlay">
            <div className="card-loading-spinner" />
            <div className="card-loading-progress">
              <div className="card-loading-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="card-loading-text">加载中... {progress}%</span>
          </div>
        )}
  
        {/* 错误提示 */}
        {error && (
          <div className="card-error-overlay">
            <span className="card-error-icon">⚠️</span>
            <span className="card-error-text">{error}</span>
          </div>
        )}
  
        {/* 统计信息 */}
        {showStats && modelLoaded && (
          <div className="card-stats">
            <span className="card-stats-fps">FPS: {fps}</span>
            <span className="card-stats-badge">Spark 2.0</span>
          </div>
        )}
      </div>
  
      {/* 移除原来的卡片信息区域，节省空间 */}
    </div>
  );
}
