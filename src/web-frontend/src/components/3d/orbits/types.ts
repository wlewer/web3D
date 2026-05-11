/**
 * OrbitController - 环绕引擎核心类型定义
 *
 * 定义 OrbitMode 接口、参数定义、上下文、事件等公共类型
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ========== 运行时快照 ==========

/** 每帧输出的环绕位置快照 */
export interface OrbitSnapshot {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

// ========== 环绕上下文 ==========

/** 传递给每个 OrbitMode 的运行时上下文信息 */
export interface OrbitContext {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  center: THREE.Vector3;       // 模型中心
  baseDistance: number;        // 起始距离
  baseHeight: number;          // 起始高度
  startAngle: number;          // 起始水平角
}

// ========== 参数定义 ==========

/** 参数定义——用于运行时 UI 动态生成调节控件 */
export interface OrbitParamDef {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select' | 'range';
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
}

// ========== 模式元数据 ==========

export type OrbitModeCategory = 'horizontal' | 'vertical' | 'hemispherical' | 'spiral' | 'custom';

export interface OrbitModeMeta {
  id: string;                    // 唯一标识，如 'hemispherical'
  name: string;                  // 显示名称，如 '全景展示'
  description: string;
  category: OrbitModeCategory;
  params: OrbitParamDef[];       // 可调节参数列表
}

// ========== 轨道模式接口 ==========

/**
 * 轨道模式接口（插件式扩展）
 * 实现此接口即可注册为新的环绕模式
 */
export interface OrbitMode {
  readonly meta: OrbitModeMeta;

  /**
   * 核心方法：根据 t [0,1] 计算相机位置
   * @param t 动画进度 0→1
   * @param ctx 环绕上下文
   * @param params 当前模式参数
   */
  getPosition(t: number, ctx: OrbitContext, params: Record<string, any>): OrbitSnapshot;

  /** 可选：模式启动时调用 */
  onStart?(ctx: OrbitContext, params: Record<string, any>): void;

  /** 可选：模式结束时调用 */
  onEnd?(ctx: OrbitContext, params: Record<string, any>): void;
}

// ========== 预设配置 ==========

export interface OrbitPreset {
  id: string;
  name: string;
  description: string;
  modeId: string;
  params: Record<string, any>;
  duration: number;
  tags: string[];    // 如 ['product', 'portrait', 'architecture']
}

// ========== 控制器事件 ==========

export interface OrbitControllerEvents {
  onCycleStart: (cycle: number) => void;
  onCycleComplete: (cycle: number) => void;
  onPositionUpdate: (snapshot: OrbitSnapshot) => void;
  onStateChange: (active: boolean) => void;
}

// ========== 持久化 ==========

export interface OrbitPreferences {
  global: {
    mode: string;
    speed: number;
    duration: number;
    params: Record<string, any>;
  };
  [modelKey: string]: {
    mode: string;
    speed: number;
    duration: number;
    params: Record<string, any>;
  };
}
