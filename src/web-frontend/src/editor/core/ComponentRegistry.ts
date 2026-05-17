/**
 * 升级版组件注册表 - 插件化组件管理
 * Component Registry - Plugin-based Component Management
 *
 * 基于 Map 存储的组件插件注册表，提供：
 * - 注册/注销/查询组件插件
 * - 分类筛选
 * - 版本冲突检测
 * - 依赖加载
 * - 与原有 ComponentRegistry 的桥接兼容
 *
 * 与原有 core/template/ComponentRegistry.tsx 的区别：
 * - 原版仅支持懒加载注册，无分类/版本/依赖概念
 * - 升级版基于 IComponentPlugin 接口，支持完整插件生命周期
 */
import type {
  IComponentPlugin,
  ComponentCategory,
} from '../types/plugin';
import { EventBus } from './EventBus';

// ===== 注册表事件 =====

/** 注册表事件映射（扩展到 EditorEventMap 的补充） */
export interface RegistryEventMap {
  'registry:registered': { pluginId: string };
  'registry:unregistered': { pluginId: string };
  'registry:version-conflict': { pluginId: string; existingVersion: string; newVersion: string };
  'registry:dependency-missing': { pluginId: string; missingDependencies: string[] };
}

// ===== 注册表条目 =====

/**
 * 注册表条目
 * 包装 IComponentPlugin 并增加注册元数据
 */
interface RegistryEntry {
  /** 插件定义 */
  plugin: IComponentPlugin;
  /** 注册时间戳 */
  registeredAt: number;
  /** 是否已加载完成（含依赖） */
  loaded: boolean;
}

// ===== 版本工具 =====

/**
 * 简单的语义版本比较
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareSemver(a: string, b: string): number {
  const parseVersion = (v: string) =>
    v.replace(/^v/, '').split('.').map(Number);

  const partsA = parseVersion(a);
  const partsB = parseVersion(b);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

// ===== ComponentRegistry 实现 =====

/**
 * ComponentRegistry - 升级版组件注册表
 *
 * 管理搭建器中所有可用的组件插件。
 * 每个组件通过 IComponentPlugin 接口注册，支持分类、版本和依赖管理。
 *
 * @example
 * ```ts
 * const registry = ComponentRegistry.getInstance();
 *
 * // 注册插件
 * registry.register(myPlugin);
 *
 * // 按分类查询
 * const layoutPlugins = registry.getByCategory('layout');
 *
 * // 获取特定插件
 * const plugin = registry.get('my-company.hero-carousel');
 *
 * // 注销插件
 * registry.unregister('my-company.hero-carousel');
 * ```
 */
export class ComponentRegistry {
  /** 插件存储：pluginId → RegistryEntry */
  private plugins = new Map<string, RegistryEntry>();

  /** 分类索引：category → Set<pluginId> */
  private categoryIndex = new Map<string, Set<string>>();

  /** 单例实例 */
  private static instance: ComponentRegistry | null = null;

  /** 事件总线 */
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * 获取 ComponentRegistry 单例
   */
  static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  /**
   * 重置单例（测试用）
   */
  static resetInstance(): void {
    if (ComponentRegistry.instance) {
      ComponentRegistry.instance.clear();
      ComponentRegistry.instance = null;
    }
  }

  // ===== 注册/注销 =====

  /**
   * 注册组件插件
   *
   * 如果已存在同ID插件：
   * - 版本更高：覆盖注册（发出 version-conflict 事件）
   * - 版本相同或更低：拒绝注册
   *
   * @param plugin - 组件插件定义
   * @returns 是否注册成功
   */
  register(plugin: IComponentPlugin): boolean {
    const existing = this.plugins.get(plugin.id);

    if (existing) {
      const comparison = compareSemver(plugin.version, existing.plugin.version);
      if (comparison <= 0) {
        // 新版本不高于已有版本，拒绝注册
        this.eventBus.emit('plugin:registered', { pluginId: plugin.id });
        return false;
      }

      // 新版本更高，覆盖注册
      this.eventBus.emit('plugin:registered', { pluginId: plugin.id });
      // 这里不使用 emit 的 version-conflict 事件（不在 EditorEventMap 中），
      // 但通过 console.warn 提示开发者
      console.warn(
        `[ComponentRegistry] 版本冲突: ${plugin.id} 已有 v${existing.plugin.version}, ` +
        `新注册 v${plugin.version} 将覆盖。`,
      );
    }

    // 添加到主存储
    this.plugins.set(plugin.id, {
      plugin,
      registeredAt: Date.now(),
      loaded: false,
    });

    // 更新分类索引
    const categoryKey = plugin.category;
    if (!this.categoryIndex.has(categoryKey)) {
      this.categoryIndex.set(categoryKey, new Set());
    }
    this.categoryIndex.get(categoryKey)!.add(plugin.id);

    // 检查依赖
    this.checkDependencies(plugin);

    // 标记为已加载
    const entry = this.plugins.get(plugin.id)!;
    entry.loaded = true;

    this.eventBus.emit('plugin:registered', { pluginId: plugin.id });
    return true;
  }

