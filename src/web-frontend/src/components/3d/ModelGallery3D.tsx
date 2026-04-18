// 震撼3D模型画廊组件 - 空间环绕展示
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ModelItem {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  color: string;
  emoji: string;
  description: string;
}

const GALLERY_MODELS: ModelItem[] = [
  { id: 'm1', name: '3D蝴蝶', nameEn: '3D Butterfly', category: '自然生物', color: '#667eea', emoji: '🦋', description: '3D Gaussian实时渲染' },
  { id: 'm2', name: '室内空间', nameEn: 'Interior Space', category: '场景建模', color: '#f093fb', emoji: '🏠', description: '三维空间重建技术' },
  { id: 'm3', name: '汽车模型', nameEn: 'Vehicle Model', category: '工业制造', color: '#4facfe', emoji: '🚗', description: '工业级精准建模' },
  { id: 'm4', name: '人像扫描', nameEn: 'Portrait Scan', category: '人物建模', color: '#00f2fe', emoji: '👤', description: '数字人像采集技术' },
  { id: 'm5', name: '手机盒', nameEn: 'Phone Box', category: '包装设计', color: '#ffd700', emoji: '📱', description: '产品包装可视化' },
  { id: 'm6', name: '酒盒', nameEn: 'Wine Box', category: '包装设计', color: '#dc143c', emoji: '🍷', description: '高档包装3D展示' },
  { id: 'm7', name: '化妆盒', nameEn: 'Cosmetic Box', category: '包装设计', color: '#ff6b9d', emoji: '💄', description: '美妆产品数字营销' },
  { id: 'm8', name: '礼盒', nameEn: 'Gift Box', category: '包装设计', color: '#ffb347', emoji: '🎁', description: '礼品定制设计' },
];

interface ModelGallery3DProps {
  onModelSelect?: (model: ModelItem) => void;
  activeModelId?: string;
}

