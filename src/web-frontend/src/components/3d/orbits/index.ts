/**
 * orbits - 独立环绕引擎统一导出
 *
 * 使用方式：
 * ```ts
 * // 直接使用控制器（无框架依赖）
 * import { OrbitController, HemisphericalMode } from './orbits';
 *
 * const controller = new OrbitController(camera, controls);
 * controller.start();
 *
 * // React 集成
 * import { useOrbitController } from './orbits';
 *
 * const { active, start, stop, setSpeed } = useOrbitController(cameraRef, controlsRef);
 * ```
 */

// ============ 控制器核心 ============
export { OrbitController } from './OrbitController';

// ============ React Hook ============
export { useOrbitController } from './useOrbitController';
export type { UseOrbitControllerOptions, OrbitControllerAPI, OrbitControllerUIState } from './useOrbitController';

// ============ 内置模式 ============
export { HemisphericalMode } from './modes/HemisphericalMode';
export { HorizontalMode } from './modes/HorizontalMode';
export { VerticalArcMode } from './modes/VerticalArcMode';
export { SpiralMode } from './modes/SpiralMode';
export { Figure8Mode } from './modes/Figure8Mode';

// ============ 预设 ============
export { BUILTIN_PRESETS, findPresets, findPresetById } from './presets';

// ============ 类型导出 ============
export type {
  OrbitMode,
  OrbitModeMeta,
  OrbitModeCategory,
  OrbitContext,
  OrbitSnapshot,
  OrbitParamDef,
  OrbitPreset,
  OrbitControllerEvents,
  OrbitPreferences,
} from './types';
