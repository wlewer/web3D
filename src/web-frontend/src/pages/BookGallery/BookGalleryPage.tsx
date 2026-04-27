/**
 * 3D书籍画廊页面
 * 展示10本书，支持自动轮番弹出、点击放大、360度旋转
 */

import { BookGallery } from '../../components/3d';
import { useTranslation } from '../../i18n';
import type { BookGalleryItem } from '../../types/book.types';
import { formatMessage } from '../../i18n';

interface BookGalleryPageProps {
  onNavigate?: (page: string) => void;
}

export function BookGalleryPage({ onNavigate }: BookGalleryPageProps) {
  const { t, language } = useTranslation();

  // 根据当前语言获取书籍主题翻译
  const getBookTheme = (themeKey: string): string => {
    const themes: Record<string, Record<string, string>> = {
      'zh-CN': {
        '自然探索': t.book.gallery.nature,
        '科技前沿': t.book.gallery.tech,
        '艺术鉴赏': t.book.gallery.art,
        '历史长河': t.book.gallery.history,
        '文学经典': t.book.gallery.literature,
        '地理百科': t.book.gallery.geography,
        '物理世界': t.book.gallery.physics,
        '化学奥秘': t.book.gallery.chemistry,
        '生物世界': t.book.gallery.biology,
        '数学之美': t.book.gallery.math,
      },
      'en-US': {
        '自然探索': t.book.gallery.nature,
        '科技前沿': t.book.gallery.tech,
        '艺术鉴赏': t.book.gallery.art,
        '历史长河': t.book.gallery.history,
        '文学经典': t.book.gallery.literature,
        '地理百科': t.book.gallery.geography,
        '物理世界': t.book.gallery.physics,
        '化学奥秘': t.book.gallery.chemistry,
        '生物世界': t.book.gallery.biology,
        '数学之美': t.book.gallery.math,
      },
    };
    return themes[language]?.[themeKey] || themeKey;
  };

  // 书籍数据 - 支持中英文
  const BOOKS: BookGalleryItem[] = [
    { id: 'book-1', number: 1, titleKey: 'book-1', subtitleKey: '自然探索', coverColor: '#ff6b6b', totalPages: 10 },
    { id: 'book-2', number: 2, titleKey: 'book-2', subtitleKey: '科技前沿', coverColor: '#4ecdc4', totalPages: 8 },
    { id: 'book-3', number: 3, titleKey: 'book-3', subtitleKey: '艺术鉴赏', coverColor: '#45b7d1', totalPages: 12 },
    { id: 'book-4', number: 4, titleKey: 'book-4', subtitleKey: '历史长河', coverColor: '#f9ca24', totalPages: 15 },
    { id: 'book-5', number: 5, titleKey: 'book-5', subtitleKey: '文学经典', coverColor: '#6c5ce7', totalPages: 10 },
    { id: 'book-6', number: 6, titleKey: 'book-6', subtitleKey: '地理百科', coverColor: '#a29bfe', totalPages: 9 },
    { id: 'book-7', number: 7, titleKey: 'book-7', subtitleKey: '物理世界', coverColor: '#fd79a8', totalPages: 11 },
    { id: 'book-8', number: 8, titleKey: 'book-8', subtitleKey: '化学奥秘', coverColor: '#00b894', totalPages: 10 },
    { id: 'book-9', number: 9, titleKey: 'book-9', subtitleKey: '生物世界', coverColor: '#e17055', totalPages: 13 },
    { id: 'book-10', number: 10, titleKey: 'book-10', subtitleKey: '数学之美', coverColor: '#0984e3', totalPages: 10 },
  ];

  // 获取书籍标题（根据语言）
  const getBookTitle = (titleKey: string): string => {
    const bookNum = titleKey.split('-')[1];
    return formatMessage(t.book.gallery.book, { n: bookNum });
  };

  // 处理书籍选择
  const handleBookSelect = (bookId: string) => {
    console.log('Selected book:', bookId);
    // 这里可以跳转到书籍详情页
  };

  // 返回处理
  const handleBack = () => {
    onNavigate?.('home');
  };

  return (
    <BookGallery
      books={BOOKS}
      onBookSelect={handleBookSelect}
      onBack={handleBack}
      getBookTitle={getBookTitle}
      getBookSubtitle={getBookTheme}
    />
  );
}

export default BookGalleryPage;
