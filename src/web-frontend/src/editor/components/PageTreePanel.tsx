/**
 * PageTreePanel - 组件层级树面板
 * Page Tree Panel
 *
 * 展示当前页面的组件层级树：
 * - Ant Design Tree 组件渲染节点层级
 * - 点击节点 = 选中组件
 * - 支持拖拽排序
 */
import React, { useMemo, useCallback } from 'react';
import { Tree, Empty, Space } from 'antd';
import {
  AppstoreOutlined,
  LayoutOutlined,
  FontSizeOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  StarOutlined,
  ThunderboltOutlined,
  BuildOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import type { TreeProps, DataNode } from 'antd/es/tree';
import { useEditorStore } from '../store/editorStore';
import { ComponentRegistry } from '../core/ComponentRegistry';
import type { ComponentNode } from '../types/page-schema';

/** 组件类型图标映射 */
const TYPE_ICON_MAP: Record<string, React.ReactNode> = {
  'page-root': <AppstoreOutlined />,
  'layout.container': <LayoutOutlined />,
  'layout.row': <LayoutOutlined />,
  'layout.column': <LayoutOutlined />,
  'layout.section': <LayoutOutlined />,
  'basic.text-block': <FontSizeOutlined />,
  'basic.image-block': <PictureOutlined />,
  'basic.button-block': <ThunderboltOutlined />,
  'basic.video-block': <PlayCircleOutlined />,
  '3d.model-viewer': <BuildOutlined />,
  '3d.model-card-grid': <NodeIndexOutlined />,
  'marketing.hero-3d-carousel': <StarOutlined />,
  'marketing.contact-form': <EyeOutlined />,
};

/** 获取组件图标 */
function getNodeIcon(type: string): React.ReactNode {
  return TYPE_ICON_MAP[type] || <AppstoreOutlined />;
}

/** PageTreePanel 组件属性 */
export interface PageTreePanelProps {
  /** 自定义类名 */
  className?: string;
}

/**
 * 将节点树转换为 Ant Design Tree 数据结构
 */
function buildTreeData(
  rootNodeId: string,
  nodes: Record<string, ComponentNode>,
  registry: ComponentRegistry,
): DataNode[] {
  const root = nodes[rootNodeId];
  if (!root) return [];

  const buildNode = (node: ComponentNode): DataNode => {
    const plugin = registry.get(node.type);
    const title = plugin?.name || node.type;
    const isRoot = node.id === 'root';

    return {
      key: node.id,
      title: (
        <span style={{ fontSize: 12 }}>
          {isRoot ? '页面' : title}
        </span>
      ),
      icon: <span style={{ fontSize: 12 }}>{getNodeIcon(node.type)}</span>,
      children: node.children
        .map((childId) => nodes[childId])
        .filter((n): n is ComponentNode => n !== undefined)
        .map(buildNode),
    };
  };

  return [buildNode(root)];
}

/**
 * PageTreePanel - 组件层级树面板
 */
export const PageTreePanel: React.FC<PageTreePanelProps> = ({ className }) => {
  const nodes = useEditorStore((s) => s.nodes);
  const pageSchema = useEditorStore((s) => s.pageSchema);
  const selectedNodeIds = useEditorStore((s) => s.selection.selectedNodeIds);
  const selectNode = useEditorStore((s) => s.selectNode);
  const moveComponent = useEditorStore((s) => s.moveComponent);

  const registry = useMemo(() => ComponentRegistry.getInstance(), []);

  // 构建树数据
  const treeData = useMemo(
    () => buildTreeData(pageSchema.rootNodeId, nodes, registry),
    [pageSchema.rootNodeId, nodes, registry],
  );

  // 选中的节点
  const selectedKeys = useMemo(
    () => selectedNodeIds.filter((id) => id !== 'root'),
    [selectedNodeIds],
  );

  /** 点击树节点 */
  const handleSelect: TreeProps['onSelect'] = useCallback(
    (keys) => {
      if (keys.length > 0) {
        const key = keys[0] as string;
        if (key !== 'root') {
          selectNode(key);
        }
      }
    },
    [selectNode],
  );

  /** 拖拽排序 */
  const handleDrop: TreeProps['onDrop'] = useCallback(
    (info) => {
      const dragKey = info.dragNode.key as string;
      const dropKey = info.node.key as string;

      if (dragKey === 'root' || dropKey === 'root') return;

      const dropPosition = info.dropPosition;
      const dropToGap = info.dropToGap;

      // 简化处理：拖到目标节点内部或之后
      if (dropToGap) {
        // 放在目标节点同级
        const dropNode = nodes[dropKey];
        if (dropNode) {
          moveComponent(dragKey, dropNode.parentId, dropPosition);
        }
      } else {
        // 放在目标节点内部
        moveComponent(dragKey, dropKey, 0);
      }
    },
    [nodes, moveComponent],
  );

  // 空状态
  const rootNode = nodes[pageSchema.rootNodeId];
  const hasChildren = rootNode && rootNode.children.length > 0;

  return (
    <div
      className={className}
      style={{
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        height: '40%',
        minHeight: 160,
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 600,
          color: '#595959',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        组件层级
      </div>

      {/* 树内容 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {hasChildren ? (
          <Tree
            treeData={treeData}
            selectedKeys={selectedKeys}
            onSelect={handleSelect}
            onDrop={handleDrop}
            draggable={{ icon: false, nodeDraggable: (node) => node.key !== 'root' }}
            blockNode
            showIcon
            defaultExpandAll
            style={{ fontSize: 12 }}
          />
        ) : (
          <div style={{ padding: '16px 0' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={4} align="center">
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>暂无组件</span>
                  <span style={{ fontSize: 11, color: '#bfbfbf' }}>
                    拖拽左侧组件到画布
                  </span>
                </Space>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

PageTreePanel.displayName = 'PageTreePanel';

export default PageTreePanel;
