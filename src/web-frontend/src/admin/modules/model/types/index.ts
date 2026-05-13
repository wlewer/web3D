/**
 * 模型管理模块 - 类型定义
 */

import type { IModel, IModelCreateDTO, IModelReviewDTO, ModelStatus, ModelCategory } from '@/admin/core/types';

// 重新导出核心类型
export type { IModel, IModelCreateDTO, IModelReviewDTO, ModelStatus, ModelCategory };

// 模型列表查询参数
export interface IModelListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  category?: ModelCategory;
  status?: ModelStatus;
  format?: string;
  createdBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 模型统计信息
export interface IModelStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
  disabled: number;
  byCategory: Record<ModelCategory, number>;
  totalSize: number; // bytes
}

// 批量审核参数
export interface IModelBatchReview {
  ids: string[];
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

// 模型筛选选项
export interface IModelFilterOptions {
  categories: Array<{ value: ModelCategory; label: string }>;
  statuses: Array<{ value: ModelStatus; label: string }>;
  formats: Array<{ value: string; label: string }>;
}
