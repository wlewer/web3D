/**
 * Web3D Admin - 全局类型定义
 * 
 * 包含所有模块共享的类型、接口和枚举
 */

// ==================== 用户相关类型 ====================

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface IUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface IUserCreateDTO {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface IUserUpdateDTO extends Partial<IUserCreateDTO> {
  status?: UserStatus;
}

// ==================== 模型相关类型 ====================

export type ModelStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export type ModelCategory = 'character' | 'scene' | 'prop' | 'vehicle' | 'other';

export interface IModel {
  id: string;
  name: string;
  description?: string;
  category: ModelCategory;
  status: ModelStatus;
  thumbnailUrl?: string;
  modelUrl: string;
  format: 'glb' | 'gltf' | 'fbx' | 'obj' | 'ply' | 'splat';
  fileSize: number; // bytes
  polygonCount?: number;
  textureCount?: number;
  createdBy: string; // user id
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string; // user id
  reviewedAt?: string;
  rejectionReason?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface IModelCreateDTO {
  name: string;
  description?: string;
  category: ModelCategory;
  modelUrl: string;
  format: IModel['format'];
  tags?: string[];
}

export interface IModelReviewDTO {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

// ==================== 模板相关类型 ====================

export type TemplateStatus = 'draft' | 'published' | 'archived';

export type TemplateCategory = 'landing' | 'gallery' | 'editor' | 'custom';

export interface ITemplateLayout {
  type: 'grid' | 'flex' | 'absolute';
  columns?: number;
  rows?: number;
  gap?: number;
  components: ITemplateComponent[];
}

export interface ITemplateComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  children?: ITemplateComponent[];
}

export interface ITemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  status: TemplateStatus;
  thumbnailUrl?: string;
  layout: ITemplateLayout;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  usageCount: number;
}

export interface ITemplateCreateDTO {
  name: string;
  description?: string;
  category: TemplateCategory;
  layout: ITemplateLayout;
}

export interface ITemplateVersion {
  id: string;
  templateId: string;
  version: number;
  layout: ITemplateLayout;
  createdBy: string;
  createdAt: string;
  changeLog?: string;
}

// ==================== API 响应类型 ====================

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

// ==================== 通用类型 ====================

export type SortOrder = 'asc' | 'desc';

export interface ISortConfig {
  field: string;
  order: SortOrder;
}

export interface IFilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface IListParams {
  page?: number;
  pageSize?: number;
  sort?: ISortConfig;
  filters?: IFilterConfig[];
  search?: string;
}

// ==================== 权限类型 ====================

export type Permission = 
  | 'user:list'
  | 'user:create'
  | 'user:update'
  | 'user:delete'
  | 'user:view'
  | 'model:list'
  | 'model:create'
  | 'model:update'
  | 'model:delete'
  | 'model:review'
  | 'model:view'
  | 'template:list'
  | 'template:create'
  | 'template:update'
  | 'template:delete'
  | 'template:publish'
  | 'template:view';

export interface IRole {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

// ==================== 日志类型 ====================

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface IOperationLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  level: LogLevel;
  createdAt: string;
}
