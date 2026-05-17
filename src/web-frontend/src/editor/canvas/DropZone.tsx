/**
 * 放置区域
 * Drop Zone
 *
 * 在组件节点之间插入DropZone：
 * - 拖拽悬停时高亮显示（蓝色横线指示插入位置）
 * - 接受来自组件面板的拖拽
 * - 触发editorStore的addNode操作
 */
import React, { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../store/editorStore';
import type { DragItem } from '../types/dnd';
import { EventBus } from '../core/EventBus';

/** react-dnd 拖拽项类型常量 */
export const COMPONENT_DND_TYPE = 'COMPONENT_PANEL_ITEM';

/** DropZone属性 */
export interface DropZoneProps {
  /** 父节点ID（放置的子节点将加入此节点） */
  parentId: string;
  /** 在父节点children中的插入索引 */
  index: number;
  /** 放置方向（垂直/水平） */
  orientation?: 'vertical' | 'horizontal';
}

/** DropZone组件 */
export const DropZone: React.FC<DropZoneProps> = ({
  parentId,
  index,
  orientation = 'vertical',
}) => {
  const addComponent = useEditorStore((s) => s.addComponent);
  const eventBus = EventBus.getInstance();

  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: COMPONENT_DND_TYPE,
    drop: (item, monitor) => {
      // 只处理最内层的drop
      if (monitor.didDrop()) return;

      if (item.source === 'sidebar' && item.componentType) {
        const newNodeId = addComponent(item.componentType, parentId, index);
        eventBus.emit('drag:drop', { targetId: parentId, index });
        void newNodeId; // 确认返回值已使用
      }
    },
    canDrop: (item) => {
      return item.source === 'sidebar' && !!item.componentType;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const highlightStyle: React.CSSProperties = orientation === 'vertical'
    ? {
        // 垂直布局：蓝色横线指示器
        height: isActive ? 4 : 2,
        width: '100%',
        backgroundColor: isActive ? '#3b82f6' : canDrop ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
        borderRadius: 2,
        transition: 'all 0.15s ease',
      }
    : {
        // 水平布局：蓝色竖线指示器
        width: isActive ? 4 : 2,
        height: '100%',
        backgroundColor: isActive ? '#3b82f6' : canDrop ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
        borderRadius: 2,
        transition: 'all 0.15s ease',
      };

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      onDragOver={handleDragOver}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isActive ? '4px 0' : '1px 0',
        cursor: canDrop ? 'copy' : 'default',
      }}
      data-drop-zone={`${parentId}-${index}`}
    >
      <div style={highlightStyle} />
    </div>
  );
};

DropZone.displayName = 'DropZone';

export default DropZone;
