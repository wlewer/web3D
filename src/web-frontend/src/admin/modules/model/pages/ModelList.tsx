/**
 * 模型管理 - 模型列表页
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Space,
  Tag,
  Image,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Tooltip,
  Switch,
  Modal,
  Upload,
} from 'antd';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  FolderOutlined,
  CopyOutlined,
  InboxOutlined,
  EditOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useList } from '@refinedev/core';
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
  disabled: { color: '#999', text: '已禁用' },
};

// 分类映射
const categoryMap: Record<ModelCategory, string> = {
  character: '角色',
  scene: '场景',
  prop: '道具',
  vehicle: '载具',
  box: '盒子',
  animation: '动画',
  nature: '自然',
  animal: '动物',
  architecture: '建筑',
  food: '食品',
  industry: '工业',
  art: '艺术',
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
  spz: '3DGS',
  stl: 'STL',
};

// 格式对应的颜色
const formatColors: Record<string, string> = {
  glb: '#1677ff',
  gltf: '#52c41a',
  fbx: '#fa8c16',
  obj: '#faad14',
  ply: '#722ed1',
  splat: '#eb2f96',
  spz: '#13c2c2',
  stl: '#ff4d4f',
};

// 格式缩略图占位组件
const FormatPlaceholder: React.FC<{ format: string; fileSize: number }> = ({ format, fileSize }) => {
  const fmt = (format || 'glb').toLowerCase();
  const color = formatColors[fmt] || '#1677ff';
  const label = formatMap[fmt] || fmt.toUpperCase();
  const sizeText = fileSize
    ? fileSize < 1024 * 1024
      ? `${(fileSize / 1024).toFixed(0)}KB`
      : `${(fileSize / (1024 * 1024)).toFixed(1)}MB`
    : '';
  return (
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 4,
        background: color + '15',
        border: '1px solid ' + color + '30',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        color: color,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1.2 }}>{label}</span>
      {sizeText && <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{sizeText}</span>}
    </div>
  );
};

export const ModelList: React.FC = () => {
  // const translate = useTranslate();  // 暂未使用，保留以便将来扩展
  // const navigate = useNavigate();  // 暂未使用，保留以便将来扩展
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ModelCategory | undefined>();
  const [statusFilter, setStatusFilter] = useState<ModelStatus | undefined>();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewModel, setPreviewModel] = useState<IModel | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 上传状态
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('other');
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploadIcon, setUploadIcon] = useState('');
  const [uploadColorHex, setUploadColorHex] = useState('');
  const [uploadShowOnHomepage, setUploadShowOnHomepage] = useState(false);
  const [uploadSortOrder, setUploadSortOrder] = useState(0);

  // 编辑状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<IModel | null>(null);
  const [editCategory, setEditCategory] = useState<ModelCategory>('other');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColorHex, setEditColorHex] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(0);

  // 文件替换状态
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replacingModelId = useRef<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  // 批量操作状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchCategoryModalVisible, setBatchCategoryModalVisible] = useState(false);
  const [batchCategory, setBatchCategory] = useState<ModelCategory>('other');

  // 拖拽排序状态
  const [dragIndex, setDragIndex] = useState<number>(-1);
  const [reordering, setReordering] = useState(false);

  // 获取统计信息
  useEffect(() => {
    modelApi.getStats()
      .then(res => setStatsData(res.data))
      .catch(err => console.warn('获取模型统计失败:', err));
  }, [refreshKey]);

  // 获取数据
  const listHook: any = useList<IModel>({
    resource: 'models',
    pagination: {
      current,
      pageSize,
    },
    filters: [
      ...(searchText ? [{ field: 'name', operator: 'contains' as const, value: searchText }] : []),
      ...(categoryFilter ? [{ field: 'category', operator: 'eq' as const, value: categoryFilter }] : []),
      ...(statusFilter ? [{ field: 'status', operator: 'eq' as const, value: statusFilter }] : []),
    ],
  });

  const data = listHook?.data?.data || [];
  const total = listHook?.data?.total || 0;
  const isLoading = listHook?.isLoading;
  const refetchData = () => {
    listHook?.refetch();
    setRefreshKey(k => k + 1);
  };

  // 表格列
  const columns: any = [
    {
      title: '',
      key: 'drag',
      width: 40,
      fixed: 'left' as const,
      render: () => (
        <span
          style={{
            cursor: 'grab',
            color: '#bbb',
            fontSize: 16,
            userSelect: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bbb')}
        >
          ⠿
        </span>
      ),
    },
    {
      title: '模型信息',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (_: string, record: IModel) => (
        <Space>
          {record.thumbnailUrl ? (
            <Image
              src={record.thumbnailUrl}
              width={60}
              height={60}
              style={{ objectFit: 'cover', borderRadius: 4 }}
              fallback="/placeholder-3d.png"
              preview={false}
            />
          ) : (
            <FormatPlaceholder format={record.format} fileSize={record.fileSize} />
          )}
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
      title: '启用',
      key: 'enabled',
      width: 80,
      render: (_: any, record: IModel) => {
        // 只对已审核通过的模型显示开关
        if (record.status !== 'approved' && record.status !== 'disabled') {
          return <span style={{ color: '#bbb', fontSize: 12 }}>-</span>;
        }
        return (
          <Switch
            checked={record.status === 'approved'}
            size="small"
            onChange={() => handleToggleVisibility(record)}
          />
        );
      },
    },
    {
      title: '首页',
      key: 'showOnHomepage',
      width: 80,
      render: (_: any, record: IModel) => (
        <Switch
          checked={!!record.showOnHomepage}
          size="small"
          checkedChildren="是"
          unCheckedChildren="否"
          onChange={(checked) => handleToggleHomepage(record, checked)}
        />
      ),
    },
    {
      title: '展示名',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 120,
      ellipsis: true,
      render: (name?: string) => name || '-',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      render: (icon?: string) => icon || '-',
    },
    {
      title: '主题色',
      dataIndex: 'colorHex',
      key: 'colorHex',
      width: 80,
      render: (color?: string) => {
        if (!color) return '-';
        return (
          <Space>
            <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: color, border: '1px solid #ddd' }} />
            <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{color}</span>
          </Space>
        );
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
      title: '文件路径',
      dataIndex: 'modelUrl',
      key: 'modelUrl',
      width: 200,
      ellipsis: true,
      render: (url: string) => {
        if (!url) return '-';
        // 提取可读的路径部分
        let displayPath = url;
        // 去除 http:// 或 https:// 前缀
        const httpIdx = displayPath.indexOf('//');
        if (httpIdx !== -1) {
          displayPath = displayPath.substring(httpIdx + 2);
          const slashIdx = displayPath.indexOf('/');
          if (slashIdx !== -1) {
            displayPath = displayPath.substring(slashIdx);
          }
        }
        // 简化 generation-models 路径
        const genPrefix = '/generation-models/';
        if (displayPath.startsWith(genPrefix)) {
          displayPath = '<生成目录>' + displayPath.substring(genPrefix.length - 1);
        }
        return (
          <Tooltip title={'完整路径: ' + url}>
            <Space
              size={4}
              style={{ cursor: 'pointer', fontSize: 12, color: '#888' }}
              onClick={() => {
                navigator.clipboard.writeText(url);
                message.success('路径已复制');
              }}
            >
              <FolderOutlined style={{ color: '#faad14' }} />
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                {displayPath}
              </span>
              <CopyOutlined style={{ fontSize: 10, color: '#bbb' }} />
            </Space>
          </Tooltip>
        );
      },
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
            second: '2-digit',
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
      width: 240,
      render: (_: any, record: IModel) => (
        <Space size="small" style={{ display: 'flex', flexWrap: 'nowrap' }}>
          <Tooltip title="查看模型">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            >
              查看
            </Button>
          </Tooltip>
          <Tooltip title="编辑信息">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Tooltip title="替换模型文件">
            <Button
              type="link"
              size="small"
              icon={<UploadOutlined />}
              loading={replacing && replacingModelId.current === record.id}
              onClick={() => handleReplaceFile(record)}
            >
              替换
            </Button>
          </Tooltip>
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

  const handleToggleVisibility = async (record: IModel) => {
    try {
      const newStatus = record.status === 'approved' ? '禁用' : '启用';
      await modelApi.toggleVisibility(record.id);
      message.success(`模型已${newStatus}`);
      refetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleHomepage = async (record: IModel, checked: boolean) => {
    try {
      await modelApi.update(record.id, {
        show_on_homepage: checked,
        sort_order: checked ? (record.sortOrder || 1) : 0,
      } as any);
      message.success(checked ? '已加入首页展示' : '已从首页移除');
      refetchData();
    } catch {
      message.error('操作失败');
    }
  };

  // ===== 编辑模型 =====
  const handleOpenEdit = (record: IModel) => {
    setEditingModel(record);
    setEditCategory(record.category);
    setEditDescription(record.description || '');
    setEditTags((record.tags || []).join(', '));
    setEditDisplayName(record.displayName || '');
    setEditIcon(record.icon || '');
    setEditColorHex(record.colorHex || '');
    setEditSortOrder(record.sortOrder || 0);
    setEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingModel(null);
  };

  // ===== 替换模型文件 =====
  const handleReplaceFile = (record: IModel) => {
    replacingModelId.current = record.id;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingModelId.current) return;
    setReplacing(true);
    try {
      await modelApi.replaceFile(replacingModelId.current, file);
      message.success('模型文件已替换');
      refetchData();
    } catch {
      message.error('文件替换失败，请检查文件格式');
    } finally {
      setReplacing(false);
      replacingModelId.current = null;
    }
  };

  const handleEditSave = async () => {
    if (!editingModel) return;
    try {
      await modelApi.update(editingModel.id, {
        category: editCategory,
        description: editDescription || undefined,
        tags: editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        display_name: editDisplayName || null,
        icon: editIcon || null,
        color_hex: editColorHex || null,
        sort_order: editSortOrder,
      } as any);
      message.success('模型信息已更新');
      setEditModalVisible(false);
      setEditingModel(null);
      refetchData();
    } catch {
      message.error('保存失败');
    }
  };

  // ===== 批量操作 =====
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await modelApi.batchDelete(selectedRowKeys as string[]);
      message.success(`成功删除 ${selectedRowKeys.length} 个模型`);
      setSelectedRowKeys([]);
      refetchData();
    } catch {
      message.error('批量删除失败');
    }
  };

  const handleBatchCategorySave = async () => {
    if (selectedRowKeys.length === 0) return;
    const ids = selectedRowKeys as string[];
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await modelApi.update(id, { category: batchCategory } as any);
        success++;
      } catch {
        failed++;
      }
    }
    if (success > 0) {
      message.success(`${success} 个模型分类已更新${failed > 0 ? `，${failed} 个失败` : ''}`);
    } else {
      message.error('批量修改分类失败');
    }
    setBatchCategoryModalVisible(false);
    setSelectedRowKeys([]);
    refetchData();
  };

  // ===== 拖拽排序 =====
  const handleDragSort = async (fromIndex: number, toIndex: number) => {
    if (reordering) return;
    setReordering(true);
    try {
      const items = [...data];
      const fromItem = items[fromIndex];
      const toItem = items[toIndex];
      if (!fromItem || !toItem) return;
      // 交换 sort_order
      await modelApi.update(fromItem.id, { sort_order: toItem.sortOrder || 0 } as any);
      await modelApi.update(toItem.id, { sort_order: fromItem.sortOrder || 0 } as any);
      message.success('排序已更新');
      refetchData();
    } catch {
      message.error('排序失败');
    } finally {
      setReordering(false);
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setCategoryFilter(undefined);
    setStatusFilter(undefined);
    refetchData();
  };

  // 上传相关
  const handleOpenUpload = () => {
    setUploadModalVisible(true);
    setUploadFileList([]);
    setUploadCategory('other');
  };

  const handleUploadCancel = () => {
    setUploadModalVisible(false);
    setUploadFileList([]);
    setUploadCategory('other');
    setUploadDisplayName('');
    setUploadIcon('');
    setUploadColorHex('');
    setUploadShowOnHomepage(false);
    setUploadSortOrder(0);
  };

  const handleUploadSubmit = async () => {
    if (uploadFileList.length === 0) {
      message.warning('请先选择要上传的模型文件');
      return;
    }
    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    for (const file of uploadFileList) {
      try {
        await modelApi.upload(file.originFileObj || file, uploadCategory, {
          displayName: uploadDisplayName || undefined,
          icon: uploadIcon || undefined,
          colorHex: uploadColorHex || undefined,
          showOnHomepage: uploadShowOnHomepage,
          sortOrder: uploadSortOrder || undefined,
        });
        successCount++;
      } catch (err) {
        failCount++;
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
    handleUploadCancel();

    if (successCount > 0) {
      message.success(`上传完成: ${successCount} 个成功${failCount > 0 ? `, ${failCount} 个失败` : ''}`);
      refetchData();
    } else {
      message.error('所有文件上传失败，请检查格式或联系管理员');
    }
  };

  const uploadProps = {
    onRemove: (file: any) => {
      setUploadFileList((prev: any[]) => prev.filter((f: any) => f.uid !== file.uid));
    },
    beforeUpload: (file: any) => {
      setUploadFileList((prev: any[]) => [...prev, file]);
      return false; // 阻止自动上传
    },
    fileList: uploadFileList,
    multiple: true,
    accept: '.glb,.gltf,.ply,.spz,.obj,.fbx,.stl,.splat',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 统计卡片 + 操作栏 - 一体化紧凑布局 */}
      <div style={{ flexShrink: 0, marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Card size="small" styles={{ body: { padding: '8px 16px' } }} style={{ flex: 1, minWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
            <Space size={20}>
              <div style={{ textAlign: 'center', minWidth: 48 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff', lineHeight: 1.2 }}>{statsData?.total ?? total}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>总模型</div>
              </div>
              <div style={{ width: 1, height: 32, background: '#f0f0f0' }} />
              <div style={{ textAlign: 'center', minWidth: 48 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#faad14', lineHeight: 1.2 }}>{statsData?.pending ?? 0}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>待审核</div>
              </div>
              <div style={{ width: 1, height: 32, background: '#f0f0f0' }} />
              <div style={{ textAlign: 'center', minWidth: 48 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a', lineHeight: 1.2 }}>{statsData?.approved ?? 0}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>已通过</div>
              </div>
              <div style={{ width: 1, height: 32, background: '#f0f0f0' }} />
              <div style={{ textAlign: 'center', minWidth: 48 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4d4f', lineHeight: 1.2 }}>{statsData?.rejected ?? 0}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>已驳回</div>
              </div>
              <div style={{ width: 1, height: 32, background: '#f0f0f0' }} />
              <div style={{ textAlign: 'center', minWidth: 48 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#999', lineHeight: 1.2 }}>{statsData?.disabled ?? 0}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>已禁用</div>
              </div>
            </Space>
            <Space wrap>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleOpenUpload}
              >
                上传模型
              </Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleResetFilters}>
                重置筛选
              </Button>
            </Space>
          </div>
        </Card>
      </div>



      {/* 数据表格 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Card
          styles={{ body: { padding: 0 } }}
          style={{ height: '100%' }}
        >
          <UnifiedTable
            storageKey="admin_model_list"
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={isLoading || reordering}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
            }}
            pagination={{
              current,
              pageSize,
              total,
              onChange: (page, size) => {
                setCurrent(page);
                setPageSize(size);
              },
            }}
            title={() => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {selectedRowKeys.length > 0 && (
                  <>
                    <span style={{ fontWeight: 500, color: '#52c41a', fontSize: 13, whiteSpace: 'nowrap' }}>
                      已选择 {selectedRowKeys.length} 项
                    </span>
                    <Popconfirm
                      title="确定批量删除所选模型？（关联文件将被一并删除）"
                      onConfirm={handleBatchDelete}
                    >
                      <Button danger icon={<DeleteOutlined />} size="small">
                        批量删除
                      </Button>
                    </Popconfirm>
                    <Button
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => setBatchCategoryModalVisible(true)}
                    >
                      批量修改分类
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setSelectedRowKeys([])}
                    >
                      取消选择
                    </Button>
                    <div style={{ width: 1, height: 22, background: '#e8e8e8' }} />
                  </>
                )}
                <Input.Search
                  placeholder="搜索模型名称"
                  allowClear
                  size="small"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={refetchData}
                  style={{ width: 200 }}
                  prefix={<SearchOutlined />}
                />
                <Select
                  placeholder="分类筛选"
                  allowClear
                  size="small"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  style={{ width: 130 }}
                >
                  {Object.entries(categoryMap).map(([value, label]) => (
                    <Option key={value} value={value}>{label}</Option>
                  ))}
                </Select>
                <Select
                  placeholder="状态筛选"
                  allowClear
                  size="small"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 130 }}
                >
                  {Object.entries(statusMap).map(([value, { text }]) => (
                    <Option key={value} value={value}>{text}</Option>
                  ))}
                </Select>
              </div>
            )}
            onRow={(record: IModel, rowIndex: number | undefined) => ({
              draggable: true,
              onDragStart: (e: React.DragEvent) => {
                setDragIndex(rowIndex ?? -1);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', record.id);
              },
              onDragOver: (e: React.DragEvent) => {
                e.preventDefault();
              },
              onDragEnd: () => {
                if (dragIndex >= 0 && rowIndex !== undefined && rowIndex !== dragIndex) {
                  handleDragSort(dragIndex, rowIndex);
                }
                setDragIndex(-1);
              },
              style: {
                ...(rowIndex === dragIndex ? { opacity: 0.5, background: '#f0f5ff' } : {}),
                ...(rowIndex !== undefined && data[rowIndex]?.id && dragIndex >= 0 && data[dragIndex]?.id !== data[rowIndex]?.id && document.querySelector(`[data-row-key="${data[rowIndex]?.id}"]`) ? { borderTop: '2px solid #1677ff' } : {}),
              },
            })}
            scroll={{ y: 'calc(100vh - 355px)', x: 1300 }}
          />
        </Card>
      </div>

      {/* 上传模型弹窗 */}
      <Modal
        title="上传模型"
        open={uploadModalVisible}
        onCancel={handleUploadCancel}
        width={640}
        footer={[
          <Button key="cancel" onClick={handleUploadCancel}>
            取消
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={uploading}
            onClick={handleUploadSubmit}
            disabled={uploadFileList.length === 0}
          >
            {uploading ? '上传中...' : `开始上传 (${uploadFileList.length} 个文件)`}
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>模型文件</div>
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域</p>
              <p className="ant-upload-hint">
                支持格式: GLB, GLTF, PLY, SPZ, OBJ, FBX, STL, SPLAT<br />
                可一次性选择多个文件上传
              </p>
            </Upload.Dragger>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>模型分类</div>
              <Select
                value={uploadCategory}
                onChange={setUploadCategory}
                style={{ width: '100%' }}
              >
                <Option value="other">其他</Option>
                <Option value="scene">场景</Option>
                <Option value="character">角色</Option>
                <Option value="prop">道具</Option>
                <Option value="vehicle">载具</Option>
                <Option value="food">食品</Option>
                <Option value="industry">工业</Option>
                <Option value="nature">自然</Option>
                <Option value="architecture">建筑</Option>
                <Option value="art">艺术</Option>
                <Option value="animal">动物</Option>
              </Select>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>首页排序</div>
              <InputNumber
                value={uploadSortOrder}
                onChange={(v) => setUploadSortOrder(v || 0)}
                style={{ width: '100%' }}
                placeholder="排序值（越大越靠前）"
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>展示名称</div>
              <Input
                value={uploadDisplayName}
                onChange={(e) => setUploadDisplayName(e.target.value)}
                placeholder="如：蓝色大闪蝶"
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>图标/Emoji</div>
              <Input
                value={uploadIcon}
                onChange={(e) => setUploadIcon(e.target.value)}
                placeholder="如：🦋"
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>主题色</div>
              <Input
                value={uploadColorHex}
                onChange={(e) => setUploadColorHex(e.target.value)}
                placeholder="如：#667eea"
              />
            </Col>
          </Row>
          <div>
            <Switch
              checked={uploadShowOnHomepage}
              onChange={setUploadShowOnHomepage}
            />
            <span style={{ marginLeft: 8 }}>上传后立即在首页展示</span>
          </div>
        </Space>
      </Modal>

      {/* 编辑模型弹窗 */}
      <Modal
        title={`编辑模型 - ${editingModel?.name || ''}`}
        open={editModalVisible}
        onCancel={handleEditCancel}
        onOk={handleEditSave}
        width={640}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>模型名称</div>
              <Input value={editingModel?.name || ''} disabled />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>分类</div>
              <Select
                value={editCategory}
                onChange={(v) => setEditCategory(v)}
                style={{ width: '100%' }}
              >
                {Object.entries(categoryMap).map(([value, label]) => (
                  <Option key={value} value={value}>{label}</Option>
                ))}
              </Select>
            </Col>
          </Row>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>描述</div>
            <Input.TextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              placeholder="模型描述信息"
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>标签（逗号分隔）</div>
            <Input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="如: 动物, 蝴蝶, 自然"
            />
          </div>
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
            <div style={{ marginBottom: 12, fontWeight: 500, color: '#667eea' }}>首页展示设置</div>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>展示名称</div>
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="如：蓝色大闪蝶"
                />
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>图标/Emoji</div>
                <Input
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  placeholder="如：&#x1f98b;"
                />
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>排序权重</div>
                <InputNumber
                  value={editSortOrder}
                  onChange={(v) => setEditSortOrder(v || 0)}
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="越大越靠前"
                />
              </Col>
            </Row>
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>主题色 (Hex)</div>
              <Input
                value={editColorHex}
                onChange={(e) => setEditColorHex(e.target.value)}
                placeholder="如: #667eea"
                maxLength={7}
                addonBefore={<span style={{
                  display: 'inline-block',
                  width: 18, height: 18,
                  borderRadius: 4,
                  background: editColorHex || '#ccc',
                  border: '1px solid #ddd',
                  verticalAlign: 'middle',
                }} />}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                常用色：
                {['#667eea', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2', '#ff4d4f', '#faad14'].map(color => (
                  <span
                    key={color}
                    onClick={() => setEditColorHex(color)}
                    style={{
                      display: 'inline-block',
                      width: 18, height: 18,
                      borderRadius: 4,
                      background: color,
                      border: editColorHex === color ? '2px solid #333' : '1px solid #ddd',
                      cursor: 'pointer',
                      marginLeft: 4,
                      verticalAlign: 'middle',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Space>
      </Modal>

      {/* 批量修改分类弹窗 */}
      <Modal
        title={`批量修改分类 (${selectedRowKeys.length} 个模型)`}
        open={batchCategoryModalVisible}
        onCancel={() => setBatchCategoryModalVisible(false)}
        onOk={handleBatchCategorySave}
        okText="确认修改"
        cancelText="取消"
        width={400}
      >
        <div style={{ marginBottom: 8, fontWeight: 500 }}>选择新分类</div>
        <Select
          value={batchCategory}
          onChange={(v) => setBatchCategory(v)}
          style={{ width: '100%' }}
        >
          {Object.entries(categoryMap).map(([value, label]) => (
            <Option key={value} value={value}>{label}</Option>
          ))}
        </Select>
      </Modal>

      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.ply,.spz,.obj,.fbx,.stl,.splat"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

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
