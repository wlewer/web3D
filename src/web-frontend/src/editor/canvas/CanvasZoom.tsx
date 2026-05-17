/**
 * 画布缩放控制面板
 * Canvas Zoom Control
 *
 * 固定在画布右下角，提供：
 * - 缩放百分比显示
 * - +/- 按钮
 * - 重置到100%按钮
 * - 适应屏幕按钮
 */
import React, { useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { EventBus } from '../core/EventBus';

/** CanvasZoom属性 */
export interface CanvasZoomProps {
  /** 外部容器宽度（用于"适应屏幕"计算） */
  containerWidth?: number;
  /** 画布内容宽度 */
  canvasContentWidth?: number;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/** CanvasZoom组件 */
export const CanvasZoom: React.FC<CanvasZoomProps> = ({
  containerWidth,
  canvasContentWidth,
  style,
}) => {
  const zoom = useEditorStore((s) => s.canvas.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const eventBus = EventBus.getInstance();

  /** 缩放百分比文本 */
  const zoomPercent = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  /** 放大 */
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(5, zoom + 0.1);
    setZoom(newZoom);
  }, [zoom, setZoom]);

  /** 缩小 */
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.1, zoom - 0.1);
    setZoom(newZoom);
  }, [zoom, setZoom]);

  /** 重置到100% */
  const handleReset = useCallback(() => {
    setZoom(1);
    eventBus.emit('canvas:zoom', { zoom: 1 });
  }, [setZoom, eventBus]);

  /** 适应屏幕 */
  const handleFitToScreen = useCallback(() => {
    if (containerWidth && canvasContentWidth && containerWidth > 0) {
      const fitZoom = Math.max(0.1, Math.min(2, (containerWidth - 80) / canvasContentWidth));
      setZoom(fitZoom);
      eventBus.emit('canvas:zoom', { zoom: fitZoom });
    } else {
      // 默认适应到90%
      setZoom(0.9);
    }
  }, [containerWidth, canvasContentWidth, setZoom, eventBus]);

  /** 按钮基础样式 */
  const btnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#475569',
    cursor: 'pointer',
    borderRadius: 4,
    fontSize: 16,
    fontWeight: 500,
    transition: 'background-color 0.15s, color 0.15s',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        padding: '2px 4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        zIndex: 50,
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 缩小 */}
      <button
        style={btnStyle}
        onClick={handleZoomOut}
        title="缩小"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f1f5f9';
          (e.currentTarget as HTMLButtonElement).style.color = '#1e293b';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#475569';
        }}
      >
        −
      </button>

      {/* 百分比显示 */}
      <button
        style={{
          ...btnStyle,
          width: 'auto',
          padding: '0 8px',
          fontSize: 12,
          fontFamily: 'monospace',
          minWidth: 48,
          textAlign: 'center',
        }}
        onClick={handleReset}
        title="重置到100%"
      >
        {zoomPercent}
      </button>

      {/* 放大 */}
      <button
        style={btnStyle}
        onClick={handleZoomIn}
        title="放大"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f1f5f9';
          (e.currentTarget as HTMLButtonElement).style.color = '#1e293b';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#475569';
        }}
      >
        +
      </button>

      {/* 分隔线 */}
      <div
        style={{
          width: 1,
          height: 18,
          backgroundColor: '#e2e8f0',
          margin: '0 2px',
        }}
      />

      {/* 适应屏幕 */}
      <button
        style={{
          ...btnStyle,
          fontSize: 12,
        }}
        onClick={handleFitToScreen}
        title="适应屏幕"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f1f5f9';
          (e.currentTarget as HTMLButtonElement).style.color = '#1e293b';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#475569';
        }}
      >
        ⊞
      </button>
    </div>
  );
};

CanvasZoom.displayName = 'CanvasZoom';

export default CanvasZoom;
