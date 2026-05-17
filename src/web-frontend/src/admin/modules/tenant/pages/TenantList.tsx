/**
 * 租户管理 - 租户列表页
 *
 * 功能：
 * - 分页表格展示
 * - 搜索和筛选
 * - 停用/启用操作
 */

import React, { useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Badge,
  Input,
  Select,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useList } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import type { ITenant, TenantPlan, TenantStatus } from '../types';
import { tenantApi } from '../api';

const { Search } = Input;
const { Option } = Select;

// 套餐映射
const planMap: Record<TenantPlan, { color: string; text: string }> = {
  free: { color: 'blue', text: '免费版' },
  professional: { color: 'orange', text: '专业版' },
  enterprise: { color: 'purple', text: '企业版' },
};

// 状态映射
const statusMap: Record<TenantStatus, { color: string; text: string }> = {
  active: { color: 'success', text: '活跃' },
  inactive: { color: 'default', text: '未激活' },
  suspended: { color: 'error', text: '已停用' },
};

export const TenantList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | undefined>();
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 使用 Refine useList Hook 获取数据
  const { data: listData, isLoading, refetch } = useList<ITenant>({
    resource: 'tenants',
    pagination: {
      current,
      pageSize,
    },
    filters: [
      ...(searchText ? [{ field: 'name', operator: 'contains' as const, value: searchText }] : []),
      ...(statusFilter ? [{ field: 'status', operator: 'eq' as const, value: statusFilter }] : []),
    ],
  });

  const data = listData?.data || [];
  const total = listData?.total || 0;
  const refetchData = () => refetch();

  // 表格列定义
  const columns: any = [
    {
      title: '租户信息',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (_: string, record: ITenant) => (
        <Space direction="vertical" size={0}>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>/{record.slug}</div>
        </Space>
      ),
    },
    {
      title: '套餐类型',
      dataIndex: 'plan',
      key: 'plan',
      width: 120,
      render: (plan: TenantPlan) => {
        const { color, text } = planMap[plan] || { color: 'default', text: plan };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TenantStatus) => {
        const { color, text } = statusMap[status];
        return <Badge status={color as any} text={text} />;
      },
    },
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      width: 200,
      ellipsis: true,
      render: (domain?: string) => domain || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => {
        if (!date) return '-';
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return date;
          return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return date;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 220,
      render: (_: any, record: ITenant) => (
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
          {record.status === 'active' ? (
            <Popconfirm
              title="确定要停用该租户吗？"
              description="停用后该租户将无法访问系统"
              onConfirm={() => handleDeactivate(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                停用
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => handleActivate(record.id)}
            >
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 事件处理
  const handleView = (tenant: ITenant) => {
    navigate(`/admin/tenants/${tenant.id}`);
  };

  const handleEdit = (tenant: ITenant) => {
    navigate(`/admin/tenants/${tenant.id}/edit`);
  };

  const handleActivate = async (id: string) => {
    try {
      await tenantApi.activate(id);
      message.success('租户已启用');
      refetchData();
    } catch {
      message.error('启用失败');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await tenantApi.deactivate(id);
      message.success('租户已停用');
      refetchData();
    } catch {
      message.error('停用失败');
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setCurrent(1);
    refetchData();
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总租户数"
              value={total}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃租户"
              value={data.filter((t) => t.status === 'active').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未激活"
              value={data.filter((t) => t.status === 'inactive').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已停用"
              value={data.filter((t) => t.status === 'suspended').length}
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
            onClick={() => navigate('/admin/tenants/create')}
          >
            创建租户
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
            重置筛选
          </Button>
        </Space>

        <Space wrap style={{ marginTop: 16 }}>
          <Search
            placeholder="搜索租户名称"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={refetchData}
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setCurrent(1);
            }}
            style={{ width: 150 }}
          >
            <Option value="active">活跃</Option>
            <Option value="inactive">未激活</Option>
            <Option value="suspended">已停用</Option>
          </Select>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Card>
        <UnifiedTable
          storageKey="admin_tenant_list"
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          pagination={{
            current,
            pageSize,
            total,
            onChange: (page, size) => {
              setCurrent(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default TenantList;
