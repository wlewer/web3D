/**
 * 拖拽协议类型定义
 * Drag and Drop Protocol Type Definitions
 *
 * 定义搭建器中拖拽操作的统一协议，
 * 包括拖拽数据结构、放置结果和插入位置计算。
 */

// ===== 拖拽数据 =====

/**
 * 拖拽来源
 */
export const DragSource = {
  /** 从组件面板侧边栏拖入 */
  SIDEBAR: 'sidebar',
  /** 从画布内拖拽移动 */
  CANVAS: 'canvas',
  /** 从外部拖入（如文件上传） */
  EXTERNAL: 'external',
} as const;

export type DragSource = (typeof DragSource)[keyof typeof DragSource];

/**
 * DragItem - 拖拽数据项
 *
 * 拖拽开始时携带的数据，描述正在被拖拽的内容。
 * 不同来源（侧边栏/画布/外部）携带不同数据。
 */
export interface DragItem {
  /** 拖拽来源 */
  source: DragSource;

  /**
   * 从侧边栏拖入时的组件类型ID
   * 对应 IComponentPlugin.id
   */
  componentType?: string;

  /**
   * 从画布拖拽时的节点ID
   */
  nodeId?: string;

  /**
   * 从外部拖入时的文件列表
   */
  files?: File[];

  /** 拖拽附加数据 */
  data?: Record<string, unknown>;
}

// ===== 放置结果 =====

/**
 * 插入位置
 */
export const InsertPosition = {
  /** 插入到目标节点的子节点列表末尾 */
  APPEND: 'append',
  /** 插入到目标节点的子节点列表开头 */
  PREPEND: 'prepend',
  /** 插入到目标节点之前（同级） */
  BEFORE: 'before',
  /** 插入到目标节点之后（同级） */
  AFTER: 'after',
} as const;

export type InsertPosition = (typeof InsertPosition)[keyof typeof InsertPosition];

/**
 * DropResult - 放置结果
 *
 * 描述拖拽操作完成后的放置结果，
 * 包含目标容器和精确的插入位置。
 */
export interface DropResult {
  /** 放置是否有效 */
  success: boolean;

  /** 目标父容器节点ID */
  targetParentId: string | null;

  /** 目标容器中的插入索引 */
  insertIndex: number;

  /** 插入位置类型 */
  position: InsertPosition;

  /** 被拖拽的项 */
  item: DragItem;

  /** 放置失败原因（success=false 时） */
  reason?: string;
}

// ===== 插入位置计算 =====

/**
 * 鼠标位置相对于目标节点的区域
 * 用于判断插入方向
 */
export const DropZone = {
  /** 目标节点上方区域 → BEFORE */
  TOP: 'top',
  /** 目标节点下方区域 → AFTER */
  BOTTOM: 'bottom',
  /** 目标节点左侧区域 → BEFORE（水平布局） */
  LEFT: 'left',
  /** 目标节点右侧区域 → AFTER（水平布局） */
  RIGHT: 'right',
  /** 目标节点中心区域 → APPEND（作为子节点） */
  CENTER: 'center',
} as const;

export type DropZone = (typeof DropZone)[keyof typeof DropZone];

/**
 * 插入位置计算输入
 */
export interface InsertPositionInput {
  /** 目标容器节点ID */
  targetNodeId: string;
  /** 目标容器当前子节点数量 */
  childCount: number;
  /** 鼠标相对于目标节点的位置区域 */
  dropZone: DropZone;
  /** 目标节点是否允许接收子节点 */
  allowsChildren: boolean;
  /** 是否已达到子节点数量上限（-1=无限制） */
  maxChildren: number;
}

/**
 * 插入位置计算结果
 */
export interface InsertPositionResult {
  /** 父容器节点ID */
  parentId: string | null;
  /** 插入索引 */
  index: number;
  /** 插入位置类型 */
  position: InsertPosition;
}

/**
 * 计算精确插入位置
 *
 * 根据鼠标在目标节点上的落点区域，
 * 结合容器约束，计算出最终插入位置。
 *
 * @param input - 插入位置计算输入
 * @returns 插入位置计算结果
 */
export function calculateInsertPosition(
  input: InsertPositionInput,
): InsertPositionResult {
  const { targetNodeId, childCount, dropZone, allowsChildren, maxChildren } = input;

  // 中心区域 → 作为目标节点的子节点
  if (dropZone === 'center' && allowsChildren) {
    if (maxChildren >= 0 && childCount >= maxChildren) {
      // 子节点已满，改为 AFTER 插入
      return { parentId: targetNodeId, index: childCount, position: 'after' };
    }
    return { parentId: targetNodeId, index: childCount, position: 'append' };
  }

  // 上/左区域 → 插入到目标节点之前（同级）
  if (dropZone === 'top' || dropZone === 'left') {
    return { parentId: targetNodeId, index: 0, position: 'before' };
  }

  // 下/右区域 → 插入到目标节点之后（同级）
  return { parentId: targetNodeId, index: childCount, position: 'after' };
}

