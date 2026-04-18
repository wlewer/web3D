// SparkViewer 组件 - 使用原生 Three.js 集成 Spark 2.0
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import './SparkViewer.css';

interface SparkViewerProps {
  splatUrl?: string;
  autoRotate?: boolean;
  enableControls?: boolean;
  showStats?: boolean;
}

export function SparkViewer({
  splatUrl = 'https://sparkjs.dev/assets/splats/butterfly.spz',
  autoRotate = true,
  enableControls = true,
  showStats = true,
}: SparkViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sparkRef = useRef<SparkRenderer | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const frameIdRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [fps, setFps] = useState(0);

  // 初始化 Three.js 场景
  const initScene = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0f');
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 初始化 Spark 渲染器
    const spark = new SparkRenderer({ renderer });
    sparkRef.current = spark;
    scene.add(spark);

    // 添加控制器
    let controls: OrbitControls | undefined;
    if (enableControls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1;
      controlsRef.current = controls;
    }

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 添加点光源
    const pointLight = new THREE.PointLight(0x667eea, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // 创建粒子背景
    createParticleBackground(scene);

    // 创建展示台
    createDisplayPlatform(scene);

    return { scene, camera, renderer, controls };
  }, [enableControls, autoRotate]);

  // 创建粒子背景
  const createParticleBackground = (scene: THREE.Scene) => {
    const particleCount = 3000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      // 紫色渐变
      colors[i * 3] = 0.4 + Math.random() * 0.3; // R
      colors[i * 3 + 1] = 0.3 + Math.random() * 0.2; // G
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1; // B
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'particles';
    scene.add(particles);
  };

  // 创建展示台
  const createDisplayPlatform = (scene: THREE.Scene) => {
    // 平台
    const platformGeometry = new THREE.CylinderGeometry(0.8, 1, 0.3, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a2e',
      metalness: 0.8,
      roughness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1;
    platform.name = 'platform';
    scene.add(platform);

    // 装饰环
    const ringGeometry = new THREE.RingGeometry(0.9, 0.95, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#667eea',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.85;
    ring.name = 'ring';
    scene.add(ring);
  };

  // 加载 Splat 模型
  const loadSplatModel = useCallback(async () => {
    if (!sparkRef.current) return;

    try {
      setProgress(10);

      // 模拟加载进度
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 15, 90));
      }, 200);

      const splat = new SplatMesh({ url: splatUrl });
      splatMeshRef.current = splat;

      // 设置位置和旋转
      splat.position.set(0, 0, 0);
      splat.quaternion.set(1, 0, 0, 0);

      // 添加到 Spark 渲染器
      sparkRef.current.add(splat);

      // 等待加载完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
      }, 300);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);

      // 如果 Splat 加载失败，显示占位模型
      createPlaceholderModel();
    }
  }, [splatUrl]);

  // 创建占位模型（Splat 加载失败时显示）
  const createPlaceholderModel = useCallback(() => {
    if (!sceneRef.current) return;

    const group = new THREE.Group();
    group.name = 'placeholder';

    // 主模型 - 多面体
    const icosaGeometry = new THREE.IcosahedronGeometry(0.5, 1);
    const icosaMaterial = new THREE.MeshStandardMaterial({
      color: '#667eea',
      metalness: 0.6,
      roughness: 0.3,
      wireframe: false,
    });
    const icosa = new THREE.Mesh(icosaGeometry, icosaMaterial);
    group.add(icosa);

    // 外层线框
    const wireGeometry = new THREE.IcosahedronGeometry(0.55, 1);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: '#764ba2',
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    group.add(wire);

    sceneRef.current.add(group);

    setTimeout(() => {
      setLoading(false);
      setModelLoaded(true);
    }, 300);
  }, []);

  // 动画循环
  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    const { camera, renderer, controls } = {
      camera: cameraRef.current,
      renderer: rendererRef.current,
      controls: controlsRef.current,
    };

    if (!camera || !renderer || !sceneRef.current) return;

    // 更新控制器
    if (controls) {
      controls.update();
    }

    // 旋转粒子背景
    const particles = sceneRef.current.getObjectByName('particles');
    if (particles) {
      particles.rotation.y += 0.0005;
    }

    // 旋转占位模型
    const placeholder = sceneRef.current.getObjectByName('placeholder');
    if (placeholder) {
      placeholder.rotation.y += 0.01;
      placeholder.rotation.x += 0.005;
    }

    // 旋转装饰环
    const ring = sceneRef.current.getObjectByName('ring');
    if (ring) {
      ring.rotation.z += 0.005;
    }

    // 渲染场景
    renderer.render(sceneRef.current, camera);

    // 更新 FPS
    setFps(Math.round(renderer.info.render.frame));
  }, []);

  // 初始化
  useEffect(() => {
    initScene();
    loadSplatModel();
    animate();

    return () => {
      cancelAnimationFrame(frameIdRef.current);

      // 清理资源
      if (splatMeshRef.current) {
        splatMeshRef.current.geometry?.dispose();
        splatMeshRef.current.material?.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, [initScene, loadSplatModel, animate]);

  // 处理窗口大小变化
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

  return (
    <div className="spark-viewer" ref={containerRef}>
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="spark-canvas" />

      {/* Spark 2.0 徽章 */}
      <div className="spark-badge">
        <span>Spark 2.0</span>
        <span className="spark-badge-tag">3DGS</span>
      </div>

      {/* 加载指示器 */}
      {loading && (
        <div className="spark-loading">
          <div className="spark-loading-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="spark-loading-bar-container">
            <div className="spark-loading-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="spark-loading-text">Loading 3DGS... {progress}%</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="spark-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* 统计信息 */}
      {showStats && modelLoaded && (
        <div className="spark-stats">
          <span>3D Gaussian Splatting</span>
          <span className="spark-stats-fps">FPS: {fps > 0 ? fps : '--'}</span>
          <span className="spark-badge-small">Powered by Spark 2.0</span>
        </div>
      )}

      {/* 控制提示 */}
      {modelLoaded && (
        <div className="spark-hints">
          <span>🖱️ Drag to rotate</span>
          <span>📜 Scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
