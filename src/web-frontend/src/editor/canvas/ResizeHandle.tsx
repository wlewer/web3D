/**
 * 尺寸调整手柄
 * Resize Handle
 *
 * 提供8方向拖拽调整尺寸的能力：
 * - 4角 + 4边中点手柄
 * - 拖拽时显示尺寸数值
 * - 最小宽高限制（50px）
 * - 触发UpdateStylesCommand（通过editorStore）
 */
import React, { useCallback, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { EventBus } from '../core/EventBus';

/** 手柄方向 */
export type HandleDirection =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

/** ResizeHandle属性 */
export interface ResizeHandleProps {
  /** 手柄方向 */
  direction: HandleDirection;
  /** 节点ID */
  nodeId: string;
  /** 当前组件宽度 */
  width: number;
  /** 当前组件高度 */
  height: number;
  /** 最小宽度（px） */
  minWidth?: number;
  /** 最小高度（px） */
  minHeight?: number;
  /** 缩放比例（用于坐标换算） */
  zoom: number;
}

/** 手柄方向到CSS cursor的映射 */
const CURSOR_MAP: Record<HandleDirection, string> = {
  'top-left': 'nwse-resize',
  'top': 'ns-resize',
  'top-right': 'nesw-resize',
  'right': 'ew-resize',
  'bottom-right': 'nwse-resize',
  'bottom': 'ns-resize',
  'bottom-left': 'nesw-resize',
  'left': 'ew-resize',
};

/** 手柄方向到位置样式的映射 */
function getHandleStyle(direction: HandleDirection): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    border: '1.5px solid #3b82f6',
    borderRadius: 1,
    zIndex: 10,
  };

  switch (direction) {
    case 'top-left':
      return { ...base, top: -4, left: -4, cursor: CURSOR_MAP[direction] };
    case 'top':
      return { ...base, top: -4, left: '50%', transform: 'translateX(-50%)', cursor: CURSOR_MAP[direction] };
    case 'top-right':
      return { ...base, top: -4, right: -4, cursor: CURSOR_MAP[direction] };
    case 'right':
      return { ...base, top: '50%', right: -4, transform: 'translateY(-50%)', cursor: CURSOR_MAP[direction] };
    case 'bottom-right':
      return { ...base, bottom: -4, right: -4, cursor: CURSOR_MAP[direction] };
    case 'bottom':
      return { ...base, bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: CURSOR_MAP[direction] };
    case 'bottom-left':
      return { ...base, bottom: -4, left: -4, cursor: CURSOR_MAP[direction] };
    case 'left':
      return { ...base, top: '50%', left: -4, transform: 'translateY(-50%)', cursor: CURSOR_MAP[direction] };
  }
}

/** 所有8个方向 */
export const ALL_DIRECTIONS: HandleDirection[] = [
  'top-left', 'top', 'top-right',
  'right',
  'bottom-right', 'bottom', 'bottom-left',
  'left',
];

/** ResizeHandle组件 */
export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction,
  nodeId,
  width,
  height,
  minWidth = 50,
  minHeight = 50,
  zoom,
}) => {
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles);
  const [sizeLabel, setSizeLabel] = useState<string | null>(null);
  const startRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = width;
      const startH = height;

      startRef.current = { x: startX, y: startY, w: startW, h: startH };

      const eventBus = EventBus.getInstance();

      // 记录拖拽前的样式快照（用于command的undo）
      const oldStyles = { width: startW, height: startH };

      const onMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;

        const dx = (moveEvent.clientX - startX) / zoom;
        const dy = (moveEvent.clientY - startY) / zoom;

        let newW = startW;
        let newH = startH;

        if (direction.includes('right')) newW = startW + dx;
        if (direction.includes('left')) newW = startW - dx;
        if (direction.includes('bottom')) newH = startH + dy;
        if (direction.includes('top')) newH = startH - dy;

        newW = Math.max(minWidth, Math.round(newW));
        newH = Math.max(minHeight, Math.round(newH));

        setSizeLabel(`${newW} × ${newH}`);

        // 实时预览：直接更新DOM data属性，避免频繁store更新
        const el = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (el) {
          (el as HTMLElement).style.width = `${newW}px`;
          (el as HTMLElement).style.height = `${newH}px`;
        }
      };

      const onUp = () => {
        if (startRef.current) {
          // 计算最终尺寸
          // 从DOM获取当前视觉尺寸
          const el = document.querySelector(`[data-node-id="${nodeId}"]`);
          let finalW = startW;
          let finalH = startH;

          if (el) {
            finalW = parseInt((el as HTMLElement).style.width, 10) || startW;
            finalH = parseInt((el as HTMLElement).style.height, 10) || startH;
          }

          // 通过CommandManager提交正式样式更新（支持撤销）
          if (finalW !== oldStyles.width || finalH !== oldStyles.height) {
            updateNodeStyles(nodeId, { width: finalW, height: finalH });
            eventBus.emit('node:updated', {
              nodeId,
              updates: { width: finalW, height: finalH },
            });
          }
        }

        setSizeLabel(null);
        startRef.current = null;

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [direction, nodeId, width, height, minWidth, minHeight, zoom, updateNodeStyles],
  );

  return (
    <>
      <div
        style={getHandleStyle(direction)}
        onMouseDown={handleMouseDown}
      />
      {sizeLabel && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: '#fff',
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          {sizeLabel}
        </div>
      )}
    </>
  );
};

ResizeHandle.displayName = 'ResizeHandle';

export default ResizeHandle;
