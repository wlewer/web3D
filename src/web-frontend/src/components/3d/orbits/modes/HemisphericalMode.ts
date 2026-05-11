/**
 * HemisphericalMode - 全景展示环绕模式
 *
 * 水平 360° + 前后 180° 弧形，相机从正面平视 → 上升 → 背后俯瞰 → 下降 → 返回正面
 * 距离随高度收缩 + 正弦脉动
 */

import * as THREE from 'three';
import type { OrbitMode, OrbitContext, OrbitSnapshot } from '../types';

// ========== 参数定义 ==========

const PARAMS = [
  {
    key: 'heightFactor',
    label: '高度系数',
    type: 'range' as const,
    defaultValue: 1.5,
    min: 0.5,
    max: 3.0,
    step: 0.1,
  },
  {
    key: 'topDistFactor',
    label: '头顶收缩',
    type: 'range' as const,
    defaultValue: 0.40,
    min: 0.20,
    max: 0.80,
    step: 0.05,
  },
  {
    key: 'pulseAmplitude',
    label: '脉动幅度',
    type: 'range' as const,
    defaultValue: 0.15,
    min: 0,
    max: 0.40,
    step: 0.01,
  },
  {
    key: 'pulseCycles',
    label: '每圈脉动次数',
    type: 'range' as const,
    defaultValue: 2,
    min: 0,
    max: 6,
    step: 1,
  },
  {
    key: 'nonlinearStrength',
    label: '非线性调制',
    type: 'range' as const,
    defaultValue: 0.20,
    min: 0,
    max: 0.50,
    step: 0.01,
  },
];

// ========== 模式实现 ==========

export const HemisphericalMode: OrbitMode = {
  meta: {
    id: 'hemispherical',
    name: '全景展示',
    description: '水平 360° 旋转 + 前后 180° 俯仰弧形，覆盖作品所有角度',
    category: 'hemispherical',
    params: PARAMS,
  },

  getPosition(t: number, ctx: OrbitContext, params: Record<string, any>): OrbitSnapshot {
    const {
      heightFactor = 1.5,
      topDistFactor = 0.40,
      pulseAmplitude = 0.15,
      pulseCycles = 2,
      nonlinearStrength = 0.20,
    } = params;

    const pos = new THREE.Vector3();
    const target = ctx.center.clone();

    // 非线性角度映射：使正面观赏时间更长
    const angleT = t + nonlinearStrength * Math.sin(t * Math.PI * 2);
    const horizAngle = ctx.startAngle + angleT * 2 * Math.PI;

    // 垂直相位：0→1→0，实现前后 180° 弧形
    const vertPhase = Math.sin(t * Math.PI);
    const topY = ctx.center.y + ctx.baseDistance * heightFactor;
    const height = ctx.baseHeight + vertPhase * (topY - ctx.baseHeight);

    // 距离：高度收缩 + 脉动
    const heightRatio = vertPhase;
    const pulseFreq = pulseCycles * 2; // 2 次/圈 × cycles
    const pulse = Math.sin(t * Math.PI * pulseFreq) * pulseAmplitude * ctx.baseDistance;
    const dist = ctx.baseDistance * (1 - heightRatio * (1 - topDistFactor)) + pulse;

    pos.set(
      ctx.center.x + dist * Math.sin(horizAngle),
      height,
      ctx.center.z + dist * Math.cos(horizAngle)
    );

    return { position: pos, target };
  },
};