export function ModelGallery3D({ onModelSelect, activeModelId = 'm1' }: ModelGallery3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState(activeModelId);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 场景设置
    const scene = new THREE.Scene();
    
    // 深空背景
    scene.background = new THREE.Color(0x050510);
    
    // 相机 - 更宽广的视角
    const camera = new THREE.PerspectiveCamera(
      55,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 18);
    camera.lookAt(0, 0, 0);

    // 渲染器 - 增强画质
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.minDistance = 10;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 1.8;
    controls.minPolarAngle = Math.PI / 4;
    controls.enablePan = false;

    // ===== 增强灯光系统 =====
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    scene.add(ambientLight);

    // 主光源 - 暖色
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(10, 20, 15);
    mainLight.castShadow = true;
    scene.add(mainLight);

    // 补光 - 冷色
    const fillLight = new THREE.DirectionalLight(0x667eea, 0.6);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // 边缘光 - 品红
    const rimLight = new THREE.DirectionalLight(0xf093fb, 0.4);
    rimLight.position.set(0, -10, -20);
    scene.add(rimLight);

    // 动态点光源
    const dynamicLight1 = new THREE.PointLight(0x667eea, 3, 60);
    dynamicLight1.position.set(-15, 8, 10);
    scene.add(dynamicLight1);

    const dynamicLight2 = new THREE.PointLight(0xf093fb, 3, 60);
    dynamicLight2.position.set(15, 8, -10);
    scene.add(dynamicLight2);

    const dynamicLight3 = new THREE.PointLight(0x00f2fe, 2, 40);
    dynamicLight3.position.set(0, 15, 0);
    scene.add(dynamicLight3);

    // ===== 中心展示台 - 更炫酷 =====
    // 主平台
    const platformGeometry = new THREE.CylinderGeometry(4, 4.5, 0.4, 64);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x1a1a3a,
      emissiveIntensity: 0.3,
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -3;
    platform.receiveShadow = true;
    scene.add(platform);

    // 平台边缘发光环
    const ringGeometry = new THREE.RingGeometry(4.2, 4.8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x667eea,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.79;
    scene.add(ring);

    // 内圈
    const innerRingGeometry = new THREE.RingGeometry(3, 3.3, 64);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xf093fb,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = -2.78;
    scene.add(innerRing);

    // ===== 增强网格地面 =====
    const gridHelper = new THREE.GridHelper(50, 50, 0x333366, 0x1a1a44);
    gridHelper.position.y = -3.2;
    scene.add(gridHelper);

    // ===== 星云粒子系统 =====
    const starCount = 2000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // 球形分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 20 + Math.random() * 30;
      
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) - 5;
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      // 多色渐变
      const colorChoice = Math.random();
      let color;
      if (colorChoice < 0.33) {
        color = new THREE.Color(0x667eea);
      } else if (colorChoice < 0.66) {
        color = new THREE.Color(0xf093fb);
      } else {
        color = new THREE.Color(0x4facfe);
      }
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;

      starSizes[i] = Math.random() * 3 + 1;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // ===== 浮动光球 =====
    const orbCount = 20;
    const orbs: THREE.Mesh[] = [];
    const orbSpeeds: number[] = [];

    for (let i = 0; i < orbCount; i++) {
      const orbGeometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 16, 16);
      const orbMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x667eea : 0xf093fb,
        transparent: true,
        opacity: 0.6 + Math.random() * 0.4,
      });
      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      
      orb.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 40
      );
      
      orbs.push(orb);
      orbSpeeds.push(0.5 + Math.random() * 1.5);
      scene.add(orb);
    }

    // ===== 模型组 =====
    const modelMeshes: THREE.Group[] = [];
    const modelGroups: { [key: string]: THREE.Group } = {};

    GALLERY_MODELS.forEach((model, index) => {
      const group = new THREE.Group();
      group.position.set(
        Math.cos((index / GALLERY_MODELS.length) * Math.PI * 2) * 10,
        0,
        Math.sin((index / GALLERY_MODELS.length) * Math.PI * 2) * 10
      );
      group.userData = { id: model.id, name: model.name, index };
      modelGroups[model.id] = group;

      // ===== 主体 - 八面体形状 =====
      const mainGeometry = new THREE.OctahedronGeometry(1, 0);
      const mainMaterial = new THREE.MeshStandardMaterial({
        color: model.color,
        metalness: 0.7,
        roughness: 0.2,
        emissive: model.color,
        emissiveIntensity: 0.4,
        flatShading: true,
      });
      const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial);
      mainMesh.castShadow = true;
      group.add(mainMesh);

      // ===== 发光外壳 =====
      const shellGeometry = new THREE.OctahedronGeometry(1.15, 0);
      const shellMaterial = new THREE.MeshBasicMaterial({
        color: model.color,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      });
      const shell = new THREE.Mesh(shellGeometry, shellMaterial);
      group.add(shell);

      // ===== 边缘线框 =====
      const edgeGeometry = new THREE.EdgesGeometry(mainGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: model.color,
        transparent: true,
        opacity: 1,
        linewidth: 2,
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      group.add(edges);

      // ===== 旋转光环 =====
      const torusGeometry = new THREE.TorusGeometry(1.5, 0.03, 8, 64);
      const torusMaterial = new THREE.MeshBasicMaterial({
        color: model.color,
        transparent: true,
        opacity: 0.7,
      });
      const torus = new THREE.Mesh(torusGeometry, torusMaterial);
      torus.rotation.x = Math.PI / 2;
      group.add(torus);

      // ===== 第二光环 =====
      const torus2Geometry = new THREE.TorusGeometry(1.8, 0.02, 8, 64);
      const torus2Material = new THREE.MeshBasicMaterial({
        color: model.color,
        transparent: true,
        opacity: 0.4,
      });
      const torus2 = new THREE.Mesh(torus2Geometry, torus2Material);
      torus2.rotation.x = Math.PI / 3;
      torus2.rotation.y = Math.PI / 4;
      group.add(torus2);

      // ===== 粒子尾迹 =====
      const trailCount = 30;
      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(trailCount * 3);
      const trailColors = new Float32Array(trailCount * 3);

      for (let j = 0; j < trailCount; j++) {
        trailPositions[j * 3] = (Math.random() - 0.5) * 0.5;
        trailPositions[j * 3 + 1] = (Math.random() - 0.5) * 0.5;
        trailPositions[j * 3 + 2] = (Math.random() - 0.5) * 0.5;
        
        const trailColor = new THREE.Color(model.color);
        trailColors[j * 3] = trailColor.r;
        trailColors[j * 3 + 1] = trailColor.g;
        trailColors[j * 3 + 2] = trailColor.b;
      }

      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

      const trailMaterial = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });

      const trail = new THREE.Points(trailGeometry, trailMaterial);
      group.add(trail);

      // ===== 底部光柱 =====
      const pillarGeometry = new THREE.CylinderGeometry(0.05, 0.2, 2, 16);
      const pillarMaterial = new THREE.MeshBasicMaterial({
        color: model.color,
        transparent: true,
        opacity: 0.3,
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.y = -2;
      group.add(pillar);

      modelMeshes.push(group);
      scene.add(group);
    });

    // 射线检测
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(modelMeshes, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.id) {
          obj = obj.parent as THREE.Object3D;
        }
        if (obj.userData.id) {
          setSelectedModel(obj.userData.id);
          onModelSelect?.(GALLERY_MODELS.find(m => m.id === obj.userData.id)!);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // 动画循环
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();

      // 平台旋转
      ring.rotation.z = elapsedTime * 0.3;
      innerRing.rotation.z = -elapsedTime * 0.2;
      platform.rotation.y = elapsedTime * 0.15;

      // 模型动画
      modelMeshes.forEach((mesh, index) => {
        const isActive = mesh.userData.id === selectedModel;
        const baseY = Math.sin((index / GALLERY_MODELS.length) * Math.PI * 2) * 0;
        
        // 浮动
        mesh.position.y = baseY + Math.sin(elapsedTime * 1.5 + index * 0.5) * 0.5;
        
        // 旋转
        mesh.rotation.y = elapsedTime * (isActive ? 1.5 : 0.5);
        mesh.rotation.x = Math.sin(elapsedTime * 0.3 + index) * 0.2;
        
        // 缩放
        const targetScale = isActive ? 1.3 : 1;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
      });

      // 星空旋转
      stars.rotation.y = elapsedTime * 0.02;
      stars.rotation.x = elapsedTime * 0.01;

      // 光球动画
      orbs.forEach((orb, i) => {
        orb.position.y += Math.sin(elapsedTime * orbSpeeds[i] + i) * 0.01;
        orb.position.x += Math.cos(elapsedTime * orbSpeeds[i] * 0.5 + i) * 0.005;
        
        const material = orb.material as THREE.MeshBasicMaterial;
        material.opacity = 0.4 + Math.sin(elapsedTime * 2 + i) * 0.3;
      });

      // 动态光源
      dynamicLight1.position.x = Math.sin(elapsedTime * 0.3) * 15;
      dynamicLight1.position.z = Math.cos(elapsedTime * 0.3) * 15;
      dynamicLight2.position.x = Math.cos(elapsedTime * 0.4) * 15;
      dynamicLight2.position.z = Math.sin(elapsedTime * 0.4) * 15;
      dynamicLight3.intensity = 2 + Math.sin(elapsedTime) * 0.5;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    setIsLoaded(true);

    // 响应式
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [selectedModel, onModelSelect]);

  const currentModel = GALLERY_MODELS.find(m => m.id === selectedModel) || GALLERY_MODELS[0];

  return (
    <div className="model-gallery-3d">
      <div 
        ref={containerRef} 
        className="gallery-canvas"
      />
      
      {!isLoaded && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>加载3D场景...</p>
        </div>
      )}

      <div className="model-info-panel">
        <div className="model-emoji">{currentModel.emoji}</div>
        <h2>{currentModel.name}</h2>
        <p className="model-name-en">{currentModel.nameEn}</p>
        <p className="model-category">{currentModel.category}</p>
        <p className="model-description">{currentModel.description}</p>
        
        <div className="model-nav">
          {GALLERY_MODELS.map((model) => (
            <button
              key={model.id}
              className={`model-nav-btn ${model.id === selectedModel ? 'active' : ''}`}
              style={{ '--model-color': model.color } as React.CSSProperties}
              onClick={() => setSelectedModel(model.id)}
              title={model.name}
            >
              {model.emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="gallery-hints">
        <span>🖱️ 拖拽旋转</span>
        <span>🔍 滚轮缩放</span>
        <span>👆 点击选中</span>
      </div>
    </div>
  );
}
