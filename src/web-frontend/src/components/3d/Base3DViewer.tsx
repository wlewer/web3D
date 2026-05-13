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

import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';  // ✅ 对齐V2：PLY 加载
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import TWEEN, { Tween, Easing } from '@tweenjs/tween.js';  // ✅ 对齐V2：平滑过渡动画
import { SmartCenteringEngine, type FitConfig } from './engines/SmartCenteringEngine';
import { ModelLoader } from './engines/ModelLoader';
import { CameraManager, type CameraConfig } from './engines/CameraManager';
import { SceneDecoration, type DecorationConfig } from './engines/SceneDecoration';
import { globalModelCache } from './engines/GlobalModelCache';
import { type DecorationControlProps, buildDecorationConfig } from './types/decorations';
import { OrbitController, findPresetById } from './orbits';

// ★ 重试工具：模型加载失败时自动重试（指数退避）
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.warn(`\u91cd\u8bd5 ${i + 1}/${retries}，${delay}ms\u540e\u91cd\u8bd5...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('\u6240\u6709\u91cd\u8bd5\u5747\u5931\u8d25');
}

export type LayoutMode = 
  | 'featured'    // 首页：全屏展示
  | 'grid'        // 网格：卡片
  | 'list'        // 列表：单列
  | 'carousel'    // 轮播：横向滑动
  | 'gallery'     // 画廊
  | 'compact'     // 紧凑：小卡片
  | 'modal'       // 弹框：全屏
  | 'custom';     // 自定义

export interface Base3DViewerProps {
  // ========== 核心必选 ==========
  modelUrl: string;  // 模型URL
  /** 模型格式（来自数据库，如 'spz'/'glb'/'ply'/'stl'/'obj'，优先于URL检测） */
  modelFormat?: string;
  /** 模型类型（默认 auto 自动检测） */
  modelType?: 'auto' | 'splat' | 'ply-mesh' | 'glb';
  
  // ========== 相机控制 ==========
  autoCenter?: boolean;     // 智能居中，默认true
  margin?: number;          // 相机距离倍数，默认2.5
  layout?: LayoutMode;      // 布局模式，默认 'featured'（影响极角限制和CSS）
  autoRotate?: boolean;     // 自动旋转，默认true
  enableControls?: boolean; // 启用控制器，默认true
  autoRotateSpeed?: number; // 自动旋转速度，默认1.0
  fov?: number;             // 视野角度(FOV)，默认50
  
  // ========== UI配置 ==========
  backgroundColor?: string; // 背景色，默认'#0a0a0f'
  width?: string | number;  // 宽度，默认'100%'
  height?: string | number; // 高度，默认'100%'
  showTitle?: boolean;      // ✅ 对齐V2：标题叠加层，默认true
  title?: string;           // ✅ 对齐V2：标题文本
  subtitle?: string;        // ✅ 对齐V2：副标题文本
  showStats?: boolean;      // ✅ 对齐V2：统计信息显示，默认true
  
  // ========== 场景装饰 ==========
  decorations?: DecorationConfig; // 装饰配置（粒子、展示台、标签）
  /** 统一装饰控制协议（与 decorations 二选一，优先使用 decorations） */
  decorationControls?: DecorationControlProps;
  
  // ========== 相机配置保存 ==========
  customCameraConfig?: CameraConfig | null;  // ✅ 对齐V2：自定义相机配置（优先使用）
  
  // ========== 环绕控制 ==========
  /** ★ 环绕动画开关（prop 驱动，替代直接调用 ref） */
  orbitEnabled?: boolean;
  /** ★ 环绕周期毫秒（默认 12000） */
  orbitDuration?: number;
  /** ★ 环绕模式 ID */
  orbitMode?: string;
  /** ★ 环绕模式参数 */
  orbitModeParams?: Record<string, any>;
  /** ★ 环绕速度倍率 0.5~3.0 */
  orbitSpeed?: number;
  /** ★ 环绕预设 ID */
  orbitPreset?: string;
  /** ★ 环绕状态变化回调 */
  onOrbitStateChange?: (orbiting: boolean) => void;
  /** ★ 环绕周期完成回调（用于协调模型切换等动作） */
  onOrbitCycleComplete?: () => void;
  /** ★ 环绕位置更新回调 */
  onOrbitPositionUpdate?: (pos: { position: [number, number, number]; target: [number, number, number] }) => void;
  /** ★ 环绕中心垂直偏移（Y轴方向，正=抬高，负=降低，默认0） */
  orbitCenterYOffset?: number;
  
  // ========== 事件回调 ==========
  onLoadComplete?: () => void;    // 加载完成
  onError?: (error: Error) => void; // 加载错误
  onProgress?: (progress: number) => void; // 加载进度（0-100）
  onClick?: () => void;           // ✅ 对齐V2：单击事件
  onDoubleClick?: () => void;     // ✅ 对齐V2：双击事件
  onInteraction?: () => void;     // ✅ 对齐V2：用户交互通知
  /** 保存相机配置回调 */
  onCameraConfigSave?: (config: CameraConfig) => void;
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
  /** ★ 环绕/轨道动画 */
  startOrbit: (duration?: number) => void;
  stopOrbit: () => void;
  /** ★ 获取环绕控制器实例（直接操作，如切换模式、设置参数等） */
  getOrbitController: () => import('./orbits').OrbitController | null;
}

/**
 * 基础3D查看器组件
 */
export const Base3DViewer = forwardRef<Base3DViewerRef, Base3DViewerProps>(({
  modelUrl,
  modelFormat,
  autoCenter = true,
  margin = 2.5,
  layout = 'featured' as LayoutMode,
  autoRotate = true,
  enableControls = true,
  autoRotateSpeed = 1,
  fov = 50,
  backgroundColor = '#0a0a0f',
  width = '100%',
  height = '100%',
  showTitle = true,
  title,
  subtitle,
  showStats = true,
  decorations,
  customCameraConfig = null,
  decorationControls,
  orbitEnabled = false,
  orbitDuration = 12000,
  orbitMode,
  orbitModeParams,
  orbitSpeed,
  orbitPreset: orbitPresetProp,
  orbitCenterYOffset = 0,
  onOrbitStateChange,
  onOrbitCycleComplete,
  onOrbitPositionUpdate,
  onLoadComplete,
  onError,
  onClick,
  onDoubleClick,
  onInteraction,
  onCameraConfigSave,
}, ref) => {
  // 统一装饰控制：有效装饰配置（decorationControls 转为 DecorationConfig）
  const effectiveDecorations = useMemo(() => {
    return decorations || (decorationControls ? buildDecorationConfig(decorationControls, layout) : undefined);
  }, [decorations, decorationControls, layout]);

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

  // ★ 动画帧计数器 & 环绕相机位置监控
  const frameCountRef = useRef(0);
  const lastOrbitCamPosRef = useRef<string>('');
  const orbitStallFrameCountRef = useRef(0);
  
  // ✅ 新增：场景装饰管理器
  const decorationRef = useRef<SceneDecoration | null>(null);
  
  // ★ 模型缓存：加速2次切换相同模型
  const modelCacheRef = useRef<Map<string, THREE.Object3D | SplatMesh>>(new Map());
  
  // ★ 存储dispose函数，用于组件卸载时自动释放资源
  const cleanupRef = useRef<(() => void) | null>(null);

  // 环绕控制器实例
  const orbitControllerRef = useRef<import('./orbits').OrbitController | null>(null);

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

  // ★ 环绕控制器初始化（在 cameraReady 后执行一次）

  // ★ 保存当前 orbitDuration（闭包安全，用于 applyCameraConfig 中恢复环绕）
  const orbitDurationRef = useRef(orbitDuration);
  useEffect(() => { orbitDurationRef.current = orbitDuration; }, [orbitDuration]);
  
  // ★ 标记模型切换前环绕是否正在运行（用于加载完成后恢复）
  const savedOrbitActiveRef = useRef(false);

  // ★ 追踪上一轮的 orbitEnabled，用于 cleanup 判断是否需要 stop
  const prevOrbitEnabledRef = useRef(orbitEnabled);

  // ★ 标记控制器已就绪，用于 prop effect 的依赖（替代不稳的 cameraReady）
  const [ctrlReady, setCtrlReady] = useState(false);

  // ★ [fix] 默认 autoRotate=true（与 prop 默认值一致），防止 else 分支意外覆盖为 false
  const savedAutoRotateRef = useRef<boolean>(true);

  useEffect(() => {
    if (!cameraReady || !cameraRef.current || !controlsRef.current || orbitControllerRef.current) return;

    const ctrl = new OrbitController(cameraRef.current, controlsRef.current);
    orbitControllerRef.current = ctrl;
    setCtrlReady(true);

    // 同步初始 prop
    if (orbitMode) ctrl.setMode(orbitMode);
    if (orbitSpeed) ctrl.setSpeed(orbitSpeed);
    if (orbitModeParams) ctrl.setParams(orbitModeParams);

    // 事件回调
    ctrl.setEvent('onCycleComplete', () => onOrbitCycleComplete?.());
    ctrl.setEvent('onPositionUpdate', (snapshot: import('./orbits').OrbitSnapshot) => {
      onOrbitPositionUpdate?.({
        position: [snapshot.position.x, snapshot.position.y, snapshot.position.z],
        target: [snapshot.target.x, snapshot.target.y, snapshot.target.z],
      });
    });

    if (orbitPresetProp) {
      const preset = findPresetById(orbitPresetProp);
      if (preset) {
        ctrl.setMode(preset.modeId);
        ctrl.setParams(preset.params);
      }
    }

    console.log('[OrbitController] 已初始化, mode:', ctrl.getCurrentMode().meta.id);
  }, [cameraReady]);

  // ★ 卸载时安全停止环绕
  useEffect(() => {
    return () => {
      orbitControllerRef.current?.stop();
    };
  }, []);

  // ★ Prop 驱动环绕启停
  useEffect(() => {
    const ctrl = orbitControllerRef.current;
    const controls = controlsRef.current;
    
    if (!ctrl || !controls) {
      if (orbitEnabled) {
        console.log('[OrbitController] 延迟启动：等待控制器初始化');
      }
      return;
    }

    if (orbitEnabled) {
      // ★ 停止平滑过渡Tween（防止两个Tween系统争夺相机控制权）
      if (currentTweenRef.current) {
        currentTweenRef.current.stop();
        currentTweenRef.current = null;
      }

      // ★ 关键修复：暂停 autoRotate 避免冲突
      savedAutoRotateRef.current = controls.autoRotate;
      controls.autoRotate = false;
      ctrl.start(orbitDuration);
    } else {
      ctrl.stop();
      // 恢复 autoRotate
      controls.autoRotate = savedAutoRotateRef.current;
    }
    onOrbitStateChange?.(orbitEnabled);

    prevOrbitEnabledRef.current = orbitEnabled;

    // ★ 安全清理：仅当 orbitEnabled 从 true→false 时才 stop，
    // 防止 cameraReady / onOrbitStateChange 等 deps 变更意外中断环绕
    return () => {
      if (prevOrbitEnabledRef.current) {
        ctrl.stop();
        controlsRef.current && (controlsRef.current.autoRotate = savedAutoRotateRef.current);
      }
    };
  }, [orbitEnabled, orbitDuration, ctrlReady]);

  // ★ Prop 驱动模式切换
  useEffect(() => {
    if (!orbitMode || !orbitControllerRef.current) return;
    orbitControllerRef.current.setMode(orbitMode);
  }, [orbitMode]);

  // ★ Prop 驱动速度设置
  useEffect(() => {
    if (!orbitSpeed || !orbitControllerRef.current) return;
    orbitControllerRef.current.setSpeed(orbitSpeed);
  }, [orbitSpeed]);

  // ★ Prop 驱动模式参数
  const prevOrbitParamsRef = useRef<string>('');
  useEffect(() => {
    if (!orbitModeParams || !orbitControllerRef.current) return;
    // ★ [fix] 序列化比较，防止对象引用变化导致 setParams → restartAnimation 无限循环
    const serialized = JSON.stringify(orbitModeParams);
    if (prevOrbitParamsRef.current === serialized) return;
    prevOrbitParamsRef.current = serialized;
    orbitControllerRef.current.setParams(orbitModeParams);
  }, [orbitModeParams]);

  // ★ Prop 驱动中心垂直偏移（实时更新环绕轨道高度）
  useEffect(() => {
    const ctrl = orbitControllerRef.current;
    if (!ctrl) return;
    ctrl.setCenterOffset(orbitCenterYOffset);
  }, [orbitCenterYOffset]);
  
  // ★ Prop 驱动相机距离（margin变化时平滑重设相机位置，不重新加载模型）
  useEffect(() => {
    if (!modelLoaded || !cameraRef.current || !canvasRef.current || !modelRef.current) return;
    if (!autoCenter) return;
    // 环绕运行时暂停，避免Tween冲突
    if (orbitControllerRef.current?.isActive) {
      orbitControllerRef.current.stop();
    }
    smartFitCameraToObject(modelRef.current, cameraRef.current, canvasRef.current, {
      margin,
      trimThreshold: 0.05,
      preferAxis: 'auto',
      autoCenter: true
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [margin]);
  
  // ★ 模型加载完成后：如果切换前环绕正在运行，自动重启（以新相机位置重建上下文）
  useEffect(() => {
    if (!modelLoaded) return;
    if (!savedOrbitActiveRef.current) return;
    
    savedOrbitActiveRef.current = false;
    
    // ★ 停止智能居中Tween，防止与环绕争夺控制权
    if (currentTweenRef.current) {
      currentTweenRef.current.stop();
      currentTweenRef.current = null;
    }
    
    orbitControllerRef.current?.start(orbitDurationRef.current);
  }, [modelLoaded]);
  
  // Spark渲染状态管理
  const sparkReadyRef = useRef(false);
  const sparkFailedRef = useRef(false);
  const renderingLockRef = useRef(false);
  const renderingLockTimerRef = useRef(0);

  // ========== 智能居中算法（使用 SmartCenteringEngine） ==========

  
  const smartFitCameraToObject = useCallback(
    (object: THREE.Object3D | SplatMesh, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, config: FitConfig) => {
      const result = SmartCenteringEngine.calculateFit(object, canvas, config);
      camera.up.set(0, 1, 0);
      
      // ★ 关键修复：立即设置 controls.target（不等待Tween），防止相机漂移
      if (controlsRef.current) {
        controlsRef.current.target.copy(result.modelCenter);
        controlsRef.current.update();
      }
      
      // ★ 关键修复：如果相机还在原点附近（刚初始化/切换模型），直接跳转到最终位置
      if (camera.position.length() < 1.0) {
        camera.position.copy(result.cameraPosition);
        camera.updateProjectionMatrix();
      }
      
      // ★ 平滑过渡：使用 Tween 从当前位置动画过渡到目标
      if (currentTweenRef.current) {
        currentTweenRef.current.stop();
        currentTweenRef.current.remove();
      }
      
      const startPos = camera.position.clone();
      const startTarget = controlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0);
      const endPos = result.cameraPosition;
      const endTarget = result.modelCenter;
      
      const distance = startPos.distanceTo(endPos);
      const duration = Math.min(Math.max(distance * 500, 1000), 2500);
      
      const tween = new Tween({
        px: startPos.x, py: startPos.y, pz: startPos.z,
        tx: startTarget.x, ty: startTarget.y, tz: startTarget.z,
      })
        .to({
          px: endPos.x, py: endPos.y, pz: endPos.z,
          tx: endTarget.x, ty: endTarget.y, tz: endTarget.z,
        }, duration)
        .easing(Easing.Quadratic.InOut)
        .onUpdate(({ px, py, pz, tx, ty, tz }) => {
          camera.position.set(px, py, pz);
          if (controlsRef.current) {
            controlsRef.current.target.set(tx, ty, tz);
            controlsRef.current.update();
          }
        })
        .onComplete(() => {
          camera.position.copy(endPos);
          camera.lookAt(endTarget);
          camera.updateProjectionMatrix();
          if (controlsRef.current) {
            controlsRef.current.target.copy(endTarget);
            controlsRef.current.update();
          }
          console.log('✅ 智能居中平滑过渡完成');
        })
        .start();
      
      currentTweenRef.current = tween;
      
      // ★ 关键修复：将 tween 注册到全局 TWEEN 组，使每帧的 TWEEN.update() 能推进动画
      TWEEN.add(tween);
      
      const size = new THREE.Vector3();
      new THREE.Box3().setFromObject(object).getSize(size);
      return { center: result.modelCenter, distance: result.cameraPosition.distanceTo(result.modelCenter), trimmedSize: size };
    },
    []
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
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, 1000);
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
      controls.autoRotateSpeed = autoRotateSpeed;
      
      // 立即设置控制器目标点，防止加载过程中相机跳动
      controls.target.set(0, 0, 0);
      controls.update();
      
      // 加载过程中禁用控制器交互，防止相机位置被修改
      controls.enabled = false;
      
      // 仰角限制 - 根据布局模式调整
      if (layout === 'featured') {
        // featured模式：完全放开限制，允许360度自由旋转
        controls.minPolarAngle = 0;           // 最小0度（从正上方）
        controls.maxPolarAngle = Math.PI;     // 最大180度（从正下方）
      } else {
        // 其他布局模式：保留适度限制
        controls.minPolarAngle = Math.PI / 4;      // 最小45度
        controls.maxPolarAngle = Math.PI / 2.5;    // 最大72度
      }
      
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
    
    // ✅ 初始化场景装饰管理器（每次initScene都重新创建，确保绑定当前场景）
    if (decorationRef.current) {
      decorationRef.current.dispose();
      decorationRef.current = null;
    }
    decorationRef.current = new SceneDecoration(scene);
    
    // ✅ 应用装饰配置（如果提供了）
    if (effectiveDecorations) {
      decorationRef.current.apply(effectiveDecorations);
    }
    
    console.log('🎨 Base3DViewer场景初始化完成');
    return true;  // ✅ 对齐V2：返回true表示成功
  }, [backgroundColor, enableControls, autoRotate, effectiveDecorations]);

  /**
   * 加载SPZ模型（高斯泼溅）- 完全对齐V2第857-1006行
   */
  const loadSplatModel = useCallback(async () => {
    if (!sparkRef.current) return;
    
    // ★ 先查全局缓存，再查局部缓存
    let cachedModel = globalModelCache.get(modelUrl);
    if (cachedModel && cachedModel instanceof SplatMesh) {
      console.log('📦 命中全局缓存，复用模型:', modelUrl);
      modelCacheRef.current.set(modelUrl, cachedModel); // 同步到局部缓存
    } else {
      const localCached = modelCacheRef.current.get(modelUrl);
      if (localCached && localCached instanceof SplatMesh) {
        console.log('📦 命中局部缓存，复用模型:', modelUrl);
        cachedModel = localCached;
      }
    }
    if (cachedModel && cachedModel instanceof SplatMesh) {
      setError(null);
      setLoading(true);
      setModelLoaded(false);
      setProgress(10);
      setLoadingStage('initializing');
      
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      
      modelRef.current = cachedModel;
      sparkRef.current.add(cachedModel);
      
      // 对缓存模型执行智能居中
      if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
        console.log('🎯 缓存模型：执行智能居中...');
        smartFitCameraToObject(cachedModel, cameraRef.current, canvasRef.current, {
          margin: margin,
          trimThreshold: 0.05,
          preferAxis: 'auto',
          autoCenter: true
        });
      }
      
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      
      if (effectiveDecorations?.labels?.enabled && effectiveDecorations.labels.products && effectiveDecorations.labels.products.length > 0) {
        decorationRef.current?.showLabels();
      }
      
      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));
        onLoadComplete?.();
      }, 200);  // 缓存加载更快，淡出时间减半
      return;
    }

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

      // 使用 ModelLoader 加载 Splat 模型
      setLoadingStage('loading');  // 阶段2: 加载中

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

      let splat: SplatMesh;

      const plyFormat = (modelFormat || '').toLowerCase() === 'ply' || modelUrl.endsWith('.ply');
      if (plyFormat) {
        // ★ 关键修复：高斯泼溅PLY使用原生SplatMesh（ModelLoader.loadPLY返回THREE.Points）
        console.log('🌟 使用原生SplatMesh加载高斯PLY文件');
        splat = new SplatMesh({ url: modelUrl });
        progressReceived = true;
        setProgress(50);
        await splat.initialized;
        // SplatMesh默认倒立，需要翻转
        splat.rotation.x = Math.PI;
      } else {
        const loadResult = await withRetry(() => ModelLoader.load(modelUrl, (progress) => {
          if (loadingTimedOut) return;
          setProgress(progress.progress);
          if (progress.stage === 'loading') progressReceived = true;
        }, modelFormat as any));

        splat = loadResult.model as SplatMesh;
      }

      // 先清除心跳，防止超时后泄漏
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      clearTimeout(timeoutGuard);

      if (loadingTimedOut) return;

      setLoadingStage('processing');  // 阶段3: 处理中
      modelRef.current = splat;

      // 添加到SparkRenderer
      sparkRef.current.add(splat);

      // ★ 加入缓存（下次切换回此模型直接复用，无需重新下载解析）
      modelCacheRef.current.set(modelUrl, splat);
      globalModelCache.set(modelUrl, splat);  // 同步到全局缓存

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

      // ✅ 对齐V2：模型加载完成后显示产品标签
      if (effectiveDecorations?.labels?.enabled && effectiveDecorations.labels.products && effectiveDecorations.labels.products.length > 0) {
        decorationRef.current?.showLabels();
        console.log('🏷️ 产品标签已显示');
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
      // ★ 对于PLY文件，向上传播错误以便 loadSplatWithFallback 降级到标准PLY
      if (modelUrl.endsWith('.ply')) throw err;
    }
  }, [modelUrl, modelFormat, autoCenter, margin, smartFitCameraToObject, customCameraConfig, onLoadComplete, onError, effectiveDecorations]);

  /**
   * 加载GLB模型 - 完全对齐V2第1009-1113行
   */
  const loadGLBModel = useCallback(async () => {
    if (!sceneRef.current || !rendererRef.current) return;

    // ★ 先查局部缓存（GLB/OBJ/STL模型）
    const cachedModel = modelCacheRef.current.get(modelUrl);
    if (cachedModel && !(cachedModel instanceof SplatMesh)) {
      console.log('📦 命中局部缓存，复用GLB模型:', modelUrl);
      modelRef.current = cachedModel;
      sceneRef.current.add(cachedModel);

      setLoadingStage('processing');
      if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
        smartFitCameraToObject(cachedModel, cameraRef.current, canvasRef.current, {
          margin, trimThreshold: 0.05, preferAxis: 'auto', autoCenter: true
        });
      } else if (customCameraConfig) {
        console.log('⏭️ 跳过智能居中：存在自定义相机配置');
      }
      setLoadingStage('rendering');
      if (controlsRef.current) controlsRef.current.enabled = true;
      if (effectiveDecorations?.labels?.enabled && effectiveDecorations.labels.products?.length) {
        decorationRef.current?.showLabels();
      }
      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));
        onLoadComplete?.();
      }, 500);
      return;
    }

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

      // 使用 ModelLoader 加载 GLB 模型（带重试）
      const loadResult = await withRetry(() => ModelLoader.load(modelUrl, (progress) => {
        setProgress(Math.round(progress.progress));
      }, modelFormat as any));
      const model = loadResult.model;
      modelRef.current = model;
      sceneRef.current?.add(model);
      // ★ 加入局部缓存（下次切换回此模型直接复用）
      modelCacheRef.current.set(modelUrl, model);

      setLoadingStage('processing');  // 阶段2: 处理中

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
        controlsRef.current.enabled = true;
        console.log('🎯 控制器已启用');
      }

      // ✅ 对齐V2：模型加载完成后显示产品标签
      if (effectiveDecorations?.labels?.enabled && effectiveDecorations.labels.products && effectiveDecorations.labels.products.length > 0) {
        decorationRef.current?.showLabels();
        console.log('🏷️ 产品标签已显示');
      }

      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));
        onLoadComplete?.();
      }, 500);
    } catch (err) {
      console.error('❌ GLB model load error:', err);
      setStateMachine(prev => ({ ...prev, state: 'ERROR' }));  // ★ 状态机转换：进入ERROR状态
      setError((err as Error).message);
      setLoading(false);
      onError?.(err as Error);
    }
  }, [modelUrl, modelFormat, autoCenter, margin, smartFitCameraToObject, customCameraConfig, onLoadComplete, onError, effectiveDecorations]);

  /**
   * 加载PLY模型（完全对齐V2第1116-1320行）
   * 支持网格和点云两种类型，自动检测
   */
  const loadPLYModel = useCallback(async () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ★ 先查局部缓存
    const cachedModel = modelCacheRef.current.get(modelUrl);
    if (cachedModel && !(cachedModel instanceof SplatMesh)) {
      console.log('📦 命中局部缓存，复用PLY模型:', modelUrl);
      modelRef.current = cachedModel;
      sceneRef.current.add(cachedModel);

      if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
        smartFitCameraToObject(cachedModel, cameraRef.current, canvasRef.current, {
          margin, trimThreshold: 0.05, preferAxis: 'auto', autoCenter: true
        });
      }
      setLoadingStage('rendering');
      if (controlsRef.current) controlsRef.current.enabled = true;
      if (effectiveDecorations?.labels?.enabled && effectiveDecorations.labels.products?.length) {
        decorationRef.current?.showLabels();
      }
      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));
        onLoadComplete?.();
      }, 500);
      return;
    }

    setStateMachine(prev => ({ ...prev, state: 'LOADING' }));
    setLoading(true);
    setProgress(0);
    setError(null);
    setLoadingStage('loading');
    
    let loadingTimedOut = false;
    let progressReceived = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    
    try {
      // 心跳进度（Vite dev server兼容）
      const heartbeatStart = Date.now();
      heartbeatTimer = setInterval(() => {
        if (loadingTimedOut) return;
        if (progressReceived) return;
        const elapsed = (Date.now() - heartbeatStart) / 1000;
        const simulated = 10 + (1 - Math.exp(-elapsed / 5)) * 65;
        setProgress(Math.min(75, Math.round(simulated)));
      }, 300);

      console.log('📦 加载PLY模型:', modelUrl);
      
      // ✅ 对齐V2：加载模型（加载开始时禁用控制器）
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      
      // 超时保护：25秒
      const timeoutGuard = setTimeout(() => {
        if (!loadingTimedOut) {
          loadingTimedOut = true;
          console.warn(`⚠️ PLY模型加载超时: ${modelUrl}`);
          setError('模型加载超时，请检查网络连接');
          setLoading(false);
          setModelLoaded(false);
        }
      }, 25000);

      const loader = new PLYLoader();
      const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
        loader.load(
          modelUrl,
          (geo) => {
            console.log('✅ PLY模型加载成功');
            resolve(geo);
          },
          (progress) => {
            if (loadingTimedOut) return;
            if (progress.total > 0) {
              progressReceived = true;
              setProgress(Math.round((progress.loaded / progress.total) * 100));
            }
          },
          (error) => reject(error)
        );
      });
      // 先清除心跳，防止超时后泄漏
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      clearTimeout(timeoutGuard);

      if (loadingTimedOut) return;

      setLoadingStage('processing');
      
      const vertexCount = geometry.attributes.position?.count || 0;
      const hasNormals = geometry.hasAttribute('normal');
      const hasColors = geometry.hasAttribute('color');
      
      console.log('📊 PLY几何体:', { vertexCount, hasNormals, hasColors, hasIndex: !!geometry.index });
      
      // ✅ 对齐V2：检测是点云还是网格
      let object3D: THREE.Object3D;
      
      if (!geometry.index && vertexCount > 1000) {
        // 点云
        console.log('🌟 检测到点云数据');
        const material = new THREE.PointsMaterial({
          size: 0.02,
          vertexColors: hasColors,
          color: hasColors ? undefined : 0x888888,
          sizeAttenuation: true,
        });
        object3D = new THREE.Points(geometry, material);
      } else {
        // 网格
        console.log('🔲 检测到网格数据');
        if (!hasNormals) geometry.computeVertexNormals();
        
        const material = hasColors
          ? new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide })
          : new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide });
        
        object3D = new THREE.Mesh(geometry, material);
      }
      
      sceneRef.current.add(object3D);
      modelRef.current = object3D;
      // ★ 加入局部缓存（下次切换回此模型直接复用）
      modelCacheRef.current.set(modelUrl, object3D);

      // ✅ 对齐V2：智能居中
      if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
        smartFitCameraToObject(object3D, cameraRef.current, canvasRef.current, {
          margin, trimThreshold: 0.05, preferAxis: 'auto', autoCenter: true
        });
      }
      
      setLoadingStage('rendering');
      
      // 启用控制器
      if (controlsRef.current) controlsRef.current.enabled = true;
      
      // ✅ 对齐V2：产品标签
      if (effectiveDecorations?.labels?.enabled && effectiveDecorations.labels.products && effectiveDecorations.labels.products.length > 0) {
        decorationRef.current?.showLabels();
      }
      
      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));
        onLoadComplete?.();
      }, 500);
      
    } catch (err) {
      console.error('❌ PLY model load error:', err);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      setStateMachine(prev => ({ ...prev, state: 'ERROR' }));
      if (!loadingTimedOut) {
        setError((err as Error).message);
        setLoading(false);
        onError?.(err as Error);
      }
    }
  }, [modelUrl, modelFormat, autoCenter, margin, smartFitCameraToObject, customCameraConfig, onLoadComplete, onError, effectiveDecorations]);

  /**
   * ★ 加载PLY模型：先尝试高斯SplatMesh，失败后自动降级为标准PLY点云
   */
  const loadSplatWithFallback = useCallback(async () => {
    if (!sparkRef.current) return;
    // 先尝试高斯SplatMesh加载
    try {
      console.log('🌟 尝试以高斯SplatMesh加载PLY文件');
      await loadSplatModel();
      return;
    } catch (_splatErr) {
      console.warn('⚠️ 高斯SplatMesh加载失败，降级为标准PLY加载:', _splatErr);
    }
    // 降级：标准PLY加载
    console.log('⬇️ 降级为标准PLY网格/点云加载');
    // 重置错误状态后尝试标准PLY
    setStateMachine(prev => ({ ...prev, state: 'LOADING' }));
    setError(null);
    setLoading(true);
    await loadPLYModel();
  }, [loadSplatModel, loadPLYModel]);

  /**
   * 从URL检测模型格式（降级方案）
   */
  const detectFormat = useCallback((url: string): string => {
    if (url.endsWith('.spz')) return 'spz';
    if (url.endsWith('.splat')) return 'splat';
    if (url.endsWith('.ply')) return 'ply';
    if (url.endsWith('.glb')) return 'glb';
    if (url.endsWith('.gltf')) return 'gltf';
    if (url.endsWith('.stl')) return 'stl';
    if (url.endsWith('.obj')) return 'obj';
    return 'spz';
  }, []);

  /**
   * 加载模型（根据URL后缀判断类型）- 完全对齐V2第1323-1343行
   */
  const loadModel = useCallback(() => {
    const fmt = (modelFormat || '').toLowerCase() || detectFormat(modelUrl);
    
    if (fmt === 'spz' || fmt === 'splat') {
      loadSplatModel();
    } else if (fmt === 'ply') {
      // ★ 修复：先尝试SplatMesh，失败自动降级标准PLY
      loadSplatWithFallback();
    } else {
      // GLB/GLTF/STL/OBJ等使用Three.js场景加载
      loadGLBModel();
    }
  }, [modelUrl, modelFormat, loadSplatModel, loadSplatWithFallback, loadGLBModel]);

  /**
   * 动画循环（集成SparkRenderer渲染）
   */
  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    try {
      const { camera, renderer, controls, spark } = {
        camera: cameraRef.current,
        renderer: rendererRef.current,
        controls: controlsRef.current,
        spark: sparkRef.current,
      };

      if (!camera || !renderer || !sceneRef.current) return;

      // ★ 关键修复：更新 Tween 动画（整合到主循环，替代 applyCameraConfig 中的独立循环）
      TWEEN.update();

      // ★ 诊断：动画帧计数器 + 环绕相机位置监控
      frameCountRef.current++;
      const isOrbitRunning = orbitControllerRef.current?.isActive ?? false;
      if (frameCountRef.current % 300 === 0) {
        console.log(`[animate] ✅ 动画循环运行中 (帧#${frameCountRef.current})${isOrbitRunning ? ', 环绕状态: active' : ''}`);
      }

      // ★ [fix] 环绕卡死检测与自动恢复：检查相机位置是否变化
      if (isOrbitRunning && camera) {
        const posKey = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
        if (posKey === lastOrbitCamPosRef.current) {
          orbitStallFrameCountRef.current++;
          if (orbitStallFrameCountRef.current >= 150) {  // ~2.5秒 @60fps
            console.warn('[animate] ⚠️ 环绕相机位置未变化超过150帧，尝试强制恢复...');
            const ctrl = orbitControllerRef.current;
            if (ctrl && ctrl.isActive) {
              ctrl.restartAnimation?.();
              console.log('[animate] ✅ 环绕已强制恢复');
            }
            orbitStallFrameCountRef.current = 0;
          }
        } else {
          orbitStallFrameCountRef.current = 0;
        }
        lastOrbitCamPosRef.current = posKey;
      } else {
        orbitStallFrameCountRef.current = 0;
        lastOrbitCamPosRef.current = '';
      }

      // ★ 使用 ref 获取实时环绕状态，避免闭包过期
      // （animate 的 useCallback 依赖为 []，闭包中 orbitEnabled 始终为初始值）

      // 更新控制器（★ 环绕进行中：Tween的onUpdate已在OrbitController内调用controls.update()，跳过避免干扰）
      if (controls && !isOrbitRunning) {
        controls.update();
      }

      // ★ 渲染锁超时保护：spark.update() 超过 500ms 未完成时强制释放
      if (renderingLockRef.current && isOrbitRunning) {
        const now = performance.now();
        if (!renderingLockTimerRef.current) {
          renderingLockTimerRef.current = now;
        } else if (now - renderingLockTimerRef.current > 500) {
          console.warn('⚠️ 渲染锁超时，强制释放');
          renderingLockRef.current = false;
          renderingLockTimerRef.current = 0;
        }
      } else {
        renderingLockTimerRef.current = 0;
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
              // 从场景中移除 Spark 网格，阻止 Three.js 回退渲染时触发 onBeforeRender
              if (sceneRef.current && spark) {
                sceneRef.current.remove(spark);
              }
              console.warn('⚠️ SparkRenderer渲染失败，已从场景移除，降级到Three.js渲染');
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
      const fpsNow = performance.now();
      const elapsed = fpsNow - fpsCounterRef.current.lastTime;
      if (elapsed >= 1000) {
        setFps(Math.round((fpsCounterRef.current.count * 1000) / elapsed));
        fpsCounterRef.current.count = 0;
        fpsCounterRef.current.lastTime = fpsNow;
      }
    } catch (err) {
      console.error('[animate] 动画循环未知异常:', err);
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

  // ✅ 窗口 resize 监听 + 组件卸载清理（不调用 initScene/animate，由状态机统一管理）
  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      
      // 清理资源
      if (modelRef.current) {
        if (modelRef.current instanceof THREE.Mesh || modelRef.current instanceof THREE.Points) {
          try {
            (modelRef.current as THREE.Mesh | THREE.Points).geometry.dispose();
            const mat = (modelRef.current as THREE.Mesh | THREE.Points).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else mat?.dispose();
          } catch (e) { /* ignore */ }
        }
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
      if (decorationRef.current) {
        decorationRef.current.dispose();
        decorationRef.current = null;
      }
      
      console.log('🗑️ Base3DViewer资源已清理');
    };
  }, []);

  // ✅ 新增：监听装饰配置变化，重新应用场景装饰
  useEffect(() => {
    if (decorationRef.current) {
      decorationRef.current.apply(effectiveDecorations || {});
    }
  }, [effectiveDecorations]);

  // ✅ 新增：单独监听背景色变化，直接更新 scene.background（避免重建场景）
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(backgroundColor);
    }
  }, [backgroundColor]);

  // ✅ 新增：单独监听自动旋转速度变化
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotateSpeed = autoRotateSpeed;
    }
  }, [autoRotateSpeed]);

  // ★ [fix] 单独监听自动旋转开关变化（prop 变化时同步到 controls，环绕中不生效由 prop effect 管理）
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // ✅ 新增：单独监听视野角度变化
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [fov]);

  // ✅ ResizeObserver：容器尺寸变化时同步渲染器
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (rendererRef.current && cameraRef.current && width > 0 && height > 0) {
          const aspect = width / height;
          cameraRef.current.aspect = aspect;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
          // ★ [fix] 环绕运行时不要恢复 autoRotate（由 prop effect 管理）
          if (!orbitControllerRef.current?.isActive) {
            controlsRef.current.autoRotate = autoRotate;
          }
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
    
    
    // ★ 暂停环绕动画（避免两套Tween争夺相机控制权，平滑过渡完成后恢复）
    const wasOrbitActive = orbitControllerRef.current?.isActive ?? false;
    if (wasOrbitActive) {
      orbitControllerRef.current?.stop();
      console.log('📹 [相机配置] 已暂停环绕动画');
    }

    // ★ 关键修复：停止之前的动画（如果有的话）
    if (currentTweenRef.current) {
      currentTweenRef.current.stop();
      currentTweenRef.current.remove();
      console.log('📹 [相机配置] 已停止旧的Tween动画');
    }
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;
        
    // ★ 关键修复：简化重置逻辑——仅在相机极度接近原点(未初始化)时重置
    const targetCenter = new THREE.Vector3(
      config.target[0],
      config.target[1],
      config.target[2]
    );
    const currentPos = camera.position.clone();
        
    console.log('📹 [相机配置] 当前相机位置:', {
      position: `[${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}]`,
      distanceFromOrigin: currentPos.length().toFixed(2)
    });
        
    // 只在相机位置在原点附近时重置(刚初始化的默认位置)
    if (currentPos.length() < 0.5) {
      console.log('⚠️ [相机配置] 相机在原点附近，可能需要重置');
      const offset = new THREE.Vector3(0, 2, 6);
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
    const duration = Math.min(Math.max(distance * 500, 1500), 2500);
    
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
      })
      .onComplete(() => {
        console.log('✅ [相机配置] 自定义相机配置平滑过渡完成:', config);
        prevConfigRef.current = config;

        // ★ 恢复环绕动画（覆盖范围包含 wasOrbitActive）
        if (wasOrbitActive && orbitControllerRef.current) {
          orbitControllerRef.current.start(orbitDurationRef.current);
          console.log('📹 [相机配置] 已恢复环绕动画');
        }
      })
      .start();
    
    currentTweenRef.current = tween;
    
    // ★ 关键修复：将 tween 注册到全局 TWEEN 组，使每帧的 TWEEN.update() 能推进动画
    TWEEN.add(tween);
    
    // ★ 关键修复：TWEEN.update() 已整合到主 animate() 循环中，不再创建独立循环
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
        
        // ★ 关键修复：不再在此处调用 loadModel()，由 modelUrl useEffect 统一管理
        // 当 state 变为 READY 后，React 重新渲染，modelUrl useEffect 会自动触发加载
        
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

      // ★ [fix] StrictMode 双挂载时清理环绕控制器（旧控制器引用的相机/控制器已被 dispose）
      if (orbitControllerRef.current) {
        orbitControllerRef.current.stop();
        orbitControllerRef.current = null;
      }

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
  
    // ★ 关键修复：重置 spark 失败状态，允许新模型使用 SparkRenderer
    sparkFailedRef.current = false;

    // ★ 修复Spark渲染器不被场景包含的问题
    if (sparkRef.current && sceneRef.current) {
      const isInScene = sceneRef.current.children.includes(sparkRef.current);
      if (!isInScene) {
        sceneRef.current.add(sparkRef.current);
        console.log('🔄 SparkRenderer 重新添加到场景');
      }
    }
  
    // ✅ 对齐V2：模型切换时立即隐藏旧标签，防止闪烁（第1558-1562行）
    if (decorationRef.current) {
      decorationRef.current.hideLabels();
      console.log(' 模型切换：隐藏旧标签');
    }
  
    // ★ 模型切换：停止所有相机Tween动画（平滑过渡 + 环绕），保存环绕状态以便加载完成后恢复
    // ★ [fix] 不覆盖已保存的环绕状态，防止加载失败重试时丢失
    if (!savedOrbitActiveRef.current) {
      savedOrbitActiveRef.current = orbitControllerRef.current?.isActive ?? false;
    }
    if (savedOrbitActiveRef.current) {
      orbitControllerRef.current?.stop();
      console.log('🔄 模型切换：已停止环绕动画');
    }
    if (currentTweenRef.current) {
      currentTweenRef.current.stop();
      currentTweenRef.current = null;
    }

    // ✅ 关键修复：模型切换时禁用控制器，防止干扰新模型加载（对齐V2第1564-1568行）
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      console.log(' 模型切换：禁用控制器');
    }
  
    // 清理旧模型（对齐V2第1570-1577行）
    if (modelRef.current) {
      // ✅ 对齐V2：PLY/GLB Mesh/Points 显式释放 geometry/material
      if (modelRef.current instanceof THREE.Mesh || modelRef.current instanceof THREE.Points) {
        try {
          (modelRef.current as THREE.Mesh | THREE.Points).geometry.dispose();
          const mat = (modelRef.current as THREE.Mesh | THREE.Points).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat?.dispose();
        } catch (e) { /* ignore */ }
      }
      // ★ 从SparkRenderer移除旧SplatMesh并加入缓存
      if (modelRef.current instanceof SplatMesh && sparkRef.current) {
        const oldUrl = stateMachine.currentModelUrl;
        sparkRef.current.remove(modelRef.current);
        if (oldUrl) {
          modelCacheRef.current.set(oldUrl, modelRef.current as SplatMesh);
          globalModelCache.set(oldUrl, modelRef.current as SplatMesh);  // 同步到全局缓存
          // ★ LRU：缓存超过20条时淘汰最早的一条
          if (modelCacheRef.current.size >= 20) {
            const firstKey = modelCacheRef.current.keys().next().value;
            if (firstKey) {
              const evicted = modelCacheRef.current.get(firstKey);
              if (evicted) { try { (evicted as any).dispose?.(); } catch {} }
              modelCacheRef.current.delete(firstKey);
              console.log('🗑️ LRU淘汰缓存:', firstKey);
            }
          }
          console.log('📦 缓存模型:', oldUrl);
        }
      }
      // ★ 非SplatMesh → 从场景移除并缓存（保留GPU资源供复用）
      if (!(modelRef.current instanceof SplatMesh)) {
        const oldUrl = stateMachine.currentModelUrl;
        if (sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
        }
        // ★ 缓存到局部缓存（避免重复下载）
        if (oldUrl) {
          modelCacheRef.current.set(oldUrl, modelRef.current);
          // ★ LRU：超过20条时淘汰最早的一条
          if (modelCacheRef.current.size >= 20) {
            const firstKey = modelCacheRef.current.keys().next().value;
            if (firstKey) {
              const evicted = modelCacheRef.current.get(firstKey);
              if (evicted && !(evicted instanceof SplatMesh)) {
                try {
                  (evicted as any).traverse?.((child: any) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                      if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                      else child.material.dispose();
                    }
                  });
                } catch (e) { /* ignore */ }
              }
              modelCacheRef.current.delete(firstKey);
              console.log('🗑️ LRU淘汰GLB/PLY缓存:', firstKey);
            }
          }
        }
      }
      modelRef.current = null;
    }
  
    // ★ 状态机转换：进入LOADING状态（对齐V2第1580行：不使prev）
    setStateMachine({ state: 'LOADING', currentModelUrl: modelUrl });
      
    loadModel();
  }, [modelUrl, loadModel, stateMachine.state, stateMachine.currentModelUrl, modelLoaded]);  // ✅ 完全对齐V2：不删除任何依赖项

  // ★ 组件卸载时自动释放所有资源（防止GPU内存泄漏）
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => {
    const dispose = () => {
      cancelAnimationFrame(frameIdRef.current);
      // ★ 停止所有Tween动画
      if (currentTweenRef.current) {
        currentTweenRef.current.stop();
        currentTweenRef.current = null;
      }
      if (orbitControllerRef.current) {
        orbitControllerRef.current.dispose();
        orbitControllerRef.current = null;
      }
      if (modelRef.current) {
        // ✅ 对齐V2：PLY/GLB Mesh/Points 显式释放 geometry/material
        if (modelRef.current instanceof THREE.Mesh || modelRef.current instanceof THREE.Points) {
          try {
            (modelRef.current as THREE.Mesh | THREE.Points).geometry.dispose();
            const mat = (modelRef.current as THREE.Mesh | THREE.Points).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else mat?.dispose();
          } catch (e) { /* ignore */ }
        }
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
      // ★ 清理局部缓存中的GPU资源
      if (modelCacheRef.current) {
        modelCacheRef.current.forEach((model, url) => {
          if (model instanceof SplatMesh) {
            try { (model as any).dispose?.(); } catch { /* ignore */ }
          } else {
            try {
              (model as THREE.Object3D).traverse((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                  else child.material.dispose();
                }
              });
            } catch { /* ignore */ }
          }
          // ★ 同步清理全局缓存（防止重挂载后使用已释放的GPU资源）
          globalModelCache.delete(url);
        });
        modelCacheRef.current.clear();
      }
      console.log('🗑️ Base3DViewer资源已释放');
    };

    cleanupRef.current = dispose;

    return {
      getModel: () => modelRef.current,
      getStats: () => ({
        pointCount: 0,
        loaded: modelLoaded,
        loading,
        progress,
        fps,
      }),
      dispose,

      reload: () => {
        if (modelRef.current) {
          const currentUrl = stateMachine.currentModelUrl;
          if (currentUrl) {
            modelCacheRef.current.delete(currentUrl);
            globalModelCache.delete(currentUrl);
          }
          if (modelRef.current instanceof SplatMesh && sparkRef.current) {
            sparkRef.current.remove(modelRef.current);
            try { (modelRef.current as any).dispose?.(); } catch {}
          } else if (sceneRef.current) {
            sceneRef.current.remove(modelRef.current);
            try { (modelRef.current as any).dispose?.(); } catch {}
          }
          modelRef.current = null;
        }
        sparkFailedRef.current = false;
        setStateMachine({ state: 'READY', currentModelUrl: '' });
        setModelLoaded(false);
        if (sparkRef.current && sceneRef.current) {
          const isInScene = sceneRef.current.children.includes(sparkRef.current);
          if (!isInScene) { sceneRef.current.add(sparkRef.current); }
        }
        loadModel();
      },

      toggleAutoRotate: () => {
        if (controlsRef.current) controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
      },

      screenshot: () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          return rendererRef.current.domElement.toDataURL('image/png');
        }
        return '';
      },

      saveCameraConfig: (): CameraConfig => {
        if (!cameraRef.current || !controlsRef.current) throw new Error('相机或控制器未初始化');
        const config = CameraManager.saveConfig(cameraRef.current, controlsRef.current);
        onCameraConfigSave?.(config);
        return config;
      },

      loadCameraConfig: (config: CameraConfig) => {
        if (cameraRef.current) {
          applyCameraConfig(config);
          return;
        }
        console.warn('⚠️ [相机配置] 相机未就绪，延迟500ms后重试');
        // ★ 相机尚未初始化（可能因 StrictMode 双挂载或时序问题），延迟重试
        const retryTimer = setTimeout(() => {
          if (cameraRef.current) {
            console.log('✅ [相机配置] 延迟重试成功，应用配置');
            applyCameraConfig(config);
          } else {
            console.warn('⚠️ [相机配置] 延迟重试后相机仍未就绪，配置丢弃');
          }
        }, 500);
        // ★ 将 timer 存入 cleanupRef 以便组件卸载时清理
        const prevCleanup = cleanupRef.current;
        cleanupRef.current = () => {
          clearTimeout(retryTimer);
          prevCleanup?.();
        };
      },

      stopOrbit: () => { orbitControllerRef.current?.stop(); },

      startOrbit: (duration) => { orbitControllerRef.current?.start(duration); },

      getOrbitController: () => orbitControllerRef.current,

      resetCamera: () => {
        if (orbitControllerRef.current) orbitControllerRef.current.stop();
        if (!cameraRef.current || !controlsRef.current) throw new Error('相机或控制器未初始化');
        const model = modelRef.current;
        const canvas = canvasRef.current;
        if (model && canvas) {
          try {
            const result = SmartCenteringEngine.calculateFit(model, canvas, { margin, trimThreshold: 0.05, preferAxis: 'auto', autoCenter: true });
            applyCameraConfig({ position: [result.cameraPosition.x, result.cameraPosition.y, result.cameraPosition.z], target: [result.modelCenter.x, result.modelCenter.y, result.modelCenter.z], zoom: 1 });
          } catch { applyCameraConfig({ position: [0, 0, 5], target: [0, 0, 0], zoom: 1 }); }
        } else { applyCameraConfig({ position: [0, 0, 5], target: [0, 0, 0], zoom: 1 }); }
      },
    };
  });

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
      className={`base-3d-viewer layout-${layout}`}
      style={containerStyle}
      onClick={onClick}  // ✅ 对齐V2：单击事件
      onDoubleClick={onDoubleClick}  // ✅ 对齐V2：双击事件
    >
      <canvas ref={canvasRef} style={canvasStyle} />
      
      {/* ✅ 对齐V2：标题叠加层（移除 layout !== 'featured' 限制，用户显式启用时始终显示） */}
      {showTitle && (title || subtitle) && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: '#ffffff',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {title && <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', textShadow: '0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.5)' }}>{title}</h3>}
          {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.85, textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>{subtitle}</p>}
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
          color: 'rgba(255,255,255,0.7)',
          fontSize: '11px',
          fontFamily: 'monospace',
          padding: '4px 10px',
          borderRadius: '4px',
          display: 'flex',
          gap: '10px',
          zIndex: 20,
          textShadow: '0 0 6px rgba(0,0,0,0.8)'
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
          color: 'rgba(255,255,255,0.6)',
          fontSize: '11px',
          padding: '4px 10px',
          borderRadius: '4px',
          display: 'flex',
          gap: '8px',
          zIndex: 20,
          textShadow: '0 0 6px rgba(0,0,0,0.8)'
        }}>
          <span>拖拽旋转</span>
          <span>·</span>
          <span>滚轮缩放</span>
        </div>
      )}
      
      {/* DEV FPS 已移除（与截图按钮冲突，FPS信息由 3DGS 面板提供） */}
    </div>
  );
});

Base3DViewer.displayName = 'Base3DViewer';
