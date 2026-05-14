/**
 * 模型数据服务层
 * Model data service - 统一管理官网模型数据获取
 *
 * 架构：
 *   1. 每次调用优先检查缓存版本号（后台发布时版本号变化 → 自动清除缓存）
 *   2. 从后端 API 获取最新数据
 *   3. 成功后将数据缓存到 localStorage（5分钟短缓存）
 *   4. API 不可用时读取本地缓存作为 fallback
 *   5. 无缓存 → 返回空数组
 */

import type { RenderConfig } from '../types/render-config';

// ==================== 类型定义 ====================

export interface ProductTag {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  color?: string;
}

export interface HomepageModel {
  id: string;
  /** 中文展示名称 */
  displayName?: string;
  /** 原始名称（fallback） */
  name: string;
  /** UI 图标/emoji */
  icon?: string;
  /** 主题色 hex */
  colorHex?: string;
  /** 分类 */
  category: string;
  /** 描述 */
  description?: string;
  /** 模型格式 */
  format: 'spz' | 'glb' | 'ply' | 'splat' | 'stl' | 'obj';
  /** 主文件 URL */
  modelUrl: string;
  /** 备用文件 URL */
  modelUrlFallback?: string;
  /** SPZ/PLY 专用路径（兼容旧格式） */
  splatUrl?: string;
  /** 展示产品标签 */
  products?: ProductTag[];
  /** 单模型渲染覆盖配置 (来自 metadata_json.renderConfig) */
  renderConfig?: RenderConfig;
}

/** 画廊网格模型（与 Model3DCard 适配） */
export interface GalleryModel {
  id: string;
  url: string;
  thumbnail: string;
  name: string;
  nameZh: string;
  category: string;
}

/** 画廊分类信息 */
export interface GalleryCategory {
  key: string;
  name: string;
  nameZh: string;
  icon: string;
}

// ==================== API 响应类型 ====================

interface ApiModelResponse {
  id: string;
  display_name?: string;
  name: string;
  icon?: string;
  color_hex?: string;
  category: string;
  description?: string;
  format: string;
  model_url: string;
  model_url_fallback?: string;
  tags?: string[];
  metadata_json?: Record<string, any>;
}

interface ApiListResponse {
  data: ApiModelResponse[];
  total: number;
}

// ==================== 缓存管理 ====================

const CACHE_KEY = 'homepage_models_cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5分钟短缓存
const VERSION_KEY = 'homepage_cache_version';

interface CacheEntry {
  timestamp: number;
  models: HomepageModel[];
}

/**
 * 检查缓存版本号（后台发布时更新版本号，客户端自动清除过期缓存）
 * 静默执行，不阻塞主流程
 */
async function checkCacheVersion(): Promise<void> {
  try {
    const resp = await fetch('/api/v1/models/homepage/version');
    if (!resp.ok) return;
    const { version } = await resp.json();
    const cachedVersion = localStorage.getItem(VERSION_KEY);
    if (cachedVersion && parseInt(cachedVersion) !== version) {
      // 版本号变了 → 清除所有缓存
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem('gallery_models_cache');
      console.log(' 缓存版本已更新，已清除旧缓存');
    }
    localStorage.setItem(VERSION_KEY, String(version));
  } catch {
    // 后端不可用时跳过版本检查，不影响用户体验
  }
}

/** 从 localStorage 读取缓存 */
function readCache(): HomepageModel[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.models;
  } catch {
    return null;
  }
}

/** 写入缓存 */
function writeCache(models: HomepageModel[]): void {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), models };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage 不可用时忽略
  }
}

// ==================== API 数据转换 ====================

/** 将后端 API 响应转换为前端 HomepageModel */
function toHomepageModel(api: ApiModelResponse): HomepageModel {
  // metadata_json 中包含 products、sortOrder、color 等扩展信息
  const meta = api.metadata_json || {};

  const model: HomepageModel = {
    id: api.id,
    displayName: api.display_name || undefined,
    name: api.name,
    icon: api.icon || undefined,
    colorHex: api.color_hex || undefined,
    category: api.category,
    description: api.description || undefined,
    format: api.format as HomepageModel['format'],
    modelUrl: api.model_url || '',
    modelUrlFallback: api.model_url_fallback || undefined,
    // ★ 兼容旧格式：如果 model_url 为空且 splat_url 存在，作为备用
    splatUrl: undefined,
    products: meta.products as ProductTag[] | undefined,
    renderConfig: meta.renderConfig as RenderConfig | undefined,
  };

  return model;
}

// ==================== 核心 API 函数 ====================

