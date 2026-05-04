/**
 * 3D车间监测系统 - 360°全景背景版
 * 智能车间3D可视化展示，支持360°全景图背景
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './Workshop3D.css';

interface Workshop3DProps {
  onNavigate?: (page: string) => void;
  embedded?: boolean; // 是否为嵌入式模式
  onClose?: () => void; // 关闭回调（嵌入式模式使用）
  panoramaUrl?: string; // 全景图URL（可选，默认使用本地mob2uecf.png）
}

export function Workshop3D({ onNavigate, embedded = false, onClose, panoramaUrl }: Workshop3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaUrlRef = useRef(panoramaUrl); // 保存panoramaUrl的引用

  useEffect(() => {
    // 更新ref
    panoramaUrlRef.current = panoramaUrl;
    
    // 防止重复初始化
    if (containerRef.current?.dataset.initialized === 'true') {
      console.log('⚠️ 3D车间场景已初始化，跳过重复创建');
      return;
    }
    
    // 动态加载Three.js和相关库
    const loadThreeJS = async () => {
      // 先加载TWEEN脚本到全局
      if (!(window as any).TWEEN) {
        const tweenScript = document.createElement('script');
        tweenScript.src = 'https://unpkg.com/@tweenjs/tween.js@23.1.1/dist/tween.umd.js';
        document.head.appendChild(tweenScript);
        await new Promise(resolve => {
          tweenScript.onload = resolve;
        });
      }

      // 加载importmap
      const importmap = document.createElement('script');
      importmap.type = 'importmap';
      importmap.textContent = JSON.stringify({
        imports: {
          "three": "https://unpkg.com/three@0.128.0/build/three.module.js",
          "three/addons/": "https://unpkg.com/three@0.128.0/examples/jsm/",
          "tween": "https://unpkg.com/@tweenjs/tween.js@23.1.1/dist/tween.esm.js"
        }
      });
      document.head.appendChild(importmap);

      // 等待importmap加载
      await new Promise(resolve => setTimeout(resolve, 100));

      // 动态导入Three.js模块
      const THREE = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      // 不再使用CSS2DRenderer，改用CanvasTexture Sprite
      
      // 使用全局TWEEN
      const TWEEN = (window as any).TWEEN;

      if (!containerRef.current) return;

      // 获取容器实际尺寸
      const containerWidth = containerRef.current.clientWidth || window.innerWidth;
      const containerHeight = containerRef.current.clientHeight || window.innerHeight;

      // --- 初始化场景、相机、渲染器 ---
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a1a2e); // fallback背景色
      scene.fog = new THREE.FogExp2(0x1a2a3a, 0.003); // 雾效调淡

      const camera = new THREE.PerspectiveCamera(45, containerWidth / containerHeight, 0.1, 1000);
      camera.position.set(7, 4, 9);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerWidth, containerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      // ==================== 360°全景天空球 ====================
      const skySphereRadius = 35;
      const skySphereGeo = new THREE.SphereGeometry(skySphereRadius, 64, 64);
      const skySphereMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      });
      const skySphere = new THREE.Mesh(skySphereGeo, skySphereMat);
      skySphere.renderOrder = -10;
      skySphere.name = 'PanoramaSkySphere';
      scene.add(skySphere);

      // 加载全景图纹理
      function loadPanoramaTexture(url: string): Promise<THREE.Texture> {
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';

        return new Promise((resolve, reject) => {
          loader.load(
            url,
            (texture) => {
              texture.mapping = THREE.UVMapping;
              texture.wrapS = THREE.ClampToEdgeWrapping;
              texture.wrapT = THREE.ClampToEdgeWrapping;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
              console.log('✅ 全景图加载成功:', url);
              resolve(texture);
            },
            undefined,
            (error) => {
              console.warn('⚠️ 全景图加载失败，将使用占位背景:', url, error);
              reject(error);
            }
          );
        });
      }

      // 生成占位全景图（使用Canvas）
      function generatePlaceholderPanorama(): HTMLCanvasElement {
        const width = 1024;
        const height = 512;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // 天空渐变
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.55);
        skyGradient.addColorStop(0, '#0a1a3a');
        skyGradient.addColorStop(0.25, '#1a3a5c');
        skyGradient.addColorStop(0.5, '#3a6a9c');
        skyGradient.addColorStop(0.7, '#7ab8d4');
        skyGradient.addColorStop(0.85, '#b8d8e8');
        skyGradient.addColorStop(1, '#c8dce4');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height * 0.6);

        // 远处建筑轮廓
        ctx.fillStyle = '#2a3a4a';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.55);
        for (let x = 0; x <= width; x += 30) {
          const buildingHeight = 15 + Math.sin(x * 0.02) * 25 + Math.sin(x * 0.07) * 18 + Math.random() * 10;
          const y = height * 0.55 - buildingHeight;
          ctx.lineTo(x, Math.max(height * 0.3, y));
        }
        ctx.lineTo(width, height * 0.55);
        ctx.closePath();
        ctx.fill();

        // 建筑窗户光点
        ctx.fillStyle = '#ffdd88';
        for (let x = 50; x < width - 50; x += 35) {
          const bx = x + (Math.sin(x * 0.05) * 12);
          const bh = 15 + Math.sin(x * 0.02) * 20;
          const by = height * 0.55 - bh;
          for (let wy = by + 8; wy < height * 0.53; wy += 12) {
            if (Math.random() < 0.55) {
              ctx.fillRect(bx, wy, 4, 3);
            }
          }
        }

        // 地面渐变
        const groundGradient = ctx.createLinearGradient(0, height * 0.55, 0, height);
        groundGradient.addColorStop(0, '#5a6a7a');
        groundGradient.addColorStop(0.15, '#4a5a6a');
        groundGradient.addColorStop(0.5, '#3a4a5a');
        groundGradient.addColorStop(1, '#1a2a3a');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, height * 0.55, width, height * 0.45);

        // 地面标线
        ctx.strokeStyle = 'rgba(180,190,200,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([30, 50]);
        for (let gy = height * 0.6; gy < height * 0.9; gy += height * 0.08) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(width, gy);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // 太阳光晕
        const sunGrad = ctx.createRadialGradient(width * 0.15, height * 0.25, 10, width * 0.15, height * 0.25, 120);
        sunGrad.addColorStop(0, 'rgba(255,240,220,0.9)');
        sunGrad.addColorStop(0.3, 'rgba(255,200,150,0.4)');
        sunGrad.addColorStop(0.7, 'rgba(255,150,100,0.05)');
        sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, width * 0.4, height * 0.5);

        // 云朵
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let cx = 0; cx < width; cx += 150) {
          const cloudY = height * 0.12 + Math.sin(cx * 0.005) * height * 0.15;
          ctx.beginPath();
          ctx.ellipse(cx, cloudY, 60 + Math.random() * 40, 15 + Math.random() * 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        return canvas;
      }

      // 应用全景纹理
      function applyPanoramaTexture(texture: THREE.Texture) {
        skySphereMat.map = texture;
        skySphereMat.color.set(0xffffff);
        skySphereMat.needsUpdate = true;
      }

      // 初始化全景图
      async function initPanorama() {
        // 默认使用本地全景图 mob2uecf.png  workshop.jpg
        const imageUrl = panoramaUrlRef.current || '/models/panoramas/workshop.jpg';
        
        if (imageUrl && imageUrl.trim() !== '') {
          // 用户提供了全景图URL或使用默认本地全景图
          try {
            const texture = await loadPanoramaTexture(imageUrl);
            applyPanoramaTexture(texture);
            console.log('✅ 全景图已加载:', imageUrl);
          } catch (e) {
            // 加载失败，使用占位图
            const placeholderCanvas = generatePlaceholderPanorama();
            const texture = new THREE.CanvasTexture(placeholderCanvas);
            texture.mapping = THREE.UVMapping;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            applyPanoramaTexture(texture);
            console.log('ℹ️ 全景图加载失败，使用占位全景图');
          }
        } else {
          // 使用占位全景图
          const placeholderCanvas = generatePlaceholderPanorama();
          const texture = new THREE.CanvasTexture(placeholderCanvas);
          texture.mapping = THREE.UVMapping;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
          applyPanoramaTexture(texture);
          console.log('ℹ️ 使用占位全景图');
        }
      }

      initPanorama();
      // ==================== 全景图配置结束 ====================

      // 轨道控制
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 1.2;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.8;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.target.set(0, 0.8, 0);
      controls.maxDistance = skySphereRadius * 0.7;
      controls.minDistance = 2;

      // 不再使用CSS2DRenderer，改用CanvasTexture Sprite标签
      // const labelRenderer = new CSS2DRenderer();
      // labelRenderer.setSize(containerWidth, containerHeight);
      // labelRenderer.domElement.style.position = 'absolute';
      // labelRenderer.domElement.style.top = '0px';
      // labelRenderer.domElement.style.left = '0px';
      // labelRenderer.domElement.style.pointerEvents = 'none';
      // labelRenderer.domElement.style.zIndex = '1';
      // labelRenderer.domElement.className = 'css2d-label-container';
      // containerRef.current.appendChild(labelRenderer.domElement);

      // --- 灯光系统 ---
      const ambientLight = new THREE.AmbientLight(0x404060);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(5, 10, 7);
      dirLight.castShadow = true;
      dirLight.receiveShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      scene.add(dirLight);

      const backLight = new THREE.PointLight(0x4466cc, 0.4);
      backLight.position.set(-3, 2, -4);
      scene.add(backLight);

      const fillLight = new THREE.PointLight(0xffaa66, 0.3);
      fillLight.position.set(0, 2, 3);
      scene.add(fillLight);

      // 地面网格（降低透明度以融入全景背景）
      const gridHelper = new THREE.GridHelper(20, 20, 0x88aaff, 0x335588);
      gridHelper.position.y = -0.6;
      gridHelper.material.opacity = 0.5;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);

      // 半透明地面平面
      const groundPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x1a2a4a,
          roughness: 0.6,
          metalness: 0.1,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: true,
        })
      );
      groundPlane.rotation.x = -Math.PI / 2;
      groundPlane.position.y = -0.5;
      groundPlane.receiveShadow = true;
      groundPlane.name = 'GroundPlane';
      scene.add(groundPlane);

      // --- 机床数据 ---
      const machines = [
        { id: 0, name: "CNC数控铣床", x: -2.8, z: -2.0, color: 0x66ccff, status: "运行中", statusColor: "#00aa55" },
        { id: 1, name: "五轴联动加工中心", x: 2.5, z: -2.2, color: 0xffaa66, status: "待机", statusColor: "#ffaa33" },
        { id: 2, name: "精密磨床", x: 0, z: 1.8, color: 0x88ff88, status: "运行中", statusColor: "#00aa55" },
        { id: 3, name: "冲压机床", x: -2.0, z: 3.0, color: 0xff8888, status: "维护中", statusColor: "#aa3333" },
        { id: 4, name: "激光切割机", x: 3.2, z: 1.5, color: 0xaa88ff, status: "运行中", statusColor: "#00aa55" },
        { id: 5, name: "焊接机器人工作站", x: 0.5, z: -3.0, color: 0x66ffcc, status: "待机", statusColor: "#ffaa33" }
      ];

      const machineModels: any[] = [];

      // 创建机床3D模型
      console.log('🔧 开始创建机床模型，数量:', machines.length);
      machines.forEach(m => {
        console.log(`  - 创建机床: ${m.name} (ID: ${m.id})`);
        const group = new THREE.Group();
        group.name = `Machine_${m.id}_${m.name}`;

        const baseGeo = new THREE.BoxGeometry(1.6, 0.2, 1.6);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.4 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.1;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: m.color, metalness: 0.7, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const topGeo = new THREE.CylinderGeometry(0.5, 0.7, 0.3, 16);
        const topMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.8 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 1.05;
        top.castShadow = true;
        group.add(top);

        const lampGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const lampMat = new THREE.MeshStandardMaterial({
          color: m.status === "运行中" ? 0x00ff88 : (m.status === "待机" ? 0xffaa33 : 0xff3333),
          emissive: m.status === "运行中" ? 0x00aa44 : 0x331100
        });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(0.55, 1.15, 0.55);
        lamp.castShadow = true;
        group.add(lamp);

        // 设置group位置
        group.position.set(m.x, 0, m.z);
        group.userData = { id: m.id, name: m.name, status: m.status };

        // 使用CanvasTexture创建3D标签（避免CSS2DRenderer的DOM问题）
        function createTextTexture(text: string, statusColor: string): THREE.CanvasTexture {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = 256;
          canvas.height = 64;
          
          // 背景
          ctx.fillStyle = 'rgba(0,0,0,0.75)';
          ctx.beginPath();
          ctx.roundRect(0, 0, 256, 64, 20);
          ctx.fill();
          
          // 左侧状态条
          ctx.fillStyle = statusColor;
          ctx.beginPath();
          ctx.roundRect(4, 8, 6, 48, 3);
          ctx.fill();
          
          // 文字
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px Microsoft YaHei, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 20, 32);
          
          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          return texture;
        }
        
        const statusColor = m.status === "运行中" ? '#00ff88' : (m.status === "待机" ? '#ffaa33' : '#ff6666');
        const labelTexture = createTextTexture(m.name, statusColor);
        const labelMaterial = new THREE.SpriteMaterial({ 
          map: labelTexture, 
          transparent: true,
          depthTest: false,
          depthWrite: false
        });
        const labelSprite = new THREE.Sprite(labelMaterial);
        labelSprite.position.set(0, 1.5, 0);
        labelSprite.scale.set(1.8, 0.45, 1);
        group.add(labelSprite); // 添加到group
        
        scene.add(group);

        machineModels.push({
          group,
          lamp,
          label: labelSprite, // 保存Sprite引用
          id: m.id,
          name: m.name,
          pos: new THREE.Vector3(m.x, 0.6, m.z),
          status: m.status
        });
      });

      // --- 侧边栏和状态面板 ---
      const machineListDiv = document.getElementById('machineList');
      const statusContentDiv = document.getElementById('statusContent');
      let currentActiveMachineId: number | null = null;

      function updateSidebarAndStatus() {
        if (!statusContentDiv || !machineListDiv) return;

        statusContentDiv.innerHTML = machineModels.map(m => {
          const machineData = machines.find(md => md.id === m.id);
          return `<p>🔧 ${m.name}: <span style="color:${machineData?.statusColor}">${machineData?.status}</span></p>`;
        }).join('');

        machineListDiv.innerHTML = '';
        machines.forEach(m => {
          const item = document.createElement('div');
          item.className = 'machine-item';
          if (currentActiveMachineId === m.id) item.classList.add('active');
          item.innerHTML = `
            <div class="machine-icon">⚙️</div>
            <div class="machine-info">
              <div class="machine-name">${m.name}</div>
              <span class="machine-status" style="background:${m.statusColor}">${m.status}</span>
            </div>
          `;
          item.onclick = (e: any) => {
            e.stopPropagation();
            focusOnMachineById(m.id);
            document.getElementById('machineSidebar')?.classList.remove('open');
          };
          machineListDiv.appendChild(item);
        });
      }

      // 模拟状态变化
      function simulateStatusChange() {
        machines.forEach(m => {
          const r = Math.random();
          if (r < 0.7) { m.status = "运行中"; m.statusColor = "#00aa55"; }
          else if (r < 0.85) { m.status = "待机"; m.statusColor = "#ffaa33"; }
          else { m.status = "维护中"; m.statusColor = "#aa3333"; }

          const model = machineModels.find(mm => mm.id === m.id);
          if (model) {
            const lampMat = model.lamp.material;
            if (m.status === "运行中") {
              lampMat.color.setHex(0x00ff88);
              lampMat.emissive.setHex(0x00aa44);
            } else if (m.status === "待机") {
              lampMat.color.setHex(0xffaa33);
              lampMat.emissive.setHex(0x331100);
            } else {
              lampMat.color.setHex(0xff3333);
              lampMat.emissive.setHex(0x441100);
            }
            // 注意：label是Sprite对象，没有element属性，这里注释掉相关代码
            // 如果需要更新标签样式，应该通过修改Sprite的material来实现
            /*
            const borderColor = m.status === "运行中" ? '#00ff88' : (m.status === "待机" ? '#ffaa33' : '#ff6666');
            if (model.label && (model.label as any).element) {
              (model.label as any).element.style.borderLeft = `3px solid ${borderColor}`;
            }
            */
          }
        });
        updateSidebarAndStatus();
      }

      setInterval(simulateStatusChange, 4000);

      // --- 相机聚焦和环绕 ---
      let autoRotateActive = false;
      let autoRotateInterval: any = null;

      function stopAutoRotate() {
        if (autoRotateInterval) {
          clearInterval(autoRotateInterval);
          autoRotateInterval = null;
        }
        autoRotateActive = false;
        controls.autoRotate = false;
      }

      function startAutoRotate() {
        stopAutoRotate();
        autoRotateActive = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.2;
      }

      function focusOnMachineById(machineId: number) {
        const machine = machines.find(m => m.id === machineId);
        if (!machine) return;

        const targetPos = new THREE.Vector3(machine.x, 0.6, machine.z);
        const currentTarget = controls.target;
        const currentCamPos = camera.position.clone();

        const direction = currentCamPos.clone().sub(currentTarget).normalize();
        const distance = 4.2;
        const newCamPos = targetPos.clone().add(direction.multiplyScalar(distance));
        newCamPos.y = Math.max(2.0, currentCamPos.y);

        new TWEEN.Tween(camera.position)
          .to({ x: newCamPos.x, y: newCamPos.y, z: newCamPos.z }, 700)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .start();

        new TWEEN.Tween(controls.target)
          .to({ x: targetPos.x, y: targetPos.y + 0.3, z: targetPos.z }, 700)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onComplete(() => {
            startAutoRotate();
          })
          .start();

        currentActiveMachineId = machine.id;
        updateSidebarAndStatus();
      }

      // --- 鼠标点击检测 ---
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      function onCanvasClick(event: MouseEvent) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const clickableObjects: any[] = [];
        machineModels.forEach(m => {
          m.group.children.forEach(child => clickableObjects.push(child));
          clickableObjects.push(m.group);
        });

        const intersects = raycaster.intersectObjects(clickableObjects);
        if (intersects.length > 0) {
          let hit = intersects[0].object;
          while (hit.parent && !machineModels.find(m => m.group === hit)) {
            hit = hit.parent;
          }
          const foundModel = machineModels.find(m => m.group === hit);
          if (foundModel) {
            focusOnMachineById(foundModel.id);
          }
        }
      }

      renderer.domElement.addEventListener('click', onCanvasClick);

      controls.addEventListener('start', () => {
        if (autoRotateActive) stopAutoRotate();
      });

      // --- 侧边栏交互 ---
      const toggleBtn = document.getElementById('toggleBtn');
      const machineSidebar = document.getElementById('machineSidebar');
      const closeBtn = document.getElementById('closeBtn');

      toggleBtn?.addEventListener('click', (e: any) => {
        e.stopPropagation();
        machineSidebar?.classList.toggle('open');
      });

      closeBtn?.addEventListener('click', () => {
        machineSidebar?.classList.remove('open');
      });

      document.addEventListener('click', (e: any) => {
        if (machineSidebar && !machineSidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target) && machineSidebar.classList.contains('open')) {
          machineSidebar.classList.remove('open');
        }
      });

      machineSidebar?.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (machineSidebar && !machineSidebar.matches(':hover') && machineSidebar.classList.contains('open') && toggleBtn && !toggleBtn.matches(':hover')) {
            machineSidebar.classList.remove('open');
          }
        }, 300);
      });

      // --- 漂浮粒子 ---
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 600;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 160;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 40 + 5;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 30;
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: 0x88aaff,
        size: 0.06,
        transparent: true,
        opacity: 0.5,
        fog: true,
        depthWrite: false,
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      stars.renderOrder = 1;
      scene.add(stars);

      function animateStars() {
        stars.rotation.y += 0.0004;
        stars.rotation.x += 0.0002;
        requestAnimationFrame(animateStars);
      }
      animateStars();

      // --- 初始化 ---
      updateSidebarAndStatus();

      // --- 动画循环 ---
      function animate() {
        requestAnimationFrame(animate);
        TWEEN.update();
        controls.update();
        renderer.render(scene, camera);
        // labelRenderer.render(scene, camera); // 不再使用
      }
      animate();

      // --- 响应窗口大小变化 ---
      function handleResize() {
        const width = containerRef.current?.clientWidth || window.innerWidth;
        const height = containerRef.current?.clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        // labelRenderer.setSize(width, height); // 不再使用
      }
      window.addEventListener('resize', handleResize);
      
      // 标记为已初始化
      if (containerRef.current) {
        containerRef.current.dataset.initialized = 'true';
      }

      // 清理函数
      return () => {
        // 移除初始化标记
        if (containerRef.current) {
          delete containerRef.current.dataset.initialized;
        }
        
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('click', onCanvasClick);
        
        // 清理所有标签
        machineModels.forEach(m => {
          if (m.label) {
            // 从场景中移除
            if (m.label.parent) {
              m.label.parent.remove(m.label);
            }
            // 清理DOM元素
            if (m.label.element && m.label.element.parentNode) {
              m.label.element.parentNode.removeChild(m.label.element);
            }
          }
        });
        
        // 清理场景中的所有机床模型
        machineModels.forEach(m => {
          if (m.group && m.group.parent) {
            m.group.parent.remove(m.group);
          }
        });
        
        // 清理场景中的天空球
        const skySphere = scene.getObjectByName('PanoramaSkySphere');
        if (skySphere) {
          scene.remove(skySphere);
        }
        
        // 清理渲染器
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
        // if (containerRef.current && labelRenderer.domElement) {
        //   containerRef.current.removeChild(labelRenderer.domElement);
        // }
        
        // 释放资源
        renderer.dispose();
        // labelRenderer没有dispose方法，直接移除DOM元素即可
        // if (containerRef.current && labelRenderer.domElement) {
        //   containerRef.current.removeChild(labelRenderer.domElement);
        // }
      };
    };

    loadThreeJS();
  }, []); // 空依赖数组，只在组件挂载时初始化一次

  return (
    <div ref={containerRef} className={`workshop-3d-container ${!embedded ? 'standalone' : ''}`}>
      {/* 全景图加载提示 */}
      <div className="panorama-hint" id="panoramaHint">
        🌐 360°全景背景加载中... | 拖拽旋转查看全景
      </div>
      
      {/* 嵌入式模式下的关闭按钮 */}
      {embedded && onClose && (
        <button className="embedded-close-btn" onClick={onClose}>
          ✕ 收起
        </button>
      )}
      
      {/* 悬浮按钮 */}
      <div className="floating-toggle" id="toggleBtn">
        <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
      </div>

      {/* 右侧侧边栏 */}
      <div className="machine-sidebar" id="machineSidebar">
        <div className="sidebar-header">
          <h3>🔧 机床列表</h3>
          <button className="close-sidebar" id="closeBtn">×</button>
        </div>
        <div className="machine-list" id="machineList"></div>
      </div>

      {/* 实时数据面板 */}
      <div className="data-panel" id="dataPanel">
        <h4>📊 实时设备状态</h4>
        <div id="statusContent">加载中...</div>
      </div>

      {/* 操作提示 */}
      <div className="controls-hint">
        🖱️ 鼠标拖拽旋转 | 右键平移 | 滚动缩放<br />
        ✨ 点击任意机床模型或列表项，自动聚焦并360°环绕<br />
        🌐 拖拽旋转查看360°全景背景
      </div>

      {/* 返回/关闭按钮 */}
      {!embedded && (
        <div className="workshop-back-btn">
          <button onClick={() => onNavigate?.('home')} className="back-button">
            ← 返回首页
          </button>
        </div>
      )}
    </div>
  );
}

export default Workshop3D;
