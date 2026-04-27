// 3D Splat 模型卡片组件
// 修复：默认显示静态缩略图，仅 isActive=true 时才初始化 WebGL，防止 WebGL Context 耗尽
import { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';
import './Model3DCard.css';

interface Model3DCardProps {
  modelUrl: string;
  thumbnail?: string;
  title: string;
  titleZh?: string;
  autoRotate?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const Model3DCard = memo(function Model3DCard({
  modelUrl,
  thumbnail = '📦',
  title,
  titleZh,
  autoRotate = true,
  isActive = false,
  onClick,
  size = 'medium'
}: Model3DCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // 关键修复：只有 isActive=true 时才初始化 WebGL，避免同时存在大量 WebGL Context
  useEffect(() => {
    // 未激活时：不创建 WebGL context，直接返回
    if (!isActive) return;
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth || 200;
    const containerHeight = container.clientHeight || 150;

    setIsLoading(true);
    setHasError(false);
    setLoadProgress(0);

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(60, containerWidth / containerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // 创建渲染器
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.error('WebGLRenderer creation failed:', e);
      setHasError(true);
      setIsLoading(false);
      return;
    }
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 处理 WebGL Context Lost
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('Model3DCard: WebGL Context Lost');
      cancelAnimationFrame(animationIdRef.current || 0);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // 创建 Spark 渲染器
    try {
      const spark = new SparkRenderer({ renderer });
      scene.add(spark);

      // 加载模型
      const loadModel = async () => {
        try {
          const splatMesh = new SplatMesh({ 
            url: modelUrl,
            onProgress: (event: ProgressEvent) => {
              if (event.lengthComputable) {
                setLoadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
              }
            }
          });
          
          splatMesh.quaternion.set(1, 0, 0, 0);
          splatMesh.position.set(0, 0, -3);
          scene.add(splatMesh);
          splatMeshRef.current = splatMesh;
          setIsLoading(false);
        } catch (error) {
          console.error('模型加载失败:', error);
          setHasError(true);
          setIsLoading(false);
        }
      };

      loadModel();

      // 动画循环
      let lastTime = 0;
      const animate = (time: number) => {
        const deltaTime = time - lastTime;
        lastTime = time;

        // 自动旋转
        if (autoRotate && splatMeshRef.current) {
          splatMeshRef.current.rotation.y += deltaTime / 2500;
        }

        renderer.render(scene, camera);
        animationIdRef.current = requestAnimationFrame(animate);
      };

      animationIdRef.current = requestAnimationFrame(animate);
    } catch (error) {
      console.error('Spark 初始化失败:', error);
      setHasError(true);
      setIsLoading(false);
    }

    // 响应窗口大小变化
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || 200;
      const newHeight = container.clientHeight || 150;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 清理：isActive 变 false 或组件卸载时，销毁 WebGL context
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (sceneRef.current) {
        scene.clear();
        sceneRef.current = null;
      }
      splatMeshRef.current = null;
    };
  }, [modelUrl, autoRotate, isActive]); // 将 isActive 加入依赖

  // 尺寸样式
  const sizeStyles = {
    small: { width: 160, height: 120 },
    medium: { width: 200, height: 150 },
    large: { width: 280, height: 200 },
  };

  return (
    <div 
      className={`model-3d-card ${isActive ? 'active' : ''} ${size}`}
      onClick={onClick}
    >
      {/* 3D 容器：仅 isActive 时挂载，其余时间不占用 WebGL Context */}
      <div 
        ref={containerRef} 
        className="model-container"
        style={{ 
          width: sizeStyles[size].width, 
          height: sizeStyles[size].height 
        }}
      >
        {/* 未激活时：显示静态缩略图占位，不创建任何 WebGL */}
        {!isActive && (
          <div className="model-thumbnail-placeholder">
            <span className="fallback-icon">{thumbnail}</span>
            <div className="thumbnail-hover-hint">▶ 点击查看3D</div>
          </div>
        )}
      </div>

      {/* 激活后加载中 */}
      {isActive && isLoading && !hasError && (
        <div className="model-loading">
          <div className="loading-spinner"></div>
          <span className="loading-text">{loadProgress}%</span>
        </div>
      )}

      {/* 错误/无URL 备用显示 */}
      {isActive && (!modelUrl || hasError) && (
        <div className="model-fallback">
          <span className="fallback-icon">{thumbnail}</span>
        </div>
      )}

      {/* 标题 */}
      <div className="model-title">
        {titleZh ? (
          <>
            <span className="title-zh">{titleZh}</span>
            <span className="title-en">{title}</span>
          </>
        ) : (
          <span className="title-default">{title}</span>
        )}
      </div>
    </div>
  );
});
