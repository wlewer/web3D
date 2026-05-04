// UniversalGaussianCard V2.0 - 融合版3D查看器组件
// 融合SparkViewer的鲁棒性 + UniversalGaussianCard的智能居中算法
import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { Tween, Easing } from '@tweenjs/tween.js';
import { useTranslation } from '../../i18n';
import './UniversalGaussianCardV2.css';

// ========== 类型定义 ==========

export type LayoutMode = 
  | 'featured'    // 首页：全屏展示 + 装饰效果
  | 'grid'        // 网格：2行3列卡片（默认）
  | 'list'        // 列表：单列卡片
  | 'carousel'    // 轮播：横向滑动
  | 'gallery'     // 画廊：瀑布流布局
  | 'compact'     // 紧凑：小卡片（150x150）
  | 'modal'       // 弹框：全屏查看
  | 'custom';     // 自定义：父容器控制

export interface ProductLabel {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  position?: [number, number, number];
  color?: string;
}

export interface FitConfig {
  margin: number;           // 相机距离倍数
  trimThreshold: number;    // 百分位裁剪阈值
  preferAxis: 'auto' | 'x' | 'y' | 'z';  // 主导维度
  autoCenter: boolean;      // 是否自动居中
}

export interface CameraConfig {
  position: [number, number, number];  // 相机位置
  target: [number, number, number];    // 观察点
  zoom: number;                        // 缩放级别
}

export interface UniversalGaussianCardProps {
  // ========== 核心必选 ==========
  modelUrl: string;  // 模型URL（SPZ或GLB）
  
  // ========== 布局控制 ==========
  layout?: LayoutMode;  // 默认 'grid'
  
  // ========== 相机控制 ==========
  autoCenter?: boolean;     // 是否智能居中，默认 true
  margin?: number;          // 相机距离倍数，默认 2.5
  autoRotate?: boolean;     // 自动旋转，默认 true
  enableControls?: boolean; // 启用控制器，默认 true
  
  // ========== 场景装饰 ==========
  showParticles?: boolean;  // 粒子背景，默认 layout==='featured'
  showPlatform?: boolean;   // 展示台，默认 layout==='featured'
  products?: ProductLabel[];// 产品标签数据
  
  // ========== UI显示 ==========
  showTitle?: boolean;      // 标题叠加层，默认 true
  title?: string;           // 标题文本
  subtitle?: string;        // 副标题文本
  showStats?: boolean;      // 统计信息，默认 true
  backgroundColor?: string; // 背景色，默认 '#0a0a0f'
  
  // ========== 相机配置保存 ==========
  onCameraConfigSave?: (config: CameraConfig) => void;  // 保存相机配置回调
  customCameraConfig?: CameraConfig | null;              // 自定义相机配置（优先使用）
  
  // ========== 事件回调 ==========
  onClick?: () => void;                // 单击
  onDoubleClick?: () => void;          // 双击
  onLoadComplete?: () => void;         // 加载完成
  onProgress?: (progress: number) => void; // 加载进度
  onError?: (error: Error) => void;    // 加载错误
  onInteraction?: () => void;          // 用户交互
}

export interface UniversalGaussianCardRef {
  getModel: () => THREE.Object3D | SplatMesh | null;
  getStats: () => {
    pointCount: number;
    loaded: boolean;
    loading: boolean;
    progress: number;
    fps: number;
  };
  reload: () => void;
  toggleAutoRotate: () => void;
  screenshot: () => string;
  dispose: () => void;
  // ★ 新增：相机配置管理
  saveCameraConfig: () => CameraConfig;           // 保存当前相机配置
  loadCameraConfig: (config: CameraConfig) => void; // 加载相机配置
  resetCamera: () => void;                         // 重置相机到默认位置
}

// ========== 主组件 ==========

