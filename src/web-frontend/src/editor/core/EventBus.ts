/**
 * 事件总线 - 发布/订阅模式
 * Event Bus - Publish/Subscribe Pattern
 *
 * 提供类型安全的事件通信机制，支持：
 * - 类型安全的事件定义与派发
 * - 一次性监听（once）
 * - 优先级排序
 * - 命名空间隔离
 */

// ===== 事件类型映射 =====

/**
 * EditorEventMap - 编辑器事件类型映射表
 *
 * 所有编辑器事件在此声明，键为事件名，值为事件载荷类型。
 * 添加新事件只需在此映射表中增加条目即可获得类型安全。
 */
export interface EditorEventMap {
  // 节点操作事件
  'node:added': { nodeId: string; parentId: string | null; index: number };
  'node:removed': { nodeId: string; parentId: string | null };
  'node:moved': { nodeId: string; oldParentId: string | null; newParentId: string | null; oldIndex: number; newIndex: number };
  'node:updated': { nodeId: string; updates: Record<string, unknown> };

  // 选中事件
  'selection:changed': { selectedIds: string[] };
  'selection:hover': { nodeId: string | null };

  // 画布事件
  'canvas:zoom': { zoom: number };
  'canvas:scroll': { offsetX: number; offsetY: number };
  'canvas:device-changed': { device: string };

  // 历史事件
  'history:undo': { pointer: number };
  'history:redo': { pointer: number };
  'history:push': { pointer: number };

  // 拖拽事件
  'drag:start': { nodeId?: string; componentType?: string };
  'drag:move': { x: number; y: number };
  'drag:end': { dropped: boolean };
  'drag:drop': { targetId: string | null; index: number };

  // 插件事件
  'plugin:registered': { pluginId: string };
  'plugin:unregistered': { pluginId: string };

  // 全局事件
  'editor:ready': void;
  'editor:destroy': void;
  'page:saved': { pageId: string };
  'page:loaded': { pageId: string };
}

// ===== 事件处理器 =====

/**
 * 事件处理器
 * 支持优先级和一次性标记
 */
export interface EventHandler<T = unknown> {
  /** 处理器回调函数 */
  callback: (payload: T) => void;
  /** 优先级（数值越小越先执行，默认 0） */
  priority: number;
  /** 是否为一次性监听（触发后自动移除） */
  once: boolean;
}

// ===== 事件总线实现 =====

/**
 * EventBus - 编辑器事件总线
 *
 * 单例模式，提供全局事件通信能力。
 * 所有事件名称和载荷类型通过 EditorEventMap 约束。
 *
 * @example
 * ```ts
 * const bus = EventBus.getInstance();
 *
 * // 监听事件
 * bus.on('node:added', (payload) => {
 *   console.log('新增节点:', payload.nodeId);
 * });
 *
 * // 一次性监听
 * bus.once('editor:ready', () => {
 *   console.log('编辑器已就绪');
 * });
 *
 * // 带优先级监听
 * bus.on('selection:changed', handler, { priority: -100 });
 *
 * // 派发事件
 * bus.emit('node:added', { nodeId: 'abc', parentId: 'root', index: 0 });
 * ```
 */
export class EventBus {
  /** 事件处理器存储：eventName → sorted handler list */
  private handlers = new Map<string, EventHandler[]>();

  /** 单例实例 */
  private static instance: EventBus | null = null;

  private constructor() {
    // 私有构造，强制使用 getInstance
  }

  /**
   * 获取 EventBus 单例
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * 重置单例（测试用）
   */
  static resetInstance(): void {
    if (EventBus.instance) {
      EventBus.instance.clear();
      EventBus.instance = null;
    }
  }

  /**
   * 订阅事件
   *
   * @param event - 事件名称（受 EditorEventMap 约束）
   * @param callback - 事件回调
   * @param options - 订阅选项（优先级、是否一次性）
   * @returns 取消订阅的函数
   */
  on<K extends keyof EditorEventMap>(
    event: K,
    callback: (payload: EditorEventMap[K]) => void,
    options?: { priority?: number; once?: boolean },
  ): () => void {
    return this.addListener(event, callback, {
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
    });
  }

