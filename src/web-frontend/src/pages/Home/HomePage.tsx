// 首页组件 - 全屏3D展示 + 官方模型作品集 + 3D车间嵌入
import { useState, useEffect, useCallback, useRef } from 'react';
import { SparkViewer } from '../../components/3d';
import { Model3DCard } from '../../components/Model3DCard';
import { Workshop3D } from '../Workshop3D';
import { useTranslation } from '../../i18n';
import { OFFICIAL_MODELS, CATEGORIES, getAllModels } from '../../data/officialModels';
import { PANORAMAS } from '../../data/panoramas';
import type { PanoramaConfig } from '../../data/panoramas';
import './HomePage.css';
import { formatMessage } from '../../i18n';

// 页面导航类型
type PageType = 'home' | 'gallery' | 'auth' | 'upload' | 'official-editor' | 'showcase' | 'book' | 'book-gallery' | 'generation';

// 首页 Props
interface HomePageProps {
  onNavigate?: (page: PageType) => void;
  showWorkshop3D?: boolean;
  onWorkshopClose?: () => void; // 3D车间关闭回调
}

// 产品介绍标签接口
interface ProductTag {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  color?: string;
}

// 模型数据 - 使用官方真实可用的3D模型
const MODELS_3D = [
  { 
    id: 'butterfly', 
    name: '🦋 蓝色大闪蝶', 
    category: '自然生物',
    desc: '3D Gaussian Splatting 真实重建，完美还原蝴蝶翅膀纹理和鳞粉效果',
    color: '#667eea',
    splatUrl: '/models/butterfly.spz',
    //https://sparkjs.dev/assets/splats/butterfly.spz', butterfly-ai.spz
    // 蝴蝶空间的产品介绍标签
    products: [
      { id: 'p1', name: '🦋 生态研究', nameEn: '🦋 Ecology Research', description: '用于昆虫生态研究', descriptionEn: 'For insect ecology research', color: '#22c55e' },
      { id: 'p2', name: '📸 艺术摄影', nameEn: '📸 Art Photography', description: '生物艺术创作参考', descriptionEn: 'Bio-art creation reference', color: '#f97316' },
      { id: 'p3', name: '🎓 教学标本', nameEn: '🎓 Teaching Specimen', description: '生物学教学辅助', descriptionEn: 'Biology teaching aid', color: '#3b82f6' },
    ] as ProductTag[]
  },
  { 
    id: 'cat', 
    name: '🐱 可爱猫咪', 
    category: '可爱动物',
    desc: '真实猫咪3DGS重建，毛发细节栩栩如生，眼神灵动可爱',
    color: '#f97316',
    splatUrl: '/models/cat.spz', // 使用本地文件
    products: [
      { id: 'p1', name: '🐱 宠物医疗', nameEn: '🐱 Pet Healthcare', description: '宠物健康检测参考', descriptionEn: 'Pet health check reference', color: '#ec4899' },
      { id: 'p2', name: '🎮 游戏开发', nameEn: '🎮 Game Development', description: '游戏角色建模参考', descriptionEn: 'Game character modeling', color: '#8b5cf6' },
    ] as ProductTag[]
  },
  { 
    id: 'burger', 
    name: '🍔 精致汉堡', 
    category: '美食料理',
    desc: '精致汉堡3DGS数字化，完美呈现食材纹理和光泽质感',
    color: '#eab308',
    splatUrl: 'https://sparkjs.dev/assets/splats/food/burger-from-amboy.spz',
    products: [
      { id: 'p1', name: '🍔 餐饮展示', nameEn: '🍔 Food Display', description: '餐厅菜品3D展示', descriptionEn: 'Restaurant 3D food display', color: '#eab308' },
      { id: 'p2', name: '📱 菜单设计', nameEn: '📱 Menu Design', description: '数字菜单应用', descriptionEn: 'Digital menu application', color: '#f97316' },
      { id: 'p3', name: '🎬 广告制作', nameEn: '🎬 Commercial Production', description: '美食广告3D特效', descriptionEn: 'Food commercial 3D effects', color: '#ef4444' },
    ] as ProductTag[]
  },
  { 
    id: 'robot', 
    name: '🤖 机器人头', 
    category: '科技产品',
    desc: '未来科技机器人3DGS重建，精细到每个金属零件和电路纹理',
    color: '#06b6d4',
    splatUrl: 'https://sparkjs.dev/assets/splats/robot-head.spz',
    products: [
      { id: 'p1', name: '🤖 机械工程', nameEn: '🤖 Mechanical Engineering', description: '机器人设计参考', descriptionEn: 'Robot design reference', color: '#06b6d4' },
      { id: 'p2', name: '🎮 游戏角色', nameEn: '🎮 Game Character', description: '科幻游戏角色建模', descriptionEn: 'Sci-fi game character modeling', color: '#8b5cf6' },
      { id: 'p3', name: '🎬 影视特效', nameEn: '🎬 Film VFX', description: '科幻电影特效制作', descriptionEn: 'Sci-fi movie VFX production', color: '#3b82f6' },
    ] as ProductTag[]
  },
  { 
    id: 'penguin', 
    name: '🐧 南极企鹅', 
    category: '极地动物',
    desc: '南极企鹅3DGS数字化，完美还原羽毛质感和呆萌姿态',
    color: '#1e293b',
    splatUrl: 'https://sparkjs.dev/assets/splats/penguin.spz',
    products: [
      { id: 'p1', name: '🐧 极地研究', nameEn: '🐧 Polar Research', description: '企鹅生态研究辅助', descriptionEn: 'Penguin ecology research', color: '#06b6d4' },
      { id: 'p2', name: '🏛️ 博物馆展品', nameEn: '🏛️ Museum Exhibit', description: '数字化展览展示', descriptionEn: 'Digital exhibition display', color: '#22c55e' },
    ] as ProductTag[]
  },
  { 
    id: 'dessert', 
    name: '🍰 精致甜点', 
    category: '甜品糕点',
    desc: '精致甜点3DGS重建，奶油层次和糖霜细节纤毫毕现',
    color: '#ec4899',
    splatUrl: 'https://sparkjs.dev/assets/splats/dessert.spz',
    products: [
      { id: 'p1', name: '🍰 烘焙教学', nameEn: '🍰 Baking Tutorial', description: '甜点制作教学参考', descriptionEn: 'Dessert making tutorial', color: '#ec4899' },
      { id: 'p2', name: '🎂 定制设计', nameEn: '🎂 Custom Design', description: '蛋糕定制设计服务', descriptionEn: 'Custom cake design service', color: '#f472b6' },
      { id: 'p3', name: '📸 产品拍摄', nameEn: '📸 Product Photography', description: '电商产品摄影参考', descriptionEn: 'E-commerce product reference', color: '#fb923c' },
    ] as ProductTag[]
  },
];

