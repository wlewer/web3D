/**
 * 统一模型加载器 - ModelLoader
 * 
 * 功能：支持多种3D模型格式的统一加载
 * 支持的格式：SPZ、GLB、GLTF、PLY、STL、OBJ
 * 特点：
 * - 统一的进度回调
 * - 自动格式检测
 * - GLB加载失败时自动回退到ZIP/OBJ检测
 * - 错误处理
 * - 可复用
 */

import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export type ModelFormat = 'spz' | 'glb' | 'gltf' | 'ply' | 'stl' | 'obj';

export interface LoadProgress {
  progress: number;      // 进度百分比（0-100）
  stage: 'initializing' | 'loading' | 'processing' | 'rendering';  // 加载阶段
}

export interface LoadResult {
  model: THREE.Object3D | SplatMesh;  // 加载的模型
  format: ModelFormat;                 // 模型格式
  pointCount?: number;                 // 点云数量（仅SplatMesh）
}

/** ZIP条目 */
interface ZipEntry {
  name: string;
  data: ArrayBuffer;
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
          // GLB加载失败时自动回退到ZIP/OBJ检测
          return await this.loadGLBWithFallback(url, onProgress);
        case 'ply':
          return await this.loadPLY(url, onProgress);
        case 'stl':
          return await this.loadSTL(url, onProgress);
        case 'obj':
          return await this.loadOBJ(url, onProgress);
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
    if (ext === 'stl') return 'stl';
    if (ext === 'obj') return 'obj';

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
          
