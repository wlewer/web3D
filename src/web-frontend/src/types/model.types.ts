// 3D模型相关类型定义
export interface Model {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  format: ModelFormat;
  metadata: ModelMetadata;
  createdAt: string;
  updatedAt: string;
}

export type ModelFormat = 'glb' | 'gltf' | 'rad' | 'obj' | 'fbx';

export interface ModelMetadata {
  vertices?: number;
  faces?: number;
  fileSize?: number;
  author?: string;
  license?: string;
  tags?: string[];
}

export interface ModelViewerConfig {
  autoRotate: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  enableZoom: boolean;
  enablePan: boolean;
}

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}
