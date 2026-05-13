/**
 * 渲染参数配置 - RenderConfig
 *
 * 统一描述首页3D模型渲染的全局默认值 + 单模型覆盖参数。
 * 全局默认值存于 backend `homepage_settings` (key='render_defaults')。
 * 单模型覆盖存于 `Model3D.metadata_json.renderConfig`。
 *
 * 合并优先级（逐层覆盖）：
 *   组件硬编码默认值 → 全局默认配置 → 单模型覆盖配置
 *
 * @version 1.0.0
 */

// ==================== 相机 ====================

export interface CameraConfigParams {
  /** 视野角度 (10-90, 默认 50) */
  fov?: number;
  /** 自动旋转 (默认 true) */
  autoRotate?: boolean;
  /** 旋转速度倍率 (0.2-5.0, 默认 1.0) */
  autoRotateSpeed?: number;
  /** 相机距离倍率 (1.0-6.0, 默认 2.5) */
  margin?: number;
  /** 智能居中 (默认 true) */
  autoCenter?: boolean;

  // === 高级 / 精确控制 ===
  /** 精确相机位置 [x, y, z] (覆盖 smart fit) */
  position?: [number, number, number];
  /** 观察点 [x, y, z] */
  target?: [number, number, number];
  /** 缩放级别 */
  zoom?: number;
}

// ==================== 环绕 ====================

export interface OrbitConfigParams {
  /** 启用高级环绕 (替代 autoRotate) */
  enabled?: boolean;
  /** 内置预设 ID (如 'full-showcase', 'quick-spin' 等 8 种) */
  presetId?: string;
  /** 环绕周期毫秒 (默认 12000) */
  duration?: number;
  /** 速度倍率 (0.5-3.0, 默认 1.0) */
  speed?: number;
  /** 环绕中心垂直偏移 (-2.0 - 2.0, 默认 0) */
  centerYOffset?: number;
  /** 进阶: 直接传递模式参数 (预留扩展) */
  modeParams?: Record<string, any>;
}

// ==================== 装饰 ====================

export interface DecorationConfigParams {
  /** 粒子背景 (默认 true on featured) */
  showParticles?: boolean;
  /** 粒子大小 (0.05-2.0, 默认 0.3) */
  particleSize?: number;
  /** 展示台 (默认 true on featured) */
  showPlatform?: boolean;
  /** 产品标签 (默认 false) */
  showLabels?: boolean;
  /** 标签显示数量 (2 或 3，默认 3) */
  labelCount?: number;
  /** 语言 */
  language?: 'zh-CN' | 'en-US';
}

// ==================== 视觉 ====================

export interface VisualConfigParams {
  /** 背景色 hex (默认 '#0a0a0f') */
  backgroundColor?: string;
  /** 标题叠加层 (默认 true) */
  showTitle?: boolean;
  /** 统计信息 (默认 true) */
  showStats?: boolean;
}

// ==================== 完整 RenderConfig ====================

export interface RenderConfig {
  /** 配置格式版本号 (方便未来升级) */
  version?: number;
  /** 相机配置 */
  camera?: CameraConfigParams;
  /** 环绕配置 */
  orbit?: OrbitConfigParams;
  /** 装饰配置 */
  decorations?: DecorationConfigParams;
  /** 视觉配置 */
  visual?: VisualConfigParams;
}

// ==================== 组件默认值 ====================

export const DEFAULT_RENDER_CONFIG: Required<RenderConfig> = {
  version: 1,
  camera: {
    fov: 50,
    autoRotate: true,
    autoRotateSpeed: 1.0,
    margin: 2.5,
    autoCenter: true,
  },
  orbit: {
    enabled: false,
    presetId: 'full-showcase',
    duration: 12000,
    speed: 1.0,
    centerYOffset: 0,
    modeParams: {},
  },
  decorations: {
    showParticles: true,
    particleSize: 0.3,
    showPlatform: true,
    showLabels: false,
    labelCount: 3,
    language: 'zh-CN',
  },
  visual: {
    backgroundColor: '#0a0a0f',
    showTitle: true,
    showStats: true,
  },
};

