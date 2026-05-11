/**
 * SpiralMode - 螺旋环绕模式
 *
 * 相机边旋转边上升/下降，形成螺旋轨迹
 * 适合高大物体、建筑、雕塑
 */

import * as THREE from 'three';
import type { OrbitMode, OrbitContext, OrbitSnapshot } from '../types';

const PARAMS = [
  {
    key: 'direction',
    label: '螺旋方向',
    type: 'select' as const,
    defaultValue: 'ascend',
    options: [
      { label: '上升', value: 'ascend' },
      { label: '下降', value: 'descend' },
    ],
  },
  {
    key: 'turns',
    label: '圈数',
    type: 'range' as const,
    defaultValue: 2,
    min: 1,
    max: 5,
    step: 1,
  },
  {
    key: 'heightRange',
    label: '高度范围',
    type: 'range' as const,
    defaultValue: 1.0,
    min: 0.3,
    max: 3.0,
    step: 0.1,
  },
];

export const SpiralMode: OrbitMode = {
  meta: {
    id: 'spiral',
    name: '螺旋升降',
    description: '边旋转边上升/下降，适合高大物体和建筑展示',
    category: 'spiral',
    params: PARAMS,
  },

  getPosition(t: number, ctx: OrbitContext, params: Record<string, any>): OrbitSnapshot {
    const {
      direction = 'ascend',
      turns = 2,
      heightRange = 1.0,
    } = params;

    const pos = new THREE.Vector3();
    const target = ctx.center.clone();

    // 水平角度：turns 圈
    const horizAngle = ctx.startAngle + t * turns * 2 * Math.PI;

    // 高度：线性变化
    const heightDelta = ctx.baseDistance * heightRange;
    const ascendFactor = direction === 'ascend' ? t : (1 - t);
    const height = ctx.baseHeight - heightDelta / 2 + ascendFactor * heightDelta;

    // 距离：恒定
    const dist = ctx.baseDistance;

    pos.set(
      ctx.center.x + dist * Math.sin(horizAngle),
      height,
      ctx.center.z + dist * Math.cos(horizAngle)
    );

    return { position: pos, target };
  },
};
