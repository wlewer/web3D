/**
 * 租户管理模块 - 统一导出
 */

export { TenantList } from './pages/TenantList';
export { TenantCreate } from './pages/TenantCreate';
export { TenantEdit } from './pages/TenantEdit';
export { TenantDetail } from './pages/TenantDetail';
export { UsageCard } from './components/UsageCard';
export { tenantApi } from './api';
export type * from './types';

export const tenantResource = {
  name: "tenants",
  list: "/admin/tenants",
  create: "/admin/tenants/create",
  edit: "/admin/tenants/:id/edit",
  show: "/admin/tenants/:id",
};
