/**
 * 租户管理模块 - 类型定义
 */

export type TenantPlan = 'free' | 'professional' | 'enterprise';

export type TenantStatus = 'active' | 'inactive' | 'suspended';

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  domain?: string;
  apiKey?: string;
  createdAt: string;
  updatedAt?: string;
  settings?: Record<string, any>;
  quota?: ITenantQuota;
}

export interface ITenantQuota {
  modelCount: { used: number; limit: number };
  storage: { used: number; limit: number };
  aiCalls: { used: number; limit: number };
  pageViews: { used: number; limit: number };
}

export interface ITenantCreateDTO {
  name: string;
  slug?: string;
  plan: TenantPlan;
  domain?: string;
}

export interface ITenantUpdateDTO {
  name?: string;
  slug?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  domain?: string;
  quota?: Partial<ITenantQuota>;
  settings?: Record<string, any>;
}

export interface ITenantUsage {
  modelCount: { used: number; limit: number };
  storage: { used: number; limit: number };
  aiCalls: { used: number; limit: number };
  pageViews: { used: number; limit: number };
}

export interface ITenantListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
