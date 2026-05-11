/**
 * 3D书籍画廊组件
 * 支持三种排列方式：单层环形、网格、多层圆柱体
 * 点击中间的书籍可以摊开展示左右两页内容
 */

import { useRef, useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from '../../../i18n';
import { formatMessage } from '../../../i18n';
import type { BookGalleryItem, GalleryConfig, LayoutMode, PageContentData } from '../../../types/book.types';
import { OpenBook } from '../Book/OpenBook';
import './BookGallery.css';

// 示例书籍页面内容数据
const BOOK_CONTENTS: Record<string, PageContentData[]> = {
  'book-1': [
    { pageNumber: 1, type: 'mixed', title: '自然探索', text: '大自然是人类最好的老师。从微小的昆虫到宏伟的山川，每一个生命都在讲述着属于自己的故事。', imageUrl: '', imageCaption: '图1: 美丽的自然景观', backgroundColor: '#f0f8ff' },
    { pageNumber: 2, type: 'text', title: '生态系统', text: '生态系统是生物群落与其非生物环境相互作用的整体。它包括生产者、消费者和分解者三个基本组成部分。', backgroundColor: '#f5f5f5' },
    { pageNumber: 3, type: 'image', title: '', imageUrl: '', imageCaption: '图2: 森林生态系统', backgroundColor: '#fff8dc' },
    { pageNumber: 4, type: 'mixed', title: '生物多样性', text: '生物多样性是地球上生命的多样性，包括遗传多样性、物种多样性和生态系统多样性。', imageUrl: '', imageCaption: '图3: 各种生物', backgroundColor: '#f0fff0' },
  ],
  'book-2': [
    { pageNumber: 1, type: 'mixed', title: '科技前沿', text: '科技创新正在改变我们的生活方式。人工智能、量子计算、生物技术等领域的突破层出不穷。', backgroundColor: '#e6f3ff' },
    { pageNumber: 2, type: 'text', title: '人工智能', text: 'AI技术正在快速发展，从机器学习到深度学习，从自然语言处理到计算机视觉，应用越来越广泛。', backgroundColor: '#f5f5f5' },
  ],
};

// 生成示例内容
function getPageContents(bookId: string, bookNumber: number): PageContentData[] {
  const predefined = BOOK_CONTENTS[bookId];
  if (predefined) return predefined;
  
  // 为其他书籍生成默认内容
  const contents: PageContentData[] = [];
  for (let i = 1; i <= 8; i += 2) {
    contents.push({
      pageNumber: i,
      type: i % 4 === 1 ? 'mixed' : 'text',
      title: `第${bookNumber}册 - 章节 ${Math.ceil(i / 2)}`,
      text: `这是第${bookNumber}册书的第${Math.ceil(i / 2)}章内容。在这里可以看到各种精彩的故事和知识。`,
      backgroundColor: ['#faf8f5', '#f0f8ff', '#fff8dc', '#f5f5f5'][i % 4],
    });
    contents.push({
      pageNumber: i + 1,
      type: i % 4 === 3 ? 'image' : 'mixed',
      title: '',
      imageUrl: '',
      imageCaption: `图${i}: 相关插图`,
      backgroundColor: ['#fff8dc', '#f0fff0', '#f5f5f5', '#faf8f5'][i % 4],
    });
  }
  return contents;
}

// 默认画廊配置
const DEFAULT_CONFIG: GalleryConfig = {
  layoutMode: 'circle-single', // 默认单层环形
  radius: 4,
  gridRows: 2,
  gridCols: 5,
  cylinderLayers: 2,
  autoRotateInterval: 4, // 每本书展示4秒
  popupDuration: 0.8,
  popupScale: 1.5,
};

// 默认书籍数据
const DEFAULT_BOOKS: BookGalleryItem[] = [
  { id: 'book-1', number: 1, title: '第一本书', subtitle: '自然探索', coverColor: '#ff6b6b', totalPages: 10 },
  { id: 'book-2', number: 2, title: '第二本书', subtitle: '科技前沿', coverColor: '#4ecdc4', totalPages: 8 },
  { id: 'book-3', number: 3, title: '第三本书', subtitle: '艺术鉴赏', coverColor: '#45b7d1', totalPages: 12 },
  { id: 'book-4', number: 4, title: '第四本书', subtitle: '历史长河', coverColor: '#f9ca24', totalPages: 15 },
  { id: 'book-5', number: 5, title: '第五本书', subtitle: '文学经典', coverColor: '#6c5ce7', totalPages: 10 },
  { id: 'book-6', number: 6, title: '第六本书', subtitle: '地理百科', coverColor: '#a29bfe', totalPages: 9 },
  { id: 'book-7', number: 7, title: '第七本书', subtitle: '物理世界', coverColor: '#fd79a8', totalPages: 11 },
  { id: 'book-8', number: 8, title: '第八本书', subtitle: '化学奥秘', coverColor: '#00b894', totalPages: 10 },
  { id: 'book-9', number: 9, title: '第九本书', subtitle: '生物世界', coverColor: '#e17055', totalPages: 13 },
  { id: 'book-10', number: 10, title: '第十本书', subtitle: '数学之美', coverColor: '#0984e3', totalPages: 10 },
];

// 单本书组件
// 辅助：根据颜色生成深色版本（用于渐变）
function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

interface BookItemProps {
  book: BookGalleryItem;
  position: [number, number, number];
  rotation: [number, number, number];
  isPopping: boolean;
  isPopup: boolean;
  popupProgress: number;
  onClick: () => void;
  config: GalleryConfig;
  getBookTitle: (titleKey?: string) => string;
  getBookSubtitle: (subtitleKey?: string) => string;
  t: any;
}

function BookItem({ book, position, rotation, isPopup, popupProgress, onClick, config, getBookTitle, getBookSubtitle }: BookItemProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // 计算当前位置和缩放
  const currentScale = isPopup ? 1 + popupProgress * (config.popupScale - 1) : 1;
  const currentPosition: [number, number, number] = isPopup
    ? [
        position[0],
        position[1] + popupProgress * 2.5,
        position[2] + popupProgress * 4,
      ]
    : position;

  // 获取书籍标题（支持i18n）
  const title = book.titleKey ? getBookTitle(book.titleKey) : (book.title || '');
  const subtitle = book.subtitleKey ? getBookSubtitle(book.subtitleKey) : (book.subtitle || '');

  // 用 Canvas 纹理绘制书本封面，完全不依赖字体加载
  const coverTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, book.coverColor);
    grad.addColorStop(1, shadeColor(book.coverColor, -40));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 384);

    // 装饰线条
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(20, 290); ctx.lineTo(236, 290); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(20, 298); ctx.lineTo(236, 298); ctx.stroke();

    // 编号（大字）
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(book.number), 128, 160);

    // 编号（清晰）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(String(book.number), 128, 155);

    // 标题
    if (title) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(title.slice(0, 10), 128, 315);
    }

    // 副标题
    if (subtitle) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '18px sans-serif';
      ctx.fillText(subtitle.slice(0, 12), 128, 348);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, [book.number, book.coverColor, title, subtitle]);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isPopup) {
      const bounce = popupProgress < 1
        ? Math.sin(popupProgress * Math.PI) * 0.3
        : Math.sin(state.clock.elapsedTime * 3) * 0.05;
      groupRef.current.position.y = currentPosition[1] + bounce;
      groupRef.current.position.z = currentPosition[2];
    }
    if (hovered && !isPopup) {
      groupRef.current.rotation.y = rotation[1] + Math.sin(state.clock.elapsedTime * 2) * 0.08;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group
      ref={groupRef}
      position={currentPosition}
      rotation={rotation}
      scale={currentScale}
      onClick={handleClick}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* 书籍正面（带封面纹理） */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.2, 0.15]} />
        <meshStandardMaterial
          color={hovered ? '#ffffff' : '#ffffff'}
          map={coverTexture}
          roughness={0.25}
          metalness={0.15}
          emissive={hovered ? book.coverColor : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>

      {/* 书脊 */}
      <mesh position={[-0.41, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.15, 1.2, 0.05]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.6} />
      </mesh>

      {/* 页面边缘 */}
      <mesh position={[0.41, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.15, 1.18, 0.02]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.9} />
      </mesh>

      {/* 悬浮时的光晕 */}
      {hovered && (
        <mesh position={[0, 0, -0.09]}>
          <planeGeometry args={[1.1, 1.5]} />
          <meshBasicMaterial
            color={book.coverColor}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

// 场景组件
interface GallerySceneProps {
  books: BookGalleryItem[];
  config: GalleryConfig;
  selectedBookId: string | null;
  onBookClick: (bookId: string) => void;
  onInteraction: () => void;
  getBookTitle: (titleKey?: string) => string;
  getBookSubtitle: (subtitleKey?: string) => string;
  t: any;
}

function GalleryScene({ books, config, selectedBookId, onBookClick, onInteraction, getBookTitle, getBookSubtitle, t }: GallerySceneProps) {
  const [autoRotateIndex, setAutoRotateIndex] = useState(-1);
  const [popupProgress, setPopupProgress] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const autoRotateTimerRef = useRef<number | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  // 根据排列方式计算位置
  const getBookPosition = (index: number, totalBooks: number): [number, number, number] => {
    const mode = config.layoutMode;
    
    if (mode === 'circle-single') {
      // 单层环形排列
      const angle = (index / totalBooks) * Math.PI * 2;
      const radius = config.radius || 4;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ];
    } else if (mode === 'grid') {
      // 网格排列
      const rows = config.gridRows || 2;
      const cols = config.gridCols || Math.ceil(totalBooks / rows);
      const row = Math.floor(index / cols);
      const col = index % cols;
      const spacingX = 2;
      const spacingZ = 2;
      return [
        (col - (cols - 1) / 2) * spacingX,
        0,
        (row - (rows - 1) / 2) * spacingZ,
      ];
    } else if (mode === 'cylinder') {
      // 圆柱体多层环绕
      const layers = config.cylinderLayers || 2;
      const booksPerLayer = Math.ceil(totalBooks / layers);
      const layer = Math.floor(index / booksPerLayer);
      const indexInLayer = index % booksPerLayer;
      const angle = (indexInLayer / booksPerLayer) * Math.PI * 2;
      const radius = config.radius || 3;
      const layerHeight = 2.5;
      return [
        Math.cos(angle) * radius,
        layer * layerHeight - ((layers - 1) * layerHeight) / 2,
        Math.sin(angle) * radius,
      ];
    }
    
    return [0, 0, 0];
  };

  // 计算每本书的旋转（朝向中心）
  const getBookRotation = (index: number, totalBooks: number): [number, number, number] => {
    const mode = config.layoutMode;
    
    if (mode === 'circle-single' || mode === 'cylinder') {
      const booksPerLayer = mode === 'cylinder' 
        ? Math.ceil(totalBooks / (config.cylinderLayers || 2))
        : totalBooks;
      const angle = ((index % booksPerLayer) / booksPerLayer) * Math.PI * 2;
      return [0, -angle + Math.PI / 2, 0];
    }
    
    return [0, 0, 0];
  };

  // 自动轮番弹出
  useEffect(() => {
    if (!isAutoRotating) {
      if (autoRotateTimerRef.current) {
        clearTimeout(autoRotateTimerRef.current);
      }
      return;
    }

    let currentIndex = 0;
    let isAnimating = false;
    
    const animateNextBook = () => {
      if (!isAutoRotating || isAnimating) return;
      isAnimating = true;
      
      // 设置当前展示的书籍
      setAutoRotateIndex(currentIndex);
      setPopupProgress(0);
      
      // 弹出动画
      let progress = 0;
      const animatePopup = () => {
        progress += 0.03;
        if (progress <= 1) {
          setPopupProgress(progress);
          popupTimerRef.current = requestAnimationFrame(animatePopup);
        } else {
          isAnimating = false;
          // 展示一段时间后收起并切换到下一本
          setTimeout(() => {
            if (!isAutoRotating) return;
            
            let closeProgress = 1;
            const animateClose = () => {
              closeProgress -= 0.03;
              if (closeProgress >= 0) {
                setPopupProgress(closeProgress);
                popupTimerRef.current = requestAnimationFrame(animateClose);
              } else {
                setAutoRotateIndex(-1);
                currentIndex = (currentIndex + 1) % books.length;
                // 延迟后展示下一本
                autoRotateTimerRef.current = window.setTimeout(animateNextBook, 500);
              }
            };
            popupTimerRef.current = requestAnimationFrame(animateClose);
          }, config.autoRotateInterval * 1000);
        }
      };
      popupTimerRef.current = requestAnimationFrame(animatePopup);
    };

    // 开始自动轮番
    autoRotateTimerRef.current = window.setTimeout(animateNextBook, 500);

    return () => {
      if (autoRotateTimerRef.current) {
        clearTimeout(autoRotateTimerRef.current);
      }
      if (popupTimerRef.current) {
        cancelAnimationFrame(popupTimerRef.current);
      }
    };
  }, [isAutoRotating, books.length, config]);

  // 点击书籍
  const handleBookClick = useCallback((bookId: string) => {
    setIsAutoRotating(false);
    onInteraction();
    onBookClick(bookId);
  }, [onBookClick, onInteraction]);

  return (
    <>
      {/* 星空背景 */}
      <Stars radius={80} depth={50} count={2000} factor={4} saturation={0} speed={1} />

      {/* 主环境光 */}
      <ambientLight intensity={0.8} color="#e8e0ff" />

      {/* 主光源 */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color="#ffffff"
      />

      {/* 补光 */}
      <directionalLight position={[-5, 3, -5]} intensity={0.8} color="#6366f1" />

      {/* 顶部暖光 */}
      <pointLight position={[0, 10, 0]} intensity={2} color="#ffffff" distance={25} />

      {/* 彩色环绕灯 */}
      <pointLight position={[8, 2, 0]} intensity={1.2} color="#667eea" distance={18} />
      <pointLight position={[-8, 2, 0]} intensity={1.2} color="#764ba2" distance={18} />

      {/* 摊开的书本（自动展示或手动选择） */}
      {(autoRotateIndex >= 0 || selectedBookId) && (() => {
        const displayBookIndex = selectedBookId ? books.findIndex(b => b.id === selectedBookId) : autoRotateIndex;
        const displayBook = books[displayBookIndex];
        if (!displayBook) return null;

        const progress = selectedBookId ? 1 : popupProgress;
        const pageContents = getPageContents(displayBook.id, displayBook.number);
        const currentPage = Math.floor(progress * (pageContents.length - 1));

        const openScale = 1.8 + progress * 0.4;
        const openY = 1.0;

        return (
          <group position={[0, openY, 0]} scale={openScale}>
            <Suspense fallback={null}>
              <OpenBook
                leftPage={pageContents[currentPage] || { pageNumber: 1, type: 'text', title: '', text: '', backgroundColor: '#faf8f5' }}
                rightPage={pageContents[currentPage + 1] || { pageNumber: 2, type: 'text', title: '', text: '', backgroundColor: '#f5f5f5' }}
                currentPage={currentPage + 1}
                visible={progress > 0.5}
                flipProgress={progress}
              />
            </Suspense>
          </group>
        );
      })()}

      {/* 书籍列表 */}
      {books.map((book, index) => {
        const isSelected = selectedBookId === book.id;
        const isAutoDisplaying = autoRotateIndex >= 0 && autoRotateIndex === index;
        const shouldHide = isAutoDisplaying && popupProgress > 0.1;

        if (shouldHide) return null;

        return (
          <BookItem
            key={book.id}
            book={book}
            position={getBookPosition(index, books.length)}
            rotation={getBookRotation(index, books.length)}
            isPopping={autoRotateIndex === index}
            isPopup={isSelected || (autoRotateIndex === index && popupProgress < 0.1)}
            popupProgress={
              isSelected
                ? 1
                : autoRotateIndex === index
                ? popupProgress
                : 0
            }
            onClick={() => handleBookClick(book.id)}
            config={config}
            getBookTitle={getBookTitle}
            getBookSubtitle={getBookSubtitle}
            t={t}
          />
        );
      })}

      {/* 反光地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#1a1a3e"
          roughness={0.2}
          metalness={0.8}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* 轨道控制 */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={18}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={!selectedBookId && autoRotateIndex < 0}
        autoRotateSpeed={0.5}
      />

    </>
  );
}

// 画廊主组件
interface BookGalleryProps {
  books?: BookGalleryItem[];
  config?: Partial<GalleryConfig>;
  onBookSelect?: (bookId: string) => void;
  onBack?: () => void;
  getBookTitle?: (titleKey: string) => string;
  getBookSubtitle?: (subtitleKey: string) => string;
}

export function BookGallery({ books = DEFAULT_BOOKS, config, onBookSelect, onBack, getBookTitle: getBookTitleProp, getBookSubtitle: getBookSubtitleProp }: BookGalleryProps) {
  const { t } = useTranslation();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('circle-single');

  const finalConfig = { ...DEFAULT_CONFIG, ...config, layoutMode };

  // 获取书籍标题（支持i18n）
  const getBookTitle = useCallback((titleKey?: string): string => {
    if (getBookTitleProp) {
      return getBookTitleProp(titleKey || '');
    }
    if (!titleKey) return '';
    const bookNum = titleKey.split('-')[1];
    return formatMessage(t.book.gallery.book, { n: bookNum });
  }, [getBookTitleProp, t]);

  // 获取书籍副标题（支持i18n）
  const getBookSubtitle = useCallback((subtitleKey?: string): string => {
    if (getBookSubtitleProp) {
      return getBookSubtitleProp(subtitleKey || '');
    }
    if (!subtitleKey) return '';
    const themes: Record<string, string> = {
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
    };
    return themes[subtitleKey] || subtitleKey;
  }, [getBookSubtitleProp, t]);

  const handleBookClick = (bookId: string) => {
    setSelectedBookId(bookId);
    onBookSelect?.(bookId);
  };

  const handleInteraction = () => {
    // 用户交互时停止自动轮换
  };

  return (
    <div className="book-gallery-container">
      {/* 顶部工具栏 */}
      <div className="gallery-toolbar">
        <button className="back-btn" onClick={onBack}>
          ← {t.book.gallery.backToHome}
        </button>
        <h1 className="gallery-title">📚 {t.book.gallery.title}</h1>
        <div className="gallery-info">
          <div className="layout-switcher">
            <button 
              className={`layout-btn ${layoutMode === 'circle-single' ? 'active' : ''}`}
              onClick={() => setLayoutMode('circle-single')}
            >
              Circle
            </button>
            <button 
              className={`layout-btn ${layoutMode === 'grid' ? 'active' : ''}`}
              onClick={() => setLayoutMode('grid')}
            >
              Grid
            </button>
            <button 
              className={`layout-btn ${layoutMode === 'cylinder' ? 'active' : ''}`}
              onClick={() => setLayoutMode('cylinder')}
            >
              Cylinder
            </button>
          </div>
          <span className="book-count">{books.length} {t.book.gallery.book.split('{{')[0] || 'books'}</span>
          {selectedBookId && (
            <span className="selected-info">
              {t.book.gallery.selectBook}: {getBookTitle(books.find(b => b.id === selectedBookId)?.titleKey)}
            </span>
          )}
        </div>
      </div>

      {/* 3D画廊画布 */}
      <div className="gallery-canvas">
        <Canvas
          camera={{ position: [0, 3, 10], fov: 55, near: 0.1, far: 200 }}
          shadows
          gl={{ antialias: true }}
        >
          {/* 背景色 */}
          <color attach="background" args={['#0a0a1e']} />

          <Suspense fallback={
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color="#667eea" />
            </mesh>
          }>
            <GalleryScene
              books={books}
              config={finalConfig}
              selectedBookId={selectedBookId}
              onBookClick={handleBookClick}
              onInteraction={handleInteraction}
              getBookTitle={getBookTitle}
              getBookSubtitle={getBookSubtitle}
              t={t}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 底部提示 */}
      <div className="gallery-hints">
        {selectedBookId ? (
          <>
            <span>📚 {t.book?.gallery?.autoPlay || 'Reading Mode'}</span>
            <span>🔄 360° View</span>
            <button className="close-book-btn" onClick={() => setSelectedBookId(null)}>
              ✕ {t.common.close}
            </button>
          </>
        ) : (
          <>
            <span>📖 {t.book?.gallery?.autoPlay || 'Auto Play'}</span>
            <span>⏱️ {Math.ceil(finalConfig.autoRotateInterval)}s</span>
            <span>🔄 Drag to rotate</span>
            <span> Click to view</span>
          </>
        )}
      </div>
    </div>
  );
}

export default BookGallery;
