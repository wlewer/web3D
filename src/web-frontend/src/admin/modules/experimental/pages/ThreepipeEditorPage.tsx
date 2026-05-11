/**
 * Threepipe 3D编辑器
 * 基于 threepipe (Apache 2.0) 的 web3D 编辑器
 * - 支持 GLB/GLTF/OBJ/FBX/PLY/STL 等多种 3D 格式拖拽导入
 * - 内置材质编辑、灯光、后处理、动画
 * - 基于 Tweakpane 的配置 UI
 * - 直接 React 集成（无 iframe）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Spin, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { ThreeViewer } from 'threepipe';
import {
  DropzonePlugin,
  PickingPlugin,
  TransformControlsPlugin,
  EditorViewWidgetPlugin,
  TonemapPlugin,
  SSAOPlugin,
  DepthBufferPlugin,
  NormalBufferPlugin,
  ViewerUiConfigPlugin,
  SceneUiConfigPlugin,
  AssetExporterPlugin,
  CanvasSnapshotPlugin,
  UndoManagerPlugin,
  AnimationObjectPlugin,
  GLTFAnimationPlugin,
  DynamicImportPlugin,
  FullScreenPlugin,
} from 'threepipe';
import { TweakpaneUiPlugin } from '@threepipe/plugin-tweakpane';
import { TweakpaneEditorPlugin } from '@threepipe/plugin-tweakpane-editor';

type Locale = 'zh-CN' | 'en-US';

function getInitLocale(): Locale {
  const saved = localStorage.getItem('editor_locale');
  if (saved === 'en-US') return 'en-US';
  if (saved === 'zh-CN') return 'zh-CN';
  return navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    background: '#1c1c1c',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    background: '#1c1c1c',
  },
  canvas: {
    width: 'calc(100% - 300px)',
    height: '100%',
    display: 'block',
  },
  loadingOverlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(17, 17, 17, 0.85)',
    zIndex: 50,
    color: '#667eea',
    flexDirection: 'column' as const,
    gap: 16,
  },
  /** 语言切换悬浮按钮 —— 固定在画布左上角 */
  langToggleBtn: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    background: 'rgba(30,30,30,0.82)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 6,
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none' as const,
    backdropFilter: 'blur(6px)',
    transition: 'background 0.2s, border-color 0.2s',
    letterSpacing: '0.02em',
  },
};

