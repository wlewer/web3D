/**
 * 悬停高亮
 * Hover Highlight
 *
 * 鼠标悬停时显示：
 * - 半透明蓝色边框
 * - 组件类型名称tooltip
 * - 与SelectionOverlay互斥（选中的不显示hover）
 */
import React, { useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { ComponentRegistry } from '../core/ComponentRegistry';

/** HoverHighlight属性 */
export interface HoverHighlightProps {
  /** 节点ID */
  nodeId: string;
}

/** HoverHighlight组件 */
export const HoverHighlight: React.FC<HoverHighlightProps> = ({
  nodeId,
}) => {
  const hoveredNodeId = useEditorStore((s) => s.selection.hoveredNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selection.selectedNodeIds);
  const node = useEditorStore((s) => s.nodes[nodeId]);

  /** 获取组件类型名称 */
  const typeName = useMemo(() => {
    if (!node) return '';
    const plugin = ComponentRegistry.getInstance().get(node.type);
    return plugin?.name ?? node.type;
  }, [node]);

  // 如果没有悬停、悬停的不是当前节点、或当前节点已被选中，则不显示
  if (!hoveredNodeId || hoveredNodeId !== nodeId || selectedNodeIds.includes(nodeId)) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: '1.5px solid rgba(59, 130, 246, 0.5)',
        pointerEvents: 'none',
        zIndex: 4,
        boxSizing: 'border-box',
      }}
      data-hover-highlight={nodeId}
    >
      {/* 组件类型名称tooltip */}
      <div
        style={{
          position: 'absolute',
          top: -22,
          left: 0,
          backgroundColor: 'rgba(59, 130, 246, 0.85)',
          color: '#fff',
          fontSize: 11,
          lineHeight: '18px',
          padding: '0 6px',
          borderRadius: '3px 3px 0 0',
          whiteSpace: 'nowrap',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {typeName}
      </div>
    </div>
  );
};

HoverHighlight.displayName = 'HoverHighlight';

export default HoverHighlight;
