// UniversalGaussianCard V2.0 测试页面
import { useState } from 'react';
import { UniversalGaussianCardV2, type LayoutMode, type ProductLabel } from '../../components/3d/UniversalGaussianCardV2';
import './UniversalGaussianCardV2Test.css';

const TEST_MODELS = {
  spz: 'https://sparkjs.dev/assets/splats/butterfly.spz', // SPZ模型（蝴蝶）
  glb: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb', // GLB模型（鸭子）
};

const TEST_PRODUCTS: ProductLabel[] = [
  {
    id: '1',
    name: '产品A',
    nameEn: 'Product A',
    description: '这是一个示例产品标签',
    descriptionEn: 'This is a sample product label',
    position: [0.5, 0.5, 0],
    color: '#667eea',
  },
  {
    id: '2',
    name: '产品B',
    nameEn: 'Product B',
    description: '另一个产品标签示例',
    descriptionEn: 'Another product label example',
    position: [-0.5, -0.5, 0],
    color: '#764ba2',
  },
];

export function UniversalGaussianCardV2Test() {
  const [currentModel, setCurrentModel] = useState<'spz' | 'glb'>('spz');
  const [currentLayout, setCurrentLayout] = useState<LayoutMode>('grid');
  const [showParticles, setShowParticles] = useState(false);
  const [showPlatform, setShowPlatform] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);
  const [margin, setMargin] = useState(2.5);

  const layouts: LayoutMode[] = ['featured', 'grid', 'list', 'carousel', 'gallery', 'compact', 'modal'];

  return (
    <div className="v2-test-page">
      <header className="v2-test-header">
        <h1>UniversalGaussianCard V2.0 测试页面</h1>
        <p>融合SparkViewer鲁棒性 + UniversalGaussianCard智能居中算法</p>
      </header>

      {/* 控制面板 */}
      <div className="v2-test-controls">
        <div className="control-group">
          <h3>模型类型</h3>
          <div className="button-group">
            <button
              className={currentModel === 'spz' ? 'active' : ''}
              onClick={() => setCurrentModel('spz')}
            >
              SPZ模型
            </button>
            <button
              className={currentModel === 'glb' ? 'active' : ''}
              onClick={() => setCurrentModel('glb')}
            >
              GLB模型
            </button>
          </div>
        </div>

        <div className="control-group">
          <h3>布局模式</h3>
          <div className="button-group">
            {layouts.map((layout) => (
              <button
                key={layout}
                className={currentLayout === layout ? 'active' : ''}
                onClick={() => setCurrentLayout(layout)}
              >
                {layout}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <h3>场景装饰</h3>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={showParticles}
                onChange={(e) => setShowParticles(e.target.checked)}
              />
              粒子背景
            </label>
            <label>
              <input
                type="checkbox"
                checked={showPlatform}
                onChange={(e) => setShowPlatform(e.target.checked)}
              />
              展示台
            </label>
            <label>
              <input
                type="checkbox"
                checked={showProducts}
                onChange={(e) => setShowProducts(e.target.checked)}
              />
              产品标签
            </label>
          </div>
        </div>

        <div className="control-group">
          <h3>相机控制</h3>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={autoCenter}
                onChange={(e) => setAutoCenter(e.target.checked)}
              />
              智能居中
            </label>
          </div>
          <div className="slider-group">
            <label>
              Margin: {margin.toFixed(1)}
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 测试区域 */}
      <div className={`v2-test-container layout-${currentLayout}`}>
        <UniversalGaussianCardV2
          modelUrl={TEST_MODELS[currentModel]}
          layout={currentLayout}
          autoCenter={autoCenter}
          margin={margin}
          autoRotate={true}
          enableControls={true}
          showParticles={showParticles}
          showPlatform={showPlatform}
          products={showProducts ? TEST_PRODUCTS : []}
          showTitle={true}
          title={`测试模型 - ${currentModel.toUpperCase()}`}
          subtitle={`布局模式: ${currentLayout}`}
          showStats={true}
          backgroundColor="#0a0a0f"
          onLoadComplete={() => console.log('✅ 模型加载完成')}
          onProgress={(progress) => console.log(`📊 加载进度: ${progress}%`)}
          onError={(error) => console.error('❌ 加载错误:', error)}
        />
      </div>

      {/* 说明文档 */}
      <div className="v2-test-docs">
        <h2>功能说明</h2>
        <ul>
          <li><strong>智能居中算法</strong>：自动计算最佳相机距离，所有模型都能完美显示</li>
          <li><strong>SplatMesh特殊处理</strong>：使用固定包围盒(-2,-2,-2)到(2,2,2) + margin=2.5</li>
          <li><strong>GLB百分位裁剪</strong>：移除5%极端顶点，聚焦核心几何体</li>
          <li><strong>7种布局模式</strong>：featured/grid/list/carousel/gallery/compact/modal</li>
          <li><strong>场景装饰模块化</strong>：粒子背景、展示台、产品标签条件渲染</li>
          <li><strong>鲁棒性机制</strong>：超时保护、降级处理、帧同步锁、心跳进度条</li>
        </ul>

        <h2>测试要点</h2>
        <ol>
          <li>切换SPZ和GLB模型，验证智能居中效果</li>
          <li>测试7种布局模式，确保样式正确</li>
          <li>开启/关闭场景装饰，验证条件渲染</li>
          <li>调整margin值，观察相机距离变化</li>
          <li>检查FPS统计，验证性能表现</li>
          <li>拖拽旋转、滚轮缩放，验证交互流畅度</li>
        </ol>
      </div>
    </div>
  );
}
