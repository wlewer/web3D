/**
 * 租户管理 - 租户详情页
 *
 * Tabs布局：
 * - 基本信息Tab
 * - 配置Tab
 * - 用量Tab
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Badge,
  Button,
  Space,
  message,
  Spin,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
  ThunderboltOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useOne } from '@refinedev/core';
import { useNavigate, useParams } from 'react-router-dom';
import type { ITenant, TenantPlan, TenantStatus, ITenantUsage } from '../types';
import { tenantApi } from '../api';
import { UsageCard } from '../components/UsageCard';

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

export const TenantDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('basic');
  const [usage, setUsage] = useState<ITenantUsage | undefined>();
  const [usageLoading, setUsageLoading] = useState(false);

  // 使用 Refine useOne Hook 获取租户详情
  const { data, isLoading } = useOne<ITenant>({
    resource: 'tenants',
    id: id || '',
  });

  const tenant = data?.data;

  // 获取用量数据
  useEffect(() => {
    if (id && activeTab === 'usage') {
      setUsageLoading(true);
      tenantApi
        .getUsage(id)
        .then((res) => {
          setUsage(res.data);
        })
        .catch(() => {
          message.error('获取用量数据失败');
        })
        .finally(() => {
          setUsageLoading(false);
        });
    }
  }, [id, activeTab]);

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const handleActivate = async () => {
    if (!id) return;
    try {
      await tenantApi.activate(id);
      message.success('租户已启用');
      window.location.reload();
    } catch {
      message.error('启用失败');
    }
  };

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      await tenantApi.deactivate(id);
      message.success('租户已停用');
      window.location.reload();
    } catch {
      message.error('停用失败');
    }
  };

  const handleUpgrade = () => {
    if (!id) return;
    navigate(`/admin/tenants/${id}/edit`);
  };

  if (isLoading || !tenant) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  const planInfo = planMap[tenant.plan];
  const statusInfo = statusMap[tenant.status];

  const tabItems = [
    {
      key: 'basic',
      label: (
        <Space>
          <InfoCircleOutlined />
          基本信息
        </Space>
      ),
      children: (
        <Descriptions bordered column={2} labelStyle={{ width: 140 }}>
          <Descriptions.Item label="租户名称">{tenant.name}</Descriptions.Item>
          <Descriptions.Item label="Slug">{tenant.slug}</Descriptions.Item>
          <Descriptions.Item label="套餐类型">
            <Tag color={planInfo.color}>{planInfo.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Badge status={statusInfo.color as any} text={statusInfo.text} />
          </Descriptions.Item>
          <Descriptions.Item label="域名">{tenant.domain || '-'}</Descriptions.Item>
          <Descriptions.Item label="API Key">
            <Space>
              <span style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>
                {tenant.apiKey ? `${tenant.apiKey.slice(0, 8)}...${tenant.apiKey.slice(-8)}` : '-'}
              </span>
              {tenant.apiKey && (
                <Tooltip title="复制 API Key">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy(tenant.apiKey)}
                  />
                </Tooltip>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(tenant.createdAt).toLocaleString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'config',
      label: (
        <Space>
          <SettingOutlined />
          配置
        </Space>
      ),
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <SettingOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <p>主题配置编辑器即将上线</p>
            <p style={{ fontSize: 13 }}>敬请期待后续迭代...</p>
          </div>
        </Card>
      ),
    },
    {
      key: 'usage',
      label: (
        <Space>
          <BarChartOutlined />
          用量
        </Space>
      ),
      children: <UsageCard usage={usage} loading={usageLoading} />,
    },
  ];

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/tenants')}>
              返回列表
            </Button>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{tenant.name}</span>
            <Tag color={planInfo.color}>{planInfo.text}</Tag>
            <Badge status={statusInfo.color as any} text={statusInfo.text} />
          </Space>
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleUpgrade}
            >
              升级套餐
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/tenants/${id}/edit`)}
            >
              编辑
            </Button>
            {tenant.status === 'active' ? (
              <Popconfirm
                title="确定要停用该租户吗？"
                description="停用后该租户将无法访问系统"
                onConfirm={handleDeactivate}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<StopOutlined />}>停用</Button>
              </Popconfirm>
            ) : (
              <Button icon={<CheckCircleOutlined />} onClick={handleActivate}>
                启用
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Tabs 内容 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default TenantDetail;
