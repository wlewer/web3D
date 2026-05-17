/**
 * LODSelector - LOD自动选级
 *
 * 根据相机距离和设备性能等级，自动选择最合适的LOD级别
 * - 高端设备：近距离→high，远距离→medium
 * - 中端设备：近距离→medium，远距离→low
 * - 低端设备：近距离→medium，远距离→low
 * - 距离阈值可配置
 */

import type { DeviceTier, LODLevel, LODUrls, LODThresholdConfig, LODSelection } from './types';

/** 默认距离阈值 */
const DEFAULT_THRESHOLDS: LODThresholdConfig = {
  nearDistance: 10,   // 10米以内算近距离
  farDistance: 30,    // 30米以外算远距离
};

/** 设备等级→距离区域→LOD级别 映射表 */
const LOD_MAP: Record<DeviceTier, { near: LODLevel; mid: LODLevel; far: LODLevel }> = {
  high:   { near: 'high',   mid: 'medium', far: 'medium' },
  medium: { near: 'medium', mid: 'medium', far: 'low'    },
  low:    { near: 'medium', mid: 'low',    far: 'low'    },
};

export class LODSelector {
  private thresholds: LODThresholdConfig;
  private cachedTier: DeviceTier | null = null;

  constructor(thresholds?: Partial<LODThresholdConfig>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * 根据相机距离和设备性能选择LOD
   */
  selectLOD(distance: number, deviceTier: DeviceTier, lodUrls: LODUrls): LODSelection {
    const zone = this.getDistanceZone(distance);
    const level = LOD_MAP[deviceTier][zone];

    // 如果目标LOD没有URL，尝试降级
    const resolvedLevel = this.resolveAvailableLevel(level, lodUrls);
    const url = this.getUrlForLevel(resolvedLevel, lodUrls);

    return {
      level: resolvedLevel,
      url,
      reason: `distance=${distance.toFixed(1)}m, zone=${zone}, tier=${deviceTier}, resolved=${resolvedLevel}`,
    };
  }

  /**
   * 静态方法：检测设备性能等级
   * 基于硬件并发数、设备内存、GPU渲染能力综合判断
   */
  static detectDeviceTier(): DeviceTier {
    // 1. 检查硬件并发数
    const cores = navigator.hardwareConcurrency ?? 4;

    // 2. 检查设备内存（Safari不支持）
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;

    // 3. WebGL渲染器检测
    let glRenderer = '';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          glRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '';
        }
      }
    } catch { /* ignore */ }

    // 4. 综合评分
    let score = 0;
    if (cores >= 8) score += 2;
    else if (cores >= 4) score += 1;

    if (memory >= 8) score += 2;
    else if (memory >= 4) score += 1;

    // 高端GPU关键词
    const highEndKeywords = ['nvidia', 'radeon', 'geforce', 'rtx', 'rx 6', 'rx 7', 'apple m', 'apple gpu'];
    const lowEndKeywords = ['mali-4', 'adreno 3', 'powervr sgx', 'intel hd graphics', 'swiftshader'];
    const lowerRenderer = glRenderer.toLowerCase();

    if (highEndKeywords.some(kw => lowerRenderer.includes(kw))) score += 2;
    else if (lowEndKeywords.some(kw => lowerRenderer.includes(kw))) score -= 1;

    // 5. 移动设备降级
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile) score -= 1;

    // 6. 分级
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * 获取缓存的设备等级（只检测一次）
   */
  getDeviceTier(): DeviceTier {
    if (!this.cachedTier) {
      this.cachedTier = LODSelector.detectDeviceTier();
    }
    return this.cachedTier;
  }

  /**
   * 更新距离阈值
   */
  setThresholds(thresholds: Partial<LODThresholdConfig>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  // ==================== 私有方法 ====================

  private getDistanceZone(distance: number): 'near' | 'mid' | 'far' {
    if (distance < this.thresholds.nearDistance) return 'near';
    if (distance > this.thresholds.farDistance) return 'far';
    return 'mid';
  }

  /**
   * 如果目标LOD没有URL，依次降级
   */
  private resolveAvailableLevel(preferred: LODLevel, lodUrls: LODUrls): LODLevel {
    const fallbackOrder: LODLevel[] = ['high', 'medium', 'low'];
    const startIndex = fallbackOrder.indexOf(preferred);

    for (let i = startIndex; i < fallbackOrder.length; i++) {
      if (this.getUrlForLevel(fallbackOrder[i], lodUrls)) {
        return fallbackOrder[i];
      }
    }

    // 如果降级也找不到，尝试升级
    for (let i = startIndex - 1; i >= 0; i--) {
      if (this.getUrlForLevel(fallbackOrder[i], lodUrls)) {
        return fallbackOrder[i];
      }
    }

    return preferred; // 都没有则返回原始偏好
  }

  private getUrlForLevel(level: LODLevel, lodUrls: LODUrls): string {
    return lodUrls[level] ?? '';
  }
}

/** 全局单例 */
export const lodSelector = new LODSelector();
