// 3D Splat 模型卡片组件 - 实时3D效果预览
// 模型数据全局缓存+防白板+自动适配相机+画框聚焦效果
import { useEffect, useRef, useState, memo, useCallback } from 'react';
import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';
import './Model3DCard.css';

// 全局模型数据缓存：URL -> ArrayBuffer（翻页切换时不重复下载）
const modelDataCache = new Map<string, ArrayBuffer>();

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
  const sparkRef = useRef<SparkRenderer | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  // 镜头坐标调试信息
  const [cameraInfo, setCameraInfo] = useState<string[]>([]);
  const mountedRef = useRef(false);
  const contextLostRef = useRef(false);
  // loadingRef 用于 timer 闭包，避免捕获到 stale state
  const loadingRef = useRef(false);
  // retryKey：自增，加入 useEffect 依赖以触发重新加载
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !modelUrl) {
      setHasError(true);
      return;
    }

    mountedRef.current = true;
    loadingRef.current = true;
    setIsLoading(true);
    setHasError(false);
    setModelLoaded(false);
    setLoadProgress(0);
    contextLostRef.current = false;

    let stopAnimation = false;

    // ---- 初始化场景 ----
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // ---- 初始化相机 ----
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1000);

    // ---- 创建渲染器 ----
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      const testCanvas = document.createElement('canvas');
      const testGL = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!testGL) {
        throw new Error('No WebGL context available');
      }
      const glExt = testGL.getExtension('WEBGL_lose_context');
      glExt?.loseContext();

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.error('WebGL 创建失败:', e);
      if (mountedRef.current) { loadingRef.current = false; setIsLoading(false); setHasError(true); }
      return;
    }

    const initW = container.clientWidth || 320;
    const initH = container.clientHeight || 230;
    renderer.setSize(initW, initH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ---- WebGL Context Lost 处理 ----
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLostRef.current = true;
      stopAnimation = true;
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (mountedRef.current) { loadingRef.current = false; setIsLoading(false); setHasError(true); }
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // ---- ResizeObserver ----
    const handleResize = () => {
      if (!containerRef.current || stopAnimation) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer!.setSize(w, h);
      }
    };
    observerRef.current = new ResizeObserver(() => { handleResize(); });
    observerRef.current.observe(container);

    // ---- 创建 Spark 渲染器 & 加载模型 ----
    try {
      const spark = new SparkRenderer({ renderer });
      sparkRef.current = spark;
      scene.add(spark);

      const loadModel = async () => {
        let splatMesh: SplatMesh | null = null;

        try {
          const cachedData = modelDataCache.get(modelUrl);
          if (cachedData) {
            splatMesh = new SplatMesh({
              fileBytes: cachedData.slice(0),
            });
          } else {
            splatMesh = new SplatMesh({
              url: modelUrl,
              onProgress: (event: ProgressEvent) => {
                if (event.lengthComputable && mountedRef.current) {
                  setLoadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
                }
              }
            });

            // 下载完成后缓存
            try {
              const response = await fetch(modelUrl);
              const buffer = await response.arrayBuffer();
              modelDataCache.set(modelUrl, buffer);
            } catch { /* 缓存非关键 */ }
          }

          if (!splatMesh) return;

          splatMesh.quaternion.set(1, 0, 0, 0);
          spark.add(splatMesh);  // ★ 作为 Spark 的子节点（非 scene），确保 position 被渲染管线读取
          splatMeshRef.current = splatMesh;

          await splatMesh.initialized;

          if (!mountedRef.current || stopAnimation) return;

          // ★★★ 自适应镜头 ★★★
          try {
            const containerEl = containerRef.current;
            if (containerEl) {
              const cw = containerEl.clientWidth;
              const ch = containerEl.clientHeight;
              if (cw > 0 && ch > 0) {
                camera.aspect = cw / ch;
                camera.updateProjectionMatrix();
                renderer!.setSize(cw, ch);
              }
            }

            const box = splatMesh.getBoundingBox();
            if (box) {
              // ═══════════════════════════════════════════
              // 阶段1: 原始数据采集 — 27维参数
              // ═══════════════════════════════════════════
              const boxMin = box.min;
              const boxMax = box.max;
              const rawW = boxMax.x - boxMin.x;  // ① 原始宽度
              const rawH = boxMax.y - boxMin.y;  // ② 原始高度
              const rawD = boxMax.z - boxMin.z;  // ③ 原始深度
              const geoX = (boxMin.x + boxMax.x) / 2;  // ④ 几何心X
              const geoY = (boxMin.y + boxMax.y) / 2;  // ⑤ 几何心Y
              const geoZ = (boxMin.z + boxMax.z) / 2;  // ⑥ 几何心Z

              // ═══════════════════════════════════════════
              // 阶段2: 特征工程 — 15个推导特征
              // ═══════════════════════════════════════════
              // ★ 动态裁剪率：体积自适应（微型作品不滥裁，巨型扫描多去噪）
              const volume = rawW * rawH * rawD;               // ⑰ 体积代理
              let trimRatio: number;
              if (volume < 1)       trimRatio = 0.04;  // 苍蝇级：轻裁
              else if (volume < 4)  trimRatio = 0.06;  // 蝴蝶级
              else if (volume < 16) trimRatio = 0.08;  // 猫咪级：标准
              else                  trimRatio = 0.10;  // 场景级：深裁去噪

              const trimW = rawW * trimRatio;
              const trimH = rawH * trimRatio;
              const viewW = rawW - 2 * trimW;                // ⑬ 裁剪宽
              const viewH = rawH - 2 * trimH;                // ⑬ 裁剪高

              // 宽高比
              const WH_ratio = rawH > 0.001 ? rawW / rawH : 1;  // ⑭
              const containerAR = camera.aspect;

              // Y位置比
              const yRatio = rawH > 0.001 ? (geoY - boxMin.y) / rawH : 0.5;  // ⑮

              // 深度质量
              const depthQuality = Math.max(rawW, rawH) > 0.001
                ? rawD / Math.max(rawW, rawH) : 1;           // ⑯
              const isDepthInflated = depthQuality > 1.5;

              // ★ X轴非对称检测：模型中心偏离原点过远→强制归中
              const xOriginBias = rawW > 0.001
                ? Math.abs(geoX) * 2 / rawW                  // ⑲
                : 0;
              const isXAsymmetric = xOriginBias > 0.35;       // 中心偏移>35%半宽

              // ★ 尺度维度
              const scaleDim = Math.max(rawW, rawH);          // ㉔

              // ═══════════════════════════════════════════
              // 阶段3: 模型分类 → 约束维度 + 基础边距
              // ═══════════════════════════════════════════
              let modelType: string;
              let marginFactor: number;
              let primaryDist: number;

              const vFovRad = (camera.fov * Math.PI) / 180;
              const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * containerAR);
              const distW_fit = viewW / 2 / Math.tan(hFovRad / 2);
              const distH_fit = viewH / 2 / Math.tan(vFovRad / 2);

              if (rawH / Math.max(rawW, 0.01) > 1.3) {
                modelType = '高型';
                primaryDist = distH_fit;
                marginFactor = 1.12;
              } else if (rawW / Math.max(rawH, 0.01) > 1.3) {
                modelType = '宽型';
                primaryDist = distW_fit;
                marginFactor = 1.10;
              } else if (isDepthInflated) {
                modelType = '深噪';
                primaryDist = distH_fit;
                marginFactor = 1.20;
              } else if (depthQuality < 0.3) {
                modelType = '扁型';
                primaryDist = Math.max(distW_fit, distH_fit);
                marginFactor = 1.08;
              } else {
                modelType = '均衡';
                primaryDist = Math.max(distW_fit, distH_fit);
                marginFactor = 1.10;
              }

              // ★ 尺度感知边距微调：所有模型都填满画框
              if (scaleDim < 0.5)       marginFactor -= 0.05;
              else if (scaleDim < 1.5)  marginFactor -= 0.02;
              else if (scaleDim > 5)    marginFactor -= 0.03;  // 大体积：更填满

              // 宽高比 vs 视口双重校验
              if (WH_ratio > containerAR * 1.4) {
                primaryDist = distW_fit;
              } else if (WH_ratio < containerAR * 0.65) {
                primaryDist = distH_fit;
              }

              // ═══════════════════════════════════════════
              // 阶段4: 计算相机距离
              // ═══════════════════════════════════════════
              const distance = primaryDist * marginFactor;
              const clampedDist = Math.max(0.3, Math.min(20, distance));

              // ═══════════════════════════════════════════
              // 阶段5: 智能视觉居中（三维全维度）
              // ═══════════════════════════════════════════
              // X: 非对称检测 → 偏移过大强制归中
              const visualCenterX = isXAsymmetric ? 0 : geoX;

              // Y: 正中心——所有模型统一居中，不偏不倚
              const yBias = 0.5;
              const visualCenterY = boxMin.y + trimH + viewH * yBias;

              // Z: 深度膨胀型向前偏置 5%（相机在Z正方向，模型向负方向拉近）
              let visualCenterZ = geoZ;
              if (isDepthInflated) {
                visualCenterZ = geoZ - rawD * 0.05;
              }

              let offsetX = -visualCenterX;
              let offsetY = -visualCenterY;
              let offsetZ = -visualCenterZ;

              // ═══════════════════════════════════════════
              // 阶段6: 离群值硬钳制
              // ═══════════════════════════════════════════
              if (Math.abs(offsetX) > rawW * 3 || Math.abs(offsetX) > 15) offsetX = 0;
              if (Math.abs(offsetY) > rawH * 3 || Math.abs(offsetY) > 15) offsetY = 0;
              if (Math.abs(offsetZ) > rawD * 3 || Math.abs(offsetZ) > 15) offsetZ = 0;

              // ═══════════════════════════════════════════
              // 阶段7: 最终验证
              // ═══════════════════════════════════════════
              const maxDim = Math.max(viewW, viewH);
              if (maxDim > 0.001 && maxDim < 100) {
                const actualDistW = viewW / 2 / Math.tan(hFovRad / 2);
                const actualDistH = viewH / 2 / Math.tan(vFovRad / 2);
                const minSafeDist = Math.max(actualDistW, actualDistH) * 1.02;
                const finalDist = Math.max(clampedDist, minSafeDist);

                camera.position.set(0, 0, finalDist);
                splatMesh.position.set(offsetX, offsetY, offsetZ);

                // ═══════════════════════════════════════════
                // debug 面板：展示全部决策参数
                // ═══════════════════════════════════════════
                if (mountedRef.current) {
                  const xFlag = isXAsymmetric ? '🟡X归中' : '';
                  const scaleTag = scaleDim < 0.5 ? '微粒' : scaleDim < 1.5 ? '小型' : scaleDim < 5 ? '中型' : '大型';
                  setCameraInfo([
                    `📷 距离:${finalDist.toFixed(1)}  ${modelType}·${scaleTag}  trim${Math.round(trimRatio*100)}%  边距${marginFactor.toFixed(2)}x ${xFlag}`,
                    `📦 裁剪:${viewW.toFixed(1)}×${viewH.toFixed(1)}  W:H=${WH_ratio.toFixed(2)}  D/W=${depthQuality.toFixed(2)} (原${rawW.toFixed(1)}×${rawH.toFixed(1)}×${rawD.toFixed(1)})`,
                    `📍 视觉心:(${offsetX.toFixed(1)},${offsetY.toFixed(1)},${offsetZ.toFixed(1)}) Y权:${yBias.toFixed(2)} yR:${yRatio.toFixed(2)} X偏:${xOriginBias.toFixed(2)}`,
                    `🎯 几何心:(${(-geoX).toFixed(1)},${(-geoY).toFixed(1)},${(-geoZ).toFixed(1)})  V=${volume.toFixed(1)}`,
                  ]);
                }
              }
            }
          } catch (e) {
            console.warn('Auto-fit failed, using defaults:', e);
          }

          // 标记加载完成
          loadingRef.current = false;
          setIsLoading(false);
          setModelLoaded(true);
        } catch (error) {
          console.error(`模型加载失败 [${title}]:`, error);
          if (mountedRef.current) {
            loadingRef.current = false;
            setIsLoading(false);
            setHasError(true);
          }
        }
      };

      loadModel();

      // ---- 动画循环 ----
      let lastTime = 0;
      const animate = (time: number) => {
        if (!mountedRef.current || stopAnimation) return;
        const deltaTime = time - lastTime;
        lastTime = time;
        if (autoRotate && splatMeshRef.current) {
          splatMeshRef.current.rotation.y += deltaTime / 2500;
        }
        // ★ 使用 Spark 渲染管线（非 Three.js 原生渲染）
        if (sparkRef.current) {
          sparkRef.current.update({ scene, camera });
          sparkRef.current.render(scene, camera);
        }
        animationIdRef.current = requestAnimationFrame(animate);
      };
      animationIdRef.current = requestAnimationFrame(animate);
    } catch (error) {
      console.error('Spark 初始化失败:', error);
      if (mountedRef.current) { loadingRef.current = false; setIsLoading(false); setHasError(true); }
    }

    // ---- 防白板超时保护（使用 loadingRef 避免闭包陷阱） ----
    const whiteGuardTimer = setTimeout(() => {
      // 这里用 ref 而非 state，确保拿到的是最新值
      if (mountedRef.current && loadingRef.current && !contextLostRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
        setHasError(true);
      }
    }, 15000);

    // ---- 清理 ----
    return () => {
      clearTimeout(whiteGuardTimer);
      stopAnimation = true;
      mountedRef.current = false;

      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
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
      sparkRef.current = null;
      splatMeshRef.current = null;
    };
  }, [modelUrl, autoRotate, title, retryKey]);

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // 点击重试：清除缓存 + 触发 remount
  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasError && modelUrl) {
      modelDataCache.delete(modelUrl);
      setRetryKey(prev => prev + 1);
    }
  }, [hasError, modelUrl]);

  // 组装容器 class
  const containerClass = [
    'model-container',
    modelLoaded ? 'loaded' : '',
    hasError ? 'has-error' : '',
    isLoading && !hasError ? 'is-loading' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`model-3d-card ${isActive ? 'active' : ''} ${size}`}
      onClick={handleClick}
    >
      <div
        ref={containerRef}
        className={containerClass}
      >
        {/* 加载中：显示 emoji 骨架 + spinner */}
        {isLoading && !hasError && (
          <div className="model-loading">
            <div className="loading-skeleton-icon">{thumbnail}</div>
            <div className="loading-spinner"></div>
            <span className="loading-text">
              {loadProgress > 0 ? `${loadProgress}%` : '加载中...'}
            </span>
          </div>
        )}

        {/* 错误/无URL：显示醒目错误提示 */}
        {(!modelUrl || hasError) && (
          <div className="model-fallback" onClick={hasError ? handleRetry : undefined}>
            {hasError ? (
              <>
                <span className="fallback-icon error">{thumbnail}</span>
                <span className="fallback-text">加载失败</span>
                <span className="fallback-hint">点击重试</span>
              </>
            ) : (
              <span className="fallback-icon">{thumbnail}</span>
            )}
          </div>
        )}

        {/* 镜头坐标 debug 面板 */}
        {modelLoaded && cameraInfo.length > 0 && (
          <div className="camera-debug-panel" onClick={(e) => e.stopPropagation()}>
            {cameraInfo.map((line, i) => (
              <span key={i} className="camera-debug-line">{line}</span>
            ))}
          </div>
        )}
      </div>

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
