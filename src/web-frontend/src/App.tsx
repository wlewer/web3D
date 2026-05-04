// 应用入口
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, GalleryPage, AuthPage, UploadPage, SparkShowcase, BookViewerPage, BookGalleryPage, GenerationPage } from './pages';
import { GalleryPageTest } from './pages/Gallery/GalleryPageTest';
import { CameraConfigTest } from './pages/Test/CameraConfigTest';
import { NewArchitectureTest } from './pages/Test/NewArchitectureTest';
import { SF3DGenerationPage } from './pages/Generation/SF3DGenerationPage';
import { TripoSRGenerationPage } from './pages/Generation/TripoSRGenerationPage';
import { InstantMeshGenerationPage } from './pages/Generation/InstantMeshGenerationPage';
import { OfficialSuperSplatEditor } from './pages/Editor/OfficialSuperSplatEditor';
import { SparkEditor } from './pages/Editor/SparkEditor';
import { I18nProvider, useLanguage, useTranslation } from './i18n';
import { getCurrentUser, logout, type User } from './pages/Auth';
import { AdminEntry } from './admin';
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

// 导航栏组件
function NavBar({ currentPage, setCurrentPage, showWorkshopInHome, setShowWorkshopInHome, user, onLogout }: {
  currentPage: string;
  setCurrentPage: (page: 'home' | 'gallery' | 'gallery-test' | 'camera-config-test' | 'auth' | 'upload' | 'official-editor' | 'spark-editor' | 'showcase' | 'book' | 'book-gallery' | 'generation' | 'sf3d-generation' | 'triposr-generation' | 'instantmesh-generation') => void;
  showWorkshopInHome?: boolean;
  setShowWorkshopInHome?: (show: boolean) => void;
  user: User | null;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <nav className="app-nav">
      <div className="app-nav-brand">
        <span className="app-nav-logo">🎨</span>
        <span className="app-nav-title">{t.app.name}</span>
      </div>
      <div className="app-nav-links">
        <button
          className={`app-nav-link ${currentPage === 'home' && !showWorkshopInHome ? 'active' : ''}`}
          onClick={() => {
            // 点击首页按钮：隐藏3D车间，回到正常首页
            setCurrentPage('home');
            setShowWorkshopInHome(false);
          }}
        >
          {t.nav.home}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'official-editor' ? 'active' : ''}`}
          onClick={() => setCurrentPage('official-editor')}
        >
          🔧 {language === 'zh-CN' ? '3D编辑器' : '3D Editor'}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'gallery' ? 'active' : ''}`}
          onClick={() => setCurrentPage('gallery')}
        >
          {t.nav.gallery}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'gallery-test' ? 'active' : ''}`}
          onClick={() => setCurrentPage('gallery-test')}
        >
          🧪 {language === 'zh-CN' ? '画廊测试' : 'Gallery Test'}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'camera-config-test' ? 'active' : ''}`}
          onClick={() => setCurrentPage('camera-config-test')}
        >
          📸 相机配置测试
        </button>
        <button
          className={`app-nav-link ${currentPage === 'new-architecture-test' ? 'active' : ''}`}
          onClick={() => setCurrentPage('new-architecture-test')}
        >
          🧪 新架构测试
        </button>
        <button
          className={`app-nav-link ${currentPage === 'showcase' ? 'active' : ''}`}
          onClick={() => setCurrentPage('showcase')}
        >
          🎨 {language === 'zh-CN' ? '示例' : 'Showcase'}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentPage('upload')}
        >
          {t.nav.upload}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'generation' ? 'active' : ''}`}
          onClick={() => setCurrentPage('generation')}
        >
          ⚡ {language === 'zh-CN' ? 'AI生成' : 'AI Generate'}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'sf3d-generation' ? 'active' : ''}`}
          onClick={() => setCurrentPage('sf3d-generation')}
        >
          🚀 SF3D
        </button>
        <button
          className={`app-nav-link ${currentPage === 'triposr-generation' ? 'active' : ''}`}
          onClick={() => setCurrentPage('triposr-generation')}
        >
          ⚡ TripoSR
        </button>
        <button
          className={`app-nav-link ${currentPage === 'instantmesh-generation' ? 'active' : ''}`}
          onClick={() => setCurrentPage('instantmesh-generation')}
        >
          🔷 InstantMesh
        </button>
        <button
          className={`app-nav-link ${currentPage === 'home' && showWorkshopInHome ? 'active' : ''}`}
          onClick={() => {
            // 如果已经在首页，只触发滚动；如果不在首页，先跳转到首页
            if (currentPage !== 'home') {
              setCurrentPage('home');
            }
            setShowWorkshopInHome(true);
          }}
        >
          🏭 {language === 'zh-CN' ? '3D车间' : '3D Workshop'}
        </button>
        {!user ? (
          <button
            className={`app-nav-link ${currentPage === 'auth' ? 'active' : ''}`}
            onClick={() => setCurrentPage('auth')}
          >
            {t.nav.login}
          </button>
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
  const [currentPage, setCurrentPage] = useState<'home' | 'gallery' | 'gallery-test' | 'camera-config-test' | 'new-architecture-test' | 'auth' | 'upload' | 'official-editor' | 'spark-editor' | 'showcase' | 'book' | 'book-gallery' | 'generation' | 'sf3d-generation' | 'triposr-generation' | 'instantmesh-generation'>('home');
  const [showWorkshopInHome, setShowWorkshopInHome] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // 初始化检查登录状态
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // 处理登出
  const handleLogout = () => {
    logout();
    setUser(null);
    setCurrentPage('home');
  };

  return (
    <div className="app">
      <NavBar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        showWorkshopInHome={showWorkshopInHome}
        setShowWorkshopInHome={setShowWorkshopInHome}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="app-main">
        {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} showWorkshop3D={showWorkshopInHome} onWorkshopClose={() => setShowWorkshopInHome(false)} />}
        {currentPage === 'official-editor' && <OfficialSuperSplatEditor />}
        {currentPage === 'spark-editor' && <SparkEditor />}
        {currentPage === 'gallery' && <GalleryPage />}
        {currentPage === 'gallery-test' && <GalleryPageTest />}
        {currentPage === 'camera-config-test' && <CameraConfigTest />}
        {currentPage === 'new-architecture-test' && <NewArchitectureTest />}
        {currentPage === 'auth' && (
          <AuthPage 
            onSuccess={() => setCurrentPage('home')}
          />
        )}
        {currentPage === 'upload' && <UploadPage />}
        {currentPage === 'showcase' && <SparkShowcase />}
        {currentPage === 'book' && <BookViewerPage onNavigate={() => setCurrentPage('home')} />}
        {currentPage === 'book-gallery' && <BookGalleryPage onNavigate={() => setCurrentPage('home')} />}
        {currentPage === 'generation' && <GenerationPage />}
        {currentPage === 'sf3d-generation' && <SF3DGenerationPage />}
        {currentPage === 'triposr-generation' && <TripoSRGenerationPage />}
        {currentPage === 'instantmesh-generation' && <InstantMeshGenerationPage />}
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
