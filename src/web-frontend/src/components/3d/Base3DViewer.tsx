/**
 * Base3DViewer - 基础3D查看器（最终修复版）
 * 
 * 功能：纯3D渲染核心 + 可选装饰模块
 * 特点：
 * - 集成SparkRenderer（支持SplatMesh高斯泼溅模型）
 * - 完整灯光系统（环境光、方向光、补光等）
 * - 支持SPZ/GLB/PLY多种格式
 * - ✅ 新增：SceneDecoration装饰模块（粒子、展示台、标签）
 * - forwardRef支持
 * - 完整的TypeScript类型
 * - ✅ 完全对齐UniversalGaussianCardV2的实现
 * 
 * @version 2.2.0
 * @author Lingma AI Assistant
 * @date 2026-04-18
 */

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import TWEEN, { Tween, Easing } from '@tweenjs/tween.js';  // ✅ 对齐V2：平滑过渡动画
import { SmartCenteringEngine, type FitConfig } from './engines/SmartCenteringEngine';
import { ModelLoader, type LoadProgress, type LoadResult } from './engines/ModelLoader';
import { CameraManager, type CameraConfig } from './engines/CameraManager';
import { SceneDecoration, type DecorationConfig } from './engines/SceneDecoration';

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
  showTitle?: boolean;      // ✅ 对齐V2：标题叠加层，默认true
  title?: string;           // ✅ 对齐V2：标题文本
  subtitle?: string;        // ✅ 对齐V2：副标题文本
  showStats?: boolean;      // ✅ 对齐V2：统计信息显示，默认true
  
  // ========== 场景装饰（新增）==========
  decorations?: DecorationConfig; // 装饰配置（粒子、展示台、标签）
  
  // ========== 相机配置保存 ==========
  customCameraConfig?: CameraConfig | null;  // ✅ 对齐V2：自定义相机配置（优先使用）
  
  // ========== 事件回调 ==========
  onLoadComplete?: () => void;    // 加载完成
  onError?: (error: Error) => void; // 加载错误
  onProgress?: (progress: number) => void; // 加载进度（0-100）
  onClick?: () => void;           // ✅ 对齐V2：单击事件
  onDoubleClick?: () => void;     // ✅ 对齐V2：双击事件
  onInteraction?: () => void;     // ✅ 对齐V2：用户交互通知
}

