/**
 * 租户配置 API 服务层
 * Tenant Config API service - public endpoint, no auth required
 */

export interface TenantConfig {
  theme_config?: {
    cssVariables?: Record<string, string>;
    fonts?: Record<string, string>;
  } | null;
  site_title?: string | null;
  site_description?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
}

const API_BASE = '/api/v1';

/**
 * 获取当前租户配置
 * 根据当前域名自动解析租户，返回主题/SEO/logo等公开配置
 */
export async function fetchCurrentTenantConfig(): Promise<TenantConfig | null> {
  try {
    const resp = await fetch(`${API_BASE}/public/tenant-config`);
    if (!resp.ok) {
      console.warn('租户配置获取失败，使用默认主题');
      return null;
    }
    const data: TenantConfig = await resp.json();
    return data;
  } catch (err) {
    console.warn('租户配置获取失败，使用默认主题', err);
    return null;
  }
}
