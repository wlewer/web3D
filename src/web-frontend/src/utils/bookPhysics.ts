// 3D翻页书物理计算工具

/**
 * 缓动函数集合
 */
export const EasingFunctions = {
  /**
   * 三次方缓入缓出
   */
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  /**
   * 二次方缓入缓出
   */
  easeInOutQuad: (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  /**
   * 正弦缓入缓出（更自然的翻页）
   */
  easeInOutSine: (t: number): number => {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  },

  /**
   * 弹性缓出（模拟纸张弹性）
   */
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

/**
 * 计算纸张弯曲程度（增强版）
 * @param progress 翻页进度 0-1
 * @param maxBend 最大弯曲度
 * @returns 弯曲值
 */
export function calculatePaperBend(progress: number, maxBend: number = 0.4): number {
  // 使用改进的正弦函数，在中间位置弯曲最大
  const bendCurve = Math.sin(progress * Math.PI);
  // 添加非线性增强，使弯曲更明显
  return bendCurve * bendCurve * maxBend;
}

/**
 * 计算翻页角度（改进版）
 * @param progress 翻页进度 0-1
 * @returns 旋转角度（弧度）
 */
export function calculateFlipAngle(progress: number): number {
  // 从 0 到 PI（180度），但使用缓动使动作更自然
  const easedProgress = EasingFunctions.easeInOutSine(progress);
  return easedProgress * Math.PI;
}

/**
 * 计算页面Z轴偏移（模拟纸张厚度）
 * @param progress 翻页进度 0-1
 * @param pageWidth 页面宽度
 * @returns Z轴偏移量
 */
export function calculatePageZOffset(progress: number, pageWidth: number): number {
  // 在翻页过程中，页面会有一定的Z轴隆起
  const bend = calculatePaperBend(progress, 0.3);
  return bend * pageWidth * 0.2;
}

/**
 * 计算页面X轴偏移（模拟书页枢轴点）
 * @param progress 翻页进度 0-1
 * @param pageWidth 页面宽度
 * @returns X轴偏移量
 */
export function calculatePageXOffset(progress: number, pageWidth: number): number {
  // 页面围绕左侧边缘旋转，产生弧形轨迹
  const angle = calculateFlipAngle(progress);
  // 计算弧形的X轴分量
  return pageWidth * 0.1 * Math.sin(angle);
}

/**
 * 计算阴影强度（增强版）
 * @param progress 翻页进度 0-1
 * @returns 阴影透明度 0-1
 */
export function calculateShadowIntensity(progress: number): number {
  // 在翻页中间时阴影最强，使用平方使过渡更平滑
  const intensity = Math.sin(progress * Math.PI);
  return intensity * intensity * 0.6;
}

/**
 * 计算页面扭曲变形（模拟真实纸张）
 * @param progress 翻页进度 0-1
 * @param vertexPosition 顶点原始位置
 * @returns 扭曲后的位置
 */
export function calculatePageWarp(progress: number, vertexPosition: { x: number; y: number }): { x: number; y: number } {
  const bend = calculatePaperBend(progress, 0.3);
  
  // 根据Y坐标计算扭曲程度（顶部和底部扭曲较小，中间较大）
  const warpFactor = Math.cos((vertexPosition.y / 2.8) * Math.PI) * 0.5 + 0.5;
  
  return {
    x: vertexPosition.x + bend * warpFactor * 0.2,
    y: vertexPosition.y,
  };
}
