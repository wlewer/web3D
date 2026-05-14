// 应用入口
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, GalleryPage, AuthPage, UploadPage, BookViewerPage, BookGalleryPage } from './pages';
import { Week2ComponentsTest } from './pages/Test';
import { Workshop3D } from './pages/Workshop3D';
import { SparkEditor } from './pages/Editor/SparkEditor';
import { I18nProvider, useLanguage, useTranslation } from './i18n';
import { getCurrentUser, logout, type User } from './pages/Auth';
import { AdminEntry } from './admin';
import { fetchNavMenus } from './services/templateService';
import type { NavMenuItem, PageContext } from './types/template';
import { LegacyPage } from './core/template/LegacyPage';
import { TemplateRenderer } from './core/template/TemplateRenderer';
import './App.css';

// 语言切换组件
function LanguageSwitcher() {
  const { language, toggleLanguage, languages } = useLanguage();
  
  const currentLang = languages[language];
  
  return (
    <button className="language-switcher" onClick={toggleLanguage}>
      <span className="language-flag">{currentLang.flag}</span>
      <span className="language-name">{currentLang.name}</span>
    </button>
  );
}

// 用户头像组件
function UserAvatar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="user-avatar">
      <img
        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
        alt={user.username}
        className="user-avatar-img"
      />
      <span className="user-avatar-name">{user.username}</span>
      <button className="user-logout-btn" onClick={onLogout}>
        {t.nav.logout}
      </button>
    </div>
  );
}

