/**
 * Web3D Admin - Providers 统一导出
 */

export { default as axiosInstance } from './axios';
export { dataProvider } from './dataProvider';
export { authProvider } from './authProvider';
export { i18nProvider } from './i18nProvider';

// 导出类型
export type { IUser, UserRole, UserStatus, IModel, ModelStatus, ModelCategory, ITemplate, TemplateStatus, TemplateCategory } from '../types';
