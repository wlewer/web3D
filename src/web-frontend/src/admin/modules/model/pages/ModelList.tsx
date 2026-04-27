/**
 * 模型管理 - 模型列表页
 */

import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Image,
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
  CloseCircleOutlined,
  ReloadOutlined,
  BoxPlotOutlined,
} from '@ant-design/icons';
import { useList, useTranslate } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import type { IModel, ModelStatus, ModelCategory } from '../types';
import { modelApi } from '../api';
import { ModelPreviewModal } from '../components/ModelPreviewModal';

const { Option } = Select;

// 状态映射
const statusMap: Record<ModelStatus, { color: string; text: string }> = {
  pending: { color: 'gold', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已驳回' },
  archived: { color: 'default', text: '已归档' },
};

// 分类映射
const categoryMap: Record<ModelCategory, string> = {
  character: '角色',
  scene: '场景',
  prop: '道具',
  vehicle: '载具',
  other: '其他',
};

// 格式映射
const formatMap: Record<string, string> = {
  glb: 'GLB',
  gltf: 'GLTF',
  fbx: 'FBX',
  obj: 'OBJ',
  ply: 'PLY',
  splat: 'Splat (3DGS)',
};

export const ModelList: React.FC = () => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ModelCategory | undefined>();
  const [statusFilter, setStatusFilter] = useState<ModelStatus | undefined>();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewModel, setPreviewModel] = useState<IModel | null>(null);

  // 获取数据
  const { result, query } = useList<IModel>({
    resource: 'models',
    pagination: { currentPage: 1, pageSize: 10 },
    filters: [
      ...(searchText ? [{ field: 'name', operator: 'contains' as const, value: searchText }] : []),
      ...(categoryFilter ? [{ field: 'category', operator: 'eq' as const, value: categoryFilter }] : []),
      ...(statusFilter ? [{ field: 'status', operator: 'eq' as const, value: statusFilter }] : []),
    ],
  });

  const data = result?.data || [];
  const total = result?.total || 0;
  const isLoading = query?.isLoading;
  const refetchData = () => query?.refetch();

  // 表格列
  const columns: any = [
    {
      title: '模型信息',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (_: string, record: IModel) => (
        <Space>
          <Image
            src={record.thumbnailUrl || '/placeholder-3d.png'}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="/placeholder-3d.png"
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {formatMap[record.format] || record.format}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: ModelCategory) => categoryMap[category],
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ModelStatus) => {
        const { color, text } = statusMap[status];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size: number) => {
        if (size < 1024 * 1024) {
          return `${(size / 1024).toFixed(2)} KB`;
        }
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
      },
    },
    {
      title: '面数',
      dataIndex: 'polygonCount',
      key: 'polygonCount',
      width: 100,
      render: (count?: number) => count?.toLocaleString() || '-',
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
      render: (_: any, record: IModel) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="通过该模型？"
                onConfirm={() => handleReview(record.id, 'approved')}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                >
                  通过
                </Button>
              </Popconfirm>
              <Popconfirm
                title="驳回该模型？"
                onConfirm={() => handleReview(record.id, 'rejected')}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<CloseCircleOutlined />}
                  danger
                >
                  驳回
                </Button>
              </Popconfirm>
            </>
          )}
          <Popconfirm
            title="确定要删除该模型吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 事件处理
  const handleView = (model: IModel) => {
    // 打开3D预览弹窗
    setPreviewModel(model);
    setPreviewVisible(true);
  };

  const handleClosePreview = () => {
    setPreviewVisible(false);
    setPreviewModel(null);
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await modelApi.review(id, {
        status,
        rejectionReason: status === 'rejected' ? '不符合要求' : undefined,
      });
      message.success(status === 'approved' ? '审核通过' : '已驳回');
      refetchData();
    } catch {
      message.error('审核失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await modelApi.delete(id);
      message.success('删除成功');
      refetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setCategoryFilter(undefined);
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
              title="总模型数"
              value={total}
              prefix={<BoxPlotOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核"
              value={0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已通过"
              value={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已驳回"
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
            onClick={() => message.info('上传模型功能待实现')}
          >
            上传模型
          </Button>

          <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
            重置筛选
          </Button>
        </Space>

        <Space wrap style={{ marginTop: 16 }}>
          <Input.Search
            placeholder="搜索模型名称"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={refetchData}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />

          <Select
            placeholder="分类筛选"
            allowClear
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 150 }}
          >
            <Option value="character">角色</Option>
            <Option value="scene">场景</Option>
            <Option value="prop">道具</Option>
            <Option value="vehicle">载具</Option>
            <Option value="other">其他</Option>
          </Select>

          <Select
            placeholder="状态筛选"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Option value="pending">待审核</Option>
            <Option value="approved">已通过</Option>
            <Option value="rejected">已驳回</Option>
            <Option value="archived">已归档</Option>
          </Select>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          pagination={{
            current: 1,
            pageSize: 10,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 3D模型预览弹窗 */}
      <ModelPreviewModal
        visible={previewVisible}
        model={previewModel}
        onClose={handleClosePreview}
      />
    </div>
  );
};

export default ModelList;
