/**
 * Web3D Admin - 主布局组件
 * 
 * 包含侧边栏、顶部导航、面包屑等
 */

import React, { useState } from 'react';
import { Layout, Menu, theme as antdTheme, Avatar, Dropdown, Space, Badge } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  BoxPlotOutlined,
  HomeOutlined,
  AppstoreOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  GlobalOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import type { IUser } from '@/admin/core/types';

const { Header, Sider, Content } = Layout;

// 菜单配置
const menuItems = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: 'user-management',
    icon: <UserOutlined />,
    label: '用户管理',
    children: [
      {
        key: '/admin/users',
        label: '用户列表',
      },
    ],
  },
  {
    key: 'model-management',
    icon: <BoxPlotOutlined />,
    label: '模型管理',
    children: [
      {
        key: '/admin/models',
        label: '模型列表',
      },

      {
        key: '/admin/models/review',
        label: (
          <Space>
            模型审核
            <Badge count={3} size="small" />
          </Space>
        ),
      },
    ],
  },
  {
    key: 'template-management',
    icon: <AppstoreOutlined />,
    label: '模板管理',
    children: [
      {
        key: '/admin/templates/nav-menus',
        label: '导航菜单',
      },
      {
        key: '/admin/templates',
        label: '模板列表',
      },
      {
        key: '/admin/templates/official',
        label: '官网模板',
      },
    ],
  },
  {
    key: 'experimental-management',
    icon: <ExperimentOutlined />,
    label: 'AI生成实验',
    children: [
      {
        key: '/admin/experimental/generation',
        label: '3D生成',
      },
      {
        key: '/admin/professional/generation',
        label: '3D官方模型',
      },
      {
        key: '/admin/experimental/threepipe-editor',
        label: 'Threepipe 3D编辑器',
      },
      {
        key: '/admin/experimental/supersplat',
        label: 'SuperSplat编辑器',
      },
    ],
  },
  {
    key: '/admin/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = antdTheme.useToken();
  const { data: user } = useGetIdentity<IUser>();

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        navigate('/admin/login');
      },
    },
  ];

  // 语言切换
  const localeMenuItems = [
    {
      key: 'zh-CN',
      label: '中文',
    },
    {
      key: 'en-US',
      label: 'English',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: token.colorBgContainer,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: token.colorPrimary,
              fontSize: collapsed ? 18 : 20,
              fontWeight: 600,
            }}
          >
            {collapsed ? 'W3D' : 'Web3D Admin'}
          </h2>
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/admin/users', '/admin/models', '/admin/templates']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            borderRight: 0,
            marginTop: 8,
          }}
        />
      </Sider>

      <Layout>
        {/* 顶部导航 */}
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
          }}
        >
          {/* 左侧：折叠按钮 + 面包屑 */}
          <Space size="large">
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              onClick: () => setCollapsed(!collapsed),
              style: {
                fontSize: 18,
                cursor: 'pointer',
                color: token.colorTextSecondary,
              },
            })}
          </Space>

          {/* 右侧：通知 + 语言 + 用户 */}
          <Space size="middle">
            {/* 通知 */}
            <Badge count={5} size="small">
              <BellOutlined
                style={{
                  fontSize: 18,
                  cursor: 'pointer',
                  color: token.colorTextSecondary,
                }}
              />
            </Badge>

            {/* 语言切换 */}
            <Dropdown menu={{ items: localeMenuItems }} placement="bottomRight">
              <GlobalOutlined
                style={{
                  fontSize: 18,
                  cursor: 'pointer',
                  color: token.colorTextSecondary,
                }}
              />
            </Dropdown>

            {/* 用户信息 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar src={user?.avatar} icon={<UserOutlined />} />
                <span style={{ color: token.colorText }}>{user?.username || 'Admin'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 内容区域 */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
