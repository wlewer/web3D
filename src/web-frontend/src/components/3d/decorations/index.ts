/**
 * 装饰模块导出
 * 
 * 包含：
 * - DisplayPlatform: 展示台装饰
 * - ProductLabels: 产品标签装饰
 */

export { 
  createDisplayPlatform, 
  updateDisplayPlatform, 
  disposeDisplayPlatform,
  type DisplayPlatformProps 
} from './DisplayPlatform';

export { 
  ProductLabels,
  createLabelMarker,
  createLabelMarkers,
  type ProductLabel,
  type ProductLabelsProps
} from './ProductLabels';
