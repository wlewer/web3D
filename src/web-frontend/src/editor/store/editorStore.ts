/**
 * 编辑器状态管理 - Zustand Store
 * Editor State Management - Zustand Store
 *
 * 搭建器编辑器的核心状态管理，包含：
 * - 页面Schema状态（节点树）
 * - 选中/悬停状态
 * - 画布状态
 * - 与 CommandManager 集成的撤销/重做
 * - 剪贴板操作
 * - 拖拽状态
 */
import { create } from 'zustand';
import type {
  ComponentNode,
  PageSchema,
  ResponsiveBreakpoint,
} from '../types/page-schema';
import type {
  SelectionState,
  CanvasState,
  HistoryState,
  ClipboardState,
  DragState,
} from '../types/editor-state';
import {
  INITIAL_SELECTION,
  INITIAL_CANVAS,
  INITIAL_HISTORY,
  INITIAL_DRAG,
} from '../types/editor-state';
import type { DragItem, DropResult } from '../types/dnd';
import {
  CommandManager,
  AddComponentCommand,
  RemoveComponentCommand,
  MoveComponentCommand,
  UpdatePropsCommand,
  UpdateStylesCommand,
} from '../core/CommandManager';
import type { NodeOperationCallbacks } from '../core/CommandManager';
import { EventBus } from '../core/EventBus';

// ===== 辅助工具 =====

/** 生成唯一节点ID */
function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 生成唯一页面ID */
function generatePageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 创建默认根节点 */
function createRootNode(): ComponentNode {
  return {
    id: 'root',
    type: 'page-root',
    props: {},
    styles: {},
    children: [],
    parentId: null,
    locked: false,
    hidden: false,
    responsiveStyles: {},
  };
}

