// 应用入口
import { useState, useEffect } from 'react';
import { HomePage, GalleryPage, AuthPage, UploadPage, SuperSplatPage, EnhancedSuperSplatEditor } from './pages';
import { I18nProvider, useLanguage, useTranslation } from './i18n';
import { getCurrentUser, logout, type User } from './pages/Auth';
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
function NavBar({ currentPage, setCurrentPage, user, onLogout }: {
  currentPage: string;
  setCurrentPage: (page: 'home' | 'gallery' | 'auth' | 'upload' | 'supersplat' | 'editor') => void;
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
          className={`app-nav-link ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentPage('home')}
        >
          {t.nav.home}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'supersplat' ? 'active' : ''}`}
          onClick={() => setCurrentPage('supersplat')}
        >
          🎯 {language === 'zh' ? '官方展示' : 'Official'}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'editor' ? 'active' : ''}`}
          onClick={() => setCurrentPage('editor')}
        >
          ✏️ {language === 'zh' ? '编辑器' : 'Editor'}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'gallery' ? 'active' : ''}`}
          onClick={() => setCurrentPage('gallery')}
        >
          {t.nav.gallery}
        </button>
        <button
          className={`app-nav-link ${currentPage === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentPage('upload')}
        >
          {t.nav.upload}
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
  const [currentPage, setCurrentPage] = useState<'home' | 'gallery' | 'auth' | 'upload' | 'supersplat' | 'editor'>('home');
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

  // 登录成功回调
  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setCurrentPage('home');
  };

  return (
    <div className="app">
      <NavBar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="app-main">
        {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
        {currentPage === 'supersplat' && <SuperSplatPage />}
        {currentPage === 'editor' && <EnhancedSuperSplatEditor />}
        {currentPage === 'gallery' && <GalleryPage user={user} />}
        {currentPage === 'auth' && (
          <AuthPage 
            onLoginSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setCurrentPage('home')}
          />
        )}
        {currentPage === 'upload' && <UploadPage />}
      </main>
    </div>
  );
}

// 根组件
export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
