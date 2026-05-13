/**
 * Unified Decoration Control Protocol
 * 
 * 统一装饰控制协议 - 面向组件的上层接口
 * 
 * 目的：
 * - 将 showParticles/showPlatform/showLabels/language/products 统一为一套共享接口
 * - 消除 V3 的独立 prop 与 Base3DViewer 的 DecorationConfig 之间的二义性
 * - 提供工具函数在不同层级间转换
 * 
 * 架构位置：
 * - 业务组件层 (V3) / 基础组件层 (Base3DViewer) → 装饰模块层 (SceneDecoration)
 * 
 * @version 1.0.0
 */

import type { DecorationConfig, ProductLabel } from '../engines/SceneDecoration';

// ==================== 统一装饰控制协议 ====================

export interface DecorationControlProps {
  /** 粒子背景（默认 layout==='featured' 时 true） */
  showParticles?: boolean;
  /** 展示台（默认 layout==='featured' 时 true） */
  showPlatform?: boolean;
  /** 产品标签 */
  showLabels?: boolean;
  /** 标签显示数量（2 或 3，自动环形均布，默认全部显示） */
  labelCount?: number;
  /** 标签数据 */
  products?: ProductLabel[];
  /** 语言 */
  language?: 'zh-CN' | 'en-US';
  /** 粒子大小（默认 0.3，范围 0.05~2.0） */
  particleSize?: number;
}

// ==================== 工具函数 ====================

/**
 * 将 DecorationControlProps 转换为 DecorationConfig
 * 
 * @param props - 装饰控制属性
 * @param layout - 布局模式（影响部分默认值）
 * @returns DecorationConfig 供 SceneDecoration 消费
 */
export function buildDecorationConfig(
  props: DecorationControlProps,
  layout: string
): DecorationConfig {
  const {
    showParticles,
    showPlatform,
    showLabels,
    labelCount,
    products = [],
    language = 'zh-CN',
    particleSize = 0.08,
  } = props;

  // 根据 layout 决定装饰默认值（对齐 V2 行为）
  const isFeatured = layout === 'featured';
  const effectiveShowParticles = showParticles !== undefined ? showParticles : isFeatured;
  const effectiveShowPlatform = showPlatform !== undefined ? showPlatform : isFeatured;

  return {
    particles: {
      enabled: effectiveShowParticles,
      size: particleSize,
    },
    platform: {
      enabled: effectiveShowPlatform,
    },
    labels: (showLabels && products.length > 0)
      ? {
          enabled: true,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            nameEn: p.nameEn || p.name,
            description: p.description,
            descriptionEn: p.descriptionEn || p.description,
            position: p.position || [0, 0, 0],
            color: p.color || '#667eea',
          })),
          labelCount: labelCount !== undefined ? labelCount : products.length,
          language: language === 'zh-CN' ? 'zh' : 'en',
        }
      : undefined,
  };
}

export type { ProductLabel, DecorationConfig };