/** 创建默认页面Schema */
function createDefaultPageSchema(): PageSchema {
  return {
    id: generatePageId(),
    title: '未命名页面',
    slug: 'untitled',
    version: '1.0.0',
    rootNodeId: 'root',
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

// ===== Store 状态接口 =====

/**
 * EditorStore - 编辑器完整状态与操作
 */
export interface EditorStore {
  // ===== 状态 =====

  /** 页面Schema */
  pageSchema: PageSchema;

  /** 节点映射表：nodeId → ComponentNode */
  nodes: Record<string, ComponentNode>;

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

  /** 是否有未保存的变更 */
  isDirty: boolean;

  // ===== 节点操作（通过 CommandManager） =====

  /** 添加组件节点 */
  addComponent: (pluginType: string, parentId: string | null, index?: number, config?: Record<string, unknown>) => string;
  /** 删除组件节点 */
  removeComponent: (nodeId: string) => void;
  /** 移动组件节点 */
  moveComponent: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  /** 更新节点属性 */
  updateNodeProps: (nodeId: string, updates: Record<string, unknown>) => void;
  /** 更新节点样式 */
  updateNodeStyles: (nodeId: string, updates: Record<string, unknown>) => void;

  // ===== 选中操作 =====

  /** 选中节点 */
  selectNode: (nodeId: string, multi?: boolean) => void;
  /** 取消选中 */
  clearSelection: () => void;
  /** 设置悬停节点 */
  setHoveredNode: (nodeId: string | null) => void;

  // ===== 画布操作 =====

  /** 设置缩放 */
  setZoom: (zoom: number) => void;
  /** 设置画布偏移 */
  setCanvasOffset: (offsetX: number, offsetY: number) => void;
  /** 设置设备预览模式 */
  setDeviceMode: (mode: ResponsiveBreakpoint) => void;

  // ===== 撤销/重做 =====

  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;

  // ===== 剪贴板 =====

  /** 复制选中节点 */
  copySelectedNodes: () => void;
  /** 剪切选中节点 */
  cutSelectedNodes: () => void;
  /** 粘贴剪贴板内容 */
  pasteClipboard: () => void;

  // ===== 拖拽 =====

  /** 开始拖拽 */
  startDrag: (item: DragItem, startPosition: { x: number; y: number }) => void;
  /** 更新拖拽位置 */
  updateDragPosition: (currentPosition: { x: number; y: number }) => void;
  /** 设置放置目标 */
  setDropTarget: (targetId: string | null, index: number | null) => void;
  /** 结束拖拽 */
  endDrag: (result?: DropResult) => void;

  // ===== 节点查询 =====

  /** 获取节点 */
  getNode: (nodeId: string) => ComponentNode | undefined;
  /** 获取节点的所有祖先节点ID */
  getAncestorIds: (nodeId: string) => string[];
  /** 检查节点是否是另一个节点的后代 */
  isDescendant: (nodeId: string, ancestorId: string) => boolean;

  // ===== 页面操作 =====

  /** 加载页面Schema */
  loadPage: (schema: PageSchema, nodes: Record<string, ComponentNode>) => void;
  /** 设置页面标题 */
  setPageTitle: (title: string) => void;
  /** 重置编辑器状态 */
  resetEditor: () => void;
}

// ===== 节点操作回调（CommandManager 与 Store 的桥梁） =====

/**
 * 创建节点操作回调
 * 这些回调被注入到具体命令中，命令通过回调操作 store 状态
 */
function createNodeCallbacks(
  get: () => EditorStore,
  set: (partial: Partial<EditorStore> | ((state: EditorStore) => Partial<EditorStore>)) => void,
): NodeOperationCallbacks {
  return {
    addNode: (parentId, index, node) => {
      set((state) => {
        const newNodes = { ...state.nodes, [node.id]: node };

        // 更新父节点的children列表
        if (parentId && newNodes[parentId]) {
          const parent = { ...newNodes[parentId] };
          const children = [...parent.children];
          const insertIndex = Math.min(index, children.length);
          children.splice(insertIndex, 0, node.id);
          parent.children = children;
          newNodes[parentId] = parent;
        }

        return { nodes: newNodes, isDirty: true };
      });
    },

    removeNode: (nodeId) => {
      const state = get();
      const node = state.nodes[nodeId];
      if (!node) return undefined;

      set((s) => {
        const newNodes = { ...s.nodes };

        // 递归删除子节点
        const removeRecursive = (id: string) => {
          const n = newNodes[id];
          if (n) {
            n.children.forEach(removeRecursive);
            delete newNodes[id];
          }
        };

        // 从父节点children中移除引用
        if (node.parentId && newNodes[node.parentId]) {
          const parent = { ...newNodes[node.parentId] };
          parent.children = parent.children.filter((id) => id !== nodeId);
          newNodes[node.parentId] = parent;
        }

        removeRecursive(nodeId);

        return { nodes: newNodes, isDirty: true };
      });

      return node;
    },

    moveNode: (nodeId, newParentId, newIndex) => {
      set((state) => {
        const newNodes = { ...state.nodes };
        const node = newNodes[nodeId];
        if (!node) return state;

        // 从旧父节点移除
        if (node.parentId && newNodes[node.parentId]) {
          const oldParent = { ...newNodes[node.parentId] };
          oldParent.children = oldParent.children.filter((id) => id !== nodeId);
          newNodes[node.parentId] = oldParent;
        }

        // 添加到新父节点
        if (newParentId && newNodes[newParentId]) {
          const newParent = { ...newNodes[newParentId] };
          const children = [...newParent.children];
          const insertIndex = Math.min(newIndex, children.length);
          children.splice(insertIndex, 0, nodeId);
          newParent.children = children;
          newNodes[newParentId] = newParent;
        }

        // 更新节点的parentId
        newNodes[nodeId] = { ...node, parentId: newParentId };

        return { nodes: newNodes, isDirty: true };
      });
    },

    updateNodeProps: (nodeId, updates) => {
      set((state) => {
        const node = state.nodes[nodeId];
        if (!node) return state;

        return {
          nodes: {
            ...state.nodes,
            [nodeId]: {
              ...node,
              props: { ...node.props, ...updates },
            },
          },
          isDirty: true,
        };
      });
    },

    updateNodeStyles: (nodeId, updates) => {
      set((state) => {
        const node = state.nodes[nodeId];
        if (!node) return state;

        return {
          nodes: {
            ...state.nodes,
            [nodeId]: {
              ...node,
              styles: { ...node.styles, ...updates },
            },
          },
          isDirty: true,
        };
      });
    },

    getNode: (nodeId) => {
      return get().nodes[nodeId];
    },
  };
}

// ===== 初始状态 =====

const rootNode = createRootNode();
const defaultPageSchema = createDefaultPageSchema();

const initialState = {
  pageSchema: defaultPageSchema,
  nodes: { root: rootNode } as Record<string, ComponentNode>,
  selection: INITIAL_SELECTION,
  canvas: INITIAL_CANVAS,
  history: INITIAL_HISTORY,
  clipboard: null as ClipboardState | null,
  drag: INITIAL_DRAG,
  isDirty: false,
};

// ===== 创建 Store =====

export const useEditorStore = create<EditorStore>((set, get) => {
  /** CommandManager 实例 */
  const commandManager = new CommandManager({ maxStackSize: 100 });

  /** EventBus 实例 */
  const eventBus = EventBus.getInstance();

  /** 节点操作回调 */
  const nodeCallbacks = createNodeCallbacks(get, set);

  return {
    // ===== 状态 =====
    ...initialState,

    // ===== 节点操作 =====

    addComponent: (pluginType, parentId, index, config) => {
      const state = get();
      const parent = parentId ? state.nodes[parentId] : state.nodes['root'];
      const targetParentId = parent ? parent.id : 'root';
      const targetIndex = index ?? (parent?.children.length ?? 0);

      const newNode: ComponentNode = {
        id: generateNodeId(),
        type: pluginType,
        props: config ?? {},
        styles: {},
        children: [],
        parentId: targetParentId,
        locked: false,
        hidden: false,
        responsiveStyles: {},
      };

      const command = new AddComponentCommand(
        nodeCallbacks,
        targetParentId,
        targetIndex,
        newNode,
      );

      commandManager.execute(command);

      // 更新历史状态
      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });

      eventBus.emit('node:added', {
        nodeId: newNode.id,
        parentId: targetParentId,
        index: targetIndex,
      });

      return newNode.id;
    },

    removeComponent: (nodeId) => {
      const command = new RemoveComponentCommand(nodeCallbacks, nodeId);
      commandManager.execute(command);

      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });

      eventBus.emit('node:removed', {
        nodeId,
        parentId: get().nodes[nodeId]?.parentId ?? null,
      });
    },

    moveComponent: (nodeId, newParentId, newIndex) => {
      const command = new MoveComponentCommand(
        nodeCallbacks,
        nodeId,
        newParentId,
        newIndex,
      );
      commandManager.execute(command);

      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });

      eventBus.emit('node:moved', {
        nodeId,
        oldParentId: null,
        newParentId,
        oldIndex: 0,
        newIndex,
      });
    },

    updateNodeProps: (nodeId, updates) => {
      const command = new UpdatePropsCommand(nodeCallbacks, nodeId, updates);
      commandManager.execute(command);

      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });

      eventBus.emit('node:updated', { nodeId, updates });
    },

    updateNodeStyles: (nodeId, updates) => {
      const command = new UpdateStylesCommand(nodeCallbacks, nodeId, updates);
      commandManager.execute(command);

      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });

      eventBus.emit('node:updated', { nodeId, updates });
    },

    // ===== 选中操作 =====

    selectNode: (nodeId, multi = false) => {
      set((state) => {
        const selectedNodeIds = multi
          ? state.selection.selectedNodeIds.includes(nodeId)
            ? state.selection.selectedNodeIds.filter((id) => id !== nodeId)
            : [...state.selection.selectedNodeIds, nodeId]
          : [nodeId];

        return {
          selection: { ...state.selection, selectedNodeIds },
        };
      });

      eventBus.emit('selection:changed', {
        selectedIds: get().selection.selectedNodeIds,
      });
    },

    clearSelection: () => {
      set((state) => ({
        selection: { ...state.selection, selectedNodeIds: [] },
      }));
      eventBus.emit('selection:changed', { selectedIds: [] });
    },

    setHoveredNode: (nodeId) => {
      set((state) => ({
        selection: { ...state.selection, hoveredNodeId: nodeId },
      }));
      eventBus.emit('selection:hover', { nodeId });
    },

    // ===== 画布操作 =====

    setZoom: (zoom) => {
      const clampedZoom = Math.max(0.1, Math.min(5, zoom));
      set((state) => ({
        canvas: { ...state.canvas, zoom: clampedZoom },
      }));
      eventBus.emit('canvas:zoom', { zoom: clampedZoom });
    },

    setCanvasOffset: (offsetX, offsetY) => {
      set((state) => ({
        canvas: { ...state.canvas, offsetX, offsetY },
      }));
      eventBus.emit('canvas:scroll', { offsetX, offsetY });
    },

    setDeviceMode: (mode) => {
      set((state) => ({
        canvas: { ...state.canvas, deviceMode: mode },
      }));
      eventBus.emit('canvas:device-changed', { device: mode });
    },

    // ===== 撤销/重做 =====

    undo: () => {
      commandManager.undo();
      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });
    },

    redo: () => {
      commandManager.redo();
      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });
    },

    // ===== 剪贴板 =====

    copySelectedNodes: () => {
      const state = get();
      if (state.selection.selectedNodeIds.length === 0) return;

      const nodes = state.selection.selectedNodeIds
        .map((id) => state.nodes[id])
        .filter((n): n is ComponentNode => n !== undefined);

      if (nodes.length === 0) return;

      set({
        clipboard: {
          type: nodes.length === 1 ? 'single' : 'multiple',
          nodes: nodes.map((n) => structuredClone(n)),
          source: 'copy',
          timestamp: Date.now(),
        },
      });
    },

    cutSelectedNodes: () => {
      const state = get();
      if (state.selection.selectedNodeIds.length === 0) return;

      const nodes = state.selection.selectedNodeIds
        .map((id) => state.nodes[id])
        .filter((n): n is ComponentNode => n !== undefined);

      if (nodes.length === 0) return;

      set({
        clipboard: {
          type: nodes.length === 1 ? 'single' : 'multiple',
          nodes: nodes.map((n) => structuredClone(n)),
          source: 'cut',
          timestamp: Date.now(),
        },
      });

      // 剪切模式下删除选中节点
      state.selection.selectedNodeIds.forEach((nodeId) => {
        get().removeComponent(nodeId);
      });
    },

    pasteClipboard: () => {
      const state = get();
      if (!state.clipboard) return;

      const targetParentId =
        state.selection.selectedNodeIds.length === 1
          ? state.selection.selectedNodeIds[0]
          : 'root';

      state.clipboard.nodes.forEach((nodeData, i) => {
        const newNode: ComponentNode = {
          ...structuredClone(nodeData),
          id: generateNodeId(),
          parentId: targetParentId,
          children: [], // 粘贴时不递归粘贴子节点，简化处理
        };

        const command = new AddComponentCommand(
          nodeCallbacks,
          targetParentId,
          i,
          newNode,
        );
        commandManager.execute(command);
      });

      set({
        history: {
          ...get().history,
          pointer: commandManager.currentPointer,
          canUndo: commandManager.canUndo,
          canRedo: commandManager.canRedo,
        },
      });
    },

    // ===== 拖拽 =====

    startDrag: (item, startPosition) => {
      set((state) => ({
        drag: {
          ...state.drag,
          phase: 'dragging',
          draggedNodeId: item.nodeId ?? null,
          draggedComponentType: item.componentType ?? null,
          startPosition,
          currentPosition: startPosition,
        },
      }));
      eventBus.emit('drag:start', {
        nodeId: item.nodeId,
        componentType: item.componentType,
      });
    },

    updateDragPosition: (currentPosition) => {
      set((state) => ({
        drag: { ...state.drag, currentPosition },
      }));
      eventBus.emit('drag:move', currentPosition);
    },

    setDropTarget: (targetId, index) => {
      set((state) => ({
        drag: { ...state.drag, dropTargetId: targetId, dropIndex: index },
      }));
    },

    endDrag: (result) => {
      const dropped = result?.success ?? false;

      set((state) => ({
        drag: {
          ...INITIAL_DRAG,
          phase: dropped ? 'dropped' : 'idle',
        },
      }));

      eventBus.emit('drag:end', { dropped });

      if (dropped && result) {
        eventBus.emit('drag:drop', {
          targetId: result.targetParentId,
          index: result.insertIndex,
        });
      }

      // 短暂延迟后重置拖拽阶段
      if (dropped) {
        setTimeout(() => {
          set((state) => ({
            drag: { ...state.drag, phase: 'idle' },
          }));
        }, 300);
      }
    },

    // ===== 节点查询 =====

    getNode: (nodeId) => {
      return get().nodes[nodeId];
    },

    getAncestorIds: (nodeId) => {
      const state = get();
      const ancestors: string[] = [];
      let current = state.nodes[nodeId];

      while (current?.parentId) {
        ancestors.push(current.parentId);
        current = state.nodes[current.parentId];
      }

      return ancestors;
    },

    isDescendant: (nodeId, ancestorId) => {
      const ancestors = get().getAncestorIds(nodeId);
      return ancestors.includes(ancestorId);
    },

    // ===== 页面操作 =====

    loadPage: (schema, nodes) => {
      commandManager.clear();
      set({
        pageSchema: schema,
        nodes,
        selection: INITIAL_SELECTION,
        canvas: INITIAL_CANVAS,
        history: { ...INITIAL_HISTORY },
        clipboard: null,
        drag: INITIAL_DRAG,
        isDirty: false,
      });
      eventBus.emit('page:loaded', { pageId: schema.id });
    },

    setPageTitle: (title) => {
      set((state) => ({
        pageSchema: { ...state.pageSchema, title },
        isDirty: true,
      }));
    },

    resetEditor: () => {
      commandManager.clear();
      const freshRoot = createRootNode();
      const freshSchema = createDefaultPageSchema();
      set({
        pageSchema: freshSchema,
        nodes: { root: freshRoot },
        selection: INITIAL_SELECTION,
        canvas: INITIAL_CANVAS,
        history: { ...INITIAL_HISTORY },
        clipboard: null,
        drag: INITIAL_DRAG,
        isDirty: false,
      });
    },
  };
});
