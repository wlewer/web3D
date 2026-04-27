// 3D书本主组件

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useState, useCallback } from 'react';
import { useBookFlip } from '../../../hooks/useBookFlip';
import { Page } from './Page';
import type { BookConfig } from '../../../types/book.types';
import { useTranslation } from '../../../i18n';
import './Book3D.css';

interface Book3DProps {
  totalPages?: number;
  config?: BookConfig;
}

// 内部场景组件（在Canvas内部）
function BookScene({ 
  totalPages, 
  config,
  bookState 
}: { 
  totalPages: number;
  config: BookConfig;
  bookState: ReturnType<typeof useBookFlip>;
}) {
  const { updateFlip } = bookState;
  
  // 在Canvas内部使用useFrame
  useFrame((state) => {
    updateFlip(state.clock.elapsedTime);
  });

  // 生成示例页面
  const pages = Array.from({ length: totalPages }, (_, i) => ({
    id: `page-${i}`,
    frontContent: null,
    backContent: null,
  }));

  return (
    <group position={[0, 0, 0]}>
      {pages.map((page, index) => (
        <Page
          key={page.id}
          page={page}
          pageIndex={index}
          currentPage={bookState.currentPage}
          flipProgress={bookState.flipProgress}
          isFlipping={bookState.isFlipping}
          flipDirection={bookState.flipDirection}
          width={config.width || 2}
          height={config.height || 2.8}
        />
      ))}
    </group>
  );
}

export function Book3D({ totalPages = 10, config = {} }: Book3DProps) {
  const { t } = useTranslation();
  const bookState = useBookFlip({
    totalPages,
    flipDuration: config.flipDuration || 1.0,
  });

  const { nextPage, prevPage } = bookState;

  // 键盘控制
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      nextPage();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevPage();
    }
  }, [nextPage, prevPage]);

  useState(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="book3d-container">
      {/* 控制面板 */}
      <div className="book-controls">
        <button onClick={prevPage} disabled={bookState.currentPage === 0 || bookState.isFlipping}>
          ← {t.book?.viewer?.page?.replace('{{n}}', (bookState.currentPage).toString()) || 'Prev'}
        </button>
        <span className="page-indicator">
          {bookState.currentPage + 1} {t.book?.viewer?.of || 'of'} {totalPages}
        </span>
        <button onClick={nextPage} disabled={bookState.currentPage >= totalPages - 1 || bookState.isFlipping}>
          {t.book?.viewer?.page?.replace('{{n}}', (bookState.currentPage + 2).toString()) || 'Next'} →
        </button>
      </div>

      {/* 3D场景 */}
      <Canvas camera={{ position: [0, 2, 6], fov: 50 }}>
        {/* 环境光 */}
        <ambientLight intensity={0.4} />
        
        {/* 主光源 - 从右上方照射 */}
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.2}
          castShadow
        />
        
        {/* 补光 - 从左下方 */}
        <directionalLight 
          position={[-5, -2, -5]} 
          intensity={0.5}
        />
        
        {/* 边缘光 - 增强立体感 */}
        <pointLight position={[0, 5, -5]} intensity={0.8} color="#ffecd2" />
        
        {/* Environment组件可能导致HDR加载失败，暂时禁用 */}
        {/* <Environment preset="studio" /> */}
        
        <BookScene 
          totalPages={totalPages}
          config={config}
          bookState={bookState}
        />
        
        <OrbitControls 
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* 操作提示 - 支持中英文 */}
      <div className="book-hints">
        <p>💡 {t.viewer?.dragRotate || 'Use ← → arrow keys or space to flip'}</p>
        <p>🖱️ {t.viewer?.scrollZoom || 'Drag to rotate, scroll to zoom'}</p>
      </div>
    </div>
  );
}
