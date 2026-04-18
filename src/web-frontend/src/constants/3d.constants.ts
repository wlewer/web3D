// 3D场景常量定义

// 模型查看器配置类型（内联避免模块解析问题）
export interface ModelViewerConfig {
  autoRotate: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  enableZoom: boolean;
  enablePan: boolean;
}

export const DEFAULT_CAMERA_POSITION = {
  x: 0,
  y: 0,
  z: 5,
} as const;

export const DEFAULT_VIEWER_CONFIG: ModelViewerConfig = {
  autoRotate: true,
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 1,
  maxDistance: 100,
  enableZoom: true,
  enablePan: true,
};

export const BACKGROUND_COLOR = '#0a0a0f';

export const PARTICLE_COUNT = 5000;

// Spark 2.0 配置
export const SPARK_CONFIG = {
  // 默认 Splat 模型 URL（蝴蝶示例）
  DEFAULT_SPLAT_URL: 'https://sparkjs.dev/assets/splats/butterfly.spz',
  // 其他示例模型
  EXAMPLE_MODELS: {
    butterfly: 'https://sparkjs.dev/assets/splats/butterfly.spz',
    dragon: 'https://sparkjs.dev/assets/splats/dragon.spz',
    // 更多模型可添加
  } as const,
  // 加载配置
  LOADING_TIMEOUT: 30000,
  MAX_RETRY: 3,
} as const;