export const UniversalGaussianCardV2 = forwardRef<UniversalGaussianCardRef, UniversalGaussianCardProps>(({
  modelUrl,
  layout = 'grid',
  autoCenter = true,
  margin = 2.5,
  autoRotate = true,
  enableControls = true,
  showParticles,
  showPlatform,
  products = [],
  showTitle = true,
  title,
  subtitle,
  showStats = true,
  backgroundColor = '#0a0a0f',
  // onCameraConfigSave,  // 暂未使用，保留以便将来扩展
  customCameraConfig = null,
  onClick,
  onDoubleClick,
  onLoadComplete,
  // onProgress,  // 暂未使用，保留以便将来扩展
  onError,
  onInteraction,
}, ref) => {
  const { language } = useTranslation();  // 移除未使用的t
  const isZh = language === 'zh-CN';
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sparkRef = useRef<SparkRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | SplatMesh | null>(null);
  const frameIdRef = useRef<number>(0);
  const labelsGroupRef = useRef<THREE.Group | null>(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);  // ★ 新增：相机就绪状态
  const [fps, setFps] = useState(0);
  const [loadingStage, setLoadingStage] = useState<'initializing' | 'loading' | 'processing' | 'rendering'>('initializing');
  const [isFadingOut, setIsFadingOut] = useState(false);  // 加载完成淡出状态
  
  // ========== 状态机管理（核心重构） ==========
  
  /**
   * 组件状态枚举
   * UNINITIALIZED: 未初始化
   * INITIALIZING: 初始化中
   * READY: 就绪（等待加载模型）
   * LOADING: 加载中
   * LOADED: 已加载
   * ERROR: 错误
   */
  type ComponentState = 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'LOADING' | 'LOADED' | 'ERROR';
  
  interface StateMachine {
    state: ComponentState;
    currentModelUrl: string;  // 当前正在加载的URL
  }
  
  const [stateMachine, setStateMachine] = useState<StateMachine>({
    state: 'UNINITIALIZED',
    currentModelUrl: ''
  });
  
  const fpsCounterRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: performance.now() });
  const isInteractingRef = useRef(false);
  const sparkReadyRef = useRef(false);
  const sparkFailedRef = useRef(false);
  const renderingLockRef = useRef(false);

  // 默认装饰配置
  const defaultShowParticles = showParticles ?? layout === 'featured';
  const defaultShowPlatform = showPlatform ?? layout === 'featured';

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getModel: () => modelRef.current,
    getStats: () => ({
      pointCount: 0,
      loaded: modelLoaded,
      loading,
      progress,
      fps,
    }),
    reload: () => {
      if (modelRef.current) {
        try {
          (modelRef.current as any).dispose?.();
        } catch (e) {
          console.warn('模型清理警告:', e);
        }
        modelRef.current = null;
      }
      loadModel();
    },
    toggleAutoRotate: () => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = !controlsRef.current.autoRotate;
      }
    },
    screenshot: () => {
      if (rendererRef.current) {
        rendererRef.current.render(sceneRef.current!, cameraRef.current!);
        return rendererRef.current.domElement.toDataURL('image/png');
      }
      return '';
    },
    dispose: () => {
      cancelAnimationFrame(frameIdRef.current);
      if (modelRef.current) {
        try {
          (modelRef.current as any).dispose?.();
        } catch (e) {
          console.warn('模型清理警告:', e);
        }
      }
      if (sparkRef.current) {
        sparkRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    },
    // ★ 新增：保存当前相机配置
    saveCameraConfig: (): CameraConfig => {
      if (!cameraRef.current || !controlsRef.current) {
        throw new Error('相机或控制器未初始化');
      }
      
      const config: CameraConfig = {
        position: [
          cameraRef.current.position.x,
          cameraRef.current.position.y,
          cameraRef.current.position.z
        ],
        target: [
          controlsRef.current.target.x,
          controlsRef.current.target.y,
          controlsRef.current.target.z
        ],
        zoom: cameraRef.current.zoom
      };
      
      console.log('📸 保存相机配置:', config);
      return config;
    },
    // ★ 新增：加载相机配置（带平滑过渡）
    loadCameraConfig: (config: CameraConfig): void => {
      if (!cameraRef.current || !controlsRef.current) {
        console.warn('️ 相机或控制器未初始化，无法加载配置');
        return;
      }
      
      console.log('📥 加载相机配置（平滑过渡）:', config);
      
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      
      // 保存起始位置
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();
      const startZoom = camera.zoom;
      
      // 目标位置
      const targetPosition = new THREE.Vector3(
        config.position[0],
        config.position[1],
        config.position[2]
      );
      const targetTarget = new THREE.Vector3(
        config.target[0],
        config.target[1],
        config.target[2]
      );
      const targetZoom = config.zoom;
      
      // 计算相机移动距离，根据距离动态调整动画时长
      const distance = startPosition.distanceTo(targetPosition);
      const duration = Math.min(Math.max(distance * 500, 600), 1200); // 600ms-1200ms
      
      console.log(`🎬 开始相机过渡动画，距离: ${distance.toFixed(2)}, 时长: ${duration}ms`);
      
      // 使用Tween.js实现平滑过渡
      const tweenData = { t: 0 };
      
      new Tween(tweenData)
        .to({ t: 1 }, duration)
        .easing(Easing.Quadratic.InOut) // 缓入缓出
        .onUpdate(() => {
          // 插值计算相机位置
          camera.position.lerpVectors(startPosition, targetPosition, tweenData.t);
          
          // 插值计算控制器target
          controls.target.lerpVectors(startTarget, targetTarget, tweenData.t);
          controls.update();
          
          // 插值计算缩放
          camera.zoom = startZoom + (targetZoom - startZoom) * tweenData.t;
          camera.updateProjectionMatrix();
        })
        .onComplete(() => {
          console.log('✅ 相机配置平滑过渡完成:', config);
        })
        .start();
      
      // 在动画循环中更新Tween
      const animate = () => {
        if (tweenData.t < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    },
    // ★ 新增：重置相机到默认位置
    resetCamera: (): void => {
      if (!cameraRef.current || !controlsRef.current || !modelRef.current) {
        console.warn('⚠️ 相机、控制器或模型未初始化');
        return;
      }
      
      console.log('🔄 重置相机到默认位置');
      
      // 重新执行智能居中算法
      if (canvasRef.current) {
        smartFitCameraToObject(
          modelRef.current,
          cameraRef.current,
          canvasRef.current,
          {
            margin: margin,
            trimThreshold: 0.05,
            preferAxis: 'auto',
            autoCenter: true
          }
        );
      }
      
      console.log('✅ 相机已重置');
    },
  }));

  // ========== 智能居中算法（核心） ==========

  // 百分位数裁剪（仅GLB模型）
  const trimEmptySpace = useCallback(
    (object: THREE.Object3D, originalBox: THREE.Box3, threshold: number): THREE.Vector3 => {
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
    },
    []
  );

  // 智能自适应居中算法
  const smartFitCameraToObject = useCallback(
    (object: THREE.Object3D | SplatMesh, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, config: FitConfig) => {
      console.log(' 开始智能居中算法...');
      
      // 关键修复：初始化size和center，避免undefined错误
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
            console.log(' SplatMesh包围盒尺寸:', size.toArray());
          } else {
            // 包围盒无效，使用扩展固定包围盒
            console.log(' 包围盒无效，使用扩展固定包围盒');
            boundingBox = new THREE.Box3(
              new THREE.Vector3(-3, -3, -3),
              new THREE.Vector3(3, 3, 3)
            );
            size = boundingBox.getSize(new THREE.Vector3());
            center = boundingBox.getCenter(new THREE.Vector3());
          }
        } else {
          // GLB模型：使用标准方法
          console.log(' GLB模型：使用标准包围盒计算');
          boundingBox = new THREE.Box3().setFromObject(object);
          size = boundingBox.getSize(new THREE.Vector3());
          center = boundingBox.getCenter(new THREE.Vector3());
        }
        
        console.log(' 模型包围盒:', { size: size.toArray(), center: center.toArray() });

        // 安全检查：确保size和center有效
        if (size.x === 0 && size.y === 0 && size.z === 0) {
          console.log('⚠️ 包围盒无效，使用默认尺寸');
          size.set(1, 1, 1);
          center.set(0, 0, 0);
        }
      } catch (error) {
        console.error(' 计算包围盒失败:', error);
        // 使用默认值
        size.set(1, 1, 1);
        center.set(0, 0, 0);
      }

      // Step 2: 智能裁剪空白区域（仅GLB模型）
      let trimmedSize: THREE.Vector3;
      if (object instanceof SplatMesh) {
        // SplatMesh：跳过裁剪，直接使用包围盒
        console.log('️ SplatMesh：跳过裁剪');
        trimmedSize = size;
      } else {
        // GLB模型：执行百分位裁剪
        console.log('✂️ GLB模型：执行百分位裁剪');
        trimmedSize = trimEmptySpace(object, boundingBox, config.trimThreshold);
        console.log('✂️ 裁剪后尺寸:', trimmedSize.toArray());
      }

      // Step 3: 计算最佳相机距离（关键优化：大幅减小margin，让模型显示更大更清晰）
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      const aspect = canvasWidth / canvasHeight;
      const fovRad = camera.fov * Math.PI / 180;
      
      console.log(' 画布尺寸:', { canvasWidth, canvasHeight, aspect, fov: camera.fov });
      
      // 根据画布比例选择主导维度
      const dominantSize = Math.max(trimmedSize.x, trimmedSize.y, trimmedSize.z);
      
      // 计算相机距离（关键优化：直接使用目标距离，不再尝试保持当前距离）
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

      // Step 4: 相机从正面稍偏上的位置观察，避免倒立
      // 关键修复：相机在Z轴正方向，Y轴稍微向上偏移
      const cameraOffset = new THREE.Vector3(0, distance * 0.15, distance); // 从正面偏上观察
      console.log(' 相机从正面偏上观察（避免倒立）');
      console.log('📷 相机偏移:', cameraOffset.toArray());

      // Step 5: 设置相机位置和朝向（关键优化：直接设置，完全移除插值动画）
      // 关键修复：不再使用插值动画，直接设置相机位置，避免多次跳变
      camera.up.set(0, 1, 0); // 先设置up向量
      
      // 计算目标位置
      const targetPosition = new THREE.Vector3(
        center.x,
        center.y + distance * 0.15,
        center.z + distance
      );
      
      // 直接设置相机位置，不使用任何动画
      camera.position.copy(targetPosition);
      console.log('📷 相机位置已设置:', targetPosition.toArray());
      
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      
      console.log('📷 相机位置:', camera.position.toArray());
      console.log('🎯 观察目标:', center.toArray());
      console.log(' 相机已设置，up向量: (0, 1, 0)');

      // Step 6: 模型保持原始姿态，不做任何旋转
      // 关键：不修改模型旋转，让相机角度自然观察
      // ★ 修复：不要强制重置旋转，保留模型原始姿态（某些GLB模型可能有自带的旋转）
      if (!(object instanceof SplatMesh)) {
        // 只记录日志，不修改旋转
        console.log(' GLB模型保持原始姿态:', {
          rotation: object.rotation.toArray(),
          quaternion: object.quaternion.toArray()
        });
      } else {
        console.log(' SplatMesh模型保持原始姿态');
      }

      // 关键修复：同步控制器target到模型中心（必须在lookAt之后）
      if (controlsRef.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
        console.log('🎯 控制器target已同步到模型中心:', center.toArray());
      }

      console.log('✅ 居中算法完成');
      return { center, distance, trimmedSize };
    },
    [trimEmptySpace]
  );

  // ========== 场景装饰 ==========

  // 创建粒子背景
  const createParticleBackground = useCallback((scene: THREE.Scene) => {
    const particleCount = 3000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      // 紫色渐变
      colors[i * 3] = 0.4 + Math.random() * 0.3; // R
      colors[i * 3 + 1] = 0.3 + Math.random() * 0.2; // G
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1; // B
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'particles';
    scene.add(particles);
  }, []);

  // 创建展示台
  const createDisplayPlatform = useCallback((scene: THREE.Scene) => {
    // 平台
    const platformGeometry = new THREE.CylinderGeometry(0.8, 1, 0.3, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: '#1a1a2e',
      metalness: 0.8,
      roughness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -1;
    platform.name = 'platform';
    scene.add(platform);

    // 装饰环
    const ringGeometry = new THREE.RingGeometry(0.9, 0.95, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#667eea',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.85;
    ring.name = 'ring';
    scene.add(ring);
  }, []);

  // 创建产品3D标签精灵（参考SparkViewer）
  const create3DLabel = useCallback((
    product: ProductLabel,
    position: [number, number, number]
  ): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = product.color || '#667eea';
    ctx.lineWidth = 3;
    ctx.roundRect(3, 3, 250, 122, 14);
    ctx.fill();
    ctx.stroke();

    // 产品名称
    const displayName = isZh ? (product.name || product.nameEn || '') : (product.nameEn || product.name || '');
    const displayDesc = isZh ? (product.description || product.descriptionEn || '') : (product.descriptionEn || product.description || '');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(displayName, 128, 40);

    // 描述（最多两行）
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const lines = wrapText(ctx, displayDesc, 220);
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
    sprite.position.set(...position);
    sprite.scale.set(1, 0.5, 1);
    sprite.name = `product-label-${product.id}`;

    return sprite;
  }, [isZh]);

  // 文字换行辅助函数
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
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
  };

  // ========== 场景初始化 ==========

  const initScene = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return false;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // 关键修复：添加灯光系统，照亮模型
    // 环境光 - 基础照明
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);

    // 主方向光 - 从右上方照射，产生立体感
    const mainLight = new THREE.DirectionalLight('#ffffff', 1.2);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = false;
    scene.add(mainLight);

    // 补光 - 从左下方照射，减少阴影
    const fillLight = new THREE.DirectionalLight('#aabbff', 0.4);
    fillLight.position.set(-3, -2, -3);
    scene.add(fillLight);

    // 顶部光 - 增强立体感
    const topLight = new THREE.DirectionalLight('#ffffff', 0.3);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    // 半球光 - 模拟天空和地面的反射
    const hemisphereLight = new THREE.HemisphereLight('#667eea', '#1a1a2e', 0.3);
    scene.add(hemisphereLight);

    console.log(' 灯光系统已初始化');
    console.log(' 环境光: 0.6');
    console.log(' 主方向光: 1.2 (右上方)');
    console.log(' 补光: 0.4 (左下方)');
    console.log(' 顶部光: 0.3 (正上方)');
    console.log(' 半球光: 0.3 (天空-地面)');

    // 创建相机（关键优化：使用更合理的初始位置，减少加载后的视觉跳跃）
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    // 初始位置：从正面稍微偏上观察，使用适中的距离（4单位）
    // 这个距离接近大多数模型的预期距离（3-5单位），减少跳变
    camera.position.set(0, 0.6, 4);
    camera.up.set(0, 1, 0); // Y轴向上
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 处理 WebGL Context Lost 事件
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('⚠️ WebGL Context Lost');
      cancelAnimationFrame(frameIdRef.current);
      sparkFailedRef.current = true;
    };

    const handleContextRestored = () => {
      console.log('✅ WebGL Context Restored');
      sparkFailedRef.current = false;
      // 重新初始化
      const result = initScene();
      if (result) {
        loadModel();
        animate();
      }
    };

    canvasRef.current.addEventListener('webglcontextlost', handleContextLost);
    canvasRef.current.addEventListener('webglcontextrestored', handleContextRestored);

    // 创建SparkRenderer
    const spark = new SparkRenderer({ renderer });
    sparkRef.current = spark;
    scene.add(spark);

    // 添加控制器
    if (enableControls) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;  // 优化：使用标准阻尼值，平衡平滑性和响应性
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1;
      
      // 关键优化：立即设置控制器目标点，防止加载过程中相机跳动
      controls.target.set(0, 0, 0);  // 目标点设为原点
      controls.update();  // 立即更新控制器状态
      
      // 关键优化：加载过程中禁用控制器交互，防止相机位置被修改
      controls.enabled = false;  // 初始禁用
      
      // 仰角限制 - 根据布局模式调整
      if (layout === 'featured') {
        // featured模式：完全放开限制，允许360度自由旋转（包括上下）
        controls.minPolarAngle = 0;           // 最小0度（从正上方）
        controls.maxPolarAngle = Math.PI;     // 最大180度（从正下方）
      } else {
        // 其他布局模式：保留适度限制
        controls.minPolarAngle = Math.PI / 4;      // 最小45度
        controls.maxPolarAngle = Math.PI / 2.5;    // 最大72度
      }
      
      // 水平360度自由旋转
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      
      controls.enablePan = false; // 禁止平移，保持模型居中
      
      controlsRef.current = controls;
    }

    // ★ 标记相机和控制器已就绪
    setCameraReady(true);
    console.log(' [相机配置] 相机和控制器已初始化完成');

    // 添加场景装饰
    if (defaultShowParticles) {
      createParticleBackground(scene);
    }
    if (defaultShowPlatform) {
      createDisplayPlatform(scene);
    }

    // 创建产品标签组（3D空间）
    if (products.length > 0) {
      const labelsGroup = new THREE.Group();
      labelsGroup.name = 'product-labels';
      labelsGroup.visible = false;  // 关键优化：初始隐藏，加载完成后显示
      scene.add(labelsGroup);
      labelsGroupRef.current = labelsGroup;
      
      console.log(` 创建${products.length}个产品标签（初始隐藏）`);
    }

    return true;
  }, [backgroundColor, enableControls, autoRotate, defaultShowParticles, defaultShowPlatform, products, createParticleBackground, createDisplayPlatform]);

  // ========== 模型加载 ==========

  // 加载SPZ模型（高斯泼溅）
  const loadSplatModel = useCallback(async () => {
    if (!sparkRef.current) return;

    let loadingTimedOut = false;
    let progressReceived = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    try {
      setError(null);
      setLoading(true);
      setModelLoaded(false);
      setProgress(10);
      setLoadingStage('initializing');  // 阶段1: 初始化
      
      // 关键修复：加载开始时立即禁用控制器，防止相机位置被修改
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
        console.log(' 加载开始：禁用控制器');
      }

      // 心跳进度（Vite dev server兼容）
      const heartbeatStart = Date.now();
      heartbeatTimer = setInterval(() => {
        if (loadingTimedOut) return;
        if (progressReceived) return;
        const elapsed = (Date.now() - heartbeatStart) / 1000;
        const simulated = 10 + (1 - Math.exp(-elapsed / 5)) * 65;
        setProgress(Math.min(75, Math.round(simulated)));
      }, 300);

      // 创建SplatMesh
      setLoadingStage('loading');  // 阶段2: 加载中
      const splat = new SplatMesh({
        url: modelUrl,
        onProgress: (event) => {
          if (loadingTimedOut) return;
          if (event.lengthComputable) {
            progressReceived = true;
            setProgress(10 + Math.round((event.loaded / event.total) * 80));
          }
        }
      });
      modelRef.current = splat;

      // 超时保护：25秒
      const timeoutGuard = setTimeout(() => {
        if (!loadingTimedOut) {
          loadingTimedOut = true;
          console.warn(`️ Splat模型加载超时: ${modelUrl}`);
          setError('模型加载超时，请检查网络连接');
          setLoading(false);
          setModelLoaded(false);
        }
      }, 25000);

      // 关键优化：先等待初始化完成，再添加到场景和翻转
      await splat.initialized;
      clearTimeout(timeoutGuard);

      if (loadingTimedOut) return;

      // 清除心跳
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      setLoadingStage('processing');  // 阶段3: 处理中

      // 添加到SparkRenderer（在初始化完成后）
      sparkRef.current.add(splat);
      
      // 关键修复：SplatMesh默认可能是倒立的，需要翻转
      // 绕X轴旋转180度（π弧度）使其正向显示
      splat.rotation.x = Math.PI;
      console.log('🔄 SplatMesh已翻转（绕X轴180度）');

      // 关键优化：移除所有await等待，立即执行智能居中
      // 不再等待多帧渲染，直接计算包围盒和相机位置

      // ★ 关键修复：如果有自定义相机配置，跳过智能居中
      if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
        console.log('🎯 开始执行智能居中...');
        smartFitCameraToObject(splat, cameraRef.current, canvasRef.current, {
          margin: margin,
          trimThreshold: 0.05,
          preferAxis: 'auto',
          autoCenter: true
        });
        console.log('✅ 智能居中完成');
      } else if (customCameraConfig) {
        console.log('⏭️ 跳过智能居中：存在自定义相机配置');
      }

      setLoadingStage('rendering');  // 阶段4: 渲染中

      // 关键优化：模型加载完成后启用控制器交互
      if (controlsRef.current) {
        // 关键修复：智能居中算法已经同步了target，这里只需启用控制器
        controlsRef.current.enabled = true;
        console.log('🎯 控制器已启用');
      }
      
      // 关键优化：模型加载完成后创建并显示产品标签
      if (products.length > 0 && labelsGroupRef.current) {
        console.log(' 创建产品标签...');
              
        // 清空标签组（防止重复创建）
        while (labelsGroupRef.current.children.length > 0) {
          labelsGroupRef.current.remove(labelsGroupRef.current.children[0]);
        }
              
        // 创建环形分布的产品标签
        products.forEach((product, index) => {
          // 计算标签位置 - 围绕中心环形分布
          const angle = (index / products.length) * Math.PI * 2;
          const radius = 2.0; // 稍大一些，避免遮挡模型
          const position: [number, number, number] = product.position || [
            Math.cos(angle) * radius,
            0.5 + index * 0.3, // 垂直方向稍微错开
            Math.sin(angle) * radius
          ];
                
          const sprite = create3DLabel(product, position);
          labelsGroupRef.current!.add(sprite);
        });
              
        // 显示标签组
        labelsGroupRef.current.visible = true;
        console.log(` 已创建${products.length}个产品标签并显示`);
      }

      setProgress(100);
      // 关键优化：先显示淡出动画，再隐藏加载界面
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);  // 重置淡出状态
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));  // ★ 状态机转换：进入LOADED状态
        onLoadComplete?.();
      }, 500);  // 淡出动画持续时间
    } catch (err) {
      console.error('❌ Splat model load error:', err);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      setStateMachine(prev => ({ ...prev, state: 'ERROR' }));  // ★ 状态机转换：进入ERROR状态
      if (!loadingTimedOut) {
        setError((err as Error).message);
        setLoading(false);
        onError?.(err as Error);
      }
    }
  }, [modelUrl, autoCenter, margin, smartFitCameraToObject, onLoadComplete, onError]);

  // 加载GLB模型
  const loadGLBModel = useCallback(async () => {
    if (!sceneRef.current || !rendererRef.current) return;

    try {
      setError(null);
      setLoading(true);
      setModelLoaded(false);
      setProgress(50);
      setLoadingStage('loading');  // 阶段1: 加载中
      
      // 关键修复：加载开始时立即禁用控制器，防止相机位置被修改
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
        console.log(' 加载开始：禁用控制器');
      }

      // 使用Three.js的GLTFLoader加载
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      loader.load(
        modelUrl,
        (gltf) => {
          setLoadingStage('processing');  // 阶段2: 处理中
          const model = gltf.scene;
          modelRef.current = model;
          sceneRef.current?.add(model);

          // ★ 关键修复：如果有自定义相机配置，跳过智能居中
          if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
            smartFitCameraToObject(model, cameraRef.current, canvasRef.current, {
              margin: margin,
              trimThreshold: 0.05,
              preferAxis: 'auto',
              autoCenter: true
            });
          } else if (customCameraConfig) {
            console.log('⏭️ 跳过智能居中：存在自定义相机配置');
          }

          setLoadingStage('rendering');  // 阶段3: 渲染中

          // 关键优化：模型加载完成后启用控制器交互
          if (controlsRef.current) {
            // 关键修复：智能居中算法已经同步了target，这里只需启用控制器
            controlsRef.current.enabled = true;
            console.log('🎯 控制器已启用');
          }

          // 关键优化：模型加载完成后创建并显示产品标签
          if (products.length > 0 && labelsGroupRef.current) {
            console.log(' 创建产品标签...');
            
            // 清空标签组（防止重复创建）
            while (labelsGroupRef.current.children.length > 0) {
              labelsGroupRef.current.remove(labelsGroupRef.current.children[0]);
            }
            
            // 创建环形分布的产品标签
            products.forEach((product, index) => {
              const angle = (index / products.length) * Math.PI * 2;
              const radius = 2.0;
              const position: [number, number, number] = product.position || [
                Math.cos(angle) * radius,
                0.5 + index * 0.3,
                Math.sin(angle) * radius
              ];
              
              const sprite = create3DLabel(product, position);
              labelsGroupRef.current!.add(sprite);
            });
            
            // 显示标签组
            labelsGroupRef.current.visible = true;
            console.log(` 已创建${products.length}个产品标签并显示`);
          }

          setProgress(100);
          // 关键优化：先显示淡出动画，再隐藏加载界面
          setIsFadingOut(true);
          setTimeout(() => {
            setLoading(false);
            setModelLoaded(true);
            setIsFadingOut(false);  // 重置淡出状态
            setStateMachine(prev => ({ ...prev, state: 'LOADED' }));  // ★ 状态机转换：进入LOADED状态
            onLoadComplete?.();
          }, 500);  // 淡出动画持续时间
        },
        (progress) => {
          if (progress.total > 0) {
            setProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
        (error) => {
          throw error;
        }
      );
    } catch (err) {
      console.error('❌ GLB model load error:', err);
      setStateMachine(prev => ({ ...prev, state: 'ERROR' }));  // ★ 状态机转换：进入ERROR状态
      setError((err as Error).message);
      setLoading(false);
      onError?.(err as Error);
    }
  }, [modelUrl, autoCenter, margin, smartFitCameraToObject, onLoadComplete, onError]);

  // 加载PLY模型
  const loadPLYModel = useCallback(async () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setStateMachine(prev => ({ ...prev, state: 'LOADING' }));
    setLoading(true);
    setProgress(0);
    setError(null);
    setLoadingStage('loading');
    
    const loadingTimedOut = false;
    const heartbeatTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 95));
    }, 500);
    
    try {
      console.log('📦 Loading PLY model:', modelUrl);
      
      const loader = new PLYLoader();
      const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
        loader.load(
          modelUrl,
          (geometry) => {
            console.log('✅ PLY model loaded successfully');
            resolve(geometry);
          },
          (progress) => {
            if (progress.total > 0) {
              setProgress(Math.round((progress.loaded / progress.total) * 100));
            }
          },
          (error) => {
            reject(error);
          }
        );
      });
      
      console.log('🔧 Creating PLY mesh...');
      
      // 检查几何体类型：点云还是网格
      const vertexCount = geometry.attributes.position?.count || 0;
      const hasNormals = geometry.hasAttribute('normal');
      const hasColors = geometry.hasAttribute('color');
      
      console.log('📊 PLY几何体信息:', {
        顶点数: vertexCount,
        有法线: hasNormals,
        有颜色: hasColors,
        索引: geometry.index ? '有' : '无'
      });
      
      // ★ 新增：调试颜色属性详情
      if (hasColors) {
        const colorAttr = geometry.attributes.color;
        console.log('🎨 PLY颜色属性详情:', {
          颜色类型: colorAttr.constructor.name,
          颜色数量: colorAttr.count,
          颜色维度: colorAttr.itemSize,
          第一个颜色: [
            colorAttr.getX(0).toFixed(3),
            colorAttr.getY(0).toFixed(3),
            colorAttr.getZ(0).toFixed(3)
          ]
        });
      }
      
      let object3D: THREE.Object3D;
      
      // 判断是点云还是网格
      if (!geometry.index && vertexCount > 1000) {
        // 点云数据（无索引，大量顶点）
        console.log('🌟 检测到点云数据，使用Points渲染');
        
        // 创建点云材质
        const material = new THREE.PointsMaterial({
          size: 0.02,
          vertexColors: hasColors,
          color: hasColors ? undefined : 0x888888,
          sizeAttenuation: true,
        });
        
        // 创建点云对象
        const points = new THREE.Points(geometry, material);
        points.castShadow = false;
        points.receiveShadow = false;
        object3D = points;
        
      } else {
        // 网格数据（有索引或顶点数较少）
        console.log('🔲 检测到网格数据，使用Mesh渲染');
        
        // 计算顶点法线（如果不存在）
        if (!hasNormals) {
          console.log('⚙️ 计算顶点法线...');
          geometry.computeVertexNormals();
        }
        
        // 创建材质
        let material: THREE.Material;
        
        if (hasColors) {
          // 如果PLY包含顶点颜色，使用顶点颜色材质
          material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            metalness: 0.3,
            roughness: 0.7,
            side: THREE.DoubleSide,
          });
          console.log('🎨 使用顶点颜色材质');
        } else {
          // 没有颜色信息，使用默认灰色
          material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.3,
            roughness: 0.7,
            side: THREE.DoubleSide,
          });
          console.log('⚪ 使用默认灰色材质');
        }
        
        // 创建网格
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        object3D = mesh;
      }
      
      // 添加到场景
      sceneRef.current.add(object3D);
      modelRef.current = object3D;
      
      console.log('✅ PLY object added to scene');
      
      // ★ 关键修复：如果有自定义相机配置，跳过智能居中
      if (autoCenter && cameraRef.current && canvasRef.current && !customCameraConfig) {
        console.log('🎯 开始执行智能居中...');
        smartFitCameraToObject(object3D, cameraRef.current, canvasRef.current, {
          margin: margin,
          trimThreshold: 0.05,
          preferAxis: 'auto',
          autoCenter: true
        });
        console.log('✅ 智能居中完成');
      } else if (customCameraConfig) {
        console.log('⏭️ 跳过智能居中：存在自定义相机配置');
      }
      
      setLoadingStage('rendering');
      
      // 启用控制器
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
        console.log('🎯 控制器已启用');
      }
      
      // 创建产品标签
      if (products.length > 0 && labelsGroupRef.current) {
        console.log('🏷️ 创建产品标签...');
        
        labelsGroupRef.current.clear();
        
        products.forEach((product, index) => {
          // 计算标签位置（环绕模型分布）
          const angle = (index / products.length) * Math.PI * 2;
          const radius = 2;
          const position: [number, number, number] = [
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
          ];
          
          const sprite = create3DLabel(product, position);
          labelsGroupRef.current?.add(sprite);
        });
        
        if (labelsGroupRef.current) {
          sceneRef.current.add(labelsGroupRef.current);
          labelsGroupRef.current.visible = true;
          console.log(`✅ 已创建${products.length}个产品标签并显示`);
        }
      }
      
      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        setLoading(false);
        setModelLoaded(true);
        setIsFadingOut(false);
        setStateMachine(prev => ({ ...prev, state: 'LOADED' }));
        onLoadComplete?.();
      }, 500);
      
    } catch (err) {
      console.error('❌ PLY model load error:', err);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      setStateMachine(prev => ({ ...prev, state: 'ERROR' }));
      if (!loadingTimedOut) {
        setError((err as Error).message);
        setLoading(false);
        onError?.(err as Error);
      }
    }
  }, [modelUrl, autoCenter, margin, smartFitCameraToObject, products, onLoadComplete, onError]);

  // 加载模型（根据URL后缀判断类型）
  const loadModel = useCallback(() => {
    const isSplat = modelUrl.endsWith('.spz') || modelUrl.endsWith('.splat');
    const isGaussianSplatPLY = modelUrl.endsWith('.ply') && (
      modelUrl.includes('dragon') || 
      modelUrl.includes('scene') ||
      modelUrl.includes('butterfly')
    );
    
    if (isSplat) {
      loadSplatModel();
    } else if (isGaussianSplatPLY) {
      // ★ 关键修复：3D高斯泼溅格式的PLY文件使用SparkRenderer渲染
      console.log('🌟 检测到3D高斯泼溅PLY文件，使用SparkRenderer渲染');
      loadSplatModel();
    } else if (modelUrl.endsWith('.ply')) {
      // 标准PLY网格/点云文件
      loadPLYModel();
    } else {
      loadGLBModel();
    }
  }, [modelUrl, loadSplatModel, loadGLBModel, loadPLYModel]);

  // ========== 动画循环 ==========

  const animate = useCallback(() => {
    frameIdRef.current = requestAnimationFrame(animate);

    const { camera, renderer, controls, spark } = {
      camera: cameraRef.current,
      renderer: rendererRef.current,
      controls: controlsRef.current,
      spark: sparkRef.current,
    };

    if (!camera || !renderer || !sceneRef.current) return;

    // 更新控制器
    if (controls) {
      controls.update();
    }

    // 旋转粒子背景
    const particles = sceneRef.current.getObjectByName('particles');
    if (particles) {
      particles.rotation.y += 0.0005;
    }

    // 旋转装饰环
    const ring = sceneRef.current.getObjectByName('ring');
    if (ring) {
      ring.rotation.z += 0.005;
    }

    // 使用SparkRenderer渲染
    if (spark && !sparkFailedRef.current && modelRef.current && !renderingLockRef.current) {
      renderingLockRef.current = true;
      spark.update({ scene: sceneRef.current, camera })
        .then(() => {
          spark.render(sceneRef.current, camera);
          renderingLockRef.current = false;
        })
        .catch(() => {
          renderingLockRef.current = false;
          sparkFailedRef.current = true;
        });
      sparkReadyRef.current = true;
    } else if (sceneRef.current && camera && renderer) {
      // 降级到普通Three.js渲染
      renderer.render(sceneRef.current, camera);
    }

    // 更新FPS
    fpsCounterRef.current.count++;
    const now = performance.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    if (elapsed >= 1000) {
      setFps(Math.round((fpsCounterRef.current.count * 1000) / elapsed));
      fpsCounterRef.current.count = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, []);

  // ========== 用户交互检测 ==========

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let interactionTimeout: ReturnType<typeof setTimeout>;

    const handleInteractionStart = () => {
      isInteractingRef.current = true;
      onInteraction?.();
      
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }
      
      clearTimeout(interactionTimeout);
    };

    const handleInteractionEnd = () => {
      interactionTimeout = setTimeout(() => {
        isInteractingRef.current = false;
        if (controlsRef.current) {
          controlsRef.current.autoRotate = autoRotate;
        }
      }, 2000);
    };

    container.addEventListener('mousedown', handleInteractionStart);
    container.addEventListener('touchstart', handleInteractionStart);
    container.addEventListener('wheel', handleInteractionStart);
    container.addEventListener('mouseup', handleInteractionEnd);
    container.addEventListener('touchend', handleInteractionEnd);

    return () => {
      container.removeEventListener('mousedown', handleInteractionStart);
      container.removeEventListener('touchstart', handleInteractionStart);
      container.removeEventListener('wheel', handleInteractionStart);
      container.removeEventListener('mouseup', handleInteractionEnd);
      container.removeEventListener('touchend', handleInteractionEnd);
      clearTimeout(interactionTimeout);
    };
  }, [onInteraction, autoRotate]);

  // ========== 窗口大小变化 ==========

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ========== 初始化 ==========

  useEffect(() => {
    // ★ 状态机守卫：只在UNINITIALIZED状态下执行初始化
    if (stateMachine.state !== 'UNINITIALIZED') {
      console.log('✅ 场景已初始化，跳过重复初始化', stateMachine.state);
      return;
    }

    console.log('🚀 开始初始化场景...');
    setStateMachine({ state: 'INITIALIZING', currentModelUrl: '' });

    const timer = setTimeout(() => {
      const result = initScene();
      if (result) {
        console.log('✅ 场景初始化成功，进入READY状态');
        setStateMachine(prev => ({ ...prev, state: 'READY' }));
        
        // 关键修复：初始化成功后立即加载模型（如果modelUrl存在）
        if (modelUrl) {
          console.log('📥 检测到modelUrl，触发首次加载');
          loadModel();
        }
        
        animate();
      } else {
        console.error('❌ 场景初始化失败');
        setError('Failed to initialize 3D viewer');
        setLoading(false);
        setStateMachine(prev => ({ ...prev, state: 'ERROR' }));
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameIdRef.current);

      if (modelRef.current) {
        try {
          (modelRef.current as any).dispose?.();
        } catch (e) {
          console.warn('模型清理警告:', e);
        }
        modelRef.current = null;
      }
      if (sparkRef.current) {
        sparkRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  }, []);  // 空依赖，只执行一次

  // ========== 模型切换 ==========

  useEffect(() => {
    if (!sparkRef.current || !sceneRef.current) return;

    // ★ 关键调试：输出modelUrl变化
    console.log('🔄 modelUrl变化:', {
      newUrl: modelUrl,
      currentState: stateMachine.state,
      currentModelUrl: stateMachine.currentModelUrl,
      modelLoaded
    });

    // ★ 状态机守卫：只在READY或LOADED状态下才处理modelUrl变化
    if (stateMachine.state !== 'READY' && stateMachine.state !== 'LOADED') {
      console.log('⚠️ 当前状态不允许加载模型:', stateMachine.state);
      return;
    }

    // ★ 状态机守卫：如果URL未变化且已加载，跳过
    if (modelUrl === stateMachine.currentModelUrl && modelLoaded) {
      console.log('✅ 模型已加载且URL未变化，跳过重新加载');
      return;
    }

    console.log('📥 开始加载新模型:', modelUrl);

    // 关键修复：模型切换时立即隐藏旧标签，防止闪烁
    if (labelsGroupRef.current) {
      labelsGroupRef.current.visible = false;
      console.log('🏷️ 模型切换：隐藏旧标签');
    }

    // 关键修复：模型切换时禁用控制器，防止干扰新模型加载
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      console.log('🔒 模型切换：禁用控制器');
    }

    if (modelRef.current) {
      try {
        (modelRef.current as any).dispose?.();
      } catch (e) {
        console.warn('模型清理警告:', e);
      }
      modelRef.current = null;
    }

    // ★ 状态机转换：进入LOADING状态
    setStateMachine({ state: 'LOADING', currentModelUrl: modelUrl });
    
    loadModel();
  }, [modelUrl, loadModel, stateMachine.state, stateMachine.currentModelUrl, modelLoaded]);

  // ★ 新增：监听自定义相机配置变化，自动应用（带平滑过渡动画）
  const prevConfigRef = useRef<CameraConfig | null>(null);
  const currentTweenRef = useRef<any>(null);  // ★ 保存当前Tween动画引用
  
  // ★ 提取相机配置应用逻辑为独立函数，避免时序问题
  const applyCameraConfig = useCallback((config: CameraConfig) => {
    console.log(' [相机配置] 开始执行平滑过渡动画');
    console.log(' [相机配置] 目标配置:', JSON.stringify(config));
      
    if (!cameraRef.current || !controlsRef.current) {
      console.log('️ [相机配置] 跳过：相机或控制器未初始化');
      return;
    }
    
    // ★ 关键修复：停止之前的动画（如果有的话）
    if (currentTweenRef.current) {
      currentTweenRef.current.stop();
      console.log(' [相机配置] 已停止旧的Tween动画');
    }
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;
        
    // ★ 关键修复：在应用配置前，先确保相机有一个合理的初始位置
    // 如果相机位置和目标位置太近，说明可能没有正确初始化，先重置
    const targetCenter = new THREE.Vector3(
      config.target[0],
      config.target[1],
      config.target[2]
    );
    const currentPos = camera.position.clone();
    const distanceToTarget = currentPos.distanceTo(targetCenter);
    const targetDistance = new THREE.Vector3(
      config.position[0],
      config.position[1],
      config.position[2]
    ).distanceTo(targetCenter);
        
    console.log(' [相机配置] 当前相机位置:', {
      position: `[${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}]`,
      distanceToTarget: distanceToTarget.toFixed(2),
      targetDistance: targetDistance.toFixed(2),
      distanceFromOrigin: currentPos.length().toFixed(2)
    });
        
    // 如果相机距离目标太近(<目标距离的50%)，说明可能没有正确初始化，先重置
    // 或者相机距离原点太近(<2.0)
    if (distanceToTarget < targetDistance * 0.5 || currentPos.length() < 2.0) {
      console.log('⚠️ [相机配置] 相机位置异常，先重置到默认位置');
      // 根据目标位置计算一个合理的起始位置
      const offset = new THREE.Vector3(0, 2, 6); // 默认偏移（更高更远）
      camera.position.copy(targetCenter).add(offset);
      controls.target.copy(targetCenter);
      controls.update();
      console.log('✅ [相机配置] 相机已重置到默认位置:', camera.position);
    }
    
    // 目标位置
    const targetPosition = new THREE.Vector3(
      config.position[0],
      config.position[1],
      config.position[2]
    );
    const targetTarget = new THREE.Vector3(
      config.target[0],
      config.target[1],
      config.target[2]
    );
    const targetZoom = config.zoom;
    
    // 起始位置（使用重置后的位置或当前位置）
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startZoom = camera.zoom;
    
    // 计算动画参数
    const distance = startPosition.distanceTo(targetPosition);
    const duration = Math.min(Math.max(distance * 500, 800), 1500);
    
    console.log(` [相机配置] 开始相机过渡动画：`, {
      起点: `[${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)}]`,
      终点: `[${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}]`,
      距离: distance.toFixed(2),
      时长: `${duration}ms`
    });
    console.log(' [相机配置] 目标位置详情:', {
      position: config.position,
      target: config.target,
      zoom: config.zoom
    });
        
    console.log(' [相机配置] 起始位置（当前相机位置）:', {
      position: `[${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)}]`,
      target: `[${startTarget.x.toFixed(2)}, ${startTarget.y.toFixed(2)}, ${startTarget.z.toFixed(2)}]`,
      zoom: startZoom
    });
        
    // ★ 关键修复：不使用Tween.js，直接用requestAnimationFrame实现平滑过渡
    const startTime = performance.now();
        
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
          
      // 使用缓动函数（二次缓入缓出）
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
      // ★ 关键：使用lerpVectors从起点到终点逐步插值
      // easeProgress从0逐步变化到1，相机位置从startPosition逐步移动到targetPosition
      camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
      controls.target.lerpVectors(startTarget, targetTarget, easeProgress);
      controls.update();
      camera.zoom = startZoom + (targetZoom - startZoom) * easeProgress;
      camera.updateProjectionMatrix();
          
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
          
      // 打印进度日志（只打印关键帧）
      if (progress < 0.01 || progress > 0.99 || Math.abs(progress - 0.5) < 0.01) {
        console.log(` [相机配置] 动画进度: ${(progress * 100).toFixed(1)}%, 缓动值: ${easeProgress.toFixed(3)}, 相机位置: [${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`);
      }
          
      // 继续动画或完成
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log('✅ [相机配置] 自定义相机配置平滑过渡完成:', config);
        prevConfigRef.current = config;
        // setCameraConfigApplied(true);  // ★ 标记相机配置已应用（已移除未使用的状态）
      }
    };
    
    // 启动动画循环
    requestAnimationFrame(animate);
    
    console.log('✅ [相机配置] 动画已启动, duration =', duration, 'ms');
  }, []);
  
  useEffect(() => {
    console.log(' [相机配置] customCameraConfig:', customCameraConfig, 'modelLoaded:', modelLoaded, 'cameraReady:', cameraReady);
    console.log(' [相机配置] prevConfigRef:', prevConfigRef.current);
    
    // ★ 关键修复：必须等待相机和模型都完全就绪
    if (!customCameraConfig || !modelLoaded || !cameraReady) {
      console.log('️ [相机配置] 跳过：配置、模型或相机未就绪');
      return;
    }
    
    const configStr = JSON.stringify(customCameraConfig);
    const prevStr = prevConfigRef.current ? JSON.stringify(prevConfigRef.current) : null;
    // ★ 关键修复：如果prevConfigRef为null，说明是组件刚挂载，必须应用配置
    const isConfigChanged = !prevConfigRef.current || prevStr !== configStr;
    
    console.log(' [相机配置] 配置变化检测:', {
      isConfigChanged,
      prevConfigIsNull: !prevConfigRef.current,
      当前配置: configStr,
      之前配置: prevStr || 'null'
    });
    
    // ★ 关键修复：移除!isConfigChanged的检查，因为modelLoaded变化时也需要应用
    // 只要customCameraConfig有值，就应该应用
    
    console.log(' [相机配置] 检测到自定义相机配置，准备平滑过渡...');
    console.log(' [相机配置] 目标配置详情:', {
      position: customCameraConfig.position,
      target: customCameraConfig.target,
      zoom: customCameraConfig.zoom
    });
    
    // ★ 关键修复：直接执行，不需要延迟
    applyCameraConfig(customCameraConfig);
  }, [modelLoaded, cameraReady, customCameraConfig, applyCameraConfig]);

  // ========== 渲染 ==========

  return (
    <div 
      className={`universal-card-v2 layout-${layout}`}
      ref={containerRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Three.js Canvas */}
      <canvas 
        ref={canvasRef} 
        className={`universal-card-canvas ${modelLoaded ? 'model-loaded' : ''}`} 
      />

      {/* 标题叠加层 */}
      {showTitle && layout !== 'featured' && (title || subtitle) && (
        <div className="card-title-overlay">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}

      {/* 加载指示器 - 优化版 */}
      {loading && (
        <div className={`universal-card-loading ${isFadingOut ? 'fade-out' : ''}`}>
          {/* 3D旋转立方体动画 */}
          <div className="loading-cube-container">
            <div className="loading-cube">
              <div className="cube-face cube-front"></div>
              <div className="cube-face cube-back"></div>
              <div className="cube-face cube-right"></div>
              <div className="cube-face cube-left"></div>
              <div className="cube-face cube-top"></div>
              <div className="cube-face cube-bottom"></div>
            </div>
          </div>
          
          {/* 加载阶段提示 */}
          <div className="loading-stage-text">
            {loadingStage === 'initializing' && (isZh ? ' 初始化场景...' : '🚀 Initializing scene...')}
            {loadingStage === 'loading' && (isZh ? '📦 加载模型数据...' : '📦 Loading model data...')}
            {loadingStage === 'processing' && (isZh ? '⚙️ 处理模型数据...' : '⚙️ Processing model...')}
            {loadingStage === 'rendering' && (isZh ? '✨ 渲染3D视图...' : '✨ Rendering 3D view...')}
          </div>
          
          {/* 进度条 */}
          <div className="loading-bar-container">
            <div className="loading-bar" style={{ width: `${progress}%` }} />
          </div>
          
          {/* 进度百分比 */}
          <span className="loading-text">{progress}%</span>
          
          {/* 加载提示 */}
          <div className="loading-tip">
            {isZh ? '💡 首次加载可能需要几秒钟' : '💡 First load may take a few seconds'}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="universal-card-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* 统计信息 */}
      {showStats && modelLoaded && (
        <div className="universal-card-stats">
          <span>{isZh ? '3DGS' : '3DGS'}</span>
          <span className="stats-fps">{isZh ? 'FPS' : 'FPS'}: {fps > 0 ? fps : '--'}</span>
        </div>
      )}

      {/* 控制提示 */}
      {modelLoaded && enableControls && (
        <div className="universal-card-hints">
          <span>{isZh ? '拖拽旋转' : 'Drag to rotate'}</span>
          <span>·</span>
          <span>{isZh ? '滚轮缩放' : 'Scroll to zoom'}</span>
        </div>
      )}
    </div>
  );
});

UniversalGaussianCardV2.displayName = 'UniversalGaussianCardV2';
UniversalGaussianCardV2.displayName = 'UniversalGaussianCardV2';
