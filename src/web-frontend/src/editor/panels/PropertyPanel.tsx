/**
 * PropertyPanel - 属性面板主容器
 * Property Panel
 *
 * 固定宽度 320px 的右侧边栏，包含：
 * - 无选中时显示空状态
 * - 选中时显示组件名称 + Tab（属性/样式/布局/交互）
 */
import React, { useMemo } from 'react';
import { Tabs, Empty, Space, Tag, Tooltip } from 'antd';
import {
  SettingOutlined,
  BgColorsOutlined,
  LayoutOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { PropsEditor } from './PropsEditor';
import { StyleEditor } from './StyleEditor';
import { LayoutEditor } from './LayoutEditor';
import { ResponsiveConfig } from './ResponsiveConfig';
import { useEditorStore } from '../store/editorStore';
import { ComponentRegistry } from '../core/ComponentRegistry';

/** PropertyPanel 组件属性 */
export interface PropertyPanelProps {
  /** 样式类名 */
  className?: string;
}

/**
 * PropertyPanel - 右侧属性面板
 *
 * 根据选中组件动态显示对应属性编辑器。
 */
export const PropertyPanel: React.FC<PropertyPanelProps> = ({ className }) => {
  const selectedNodeIds = useEditorStore((state) => state.selection.selectedNodeIds);
  const nodes = useEditorStore((state) => state.nodes);

  const registry = useMemo(() => ComponentRegistry.getInstance(), []);

  // 当前选中的节点（单选时显示，多选时提示）
  const selectedNode = useMemo(() => {
    if (selectedNodeIds.length === 1) {
      return nodes[selectedNodeIds[0]];
    }
    return undefined;
  }, [selectedNodeIds, nodes]);

  // 获取组件插件信息
  const plugin = useMemo(() => {
    if (!selectedNode) return undefined;
    return registry.get(selectedNode.type);
  }, [selectedNode, registry]);

  // Tab 项配置
  const tabItems: TabsProps['items'] = useMemo(() => {
    if (!selectedNode) return [];

    const nodeId = selectedNode.id;

    return [
      {
        key: 'props',
        label: (
          <Tooltip title="组件属性">
            <Space size={4}>
              <SettingOutlined />
              <span>属性</span>
            </Space>
          </Tooltip>
        ),
        children: <PropsEditor nodeId={nodeId} />,
      },
      {
        key: 'styles',
        label: (
          <Tooltip title="样式编辑">
            <Space size={4}>
              <BgColorsOutlined />
              <span>样式</span>
            </Space>
          </Tooltip>
        ),
        children: <StyleEditor nodeId={nodeId} />,
      },
      {
        key: 'layout',
        label: (
          <Tooltip title="布局设置">
            <Space size={4}>
              <LayoutOutlined />
              <span>布局</span>
            </Space>
          </Tooltip>
        ),
        children: <LayoutEditor nodeId={nodeId} />,
      },
      {
        key: 'responsive',
        label: (
          <Tooltip title="响应式配置">
            <Space size={4}>
              <ThunderboltOutlined />
              <span>响应式</span>
            </Space>
          </Tooltip>
        ),
        children: <ResponsiveConfig nodeId={nodeId} />,
      },
    ];
  }, [selectedNode]);

  // 空状态
  const renderEmpty = () => {
    if (selectedNodeIds.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={8} align="center">
              <EyeOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
              <span style={{ color: '#8c8c8c' }}>请在画布中选择一个组件</span>
              <span style={{ fontSize: 12, color: '#bfbfbf' }}>
                选中后即可编辑其属性和样式
              </span>
            </Space>
          }
          style={{ marginTop: '40%' }}
        />
      );
    }

    if (selectedNodeIds.length > 1) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={8} align="center">
              <span style={{ color: '#8c8c8c' }}>
                已选择 {selectedNodeIds.length} 个组件
              </span>
              <span style={{ fontSize: 12, color: '#bfbfbf' }}>
                属性面板仅支持单个组件编辑
              </span>
            </Space>
          }
          style={{ marginTop: '40%' }}
        />
      );
    }

    return null;
  };

  return (
    <div
      className={className}
      style={{
        width: 320,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        borderLeft: '1px solid #f0f0f0',
        overflow: 'hidden',
      }}
    >
      {selectedNode ? (
        <>
          {/* 组件信息头部 */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>
                  {plugin?.name || selectedNode.type}
                </span>
                <Tag  color="default" style={{ fontSize: 10 }}>
                  {selectedNode.type}
                </Tag>
              </Space>
              <span
                style={{
                  fontSize: 11,
                  color: '#8c8c8c',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={selectedNode.id}
              >
                ID: {selectedNode.id}
              </span>
            </Space>
          </div>

          {/* Tab 面板 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Tabs
              items={tabItems}
              size="small"
              style={{ margin: 0 }}
              tabBarStyle={{ padding: '0 12px', marginBottom: 0 }}
              destroyInactiveTabPane={false}
            />
          </div>
        </>
      ) : (
        renderEmpty()
      )}
    </div>
  );
};

PropertyPanel.displayName = 'PropertyPanel';