// 导航栏组件（支持数据驱动 + 硬编码回退）
function NavBar({ currentPage, setCurrentPage, user, onLogout, navItems }: {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
  navItems?: NavMenuItem[] | null;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  // 顶层可见菜单（无 parent_id 的根菜单）
  const visibleNavItems = navItems?.filter(item => !item.parent_id && item.is_visible) || [];
  const useDataDriven = visibleNavItems.length > 0;

  // 从 navItem 获取多语言标签
  const getLabel = (item: NavMenuItem): string => {
    return item.label?.['zh'] || item.label?.['en'] || '';
  };

  // 根据 route 匹配当前激活菜单
  const currentNavItem = useDataDriven
    ? visibleNavItems.find(item => {
        if (currentPage === 'home' && item.route === '/') return true;
        const pageRouteMap: Record<string, string> = {
          'home': '/', 'gallery': '/gallery', 'workshop': '/workshop',
          'upload': '/upload', 'auth': '/auth', 'book': '/book',
          'book-gallery': '/book-gallery', 'spark-editor': '/editor/spark',
          'week2-components-test': '/test/week2-components-test',
        };
        return item.route === pageRouteMap[currentPage];
      })
    : null;

  return (
    <nav className="app-nav">
      <div className="app-nav-brand">
        <span className="app-nav-logo">🎨</span>
        <span className="app-nav-title">{t.app.name}</span>
        <span className="app-nav-route">
          {useDataDriven && currentNavItem
            ? `${currentNavItem.route} ${getLabel(currentNavItem)}`
            : currentPage === 'home' ? '/ Home' :
           currentPage === 'gallery' ? '/ Gallery' :
           currentPage === 'workshop' ? '/ Workshop' :
           currentPage === 'upload' ? '/ Upload' :
           currentPage === 'auth' ? '/ Auth' :
           currentPage === 'book' ? '/ Book' :
           currentPage === 'book-gallery' ? '/ Book Gallery' :
           currentPage === 'spark-editor' ? '/ Editor' :
           currentPage === 'week2-components-test' ? '/ Test' : ''}
        </span>
      </div>
      <div className="app-nav-links">
        {/* 数据驱动模式 */}
        {useDataDriven && visibleNavItems.map((item) => {
          // 找到对应的 page_component 用于导航
          const matchedPage = item.page_component || item.route;
          return (
            <button
              key={item.id}
              className={`app-nav-link ${currentNavItem?.id === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(matchedPage)}
            >
              {item.icon ? `${item.icon} ` : ''}{getLabel(item)}
            </button>
          );
        })}
        {/* 回退模式：硬编码导航按钮 */}
        {!useDataDriven && (<>
          <button className={`app-nav-link ${currentPage === 'home' ? 'active' : ''}`} onClick={() => setCurrentPage('home')}>{t.nav.home}</button>
          <button className={`app-nav-link ${currentPage === 'gallery' ? 'active' : ''}`} onClick={() => setCurrentPage('gallery')}>{t.nav.gallery}</button>
          <button className={`app-nav-link ${currentPage === 'week2-components-test' ? 'active' : ''}`} onClick={() => setCurrentPage('week2-components-test')}>🧪 Week 2组件验证</button>
          <button className={`app-nav-link ${currentPage === 'upload' ? 'active' : ''}`} onClick={() => setCurrentPage('upload')}>{t.nav.upload}</button>
          <button className={`app-nav-link ${currentPage === 'workshop' ? 'active' : ''}`} onClick={() => setCurrentPage('workshop')}>🏭 {language === 'zh-CN' ? '3D车间' : '3D Workshop'}</button>
        </>)}
        {!user ? (
          useDataDriven ? null :
          <button className={`app-nav-link ${currentPage === 'auth' ? 'active' : ''}`} onClick={() => setCurrentPage('auth')}>{t.nav.login}</button>
        ) : (
          <UserAvatar user={user} onLogout={onLogout} />
        )}
        <LanguageSwitcher />
      </div>
    </nav>
  );
}

// 主应用组件
function AppContent() {
  // 从URL路径初始化页面状态
  const getPageFromPath = () => {
    const path = window.location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path === '/test/week2-components-test') return 'week2-components-test';
    if (path === '/auth') return 'auth';
    if (path === '/upload') return 'upload';
    if (path === '/editor/spark') return 'spark-editor';
    if (path === '/book') return 'book';
    if (path === '/book-gallery') return 'book-gallery';
    if (path === '/gallery') return 'gallery';
    if (path === '/workshop') return 'workshop';
    return 'home';
  };

  const [currentPage, setCurrentPage] = useState(getPageFromPath());
  const [user, setUser] = useState<User | null>(null);

  // nav_menus API 数据（空 = 回退硬编码模式）
  const [navItems, setNavItems] = useState<NavMenuItem[] | null>(null);

  // 初始化检查登录状态
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // 加载导航菜单数据
  useEffect(() => {
    fetchNavMenus()
      .then(items => {
        if (items && items.length > 0) {
          setNavItems(items);
        }
      })
      .catch(() => {
        // API 不可用，继续使用硬编码回退
        console.debug('导航菜单 API 不可用，使用硬编码回退');
      });
  }, []);

  // 处理登出
  const handleLogout = () => {
    logout();
    setUser(null);
    setCurrentPage('home');
    window.history.pushState({}, '', '/');
  };

  // 页面切换时同步URL
  const handlePageChange = (page: string) => {
    setCurrentPage(page as typeof currentPage);
    
    // 优先使用 navItems 中的 route，回退硬编码 pathMap
    if (navItems) {
      const navItem = navItems.find(item => item.page_component === page);
      if (navItem) {
        window.history.pushState({}, '', navItem.route);
        return;
      }
    }
    
    const pathMap: Record<string, string> = {
      'home': '/',
      'gallery': '/gallery',
      'workshop': '/workshop',
      'week2-components-test': '/test/week2-components-test',
      'auth': '/auth',
      'upload': '/upload',
      'spark-editor': '/editor/spark',
      'book': '/book',
      'book-gallery': '/book-gallery',
    };
    window.history.pushState({}, '', pathMap[page] || '/');
  };

  // 根据当前路径查找对应的 nav_menu 数据
  const currentNavMenuItem = navItems?.find(item => {
    const routeMap: Record<string, string> = {
      'home': '/', 'gallery': '/gallery', 'workshop': '/workshop',
      'upload': '/upload', 'auth': '/auth', 'book': '/book',
      'book-gallery': '/book-gallery', 'spark-editor': '/editor/spark',
      'week2-components-test': '/test/week2-components-test',
    };
    return item.route === routeMap[currentPage];
  });

 // 页面渲染：page_component(安全模式) > template_id > API不可用时硬编码回退
  const renderPage = () => {
    // 安全模式：只要 nav_menu 有 page_component，优先使用 LegacyPage
    // 这样可以安全地在 admin 中绑定 template_id 而不会影响前端渲染
    if (currentNavMenuItem?.page_component) {
      return (
        <LegacyPage
          pageComponent={currentNavMenuItem.page_component}
          onNavigate={handlePageChange}
        />
      );
    }

    // 模板模式：nav_menu 只有 template_id（没有 page_component）
    if (currentNavMenuItem?.template_id) {
      const context: PageContext = {
        route: currentNavMenuItem.route,
        params: {},
        query: {},
        language: navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
        user,
      };
      return <TemplateRenderer templateId={currentNavMenuItem.template_id} context={context} />;
    }

    // navItems 已加载但当前页面没有匹配的导航项 → 显示"未找到页面"
    if (navItems && navItems.length > 0 && !currentNavMenuItem) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <h2 style={{ color: 'rgba(255,255,255,0.6)' }}>页面未找到</h2>
          <p>当前路由未配置导航菜单条目</p>
        </div>
      );
    }

    // 兜底安全网：仅当 navItems API 不可用时使用硬编码组件回退
    return (<>
      {currentPage === 'home' && <HomePage onNavigate={handlePageChange} />}
      {currentPage === 'spark-editor' && <SparkEditor />}
      {currentPage === 'workshop' && <Workshop3D />}
      {currentPage === 'gallery' && <GalleryPage />}
      {currentPage === 'week2-components-test' && <Week2ComponentsTest />}
      {currentPage === 'auth' && <AuthPage onSuccess={() => handlePageChange('home')} />}
      {currentPage === 'upload' && <UploadPage />}
      {currentPage === 'book' && <BookViewerPage onNavigate={() => handlePageChange('home')} />}
      {currentPage === 'book-gallery' && <BookGalleryPage onNavigate={() => handlePageChange('home')} />}
    </>);
  };

  return (
    <div className="app">
      <NavBar
        currentPage={currentPage}
        setCurrentPage={handlePageChange}
        user={user}
        onLogout={handleLogout}
        navItems={navItems}
      />
      
      <main className="app-main">
        {renderPage()}
      </main>
    </div>
  );
}

// 根组件
export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          {/* Admin 后台管理系统 */}
          <Route path="/admin/*" element={<AdminEntry />} />
          {/* 处理/admin 根路径 */}
          <Route path="/admin" element={<AdminEntry />} />
          
          {/* 前台应用 */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
