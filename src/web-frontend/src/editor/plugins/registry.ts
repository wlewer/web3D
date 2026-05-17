/**
 * 内置插件注册表 - Builtin Plugins Registry
 * Batch registration of all built-in component plugins
 */
import type { ComponentRegistry } from '../core/ComponentRegistry';

// Layout plugins
import { ContainerPlugin } from './layout/ContainerPlugin';
import { RowPlugin } from './layout/RowPlugin';
import { ColumnPlugin } from './layout/ColumnPlugin';
import { SectionPlugin } from './layout/SectionPlugin';

// Basic UI plugins
import { TextBlockPlugin } from './basic/TextBlockPlugin';
import { ImageBlockPlugin } from './basic/ImageBlockPlugin';
import { ButtonBlockPlugin } from './basic/ButtonBlockPlugin';
import { VideoBlockPlugin } from './basic/VideoBlockPlugin';

// 3D plugins
import { ModelViewerPlugin } from './threed/ModelViewerPlugin';
import { ModelCardGridPlugin } from './threed/ModelCardGridPlugin';

// Marketing plugins
import { Hero3DCarouselPlugin } from './marketing/Hero3DCarouselPlugin';
import { ContactFormPlugin } from './marketing/ContactFormPlugin';

import type { IComponentPlugin } from '../types/plugin';

/**
 * 所有内置插件列表
 * All built-in plugins in a flat array for convenience
 */
export const builtinPlugins: IComponentPlugin[] = [
  // Layout
  ContainerPlugin,
  RowPlugin,
  ColumnPlugin,
  SectionPlugin,
  // Basic UI
  TextBlockPlugin,
  ImageBlockPlugin,
  ButtonBlockPlugin,
  VideoBlockPlugin,
  // 3D
  ModelViewerPlugin,
  ModelCardGridPlugin,
  // Marketing
  Hero3DCarouselPlugin,
  ContactFormPlugin,
];

/**
 * 批量注册所有内置插件到组件注册表
 * Register all built-in plugins to the component registry
 *
 * @param registry - ComponentRegistry 实例
 * @returns 每个插件的注册结果数组
 */
export function registerBuiltinPlugins(registry: ComponentRegistry): boolean[] {
  return registry.registerAll(builtinPlugins);
}
