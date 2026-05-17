/**
 * Model3DPicker - 3D 模型选择器
 * 3D Model Picker
 *
 * 从后端 API 加载模型列表，网格展示缩略图，支持搜索和分类筛选。
 * 以 Modal 弹窗形式呈现。
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Input,
  Select,
  Empty,
  Spin,
  Card,
  Space,
  Badge,
  Pagination,
} from 'antd';
import { SearchOutlined, FileOutlined } from '@ant-design/icons';
import axios from 'axios';

/** 模型数据项 */
export interface Model3DItem {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  modelUrl: string;
  format: string;
  category?: string;
  tags?: string[];
  createdAt?: string;
}

/** Model3DPicker 组件属性 */
export interface Model3DPickerProps {
  /** 弹窗是否可见 */
  visible: boolean;
  /** 关闭回调 */
  onCancel: () => void;
  /** 选择回调 */
  onSelect: (model: { modelId: string; modelUrl: string; name: string }) => void;
  /** 弹窗标题 */
  title?: string;
  /** API 基础路径 */
  apiBaseUrl?: string;
}

/** 模型分类选项 */
const MODEL_CATEGORIES = [
  { value: 'all', label: '全部分类' },
  { value: 'character', label: '角色' },
  { value: 'animal', label: '动物' },
  { value: 'scene', label: '场景' },
  { value: 'product', label: '产品' },
  { value: 'food', label: '食物' },
  { value: 'vehicle', label: '交通工具' },
  { value: 'architecture', label: '建筑' },
  { value: 'other', label: '其他' },
];

/** 每页显示数量 */
const PAGE_SIZE = 12;

/**
 * Model3DPicker - 3D 模型选择器弹窗
 *
 * 从后端加载模型列表，支持搜索、分类筛选和分页。
 */
export const Model3DPicker: React.FC<Model3DPickerProps> = ({
  visible,
  onCancel,
  onSelect,
  title = '选择 3D 模型',
  apiBaseUrl = '',
}) => {
  const [models, setModels] = useState<Model3DItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载模型列表
  useEffect(() => {
    if (!visible) return;

    const fetchModels = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${apiBaseUrl}/api/v1/models`, {
          params: {
            page: currentPage,
            page_size: PAGE_SIZE,
            category: selectedCategory === 'all' ? undefined : selectedCategory,
            search: searchQuery || undefined,
          },
        });

        // 适配后端返回格式
        const data = response.data;
        const items: Model3DItem[] = Array.isArray(data)
          ? data
          : data.items || data.data || data.models || [];

        setModels(items);
      } catch (err) {
        console.error('[Model3DPicker] 加载模型失败:', err);
        setError('加载模型列表失败，请稍后重试');
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [visible, currentPage, selectedCategory, searchQuery, apiBaseUrl]);

  // 筛选后的模型列表（客户端二次过滤）
  const filteredModels = useMemo(() => {
    let result = [...models];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query) ||
          m.tags?.some((t) => t.toLowerCase().includes(query)),
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter((m) => m.category === selectedCategory);
    }

    return result;
  }, [models, searchQuery, selectedCategory]);

  const handleSelect = useCallback(
    (model: Model3DItem) => {
      setSelectedModelId(model.id);
      onSelect({
        modelId: model.id,
        modelUrl: model.modelUrl,
        name: model.name,
      });
    },
    [onSelect],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  }, []);

  const formatLabel = (format: string) => {
    const fmt = format.toUpperCase();
    const colorMap: Record<string, string> = {
      GLB: '#52c41a',
      GLTF: '#52c41a',
      SPZ: '#1890ff',
      PLY: '#faad14',
      SPLAT: '#722ed1',
      OBJ: '#fa541c',
      FBX: '#eb2f96',
    };
    return <Badge color={colorMap[fmt] || '#8c8c8c'} text={fmt} />;
  };

  return (
    <Modal
      open={visible}
      title={title}
      onCancel={onCancel}
      width={800}
      footer={null}
      destroyOnClose
    >
      {/* 搜索和筛选栏 */}
      <Space style={{ width: '100%', marginBottom: 16 }} size={12}>
        <Input
          placeholder="搜索模型名称、描述或标签..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={handleSearchChange}
          allowClear
          style={{ width: 280 }}
        />
        <Select
          value={selectedCategory}
          onChange={handleCategoryChange}
          options={MODEL_CATEGORIES}
          style={{ width: 160 }}
        />
      </Space>

      {/* 模型网格 */}
      <Spin spinning={loading} tip="加载模型中...">
        {error ? (
          <Empty description={error} />
        ) : filteredModels.length === 0 ? (
          <Empty
            description={
              searchQuery || selectedCategory !== 'all'
                ? '未找到匹配的模型'
                : '暂无可用模型'
            }
          />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {filteredModels.map((model) => (
                <Card
                  key={model.id}
                  hoverable
                  size="small"
                  onClick={() => handleSelect(model)}
                  style={{
                    border:
                      selectedModelId === model.id
                        ? '2px solid #1677ff'
                        : '1px solid #f0f0f0',
                    cursor: 'pointer',
                  }}
                  cover={
                    model.thumbnailUrl ? (
                      <div
                        style={{
                          height: 120,
                          backgroundImage: `url(${model.thumbnailUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 120,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px 4px 0 0',
                        }}
                      >
                        <FileOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                      </div>
                    )
                  }
                >
                  <Card.Meta
                    title={
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={model.name}
                      >
                        {model.name}
                      </div>
                    }
                    description={
                      <Space size={4}>
                        {formatLabel(model.format)}
                        {model.category && (
                          <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                            {model.category}
                          </span>
                        )}
                      </Space>
                    }
                  />
                </Card>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                current={currentPage}
                pageSize={PAGE_SIZE}
                total={filteredModels.length}
                onChange={setCurrentPage}
                size="small"
                showSizeChanger={false}
              />
            </div>
          </>
        )}
      </Spin>
    </Modal>
  );
};

Model3DPicker.displayName = 'Model3DPicker';
