/**
 * 搭建器面板模块统一导出
 * Editor Panels Barrel Export
 *
 * 导出所有编辑器面板相关组件：
 * - 左侧组件面板（ComponentPanel 及其子组件）
 * - 右侧属性面板（PropertyPanel 及其子组件）
 * - 通用编辑组件（ColorPicker、Model3DPicker 等）
 * - 拖拽基础设施（DragSource HOC / Hook）
 */

// ===== 左侧组件面板 =====
export { ComponentPanel } from './ComponentPanel';
export type { ComponentPanelProps } from './ComponentPanel';

export { ComponentCard } from './ComponentCard';
export type { ComponentCardProps } from './ComponentCard';

export { CategoryFilter } from './CategoryFilter';
export type { CategoryFilterProps } from './CategoryFilter';

export { ComponentSearch } from './ComponentSearch';
export type { ComponentSearchProps, SearchableItem } from './ComponentSearch';

// ===== 右侧属性面板 =====
export { PropertyPanel } from './PropertyPanel';
export type { PropertyPanelProps } from './PropertyPanel';

export { PropsEditor } from './PropsEditor';
export type { PropsEditorProps } from './PropsEditor';

export { StyleEditor } from './StyleEditor';
export type { StyleEditorProps } from './StyleEditor';

export { LayoutEditor } from './LayoutEditor';
export type { LayoutEditorProps } from './LayoutEditor';

export { ResponsiveConfig } from './ResponsiveConfig';
export type { ResponsiveConfigProps } from './ResponsiveConfig';

// ===== 通用编辑组件 =====
export { ColorPicker } from './ColorPicker';
export type { ColorPickerProps } from './ColorPicker';

export { Model3DPicker } from './Model3DPicker';
export type { Model3DPickerProps, Model3DItem } from './Model3DPicker';

// ===== 拖拽基础设施 =====
export { withDragSource, useDragSource } from './DragSource';
export type {
  DragSourceInjectedProps,
  DragSourceOptions,
} from './DragSource';
