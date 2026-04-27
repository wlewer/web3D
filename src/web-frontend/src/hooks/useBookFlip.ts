// 3D翻页书Hook

import { useState, useCallback, useRef } from 'react';
import type { UseBookFlipProps, UseBookFlipReturn } from '../types/book.types';
import { EasingFunctions } from '../utils/bookPhysics';

/**
 * 3D翻页书控制Hook（不含useFrame）
 */
export function useBookFlip({
  totalPages,
  flipDuration = 1.0,
  onPageChange,
}: UseBookFlipProps): Omit<UseBookFlipReturn, 'flipProgress'> & { 
  flipProgress: number;
  startFlip: (direction: 'next' | 'prev', targetPage: number) => void;
  updateFlip: (elapsedTime: number) => void;
} {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipProgress, setFlipProgress] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  
  const flipStartTime = useRef<number>(0);
  const targetPageRef = useRef<number>(0);
  const durationRef = useRef(flipDuration);

  // 开始翻页
  const startFlip = useCallback((direction: 'next' | 'prev', targetPage: number) => {
    setIsFlipping(true);
    setFlipDirection(direction);
    flipStartTime.current = performance.now() / 1000;
    targetPageRef.current = targetPage;
    durationRef.current = flipDuration;
  }, [flipDuration]);

  // 更新翻页进度（由外部在useFrame中调用）
  const updateFlip = useCallback((elapsedTime: number) => {
    if (!isFlipping) return;

    const elapsed = elapsedTime - flipStartTime.current;
    const progress = Math.min(elapsed / durationRef.current, 1);
    
    // 应用缓动函数
    const easedProgress = EasingFunctions.easeInOutCubic(progress);
    setFlipProgress(easedProgress);

    // 翻页完成
    if (progress >= 1) {
      setIsFlipping(false);
      setFlipProgress(0);
      setCurrentPage(targetPageRef.current);
      onPageChange?.(targetPageRef.current);
    }
  }, [isFlipping, onPageChange]);

  // 下一页
  const nextPage = useCallback(() => {
    if (isFlipping || currentPage >= totalPages - 1) return;
    startFlip('next', currentPage + 1);
  }, [isFlipping, currentPage, totalPages, startFlip]);

  // 上一页
  const prevPage = useCallback(() => {
    if (isFlipping || currentPage <= 0) return;
    startFlip('prev', currentPage - 1);
  }, [isFlipping, currentPage, startFlip]);

  // 跳转到指定页
  const goToPage = useCallback((page: number) => {
    if (isFlipping || page < 0 || page >= totalPages || page === currentPage) return;
    startFlip(page > currentPage ? 'next' : 'prev', page);
  }, [isFlipping, currentPage, totalPages, startFlip]);

  return {
    currentPage,
    totalPages,
    isFlipping,
    flipProgress,
    flipDirection,
    nextPage,
    prevPage,
    goToPage,
    startFlip,
    updateFlip,
  };
}
