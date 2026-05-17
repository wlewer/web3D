/**
 * 选中框覆盖层
 * Selection Overlay
 *
 * 选中组件时显示：
 * - 蓝色虚线边框
 * - 8方向调整手柄（4角+4边中点）
 * - 组件名称标签
 * - 点击空白区域取消选中
 */
import React, { useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { ResizeHandle, ALL_DIRECTIONS } from './ResizeHandle';
import { ComponentRegistry } from '../core/ComponentRegistry';

/** SelectionOverlay属性 */
export interface SelectionOverlayProps {
  /** 节点ID */
  nodeId: string;
  /** 缩放比例 */
  zoom: number;
}

/** SelectionOverlay组件 */
export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  nodeId,
  zoom,
}) => {
  const node = useEditorStore((s) => s.nodes[nodeId]);

  /** 获取组件显示名称 */
  const componentName = useMemo(() => {
    if (!node) return '';
    const plugin = ComponentRegistry.getInstance().get(node.type);
    return plugin?.name ?? node.type;
  }, [node]);

  if (!node) return null;

  // 从节点的样式中获取宽高
  const width = (node.styles.width as number) ?? 300;
  const height = (node.styles.height as number) ?? 200;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: '1.5px dashed #3b82f6',
        pointerEvents: 'none',
        zIndex: 5,
        boxSizing: 'border-box',
      }}
      data-selection-overlay={nodeId}
    >
      {/* 组件名称标签 */}
      <div
        style={{
          position: 'absolute',
          top: -22,
          left: 0,
          backgroundColor: '#3b82f6',
          color: '#fff',
          fontSize: 11,
          lineHeight: '18px',
          padding: '0 6px',
          borderRadius: '3px 3px 0 0',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {componentName}
      </div>

      {/* 8方向调整手柄 */}
      {ALL_DIRECTIONS.map((direction) => (
        <div key={direction} style={{ pointerEvents: 'auto' }}>
          <ResizeHandle
            direction={direction}
            nodeId={nodeId}
            width={width}
            height={height}
            zoom={zoom}
          />
        </div>
      ))}
    </div>
  );
};

SelectionOverlay.displayName = 'SelectionOverlay';

export default SelectionOverlay;
