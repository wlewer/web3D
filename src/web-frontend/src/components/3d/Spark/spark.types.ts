// Spark 2.0 类型定义
import type * as THREE from 'three';

// Splat 文件格式
export type SplatFormat = 'ply' | 'spz' | 'splat' | 'rad';

// SplatMesh 配置
export interface SplatMeshConfig {
  url: string;
  format?: SplatFormat;
  position?: [number, number, number];
  rotation?: [number, number, number, number]; // quaternion
  scale?: number | [number, number, number];
  onProgress?: (progress: number) => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// SparkRenderer 配置
export interface SparkRendererConfig {
  renderer: THREE.WebGLRenderer;
  camera?: THREE.Camera;
  scene?: THREE.Scene;
  debug?: boolean;
}

// Splat 统计信息
export interface SplatStats {
  pointCount: number;
  loaded: boolean;
  loading: boolean;
  progress: number;
}
