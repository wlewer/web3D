/**
 * DisplayPlatform - 展示台装饰模块
 * 
 * 功能：为3D模型添加圆形展示台和装饰环，增强视觉效果
 * 特点：
 * - ✅ 完全对齐UniversalGaussianCardV2：CylinderGeometry + RingGeometry
 * - 可选模块，不影响核心渲染
 * - 可配置颜色、透明度
 */

import * as THREE from 'three';

export interface DisplayPlatformProps {
  size?: number;              // 展示台直径（默认10，仅对CircleGeometry版本有效）
  color?: string | number;    // 颜色（默认白色）
  opacity?: number;           // 透明度（默认0.1）
  segments?: number;          // 分段数（默认32）
  position?: [number, number, number];  // 位置（默认[0, -1, 0]对齐V2）
}

/**
 * 创建展示台（完全对齐UniversalGaussianCardV2）
 * 
 * @note V2使用CylinderGeometry(0.8, 1, 0.3, 32) + RingGeometry(0.9, 0.95, 64)
 * @returns THREE.Group 包含平台主体和装饰环
 */
export function createDisplayPlatform({
  size = 10,  // 保留参数用于保持接口兼容
  color = 0xffffff,
  opacity = 0.1,
  segments = 32,
  position = [0, -1, 0]
}: DisplayPlatformProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = 'display-platform-group';

  // ✅ 对齐V2：平台主体 - 使用CylinderGeometry
  const platformGeometry = new THREE.CylinderGeometry(0.8, 1, 0.3, segments);
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: typeof color === 'string' ? new THREE.Color(color) : color,
    metalness: 0.8,
    roughness: 0.2,
    transparent: opacity < 1,
    opacity: Math.max(opacity, 0.5), // V2默认0.3，确保可见
  });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.set(position[0], position[1], position[2]);
  platform.name = 'platform';
  group.add(platform);

  // ✅ 对齐V2：装饰环 - 使用RingGeometry
  const ringGeometry = new THREE.RingGeometry(0.9, 0.95, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: typeof color === 'string' ? new THREE.Color(color) : color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(position[0], position[1] + 0.15, position[2]);
  ring.name = 'ring';
  group.add(ring);

  console.log('🎨 展示台已创建（对齐V2: CylinderGeometry+Ring）');
  
  return group;
}

/**
 * 更新展示台属性
 * 
 * @param platform 展示台组对象
 * @param props 新的属性
 */
export function updateDisplayPlatform(
  platform: THREE.Group,
  props: Partial<DisplayPlatformProps>
): void {
  platform.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name === 'platform') {
      if (props.color !== undefined) {
        (child.material as THREE.MeshStandardMaterial).color.set(
          typeof props.color === 'string' ? new THREE.Color(props.color) : props.color
        );
      }
      if (props.opacity !== undefined) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(props.opacity, 0.5);
        mat.transparent = mat.opacity < 1;
      }
    }
    if (child instanceof THREE.Mesh && child.name === 'ring') {
      if (props.color !== undefined) {
        (child.material as THREE.MeshBasicMaterial).color.set(
          typeof props.color === 'string' ? new THREE.Color(props.color) : props.color
        );
      }
    }
  });
}

/**
 * 销毁展示台（释放资源）
 * 
 * @param platform 展示台组对象
 */
export function disposeDisplayPlatform(platform: THREE.Mesh | THREE.Group): void {
  platform.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        (child.material as THREE.Material).dispose();
      }
    }
  });
  console.log('🗑️ 展示台已销毁');
}

