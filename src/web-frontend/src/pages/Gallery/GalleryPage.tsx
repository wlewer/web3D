// 画廊页面组件
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input, Spin } from 'antd';
import { SearchOutlined, EyeOutlined, LikeOutlined, FireOutlined, StarOutlined, AppstoreOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { SparkViewer } from '../../components/3d';
import { useTranslation } from '../../i18n';
import { GALLERY_ITEMS, CATEGORIES, BOX_CATEGORIES } from './gallery.data';
import type { GalleryItem, GalleryFilter, BoxCategory } from './gallery.types';
import './GalleryPage.css';

const { Search } = Input;
const ITEMS_PER_PAGE = 24;

export function GalleryPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<GalleryFilter>({
    category: undefined,
    boxType: undefined,
    search: '',
    sortBy: 'recent',
  });
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // 翻译映射
  const categoryLabels: Record<string, string> = {
    all: t.gallery.categoryAll,
    box: t.gallery.categoryBox,
    model: t.gallery.categoryModel,
    scene: t.gallery.categoryScene,
    animation: t.gallery.categoryAnimation,
  };

  const sortLabels = {
    recent: t.gallery.sortRecent,
    popular: t.gallery.sortPopular,
    likes: t.gallery.sortLikes,
  };

  // 精选作品（点赞最多的前4个）
  const featuredItems = useMemo(() => {
    return [...GALLERY_ITEMS]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 4);
  }, []);

  // 统计数据
  const stats = useMemo(() => {
    const items = GALLERY_ITEMS;
    return {
      total: items.length,
      boxes: items.filter(i => i.boxType).length,
      models: items.filter(i => i.category === 'model' && !i.boxType).length,
      scenes: items.filter(i => i.category === 'scene').length,
      animations: items.filter(i => i.category === 'animation').length,
      totalViews: items.reduce((sum, i) => sum + i.views, 0),
      totalLikes: items.reduce((sum, i) => sum + i.likes, 0),
    };
  }, []);

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

  // 当前显示的作品
  const visibleItems = filteredItems.slice(0, visibleCount);

  // 加载更多
  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredItems.length));
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

  // 获取分类标签颜色
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

  // 获取分类标签文本
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

  // 处理主分类切换
  const handleCategoryChange = (category: string) => {
    setFilter({
      ...filter,
      category: category === 'all' ? undefined : (category as any),
      boxType: undefined,
    });
    setVisibleCount(ITEMS_PER_PAGE);
  };

  // 处理盒子子分类切换
  const handleBoxTypeChange = (boxType: string) => {
    setFilter({
      ...filter,
      category: 'box',
      boxType: boxType === 'all' ? undefined : (boxType as BoxCategory),
    });
    setVisibleCount(ITEMS_PER_PAGE);
  };

  return (
    <div className="gallery-page">
      {/* 紧凑头部 */}
      <header className="gallery-header-compact">
        <div className="gallery-header-row">
          <div className="gallery-title-section">
            <h1 className="gallery-title">{t.gallery.title}</h1>
            <p className="gallery-subtitle">{t.gallery.subtitle}</p>
          </div>
          <Search
            className="gallery-search-compact"
            placeholder={t.gallery.search}
            prefix={<SearchOutlined />}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            allowClear
          />
        </div>

        {/* 分类筛选 */}
        <div className="gallery-categories-compact">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`gallery-cat-btn ${(filter.category === cat.value || (cat.value === 'all' && !filter.category && !filter.boxType)) ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.value)}
            >
              <span>{cat.icon}</span>
              <span>{categoryLabels[cat.value] || cat.label}</span>
              <span className="cat-count">
                {cat.value === 'all' ? stats.total :
                 cat.value === 'box' ? stats.boxes :
                 cat.value === 'model' ? stats.models :
                 cat.value === 'scene' ? stats.scenes : stats.animations}
              </span>
            </button>
          ))}
        </div>

        {/* 盒子子分类 */}
        {filter.category === 'box' && (
          <div className="gallery-box-categories-compact">
            {BOX_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`gallery-box-btn-compact ${filter.boxType === cat.value || (cat.value === 'all' && !filter.boxType) ? 'active' : ''}`}
                onClick={() => handleBoxTypeChange(cat.value)}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 主内容区域 */}
      <main className="gallery-main-compact">
        {/* 工具栏 */}
        <div className="gallery-toolbar-compact">
          <div className="gallery-toolbar-left">
            <AppstoreOutlined className="toolbar-icon" />
            <span className="gallery-count">
              {t.gallery.itemCount.replace('{{count}}', filteredItems.length.toString())}
            </span>
          </div>
          <div className="gallery-sort">
            <select
              value={filter.sortBy}
              onChange={(e) => setFilter({ ...filter, sortBy: e.target.value as GalleryFilter['sortBy'] })}
            >
              <option value="recent">{sortLabels.recent}</option>
              <option value="popular">{sortLabels.popular}</option>
              <option value="likes">{sortLabels.likes}</option>
            </select>
          </div>
        </div>

        {/* 精选作品 - 大卡片展示（GIF动图） */}
        {!filter.search && !filter.category && !filter.boxType && (
          <section className="gallery-featured-compact">
            <h2 className="featured-section-title">
              <span className="featured-badge">⭐ 精选展示</span>
            </h2>
            <div className="featured-grid">
              {featuredItems.map((item, index) => (
                <article
                  key={item.id}
                  className={`featured-card-3d ${item.gifPreview ? 'has-gif' : ''}`}
                  onClick={() => handlePreview(item)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="featured-3d-container">
                    <div className="featured-3d-image">
                      {/* 如果有GIF则显示GIF */}
                      {item.gifPreview ? (
                        <>
                          <img 
                            src={item.gifPreview} 
                            alt={item.title} 
                            className="gif-preview"
                            autoPlay 
                            loop 
                            muted
                            playsInline
                          />
                          <span className="gif-badge">
                            <PlayCircleOutlined /> GIF
                          </span>
                        </>
                      ) : (
                        <img src={item.thumbnail} alt={item.title} loading="lazy" />
                      )}
                      <div className="featured-3d-overlay">
                        <span className="featured-3d-preview">{t.gallery.preview}</span>
                      </div>
                    </div>
                    <div className="featured-3d-reflection"></div>
                  </div>
                  <div className="featured-3d-info">
                    <h3>{item.title}</h3>
                    <div className="featured-3d-meta">
                      <span><EyeOutlined /> {formatNumber(item.views)}</span>
                      <span><LikeOutlined /> {formatNumber(item.likes)}</span>
                    </div>
                  </div>
                  {isHot(item) && <span className="featured-hot-badge"><FireOutlined /></span>}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 作品网格 - 紧凑3D卡片 */}
        <div className="gallery-grid-compact">
          {visibleItems.map((item, index) => (
            <article 
              key={item.id} 
              className={`gallery-card-3d ${item.gifPreview ? 'has-gif' : ''}`}
              onClick={() => handlePreview(item)}
              style={{ animationDelay: `${(index % 12) * 0.05}s` }}
            >
              <div className="card-3d-container">
                {/* 3D透视图片 */}
                <div className="card-3d-image">
                  {/* 如果有GIF则显示GIF */}
                  {item.gifPreview ? (
                    <>
                      <img 
                        src={item.gifPreview} 
                        alt={item.title} 
                        className="gif-preview"
                        autoPlay 
                        loop 
                        muted
                        playsInline
                      />
                      <span className="gif-badge-small">
                        <PlayCircleOutlined /> GIF
                      </span>
                    </>
                  ) : (
                    <img src={item.thumbnail} alt={item.title} loading="lazy" />
                  )}
                  {/* 3D倒影 */}
                  <div className="card-3d-reflection"></div>
                  {/* 分类标签 */}
                  <span
                    className="card-3d-category"
                    style={{ background: getCategoryColor(item) }}
                  >
                    {getCategoryLabel(item)}
                  </span>
                  {/* 热门标记 */}
                  {isHot(item) && (
                    <span className="card-3d-hot">
                      <FireOutlined />
                    </span>
                  )}
                  {/* 悬停预览按钮 */}
                  <div className="card-3d-hover">
                    <span className="card-3d-preview-btn">{t.gallery.preview}</span>
                  </div>
                </div>
              </div>
              
              {/* 卡片信息 */}
              <div className="card-3d-info">
                <h3 className="card-3d-title">{item.title}</h3>
                <div className="card-3d-tags">
                  {item.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="card-3d-tag">{tag}</span>
                  ))}
                </div>
                <div className="card-3d-footer">
                  <span className="card-3d-author">{item.author}</span>
                  <div className="card-3d-stats">
                    <span><EyeOutlined /> {formatNumber(item.views)}</span>
                    <span><LikeOutlined /> {formatNumber(item.likes)}</span>
                  </div>
                </div>
                {/* 盒子额外信息 */}
                {item.boxType && (
                  <div className="card-3d-meta">
                    {item.price && <span className="card-3d-price">{item.price}</span>}
                    {item.material && <span className="card-3d-material">{item.material}</span>}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* 加载更多 */}
        {visibleCount < filteredItems.length && (
          <div className="gallery-load-more">
            <button onClick={handleLoadMore}>
              {t.gallery.loadMore} ({filteredItems.length - visibleCount})
            </button>
          </div>
        )}

        {/* 空状态 */}
        {filteredItems.length === 0 && (
          <div className="gallery-empty">
            <span className="empty-icon">🔍</span>
            <p>{t.gallery.emptyTitle}</p>
            <button onClick={() => setFilter({ category: undefined, search: '', sortBy: 'recent' })}>
              {t.gallery.emptyButton}
            </button>
          </div>
        )}
      </main>

      {/* 3D 预览模态框 */}
      {selectedItem && (
        <div className="gallery-modal" onClick={() => setSelectedItem(null)}>
          <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-modal-close" onClick={() => setSelectedItem(null)}>
              ×
            </button>
            <h2>{selectedItem.title}</h2>
            <div className="gallery-modal-viewer">
              {loading ? (
                <div className="modal-loading">
                  <Spin size="large" />
                  <p>{t.viewer.loading}</p>
                </div>
              ) : (
                selectedItem.modelUrl ? (
                  <SparkViewer
                    splatUrl={selectedItem.modelUrl}
                    autoRotate={true}
                    enableControls={true}
                    showStats={true}
                  />
                ) : (
                  <div className="modal-placeholder">
                    <span>📦</span>
                    <p>3D模型加载中...</p>
                  </div>
                )
              )}
            </div>
            <div className="gallery-modal-info">
              <p className="gallery-modal-desc">{selectedItem.description}</p>
              <div className="gallery-modal-meta">
                <span><StarOutlined /> {t.gallery.author}: {selectedItem.author}</span>
                <span><EyeOutlined /> {formatNumber(selectedItem.views)}</span>
                <span><LikeOutlined /> {formatNumber(selectedItem.likes)}</span>
              </div>
              {selectedItem.boxType && (
                <div className="gallery-modal-box-info">
                  {selectedItem.price && (
                    <div className="box-info-item">
                      <span className="box-info-label">{t.gallery.priceRange}:</span>
                      <span className="box-info-value">{selectedItem.price}</span>
                    </div>
                  )}
                  {selectedItem.material && (
                    <div className="box-info-item">
                      <span className="box-info-label">{t.gallery.material}:</span>
                      <span className="box-info-value">{selectedItem.material}</span>
                    </div>
                  )}
                  {selectedItem.industry && (
                    <div className="box-info-item">
                      <span className="box-info-label">{t.gallery.industry}:</span>
                      <span className="box-info-value">{selectedItem.industry}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="gallery-modal-tags">
                {selectedItem.tags.map((tag) => (
                  <span key={tag} className="gallery-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
