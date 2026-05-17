/**
 * ComponentCard - 组件卡片
 * Component Card
 *
 * 64x64 缩略图 + 组件名称，支持 react-dnd 拖拽和双击添加。
 * Hover 显示组件描述 tooltip。
 */
import React, { useCallback } from 'react';
import { Tooltip } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { useDragSource } from './DragSource';
import type { DragItem } from '../types/dnd';
import type { IComponentPlugin } from '../types/plugin';
import { useEditorStore } from '../store/editorStore';

/** ComponentCard 组件属性 */
export interface ComponentCardProps {
  /** 组件插件定义 */
  plugin: IComponentPlugin;
  /** 拖拽开始回调 */
  onDragStart?: (item: DragItem) => void;
  /** 拖拽结束回调 */
  onDragEnd?: (item: DragItem, didDrop: boolean) => void;
}

/**
 * ComponentCard - 可拖拽的组件卡片
 *
 * 展示组件缩略图和名称，支持拖拽到画布和双击添加。
 */
export const ComponentCard: React.FC<ComponentCardProps> = ({
  plugin,
  onDragStart,
  onDragEnd,
}) => {
  const addComponent = useEditorStore((state) => state.addComponent);
  const selectedNodeIds = useEditorStore((state) => state.selection.selectedNodeIds);
  const nodes = useEditorStore((state) => state.nodes);

  const dragItem: DragItem = {
    source: 'sidebar',
    componentType: plugin.id,
    data: { pluginName: plugin.name },
  };

  const { isDragging, dragRef: rawDragRef } = useDragSource({
    item: dragItem,
    onDragStart,
    onDragEnd,
  });

  // 双击添加到选中节点末尾（或根节点）
  const handleDoubleClick = useCallback(() => {
    const targetParentId = selectedNodeIds.length > 0
      ? selectedNodeIds[selectedNodeIds.length - 1]
      : 'root';

    // 检查目标节点是否允许子节点
    const targetNode = nodes[targetParentId];
    if (targetNode && targetNode.children !== undefined) {
      addComponent(plugin.id, targetParentId, targetNode.children.length);
    } else {
      addComponent(plugin.id, 'root');
    }
  }, [addComponent, plugin.id, selectedNodeIds, nodes]);

  // 渲染缩略图（icon 或默认图标）
  const renderThumbnail = () => {
    if (plugin.thumbnail) {
      return (
        <img
          src={plugin.thumbnail}
          alt={plugin.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 6,
          }}
        />
      );
    }

    // 使用 icon 或默认 AppstoreOutlined
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: 6,
          fontSize: 28,
          color: '#8c8c8c',
        }}
      >
        <AppstoreOutlined />
      </div>
    );
  };

  const cardContent = (
    <div
      ref={rawDragRef as unknown as React.LegacyRef<HTMLDivElement>}
      onDoubleClick={handleDoubleClick}
      style={{
        width: 72,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 0.2s',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        {renderThumbnail()}
      </div>
      <span
        style={{
          marginTop: 6,
          fontSize: 11,
          color: '#595959',
          textAlign: 'center',
          lineHeight: 1.3,
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={plugin.name}
      >
        {plugin.name}
      </span>
    </div>
  );

  return (
    <Tooltip
      title={
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{plugin.name}</div>
          {plugin.description && (
            <div style={{ fontSize: 12, opacity: 0.85 }}>{plugin.description}</div>
          )}
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>ID: {plugin.id}</div>
        </div>
      }
      placement="right"
      mouseEnterDelay={0.5}
    >
      {cardContent}
    </Tooltip>
  );
};

ComponentCard.displayName = 'ComponentCard';
