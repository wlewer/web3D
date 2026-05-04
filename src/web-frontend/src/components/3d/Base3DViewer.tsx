/**
 * Base3DViewer - 基础3D查看器（完全重构版）
 * 
 * 功能：纯3D渲染核心，无装饰功能
 * 特点：
 * - 集成SparkRenderer（支持SplatMesh高斯泼溅模型）
 * - 完整灯光系统（环境光、方向光、补光等）
 * - 支持SPZ/GLB/PLY多种格式
 * - forwardRef支持
 * - 完整的TypeScript类型
 * 
 * 适用场景：
 * - 后台管理系统
 * - 简单预览
 * - 需要自定义装饰的场景
 * 
 * @version 2.0.0
 * @author Lingma AI Assistant
 * @date 2026-04-18
 */

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { SmartCenteringEngine, type FitConfig } from './engines/SmartCenteringEngine';
import { ModelLoader, type LoadProgress, type LoadResult } from './engines/ModelLoader';
import { CameraManager, type CameraConfig } from './engines/CameraManager';

export interface Base3DViewerProps {
  // ========== 核心必选 ==========
  modelUrl: string;  // 模型URL
  
  // ========== 相机控制 ==========
  autoCenter?: boolean;     // 智能居中，默认true
  margin?: number;          // 相机距离倍数，默认2.5
  autoRotate?: boolean;     // 自动旋转，默认false
  enableControls?: boolean; // 启用控制器，默认true
  
  // ========== UI配置 ==========
  backgroundColor?: string; // 背景色，默认'#0a0a0f'
  width?: string | number;  // 宽度，默认'100%'
  height?: string | number; // 高度，默认'100%'
  
  // ========== 事件回调 ==========
  onLoadComplete?: () => void;    // 加载完成
  onError?: (error: Error) => void; // 加载错误
  onProgress?: (progress: number) => void; // 加载进度（0-100）
}

export interface Base3DViewerRef {
  getModel: () => THREE.Object3D | SplatMesh | null;
  reload: () => void;
  toggleAutoRotate: () => void;
  screenshot: () => string;
  saveCameraConfig: () => CameraConfig;
  loadCameraConfig: (config: CameraConfig) => void;
  resetCamera: () => void;
}

/**
 * 基础3D查看器组件
 */
