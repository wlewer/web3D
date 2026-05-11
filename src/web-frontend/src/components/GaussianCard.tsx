/**
 * GaussianCard — 统一3D高斯泼溅渲染核心组件
 * 
 * 融合 SparkViewer + UniversalGaussianCard + Model3DCard 三者优点：
 *  · 27维智能镜头算法（体积自适应裁剪 + 模型分类 + X非对称归中 + 安全距离验证）
 *  · 全局 ArrayBuffer 缓存（翻页/轮播零网络请求）
 *  · 帧同步渲染锁（防止 Spark "No next accumulator"）
 *  · 超时保护 + 占位兜底 + WebGL 上下文丢失恢复
 * 
 * mode: 'hero' | 'card' | 'preview'
 *   hero   — 全屏沉浸：360°旋转+缩放+自适应镜头
 *   card   — 网格卡片：自动旋转+限角度+紧凑布局
 *   preview — 弹窗预览：360°旋转+缩放+不限制角度
 */

import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { useTranslation } from '../i18n';
import './GaussianCard.css';

// ═══════════════════════════════════════════════════════════
// 全局模型数据缓存：URL → ArrayBuffer（跨实例共享，翻页/轮播零重复下载）
// ═══════════════════════════════════════════════════════════
const modelDataCache = new Map<string, ArrayBuffer>();

// ────────────────── 类型定义 ──────────────────

export type CardMode = 'hero' | 'card' | 'preview';

export interface GaussianCardProps {
  /** 模型 URL（.spz 格式） */
  modelUrl: string;
  /** 渲染模式 */
  mode?: CardMode;
  /** 自动旋转 */
  autoRotate?: boolean;
  /** 是否启用 OrbitControls */
  enableControls?: boolean;
  /** 背景色 */
  backgroundColor?: string;
  /** 显示 FPS */
  showStats?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 加载完成回调 */
  onLoadComplete?: () => void;
  /** 加载状态变化 */
  onLoadStateChange?: (loading: boolean) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 产品信息标签（仅hero/preview模式显示） */
  products?: Array<{
    id: string;
    name: string;
    nameEn?: string;
    description: string;
    descriptionEn?: string;
    position?: [number, number, number];
    color?: string;
  }>;
  /** 交互回调（用户拖拽/滚轮） */
  onInteraction?: () => void;
}

// ────────────────── 组件 ──────────────────

