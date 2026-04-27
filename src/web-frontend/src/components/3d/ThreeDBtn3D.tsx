// 3D 旋转按钮组件 - 使用 Three.js 实现立体旋转效果

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import './ThreeDBtn3D.css';

interface ThreeDBtn3DProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export function ThreeDBtn3D({
  children,
  onClick,
  className = '',
  color = '#667eea',
  size = 'medium',
  disabled = false,
}: ThreeDBtn3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.Mesh;
    animationId: number;
  } | null>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [currentRotation, setCurrentRotation] = useState({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });

  // 初始化 Three.js 场景
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    // 设置画布尺寸
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    updateSize();

    // 创建场景
    const scene = new THREE.Scene();
    
    // 创建相机
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // 创建 WebGL 渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);

    // 创建 3D 按钮几何体（圆角立方体）
    const geometry = new THREE.BoxGeometry(2, 0.8, 0.3, 4, 4, 4);
    
    // 创建材质 - 带渐变效果
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.3,
      roughness: 0.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2,
    });

    // 创建网格
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 添加顶部高光条
    const highlightGeom = new THREE.BoxGeometry(1.8, 0.05, 0.32);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    });
    const highlight = new THREE.Mesh(highlightGeom, highlightMat);
    highlight.position.y = 0.35;
    mesh.add(highlight);

    // 添加边缘线框
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.3 
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    mesh.add(wireframe);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 添加点光源
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(2, 2, 4);
    scene.add(pointLight);

    // 添加背光
    const backLight = new THREE.PointLight(new THREE.Color(color), 0.5);
    backLight.position.set(-2, -1, -2);
    scene.add(backLight);

    sceneRef.current = { scene, camera, renderer, mesh, animationId: 0 };

    // 动画循环
    const animate = () => {
      if (!sceneRef.current) return;
      
      const { mesh } = sceneRef.current;
      
      // 平滑过渡到目标旋转
      targetRotation.current.x += (currentRotation.x - targetRotation.current.x) * 0.1;
      targetRotation.current.y += (currentRotation.y - targetRotation.current.y) * 0.1;
      
      // 应用旋转（悬停时根据鼠标位置旋转）
      mesh.rotation.x = targetRotation.current.x;
      mesh.rotation.y = targetRotation.current.y;
      
      // 微小的浮动动画
      mesh.position.y = Math.sin(Date.now() * 0.002) * 0.05;
      
      // 悬停时增加发光
      if (material instanceof THREE.MeshPhysicalMaterial) {
        const targetEmissive = isHovered ? 0.5 : 0.2;
        material.emissiveIntensity += (targetEmissive - material.emissiveIntensity) * 0.1;
      }
      
      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };
    animate();

    // 响应窗口大小变化
    const handleResize = () => {
      if (!sceneRef.current || !container) return;
      updateSize();
      const rect = container.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        geometry.dispose();
        material.dispose();
        highlightGeom.dispose();
        highlightMat.dispose();
        edges.dispose();
        lineMat.dispose();
        renderer.dispose();
        sceneRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 更新当前旋转（鼠标移动时）
  useEffect(() => {
    if (isHovered) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientY - rect.top - rect.height / 2) / rect.height * 0.5;
        const y = -(e.clientX - rect.left - rect.width / 2) / rect.width * 0.8;
        setCurrentRotation({ x, y });
      };
      
      const handleMouseLeave = () => {
        setCurrentRotation({ x: 0, y: 0 });
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [isHovered]);

  const handleMouseDown = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  return (
    <div 
      className={`three-d-btn-container ${size} ${className}`}
      ref={containerRef}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentRotation({ x: 0, y: 0 });
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <canvas ref={canvasRef} className="three-d-btn-canvas" />
      <div className={`three-d-btn-label ${isPressed ? 'pressed' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default ThreeDBtn3D;
