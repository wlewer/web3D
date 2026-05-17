/**
 * 页面Schema规范
 * Page Schema Specification
 *
 * 定义搭建器中页面结构的树形数据模型，
 * 包括组件节点、页面元数据、响应式断点等。
 */

// ===== 响应式断点 =====

/** 响应式断点常量 */
export const ResponsiveBreakpoint = {
  /** 移动端 (<768px) */
  MOBILE: 'mobile',
  /** 平板端 (768px-1024px) */
  TABLET: 'tablet',
  /** 桌面端 (>1024px) */
  DESKTOP: 'desktop',
} as const;

/** 响应式断点联合类型 */
export type ResponsiveBreakpoint = (typeof ResponsiveBreakpoint)[keyof typeof ResponsiveBreakpoint];

/** 响应式断点配置 */
export interface BreakpointConfig {
  /** 断点名称 */
  name: ResponsiveBreakpoint;
  /** 最小宽度（px） */
  minWidth: number;
  /** 最大宽度（px），不设置表示无上限 */
  maxWidth?: number;
  /** 画布宽度（px），编辑器中使用的预览宽度 */
  canvasWidth: number;
}

/** 预定义断点配置表 */
export const BREAKPOINTS: Record<ResponsiveBreakpoint, BreakpointConfig> = {
  mobile: { name: 'mobile', minWidth: 0, maxWidth: 767, canvasWidth: 375 },
  tablet: { name: 'tablet', minWidth: 768, maxWidth: 1023, canvasWidth: 768 },
  desktop: { name: 'desktop', minWidth: 1024, canvasWidth: 1440 },
};

// ===== 组件节点 =====

/**
 * ComponentNode - 组件节点
 *
 * 页面树中的基本单元，每个节点对应一个组件实例。
 * 通过 children 字段构成树形结构，parentId 用于快速定位父节点。
 */
export interface ComponentNode {
  /** 节点唯一标识符（自动生成的UUID） */
  id: string;

  /** 组件插件类型ID（对应 IComponentPlugin.id） */
  type: string;

  /** 组件属性配置 */
  props: Record<string, unknown>;

  /** 组件行内样式 */
  styles: Record<string, unknown>;

  /** 子节点ID列表（有序） */
  children: string[];

  /** 父节点ID（根节点为 null） */
  parentId: string | null;

  /** 是否锁定（锁定后不可编辑/删除/移动） */
  locked: boolean;

  /** 是否隐藏（隐藏后渲染但不显示） */
  hidden: boolean;

  /**
   * 响应式样式覆盖
   * key 为断点名称，value 为该断点下的样式覆盖
   */
  responsiveStyles: Partial<Record<ResponsiveBreakpoint, Record<string, unknown>>>;
}

// ===== 页面Schema =====

/**
 * 页面元数据
 */
export interface PageMetadata {
  /** 页面创建者 */
  author?: string;
  /** 页面创建时间（ISO 8601） */
  createdAt?: string;
  /** 最后修改时间（ISO 8601） */
  updatedAt?: string;
  /** 页面标签 */
  tags?: string[];
  /** 页面描述 */
  description?: string;
  /** 自定义扩展字段 */
  extra?: Record<string, unknown>;
}

/**
 * PageSchema - 页面Schema
 *
 * 完整描述一个搭建器页面的结构，
 * 包含页面基本信息、组件树根节点、以及元数据。
 * 可序列化为JSON进行持久化和传输。
 */
export interface PageSchema {
  /** 页面唯一标识符 */
  id: string;

  /** 页面标题 */
  title: string;

  /** 页面路由slug（URL友好标识） */
  slug: string;

  /** Schema版本号（用于数据迁移） */
  version: string;

  /** 组件树根节点ID */
  rootNodeId: string;

  /** 页面元数据 */
  metadata: PageMetadata;
}

// ===== 节点树辅助类型 =====

/**
 * 节点查找结果
 */
export interface NodeLookupResult {
  /** 找到的节点 */
  node: ComponentNode;
  /** 节点在父节点children中的索引位置 */
  index: number;
  /** 父节点（根节点时为null） */
  parent: ComponentNode | null;
}

/**
 * 节点移动描述
 */
export interface NodeMoveDescriptor {
  /** 被移动的节点ID */
  nodeId: string;
  /** 新的父节点ID */
  newParentId: string | null;
  /** 在新父节点children中的目标索引 */
  newIndex: number;
}

/**
 * 节点插入描述
 */
export interface NodeInsertDescriptor {
  /** 新节点（尚未分配ID时id可为空） */
  node: Omit<ComponentNode, 'id'>;
  /** 父节点ID（null=插入为根节点的子节点） */
  parentId: string | null;
  /** 插入位置索引 */
  index: number;
}
