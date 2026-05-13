/**
 * GlobalModelCache - 全局模型缓存（跨组件实例共享）
 * 
 * 功能：同一模型URL在不同组件间切换时，避免重复HTTP下载
 * - SPZ（SplatMesh）：直接复用GPU对象，通过SparkRenderer的add/remove安全切换
 * - GLB/PLY（Object3D）：暂不缓存完整Object3D（跨场景冲突），依赖各组件局部缓存
 * - LRU淘汰：最多30条
 */
import { SplatMesh } from '@sparkjsdev/spark';

type CachedModel = SplatMesh;

class GlobalModelCache {
  private cache = new Map<string, CachedModel>();

  /**
   * 获取缓存
   */
  get(url: string): CachedModel | undefined {
    return this.cache.get(url);
  }

  /**
   * 存入缓存（LRU淘汰）
   */
  set(url: string, model: CachedModel): void {
    if (this.cache.size >= 30) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const evicted = this.cache.get(firstKey);
        try { (evicted as any)?.dispose?.(); } catch { /* ignore */ }
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(url, model);
  }

  /**
   * 检查是否存在
   */
  has(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * 删除指定缓存
   */
  delete(url: string): boolean {
    return this.cache.delete(url);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.forEach((model) => {
      try { (model as any)?.dispose?.(); } catch { /* ignore */ }
    });
    this.cache.clear();
  }

  /**
   * 当前缓存数量
   */
  get size(): number {
    return this.cache.size;
  }
}

/** 全局单例 */
export const globalModelCache = new GlobalModelCache();