export interface Base3DViewerRef {
  getModel: () => THREE.Object3D | SplatMesh | null;
  getStats: () => {
    pointCount: number;
    loaded: boolean;
    loading: boolean;
    progress: number;
    fps: number;
  };
  reload: () => void;
  toggleAutoRotate: () => void;
  screenshot: () => string;
  dispose: () => void;  // ✅ 对齐V2：释放资源方法
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
  showTitle = true,
  title,
  subtitle,
  showStats = true,
  decorations,
  customCameraConfig = null,
  onLoadComplete,
  onError,
  onProgress,
  onClick,
  onDoubleClick,
  onInteraction,
}, ref) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sparkRef = useRef<SparkRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | SplatMesh | null>(null);
  const frameIdRef = useRef<number>(0);
  
  // ✅ 新增：场景装饰管理器
  const decorationRef = useRef<SceneDecoration | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);  // ✅ 对齐V2：相机就绪状态
  const [loadingStage, setLoadingStage] = useState<'initializing' | 'loading' | 'processing' | 'rendering'>('initializing');  // ✅ 对齐V2：加载阶段
  const [isFadingOut, setIsFadingOut] = useState(false);  // ✅ 对齐V2：加载完成淡出状态
  
  // ✅ 对齐V2：使用状态机管理加载生命周期（防止重复加载和并发问题）
  const [stateMachine, setStateMachine] = useState<{
    state: 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'LOADING' | 'LOADED' | 'ERROR';
    currentModelUrl: string;
  }>({ 
    state: 'UNINITIALIZED',  // ✅ 对齐V2：使用UNINITIALIZED而不是IDLE
    currentModelUrl: '' 
  });

  // FPS计数器
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({
    count: 0,
    lastTime: performance.now()
  });
  const [fps, setFps] = useState(0);
  
  // ✅ 对齐V2：用户交互状态
  const isInteractingRef = useRef(false);
  
  // ✅ 对齐V2：相机配置管理引用（第1586-1587行）
  const prevConfigRef = useRef<CameraConfig | null>(null);
  const currentTweenRef = useRef<Tween | null>(null);  // 保存当前Tween动画引用

  // Spark渲染状态管理
  const sparkReadyRef = useRef(false);
  const sparkFailedRef = useRef(false);
  const renderingLockRef = useRef(false);

  // ========== 智能居中算法（核心） ==========

  // 百分位数裁剪（仅GLB模型）
  const trimEmptySpace = useCallback(
    (object: THREE.Object3D, originalBox: THREE.Box3, threshold: number): THREE.Vector3 => {
      const originalSize = originalBox.getSize(new THREE.Vector3());
      
      const vertices: THREE.Vector3[] = [];
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const positions = child.geometry.attributes.position;
          if (positions) {
            const maxVertices = 10000;
            const step = positions.count > maxVertices ? Math.ceil(positions.count / maxVertices) : 1;
            
            for (let i = 0; i < positions.count; i += step) {
              const vertex = new THREE.Vector3();
              vertex.fromBufferAttribute(positions, i);
              child.localToWorld(vertex);
              vertices.push(vertex);
            }
          }
        }
      });

      if (vertices.length === 0) return originalSize;

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

  // 智能自适应居中算法
  const smartFitCameraToObject = useCallback(
    (object: THREE.Object3D | SplatMesh, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, config: FitConfig) => {
      console.log(' 开始智能居中算法...');
      
      let boundingBox: THREE.Box3;
      let size = new THREE.Vector3(1, 1, 1);
      let center = new THREE.Vector3(0, 0, 0);
      
      try {
        if (object instanceof SplatMesh) {
          console.log(' SplatMesh：计算真实包围盒');
          boundingBox = new THREE.Box3().setFromObject(object);
          
          const newSize = boundingBox.getSize(new THREE.Vector3());
          const newCenter = boundingBox.getCenter(new THREE.Vector3());
          
          if (newSize.length() > 0 && !isNaN(newSize.length())) {
            size = newSize;
            center = newCenter;
            console.log(' SplatMesh包围盒尺寸:', size.toArray());
          } else {
            console.log(' 包围盒无效，使用扩展固定包围盒');
            boundingBox = new THREE.Box3(
              new THREE.Vector3(-3, -3, -3),
              new THREE.Vector3(3, 3, 3)
            );
            size = boundingBox.getSize(new THREE.Vector3());
            center = boundingBox.getCenter(new THREE.Vector3());
          }
        } else {
          console.log(' GLB模型：使用标准包围盒计算');
          boundingBox = new THREE.Box3().setFromObject(object);
          size = boundingBox.getSize(new THREE.Vector3());
          center = boundingBox.getCenter(new THREE.Vector3());
        }
        
        console.log(' 模型包围盒:', { size: size.toArray(), center: center.toArray() });

        if (size.x === 0 && size.y === 0 && size.z === 0) {
          console.log('️ 包围盒无效，使用默认尺寸');
          size.set(1, 1, 1);
          center.set(0, 0, 0);
        }
      } catch (error) {
        console.error(' 计算包围盒失败:', error);
        size.set(1, 1, 1);
        center.set(0, 0, 0);
      }

      let trimmedSize: THREE.Vector3;
      if (object instanceof SplatMesh) {
        console.log('️ SplatMesh：跳过裁剪');
        trimmedSize = size;
      } else {
        console.log(' GLB模型：执行百分位裁剪');
        trimmedSize = trimEmptySpace(object, boundingBox, config.trimThreshold);
        console.log(' 裁剪后尺寸:', trimmedSize.toArray());
      }

      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      const aspect = canvasWidth / canvasHeight;
      const fovRad = camera.fov * Math.PI / 180;
      
      console.log(' 画布尺寸:', { canvasWidth, canvasHeight, aspect, fov: camera.fov });
      
      const dominantSize = Math.max(trimmedSize.x, trimmedSize.y, trimmedSize.z);
      
      let distance;
      if (object instanceof SplatMesh) {
        distance = Math.max(2.0, dominantSize * config.margin * 0.7);
        console.log(' SplatMesh目标距离:', distance.toFixed(2));
      } else {
        distance = (dominantSize / 2 / Math.tan(fovRad / 2)) * config.margin * 0.8;
        console.log(' GLB模型目标距离:', distance.toFixed(2));
      }

      const cameraOffset = new THREE.Vector3(0, distance * 0.15, distance);
      console.log(' 相机从正面偏上观察（避免倒立）');
      console.log(' 相机偏移:', cameraOffset.toArray());

      camera.up.set(0, 1, 0);
      
      const targetPosition = new THREE.Vector3(
        center.x,
        center.y + distance * 0.15,
        center.z + distance
      );
      
      camera.position.copy(targetPosition);
      console.log(' 相机位置已设置:', targetPosition.toArray());
      
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      
      console.log(' 相机位置:', camera.position.toArray());
      console.log(' 观察目标:', center.toArray());
      console.log(' 相机已设置，up向量: (0, 1, 0)');

      if (!(object instanceof SplatMesh)) {
        console.log(' GLB模型保持原始姿态:', {
          rotation: object.rotation.toArray(),
          quaternion: object.quaternion.toArray()
        });
      } else {
        console.log(' SplatMesh模型保持原始姿态');
      }

      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
        console.log(' 控制器target已同步到模型中心:', center.toArray());
      }

      console.log('✅ 居中算法完成');
      return { center, distance, trimmedSize };
    },
    [trimEmptySpace]
  );

  /**
   * 初始化Three.js场景（完全对齐V2实现）
   */
  const initScene = useCallback((): boolean => {
    if (!containerRef.current || !canvasRef.current) return false;  // ✅ 对齐V2：返回false表示失败

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
    scene.background = new THREE.Color(backgroundColor);  // ✅ 修复1：设置背景色
    sceneRef.current = scene;

    // ✅ 修复：添加完整的灯光系统（参考UniversalGaussianCardV2）
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#ffffff', 1.2);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = false;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight('#aabbff', 0.4);
    fillLight.position.set(-3, -2, -3);
    scene.add(fillLight);

    const topLight = new THREE.DirectionalLight('#ffffff', 0.3);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    const hemisphereLight = new THREE.HemisphereLight('#667eea', '#1a1a2e', 0.3);
    scene.add(hemisphereLight);

    console.log('💡 灯光系统已初始化');

    // ✅ 修复2：创建相机（完全对齐V2配置）
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(0, 0.6, 4);  // 合理的初始位置，减少加载跳动
    camera.up.set(0, 1, 0);
    cameraRef.current = camera;

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

    // ✅ 修复3：完善OrbitControls配置（完全对齐V2）
    if (enableControls) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1;
      
      // 立即设置控制器目标点，防止加载过程中相机跳动
      controls.target.set(0, 0, 0);
      controls.update();
      
      // 加载过程中禁用控制器交互，防止相机位置被修改
      controls.enabled = false;
      
      // 仰角限制（对齐V2：允许完整的上下旋转）
      controls.minPolarAngle = 0;              // 允许从顶部看
      controls.maxPolarAngle = Math.PI;        // 允许从底部看
      
      // 水平360度自由旋转
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      
      controls.enablePan = false;
      
      controlsRef.current = controls;
      console.log('🎮 OrbitControls已配置完成');
    }

    // ✅ 对齐V2：标记相机和控制器已就绪
    setCameraReady(true);
    console.log(' 相机和控制器已初始化完成');

    // 创建SparkRenderer并添加到场景
    const spark = new SparkRenderer({ renderer });
    sparkRef.current = spark;
    scene.add(spark);

    console.log('✨ SparkRenderer已创建并添加到场景');
    
    // ✅ 新增：初始化场景装饰管理器
    if (!decorationRef.current) {
      decorationRef.current = new SceneDecoration(scene);
    }
    
    // ✅ 应用装饰配置（如果提供了）
    if (decorations) {
      decorationRef.current.apply(decorations);
    }
    
    console.log('🎨 Base3DViewer场景初始化完成');
    return true;  // ✅ 对齐V2：返回true表示成功
  }, [backgroundColor, enableControls, autoRotate, decorations]);

  /**
   * 加载SPZ模型（高斯泼溅）- 完全对齐V2第857-1006行
   */
  const loadSplatModel = useCallback(async () => {
    if (!sparkRef.current) return;

    let loadingTimedOut = false;
    let progressReceived = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    try {
      setError(null);
      setLoading(true);
      setModelLoaded(false);
      setProgress(10);
      setLoadingStage('initializing');  // 阶段1: 初始化
      
      // 关键修复：加载开始时立即禁用控制器，防止相机位置被修改
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
        console.log('🔒 加载开始：禁用控制器');
      }

      // 心跳进度（Vite dev server兼容）
      const heartbeatStart = Date.now();
      heartbeatTimer = setInterval(() => {
        if (loadingTimedOut) return;
        if (progressReceived) return;
        const elapsed = (Date.now() - heartbeatStart) / 1000;
        const simulated = 10 + (1 - Math.exp(-elapsed / 5)) * 65;
        setProgress(Math.min(75, Math.round(simulated)));
      }, 300);

      // 创建SplatMesh
      setLoadingStage('loading');  // 阶段2: 加载中
      const splat = new SplatMesh({
        url: modelUrl,
        onProgress: (event) => {
          if (loadingTimedOut) return;
          if (event.lengthComputable) {
            progressReceived = true;
            setProgress(10 + Math.round((event.loaded / event.total) * 80));
          }
        }
      });
      modelRef.current = splat;

      // 超时保护：25秒
      const timeoutGuard = setTimeout(() => {
        if (!loadingTimedOut) {
          loadingTimedOut = true;
          console.warn(`⚠️ Splat模型加载超时: ${modelUrl}`);
          setError('模型加载超时，请检查网络连接');
          setLoading(false);
          setModelLoaded(false);
        }
      }, 25000);

      // 关键优化：先等待初始化完成，再添加到场景和翻转
      await splat.initialized;
      clearTimeout(timeoutGuard);

      if (loadingTimedOut) return;

      // 清除心跳
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      setLoadingStage('processing');  // 阶段3: 处理中

      // 添加到SparkRenderer（在初始化完成后）
      sparkRef.current.add(splat);
      
      // 关键修复：SplatMesh默认可能是倒立的，需要翻转
      // 绕X轴旋转180度（π弧度）使其正向显示
      splat.rotation.x = Math.PI;
      console.log('🔄 SplatMesh已翻转（绕X轴180度）');

      // 关键优化：移除所有await等待，立即执行智能居中
      // 不再等待多帧渲染，直接计算包围盒和相机位置

      // ★ 关键修复：如果有自定义相机配置，跳过智能居中
      if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
        console.log('🎯 开始执行智能居中...');
        smartFitCameraToObject(splat, cameraRef.current, canvasRef.current, {
          margin: margin,
          trimThreshold: 0.05,
          preferAxis: 'auto',
          autoCenter: true
        });
        console.log('✅ 智能居中完成');
      } else if (customCameraConfig) {
        console.log('⏭️ 跳过智能居中：存在自定义相机配置');
      }

      setLoadingStage('rendering');  // 阶段4: 渲染中

      // 关键优化：模型加载完成后启用控制器交互
      if (controlsRef.current) {
        // 关键修复：智能居中算法已经同步了target，这里只需启用控制器
        controlsRef.current.enabled = true;
        console.log('🎯 控制器已启用');
      }

      setProgress(100);
      // 关键优化：先显示淡出动画，再隐藏加载界面
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);  // 重置淡出状态
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));  // ★ 状态机转换：进入LOADED状态
        onLoadComplete?.();
      }, 500);  // 淡出动画持续时间
    } catch (err) {
      console.error('❌ Splat model load error:', err);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      setStateMachine(prev => ({ ...prev, state: 'ERROR' }));  // ★ 状态机转换：进入ERROR状态
      if (!loadingTimedOut) {
        setError((err as Error).message);
        setLoading(false);
        onError?.(err as Error);
      }
    }
  }, [modelUrl, autoCenter, margin, smartFitCameraToObject, customCameraConfig, onLoadComplete, onError]);

  /**
   * 加载GLB模型 - 完全对齐V2第1009-1113行
   */
  const loadGLBModel = useCallback(async () => {
    if (!sceneRef.current || !rendererRef.current) return;

    try {
      setError(null);
      setLoading(true);
      setModelLoaded(false);
      setProgress(50);
      setLoadingStage('loading');  // 阶段1: 加载中
      
      // 关键修复：加载开始时立即禁用控制器，防止相机位置被修改
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
        console.log('🔒 加载开始：禁用控制器');
      }

      // 使用Three.js的GLTFLoader加载
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      loader.load(
        modelUrl,
        (gltf) => {
          setLoadingStage('processing');  // 阶段2: 处理中
          const model = gltf.scene;
          modelRef.current = model;
          sceneRef.current?.add(model);

          // ★ 关键修复：如果有自定义相机配置，跳过智能居中
          if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
            smartFitCameraToObject(model, cameraRef.current, canvasRef.current, {
              margin: margin,
              trimThreshold: 0.05,
              preferAxis: 'auto',
              autoCenter: true
            });
          } else if (customCameraConfig) {
            console.log('⏭️ 跳过智能居中：存在自定义相机配置');
          }

          setLoadingStage('rendering');  // 阶段3: 渲染中

          // 关键优化：模型加载完成后启用控制器交互
          if (controlsRef.current) {
            // 关键修复：智能居中算法已经同步了target，这里只需启用控制器
            controlsRef.current.enabled = true;
            console.log('🎯 控制器已启用');
          }

          setProgress(100);
          // 关键优化：先显示淡出动画，再隐藏加载界面
          setIsFadingOut(true);
          setTimeout(() => {
            setLoading(false);
            setModelLoaded(true);
            setIsFadingOut(false);  // 重置淡出状态
            setStateMachine(prev => ({ ...prev, state: 'LOADED' }));  // ★ 状态机转换：进入LOADED状态
            onLoadComplete?.();
          }, 500);  // 淡出动画持续时间
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
      console.error('❌ GLB model load error:', err);
      setStateMachine(prev => ({ ...prev, state: 'ERROR' }));  // ★ 状态机转换：进入ERROR状态
      setError((err as Error).message);
      setLoading(false);
      onError?.(err as Error);
    }
  }, [modelUrl, autoCenter, margin, smartFitCameraToObject, customCameraConfig, onLoadComplete, onError]);

  /**
   * 加载模型（根据URL后缀判断类型）- 完全对齐V2第1323-1343行
   */
  const loadModel = useCallback(() => {
    const isSplat = modelUrl.endsWith('.spz') || modelUrl.endsWith('.splat');
    const isGaussianSplatPLY = modelUrl.endsWith('.ply') && (
      modelUrl.includes('dragon') || 
      modelUrl.includes('scene') ||
      modelUrl.includes('butterfly')
    );
    
    if (isSplat) {
      loadSplatModel();
    } else if (isGaussianSplatPLY) {
      // ★ 关键修复：3D高斯泼溅格式的PLY文件使用SparkRenderer渲染
      console.log('🌟 检测到3D高斯泼溅PLY文件，使用SparkRenderer渲染');
      loadSplatModel();
    } else {
      // 默认使用GLB加载
      loadGLBModel();
    }
  }, [modelUrl, loadSplatModel, loadGLBModel]);

  /**
   * 动画循环（集成SparkRenderer渲染）
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

    // 使用SparkRenderer渲染SplatMesh，降级到普通Three.js渲染GLB
    if (spark && !sparkFailedRef.current && modelRef.current && !renderingLockRef.current) {
      renderingLockRef.current = true;
      const currentScene = sceneRef.current;  // ✅ 保存引用，防止异步回调时变成null
      if (currentScene) {
        spark.update({ scene: currentScene, camera })
          .then(() => {
            if (sceneRef.current) {  // ✅ 再次检查
              spark.render(sceneRef.current, camera);
            }
            renderingLockRef.current = false;
          })
          .catch(() => {
            renderingLockRef.current = false;
            sparkFailedRef.current = true;
            console.warn('⚠️ SparkRenderer渲染失败，降级到普通渲染');
          });
      } else {
        renderingLockRef.current = false;
      }
      sparkReadyRef.current = true;
    } else if (sceneRef.current && camera && renderer) {
      // 降级到普通Three.js渲染（GLB模型）
      renderer.render(sceneRef.current, camera);
    }

    // FPS计数（对齐V2：使用精确的elapsed时间）
    fpsCounterRef.current.count++;
    const now = performance.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    if (elapsed >= 1000) {
      setFps(Math.round((fpsCounterRef.current.count * 1000) / elapsed));
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

  // ✅ 移除sceneInitialized，改用状态机管理
  // const [sceneInitialized, setSceneInitialized] = useState(false);

  // 初始化场景
  useEffect(() => {
    initScene();
    
    window.addEventListener('resize', handleResize);
    
    animate();

    // ✅ 对齐V2：场景初始化完成后，进入READY状态（使用prev）
    setStateMachine(prev => ({ ...prev, state: 'READY' }));

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      
      // 清理资源
      if (modelRef.current) {
        if (modelRef.current instanceof SplatMesh) {
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
      
      // ✅ 新增：清理场景装饰
      if (decorationRef.current) {
        decorationRef.current.dispose();
        decorationRef.current = null;
      }
      
      console.log('🗑️ Base3DViewer资源已清理');
    };
  }, []);  // ✅ 完全对齐V2：空依赖，只执行一次

  // ✅ 对齐V2：用户交互检测（第1407-1447行）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let interactionTimeout: ReturnType<typeof setTimeout>;

    const handleInteractionStart = () => {
      isInteractingRef.current = true;
      
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }
      
      // ✅ 对齐V2：触发用户交互通知
      onInteraction?.();
      
      clearTimeout(interactionTimeout);
    };

    const handleInteractionEnd = () => {
      interactionTimeout = setTimeout(() => {
        isInteractingRef.current = false;
        if (controlsRef.current) {
          controlsRef.current.autoRotate = autoRotate;
        }
      }, 2000);
    };

    container.addEventListener('mousedown', handleInteractionStart);
    container.addEventListener('touchstart', handleInteractionStart);
    container.addEventListener('wheel', handleInteractionStart);
    container.addEventListener('mouseup', handleInteractionEnd);
    container.addEventListener('touchend', handleInteractionEnd);

    return () => {
      container.removeEventListener('mousedown', handleInteractionStart);
      container.removeEventListener('touchstart', handleInteractionStart);
      container.removeEventListener('wheel', handleInteractionStart);
      container.removeEventListener('mouseup', handleInteractionEnd);
      container.removeEventListener('touchend', handleInteractionEnd);
      clearTimeout(interactionTimeout);
    };
  }, [autoRotate]);

  // ✅ 对齐V2：相机配置应用函数（第1590-1725行）
  const applyCameraConfig = useCallback((config: CameraConfig) => {
    console.log('📹 [相机配置] 开始执行平滑过渡动画');
    console.log('📹 [相机配置] 目标配置:', JSON.stringify(config));
      
    if (!cameraRef.current || !controlsRef.current) {
      console.log('⚠️ [相机配置] 跳过：相机或控制器未初始化');
      return;
    }
    
    // ★ 关键修复：停止之前的动画（如果有的话）
    if (currentTweenRef.current) {
      currentTweenRef.current.stop();
      console.log('📹 [相机配置] 已停止旧的Tween动画');
    }
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;
        
    // ★ 关键修复：在应用配置前，先确保相机有一个合理的初始位置
    const targetCenter = new THREE.Vector3(
      config.target[0],
      config.target[1],
      config.target[2]
    );
    const currentPos = camera.position.clone();
    const distanceToTarget = currentPos.distanceTo(targetCenter);
    const targetDistance = new THREE.Vector3(
      config.position[0],
      config.position[1],
      config.position[2]
    ).distanceTo(targetCenter);
        
    console.log('📹 [相机配置] 当前相机位置:', {
      position: `[${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}]`,
      distanceToTarget: distanceToTarget.toFixed(2),
      targetDistance: targetDistance.toFixed(2),
      distanceFromOrigin: currentPos.length().toFixed(2)
    });
        
    // 如果相机距离目标太近(<目标距离的50%)，说明可能没有正确初始化，先重置
    if (distanceToTarget < targetDistance * 0.5 || currentPos.length() < 2.0) {
      console.log('⚠️ [相机配置] 相机位置异常，先重置到默认位置');
      const offset = new THREE.Vector3(0, 2, 6); // 默认偏移（更高更远）
      camera.position.copy(targetCenter).add(offset);
      controls.target.copy(targetCenter);
      controls.update();
      console.log('✅ [相机配置] 相机已重置到默认位置:', camera.position);
    }
    
    // 目标位置
    const targetPosition = new THREE.Vector3(
      config.position[0],
      config.position[1],
      config.position[2]
    );
    const targetTarget = new THREE.Vector3(
      config.target[0],
      config.target[1],
      config.target[2]
    );
    const targetZoom = config.zoom;
    
    // 起始位置（使用重置后的位置或当前位置）
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startZoom = camera.zoom;
    
    // 计算动画参数
    const distance = startPosition.distanceTo(targetPosition);
    const duration = Math.min(Math.max(distance * 500, 800), 1500);
    
    console.log(`📹 [相机配置] 开始相机过渡动画：`, {
      起点: `[${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)}]`,
      终点: `[${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}]`,
      距离: distance.toFixed(2),
      时长: `${duration}ms`
    });
    
    // ✅ 使用Tween.js实现平滑过渡（对齐V2）
    const tween = new Tween({
      progress: 0,
      pos: { x: startPosition.x, y: startPosition.y, z: startPosition.z },
      target: { x: startTarget.x, y: startTarget.y, z: startTarget.z },
      zoom: startZoom
    })
      .to({
        progress: 1,
        pos: { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z },
        target: { x: targetTarget.x, y: targetTarget.y, z: targetTarget.z },
        zoom: targetZoom
      }, duration)
      .easing(Easing.Quadratic.InOut)
      .onUpdate(({ pos, target, zoom }) => {
        camera.position.set(pos.x, pos.y, pos.z);
        controls.target.set(target.x, target.y, target.z);
        controls.update();
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        
        if (rendererRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, camera);
        }
      })
      .onComplete(() => {
        console.log('✅ [相机配置] 自定义相机配置平滑过渡完成:', config);
        prevConfigRef.current = config;
      })
      .start();
    
    currentTweenRef.current = tween;
    
    // 启动Tween更新循环
    const animateTween = () => {
      requestAnimationFrame(animateTween);
      TWEEN.update();  // ✅ 使用全局TWEEN对象
    };
    animateTween();
  }, []);

  // ✅ 对齐V2：customCameraConfig监听useEffect（第1727-1761行）
  useEffect(() => {
    console.log('📹 [相机配置] customCameraConfig:', customCameraConfig, 'modelLoaded:', modelLoaded, 'cameraReady:', cameraReady);
    console.log('📹 [相机配置] prevConfigRef:', prevConfigRef.current);
    
    // ★ 关键修复：必须等待相机和模型都完全就绪
    if (!customCameraConfig || !modelLoaded || !cameraReady) {
      console.log('⚠️ [相机配置] 跳过：配置、模型或相机未就绪');
      return;
    }
    
    const configStr = JSON.stringify(customCameraConfig);
    const prevStr = prevConfigRef.current ? JSON.stringify(prevConfigRef.current) : null;
    // ★ 关键修复：如果prevConfigRef为null，说明是组件刚挂载，必须应用配置
    const isConfigChanged = !prevConfigRef.current || prevStr !== configStr;
    
    console.log('📹 [相机配置] 配置变化检测:', {
      isConfigChanged,
      prevConfigIsNull: !prevConfigRef.current,
      当前配置: configStr,
      之前配置: prevStr || 'null'
    });
    
    // ★ 关键修复：移除!isConfigChanged的检查，因为modelLoaded变化时也需要应用
    // 只要customCameraConfig有值，就应该应用
    
    console.log('📹 [相机配置] 检测到自定义相机配置，准备平滑过渡...');
    console.log('📹 [相机配置] 目标配置详情:', {
      position: customCameraConfig.position,
      target: customCameraConfig.target,
      zoom: customCameraConfig.zoom
    });
    
    // ★ 关键修复：直接执行，不需要延迟
    applyCameraConfig(customCameraConfig);
  }, [modelLoaded, cameraReady, customCameraConfig, applyCameraConfig]);

  // ✅ 对齐V2：独立初始化useEffect（第1470-1529行）
  useEffect(() => {
    // ★ 状态机守卫：只在UNINITIALIZED状态下执行初始化
    if (stateMachine.state !== 'UNINITIALIZED') {
      console.log('✅ 场景已初始化，跳过重复初始化', stateMachine.state);
      return;
    }

    console.log('🚀 开始初始化场景...');
    setStateMachine({ state: 'INITIALIZING', currentModelUrl: '' });

    const timer = setTimeout(() => {
      const result = initScene();
      if (result) {
        console.log('✅ 场景初始化成功，进入READY状态');
        setStateMachine(prev => ({ ...prev, state: 'READY' }));
        
        // 关键修复：初始化成功后立即加载模型（如果modelUrl存在）
        if (modelUrl) {
          console.log('📥 检测到modelUrl，触发首次加载');
          loadModel();
        }
        
        animate();
      } else {
        console.error('❌ 场景初始化失败');
        setError('Failed to initialize 3D viewer');
        setLoading(false);
        setStateMachine(prev => ({ ...prev, state: 'ERROR' }));
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameIdRef.current);

      if (modelRef.current) {
        try {
          (modelRef.current as any).dispose?.();
        } catch (e) {
          console.warn('模型清理警告:', e);
        }
        modelRef.current = null;
      }
      if (sparkRef.current) {
        sparkRef.current = null;
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
  }, []);  // 空依赖，只执行一次

  // ✅ 修复4：模型切换逻辑（完全对齐V2第1533-1583行）
  useEffect(() => {
    if (!sparkRef.current || !sceneRef.current) {
      console.log(' 等待场景初始化...');
      return;
    }
  
    // ★ 状态机守卫：输出调试信息（对齐V2第1537-1542行）
    console.log('🔄 modelUrl变化:', {
      newUrl: modelUrl,
      currentState: stateMachine.state,
      currentModelUrl: stateMachine.currentModelUrl,
      modelLoaded
    });
  
    // ★ 状态机守卫：只在READY或LOADED状态下才处理modelUrl变化（对齐V2第1544-1548行）
    if (stateMachine.state !== 'READY' && stateMachine.state !== 'LOADED') {
      console.log('⚠️ 当前状态不允许加载模型:', stateMachine.state);
      return;
    }
  
    // ★ 状态机守卫：如果URL未变化且已加载，跳过（对齐V2第1550-1554行）
    if (modelUrl === stateMachine.currentModelUrl && modelLoaded) {
      console.log('✅ 模型已加载且URL未变化，跳过重新加载');
      return;
    }
  
    console.log('📥 开始加载新模型:', modelUrl);
  
    // ✅ 对齐V2：模型切换时立即隐藏旧标签，防止闪烁（第1558-1562行）
    if (decorationRef.current) {
      decorationRef.current.hideLabels();
      console.log(' 模型切换：隐藏旧标签');
    }
  
    // ✅ 关键修复：模型切换时禁用控制器，防止干扰新模型加载（对齐V2第1564-1568行）
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      console.log(' 模型切换：禁用控制器');
    }
  
    // 清理旧模型（对齐V2第1570-1577行）
    if (modelRef.current) {
      try {
        (modelRef.current as any).dispose?.();
      } catch (e) {
        console.warn('模型清理警告:', e);
      }
      modelRef.current = null;
    }
  
    // ★ 状态机转换：进入LOADING状态（对齐V2第1580行：不使prev）
    setStateMachine({ state: 'LOADING', currentModelUrl: modelUrl });
      
    loadModel();
  }, [modelUrl, loadModel, stateMachine.state, stateMachine.currentModelUrl, modelLoaded]);  // ✅ 完全对齐V2：不删除任何依赖项

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getModel: () => modelRef.current,
    
    // ✅ 对齐V2：getStats方法（第189-195行）
    getStats: () => ({
      pointCount: 0,  // TODO: 从SplatMesh获取真实点数
      loaded: modelLoaded,
      loading,
      progress,
      fps,
    }),
    
    // ✅ 对齐V2：dispose方法（第219-246行）
    dispose: () => {
      cancelAnimationFrame(frameIdRef.current);
      if (modelRef.current) {
        try {
          (modelRef.current as any).dispose?.();
        } catch (e) {
          console.warn('模型清理警告:', e);
        }
      }
      if (sparkRef.current) {
        sparkRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      if (decorationRef.current) {
        decorationRef.current.dispose();
        decorationRef.current = null;
      }
      console.log('🗑️ Base3DViewer资源已释放');
    },
    
    reload: () => {
      if (modelRef.current) {
        if (modelRef.current instanceof SplatMesh) {
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
    <div 
      ref={containerRef} 
      style={containerStyle}
      onClick={onClick}  // ✅ 对齐V2：单击事件
      onDoubleClick={onDoubleClick}  // ✅ 对齐V2：双击事件
    >
      <canvas ref={canvasRef} style={canvasStyle} />
      
      {/* ✅ 对齐V2：标题叠加层 */}
      {showTitle && (title || subtitle) && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: '#ffffff',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {title && <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{title}</h3>}
          {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.8 }}>{subtitle}</p>}
        </div>
      )}
      
      {/* ✅ 对齐V2：加载指示器 - 优化版 */}
      {loading && (
        <div style={{
          ...overlayStyle,
          opacity: isFadingOut ? 0 : 1,
          transition: 'opacity 0.3s ease-out'
        }}>
          {/* 加载阶段提示 */}
          <div style={{ marginBottom: '10px', fontSize: '16px' }}>
            {loadingStage === 'initializing' && '🚀 初始化场景...'}
            {loadingStage === 'loading' && '📦 加载模型数据...'}
            {loadingStage === 'processing' && '⚙️ 处理模型数据...'}
            {loadingStage === 'rendering' && '✨ 渲染3D视图...'}
          </div>
          
          {/* 进度条 */}
          <div style={{
            width: '200px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '10px'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#00ff00',
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          {/* 进度百分比 */}
          <span style={{ fontSize: '14px' }}>{Math.round(progress)}%</span>
          
          {/* 加载提示 */}
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.6 }}>
            💡 首次加载可能需要几秒钟
          </div>
        </div>
      )}
      
      {/* 错误状态 */}
      {error && (
        <div style={{ ...overlayStyle, color: '#ff4444' }}>
          <div>⚠️ 加载失败: {error}</div>
        </div>
      )}
      
      {/* ✅ 对齐V2：统计信息 */}
      {showStats && modelLoaded && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          color: '#ffffff',
          fontSize: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 12px',
          borderRadius: '4px',
          display: 'flex',
          gap: '12px'
        }}>
          <span>3DGS</span>
          <span>FPS: {fps > 0 ? fps : '--'}</span>
        </div>
      )}
      
      {/* ✅ 对齐V2：控制提示 */}
      {modelLoaded && enableControls && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          color: '#ffffff',
          fontSize: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '8px 12px',
          borderRadius: '4px',
          display: 'flex',
          gap: '8px'
        }}>
          <span>拖拽旋转</span>
          <span>·</span>
          <span>滚轮缩放</span>
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
          DEV FPS: {fps}
        </div>
      )}
    </div>
  );
});

Base3DViewer.displayName = 'Base3DViewer';