// ==================== 合并工具 ====================

/**
 * 深度合并两个对象（仅合并存在的 key）
 */
function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target };
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const val = source[key];
      if (val === undefined) continue;
      if (
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        (result as any)[key] = deepMerge(result[key] as any, val as any);
      } else {
        (result as any)[key] = val;
      }
    }
  }
  return result;
}

/**
 * 合并全局默认 + 单模型覆盖 → 最终生效配置
 *
 * @param globalDefaults  全局默认配置（来自 API）
 * @param modelOverrides  单模型覆盖配置（来自 metadata_json）
 * @returns 合并后的完整 RenderConfig
 */
export function mergeRenderConfig(
  globalDefaults: RenderConfig | null,
  modelOverrides: RenderConfig | null,
): RenderConfig {
  return deepMerge(DEFAULT_RENDER_CONFIG, globalDefaults ?? {}, modelOverrides ?? {});
}

// ==================== 映射到 Base3DViewer Props ====================

import type { Base3DViewerProps } from '../components/3d/Base3DViewer';

/**
 * 将合并后的 RenderConfig 映射为 Base3DViewer/UniversalGaussianCardV3 的 props
 *
 * @param config 合并后的完整 RenderConfig
 * @returns 可展开到 Base3DViewer 的 Partial props 对象
 */
export function toViewerProps(config: RenderConfig): Partial<Base3DViewerProps> {
  const { camera, orbit, decorations, visual } = config;

  const props: Partial<Base3DViewerProps> = {};

  // --- 相机 ---
  if (camera) {
    if (camera.fov !== undefined) props.fov = camera.fov;
    if (camera.autoRotate !== undefined) props.autoRotate = camera.autoRotate;
    if (camera.autoRotateSpeed !== undefined) props.autoRotateSpeed = camera.autoRotateSpeed;
    if (camera.margin !== undefined) props.margin = camera.margin;
    if (camera.autoCenter !== undefined) props.autoCenter = camera.autoCenter;

    // 精确镜头
    if (camera.position && camera.target) {
      props.customCameraConfig = {
        position: camera.position,
        target: camera.target,
        zoom: camera.zoom ?? 1,
      };
    }
  }

  // --- 环绕 ---
  if (orbit) {
    if (orbit.enabled !== undefined) props.orbitEnabled = orbit.enabled;
    if (orbit.duration !== undefined) props.orbitDuration = orbit.duration;
    if (orbit.presetId !== undefined) props.orbitPreset = orbit.presetId;
    if (orbit.speed !== undefined) props.orbitSpeed = orbit.speed;
    if (orbit.centerYOffset !== undefined) props.orbitCenterYOffset = orbit.centerYOffset;
    if (orbit.modeParams !== undefined) props.orbitModeParams = orbit.modeParams;
  }

  // --- 装饰 ---
  if (decorations) {
    if (decorations.showParticles !== undefined) {
      // V3 组件通过 showParticles 控制
      (props as any).showParticles = decorations.showParticles;
    }
    if (decorations.particleSize !== undefined) {
      (props as any).particleSize = decorations.particleSize;
    }
    if (decorations.showPlatform !== undefined) {
      (props as any).showPlatform = decorations.showPlatform;
    }
    if (decorations.showLabels !== undefined) {
      (props as any).showLabels = decorations.showLabels;
    }
    if (decorations.labelCount !== undefined) {
      (props as any).labelCount = decorations.labelCount;
    }
    if (decorations.language !== undefined) {
      (props as any).language = decorations.language;
    }
  }

  // --- 视觉 ---
  if (visual) {
    if (visual.backgroundColor !== undefined) props.backgroundColor = visual.backgroundColor;
    if (visual.showTitle !== undefined) {
      (props as any).showTitle = visual.showTitle;
    }
    if (visual.showStats !== undefined) {
      (props as any).showStats = visual.showStats;
    }
  }

  return props;
}
