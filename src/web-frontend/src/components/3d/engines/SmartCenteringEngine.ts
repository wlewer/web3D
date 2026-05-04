/**
 * 智能居中引擎 - SmartCenteringEngine
 * 
 * 功能：计算3D模型的最佳相机位置和观察点
 * 特点：
 * - 完全独立，无UI依赖
 * - 支持SplatMesh和普通Object3D
 * - 可单元测试
 * - 跨项目复用
 */

import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';

export interface FitConfig {
  margin: number;           // 相机距离倍数（默认2.5）
  trimThreshold: number;    // 百分位裁剪阈值（默认0.05 = 5%）
  preferAxis: 'auto' | 'x' | 'y' | 'z';  // 主导维度（默认auto）
  autoCenter: boolean;      // 是否自动居中（默认true）
}

export interface FitResult {
  cameraPosition: THREE.Vector3;  // 相机位置
  targetPosition: THREE.Vector3;  // 观察点位置（模型中心）
  fov: number;                    // 视野角度
  modelCenter: THREE.Vector3;     // 模型中心点（用于lookAt）
}

/**
 * 智能居中引擎
 */
export class SmartCenteringEngine {
  /**
   * 计算最佳相机位置（完全对齐UniversalGaussianCardV2）
   * 
   * @param object 3D对象（SplatMesh或Object3D）
   * @param canvas Canvas元素（用于计算宽高比）
   * @param config 配置选项
   * @returns FitResult 包含相机位置、观察点和FOV
   */
  static calculateFit(
    object: THREE.Object3D | SplatMesh,
    canvas: HTMLCanvasElement,
    config: FitConfig = {
      margin: 2.5,
      trimThreshold: 0.05,
      preferAxis: 'auto',
      autoCenter: true
    }
  ): FitResult {
    // ★ 关键修复：初始化size和center，避免undefined错误
    let boundingBox: THREE.Box3;
    let size = new THREE.Vector3(1, 1, 1);  // 默认值1
    let center = new THREE.Vector3(0, 0, 0);  // 默认值原点
    
    try {
      // Step 1: 计算包围盒（关键修复：SplatMesh也要动态计算）
      if (object instanceof SplatMesh) {
        // SplatMesh：动态计算真实包围盒
        console.log('📦 SplatMesh：计算真实包围盒');
        boundingBox = new THREE.Box3().setFromObject(object);
        
        // 获取尺寸和中心点
        const newSize = boundingBox.getSize(new THREE.Vector3());
        const newCenter = boundingBox.getCenter(new THREE.Vector3());
        
        // 如果包围盒有效，更新size和center
        if (newSize.length() > 0 && !isNaN(newSize.length())) {
          size = newSize;
          center = newCenter;
          console.log('✅ SplatMesh包围盒尺寸:', size.toArray());
        } else {
          // 包围盒无效，使用扩展固定包围盒
          console.log('⚠️ 包围盒无效，使用扩展固定包围盒');
          boundingBox = new THREE.Box3(
            new THREE.Vector3(-3, -3, -3),
            new THREE.Vector3(3, 3, 3)
          );
          size = boundingBox.getSize(new THREE.Vector3());
          center = boundingBox.getCenter(new THREE.Vector3());
        }
      } else {
        // GLB模型：使用标准方法
        console.log('📦 GLB模型：使用标准包围盒计算');
        boundingBox = new THREE.Box3().setFromObject(object);
        size = boundingBox.getSize(new THREE.Vector3());
        center = boundingBox.getCenter(new THREE.Vector3());
      }
      
      console.log('📐 模型包围盒:', { size: size.toArray(), center: center.toArray() });

      // 安全检查：确保size和center有效
      if (size.x === 0 && size.y === 0 && size.z === 0) {
        console.log('⚠️ 包围盒无效，使用默认尺寸');
        size.set(1, 1, 1);
        center.set(0, 0, 0);
      }
    } catch (error) {
      console.error('❌ 计算包围盒失败:', error);
      // 使用默认值
      size.set(1, 1, 1);
      center.set(0, 0, 0);
    }

    // Step 2: 智能裁剪空白区域（仅GLB模型）
    let trimmedSize: THREE.Vector3;
    if (object instanceof SplatMesh) {
      // SplatMesh：跳过裁剪，直接使用包围盒
      console.log('⏭️ SplatMesh：跳过裁剪');
      trimmedSize = size;
    } else {
      // GLB模型：执行百分位裁剪
      console.log('✂️ GLB模型：执行百分位裁剪');
      trimmedSize = this.trimEmptySpaceForGLB(object, boundingBox, config.trimThreshold);
      console.log('✂️ 裁剪后尺寸:', trimmedSize.toArray());
    }

    // Step 3: 计算最佳相机距离（完全对齐V2）
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const aspect = canvasWidth / canvasHeight;
    const fov = 50; // ✅ 与V2保持一致
    const fovRad = fov * Math.PI / 180;
    
    console.log('🖼️ 画布尺寸:', { canvasWidth, canvasHeight, aspect, fov });
    
    // 根据画布比例选择主导维度
    const dominantSize = Math.max(trimmedSize.x, trimmedSize.y, trimmedSize.z);
    
    // 计算相机距离（完全对齐V2的关键优化）
    let distance;
    if (object instanceof SplatMesh) {
      // SplatMesh: 使用0.7的系数降低距离，让模型显示更大
      distance = Math.max(2.0, dominantSize * config.margin * 0.7);
      console.log('🎯 SplatMesh目标距离:', distance.toFixed(2));
    } else {
      // GLB模型: 使用0.8的系数降低距离
      distance = (dominantSize / 2 / Math.tan(fovRad / 2)) * config.margin * 0.8;
      console.log('🎯 GLB模型目标距离:', distance.toFixed(2));
    }

    // Step 4: 相机从正面稍偏上的位置观察，避免倒立（✅ V2核心修复）
    // 关键修复：相机在Z轴正方向，Y轴稍微向上偏移15%
    const cameraOffset = new THREE.Vector3(0, distance * 0.15, distance);
    console.log('📷 相机从正面偏上观察（避免倒立）');
    console.log('📷 相机偏移:', cameraOffset.toArray());

    // Step 5: 计算相机目标位置（基于模型中心）
    const targetPosition = new THREE.Vector3(
      center.x,
      center.y + distance * 0.15,  // ✅ Y轴向上偏移15%
      center.z + distance          // ✅ Z轴向后移动distance
    );
    
    console.log('📷 相机目标位置:', targetPosition.toArray());
    console.log('🎯 观察目标（模型中心）:', center.toArray());

    return {
      cameraPosition: targetPosition,  // ✅ 返回基于模型中心的相机位置
      targetPosition: center,          // ✅ 观察点为模型中心
      fov,
      modelCenter: center
    };
  }

