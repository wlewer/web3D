/**
 * 3D优化体系 - 统一导出入口
 *
 * 所有优化模块的集中导出，提供简洁的导入路径
 */

// ==================== 类型导出 ====================
export type {
  DeviceTier,
  QualityLevel,
  LODLevel,
  LODUrls,
  LODThresholdConfig,
  LODSelection,
  CacheStats,
  CacheEntry,
  PerformanceMetrics,
  LoadState,
  AdaptiveQualityConfig,
  PreloadEntry,
  ProgressiveLoadCallbacks,
} from './types';

// ==================== 模块导出 ====================

// LOD自动选级
export { LODSelector, lodSelector } from './LODSelector';

// 渐进加载
export { ProgressiveLoader, progressiveLoader } from './ProgressiveLoader';

// 预加载队列
export { PreloadQueue, preloadQueue } from './PreloadQueue';

// 自适应质量
export { AdaptiveQuality, adaptiveQuality } from './AdaptiveQuality';

// 模型缓存
export { ModelCache, modelCache } from './ModelCache';

// 性能监控
export { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
