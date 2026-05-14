/**
 * 模板列表管理页面
 * Template List Management Page - Admin UI
 */
import React, { useState, useEffect, useCallback } from 'react';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  Button, Space, Tag, Card, Tooltip, message, Popconfirm, Modal, Input, Select, Form,
  type TableColumnsType,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  AppstoreOutlined, CheckCircleOutlined, StopOutlined, FileAddOutlined,
} from '@ant-design/icons';
import { axiosInstance } from '@/admin/core/providers';

interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  layout_type: string;
  status: string;
  version: string;
  is_default: boolean;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'green', label: '已发布' },
  archived: { color: 'red', label: '已归档' },
};

const LAYOUT_TYPE_LABELS: Record<string, string> = {
  single_column: '单列',
  two_columns: '双列',
  sidebar_left: '左侧栏',
  sidebar_right: '右侧栏',
  dashboard: '仪表盘',
  custom: '自定义',
};

const CATEGORY_LABELS: Record<string, string> = {
  full_page: '整页模板',
  section: '区块模板',
  component: '单组件模板',
};

export const TemplateListManagement: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await axiosInstance.get('/api/v1/website-templates', {
        params: { page: 1, page_size: 100 },
      });
      setTemplates(resp.data.data || []);
    } catch (err: any) {
      message.error('获取模板列表失败: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreateLoading(true);
      const payload = {
        name: values.name,
        description: values.description || null,
        category: values.category || 'full_page',
        layout_type: values.layout_type || 'single_column',
        layout_config: { sections: [] },
        theme_config: { cssVariables: {} },
        meta_info: {},
      };
      await axiosInstance.post('/api/v1/website-templates', payload);
      message.success('模板已创建');
      setCreateModalOpen(false);
      form.resetFields();
      fetchTemplates();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('创建失败: ' + (err?.message || ''));
    } finally {
      setCreateLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await axiosInstance.post(`/api/v1/website-templates/${id}/publish`);
      message.success('模板已发布');
      fetchTemplates();
    } catch (err: any) {
      message.error('发布失败: ' + (err?.message || ''));
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await axiosInstance.put(`/api/v1/website-templates/${id}`, { status: 'archived' });
      message.success('模板已归档');
      fetchTemplates();
    } catch (err: any) {
      message.error('归档失败: ' + (err?.message || ''));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/api/v1/website-templates/${id}`);
      message.success('模板已删除');
      fetchTemplates();
    } catch (err: any) {
      message.error('删除失败: ' + (err?.message || ''));
    }
  };

  const columns: TableColumnsType<TemplateItem> = [
    {
      title: '名称', dataIndex: 'name', key: 'name', width: 200,
      render: (v: string, record) => (
        <Space>
          <span>{v}</span>
          {record.is_default && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 100,
      render: (v: string) => CATEGORY_LABELS[v] || v,
    },
    {
      title: '布局', dataIndex: 'layout_type', key: 'layout_type', width: 100,
      render: (v: string) => LAYOUT_TYPE_LABELS[v] || v,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => {
        const s = STATUS_MAP[v] || { color: 'default', label: v };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '版本', dataIndex: 'version', key: 'version', width: 80,
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (v: string | null) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', key: 'actions', width: 200, fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'draft' && (
            <Tooltip title="发布">
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                onClick={() => handlePublish(record.id)} />
            </Tooltip>
          )}
          {record.status === 'published' && (
            <Tooltip title="归档">
              <Button size="small" icon={<StopOutlined />}
                onClick={() => handleArchive(record.id)} />
            </Tooltip>
          )}
          <Popconfirm title="确定删除此模板？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Space><AppstoreOutlined /> 模板列表管理</Space>}
      extra={
        <Space>
          <Tooltip title="刷新"><Button icon={<ReloadOutlined />} onClick={fetchTemplates} /></Tooltip>
          <Button type="primary" icon={<FileAddOutlined />} onClick={() => setCreateModalOpen(true)}>
            新建模板
          </Button>
        </Space>
      }
    >
      <UnifiedTable
        storageKey="admin_template_list"
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
        scroll={{ x: 900 }}
        pagination={false}
      />

      <Modal
        title="新建模板"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => setCreateModalOpen(false)}
        confirmLoading={createLoading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="如：首页模板" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="模板用途说明" />
          </Form.Item>
          <Form.Item name="category" label="分类" initialValue="full_page">
            <Select options={[
              { value: 'full_page', label: '整页模板' },
              { value: 'section', label: '区块模板' },
              { value: 'component', label: '单组件模板' },
            ]} />
          </Form.Item>
          <Form.Item name="layout_type" label="布局类型" initialValue="single_column">
            <Select options={[
              { value: 'single_column', label: '单列' },
              { value: 'two_columns', label: '双列' },
              { value: 'sidebar_left', label: '左侧栏' },
              { value: 'sidebar_right', label: '右侧栏' },
              { value: 'dashboard', label: '仪表盘' },
              { value: 'custom', label: '自定义' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TemplateListManagement;
