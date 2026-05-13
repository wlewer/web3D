/**
 * Gallery API Service
 * 画廊页面数据接口服务
 */

const API_BASE = '/api/v1';

export interface GalleryModelItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  format: string;
  model_url: string;
  thumbnail_url?: string;
  tags?: string[];
  file_size: number;
  created_at: string;
}

export interface GalleryListResponse {
  data: GalleryModelItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 获取公开模型列表（画廊展示用）
 */
export async function fetchPublicModels(params?: {
  page?: number;
  page_size?: number;
  category?: string;
}): Promise<GalleryListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.category) searchParams.set('category', params.category);

  const url = `${API_BASE}/models/public${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.statusText}`);
  }
  return res.json();
}

/**
 * 从后端 API 获取模型分类列表
 */
export async function fetchModelCategories(): Promise<string[]> {
  try {
    const data = await fetchPublicModels({ page_size: 100 });
    const categories = new Set<string>();
    data.data.forEach(m => {
      if (m.category) categories.add(m.category);
    });
    return Array.from(categories).sort();
  } catch {
    return [];
  }
}

/**
 * 模型分类中文显示映射
 */
export const CATEGORY_LABELS: Record<string, string> = {
  character: '角色',
  scene: '场景',
  prop: '道具',
  vehicle: '车辆',
  box: '精品盒',
  animation: '动画',
  nature: '自然',
  animal: '动物',
  architecture: '建筑',
  food: '食品',
  industry: '工业',
  art: '艺术',
  other: '其他',
};

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}
