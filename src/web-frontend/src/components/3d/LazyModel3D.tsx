/**
 * LazyModel3D - 懒加载3D模型组件
 *
 * 集成所有优化能力的3D模型懒加载组件
 * - IntersectionObserver触发加载
 * - 加载前显示骨架屏（Skeleton with 3D icon）
 * - 集成PreloadQueue/ProgressiveLoader/AdaptiveQuality/ModelCache
 * - 提供加载状态回调
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { LODUrls, LoadState, QualityLevel } from '@/core/3d/optimization/types';
import { progressiveLoader } from '@/core/3d/optimization/ProgressiveLoader';
import { preloadQueue } from '@/core/3d/optimization/PreloadQueue';
import { adaptiveQuality } from '@/core/3d/optimization/AdaptiveQuality';
import { modelCache } from '@/core/3d/optimization/ModelCache';

// ==================== Props ====================

export interface LazyModel3DProps {
  /** 模型唯一ID */
  modelId: string;
  /** 模型URL（主URL，用作fallback） */
  modelUrl: string;
  /** LOD URL集合 */
  lodUrls?: { high?: string; medium?: string; low?: string };
  /** 容器宽度 */
  width?: string | number;
  /** 容器高度 */
  height?: string | number;
  /** 自定义骨架屏 */
  placeholder?: React.ReactNode;
  /** 启用LOD选级，默认true */
  enableLOD?: boolean;
  /** 启用模型缓存，默认true */
  enableCache?: boolean;
  /** 启用自适应质量，默认false（需3D渲染器配合） */
  enableAdaptive?: boolean;
  /** 预加载优先级（数值越大越优先），默认0 */
  priority?: number;
  /** 加载状态变化回调 */
  onStateChange?: (state: LoadState) => void;
  /** 模型数据加载完成回调 */
  onLoad?: (data: ArrayBuffer) => void;
  /** 加载错误回调 */
  onError?: (error: Error) => void;
  /** 自定义CSS类名 */
  className?: string;
  /** 自定义CSS样式 */
  style?: React.CSSProperties;
}

// ==================== 骨架屏组件 ====================

const Skeleton3D: React.FC<{ width: string; height: string }> = ({ width, height }) => (
  <div
    style={{
      width,
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* 3D图标 */}
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
      <path d="M12 12L20 7.5" />
      <path d="M12 12V21" />
      <path d="M12 12L4 7.5" />
    </svg>

    {/* 加载动画 - 旋转光效 */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        animation: 'lazy3d-shimmer 2s infinite',
      }}
    />

    <style>{`
      @keyframes lazy3d-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

// ==================== 主组件 ====================

export const LazyModel3D: React.FC<LazyModel3DProps> = ({
  modelId,
  modelUrl,
  lodUrls,
  width = '100%',
  height = '300px',
  placeholder,
  enableLOD = true,
  enableCache = true,
  enableAdaptive = false,
  priority = 0,
  onStateChange,
  onLoad,
  onError,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>('high');

  // LOD选择器（当enableLOD时使用）
  // const tier = lodSelector.getDeviceTier();
  // const selection = lodSelector.selectLOD(distance, tier, effectiveLODUrls);
  const formattedWidth = typeof width === 'number' ? `${width}px` : width;
  const formattedHeight = typeof height === 'number' ? `${height}px` : height;

  // 构建LODUrls
  const effectiveLODUrls: LODUrls = useMemo(() => {
    if (!lodUrls) {
      // 没有LOD URL，主URL作为high级别
      return { high: modelUrl };
    }
    return {
      high: lodUrls.high ?? modelUrl,
      medium: lodUrls.medium,
      low: lodUrls.low,
    };
  }, [lodUrls, modelUrl]);

  // 更新加载状态
  const updateState = useCallback((newState: LoadState) => {
    setLoadState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  // 加载模型
  const loadModel = useCallback(async () => {
    if (loadState === 'loading' || loadState === 'loaded') return;

    updateState('loading');

    try {
      // 1. 尝试缓存获取
      if (enableCache) {
        const cached = await modelCache.get(modelUrl);
        if (cached) {
          setModelData(cached);
          updateState('loaded');
          onLoad?.(cached);
          return;
        }
      }

      // 2. 如果有LOD URL，使用渐进加载
      if (enableLOD && (effectiveLODUrls.low || effectiveLODUrls.medium)) {
        await progressiveLoader.loadProgressive(modelId, effectiveLODUrls, {
          onLowQualityLoaded: () => {
            const data = progressiveLoader.getCurrentData(modelId);
            if (data) {
              setModelData(data);
              updateState('loaded');
              onLoad?.(data);
            }
          },
          onHighQualityLoaded: () => {
            const data = progressiveLoader.getCurrentData(modelId);
            if (data) {
              setModelData(data);
              onLoad?.(data);
            }
          },
          onError: (err) => {
            onError?.(err);
          },
        });
      } else {
        // 3. 无LOD，直接加载主URL
        const data = await preloadQueue.loadNow(modelUrl);
        setModelData(data);
        updateState('loaded');
        onLoad?.(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState('error');
      onError?.(error);
    }
  }, [loadState, modelId, modelUrl, enableLOD, enableCache, effectiveLODUrls, updateState, onLoad, onError]);

  // IntersectionObserver - 触发加载
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === 'undefined') {
      // 无IntersectionObserver时直接加载
      void loadModel();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadModel();
            observer.disconnect();
          }
        }
      },
      { rootMargin: '200px', threshold: 0 },
    );

    observer.observe(container);

    // 注册预加载队列
    preloadQueue.observe(container, modelUrl, priority);

    return () => {
      observer.disconnect();
      if (container) {
        preloadQueue.unobserve(container);
      }
    };
  }, [loadModel, modelUrl, priority]);

  // 自适应质量监控
  useEffect(() => {
    if (!enableAdaptive) return;

    const unsubscribe = adaptiveQuality.onQualityChange((level) => {
      setQualityLevel(level);
    });

    adaptiveQuality.start();

    return () => {
      unsubscribe();
      adaptiveQuality.stop();
    };
  }, [enableAdaptive]);

  // 清理：组件卸载时取消加载
  useEffect(() => {
    return () => {
      progressiveLoader.cancel(modelId);
    };
  }, [modelId]);

  // 渲染骨架屏
  const renderPlaceholder = () => {
    if (placeholder) return placeholder;
    return <Skeleton3D width="100%" height="100%" />;
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: formattedWidth,
        height: formattedHeight,
        position: 'relative',
        ...style,
      }}
      data-model-id={modelId}
      data-load-state={loadState}
      data-quality-level={enableAdaptive ? qualityLevel : undefined}
    >
      {/* 加载中/空闲 → 显示骨架屏 */}
      {(loadState === 'idle' || loadState === 'loading') && renderPlaceholder()}

      {/* 加载完成 → 渲染子内容（由外部通过render prop或children消费modelData） */}
      {loadState === 'loaded' && modelData && (
        <div
          style={{ width: '100%', height: '100%' }}
          data-model-ready="true"
        >
          {/* 模型数据已就绪，外部组件可读取modelData渲染3D场景 */}
        </div>
      )}

      {/* 加载错误 */}
      {loadState === 'error' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            borderRadius: '12px',
            color: '#ff6b6b',
            fontSize: '14px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: '8px' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          加载失败
        </div>
      )}

      {/* 加载指示器 */}
      {loadState === 'loading' && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '20px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '12px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#4dabf7',
              borderRadius: '50%',
              animation: 'lazy3d-spin 0.8s linear infinite',
            }}
          />
          加载中...
          <style>{`
            @keyframes lazy3d-spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default LazyModel3D;
