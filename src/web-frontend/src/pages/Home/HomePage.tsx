// 首页组件 - 全屏3D展示
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UniversalGaussianCardV3 } from '../../components/3d/UniversalGaussianCardV3';
import type { Base3DViewerRef } from '../../components/3d/Base3DViewer';
import type { CameraConfig } from '../../components/3d/engines/CameraManager';
import { useTranslation } from '../../i18n';
import { getHomepageModels, type HomepageModel } from '../../services/modelService';
import { mergeRenderConfig, toViewerProps } from '../../types/render-config';
import type { RenderConfig } from '../../types/render-config';
import './HomePage.css';

// 页面导航类型
type PageType = 'home' | 'gallery' | 'auth' | 'upload' | 'official-editor' | 'book' | 'book-gallery' | 'generation';

// 首页 Props
interface HomePageProps {
  onNavigate?: (page: PageType) => void;
}



export function HomePage({ onNavigate }: HomePageProps) {
  const { t, language } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  
  // ★ 轮播间隔（秒），从后端配置获取
  const carouselIntervalRef = useRef(15);  // 默认15秒
  
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
        if (data && data.value) {
          // 支持新旧两种存储格式：
          // 旧: value = { camera:..., decorations:... }
          // 新: value = { renderConfig: {...}, products: [...] }
          const savedValue = data.value;
          if (savedValue.renderConfig) {
            setGlobalRenderDefaults(savedValue.renderConfig as RenderConfig);
          } else if (Object.keys(savedValue).length > 0) {
            setGlobalRenderDefaults(savedValue as RenderConfig);
          }
        }
      })
      .catch(() => {/* 静默失败，使用组件默认值 */});
  }, []);
  
  const currentModel = homepageModels.length > 0
    ? homepageModels[currentIndex % homepageModels.length]
    : null;
  
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
    }, carouselIntervalRef.current * 1000);
      
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

  // ★ 相机配置管理
  const cardRef = useRef<Base3DViewerRef>(null);
  const [cameraConfigs, setCameraConfigs] = useState<Record<string, CameraConfig>>({});
  const [configsLoaded, setConfigsLoaded] = useState(false);  // ★ 新增：配置加载状态
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // ★ 分离渲染配置中的相机配置，按优先级合并：
  //   用户保存的镜头 > 渲染配置中的精确镜头 > 自动居中(null)
  const { customCameraConfig: renderCameraConfig, ...restViewerProps } = viewerConfigProps;
  const savedCameraConfig = currentModel ? (cameraConfigs[currentModel.id] || null) : null;
  const effectiveCameraConfig = savedCameraConfig || renderCameraConfig || null;
  
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
        {currentModel && (currentModel.modelUrl || currentModel.splatUrl) && (
        <div className={`fullscreen-3d-viewer ${isTransitioning ? 'transitioning' : ''}`}>
          <UniversalGaussianCardV3
            ref={cardRef}
            modelUrl={currentModel.modelUrl || currentModel.splatUrl!}
            modelFormat={currentModel.format}
            layout="featured"
            autoRotate={true}
            showParticles={true}
            showPlatform={true}
            autoCenter={true}
            margin={currentModel.modelUrl ? 3.0 : 2.8}
            products={currentModel.products || []}
            customCameraConfig={effectiveCameraConfig}
            {...restViewerProps}
            onInteraction={handle3DInteraction}
            onLoadComplete={() => {
              setIsHeroLoading(false);
            }}
            onError={() => {
              // ★ 模型加载失败时也要重置 loading 状态，避免 UI 卡死
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
        
        {/* 左下角交互提示 + 格式/产品标识 */}
        <div className={`bottom-left-hint ${isInteracting ? 'hidden' : ''}`}
             onMouseEnter={() => setIsInteracting(true)}
             onMouseLeave={() => setIsInteracting(false)}>
          <div className="hint-controls-glass">
            <span>🖱️ {t.viewer.hintDragRotate}</span>
            <span>🔍 {t.viewer.hintScrollZoom}</span>
          </div>
          {currentModel && (
            <div className="tech-tags-glass">
              <span className="tech-tag-glass format-badge">
                {currentModel.format ? `${currentModel.format.toUpperCase()} 格式 ✓` : ''}
              </span>
              {currentModel.products && currentModel.products.length > 0 && (
                <span className="tech-tag-glass products-tag">
                  🏷️ {currentModel.products.length === 1 ? t.viewer.productsCountSingle : `${currentModel.products.length} 个产品`}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* 右下角当前模型信息 - 交互时隐藏 */}
        <div className={`bottom-right-info ${isInteracting ? 'hidden' : ''} ${isTransitioning ? 'transitioning' : ''}`}
          style={{ '--accent-color': (currentModel.colorHex || '#667eea') } as React.CSSProperties}
        >
          
          <h2 className="model-name-glass">{currentModel.name}</h2>
          <p className="model-desc-glass">{currentModel.description}</p>
          
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
      
      {/* Toast提示 */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
