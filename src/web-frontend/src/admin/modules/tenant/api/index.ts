/**
 * 租户管理模块 - API 调用
 */

import { axiosInstance } from '@/admin/core/providers';
import type {
  ITenant,
  ITenantCreateDTO,
  ITenantUpdateDTO,
  ITenantListParams,
  ITenantUsage,
} from '../types';
import type { IPaginatedResponse } from '@/admin/core/types';

/**
 * 租户 API
 */
export const tenantApi = {
  /**
   * 获取租户列表（分页）
   */
  getList: (params?: ITenantListParams) => {
    return axiosInstance.get<IPaginatedResponse<ITenant>>('/tenants', { params });
  },

  /**
   * 获取单个租户
   */
  getById: (id: string) => {
    return axiosInstance.get<ITenant>(`/tenants/${id}`);
  },

  /**
   * 创建租户
   */
  create: (data: ITenantCreateDTO) => {
    return axiosInstance.post<ITenant>('/tenants', data);
  },

  /**
   * 更新租户
   */
  update: (id: string, data: ITenantUpdateDTO) => {
    return axiosInstance.put<ITenant>(`/tenants/${id}`, data);
  },

  /**
   * 删除租户
   */
  delete: (id: string) => {
    return axiosInstance.delete(`/tenants/${id}`);
  },

  /**
   * 停用租户
   */
  deactivate: (id: string) => {
    return axiosInstance.patch(`/tenants/${id}/deactivate`);
  },

  /**
   * 启用租户
   */
  activate: (id: string) => {
    return axiosInstance.patch(`/tenants/${id}/activate`);
  },

  /**
   * 获取租户用量
   */
  getUsage: (id: string) => {
    return axiosInstance.get<ITenantUsage>(`/tenants/${id}/usage`);
  },
};

export default tenantApi;
