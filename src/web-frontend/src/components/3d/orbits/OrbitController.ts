/**
 * OrbitController - 环绕控制器核心类
 *
 * 无框架依赖，可直接用于任何 Three.js 场景。
 * 管理环绕动画的生命周期、模式切换、参数调节。
 *
 * @example
 * ```ts
 * const controller = new OrbitController(camera, controls);
 * controller.start(12000);
 * controller.setSpeed(1.5);
 * controller.setParams({ heightFactor: 2.0 });
 * controller.stop();
 * ```
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import TWEEN, { Tween, Easing } from '@tweenjs/tween.js';

import type {
  OrbitMode,
  OrbitContext,
  OrbitSnapshot,
  OrbitModeMeta,
  OrbitControllerEvents,
} from './types';

import { HemisphericalMode } from './modes/HemisphericalMode';
import { HorizontalMode } from './modes/HorizontalMode';
import { VerticalArcMode } from './modes/VerticalArcMode';
import { SpiralMode } from './modes/SpiralMode';
import { Figure8Mode } from './modes/Figure8Mode';

const DEFAULT_MODES: OrbitMode[] = [
  HemisphericalMode,
  HorizontalMode,
  VerticalArcMode,
  SpiralMode,
  Figure8Mode,
];

// ========== 控制器类 ==========

export class OrbitController {
  // 核心引用
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private center: THREE.Vector3;

  // 动画
  private tween: Tween<{ t: number }> | null = null;

  // 模式系统
  private modes: Map<string, OrbitMode> = new Map();
  private currentMode: OrbitMode;
  private params: Record<string, any> = {};

  // 状态
  private _speed: number = 1.0;
  private _active: boolean = false;
  private _cycleCount: number = 0;
  private _pauseSnapshot: OrbitSnapshot | null = null;
  private _baseContext: OrbitContext | null = null;
  
  // 中心偏移（不改变 controls.target，仅作用于环绕轨迹的垂直中心）
  private _centerYOffset: number = 0;
  
  // 控件状态保存/恢复（防止环绕期间用户交互干扰）
  private _savedEnabled: boolean = true;
  private _savedAutoRotate: boolean = false;

  // 调试计数器
  private _debugFrames: number = 0;

  // 事件
  private events: {
    onCycleStart: ((cycle: number) => void) | null;
    onCycleComplete: ((cycle: number) => void) | null;
    onPositionUpdate: ((snapshot: OrbitSnapshot) => void) | null;
    onStateChange: ((active: boolean) => void) | null;
  } = {
    onCycleStart: null,
    onCycleComplete: null,
    onPositionUpdate: null,
    onStateChange: null,
  };

  // ============ 构造 & 析构 ============

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    center?: THREE.Vector3
  ) {
    this.camera = camera;
    this.controls = controls;
    this.center = center?.clone() ?? controls.target.clone();

    // 注册内置模式
    for (const mode of DEFAULT_MODES) {
      this.modes.set(mode.meta.id, mode);
    }

    // 默认模式
    this.currentMode = HemisphericalMode;
    // 初始化默认参数
    this.resetParams();
  }

  /** 释放所有资源 */
  dispose(): void {
    this.stop();
    this.modes.clear();
    this._baseContext = null;
    this._pauseSnapshot = null;
    this.events.onCycleStart = null;
    this.events.onCycleComplete = null;
    this.events.onPositionUpdate = null;
    this.events.onStateChange = null;
  }

  // ============ 模式管理 ============

  /**
   * 切换环绕模式
   * @param modeOrId OrbitMode 实例或模式 ID
   * @returns 是否切换成功
   */
  setMode(modeOrId: OrbitMode | string): boolean {
    const mode = typeof modeOrId === 'string'
      ? this.modes.get(modeOrId) ?? null
      : modeOrId;

    if (!mode) {
      console.warn(`[OrbitController] 未找到模式: ${modeOrId}`);
      return false;
    }

    if (this.currentMode === mode) return true;

    // 如果正在运行，停止旧模式
    if (this._active) {
      this.currentMode.onEnd?.(this.buildContext(), this.getParamsForMode(this.currentMode));
    }

    this.currentMode = mode;
    // 重置参数到当前模式的默认值
    this.resetParams();
    console.log(`[OrbitController] 切换模式: ${mode.meta.id} (${mode.meta.name})`);

    return true;
  }

  /** 获取当前模式 */
  getCurrentMode(): OrbitMode {
    return this.currentMode;
  }

  /** 获取所有已注册模式的元数据（用于 UI 列表） */
  getAvailableModes(): OrbitModeMeta[] {
    return Array.from(this.modes.values()).map(m => m.meta);
  }

  /** 注册自定义模式 */
  registerMode(mode: OrbitMode): void {
    this.modes.set(mode.meta.id, mode);
    console.log(`[OrbitController] 注册新模式: ${mode.meta.id}`);
  }

  /** 注销模式 */
  unregisterMode(id: string): void {
    if (id === 'hemispherical') {
      console.warn('[OrbitController] 不能注销默认全景模式');
      return;
    }
    this.modes.delete(id);
    // 如果当前模式被注销，切回默认
    if (this.currentMode.meta.id === id) {
      this.setMode('hemispherical');
    }
  }

  // ============ 参数管理 ============

  /**
   * 更新当前模式的参数
   * 不影响其他模式（所有模式参数共存，切换时保留）
   */
  setParams(params: Partial<Record<string, any>>): void {
    const modeParams = this.getParamsForMode(this.currentMode);

    // 只合并有效的参数 key
    const validKeys = this.currentMode.meta.params.map(p => p.key);
    for (const key of Object.keys(params)) {
      if (!validKeys.includes(key)) {
        console.warn(`[OrbitController] 忽略未知参数: ${key} (模式: ${this.currentMode.meta.id})`);
        continue;
      }
      (modeParams as any)[key] = params[key];
    }

    this.params = { ...this.params, [this.currentMode.meta.id]: modeParams };

    // 如果正在运行，重启以应用新参数
    if (this._active && this._baseContext) {
      this.restartAnimation();
    }
  }

  /** 获取当前模式的参数 */
  getParams(): Record<string, any> {
    return { ...this.getParamsForMode(this.currentMode) };
  }

  /**
   * 获取所有模式的参数（用于持久化）
   * 结构: { 'hemispherical': {...}, 'horizontal': {...} }
   */
  getAllParams(): Record<string, Record<string, any>> {
    return Object.fromEntries(
      Array.from(this.modes.keys()).map(id => [id, { ...this.getParamsForMode(this.modes.get(id)!)}])
    );
  }

  /**
   * 批量设置所有模式的参数（用于从持久化恢复）
   */
  setAllParams(modeParams: Record<string, Record<string, any>>): void {
    for (const [modeId, params] of Object.entries(modeParams)) {
      const mode = this.modes.get(modeId);
      if (mode) {
        // 只保留有效参数
        const validKeys = mode.meta.params.map(p => p.key);
        const filteredParams: Record<string, any> = {};
        for (const key of validKeys) {
          if (key in params) {
            filteredParams[key] = params[key];
          }
        }
        (this.params as any)[modeId] = filteredParams;
      }
    }
  }

  /** 重置当前模式参数为默认值 */
  resetParams(): void {
    const defaults: Record<string, any> = {};
    for (const param of this.currentMode.meta.params) {
      defaults[param.key] = param.defaultValue;
    }
    this.params = { ...this.params, [this.currentMode.meta.id]: defaults };
  }

  /** 获取指定模式的参数 */
  private getParamsForMode(mode: OrbitMode): Record<string, any> {
    const stored = (this.params as any)[mode.meta.id];
    if (stored) return stored;

    // 如果无存储，返回默认值
    const defaults: Record<string, any> = {};
    for (const param of mode.meta.params) {
      defaults[param.key] = param.defaultValue;
    }
    return defaults;
  }

  // ============ 启停控制 ============

  /**
   * 启动环绕动画
   * @param duration 周期毫秒（默认 12000）
   */
  start(duration?: number): void {
    if (!this.camera || !this.controls) {
      console.warn('[OrbitController] 相机或控制器未就绪');
      return;
    }
  
    this.stop();
  
    // ★ 关键修复：环绕期间禁用 OrbitControls，防止用户交互干扰镜头轨迹
    this._savedEnabled = this.controls.enabled;
    this._savedAutoRotate = this.controls.autoRotate;
    this.controls.enabled = false;
    this.controls.autoRotate = false;
  
    // 保存当前相机状态作为上下文
    this._baseContext = this.buildContext();
  
    // 调用模式的 onStart
    this.currentMode.onStart?.(this._baseContext, this.getParamsForMode(this.currentMode));
  
    // 创建 Tween 动画
    const totalDuration = this.calcDuration(duration);
    this._cycleCount = 0;
  
    this.createTween(totalDuration);
    this._active = true;
    this.emitStateChange(true);
    this.emitCycleStart(0);
  
    console.log(`[OrbitController] 启动 ${this.currentMode.meta.name}: 周期=${totalDuration}ms, 速度=${this._speed}x`);
  }

  /** 立即停止环绕 */
  stop(): void {
    // ★ 无论 tween 是否存在，都要执行停止逻辑（防止周期间隙调用无效）
    if (this.tween) {
      this.tween.stop();
      this.tween.remove();  // ★ 从全局 TWEEN 组移除，防止死 tween 堆积
      this.tween = null;
    }

    if (this._active) {
      this.currentMode.onEnd?.(this._baseContext!, this.getParamsForMode(this.currentMode));

      this._active = false;
      this._pauseSnapshot = null;

      // ★ 关键修复：恢复 OrbitControls 状态
      this.controls.enabled = this._savedEnabled;
      this.controls.autoRotate = this._savedAutoRotate;

      this.emitStateChange(false);
      // 🐛 诊断：输出调用栈，定位谁在 stop
      console.log('[OrbitController] 已停止', new Error().stack?.split('\n').slice(2, 5).join(' | '));
    }
  }

  /** 暂停（在当前位置暂停） */
  pause(): void {
    if (!this._active || !this.tween) return;

    this.tween.stop();
    this.tween.remove();  // ★ 从全局 TWEEN 组移除，防止死 tween 堆积
    this.tween = null;

    // 保存当前位置
    this._pauseSnapshot = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };

    this._active = false;
    this.emitStateChange(false);
    console.log('[OrbitController] 已暂停');
  }

  /** 从暂停位置恢复 */
  resume(): void {
    if (this._active || !this._pauseSnapshot) return;

    if (this._baseContext) {
      this.currentMode.onStart?.(this._baseContext, this.getParamsForMode(this.currentMode));
    }

    const totalDuration = this._baseContext
      ? this.calcDuration(undefined)
      : 12000;

    this.createTween(totalDuration);
    this._active = true;
    this.emitStateChange(true);
    console.log('[OrbitController] 已恢复');
  }

  // ============ 速度控制 ============

  /**
   * 设置速度倍率
   * @param speed 0.5 ~ 3.0
   */
  setSpeed(speed: number): void {
    const clamped = Math.max(0.5, Math.min(3.0, speed));
    if (Math.abs(clamped - this._speed) < 0.01) return;

    this._speed = clamped;

    // 如果正在运行，重启以应用新速度
    if (this._active) {
      this.restartAnimation();
    }

    console.log(`[OrbitController] 速度: ${this._speed.toFixed(1)}x`);
  }

  /** 获取速度倍率 */
  getSpeed(): number {
    return this._speed;
  }

  // ============ 状态查询 ============

  /** 是否正在运行 */
  get isActive(): boolean {
    return this._active;
  }

  /** 当前周期数 */
  get currentCycle(): number {
    return this._cycleCount;
  }

  /** 获取暂停时的快照 */
  get pauseSnapshot(): OrbitSnapshot | null {
    return this._pauseSnapshot;
  }

  /** 更新环绕中心点 */
  setCenter(center: THREE.Vector3): void {
    this.center.copy(center);
    if (this._baseContext) {
      this._baseContext.center.copy(center);
    }
  }
  
  /**
   * 设置环绕中心的垂直偏移量（Y轴方向）
   * 正值抬高轨道中心，负值降低轨道中心
   * 不影响 controls.target，只影响环绕轨迹计算
   */
  setCenterOffset(offset: number): void {
    if (Math.abs(offset - this._centerYOffset) < 0.001) return;
    this._centerYOffset = offset;
    // 如果正在运行，重建上下文使偏移生效
    if (this._active) {
      this.restartAnimation();
    }
  }
  
  /** 获取当前中心偏移 */
  getCenterOffset(): number {
    return this._centerYOffset;
  }

  // ============ 事件 ============

  setEvent<K extends keyof OrbitControllerEvents>(
    event: K,
    handler: OrbitControllerEvents[K]
  ): void {
    (this.events as any)[event] = handler;
  }

  clearEvent<K extends keyof OrbitControllerEvents>(event: K): void {
    (this.events as any)[event] = null;
  }

  // ============ 内部方法 ============

  /** 构建当前环绕上下文 */
  private buildContext(): OrbitContext {
    // ★ 关键修复：同步中心点到当前 controls.target，防止智能居中后中心点过期
    this.center.copy(this.controls.target);
    // 应用垂直偏移（不改变 controls.target，仅调整轨道中心）
    this.center.y += this._centerYOffset;
      
    const startPos = this.camera.position.clone();
    const baseDist = startPos.distanceTo(this.center);
    const startAngle = Math.atan2(
      startPos.x - this.center.x,
      startPos.z - this.center.z
    );
  
    return {
      camera: this.camera,
      controls: this.controls,
      center: this.center.clone(),
      baseDistance: baseDist < 0.01 ? 5 : baseDist,
      baseHeight: startPos.y,
      startAngle,
    };
  }

  /** 计算实际周期（速度倍率影响）
   * @param explicitDuration 外部传入的显式周期（已是最终值，不再除以 speed）
   * 当无参数时使用默认 12000ms / speed
   */
  private calcDuration(explicitDuration?: number): number {
    // ★ 有显式 duration 时不作用 speed（外部已计算好最终值）
    if (explicitDuration !== undefined) return Math.round(explicitDuration);
    return Math.round(12000 / this._speed);
  }

  /** 创建并启动 Tween 动画 */
  private createTween(duration: number): void {
    const ctx = this._baseContext!;
    const mode = this.currentMode;
    const modeParams = this.getParamsForMode(mode);

    this.tween = new Tween({ t: 0 })
      .to({ t: 1 }, duration)
      .easing(Easing.Linear.None)
      .onUpdate(({ t }) => {
        const snapshot = mode.getPosition(t, ctx, modeParams);

        // 更新相机位置
        this.camera.position.copy(snapshot.position);
        this.controls.target.copy(snapshot.target);
        this.controls.update();
        this.camera.updateProjectionMatrix();

        // ★ 调试日志：前10帧输出相机位置变化
        if (this._debugFrames < 10) {
          console.log(`[OrbitController] 🎯 t=${t.toFixed(3)} pos=(${snapshot.position.x.toFixed(2)},${snapshot.position.y.toFixed(2)},${snapshot.position.z.toFixed(2)}) target=(${snapshot.target.x.toFixed(2)},${snapshot.target.y.toFixed(2)},${snapshot.target.z.toFixed(2)})`);
          this._debugFrames++;
        }
        if (this._debugFrames === 10) {
          console.log('[OrbitController] ✅ 环绕已正常运行（后续日志已抑制）');
          this._debugFrames++;
        }

        // 位置事件
        this.events.onPositionUpdate?.(snapshot);
      })
      .onComplete(() => {
        // ★ 从全局 TWEEN 组移除已完成的 tween，防止堆积
        const completedTween = this.tween;
        this.tween = null;
        completedTween?.remove();

        // 周期完成事件
        this._cycleCount++;
        this.events.onCycleComplete?.(this._cycleCount);

        // 如果仍然激活，自动重启下一周期
        if (this._active) {
          this._pauseSnapshot = null;
          this.emitCycleStart(this._cycleCount + 1);
          this.createTween(duration);
        }
      })
      .start();

    // ★ 关键修复：将 tween 注册到全局 TWEEN 组，确保每帧的 TWEEN.update() 能推进动画
    // @tweenjs/tween.js v25 中 new Tween(obj) 不传入 group 不会自动加入任何组
    TWEEN.add(this.tween);
  }

  /** 重启动画（参数/速度/模型变化时，以当前相机位置重建上下文） */
  restartAnimation(): void {
    this.stop();
    this._active = true;
    this.start(this.calcDuration());
  }

  /**
   * 重建环绕上下文（模型切换或外部改变相机位置后调用）
   * 确保环绕轨迹与新相机位置同步
   */
  refreshContext(): void {
    if (!this._active) return;
    this.restartAnimation();
  }

  private emitStateChange(active: boolean): void {
    this.events.onStateChange?.(active);
  }

  private emitCycleStart(cycle: number): void {
    this.events.onCycleStart?.(cycle);
  }
}
