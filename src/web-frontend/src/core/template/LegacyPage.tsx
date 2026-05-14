/**
 * LegacyPage - 遗留页面组件映射桥
 *
 * 当 nav_menu.template_id = null 时使用此组件，
 * 将 page_component 映射到现有的硬编码页面组件。
 *
 * 这是零破坏升级的核心：保证所有现有页面行为完全不变。
 */
import React from 'react';
import type { NavMenuItem } from '../../types/template';

// 需要懒加载的页面组件（均为 named export，需 .then 提取）
const HomePage = React.lazy(() => import('../../pages/Home/HomePage').then(m => ({ default: m.HomePage })));
const GalleryPage = React.lazy(() => import('../../pages/Gallery/GalleryPage').then(m => ({ default: m.GalleryPage })));
const Workshop3D = React.lazy(() => import('../../pages/Workshop3D/Workshop3D').then(m => ({ default: m.Workshop3D })));
const AuthPage = React.lazy(() => import('../../pages/Auth/AuthPage').then(m => ({ default: m.AuthPage })));
const UploadPage = React.lazy(() => import('../../pages/Upload/UploadPage').then(m => ({ default: m.UploadPage })));
const BookViewerPage = React.lazy(() => import('../../pages/BookViewer/BookViewerPage').then(m => ({ default: m.BookViewerPage })));
const BookGalleryPage = React.lazy(() => import('../../pages/BookGallery/BookGalleryPage').then(m => ({ default: m.BookGalleryPage })));
const SparkEditor = React.lazy(() => import('../../pages/Editor/SparkEditor').then(m => ({ default: m.SparkEditor })));
const Week2ComponentsTest = React.lazy(() => import('../../pages/Test/Week2ComponentsTest').then(m => ({ default: m.Week2ComponentsTest })));

// 页面组件映射表（page_component -> React Component）
const LEGACY_PAGE_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'home': HomePage,
  'gallery': GalleryPage,
  'workshop': Workshop3D,
  'auth': AuthPage,
  'upload': UploadPage,
  'spark-editor': SparkEditor,
  'book': BookViewerPage,
  'book-gallery': BookGalleryPage,
  'week2-components-test': Week2ComponentsTest,
};

interface LegacyPageProps {
  /** nav_menu 中的 page_component 字段值 */
  pageComponent: string;
  /** 传递给页面的回调（与 App.tsx 中一致） */
  onNavigate?: (page: string) => void;
  /** 导航菜单数据 */
  navItem?: NavMenuItem;
}

/**
 * LegacyPage - 渲染遗留模式的页面组件
 *
 * 完全模拟 App.tsx 中的渲染逻辑：
 *   <main>{currentPage === 'home' && <HomePage onNavigate={handlePageChange} />}</main>
 */
export const LegacyPage: React.FC<LegacyPageProps> = ({ pageComponent, onNavigate }) => {
  const Comp = LEGACY_PAGE_MAP[pageComponent];

  if (!Comp) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
        <h2>页面未找到</h2>
        <p>组件标识: {pageComponent}</p>
        <p>该页面的导航菜单配置了 page_component="{pageComponent}"，但系统未找到对应的页面组件。</p>
      </div>
    );
  }

  return (
    <React.Suspense fallback={
      <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
        Loading...
      </div>
    }>
      <Comp onNavigate={onNavigate} />
    </React.Suspense>
  );
};

export default LegacyPage;
