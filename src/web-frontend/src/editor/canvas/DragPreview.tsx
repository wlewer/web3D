/**
 * 拖拽预览
 * Drag Preview
 *
 * 从组件面板拖入时显示半透明预览：
 * - 使用react-dnd的DragLayer
 * - 显示被拖拽组件的类型名称
 * - 半透明跟随鼠标的预览效果
 */
import React from 'react';
import { useDragLayer } from 'react-dnd';
import type { DragItem } from '../types/dnd';
import { COMPONENT_DND_TYPE } from './DropZone';
import { ComponentRegistry } from '../core/ComponentRegistry';

/** DragPreview属性 */
export interface DragPreviewProps {
  /** 缩放比例（影响预览尺寸） */
  zoom?: number;
}

/** 获取拖拽层样式 */
function getDragLayerStyle(
  currentOffset: { x: number; y: number } | null,
): React.CSSProperties {
  if (!currentOffset) {
    return { display: 'none' };
  }

  const { x, y } = currentOffset;
  const transform = `translate(${x}px, ${y}px)`;

  return {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 10000,
    left: 0,
    top: 0,
    transform,
    WebkitTransform: transform,
  };
}

/** DragPreview组件 */
export const DragPreview: React.FC<DragPreviewProps> = () => {
  const { itemType, isDragging, item, currentOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem() as DragItem | null,
      itemType: monitor.getItemType(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
    }),
  );

  if (!isDragging || itemType !== COMPONENT_DND_TYPE) {
    return null;
  }

  // 获取组件名称
  const getComponentName = (dragItem: DragItem): string => {
    if (dragItem.source === 'sidebar' && dragItem.componentType) {
      const plugin = ComponentRegistry.getInstance().get(dragItem.componentType);
      return plugin?.name ?? dragItem.componentType;
    }
    if (dragItem.source === 'canvas' && dragItem.nodeId) {
      return `移动组件`;
    }
    return '拖拽中';
  };

  return (
    <div style={getDragLayerStyle(currentOffset)}>
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: 'rgba(59, 130, 246, 0.9)',
          color: '#fff',
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          whiteSpace: 'nowrap',
          transform: 'translate(-50%, -50%)',
          opacity: 0.9,
        }}
      >
        {item ? getComponentName(item) : '拖拽中'}
      </div>
    </div>
  );
};

DragPreview.displayName = 'DragPreview';

export default DragPreview;
