/**
 * 用户管理模块 - API 调用
 */

import { axiosInstance } from '@/admin/core/providers';
import type {
  IUser,
  IUserCreateDTO,
  IUserUpdateDTO,
  IUserListParams,
  IUserStats,
  IUserBatchOperation,
  IPasswordResetDTO,
} from '../types';
import type { IPaginatedResponse } from '@/admin/core/types';

/**
 * 用户 API
 */
export const userApi = {
  /**
   * 获取用户列表（分页）
   */
  getList: (params?: IUserListParams) => {
    return axiosInstance.get<IPaginatedResponse<IUser>>('/users', { params });
  },

  /**
   * 获取单个用户
   */
  getById: (id: string) => {
    return axiosInstance.get<IUser>(`/users/${id}`);
  },

  /**
   * 创建用户
   */
  create: (data: IUserCreateDTO) => {
    return axiosInstance.post<IUser>('/users', data);
  },

  /**
   * 更新用户
   */
  update: (id: string, data: IUserUpdateDTO) => {
    return axiosInstance.put<IUser>(`/users/${id}`, data);
  },

  /**
   * 删除用户
   */
  delete: (id: string) => {
    return axiosInstance.delete(`/users/${id}`);
  },

  /**
   * 批量操作用户
   */
  batchOperation: (data: IUserBatchOperation) => {
    return axiosInstance.post('/users/batch', data);
  },

  /**
   * 重置用户密码
   */
  resetPassword: (data: IPasswordResetDTO) => {
    return axiosInstance.post('/users/reset-password', data);
  },

  /**
   * 获取用户统计信息
   */
  getStats: () => {
    return axiosInstance.get<IUserStats>('/users/stats');
  },

  /**
   * 激活用户
   */
  activate: (id: string) => {
    return axiosInstance.patch(`/users/${id}/activate`);
  },

  /**
   * 禁用用户
   */
  deactivate: (id: string) => {
    return axiosInstance.patch(`/users/${id}/deactivate`);
  },

  /**
   * 暂停用户
   */
  suspend: (id: string) => {
    return axiosInstance.patch(`/users/${id}/suspend`);
  },
};

export default userApi;