/** ★ 带重试的 fetch */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = Math.min(2000 * Math.pow(2, i), 10000);
      console.warn(`\u91cd\u8bd5\u83b7\u53d6 ${url} ${i + 1}/${retries}，${delay}ms\u540e\u91cd\u8bd5...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('\u6240\u6709\u91cd\u8bd5\u5747\u5931\u8d25');
}

/** 从后端 API 获取首页模型 */
export async function fetchHomepageModels(): Promise<HomepageModel[]> {
  const response = await fetchWithRetry('/api/v1/models/homepage');
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const result: ApiListResponse = await response.json();
  return (result.data || []).map(toHomepageModel);
}

/**
 * 获取首页模型（带缓存 fallback）
 *
 * 策略：
 *   1. 调用 API 获取最新数据
 *   2. 成功 → 缓存到 localStorage + 返回
 *   3. 失败 → 读取 localStorage 缓存
 *   4. 无缓存 → 返回空数组
 */
export async function getHomepageModels(): Promise<HomepageModel[]> {
  // 先静默检查版本号，版本变化会自动清除缓存
  await checkCacheVersion();
  
  try {
    const models = await fetchHomepageModels();
    // 成功：更新缓存
    if (models.length > 0) {
      writeCache(models);
    }
    return models;
  } catch (err) {
    console.warn('⚠️ 首页模型 API 获取失败，尝试本地缓存:', err);
    // 失败：读取缓存
    const cached = readCache();
    if (cached && cached.length > 0) {
      console.log(' 使用本地缓存模型数据');
      return cached;
    }
    // 无缓存：返回空列表（前端显示空状态引导）
    console.warn(' 无本地缓存可用');
    return [];
  }
}

// ==================== 画廊网格 API ====================

const GALLERY_CACHE_KEY = 'gallery_models_cache';

interface GalleryCacheEntry {
  timestamp: number;
  models: GalleryModel[];
}

/** 从 localStorage 读取画廊缓存 */
function readGalleryCache(): GalleryModel[] | null {
  try {
    const raw = localStorage.getItem(GALLERY_CACHE_KEY);
    if (!raw) return null;
    const entry: GalleryCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(GALLERY_CACHE_KEY);
      return null;
    }
    return entry.models;
  } catch {
    return null;
  }
}

/** 写入画廊缓存 */
function writeGalleryCache(models: GalleryModel[]): void {
  try {
    const entry: GalleryCacheEntry = { timestamp: Date.now(), models };
    localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage 不可用时忽略
  }
}

/** 将后端 API 响应转换为 GalleryModel */
function toGalleryModel(api: ApiModelResponse): GalleryModel {
  return {
    id: api.id,
    url: api.model_url || '',
    thumbnail: api.icon || '🎲',
    name: api.display_name || api.name,
    nameZh: api.display_name || api.name,
    category: api.category,
  };
}

/** 默认分类映射（当 API 无数据时使用） */
function getDefaultCategories(): GalleryCategory[] {
  return [
    { key: 'animal', name: 'Animals', nameZh: '动物', icon: '🐾' },
    { key: 'food', name: 'Food', nameZh: '美食', icon: '🍽️' },
    { key: 'scene', name: 'Scenes', nameZh: '场景', icon: '🏞️' },
    { key: 'art', name: 'Art', nameZh: '艺术', icon: '🎯' },
    { key: 'nature', name: 'Nature', nameZh: '自然', icon: '🌿' },
    { key: 'architecture', name: 'Architecture', nameZh: '建筑', icon: '🏛️' },
    { key: 'character', name: 'Characters', nameZh: '角色', icon: '🧑' },
    { key: 'prop', name: 'Props', nameZh: '道具', icon: '📦' },
    { key: 'vehicle', name: 'Vehicles', nameZh: '车辆', icon: '🚗' },
    { key: 'other', name: 'Other', nameZh: '其他', icon: '🎲' },
  ];
}

/** 从模型列表中推导出分类信息 */
export function deriveCategories(models: GalleryModel[]): GalleryCategory[] {
  const defaults = getDefaultCategories();
  const catMap = new Map<string, GalleryCategory>();
  defaults.forEach(d => catMap.set(d.key, d));

  const keys = new Set(models.map(m => m.category));
  return Array.from(keys).map(key => catMap.get(key) || { key, name: key, nameZh: key, icon: '📁' });
}

/** 从后端 API 获取公开模型列表 */
export async function fetchPublicModels(
  page: number = 1,
  pageSize: number = 50,
): Promise<GalleryModel[]> {
  const response = await fetchWithRetry(`/api/v1/models/public?page=${page}&page_size=${pageSize}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const result: ApiListResponse = await response.json();
  return (result.data || []).map(toGalleryModel);
}

/**
 * 获取公开模型列表（带缓存 fallback + 版本号校验）
 */
export async function getPublicModels(): Promise<GalleryModel[]> {
  // 先静默检查版本号
  await checkCacheVersion();
  
  try {
    const models = await fetchPublicModels();
    if (models.length > 0) {
      writeGalleryCache(models);
    }
    return models;
  } catch (err) {
    console.warn(' 公开模型 API 获取失败，尝试本地缓存:', err);
    const cached = readGalleryCache();
    if (cached && cached.length > 0) {
      console.log(' 使用本地缓存的画廊数据');
      return cached;
    }
    console.warn(' 无画廊缓存可用');
    return [];
  }
}
