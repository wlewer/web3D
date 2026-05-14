/**
 * 组件注册表 - 模板组件注册与懒加载
 * ComponentRegistry for template component registration and lazy loading
 */
import React from 'react';
import type { TemplateComponentProps } from '../../types/template';

// 组件加载器类型
type ComponentLoader = () => Promise<{ default: React.ComponentType<TemplateComponentProps> }>;

// 组件条目
interface ComponentEntry {
  loader: ComponentLoader;
  /** 默认占位组件（加载中显示） */
  fallback?: React.ComponentType<TemplateComponentProps>;
}

// 全局组件注册表
const registry = new Map<string, ComponentEntry>();

/**
 * 注册内置组件（编译时 code-split）
 */
export function registerComponent(
  componentType: string,
  loader: ComponentLoader,
  fallback?: React.ComponentType<TemplateComponentProps>,
): void {
  registry.set(componentType, { loader, fallback });
}

/**
 * 注册多个组件
 */
export function registerComponents(
  entries: Array<{ type: string; loader: ComponentLoader; fallback?: React.ComponentType<TemplateComponentProps> }>,
): void {
  entries.forEach(({ type, loader, fallback }) => registerComponent(type, loader, fallback));
}

/**
 * 检查组件是否已注册
 */
export function hasComponent(componentType: string): boolean {
  return registry.has(componentType);
}

/**
 * 获取已注册的所有组件类型
 */
export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * 获取组件条目
 */
export function getComponentEntry(componentType: string): ComponentEntry | undefined {
  return registry.get(componentType);
}

// ===== 内置组件注册 =====
// 延迟导入所有内置组件

registerComponents([
  {
    type: 'hero-3d-carousel',
    loader: () => import('../../pages/Home/HomePage').then(m => {
      // Hero3DCarousel 暂用 HomePage 的兼容导出
      return { default: m.HomePage as unknown as React.ComponentType<TemplateComponentProps> };
    }),
  },
  {
    type: 'model-card-grid',
    loader: () => import('../../pages/Gallery/GalleryPage').then(m => {
      return { default: m.GalleryPage as unknown as React.ComponentType<TemplateComponentProps> };
    }),
  },
  {
    type: 'workshop-3d',
    loader: () => import('../../pages/Workshop3D/Workshop3D').then(m => {
      return { default: m.Workshop3D as unknown as React.ComponentType<TemplateComponentProps> };
    }),
  },
  {
    type: 'text-block',
    loader: () => import('./builtin/TextBlock').then(m => ({ default: m.TextBlock })),
  },
  {
    type: 'image-block',
    loader: () => import('./builtin/ImageBlock').then(m => ({ default: m.ImageBlock })),
  },
]);

export default registry;
