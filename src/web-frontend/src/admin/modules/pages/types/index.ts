/**
 * 页面管理模块 - 类型定义
 */

/** 页面状态 */
export type PageStatus = 'draft' | 'published' | 'archived';

/** 页面记录 */
export interface IPage {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  schema_json?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

/** 创建页面DTO */
export interface IPageCreateDTO {
  title: string;
  slug?: string;
}

/** 更新页面草稿DTO */
export interface IPageDraftDTO {
  schema_json: string;
}
