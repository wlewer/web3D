/**
 * NewArchitectureTest - 新架构测试页面（增强版）
 * 
 * 测试所有组件的统一装饰控制协议：
 * - Base3DViewer
 * - UniversalGaussianCardV3
 * - 装饰模块（粒子、展示台、产品标签）
 * - 语言切换、背景色、布局模式、相机操作
 * 
 * 通过 DeprecatedControlProps 统一控制装饰行为
 * 验证各布局模式下装饰效果一致
 * 
 * @version 2.0.0
 */

import { useState, useRef } from 'react';
import { Base3DViewer } from '../../components/3d/Base3DViewer';
import { UniversalGaussianCardV3 } from '../../components/3d/UniversalGaussianCardV3';
import { Simple3DViewer } from '../../components/3d/Simple3DViewer';
import { GalleryCard } from '../../components/3d/GalleryCard';
import type { Base3DViewerRef } from '../../components/3d/Base3DViewer';
import type { LayoutMode } from '../../components/3d/Base3DViewer';
import type { DecorationControlProps } from '../../components/3d/types/decorations';
import './NewArchitectureTest.css';

// ==================== 测试数据 ====================

const TEST_MODELS = [
  {
    id: 'butterfly',
    icon: '🦋',
    name: '蓝色大闪蝶',
    url: '/models/butterfly.spz',
    format: 'SPZ',
    category: '动物',
    products: [
      { id: 'p1', name: '生态研究', description: '用于昆虫生态研究', color: '#22c55e', position: [-2, 1, 0] as [number, number, number] },
      { id: 'p2', name: '艺术摄影', description: '高精度3D艺术品展示', color: '#f97316', position: [2, 1, 0] as [number, number, number] },
    ]
  },
  {
    id: 'cat',
    icon: '🐱',
    name: '可爱猫咪',
    url: '/models/cat.spz',
    format: 'SPZ',
    category: '宠物',
    products: [
      { id: 'p1', name: '宠物医疗', description: '宠物健康检测3D参考模型', color: '#ec4899', position: [0, 0.8, 0] as [number, number, number] },
    ]
  },
  {
    id: 'room',
    icon: '🏠',
    name: '儿童房间',
    url: '/models/kidsroom_transparent.glb',
    format: 'GLB',
    category: '室内',
    products: []
  },
];

const MODEL_COLORS = ['#0f0f23', '#1a0f2e', '#0a1628', '#1c1c1c', '#2d1b4e', '#0d2137'];
const LAYOUT_MODES: LayoutMode[] = ['featured', 'grid', 'gallery', 'compact', 'modal'];

// ==================== 主组件 ====================

