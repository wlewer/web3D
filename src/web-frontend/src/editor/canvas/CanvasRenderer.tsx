/**
 * 画布递归渲染器（核心）
 * Canvas Renderer
 *
 * 根据PageSchema的rootNode递归渲染组件树：
 * - 从ComponentRegistry获取组件renderer
 * - 为每个渲染的组件包裹：点击选中、悬停高亮、拖拽排序
 * - 未注册组件显示FallbackComponent
 * - 每个组件节点之间插入DropZone
 */
import React, { useCallback, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { useEditorStore } from '../store/editorStore';
import { ComponentRegistry } from '../core/ComponentRegistry';
import type { ComponentNode } from '../types/page-schema';
import type { DragItem } from '../types/dnd';
import { COMPONENT_DND_TYPE } from './DropZone';
import { DropZone } from './DropZone';
import { SelectionOverlay } from './SelectionOverlay';
import { HoverHighlight } from './HoverHighlight';

/** CanvasRenderer属性 */
export interface CanvasRendererProps {
  /** 根节点ID */
  rootNodeId: string;
  /** 缩放比例 */
  zoom: number;
}

/** 单个渲染节点属性 */
interface RenderedNodeProps {
  /** 节点ID */
  nodeId: string;
  /** 缩放比例 */
  zoom: number;
  /** 是否为根节点（根节点不可拖拽） */
  isRoot?: boolean;
}

/**
 * FallbackComponent - 未注册组件的占位显示
 */
const FallbackComponent: React.FC<{ nodeType: string; nodeId: string }> = ({
  nodeType,
  nodeId,
}) => (
  <div
    style={{
      padding: '16px 20px',
      border: '1px dashed #f59e0b',
      borderRadius: 4,
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
      color: '#92400e',
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}
  >
    <span style={{ fontSize: 18 }}>⚠</span>
    <div>
      <div style={{ fontWeight: 500 }}>未注册组件: {nodeType}</div>
      <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
        ID: {nodeId} — 请在ComponentRegistry中注册此组件
      </div>
    </div>
  </div>
);

FallbackComponent.displayName = 'FallbackComponent';

/**
 * RenderedNode - 渲染单个节点
 *
 * 负责包裹：点击选中、悬停高亮、拖拽排序、选中框
 */
const RenderedNode: React.FC<RenderedNodeProps> = ({
  nodeId,
  zoom,
  isRoot = false,
}) => {
  const node = useEditorStore((s) => s.nodes[nodeId]);
  const selectedNodeIds = useEditorStore((s) => s.selection.selectedNodeIds);
  const selectNode = useEditorStore((s) => s.selectNode);
  const setHoveredNode = useEditorStore((s) => s.setHoveredNode);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const moveComponent = useEditorStore((s) => s.moveComponent);

  const isSelected = selectedNodeIds.includes(nodeId);

  /** 获取插件renderer */
  const plugin = useMemo(() => {
    if (!node) return undefined;
    return ComponentRegistry.getInstance().get(node.type);
  }, [node]);

  /** 使用react-dnd使组件可拖拽 */
  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: COMPONENT_DND_TYPE,
    item: {
      source: 'canvas',
      nodeId,
    },
    canDrag: () => !isRoot && !node?.locked,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  /** 点击选中 */
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node?.locked) return;
      selectNode(nodeId, e.ctrlKey || e.metaKey);
    },
    [nodeId, node?.locked, selectNode],
  );

  /** 悬停高亮 */
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node?.locked) return;
      setHoveredNode(nodeId);
    },
    [nodeId, node?.locked, setHoveredNode],
  );

  /** 离开取消悬停 */
  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, [setHoveredNode]);

  /** 点击空白取消选中 */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // 只处理画布空白区域的点击
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  if (!node) return null;

  // 隐藏节点不渲染
  if (node.hidden) return null;

  // 构建节点样式
  const nodeStyle: React.CSSProperties = {
    position: 'relative',
    opacity: isDragging ? 0.4 : 1,
    cursor: node.locked ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s ease',
    ...Object.entries(node.styles).reduce<Record<string, unknown>>((acc, [key, val]) => {
      // 将样式键值转为CSS camelCase
      acc[key] = val;
      return acc;
    }, {}),
  };

  // 渲染组件内容
  const renderContent = () => {
    if (!plugin) {
      return <FallbackComponent nodeType={node.type} nodeId={node.id} />;
    }

    const Renderer = plugin.renderer;
    return <Renderer {...node.props} />;
  };

  // 渲染子节点
  const renderChildren = () => {
    if (node.children.length === 0) return null;

    return (
      <>
        {node.children.map((childId, index) => (
          <React.Fragment key={childId}>
            {/* 在每个子节点前插入DropZone */}
            {!isRoot && (
              <DropZone parentId={nodeId} index={index} />
            )}
            <RenderedNode
              nodeId={childId}
              zoom={zoom}
            />
          </React.Fragment>
        ))}
        {/* 在最后一个子节点后插入DropZone */}
        {!isRoot && (
          <DropZone parentId={nodeId} index={node.children.length} />
        )}
      </>
    );
  };

  // 根节点特殊处理：直接渲染子节点
  if (isRoot) {
    return (
      <div
        onClick={handleCanvasClick}
        style={{
          minHeight: '100%',
          position: 'relative',
        }}
        data-node-id={nodeId}
      >
        {node.children.length === 0 ? (
          <EmptyCanvasHint />
        ) : (
          <>
            {node.children.map((childId, index) => (
              <React.Fragment key={childId}>
                <DropZone parentId={nodeId} index={index} />
                <RenderedNode nodeId={childId} zoom={zoom} />
              </React.Fragment>
            ))}
            <DropZone parentId={nodeId} index={node.children.length} />
          </>
        )}
      </div>
    );
  }

  // 普通节点：包裹交互层
  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      style={nodeStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-node-id={nodeId}
    >
      {/* 组件内容 */}
      {renderContent()}

      {/* 子节点区域 */}
      {node.children.length > 0 && (
        <div style={{ position: 'relative' }}>
          {renderChildren()}
        </div>
      )}

      {/* 悬停高亮 */}
      <HoverHighlight nodeId={nodeId} />

      {/* 选中框 */}
      {isSelected && (
        <SelectionOverlay nodeId={nodeId} zoom={zoom} />
      )}
    </div>
  );
};

RenderedNode.displayName = 'RenderedNode';

/**
 * 空画布提示
 */
const EmptyCanvasHint: React.FC = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      color: '#94a3b8',
      fontSize: 14,
      gap: 12,
    }}
  >
    <div style={{ fontSize: 48, opacity: 0.3 }}>📦</div>
    <div>从左侧组件面板拖拽组件到此处</div>
    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
      或双击组件面板项快速添加
    </div>
  </div>
);

EmptyCanvasHint.displayName = 'EmptyCanvasHint';

/**
 * CanvasRenderer - 画布递归渲染器
 *
 * 从rootNode开始递归渲染整个组件树
 */
export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  rootNodeId,
  zoom,
}) => {
  const rootNode = useEditorStore((s) => s.nodes[rootNodeId]);

  if (!rootNode) {
    return (
      <div style={{ padding: 40, color: '#94a3b8', textAlign: 'center' }}>
        页面数据加载中...
      </div>
    );
  }

  return (
    <RenderedNode
      nodeId={rootNodeId}
      zoom={zoom}
      isRoot
    />
  );
};

CanvasRenderer.displayName = 'CanvasRenderer';

export default CanvasRenderer;
