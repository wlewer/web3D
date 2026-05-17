/**
 * 命令管理器 - 撤销/重做系统
 * Command Manager - Undo/Redo System
 *
 * 实现命令模式（Command Pattern），提供：
 * - 可撤销/重做的操作队列
 * - 命令合并（短时间内相似操作合并为一个）
 * - 可配置的历史栈最大长度
 * - 具体命令实现：添加/删除/移动/更新属性/更新样式
 */
import type { ComponentNode } from '../types/page-schema';
import { EventBus } from './EventBus';

// ===== Command 接口 =====

/**
 * Command - 命令接口
 *
 * 所有可撤销操作必须实现此接口。
 * execute 在首次执行时调用，undo/redo 在撤销/重做时调用。
 */
export interface Command {
  /** 命令类型标识（用于命令合并判断） */
  readonly type: string;

  /** 命令描述（用于调试和历史记录展示） */
  readonly description: string;

  /** 执行命令 */
  execute(): void;

  /** 撤销命令 */
  undo(): void;

  /** 重做命令（默认调用 execute） */
  redo(): void;
}

// ===== 命令合并策略 =====

/**
 * 命令合并条件
 * 判断两个命令是否可以合并为一个
 */
export type MergeStrategy = (prev: Command, next: Command) => boolean;

/**
 * 默认合并策略：相同类型且在合并窗口内的命令合并
 * 例如：连续的样式微调操作合并为一次
 */
function defaultMergeStrategy(prev: Command, next: Command): boolean {
  return prev.type === next.type && prev.type !== '__no_merge__';
}

// ===== 命令管理器 =====

/**
 * CommandManager - 命令管理器
 *
 * 管理命令的执行、撤销和重做。
 * 支持命令合并和最大历史栈长度限制。
 *
 * @example
 * ```ts
 * const manager = new CommandManager();
 *
 * // 执行命令
 * manager.execute(new AddComponentCommand(...));
 *
 * // 撤销
 * manager.undo();
 *
 * // 重做
 * manager.redo();
 *
 * // 检查状态
 * manager.canUndo;  // true/false
 * manager.canRedo;  // true/false
 * ```
 */
export class CommandManager {
  /** 命令历史栈 */
  private stack: Command[] = [];

  /** 当前指针位置（指向最后执行的命令） */
  private pointer = -1;

  /** 历史栈最大容量 */
  private maxStackSize: number;

  /** 命令合并策略 */
  private mergeStrategy: MergeStrategy;

  /** 合并时间窗口（ms），同一窗口内的相似命令会被合并 */
  private mergeWindow: number;

  /** 最后一次命令执行的时间戳 */
  private lastExecuteTime = 0;

  /** 事件总线实例 */
  private eventBus: EventBus;

  constructor(options?: {
    maxStackSize?: number;
    mergeStrategy?: MergeStrategy;
    mergeWindow?: number;
  }) {
    this.maxStackSize = options?.maxStackSize ?? 100;
    this.mergeStrategy = options?.mergeStrategy ?? defaultMergeStrategy;
    this.mergeWindow = options?.mergeWindow ?? 500; // 默认 500ms 合并窗口
    this.eventBus = EventBus.getInstance();
  }

  /** 是否可撤销 */
  get canUndo(): boolean {
    return this.pointer >= 0;
  }

  /** 是否可重做 */
  get canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  /** 当前历史栈大小 */
  get size(): number {
    return this.stack.length;
  }

  /** 当前指针位置 */
  get currentPointer(): number {
    return this.pointer;
  }

  /**
   * 执行命令并加入历史栈
   *
   * 如果当前指针不在栈顶，会先丢弃指针之后的历史。
   * 如果新命令与栈顶命令满足合并条件且在合并窗口内，则合并。
   *
   * @param command - 要执行的命令
   */
  execute(command: Command): void {
    // 执行命令
    command.execute();

    const now = Date.now();
    const timeSinceLastExecute = now - this.lastExecuteTime;

    // 尝试与栈顶命令合并
    const topCommand = this.pointer >= 0 ? this.stack[this.pointer] : null;
    if (
      topCommand &&
      this.mergeStrategy(topCommand, command) &&
      timeSinceLastExecute <= this.mergeWindow
    ) {
      // 合并：替换栈顶命令为合并后的命令
      this.stack[this.pointer] = this.mergeCommands(topCommand, command);
    } else {
      // 丢弃指针之后的历史
      this.stack = this.stack.slice(0, this.pointer + 1);

      // 加入新命令
      this.stack.push(command);

      // 超出最大容量，移除最早的命令
      if (this.stack.length > this.maxStackSize) {
        this.stack.shift();
      } else {
        this.pointer++;
      }
    }

    this.lastExecuteTime = now;

    this.eventBus.emit('history:push', { pointer: this.pointer });
  }

