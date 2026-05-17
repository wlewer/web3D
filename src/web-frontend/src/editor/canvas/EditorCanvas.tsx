/**
 * 画布主容器
 * Editor Canvas
 *
 * 编辑器画布的顶层容器，提供：
 * - 可滚动区域 + 缩放支持
 * - 网格背景（点阵/线条可切换）
 * - Ctrl+滚轮缩放（50%-200%）
 * - 读取editorStore的canvasState
 * - 注意：DndProvider 由外层 EditorApp 提供，此处不再嵌套
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { EventBus } from '../core/EventBus';
import { CanvasRenderer } from './CanvasRenderer';
import { CanvasZoom } from './CanvasZoom';
import { GridSystem } from './GridSystem';
import { DragPreview } from './DragPreview';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { getCanvasWidthForDevice } from './GridSystem';
import type { CanvasState } from '../types/editor-state';

/** 网格类型 */
export type GridType = 'dots' | 'lines' | 'none';

/** EditorCanvas属性 */
export interface EditorCanvasProps {
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 初始网格类型 */
  defaultGridType?: GridType;
}

/** 缩放限制 */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

/**
 * 绘制点阵网格背景
 */
function drawDotGrid(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  gridSize: number,
  dotSize: number,
  color: string,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;

  for (let x = gridSize; x < width; x += gridSize) {
    for (let y = gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * 网格背景组件
 */
const CanvasGridBackground: React.FC<{
  gridType: GridType;
  showGridColumns: boolean;
  canvasWidth: number;
}> = ({ gridType, showGridColumns, canvasWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听容器尺寸变化
  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 2000),
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 绘制点阵网格
  useEffect(() => {
    if (gridType !== 'dots' || !canvasRef.current) return;
    drawDotGrid(
      canvasRef.current,
      dimensions.width,
      dimensions.height,
      20,
      1,
      'rgba(148, 163, 184, 0.3)',
    );
  }, [gridType, dimensions]);

  if (gridType === 'none') return null;

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {gridType === 'dots' && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
          }}
        />
      )}
      {gridType === 'lines' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage:
              'linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), ' +
              'linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            minHeight: 2000,
          }}
        />
      )}
      {showGridColumns && (
        <GridSystem
          canvasWidth={canvasWidth}
          showGrid={showGridColumns}
          snapToGrid={false}
        />
      )}
    </div>
  );
};

CanvasGridBackground.displayName = 'CanvasGridBackground';

/**
 * EditorCanvas - 画布主容器
 */
export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  className,
  style,
  defaultGridType = 'dots',
}) => {
  const canvas = useEditorStore((s) => s.canvas);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setCanvasOffset = useEditorStore((s) => s.setCanvasOffset);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const pageSchema = useEditorStore((s) => s.pageSchema);
  const eventBus = EventBus.getInstance();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [gridType, setGridType] = useState<GridType>(defaultGridType);
  const [showGridColumns, setShowGridColumns] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const canvasWidth = getCanvasWidthForDevice(canvas.deviceMode);

  // 监听容器宽度
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /** Ctrl+滚轮缩放 */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, canvas.zoom + delta));

        setZoom(newZoom);
        eventBus.emit('canvas:zoom', { zoom: newZoom });
      }
    },
    [canvas.zoom, setZoom, eventBus],
  );

  /** 滚动事件同步偏移 */
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setCanvasOffset(target.scrollLeft, target.scrollTop);
    },
    [setCanvasOffset],
  );

  /** 点击空白区域取消选中 */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  /** 计算画布内容区域尺寸 */
  const canvasContentWidth = canvasWidth;
  const scaleTransform = `scale(${canvas.zoom})`;
  const transformOrigin = 'top left';

  return (
    <>
      {/* 快捷键处理器 */}
      <KeyboardShortcuts />

      {/* 拖拽预览层 */}
      <DragPreview />

      {/* 画布滚动容器 */}
      <div
        ref={scrollContainerRef}
        className={className}
        onWheel={handleWheel}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          backgroundColor: '#f1f5f9',
          ...style,
        }}
      >
        {/* 画布缩放容器 */}
        <div
          style={{
            transform: scaleTransform,
            transformOrigin,
            width: canvasContentWidth,
            minHeight: '100%',
            margin: '0 auto',
            position: 'relative',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* 网格背景 */}
          <CanvasGridBackground
            gridType={gridType}
            showGridColumns={showGridColumns}
            canvasWidth={canvasContentWidth}
          />

          {/* 画布内容（白色画布区域） */}
          <div
            onClick={handleCanvasClick}
            style={{
              backgroundColor: '#fff',
              minHeight: 600,
              width: '100%',
              position: 'relative',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              margin: '20px auto',
            }}
          >
            {/* 递归渲染组件树 */}
            <CanvasRenderer
              rootNodeId={pageSchema.rootNodeId}
              zoom={canvas.zoom}
            />
          </div>
        </div>
      </div>

      {/* 缩放控制面板 */}
      <CanvasZoom
        containerWidth={containerWidth}
        canvasContentWidth={canvasContentWidth}
      />

      {/* 画布工具栏（网格切换等） */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          gap: 4,
          zIndex: 50,
        }}
      >
        {/* 网格类型切换 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '2px 4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <button
            style={{
              ...gridBtnStyle,
              backgroundColor: gridType === 'dots' ? '#e0f2fe' : 'transparent',
              color: gridType === 'dots' ? '#1d4ed8' : '#64748b',
            }}
            onClick={() => setGridType('dots')}
            title="点阵网格"
          >
            ⊙
          </button>
          <button
            style={{
              ...gridBtnStyle,
              backgroundColor: gridType === 'lines' ? '#e0f2fe' : 'transparent',
              color: gridType === 'lines' ? '#1d4ed8' : '#64748b',
            }}
            onClick={() => setGridType('lines')}
            title="线条网格"
          >
            ⊞
          </button>
          <button
            style={{
              ...gridBtnStyle,
              backgroundColor: gridType === 'none' ? '#e0f2fe' : 'transparent',
              color: gridType === 'none' ? '#1d4ed8' : '#64748b',
            }}
            onClick={() => setGridType('none')}
            title="关闭网格"
          >
            ○
          </button>
          <div style={{ width: 1, height: 18, backgroundColor: '#e2e8f0', margin: '0 2px' }} />
          <button
            style={{
              ...gridBtnStyle,
              backgroundColor: showGridColumns ? '#e0f2fe' : 'transparent',
              color: showGridColumns ? '#1d4ed8' : '#64748b',
            }}
            onClick={() => setShowGridColumns(!showGridColumns)}
            title="12列栅格"
          >
            ▤
          </button>
        </div>
      </div>
    </>);
};

/** 网格按钮样式 */
const gridBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 4,
  fontSize: 14,
  transition: 'background-color 0.15s, color 0.15s',
};

EditorCanvas.displayName = 'EditorCanvas';

export default EditorCanvas;
