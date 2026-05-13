// 画廊页面组件 - 全屏3D卡片展示 + 左侧导航
// 使用 V3 组件 UniversalGaussianCardV3 + 后端 API 数据
import { useState, useEffect, useMemo, useCallback } from 'react';
import { UniversalGaussianCardV3 } from '../../components/3d/UniversalGaussianCardV3';
import type { Base3DViewerRef } from '../../components/3d/Base3DViewer';
import { useTranslation } from '../../i18n';
import { fetchPublicModels, CATEGORY_LABELS, formatFileSize } from './gallery.api';
import type { GalleryModelItem } from './gallery.api';
import './GalleryPage.css';

const PAGE_SIZE = 6; // 固定每页6个模型

// 分类图标映射
const CATEGORY_ICONS: Record<string, string> = {
  character: '🧑',
  scene: '🌄',
  prop: '🛠️',
  vehicle: '🚗',
  box: '📦',
  animation: '🎬',
  nature: '🌿',
  animal: '🐾',
  architecture: '🏛️',
  food: '🍔',
  industry: '🏭',
  art: '🎨',
  other: '📂',
};

export function GalleryPage() {
  const { t, language } = useTranslation();
  const isZh = language === 'zh-CN';

  // 状态
  const [models, setModels] = useState<GalleryModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [detailModel, setDetailModel] = useState<GalleryModelItem | null>(null);

  // 从后端获取模型列表
  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPublicModels({ page_size: 24 });
      setModels(res.data);
      setTotalCount(res.total || res.data.length);
    } catch (err: any) {
      setError(err.message || '加载模型失败');
      console.error('❌ Gallery: 加载模型失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // 提取所有分类（从数据中动态获取）
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    models.forEach(m => {
      if (m.category && m.category !== 'other') catSet.add(m.category);
    });
    return Array.from(catSet).sort();
  }, [models]);

  // 过滤
  const filteredModels = useMemo(() => {
    let items = [...models];

    if (selectedCategory !== 'all') {
      items = items.filter(m => m.category === selectedCategory);
    }

    return items;
  }, [models, selectedCategory]);

  // 分页
  const totalPages = Math.ceil(filteredModels.length / PAGE_SIZE);
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));
  const pageItems = filteredModels.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE
  );

  // 页码范围（带省略号折叠）
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      const cur = safePage;
      pages.push(0);
      if (cur > 2) pages.push('ellipsis');
      for (let i = Math.max(1, cur - 1); i <= Math.min(totalPages - 2, cur + 1); i++) {
        pages.push(i);
      }
      if (cur < totalPages - 3) pages.push('ellipsis');
      pages.push(totalPages - 1);
    }
    return pages;
  }, [totalPages, safePage]);

  // 切换页面
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 切换页面大小（已固定为6）

  // 分类切换
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    goToPage(0);
  };

  // 查看详情
  const openDetail = (model: GalleryModelItem) => {
    setDetailModel(model);
  };

  const closeDetail = () => {
    setDetailModel(null);
  };

  return (
    <div className="gallery-page">
      {/* 左侧分类导航（Upload 页面风格） */}
      <aside className="gallery-sidebar">
        <div className="gallery-sidebar-logo">🎨</div>
        <h2 className="gallery-sidebar-title">
          {isZh ? '模型画廊' : 'Gallery'}
        </h2>

        <nav className="gallery-nav">
          <button
            className={`gallery-nav-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('all')}
          >
            <span className="gallery-nav-icon">🖼️</span>
            <span className="gallery-nav-label">{isZh ? '全部' : 'All'}</span>
            <span className="gallery-nav-count">{totalCount}</span>
          </button>

          {categories.map(cat => {
            const count = models.filter(m => m.category === cat).length;
            const icon = CATEGORY_ICONS[cat] || '📦';
            return (
              <button
                key={cat}
                className={`gallery-nav-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                <span className="gallery-nav-icon">{icon}</span>
                <span className="gallery-nav-label">{CATEGORY_LABELS[cat] || cat}</span>
                <span className="gallery-nav-count">{count}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="gallery-main">

        {/* 加载状态 */}
        {loading && (
          <div className="gallery-loading">
            <div className="gallery-loading-spinner" />
            <p>{isZh ? '正在加载模型...' : 'Loading models...'}</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="gallery-error">
            <p>⚠️ {isZh ? '加载失败: ' : 'Error: '}{error}</p>
            <button onClick={loadModels}>
              {isZh ? '重新加载' : 'Retry'}
            </button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && filteredModels.length === 0 && (
          <div className="gallery-empty">
            <p>{isZh ? '暂无匹配的模型' : 'No models found'}</p>
            <button onClick={() => setSelectedCategory('all')}>
              {isZh ? '重置筛选' : 'Reset filters'}
            </button>
          </div>
        )}

        {/* 3D卡片网格 + 两侧悬浮翻页按钮 */}
        {!loading && !error && pageItems.length > 0 && (
          <div className="gallery-grid-container">
            {/* 左侧悬浮上一页 */}
            <button
              className={`gallery-nav-arrow gallery-nav-prev ${safePage > 0 ? 'visible' : ''}`}
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 0}
              title={isZh ? '上一页' : 'Previous'}
            >
              ‹
            </button>

            <section className="gallery-grid">
              {pageItems.map(model => (
                <div
                  key={model.id}
                  className="gallery-card-wrapper"
                  onClick={() => openDetail(model)}
                >
                  <div className="gallery-card-3d" onClick={e => e.stopPropagation()}>
                    <UniversalGaussianCardV3
                      modelUrl={model.model_url}
                      layout="compact"
                      autoCenter={true}
                      margin={1.8}
                      enableControls={true}
                      autoRotate={true}
                      autoRotateSpeed={0.5}
                      showParticles={true}
                      particleSize={0.05}
                      showPlatform={false}
                      showLabels={false}
                      showTitle={true}
                      title={model.name}
                      subtitle={`${model.format.toUpperCase()} · ${CATEGORY_LABELS[model.category] || model.category}`}
                      showStats={true}
                      onScreenshot={(dataUrl) => {
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = `${model.name}-${Date.now()}.png`;
                        a.click();
                      }}
                    />
                    <button
                      className="gallery-card-detail-btn"
                      onClick={(e) => { e.stopPropagation(); openDetail(model); }}
                    >
                      🔍 {isZh ? '查看详情' : 'Details'}
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {/* 右侧悬浮下一页 */}
            <button
              className={`gallery-nav-arrow gallery-nav-next ${safePage < totalPages - 1 ? 'visible' : ''}`}
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages - 1}
              title={isZh ? '下一页' : 'Next'}
            >
              ›
            </button>
          </div>
        )}

         {/* 底部页码 */}
        {!loading && !error && totalPages > 1 && (
          <div className="gallery-pagination">
            <button
              className="gallery-page-btn gallery-page-btn-icon"
              disabled={safePage === 0}
              onClick={() => goToPage(0)}
              title={isZh ? '首页' : 'First'}
            >
              «
            </button>

            <div className="gallery-page-numbers">
              {pageNumbers.map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="gallery-page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`gallery-page-btn ${p === safePage ? 'active' : ''}`}
                    onClick={() => goToPage(p)}
                  >
                    {p + 1}
                  </button>
                )
              )}
            </div>

            <button
              className="gallery-page-btn gallery-page-btn-icon"
              disabled={safePage >= totalPages - 1}
              onClick={() => goToPage(totalPages - 1)}
              title={isZh ? '末页' : 'Last'}
            >
              »
            </button>
          </div>
        )}
      </main>

      {/* ===== 详情弹框（V3 featured 布局） ===== */}
      {detailModel && (
        <div className="gallery-modal" onClick={closeDetail}>
          <div className="gallery-modal-content" onClick={e => e.stopPropagation()}>
            <button className="gallery-modal-close" onClick={closeDetail}>✕</button>

            <div className="gallery-modal-header">
              <h2>{detailModel.name}</h2>
              <span className="gallery-modal-tag">
                {detailModel.format.toUpperCase()} · {CATEGORY_LABELS[detailModel.category] || detailModel.category}
              </span>
            </div>

            <div className="gallery-modal-viewer">
              <UniversalGaussianCardV3
                modelUrl={detailModel.model_url}
                autoCenter={true}
                margin={2.5}
                layout="featured"
                enableControls={true}
                autoRotate={true}
                autoRotateSpeed={1.0}
                showParticles={true}
                showPlatform={true}
                showLabels={true}
                showTitle={true}
                title={detailModel.name}
                subtitle={`${detailModel.format.toUpperCase()} · 详情预览`}
                showStats={true}
                onScreenshot={(dataUrl) => {
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = `${detailModel.name}-${Date.now()}.png`;
                  a.click();
                }}
              />
            </div>

            <div className="gallery-modal-footer">
              {detailModel.description && (
                <p className="gallery-modal-desc">{detailModel.description}</p>
              )}
              <div className="gallery-modal-meta">
                <span>📁 {detailModel.format.toUpperCase()}</span>
                <span>📦 {formatFileSize(detailModel.file_size)}</span>
                <span>🏷️ {CATEGORY_LABELS[detailModel.category] || detailModel.category}</span>
              </div>
              <p className="gallery-modal-hint">
                🖱️ {isZh ? '点击拖拽旋转 · 滚轮缩放' : 'Drag to rotate · Scroll to zoom'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryPage;
