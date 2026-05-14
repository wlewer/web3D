/**
 * 官网模板管理页面
 * 统一管控官网（首页）所有展示模型
 * 
 * 功能：
 * - Hero 轮播区模型管理
 * - Gallery 画廊网格区管理
 * - 展示信息编辑（display_name / icon / color_hex / sort_order）
 * - 发布机制（更新缓存版本号，客户端即时刷新）
 */
import React, { useState, useEffect, useCallback } from 'react';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  Button,
  Space,
  Tag,
  Switch,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Card,
  Tooltip,
  Tabs,
  Checkbox,
  Drawer,
  Empty,
  Spin,
  type TableColumnsType,
} from 'antd';
import {
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  VerticalAlignTopOutlined,
  PlusOutlined,
  SendOutlined,
  PictureOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { axiosInstance } from '@/admin/core/providers';
import { RenderConfigEditor } from '../components/RenderConfigEditor';
import { ModelPreviewModal } from '@/admin/modules/model/components/ModelPreviewModal';
import type { RenderConfig } from '@/types/render-config';

// ==================== 类型定义 ====================

interface HeroModel {
  id: string;
  name: string;
  display_name?: string;
  icon?: string;
  color_hex?: string;
  category: string;
  format: string;
  model_url: string;
  show_on_homepage: boolean;
  sort_order: number;
  status: string;
  description?: string;
  created_at: string;
  renderConfig?: any;
  /** 产品标签 */
  products?: ProductTagItem[];
}

/** 产品标签条目 */
interface ProductTagItem {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  color?: string;
}

interface GalleryModelItem {
  id: string;
  name: string;
  display_name?: string;
  icon?: string;
  category: string;
  format: string;
  model_url: string;
  show_in_gallery: boolean;
  status: string;
  renderConfig?: any;
}

interface StatsData {
  heroCount: number;
  galleryCount: number;
  totalOnHomepage: number;
}

interface ApiModelData {
  id: string;
  name: string;
  display_name?: string;
  icon?: string;
  color_hex?: string;
  category: string;
  format: string;
  model_url: string;
  show_on_homepage: boolean;
  show_in_gallery: boolean;
  sort_order: number;
  status: string;
  description?: string;
  created_at: string;
}

interface ApiListResponse {
  data: ApiModelData[];
  total: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

const formatMap: Record<string, string> = {
  glb: 'GLB', gltf: 'GLTF', fbx: 'FBX', obj: 'OBJ',
  ply: 'PLY', splat: 'Splat', spz: '3DGS', stl: 'STL',
};

const categoryMap: Record<string, string> = {
  character: '角色', scene: '场景', prop: '道具', vehicle: '载具',
  box: '盒子', animation: '动画', nature: '自然', animal: '动物',
  architecture: '建筑', food: '食品', industry: '工业', art: '艺术',
  other: '其他',
};

// ==================== 主组件 ====================

export const OfficialTemplateManagement: React.FC = () => {
  // ===== 状态 =====
  const [activeTab, setActiveTab] = useState('hero');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Hero 模型列表
  const [heroModels, setHeroModels] = useState<HeroModel[]>([]);
  // Gallery 模型列表
  const [galleryModels, setGalleryModels] = useState<GalleryModelItem[]>([]);
  // 统计信息
  const [stats, setStats] = useState<StatsData>({ heroCount: 0, galleryCount: 0, totalOnHomepage: 0 });

  // 编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<HeroModel | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColorHex, setEditColorHex] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(0);

  // 添加模型弹窗
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState<ApiModelData[]>([]);
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  // 渲染控制
  const [globalRenderDefaults, setGlobalRenderDefaults] = useState<RenderConfig | null>(null);
  const [renderDefaultsLoading, setRenderDefaultsLoading] = useState(false);
  const [renderDefaultsSaving, setRenderDefaultsSaving] = useState(false);
  // 单模型编辑 Drawer（复用于 Hero/Gallery）
  const [renderDrawerVisible, setRenderDrawerVisible] = useState(false);
  const [renderDrawerModel, setRenderDrawerModel] = useState<any>(null);
  const [renderDrawerConfig, setRenderDrawerConfig] = useState<RenderConfig>({});
  const [renderDrawerSaving, setRenderDrawerSaving] = useState(false);
  // 单模型 Drawer 内嵌产品标签
  const [drawerProducts, setDrawerProducts] = useState<ProductTagItem[]>([]);

  // 渲染控制内嵌页签
  const [renderModelTab, setRenderModelTab] = useState('hero');

  // 产品标签编辑
  const [productTagModalVisible, setProductTagModalVisible] = useState(false);
  const [productTagEditingModel, setProductTagEditingModel] = useState<HeroModel | null>(null);
  const [productTagList, setProductTagList] = useState<ProductTagItem[]>([]);
  const [productTagSaving, setProductTagSaving] = useState(false);

  // 模型预览弹窗
  const [previewModel, setPreviewModel] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // ===== 数据加载 =====
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // 加载 Hero 模型
  useEffect(() => {
    setLoading(true);
    axiosInstance.get<ApiListResponse>('/models/homepage')
      .then(res => {
        const models = res.data.data || [];
        setHeroModels(models.map(m => ({
          ...m,
          sort_order: m.sort_order || 0,
          renderConfig: (m as any).metadata_json?.renderConfig || undefined,
          products: (m as any).metadata_json?.products || [],
        })));
        setStats(prev => ({ ...prev, heroCount: models.length }));
      })
      .catch(err => {
        console.error('加载首页模型失败:', err);
        message.error('加载首页模型失败');
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // 加载 Gallery 模型（show_in_gallery）
  useEffect(() => {
    axiosInstance.get<ApiListResponse>('/models/public?show_in_gallery=true&page_size=100')
      .then(res => {
        const models = res.data.data || [];
        setGalleryModels(models.map(m => ({
          ...m,
          renderConfig: (m as any).metadata_json?.renderConfig || undefined,
        })));
        setStats(prev => ({ ...prev, galleryCount: models.length }));
      })
      .catch(err => {
        console.error('加载画廊模型失败:', err);
      });
  }, [refreshKey]);

  // 统计总展示模型数
  useEffect(() => {
    setStats(prev => ({ ...prev, totalOnHomepage: prev.heroCount }));
  }, [stats.heroCount]);

  // ===== 加载全局渲染默认值 =====
  useEffect(() => {
    setRenderDefaultsLoading(true);
    axiosInstance.get('/settings/render-defaults')
      .then(res => {
        const data = res.data;
        if (data && data.value) {
          // 支持新旧两种存储格式：
          // 旧: value = { camera:..., decorations:... }（裸 RenderConfig）
          // 新: value = { renderConfig: {...}, products: [...] }
          const savedValue = data.value;
          if (savedValue.renderConfig) {
            setGlobalRenderDefaults(savedValue.renderConfig as RenderConfig);
          } else if (Object.keys(savedValue).length > 0) {
            setGlobalRenderDefaults(savedValue as RenderConfig);
          }
        }
      })
      .catch(err => console.error('加载渲染全局默认值失败:', err))
      .finally(() => setRenderDefaultsLoading(false));
  }, []);

  // ===== 操作处理 =====

  // 发布到官网
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await axiosInstance.post('/models/homepage/publish');
      message.success(`已发布到官网 (版本: ${res.data.version})`);
    } catch {
      message.error('发布失败');
    } finally {
      setPublishing(false);
    }
  };

  // 编辑弹窗
  const handleOpenEdit = (record: HeroModel) => {
    setEditingModel(record);
    setEditDisplayName(record.display_name || '');
    setEditIcon(record.icon || '');
    setEditColorHex(record.color_hex || '');
    setEditSortOrder(record.sort_order || 0);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingModel) return;
    try {
      await axiosInstance.put(`/models/${editingModel.id}`, {
        display_name: editDisplayName || null,
        icon: editIcon || null,
        color_hex: editColorHex || null,
        sort_order: editSortOrder,
      });
      message.success('保存成功');
      setEditModalVisible(false);
      setEditingModel(null);
      triggerRefresh();
    } catch {
      message.error('保存失败');
    }
  };

  // 从首页移除
  const handleRemoveFromHomepage = async (record: HeroModel) => {
    try {
      await axiosInstance.put(`/models/${record.id}`, {
        show_on_homepage: false,
        sort_order: 0,
      });
      message.success(`已从首页移除`);
      triggerRefresh();
    } catch {
      message.error('操作失败');
    }
  };

  // 调整排序
  // 一键置顶
  const handlePinToTop = async (record: HeroModel) => {
    try {
      const maxSort = Math.max(...heroModels.map(m => m.sort_order || 0), 0);
      await axiosInstance.put(`/models/${record.id}`, { sort_order: maxSort + 1 });
      message.success(`"${record.display_name || record.name}" 已置顶`);
      triggerRefresh();
    } catch {
      message.error('置顶失败');
    }
  };

  // 切换 Gallery 展示
  const handleToggleGallery = async (record: GalleryModelItem, checked: boolean) => {
    try {
      await axiosInstance.put(`/models/${record.id}`, {
        show_in_gallery: checked,
      });
      message.success(checked ? '已在画廊展示' : '已从画廊移除');
      triggerRefresh();
    } catch {
      message.error('操作失败');
    }
  };

  // 打开添加模型弹窗
  const handleOpenAdd = async () => {
    setAddModalVisible(true);
    setSelectedAddIds([]);
    setAddLoading(true);
    try {
      const res = await axiosInstance.get<ApiListResponse>('/models?page_size=100');
      const allModels = res.data.data || [];
      // 排除已在首页的
      const heroIds = new Set(heroModels.map(m => m.id));
      setAvailableModels(allModels.filter(m => m.status === 'approved' && !heroIds.has(m.id)));
    } catch {
      message.error('获取模型列表失败');
    } finally {
      setAddLoading(false);
    }
  };

  // 批量添加到首页
  const handleAddToHomepage = async () => {
    if (selectedAddIds.length === 0) {
      message.warning('请选择要添加的模型');
      return;
    }
    setAddLoading(true);
    let success = 0;
    let failed = 0;
    for (const id of selectedAddIds) {
      try {
        await axiosInstance.put(`/models/${id}`, {
          show_on_homepage: true,
          sort_order: 1,
        });
        success++;
      } catch {
        failed++;
      }
    }
    setAddLoading(false);
    if (success > 0) {
      message.success(`已将 ${success} 个模型添加到首页${failed > 0 ? `，${failed} 个失败` : ''}`);
      setAddModalVisible(false);
      triggerRefresh();
    } else {
      message.error('所有操作均失败');
    }
  };

  // ===== 渲染控制处理 =====

  // 保存全局默认值
  const handleSaveRenderDefaults = async (config: RenderConfig) => {
    setRenderDefaultsSaving(true);
    try {
      await axiosInstance.put('/settings/render-defaults', {
        value: {
          renderConfig: config,
        },
      });
      setGlobalRenderDefaults(config);
      message.success('全局渲染默认值已保存');
    } catch {
      message.error('保存全局渲染默认值失败');
    } finally {
      setRenderDefaultsSaving(false);
    }
  };

  // 打开单模型渲染配置 Drawer
  const handleOpenRenderDrawer = (record: any) => {
    setRenderDrawerModel(record);
    // 从已有 metadata_json 或空对象开始
    const existingConfig: RenderConfig = (record as any).renderConfig || {};
    setRenderDrawerConfig(existingConfig);
    // 加载已有的产品标签
    const existingProducts: ProductTagItem[] = (record as any).products || [];
    setDrawerProducts(existingProducts.length > 0 ? JSON.parse(JSON.stringify(existingProducts)) : []);
    setRenderDrawerVisible(true);
  };

  // 保存单模型渲染配置（★ 先 GET 合并，避免覆盖 products 等已有 metadata_json）
  const handleSaveModelRenderConfig = async () => {
    if (!renderDrawerModel) return;
    setRenderDrawerSaving(true);
    try {
      // ★ 先 GET 当前模型 metadata_json，合并后再 PUT
      const getRes = await axiosInstance.get(`/models/${renderDrawerModel.id}`);
      const currentMeta = (getRes.data as any).metadata_json || {};
      const mergedMeta = {
        ...currentMeta,
        renderConfig: renderDrawerConfig,
        // 同步保存产品标签（过滤掉空名称的）
        products: drawerProducts.filter(p => p.name.trim().length > 0),
      };

      await axiosInstance.put(`/models/${renderDrawerModel.id}`, {
        metadata_json: mergedMeta,
      });
      message.success(`模型 ${renderDrawerModel.display_name || renderDrawerModel.name} 的渲染配置已保存`);
      setRenderDrawerVisible(false);
      setRenderDrawerModel(null);
      triggerRefresh();
    } catch {
      message.error('保存渲染配置失败');
    } finally {
      setRenderDrawerSaving(false);
    }
  };

  // ===== 产品标签处理 =====

  // 打开产品标签编辑
  const handleOpenProductTag = (record: HeroModel) => {
    setProductTagEditingModel(record);
    setProductTagList(record.products ? JSON.parse(JSON.stringify(record.products)) : []);
    setProductTagModalVisible(true);
  };

  // 添加空白产品标签
  const handleAddProductTag = () => {
    const newId = `p${Date.now()}`;
    setProductTagList(prev => [...prev, {
      id: newId,
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      color: '#667eea',
    }]);
  };

  // 更新单个产品标签字段
  const handleUpdateProductTag = (index: number, field: keyof ProductTagItem, value: string) => {
    setProductTagList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // 删除产品标签
  const handleDeleteProductTag = (index: number) => {
    setProductTagList(prev => prev.filter((_, i) => i !== index));
  };

  // 保存产品标签
  const handleSaveProductTags = async () => {
    if (!productTagEditingModel) return;
    // 过滤掉空名称的标签
    const validTags = productTagList.filter(t => t.name.trim().length > 0);
    if (validTags.length === 0 && productTagList.length > 0) {
      message.warning('请至少填写一个标签的名称');
      return;
    }
    setProductTagSaving(true);
    try {
      // ★ 先 GET 当前模型，获取已有的 metadata_json（含 renderConfig），做合并避免覆盖
      const getRes = await axiosInstance.get(`/models/${productTagEditingModel.id}`);
      const currentMeta = (getRes.data as any).metadata_json || {};
      const mergedMeta = { ...currentMeta, products: validTags };

      await axiosInstance.put(`/models/${productTagEditingModel.id}`, {
        metadata_json: mergedMeta,
      });
      message.success(`模型 "${productTagEditingModel.display_name || productTagEditingModel.name}" 的产品标签已保存`);
      setProductTagModalVisible(false);
      setProductTagEditingModel(null);
      triggerRefresh();
    } catch {
      message.error('保存产品标签失败');
    } finally {
      setProductTagSaving(false);
    }
  };

  // 判断模型是否有自定义渲染配置
  const hasCustomRenderConfig = useCallback((model: any): boolean => {
    const rc = (model as any).renderConfig;
    return rc !== undefined && rc !== null && Object.keys(rc).length > 0;
  }, []);

  // 打开模型预览弹窗
  const handleView = (record: any) => {
    // ★ 关键修复：模板模型使用 snake_case 字段名，统一映射为 camelCase
    setPreviewModel({
      ...record,
      modelUrl: record.model_url || record.modelUrl || '',
      createdAt: record.created_at || record.createdAt,
      fileSize: record.fileSize || record.file_size || 0,
    });
    setPreviewVisible(true);
  };
  const handleClosePreview = () => {
    setPreviewVisible(false);
    setPreviewModel(null);
  };

  // ===== 表格列定义 =====

  // Hero 模型表格列
  const heroColumns: TableColumnsType<HeroModel> = [
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      render: (icon?: string) => <span style={{ fontSize: 24 }}>{icon || '📦'}</span>,
    },
    {
      title: '展示名称',
      key: 'display',
      width: 200,
      render: (_: any, record: HeroModel) => (
        <div style={{ cursor: 'pointer' }} onClick={() => handleView(record)}>
          <div style={{ fontWeight: 500, color: '#1677ff' }}>{record.display_name || record.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.name}</div>
        </div>
      ),
    },
    {
      title: '主题色',
      dataIndex: 'color_hex',
      key: 'color_hex',
      width: 100,
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
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat: string) => categoryMap[cat] || cat,
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (fmt: string) => (
        <Tag>{formatMap[fmt] || fmt}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          approved: 'green', pending: 'gold', rejected: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_: any, record: HeroModel) => (
        <Space size="small">
          <Tooltip title="编辑展示信息">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Tooltip title="编辑产品标签（3D场景中漂浮的文字卡片）">
            <Button
              type="link"
              size="small"
              icon={<AppstoreOutlined />}
              onClick={() => handleOpenProductTag(record)}
            >
              标签
            </Button>
          </Tooltip>
          <Tooltip title="一键置顶">
            <Button
              type="link"
              size="small"
              icon={<VerticalAlignTopOutlined />}
              onClick={() => handlePinToTop(record)}
            >
              置顶
            </Button>
          </Tooltip>
          <Popconfirm
            title={`从首页移除"${record.display_name || record.name}"？`}
            onConfirm={() => handleRemoveFromHomepage(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Gallery 模型表格列
  const galleryColumns: TableColumnsType<GalleryModelItem> = [
    {
      title: '模型信息',
      key: 'info',
      render: (_: any, record: GalleryModelItem) => (
        <Space style={{ cursor: 'pointer' }} onClick={() => handleView(record)}>
          <span style={{ fontSize: 24 }}>{record.icon || '📦'}</span>
          <div>
            <div style={{ fontWeight: 500, color: '#1677ff' }}>{record.display_name || record.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {formatMap[record.format] || record.format} | {record.category}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '展示在画廊',
      key: 'show_in_gallery',
      width: 120,
      render: (_: any, record: GalleryModelItem) => (
        <Switch
          checked={record.show_in_gallery}
          size="small"
          checkedChildren="是"
          unCheckedChildren="否"
          onChange={(checked) => handleToggleGallery(record, checked)}
        />
      ),
    },
  ];

  // 可选模型表格列
  const availableColumns: TableColumnsType<ApiModelData> = [
    {
      title: '选中',
      key: 'checkbox',
      width: 50,
      render: (_: any, record: ApiModelData) => (
        <Checkbox
          checked={selectedAddIds.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedAddIds(prev => [...prev, record.id]);
            } else {
              setSelectedAddIds(prev => prev.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: '模型',
      key: 'info',
      render: (_: any, record: ApiModelData) => (
        <Space>
          <span style={{ fontSize: 20 }}>{record.icon || '📦'}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{record.display_name || record.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {formatMap[record.format] || record.format} | {record.category}
            </div>
          </div>
        </Space>
      ),
    },
  ];

  // ===== 渲染控制表格列（Hero/Gallery 复用） =====
  const renderModelColumns: TableColumnsType<any> = [
    {
      title: '模型',
      key: 'model',
      width: 220,
      render: (_: any, record: any) => (
        <Space>
          <span style={{ fontSize: 20 }}>{record.icon || '📦'}</span>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{record.display_name || record.name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{record.category} | {formatMap[record.format] || record.format}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '渲染配置',
      key: 'status',
      width: 120,
      render: (_: any, record: any) => (
        hasCustomRenderConfig(record)
          ? <Tag color="blue">已自定义</Tag>
          : <Tag>继承全局</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 190,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button size="small" icon={<SettingOutlined />} onClick={() => handleOpenRenderDrawer(record)}>
            编辑渲染
          </Button>
          {hasCustomRenderConfig(record) && (
            <Popconfirm
              title="确定恢复为全局默认值？"
              onConfirm={async () => {
                try {
                  // ★ 先 GET 当前模型 metadata_json，合并后再 PUT（避免覆盖 products）
                  const getRes = await axiosInstance.get(`/models/${record.id}`);
                  const currentMeta = (getRes.data as any).metadata_json || {};
                  const mergedMeta = { ...currentMeta, renderConfig: null };

                  await axiosInstance.put(`/models/${record.id}`, {
                    metadata_json: mergedMeta,
                  });
                  message.success('已恢复为全局默认值');
                  triggerRefresh();
                } catch {
                  message.error('操作失败');
                }
              }}
            >
              <Button size="small" danger>恢复默认</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ===== 渲染 =====

  /** Hero 标签页：统计+操作+表格一体紧凑布局 */
  const heroTab = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 统计+操作一体化栏 */}
      <div style={{
        flexShrink: 0,
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>
          <PictureOutlined style={{ marginRight: 6 }} />Hero 轮播
          <span style={{ fontSize: 13, fontWeight: 400, color: '#666', marginLeft: 10 }}>{stats.heroCount} 个模型</span>
        </span>
        <Space wrap>
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            onClick={handlePublish}
            loading={publishing}
          >
            发布
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={triggerRefresh}>刷新</Button>
          <Button size="small" icon={<PlusOutlined />} onClick={handleOpenAdd}>添加</Button>
        </Space>
      </div>
      {heroModels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#999' }}>
          🖼️
          <h3>暂无 Hero 轮播模型</h3>
          <p style={{ marginBottom: 16 }}>点击右上角「添加」选择要展示的模型</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            从模型列表添加
          </Button>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <Card styles={{ body: { padding: 0 } }} style={{ height: '100%' }}>
            <UnifiedTable
              storageKey="admin_hero_list"
              rowKey="id"
              columns={heroColumns}
              dataSource={heroModels}
              loading={loading}
              pagination={{
                pageSize: 10,
                size: 'small',
              }}
              size="middle"
              scroll={{ y: 'calc(100vh - 370px)' }}
            />
          </Card>
        </div>
      )}
    </div>
  );

  /** Gallery 标签页：全屏表格，宽敞展示 */
  const galleryTab = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          <AppstoreOutlined style={{ marginRight: 6 }} />Gallery 画廊
          <span style={{ fontSize: 13, fontWeight: 400, color: '#666', marginLeft: 10 }}>{stats.galleryCount} 个模型</span>
        </div>
        <Button size="small" icon={<ReloadOutlined />} onClick={triggerRefresh}>刷新</Button>
      </div>
      {galleryModels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <h3>暂无 Gallery 网格模型</h3>
          <p>在「模型管理」中编辑模型的「展示在画廊」开关</p>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <Card styles={{ body: { padding: 0 } }} style={{ height: '100%' }}>
            <UnifiedTable
              storageKey="admin_gallery_list"
              rowKey="id"
              columns={galleryColumns}
              dataSource={galleryModels}
              loading={loading}
              pagination={{
                pageSize: 10,
              }}
              size="middle"
              scroll={{ y: 'calc(100vh - 370px)' }}
            />
          </Card>
        </div>
      )}
    </div>
  );

  /** 渲染控制标签页：全局默认值（左侧）+ 模型覆盖列表（右侧，内嵌页签） */
  const renderTab = (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* 左侧：全局默认值 */}
      <div style={{ width: '50%', minWidth: 440 }}>
        <Card
          size="small"
          title={
            <Space>
              <SettingOutlined />
              <span>全局渲染默认值</span>
              <Tag>设置首页模型默认渲染效果</Tag>
            </Space>
          }
          extra={
            <Button
              type="primary"
              size="small"
              onClick={() => handleSaveRenderDefaults(globalRenderDefaults || {})}
              loading={renderDefaultsSaving}
            >
              保存
            </Button>
          }
        >
          <Spin spinning={renderDefaultsLoading}>
            <RenderConfigEditor
              value={globalRenderDefaults || {}}
              onChange={setGlobalRenderDefaults}
              mode="global"
            />
          </Spin>
        </Card>
      </div>

      {/* 右侧：模型个性化覆盖 */}
      <div style={{ flex: 1, minWidth: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Card size="small" title={<Space><AppstoreOutlined /><span>模型个性化覆盖</span></Space>} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} styles={{ body: { flex: 1, overflow: 'auto', padding: 12 } }}>
          <Tabs
            activeKey={renderModelTab}
            onChange={setRenderModelTab}
            size="small"
            items={[
              {
                key: 'hero',
                label: `Hero 轮播 (${heroModels.length})`,
                children: heroModels.length === 0 ? (
                  <Empty description="暂无 Hero 模型，请先在对应标签页添加" />
                ) : (
                  <UnifiedTable
                    storageKey="admin_render_hero_list"
                    rowKey="id"
                    columns={renderModelColumns}
                    dataSource={heroModels}
                    pagination={{ pageSize: 5, size: 'small', showSizeChanger: false, showQuickJumper: false }}
                    size="middle"
                  />
                ),
              },
              {
                key: 'gallery',
                label: `Gallery 画廊 (${galleryModels.length})`,
                children: galleryModels.length === 0 ? (
                  <Empty description="暂无 Gallery 模型" />
                ) : (
                  <UnifiedTable
                    storageKey="admin_render_gallery_list"
                    rowKey="id"
                    columns={renderModelColumns}
                    dataSource={galleryModels}
                    pagination={{ pageSize: 5, size: 'small', showSizeChanger: false, showQuickJumper: false }}
                    size="middle"
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );

  const tabItems = [
    { key: 'hero', label: <span><PictureOutlined /> Hero 轮播管理</span>, children: heroTab },
    { key: 'gallery', label: <span><AppstoreOutlined /> Gallery 画廊管理</span>, children: galleryTab },
    { key: 'render', label: <span><SettingOutlined /> 渲染控制</span>, children: renderTab },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        style={{ marginBottom: 0 }}
      />

      {/* 编辑弹窗 */}
      <Modal
        title={`编辑首页展示信息 - ${editingModel?.display_name || editingModel?.name || ''}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingModel(null);
        }}
        onOk={handleSaveEdit}
        okText="保存"
        cancelText="取消"
        width={520}
      >
        {/* 模型基本信息预览 */}
        {editingModel && (
          <div style={{
            background: '#fafafa',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 32 }}>{editingModel.icon || '📦'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{editingModel.display_name || editingModel.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {editingModel.category} · {({
                  glb: 'GLB', gltf: 'GLTF', fbx: 'FBX', obj: 'OBJ',
                  ply: 'PLY', splat: 'Splat', spz: '3DGS', stl: 'STL',
                })[editingModel.format] || editingModel.format}
                {editingModel.color_hex && (
                  <span style={{ marginLeft: 8 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 12, height: 12,
                      borderRadius: 3,
                      background: editingModel.color_hex,
                      border: '1px solid #ddd',
                      verticalAlign: 'middle',
                      marginRight: 4,
                    }} />
                    {editingModel.color_hex}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>展示名称</div>
            <Input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              placeholder="首页展示的名称"
              maxLength={50}
              showCount
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>图标/Emoji</div>
            <Input
              value={editIcon}
              onChange={(e) => setEditIcon(e.target.value)}
              placeholder="如: 🦋"
              maxLength={10}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>主题色 (Hex)</div>
            <Input
              value={editColorHex}
              onChange={(e) => setEditColorHex(e.target.value)}
              placeholder="如: #667eea"
              maxLength={7}
              addonBefore={<span style={{
                display: 'inline-block',
                width: 18,
                height: 18,
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
                    width: 18,
                    height: 18,
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
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>排序权重 <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>（越大越靠前）</span></div>
            <InputNumber
              value={editSortOrder}
              onChange={(v) => setEditSortOrder(v || 0)}
              style={{ width: '100%' }}
              min={0}
              max={9999}
              placeholder="0"
            />
          </div>
        </Space>
      </Modal>

      {/* 添加模型弹窗 */}
      <Modal
        title="从模型列表添加到首页"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => setAddModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="add"
            type="primary"
            loading={addLoading}
            onClick={handleAddToHomepage}
            disabled={selectedAddIds.length === 0}
          >
            添加到首页 ({selectedAddIds.length} 个)
          </Button>,
        ]}
      >
        {availableModels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p>没有可添加的模型</p>
            <p style={{ fontSize: 12 }}>所有已审核通过的模型已在首页展示</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>
              共 {availableModels.length} 个已审核但未在首页展示的模型
            </div>
            <UnifiedTable
              storageKey="admin_add_models"
              rowKey="id"
              columns={availableColumns}
              dataSource={availableModels}
              loading={addLoading}
              pagination={{
                pageSize: 10,
                size: 'small',
              }}
              scroll={{ y: 300 }}
            />
          </>
        )}
      </Modal>

      {/* 单模型渲染配置 Drawer */}
      <Drawer
        title={`渲染配置 - ${renderDrawerModel?.display_name || renderDrawerModel?.name || ''}`}
        open={renderDrawerVisible}
        onClose={() => {
          setRenderDrawerVisible(false);
          setRenderDrawerModel(null);
        }}
        width={480}
        extra={
          <Space>
            <Button onClick={() => {
              setRenderDrawerVisible(false);
              setRenderDrawerModel(null);
            }}>
              取消
            </Button>
            <Button type="primary" loading={renderDrawerSaving} onClick={handleSaveModelRenderConfig}>
              保存到此模型
            </Button>
          </Space>
        }
      >
        {renderDrawerModel && (
          <RenderConfigEditor
            value={renderDrawerConfig}
            onChange={setRenderDrawerConfig}
            mode="model"
            globalDefaults={globalRenderDefaults}
            modelName={renderDrawerModel.display_name || renderDrawerModel.name}
            modelCategory={renderDrawerModel.category || ''}
            products={drawerProducts}
            onProductsChange={setDrawerProducts}
          />
        )}
      </Drawer>

      {/* 产品标签编辑弹窗 */}
      <Modal
        title={`编辑产品标签 - ${productTagEditingModel?.display_name || productTagEditingModel?.name || ''}`}
        open={productTagModalVisible}
        onCancel={() => {
          setProductTagModalVisible(false);
          setProductTagEditingModel(null);
        }}
        width={680}
        footer={[
          <Button key="cancel" onClick={() => {
            setProductTagModalVisible(false);
            setProductTagEditingModel(null);
          }}>
            取消
          </Button>,
          <Button key="save" type="primary" loading={productTagSaving} onClick={handleSaveProductTags}>
            保存
          </Button>,
        ]}
      >
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {productTagList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
              <p>暂无产品标签</p>
              <p style={{ fontSize: 12 }}>点击下方按钮添加</p>
            </div>
          ) : (
            productTagList.map((tag, index) => (
              <div
                key={tag.id}
                style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 12,
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>标签 #{index + 1}</span>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteProductTag(index)}
                  >
                    删除
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>中文名称（可含Emoji）</div>
                    <Input
                      size="small"
                      value={tag.name}
                      onChange={e => handleUpdateProductTag(index, 'name', e.target.value)}
                      placeholder="如: 🦋 生态研究"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>English Name</div>
                    <Input
                      size="small"
                      value={tag.nameEn || ''}
                      onChange={e => handleUpdateProductTag(index, 'nameEn', e.target.value)}
                      placeholder="如: Ecology Research"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>中文描述</div>
                    <Input
                      size="small"
                      value={tag.description}
                      onChange={e => handleUpdateProductTag(index, 'description', e.target.value)}
                      placeholder="如: 用于昆虫生态研究"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>English Description</div>
                    <Input
                      size="small"
                      value={tag.descriptionEn || ''}
                      onChange={e => handleUpdateProductTag(index, 'descriptionEn', e.target.value)}
                      placeholder="如: For insect ecology research"
                    />
                  </div>
                </div>
                <div>
                  <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>主题色</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={tag.color || '#667eea'}
                      onChange={e => handleUpdateProductTag(index, 'color', e.target.value)}
                      style={{ width: 32, height: 28, border: 'none', padding: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#666' }}>{tag.color || '#667eea'}</span>
                    {['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308', '#ef4444', '#10b981'].map(c => (
                      <span
                        key={c}
                        onClick={() => handleUpdateProductTag(index, 'color', c)}
                        style={{
                          display: 'inline-block',
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: c,
                          cursor: 'pointer',
                          border: (tag.color || '#667eea') === c ? '2px solid #333' : '1px solid #ddd',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddProductTag}
            style={{ width: '100%', marginTop: 4 }}
          >
            添加标签
          </Button>
        </div>
      </Modal>

      {/* 模型预览弹窗 */}
      <ModelPreviewModal
        visible={previewVisible}
        model={previewModel}
        onClose={handleClosePreview}
      />
    </div>
  );
};

export default OfficialTemplateManagement;
