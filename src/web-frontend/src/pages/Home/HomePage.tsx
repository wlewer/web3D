// 首页组件 - 全屏3D展示 + 官方模型作品集 + 3D车间嵌入
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GaussianCard } from '../../components/GaussianCard';
import { UniversalGaussianCardV3 } from '../../components/3d/UniversalGaussianCardV3';
import type { Base3DViewerRef } from '../../components/3d/Base3DViewer';
import type { CameraConfig } from '../../components/3d/engines/CameraManager';
import { Model3DCard } from '../../components/Model3DCard';
import { Workshop3D } from '../Workshop3D';
import { useTranslation } from '../../i18n';
import { PANORAMAS } from '../../data/panoramas';
import type { PanoramaConfig } from '../../data/panoramas';
import { getHomepageModels, getPublicModels, deriveCategories, type HomepageModel, type ProductTag, type GalleryModel, type GalleryCategory } from '../../services/modelService';
import { mergeRenderConfig, toViewerProps } from '../../types/render-config';
import type { RenderConfig } from '../../types/render-config';
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

// 产品介绍标签接口（使用 modelService 中的 ProductTag 类型导出保持一致）


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
  
  // ★ 追踪首页 3D 模型加载状态（避免加载中切换）
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const isHeroLoadingRef = useRef(isHeroLoading);
  isHeroLoadingRef.current = isHeroLoading;
  
  const isZh = language === 'zh-CN';
  
  // ★ 首页Hero模型列表：完全从API获取，无兜底数据
  const [homepageModels, setHomepageModels] = useState<HomepageModel[]>([]);
  const [heroModelsLoading, setHeroModelsLoading] = useState(true);
  
  useEffect(() => {
    getHomepageModels().then(models => {
      if (models.length > 0) {
        setHomepageModels(models);
      }
    }).finally(() => {
      setHeroModelsLoading(false);
    });
  }, []);

  // ★ 全局渲染默认值
  const [globalRenderDefaults, setGlobalRenderDefaults] = useState<RenderConfig | null>(null);
  useEffect(() => {
    fetch('/api/v1/settings/render-defaults')
      .then(r => r.json())
      .then(data => {
        if (data && data.value && Object.keys(data.value).length > 0) {
          setGlobalRenderDefaults(data.value as RenderConfig);
        }
      })
      .catch(() => {/* 静默失败，使用组件默认值 */});
  }, []);
  
  const currentModel = homepageModels.length > 0
    ? homepageModels[currentIndex % homepageModels.length]
    : null;
  
  // ★ 画廊网格模型：从API获取 + 兜底
  const [galleryModels, setGalleryModels] = useState<GalleryModel[]>([]);
  const [galleryCategories, setGalleryCategories] = useState<GalleryCategory[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  
  useEffect(() => {
    getPublicModels().then(models => {
      if (models.length > 0) {
        setGalleryModels(models);
        setGalleryCategories(deriveCategories(models));
      }
    }).finally(() => {
      setGalleryLoading(false);
    });
  }, []);
  
  // 按分类筛选
  const filteredModels = selectedCategory 
    ? galleryModels.filter(m => m.category === selectedCategory)
    : galleryModels;
  
  // 分页：每页6个，keep-alive 翻回不重建
  const CARDS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(0);
  const [, setAlivePages] = useState<Set<number>>(() => new Set([0]));
  const totalPages = Math.ceil(filteredModels.length / CARDS_PER_PAGE);
  const currentPageModels = filteredModels.slice(currentPage * CARDS_PER_PAGE, (currentPage + 1) * CARDS_PER_PAGE);

  const goToPage = useCallback((page: number) => {
    if (page < 0 || page >= totalPages || page === currentPage) return;
    setCurrentPage(page);
    setAlivePages(() => {
      const next = new Set<number>();
      next.add(page);
      if (page > 0) next.add(page - 1);
      if (page + 1 < totalPages) next.add(page + 1);
      return next;
    });
  }, [totalPages, currentPage]);
  
  // ★ 自动轮播：模型加载中不切换，加载完成后 8 秒切换（使用ref避免interval重建）
  useEffect(() => {
    if (!autoPlay) return;
    
    const interval = setInterval(() => {
      if (isHeroLoadingRef.current || homepageModels.length === 0) {
        console.log('⏸️ 轮播暂停：模型正在加载中或暂无模型');
        return;
      }
      
      console.log('🔄 自动轮播：切换到下一个模型');
      setIsTransitioning(true);
      setIsHeroLoading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % homepageModels.length);
        setIsTransitioning(false);
      }, 500);
    }, 8000);
      
    return () => clearInterval(interval);
  }, [autoPlay, homepageModels.length]);
  
  // ★ 计算当前模型生效的渲染配置
  const effectiveRenderConfig = useMemo(() =>
    mergeRenderConfig(globalRenderDefaults, currentModel?.renderConfig || null),
    [globalRenderDefaults, currentModel?.renderConfig]
  );
  const viewerConfigProps = useMemo(() => toViewerProps(effectiveRenderConfig), [effectiveRenderConfig]);
  
  const switchToModel = useCallback((index: number) => {
    if (index === currentIndex || isTransitioning) return;
    setIsTransitioning(true);
    setIsHeroLoading(true);  // ★ 关键修复：切换模型时重置加载状态
    setAutoPlay(false);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
  }, [currentIndex, isTransitioning]);
  
  const prevModel = useCallback(() => {
    const newIndex = currentIndex === 0 ? homepageModels.length - 1 : currentIndex - 1;
    setIsHeroLoading(true);  // ★ 关键修复：切换模型时重置加载状态
    switchToModel(newIndex);
  }, [currentIndex, switchToModel]);
  
  const nextModel = useCallback(() => {
    const newIndex = (currentIndex + 1) % homepageModels.length;
    setIsHeroLoading(true);  // ★ 关键修复：切换模型时重置加载状态
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
  
  // ★ 相机配置管理
  const cardRef = useRef<Base3DViewerRef>(null);
  const [cameraConfigs, setCameraConfigs] = useState<Record<string, CameraConfig>>({});
  const [configsLoaded, setConfigsLoaded] = useState(false);  // ★ 新增：配置加载状态
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // 从localStorage加载所有配置
  useEffect(() => {
    const saved = localStorage.getItem('homepage-camera-configs');
    
    if (saved) {
      try {
        const configs = JSON.parse(saved);
        setCameraConfigs(configs);
      } catch (e) {
        console.error(' 加载相机配置失败:', e);
      } finally {
        setConfigsLoaded(true);  // ★ 标记配置已加载
      }
    } else {
      setConfigsLoaded(true);  // ★ 没有配置也标记为已加载
    }
  }, []);
  
  // ★ 延迟应用已保存的相机配置（configsLoaded后模型可能未加载，通过requestAnimationFrame等待）
  useEffect(() => {
    if (!configsLoaded || !cardRef.current || !currentModel) return;
    const config = cameraConfigs[currentModel.id];
    if (config) {
      requestAnimationFrame(() => {
        cardRef.current?.loadCameraConfig(config);
      });
    }
  }, [configsLoaded, currentModel?.id]);
  
  // 显示Toast提示
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 2500);
  }, []);
  
  // 保存当前相机配置
  const handleSaveCamera = useCallback(() => {
    if (!cardRef.current || !currentModel) {
      showToast('❌ 组件未初始化', 'error');
      return;
    }
    
    try {
      // 等待一帧确保控制器状态稳定
      requestAnimationFrame(() => {
        const config = cardRef.current!.saveCameraConfig();
        const modelId = currentModel.id;
        
        // 使用函数式更新确保获取最新状态
        setCameraConfigs(prevConfigs => {
          const newConfigs = {
            ...prevConfigs,
            [modelId]: config
          };
          
          localStorage.setItem('homepage-camera-configs', JSON.stringify(newConfigs));
          showToast(' 镜头已保存！', 'success');
          
          return newConfigs;
        });
      });
    } catch (error) {
      console.error(' 保存相机配置失败:', error);
      showToast('❌ 保存失败', 'error');
    }
  }, [currentModel?.id, showToast]);
  
  // 重置相机到默认位置
  const handleResetCamera = useCallback(() => {
    if (!cardRef.current || !currentModel) {
      showToast('❌ 组件未初始化', 'error');
      return;
    }
    
    try {
      cardRef.current.resetCamera();
      
      const modelId = currentModel.id;
      const newConfigs = { ...cameraConfigs };
      delete newConfigs[modelId];
      
      setCameraConfigs(newConfigs);
      localStorage.setItem('homepage-camera-configs', JSON.stringify(newConfigs));
      
      console.log('🔄 相机配置已重置:', modelId);
      showToast('🔄 已重置为默认视角', 'info');
    } catch (error) {
      console.error('❌ 重置相机失败:', error);
      showToast('❌ 重置失败', 'error');
    }
  }, [currentModel?.id, cameraConfigs, showToast]);
  
  // 全景图状态
  const [currentPanorama, setCurrentPanorama] = useState<PanoramaConfig>(PANORAMAS[0]);
  const [showPanoramaSelector, setShowPanoramaSelector] = useState(false);

  return (
    <div className="home-page-fullscreen">
      {/* 全屏3D展示区域 */}
      <div className="fullscreen-3d-container">
        {/* ★ 无模型时的空状态提示 */}
        {!currentModel && !heroModelsLoading && (
          <div className="homepage-empty-state">
            <div className="empty-state-content">
              <div className="empty-state-icon">📋</div>
              <h3>{isZh ? '暂无首页展示模型' : 'No Homepage Models'}</h3>
              <p>{isZh 
                ? '请前往后台「模板管理 > 官网模板」配置首页展示模型'
                : 'Go to Admin > Template Management to configure homepage models'
              }</p>
              <a
                href="/admin/templates/official"
                className="empty-state-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                {isZh ? '前往管理后台 →' : 'Go to Admin →'}
              </a>
            </div>
          </div>
        )}
        {currentModel && (
        <div className={`fullscreen-3d-viewer ${isTransitioning ? 'transitioning' : ''}`}>
          <UniversalGaussianCardV3
            ref={cardRef}
            modelUrl={currentModel.modelUrl || currentModel.splatUrl!}
            layout="featured"
            autoRotate={true}
            showParticles={true}
            showPlatform={true}
            autoCenter={true}
            margin={currentModel.modelUrl ? 3.0 : 2.8}
            products={currentModel.products || []}
            customCameraConfig={cameraConfigs[currentModel.id] || null}
            {...viewerConfigProps}
            onInteraction={handle3DInteraction}
            onLoadComplete={() => {
              setIsHeroLoading(false);
            }}
          />
        </div>
        )}
        
        {/* 顶部信息栏 + 交互UI - 仅在加载完成后且存在模型时显示 */}
        {!heroModelsLoading && currentModel && (
        <>
        {/* 顶部信息栏 - 透明不遮挡 */}
        <div className="top-info-bar">
          {/* 品牌信息 - 已在主导航栏显示，此处留空或用于其他功能 */}
          <div style={{ width: '200px' }}></div>
          
          {/* 顶部模型切换器 */}
          <div className="top-model-switcher">
            <button className="top-switch-btn" onClick={prevModel}>‹</button>
            <div className="top-model-dots">
              {homepageModels.map((model, index) => (
                <button
                  key={model.id}
                  className={`top-model-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => switchToModel(index)}
                  style={{ '--dot-color': model.colorHex } as React.CSSProperties}
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
          style={{ '--accent-color': (currentModel.colorHex || '#667eea') } as React.CSSProperties}
        >
          <span className="model-category-glass" style={{ background: currentModel.colorHex || '#667eea' }}>
            {currentModel.category}
          </span>
          
          {/* 真实生成模型的特殊标识（通过metadata_json扩展） */}
          {false && (
            <div className="verified-badge">
              <span className="verified-icon">✅</span>
              <span className="verified-text">{isZh ? '真实生成' : 'Real Generated'}</span>
            </div>
          )}
          
          <h2 className="model-name-glass">{currentModel.name}</h2>
          <p className="model-desc-glass">{currentModel.description}</p>
          <div className="tech-tags-glass">
            {currentModel.format === 'glb' ? (
              <>
                <span className="tech-tag-glass">GLB</span>
                <span className="tech-tag-glass">{isZh ? '混元3D' : 'Hunyuan3D'}</span>
                {false && (
                  <span className="tech-tag-glass pro-tag">v1.0</span>
                )}
              </>
            ) : (
              <>
                <span className="tech-tag-glass">3DGS</span>
                <span className="tech-tag-glass">{isZh ? '神经渲染' : 'Neural Render'}</span>
              </>
            )}
            {currentModel.products && currentModel.products.length > 0 && (
              <span className="tech-tag-glass products-tag">
                🏷️ {currentModel.products.length === 1 ? t.viewer.productsCountSingle : formatMessage(t.viewer.productsCount, { count: currentModel.products.length })}
              </span>
            )}
          </div>
          
          {/* ★ 相机配置控制按钮 */}
          <div className="camera-controls">
            <button 
              className="camera-btn save-btn"
              onClick={handleSaveCamera}
              title={isZh ? '保存当前镜头角度' : 'Save current camera angle'}
            >
              💾 {isZh ? '保存镜头' : 'Save View'}
            </button>
            {cameraConfigs[currentModel.id] && (
              <button 
                className="camera-btn reset-btn"
                onClick={handleResetCamera}
                title={isZh ? '重置为默认视角' : 'Reset to default view'}
              >
                🔄 {isZh ? '重置镜头' : 'Reset View'}
              </button>
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
        
        </>
        )}
        
        {/* ★ 加载中状态 - 仅在加载时显示 */}
        {heroModelsLoading && (
          <div className="homepage-empty-state">
            <div className="empty-state-content">
              <div className="loading-spinner"></div>
              <h3>{isZh ? '正在加载模型...' : 'Loading models...'}</h3>
            </div>
          </div>
        )}
      </div>

      {/* 官方模型作品集区域 */}
      <div className="official-models-section">
        <div className="section-header">
          <h2 className="section-title">
            {isZh ? '✨ 官方模型作品集' : '✨ Official Model Gallery'}
          </h2>
          <p className="section-subtitle">
            {isZh 
              ? `共 ${galleryModels.length} 个精选 3D 模型，支持实时交互预览` 
              : `${galleryModels.length} curated 3D models with real-time interactive preview`}
          </p>
        </div>

        {/* 分类筛选器 */}
        <div className="category-filters">
          <button 
            className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            {isZh ? '全部' : 'All'}
            <span className="count">{galleryModels.length}</span>
          </button>
          {galleryCategories.map((cat) => (
            <button 
              key={cat.key}
              className={`category-btn ${selectedCategory === cat.key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.key)}
            >
              <span className="cat-icon">{cat.icon}</span>
              {isZh ? cat.nameZh : cat.name}
              <span className="count">
                {galleryModels.filter(m => m.category === cat.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* 模型网格 - 分页显示，每页6个 */}
        <div className="models-grid">
          {currentPageModels.map((model) => (
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

        {/* 分页翻页导航 */}
        {totalPages > 1 && (
          <div className="model-grid-pagination">
            <button
              className={`pagination-arrow ${currentPage === 0 ? 'disabled' : ''}`}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              ‹
            </button>
            <div className="pagination-dots">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  className={`pagination-dot ${idx === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(idx)}
                />
              ))}
            </div>
            <button
              className={`pagination-arrow ${currentPage >= totalPages - 1 ? 'disabled' : ''}`}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              ›
            </button>
          </div>
        )}

        {/* 模型详情弹窗 */}
        {selectedModel && (
          <div className="model-detail-modal" onClick={() => setSelectedModel(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedModel(null)}>×</button>
              <div className="modal-3d-viewer">
                <GaussianCard
                  modelUrl={galleryModels.find(m => m.id === selectedModel)?.url || ''}
                  mode="preview"
                  autoRotate={true}
                  showStats={true}
                />
              </div>
              <div className="modal-info">
                <h3>{isZh
                  ? (galleryModels.find(m => m.id === selectedModel)?.nameZh || '')
                  : (galleryModels.find(m => m.id === selectedModel)?.name || '')}</h3>
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
      
      {/* Toast提示 */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