export const Base3DViewer = forwardRef<Base3DViewerRef, Base3DViewerProps>(({
  modelUrl,
  autoCenter = true,
  margin = 2.5,
  autoRotate = false,
  enableControls = true,
  backgroundColor = '#0a0a0f',
  width = '100%',
  height = '100%',
  onLoadComplete,
  onError,
  onProgress,
}, ref) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sparkRef = useRef<SparkRenderer | null>(null);  // ★ 新增：SparkRenderer
  const modelRef = useRef<THREE.Object3D | SplatMesh | null>(null);
  const frameIdRef = useRef<number>(0);

  // State
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  // FPS计数器
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({
    count: 0,
    lastTime: performance.now()
  });
  const [fps, setFps] = useState(0);

  // ★ 新增：Spark渲染状态管理
  const sparkReadyRef = useRef(false);
  const sparkFailedRef = useRef(false);
  const renderingLockRef = useRef(false);

  /**
   * 初始化Three.js场景（完全重构：添加SparkRenderer和灯光系统）
   */
  const initScene = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 清理旧场景
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    if (controlsRef.current) {
      controlsRef.current.dispose();
    }

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ★ 关键修复：添加完整的灯光系统（参考UniversalGaussianCardV2）
    // 环境光 - 基础照明
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);

    // 主方向光 - 从右上方照射，产生立体感
    const mainLight = new THREE.DirectionalLight('#ffffff', 1.2);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = false;
    scene.add(mainLight);

    // 补光 - 从左下方照射，减少阴影
    const fillLight = new THREE.DirectionalLight('#aabbff', 0.4);
    fillLight.position.set(-3, -2, -3);
    scene.add(fillLight);

    // 顶部光 - 增强立体感
    const topLight = new THREE.DirectionalLight('#ffffff', 0.3);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    // 半球光 - 模拟天空和地面的反射
    const hemisphereLight = new THREE.HemisphereLight('#667eea', '#1a1a2e', 0.3);
    scene.add(hemisphereLight);

    console.log(' 灯光系统已初始化');

    // 创建相机（使用CameraManager）
    const { camera, controls } = CameraManager.createCamera(canvasRef.current, {
      fov: 60,
      near: 0.1,
      far: 1000,
      enableControls,
      autoRotate
    });
    cameraRef.current = camera;
    controlsRef.current = controls;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // ★ 关键修复：创建SparkRenderer并添加到场景
    const spark = new SparkRenderer({ renderer });
    sparkRef.current = spark;
    scene.add(spark);

    console.log('✨ SparkRenderer已创建并添加到场景');
    console.log('🎨 Base3DViewer场景初始化完成');
  }, [enableControls, autoRotate]);

  /**
   * 加载模型（完全重构：区分SplatMesh和Object3D处理）
   */
  const loadModel = useCallback(async () => {
    if (!sceneRef.current || !cameraRef.current || !canvasRef.current) {
      console.warn('⚠️ 场景未初始化，跳过模型加载');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setModelLoaded(false);

      console.log(`📦 开始加载模型: ${modelUrl}`);

      // 使用ModelLoader加载模型
      const result: LoadResult = await ModelLoader.load(modelUrl, (progressData: LoadProgress) => {
        setProgress(progressData.progress);
        onProgress?.(progressData.progress);
      });

      // 清除旧模型
      if (modelRef.current) {
        if (modelRef.current instanceof SplatMesh) {
          // SplatMesh清理
          try {
            (modelRef.current as any).dispose?.();
          } catch (e) {
            console.warn('SplatMesh清理警告:', e);
          }
        } else {
          sceneRef.current.remove(modelRef.current);
        }
        modelRef.current = null;
      }

      // ★ 关键修复：根据模型类型不同处理
      if (result.model instanceof SplatMesh) {
        // SPZ模型：添加到SparkRenderer
        console.log(' SplatMesh模型：添加到SparkRenderer');
        modelRef.current = result.model;
        sparkRef.current?.add(result.model);
        
        // ★ 关键修复：SplatMesh默认可能是倒立的，需要翻转
        result.model.rotation.x = Math.PI;
        console.log('🔄 SplatMesh已翻转（绕X轴180度）');
      } else {
        // GLB/PLY模型：添加到Scene
        console.log('📦 普通模型：添加到Scene');
        modelRef.current = result.model as THREE.Object3D;
        sceneRef.current.add(modelRef.current);
      }

      console.log('✅ 模型加载成功，开始智能居中');

      // 智能居中（使用SmartCenteringEngine）
      if (autoCenter) {
        const fitConfig: FitConfig = {
          margin,
          trimThreshold: 0.05,
          preferAxis: 'auto',
          autoCenter: true
        };

        const fitResult = SmartCenteringEngine.calculateFit(
          result.model,
          canvasRef.current,
          fitConfig
        );

        // 应用相机位置
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.copy(fitResult.cameraPosition);
          controlsRef.current.target.copy(fitResult.targetPosition);
          controlsRef.current.update();
          
          console.log('📷 智能居中完成', {
            position: fitResult.cameraPosition,
            target: fitResult.targetPosition
          });
        }
      }

      setLoading(false);
      setModelLoaded(true);
      setProgress(100); // 确保进度显示100%
      onLoadComplete?.();

      console.log('✅ 模型加载和居中对齐完成', { loading: false, modelLoaded: true });
    } catch (err) {
      console.error('❌ 模型加载失败:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [modelUrl, autoCenter, margin, onProgress, onLoadComplete, onError]);

  /**
   * 动画循环（完全重构：集成SparkRenderer渲染）
   */
  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    const { camera, renderer, controls, spark } = {
      camera: cameraRef.current,
      renderer: rendererRef.current,
      controls: controlsRef.current,
      spark: sparkRef.current,
    };

    if (!camera || !renderer || !sceneRef.current) return;

    // 更新控制器
    if (controls) {
      controls.update();
    }

    // ★ 关键修复：使用SparkRenderer渲染SplatMesh，降级到普通Three.js渲染GLB
    if (spark && !sparkFailedRef.current && modelRef.current && !renderingLockRef.current) {
      // 使用SparkRenderer渲染（支持SplatMesh）
      renderingLockRef.current = true;
      spark.update({ scene: sceneRef.current, camera })
        .then(() => {
          spark.render(sceneRef.current, camera);
          renderingLockRef.current = false;
        })
        .catch(() => {
          renderingLockRef.current = false;
          sparkFailedRef.current = true;
          console.warn('⚠️ SparkRenderer渲染失败，降级到普通渲染');
        });
      sparkReadyRef.current = true;
    } else if (sceneRef.current && camera && renderer) {
      // 降级到普通Three.js渲染（GLB模型）
      renderer.render(sceneRef.current, camera);
    }

    // FPS计数
    fpsCounterRef.current.count++;
    const now = performance.now();
    if (now - fpsCounterRef.current.lastTime >= 1000) {
      setFps(fpsCounterRef.current.count);
      fpsCounterRef.current.count = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, []);

  /**
   * 处理窗口大小变化
   */
  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current || !canvasRef.current) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  // 场景初始化状态
  const [sceneInitialized, setSceneInitialized] = useState(false);

  // 初始化场景
  useEffect(() => {
    initScene();
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    // 启动动画循环
    animate();

    // 标记场景已初始化，触发模型加载
    setSceneInitialized(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      
      // 清理资源
      if (modelRef.current) {
        if (modelRef.current instanceof SplatMesh) {
          // SplatMesh清理
          try {
            (modelRef.current as any).dispose?.();
          } catch (e) {
            console.warn('SplatMesh清理警告:', e);
          }
        } else if (sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
        }
        modelRef.current = null;
      }
      if (sparkRef.current) {
        sparkRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
      
      console.log('🗑️ Base3DViewer资源已清理');
    };
  }, [initScene, handleResize, animate]);

  // 加载模型（在场景初始化后加载）
  useEffect(() => {
    if (sceneInitialized && modelUrl && !modelLoaded) {
      console.log('🎯 场景已初始化，开始加载模型:', modelUrl);
      loadModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneInitialized, modelUrl]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getModel: () => modelRef.current,
    
    reload: () => {
      if (modelRef.current) {
        if (modelRef.current instanceof SplatMesh) {
          // SplatMesh清理
          try {
            (modelRef.current as any).dispose?.();
          } catch (e) {
            console.warn('SplatMesh清理警告:', e);
          }
        } else if (sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
        }
        modelRef.current = null;
      }
      loadModel();
    },
    
    toggleAutoRotate: () => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
      }
    },
    
    screenshot: () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        return rendererRef.current.domElement.toDataURL('image/png');
      }
      return '';
    },
    
    saveCameraConfig: (): CameraConfig => {
      if (!cameraRef.current || !controlsRef.current) {
        throw new Error('相机或控制器未初始化');
      }
      return CameraManager.saveConfig(cameraRef.current, controlsRef.current);
    },
    
    loadCameraConfig: (config: CameraConfig) => {
      if (!cameraRef.current || !controlsRef.current) {
        throw new Error('相机或控制器未初始化');
      }
      CameraManager.applyConfig(cameraRef.current, controlsRef.current, config);
    },
    
    resetCamera: () => {
      if (!cameraRef.current || !controlsRef.current) {
        throw new Error('相机或控制器未初始化');
      }
      CameraManager.resetCamera(cameraRef.current, controlsRef.current);
    }
  }));

  // 样式
  const containerStyle: React.CSSProperties = {
    width,
    height,
    backgroundColor,
    position: 'relative',
    overflow: 'hidden'
  };

  const canvasStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '14px',
    pointerEvents: 'none'
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />
      
      {/* 加载状态 */}
      {loading && (
        <div style={overlayStyle}>
          <div>加载中... {Math.round(progress || 0)}%</div>
        </div>
      )}
      
      {/* 错误状态 */}
      {error && (
        <div style={{ ...overlayStyle, color: '#ff4444' }}>
          <div>加载失败: {error}</div>
        </div>
      )}
      
      {/* FPS显示（开发模式） */}
      {import.meta.env.DEV && modelLoaded && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: '#00ff00',
          fontSize: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          FPS: {fps}
        </div>
      )}
    </div>
  );
});

Base3DViewer.displayName = 'Base3DViewer';