  /**
   * 一次性订阅事件
   * 触发一次后自动移除
   *
   * @param event - 事件名称
   * @param callback - 事件回调
   * @param options - 订阅选项（优先级）
   * @returns 取消订阅的函数
   */
  once<K extends keyof EditorEventMap>(
    event: K,
    callback: (payload: EditorEventMap[K]) => void,
    options?: { priority?: number },
  ): () => void {
    return this.addListener(event, callback, {
      priority: options?.priority ?? 0,
      once: true,
    });
  }

  /**
   * 取消订阅指定事件的所有处理器
   *
   * @param event - 事件名称
   */
  off<K extends keyof EditorEventMap>(event: K): void;

  /**
   * 取消订阅指定事件的特定回调
   *
   * @param event - 事件名称
   * @param callback - 要移除的回调函数引用
   */
  off<K extends keyof EditorEventMap>(
    event: K,
    callback: (payload: EditorEventMap[K]) => void,
  ): void;

  off<K extends keyof EditorEventMap>(
    event: K,
    callback?: (payload: EditorEventMap[K]) => void,
  ): void {
    if (!callback) {
      // 移除该事件的所有处理器
      this.handlers.delete(event as string);
      return;
    }

    const list = this.handlers.get(event as string);
    if (!list) return;

    const filtered = list.filter((h) => h.callback !== callback);
    if (filtered.length === 0) {
      this.handlers.delete(event as string);
    } else {
      this.handlers.set(event as string, filtered);
    }
  }

  /**
   * 派发事件
   *
   * 按优先级顺序调用所有处理器。
   * 如果处理器回调抛出异常，会捕获并输出警告，不影响后续处理器执行。
   *
   * @param event - 事件名称
   * @param payload - 事件载荷数据
   */
  emit<K extends keyof EditorEventMap>(
    event: K,
    ...args: EditorEventMap[K] extends void ? [] : [EditorEventMap[K]]
  ): void {
    const list = this.handlers.get(event as string);
    if (!list || list.length === 0) return;

    const payload = args[0] as EditorEventMap[K];

    // 收集需要移除的一次性处理器
    const toRemove: EventHandler[] = [];

    for (const handler of list) {
      try {
        handler.callback(payload);
      } catch (error) {
        console.warn(
          `[EventBus] Error in handler for "${String(event)}":`,
          error,
        );
      }

      if (handler.once) {
        toRemove.push(handler);
      }
    }

    // 移除已触发的一次性处理器
    if (toRemove.length > 0) {
      const remaining = list.filter((h) => !toRemove.includes(h));
      if (remaining.length === 0) {
        this.handlers.delete(event as string);
      } else {
        this.handlers.set(event as string, remaining);
      }
    }
  }

  /**
   * 检查指定事件是否有监听器
   */
  hasListeners<K extends keyof EditorEventMap>(event: K): boolean {
    const list = this.handlers.get(event as string);
    return !!list && list.length > 0;
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount<K extends keyof EditorEventMap>(event: K): number {
    return this.handlers.get(event as string)?.length ?? 0;
  }

  /**
   * 清除所有事件监听器
   */
  clear(): void {
    this.handlers.clear();
  }

  // ===== 内部方法 =====

  /**
   * 添加监听器（内部实现）
   */
  private addListener<K extends keyof EditorEventMap>(
    event: K,
    callback: (payload: EditorEventMap[K]) => void,
    options: { priority: number; once: boolean },
  ): () => void {
    const handler: EventHandler<EditorEventMap[K]> = {
      callback,
      priority: options.priority,
      once: options.once,
    };

    const key = event as string;
    const list = this.handlers.get(key) ?? [];

    // 插入并按优先级排序（数值越小越先执行）
    list.push(handler as EventHandler);
    list.sort((a, b) => a.priority - b.priority);

    this.handlers.set(key, list);

    // 返回取消订阅函数
    return () => {
      this.off(event, callback);
    };
  }
}
