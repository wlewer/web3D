/**
 * Web3D Admin - 仪表盘页面
 */

import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Statistic, Tag, message,
  InputNumber, Switch, Button, Space, Typography, Divider
} from 'antd';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  UserOutlined,
  BoxPlotOutlined,
  AppstoreOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface CarouselConfig {
  interval: number;
  enabled: boolean;
}

const Dashboard: React.FC = () => {

  // 轮播配置状态
  const [carouselConfig, setCarouselConfig] = useState<CarouselConfig>({
    interval: 15,
    enabled: true,
  });
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [carouselSaving, setCarouselSaving] = useState(false);

  // 获取轮播配置
  const fetchCarouselConfig = async () => {
    setCarouselLoading(true);
    try {
      const res = await fetch('/api/v1/settings/carousel');
      const data = await res.json();
      if (data.value) {
        setCarouselConfig({
          interval: data.value.interval ?? 15,
          enabled: data.value.enabled ?? true,
        });
      }
    } catch (err) {
      console.error('获取轮播配置失败:', err);
    } finally {
      setCarouselLoading(false);
    }
  };

  // 保存轮播配置
  const saveCarouselConfig = async () => {
    setCarouselSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/v1/settings/carousel', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ value: carouselConfig }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || '保存失败');
      }
      message.success('轮播配置已保存');
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setCarouselSaving(false);
    }
  };

  useEffect(() => {
    fetchCarouselConfig();
  }, []);

  // 统计数据
  const statsData = [
    {
      title: '总用户数',
      value: 128,
      icon: <UserOutlined />,
      color: '#667eea',
      trend: '+12%',
    },
    {
      title: '模型总数',
      value: 456,
      icon: <BoxPlotOutlined />,
      color: '#52c41a',
      trend: '+8%',
    },
    {
      title: '模板总数',
      value: 32,
      icon: <AppstoreOutlined />,
      color: '#faad14',
      trend: '+5%',
    },
    {
      title: '今日访问',
      value: 1893,
      icon: <RiseOutlined />,
      color: '#ff4d4f',
      trend: '+23%',
    },
  ];

  // 最近活动
  const recentActivities = [
    {
      key: '1',
      user: '张三',
      action: '上传了新模型',
      model: '科幻角色 v2',
      time: '2分钟前',
      status: 'pending',
    },
    {
      key: '2',
      user: '李四',
      action: '审核通过',
      model: '现代建筑场景',
      time: '15分钟前',
      status: 'approved',
    },
    {
      key: '3',
      user: '王五',
      action: '创建了模板',
      model: '产品展示页',
      time: '1小时前',
      status: 'published',
    },
  ];

  const columns = [
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: '对象',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'gold', text: '待审核' },
          approved: { color: 'green', text: '已通过' },
          published: { color: 'blue', text: '已发布' },
        };
        const { color, text } = config[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>欢迎使用 Web3D 管理后台</h1>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statsData.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card hoverable>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={
                  <span style={{ color: stat.color, marginRight: 8 }}>
                    {stat.icon}
                  </span>
                }
                suffix={
                  <span style={{ fontSize: 14, color: '#52c41a', marginLeft: 8 }}>
                    {stat.trend}
                  </span>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 首页轮播配置 */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>首页轮播配置</span>
          </Space>
        }
        variant="borderless"
        loading={carouselLoading}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Space direction="vertical" size={4}>
              <Text strong>自动轮播</Text>
              <Text type="secondary">启用后首页模型自动切换</Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Switch
                checked={carouselConfig.enabled}
                onChange={(checked) => setCarouselConfig(prev => ({ ...prev, enabled: checked }))}
              />
            </div>
          </Col>
          <Col xs={24} sm={10}>
            <Space direction="vertical" size={4}>
              <Text strong>切换间隔（秒）</Text>
              <Text type="secondary">每个模型展示时长，3~120秒</Text>
            </Space>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                min={3}
                max={120}
                value={carouselConfig.interval}
                onChange={(val) => setCarouselConfig(prev => ({ ...prev, interval: val ?? 15 }))}
                addonAfter="秒"
                style={{ width: 150 }}
              />
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div style={{ marginTop: 24 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={carouselSaving}
                onClick={saveCarouselConfig}
              >
                保存
              </Button>
            </div>
          </Col>
        </Row>
        <Divider />
        <Text type="secondary" style={{ fontSize: 13 }}>
          当前配置将在下次首页加载时生效。间隔设为 {carouselConfig.interval} 秒，
          {carouselConfig.enabled ? '✅ 自动轮播已开启' : '⏸️ 自动轮播已暂停'}
        </Text>
      </Card>

      {/* 最近活动 */}
      <Card title="最近活动" variant="borderless">
        <UnifiedTable
          storageKey="admin_dashboard_activity"
          dataSource={recentActivities}
          columns={columns}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default Dashboard;
