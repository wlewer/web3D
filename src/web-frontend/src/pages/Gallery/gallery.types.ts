// 画廊类型定义
export type ModelSubCategory = 'product' | 'box' | 'scene' | 'animation';

// 盒子子分类
export type BoxCategory = 
  | 'cosmetics'      // 化妆品盒
  | 'wine'           // 酒盒
  | 'gift'           // 礼品盒
  | 'food'           // 食品盒
  | 'festival'       // 节日礼盒
  | 'electronics'    // 电子产品盒
  | 'fashion'        // 服饰盒
  | 'other';         // 其他盒子

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  gifPreview?: string;      // GIF动图预览地址
  modelUrl: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  tags: string[];
  category: 'model' | 'scene' | 'animation';
  subCategory?: string;  // 子分类（如盒子类型）
  boxType?: BoxCategory; // 盒子类型
  price?: string;        // 参考价格
  material?: string;     // 材质
  industry?: string;     // 行业
}

export interface GalleryFilter {
  category?: 'all' | 'box' | GalleryItem['category'];
  subCategory?: string;
  boxType?: 'all' | BoxCategory;
  search?: string;
  sortBy?: 'recent' | 'popular' | 'likes';
}
