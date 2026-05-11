// 3D组件统一导出
export { Scene } from './Scene';
export { ModelViewer } from './Viewer';
export { ParticleBackground } from './Background';
export { ModelGallery3D } from './ModelGallery3D';
export { ThreeDBtn3D } from './ThreeDBtn3D';
export { SAM3DCard } from './SAM3DCard';

// Spark 2.0 集成
export { SparkViewer, SplatMesh, useSpark } from './Spark';
export type { SplatMeshRef } from './Spark';
export type { SplatMeshConfig, SplatStats, SplatFormat } from './Spark';
export type { UseSparkOptions, UseSparkReturn } from './Spark';

// ==================== 新架构组件（v3.0） ====================

// 核心引擎层
export { SmartCenteringEngine, ModelLoader, CameraManager } from './engines';
export type { 
  FitConfig, 
  FitResult, 
  LoadProgress, 
  LoadResult, 
  CameraOptions, 
  CameraConfig 
} from './engines';

// 基础组件层
export { Base3DViewer } from './Base3DViewer';
export type { Base3DViewerProps, Base3DViewerRef } from './Base3DViewer';

// 装饰模块层
export { 
  createDisplayPlatform, 
  updateDisplayPlatform, 
  disposeDisplayPlatform,
  ProductLabels,
  createLabelMarker,
  createLabelMarkers
} from './decorations';
export type { 
  DisplayPlatformProps, 
  ProductLabel, 
  ProductLabelsProps 
} from './decorations';

// 业务组件层
export { UniversalGaussianCardV3 } from './UniversalGaussianCardV3';
export type { UniversalGaussianCardV3Props } from './UniversalGaussianCardV3';

export { Simple3DViewer } from './Simple3DViewer';
export type { Simple3DViewerProps } from './Simple3DViewer';

export { GalleryCard } from './GalleryCard';
export type { GalleryCardProps } from './GalleryCard';

// ==================== 旧版组件（向后兼容） ====================

// UniversalGaussianCard V2.0 - 融合版通用组件
export { UniversalGaussianCardV2 } from './UniversalGaussianCardV2';
export type {
  LayoutMode,
  ProductLabel as ProductLabelV2,
  FitConfig as FitConfigV2,
  UniversalGaussianCardProps,
  UniversalGaussianCardRef,
} from './UniversalGaussianCardV2';

// 书籍画廊
export { BookGallery } from './BookGallery';
export type { BookGalleryItem, GalleryConfig } from '../../types/book.types';

// 3D书本
export { Book3D, Page, OpenBook } from './Book';
export type { BookPage, BookConfig, PageContentData, BookDetailData } from '../../types/book.types';
