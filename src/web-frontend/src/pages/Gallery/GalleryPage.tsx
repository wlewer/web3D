// 画廊页面组件 - 全屏3D卡片展示 + 左侧导航
import { useState, useMemo, useRef, useCallback } from 'react';
import { Input } from 'antd';
import { SearchOutlined, SettingOutlined, LeftOutlined, RightOutlined, AppstoreOutlined, BoxPlotOutlined, CameraOutlined, HomeOutlined, RocketOutlined } from '@ant-design/icons';
import { UniversalGaussianCard } from '../../components/3d/UniversalGaussianCard';
import { SparkViewer } from '../../components/3d/Spark/SparkViewer';
import { useTranslation } from '../../i18n';
import { GALLERY_ITEMS, CATEGORIES } from './gallery.data';
import type { GalleryItem, GalleryFilter } from './gallery.types';
import './GalleryPage.css';

const { Search } = Input;

// 每页显示数量 - 2行3列（6个模型）
const CARDS_PER_PAGE = 6;

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



  // 过滤出有3D模型URL的项
  const itemsWith3DModel = useMemo(() => {
    return GALLERY_ITEMS.filter(item => item.modelUrl && item.modelUrl.length > 0);
  }, []);

  // 过滤和排序
  const filteredItems = useMemo(() => {
    let items = [...itemsWith3DModel];

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
          item.tags.some((tag) => tag.toLowerCase().includes(searchLower))
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
  }, [filter, itemsWith3DModel]);

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

  // 双击触发弹框
  const handleDoubleClick = useCallback((item: GalleryItem) => {
    console.log('🎯 双击触发弹框:', item.title);
    setSelectedItem(item);
  }, []);


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
        <h1 className="gallery-sidebar-title">{isZh ? '模型作品' : 'Model Gallery'}</h1>
        
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
                  <div
                    key={item.id}
                    className="gallery-3d-card-test"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onDoubleClick={() => handleDoubleClick(item)}
                  >
                    {/* 使用UniversalGaussianCard直接渲染3D模型 */}
                    <UniversalGaussianCard
                      modelUrl={item.modelUrl}
                      title={item.title}
                      subtitle={item.description}
                      layout="grid"
                      autoRotate={true}
                      enableControls={true}
                      showStats={true}
                      onClick={undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="gallery-empty-state">
              <span className="gallery-empty-icon"></span>
              <p className="gallery-empty-text">{t.gallery.emptyTitle}</p>
              <button
                className="gallery-empty-btn"
                onClick={() => {
                  setFilter({ search: '', sortBy: 'recent' });
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

      {/* 3D 预览模态框 - 参考首页“模型作品”的弹框效果 */}
      {selectedItem && (
        <div className="gallery-modal" onClick={() => setSelectedItem(null)}>
          <div className="gallery-modal-content-simple" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-modal-close" onClick={() => setSelectedItem(null)}>×</button>
            
            {/* 3D查看器 - 直接使用SparkViewer，不嵌套UniversalGaussianCard */}
            <div className="gallery-modal-3d-viewer">
              <SparkViewer
                splatUrl={selectedItem.modelUrl}
                autoRotate={true}
                enableControls={true}
                showStats={true}
              />
            </div>
            
            {/* 模型信息 */}
            <div className="gallery-modal-info">
              <h3 className="gallery-modal-title">{selectedItem.title}</h3>
              <p className="gallery-modal-desc">{selectedItem.description}</p>
              <p className="gallery-modal-hint">{isZh ? '点击拖拽旋转 · 滚轮缩放' : 'Drag to rotate · Scroll to zoom'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
