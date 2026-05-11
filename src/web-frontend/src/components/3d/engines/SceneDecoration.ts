/**
 * SceneDecoration - 场景装饰统一组件
 * 
 * 功能：
 * - 粒子背景（ParticleBackground）
 * - 展示台（DisplayPlatform）
 * - 产品标签（ProductLabels）
 * 
 * 设计原则：
 * - 单一职责：专门负责场景装饰
 * - 模块化：三个装饰可独立开关
 * - 可配置：通过配置对象控制所有参数
 * - 可复用：任何Three.js场景都可以使用
 * 
 * 使用示例：
 * ```typescript
 * // 在Base3DViewer中使用
 * const decorations = new SceneDecoration(scene);
 * decorations.apply({
 *   particles: { enabled: true, count: 3000 },
 *   platform: { enabled: true },
 *   labels: { enabled: true, products: [...] }
 * });
 * 
 * // 清理
 * decorations.dispose();
 * ```
 */

import * as THREE from 'three';

// ========== 类型定义 ==========

export interface ProductLabel {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  position?: [number, number, number];
  color?: string;
}

export interface ParticleConfig {
  enabled?: boolean;        // 是否启用，默认false
  count?: number;           // 粒子数量，默认3000
  size?: number;            // 粒子大小，默认0.05
  opacity?: number;         // 透明度，默认0.6
  spread?: number;          // 扩散范围，默认30
  colorRange?: {            // 颜色范围（RGB）
    r: [number, number];    // R通道范围
    g: [number, number];    // G通道范围
    b: [number, number];    // B通道范围
  };
}

export interface PlatformConfig {
  enabled?: boolean;        // 是否启用，默认false
  platformColor?: string;   // 平台颜色，默认'#1a1a2e'
  ringColor?: string;       // 装饰环颜色，默认'#667eea'
  platformY?: number;       // 平台Y轴位置，默认-1
}

export interface LabelsConfig {
  enabled?: boolean;        // 是否启用，默认false
  products?: ProductLabel[];// 产品标签数据
  language?: 'zh' | 'en';   // 语言，默认'zh'
}

export interface DecorationConfig {
  particles?: ParticleConfig;
  platform?: PlatformConfig;
  labels?: LabelsConfig;
}

export interface SceneDecorationAPI {
  /** 应用装饰配置 */
  apply: (config: DecorationConfig) => void;
  
  /** 更新产品标签 */
  updateLabels: (products: ProductLabel[]) => void;
  
  /** 显示/隐藏所有装饰 */
  setVisible: (visible: boolean) => void;
  
  /** 获取装饰引用 */
  getParticles: () => THREE.Points | null;
  getPlatform: () => THREE.Group | null;
  getLabelsGroup: () => THREE.Group | null;
  
  /** 清理所有装饰 */
  dispose: () => void;
}

// ========== 核心类实现 ==========

