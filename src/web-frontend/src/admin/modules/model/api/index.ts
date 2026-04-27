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
};

export default modelApi;