export function NewArchitectureTest() {
  const [activeTest, setActiveTest] = useState<'base' | 'v3' | 'simple' | 'gallery'>('base');
  const [selectedModel, setSelectedModel] = useState(TEST_MODELS[0]);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // 装饰控制
  const [particles, setParticles] = useState(true);
  const [platform, setPlatform] = useState(true);
  const [labels, setLabels] = useState(true);
  const [lang, setLang] = useState<'zh-CN' | 'en-US'>('zh-CN');
  const [bgIdx, setBgIdx] = useState(0);
  const [layout, setLayout] = useState<LayoutMode>('featured');

  // 相机控制
  const baseRef = useRef<Base3DViewerRef>(null);
  const v3Ref = useRef<Base3DViewerRef>(null);
  const [camMsg, setCamMsg] = useState('');

  const markResult = (key: string, success: boolean) => {
    setTestResults(prev => ({ ...prev, [key]: success }));
  };

  const saveCam = (ref: Base3DViewerRef | null) => {
    if (!ref) return;
    const c = ref.saveCameraConfig();
    localStorage.setItem('newarch-cam', JSON.stringify(c));
    setCamMsg('✔ 已保存 (pos:' + c.position.map(v => v.toFixed(1)).join(',') + ')');
    markResult('Camera_Save', true);
  };

  const loadCam = (ref: Base3DViewerRef | null) => {
    if (!ref) return;
    const raw = localStorage.getItem('newarch-cam');
    if (raw) {
      ref.loadCameraConfig(JSON.parse(raw));
      setCamMsg('✔ 已加载');
      markResult('Camera_Load', true);
    } else {
      setCamMsg('⚠️ 无保存配置');
    }
  };

  const resetCam = (ref: Base3DViewerRef | null) => {
    ref?.resetCamera();
    setCamMsg('🔄 已重置');
  };

  // 装饰控制统一对象
  const decorationControls: DecorationControlProps = {
    showParticles: particles,
    showPlatform: platform,
    showLabels: labels,
    products: selectedModel.products,
    language: lang,
  };

  // 当前 ref
  const currentRef = activeTest === 'base' ? baseRef : activeTest === 'v3' ? v3Ref : null;

  return (
    <div className="new-architecture-test">
      <header className="test-header">
        <h1>🧪 新架构测试页面</h1>
        <p>统一装饰控制协议 验证 | 布局模式测试 | 相机配置测试</p>
      </header>

      {/* ===== 主区域（左侧控制面板 + 右侧视图器） ===== */}
      <div className="test-layout">
        
        {/* 控制面板 */}
        <aside className="test-sidebar">
          
          {/* 测试导航 */}
          <section className="control-section">
            <h3>📌 组件选择</h3>
            <div className="test-nav-vertical">
              {([
                { key: 'base' as const, label: 'Base3DViewer' },
                { key: 'v3' as const, label: 'V3 卡片' },
                { key: 'simple' as const, label: 'Simple' },
                { key: 'gallery' as const, label: 'Gallery' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  className={activeTest === key ? 'nav-btn active' : 'nav-btn'}
                  onClick={() => setActiveTest(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 模型选择 */}
          <section className="control-section">
            <h3>📁 模型选择</h3>
            <div className="model-list-vertical">
              {TEST_MODELS.map(m => (
                <button
                  key={m.id}
                  className={selectedModel.id === m.id ? 'model-btn active' : 'model-btn'}
                  onClick={() => setSelectedModel(m)}
                >
                  <span className="model-icon">{m.icon}</span>
                  <span className="model-name">{m.name}</span>
                  <span className="model-format">{m.format}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 装饰控制 */}
          <section className="control-section">
            <h3>🎨 装饰控制</h3>
            <div className="switch-group">
              <label className="switch-row">
                <input type="checkbox" checked={particles} onChange={e => setParticles(e.target.checked)} />
                <span className="switch-label">✨ 粒子背景</span>
              </label>
              <label className="switch-row">
                <input type="checkbox" checked={platform} onChange={e => setPlatform(e.target.checked)} />
                <span className="switch-label">◻️ 展示台</span>
              </label>
              <label className="switch-row">
                <input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} />
                <span className="switch-label">🏷️ 产品标签</span>
              </label>
            </div>
            <div className="control-row">
              <label>🌐 语言</label>
              <button className="toggle-btn" onClick={() => setLang(lang === 'zh-CN' ? 'en-US' : 'zh-CN')}>
                {lang === 'zh-CN' ? '🇨🇳 中文' : '🇺🇸 English'}
              </button>
            </div>
          </section>

          {/* 参数调节 */}
          <section className="control-section">
            <h3>⚙️ 参数调节</h3>
            <div className="control-row">
              <label>布局模式</label>
              <select className="layout-select" value={layout} onChange={e => setLayout(e.target.value as LayoutMode)}>
                {LAYOUT_MODES.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
            <div className="control-row">
              <label>背景色</label>
              <div className="color-group">
                {MODEL_COLORS.map((c, i) => (
                  <button
                    key={c}
                    className={'color-dot ' + (bgIdx === i ? 'active' : '')}
                    style={{ background: c }}
                    onClick={() => setBgIdx(i)}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* 相机操作 */}
          {activeTest !== 'gallery' && (
            <section className="control-section">
              <h3>📷 相机操作</h3>
              <div className="cam-ops">
                <button className="cam-btn" onClick={() => saveCam(currentRef?.current)}>💾 保存</button>
                <button className="cam-btn" onClick={() => loadCam(currentRef?.current)}>📂 加载</button>
                <button className="cam-btn" onClick={() => resetCam(currentRef?.current)}>🔄 重置</button>
              </div>
              {camMsg && <div className="cam-msg">{camMsg}</div>}
            </section>
          )}

          {/* 测试统计 */}
          <section className="control-section results">
            <h3>📊 测试统计</h3>
            <div className="results-list">
              {Object.keys(testResults).length === 0 && <div className="no-results">尚无测试结果</div>}
              {Object.entries(testResults).map(([k, v]) => (
                <div key={k} className={'result-item ' + (v ? 'success' : 'fail')}>
                  <span>{v ? '✅' : '❌'}</span>
                  <span>{k}</span>
                </div>
              ))}
            </div>
            {Object.keys(testResults).length > 0 && (
              <div className="result-summary">
                通过 {Object.values(testResults).filter(Boolean).length}/{Object.keys(testResults).length}
              </div>
            )}
          </section>
        </aside>

        {/* ===== 视图器区域 ===== */}
        <main className="test-viewer-area">
          {activeTest === 'base' && (
            <Base3DViewerTest
              modelUrl={selectedModel.url}
              modelName={selectedModel.name}
              decorationControls={decorationControls}
              layout={layout}
              backgroundColor={MODEL_COLORS[bgIdx]}
              ref={baseRef}
              onResult={markResult}
            />
          )}
          {activeTest === 'v3' && (
            <V3CardTest
              modelUrl={selectedModel.url}
              modelName={selectedModel.name}
              decorationControls={decorationControls}
              layout={layout}
              backgroundColor={MODEL_COLORS[bgIdx]}
              ref={v3Ref}
              onResult={markResult}
            />
          )}
          {activeTest === 'simple' && (
            <SimpleViewerTest
              modelUrl={selectedModel.url}
              onResult={markResult}
            />
          )}
          {activeTest === 'gallery' && (
            <GalleryCardTest
              models={TEST_MODELS}
              onResult={markResult}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ==================== 子测试组件 ====================

interface TestProps {
  modelUrl: string;
  modelName?: string;
  decorationControls?: DecorationControlProps;
  layout?: LayoutMode;
  backgroundColor?: string;
  onResult: (key: string, success: boolean) => void;
}

const Base3DViewerTest = ({
  modelUrl, modelName, decorationControls, layout, backgroundColor, onResult, ref
}: TestProps & { ref: React.Ref<Base3DViewerRef> }) => (
  <div className="test-viewer">
    <Base3DViewer
      ref={ref}
      modelUrl={modelUrl}
      autoCenter={true}
      margin={2.8}
      layout={layout || 'featured'}
      enableControls={true}
      autoRotate={true}
      backgroundColor={backgroundColor || '#0f0f23'}
      showTitle={true}
      title={modelName || ''}
      subtitle={'Base3DViewer - ' + (layout || 'featured') + ' 布局'}
      showStats={true}
      decorationControls={decorationControls}
      onLoadComplete={() => onResult('Base3DViewer', true)}
      onError={() => onResult('Base3DViewer', false)}
    />
  </div>
);

const V3CardTest = ({
  modelUrl, modelName, decorationControls, layout, backgroundColor, onResult, ref
}: TestProps & { ref: React.Ref<Base3DViewerRef> }) => (
  <div className="test-viewer">
    <UniversalGaussianCardV3
      ref={ref}
      modelUrl={modelUrl}
      autoCenter={true}
      margin={2.8}
      layout={layout || 'featured'}
      enableControls={true}
      autoRotate={true}
      backgroundColor={backgroundColor || '#0f0f23'}
      showTitle={true}
      title={modelName || ''}
      subtitle={'V3 - ' + (layout || 'featured') + ' 布局'}
      showStats={true}
      showParticles={decorationControls?.showParticles}
      showPlatform={decorationControls?.showPlatform}
      showLabels={decorationControls?.showLabels}
      products={decorationControls?.products}
      language={decorationControls?.language}
      onLoadComplete={() => onResult('V3', true)}
      onError={() => onResult('V3', false)}
    />
  </div>
);

interface SimpleProps {
  modelUrl: string;
  onResult: (key: string, success: boolean) => void;
}

const SimpleViewerTest = ({ modelUrl, onResult }: SimpleProps) => (
  <div className="test-viewer">
    <Simple3DViewer
      modelUrl={modelUrl}
      enableControls={false}
      autoRotate={true}
      onLoadComplete={() => onResult('Simple3DViewer', true)}
      onError={() => onResult('Simple3DViewer', false)}
    />
  </div>
);

interface GalleryProps {
  models: typeof TEST_MODELS;
  onResult: (key: string, success: boolean) => void;
}

const GalleryCardTest = ({ models, onResult }: GalleryProps) => (
  <div className="test-gallery">
    <div className="gallery-grid">
      {models.map(model => (
        <GalleryCard
          key={model.id}
          id={model.id}
          title={model.name}
          description={'测试模型'}
          modelUrl={model.url}
          tags={[model.format]}
          onClick={() => onResult('GalleryCard', true)}
        />
      ))}
    </div>
  </div>
);

export default NewArchitectureTest;
