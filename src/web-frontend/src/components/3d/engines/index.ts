/**
 * 3D引擎模块统一导出
 * 
 * 包含：
 * - SceneDecoration: 场景装饰（粒子、展示台、标签）
 * - SmartCenteringEngine: 智能居中引擎
 * - ModelLoader: 统一模型加载器
 * - CameraManager: 相机管理器
 */

// 场景装饰模块
export {
  SceneDecoration,
  type SceneDecorationAPI,
  type DecorationConfig,
  type ParticleConfig,
  type PlatformConfig,
  type LabelsConfig,
  type ProductLabel,
} from './SceneDecoration';

// 智能居中引擎
export { SmartCenteringEngine } from './SmartCenteringEngine';
export type { FitConfig, FitResult } from './SmartCenteringEngine';

// 模型加载器
export { ModelLoader } from './ModelLoader';
export type { ModelFormat, LoadProgress, LoadResult } from './ModelLoader';

// 相机管理器
export { CameraManager } from './CameraManager';
export type { CameraConfig, CameraOptions, CameraResult } from './CameraManager';
