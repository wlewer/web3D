/**
 * Figure8Mode - 8字形环绕模式
 *
 * 相机沿水平方向画 8 字形轨迹，同时配合垂直弧
 * 适合对称作品展示
 */

import * as THREE from 'three';
import type { OrbitMode, OrbitContext, OrbitSnapshot } from '../types';

const PARAMS = [
  {
    key: 'width',
    label: '横向宽度',
    type: 'range' as const,
    defaultValue: 1.0,
    min: 0.3,
    max: 2.0,
    step: 0.1,
  },
  {
    key: 'heightAmplitude',
    label: '垂直幅度',
    type: 'range' as const,
    defaultValue: 0.3,
    min: 0,
    max: 1.0,
    step: 0.05,
  },
];

export const Figure8Mode: OrbitMode = {
  meta: {
    id: 'figure-8',
    name: '8字环绕',
    description: '横向 8 字轨迹 + 垂直波浪，适合对称作品展示',
    category: 'custom',
    params: PARAMS,
  },

  getPosition(t: number, ctx: OrbitContext, params: Record<string, any>): OrbitSnapshot {
    const {
      width = 1.0,
      heightAmplitude = 0.3,
    } = params;

    const pos = new THREE.Vector3();
    const target = ctx.center.clone();

    // 8 字轨迹：水平方向为正弦，垂直方向也为正弦（90° 相位差）
    const figureX = Math.sin(t * 2 * Math.PI);
    const figureZ = Math.sin(t * 4 * Math.PI);

    // 水平角度：沿 startAngle 方向
    const horizAngle = ctx.startAngle;
    const perpAngle = horizAngle + Math.PI / 2;

    const dist = ctx.baseDistance;

    // 横向偏移（8 字宽度）
    const lateralOffset = figureZ * dist * width;

    // 前后偏移
    const forwardOffset = figureX * dist * 0.3;

    // 垂直运动
    const height = ctx.baseHeight + Math.sin(t * 2 * Math.PI) * dist * heightAmplitude;

    pos.set(
      ctx.center.x + dist * Math.sin(horizAngle) + lateralOffset * Math.sin(perpAngle) + forwardOffset * Math.sin(horizAngle),
      height,
      ctx.center.z + dist * Math.cos(horizAngle) + lateralOffset * Math.cos(perpAngle) + forwardOffset * Math.cos(horizAngle)
    );

    return { position: pos, target };
  },
};
