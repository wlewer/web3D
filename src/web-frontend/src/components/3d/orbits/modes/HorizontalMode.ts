/**
 * HorizontalMode - 纯水平环绕模式
 *
 * 相机保持恒定高度，沿水平面 360° 环绕
 * 适合建筑、产品展示
 */

import * as THREE from 'three';
import type { OrbitMode, OrbitContext, OrbitSnapshot } from '../types';

const PARAMS = [
  {
    key: 'heightOffset',
    label: '高度偏移',
    type: 'range' as const,
    defaultValue: 0,
    min: -2.0,
    max: 2.0,
    step: 0.1,
  },
  {
    key: 'pulseAmplitude',
    label: '脉动幅度',
    type: 'range' as const,
    defaultValue: 0.10,
    min: 0,
    max: 0.40,
    step: 0.01,
  },
  {
    key: 'tiltAngle',
    label: '倾斜角度',
    type: 'range' as const,
    defaultValue: 0,
    min: -0.3,
    max: 0.3,
    step: 0.01,
  },
];

export const HorizontalMode: OrbitMode = {
  meta: {
    id: 'horizontal',
    name: '水平旋转',
    description: '相机保持恒定高度，沿水平面 360° 旋转环绕',
    category: 'horizontal',
    params: PARAMS,
  },

  getPosition(t: number, ctx: OrbitContext, params: Record<string, any>): OrbitSnapshot {
    const {
      heightOffset = 0,
      pulseAmplitude = 0.10,
      tiltAngle = 0,
    } = params;

    const pos = new THREE.Vector3();
    const target = ctx.center.clone();

    const horizAngle = ctx.startAngle + t * 2 * Math.PI;
    const height = ctx.baseHeight + heightOffset;

    // 距离脉动
    const pulse = Math.sin(t * Math.PI * 4) * pulseAmplitude * ctx.baseDistance;
    const dist = ctx.baseDistance + pulse;

    // 倾斜：相机略微向下/向上看
    if (tiltAngle !== 0) {
      target.y += Math.sin(t * Math.PI * 2) * tiltAngle * ctx.baseDistance;
    }

    pos.set(
      ctx.center.x + dist * Math.sin(horizAngle),
      height,
      ctx.center.z + dist * Math.cos(horizAngle)
    );

    return { position: pos, target };
  },
};