export function HomePage({ onNavigate, showWorkshop3D, onWorkshopClose }: HomePageProps) {
  const { t, language } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(showWorkshop3D || false);
  const workshopRef = useRef<HTMLDivElement>(null);
  
  // 全景图状态
  const [currentPanorama, setCurrentPanorama] = useState<PanoramaConfig>(PANORAMAS[0]);
  const [showPanoramaSelector, setShowPanoramaSelector] = useState(false);
  
  const isZh = language === 'zh-CN';
  
  const currentModel = MODELS_3D[currentIndex];
  
  // 获取所有官方模型
  const allModels = getAllModels();
  
  // 按分类筛选
  const filteredModels = selectedCategory 
    ? allModels.filter(m => m.category === selectedCategory)
    : allModels;
  
  // 自动轮播
  useEffect(() => {
    if (!autoPlay) return;
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % MODELS_3D.length);
        setIsTransitioning(false);
      }, 500);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoPlay]);
  
  const switchToModel = useCallback((index: number) => {
    if (index === currentIndex || isTransitioning) return;
    setIsTransitioning(true);
    setAutoPlay(false);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
  }, [currentIndex, isTransitioning]);
  
  const prevModel = useCallback(() => {
    const newIndex = currentIndex === 0 ? MODELS_3D.length - 1 : currentIndex - 1;
    switchToModel(newIndex);
  }, [currentIndex, switchToModel]);
  
  const nextModel = useCallback(() => {
    const newIndex = (currentIndex + 1) % MODELS_3D.length;
    switchToModel(newIndex);
  }, [currentIndex, switchToModel]);

  // 用户与3D交互时停止轮播
  const handle3DInteraction = useCallback(() => {
    setAutoPlay(false);
  }, []);

  // 显示3D车间并滚动到该区域
  useEffect(() => {
    if (showWorkshop3D && workshopRef.current) {
      setShowWorkshop(true);
      setTimeout(() => {
        workshopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showWorkshop3D]);

  return (
    <div className="home-page-fullscreen">
      {/* 全屏3D展示区域 */}
      <div className="fullscreen-3d-container">
        <div className={`fullscreen-3d-viewer ${isTransitioning ? 'transitioning' : ''}`}>
          <SparkViewer 
            key={currentModel.id}
            splatUrl={currentModel.splatUrl}
            autoRotate={true}
            enableControls={true}
            showStats={true}
            products={currentModel.products || []}
            onInteraction={handle3DInteraction}
          />
        </div>
        
        {/* 顶部信息栏 - 透明不遮挡 */}
        <div className="top-info-bar">
          {/* 品牌信息 - 已在主导航栏显示，此处留空或用于其他功能 */}
          <div style={{ width: '200px' }}></div>
          
          {/* 顶部模型切换器 */}
          <div className="top-model-switcher">
            <button className="top-switch-btn" onClick={prevModel}>‹</button>
            <div className="top-model-dots">
              {MODELS_3D.map((model, index) => (
                <button
                  key={model.id}
                  className={`top-model-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => switchToModel(index)}
                  style={{ '--dot-color': model.color } as React.CSSProperties}
                  title={model.name}
                />
              ))}
            </div>
            <button className="top-switch-btn" onClick={nextModel}>›</button>
          </div>
          
          {/* 自动播放控制 */}
          <button 
            className={`top-autoplay-btn ${autoPlay ? 'playing' : ''}`}
            onClick={() => setAutoPlay(!autoPlay)}
          >
            {autoPlay ? '⏸️' : '▶️'}
          </button>
        </div>
        
        {/* 左下角3D提示 - 交互时隐藏 */}
        <div className={`bottom-left-hint ${isInteracting ? 'hidden' : ''}`}
             onMouseEnter={() => setIsInteracting(true)}
             onMouseLeave={() => setIsInteracting(false)}>
          <span className="hint-badge-glass">
            <span className="hint-dot" />
            {t.viewer.title3dgs}
          </span>
          <div className="hint-controls-glass">
            <span>🖱️ {t.viewer.hintDragRotate}</span>
            <span>🔍 {t.viewer.hintScrollZoom}</span>
          </div>
        </div>
        
        {/* 右下角当前模型信息 - 交互时隐藏 */}
        <div className={`bottom-right-info ${isInteracting ? 'hidden' : ''} ${isTransitioning ? 'transitioning' : ''}`}
          style={{ '--accent-color': currentModel.color } as React.CSSProperties}
        >
          <span className="model-category-glass" style={{ background: currentModel.color }}>
            {currentModel.category}
          </span>
          <h2 className="model-name-glass">{currentModel.name}</h2>
          <p className="model-desc-glass">{currentModel.desc}</p>
          <div className="tech-tags-glass">
            <span className="tech-tag-glass">3DGS</span>
            <span className="tech-tag-glass">{isZh ? '神经渲染' : 'Neural Render'}</span>
            {currentModel.products && currentModel.products.length > 0 && (
              <span className="tech-tag-glass products-tag">
                🏷️ {currentModel.products.length === 1 ? t.viewer.productsCountSingle : formatMessage(t.viewer.productsCount, { count: currentModel.products.length })}
              </span>
            )}
          </div>
        </div>
        
        {/* 左侧快捷操作栏 - 垂直布局，交互时隐藏 */}
        <div className={`bottom-action-bar ${isInteracting ? 'hidden' : ''}`}>
          {/* 主要功能组 */}
          <div className="action-bar-group">
            <button 
              className="action-btn-primary"
              onClick={() => onNavigate?.('upload')}
            >
              <span>🚀</span> {t.viewer.startModeling}
            </button>
            <button 
              className="action-btn-secondary"
              onClick={() => onNavigate?.('official-editor')}
            >
              <span>🔧</span> {t.viewer.openEditor}
            </button>
            <button 
              className="action-btn-secondary"
              onClick={() => onNavigate?.('gallery')}
            >
              <span>🖼️</span> {t.viewer.browseGallery}
            </button>
          </div>
          
          <div className="action-bar-divider" />
          
          {/* 次要功能组 */}
          <div className="action-bar-group">
            <button 
              className="action-btn-tertiary showcase-btn"
              onClick={() => onNavigate?.('showcase')}
            >
              <span>🎨</span> {isZh ? '官方示例' : 'Showcase'}
            </button>
            <button 
              className="action-btn-tertiary book-btn"
              onClick={() => onNavigate?.('book')}
              style={{ background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.25) 0%, rgba(245, 87, 108, 0.25) 100%)', borderColor: 'rgba(240, 147, 251, 0.3)' }}
            >
              <span>📚</span> {isZh ? '3D翻页书' : '3D Book'}
            </button>
            <button 
              className="action-btn-tertiary book-gallery-btn"
              onClick={() => onNavigate?.('book-gallery')}
              style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%)', borderColor: 'rgba(102, 126, 234, 0.3)' }}
            >
              <span>📖</span> {isZh ? '书籍画廊' : 'Book Gallery'}
            </button>
          </div>
        </div>
      </div>

      {/* 官方模型作品集区域 */}
      <div className="official-models-section">
        <div className="section-header">
          <h2 className="section-title">
            {isZh ? '✨ 官方模型作品集' : '✨ Official Model Gallery'}
          </h2>
          <p className="section-subtitle">
            {isZh 
              ? `共 ${allModels.length} 个精选 3DGS 模型，支持实时交互预览` 
              : `${allModels.length} curated 3DGS models with real-time interactive preview`}
          </p>
        </div>

        {/* 分类筛选器 */}
        <div className="category-filters">
          <button 
            className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            {isZh ? '全部' : 'All'}
            <span className="count">{allModels.length}</span>
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button 
              key={key}
              className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              <span className="cat-icon">{cat.icon}</span>
              {isZh ? cat.nameZh : cat.name}
              <span className="count">
                {allModels.filter(m => m.category === key).length}
              </span>
            </button>
          ))}
        </div>

        {/* 模型网格 */}
        <div className="models-grid">
          {filteredModels.map((model) => (
            <Model3DCard
              key={model.id}
              modelUrl={model.url}
              thumbnail={model.thumbnail}
              title={model.name}
              titleZh={model.nameZh}
              autoRotate={true}
              isActive={selectedModel === model.id}
              onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
              size="medium"
            />
          ))}
        </div>

        {/* 模型详情弹窗 */}
        {selectedModel && (
          <div className="model-detail-modal" onClick={() => setSelectedModel(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedModel(null)}>×</button>
              <div className="modal-3d-viewer">
                <SparkViewer
                  key={selectedModel}
                  splatUrl={OFFICIAL_MODELS[selectedModel as keyof typeof OFFICIAL_MODELS]?.url || ''}
                  autoRotate={true}
                  enableControls={true}
                  showStats={true}
                />
              </div>
              <div className="modal-info">
                <h3>{isZh ? OFFICIAL_MODELS[selectedModel as keyof typeof OFFICIAL_MODELS]?.nameZh : OFFICIAL_MODELS[selectedModel as keyof typeof OFFICIAL_MODELS]?.name}</h3>
                <p>{isZh ? '点击拖拽旋转 · 滚轮缩放' : 'Drag to rotate · Scroll to zoom'}</p>
                <button 
                  className="modal-action-btn"
                  onClick={() => onNavigate?.('upload')}
                >
                  {isZh ? '🚀 开始创作' : '🚀 Start Creating'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3D车间嵌入模块 */}
      <div ref={workshopRef} className="workshop-embedded-section" style={{ display: showWorkshop ? 'block' : 'none' }}>
        {/* 嵌入式3D车间 - 固定高度 */}
        <div className="workshop-embedded-container">
          <Workshop3D 
            onNavigate={onNavigate as any} 
            embedded={true} 
            panoramaUrl={currentPanorama.url}
            onClose={() => {
              setShowWorkshop(false);
              onWorkshopClose?.();
            }}
          />
          
          {/* 全景图切换按钮 */}
          <button 
            className="panorama-switch-btn"
            onClick={() => setShowPanoramaSelector(!showPanoramaSelector)}
            title="切换全景背景"
          >
            🌐 全景图
          </button>
          
          {/* 全景图选择器 */}
          {showPanoramaSelector && (
            <div className="panorama-selector">
              <div className="panorama-selector-header">
                <h4>🖼️ 选择全景背景</h4>
                <button 
                  className="close-selector"
                  onClick={() => setShowPanoramaSelector(false)}
                >
                  ✕
                </button>
              </div>
              <div className="panorama-list">
                {PANORAMAS.map((pano) => (
                  <button
                    key={pano.id}
                    className={`panorama-item ${currentPanorama.id === pano.id ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPanorama(pano);
                      setShowPanoramaSelector(false);
                    }}
                  >
                    <div className="panorama-preview">
                      <span className="panorama-icon">🏭</span>
                    </div>
                    <div className="panorama-info">
                      <div className="panorama-name">{isZh ? pano.nameZh : pano.name}</div>
                      <div className="panorama-desc">{pano.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
