/**
 * 组件插件接口规范
 * Component Plugin Interface Specification
 *
 * 定义搭建器中所有组件插件的统一规范，
 * 包括渲染器、编辑器、生命周期、子组件约束和依赖声明。
 */
import type { ComponentType } from 'react';

// ===== 组件分类 =====

/** 组件分类常量（替代 enum，兼容 erasableSyntaxOnly） */
export const ComponentCategory = {
  /** 布局类：容器、栅格、分栏等 */
  LAYOUT: 'layout',
  /** 基础UI：按钮、输入框、文本等 */
  BASIC_UI: 'basic-ui',
  /** 3D原子组件：3D查看器、模型展示等基础3D能力 */
  THREE_D_ATOMIC: '3d-atomic',
  /** 3D业务组件：3D画廊、3D车间等业务级3D能力 */
  THREE_D_BUSINESS: '3d-business',
  /** 营销类：Banner、弹窗、倒计时等 */
  MARKETING: 'marketing',
  /** AI能力：AI生成、智能推荐等 */
  AI: 'ai',
  /** 自定义分类 */
  CUSTOM: 'custom',
} as const;

/** 组件分类联合类型 */
export type ComponentCategory = (typeof ComponentCategory)[keyof typeof ComponentCategory];

// ===== 插件依赖 =====

/**
 * 插件外部依赖声明
 * 用于运行前预加载所需脚本、样式或关联组件
 */
export interface PluginDependencies {
  /** 外部脚本URL列表 */
  scripts?: string[];
  /** 外部样式表URL列表 */
  styles?: string[];
  /** 依赖的其他组件插件ID列表 */
  components?: string[];
}

// ===== 插件生命周期 =====

/**
 * 插件生命周期钩子
 * 在组件挂载、更新、卸载时触发
 */
export interface PluginLifecycle {
  /**
   * 组件挂载后触发
   * @param element - 组件挂载的DOM根元素
   * @param config - 当前组件配置
   */
  onMount?: (element: HTMLElement, config: Record<string, unknown>) => void;

  /**
   * 组件配置更新后触发
   * @param config - 更新后的组件配置
   */
  onUpdate?: (config: Record<string, unknown>) => void;

  /**
   * 组件卸载前触发，用于清理资源
   */
  onUnmount?: () => void;
}

// ===== 子组件约束 =====

/**
 * 子组件约束规则
 * 控制当前组件允许哪些子组件以及数量限制
 */
export interface ChildrenConstraint {
  /** 是否允许包含子组件 */
  allowChildren?: boolean;
  /** 允许的子组件类型ID白名单（空数组=允许所有已注册类型） */
  allowedChildTypes?: string[];
  /** 最大子组件数量（不设置=无限制） */
  maxChildren?: number;
}

// ===== 组件插件接口 =====

/**
 * IComponentPlugin - 组件插件完整接口
 *
 * 每个搭建器组件必须实现此接口，通过 ComponentRegistry 注册后即可在搭建器中使用。
 * 设计原则：
 * - renderer 必须提供，负责组件的运行时渲染
 * - editor 可选，提供组件的专属编辑面板
 * - defaultConfig 定义组件初始配置，创建新实例时使用
 * - lifecycle 钩子用于集成第三方库（如Three.js场景初始化/销毁）
 * - childrenConstraint 控制组件在页面树中的嵌套规则
 */
export interface IComponentPlugin extends PluginLifecycle, ChildrenConstraint {
  /** 插件唯一标识符，格式建议：vendor.component-name */
  id: string;

  /** 插件显示名称 */
  name: string;

  /** 插件所属分类 */
  category: ComponentCategory;

  /** 语义化版本号（遵循 semver） */
  version: string;

  /** 插件图标（iconify ID 或 emoji） */
  icon?: string;

  /** 插件缩略图URL */
  thumbnail?: string;

  /** 插件功能描述 */
  description?: string;

  /** 运行时渲染器组件 */
  renderer: ComponentType<Record<string, unknown>>;

  /** 属性编辑器组件（不设置则使用通用属性面板） */
  editor?: ComponentType<Record<string, unknown>>;

  /** 默认配置（创建组件实例时作为初始props） */
  defaultConfig: Record<string, unknown>;

  /** 默认样式（创建组件实例时作为初始CSS样式） */
  defaultStyles?: Record<string, unknown>;

  /** 外部依赖声明 */
  dependencies?: PluginDependencies;
}
