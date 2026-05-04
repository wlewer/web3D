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
  
  // ========== 场景装饰（新增）==========
  decorations?: DecorationConfig; // 装饰配置（粒子、展示台、标签）
  
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
  decorations,
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
  
  // ✅ 对齐V2：使用状态机管理加载生命周期（防止重复加载和并发问题）
  const [stateMachine, setStateMachine] = useState<{
    state: 'IDLE' | 'INITIALIZING' | 'READY' | 'LOADING' | 'LOADED' | 'ERROR';
    currentModelUrl: string;
  }>({ 
    state: 'IDLE',
    currentModelUrl: '' 
  });

  // FPS计数器
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({
    count: 0,
    lastTime: performance.now()
  });
  const [fps, setFps] = useState(0);

  // Spark渲染状态管理
  const sparkReadyRef = useRef(false);
  const sparkFailedRef = useRef(false);
  const renderingLockRef = useRef(false);

  /**
   * 初始化Three.js场景（完全对齐V2实现）
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
  }, [backgroundColor, enableControls, autoRotate, decorations]);

  /**
   * 加载模型（完全对齐V2：添加控制器管理）
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

      // ✅ 关键修复：加载开始时立即禁用控制器，防止相机位置被修改（对齐V2）
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
        console.log('🔒 加载开始：禁用控制器');
      }

      // 使用ModelLoader加载模型
      const result: LoadResult = await ModelLoader.load(modelUrl, (progressData: LoadProgress) => {
        setProgress(progressData.progress);
        onProgress?.(progressData.progress);
      });

      // 清除旧模型
      if (modelRef.current) {
        if (modelRef.current instanceof SplatMesh) {
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

      // 根据模型类型不同处理
      if (result.model instanceof SplatMesh) {
        // SPZ模型：添加到SparkRenderer
        console.log('🌟 SplatMesh模型：添加到SparkRenderer');
        modelRef.current = result.model;
        sparkRef.current?.add(result.model);
        
        // SplatMesh翻转
        result.model.rotation.x = Math.PI;
        console.log('🔄 SplatMesh已翻转（绕X轴180度）');
      } else {
        // GLB/PLY模型：添加到Scene
        console.log('📦 普通模型：添加到Scene');
        modelRef.current = result.model as THREE.Object3D;
        sceneRef.current.add(modelRef.current);
      }

      console.log('✅ 模型加载成功，开始智能居中');

      // 智能居中
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

      // 模型加载完成后启用控制器
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
        console.log('🎯 控制器已启用');
      }
            
      // ✅ 新增：显示产品标签（如果启用了）
      if (decorationRef.current && decorations?.labels?.enabled) {
        decorationRef.current.showLabels();
      }
            
      setLoading(false);
      setModelLoaded(true);
      setProgress(100);
            
      // ★ 状态机转换：进入LOADED状态（对齐V2）
      setStateMachine({ state: 'LOADED', currentModelUrl: modelUrl });
            
      onLoadComplete?.();

      console.log('✅ 模型加载和居中对齐完成');
    } catch (err) {
      console.error('❌ 模型加载失败:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      
      // ★ 状态机转换：进入ERROR状态（对齐V2）
      setStateMachine({ state: 'ERROR', currentModelUrl: modelUrl });
      
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [modelUrl, autoCenter, margin, onProgress, onLoadComplete, onError]);

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

  // ✅ 移除sceneInitialized，改用状态机管理
  // const [sceneInitialized, setSceneInitialized] = useState(false);

  // 初始化场景
  useEffect(() => {
    initScene();
    
    window.addEventListener('resize', handleResize);
    
    animate();

    // ✅ 对齐V2：场景初始化完成后，进入READY状态
    setStateMachine({ state: 'READY', currentModelUrl: '' });

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
  }, [initScene, handleResize, animate]);

  // ✅ 修复4：模型切换逻辑（修复循环加载问题）
  useEffect(() => {
    if (!sceneRef.current || !sparkRef.current) {
      console.log(' 等待场景初始化...');
      return;
    }
  
    if (!modelUrl) {
      console.warn('⚠️ modelUrl为空，跳过加载');
      return;
    }
  
    // ★ 关键修复：使用stateMachine.currentModelUrl而不是stateMachine.state作为依赖
    // 这样可以避免state变化导致useEffect重复触发
    if (modelUrl === stateMachine.currentModelUrl && modelLoaded) {
      console.log('✅ 模型已加载且URL未变化，跳过重新加载');
      return;
    }
  
    // ★ 状态机守卫：只在READY或LOADED状态下才处理modelUrl变化
    if (stateMachine.state !== 'READY' && stateMachine.state !== 'LOADED' && stateMachine.state !== 'IDLE') {
      console.log('️ 当前状态不允许加载模型:', stateMachine.state);
      return;
    }
  
    console.log('📥 开始加载新模型:', modelUrl);
  
    // ✅ 关键修复：模型切换时立即禁用控制器，防止干扰新模型加载（对齐V2第1565-1568行）
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      console.log('🔒 模型切换：禁用控制器');
    }
  
    // 清理旧模型（对齐V2第1570-1577行）
    if (modelRef.current) {
      console.log(' 清理旧模型...');
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
  
    // ★ 状态机转换：进入LOADING状态（对齐V2第1580行）
    setStateMachine({ state: 'LOADING', currentModelUrl: modelUrl });
      
    // 重置状态
    setModelLoaded(false);
    setLoading(true);
    setProgress(0);
  
    // 加载新模型
    loadModel();
  }, [modelUrl, loadModel, modelLoaded, stateMachine.currentModelUrl]);  // ✅ 修复：移除stateMachine.state依赖，防止循环

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getModel: () => modelRef.current,
    
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
