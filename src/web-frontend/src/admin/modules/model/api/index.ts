/**
 * 模型管理模块 - API 调用
 */

import { axiosInstance } from '@/admin/core/providers';
import type {
  IModel,
  IModelCreateDTO,
  IModelReviewDTO,
  IModelListParams,
  IModelStats,
  IModelBatchReview,
} from '../types';
import type { IPaginatedResponse } from '@/admin/core/types';

/**
 * 模型 API
 */
export const modelApi = {
  /**
   * 获取模型列表（分页）
   */
  getList: (params?: IModelListParams) => {
    return axiosInstance.get<IPaginatedResponse<IModel>>('/models', { params });
  },

  /**
   * 获取单个模型
   */
  getById: (id: string) => {
    return axiosInstance.get<IModel>(`/models/${id}`);
  },

  /**
   * 创建模型
   */
  create: (data: IModelCreateDTO) => {
    return axiosInstance.post<IModel>('/models', data);
  },

  /**
   * 更新模型
   */
  update: (id: string, data: Partial<IModel>) => {
    return axiosInstance.put<IModel>(`/models/${id}`, data);
  },

  /**
   * 删除模型
   */
  delete: (id: string) => {
    return axiosInstance.delete(`/models/${id}`);
  },

  /**
   * 审核模型
   */
  review: (id: string, data: IModelReviewDTO) => {
    return axiosInstance.post<IModel>(`/models/${id}/review`, data);
  },

  /**
   * 批量删除模型
   */
  batchDelete: (ids: string[]) => {
    return axiosInstance.post('/models/batch-delete', { ids });
  },

  /**
   * 批量审核
   */
  batchReview: (data: IModelBatchReview) => {
    return axiosInstance.post('/models/batch-review', data);
  },

  /**
   * 获取模型统计
   */
  getStats: () => {
    return axiosInstance.get<IModelStats>('/models/stats');
  },

  /**
   * 归档模型
   */
  archive: (id: string) => {
    return axiosInstance.patch(`/models/${id}/archive`);
  },

  /**
   * 切换模型可见性（启用/禁用）
   */
  toggleVisibility: (id: string) => {
    return axiosInstance.patch<{ message: string; status: string }>(`/models/${id}/toggle-visibility`);
  },

  /**
   * 替换模型文件（管理员）
   */
  replaceFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post<IModel>(`/models/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * 上传模型文件（管理员）
   */
  upload: (file: File, category?: string, extraFields?: {
    displayName?: string;
    icon?: string;
    colorHex?: string;
    showOnHomepage?: boolean;
    sortOrder?: number;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    if (extraFields?.displayName) formData.append('display_name', extraFields.displayName);
    if (extraFields?.icon) formData.append('icon', extraFields.icon);
    if (extraFields?.colorHex) formData.append('color_hex', extraFields.colorHex);
    if (extraFields?.showOnHomepage) formData.append('show_on_homepage', 'true');
    if (extraFields?.sortOrder !== undefined) formData.append('sort_order', String(extraFields.sortOrder));
    return axiosInstance.post<IModel>('/models/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default modelApi;