  /**
   * 批量注册组件插件
   *
   * @param plugins - 插件定义数组
   * @returns 每个插件的注册结果
   */
  registerAll(plugins: IComponentPlugin[]): boolean[] {
    return plugins.map((plugin) => this.register(plugin));
  }

  /**
   * 注销组件插件
   *
   * @param pluginId - 插件ID
   * @returns 是否注销成功
   */
  unregister(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) return false;

    // 从分类索引移除
    const categorySet = this.categoryIndex.get(entry.plugin.category);
    if (categorySet) {
      categorySet.delete(pluginId);
      if (categorySet.size === 0) {
        this.categoryIndex.delete(entry.plugin.category);
      }
    }

    // 从主存储移除
    this.plugins.delete(pluginId);

    this.eventBus.emit('plugin:unregistered', { pluginId });
    return true;
  }

  // ===== 查询 =====

  /**
   * 获取指定插件
   */
  get(pluginId: string): IComponentPlugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  /**
   * 检查插件是否已注册
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 获取所有已注册插件
   */
  getAll(): IComponentPlugin[] {
    return Array.from(this.plugins.values()).map((entry) => entry.plugin);
  }

  /**
   * 获取所有已注册插件的ID
   */
  getAllIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * 按分类获取插件列表
   */
  getByCategory(category: ComponentCategory): IComponentPlugin[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) return [];

    return Array.from(ids)
      .map((id) => this.plugins.get(id)?.plugin)
      .filter((p): p is IComponentPlugin => p !== undefined);
  }

  /**
   * 获取所有分类及其插件数量
   */
  getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [category, ids] of this.categoryIndex) {
      counts[category] = ids.size;
    }
    return counts;
  }

  /**
   * 搜索插件（按名称或描述模糊匹配）
   */
  search(query: string): IComponentPlugin[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(lowerQuery) ||
        (plugin.description?.toLowerCase().includes(lowerQuery) ?? false) ||
        plugin.id.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * 获取已注册插件总数
   */
  get size(): number {
    return this.plugins.size;
  }

  // ===== 依赖管理 =====

  /**
   * 检查插件依赖是否满足
   * 缺少的依赖会在控制台输出警告
   */
  private checkDependencies(plugin: IComponentPlugin): void {
    const deps = plugin.dependencies?.components;
    if (!deps || deps.length === 0) return;

    const missing = deps.filter((depId) => !this.plugins.has(depId));
    if (missing.length > 0) {
      console.warn(
        `[ComponentRegistry] 插件 "${plugin.id}" 缺少依赖: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * 获取指定插件的缺失依赖列表
   */
  getMissingDependencies(pluginId: string): string[] {
    const plugin = this.plugins.get(pluginId)?.plugin;
    if (!plugin?.dependencies?.components) return [];

    return plugin.dependencies.components.filter(
      (depId) => !this.plugins.has(depId),
    );
  }

  /**
   * 检查指定插件的所有依赖是否已满足
   */
  areDependenciesSatisfied(pluginId: string): boolean {
    return this.getMissingDependencies(pluginId).length === 0;
  }

  // ===== 子组件约束 =====

  /**
   * 检查父组件是否允许接收指定类型的子组件
   *
   * @param parentPluginId - 父组件插件ID
   * @param childPluginId - 子组件插件ID
   * @returns 是否允许
   */
  isChildAllowed(parentPluginId: string, childPluginId: string): boolean {
    const parent = this.get(parentPluginId);
    if (!parent) return false;

    // 不允许子组件
    if (parent.allowChildren === false) return false;

    // 未指定白名单 = 允许所有
    if (!parent.allowedChildTypes || parent.allowedChildTypes.length === 0) {
      return true;
    }

    return parent.allowedChildTypes.includes(childPluginId);
  }

  /**
   * 检查父组件是否还能接收更多子组件
   *
   * @param parentPluginId - 父组件插件ID
   * @param currentChildCount - 当前子节点数量
   */
  canAcceptMoreChildren(parentPluginId: string, currentChildCount: number): boolean {
    const parent = this.get(parentPluginId);
    if (!parent) return false;

    if (parent.allowChildren === false) return false;
    if (parent.maxChildren !== undefined && currentChildCount >= parent.maxChildren) {
      return false;
    }

    return true;
  }

  // ===== 生命周期 =====

  /**
   * 清除所有已注册的插件
   */
  clear(): void {
    this.plugins.clear();
    this.categoryIndex.clear();
  }

  /**
   * 销毁注册表
   */
  destroy(): void {
    this.clear();
  }
}
