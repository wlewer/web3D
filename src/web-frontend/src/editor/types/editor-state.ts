/**
 * 编辑器状态类型定义
 * Editor State Type Definitions
 *
 * 定义搭建器编辑器的完整状态结构，
 * 包括选中状态、画布状态、操作历史、剪贴板和拖拽状态。
 */
import type { ResponsiveBreakpoint } from './page-schema';

// ===== 选中状态 =====

/**
 * 选中状态
 * 管理当前选中和悬停的组件节点
 */
export interface SelectionState {
  /** 当前选中的节点ID列表（支持多选） */
  selectedNodeIds: string[];

  /** 当前悬停的节点ID */
  hoveredNodeId: string | null;
}

// ===== 画布状态 =====

/**
 * 画布视口状态
 * 控制编辑器画布的缩放、偏移和设备预览模式
 */
export interface CanvasState {
  /** 画布缩放比例（1 = 100%） */
  zoom: number;

  /** 画布水平偏移（px） */
  offsetX: number;

  /** 画布垂直偏移（px） */
  offsetY: number;

  /** 当前设备预览模式 */
  deviceMode: ResponsiveBreakpoint;
}

// ===== 操作历史 =====

/**
 * 操作历史栈状态
 * 与 CommandManager 配合，提供撤销/重做能力
 */
export interface HistoryState {
  /** 当前历史指针位置（-1 表示空栈） */
  pointer: number;

  /** 历史栈最大容量 */
  maxStackSize: number;

  /** 是否可撤销 */
  canUndo: boolean;

  /** 是否可重做 */
  canRedo: boolean;
}

// ===== 剪贴板 =====

/**
 * 剪贴板内容类型
 */
export const ClipboardContentType = {
  /** 单个节点 */
  SINGLE: 'single',
  /** 多个节点 */
  MULTIPLE: 'multiple',
} as const;

export type ClipboardContentType = (typeof ClipboardContentType)[keyof typeof ClipboardContentType];

/**
 * 剪贴板状态
 * 存储被复制/剪切的节点数据
 */
export interface ClipboardState<T = Record<string, unknown>> {
  /** 剪贴板内容类型 */
  type: ClipboardContentType;

  /** 剪贴板中的节点数据列表（序列化后的ComponentNode） */
  nodes: T[];

  /** 操作来源（复制 or 剪切） */
  source: 'copy' | 'cut';

  /** 复制时间戳 */
  timestamp: number;
}

// ===== 拖拽状态 =====

/**
 * 拖拽阶段
 */
export const DragPhase = {
  /** 未开始 */
  IDLE: 'idle',
  /** 拖拽进行中 */
  DRAGGING: 'dragging',
  /** 拖拽已放下 */
  DROPPED: 'dropped',
} as const;

export type DragPhase = (typeof DragPhase)[keyof typeof DragPhase];

/**
 * 拖拽状态
 * 跟踪当前拖拽操作的实时状态
 */
export interface DragState {
  /** 当前拖拽阶段 */
  phase: DragPhase;

  /** 被拖拽的节点ID（画布内拖拽时） */
  draggedNodeId: string | null;

  /** 被拖拽的组件类型（从侧边栏拖入时） */
  draggedComponentType: string | null;

  /** 拖拽起始位置 */
  startPosition: { x: number; y: number } | null;

  /** 当前拖拽位置 */
  currentPosition: { x: number; y: number } | null;

  /** 当前悬停的目标容器节点ID */
  dropTargetId: string | null;

  /** 在目标容器中的插入位置索引 */
  dropIndex: number | null;
}

// ===== 编辑器完整状态 =====

/**
 * EditorState - 编辑器完整状态
 *
 * 汇总搭建器编辑器的所有子状态，
 * 作为 Zustand store 的状态切片基础。
 */
export interface EditorState {
  /** 选中/悬停状态 */
  selection: SelectionState;

  /** 画布状态 */
  canvas: CanvasState;

  /** 操作历史状态 */
  history: HistoryState;

  /** 剪贴板状态 */
  clipboard: ClipboardState | null;

  /** 拖拽状态 */
  drag: DragState;
}

// ===== 状态初始值 =====

/** 选中状态初始值 */
export const INITIAL_SELECTION: SelectionState = {
  selectedNodeIds: [],
  hoveredNodeId: null,
};

/** 画布状态初始值 */
export const INITIAL_CANVAS: CanvasState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  deviceMode: 'desktop',
};

/** 操作历史初始值 */
export const INITIAL_HISTORY: HistoryState = {
  pointer: -1,
  maxStackSize: 100,
  canUndo: false,
  canRedo: false,
};

/** 拖拽状态初始值 */
export const INITIAL_DRAG: DragState = {
  phase: 'idle',
  draggedNodeId: null,
  draggedComponentType: null,
  startPosition: null,
  currentPosition: null,
  dropTargetId: null,
  dropIndex: null,
};
