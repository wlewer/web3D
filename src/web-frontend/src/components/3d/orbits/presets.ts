/**
 * presets - 内置环绕预设配置
 *
 * 按场景类型预设环绕模式、参数和时长
 * 方便快速切换不同展示风格
 */

import type { OrbitPreset } from './types';

/**
 * 内置预设列表
 * 按应用场景分类，每类预设适用于不同的模型类型
 */
export const BUILTIN_PRESETS: OrbitPreset[] = [
  // ========== 通用展示 ==========
  {
    id: 'full-showcase',
    name: '全景展示',
    description: '水平 360° + 前后 180° 全方位无死角观赏',
    modeId: 'hemispherical',
    params: {
      heightFactor: 1.5,
      topDistFactor: 0.40,
      pulseAmplitude: 0.15,
      pulseCycles: 2,
      nonlinearStrength: 0.20,
    },
    duration: 12000,
    tags: ['通用', '作品', '推荐'],
  },
  {
    id: 'quick-spin',
    name: '快速浏览',
    description: '快速水平旋转，快速掌握作品全貌',
    modeId: 'horizontal',
    params: {
      heightOffset: 0,
      pulseAmplitude: 0.05,
      tiltAngle: 0,
    },
    duration: 6000,
    tags: ['通用', '快速'],
  },

  // ========== 产品展示 ==========
  {
    id: 'product-tour',
    name: '产品环视',
    description: '平稳水平环绕，带轻微上下脉动，突出产品细节',
    modeId: 'horizontal',
    params: {
      heightOffset: 0,
      pulseAmplitude: 0.10,
      tiltAngle: 0.05,
    },
    duration: 15000,
    tags: ['产品', '电商'],
  },
  {
    id: 'product-spiral',
    name: '产品螺旋',
    description: '从下到上螺旋展示，突出产品立体感',
    modeId: 'spiral',
    params: {
      direction: 'ascend',
      turns: 2,
      heightRange: 1.0,
    },
    duration: 16000,
    tags: ['产品', '立体'],
  },

  // ========== 艺术品/雕塑 ==========
  {
    id: 'art-vertical',
    name: '艺术垂直弧',
    description: '沿垂直弧线正面→头顶→背面缓慢移动',
    modeId: 'vertical-arc',
    params: {
      arcRange: 1.0,
      keepHorizOffset: 0.5,
    },
    duration: 18000,
    tags: ['艺术', '雕塑', '细节'],
  },
  {
    id: 'art-figure8',
    name: '艺术8字',
    description: '8 字形轨迹环绕，展示作品的全方位美感',
    modeId: 'figure-8',
    params: {
      width: 1.0,
      heightAmplitude: 0.3,
    },
    duration: 16000,
    tags: ['艺术', '对称'],
  },

  // ========== 建筑展示 ==========
  {
    id: 'architecture-spiral',
    name: '建筑螺旋',
    description: '多圈螺旋上升，展示建筑全貌和高度',
    modeId: 'spiral',
    params: {
      direction: 'ascend',
      turns: 3,
      heightRange: 1.5,
    },
    duration: 24000,
    tags: ['建筑', '室外'],
  },
  {
    id: 'architecture-horizontal',
    name: '建筑平转',
    description: '低速水平环绕，展示建筑外立面',
    modeId: 'horizontal',
    params: {
      heightOffset: 0.2,
      pulseAmplitude: 0.05,
      tiltAngle: 0.08,
    },
    duration: 20000,
    tags: ['建筑', '外立面'],
  },

  // ========== 轻量/手机端 ==========
  {
    id: 'mobile-horizontal',
    name: '手机水平',
    description: '轻量水平环绕，适合移动端性能优化',
    modeId: 'horizontal',
    params: {
      heightOffset: 0,
      pulseAmplitude: 0,
      tiltAngle: 0,
    },
    duration: 10000,
    tags: ['移动端', '轻量'],
  },
];

/**
 * 根据标签查询预设
 */
export function findPresets(tags?: string[]): OrbitPreset[] {
  if (!tags || tags.length === 0) return BUILTIN_PRESETS;

  return BUILTIN_PRESETS.filter(preset =>
    preset.tags.some(tag =>
      tags.some(userTag =>
        userTag.toLowerCase() === tag.toLowerCase()
      )
    )
  );
}

/**
 * 根据 ID 查询预设
 */
export function findPresetById(id: string): OrbitPreset | undefined {
  return BUILTIN_PRESETS.find(p => p.id === id);
}
