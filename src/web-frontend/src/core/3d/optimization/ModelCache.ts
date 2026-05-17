/**
 * ModelCache - 模型缓存
 *
 * 基于IndexedDB的持久化模型缓存系统
 * - 使用IndexedDB存储（原生API，无第三方依赖）
 * - LRU淘汰（默认最大缓存200MB）
 * - 按URL的hash作为key
 * - 缓存元数据：大小、时间、访问次数
 * - Safari隐私模式降级为内存缓存
 */

import type { CacheStats, CacheEntry } from './types';

const DB_NAME = 'web3d-model-cache';
const DB_VERSION = 1;
const STORE_DATA = 'model-data';
const STORE_META = 'model-meta';
const DEFAULT_MAX_SIZE = 200 * 1024 * 1024; // 200MB

/** 简单哈希函数 */
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 转为32位整数
  }
  return `model_${Math.abs(hash).toString(36)}`;
}

export class ModelCache {
  private db: IDBDatabase | null = null;
  private maxCacheSize: number;
  private memoryFallback = new Map<string, { data: ArrayBuffer; meta: CacheEntry }>();
  private useIndexedDB = true;
  private stats = { hits: 0, misses: 0 };
  private initPromise: Promise<void> | null = null;

  constructor(maxCacheSize = DEFAULT_MAX_SIZE) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * 获取缓存数据
   */
  async get(url: string): Promise<ArrayBuffer | null> {
    await this.ensureInit();
    const key = hashUrl(url);

    if (!this.useIndexedDB) {
      const entry = this.memoryFallback.get(key);
      if (entry) {
        entry.meta.lastAccessedAt = Date.now();
        entry.meta.accessCount++;
        this.stats.hits++;
        return entry.data.slice(0); // 返回副本
      }
      this.stats.misses++;
      return null;
    }

    try {
      const meta = await this.getMeta(key);
      if (!meta) {
        this.stats.misses++;
        return null;
      }

      // 更新访问元数据
      meta.lastAccessedAt = Date.now();
      meta.accessCount++;
      await this.putMeta(key, meta);

      // 获取数据
      const data = await this.getData(key);
      this.stats.hits++;
      return data;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 存入缓存
   */
  async set(url: string, data: ArrayBuffer): Promise<void> {
    await this.ensureInit();
    const key = hashUrl(url);
    const size = data.byteLength;
    const meta: CacheEntry = {
      url,
      size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
    };

    if (!this.useIndexedDB) {
      this.memoryFallback.set(key, { data: data.slice(0), meta });
      this.evictMemory();
      return;
    }

    try {
      await this.putData(key, data);
      await this.putMeta(key, meta);
      await this.evictIfNeeded();
    } catch {
      // IndexedDB写入失败，降级到内存
      this.memoryFallback.set(key, { data: data.slice(0), meta });
    }
  }

  /**
   * 检查缓存是否存在
   */
  async has(url: string): Promise<boolean> {
    await this.ensureInit();
    const key = hashUrl(url);

    if (!this.useIndexedDB) {
      return this.memoryFallback.has(key);
    }

    try {
      const meta = await this.getMeta(key);
      return meta !== null;
    } catch {
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    await this.ensureInit();

    if (!this.useIndexedDB) {
      this.memoryFallback.clear();
      return;
    }

    try {
      const db = this.getDb();
      const tx = db.transaction([STORE_DATA, STORE_META], 'readwrite');
      tx.objectStore(STORE_DATA).clear();
      tx.objectStore(STORE_META).clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.memoryFallback.clear();
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<CacheStats> {
    await this.ensureInit();

    if (!this.useIndexedDB) {
      let totalSize = 0;
      for (const entry of this.memoryFallback.values()) {
        totalSize += entry.meta.size;
      }
      return {
        count: this.memoryFallback.size,
        totalSize,
        maxSize: this.maxCacheSize,
        hits: this.stats.hits,
        misses: this.stats.misses,
      };
    }

    try {
      const allMeta = await this.getAllMeta();
      let totalSize = 0;
      for (const meta of allMeta) {
        totalSize += meta.size;
      }
      return {
        count: allMeta.length,
        totalSize,
        maxSize: this.maxCacheSize,
        hits: this.stats.hits,
        misses: this.stats.misses,
      };
    } catch {
      return {
        count: 0,
        totalSize: 0,
        maxSize: this.maxCacheSize,
        hits: this.stats.hits,
        misses: this.stats.misses,
      };
    }
  }

  // ==================== IndexedDB 初始化 ====================

  private ensureInit(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initDB();
    }
    return this.initPromise;
  }

  private initDB(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // 检查IndexedDB可用性
        if (typeof indexedDB === 'undefined') {
          this.useIndexedDB = false;
          resolve();
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;

          // 模型数据存储
          if (!db.objectStoreNames.contains(STORE_DATA)) {
            db.createObjectStore(STORE_DATA);
          }

          // 元数据存储
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META);
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onerror = () => {
          // Safari隐私模式或权限问题
          console.warn('[ModelCache] IndexedDB not available, falling back to memory cache');
          this.useIndexedDB = false;
          resolve();
        };

        // Safari隐私模式下open()可能抛出异常
      } catch {
        console.warn('[ModelCache] IndexedDB not available, falling back to memory cache');
        this.useIndexedDB = false;
        resolve();
      }
    });
  }

  private getDb(): IDBDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  // ==================== IndexedDB 操作 ====================

  private getData(key: string): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const db = this.getDb();
      const tx = db.transaction(STORE_DATA, 'readonly');
      const request = tx.objectStore(STORE_DATA).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  private putData(key: string, data: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.getDb();
      const tx = db.transaction(STORE_DATA, 'readwrite');
      const request = tx.objectStore(STORE_DATA).put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private getMeta(key: string): Promise<CacheEntry | null> {
    return new Promise((resolve, reject) => {
      const db = this.getDb();
      const tx = db.transaction(STORE_META, 'readonly');
      const request = tx.objectStore(STORE_META).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  private putMeta(key: string, meta: CacheEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.getDb();
      const tx = db.transaction(STORE_META, 'readwrite');
      const request = tx.objectStore(STORE_META).put(meta, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private getAllMeta(): Promise<CacheEntry[]> {
    return new Promise((resolve, reject) => {
      const db = this.getDb();
      const tx = db.transaction(STORE_META, 'readonly');
      const request = tx.objectStore(STORE_META).getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== LRU 淘汰 ====================

  private async evictIfNeeded(): Promise<void> {
    try {
      const stats = await this.getStats();
      if (stats.totalSize <= this.maxCacheSize) return;

      // 按最后访问时间排序（最旧的先淘汰）
      const allMeta = await this.getAllMeta();
      allMeta.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      const db = this.getDb();
      let freedSize = 0;
      const targetFree = stats.totalSize - this.maxCacheSize;

      for (const meta of allMeta) {
        if (freedSize >= targetFree) break;

        const key = hashUrl(meta.url);

        // 删除数据和元数据
        const tx = db.transaction([STORE_DATA, STORE_META], 'readwrite');
        tx.objectStore(STORE_DATA).delete(key);
        tx.objectStore(STORE_META).delete(key);
        freedSize += meta.size;

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch {
      // 淘汰失败不阻塞
    }
  }

  private evictMemory(): void {
    let totalSize = 0;
    for (const entry of this.memoryFallback.values()) {
      totalSize += entry.meta.size;
    }

    if (totalSize <= this.maxCacheSize) return;

    // 按最后访问时间排序
    const entries = Array.from(this.memoryFallback.entries())
      .sort(([, a], [, b]) => a.meta.lastAccessedAt - b.meta.lastAccessedAt);

    for (const [key, entry] of entries) {
      if (totalSize <= this.maxCacheSize) break;
      totalSize -= entry.meta.size;
      this.memoryFallback.delete(key);
    }
  }
}

/** 全局单例 */
export const modelCache = new ModelCache();