export class SceneDecoration implements SceneDecorationAPI {
  private scene: THREE.Scene;
  private particles: THREE.Points | null = null;
  private platformGroup: THREE.Group | null = null;
  private labelsGroup: THREE.Group | null = null;
  private currentLanguage: 'zh' | 'en' = 'zh';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🎨 SceneDecoration已初始化');
  }

  /**
   * 应用装饰配置
   */
  apply(config: DecorationConfig): void {
    console.log('🎨 应用场景装饰配置:', config);

    // 粒子背景
    if (config.particles?.enabled) {
      this.createParticles(config.particles);
    } else if (this.particles) {
      this.removeParticles();
    }

    // 展示台
    if (config.platform?.enabled) {
      this.createPlatform(config.platform);
    } else if (this.platformGroup) {
      this.removePlatform();
    }

    // 产品标签
    if (config.labels?.enabled && config.labels.products && config.labels.products.length > 0) {
      this.currentLanguage = config.labels.language || 'zh';
      this.createLabels(config.labels.products);
    } else if (this.labelsGroup) {
      this.removeLabels();
    }
  }

  /**
   * 创建粒子背景
   */
  private createParticles(config: ParticleConfig = {}): void {
    // 如果已存在，先移除
    if (this.particles) {
      this.removeParticles();
    }

    const {
      count = 3000,
      size = 0.1,
      opacity = 0.6,
      spread = 15,
      colorRange = {
        r: [0.4, 0.7],
        g: [0.3, 0.5],
        b: [0.9, 1.0]
      }
    } = config;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 随机位置
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      // 紫色渐变色彩
      colors[i * 3] = colorRange.r[0] + Math.random() * (colorRange.r[1] - colorRange.r[0]);
      colors[i * 3 + 1] = colorRange.g[0] + Math.random() * (colorRange.g[1] - colorRange.g[0]);
      colors[i * 3 + 2] = colorRange.b[0] + Math.random() * (colorRange.b[1] - colorRange.b[0]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.name = 'particles';  // ✅ 对齐V2
    this.scene.add(this.particles);

    console.log(`✨ 粒子背景已创建 (${count}个粒子)`);
  }

  /**
   * 移除粒子背景
   */
  private removeParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
      console.log('🗑️ 粒子背景已移除');
    }
  }

  /**
   * 创建展示台
   */
  private createPlatform(config: PlatformConfig = {}): void {
    // 如果已存在，先移除
    if (this.platformGroup) {
      this.removePlatform();
    }

    const {
      platformColor = '#1a1a2e',
      ringColor = '#667eea',
      platformY = -1
    } = config;

    // 平台主体（圆柱体）
    const platformGeometry = new THREE.CylinderGeometry(0.8, 1, 0.3, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: platformColor,
      metalness: 0.8,
      roughness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = platformY;
    platform.name = 'platform';

    // 装饰环
    const ringGeometry = new THREE.RingGeometry(0.9, 0.95, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = platformY + 0.15;
    ring.name = 'ring';
    
    // 放到同一个Group，然后将Group添加到场景
    this.platformGroup = new THREE.Group();
    this.platformGroup.add(platform);
    this.platformGroup.add(ring);
    this.platformGroup.name = 'scene-decoration-platform';
    this.scene.add(this.platformGroup);
    console.log('🏛️ 展示台已创建');
  }

  /**
   * 移除展示台
   */
  private removePlatform(): void {
    if (this.platformGroup) {
      this.scene.remove(this.platformGroup);
      this.platformGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      this.platformGroup = null;
      console.log('🗑️ 展示台已移除');
    }
  }

  /**
   * 创建产品标签
   */
  private createLabels(products: ProductLabel[]): void {
    // 如果已存在，先移除
    if (this.labelsGroup) {
      this.removeLabels();
    }

    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'scene-decoration-labels';
    // ★ 修复：标签创建后默认可见（原为隐藏等待模型加载后显示，但 Spark 错误时会永久隐藏）
    this.labelsGroup.visible = true;
    this.scene.add(this.labelsGroup);

    // 为每个产品创建标签
    products.forEach(product => {
      const label = this.createLabelSprite(product);
      this.labelsGroup!.add(label);
    });

    console.log(`🏷️ 产品标签已创建 (${products.length}个)`);
  }

  /**
   * 创建单个标签精灵
   */
  private createLabelSprite(product: ProductLabel): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = product.color || '#667eea';
    ctx.lineWidth = 3;
    
    // 圆角矩形
    if (ctx.roundRect) {
      ctx.roundRect(3, 3, 250, 122, 14);
    } else {
      ctx.rect(3, 3, 250, 122);
    }
    ctx.fill();
    ctx.stroke();

    // 产品名称
    const displayName = this.currentLanguage === 'zh' 
      ? (product.name || product.nameEn || '') 
      : (product.nameEn || product.name || '');
    
    const displayDesc = this.currentLanguage === 'zh'
      ? (product.description || product.descriptionEn || '')
      : (product.descriptionEn || product.description || '');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 128, 40);

    // 描述（最多两行）
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const lines = this.wrapText(ctx, displayDesc, 220);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 128, 65 + i * 22);
    });

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(
      product.position?.[0] || 0,
      product.position?.[1] || 0,
      product.position?.[2] || 0
    );
    sprite.scale.set(1, 0.5, 1);
    sprite.name = `product-label-${product.id}`;

    return sprite;
  }

  /**
   * 文字换行辅助函数
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * 移除产品标签
   */
  private removeLabels(): void {
    if (this.labelsGroup) {
      this.scene.remove(this.labelsGroup);
      
      // 清理材质
      this.labelsGroup.traverse((child) => {
        if (child instanceof THREE.Sprite && child.material) {
          child.material.dispose();
        }
      });
      
      this.labelsGroup = null;
      console.log('🗑️ 产品标签已移除');
    }
  }

  /**
   * 更新产品标签
   */
  updateLabels(products: ProductLabel[]): void {
    if (!this.labelsGroup) {
      console.warn('⚠️ 标签组不存在，无法更新');
      return;
    }

    // 清空现有标签
    while (this.labelsGroup.children.length > 0) {
      const child = this.labelsGroup.children[0];
      this.labelsGroup.remove(child);
      if (child instanceof THREE.Sprite && child.material) {
        child.material.dispose();
      }
    }

    // 添加新标签
    products.forEach(product => {
      const label = this.createLabelSprite(product);
      this.labelsGroup!.add(label);
    });

    console.log(`🔄 产品标签已更新 (${products.length}个)`);
  }

  /**
   * 显示/隐藏所有装饰
   */
  setVisible(visible: boolean): void {
    if (this.particles) {
      this.particles.visible = visible;
    }
    if (this.platformGroup) {
      this.platformGroup.visible = visible;
    }
    if (this.labelsGroup) {
      this.labelsGroup.visible = visible;
    }
    console.log(`👁️ 装饰可见性: ${visible ? '显示' : '隐藏'}`);
  }

  /**
   * 显示产品标签（加载完成后调用）
   */
  showLabels(): void {
    if (this.labelsGroup) {
      this.labelsGroup.visible = true;
      console.log('🏷️ 产品标签已显示');
    }
  }

  /**
   * 隐藏产品标签
   */
  hideLabels(): void {
    if (this.labelsGroup) {
      this.labelsGroup.visible = false;
      console.log('🏷️ 产品标签已隐藏');
    }
  }

  // ========== Getter方法 ==========

  getParticles(): THREE.Points | null {
    return this.particles;
  }

  getPlatform(): THREE.Group | null {
    return this.platformGroup;
  }

  getLabelsGroup(): THREE.Group | null {
    return this.labelsGroup;
  }

  /**
   * 清理所有装饰资源
   */
  dispose(): void {
    console.log('🧹 清理场景装饰...');
    this.removeParticles();
    this.removePlatform();
    this.removeLabels();
    console.log('✅ 场景装饰已完全清理');
  }
}

export default SceneDecoration;
