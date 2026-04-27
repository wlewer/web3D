// 3D翻页书查看器页面

import { Book3D } from '../../components/3d/Book';
import { useTranslation } from '../../i18n';
import './BookViewerPage.css';

type PageType = 'home' | 'gallery' | 'auth' | 'upload' | 'official-editor' | 'showcase' | 'book';

interface BookViewerPageProps {
  onNavigate?: (page: PageType) => void;
}

export function BookViewerPage({ onNavigate }: BookViewerPageProps) {
  const { t } = useTranslation();

  return (
    <div className="book-viewer-page">
      {/* 返回按钮 - 支持中英文 */}
      <button 
        className="back-button"
        onClick={() => onNavigate?.('home')}
      >
        ← {t.book.viewer.backToHome}
      </button>

      {/* 3D翻页书 */}
      <Book3D 
        totalPages={10}
        config={{
          width: 2,
          height: 2.8,
          flipDuration: 0.8,
        }}
      />
    </div>
  );
}

export default BookViewerPage;
