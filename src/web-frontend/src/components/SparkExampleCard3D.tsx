// Spark 3D 示例卡片组件 - 直接嵌入 3D 渲染效果
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';
import './SparkExampleCard3D.css';

interface SparkExampleCard3DProps {
  modelUrl?: string;
  thumbnail: string;
  title: string;
  autoRotate?: boolean;
  backgroundColor?: string;
  onClick?: () => void;
}

export function SparkExampleCard3D({
  modelUrl,
  thumbnail,
  title,
  autoRotate = true,
  backgroundColor = 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
  onClick
}: SparkExampleCard3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    const container = containerRef.current;
    const width = container.clientWidth || 280;
    const height = container.clientHeight || 160;

    setIsLoading(true);
    setHasError(false);

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建 Spark 渲染器
    try {
      const spark = new SparkRenderer({ renderer });
      scene.add(spark);

      // 加载模型
      const loadModel = async () => {
        try {
          const splatMesh = new SplatMesh({ url: modelUrl });
          splatMesh.quaternion.set(1, 0, 0, 0);
          splatMesh.position.set(0, 0, -3);
          scene.add(splatMesh);
          splatMeshRef.current = splatMesh;
          setIsLoading(false);
        } catch (error) {
          console.error(`${title} 加载失败:`, error);
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
      const newWidth = container.clientWidth || 280;
      const newHeight = container.clientHeight || 160;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      if (sceneRef.current) {
        scene.clear();
      }
    };
  }, [modelUrl, autoRotate, title]);

  return (
    <div 
      ref={containerRef} 
      className="spark-3d-card-container"
      style={{ background: backgroundColor }}
      onClick={onClick}
    >
      {/* 加载中 */}
      {isLoading && !hasError && (
        <div className="spark-3d-loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      )}

      {/* 备用显示 - 模型加载失败或无模型 */}
      {(!modelUrl || hasError) && (
        <div className="spark-3d-fallback">
          <span className="fallback-icon">{thumbnail}</span>
        </div>
      )}
    </div>
  );
}
