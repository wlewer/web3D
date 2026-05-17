/**
 * 租户管理 - 编辑租户页
 *
 * 功能：
 * - 预填充现有数据
 * - 可编辑：名称、域名、状态、配额手动调整
 */

import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Card,
  message,
  InputNumber,
  Row,
  Col,
  Divider,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  BoxPlotOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useOne, useUpdate } from '@refinedev/core';
import { useNavigate, useParams } from 'react-router-dom';
import type { ITenant, TenantStatus } from '../types';

const { Title } = Typography;
const { Option } = Select;

interface EditFormValues {
  name: string;
  slug: string;
  domain?: string;
  status: TenantStatus;
  quota?: {
    modelCountLimit?: number;
    modelCountUsed?: number;
    storageLimit?: number;
    storageUsed?: number;
    aiCallsLimit?: number;
    aiCallsUsed?: number;
    pageViewsLimit?: number;
    pageViewsUsed?: number;
  };
}

export const TenantEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();

  // 使用 Refine useOne Hook 获取租户详情
  const { data, isLoading: isDataLoading } = useOne<ITenant>({
    resource: 'tenants',
    id: id || '',
  });

  const tenant = data?.data;

  // 使用 Refine useUpdate Hook
  const { mutate: updateTenant, isLoading: isUpdating } = useUpdate<ITenant>();

  // 初始化表单
  useEffect(() => {
    if (tenant) {
      form.setFieldsValue({
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        status: tenant.status,
        quota: {
          modelCountLimit: tenant.quota?.modelCount?.limit,
          modelCountUsed: tenant.quota?.modelCount?.used,
          storageLimit: tenant.quota?.storage?.limit,
          storageUsed: tenant.quota?.storage?.used,
          aiCallsLimit: tenant.quota?.aiCalls?.limit,
          aiCallsUsed: tenant.quota?.aiCalls?.used,
          pageViewsLimit: tenant.quota?.pageViews?.limit,
          pageViewsUsed: tenant.quota?.pageViews?.used,
        },
      });
    }
  }, [tenant, form]);

  const handleSubmit = (values: EditFormValues) => {
    if (!id) return;

    const updateData: any = {
      name: values.name,
      slug: values.slug,
      domain: values.domain,
      status: values.status,
    };

    // 配额调整
    if (values.quota) {
      updateData.quota = {
        model_count: {
          used: values.quota.modelCountUsed ?? 0,
          limit: values.quota.modelCountLimit ?? 0,
        },
        storage: {
          used: values.quota.storageUsed ?? 0,
          limit: values.quota.storageLimit ?? 0,
        },
        ai_calls: {
          used: values.quota.aiCallsUsed ?? 0,
          limit: values.quota.aiCallsLimit ?? 0,
        },
        page_views: {
          used: values.quota.pageViewsUsed ?? 0,
          limit: values.quota.pageViewsLimit ?? 0,
        },
      };
    }

    updateTenant(
      {
        resource: 'tenants',
        id,
        values: updateData,
      },
      {
        onSuccess: () => {
          message.success('租户更新成功');
          navigate(`/admin/tenants/${id}`);
        },
        onError: () => {
          message.error('更新失败');
        },
      }
    );
  };

  if (isDataLoading || !tenant) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      </Card>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/tenants')}>
              返回
            </Button>
            <span>编辑租户 - {tenant.name}</span>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* 基本信息 */}
          <Title level={5}>基本信息</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="租户名称"
                rules={[
                  { required: true, message: '请输入租户名称' },
                  { max: 50, message: '名称长度不超过 50 个字符' },
                ]}
              >
                <Input placeholder="请输入租户名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="slug"
                label="Slug"
                rules={[
                  { required: true, message: '请输入 slug' },
                  { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' },
                ]}
              >
                <Input placeholder="如：my-company" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="domain"
                label="自定义域名"
              >
                <Input placeholder="如：example.com" prefix={<GlobalOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="active">活跃</Option>
                  <Option value="inactive">未激活</Option>
                  <Option value="suspended">已停用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 配额调整 */}
          <Title level={5}>配额手动调整</Title>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card size="small" title={<Space><BoxPlotOutlined />模型数量</Space>}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name={['quota', 'modelCountUsed']} label="已用">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['quota', 'modelCountLimit']} label="上限">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title={<Space><DatabaseOutlined />存储空间 (MB)</Space>}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name={['quota', 'storageUsed']} label="已用">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['quota', 'storageLimit']} label="上限">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title={<Space><ThunderboltOutlined />AI 调用</Space>}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name={['quota', 'aiCallsUsed']} label="已用">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['quota', 'aiCallsLimit']} label="上限">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title={<Space><EyeOutlined />页面访问</Space>}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name={['quota', 'pageViewsUsed']} label="已用">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['quota', 'pageViewsLimit']} label="上限">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* 提交按钮 */}
          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button onClick={() => navigate('/admin/tenants')}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isUpdating}
                icon={<SaveOutlined />}
              >
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default TenantEdit;
