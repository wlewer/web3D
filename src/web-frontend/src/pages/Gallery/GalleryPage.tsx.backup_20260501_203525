// 画廊页面组件 - 全屏3D卡片展示 + 左侧导航
import { useState, useMemo, useRef, useCallback } from 'react';
import { Input, Spin } from 'antd';
import { SearchOutlined, EyeOutlined, LikeOutlined, AppstoreOutlined, PlayCircleOutlined, LeftOutlined, RightOutlined, HomeOutlined, FireOutlined, SettingOutlined, BoxPlotOutlined, CameraOutlined, RocketOutlined } from '@ant-design/icons';
import { SparkViewer } from '../../components/3d';
import { useTranslation } from '../../i18n';
import { GALLERY_ITEMS, CATEGORIES, BOX_CATEGORIES } from './gallery.data';
import type { GalleryItem, GalleryFilter, BoxCategory } from './gallery.types';
import './GalleryPage.css';

const { Search } = Input;

// 每页显示数量 - 2行4列
const CARDS_PER_PAGE = 8;

export function GalleryPage() {
  const { t, language } = useTranslation();
  const isZh = language === 'zh-CN';
  const [filter, setFilter] = useState<GalleryFilter>({
    category: undefined,
    boxType: undefined,
    search: '',
    sortBy: 'recent',
  });
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // 统计数据
  const stats = useMemo(() => {
    const items = GALLERY_ITEMS;
    return {
      total: items.length,
      boxes: items.filter(i => i.boxType).length,
      models: items.filter(i => i.category === 'model' && !i.boxType).length,
      scenes: items.filter(i => i.category === 'scene').length,
      animations: items.filter(i => i.category === 'animation').length,
    };
  }, []);

  // 分类图标映射
  const categoryIcons: Record<string, React.ReactNode> = {
    all: <AppstoreOutlined />,
    box: <BoxPlotOutlined />,
    model: <CameraOutlined />,
    scene: <HomeOutlined />,
    animation: <RocketOutlined />,
  };

  // 分类标签
  const categoryLabels: Record<string, string> = {
    all: t.gallery.categoryAll,
    box: t.gallery.categoryBox,
    model: t.gallery.categoryModel,
    scene: t.gallery.categoryScene,
    animation: t.gallery.categoryAnimation,
  };

  // 排序选项
  const sortLabels = {
    recent: t.gallery.sortRecent,
    popular: t.gallery.sortPopular,
    likes: t.gallery.sortLikes,
  };

  // 过滤和排序
  const filteredItems = useMemo(() => {
    let items = [...GALLERY_ITEMS];

    // 主分类过滤
    if (filter.category === 'box') {
      items = items.filter((item) => item.boxType !== undefined);
    } else if (filter.category && filter.category !== 'all') {
      items = items.filter((item) => item.category === filter.category && !item.boxType);
    }

    // 盒子子分类过滤
    if (filter.boxType && filter.boxType !== 'all') {
      items = items.filter((item) => item.boxType === filter.boxType);
    }

    // 搜索过滤
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          (item.industry && item.industry.toLowerCase().includes(searchLower)) ||
          (item.material && item.material.toLowerCase().includes(searchLower))
      );
    }

    // 排序
    switch (filter.sortBy) {
      case 'popular':
        items.sort((a, b) => b.views - a.views);
        break;
      case 'likes':
        items.sort((a, b) => b.likes - a.likes);
        break;
      case 'recent':
      default:
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return items;
  }, [filter]);

  // 分页计算
  const totalSlides = Math.ceil(filteredItems.length / CARDS_PER_PAGE);
  const currentPageItems = filteredItems.slice(currentSlide * CARDS_PER_PAGE, (currentSlide + 1) * CARDS_PER_PAGE);

  // 导航
  const goPrev = () => setCurrentSlide(p => Math.max(0, p - 1));
  const goNext = () => setCurrentSlide(p => Math.min(totalSlides - 1, p + 1));

  // 分类切换
  const handleCategoryChange = (category: string) => {
    setFilter({
      ...filter,
      category: category === 'all' ? undefined : (category as any),
      boxType: undefined,
    });
    setCurrentSlide(0);
  };

  // 搜索变化
  const handleSearchChange = (value: string) => {
    setFilter({ ...filter, search: value });
    setCurrentSlide(0);
  };

  // 预览模型
  const handlePreview = (item: GalleryItem) => {
    if (!item.modelUrl) {
      alert('该模型暂无可用预览');
      return;
    }
    setSelectedItem(item);
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // 获取分类颜色
  const getCategoryColor = (item: GalleryItem) => {
    if (item.boxType) {
      const colors: Record<string, string> = {
        cosmetics: 'linear-gradient(135deg, #ff6b9d 0%, #ffa8c5 100%)',
        wine: 'linear-gradient(135deg, #8b0000 0%, #dc143c 100%)',
        gift: 'linear-gradient(135deg, #ffd700 0%, #ffb347 100%)',
        food: 'linear-gradient(135deg, #90ee90 0%, #98fb98 100%)',
        festival: 'linear-gradient(135deg, #ff4500 0%, #ff6347 100%)',
        electronics: 'linear-gradient(135deg, #4169e1 0%, #6495ed 100%)',
        fashion: 'linear-gradient(135deg, #9370db 0%, #da70d6 100%)',
      };
      return colors[item.boxType] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    switch (item.category) {
      case 'model':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'scene':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'animation':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  // 获取分类标签
  const getCategoryLabel = (item: GalleryItem) => {
    if (item.boxType) {
      const boxLabels: Record<string, string> = {
        cosmetics: '💄 化妆品',
        wine: '🍷 酒盒',
        gift: '🎁 礼品',
        food: '🍱 食品',
        festival: '🎊 节日',
        electronics: '📱 电子',
        fashion: '👔 服饰',
      };
      return boxLabels[item.boxType] || '📦 盒子';
    }
    switch (item.category) {
      case 'model':
        return '🪆 3D模型';
      case 'scene':
        return '🏞️ 场景';
      case 'animation':
        return '🎬 动画';
      default:
        return '🎨 作品';
    }
  };

  // 判断是否热门
  const isHot = (item: GalleryItem) => item.views > 5000 || item.likes > 400;

  // 鼠标拖拽切换
  const dragState = useRef({ isDragging: false, startX: 0, startSlide: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    dragState.current = { isDragging: true, startX: e.clientX, startSlide: currentSlide };
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDragging) return;
    const deltaX = e.clientX - dragState.current.startX;
    const threshold = 100; // 拖拽阈值
    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0 && currentSlide < totalSlides - 1) {
        goNext();
      } else if (deltaX > 0 && currentSlide > 0) {
        goPrev();
      }
      dragState.current.isDragging = false;
    }
  };
  
  const handleMouseUp = () => {
    dragState.current.isDragging = false;
  };

  return (
    <div className="gallery-page" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* 左侧导航栏 */}
      <aside className="gallery-sidebar">
        <div className="gallery-logo">✨</div>
        <h1 className="gallery-sidebar-title">{isZh ? '画廊' : 'Gallery'}</h1>
        
        <nav className="gallery-nav">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`gallery-nav-btn ${(filter.category === cat.value || (cat.value === 'all' && !filter.category && !filter.boxType)) ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.value)}
              title={categoryLabels[cat.value] || cat.label}
            >
              <span className="gallery-nav-icon">
                {categoryIcons[cat.value] || <AppstoreOutlined />}
              </span>
              <span className="gallery-nav-label">{cat.label}</span>
              <span className="gallery-nav-count">
                {cat.value === 'all' ? stats.total :
                 cat.value === 'box' ? stats.boxes :
                 cat.value === 'model' ? stats.models :
                 cat.value === 'scene' ? stats.scenes : stats.animations}
              </span>
            </button>
          ))}
        </nav>

        <div className="gallery-nav-bottom">
          <button className="gallery-settings-btn" title={isZh ? '设置' : 'Settings'}>
            <SettingOutlined />
            <span className="gallery-nav-label">{isZh ? '设置' : 'Settings'}</span>
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="gallery-main">
        {/* 顶部搜索栏 - 精简版 */}
        <header className="gallery-top-bar">
          <div className="gallery-search-area">
            <div className="gallery-search-box">
              <Search
                placeholder={t.gallery.search}
                prefix={<SearchOutlined />}
                value={filter.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
              />
            </div>
            <select
              className="gallery-sort-select"
              value={filter.sortBy}
              onChange={(e) => {
                setFilter({ ...filter, sortBy: e.target.value as GalleryFilter['sortBy'] });
                setCurrentSlide(0);
              }}
            >
              <option value="recent">{sortLabels.recent}</option>
              <option value="popular">{sortLabels.popular}</option>
              <option value="likes">{sortLabels.likes}</option>
            </select>
          </div>
        </header>

        {/* 3D卡片区域 */}
        <section 
          className="gallery-carousel-area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{ cursor: dragState.current.isDragging ? 'grabbing' : 'grab' }}
        >
          {/* 左导航按钮 */}
          <button
            className={`gallery-nav-arrow gallery-nav-prev ${currentSlide === 0 ? 'disabled' : ''}`}
            onClick={goPrev}
            disabled={currentSlide === 0}
            title={isZh ? '上一页' : 'Previous Page'}
          >
            <LeftOutlined />
          </button>
          
          {currentPageItems.length > 0 ? (
            <div className="gallery-cards-viewport">
              <div className="gallery-cards-track">
                  {currentPageItems.map((item, index) => (
                    <article
                      key={item.id}
                      className="gallery-3d-card"
                      onClick={() => handlePreview(item)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="gallery-card-image-container">
                        {item.gifPreview ? (
                          <>
                            <img
                              src={item.gifPreview}
                              alt={item.title}
                              className="gallery-card-gif"
                              autoPlay loop muted playsInline
                            />
                            <span className="gallery-gif-badge">
                              <PlayCircleOutlined /> GIF
                            </span>
                          </>
                        ) : (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="gallery-card-image"
                            loading="lazy"
                          />
                        )}
                        
                        {/* 分类标签 */}
                        <span
                          className="gallery-card-category"
                          style={{ background: getCategoryColor(item) }}
                        >
                          {getCategoryLabel(item)}
                        </span>
                        
                        {/* 热门标记 */}
                        {isHot(item) && (
                          <span className="gallery-card-hot">
                            <FireOutlined />
                          </span>
                        )}
                        
                        {/* 悬停预览 */}
                        <div className="gallery-card-overlay">
                          <span className="gallery-card-preview-btn">
                            {t.gallery.preview}
                          </span>
                        </div>
                      </div>

                      <div className="gallery-card-info">
                        <div>
                          <h3 className="gallery-card-title">{item.title}</h3>
                          <div className="gallery-card-tags">
                            {item.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="gallery-card-tag">{tag}</span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="gallery-card-footer">
                          <div className="gallery-card-stats-full">
                            {item.boxType && item.price && (
                              <span className="gallery-card-price-lg">{item.price}</span>
                            )}
                            <span className="gallery-card-stat">
                              <EyeOutlined /> {formatNumber(item.views)}
                            </span>
                            <span className="gallery-card-stat">
                              <LikeOutlined /> {formatNumber(item.likes)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
            </div>
          ) : (
            <div className="gallery-empty-state">
              <span className="gallery-empty-icon">🔍</span>
              <p className="gallery-empty-text">{t.gallery.emptyTitle}</p>
              <button
                className="gallery-empty-btn"
                onClick={() => {
                  setFilter({ category: undefined, search: '', sortBy: 'recent' });
                  setCurrentSlide(0);
                }}
              >
                {t.gallery.emptyButton}
              </button>
            </div>
          )}
          
          {/* 右导航按钮 */}
          <button
            className={`gallery-nav-arrow gallery-nav-next ${currentSlide >= totalSlides - 1 ? 'disabled' : ''}`}
            onClick={goNext}
            disabled={currentSlide >= totalSlides - 1}
            title={isZh ? '下一页' : 'Next Page'}
          >
            <RightOutlined />
          </button>
        </section>
      </main>

      {/* 3D 预览模态框 */}
      {selectedItem && (
        <div className="gallery-modal" onClick={() => setSelectedItem(null)}>
          <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-modal-close" onClick={() => setSelectedItem(null)}>
              ×
            </button>
            <h2 className="gallery-modal-title">{selectedItem.title}</h2>
            <div className="gallery-modal-viewer">
              {loading ? (
                <div className="gallery-empty-state">
                  <Spin size="large" />
                  <p>{t.viewer.loading}</p>
                </div>
              ) : selectedItem.modelUrl ? (
                <SparkViewer
                  splatUrl={selectedItem.modelUrl}
                  autoRotate={true}
                  enableControls={true}
                  showStats={true}
                />
              ) : (
                <div className="gallery-empty-state">
                  <span className="gallery-empty-icon">📦</span>
                  <p>3D模型加载中...</p>
                </div>
              )}
            </div>
            <div className="gallery-modal-info">
              <p className="gallery-modal-desc">{selectedItem.description}</p>
              <div className="gallery-modal-meta">
                <span><EyeOutlined /> {formatNumber(selectedItem.views)}</span>
                <span><LikeOutlined /> {formatNumber(selectedItem.likes)}</span>
                <span>{t.gallery.author}: {selectedItem.author}</span>
              </div>
              <div className="gallery-modal-tags">
                {selectedItem.tags.map((tag) => (
                  <span key={tag} className="gallery-modal-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
