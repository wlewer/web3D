/**
 * Web3D Admin - 主入口文件
 * 
 * 注意：由于外层 App.tsx 已经定义了路由，这里直接根据路径渲染组件
 */

import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Refine } from '@refinedev/core';
import dataProvider from '@refinedev/simple-rest';
import { AdminApp } from './App';
import LoginPage from './modules/auth/LoginPage';
import { authProvider } from './core/providers/authProvider';
import { i18nProvider } from './core/providers/i18nProvider';
import { getCurrentTheme } from './core/config/theme';

const API_URL = 'http://localhost:8000/api/v1';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    // 使用 window.location 跳转，避免嵌套路由问题
    window.location.href = '/admin/login';
    return null;
  }

  return <>{children}</>;
};

export const AdminEntry: React.FC = () => {
  const theme = getCurrentTheme();
  
  // 根据当前路径判断渲染哪个组件
  const pathname = window.location.pathname;
  
  // 如果是登录页面，直接渲染 LoginPage
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={zhCN}
          theme={theme}
        >
          <AntdApp>
            <Refine
              dataProvider={dataProvider(API_URL)}
              authProvider={authProvider}
              i18nProvider={i18nProvider}
              options={{
                syncWithLocation: false,
                warnWhenUnsavedChanges: false,
              }}
              notificationProvider={null}
            >
              <LoginPage />
            </Refine>
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    );
  }
  
  // 其他路径，需要认证
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={theme}
      >
        <AntdApp>
          <Refine
            dataProvider={dataProvider(API_URL)}
            authProvider={authProvider}
            i18nProvider={i18nProvider}
            options={{
              syncWithLocation: false,
              warnWhenUnsavedChanges: false,
            }}
            notificationProvider={null}
          >
            <ProtectedRoute>
              <AdminApp />
            </ProtectedRoute>
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default AdminEntry;
