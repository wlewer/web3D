/**
 * ProductLabels - 产品标签装饰模块
 * 
 * 功能：在3D模型周围显示产品信息标签
 * 特点：
 * - 支持多语言（中文/英文）
 * - 可配置位置和样式
 * - 动态显示/隐藏
 * - 响应式设计
 * 
 * 适用场景：
 * - 首页featured布局
 * - 产品展示页面
 * - 需要标注产品特性的场合
 */

import React from 'react';
import * as THREE from 'three';

export interface ProductLabel {
  id: string;
  name: string;
  nameEn?: string;           // 英文名称
  description: string;
  descriptionEn?: string;    // 英文描述
  position?: [number, number, number];  // 3D空间位置
  color?: string;            // 标签颜色
}

export interface ProductLabelsProps {
  labels: ProductLabel[];    // 标签数据
  visible?: boolean;         // 是否可见（默认true）
  language?: 'zh-CN' | 'en-US';  // 语言（默认zh-CN）
  className?: string;        // 自定义CSS类名
}

/**
 * 产品标签组件
 * 
 * @example
 * ```tsx
 * <ProductLabels
 *   labels={[
 *     {
 *       id: 'p1',
 *       name: '🦋 生态研究',
 *       nameEn: '🦋 Ecology Research',
 *       description: '用于昆虫生态研究',
 *       descriptionEn: 'For insect ecology research',
 *       color: '#22c55e'
 *     }
 *   ]}
 *   visible={true}
 *   language="zh-CN"
 * />
 * ```
 */
export function ProductLabels({
  labels,
  visible = true,
  language = 'zh-CN',
  className = ''
}: ProductLabelsProps) {
  const isZh = language === 'zh-CN';
  
  if (!visible || labels.length === 0) {
    return null;
  }
  
  return (
    <div className={`product-labels ${className}`}>
      {labels.map((label) => (
        <div
          key={label.id}
          className="product-label"
          style={{
            borderColor: label.color || '#ffffff'
          }}
        >
          <h3 className="product-label-title">
            {isZh ? label.name : (label.nameEn || label.name)}
          </h3>
          <p className="product-label-description">
            {isZh ? label.description : (label.descriptionEn || label.description)}
          </p>
        </div>
      ))}
      
      <style>{`
        .product-labels {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          pointer-events: none;
          z-index: 10;
        }
        
        .product-label {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-left: 3px solid;
          padding: 12px 16px;
          border-radius: 8px;
          min-width: 200px;
          max-width: 300px;
          transition: all 0.3s ease;
        }
        
        .product-label:hover {
          background: rgba(0, 0, 0, 0.85);
          transform: translateY(-2px);
        }
        
        .product-label-title {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }
        
        .product-label-description {
          margin: 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
        }
        
        @media (max-width: 768px) {
          .product-labels {
            bottom: 10px;
            left: 10px;
            right: 10px;
          }
          
          .product-label {
            min-width: 150px;
            max-width: 250px;
            padding: 10px 12px;
          }
          
          .product-label-title {
            font-size: 12px;
          }
          
          .product-label-description {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 创建3D空间中的标签标记点
 * 
 * @note 这个函数返回Three.js对象，需要在场景中手动添加
 * @example
 * ```tsx
 * const marker = createLabelMarker({ position: [1, 0, 1], color: 0xff0000 });
 * scene.add(marker);
 * ```
 */
export function createLabelMarker({
  position = [0, 0, 0],
  color = 0xffffff,
  size = 0.1
}: {
  position?: [number, number, number];
  color?: number | string;
  size?: number;
} = {}): THREE.Mesh {
  // 创建球体几何体作为标记点
  const geometry = new THREE.SphereGeometry(size, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: typeof color === 'string' ? new THREE.Color(color) : color
  });
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.set(...position);
  
  return marker;
}

/**
 * 批量创建产品标签标记点
 * 
 * @param labels 标签数据数组
 * @returns Three.js对象数组
 */
export function createLabelMarkers(labels: ProductLabel[]): THREE.Mesh[] {
  return labels
    .filter(label => label.position)
    .map(label => 
      createLabelMarker({
        position: label.position!,
        color: label.color || 0xffffff,
        size: 0.1
      })
    );
}
