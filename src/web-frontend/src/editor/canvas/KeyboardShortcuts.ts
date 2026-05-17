/**
 * 快捷键处理
 * Keyboard Shortcuts Handler
 *
 * 提供编辑器全局快捷键：
 * - Delete/Backspace: 删除选中组件
 * - Ctrl+C: 复制
 * - Ctrl+X: 剪切
 * - Ctrl+V: 粘贴
 * - Ctrl+Z: 撤销
 * - Ctrl+Shift+Z / Ctrl+Y: 重做
 * - Ctrl+A: 全选
 * - Escape: 取消选中
 */
import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { EventBus } from '../core/EventBus';

/** 快捷键处理器选项 */
export interface KeyboardShortcutsOptions {
  /** 是否启用快捷键（默认true） */
  enabled?: boolean;
  /** 自定义快捷键处理器（优先于默认处理） */
  customHandler?: (e: KeyboardEvent) => boolean;
}

/**
 * useKeyboardShortcuts - 快捷键Hook
 *
 * 在组件中调用此Hook来注册编辑器全局快捷键。
 * 自动处理键位冲突和浏览器默认行为阻止。
 *
 * @param options - 快捷键配置选项
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}): void {
  const { enabled = true, customHandler } = options;

  const removeComponent = useEditorStore((s) => s.removeComponent);
  const copySelectedNodes = useEditorStore((s) => s.copySelectedNodes);
  const cutSelectedNodes = useEditorStore((s) => s.cutSelectedNodes);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const selectNode = useEditorStore((s) => s.selectNode);
  const selectedNodeIds = useEditorStore((s) => s.selection.selectedNodeIds);
  const nodes = useEditorStore((s) => s.nodes);

  useEffect(() => {
    if (!enabled) return;

    const eventBus = EventBus.getInstance();

    const handleKeyDown = (e: KeyboardEvent) => {
      // 自定义处理器优先
      if (customHandler && customHandler(e)) {
        return;
      }

      // 在输入框中不处理快捷键
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key;

      // Delete / Backspace: 删除选中组件
      if ((key === 'Delete' || key === 'Backspace') && !isCtrl) {
        e.preventDefault();
        if (selectedNodeIds.length > 0) {
          // 不允许删除根节点
          const deletableIds = selectedNodeIds.filter((id) => id !== 'root');
          deletableIds.forEach((id) => {
            const node = nodes[id];
            if (node && !node.locked) {
              removeComponent(id);
              eventBus.emit('node:removed', { nodeId: id, parentId: node.parentId });
            }
          });
        }
        return;
      }

      // Ctrl+Z: 撤销
      if (isCtrl && key === 'z' && !isShift) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z / Ctrl+Y: 重做
      if ((isCtrl && isShift && key === 'z') || (isCtrl && key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+C: 复制
      if (isCtrl && key === 'c' && !isShift) {
        e.preventDefault();
        copySelectedNodes();
        return;
      }

      // Ctrl+X: 剪切
      if (isCtrl && key === 'x' && !isShift) {
        e.preventDefault();
        cutSelectedNodes();
        return;
      }

      // Ctrl+V: 粘贴
      if (isCtrl && key === 'v' && !isShift) {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Ctrl+A: 全选
      if (isCtrl && key === 'a' && !isShift) {
        e.preventDefault();
        // 全选所有非根节点的顶层子节点
        const rootNode = nodes['root'];
        if (rootNode) {
          rootNode.children.forEach((childId, index) => {
            selectNode(childId, index > 0);
          });
        }
        return;
      }

      // Escape: 取消选中
      if (key === 'Escape') {
        e.preventDefault();
        clearSelection();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    customHandler,
    removeComponent,
    copySelectedNodes,
    cutSelectedNodes,
    pasteClipboard,
    undo,
    redo,
    clearSelection,
    selectNode,
    selectedNodeIds,
    nodes,
  ]);
}

/**
 * KeyboardShortcuts - 组件形式的快捷键处理器
 *
 * 对于不使用Hook的场景，可以渲染此组件来启用快捷键。
 */
export const KeyboardShortcuts: React.FC<KeyboardShortcutsOptions> = (options) => {
  useKeyboardShortcuts(options);
  return null;
};

KeyboardShortcuts.displayName = 'KeyboardShortcuts';

export default KeyboardShortcuts;