export const ThreepipeEditorPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ThreeViewer | null>(null);
  const [initializing, setInitializing] = useState(true);
  // 保存 setTimeout ID，cleanup 时清除，防止访问已销毁的 viewer
  const timeoutIdsRef = useRef<number[]>([]);

  // locale 作为 React state，切换后触发 viewer 重建（无页面刷新）
  const [locale, setLocale] = useState<Locale>(getInitLocale);
  const isZH = locale === 'zh-CN';

  // ★ 自动环绕展示（通过 Three.js OrbitControls.autoRotate 实现）
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [orbitSpeed, setOrbitSpeed] = useState(2.0);

  // 语言文字映射
  const LOCALE_TEXT = {
    initLoading: isZH ? '初始化 3D 编辑器...' : 'Initializing 3D Editor...',
    langToggleLabel: isZH ? 'EN' : '中',
    langToggleTitle: isZH ? 'Switch to English' : '切换到中文',
  };

  // 切换语言 handler
  const handleLangToggle = useCallback(() => {
    const next: Locale = locale === 'zh-CN' ? 'en-US' : 'zh-CN';
    localStorage.setItem('editor_locale', next);
    setLocale(next);
  }, [locale]);

  // 中英文分类标签映射（匹配官方 9 个标签）
  const CATEGORY_LABELS: Record<string, Record<string, string>> = {
    'zh-CN': {
      viewer: '查看器',
      interaction: '交互',
      buffers: '缓冲区',
      rendering: '渲染',
      postProcessing: '后处理',
      export: '导出',
      configurator: '配置',
      animation: '动画',
      extras: '扩展',
      debug: '调试',
    },
    'en-US': {
      viewer: 'Viewer',
      interaction: 'Interaction',
      buffers: 'Buffers',
      rendering: 'Rendering',
      postProcessing: 'Post-processing',
      export: 'Export',
      configurator: 'Configurator',
      animation: 'Animation',
      extras: 'Extras',
      debug: 'Debug',
    },
  };

  // 插件 UI 中英文翻译映射
  const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
    'zh-CN': {
      // === Viewer 配置 ===
      'Viewer Config': '查看器配置',
      'Background Color': '背景颜色',
      'Background Tonemap': '背景色调映射',
      'Tonemap Background': '背景色调映射',
      'Environment Map': '环境贴图',
      'Environment Map Intensity': '环境贴图强度',
      'Render Scale': '渲染缩放',
      'Render Size': '渲染尺寸',

      // === 场景配置 ===
      'Scene Config': '场景配置',
      'Scene': '场景',

      // === 色调映射 ===
      'Tonemap': '色调映射',
      'Tone Mapping': '色调映射',
      'Tonemapping': '色调映射',
      'Exposure': '曝光',
      'Contrast': '对比度',
      'Saturation': '饱和度',

      // === SSAO 环境光遮蔽 ===
      'SSAO': '环境光遮蔽',
      'Intensity': '强度',
      'Radius': '半径',
      'Occlusion World Radius': '遮蔽半径(世界)',
      'Bias': '偏移',
      'Falloff': '衰减',
      'Num Samples': '采样数量',
      'Samples': '采样数',
      'Auto Radius': '自动半径',

      // === 深度/法线缓冲 ===
      'Depth Buffer': '深度缓冲区',
      'Depth': '深度',
      'Normal Buffer': '法线缓冲区',
      'Normal': '法线',

      // === 拖拽导入 ===
      'Import': '导入',
      'Import File': '导入文件',
      'Import URL': '导入URL',
      'Auto Import': '自动导入',
      'Auto Add': '自动添加',
      'Dropzone': '拖拽区域',

      // === 拾取/选择 ===
      'Picking': '拾取',
      'Selection': '选择',
      'Selection Mode': '选择模式',
      'Hover': '悬停',
      'Hover Enabled': '启用悬停',
      'Auto Focus': '自动聚焦',
      'Auto Focus Hover': '悬停自动聚焦',
      'Multi Select': '多选',
      'Multi-select': '多选',
      'Duplicate': '复制',
      'Duplicate Mode': '复制模式',
      'Delete': '删除',
      'Delete Selected': '删除选中',
      'Clear Selection': '清除选择',
      'Select All': '全选',
      'Copy': '复制',
      'Cut': '剪切',
      'Paste': '粘贴',
      'Focus': '聚焦',
      'Toggle Visibility': '切换可见性',
      'Unhide All': '全部显示',
      'Reset Transform': '重置变换',
      'Position': '位置',
      'Rotation': '旋转',
      'Scale': '缩放',
      'Local': '局部',
      'World': '世界',
      'Object': '对象',
      'Material': '材质',
      'Geometry': '几何体',
      'Texture': '纹理',
      'Widget': '控件',

      // === 变换 ===
      'Transform': '变换',
      'Transform Controls': '变换控件',
      'Translate': '移动',
      'Rotate': '旋转',
      'Snap': '吸附',
      'Snap Size': '吸附大小',
      'Space': '坐标系',
      'Mode': '模式',

      // === 动画 ===
      'Animation': '动画',
      'Add Animation': '添加动画',
      'Play': '播放',
      'Pause': '暂停',
      'Stop': '停止',
      'Loop': '循环',
      'Timeline': '时间轴',
      'GLTF Animation': 'GLTF动画',
      'Animation Object': '动画对象',
      'Speed': '速度',
      'Time': '时间',
      'Duration': '时长',
      'Clip': '片段',
      'Clips': '片段列表',
      'Weight': '权重',
      'Interpolation': '插值',

      // === 导出 ===
      'Export': '导出',
      'Export GLB': '导出GLB',
      'Export GLTF': '导出GLTF',
      'Export JSON': '导出JSON',
      'Asset Exporter': '资源导出器',
      'Snapshot': '快照',
      'Canvas Snapshot': '画布快照',
      'Download': '下载',
      'Quality': '质量',
      'Resolution': '分辨率',
      'File Name': '文件名',
      'Format': '格式',
      'Compress': '压缩',
      'Include Draco': '包含Draco压缩',
      'Embed Images': '嵌入图片',

      // === 撤销/重做 ===
      'Undo': '撤销',
      'Redo': '重做',
      'Undo Manager': '撤销管理',
      'Clear History': '清除历史',
      'History': '历史记录',

      // === 视图控件 ===
      'View Widget': '视图控件',
      'Editor View Widget': '编辑器视图控件',
      'Grid': '网格',
      'Axis': '坐标轴',
      'Grid Size': '网格大小',
      'Grid Divisions': '网格分格',
      'Show Grid': '显示网格',
      'Show Axis': '显示坐标轴',

      // === 全屏 ===
      'Fullscreen': '全屏',
      'Full Screen': '全屏',
      'Exit Fullscreen': '退出全屏',

      // === 配置 ===
      'Config': '配置',
      'Configurator': '配置器',
      'Viewer UI Config': '查看器UI配置',
      'Scene UI Config': '场景UI配置',

      // === 通用 ===
      'Enabled': '启用',
      'Disabled': '禁用',
      'Reset': '重置',
      'Reset Defaults': '恢复默认',
      'Default': '默认',
      'Options': '选项',
      'Auto': '自动',
      'None': '无',
      'Color': '颜色',
      'Opacity': '不透明度',
      'Roughness': '粗糙度',
      'Metalness': '金属度',
      'Emissive': '自发光',
      'Emissive Intensity': '自发光强度',
      'Side': '面',
      'Transparent': '透明',
      'Wireframe': '线框',
      'Visible': '可见',
      'Cast Shadow': '投射阴影',
      'Receive Shadow': '接收阴影',
      'Flat Shading': '平面着色',
      'Depth Test': '深度测试',
      'Depth Write': '深度写入',
      'Blend Mode': '混合模式',

      // === 灯光 ===
      'Light': '灯光',
      'Lights': '灯光列表',
      'Ambient Light': '环境光',
      'Directional Light': '平行光',
      'Point Light': '点光源',
      'Spot Light': '聚光灯',
      'Hemisphere Light': '半球光',
      'Shadow': '阴影',
      'Shadow Bias': '阴影偏移',
      'Shadow Map Size': '阴影贴图尺寸',
      'Cast Shadows': '投射阴影',

      // === 相机 ===
      'Camera': '相机',
      'View': '视图',
      'FOV': '视角(FOV)',
      'Near': '近截面',
      'Far': '远截面',
      'Zoom': '缩放',
      'Controls': '控制器',
      'Orbit Controls': '轨道控制',
      'Pan': '平移',
      'Dolly': '推拉',
      'Fit': '适配',
      'Fit To': '适配到',
      'Look At': '看向',
      'Reset Camera': '重置相机',

      // === 场景对象 ===
      'Scene Objects': '场景对象',
      'Object3D': '3D对象',
      'Mesh': '网格体',
      'Group': '组',
      'Children': '子对象',
      'Parent': '父对象',
      'Name': '名称',
      'Type': '类型',
      'Frustum Culled': '视锥体裁剪',
      'Render Order': '渲染顺序',
      'Matrix Auto Update': '自动更新矩阵',
      'User Data': '用户数据',

      // === Tweakpane ===
      'Tweakpane UI': '配置面板',
      'Color Mode': '颜色模式',
      'Theme': '主题',
      'Dark': '暗色',

      // === 扩展 ===
      'Dynamic Import': '动态导入',
      'Import Plugin': '导入插件',
      'Load URL': '加载URL',
      'Load File': '加载文件',
      'Add Plugin': '添加插件',
      'Plugin List': '插件列表',

      // === 渲染器 ===
      'Renderer': '渲染器',
      'Tone Mapping Exposure': '色调映射曝光',
      'Shadow Map Enabled': '启用阴影贴图',
      'Shadow Map Type': '阴影贴图类型',
      'Pixel Ratio': '像素比',
      'Anti-aliasing': '抗锯齿',
      'MSAA': '多重采样抗锯齿',
      'Transparent Background': '透明背景',

      // === 后处理（常见插件）===
      'Bloom': '泛光',
      'Grain': '颗粒',
      'Vignette': '暗角',
      'Chromatic Aberration': '色差',
      'Depth of Field': '景深',
      'Bokeh': '散景',
      'Glitch': '故障效果',
      'Pixelation': '像素化',
      'Sharpen': '锐化',

      // === 灯光属性 ===
      'Distance': '距离',
      'Decay': '衰减',
      'Angle': '角度',
      'Penumbra': '半影',
      'Ground Color': '地面颜色',
      'Sky Color': '天空颜色',

      // === 相机 ===
      'Aspect': '宽高比',
      'Target': '目标',
      'Up': '上方向',

      // === 材质贴图 ===
      'Base Color': '基础颜色',
      'Base Color Texture': '基础颜色贴图',
      'Normal Map': '法线贴图',
      'Roughness Map': '粗糙度贴图',
      'Metalness Map': '金属度贴图',
      'Emissive Map': '自发光贴图',
      'Occlusion Map': '遮蔽贴图',
      'AOMap': '环境光遮蔽贴图',
      'Bump Map': '凹凸贴图',
      'Displacement Map': '置换贴图',

      // === 场景 ===
      'Background': '背景',
      'Fog': '雾',
      'Ground': '地面',
      'Sky': '天空',
      'Background Image': '背景图片',

      // === 导出格式 ===
      'STL': 'STL',
      'OBJ': 'OBJ',
      'PLY': 'PLY',
      'Point Cloud': '点云',
      'PointCloud': '点云',

      // === 动画 ===
      'Mixer': '混合器',
      'Actions': '动作',
      'Tracks': '轨道',
      'Animation Clip': '动画片段',
      'Animation Mixer': '动画混合器',

      // === 渲染 ===
      'Render': '渲染',
      'WebGL': 'WebGL',
      'Context': '上下文',
      'Capabilities': '性能',
      'Memory': '内存',
      'Extension': '扩展',
    },
    'en-US': {
      // === Viewer Config ===
      'Viewer Config': 'Viewer Config',
      'Background Color': 'Background Color',
      'Background Tonemap': 'Background Tonemap',
      'Tonemap Background': 'Tonemap Background',
      'Environment Map': 'Environment Map',
      'Environment Map Intensity': 'Env Map Intensity',
      'Render Scale': 'Render Scale',
      'Render Size': 'Render Size',

      // === Scene Config ===
      'Scene Config': 'Scene Config',
      'Scene': 'Scene',

      // === Tonemap ===
      'Tonemap': 'Tonemap',
      'Tone Mapping': 'Tone Mapping',
      'Tonemapping': 'Tonemapping',
      'Exposure': 'Exposure',
      'Contrast': 'Contrast',
      'Saturation': 'Saturation',

      // === SSAO ===
      'SSAO': 'SSAO',
      'Intensity': 'Intensity',
      'Radius': 'Radius',
      'Occlusion World Radius': 'Occlusion World Radius',
      'Bias': 'Bias',
      'Falloff': 'Falloff',
      'Num Samples': 'Num Samples',
      'Samples': 'Samples',
      'Auto Radius': 'Auto Radius',

      // === Buffers ===
      'Depth Buffer': 'Depth Buffer',
      'Depth': 'Depth',
      'Normal Buffer': 'Normal Buffer',
      'Normal': 'Normal',

      // === Import ===
      'Import': 'Import',
      'Import File': 'Import File',
      'Import URL': 'Import URL',
      'Auto Import': 'Auto Import',
      'Auto Add': 'Auto Add',
      'Dropzone': 'Dropzone',

      // === Picking / Selection ===
      'Picking': 'Picking',
      'Selection': 'Selection',
      'Selection Mode': 'Selection Mode',
      'Hover': 'Hover',
      'Hover Enabled': 'Hover Enabled',
      'Auto Focus': 'Auto Focus',
      'Auto Focus Hover': 'Auto Focus on Hover',
      'Multi Select': 'Multi Select',
      'Multi-select': 'Multi-select',
      'Duplicate': 'Duplicate',
      'Duplicate Mode': 'Duplicate Mode',
      'Delete': 'Delete',
      'Delete Selected': 'Delete Selected',
      'Clear Selection': 'Clear Selection',
      'Select All': 'Select All',
      'Copy': 'Copy',
      'Cut': 'Cut',
      'Paste': 'Paste',
      'Focus': 'Focus',
      'Toggle Visibility': 'Toggle Visibility',
      'Unhide All': 'Unhide All',
      'Reset Transform': 'Reset Transform',
      'Position': 'Position',
      'Rotation': 'Rotation',
      'Scale': 'Scale',
      'Local': 'Local',
      'World': 'World',
      'Object': 'Object',
      'Material': 'Material',
      'Geometry': 'Geometry',
      'Texture': 'Texture',
      'Widget': 'Widget',

      // === Transform ===
      'Transform': 'Transform',
      'Transform Controls': 'Transform Controls',
      'Translate': 'Translate',
      'Rotate': 'Rotate',
      'Snap': 'Snap',
      'Snap Size': 'Snap Size',
      'Space': 'Space',
      'Mode': 'Mode',

      // === Animation ===
      'Animation': 'Animation',
      'Add Animation': 'Add Animation',
      'Play': 'Play',
      'Pause': 'Pause',
      'Stop': 'Stop',
      'Loop': 'Loop',
      'Timeline': 'Timeline',
      'GLTF Animation': 'GLTF Animation',
      'Animation Object': 'Animation Object',
      'Speed': 'Speed',
      'Time': 'Time',
      'Duration': 'Duration',
      'Clip': 'Clip',
      'Clips': 'Clips',
      'Weight': 'Weight',
      'Interpolation': 'Interpolation',

      // === Export ===
      'Export': 'Export',
      'Export GLB': 'Export GLB',
      'Export GLTF': 'Export GLTF',
      'Export JSON': 'Export JSON',
      'Asset Exporter': 'Asset Exporter',
      'Snapshot': 'Snapshot',
      'Canvas Snapshot': 'Canvas Snapshot',
      'Download': 'Download',
      'Quality': 'Quality',
      'Resolution': 'Resolution',
      'File Name': 'File Name',
      'Format': 'Format',
      'Compress': 'Compress',
      'Include Draco': 'Include Draco',
      'Embed Images': 'Embed Images',

      // === Undo/Redo ===
      'Undo': 'Undo',
      'Redo': 'Redo',
      'Undo Manager': 'Undo Manager',
      'Clear History': 'Clear History',
      'History': 'History',

      // === View Widget ===
      'View Widget': 'View Widget',
      'Editor View Widget': 'Editor View Widget',
      'Grid': 'Grid',
      'Axis': 'Axis',
      'Grid Size': 'Grid Size',
      'Grid Divisions': 'Grid Divisions',
      'Show Grid': 'Show Grid',
      'Show Axis': 'Show Axis',

      // === Fullscreen ===
      'Fullscreen': 'Fullscreen',
      'Full Screen': 'Full Screen',
      'Exit Fullscreen': 'Exit Fullscreen',

      // === Config ===
      'Config': 'Config',
      'Configurator': 'Configurator',
      'Viewer UI Config': 'Viewer UI Config',
      'Scene UI Config': 'Scene UI Config',

      // === Common ===
      'Enabled': 'Enabled',
      'Disabled': 'Disabled',
      'Reset': 'Reset',
      'Reset Defaults': 'Reset Defaults',
      'Default': 'Default',
      'Options': 'Options',
      'Auto': 'Auto',
      'None': 'None',
      'Color': 'Color',
      'Opacity': 'Opacity',
      'Roughness': 'Roughness',
      'Metalness': 'Metalness',
      'Emissive': 'Emissive',
      'Emissive Intensity': 'Emissive Intensity',
      'Side': 'Side',
      'Transparent': 'Transparent',
      'Wireframe': 'Wireframe',
      'Visible': 'Visible',
      'Cast Shadow': 'Cast Shadow',
      'Receive Shadow': 'Receive Shadow',
      'Flat Shading': 'Flat Shading',
      'Depth Test': 'Depth Test',
      'Depth Write': 'Depth Write',
      'Blend Mode': 'Blend Mode',

      // === Camera ===
      'Camera': 'Camera',
      'View': 'View',
      'FOV': 'FOV',
      'Near': 'Near',
      'Far': 'Far',
      'Zoom': 'Zoom',
      'Controls': 'Controls',
      'Orbit Controls': 'Orbit Controls',
      'Pan': 'Pan',
      'Dolly': 'Dolly',
      'Fit': 'Fit',
      'Fit To': 'Fit To',
      'Look At': 'Look At',
      'Reset Camera': 'Reset Camera',

      // === Tweakpane ===
      'Tweakpane UI': 'Tweakpane UI',
      'Color Mode': 'Color Mode',
      'Theme': 'Theme',
      'Dark': 'Dark',
      'Light': 'Light',

      // === Extras ===
      'Dynamic Import': 'Dynamic Import',
      'Import Plugin': 'Import Plugin',
      'Load URL': 'Load URL',
      'Load File': 'Load File',
      'Add Plugin': 'Add Plugin',
      'Plugin List': 'Plugin List',
    },
  };

  /**
   * 递归翻译 uiConfig 树中的 label
   * 支持精确匹配 + 不区分大小写兜底匹配
   */
  function translateUiConfig(config: any, translations: Record<string, string>): void {
    if (!config || typeof config !== 'object') return;

    if (typeof config.label === 'string') {
      const label = config.label;
      const trimmed = label.trim();
      let translated: string | undefined = translations[trimmed];

      // 精确匹配失败时，尝试不区分大小写匹配（threepipe 输出大小写不确定）
      if (translated === undefined) {
        const lowerTrimmed = trimmed.toLowerCase();
        for (const k in translations) {
          if (k.toLowerCase() === lowerTrimmed) {
            translated = translations[k];
            break;
          }
        }
      }

      if (translated !== undefined) {
        config.label = translated;
      } else if (trimmed.length < 30 && !trimmed.startsWith('__')) {
        // 只打印顶层 label，避免刷屏
        console.log('[i18n] no translation for: "' + trimmed + '"');
      }
    }

    // 递归处理 children
    const children = config.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child && typeof child === 'object' && !Array.isArray(child)) {
          translateUiConfig(child, translations);
        }
      }
    }
  }

  // 初始化 viewer
  useEffect(() => {
    if (!canvasRef.current) return;

    // 设置文档语言属性
    document.documentElement.lang = locale;

    setInitializing(true);

    const viewer = new ThreeViewer({
      canvas: canvasRef.current,
      msaa: true,
      rgbm: true,
    });

    // === 撤销/重做 ===
    viewer.addPluginSync(new UndoManagerPlugin());

    // === 基础交互插件 ===
    viewer.addPluginSync(new DropzonePlugin());
    viewer.addPluginSync(new PickingPlugin());
    viewer.addPluginSync(new TransformControlsPlugin());
    viewer.addPluginSync(new EditorViewWidgetPlugin());

    // === 缓冲区插件 ===
    viewer.addPluginSync(new DepthBufferPlugin());
    viewer.addPluginSync(new NormalBufferPlugin());

    // === 动画插件 ===
    viewer.addPluginSync(new AnimationObjectPlugin());
    viewer.addPluginSync(new GLTFAnimationPlugin());

    // === 扩展插件 ===
    viewer.addPluginSync(new DynamicImportPlugin());

    // === UI 配置插件 ===
    viewer.addPluginSync(new ViewerUiConfigPlugin());
    viewer.addPluginSync(new SceneUiConfigPlugin());

    // === 导出插件 ===
    viewer.addPluginSync(new AssetExporterPlugin());
    viewer.addPluginSync(new CanvasSnapshotPlugin());

    // === Tweakpane 编辑器（原生风格配置 UI） ===
    viewer.addPluginSync(new TweakpaneUiPlugin(true));
    const editorPlugin = viewer.addPluginSync(new TweakpaneEditorPlugin());
    // 显式调用 loadPlugins 创建导航栏标签和底部工具按钮
    editorPlugin.loadPlugins({
      'Viewer': [ViewerUiConfigPlugin, SceneUiConfigPlugin, DropzonePlugin, FullScreenPlugin],
      'Interaction': [PickingPlugin, TransformControlsPlugin, EditorViewWidgetPlugin],
      'Buffers': [DepthBufferPlugin, NormalBufferPlugin],
      'Rendering': [TonemapPlugin, SSAOPlugin],
      'Export': [AssetExporterPlugin, CanvasSnapshotPlugin],
      'Animation': [AnimationObjectPlugin, GLTFAnimationPlugin],
      'Extras': [DynamicImportPlugin, UndoManagerPlugin],
    });

    viewerRef.current = viewer;

    // === 注入 CSS：TP 元素都在 body 上用 fixed 定位，不移动任何 DOM  ===
    const panelStyleId = 'tp-editor-layout-override';
    if (!document.getElementById(panelStyleId)) {
      const panelStyle = document.createElement('style');
      panelStyle.id = panelStyleId;
      panelStyle.textContent = `
        /* 消除 Content 容器的内边距和外边距（全屏编辑器不允许间隙） */
        [class*="ant-layout-content"]:has(> div > [data-threepipe-root]) {
          padding: 0 !important;
          margin: 0 !important;
          overflow: hidden !important;
        }

        /* 标签栏：位于 Header 下方（top:64px），固定在视口上
         * left: var(--sidebar-left) 由 JS 动态监听侧边栏状态
         */
        .mode-buttons-container {
          position: fixed !important;
          top: 64px !important;
          left: var(--sidebar-left, 240px) !important;
          right: 0 !important;
          z-index: 90 !important;
        }

        /* 配置面板：固定在视口右侧，从标签栏下方开始 */
        #tweakpaneUiContainer {
          position: fixed !important;
          top: calc(64px + 2.5rem) !important;
          right: 0 !important;
          height: calc(100vh - 64px - 2.5rem) !important;
          max-height: 100% !important;
        }

        /* 去掉左下角 logo */
        #webgi-logo {
          display: none !important;
        }

        /* 全屏按钮：画布右上角（面板左侧） */
        #fsToggle {
          position: fixed !important;
          top: calc(64px + 2.5rem) !important;
          right: calc(300px + 0.5rem) !important;
        }

        /* 底部工具栏：画布右下角（面板左侧） */
        .util-buttons-container {
          position: fixed !important;
          bottom: 0.5rem !important;
          right: calc(300px + 0.5rem) !important;
        }

        /* 工具栏按钮适配暗色背景 */
        .round-button {
          background: rgba(255, 255, 255, 0.07) !important;
          color: #cccccc !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
        }
        .round-button:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }
      `;
      document.head.appendChild(panelStyle);
    }

    // === 动态监听侧边栏折叠状态，更新 --sidebar-left CSS 变量 ===
    function updateSidebarLeft() {
      const sider = document.querySelector('.ant-layout-sider');
      const isCollapsed = sider?.classList.contains('ant-layout-sider-collapsed');
      const width = isCollapsed ? '80px' : '240px';
      document.documentElement.style.setProperty('--sidebar-left', width);
    }
    updateSidebarLeft();
    const siderEl = document.querySelector('.ant-layout-sider');
    let siderObserver: MutationObserver | null = null;
    if (siderEl) {
      siderObserver = new MutationObserver(updateSidebarLeft);
      siderObserver.observe(siderEl, { attributes: true, attributeFilter: ['class'] });
    }

    // 应用对应语言翻译到所有插件 UI
    const translations = UI_TRANSLATIONS[locale] || UI_TRANSLATIONS['zh-CN'];

    const t1 = window.setTimeout(() => {
      // 如果 viewer 已被销毁（组件卸载），跳过
      if (viewerRef.current !== viewer) return;

      // 翻译所有插件的 uiConfig
      for (const key in viewer.plugins) {
        const plugin = viewer.plugins[key];
        if (plugin?.uiConfig) {
          translateUiConfig(plugin.uiConfig, translations);
          if (typeof plugin.uiConfig.uiRefresh === 'function') {
            plugin.uiConfig.uiRefresh(true, 'immediate');
          }
        }
      }
      // 翻译 viewer 根 uiConfig
      if (viewer.uiConfig) {
        translateUiConfig(viewer.uiConfig, translations);
        if (typeof viewer.uiConfig.uiRefresh === 'function') {
          viewer.uiConfig.uiRefresh(true, 'immediate');
        }
      }
      // 强制刷新 tweakpane UI
      const tp = viewer.getPlugin(TweakpaneUiPlugin);
      if (tp) tp.refreshPluginsEnabled();

      // 直接翻译 DOM 中的 Tab 标签名（插件类名不在 uiConfig 里）
      const t2 = window.setTimeout(() => {
        if (viewerRef.current !== viewer) return;

        const tabMap: Record<string, string> = {};
        const en = CATEGORY_LABELS['en-US'];
        const zh = CATEGORY_LABELS['zh-CN'];
        for (const key of Object.keys(en)) {
          tabMap[en[key]] = locale === 'zh-CN' ? zh[key] : en[key];
        }
        document.querySelectorAll('.mode-buttons-container .mode-button').forEach(btn => {
          const el = btn as HTMLElement;
          const text = el.textContent?.trim() || '';
          if (tabMap[text]) {
            console.log(`[i18n] tab: "${text}" → "${tabMap[text]}"`);
            el.textContent = tabMap[text];
          }
        });

        // 所有翻译应用完毕后，才隐藏 loading
        setInitializing(false);
      }, 400);
      timeoutIdsRef.current.push(t2);
    }, 200);
    timeoutIdsRef.current.push(t1);

    // 加载示例环境贴图
    viewer.setEnvironmentMap('https://samples.threepipe.org/minimal/venice_sunset_1k.hdr').catch(() => {
      // 环境贴图加载失败不影响编辑器功能
    });

    return () => {
      // 清除所有未执行的 timeout，防止访问已销毁的 viewer
      timeoutIdsRef.current.forEach(id => window.clearTimeout(id));
      timeoutIdsRef.current = [];

      viewer.dispose();
      viewerRef.current = null;

      // 清理所有 TP 浮在 body 上的 DOM 元素（否则 position:fixed 会出现在其他页面）
      const selectors = [
        '.mode-buttons-container',
        '#tweakpaneUiContainer',
        '.util-buttons-container',
        '#fsToggle',
        '#webgi-logo',
        '#tp-lang-toggle',
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
      // 清理注入的 style
      const overrideStyle = document.getElementById('tp-editor-layout-override');
      if (overrideStyle) overrideStyle.remove();
    };
  }, [locale]);  // ← locale 变化时重建 viewer
  
  // ★ 自动环绕：通过 preFrame 事件驱动相机水平旋转（与 threepipe 渲染周期同步）
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !autoOrbit) return;
  
    const camera = viewer.scene.mainCamera;
  
    // 以场景原点为中心，记录当前相机位置参数
    const startPos = camera.position.clone();
    const dx = startPos.x;
    const dz = startPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz); // 水平距离
    const startAngle = Math.atan2(dx, dz);
    const orbitY = startPos.y;
  
    if (dist < 0.01) return; // 安全保护
  
    let angle = startAngle;
  
    const onFrame = (e: { deltaTime: number }) => {
      angle += e.deltaTime * orbitSpeed * 0.5;
      camera.position.set(
        dist * Math.sin(angle),
        orbitY,
        dist * Math.cos(angle)
      );
      camera.lookAt(0, 0, 0);
    };
  
    viewer.addEventListener('preFrame', onFrame as any);
    return () => {
      viewer.removeEventListener('preFrame', onFrame as any);
    };
  }, [autoOrbit, orbitSpeed]);

  return (
    <div style={styles.wrapper}>

      {/* 3D 视口 */}
      <div ref={containerRef} data-threepipe-root="true" style={styles.canvasContainer}>
        {initializing && (
          <div style={styles.loadingOverlay}>
            <Spin size="large" />
            <div style={{ fontSize: 14 }}>{LOCALE_TEXT.initLoading}</div>
          </div>
        )}
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      {/* 语言切换悬浮按钮 —— 始终显示，不受 initializing 影响，定位在画布左上角 */}
      <Tooltip title={LOCALE_TEXT.langToggleTitle} placement="right">
        <div
          style={styles.langToggleBtn}
          onClick={handleLangToggle}
          role="button"
          aria-label={LOCALE_TEXT.langToggleTitle}
        >
          <GlobalOutlined style={{ fontSize: 12, opacity: 0.8 }} />
          <span>{LOCALE_TEXT.langToggleLabel}</span>
        </div>
      </Tooltip>

      {/* ★ 自动环绕展示控制 */}
      <Tooltip title={isZH ? '自动环绕展示作品全貌' : 'Auto Orbit Showcase'} placement="left">
        <div
          style={{
            position: 'absolute' as const,
            top: 8,
            right: 306,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            background: autoOrbit ? 'rgba(102, 126, 234, 0.25)' : 'rgba(30,30,30,0.82)',
            border: autoOrbit ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6,
            color: autoOrbit ? '#b0c0ff' : '#e0e0e0',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            userSelect: 'none' as const,
            backdropFilter: 'blur(6px)',
            transition: 'all 0.3s',
            letterSpacing: '0.02em',
          }}
          onClick={() => setAutoOrbit(!autoOrbit)}
          role="button"
          aria-label={isZH ? '切换自动环绕' : 'Toggle Auto Orbit'}
        >
          <span style={{ fontSize: 14 }}>{autoOrbit ? '⏹' : '🔄'}</span>
          <span>{autoOrbit ? (isZH ? '停止环绕' : 'Stop') : (isZH ? '环绕展示' : 'Orbit')}</span>
        </div>
      </Tooltip>

      {/* ★ 环绕速度调节滑块（仅在环绕开启时展示） */}
      {autoOrbit && (
        <div
          style={{
            position: 'absolute' as const,
            top: 42,
            right: 306,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(30,30,30,0.82)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6,
            backdropFilter: 'blur(6px)',
            fontSize: 12,
            color: '#ccc',
          }}
        >
          <span style={{ opacity: 0.7, minWidth: 32 }}>{isZH ? '速度' : 'Speed'}</span>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={orbitSpeed}
            onChange={e => setOrbitSpeed(parseFloat(e.target.value))}
            style={{ width: 64, height: 4, cursor: 'pointer' }}
            onClick={e => e.stopPropagation()}
          />
          <span style={{ minWidth: 24, textAlign: 'right', opacity: 0.7 }}>{orbitSpeed.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
};

export default ThreepipeEditorPage;
