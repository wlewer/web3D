/**
 * PreloadQueue - 预加载队列
 *
 * 基于可见性的优先级预加载系统
 * - IntersectionObserver监听元素可见性
 * - 优先级队列（数值越大越优先）
 * - 并发限制（默认最多3个并发加载）
 * - 可见元素最高优先级，即将可见（rootMargin扩展200px）次之
 */

import type { PreloadEntry } from './types';
import { modelCache } from './ModelCache';

/** 预加载队列配置 */
interface PreloadQueueConfig {
  /** 最大并发加载数，默认3 */
  maxConcurrent: number;
  /** IntersectionObserver rootMargin，默认'200px' */
  rootMargin: string;
}

const DEFAULT_CONFIG: PreloadQueueConfig = {
  maxConcurrent: 3,
  rootMargin: '200px',
};

/** 队列中的加载任务 */
interface QueueTask {
  modelUrl: string;
  priority: number;
  isVisible: boolean;
  resolve: (data: ArrayBuffer) => void;
  reject: (error: Error) => void;
}

export class PreloadQueue {
  private config: PreloadQueueConfig;
  private entries = new Map<HTMLElement, PreloadEntry>();
  private observer: IntersectionObserver | null = null;
  private queue: QueueTask[] = [];
  private activeCount = 0;

  constructor(config?: Partial<PreloadQueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initObserver();
  }

  /**
   * 注册元素进行可见性观察和预加载
   */
  observe(element: HTMLElement, modelUrl: string, priority = 0): void {
    // 如果已存在，先取消
    if (this.entries.has(element)) {
      this.unobserve(element);
    }

    const entry: PreloadEntry = {
      element,
      modelUrl,
      priority,
      isVisible: false,
    };
    this.entries.set(element, entry);

    // 开始观察可见性
    this.observer?.observe(element);
  }

  /**
   * 取消观察指定元素
   */
  unobserve(element: HTMLElement): void {
    this.observer?.unobserve(element);
    this.entries.delete(element);

    // 从队列中移除该元素的加载任务
    this.queue = this.queue.filter(
      (task) => !Array.from(this.entries.values()).some(
        (e) => e.modelUrl === task.modelUrl,
      ) || this.entries.size === 0,
    );
  }

  /**
   * 手动触发加载（绕过队列，直接加载）
   */
  async loadNow(modelUrl: string): Promise<ArrayBuffer> {
    // 先查缓存
    const cached = await modelCache.get(modelUrl);
    if (cached) return cached;

    // 直接fetch
    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(`PreloadQueue: fetch failed for ${modelUrl}`);
    }
    const data = await response.arrayBuffer();
    await modelCache.set(modelUrl, data);
    return data;
  }

  /**
   * 获取当前队列状态
   */
  getStats(): { pending: number; active: number; observed: number } {
    return {
      pending: this.queue.length,
      active: this.activeCount,
      observed: this.entries.size,
    };
  }

  /**
   * 销毁预加载队列
   */
  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.entries.clear();
    this.queue = [];
    this.activeCount = 0;
  }

  // ==================== 私有方法 ====================

  private initObserver(): void {
    // 检查IntersectionObserver是否可用
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('PreloadQueue: IntersectionObserver not available, preloading disabled');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: this.config.rootMargin,
        threshold: 0,
      },
    );
  }

  private handleIntersection(intersectionEntries: IntersectionObserverEntry[]): void {
    for (const ie of intersectionEntries) {
      const entry = this.entries.get(ie.target as HTMLElement);
      if (!entry) continue;

      const wasVisible = entry.isVisible;
      entry.isVisible = ie.isIntersecting;

      // 元素变为可见时，提升其加载优先级并加入队列
      if (!wasVisible && ie.isIntersecting) {
        this.enqueueLoad(entry.modelUrl, entry.priority + 1000, true);
      }
      // 元素在rootMargin范围内（即将可见），中等优先级
      else if (!ie.isIntersecting && ie.intersectionRatio === 0) {
        // 检查是否在rootMargin范围内（边缘区域）
        this.enqueueLoad(entry.modelUrl, entry.priority + 500, false);
      }
    }
  }

  private enqueueLoad(modelUrl: string, priority: number, isVisible: boolean): void {
    // 检查是否已在队列中
    const existing = this.queue.find((t) => t.modelUrl === modelUrl);
    if (existing) {
      // 更新优先级（取更高值）
      existing.priority = Math.max(existing.priority, priority);
      existing.isVisible = isVisible;
      return;
    }

    // 创建Promise用于跟踪
    const taskPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      this.queue.push({ modelUrl, priority, isVisible, resolve, reject });
    });

    // 按优先级排序（降序：高优先级在前）
    this.queue.sort((a, b) => {
      // 可见的优先
      if (a.isVisible !== b.isVisible) return a.isVisible ? -1 : 1;
      // 优先级数值大的优先
      return b.priority - a.priority;
    });

    // 尝试执行下一个任务
    void taskPromise;
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeCount < this.config.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeCount++;
      this.executeTask(task)
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.activeCount--;
          this.processQueue();
        });
    }
  }

  private async executeTask(task: QueueTask): Promise<ArrayBuffer> {
    // 先查缓存
    const cached = await modelCache.get(task.modelUrl);
    if (cached) return cached;

    // 发起网络请求
    try {
      const response = await fetch(task.modelUrl);
      if (!response.ok) {
        throw new Error(`PreloadQueue: fetch failed for ${task.modelUrl} (status: ${response.status})`);
      }
      const data = await response.arrayBuffer();
      await modelCache.set(task.modelUrl, data);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

/** 全局单例 */
export const preloadQueue = new PreloadQueue();
