// 首页组件 - 全屏3D展示
import { useState, useEffect, useCallback } from 'react';
import { SparkViewer } from '../../components/3d';
import { useTranslation } from '../../i18n';
import './HomePage.css';

// 模型数据 - 使用官方真实可用的3D模型
const MODELS_3D = [
  { 
    id: 'butterfly', 
    name: '🦋 蓝色大闪蝶', 
    category: '自然生物',
    desc: '3D Gaussian Splatting 真实重建，完美还原蝴蝶翅膀纹理和鳞粉效果',
    color: '#667eea',
    splatUrl: 'https://sparkjs.dev/assets/splats/butterfly.spz'
  },
  { 
    id: 'cat', 
    name: '🐱 可爱猫咪', 
    category: '可爱动物',
    desc: '真实猫咪3DGS重建，毛发细节栩栩如生，眼神灵动可爱',
    color: '#f97316',
    splatUrl: 'https://sparkjs.dev/assets/splats/cat.spz'
  },
  { 
    id: 'burger', 
    name: '🍔 精致汉堡', 
    category: '美食料理',
    desc: '精致汉堡3DGS数字化，完美呈现食材纹理和光泽质感',
    color: '#eab308',
    splatUrl: 'https://sparkjs.dev/assets/splats/food/burger-from-amboy.spz'
  },
  { 
    id: 'robot', 
    name: '🤖 机器人头', 
    category: '科技产品',
    desc: '未来科技机器人3DGS重建，精细到每个金属零件和电路纹理',
    color: '#06b6d4',
    splatUrl: 'https://sparkjs.dev/assets/splats/robot-head.spz'
  },
  { 
    id: 'penguin', 
    name: '🐧 南极企鹅', 
    category: '极地动物',
    desc: '南极企鹅3DGS数字化，完美还原羽毛质感和呆萌姿态',
    color: '#1e293b',
    splatUrl: 'https://sparkjs.dev/assets/splats/penguin.spz'
  },
  { 
    id: 'dessert', 
    name: '🍰 精致甜点', 
    category: '甜品糕点',
    desc: '精致甜点3DGS重建，奶油层次和糖霜细节纤毫毕现',
    color: '#ec4899',
    splatUrl: 'https://sparkjs.dev/assets/splats/dessert.spz'
  },
];

export function HomePage() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  
  const currentModel = MODELS_3D[currentIndex];
  
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
        
        {/* 左下角3D提示 */}
        <div className="bottom-left-hint">
          <span className="hint-badge-glass">
            <span className="hint-dot" />
            3D Gaussian Splatting
          </span>
          <div className="hint-controls-glass">
            <span>🖱️ 拖拽旋转</span>
            <span>🔍 滚轮缩放</span>
          </div>
        </div>
        
        {/* 右下角当前模型信息 */}
        <div className={`bottom-right-info ${isTransitioning ? 'transitioning' : ''}`}
          style={{ '--accent-color': currentModel.color } as React.CSSProperties}
        >
          <span className="model-category-glass" style={{ background: currentModel.color }}>
            {currentModel.category}
          </span>
          <h2 className="model-name-glass">{currentModel.name}</h2>
          <p className="model-desc-glass">{currentModel.desc}</p>
          <div className="tech-tags-glass">
            <span className="tech-tag-glass">3DGS</span>
            <span className="tech-tag-glass">Neural Radiance</span>
          </div>
        </div>
        
        {/* 底部快捷操作栏 */}
        <div className="bottom-action-bar">
          <button className="action-btn-primary">
            <span>🚀</span> 开始建模
          </button>
          <button className="action-btn-secondary">
            <span>📖</span> 了解更多
          </button>
          <button className="action-btn-secondary">
            <span>🖼️</span> 浏览画廊
          </button>
        </div>
      </div>
    </div>
  );
}
