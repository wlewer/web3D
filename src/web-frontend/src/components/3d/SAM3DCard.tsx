// SAM 3D Objects 展示组件 - 模拟图片转3D效果
import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import './SAM3DCard.css';

interface SAM3DCardProps {
  thumbnail?: string;
  title?: string;
  backgroundColor?: string;
}

export function SAM3DCard({ thumbnail, title = 'SAM 3D', backgroundColor }: SAM3DCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const frameIdRef = useRef<number>(0);
  const [imageError, setImageError] = useState(false);

  // 判断是否为外部图片URL
  const isExternalImage = thumbnail?.startsWith('http') && !imageError;

  useEffect(() => {
    // 如果有外部图片，不初始化 Three.js 场景
    if (isExternalImage || !containerRef.current) return;

    // 初始化场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建几何体 - 多面体展示3D效果
    const geometry = new THREE.IcosahedronGeometry(1.2, 1);
    
    // 创建材质 - 渐变发光效果
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x667eea,
      metalness: 0.3,
      roughness: 0.4,
      transmission: 0.2,
      thickness: 0.5,
      envMapIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // 添加边框线框
    const wireframeGeometry = new THREE.IcosahedronGeometry(1.25, 1);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x764ba2,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    mesh.add(wireframe);

    // 添加点光源
    const pointLight1 = new THREE.PointLight(0x667eea, 2, 100);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    // 添加点光源2
    const pointLight2 = new THREE.PointLight(0x764ba2, 2, 100);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // 动画循环
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.005;
        meshRef.current.rotation.y += 0.008;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="sam-3d-card-container">
      {/* 背景 */}
      <div 
        className="sam-3d-bg"
        style={{ background: backgroundColor || 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' }}
      />
      
      {/* 外部图片预览 */}
      {isExternalImage ? (
        <div className="sam-3d-external-image-container">
          <img 
            src={thumbnail} 
            alt={title} 
            className="sam-3d-external-image"
            onError={() => setImageError(true)}
          />
          {/* 输入图片标签 */}
          <div className="sam-3d-input-label">
            <span>📷 Input Image</span>
          </div>
        </div>
      ) : (
        <>
          {/* Three.js 容器 - 显示 3D 效果作为后备 */}
          <div ref={containerRef} className="sam-3d-canvas" />
          
          {/* 图片预览指示 */}
          <div className="sam-3d-image-preview">
            <span className="sam-3d-image-icon">🖼️</span>
            <span className="sam-3d-image-label">Input</span>
          </div>
        </>
      )}
      
      {/* 如果有外部图片且加载成功，显示 3D 输出标签 */}
      {isExternalImage && (
        <>
          {/* 3D 输出指示 */}
          <div className="sam-3d-output-badge">
            <span className="sam-3d-output-icon">✨</span>
            <span className="sam-3d-output-label">3D Output</span>
          </div>
          
          {/* 扫描线动画 */}
          <div className="sam-3d-scanline" />
        </>
      )}
    </div>
  );
}
