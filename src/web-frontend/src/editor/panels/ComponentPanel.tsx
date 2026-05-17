/**
 * ComponentPanel - 组件面板主容器
 * Component Panel
 *
 * 固定宽度 280px 的左侧边栏，包含：
 * - 顶部搜索框
 * - 分类 Tab
 * - 按分类折叠/展开的组件网格
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Collapse, Empty, Space } from 'antd';
import { AppstoreAddOutlined } from '@ant-design/icons';
import { ComponentSearch } from './ComponentSearch';
import { CategoryFilter } from './CategoryFilter';
import { ComponentCard } from './ComponentCard';
import { ComponentRegistry } from '../core/ComponentRegistry';
import type { ComponentCategory } from '../types/plugin';
import type { IComponentPlugin } from '../types/plugin';
import type { DragItem } from '../types/dnd';

const { Panel } = Collapse;

/** 分类分组顺序 */
const CATEGORY_ORDER: ComponentCategory[] = [
  'layout',
  'basic-ui',
  '3d-atomic',
  '3d-business',
  'marketing',
  'ai',
  'custom',
];

/** 分类显示名称映射 */
const CATEGORY_LABELS: Record<string, string> = {
  layout: '布局',
  'basic-ui': '基础UI',
  '3d-atomic': '3D原子',
  '3d-business': '3D业务',
  marketing: '营销',
  ai: 'AI',
  custom: '自定义',
};

/** ComponentPanel 组件属性 */
export interface ComponentPanelProps {
  /** 样式类名 */
  className?: string;
  /** 拖拽开始回调 */
  onDragStart?: (item: DragItem) => void;
  /** 拖拽结束回调 */
  onDragEnd?: (item: DragItem, didDrop: boolean) => void;
}

/**
 * ComponentPanel - 左侧组件面板
 *
 * 展示所有可用组件，支持搜索、分类筛选和拖拽。
 */
export const ComponentPanel: React.FC<ComponentPanelProps> = ({
  className,
  onDragStart,
  onDragEnd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeCollapseKeys, setActiveCollapseKeys] = useState<string[]>(CATEGORY_ORDER);

  const registry = useMemo(() => ComponentRegistry.getInstance(), []);

  // 获取过滤后的组件列表
  const filteredPlugins = useMemo(() => {
    let plugins: IComponentPlugin[];

    if (searchQuery) {
      plugins = registry.search(searchQuery);
    } else if (activeCategory !== 'all') {
      plugins = registry.getByCategory(activeCategory as ComponentCategory);
    } else {
      plugins = registry.getAll();
    }

    return plugins;
  }, [registry, searchQuery, activeCategory]);

  // 按分类分组
  const groupedPlugins = useMemo(() => {
    const groups: Record<string, IComponentPlugin[]> = {};

    filteredPlugins.forEach((plugin) => {
      const category = plugin.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(plugin);
    });

    // 按预定义顺序排序
    const ordered: Record<string, IComponentPlugin[]> = {};
    CATEGORY_ORDER.forEach((cat) => {
      if (groups[cat] && groups[cat].length > 0) {
        ordered[cat] = groups[cat];
      }
    });

    // 添加未在预定义顺序中的分类
    Object.keys(groups).forEach((cat) => {
      if (!ordered[cat]) {
        ordered[cat] = groups[cat];
      }
    });

    return ordered;
  }, [filteredPlugins]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryChange = useCallback((key: string) => {
    setActiveCategory(key);
  }, []);

  const hasResults = filteredPlugins.length > 0;

  return (
    <div
      className={className}
      style={{
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        borderRight: '1px solid #f0f0f0',
        overflow: 'hidden',
      }}
    >
      {/* 搜索框 */}
      <ComponentSearch
        onSearch={handleSearch}
        hasResults={hasResults}
        value={searchQuery}
        placeholder="搜索组件名称或描述..."
      />

      {/* 分类筛选 */}
      <CategoryFilter
        activeKey={activeCategory}
        onChange={handleCategoryChange}
      />

      {/* 组件网格区域 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
        }}
      >
        {hasResults ? (
          <Collapse
            activeKey={activeCollapseKeys}
            onChange={(keys) => setActiveCollapseKeys(keys as string[])}
            bordered={false}
            ghost
            expandIconPosition="end"
          >
            {Object.entries(groupedPlugins).map(([category, plugins]) => (
              <Panel
                key={category}
                header={
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#262626' }}>
                    {CATEGORY_LABELS[category] || category}
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#8c8c8c', fontWeight: 400 }}>
                      ({plugins.length})
                    </span>
                  </span>
                }
                style={{ marginBottom: 4 }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px 4px',
                    padding: '4px 0',
                  }}
                >
                  {plugins.map((plugin) => (
                    <ComponentCard
                      key={plugin.id}
                      plugin={plugin}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>
              </Panel>
            ))}
          </Collapse>
        ) : (
          <div style={{ padding: '32px 0' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={4} align="center">
                  <span style={{ color: '#8c8c8c' }}>未找到匹配的组件</span>
                  <span style={{ fontSize: 12, color: '#bfbfbf' }}>
                    尝试更换关键词或切换分类
                  </span>
                </Space>
              }
            />
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #f0f0f0',
          fontSize: 11,
          color: '#bfbfbf',
          textAlign: 'center',
        }}
      >
        <AppstoreAddOutlined style={{ marginRight: 4 }} />
        拖拽组件到画布，或双击快速添加
      </div>
    </div>
  );
};

ComponentPanel.displayName = 'ComponentPanel';
