/**
 * Web3D Admin - 仪表盘页面
 */

import React from 'react';
import { Card, Row, Col, Statistic, Tag } from 'antd';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  UserOutlined,
  BoxPlotOutlined,
  AppstoreOutlined,
  RiseOutlined,
} from '@ant-design/icons';
const Dashboard: React.FC = () => {

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