  /**
   * 撤销上一步操作
   * @returns 是否撤销成功
   */
  undo(): boolean {
    if (!this.canUndo) return false;

    this.stack[this.pointer].undo();
    this.pointer--;

    this.eventBus.emit('history:undo', { pointer: this.pointer });
    return true;
  }

  /**
   * 重做下一步操作
   * @returns 是否重做成功
   */
  redo(): boolean {
    if (!this.canRedo) return false;

    this.pointer++;
    this.stack[this.pointer].redo();

    this.eventBus.emit('history:redo', { pointer: this.pointer });
    return true;
  }

  /**
   * 清空历史栈
   */
  clear(): void {
    this.stack = [];
    this.pointer = -1;
    this.lastExecuteTime = 0;
  }

  /**
   * 销毁管理器，释放引用
   */
  destroy(): void {
    this.clear();
  }

  /**
   * 合并两个命令
   * 将 next 命令的效果叠加到 prev 上
   */
  private mergeCommands(prev: Command, next: Command): Command {
    const mergedType = prev.type;
    const mergedDesc = `${prev.description} + ${next.description}`;

    return {
      type: mergedType,
      description: mergedDesc,
      execute: () => {
        prev.execute();
        next.execute();
      },
      undo: () => {
        next.undo();
        prev.undo();
      },
      redo: () => {
        prev.redo();
        next.redo();
      },
    };
  }
}

// ===== 具体命令实现 =====

/**
 * 节点操作回调集合
 * 由 editorStore 注入，命令通过回调操作状态
 */
export interface NodeOperationCallbacks {
  addNode: (parentId: string | null, index: number, node: ComponentNode) => void;
  removeNode: (nodeId: string) => ComponentNode | undefined;
  moveNode: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  updateNodeProps: (nodeId: string, updates: Record<string, unknown>) => void;
  updateNodeStyles: (nodeId: string, updates: Record<string, unknown>) => void;
  getNode: (nodeId: string) => ComponentNode | undefined;
}

// ===== AddComponentCommand =====

/**
 * 添加组件命令
 */
export class AddComponentCommand implements Command {
  readonly type = 'add-component';
  readonly description: string;

  private callbacks: NodeOperationCallbacks;
  private parentId: string | null;
  private index: number;
  private node: ComponentNode;

  constructor(
    callbacks: NodeOperationCallbacks,
    parentId: string | null,
    index: number,
    node: ComponentNode,
  ) {
    this.callbacks = callbacks;
    this.parentId = parentId;
    this.index = index;
    this.node = node;
    this.description = `添加组件: ${node.type} (${node.id})`;
  }

  execute(): void {
    this.callbacks.addNode(this.parentId, this.index, this.node);
  }

  undo(): void {
    this.callbacks.removeNode(this.node.id);
  }

  redo(): void {
    this.execute();
  }
}

// ===== RemoveComponentCommand =====

/**
 * 删除组件命令
 */
export class RemoveComponentCommand implements Command {
  readonly type = 'remove-component';
  readonly description: string;

  private callbacks: NodeOperationCallbacks;
  private nodeId: string;

  /** 删除前的节点快照（用于恢复） */
  private snapshot: { node: ComponentNode; parentId: string | null; index: number } | null = null;

  constructor(callbacks: NodeOperationCallbacks, nodeId: string) {
    this.callbacks = callbacks;
    this.nodeId = nodeId;
    this.description = `删除组件: ${nodeId}`;
  }

  execute(): void {
    // 保存快照以便撤销恢复
    const node = this.callbacks.getNode(this.nodeId);
    if (node) {
      this.snapshot = {
        node: structuredClone(node),
        parentId: node.parentId,
        index: 0, // 精确索引需从父节点children计算，这里简化处理
      };
    }
    this.callbacks.removeNode(this.nodeId);
  }

