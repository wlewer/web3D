/**
 * ProgressiveLoader - 渐进加载
 *
 * 先加载低精度模型立即显示，后台加载高精度并无缝替换
 * - 使用Promise chain管理加载顺序
 * - 低精度加载完立即显示
 * - 高精度加载完用requestAnimationFrame切换
 */

import type { LODUrls, ProgressiveLoadCallbacks } from './types';
import { modelCache } from './ModelCache';

/** 加载中的模型状态 */
interface LoadingState {
  modelId: string;
  currentLevel: string | null;
  currentData: ArrayBuffer | null;
  abortController: AbortController | null;
}

export class ProgressiveLoader {
  private loadingStates = new Map<string, LoadingState>();
  private callbacks = new Map<string, ProgressiveLoadCallbacks>();

  /**
   * 渐进加载模型
   *
   * 加载顺序：low → medium → high
   * 每一级加载完成都会通知调用方
   */
  async loadProgressive(
    modelId: string,
    lodUrls: LODUrls,
    callbacks?: ProgressiveLoadCallbacks,
  ): Promise<void> {
    // 取消之前的加载
    this.cancel(modelId);

    const abortController = new AbortController();
    const state: LoadingState = {
      modelId,
      currentLevel: null,
      currentData: null,
      abortController,
    };
    this.loadingStates.set(modelId, state);

    if (callbacks) {
      this.callbacks.set(modelId, callbacks);
    }

    // 按优先级排序：先低精度，后高精度
    const loadOrder: Array<{ level: string; url: string | undefined }> = [
      { level: 'low', url: lodUrls.low },
      { level: 'medium', url: lodUrls.medium },
      { level: 'high', url: lodUrls.high },
    ];

    try {
      // 逐级加载，使用Promise chain
      await loadOrder.reduce(
        (chain, { level, url }) =>
          chain.then(async () => {
            // 检查是否已取消
            if (abortController.signal.aborted) return;

            if (!url) return; // 该级别没有URL则跳过

            const data = await this.fetchModel(url, abortController.signal);

            // 再次检查取消状态
            if (abortController.signal.aborted) return;

            // 更新状态
            state.currentLevel = level;
            state.currentData = data;

            // 写入缓存
            await modelCache.set(url, data);

            // 用requestAnimationFrame触发UI切换（避免在主线程阻塞时更新）
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => {
                const cbs = this.callbacks.get(modelId);
                if (!abortController.signal.aborted && cbs) {
                  if (level === 'low' || level === 'medium') {
                    cbs.onLowQualityLoaded?.();
                  } else if (level === 'high') {
                    cbs.onHighQualityLoaded?.();
                  }
                }
                resolve();
              });
            });
          }),
        Promise.resolve(),
      );
    } catch (err) {
      if (!abortController.signal.aborted) {
        const cbs = this.callbacks.get(modelId);
        cbs?.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this.loadingStates.delete(modelId);
      this.callbacks.delete(modelId);
    }
  }

  /**
   * 取消指定模型的加载
   */
  cancel(modelId: string): void {
    const state = this.loadingStates.get(modelId);
    if (state?.abortController) {
      state.abortController.abort();
    }
    this.loadingStates.delete(modelId);
    this.callbacks.delete(modelId);
  }

  /**
   * 获取当前加载级别
   */
  getCurrentLevel(modelId: string): string | null {
    return this.loadingStates.get(modelId)?.currentLevel ?? null;
  }

  /**
   * 获取当前加载的数据
   */
  getCurrentData(modelId: string): ArrayBuffer | null {
    return this.loadingStates.get(modelId)?.currentData ?? null;
  }

  /**
   * 取消所有加载
   */
  cancelAll(): void {
    for (const [modelId, state] of this.loadingStates) {
      state.abortController?.abort();
      this.loadingStates.delete(modelId);
      this.callbacks.delete(modelId);
    }
  }

  // ==================== 私有方法 ====================

  private async fetchModel(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
    // 先尝试从缓存获取
    const cached = await modelCache.get(url);
    if (cached) return cached;

    // 缓存未命中，发起网络请求
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${url} (status: ${response.status})`);
    }
    return response.arrayBuffer();
  }
}

/** 全局单例 */
export const progressiveLoader = new ProgressiveLoader();
