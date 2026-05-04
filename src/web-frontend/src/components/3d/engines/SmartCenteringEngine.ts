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
  targetPosition: THREE.Vector3;  // 观察点位置
  fov: number;                    // 视野角度
}

/**
 * 智能居中引擎
 */
export class SmartCenteringEngine {
  /**
   * 计算最佳相机位置
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
    // Step 1: 计算包围盒
    const box = this.calculateBoundingBox(object);
    
    // Step 2: 百分位裁剪空白区域（仅GLB模型）
    const trimmedBox = this.trimEmptySpace(box, config.trimThreshold);
    
    // Step 3: 计算中心点
    const center = new THREE.Vector3();
    trimmedBox.getCenter(center);
    
    // Step 4: 自动居中
    if (config.autoCenter) {
      object.position.sub(center);
    }
    
    // Step 5: 计算模型尺寸
    const size = new THREE.Vector3();
    trimmedBox.getSize(size);
    
    // Step 6: 确定主导维度
    const maxDim = this.getDominantDimension(size, config.preferAxis);
    
    // Step 7: 计算相机距离
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const fov = 60; // 默认FOV
    const distance = this.calculateCameraDistance(maxDim, fov, aspect, config.margin);
    
    // Step 8: 计算相机位置（从正前方观察）
    const cameraPosition = new THREE.Vector3(0, 0, distance);
    
    // Step 9: 观察点为中心
    const targetPosition = new THREE.Vector3(0, 0, 0);
    
    return {
      cameraPosition,
      targetPosition,
      fov
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
   * 使用动态计算 + margin系数
   */
  private static calculateSplatBoundingBox(splat: SplatMesh): THREE.Box3 {
    // 尝试获取splat的边界信息
    const splatAny = splat as any;
    
    if (splatAny.boundingBox) {
      // 如果已有boundingBox，直接使用
      return splatAny.boundingBox.clone();
    }
    
    if (splatAny.geometry && splatAny.geometry.boundingBox) {
      // 如果有geometry boundingBox，使用它
      return splatAny.geometry.boundingBox.clone();
    }
    
    // 否则使用固定包围盒 + margin
    // 这是SplatMesh的特殊处理方式
    const margin = 2.5; // 默认margin
    const defaultSize = 2; // 默认尺寸
    
    return new THREE.Box3(
      new THREE.Vector3(-defaultSize * margin, -defaultSize * margin, -defaultSize * margin),
      new THREE.Vector3(defaultSize * margin, defaultSize * margin, defaultSize * margin)
    );
  }

  /**
   * 百分位裁剪空白区域
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
