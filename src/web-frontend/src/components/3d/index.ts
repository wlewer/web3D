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

// 书籍画廊
export { BookGallery } from './BookGallery';
export type { BookGalleryItem, GalleryConfig } from '../../types/book.types';

// 3D书本
export { Book3D, Page, OpenBook } from './Book';
export type { BookPage, BookConfig, PageContentData, BookDetailData } from '../../types/book.types';
