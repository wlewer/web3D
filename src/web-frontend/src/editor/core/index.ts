/**
 * 核心模块统一导出
 * Core Modules Barrel Export
 */
export { EventBus } from './EventBus';
export type { EditorEventMap, EventHandler } from './EventBus';

export {
  CommandManager,
  AddComponentCommand,
  RemoveComponentCommand,
  MoveComponentCommand,
  UpdatePropsCommand,
  UpdateStylesCommand,
} from './CommandManager';
export type { Command, MergeStrategy, NodeOperationCallbacks } from './CommandManager';

export { ComponentRegistry } from './ComponentRegistry';
export type { RegistryEventMap } from './ComponentRegistry';
