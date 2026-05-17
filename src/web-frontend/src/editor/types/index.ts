/**
 * 搭建器类型定义统一导出
 * Editor Types Barrel Export
 */
export {
  ComponentCategory,
  type ComponentCategory as ComponentCategoryType,
  type PluginDependencies,
  type PluginLifecycle,
  type ChildrenConstraint,
  type IComponentPlugin,
} from './plugin';

export {
  ResponsiveBreakpoint,
  type ResponsiveBreakpoint as ResponsiveBreakpointType,
  type BreakpointConfig,
  BREAKPOINTS,
  type ComponentNode,
  type PageMetadata,
  type PageSchema,
  type NodeLookupResult,
  type NodeMoveDescriptor,
  type NodeInsertDescriptor,
} from './page-schema';

export {
  type SelectionState,
  type CanvasState,
  type HistoryState,
  ClipboardContentType,
  type ClipboardContentType as ClipboardContentTypeType,
  type ClipboardState,
  DragPhase,
  type DragPhase as DragPhaseType,
  type DragState,
  type EditorState,
  INITIAL_SELECTION,
  INITIAL_CANVAS,
  INITIAL_HISTORY,
  INITIAL_DRAG,
} from './editor-state';

export {
  DragSource,
  type DragSource as DragSourceType,
  type DragItem,
  InsertPosition,
  type InsertPosition as InsertPositionType,
  type DropResult,
  DropZone,
  type DropZone as DropZoneType,
  type InsertPositionInput,
  type InsertPositionResult,
  calculateInsertPosition,
} from './dnd';
