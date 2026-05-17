/**
 * 页面管理 - 页面列表页
 * Page Management - Page List
 *
 * 功能：
 * - 页面列表表格（标题/状态/创建时间/操作）
 * - "新建页面"按钮 → 调用API → 跳转编辑器
 * - 每行操作：编辑(跳转编辑器) / 发布 / 删除
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Input,
  Modal,
  Form,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SendOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { TableColumnsType } from 'antd';
import { pageApi } from '../api';
import type { IPage, PageStatus } from '../types';

/** 状态映射 */
const statusMap: Record<PageStatus, { color: string; text: string }> = {
  draft: { color: 'gold', text: '草稿' },
  published: { color: 'green', text: '已发布' },
  archived: { color: 'default', text: '已归档' },
};

/**
 * PageList - 页面列表页
 */
const PageList: React.FC = () => {
  const navigate = useNavigate();

  const [pages, setPages] = useState<IPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  /** 加载页面列表 */
  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pageApi.getList();
      setPages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('获取页面列表失败:', error);
      message.error('获取页面列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  /** 新建页面 */
  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      const response = await pageApi.create({
        title: values.title,
        slug: values.slug || undefined,
      });

      const newPage = response.data;
      message.success('页面创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();

      // 跳转到编辑器
      navigate(`/editor/${newPage.id}`);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单验证错误，不显示消息
        return;
      }
      console.error('创建页面失败:', error);
      message.error('创建页面失败');
    }
  }, [createForm, navigate]);

  /** 编辑页面（跳转编辑器） */
  const handleEdit = useCallback(
    (pageId: string) => {
      navigate(`/editor/${pageId}`);
    },
    [navigate],
  );

  /** 发布页面 */
  const handlePublish = useCallback(
    async (pageId: string) => {
      try {
        await pageApi.publish(pageId);
        message.success('页面已发布');
        fetchPages();
      } catch (error) {
        console.error('发布失败:', error);
        message.error('发布失败');
      }
    },
    [fetchPages],
  );

  /** 删除页面 */
  const handleDelete = useCallback(
    async (pageId: string) => {
      try {
        await pageApi.delete(pageId);
        message.success('页面已删除');
        fetchPages();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    },
    [fetchPages],
  );

  /** 过滤页面 */
  const filteredPages = searchText
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(searchText.toLowerCase()) ||
          p.slug.toLowerCase().includes(searchText.toLowerCase()),
      )
    : pages;

  // 表格列配置
  const columns: TableColumnsType<IPage> = [
    {
      title: '页面标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: IPage) => (
        <Button type="link" onClick={() => handleEdit(record.id)} style={{ padding: 0 }}>
          {title}
        </Button>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      width: 180,
      render: (slug: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#8c8c8c' }}>
          {slug}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PageStatus) => {
        const map = statusMap[status] || { color: 'default', text: status };
        return <Tag color={map.color}>{map.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) =>
        date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (date: string) =>
        date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, record: IPage) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          {record.status !== 'published' && (
            <Button
              type="link"
              size="small"
              icon={<SendOutlined />}
              onClick={() => handlePublish(record.id)}
            >
              发布
            </Button>
          )}
          <Popconfirm
            title="确定删除此页面？"
            description="删除后不可恢复"
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

  return (
    <div>
      <Card
        title="页面管理"
        extra={
          <Space>
            <Input
              placeholder="搜索页面标题或Slug..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 240 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={fetchPages}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建页面
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredPages}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 个页面`,
          }}
        />
      </Card>

      {/* 新建页面弹窗 */}
      <Modal
        title="新建页面"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        okText="创建并编辑"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="title"
            label="页面标题"
            rules={[{ required: true, message: '请输入页面标题' }]}
          >
            <Input placeholder="例如：产品展示页" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="URL Slug"
            rules={[
              {
                pattern: /^[a-z0-9-]*$/,
                message: 'Slug只能包含小写字母、数字和连字符',
              },
            ]}
          >
            <Input placeholder="例如：product-showcase（留空自动生成）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PageList;
