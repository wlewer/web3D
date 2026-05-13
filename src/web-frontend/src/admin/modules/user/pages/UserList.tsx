/**
 * 用户管理 - 用户列表页
 * 
 * 功能：
 * - 分页表格展示
 * - 搜索和筛选
 * - 批量操作
 * - 快速状态切换
 */

import React, { useState } from 'react';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  Button,
  Space,
  Tag,
  Avatar,
  Input,
  Select,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useList, useDelete } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import type { IUser, UserRole, UserStatus } from '../types';
import { userApi } from '../api';

const { Search } = Input;
const { Option } = Select;

// 角色映射
const roleMap: Record<UserRole, { color: string; text: string }> = {
  super_admin: { color: 'red', text: '超级管理员' },
  admin: { color: 'orange', text: '管理员' },
  editor: { color: 'blue', text: '编辑者' },
  viewer: { color: 'default', text: '查看者' },
};

// 状态映射
const statusMap: Record<UserStatus, { color: string; text: string; icon: React.ReactNode }> = {
  active: {
    color: 'success',
    text: '活跃',
    icon: <CheckCircleOutlined />,
  },
  inactive: {
    color: 'default',
    text: '未激活',
    icon: <StopOutlined />,
  },
  suspended: {
    color: 'error',
    text: '已禁用',
    icon: <StopOutlined />,
  },
};

export const UserList: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>();
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>();

  // 使用 Refine useList Hook 获取数据
  const { data: listData, isLoading, refetch } = useList<IUser>({
    resource: 'users',
    pagination: {
      current: 1,
      pageSize: 10,
    },
    filters: [
      ...(searchText ? [{ field: 'username', operator: 'contains' as const, value: searchText }] : []),
      ...(roleFilter ? [{ field: 'role', operator: 'eq' as const, value: roleFilter }] : []),
      ...(statusFilter ? [{ field: 'status', operator: 'eq' as const, value: statusFilter }] : []),
    ],
  });

  const data = listData?.data;
  const total = listData?.total || 0;
  const refetchData = () => refetch();

  // 删除 mutation
  const { mutate: deleteUser } = useDelete();

  // 表格列定义
  const columns: any = [
    {
      title: '用户信息',
      dataIndex: 'username',
      key: 'username',
      width: 250,
      render: (_: string, record: IUser) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => {
        const { color, text } = roleMap[role];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserStatus) => {
        const { color, text, icon } = statusMap[status];
        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (time?: string) => time || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_: any, record: IUser) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该用户吗？"
            description="此操作不可恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 批量操作配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // 事件处理
  const handleView = (user: IUser) => {
    // TODO: 跳转到详情页
    message.info(`查看用户: ${user.username}`);
  };

  const handleEdit = (user: IUser) => {
    navigate(`/admin/users/edit/${user.id}`);
  };

  const handleDelete = (id: string) => {
    deleteUser(
      {
        resource: 'users',
        id,
      },
      {
        onSuccess: () => {
          message.success('删除成功');
          refetchData();
        },
        onError: () => {
          message.error('删除失败');
        },
      }
    );
  };

  const handleBatchActivate = async () => {
    try {
      await userApi.batchOperation({
        ids: selectedRowKeys as string[],
        action: 'activate',
      });
      message.success('批量激活成功');
      setSelectedRowKeys([]);
      refetchData();
    } catch {
      message.error('批量激活失败');
    }
  };

  const handleBatchDeactivate = async () => {
    try {
      await userApi.batchOperation({
        ids: selectedRowKeys as string[],
        action: 'deactivate',
      });
      message.success('批量禁用成功');
      setSelectedRowKeys([]);
      refetchData();
    } catch {
      message.error('批量禁用失败');
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setRoleFilter(undefined);
    setStatusFilter(undefined);
    refetchData();
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未激活"
              value={0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已禁用"
              value={0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/users/create')}
          >
            创建用户
          </Button>

          {selectedRowKeys.length > 0 && (
            <>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleBatchActivate}
              >
                批量激活 ({selectedRowKeys.length})
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleBatchDeactivate}
              >
                批量禁用 ({selectedRowKeys.length})
              </Button>
            </>
          )}

          <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
            重置筛选
          </Button>
        </Space>

        <Space wrap style={{ marginTop: 16 }}>
          <Search
            placeholder="搜索用户名"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={refetchData}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />

          <Select
            placeholder="角色筛选"
            allowClear
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: 150 }}
          >
            <Option value="super_admin">超级管理员</Option>
            <Option value="admin">管理员</Option>
            <Option value="editor">编辑者</Option>
            <Option value="viewer">查看者</Option>
          </Select>

          <Select
            placeholder="状态筛选"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Option value="active">活跃</Option>
            <Option value="inactive">未激活</Option>
            <Option value="suspended">已禁用</Option>
          </Select>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Card>
        <UnifiedTable
          storageKey="admin_user_list"
          rowKey="id"
          columns={columns}
          dataSource={data || []}
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            current: 1,
            pageSize: 10,
            total: total,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default UserList;
