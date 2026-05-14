/**
 * 模板系统 API 服务层
 * Template System API service
 */
import type {
  NavMenuItem,
  NavMenuListResponse,
  WebsiteTemplate,
  TemplateListResponse,
  TemplateSlot,
  RegisteredComponent,
  ComponentListResponse,
} from '../types/template';

const API_BASE = '/api/v1';

// ===== 导航菜单 API =====

export async function fetchNavMenus(includeHidden = false): Promise<NavMenuItem[]> {
  const url = `${API_BASE}/nav-menus${includeHidden ? '?include_hidden=true' : ''}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn('导航菜单 API 获取失败，使用默认数据');
    return [];
  }
  const result: NavMenuListResponse = await resp.json();
  return result.data || [];
}

export async function fetchNavMenusFlat(includeHidden = false): Promise<NavMenuItem[]> {
  const url = `${API_BASE}/nav-menus/flat${includeHidden ? '?include_hidden=true' : ''}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    return [];
  }
  const result: NavMenuListResponse = await resp.json();
  return result.data || [];
}

// ===== 模板 API =====

export async function fetchTemplates(params?: {
  page?: number;
  pageSize?: number;
  name?: string;
  category?: string;
  status?: string;
  layoutType?: string;
}): Promise<TemplateListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('page_size', String(params.pageSize));
  if (params?.name) searchParams.set('name', params.name);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.layoutType) searchParams.set('layout_type', params.layoutType);

  const url = `${API_BASE}/website-templates?${searchParams.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch templates: ${resp.status}`);
  return resp.json();
}

export async function fetchTemplate(templateId: string): Promise<WebsiteTemplate> {
  const resp = await fetch(`${API_BASE}/website-templates/${templateId}`);
  if (!resp.ok) throw new Error(`Template not found: ${templateId}`);
  return resp.json();
}

// ===== 模板插槽 API =====

export async function fetchTemplateSlots(templateId: string): Promise<TemplateSlot[]> {
  const resp = await fetch(`${API_BASE}/website-templates/${templateId}/slots`);
  if (!resp.ok) {
    console.warn(`获取模板 ${templateId} 插槽失败`);
    return [];
  }
  return resp.json();
}

// ===== 注册组件 API =====

export async function fetchComponents(category?: string): Promise<RegisteredComponent[]> {
  const url = category
    ? `${API_BASE}/components?category=${category}`
    : `${API_BASE}/components`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn('组件列表 API 获取失败');
    return [];
  }
  const result: ComponentListResponse = await resp.json();
  return result.data || [];
}