  undo(): void {
    if (this.snapshot) {
      this.callbacks.addNode(
        this.snapshot.parentId,
        this.snapshot.index,
        structuredClone(this.snapshot.node),
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

// ===== MoveComponentCommand =====

/**
 * 移动组件命令
 */
export class MoveComponentCommand implements Command {
  readonly type = 'move-component';
  readonly description: string;

  private callbacks: NodeOperationCallbacks;
  private nodeId: string;
  private newParentId: string | null;
  private newIndex: number;

  /** 移动前的位置（用于撤销） */
  private oldParentId: string | null = null;
  private oldIndex: number = 0;

  constructor(
    callbacks: NodeOperationCallbacks,
    nodeId: string,
    newParentId: string | null,
    newIndex: number,
  ) {
    this.callbacks = callbacks;
    this.nodeId = nodeId;
    this.newParentId = newParentId;
    this.newIndex = newIndex;
    this.description = `移动组件: ${nodeId}`;
  }

  execute(): void {
    // 保存旧位置
    const node = this.callbacks.getNode(this.nodeId);
    if (node) {
      this.oldParentId = node.parentId;
    }
    this.callbacks.moveNode(this.nodeId, this.newParentId, this.newIndex);
  }

  undo(): void {
    this.callbacks.moveNode(this.nodeId, this.oldParentId, this.oldIndex);
  }

  redo(): void {
    this.execute();
  }
}

// ===== UpdatePropsCommand =====

/**
 * 更新组件属性命令
 * 支持命令合并（短时间内多次属性更新合并为一次）
 */
export class UpdatePropsCommand implements Command {
  readonly type = 'update-props';
  readonly description: string;

  private callbacks: NodeOperationCallbacks;
  private nodeId: string;
  private newProps: Record<string, unknown>;

  /** 旧属性快照（用于撤销） */
  private oldProps: Record<string, unknown> = {};

  constructor(
    callbacks: NodeOperationCallbacks,
    nodeId: string,
    newProps: Record<string, unknown>,
  ) {
    this.callbacks = callbacks;
    this.nodeId = nodeId;
    this.newProps = { ...newProps };
    this.description = `更新属性: ${nodeId}`;
  }

  execute(): void {
    // 保存旧属性值
    const node = this.callbacks.getNode(this.nodeId);
    if (node) {
      for (const key of Object.keys(this.newProps)) {
        if (key in node.props) {
          this.oldProps[key] = node.props[key];
        } else {
          this.oldProps[key] = undefined;
        }
      }
    }
    this.callbacks.updateNodeProps(this.nodeId, this.newProps);
  }

  undo(): void {
    this.callbacks.updateNodeProps(this.nodeId, this.oldProps);
  }

  redo(): void {
    this.execute();
  }
}

// ===== UpdateStylesCommand =====

/**
 * 更新组件样式命令
 * 支持命令合并（短时间内多次样式调整合并为一次）
 */
export class UpdateStylesCommand implements Command {
  readonly type = 'update-styles';
  readonly description: string;

  private callbacks: NodeOperationCallbacks;
  private nodeId: string;
  private newStyles: Record<string, unknown>;

  /** 旧样式快照（用于撤销） */
  private oldStyles: Record<string, unknown> = {};

  constructor(
    callbacks: NodeOperationCallbacks,
    nodeId: string,
    newStyles: Record<string, unknown>,
  ) {
    this.callbacks = callbacks;
    this.nodeId = nodeId;
    this.newStyles = { ...newStyles };
    this.description = `更新样式: ${nodeId}`;
  }

  execute(): void {
    // 保存旧样式值
    const node = this.callbacks.getNode(this.nodeId);
    if (node) {
      for (const key of Object.keys(this.newStyles)) {
        if (key in node.styles) {
          this.oldStyles[key] = node.styles[key];
        } else {
          this.oldStyles[key] = undefined;
        }
      }
    }
    this.callbacks.updateNodeStyles(this.nodeId, this.newStyles);
  }

  undo(): void {
    this.callbacks.updateNodeStyles(this.nodeId, this.oldStyles);
  }

  redo(): void {
    this.execute();
  }
}
