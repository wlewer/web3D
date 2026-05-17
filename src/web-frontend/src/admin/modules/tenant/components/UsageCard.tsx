/**
 * 租户管理 - 用量展示组件
 *
 * 4个Progress组件显示各维度用量
 * 颜色：<60%绿色、60-80%橙色、>80%红色
 */

import React from 'react';
import { Card, Progress, Row, Col, Space, Statistic } from 'antd';
import {
  BoxPlotOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ITenantUsage } from '../types';

interface UsageCardProps {
  usage?: ITenantUsage;
  loading?: boolean;
}

interface UsageItem {
  key: keyof ITenantUsage;
  label: string;
  icon: React.ReactNode;
  unit: string;
}

const usageItems: UsageItem[] = [
  { key: 'modelCount', label: '模型数量', icon: <BoxPlotOutlined />, unit: '个' },
  { key: 'storage', label: '存储空间', icon: <DatabaseOutlined />, unit: 'MB' },
  { key: 'aiCalls', label: 'AI 调用', icon: <ThunderboltOutlined />, unit: '次' },
  { key: 'pageViews', label: '页面访问', icon: <EyeOutlined />, unit: '次' },
];

const getProgressColor = (percent: number): string => {
  if (percent > 80) return '#ff4d4f';
  if (percent >= 60) return '#faad14';
  return '#52c41a';
};

const getProgressStatus = (percent: number): 'success' | 'normal' | 'exception' => {
  if (percent > 80) return 'exception';
  if (percent >= 60) return 'normal';
  return 'success';
};

export const UsageCard: React.FC<UsageCardProps> = ({ usage, loading }) => {
  if (loading || !usage) {
    return (
      <Row gutter={[16, 16]}>
        {usageItems.map((item) => (
          <Col span={12} key={item.key}>
            <Card loading size="small">
              <div />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {usageItems.map((item) => {
        const data = usage[item.key];
        const percent = data.limit > 0 ? Math.round((data.used / data.limit) * 100) : 0;
        const color = getProgressColor(percent);
        const status = getProgressStatus(percent);

        return (
          <Col span={12} key={item.key}>
            <Card size="small" hoverable styles={{ body: { padding: 16 } }}>
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Space size={8}>
                  <span style={{ fontSize: 18, color }}>{item.icon}</span>
                  <span style={{ fontWeight: 500 }}>{item.label}</span>
                </Space>
                <Progress
                  percent={percent}
                  status={status}
                  strokeColor={color}
                  format={(p) => `${p}%`}
                />
                <Row justify="space-between">
                  <Col>
                    <Statistic
                      value={data.used}
                      suffix={`/ ${data.limit} ${item.unit}`}
                      valueStyle={{ fontSize: 14, color: '#666' }}
                    />
                  </Col>
                  <Col>
                    <span style={{ fontSize: 14, color, fontWeight: 600 }}>
                      {percent}%
                    </span>
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default UsageCard;
