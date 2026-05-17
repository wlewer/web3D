/**
 * 页面管理模块 - API 调用
 */

import { axiosInstance } from '@/admin/core/providers';
import type { IPage, IPageCreateDTO, IPageDraftDTO } from '../types';

/**
 * 页面 API
 */
export const pageApi = {
  /**
   * 获取页面列表
   */
  getList: () => {
    return axiosInstance.get<IPage[]>('/pages');
  },

  /**
   * 获取单个页面
   */
  getById: (id: string) => {
    return axiosInstance.get<IPage>(`/pages/${id}`);
  },

  /**
   * 创建页面
   */
  create: (data: IPageCreateDTO) => {
    return axiosInstance.post<IPage>('/pages', data);
  },

  /**
   * 保存草稿
   */
  saveDraft: (id: string, data: IPageDraftDTO) => {
    return axiosInstance.put(`/pages/${id}/draft`, data);
  },

  /**
   * 发布页面
   */
  publish: (id: string) => {
    return axiosInstance.post(`/pages/${id}/publish`);
  },

  /**
   * 删除页面
   */
  delete: (id: string) => {
    return axiosInstance.delete(`/pages/${id}`);
  },
};

export default pageApi;
