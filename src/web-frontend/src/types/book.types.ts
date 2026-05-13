// 3D翻页书类型定义

import type { ReactNode } from 'react';

/**
 * 书页接口
 */
export interface BookPage {
  id: string;
  frontContent: ReactNode;  // 正面内容
  backContent: ReactNode;   // 背面内容
}

/**
 * 书本配置
 */
export interface BookConfig {
  width?: number;           // 书本宽度
  height?: number;          // 书本高度
  depth?: number;           // 书本厚度
  flipDuration?: number;    // 翻页动画时长（秒）
}

/**
 * 使用翻页Hook的属性
 */
export interface UseBookFlipProps {
  totalPages: number;
  flipDuration?: number;
  onPageChange?: (page: number) => void;
}

/**
 * 使用翻页Hook的返回值
 */
export interface UseBookFlipReturn {
  currentPage: number;      // 当前页码
  totalPages: number;       // 总页数
  isFlipping: boolean;      // 是否正在翻页
  flipProgress: number;     // 翻页进度 0-1
  flipDirection: 'next' | 'prev';  // 翻页方向
  nextPage: () => void;     // 下一页
  prevPage: () => void;     // 上一页
  goToPage: (page: number) => void;  // 跳转到指定页
}

/**
 * 书籍画廊数据项
 */
export interface BookGalleryItem {
  /** 书籍ID */
  id: string;
  /** 编号标记 */
  number: number;
  /** 书籍标题 */
  title?: string;
  /** 书籍标题的i18n key（可选，用于动态翻译） */
  titleKey?: string;
  /** 副标题 */
  subtitle?: string;
  /** 副标题的i18n key（可选，用于动态翻译） */
  subtitleKey?: string;
  /** 封面颜色 */
  coverColor: string;
  /** 页数 */
  totalPages: number;
}

/**
 * 书页内容数据
 */
export interface PageContentData {
  /** 页码 */
  pageNumber: number;
  /** 页面类型 */
  type: 'text' | 'image' | 'mixed';
  /** 标题 */
  title?: string;
  /** 文本内容 */
  text?: string;
  /** 图片URL */
  imageUrl?: string;
  /** 图片描述 */
  imageCaption?: string;
  /** 背景色 */
  backgroundColor?: string;
}

/**
 * 书籍详细数据
 */
export interface BookDetailData {
  /** 书籍ID */
  id: string;
  /** 书籍标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 封面颜色 */
  coverColor: string;
  /** 书页内容列表 */
  pages: PageContentData[];
}

/**
 * 排列方式类型
 */
export type LayoutMode = 'circle-single' | 'grid' | 'cylinder';

/**
 * 画廊配置
 */
export interface GalleryConfig {
  /** 排列方式 */
  layoutMode: LayoutMode;
  /** 网格行数 */
  gridRows?: number;
  /** 网格列数 */
  gridCols?: number;
  /** 圆柱体层数 */
  cylinderLayers?: number;
  /** 圆形轨道半径 */
  radius?: number;
  /** 自动轮换间隔（秒） */
  autoRotateInterval: number;
  /** 弹出动画持续时间（秒） */
  popupDuration: number;
  /** 弹出书籍的缩放比例 */
  popupScale: number;
}

/**
 * 页面导航类型
 */
export type PageType = 'home' | 'gallery' | 'auth' | 'upload' | 'showcase' | 'book' | 'book-gallery';
