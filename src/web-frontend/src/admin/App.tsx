/**
 * Web3D Admin - 管理后台应用
 * 
 * 注意：Refine Provider 已在 index.tsx 的 AdminEntry 中定义
 * 这里直接使用 AdminLayout 和页面组件
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from './layout';
import Dashboard from './modules/dashboard/DashboardPage';
import { UserList, UserCreate, UserEdit } from './modules/user';
import { ModelList, ModelDetail } from './modules/model';
import { ExperimentalGeneration, ThreepipeEditorPage, SuperSplatPage } from './modules/experimental';
import { ProfessionalGenerationPage } from './modules/professional';
import { OfficialTemplateManagement, NavMenuManagement, TemplateListManagement } from './modules/template';
import { PageList } from './modules/pages';
import { TenantList, TenantCreate, TenantEdit, TenantDetail } from './modules/tenant';

// 路由映射
const routeComponents: Record<string, React.FC> = {
  '/': Dashboard,
  '/users': UserList,
  '/users/create': UserCreate,
  '/users/edit': UserEdit,
  '/models': ModelList,
  '/models/show': ModelDetail,
  '/experimental/generation': ExperimentalGeneration,
  '/experimental/threepipe-editor': ThreepipeEditorPage,
  '/experimental/spark-editor': ThreepipeEditorPage,
  '/experimental/supersplat': SuperSplatPage,
  '/professional/generation': ProfessionalGenerationPage,
  '/templates/nav-menus': NavMenuManagement,
  '/templates': TemplateListManagement,
  '/templates/official': OfficialTemplateManagement,
  '/pages': PageList,
  '/tenants': TenantList,
  '/tenants/create': TenantCreate,
};

export const AdminApp: React.FC = () => {
  // 使用 useLocation hook 响应路由变化
  const location = useLocation();

  // 获取当前路径，渲染对应组件
  const pathname = location.pathname.replace('/admin', '') || '/';

  // 优先精确匹配
  let CurrentComponent = routeComponents[pathname];

  // 动态路由匹配（精确匹配失败时）
  if (!CurrentComponent) {
    if (/^\/tenants\/[^/]+\/edit$/.test(pathname)) {
      CurrentComponent = TenantEdit;
    } else if (/^\/tenants\/[^/]+$/.test(pathname)) {
      CurrentComponent = TenantDetail;
    } else if (/^\/users\/edit\/[^/]+$/.test(pathname)) {
      CurrentComponent = UserEdit;
    } else if (/^\/models\/show\/[^/]+$/.test(pathname)) {
      CurrentComponent = ModelDetail;
    }
  }

  CurrentComponent = CurrentComponent || Dashboard;

  return (
    <AdminLayout>
      <CurrentComponent />
    </AdminLayout>
  );
};

export default AdminApp;
