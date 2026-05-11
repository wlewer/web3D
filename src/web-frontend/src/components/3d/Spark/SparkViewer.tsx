// SparkViewer 组件 - 使用原生 Three.js 集成 Spark 2.0
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { useTranslation } from '../../../i18n';
import './SparkViewer.css';
import { formatMessage } from '../../../i18n';

interface SparkViewerProps {
  splatUrl?: string;
  autoRotate?: boolean;
  enableControls?: boolean;
  showStats?: boolean;
  backgroundColor?: string;
  // 新增：产品信息标签
  products?: Array<{
    id: string;
    name: string;
    nameEn?: string;
    description: string;
    descriptionEn?: string;
    position?: [number, number, number];
    color?: string;
  }>;
  // 新增：交互回调 - 用户操控3D时触发
  onInteraction?: () => void;
  // 新增：加载状态回调 - 供父组件感知加载进度
  onLoadStateChange?: (loading: boolean) => void;
}

export function SparkViewer({
  splatUrl = 'https://sparkjs.dev/assets/splats/butterfly.spz',
  autoRotate = true,
  enableControls = true,
  showStats = true,
  backgroundColor = '#0a0a0f',
  products = [],
  onInteraction,
  onLoadStateChange,
}: SparkViewerProps) {
  const { language, t } = useTranslation();
  const isZh = language === 'zh-CN';
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sparkRef = useRef<SparkRenderer | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const frameIdRef = useRef<number>(0);
  const labelsGroupRef = useRef<THREE.Group | null>(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [fps, setFps] = useState(0);
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: performance.now() });
  const isInteractingRef = useRef(false);
  const sparkReadyRef = useRef(false); // Spark 内部渲染管线是否可用
  const sparkFailedRef = useRef(false); // Spark 已进入异常状态，永久降级
  const renderingLockRef = useRef(false); // 帧同步锁：防止 update() 未完成时再次调用

  // 通知父组件加载状态变化
  useEffect(() => {
    onLoadStateChange?.(loading);
  }, [loading, onLoadStateChange]);
  const initScene = useCallback(() => {
    if (!containerRef.current) {
      console.warn('SparkViewer: container not ready');
      return null;
    }
    if (!canvasRef.current) {
      console.warn('SparkViewer: canvas not ready');
      return null;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 如果尺寸为0，使用默认值
    const safeWidth = width || 400;
    const safeHeight = height || 300;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // 创建渲染器
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      
      // 抑制WebGL程序信息日志（避免控制台警告）
      const originalConsoleWarn = console.warn;
      console.warn = function(...args) {
        // 过滤掉WebGL Program Info Log警告
        if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.WebGLProgram')) {
          return; // 忽略WebGL警告
        }
        originalConsoleWarn.apply(console, args);
      };
    } catch (e) {
      console.error('WebGLRenderer creation failed:', e);
      return null;
    }
    renderer.setSize(safeWidth, safeHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 处理 WebGL Context Lost 事件
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL Context Lost');
      cancelAnimationFrame(frameIdRef.current);
    };

    const handleContextRestored = () => {
      console.log('WebGL Context Restored');
      // 尝试重新初始化
      if (sparkRef.current) {
        animate();
      }
    };

    canvasRef.current.addEventListener('webglcontextlost', handleContextLost);
    canvasRef.current.addEventListener('webglcontextrestored', handleContextRestored);

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

    // 创建产品标签组
    const labelsGroup = new THREE.Group();
    labelsGroup.name = 'product-labels';
    scene.add(labelsGroup);
    labelsGroupRef.current = labelsGroup;

    // 如果有产品数据，创建3D标签
    if (products.length > 0) {
      createProductLabels(labelsGroup);
    }

    return { scene, camera, renderer, controls };
  }, [enableControls, autoRotate, products, backgroundColor]);

  // 创建3D标签精灵
  const create3DLabel = useCallback((
    product: { id: string; name: string; nameEn?: string; description: string; descriptionEn?: string; color?: string },
    position: [number, number, number]
  ): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;

    // 背景
    ctx.fillStyle = 'rgba(15, 15, 35, 0.9)';
    ctx.roundRect(0, 0, 256, 128, 16);
    ctx.fill();

    // 边框
    ctx.strokeStyle = product.color || '#667eea';
    ctx.lineWidth = 3;
    ctx.roundRect(3, 3, 250, 122, 14);
    ctx.stroke();

    // 产品名称 - 根据语言选择
    const displayName = isZh ? (product.name || product.nameEn || '') : (product.nameEn || product.name || '');
    const displayDesc = isZh ? (product.description || product.descriptionEn || '') : (product.descriptionEn || product.description || '');

    // 产品名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 128, 40);

    // 描述（最多两行）
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const lines = wrapText(ctx, displayDesc, 220);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 128, 65 + i * 22);
    });

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(...position);
    sprite.scale.set(1, 0.5, 1);
    sprite.name = `product-label-${product.id}`;

    return sprite;
  }, [isZh]); // 添加 isZh 依赖

  // 创建产品3D标签
  const createProductLabels = (group: THREE.Group) => {
    products.forEach((product, index) => {
      // 计算标签位置 - 围绕中心环形分布
      const angle = (index / products.length) * Math.PI * 2;
      const radius = 1.5;
      const position: [number, number, number] = product.position || [
        Math.cos(angle) * radius,
        0.3 + index * 0.3,
        Math.sin(angle) * radius
      ];

      // 创建精灵标签
      const sprite = create3DLabel(product, position);
      group.add(sprite);
    });
  };

  // 文字换行辅助函数
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

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

  // 加载 Splat 模型（含超时保护 + 心跳进度）
  const loadSplatModel = useCallback(async () => {
    if (!sparkRef.current) return;

    let loadingTimedOut = false;
    let progressReceived = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    try {
      setError(null);
      setLoading(true);
      setModelLoaded(false);
      setProgress(10);

      // ★ 心跳进度：Vite dev server 不发 Content-Length，lengthComputable=false
      //    用计时器模拟下载进度，每 300ms 从 10% 缓慢爬到 75%（共滑行 15 秒）
      const heartbeatStart = Date.now();
      heartbeatTimer = setInterval(() => {
        if (loadingTimedOut) return;
        if (progressReceived) return; // 真实进度优先
        const elapsed = (Date.now() - heartbeatStart) / 1000;
        // 指数衰减曲线：前 5 秒快速爬升，后 10 秒缓慢
        const simulated = 10 + (1 - Math.exp(-elapsed / 5)) * 65;
        setProgress(Math.min(75, Math.round(simulated)));
      }, 300);

      // 创建 SplatMesh，传入 URL
      const splat = new SplatMesh({ 
        url: splatUrl,
        onProgress: (event) => {
          if (loadingTimedOut) return;
          if (event.lengthComputable) {
            progressReceived = true;
            setProgress(Math.min(90, 10 + (event.loaded / event.total) * 80));
          }
        }
      });
      splatMeshRef.current = splat;

      // 设置位置和旋转
      splat.position.set(0, 0, 0);
      splat.quaternion.set(1, 0, 0, 0);

      // 添加到 Spark 渲染器
      sparkRef.current.add(splat);

      // 超时保护：25 秒后如果还没初始化完成，显示占位模型
      const timeoutGuard = setTimeout(() => {
        if (!loadingTimedOut) {
          loadingTimedOut = true;
          console.warn(`Splat 模型加载超时: ${splatUrl}`);
          setError('模型加载超时，请检查网络连接');
          setLoading(false);
          setModelLoaded(false);
          createPlaceholderModel();
        }
      }, 25000);

      // 等待 SplatMesh 初始化完成
      await splat.initialized;
      clearTimeout(timeoutGuard);

      if (loadingTimedOut) return;

      // 清除心跳
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
      }, 300);
    } catch (err) {
      console.error('Splat model load error:', err);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (!loadingTimedOut) {
        setError((err as Error).message);
        setLoading(false);
        setModelLoaded(false);
        // 如果 Splat 加载失败，显示占位模型
        createPlaceholderModel();
      }
    }
  }, [splatUrl, createPlaceholderModel]);

  // 动画循环
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

    // 使用 SparkRenderer 的 render 方法渲染 Splat 数据
    if (spark && !sparkFailedRef.current && splatMeshRef.current && !renderingLockRef.current) {
      // 帧同步锁：前一次 update() 未完成时跳过该帧，防止累加器池耗尽
      renderingLockRef.current = true;
      spark.update({ scene: sceneRef.current, camera })
        .then(() => {
          spark.render(sceneRef.current!, camera);
          renderingLockRef.current = false;
        })
        .catch(() => {
          renderingLockRef.current = false;
          sparkFailedRef.current = true;
        });
      sparkReadyRef.current = true;
    } else if (sceneRef.current && camera && renderer) {
      // 没有 SparkRenderer 或已降级或帧被跳过，使用普通的 Three.js 渲染
      // 即使跳过帧也继续渲染 Three.js 内容（粒子背景等）
      renderer.render(sceneRef.current, camera);
    }

    // 更新 FPS（每秒采样一次）
    fpsCounterRef.current.count++;
    const now = performance.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    if (elapsed >= 1000) {
      setFps(Math.round((fpsCounterRef.current.count * 1000) / elapsed));
      fpsCounterRef.current.count = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, []);

  // 初始化场景 - 只执行一次
  useEffect(() => {
    // 等待 canvasRef 准备好
    const timer = setTimeout(() => {
      const result = initScene();
      if (result) {
        loadSplatModel();
        animate();
      } else {
        // 如果初始化失败，设置为加载完成但显示错误
        setError('Failed to initialize 3D viewer');
        setLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameIdRef.current);

      // 清理 SplatMesh
      if (splatMeshRef.current) {
        try {
          splatMeshRef.current.dispose?.();
        } catch (e) {
          console.warn('SplatMesh cleanup warning:', e);
        }
        splatMeshRef.current = null;
      }
      // 清理 Spark 渲染器
      if (sparkRef.current) {
        sparkRef.current = null;
      }
      // 清理 Three.js 渲染器（释放 WebGL Context）
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      // 清理控制器
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      // 清理场景
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ★ 模型切换：splatUrl 变化时，复用现有场景/上下文，只替换模型
  useEffect(() => {
    if (!sparkRef.current || !sceneRef.current) return;

    // 清理旧模型
    if (splatMeshRef.current) {
      try {
        splatMeshRef.current.dispose?.();
      } catch (e) {
        console.warn('SplatMesh cleanup warning:', e);
      }
      splatMeshRef.current = null;
    }

    // 加载新模型（共用同一个 WebGL 上下文）
    loadSplatModel();
  }, [splatUrl, loadSplatModel]);

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

  // 监听用户交互事件，停止自动播放
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let interactionTimeout: ReturnType<typeof setTimeout>;

    const handleInteractionStart = () => {
      isInteractingRef.current = true;
      onInteraction?.();
      
      // 停止自动旋转
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }
      
      // 清除之前的延迟
      clearTimeout(interactionTimeout);
    };

    const handleInteractionEnd = () => {
      // 延迟2秒后恢复自动旋转
      interactionTimeout = setTimeout(() => {
        isInteractingRef.current = false;
        if (controlsRef.current) {
          controlsRef.current.autoRotate = autoRotate;
        }
      }, 2000);
    };

    // 添加交互事件监听
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
  }, [onInteraction, autoRotate]);

  // 语言变化时重新创建产品标签
  useEffect(() => {
    if (!labelsGroupRef.current || products.length === 0) return;

    // 清空现有标签
    while (labelsGroupRef.current.children.length > 0) {
      const child = labelsGroupRef.current.children[0];
      if (child instanceof THREE.Sprite) {
        const material = child.material as THREE.SpriteMaterial;
        if (material.map) material.map.dispose();
        material.dispose();
      }
      labelsGroupRef.current.remove(child);
    }

    // 重新创建标签
    products.forEach((product, index) => {
      const angle = (index / products.length) * Math.PI * 2;
      const radius = 1.5;
      const position: [number, number, number] = [
        Math.cos(angle) * radius,
        0.3 + index * 0.3,
        Math.sin(angle) * radius
      ];
      const sprite = create3DLabel(product, position);
      labelsGroupRef.current!.add(sprite);
    });
  }, [language, products, create3DLabel]);

  return (
    <div className="spark-viewer" ref={containerRef}>
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="spark-canvas" />

      {/* Spark 2.0 徽章 - 隐藏以避免与其他按钮重叠 */}
      {/* 
      <div className="spark-badge">
        <span>Spark 2.0</span>
        <span className="spark-badge-tag">3DGS</span>
      </div> 
      */}

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
          <span className="spark-loading-text">{t.viewer.loadingFull} {progress}%</span>
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
          <span>{t.viewer.title3dgs}</span>
          <span className="spark-stats-fps">{t.viewer.fps}: {fps > 0 ? fps : '--'}</span>
          <span className="spark-badge-small">{t.viewer.poweredBy}</span>
        </div>
      )}

      {/* 控制提示 */}
      {modelLoaded && (
        <div className="spark-hints">
          <span>🖱️ {t.viewer.hintDragRotate}</span>
          <span>📜 {t.viewer.hintScrollZoom}</span>
        </div>
      )}



      {/* 产品标签数量提示 */}
      {products.length > 0 && modelLoaded && (
        <div className="spark-products-hint">
          <span>🏷️ {products.length === 1 ? t.viewer.productsCountSingle : formatMessage(t.viewer.productsCount, { count: products.length })}</span>
        </div>
      )}
    </div>
  );
}
