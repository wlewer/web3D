/**
 * 用户管理模块 - 类型定义
 */

import type { IUser, IUserCreateDTO, IUserUpdateDTO, UserRole, UserStatus } from '@/admin/core/types';

// 重新导出核心类型（便于模块内使用）
export type { IUser, IUserCreateDTO, IUserUpdateDTO, UserRole, UserStatus };

// 用户列表查询参数
export interface IUserListParams {
  page?: number;
  pageSize?: number;
  username?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 用户统计信息
export interface IUserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<UserRole, number>;
}

// 批量操作参数
export interface IUserBatchOperation {
  ids: string[];
  action: 'activate' | 'deactivate' | 'suspend' | 'delete';
}

// 密码重置参数
export interface IPasswordResetDTO {
  userId: string;
  newPassword: string;
  confirmPassword: string;
}
