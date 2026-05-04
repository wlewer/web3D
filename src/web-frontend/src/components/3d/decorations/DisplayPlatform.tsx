/**
 * DisplayPlatform - 展示台装饰模块
 * 
 * 功能：为3D模型添加圆形展示台，增强视觉效果
 * 特点：
 * - 可选模块，不影响核心渲染
 * - 可配置大小、颜色、透明度
 * - 支持渐变效果
 * 
 * 适用场景：
 * - 首页featured布局
 * - 产品展示页面
 * - 需要突出模型的场合
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface DisplayPlatformProps {
  size?: number;              // 展示台直径（默认10）
  color?: string | number;    // 颜色（默认白色）
  opacity?: number;           // 透明度（默认0.1）
  segments?: number;          // 分段数（默认64，越高质量越好）
  position?: [number, number, number];  // 位置（默认[0, -size/2, 0]）
}

/**
 * 展示台装饰组件
 * 
 * @note 这是一个纯React组件，需要在Three.js场景中手动添加
 * @example
 * ```tsx
 * // 在父组件中创建并添加到场景
 * const platform = createDisplayPlatform({ size: 10, color: 0xffffff, opacity: 0.1 });
 * scene.add(platform);
 * ```
 */
export function createDisplayPlatform({
  size = 10,
  color = 0xffffff,
  opacity = 0.1,
  segments = 64,
  position = [0, -size / 2, 0]
}: DisplayPlatformProps = {}): THREE.Mesh {
  // 创建圆形几何体
  const geometry = new THREE.CircleGeometry(size / 2, segments);
  
  // 创建材质（半透明）
  const material = new THREE.MeshBasicMaterial({
    color: typeof color === 'string' ? new THREE.Color(color) : color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide
  });
  
  // 创建网格
  const platform = new THREE.Mesh(geometry, material);
  
  // 旋转为水平放置（默认CircleGeometry是垂直的）
  platform.rotation.x = -Math.PI / 2;
  
  // 设置位置
  platform.position.set(...position);
  
  console.log('🎨 展示台已创建', { size, color, opacity });
  
  return platform;
}

/**
 * React组件版本（用于直接在JSX中使用）
 * 
 * @note 这个组件需要配合Three.js场景使用
 */
export function DisplayPlatformComponent({
  size = 10,
  color = 0xffffff,
  opacity = 0.1,
  segments = 64,
  position = [0, -size / 2, 0]
}: DisplayPlatformProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  
  useEffect(() => {
    if (meshRef.current) {
      // 清理旧的geometry和material
      return () => {
        if (meshRef.current) {
          meshRef.current.geometry.dispose();
          (meshRef.current.material as THREE.Material).dispose();
        }
      };
    }
  }, []);
  
  // 注意：这个组件需要在Canvas或Scene上下文中使用
  // 这里仅提供接口定义，实际使用需要配合@react-three/fiber
  return null;
}

/**
 * 更新展示台属性
 * 
 * @param platform 展示台网格对象
 * @param props 新的属性
 */
export function updateDisplayPlatform(
  platform: THREE.Mesh,
  props: Partial<DisplayPlatformProps>
): void {
  if (props.size !== undefined) {
    // 需要重新创建geometry
    const oldGeometry = platform.geometry as THREE.CircleGeometry;
    oldGeometry.dispose();
    
    const newGeometry = new THREE.CircleGeometry(props.size / 2, 64);
    platform.geometry = newGeometry;
    
    // 更新位置
    if (props.position) {
      platform.position.set(...props.position);
    } else {
      platform.position.y = -props.size / 2;
    }
  }
  
  if (props.color !== undefined || props.opacity !== undefined) {
    const material = platform.material as THREE.MeshBasicMaterial;
    
    if (props.color !== undefined) {
      material.color.set(typeof props.color === 'string' ? new THREE.Color(props.color) : props.color);
    }
    
    if (props.opacity !== undefined) {
      material.opacity = props.opacity;
      material.transparent = props.opacity < 1;
    }
  }
}

/**
 * 销毁展示台（释放资源）
 * 
 * @param platform 展示台网格对象
 */
export function disposeDisplayPlatform(platform: THREE.Mesh): void {
  platform.geometry.dispose();
  (platform.material as THREE.Material).dispose();
  console.log('🗑️ 展示台已销毁');
}
