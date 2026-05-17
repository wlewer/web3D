/**
 * AdaptiveQuality - 自适应质量
 *
 * 监控帧率并自动调整渲染质量
 * - 使用requestAnimationFrame计算滚动平均FPS（采样窗口30帧）
 * - FPS持续<30 → 降级（pixelRatio降低/关闭阴影/降低LOD）
 * - FPS持续>50 → 升级
 * - 防抖：升降级之间至少间隔3秒
 * - QualityLevel: 'ultra' | 'high' | 'medium' | 'low'
 */

import type { QualityLevel, AdaptiveQualityConfig } from './types';

const DEFAULT_CONFIG: AdaptiveQualityConfig = {
  downgradeThreshold: 30,
  upgradeThreshold: 50,
  sampleWindowSize: 30,
  debounceInterval: 3000,
};

/** 质量等级配置映射 */
const QUALITY_SETTINGS: Record<QualityLevel, {
  pixelRatio: number;
  shadows: boolean;
  lodBias: number;  // LOD偏移：正值倾向更高质量，负值倾向更低质量
  antialiasing: boolean;
}> = {
  ultra:  { pixelRatio: 2.0,  shadows: true,  lodBias: 1,  antialiasing: true  },
  high:   { pixelRatio: 1.5,  shadows: true,  lodBias: 0,  antialiasing: true  },
  medium: { pixelRatio: 1.0,  shadows: false, lodBias: -1, antialiasing: false },
  low:    { pixelRatio: 0.75, shadows: false, lodBias: -2, antialiasing: false },
};

/** 质量等级排序（从低到高） */
const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high', 'ultra'];

export class AdaptiveQuality {
  private config: AdaptiveQualityConfig;
  private currentQuality: QualityLevel = 'high';
  private frameTimestamps: number[] = [];
  private animationFrameId: number | null = null;
  private lastChangeTime = 0;
  private callbacks: Array<(level: QualityLevel) => void> = [];
  private running = false;

  constructor(config?: Partial<AdaptiveQualityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 启动自适应质量监控
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastChangeTime = performance.now();
    this.tick(performance.now());
  }

  /**
   * 停止自适应质量监控
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.frameTimestamps = [];
  }

  /**
   * 获取当前质量等级
   */
  getCurrentQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * 获取当前质量等级的详细设置
   */
  getQualitySettings(): typeof QUALITY_SETTINGS[QualityLevel] {
    return QUALITY_SETTINGS[this.currentQuality];
  }

  /**
   * 注册质量变化回调
   */
  onQualityChange(callback: (level: QualityLevel) => void): () => void {
    this.callbacks.push(callback);
    // 返回取消注册函数
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * 手动设置质量等级
   */
  setQuality(level: QualityLevel): void {
    if (this.currentQuality === level) return;
    this.currentQuality = level;
    this.lastChangeTime = performance.now();
    this.notifyCallbacks();
  }

  /**
   * 获取当前滚动平均FPS
   */
  getCurrentFPS(): number {
    return this.calculateFPS();
  }

  // ==================== 私有方法 ====================

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    // 记录帧时间戳
    this.frameTimestamps.push(timestamp);

    // 保持采样窗口大小
    if (this.frameTimestamps.length > this.config.sampleWindowSize) {
      this.frameTimestamps.shift();
    }

    // 当采样窗口填满时开始评估
    if (this.frameTimestamps.length >= this.config.sampleWindowSize) {
      this.evaluateQuality();
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private calculateFPS(): number {
    const timestamps = this.frameTimestamps;
    if (timestamps.length < 2) return 60; // 默认60fps

    const first = timestamps[0];
    const last = timestamps[timestamps.length - 1];
    const elapsed = last - first; // 毫秒

    if (elapsed <= 0) return 60;

    return (timestamps.length - 1) / (elapsed / 1000);
  }

  private evaluateQuality(): void {
    const now = performance.now();
    const fps = this.calculateFPS();

    // 防抖检查
    if (now - this.lastChangeTime < this.config.debounceInterval) return;

    const currentIndex = QUALITY_ORDER.indexOf(this.currentQuality);

    // FPS过低 → 降级
    if (fps < this.config.downgradeThreshold && currentIndex > 0) {
      this.currentQuality = QUALITY_ORDER[currentIndex - 1];
      this.lastChangeTime = now;
      this.notifyCallbacks();
      console.info(`[AdaptiveQuality] FPS=${fps.toFixed(1)} < ${this.config.downgradeThreshold}, downgrading to ${this.currentQuality}`);
    }
    // FPS充足 → 升级
    else if (fps > this.config.upgradeThreshold && currentIndex < QUALITY_ORDER.length - 1) {
      this.currentQuality = QUALITY_ORDER[currentIndex + 1];
      this.lastChangeTime = now;
      this.notifyCallbacks();
      console.info(`[AdaptiveQuality] FPS=${fps.toFixed(1)} > ${this.config.upgradeThreshold}, upgrading to ${this.currentQuality}`);
    }
  }

  private notifyCallbacks(): void {
    const level = this.currentQuality;
    for (const cb of this.callbacks) {
      try {
        cb(level);
      } catch (err) {
        console.error('[AdaptiveQuality] callback error:', err);
      }
    }
  }
}

/** 全局单例 */
export const adaptiveQuality = new AdaptiveQuality();
