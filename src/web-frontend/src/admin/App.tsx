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
import { OfficialTemplateManagement } from './modules/template';

// 资源定义（暂未使用，保留以便将来扩展）
// const resources = [
//   {
//     name: 'dashboard',
//     list: '/',
//     meta: {
//       label: '仪表盘',
//       icon: 'DashboardOutlined',
//     },
//   },
//   {
//     name: 'users',
//     list: '/users',
//     create: '/users/create',
//     edit: '/users/edit/:id',
//     show: '/users/show/:id',
//     meta: {
//       label: '用户管理',
//       icon: 'UserOutlined',
//       parent: 'userManagement',
//     },
//   },
//   {
//     name: 'models',
//     list: '/models',
//     create: '/models/create',
//     edit: '/models/edit/:id',
//     show: '/models/show/:id',
//     meta: {
//       label: '模型管理',
//       icon: 'BoxPlotOutlined',
//       parent: 'modelManagement',
//     },
//   },
//   {
//     name: 'templates',
//     list: '/templates',
//     create: '/templates/create',
//     edit: '/templates/edit/:id',
//     show: '/templates/show/:id',
//     meta: {
//       label: '模板管理',
//       icon: 'AppstoreOutlined',
//       parent: 'templateManagement',
//     },
//   },
// ];

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
  '/templates/official': OfficialTemplateManagement,
};

export const AdminApp: React.FC = () => {
  // 使用 useLocation hook 响应路由变化
  const location = useLocation();
  
  // 获取当前路径，渲染对应组件
  const pathname = location.pathname.replace('/admin', '') || '/';
  const CurrentComponent = routeComponents[pathname] || Dashboard;

  return (
    <AdminLayout>
      <CurrentComponent />
    </AdminLayout>
  );
};

export default AdminApp;
