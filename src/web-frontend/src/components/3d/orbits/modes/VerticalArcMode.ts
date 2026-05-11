/**
 * VerticalArcMode - 前后 180° 垂直弧环绕模式
 *
 * 相机沿正面→头顶→背面的垂直弧线运动，
 * 水平位置保持不动。适合艺术品细节观赏。
 */

import * as THREE from 'three';
import type { OrbitMode, OrbitContext, OrbitSnapshot } from '../types';

const PARAMS = [
  {
    key: 'arcRange',
    label: '弧度范围',
    type: 'range' as const,
    defaultValue: 1.0,
    min: 0.3,
    max: 1.8,
    step: 0.1,
  },
  {
    key: 'keepHorizOffset',
    label: '水平偏移',
    type: 'range' as const,
    defaultValue: 0.5,
    min: 0,
    max: 2.0,
    step: 0.1,
  },
];

export const VerticalArcMode: OrbitMode = {
  meta: {
    id: 'vertical-arc',
    name: '垂直弧线',
    description: '正面→头顶→背面 180° 垂直弧形，适合艺术品细节观赏',
    category: 'vertical',
    params: PARAMS,
  },

  getPosition(t: number, ctx: OrbitContext, params: Record<string, any>): OrbitSnapshot {
    const {
      arcRange = 1.0,
      keepHorizOffset = 0.5,
    } = params;

    const pos = new THREE.Vector3();
    const target = ctx.center.clone();

    // 垂直相位：0→1→0（从正面到头顶到背面）
    const vertPhase = Math.sin(t * Math.PI);

    // 高度：从起始高度上升到头顶再下降
    const topY = ctx.center.y + ctx.baseDistance * arcRange;
    const height = ctx.baseHeight + vertPhase * (topY - ctx.baseHeight);

    // 水平偏移：保持一定的前方偏移，不要完全垂直
    const horizOffset = keepHorizOffset;
    const forwardX = Math.sin(ctx.startAngle) * ctx.baseDistance * horizOffset;
    const forwardZ = Math.cos(ctx.startAngle) * ctx.baseDistance * horizOffset;

    // 距离：前方位置向后收缩
    const dist = ctx.baseDistance * (1 - vertPhase * 0.3);

    pos.set(
      ctx.center.x + forwardX * (dist / ctx.baseDistance),
      height,
      ctx.center.z + forwardZ * (dist / ctx.baseDistance)
    );

    return { position: pos, target };
  },
};
