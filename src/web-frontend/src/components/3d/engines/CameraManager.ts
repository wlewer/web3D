/**
 * 相机管理器 - CameraManager
 * 
 * 功能：统一管理Three.js相机的创建、配置和控制
 * 特点：
 * - 统一的相机创建接口
 * - 支持OrbitControls
 * - 相机配置保存/加载
 * - 平滑过渡动画
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Tween, Easing } from '@tweenjs/tween.js';

export interface CameraConfig {
  position: [number, number, number];  // 相机位置
  target: [number, number, number];    // 观察点
  zoom: number;                        // 缩放级别
}

export interface CameraOptions {
  fov?: number;           // 视野角度（默认60）
  near?: number;          // 近裁剪面（默认0.1）
  far?: number;           // 远裁剪面（默认1000）
  enableControls?: boolean;  // 启用控制器（默认true）
  autoRotate?: boolean;      // 自动旋转（默认false）
  autoRotateSpeed?: number;  // 自动旋转速度（默认2.0）
  dampingFactor?: number;    // 阻尼系数（默认0.05）
}

export interface CameraResult {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls | null;
}

/**
 * 相机管理器
 */
export class CameraManager {
  /**
   * 创建相机和控制器
   * 
   * @param canvas Canvas元素
   * @param options 相机选项
   * @returns CameraResult 包含相机和控制器
   */
  static createCamera(
    canvas: HTMLCanvasElement,
    options: CameraOptions = {}
  ): CameraResult {
    const {
      fov = 60,
      near = 0.1,
      far = 1000,
      enableControls = true,
      autoRotate = false,
      autoRotateSpeed = 2.0,
      dampingFactor = 0.05
    } = options;

    // 计算宽高比
    const aspect = canvas.clientWidth / canvas.clientHeight;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 5); // 默认位置

    // 创建控制器（可选）
    let controls: OrbitControls | null = null;
    if (enableControls) {
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = dampingFactor;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = autoRotateSpeed;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.minDistance = 0.1;
      controls.maxDistance = 1000;
    }

    console.log('📷 相机创建成功', { fov, aspect, enableControls });

    return { camera, controls };
  }

  /**
   * 应用相机配置
   * 
   * @param camera 相机对象
   * @param controls 控制器（可选）
   * @param config 相机配置
   */
  static applyConfig(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls | null,
    config: CameraConfig
  ): void {
    // 设置相机位置
    camera.position.set(...config.position);

    // 设置观察点
    if (controls) {
      controls.target.set(...config.target);
      controls.update();
    }

    // 设置缩放
    camera.zoom = config.zoom;
    camera.updateProjectionMatrix();

    console.log('📷 相机配置已应用', config);
  }

  /**
   * 保存当前相机配置
   * 
   * @param camera 相机对象
   * @param controls 控制器（可选）
   * @returns CameraConfig
   */
  static saveConfig(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls | null
  ): CameraConfig {
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: controls ? [
        controls.target.x,
        controls.target.y,
        controls.target.z
      ] : [0, 0, 0],
      zoom: camera.zoom
    };
  }

  /**
   * 平滑过渡到新位置
   * 
   * @param camera 相机对象
   * @param controls 控制器（可选）
   * @param targetPosition 目标位置
   * @param targetTarget 目标观察点
   * @param duration 过渡时间（毫秒，默认1000）
   * @param onComplete 完成回调
   */
  static smoothTransition(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls | null,
    targetPosition: THREE.Vector3,
    targetTarget: THREE.Vector3,
    duration: number = 1000,
    onComplete?: () => void
  ): void {
    const startPos = camera.position.clone();
    const startTarget = controls ? controls.target.clone() : new THREE.Vector3(0, 0, 0);

    // 使用Tween.js实现平滑过渡
    const tween = new Tween({ t: 0 })
      .to({ t: 1 }, duration)
      .easing(Easing.Cubic.InOut)
      .onUpdate(({ t }) => {
        // 插值相机位置
        camera.position.lerpVectors(startPos, targetPosition, t);

        // 插值观察点
        if (controls) {
          controls.target.lerpVectors(startTarget, targetTarget, t);
          controls.update();
        }
      })
      .onComplete(() => {
        console.log('📷 相机过渡完成');
        onComplete?.();
      })
      .start();

    // 需要在动画循环中调用Tween.update()
    const animate = () => {
      if (tween.update()) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  /**
   * 重置相机到默认位置
   * 
   * @param camera 相机对象
   * @param controls 控制器（可选）
   * @param duration 过渡时间（毫秒，默认500）
   */
  static resetCamera(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls | null,
    duration: number = 500
  ): void {
    const defaultPosition = new THREE.Vector3(0, 0, 5);
    const defaultTarget = new THREE.Vector3(0, 0, 0);

    this.smoothTransition(camera, controls, defaultPosition, defaultTarget, duration);
  }

  /**
   * 调整相机FOV
   * 
   * @param camera 相机对象
   * @param fov 新FOV值
   * @param duration 过渡时间（毫秒，默认300）
   */
  static adjustFOV(
    camera: THREE.PerspectiveCamera,
    fov: number,
    duration: number = 300
  ): void {
    const startFOV = camera.fov;

    const tween = new Tween({ fov: startFOV })
      .to({ fov }, duration)
      .easing(Easing.Quadratic.Out)
      .onUpdate(({ fov }) => {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      })
      .start();

    const animate = () => {
      if (tween.update()) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  /**
   * 验证相机配置有效性
   * 
   * @param config 相机配置
   * @returns 是否有效
   */
  static validateConfig(config: Partial<CameraConfig>): boolean {
    if (config.position) {
      if (config.position.length !== 3) {
        console.warn('⚠️ position必须是长度为3的数组');
        return false;
      }
    }

    if (config.target) {
      if (config.target.length !== 3) {
        console.warn('⚠️ target必须是长度为3的数组');
        return false;
      }
    }

    if (config.zoom !== undefined && (config.zoom < 0.1 || config.zoom > 10)) {
      console.warn('⚠️ zoom应在0.1-10之间');
      return false;
    }

    return true;
  }

  /**
   * 创建默认相机配置
   * 
   * @returns 默认配置
   */
  static createDefaultConfig(): CameraConfig {
    return {
      position: [0, 0, 5],
      target: [0, 0, 0],
      zoom: 1
    };
  }

  /**
   * 销毁相机和控制器（释放资源）
   * 
   * @param camera 相机对象
   * @param controls 控制器（可选）
   */
  static dispose(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls | null
  ): void {
    if (controls) {
      controls.dispose();
    }
    
    // Three.js相机不需要显式销毁
    console.log('🗑️ 相机资源已释放');
  }
}