          // ★ 关键修复：SplatMesh默认可能是倒立的，需要翻转
          // 绕X轴旋转180度（π弧度）使其正向显示
          splat.rotation.x = Math.PI;
          console.log('🔄 SplatMesh已翻转（绕X轴180度）');
          
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
   * 加载STL格式
   * 
   * @param url STL文件URL
   * @param onProgress 进度回调
   * @returns Promise<LoadResult>
   */
  private static async loadSTL(
    url: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    onProgress?.({ progress: 0, stage: 'initializing' });
    
    return new Promise((resolve, reject) => {
      const loader = new STLLoader();
      
      loader.load(
        url,
        (geometry) => {
          onProgress?.({ progress: 80, stage: 'processing' });
          
          // 计算边界盒用于居中
          geometry.computeBoundingBox();
          
          // 创建材质 - STL通常不含颜色信息，使用默认材质
          const material = new THREE.MeshStandardMaterial({
            color: 0x8a9df0,
            roughness: 0.6,
            metalness: 0.2,
            side: THREE.DoubleSide,
          });
          
          // 创建网格对象
          const mesh = new THREE.Mesh(geometry, material);
          
          // 自动居中
          if (geometry.boundingBox) {
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            mesh.position.sub(center);
          }
          
          onProgress?.({ progress: 100, stage: 'rendering' });
          
          console.log(`✅ STL模型加载成功`);
          
          resolve({
            model: mesh,
            format: 'stl'
          });
        },
        (xhr) => {
          if (xhr.total > 0) {
            const progress = (xhr.loaded / xhr.total) * 100;
            onProgress?.({ progress, stage: 'loading' });
          }
        },
        (error) => {
          console.error('❌ STL加载失败:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 加载OBJ格式
   *
   * @param url OBJ文件URL
   * @param onProgress 进度回调
   * @returns Promise<LoadResult>
   */
  private static async loadOBJ(
    url: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    onProgress?.({ progress: 0, stage: 'initializing' });

    return new Promise((resolve, reject) => {
      const loader = new OBJLoader();
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
      if (baseUrl) loader.setResourcePath(baseUrl);

      onProgress?.({ progress: 20, stage: 'loading' });

      loader.load(
        url,
        (object) => {
          onProgress?.({ progress: 100, stage: 'rendering' });
          console.log('✅ OBJ模型加载成功');
          resolve({ model: object, format: 'obj' });
        },
        (xhr) => {
          if (xhr.total > 0) {
            const pct = (xhr.loaded / xhr.total) * 100;
            onProgress?.({ progress: pct, stage: 'loading' });
          }
        },
        (error) => {
          console.error('❌ OBJ加载失败:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 加载GLB并自动回退到ZIP/OBJ检测
   *
   * 流程：
   * 1. 先尝试标准GLTFLoader加载
   * 2. 失败后检测是否为ZIP文件（PK\x03\x04magic）
   * 3. 如果是ZIP，解析并提取OBJ文件
   * 4. 支持MTL材质和纹理贴图
   *
   * @param url GLB/GLTF文件URL
   * @param onProgress 进度回调
   * @returns Promise<LoadResult>
   */
  private static async loadGLBWithFallback(
    url: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    onProgress?.({ progress: 0, stage: 'initializing' });

    // ① 先尝试标准GLB加载
    try {
      return await this.loadGLB(url, onProgress);
    } catch (glbError) {
      console.warn('⚠️ GLB加载失败，尝试ZIP/OBJ回退:', glbError);
    }

    // ② GLB失败，下载文件检测是否为ZIP
    onProgress?.({ progress: 5, stage: 'loading' });
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // 检查ZIP魔数: PK\x03\x04 (LE uint32 = 0x04034b50)
    const magic = new DataView(buffer.slice(0, 4)).getUint32(0, true);
    if (magic !== 0x04034b50) {
      throw new Error(`GLB加载失败，且文件不是ZIP格式 (magic: 0x${magic.toString(16)})`);
    }

    onProgress?.({ progress: 10, stage: 'processing' });

    // ③ 解析ZIP并加载OBJ
    return await this.loadOBJFromZip(buffer, onProgress);
  }

  /**
   * 从ZIP数据中加载OBJ模型（支持MTL材质 + 纹理贴图）
   *
   * @param buffer ZIP文件的ArrayBuffer
   * @param onProgress 进度回调
   * @returns Promise<LoadResult>
   */
  private static async loadOBJFromZip(
    buffer: ArrayBuffer,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadResult> {
    const entries = await this.extractZip(buffer);

    // 查找OBJ文件
    const objEntry = entries.find(e => /\.obj$/i.test(e.name));
    if (!objEntry) {
      throw new Error('ZIP文件中未找到OBJ文件（支持.obj格式）');
    }

    // 查找MTL文件
    const mtlEntry = entries.find(e => /\.mtl$/i.test(e.name));

    onProgress?.({ progress: 30, stage: 'processing' });

    // 为所有文件创建blob URL
    const fileBlobUrls = new Map<string, string>();
    let mtlBlobUrl: string | null = null; // ★ 在try外部声明，finally中可访问
    try {
      for (const entry of entries) {
        const blob = new Blob([entry.data]);
        fileBlobUrls.set(entry.name, URL.createObjectURL(blob));
      }

      // 处理MTL中的纹理路径 → 替换为blob URL
      if (mtlEntry) {
        const mtlText = new TextDecoder().decode(new Uint8Array(mtlEntry.data));
        const baseDir = mtlEntry.name.includes('/')
          ? mtlEntry.name.substring(0, mtlEntry.name.lastIndexOf('/') + 1)
          : '';

        const modifiedLines = mtlText.split('\n').map(line => {
          const match = line.match(/^(map_\w+)\s+(.+)$/i);
          if (match) {
            const [, directive, texturePath] = match;
            const resolvedPath = texturePath.startsWith('/') || texturePath.includes('://')
              ? texturePath
              : baseDir + texturePath;
            const cleanPath = resolvedPath.replace(/^\.\//, '');
            const blobUrl = fileBlobUrls.get(cleanPath);
            if (blobUrl) return `${directive} ${blobUrl}`;
          }
          return line;
        });

        const modifiedBlob = new Blob([modifiedLines.join('\n')], { type: 'text/plain' });
        mtlBlobUrl = URL.createObjectURL(modifiedBlob);
      }

      onProgress?.({ progress: 50, stage: 'processing' });

      // 加载OBJ（带材质支持）
      const objBlobUrl = fileBlobUrls.get(objEntry.name)!;
      const object = await new Promise<THREE.Group>((resolve, reject) => {
        const loader = new OBJLoader();

        if (mtlBlobUrl) {
          const mtlLoader = new MTLLoader();
          mtlLoader.load(
            mtlBlobUrl,
            (materials) => {
              loader.setMaterials(materials);
              loader.load(objBlobUrl, resolve, undefined, reject);
            },
            undefined,
            () => {
              console.warn('⚠️ MTL加载失败，尝试无材质加载OBJ');
              loader.load(objBlobUrl, resolve, undefined, reject);
            }
          );
        } else {
          loader.load(objBlobUrl, resolve, undefined, reject);
        }
      });

      onProgress?.({ progress: 100, stage: 'rendering' });
      console.log(`✅ ZIP/OBJ模型加载成功 (${entries.length} 个文件)`);
      return { model: object, format: 'obj' };
    } finally {
      // 清理blob URL
      for (const url of fileBlobUrls.values()) {
        URL.revokeObjectURL(url);
      }
      if (mtlBlobUrl) URL.revokeObjectURL(mtlBlobUrl);
    }
  }

  /**
   * 解析ZIP文件，提取所有文件条目
   * 支持存储（method 0）和Deflate（method 8）压缩
   *
   * @param buffer ZIP文件的ArrayBuffer
   * @returns 文件条目列表
   */
  private static async extractZip(buffer: ArrayBuffer): Promise<ZipEntry[]> {
    const entries: ZipEntry[] = [];
    const view = new DataView(buffer);
    let offset = 0;

    while (offset < buffer.byteLength - 30) {
      const signature = view.getUint32(offset, true);
      if (signature !== 0x04034b50) break; // 不是本地文件头

      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraFieldLength = view.getUint16(offset + 28, true);

      const fileName = new TextDecoder().decode(
        new Uint8Array(buffer, offset + 30, fileNameLength)
      );
      const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

      let data: ArrayBuffer;
      if (compressionMethod === 0) {
        data = buffer.slice(dataOffset, dataOffset + compressedSize);
      } else if (compressionMethod === 8) {
        const raw = new Uint8Array(buffer, dataOffset, compressedSize);
        data = await this.decompressDeflate(raw);
      } else {
        console.warn(`⚠️ 跳过不支持的压缩方法: ${fileName} (method=${compressionMethod})`);
        offset = dataOffset + compressedSize;
        continue;
      }

      // 跳过目录条目
      if (fileName.endsWith('/')) {
        offset = dataOffset + compressedSize;
        continue;
      }

      entries.push({ name: fileName, data });
      offset = dataOffset + compressedSize;
    }

    console.log(`📦 ZIP解析完成: ${entries.length} 个条目`);
    return entries;
  }

  /**
   * 解压Deflate数据
   * 使用浏览器内置的 DecompressionStream API
   *
   * @param compressedData 压缩数据
   * @returns 解压后的ArrayBuffer
   */
  private static async decompressDeflate(
    compressedData: Uint8Array
  ): Promise<ArrayBuffer> {
    // DecompressionStream 需要 DOM lib 支持
    const DecompressionStreamCtor = (typeof DecompressionStream !== 'undefined')
      ? DecompressionStream
      : null;
    if (DecompressionStreamCtor === null) {
      throw new Error('当前浏览器不支持Deflate解压（缺少DecompressionStream API）');
    }

    const ds = new DecompressionStreamCtor('deflate-raw');
    const writer = ds.writable.getWriter();
    await writer.write(compressedData as any);
    await writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }

    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }
    return result.buffer;
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
