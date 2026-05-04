/**
 * 统一模型加载器 - ModelLoader
 * 
 * 功能：支持多种3D模型格式的统一加载
 * 支持的格式：SPZ、GLB、GLTF、PLY
 * 特点：
 * - 统一的进度回调
 * - 自动格式检测
 * - 错误处理
 * - 可复用
 */

import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

export type ModelFormat = 'spz' | 'glb' | 'gltf' | 'ply';

export interface LoadProgress {
  progress: number;      // 进度百分比（0-100）
  stage: 'initializing' | 'loading' | 'processing' | 'rendering';  // 加载阶段
}

export interface LoadResult {
  model: THREE.Object3D | SplatMesh;  // 加载的模型
  format: ModelFormat;                 // 模型格式
  pointCount?: number;                 // 点云数量（仅SplatMesh）
}

/**
 * 统一模型加载器
 */
export class ModelLoader {
  /**
   * 加载模型
   * 
   * @param url 模型URL
   * @param onProgress 进度回调（可选）
   * @returns Promise<LoadResult>
   */
  static async load(
    url: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    const format = this.detectFormat(url);
    
    console.log(`📦 开始加载模型: ${url} (格式: ${format})`);
    
    try {
      switch (format) {
        case 'spz':
          return await this.loadSPZ(url, onProgress);
        case 'glb':
        case 'gltf':
          return await this.loadGLB(url, onProgress);
        case 'ply':
          return await this.loadPLY(url, onProgress);
        default:
          throw new Error(`不支持的格式: ${format}`);
      }
    } catch (error) {
      console.error(`❌ 模型加载失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 检测模型格式
   * 
   * @param url 模型URL
   * @returns 模型格式
   */
  private static detectFormat(url: string): ModelFormat {
    const ext = url.split('.').pop()?.toLowerCase();
    
    if (ext === 'spz') return 'spz';
    if (ext === 'glb') return 'glb';
    if (ext === 'gltf') return 'gltf';
    if (ext === 'ply') return 'ply';
    
    // 默认返回spz
    console.warn(`⚠️ 无法检测格式，默认使用spz: ${url}`);
    return 'spz';
  }

  /**
   * 加载SPZ格式
   * 
   * @param url SPZ文件URL
   * @param onProgress 进度回调
   * @returns Promise<LoadResult>
   */
  private static async loadSPZ(
    url: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    onProgress?.({ progress: 0, stage: 'initializing' });
    
    return new Promise((resolve, reject) => {
      try {
        onProgress?.({ progress: 10, stage: 'loading' });
        
        // 创建SplatMesh（构造函数会自动加载）
        const splat = new SplatMesh({
          url,
          onProgress: (event) => {
            if (event.lengthComputable) {
              const progress = 10 + Math.round((event.loaded / event.total) * 80);
              onProgress?.({ progress, stage: 'loading' });
            }
          }
        });
        
        // 等待初始化完成
        splat.initialized.then(() => {
          onProgress?.({ progress: 100, stage: 'rendering' });
          
          console.log(`✅ SPZ模型加载成功`);
          
          resolve({
            model: splat,
            format: 'spz'
          });
        }).catch(reject);
      } catch (error) {
        console.error('❌ SPZ加载失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 加载GLB/GLTF格式
   * 
   * @param url GLB/GLTF文件URL
   * @param onProgress 进度回调
   * @returns Promise<LoadResult>
   */
  private static async loadGLB(
    url: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    onProgress?.({ progress: 0, stage: 'initializing' });
    
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      
      loader.load(
        url,
        (gltf) => {
          onProgress?.({ progress: 100, stage: 'rendering' });
          
          const model = gltf.scene;
          const format = url.toLowerCase().endsWith('gltf') ? 'gltf' : 'glb';
          
          console.log(`✅ ${format.toUpperCase()}模型加载成功`);
          
          resolve({
            model,
            format: format as ModelFormat
          });
        },
        (xhr) => {
          // 加载进度
          if (xhr.total > 0) {
            const progress = (xhr.loaded / xhr.total) * 100;
            onProgress?.({ progress, stage: 'loading' });
          }
        },
        (error) => {
          console.error('❌ GLB/GLTF加载失败:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 加载PLY格式
   * 
   * @param url PLY文件URL
   * @param onProgress 进度回调
   * @returns Promise<LoadResult>
   */
  private static async loadPLY(
    url: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    onProgress?.({ progress: 0, stage: 'initializing' });
    
    return new Promise((resolve, reject) => {
      const loader = new PLYLoader();
      
      loader.load(
        url,
        (geometry) => {
          onProgress?.({ progress: 80, stage: 'processing' });
          
          // 创建材质
          const material = new THREE.PointsMaterial({
            size: 0.01,
            vertexColors: true
          });
          
          // 创建点云对象
          const points = new THREE.Points(geometry, material);
          
          onProgress?.({ progress: 100, stage: 'rendering' });
          
          console.log(`✅ PLY模型加载成功`);
          
          resolve({
            model: points,
            format: 'ply'
          });
        },
        (xhr) => {
          // 加载进度
          if (xhr.total > 0) {
            const progress = (xhr.loaded / xhr.total) * 100;
            onProgress?.({ progress, stage: 'loading' });
          }
        },
        (error) => {
          console.error('❌ PLY加载失败:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 预加载模型（缓存）
   * 
   * @param url 模型URL
   * @returns Promise<void>
   */
  static async preload(url: string): Promise<void> {
    try {
      await this.load(url);
      console.log(`✅ 模型预加载成功: ${url}`);
    } catch (error) {
      console.warn(`⚠️ 模型预加载失败: ${url}`, error);
    }
  }

  /**
   * 批量预加载模型
   * 
   * @param urls 模型URL数组
   * @returns Promise<void>
   */
  static async preloadBatch(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preload(url));
    await Promise.allSettled(promises);
    console.log(`✅ 批量预加载完成: ${urls.length} 个模型`);
  }
}
