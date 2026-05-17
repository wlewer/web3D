/**
 * 画布引擎模块 - Barrel导出
 * Canvas Engine Module - Barrel Exports
 */

// 画布主容器
export { EditorCanvas } from './EditorCanvas';
export type { EditorCanvasProps, GridType } from './EditorCanvas';

// 递归渲染器
export { CanvasRenderer } from './CanvasRenderer';
export type { CanvasRendererProps } from './CanvasRenderer';

// 放置区域
export { DropZone, COMPONENT_DND_TYPE } from './DropZone';
export type { DropZoneProps } from './DropZone';

// 选中框
export { SelectionOverlay } from './SelectionOverlay';
export type { SelectionOverlayProps } from './SelectionOverlay';

// 悬停高亮
export { HoverHighlight } from './HoverHighlight';
export type { HoverHighlightProps } from './HoverHighlight';

// 尺寸调整手柄
export { ResizeHandle, ALL_DIRECTIONS } from './ResizeHandle';
export type { ResizeHandleProps, HandleDirection } from './ResizeHandle';

// 栅格系统
export { GridSystem, calculateGrid, snapToGridPoint, getCanvasWidthForDevice } from './GridSystem';
export type { GridSystemProps, GridInfo } from './GridSystem';

// 拖拽预览
export { DragPreview } from './DragPreview';
export type { DragPreviewProps } from './DragPreview';

// 缩放控制
export { CanvasZoom } from './CanvasZoom';
export type { CanvasZoomProps } from './CanvasZoom';

// 快捷键
export { KeyboardShortcuts, useKeyboardShortcuts } from './KeyboardShortcuts';
export type { KeyboardShortcutsOptions } from './KeyboardShortcuts';
