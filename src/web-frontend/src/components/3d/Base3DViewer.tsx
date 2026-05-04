/**
 * Base3DViewer - 基础3D查看器
 * 
 * 功能：纯3D渲染核心，无装饰功能
 * 特点：
 * - 使用新引擎层（SmartCenteringEngine、ModelLoader、CameraManager）
 * - 最小功能集
 * - forwardRef支持
 * - 完整的TypeScript类型
 * 
 * 适用场景：
 * - 后台管理系统
 * - 简单预览
 * - 需要自定义装饰的场景
 */

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { SmartCenteringEngine, type FitConfig } from './engines/SmartCenteringEngine';
import { ModelLoader, type LoadProgress } from './engines/ModelLoader';
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
  getModel: () => THREE.Object3D | null;
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
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
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

  /**
   * 初始化Three.js场景
   */
  const initScene = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;

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

    // 创建相机和控制器（使用CameraManager）
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
      alpha: true
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    console.log('🎨 Base3DViewer场景初始化完成');
  }, [enableControls, autoRotate]);

  /**
   * 加载模型
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
      const result = await ModelLoader.load(modelUrl, (progressData: LoadProgress) => {
        setProgress(progressData.progress);
        onProgress?.(progressData.progress);
      });

      // 清除旧模型
      if (modelRef.current) {
        sceneRef.current.remove(modelRef.current);
        modelRef.current = null;
      }

      // 添加新模型到场景
      modelRef.current = result.model as THREE.Object3D;
      sceneRef.current.add(modelRef.current);

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
          result.model as THREE.Object3D,
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
   * 动画循环
   */
  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    // 更新控制器
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    // 渲染场景
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
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
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
        modelRef.current = null;
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
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
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
