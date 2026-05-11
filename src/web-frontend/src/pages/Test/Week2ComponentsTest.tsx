/**
 * Week2ComponentsTest - V3 组件效果预览
 * 
 * 专注展示 UniversalGaussianCardV3 在不同布局模式下的装饰效果
 * 支持模型切换、装饰控制、参数调节、镜头操作
 * 
 * @version 3.0.0
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { UniversalGaussianCardV3 } from '../../components/3d/UniversalGaussianCardV3';
import type { Base3DViewerRef, LayoutMode } from '../../components/3d/Base3DViewer';
import type { CameraConfig } from '../../components/3d/engines/CameraManager';
import type { ProductLabel } from '../../components/3d/engines/SceneDecoration';
import './Week2ComponentsTest.css';

// ==================== 测试数据 ====================

const TEST_MODELS = [
  {
    id: 'butterfly',
    icon: '🦋',
    name: '蓝色大闪蝶',
    nameEn: 'Blue Morpho',
    url: '/models/butterfly.spz',
    format: 'SPZ',
    category: '自然',
    categoryEn: 'Nature',
    products: [
      { id: 'p1', name: '生态研究', nameEn: 'Ecology Research', description: '用于昆虫生态研究与教学', descriptionEn: 'For insect ecology research and education', color: '#22c55e', position: [-2, 1, 0] },
      { id: 'p2', name: '艺术摄影', nameEn: 'Art Photography', description: '高精度3D艺术品展示', descriptionEn: 'High-precision 3D art showcase', color: '#f97316', position: [2, 1, 0] },
    ]
  },
  {
    id: 'cat',
    icon: '🐱',
    name: '可爱猫咪',
    nameEn: 'Cute Cat',
    url: '/models/cat.spz',
    format: 'SPZ',
    category: '宠物',
    categoryEn: 'Pet',
    products: [
      { id: 'p1', name: '宠物医疗', nameEn: 'Pet Healthcare', description: '宠物健康检测3D参考模型', descriptionEn: 'Pet health check 3D reference model', color: '#ec4899', position: [0, 0.8, 0] },
    ]
  },
  {
    id: 'burger',
    icon: '🍔',
    name: '精致汉堡',
    nameEn: 'Burger',
    url: '/models/burger-from-amboy.spz',
    format: 'SPZ',
    category: '美食',
    categoryEn: 'Food',
    products: []
  },
  {
    id: 'robot',
    icon: '🤖',
    name: '机器人头',
    nameEn: 'Robot Head',
    url: '/models/robot-head.spz',
    format: 'SPZ',
    category: '科技',
    categoryEn: 'Tech',
    products: []
  },
  {
    id: 'penguin',
    icon: '🐧',
    name: '南极企鹅',
    nameEn: 'Penguin',
    url: '/models/penguin.spz',
    format: 'SPZ',
    category: '极地',
    categoryEn: 'Polar',
    products: []
  },
  {
    id: 'dessert',
    icon: '🍰',
    name: '精致甜点',
    nameEn: 'Dessert',
    url: '/models/dessert.spz',
    format: 'SPZ',
    category: '甜品',
    categoryEn: 'Dessert',
    products: []
  },
];

const DEFAULT_PRODUCTS: { id: string; name: string; nameEn: string; description: string; descriptionEn: string; color: string; position: [number, number, number] }[] = [
  { id: 'p1', name: '基础研究', nameEn: 'Basic Research', description: '3D模型科研数据分析与可视化', descriptionEn: '3D model scientific data analysis', color: '#22c55e', position: [-2, 1, 0] },
  { id: 'p2', name: '商业展示', nameEn: 'Commercial Display', description: '高精度3D商业产品展示方案', descriptionEn: 'High-precision 3D commercial display', color: '#f97316', position: [2, 1, 0] },
];

const MODEL_COLORS = ['#0f0f23', '#1a0f2e', '#0a1628', '#1c1c1c', '#2d1b4e', '#0d2137'];

// ==================== 本地持久化工具 ====================

const STORAGE_KEY = 'v3-preview-params';

function loadParams(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveParams(partial: Record<string, any>) {
  const current = loadParams();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
}

// ==================== 页面组件 ====================

export function Week2ComponentsTest() {
  // Refs
  const v3Ref = useRef<Base3DViewerRef>(null);
  const detailViewerRef = useRef<Base3DViewerRef>(null);

  // 从 localStorage 恢复参数
  const saved = loadParams();

  // 布局模式
  const [layout, setLayout] = useState<LayoutMode>(saved.layout || 'featured');
  const [model, setModel] = useState(
    TEST_MODELS.find(m => m.id === saved.modelId) || TEST_MODELS[0]
  );

  // 控制参数
  const [particles, setParticles] = useState(saved.particles !== undefined ? saved.particles : true);
  const [platform, setPlatform] = useState(saved.platform !== undefined ? saved.platform : true);
  const [labels, setLabels] = useState(saved.labels !== undefined ? saved.labels : true);
  const [showTitle, setShowTitle] = useState(saved.showTitle !== undefined ? saved.showTitle : true);
  const [showStats, setShowStats] = useState(saved.showStats !== undefined ? saved.showStats : true);
  const [autoRotate, setAutoRotate] = useState(saved.autoRotate !== undefined ? saved.autoRotate : true);
  const [margin, setMargin] = useState(saved.margin !== undefined ? saved.margin : 2.8);
  const [lang, setLang] = useState<'zh-CN' | 'en-US'>(saved.lang || 'zh-CN');
  const [bgIdx, setBgIdx] = useState(saved.bgIdx !== undefined ? saved.bgIdx : 0);
  const [particleSize, setParticleSize] = useState(saved.particleSize !== undefined ? saved.particleSize : 0.3);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(saved.autoRotateSpeed !== undefined ? saved.autoRotateSpeed : 1.0);
  const [fov, setFov] = useState(saved.fov !== undefined ? saved.fov : 50);

  // ★ 首页轮播状态
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);  // ★ 嵌套环完成后的待切换模型
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ★ 相机配置（不再自动从localStorage恢复，让smart fit先居中模型）
  const [savedCamConfig, setSavedCamConfig] = useState<CameraConfig | null>(null);
  const [targetY, setTargetY] = useState(0);  // ★ 观察点高度
  const [orbitEnabled, setOrbitEnabled] = useState(false);
  const [orbitSpeed, setOrbitSpeed] = useState(1.5);  // ★ 环绕速度倍率（1.0=12s周期）
  const [orbitHeightFactor, setOrbitHeightFactor] = useState(1.5);  // ★ 环绕高低(垂直幅度)
  const [orbitCenterYOffset, setOrbitCenterYOffset] = useState(0);  // ★ 环绕中心垂直偏移

  // ★ [fix] 每次渲染创建新对象导致 effect 无限触发，使用 useMemo 稳定引用
  const orbitModeParamsMemo = useMemo(() => ({ heightFactor: orbitHeightFactor }), [orbitHeightFactor]);

  // ★ ★ ★ 页面加载时自动恢复已保存的相机配置（使用 prop 驱动实现平滑过渡）
  useEffect(() => {
    const raw = localStorage.getItem('cam-v3');
    if (raw) {
      try {
        const config: CameraConfig = JSON.parse(raw);
        setSavedCamConfig(config);
        setTargetY(config.target[1]);
        // ★ 不再直接调用 loadCameraConfig，由 customCameraConfig prop 驱动 useEffect 自动平滑过渡
      } catch {}
    }
  }, []);

  // ✅ 自动持久化：所有参数变化时保存到 localStorage
  useEffect(() => {
    saveParams({
      layout, modelId: model.id,
      particles, platform, labels, showTitle, showStats,
      autoRotate, margin, lang, bgIdx,
      particleSize, autoRotateSpeed, fov, orbitEnabled, orbitSpeed, orbitHeightFactor, orbitCenterYOffset,
    });
  }, [layout, model.id, particles, platform, labels, showTitle, showStats, autoRotate, margin, lang, bgIdx, particleSize, autoRotateSpeed, fov, orbitEnabled, orbitSpeed, orbitHeightFactor, orbitCenterYOffset]);

  // 左侧控制标签（装饰/参数/镜头）
  const [controlTab, setControlTab] = useState<'deco' | 'params' | 'camera'>('deco');

  // 详情弹框
  const [detailModel, setDetailModel] = useState<typeof TEST_MODELS[0] | null>(null);
  const [detailLayout, setDetailLayout] = useState<LayoutMode>('featured');

  // 相机状态消息
  const [camMsg, setCamMsg] = useState('');

  // 事件追踪
  const [events, setEvents] = useState<string[]>([]);
  const track = useCallback((k: string) => setEvents(p => [...p, k].slice(-20)), []);

  // 保存/加载相机（使用 customCameraConfig prop 驱动 Tween 平滑过渡）
  const saveCam = useCallback(() => {
    if (!v3Ref.current) return;
    const c = v3Ref.current.saveCameraConfig();
    localStorage.setItem('cam-v3', JSON.stringify(c));
    setSavedCamConfig(c);  // ★ 同时更新状态引用
    setTargetY(c.target[1]);
    setCamMsg(`✅ 已保存 (pos:${c.position.map(v=>v.toFixed(1)).join(',')}  target:${c.target.map(v=>v.toFixed(1)).join(',')})`);
  }, []);

  const loadCam = useCallback(() => {
    const raw = localStorage.getItem('cam-v3');
    if (raw) {
      const config: CameraConfig = JSON.parse(raw);
      setSavedCamConfig({ ...config });  // ★ 创建新对象确保引用变化触发useEffect
      setTargetY(config.target[1]);
      setOrbitEnabled(false);  // ★ 停止环绕
      setCamMsg('✅ 已加载（平滑过渡）');
    } else {
      setCamMsg('⚠️ 无保存配置');
    }
  }, []);

  const resetCam = useCallback(() => {
    v3Ref.current?.resetCamera();
    setSavedCamConfig(null);  // ★ 清除自定义配置，让 smartFit 恢复默认视角
    setTargetY(0);
    setOrbitEnabled(false);
    setCamMsg('🔄 已重置');
  }, []);

  // ★ 用户交互：暂停轮播5秒
  const handleInteraction = useCallback(() => {
    setAutoPlay(false);
    clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => setAutoPlay(true), 5000);
  }, []);

  // ★ 模型加载完成：自动轮播恢复
  const handleV3LoadComplete = useCallback(() => {
    setIsHeroLoading(false);
    // ★ 如果有待切换且不是由加载触发的，触发切换
    if (pendingSwitch) {
      const next = TEST_MODELS.find(m => m.id === pendingSwitch);
      if (next) {
        setModel(next);
        setSavedCamConfig(null);
        setIsHeroLoading(true);
      }
      setPendingSwitch(null);
    }
    track('模型加载完成');
    setCamMsg('✅ V3加载完成');
  }, [pendingSwitch, track]);

  // ★ 模型加载失败：重置轮播状态防止卡死
  const handleV3Error = useCallback(() => {
    setIsHeroLoading(false);
    setAutoPlay(false);  // 失败时暂停轮播
    setTimeout(() => setAutoPlay(true), 3000);  // 3秒后自动恢复
    track('模型加载失败');
  }, [track]);

  // ★ 首页布局：自动轮播6个模型（同首页英雄区效果）
  // ★ 环绕模式时：暂停轮播开关，等环绕周期完成后再切
  useEffect(() => {
    if (!autoPlay || layout !== 'featured') return;
    const interval = setInterval(() => {
      if (isHeroLoading) return;
      const currentIdx = TEST_MODELS.findIndex(m => m.id === model.id);
      const nextIdx = (currentIdx + 1) % TEST_MODELS.length;
      
      if (orbitEnabled) {
        // ★ 环绕进行中：标记待切换，等环绕周期完成
        setPendingSwitch(TEST_MODELS[nextIdx].id);
        return;
      }
      
      setModel(TEST_MODELS[nextIdx]);
      setSavedCamConfig(null);  // 切换模型时清除自定义相机配置
      setIsHeroLoading(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoPlay, layout, model.id, isHeroLoading, orbitEnabled]);

  // ★ 环绕周期完成时：执行待切换
  const handleOrbitCycleComplete = useCallback(() => {
    if (pendingSwitch) {
      const next = TEST_MODELS.find(m => m.id === pendingSwitch);
      if (next) {
        setModel(next);
        setSavedCamConfig(null);
        setIsHeroLoading(true);
      }
      setPendingSwitch(null);
    }
  }, [pendingSwitch]);

  return (
    <div className="w2t-root">
      {/* ===== 顶部栏 ===== */}
      <header className="w2t-header">
        <div className="w2t-header-left">
          <span className="w2t-logo">✨</span>
          <h1>V3 效果预览</h1>
        </div>
        <nav className="w2t-tabs">
          {(['featured', 'grid', 'gallery', 'compact', 'modal'] as LayoutMode[]).map(l => (
            <button key={l} className={`w2t-tab ${layout === l ? 'active' : ''}`} onClick={() => setLayout(l)}>
              {l === 'featured' ? '📺 首页' : l === 'grid' ? '🔲 网格' : l === 'gallery' ? '🖼️ 画廊' : l === 'compact' ? '📦 紧凑' : '💬 弹框'}
            </button>
          ))}
        </nav>
      </header>

      {/* ===== 主区域 ===== */}
      <div className="w2t-body">

        {/* 模型选择器 + 控制面板 */}
        <aside className="w2t-sidebar">
          {/* ===== 控制标签栏 ===== */}
          <section className="w2t-panel">
            <div className="w2t-control-tabs">
              <button className={`w2t-ctl-tab ${controlTab === 'deco' ? 'active' : ''}`} onClick={() => setControlTab('deco')}>
                🎨 装饰控制
              </button>
              <button className={`w2t-ctl-tab ${controlTab === 'params' ? 'active' : ''}`} onClick={() => setControlTab('params')}>
                ⚙️ 参数调节
              </button>
              <button className={`w2t-ctl-tab ${controlTab === 'camera' ? 'active' : ''}`} onClick={() => setControlTab('camera')}>
                📷 镜头
              </button>
            </div>

            {/* 🎨 装饰控制 */}
            {controlTab === 'deco' && (
              <div className="w2t-switch-group" style={{ marginTop: 10 }}>
                {[
                  { k:'particles', l:lang === 'zh-CN' ? '✨ 粒子背景' : '✨ Particles', v:particles, s:(v: boolean) => setParticles(v) },
                  { k:'platform', l:lang === 'zh-CN' ? '◻️ 展示台' : '◻️ Platform', v:platform, s:(v: boolean) => setPlatform(v) },
                  { k:'labels', l:lang === 'zh-CN' ? '🏷️ 产品标签' : '🏷️ Labels', v:labels, s:(v: boolean) => setLabels(v) },
                  { k:'title', l:lang === 'zh-CN' ? '📝 标题叠加' : '📝 Title Overlay', v:showTitle, s:(v: boolean) => setShowTitle(v) },
                  { k:'stats', l:lang === 'zh-CN' ? '📊 统计信息' : '📊 Stats', v:showStats, s:(v: boolean) => setShowStats(v) },
                ].map(({k,l,v,s}) => (
                  <label key={k} className="w2t-switch">
                    <input type="checkbox" checked={v} onChange={e => s(e.target.checked)} />
                    <span className={`w2t-slider ${v ? 'on' : ''}`}></span>
                    <span>{l}</span>
                  </label>
                ))}
                <div className="w2t-param-row" style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>🌐 语言</label>
                  <button className="w2t-btn-sm" onClick={() => setLang(lang === 'zh-CN' ? 'en-US' : 'zh-CN')}>
                    {lang === 'zh-CN' ? '中文' : 'English'}
                  </button>
                </div>
              </div>
            )}

            {/* ⚙️ 参数调节 */}
            {controlTab === 'params' && (
              <div className="w2t-params" style={{ marginTop: 10 }}>
                <div className="w2t-param-row">
                  <label>自动旋转</label>
                  <button className={`w2t-btn-sm ${autoRotate ? 'on' : ''}`} onClick={() => setAutoRotate(!autoRotate)}>
                    {autoRotate ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="w2t-param-row">
                  <label>{lang === 'zh-CN' ? '相机距离' : 'Camera Margin'}: {margin.toFixed(1)}</label>
                  <input type="range" min="1" max="6" step="0.1" value={margin} onChange={e => setMargin(parseFloat(e.target.value))} />
                </div>
                <div className="w2t-param-row">
                  <label>背景色</label>
                  <div className="w2t-color-group">
                    {MODEL_COLORS.map((c,i) => (
                      <button key={c} className={`w2t-color-dot ${bgIdx === i ? 'active' : ''}`} style={{background: c}} onClick={() => setBgIdx(i)} />
                    ))}
                  </div>
                </div>
                <div className="w2t-param-row">
                  <label>{lang === 'zh-CN' ? '粒子大小' : 'Particle Size'}: {particleSize.toFixed(2)}</label>
                  <input type="range" min="0.05" max="2.0" step="0.05" value={particleSize} onChange={e => setParticleSize(parseFloat(e.target.value))} />
                </div>
              </div>
            )}

            {/* 📷 镜头 */}
            {controlTab === 'camera' && (
              <div style={{ marginTop: 10 }}>
                <div className="w2t-params">
                  <div className="w2t-param-row">
                    <label>{lang === 'zh-CN' ? '旋转速度' : 'Rotate Speed'}: {autoRotateSpeed.toFixed(1)}x</label>
                    <input type="range" min="0.2" max="5.0" step="0.1" value={autoRotateSpeed} onChange={e => setAutoRotateSpeed(parseFloat(e.target.value))} />
                  </div>
                  <div className="w2t-param-row">
                    <label>{lang === 'zh-CN' ? '视野角度' : 'FOV'}: {fov}°</label>
                    <input type="range" min="10" max="90" step="1" value={fov} onChange={e => setFov(parseFloat(e.target.value))} />
                    <div className="w2t-fov-presets">
                      {[30, 50, 70, 90].map(p => (
                        <button key={p} className={`w2t-fov-preset ${fov === p ? 'active' : ''}`} onClick={() => setFov(p)}>
                          {p}°
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w2t-param-row">
                    <label>{lang === 'zh-CN' ? '观察点高度' : 'Target Y'}: {targetY.toFixed(1)}</label>
                    <input type="range" min="-3" max="5" step="0.1" value={targetY} onChange={e => {
                      const ny = parseFloat(e.target.value);
                      setTargetY(ny);
                      if (v3Ref.current) {
                        const cur = v3Ref.current.saveCameraConfig();
                        const newCfg: CameraConfig = { ...cur, target: [cur.target[0], ny, cur.target[2]] };
                        setSavedCamConfig(newCfg);
                        v3Ref.current.loadCameraConfig(newCfg);
                      }
                    }} />
                  </div>
                </div>
                <div className="w2t-cam-ops" style={{ marginTop: 10 }}>
                  {[{l:'💾 保存', fn:saveCam},
                   {l:'📂 加载', fn:loadCam},
                   {l:'🔄 重置', fn:resetCam},
                  ].map(({l,fn}) => (
                    <button key={l} className="w2t-cam-btn" onClick={fn}>{l}</button>
                  ))}
                  <span className="w2t-cam-ops-sep" />
                  {[
                    {l:'正面', pos:[0,0,6] as [number,number,number]},
                    {l:'背面', pos:[0,0,-6]},
                    {l:'左侧', pos:[-6,0,0]},
                    {l:'右侧', pos:[6,0,0]},
                    {l:'俯视', pos:[0,5,0.01]},
                  ].map(({l,pos}) => (
                    <button key={l} className="w2t-cam-btn" onClick={() => {
                      if (!v3Ref.current) return;
                      const cur = v3Ref.current.saveCameraConfig();
                      const t = cur.target;
                      const newCfg: CameraConfig = {
                        position: [t[0]+pos[0], t[1]+pos[1], t[2]+pos[2]],
                        target: [t[0], t[1], t[2]],
                        zoom: cur.zoom,
                      };
                      // ★ 只用 prop 驱动实现平滑过渡（不使用直接 ref 调用）
                      setSavedCamConfig({ ...newCfg });
                      setOrbitEnabled(false);
                    }}>{l}</button>
                  ))}
                  <span className="w2t-cam-ops-sep" />
                  <button className={`w2t-cam-btn ${orbitEnabled ? 'on' : ''}`} onClick={() => setOrbitEnabled(!orbitEnabled)}>
                    {orbitEnabled ? '⏹ 停止环绕' : '🔄 环绕'}
                  </button>
                  {orbitEnabled && (
                    <div className="w2t-param-row" style={{ marginTop: 8 }}>
                      <label>{lang === 'zh-CN' ? '环绕速度' : 'Orbit Speed'}: {orbitSpeed.toFixed(1)}x</label>
                      <input type="range" min="0.5" max="3.0" step="0.1" value={orbitSpeed} onChange={e => setOrbitSpeed(parseFloat(e.target.value))} />
                    </div>
                  )}
                  {orbitEnabled && (
                    <div className="w2t-param-row" style={{ marginTop: 8 }}>
                      <label>{lang === 'zh-CN' ? '环绕高低' : 'Orbit Height'}: {orbitHeightFactor.toFixed(1)}x</label>
                      <input type="range" min="0.5" max="3.0" step="0.1" value={orbitHeightFactor} onChange={e => setOrbitHeightFactor(parseFloat(e.target.value))} />
                    </div>
                  )}
                  {orbitEnabled && (
                    <div className="w2t-param-row" style={{ marginTop: 8 }}>
                      <label>{lang === 'zh-CN' ? '中心高度' : 'Center Y'}: {orbitCenterYOffset.toFixed(1)}</label>
                      <input type="range" min="-2.0" max="2.0" step="0.1" value={orbitCenterYOffset} onChange={e => setOrbitCenterYOffset(parseFloat(e.target.value))} />
                    </div>
                  )}
                </div>
                {camMsg && <div className="w2t-cam-msg">{camMsg}</div>}
              </div>
            )}
          </section>

          {/* 事件追踪 */}
          <section className="w2t-panel w2t-panel-results">
            <h3>📊 事件追踪</h3>
            <div className="w2t-results-grid">
              {events.length === 0 ? (
                <div className="w2t-result-item" style={{ gridColumn: '1 / -1', justifyContent: 'center', opacity: 0.5 }}>
                  <span>暂无事件</span>
                </div>
              ) : (
                events.slice(-10).reverse().map((ev, i) => (
                  <div key={i} className="w2t-result-item pass" style={{ animation: 'none' }}>
                    <span className="w2t-result-icon">✅</span>
                    <span>{ev}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* ===== 主查看区域 ===== */}
        <main className="w2t-main">
          {layout === 'grid' || layout === 'gallery' ? (
            /* ★ 网格/画廊布局：渲染6个独立V3卡片 */
            layout === 'grid' ? (
              <div className="w2t-grid-viewer">
                {TEST_MODELS.map(m => (
                  <div key={m.id} className="w2t-grid-card"
                    onClick={() => { setDetailModel(m); setDetailLayout('featured'); }}
                  >
                    <div className="w2t-card-3d" onClick={e => e.stopPropagation()}>
                      <UniversalGaussianCardV3
                        modelUrl={m.url}
                        layout="compact"
                        autoCenter={true}
                        margin={1.8}
                        enableControls={true}
                        autoRotate={true}
                        autoRotateSpeed={0.5}
                        showParticles={true}
                        showPlatform={false}
                        showLabels={false}
                        showTitle={true}
                        title={`${m.icon} ${m.name}`}
                        subtitle={`${m.format} · ${m.category}`}
                        showStats={false}
                        onLoadComplete={() => track('网格卡片加载完成')}
                        onError={() => track('网格卡片加载失败')}
                      />
                    </div>
                    <div className="w2t-card-footer">
                      <button className="w2t-card-detail-btn" onClick={e => { e.stopPropagation(); setDetailModel(m); setDetailLayout('featured'); }}>
                        🔍 查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w2t-gallery-viewer">
                {TEST_MODELS.map(m => (
                  <div key={m.id} className="w2t-gallery-card"
                    onClick={() => { setDetailModel(m); setDetailLayout('gallery'); }}
                  >
                    <div className="w2t-card-3d" onClick={e => e.stopPropagation()}>
                      <UniversalGaussianCardV3
                        modelUrl={m.url}
                        layout="compact"
                        autoCenter={true}
                        margin={2.0}
                        enableControls={true}
                        autoRotate={true}
                        autoRotateSpeed={0.5}
                        showParticles={true}
                        showPlatform={false}
                        showLabels={false}
                        showTitle={true}
                        title={`${m.icon} ${m.name}`}
                        subtitle={`${m.format} · ${m.category}`}
                        showStats={false}
                        onLoadComplete={() => track('画廊卡片加载完成')}
                        onError={() => track('画廊卡片加载失败')}
                      />
                    </div>
                    <div className="w2t-card-footer">
                      <button className="w2t-card-detail-btn" onClick={e => { e.stopPropagation(); setDetailModel(m); setDetailLayout('gallery'); }}>
                        🔍 查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="w2t-viewer">
              <UniversalGaussianCardV3
                ref={v3Ref}
                modelUrl={model.url}
                layout={layout}
                autoCenter={true}
                margin={margin}
                enableControls={true}
                autoRotate={autoRotate}
                autoRotateSpeed={autoRotateSpeed}
                fov={fov}
                backgroundColor={MODEL_COLORS[bgIdx]}
                showParticles={particles}
                showPlatform={platform}
                showLabels={labels}
                products={model.products.length > 0 ? (model.products as ProductLabel[]) : DEFAULT_PRODUCTS}
                language={lang}
                particleSize={particleSize}
                showTitle={showTitle}
                title={lang === 'zh-CN' ? `✨ ${model.name}` : `✨ ${model.name === '蓝色大闪蝶' ? 'Blue Morpho' : model.name === '可爱猫咪' ? 'Cute Cat' : 'Hunyuan Model'}`}
                subtitle={lang === 'zh-CN' ? `V3 组件 · ${model.format} 格式 · ${layout} 布局` : `V3 Component · ${model.format} · ${layout}`}
                showStats={showStats}
                orbitEnabled={orbitEnabled}
                orbitDuration={Math.round(12000 / orbitSpeed)}
                orbitModeParams={orbitModeParamsMemo}
                orbitSpeed={orbitSpeed}
                orbitCenterYOffset={orbitCenterYOffset}
                onOrbitStateChange={setOrbitEnabled}
                onOrbitCycleComplete={handleOrbitCycleComplete}
                customCameraConfig={savedCamConfig}
                onLoadComplete={handleV3LoadComplete}
                onError={handleV3Error}
                onClick={() => track('点击事件')}
                onDoubleClick={() => track('双击事件')}
                onInteraction={handleInteraction}
                onScreenshot={() => track('截图事件')}
              />
              
              {/* ★ 首页布局：顶部轮播指示点 */}
              {layout === 'featured' && (
                <div className="w2t-carousel-indicators">
                  {TEST_MODELS.map(m => (
                    <button
                      key={m.id}
                      className={`w2t-carousel-dot ${model.id === m.id ? 'active' : ''}`}
                      onClick={() => {
                        if (model.id !== m.id) {
                          setModel(m);
                          setIsHeroLoading(true);
                          setSavedCamConfig(null);
                        }
                      }}
                      title={`${m.icon} ${m.name}`}
                    />
                  ))}
                  <span className="w2t-carousel-sep" />
                  <button
                    className={`w2t-carousel-autobtn ${autoRotate ? 'on' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setAutoRotate(!autoRotate); }}
                    title={autoRotate ? (lang === 'zh-CN' ? '暂停旋转' : 'Pause Rotation') : (lang === 'zh-CN' ? '自动旋转' : 'Auto Rotate')}
                  >
                    {autoRotate ? '⏸' : '▶️'}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

      </div>

      {/* ===== 详情弹框（可复用公共组件） ===== */}
      {detailModel && (
        <div className="w2t-modal-overlay" onClick={() => setDetailModel(null)}>
          <div className="w2t-modal" onClick={e => e.stopPropagation()}>
            {/* 关闭按钮 */}
            <button className="w2t-modal-close" onClick={() => setDetailModel(null)}>✕</button>

            {/* 模型名称 */}
            <div className="w2t-modal-header">
              <h2>{detailModel.icon} {detailModel.name}</h2>
              <span className="w2t-modal-subtitle">
                {detailModel.format} · {lang === 'zh-CN' ? detailModel.category : detailModel.category === '自然' ? 'Nature' : detailModel.category === '宠物' ? 'Pet' : 'Indoor'}
              </span>
            </div>

            {/* 布局模式切换 */}
            <div className="w2t-modal-layouts">
              {(['featured', 'grid', 'gallery', 'compact', 'modal'] as LayoutMode[]).map(l => (
                <button
                  key={l}
                  className={`w2t-layout-btn ${detailLayout === l ? 'active' : ''}`}
                  onClick={() => setDetailLayout(l)}
                >
                  {l === 'featured' ? '📺 首页' : l === 'grid' ? '🔲 网格' : l === 'gallery' ? '🖼️ 画廊' : l === 'compact' ? '📦 紧凑' : '💬 弹框'}
                </button>
              ))}
            </div>

            {/* 3D 查看器 - 始终使用 V3 */}
            <div className="w2t-modal-viewer">
              <UniversalGaussianCardV3
                ref={detailViewerRef}
                modelUrl={detailModel.url}
                autoCenter={true}
                margin={detailLayout === 'featured' ? 3.0 : 2.5}
                layout={detailLayout}
                enableControls={true}
                autoRotate={true}
                autoRotateSpeed={autoRotateSpeed}
                fov={fov}
                backgroundColor={MODEL_COLORS[bgIdx]}
                showParticles={true}
                showPlatform={true}
                showLabels={detailModel.products.length > 0}
                products={detailModel.products.length > 0 ? (detailModel.products as ProductLabel[]) : undefined}
                language={lang}
                particleSize={particleSize}
                showTitle={true}
                title={detailModel.name}
                subtitle={`${detailModel.format} · ${detailLayout} 布局`}
                showStats={true}
                onScreenshot={() => track('截图事件')}
              />
            </div>

          {/* 截图按钮 */}
            <button className="w2t-modal-screenshot" onClick={() => {
              const dataUrl = detailViewerRef.current?.screenshot();
              if (dataUrl) track('截图事件');
            }}>
              📷 {lang === 'zh-CN' ? '截图' : 'Screenshot'}
            </button>

            {/* 底部信息 */}
            <div className="w2t-modal-footer">
              <div className="w2t-modal-tags">
                <span className="w2t-tag tag-format">{detailModel.format}</span>
                <span className="w2t-tag tag-category">{detailModel.category}</span>
                <span className="w2t-tag tag-layout">{detailLayout}</span>
              </div>
              <div className="w2t-modal-hint">
                🖱️ {lang === 'zh-CN' ? '点击拖拽旋转 · 滚轮缩放' : 'Drag to rotate · Scroll to zoom'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Week2ComponentsTest;