  /**
   * 计算包围盒（区分SplatMesh和普通Object3D）
   */
  static calculateBoundingBox(object: THREE.Object3D | SplatMesh): THREE.Box3 {
    if (object instanceof SplatMesh) {
      return this.calculateSplatBoundingBox(object);
    }
    
    // 普通Object3D使用标准方法
    const box = new THREE.Box3().setFromObject(object);
    
    // 如果包围盒无效，返回默认值
    if (box.isEmpty()) {
      console.warn('⚠️ 包围盒为空，使用默认值');
      return new THREE.Box3(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, 1, 1)
      );
    }
    
    return box;
  }

  /**
   * SplatMesh专用包围盒计算
   * 使用动态计算真实包围盒（与UniversalGaussianCardV2保持一致）
   */
  private static calculateSplatBoundingBox(splat: SplatMesh): THREE.Box3 {
    // ★ 关键修复：使用Three.js标准方法动态计算真实包围盒
    // 这与UniversalGaussianCardV2的实现保持一致
    const box = new THREE.Box3().setFromObject(splat);
    
    // 如果包围盒无效，返回默认值
    if (box.isEmpty()) {
      console.warn('⚠️ SplatMesh包围盒为空，使用默认值');
      return new THREE.Box3(
        new THREE.Vector3(-3, -3, -3),
        new THREE.Vector3(3, 3, 3)
      );
    }
    
    return box;
  }

  /**
   * GLB模型专用：百分位裁剪空白区域（完全对齐V2）
   * 
   * @param object GLB模型对象
   * @param originalBox 原始包围盒
   * @param threshold 裁剪阈值（0-1之间）
   * @returns 裁剪后的尺寸
   */
  private static trimEmptySpaceForGLB(
    object: THREE.Object3D,
    originalBox: THREE.Box3,
    threshold: number
  ): THREE.Vector3 {
    const originalSize = originalBox.getSize(new THREE.Vector3());
    
    // 收集顶点进行裁剪
    const vertices: THREE.Vector3[] = [];
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const positions = child.geometry.attributes.position;
        if (positions) {
          // 限制最大顶点数，避免性能问题
          const maxVertices = 10000;
          const step = positions.count > maxVertices ? Math.ceil(positions.count / maxVertices) : 1;
          
          for (let i = 0; i < positions.count; i += step) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, i);
            child.localToWorld(vertex);
            vertices.push(vertex);
          }
        }
      }
    });

    if (vertices.length === 0) {
      return originalSize;
    }

    // 计算顶点分布的百分位数
    const xs = vertices.map(v => v.x).sort((a, b) => a - b);
    const ys = vertices.map(v => v.y).sort((a, b) => a - b);
    const zs = vertices.map(v => v.z).sort((a, b) => a - b);

    const trimIndex = Math.floor(vertices.length * threshold);
    
    const trimmedBox = new THREE.Box3(
      new THREE.Vector3(xs[trimIndex], ys[trimIndex], zs[trimIndex]),
      new THREE.Vector3(
        xs[xs.length - 1 - trimIndex],
        ys[ys.length - 1 - trimIndex],
        zs[zs.length - 1 - trimIndex]
      )
    );

    return trimmedBox.getSize(new THREE.Vector3());
  }

  /**
   * 简化的百分位裁剪（基于包围盒缩放，用于快速估算）
   * 
   * @param box 原始包围盒
   * @param threshold 裁剪阈值（0-1之间）
   * @returns 裁剪后的包围盒
   */
  private static trimEmptySpace(box: THREE.Box3, threshold: number): THREE.Box3 {
    if (threshold <= 0 || threshold >= 1) {
      return box.clone();
    }
    
    const min = box.min.clone();
    const max = box.max.clone();
    const size = new THREE.Vector3().subVectors(max, min);
    
    // 计算裁剪量
    const trimAmount = size.clone().multiplyScalar(threshold / 2);
    
    // 应用裁剪
    min.add(trimAmount);
    max.sub(trimAmount);
    
    // 确保min < max
    const trimmedBox = new THREE.Box3(
      new THREE.Vector3(
        Math.min(min.x, max.x),
        Math.min(min.y, max.y),
        Math.min(min.z, max.z)
      ),
      new THREE.Vector3(
        Math.max(min.x, max.x),
        Math.max(min.y, max.y),
        Math.max(min.z, max.z)
      )
    );
    
    return trimmedBox;
  }

  /**
   * 获取主导维度
   * 
   * @param size 尺寸向量
   * @param preferAxis 优先轴向
   * @returns 主导维度的长度
   */
  private static getDominantDimension(
    size: THREE.Vector3,
    preferAxis: 'auto' | 'x' | 'y' | 'z'
  ): number {
    if (preferAxis === 'x') return size.x;
    if (preferAxis === 'y') return size.y;
    if (preferAxis === 'z') return size.z;
    
    // auto模式：选择最大维度
    return Math.max(size.x, size.y, size.z);
  }

  /**
   * 计算相机距离
   * 
   * @param modelSize 模型尺寸
   * @param fov 视野角度（度）
   * @param aspect 宽高比
   * @param margin 边距系数
   * @returns 相机距离
   */
  private static calculateCameraDistance(
    modelSize: number,
    fov: number,
    aspect: number,
    margin: number
  ): number {
    // 将FOV转换为弧度
    const fovRad = (fov * Math.PI) / 180;
    
    // 根据FOV和模型尺寸计算距离
    // 公式：distance = (modelSize / 2) / tan(fovRad / 2)
    let distance = (modelSize / 2) / Math.tan(fovRad / 2);
    
    // 考虑宽高比（取较大值确保完整显示）
    if (aspect > 1) {
      // 横向屏幕，使用垂直FOV
      distance = distance;
    } else {
      // 纵向屏幕，调整距离
      distance = distance / aspect;
    }
    
    // 应用margin系数
    distance *= margin;
    
    return distance;
  }

  /**
   * 验证配置有效性
   * 
   * @param config 配置对象
   * @returns 是否有效
   */
  static validateConfig(config: Partial<FitConfig>): boolean {
    if (config.margin !== undefined && (config.margin < 1 || config.margin > 10)) {
      console.warn('⚠️ margin应在1-10之间');
      return false;
    }
    
    if (config.trimThreshold !== undefined && (config.trimThreshold < 0 || config.trimThreshold > 1)) {
      console.warn('⚠️ trimThreshold应在0-1之间');
      return false;
    }
    
    return true;
  }

  /**
   * 创建默认配置
   * 
   * @returns 默认配置对象
   */
  static createDefaultConfig(): FitConfig {
    return {
      margin: 2.5,
      trimThreshold: 0.05,
      preferAxis: 'auto',
      autoCenter: true
    };
  }
}