export const GaussianCard = memo(function GaussianCard({
  modelUrl,
  mode = 'card',
  autoRotate = true,
  enableControls: propEnableControls,
  backgroundColor = '#0a0a0f',
  showStats = false,
  products = [],
  onClick,
  onLoadComplete,
  onLoadStateChange,
  onError,
  onInteraction,
}: GaussianCardProps) {
  // derive enableControls from mode if not explicitly set
  const enableControls = propEnableControls ?? (mode !== 'card');

  // ── Refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sparkRef = useRef<SparkRenderer | null>(null);
  const splatRef = useRef<SplatMesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number>(0);

  const labelsGroupRef = useRef<THREE.Group | null>(null);
  const renderingLockRef = useRef(false);    // 帧同步锁
  const sparkFailedRef = useRef(false);       // Spark 永久降级
  const mountedRef = useRef(false);
  const contextLostRef = useRef(false);
  const loadingTimedOutRef = useRef(false);

  // 语言判断（用于产品标签多语言）
  const { language } = useTranslation();
  const isZh = useMemo(() => language === 'zh-CN', [language]);

  // ── 状态 ──
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [fps, setFps] = useState(0);

  const fpsCounterRef = useRef({ count: 0, lastTime: performance.now() });

  // ★ ref 存储 smartFitCamera（不用 useCallback，让 HMR 热更新能替换函数体）
  const smartFitCameraRef = useRef<() => void>(() => {});

  // 通知父组件 loading 变化
  useEffect(() => { onLoadStateChange?.(loading); }, [loading, onLoadStateChange]);

  // ═══════════════════════════════════════════════════════════
  // 智能自适应居中算法
  //   · 百分位裁剪（来自 UniversalGaussianCard）
  //   · FOV基准距离 + 模型分类 + Y轴视觉权重（来自 Model3DCard 27维算法）
  // ═══════════════════════════════════════════════════════════
  // ★ 用 ref 包裹，HMR 热更新时重新赋值，无需页面级硬刷新
  smartFitCameraRef.current = () => {
    const splat = splatRef.current;
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!splat || !camera || !container) return;

    try {
      // ★ 第0步：重置模型姿态（quaternion 自动同步 Euler，解决倒立）
      splat.position.set(0, 0, 0);
      splat.quaternion.set(1, 0, 0, 0);

      // ──── 读取顶点位置（直接使用 Float32Array 避免 Vector3 分配开销） ────
      const posAttr = (splat as any).geometry?.attributes?.position;
      if (!posAttr || posAttr.count === 0) {
        console.warn('[GaussianCard] ⚠️ 无 position 属性，跳过居中');
        return;
      }

      const count = posAttr.count;
      const posArray: Float32Array = posAttr.array;
      const itemSize = posAttr.itemSize;
      const xs = new Float32Array(count);
      const ys = new Float32Array(count);
      const zs = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        xs[i] = posArray[i * itemSize];
        ys[i] = posArray[i * itemSize + 1];
        zs[i] = posArray[i * itemSize + 2];
      }

      console.log(`[GaussianCard] 📊 顶点数:${count}`);

      // ──── 百分位裁剪（去除离群点） ────
      xs.sort((a, b) => a - b);
      ys.sort((a, b) => a - b);
      zs.sort((a, b) => a - b);

      // 首和末 = 全范围（用于体积计算决定裁剪率）
      const fullW = xs[count - 1] - xs[0];
      const fullH = ys[count - 1] - ys[0];
      const fullD = zs[count - 1] - zs[0];
      const volume = fullW * fullH * fullD;

      // W-1: 体积自适应裁剪率（微型精裁保留细节，大型深裁去噪）
      const trimRatio = volume < 1 ? 0.04 : volume < 4 ? 0.06 : volume < 16 ? 0.08 : 0.10;
      const trimIdx = Math.floor(count * trimRatio);

      const minX = xs[trimIdx];
      const maxX = xs[count - 1 - trimIdx];
      const minY = ys[trimIdx];
      const maxY = ys[count - 1 - trimIdx];
      const minZ = zs[trimIdx];
      const maxZ = zs[count - 1 - trimIdx];

      const viewW = maxX - minX;
      const viewH = maxY - minY;
      const viewD = maxZ - minZ;

      console.log(`[GaussianCard] 📐 裁剪后: ${viewW.toFixed(3)}×${viewH.toFixed(3)}×${viewD.toFixed(3)}  trim:${Math.round(trimRatio*100)}% V:${volume.toFixed(1)}`);

      if (viewW < 0.0001 && viewH < 0.0001 && viewD < 0.0001) {
        console.warn('[GaussianCard] ⚠️ 包围盒退化');
        return;
      }

      // =============================================================
      // FOV基准距离 + 模型分类（吸收 Model3DCard 27维算法）
      // =============================================================
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w > 0 && h > 0 ? w / h : 1;
      const vFovRad = camera.fov * Math.PI / 180;
      const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);

      const HW_ratio = viewH / Math.max(viewW, 0.01);
      const WH_ratio = viewW / Math.max(viewH, 0.01);
      const depthQuality = Math.max(viewW, viewH) > 0.001
        ? viewD / Math.max(viewW, viewH) : 1;

      const distW_fit = viewW / 2 / Math.tan(hFovRad / 2);
      const distH_fit = viewH / 2 / Math.tan(vFovRad / 2);

      let marginFactor: number;
      let primaryDist: number;
      let modelType: string;

      if (HW_ratio > 1.3) {
        modelType = '高型';
        primaryDist = distH_fit;
        marginFactor = 1.15;
      } else if (WH_ratio > 1.3) {
        modelType = '宽型';
        primaryDist = distW_fit;
        marginFactor = 1.12;
      } else if (depthQuality > 1.5) {
        modelType = '深噪';
        primaryDist = distH_fit;
        marginFactor = 1.20;
      } else if (depthQuality < 0.3) {
        modelType = '扁型';
        primaryDist = Math.max(distW_fit, distH_fit);
        marginFactor = 1.10;
      } else {
        modelType = '均衡';
        primaryDist = Math.max(distW_fit, distH_fit);
        marginFactor = 1.12;
      }

      // W-2: 缩放感知边距微调
      const scaleDim = Math.max(viewW, viewH);
      if (scaleDim < 0.5)       marginFactor -= 0.05;
      else if (scaleDim < 1.5)  marginFactor -= 0.02;
      else if (scaleDim > 5)    marginFactor -= 0.03;
      marginFactor = Math.max(1.02, marginFactor);

      // 宽高比 vs 视口双重校验
      if (WH_ratio > aspect * 1.4) primaryDist = distW_fit;
      else if (WH_ratio < aspect * 0.65) primaryDist = distH_fit;

      const distance = primaryDist * marginFactor;
      const clampedDist = Math.max(0.3, Math.min(20, distance));

      // S-2: 安全距离——直接用已计算的 distW_fit/distH_fit，不再重复算
      const minSafeDist = Math.max(distW_fit, distH_fit) * 1.02;
      const finalDist = Math.max(clampedDist, minSafeDist);

      // =============================================================
      // 视觉中心（Y轴权重 + X非对称归中）
      // =============================================================
      const yBias = HW_ratio > 1.3 ? 0.48 : 0.50;
      const visualCenterY = minY + viewH * yBias;

      const geoX = (minX + maxX) / 2;
      const xOriginBias = viewW > 0.001 ? Math.abs(geoX) * 2 / viewW : 0;
      const lookTarget = new THREE.Vector3(
        xOriginBias > 0.35 ? 0 : geoX,
        visualCenterY,
        (minZ + maxZ) / 2
      );

      // ──── 相机定位 ────
      camera.position.set(lookTarget.x, lookTarget.y, lookTarget.z + finalDist);
      camera.lookAt(lookTarget);
      camera.up.set(0, 1, 0);

      if (controlsRef.current) {
        controlsRef.current.target.copy(lookTarget);
        controlsRef.current.update();
      }

      console.log(
        `[GaussianCard] ✅ 距离:${finalDist.toFixed(1)}  类型:${modelType}  margin:${Math.round(marginFactor*100)}%  ` +
        `yBias:${yBias.toFixed(2)}  scale:${scaleDim.toFixed(2)}  ` +
        `look:(${lookTarget.x.toFixed(2)},${lookTarget.y.toFixed(2)},${lookTarget.z.toFixed(2)})`
      );
    } catch (e) {
      console.warn('[GaussianCard] smartFitCamera error:', e);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 创建占位模型（加载失败时兜底）
  // ═══════════════════════════════════════════════════════════
  const createPlaceholder = useCallback(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // 移除旧占位
    const old = scene.getObjectByName('__placeholder__');
    if (old) scene.remove(old);

    const group = new THREE.Group();
    group.name = '__placeholder__';

    const geo = new THREE.IcosahedronGeometry(0.5, 1);
    const mat = new THREE.MeshStandardMaterial({ color: '#667eea', metalness: 0.6, roughness: 0.3 });
    group.add(new THREE.Mesh(geo, mat));

    const wireGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const wireMat = new THREE.MeshBasicMaterial({ color: '#764ba2', wireframe: true, transparent: true, opacity: 0.5 });
    group.add(new THREE.Mesh(wireGeo, wireMat));

    scene.add(group);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 3D产品标签——基于Canvas纹理的精灵标签
  // ═══════════════════════════════════════════════════════════
  const create3DLabel = useCallback((
    product: NonNullable<GaussianCardProps['products']>[number],
    position: [number, number, number]
  ): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;

    ctx.fillStyle = 'rgba(15, 15, 35, 0.9)';
    ctx.roundRect(0, 0, 256, 128, 16);
    ctx.fill();

    ctx.strokeStyle = product.color || '#667eea';
    ctx.lineWidth = 3;
    ctx.roundRect(3, 3, 250, 122, 14);
    ctx.stroke();

    const displayName = isZh ? (product.name || product.nameEn || '') : (product.nameEn || product.name || '');
    const displayDesc = isZh ? (product.description || product.descriptionEn || '') : (product.descriptionEn || product.description || '');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 128, 40);

    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const lines = wrapText(ctx, displayDesc, 220);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 128, 65 + i * 22);
    });

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
  }, [isZh]);

  const createProductLabels = useCallback(() => {
    if (products.length === 0) return;
    if (!sceneRef.current) return;

    // 移除旧标签组
    if (labelsGroupRef.current) {
      sceneRef.current.remove(labelsGroupRef.current);
      labelsGroupRef.current = null;
    }

    const group = new THREE.Group();
    group.name = 'product-labels';

    products.forEach((product, index) => {
      const angle = (index / products.length) * Math.PI * 2;
      const radius = 1.5;
      const position: [number, number, number] = product.position || [
        Math.cos(angle) * radius,
        0.3 + index * 0.3,
        Math.sin(angle) * radius
      ];
      const sprite = create3DLabel(product, position);
      group.add(sprite);
    });

    sceneRef.current.add(group);
    labelsGroupRef.current = group;
  }, [products, create3DLabel]);

  // 文字换行辅助
  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let currentLine = '';
    for (const char of text) {
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
  }

  // ═══════════════════════════════════════════════════════════
  // 初始化场景
  // ═══════════════════════════════════════════════════════════
  const initScene = useCallback((): boolean => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return false;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(0, 0, 5);
    camera.up.set(0, 1, 0);
    cameraRef.current = camera;

    // 渲染器
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return false;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // WebGL Context 事件
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      contextLostRef.current = true;
      cancelAnimationFrame(frameIdRef.current);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      contextLostRef.current = false;
      animate();
    });

    // Spark 渲染器
    const spark = new SparkRenderer({ renderer });
    sparkRef.current = spark;
    scene.add(spark);

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pt = new THREE.PointLight(0x667eea, 1, 100);
    pt.position.set(10, 10, 10);
    scene.add(pt);

    // 控制器
    if (enableControls) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1;

      if (mode === 'card') {
        // 卡片模式：限制角度避免侧翻
        controls.minPolarAngle = Math.PI / 4;
        controls.maxPolarAngle = Math.PI / 2.5;
        const az = Math.atan2(camera.position.x, camera.position.z);
        controls.minAzimuthAngle = az - Math.PI / 3;
        controls.maxAzimuthAngle = az + Math.PI / 3;
        controls.enablePan = false;
      }
      controlsRef.current = controls;
    }

    return true;
  }, [backgroundColor, enableControls, autoRotate, mode]);

  // ═══════════════════════════════════════════════════════════
  // 动画循环（带帧同步锁）
  // ═══════════════════════════════════════════════════════════
  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const spark = sparkRef.current;
    const controls = controlsRef.current;

    if (!camera || !renderer || !scene) return;

    if (controls) controls.update();

    // 旋转占位模型
    const ph = scene.getObjectByName('__placeholder__');
    if (ph) { ph.rotation.y += 0.01; ph.rotation.x += 0.005; }

    // Spark 渲染（带帧同步锁）
    if (spark && !sparkFailedRef.current && splatRef.current && !renderingLockRef.current) {
      renderingLockRef.current = true;
      spark.update({ scene, camera })
        .then(() => {
          spark.render(scene, camera);
          renderingLockRef.current = false;
        })
        .catch(() => {
          renderingLockRef.current = false;
          sparkFailedRef.current = true;
        });
    } else if (!spark || sparkFailedRef.current || !splatRef.current) {
      // 无 Spark 或已降级 → Three.js 兜底渲染
      renderer.render(scene, camera);
    }

    // FPS
    fpsCounterRef.current.count++;
    const now = performance.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    if (elapsed >= 1000) {
      setFps(Math.round((fpsCounterRef.current.count * 1000) / elapsed));
      fpsCounterRef.current.count = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 加载模型（带全局缓存 + 超时保护）
  // ═══════════════════════════════════════════════════════════
  const loadModel = useCallback(async () => {
    const spark = sparkRef.current;
    if (!spark) return;

    let heartbeat: ReturnType<typeof setInterval> | null = null;
    loadingTimedOutRef.current = false;

    try {
      setError(null);
      setLoading(true);
      setModelLoaded(false);
      setProgress(10);

      // 心跳进度
      const hbStart = Date.now();
      heartbeat = setInterval(() => {
        const elapsed = (Date.now() - hbStart) / 1000;
        setProgress(Math.min(75, Math.round(10 + (1 - Math.exp(-elapsed / 5)) * 65)));
      }, 300);

      // ★ 全局缓存：优先使用已缓存的 ArrayBuffer
      let splat: SplatMesh;
      const cached = modelDataCache.get(modelUrl);
      if (cached) {
        console.log('[GaussianCard] 💾 缓存命中:', modelUrl);
        splat = new SplatMesh({ fileBytes: cached } as any);
      } else {
        splat = new SplatMesh({
          url: modelUrl,
          onProgress: (event) => {
            if (event.lengthComputable) {
              setProgress(Math.min(90, 10 + (event.loaded / event.total) * 80));
            }
          }
        });
      }

      splatRef.current = splat;
      spark.add(splat);

      // 超时保护：25秒
      const timeout = setTimeout(() => {
        loadingTimedOutRef.current = true;
        setError('模型加载超时');
        setLoading(false);
        createPlaceholder();
      }, 25000);

      await splat.initialized;
      clearTimeout(timeout);

      if (loadingTimedOutRef.current) return;

      // 缓存到全局（如果还没缓存）
      if (!cached) {
        try {
          const buffer = await fetch(modelUrl).then(r => r.arrayBuffer());
          modelDataCache.set(modelUrl, buffer);
        } catch { /* 缓存失败不影响渲染 */ }
      }

      if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }

      // 等待一帧保证包围盒就绪
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 100));

      // 智能居中
      smartFitCameraRef.current();

      // 再等一帧
      await new Promise(r => requestAnimationFrame(r));

      // 创建产品标签（仅hero/preview模式）
      if (mode === 'hero' || mode === 'preview') {
        createProductLabels();
      }

      setProgress(100);
      setTimeout(() => {
        if (!mountedRef.current) return;
        setLoading(false);
        setModelLoaded(true);
        onLoadComplete?.();
      }, 300);

    } catch (err) {
      console.error('[GaussianCard] load error:', err);
      if (heartbeat) clearInterval(heartbeat);
      if (!loadingTimedOutRef.current) {
        setError((err as Error).message);
        setLoading(false);
        createPlaceholder();
        onError?.(err as Error);
      }
    }
  }, [modelUrl, createPlaceholder, onLoadComplete, onError, mode, createProductLabels]);

  // ═══════════════════════════════════════════════════════════
  // 主 useEffect：初始化 + 动画启动
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    mountedRef.current = true;
    sparkFailedRef.current = false;
    renderingLockRef.current = false;

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      if (initScene()) {
        loadModel();
        animate();
      } else {
        setError('3D 场景初始化失败');
        setLoading(false);
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      cancelAnimationFrame(frameIdRef.current);

      if (splatRef.current) {
        try { splatRef.current.dispose?.(); } catch {}
        splatRef.current = null;
      }
      // 清理产品标签
      if (labelsGroupRef.current) {
        labelsGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Sprite) {
            const m = child.material as THREE.SpriteMaterial;
            if (m.map) m.map.dispose();
            m.dispose();
          }
        });
        labelsGroupRef.current = null;
      }
      sparkRef.current = null;
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      // 清理标签组（从场景移除）
      if (labelsGroupRef.current && sceneRef.current) {
        sceneRef.current.remove(labelsGroupRef.current);
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  }, [modelUrl]); // modelUrl 变化时重新挂载

  // ═══════════════════════════════════════════════════════════
  // 语言变化→重新创建产品标签
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!modelLoaded) return;
    if (mode !== 'hero' && mode !== 'preview') return;
    createProductLabels();
  }, [language, products, create3DLabel, createProductLabels, modelLoaded, mode]);

  // ═══════════════════════════════════════════════════════════
  // ResizeObserver
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const c = cameraRef.current;
      const r = rendererRef.current;
      if (!c || !r || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        c.aspect = w / h;
        c.updateProjectionMatrix();
        r.setSize(w, h);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 窗口 resize
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const onResize = () => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 用户交互监听
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onInteraction) return;

    let timer: ReturnType<typeof setTimeout>;
    const start = () => {
      onInteraction();
      if (controlsRef.current) controlsRef.current.autoRotate = false;
      clearTimeout(timer);
    };
    const end = () => {
      timer = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
      }, 2000);
    };

    container.addEventListener('pointerdown', start);
    container.addEventListener('wheel', start);
    container.addEventListener('pointerup', end);
    return () => {
      container.removeEventListener('pointerdown', start);
      container.removeEventListener('wheel', start);
      container.removeEventListener('pointerup', end);
      clearTimeout(timer);
    };
  }, [onInteraction, autoRotate]);

  // ═══════════════════════════════════════════════════════════
  // JSX
  // ═══════════════════════════════════════════════════════════
  const modeClass = `gc-mode-${mode}`;

  return (
    <div className={`gaussian-card ${modeClass}`} ref={containerRef} onClick={onClick}>
      <canvas ref={canvasRef} className="gc-canvas" />

      {/* 加载指示器 */}
      {loading && (
        <div className="gc-loading">
          <div className="gc-loading-ring"><div/><div/><div/><div/></div>
          <div className="gc-loading-bar-container">
            <div className="gc-loading-bar" style={{ width: `${progress}%` }}/>
          </div>
          <span className="gc-loading-text">Loading {progress}%</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="gc-error">
          <span>⚠ {error}</span>
        </div>
      )}

      {/* FPS */}
      {showStats && modelLoaded && (
        <div className="gc-stats">
          <span>Spark 2.0</span>
          <span className="gc-fps">FPS: {fps > 0 ? fps : '--'}</span>
        </div>
      )}

      {/* 操作提示（hero模式） */}
      {mode === 'hero' && modelLoaded && (
        <div className="gc-hints">
          <span>🖱 Drag to rotate</span>
          <span>📜 Scroll to zoom</span>
        </div>
      )}
    </div>
  );
});

export default GaussianCard;
