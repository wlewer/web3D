/**
 * 租户管理 - 创建租户页
 *
 * 功能：
 * - 租户名称、slug、套餐选择
 * - 套餐卡片可视化
 * - 提交后跳转详情页
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Radio,
  Button,
  Space,
  Card,
  message,
  Row,
  Col,
  Typography,
  Divider,
} from 'antd';
import {
  GlobalOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useCreate } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import type { ITenant, TenantPlan } from '../types';

const { Title, Text } = Typography;

// 套餐配置
const planConfigs: {
  value: TenantPlan;
  title: string;
  icon: React.ReactNode;
  color: string;
  price: string;
  features: string[];
}[] = [
  {
    value: 'free',
    title: '免费版',
    icon: <GlobalOutlined style={{ fontSize: 24 }} />,
    color: '#1677ff',
    price: '¥0/月',
    features: ['最多 5 个模型', '100 MB 存储', '50 次 AI 调用', '基础页面'],
  },
  {
    value: 'professional',
    title: '专业版',
    icon: <ThunderboltOutlined style={{ fontSize: 24 }} />,
    color: '#fa8c16',
    price: '¥99/月',
    features: ['最多 50 个模型', '5 GB 存储', '500 次 AI 调用', '自定义域名', '优先支持'],
  },
  {
    value: 'enterprise',
    title: '企业版',
    icon: <CrownOutlined style={{ fontSize: 24 }} />,
    color: '#722ed1',
    price: '¥999/月',
    features: ['无限模型', '100 GB 存储', '无限 AI 调用', '自定义域名', '专属客服', 'SLA 保障'],
  },
];

export const TenantCreate: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>('free');

  // 监听套餐变化同步到表单
  useEffect(() => {
    form.setFieldsValue({ plan: selectedPlan });
  }, [selectedPlan, form]);

  // 使用 Refine useCreate Hook
  const { mutate: createTenant, isLoading } = useCreate<ITenant>();

  // 根据名称自动生成 slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const currentSlug = form.getFieldValue('slug');
    if (!currentSlug && name) {
      const autoSlug = name
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
      form.setFieldsValue({ slug: autoSlug });
    }
  };

  const handleSubmit = async (values: any) => {
    createTenant(
      {
        resource: 'tenants',
        values,
      },
      {
        onSuccess: (response) => {
          message.success('租户创建成功');
          const createdId = response?.data?.id;
          if (createdId) {
            navigate(`/admin/tenants/${createdId}`);
          } else {
            navigate('/admin/tenants');
          }
        },
        onError: () => {
          message.error('创建失败');
        },
      }
    );
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/admin/tenants')}
            >
              返回
            </Button>
            <span>创建租户</span>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ plan: 'free' }}
        >
          {/* 租户名称 */}
          <Form.Item
            name="name"
            label="租户名称"
            rules={[
              { required: true, message: '请输入租户名称' },
              { max: 50, message: '名称长度不超过 50 个字符' },
            ]}
          >
            <Input
              placeholder="请输入租户名称"
              onChange={handleNameChange}
            />
          </Form.Item>

          {/* Slug */}
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: '请输入 slug' },
              { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' },
            ]}
          >
            <Input placeholder="如：my-company" />
          </Form.Item>

          {/* 域名（可选） */}
          <Form.Item
            name="domain"
            label="自定义域名"
            rules={[
              { pattern: /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/, message: '请输入有效的域名' },
            ]}
          >
            <Input placeholder="如：example.com（可选）" />
          </Form.Item>

          <Divider />

          {/* 套餐选择 */}
          <Form.Item
            name="plan"
            label="选择套餐"
            rules={[{ required: true, message: '请选择套餐' }]}
          >
            <Radio.Group style={{ width: '100%' }}>
              <Row gutter={16}>
                {planConfigs.map((plan) => (
                  <Col span={8} key={plan.value}>
                    <Card
                      hoverable
                      onClick={() => setSelectedPlan(plan.value)}
                      style={{
                        borderColor: selectedPlan === plan.value ? plan.color : undefined,
                        borderWidth: selectedPlan === plan.value ? 2 : 1,
                      }}
                      styles={{
                        body: { padding: 16, textAlign: 'center' as const },
                      }}
                    >
                      <Radio value={plan.value} style={{ position: 'absolute', top: 12, left: 12 }}>
                        {selectedPlan === plan.value && <CheckCircleOutlined style={{ color: plan.color }} />}
                      </Radio>
                      <div style={{ color: plan.color, marginBottom: 8 }}>{plan.icon}</div>
                      <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                        {plan.title}
                      </Title>
                      <Text strong style={{ color: plan.color, fontSize: 18 }}>
                        {plan.price}
                      </Text>
                      <Divider style={{ margin: '12px 0' }} />
                      <Space direction="vertical" size={4} style={{ textAlign: 'left', width: '100%' }}>
                        {plan.features.map((feature, idx) => (
                          <Text key={idx} style={{ fontSize: 13, display: 'block' }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                            {feature}
                          </Text>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button onClick={() => navigate('/admin/tenants')}>取消</Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                创建租户
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default TenantCreate;
