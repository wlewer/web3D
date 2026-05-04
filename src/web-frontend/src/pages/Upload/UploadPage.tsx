// 模型作品页面 - 左右分页展示（相邻页面 keep-alive，翻回不重建）
// 始终保持当前页 + 上一页挂载（最多12个WebGL上下文），模型数据全局缓存
import { useState, useCallback } from 'react';
import { useTranslation } from '../../i18n';
import { Model3DCard } from '../../components/Model3DCard';
import { SparkViewer } from '../../components/3d';
import { OFFICIAL_MODELS, CATEGORIES, getAllModels } from '../../data/officialModels';
import { AppstoreOutlined, StarOutlined, RocketOutlined, ToolOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import './UploadPage.css';

// 分类图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  animals: <StarOutlined />,
  food: <RocketOutlined />,
  scenes: <ToolOutlined />,
  objects: <AppstoreOutlined />,
};

// 每页显示 2 行 × 3 列 = 6 个
const CARDS_PER_PAGE = 6;

export function UploadPage() {
  const { language } = useTranslation();
  const isZh = language === 'zh-CN';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  // keep-alive: 始终保持当前页 + 上一页挂载，翻回瞬间可见
  const [alivePages, setAlivePages] = useState<Set<number>>(() => new Set([0]));

  const allModels = getAllModels();

  const filteredModels = selectedCategory
    ? allModels.filter(m => m.category === selectedCategory)
    : allModels;

  // 分页计算
  const totalPages = Math.ceil(filteredModels.length / CARDS_PER_PAGE);

  // 翻页时更新 keep-alive 窗口
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    setAlivePages(prev => {
      const next = new Set<number>();
      next.add(page);
      if (page > 0) next.add(page - 1);
      // 如果上一页的 alive set 里有相邻页且还在范围内，保留它
      // 这样从 page1→page2→page1 时，page1 无需重建
      for (const p of prev) {
        if (p >= page - 1 && p <= page) next.add(p);
      }
      return next;
    });
  }, []);

  const goNext = () => {
    if (currentPage < totalPages - 1) goToPage(currentPage + 1);
  };

  const goPrev = () => {
    if (currentPage > 0) goToPage(currentPage - 1);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setCurrentPage(0);
    setAlivePages(new Set([0])); // 切换分类时重置 keep-alive
  };

  return (
    <div className="upload-page">
      {/* 左侧分类导航 */}
      <aside className="upload-sidebar">
        <div className="upload-sidebar-logo">🎨</div>
        <h2 className="upload-sidebar-title">
          {isZh ? '模型作品' : 'Models'}
        </h2>

        <nav className="upload-nav">
          <button
            className={`upload-nav-btn ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => handleCategoryChange(null)}
          >
            <span className="upload-nav-icon"><AppstoreOutlined /></span>
            <span className="upload-nav-label">{isZh ? '全部' : 'All'}</span>
            <span className="upload-nav-count">{allModels.length}</span>
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              className={`upload-nav-btn ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => handleCategoryChange(key)}
            >
              <span className="upload-nav-icon">{CATEGORY_ICONS[key]}</span>
              <span className="upload-nav-label">{isZh ? cat.nameZh : cat.name}</span>
              <span className="upload-nav-count">
                {allModels.filter(m => m.category === key).length}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 右侧内容区 */}
      <main className="upload-main">
        {/* 模型轮播区域 */}
        <section className="upload-carousel-area">
          {/* 左翻页箭头 */}
          <button
            className={`upload-nav-arrow prev ${currentPage === 0 ? 'disabled' : ''}`}
            onClick={goPrev}
            disabled={currentPage === 0}
          >
            <LeftOutlined />
          </button>

          {/* 卡片视口（相邻页面 keep-alive：当前页显示、上一页隐藏但保持挂载） */}
          <div className="upload-cards-viewport">
            {Array.from({ length: totalPages }, (_, pageIndex) => {
              if (!alivePages.has(pageIndex)) return null;
              const pageItems = filteredModels.slice(
                pageIndex * CARDS_PER_PAGE,
                (pageIndex + 1) * CARDS_PER_PAGE
              );
              const isCurrent = pageIndex === currentPage;
              return (
                <div
                  key={pageIndex}
                  className="upload-models-grid"
                  style={{ display: isCurrent ? 'grid' : 'none' }}
                >
                  {pageItems.map((model, index) => (
                    <div
                      key={model.id}
                      className="upload-card-wrapper"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <Model3DCard
                        modelUrl={model.url}
                        thumbnail={model.thumbnail}
                        title={model.name}
                        titleZh={model.nameZh}
                        autoRotate={true}
                        isActive={selectedModel === model.id}
                        onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
                        size="medium"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* 右翻页箭头 */}
          <button
            className={`upload-nav-arrow next ${currentPage >= totalPages - 1 ? 'disabled' : ''}`}
            onClick={goNext}
            disabled={currentPage >= totalPages - 1}
          >
            <RightOutlined />
          </button>
        </section>

        {/* 分页指示器 */}
        {totalPages > 1 && (
          <div className="upload-pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`upload-pagination-dot ${currentPage === i ? 'active' : ''}`}
                onClick={() => goToPage(i)}
              />
            ))}
          </div>
        )}

        {/* 模型详情弹窗 */}
        {selectedModel && (
          <div className="upload-model-detail-modal" onClick={() => setSelectedModel(null)}>
            <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="upload-modal-close" onClick={() => setSelectedModel(null)}>x</button>
              <div className="upload-modal-3d-viewer">
                <SparkViewer
                  key={selectedModel}
                  splatUrl={OFFICIAL_MODELS[selectedModel as keyof typeof OFFICIAL_MODELS]?.url || ''}
                  autoRotate={true}
                  enableControls={true}
                  showStats={true}
                />
              </div>
              <div className="upload-modal-info">
                <h3>{isZh ? OFFICIAL_MODELS[selectedModel as keyof typeof OFFICIAL_MODELS]?.nameZh : OFFICIAL_MODELS[selectedModel as keyof typeof OFFICIAL_MODELS]?.name}</h3>
                <p>{isZh ? '点击拖拽旋转 · 滚轮缩放' : 'Drag to rotate · Scroll to zoom'}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
