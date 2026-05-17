/**
 * DragSource - 拖拽源高阶组件
 * Drag Source HOC
 *
 * 封装 react-dnd 的 useDrag，为子组件提供拖拽能力。
 * 拖拽开始时设置 DragItem 数据，结束时清理状态。
 */
import React, { useEffect } from 'react';
import { useDrag } from 'react-dnd';
import type { DragItem } from '../types/dnd';

/** 拖拽源传递给子组件的注入属性 */
export interface DragSourceInjectedProps {
  /** 是否正在拖拽中 */
  isDragging: boolean;
  /** 拖拽源 ref */
  dragRef: React.RefObject<HTMLDivElement | null>;
}

/** DragSource HOC 配置选项 */
export interface DragSourceOptions {
  /** 拖拽数据项 */
  item: DragItem;
  /** 拖拽开始回调 */
  onDragStart?: (item: DragItem) => void;
  /** 拖拽结束回调 */
  onDragEnd?: (item: DragItem, didDrop: boolean) => void;
  /** 是否允许拖拽 */
  canDrag?: boolean;
}

/**
 * withDragSource - 拖拽源高阶组件
 *
 * @param WrappedComponent - 被包装的组件
 * @returns 带拖拽能力的组件
 *
 * @example
 * ```tsx
 * const DraggableCard = withDragSource(ComponentCard, {
 *   item: { source: 'sidebar', componentType: 'button' },
 * });
 * ```
 */
export function withDragSource<P extends DragSourceInjectedProps>(
  WrappedComponent: React.ComponentType<P>,
  options: DragSourceOptions,
): React.FC<Omit<P, keyof DragSourceInjectedProps>> {
  const DragSourceWrapper: React.FC<Omit<P, keyof DragSourceInjectedProps>> = (props) => {
    const [{ isDragging }, dragRef, previewRef] = useDrag({
      type: 'COMPONENT',
      item: () => {
        options.onDragStart?.(options.item);
        return options.item;
      },
      canDrag: options.canDrag !== false,
      end: (item, monitor) => {
        const didDrop = monitor.didDrop();
        options.onDragEnd?.(item as DragItem, didDrop);
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    // 预览 ref 绑定到 body 避免默认 drag image
    useEffect(() => {
      previewRef(null);
    }, [previewRef]);

    return (
      <WrappedComponent
        {...(props as P)}
        isDragging={isDragging}
        dragRef={dragRef as unknown as React.RefObject<HTMLDivElement | null>}
      />
    );
  };

  DragSourceWrapper.displayName = `withDragSource(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return DragSourceWrapper;
}

/**
 * useDragSource - 拖拽源 Hook
 *
 * 提供与 withDragSource 相同的拖拽能力，但以 Hook 形式使用。
 *
 * @example
 * ```tsx
 * const { isDragging, dragRef } = useDragSource({
 *   item: { source: 'sidebar', componentType: 'button' },
 * });
 * ```
 */
export function useDragSource(options: DragSourceOptions) {
  const [{ isDragging }, dragRef, previewRef] = useDrag({
    type: 'COMPONENT',
    item: () => {
      options.onDragStart?.(options.item);
      return options.item;
    },
    canDrag: options.canDrag !== false,
    end: (item, monitor) => {
      const didDrop = monitor.didDrop();
      options.onDragEnd?.(item as DragItem, didDrop);
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    previewRef(null);
  }, [previewRef]);

  return {
    isDragging,
    dragRef: dragRef as unknown as React.RefObject<HTMLDivElement | null>,
  };
}
