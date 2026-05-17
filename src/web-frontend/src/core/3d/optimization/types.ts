/**
 * 3D优化体系 - 共享类型定义
 *
 * 所有优化模块的公共类型集中定义，避免循环依赖
 */

// ==================== 设备与质量等级 ====================

/** 设备性能等级 */
export type DeviceTier = 'high' | 'medium' | 'low';

/** 渲染质量等级 */
export type QualityLevel = 'ultra' | 'high' | 'medium' | 'low';

/** LOD级别 */
export type LODLevel = 'high' | 'medium' | 'low';

// ==================== LOD相关 ====================

/** LOD URL集合 */
export interface LODUrls {
  high?: string;
  medium?: string;
  low?: string;
}

/** LOD距离阈值配置 */
export interface LODThresholdConfig {
  /** 近距离阈值（米），低于此值按设备等级选high/medium */
  nearDistance: number;
  /** 远距离阈值（米），高于此值按设备等级选medium/low */
  farDistance: number;
}

/** LOD选级结果 */
export interface LODSelection {
  level: LODLevel;
  url: string;
  reason: string;
}

// ==================== 缓存相关 ====================

/** 缓存统计信息 */
export interface CacheStats {
  /** 缓存条目数 */
  count: number;
  /** 总占用空间（字节） */
  totalSize: number;
  /** 最大容量（字节） */
  maxSize: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
}

/** 缓存条目元数据 */
export interface CacheEntry {
  url: string;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

// ==================== 性能监控相关 ====================

/** 性能指标 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
}

// ==================== 加载状态 ====================

/** 模型加载状态 */
export type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

// ==================== 自适应质量配置 ====================

/** 自适应质量配置 */
export interface AdaptiveQualityConfig {
  /** 降级FPS阈值，默认30 */
  downgradeThreshold: number;
  /** 升级FPS阈值，默认50 */
  upgradeThreshold: number;
  /** 采样窗口大小（帧数），默认30 */
  sampleWindowSize: number;
  /** 升降级防抖间隔（毫秒），默认3000 */
  debounceInterval: number;
}

// ==================== 预加载相关 ====================

/** 预加载队列条目 */
export interface PreloadEntry {
  element: HTMLElement;
  modelUrl: string;
  priority: number;
  isVisible: boolean;
}

// ==================== 渐进加载回调 ====================

/** 渐进加载进度回调 */
export interface ProgressiveLoadCallbacks {
  onLowQualityLoaded?: () => void;
  onHighQualityLoaded?: () => void;
  onError?: (error: Error) => void;
}
