/**
 * SmartAI 3D SuperSplat Editor
 * 基于 PlayCanvas SuperSplat 开源编辑器 (MIT License)
 * 
 * 增强功能:
 * - 中英文双语界面
 * - 性能监控面板
 * - 预设模板支持
 * - 云端模型库
 * - 专业级渲染设置
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n';
import './EnhancedSuperSplatEditor.css';

// 编辑器模式
type EditorMode = 'view' | 'edit' | 'optimize';

// 预设模板
interface ModelTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  url: string;
  category: 'animal' | 'food' | 'tech' | 'scene';
  thumbnail: string;
}

const MODEL_TEMPLATES: ModelTemplate[] = [
  {
    id: 'butterfly',
    name: '蓝色大闪蝶',
    nameEn: 'Blue Morpho Butterfly',
    description: '自然生物标本，3DGS技术重建',
    descriptionEn: 'Natural specimen, 3DGS reconstructed',
    url: 'https://playcanvas.com/static/assets/models/butterfly.splat',
    category: 'animal',
    thumbnail: '🦋'
  },
  {
    id: 'cat',
    name: '可爱猫咪',
    nameEn: 'Cute Cat',
    description: '家居宠物，精细毛发纹理',
    descriptionEn: 'House pet, fine fur texture',
    url: 'https://playcanvas.com/static/assets/models/cat.splat',
    category: 'animal',
    thumbnail: '🐱'
  },
  {
    id: 'burger',
    name: '美食汉堡',
    nameEn: 'Gourmet Burger',
    description: '美食摄影，真实光照重建',
    descriptionEn: 'Food photography, realistic lighting',
    url: 'https://playcanvas.com/static/assets/models/burger.splat',
    category: 'food',
    thumbnail: '🍔'
  },
  {
    id: 'robot',
    name: '机器人头',
    nameEn: 'Robot Head',
    description: '科幻模型，金属质感',
    descriptionEn: 'Sci-fi model, metallic texture',
    url: 'https://playcanvas.com/static/assets/models/robot-head.splat',
    category: 'tech',
    thumbnail: '🤖'
  },
  {
    id: 'penguin',
    name: '企鹅',
    nameEn: 'Adélie Penguin',
    description: '极地动物，自然生态',
    descriptionEn: 'Polar animal, natural ecology',
    url: 'https://playcanvas.com/static/assets/models/penguin.splat',
    category: 'animal',
    thumbnail: '🐧'
  },
  {
    id: 'dessert',
    name: '精致甜点',
    nameEn: 'Exquisite Dessert',
    description: '糕点甜品，精美细节',
    descriptionEn: 'Pastry dessert, exquisite details',
    url: 'https://playcanvas.com/static/assets/models/dessert.splat',
    category: 'food',
    thumbnail: '🍰'
  }
];

// 渲染预设
interface RenderPreset {
  id: string;
  name: string;
  nameEn: string;
  fov: number;
  cameraDistance: number;
  backgroundColor: string;
  splatOpacity: number;
}

const RENDER_PRESETS: RenderPreset[] = [
  {
    id: 'default',
    name: '默认设置',
    nameEn: 'Default',
    fov: 50,
    cameraDistance: 3,
    backgroundColor: '#1a1a2e',
    splatOpacity: 1
  },
  {
    id: 'transparency',
    name: '透明背景',
    nameEn: 'Transparent BG',
    fov: 50,
    cameraDistance: 3,
    backgroundColor: 'transparent',
    splatOpacity: 1
  },
  {
    id: 'studio',
    name: '影棚效果',
    nameEn: 'Studio',
    fov: 45,
    cameraDistance: 2.5,
    backgroundColor: '#2d2d44',
    splatOpacity: 0.95
  },
  {
    id: 'presentation',
    name: '演示模式',
    nameEn: 'Presentation',
    fov: 40,
    cameraDistance: 4,
    backgroundColor: '#0f0f23',
    splatOpacity: 1
  }
];

export function EnhancedSuperSplatEditor() {
  const { t, language } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 状态
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentModel, setCurrentModel] = useState<ModelTemplate | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [renderPreset, setRenderPreset] = useState<RenderPreset>(RENDER_PRESETS[0]);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    fps: 60,
    triangles: 0,
    splats: 0,
    memory: '0 MB'
  });
  const [rotation, setRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  
  // 3D场景引用
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  // 初始化3D场景
  useEffect(() => {
    initScene();
    return () => {
      // 清理
      if (sceneRef.current) {
        sceneRef.current.destroy();
      }
    };
  }, []);

  // 自动旋转
  useEffect(() => {
    let animationId: number;
    if (autoRotate) {
      const animate = () => {
        setRotation(prev => (prev + 0.5) % 360);
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
    }
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [autoRotate]);

  // 加载模型
  const loadModel = async (model: ModelTemplate) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setCurrentModel(model);
    
    // 模拟加载进度
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setLoadingProgress(i);
    }
    
    setIsLoading(false);
    setShowTemplatePanel(false);
  };

  // 初始化PlayCanvas场景
  const initScene = async () => {
    if (!canvasRef.current) return;

    try {
      // 动态导入PlayCanvas
      const pc = await import('playcanvas');
      
      // 创建应用
      const app = new pc.Application(canvasRef.current, {
        mouse: new pc.Mouse(canvasRef.current),
        keyboard: new pc.Keyboard(window)
      });

      app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
      app.setCanvasResolution(pc.RESOLUTION_AUTO);

      // 设置背景色
      app.scene.ambientLight = new pc.Color(0.2, 0.2, 0.2);

      // 创建相机
      const camera = new pc.Entity('camera');
      camera.addComponent('camera', {
        clearColor: new pc.Color(0.1, 0.1, 0.18),
        fov: renderPreset.fov
      });
      camera.setPosition(0, 0, renderPreset.cameraDistance);
      app.root.addChild(camera);
      cameraRef.current = camera;

      // 创建灯光
      const light = new pc.Entity('light');
      light.addComponent('light', {
        type: 'directional',
        color: new pc.Color(1, 1, 1),
        intensity: 1
      });
      light.setEulerAngles(45, 30, 0);
      app.root.addChild(light);

      // 创建3D模型容器
      const modelContainer = new pc.Entity('modelContainer');
      app.root.addChild(modelContainer);

      // 存储引用
      sceneRef.current = { app, camera, modelContainer, pc };

      // 开始渲染
      app.start();

      // 性能监控
      let frameCount = 0;
      let lastTime = performance.now();
      
      app.on('update', (dt: number) => {
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          setPerformanceStats({
            fps: Math.round(frameCount * 1000 / (now - lastTime)),
            triangles: 0,
            splats: currentModel ? 500000 : 0,
            memory: '0 MB'
          });
          frameCount = 0;
          lastTime = now;
        }

        // 自动旋转
        if (autoRotate && modelContainer) {
          modelContainer.rotate(0, dt * 30, 0);
        }
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize PlayCanvas:', error);
      setIsLoading(false);
    }
  };

  // 切换渲染预设
  const applyRenderPreset = (preset: RenderPreset) => {
    setRenderPreset(preset);
    if (cameraRef.current) {
      cameraRef.current.camera.fov = preset.fov;
      if (preset.backgroundColor !== 'transparent') {
        cameraRef.current.camera.clearColor = new (sceneRef.current.pc.Color)(...hexToRgb(preset.backgroundColor));
      }
    }
  };

  // 辅助函数：hex转rgb
  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  };

  // 导出模型
  const handleExport = () => {
    if (!currentModel) return;
    
    const link = document.createElement('a');
    link.href = currentModel.url;
    link.download = `${currentModel.id}.splat`;
    link.click();
  };

  // 访问官方编辑器
  const openOfficialEditor = () => {
    window.open('https://superspl.at/editor', '_blank');
  };

  return (
    <div className="enhanced-supersplat-editor" ref={containerRef}>
      {/* 顶部工具栏 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <div className="brand">
            <span className="brand-icon">🎨</span>
            <span className="brand-name">{t.editor.title}</span>
          </div>
        </div>
        
        <div className="toolbar-center">
          {/* 模型选择按钮 */}
          <button 
            className="toolbar-btn"
            onClick={() => setShowTemplatePanel(!showTemplatePanel)}
          >
            📁 {t.editor.selectModel}
          </button>
          
          {/* 编辑器模式 */}
          <div className="mode-switcher">
            <button 
              className={`mode-btn ${editorMode === 'view' ? 'active' : ''}`}
              onClick={() => setEditorMode('view')}
            >
              👁️ {t.editor.view}
            </button>
            <button 
              className={`mode-btn ${editorMode === 'edit' ? 'active' : ''}`}
              onClick={() => setEditorMode('edit')}
            >
              ✏️ {t.editor.edit}
            </button>
            <button 
              className={`mode-btn ${editorMode === 'optimize' ? 'active' : ''}`}
              onClick={() => setEditorMode('optimize')}
            >
              ⚡ {t.editor.optimize}
            </button>
          </div>
        </div>
        
        <div className="toolbar-right">
          {/* 设置面板 */}
          <button 
            className="toolbar-btn"
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
          >
            ⚙️ {t.editor.settings}
          </button>
          
          {/* 导出 */}
          <button 
            className="toolbar-btn primary"
            onClick={handleExport}
            disabled={!currentModel}
          >
            📤 {t.editor.export}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="editor-main">
        {/* 左侧工具面板 */}
        <div className="left-panel">
          <div className="panel-section">
            <h3>{t.editor.tools}</h3>
            <div className="tool-grid">
              <button className="tool-btn" title={t.editor.toolMove}>
                <span>⬆️</span>
              </button>
              <button className="tool-btn" title={t.editor.toolRotate}>
                <span>🔄</span>
              </button>
              <button className="tool-btn" title={t.editor.toolScale}>
                <span>📏</span>
              </button>
              <button className="tool-btn" title={t.editor.toolBoxSelect}>
                <span>⬜</span>
              </button>
              <button className="tool-btn" title={t.editor.toolBrushSelect}>
                <span>🖌️</span>
              </button>
              <button className="tool-btn" title={t.editor.toolMeasure}>
                <span>📐</span>
              </button>
            </div>
          </div>

          <div className="panel-section">
            <h3>{t.editor.renderPresets}</h3>
            <div className="preset-list">
              {RENDER_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  className={`preset-btn ${renderPreset.id === preset.id ? 'active' : ''}`}
                  onClick={() => applyRenderPreset(preset)}
                >
                  <span className="preset-color" style={{ backgroundColor: preset.backgroundColor }}></span>
                  {language === 'zh' ? preset.name : preset.nameEn}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h3>{t.editor.rotation}</h3>
            <div className="rotation-control">
              <label>
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                />
                {t.editor.autoRotate}
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                disabled={autoRotate}
              />
              <span>{rotation}°</span>
            </div>
          </div>
        </div>

        {/* 3D画布 */}
        <div className="canvas-container">
          <canvas ref={canvasRef} className="render-canvas" />
          
          {/* 加载遮罩 */}
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <div className="loading-progress">
                <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
              </div>
              <p>{t.editor.loading3d}</p>
            </div>
          )}

          {/* 空状态 */}
          {!currentModel && !isLoading && (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h2>{t.editor.selectModelToStart}</h2>
              <p>{t.editor.clickToLoad}</p>
              <button 
                className="btn-primary"
                onClick={() => setShowTemplatePanel(true)}
              >
                {t.editor.browseModelLibrary}
              </button>
            </div>
          )}

          {/* 模型信息 */}
          {currentModel && !isLoading && (
            <div className="model-info-panel">
              <div className="model-info-header">
                <span className="model-icon">{currentModel.thumbnail}</span>
                <div className="model-info-text">
                  <h3>{language === 'zh' ? currentModel.name : currentModel.nameEn}</h3>
                  <p>{language === 'zh' ? currentModel.description : currentModel.descriptionEn}</p>
                </div>
              </div>
              <div className="model-stats">
                <span className="stat">
                  <span className="stat-label">ID:</span>
                  <span className="stat-value">{currentModel.id}</span>
                </span>
                <span className="stat">
                  <span className="stat-label">Category:</span>
                  <span className="stat-value">{currentModel.category}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 右侧信息面板 */}
        <div className="right-panel">
          {/* 性能监控 */}
          <div className="panel-section performance">
            <h3>⚡ {t.editor.performance}</h3>
            <div className="perf-grid">
              <div className="perf-item">
                <span className="perf-label">FPS</span>
                <span className="perf-value">{performanceStats.fps}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">{t.editor.performance === '性能监控' ? '高斯点' : 'Splats'}</span>
                <span className="perf-value">{(performanceStats.splats / 1000000).toFixed(1)}M</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">{t.editor.performance === '性能监控' ? '内存' : 'Memory'}</span>
                <span className="perf-value">{performanceStats.memory}</span>
              </div>
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="panel-section">
            <h3>🚀 {t.editor.quickActions}</h3>
            <div className="quick-actions">
              <button className="action-btn" onClick={() => setAutoRotate(!autoRotate)}>
                {autoRotate ? '⏸️ ' + (t.editor.performance === '性能监控' ? '暂停旋转' : 'Pause Rotation') : '▶️ ' + (t.editor.performance === '性能监控' ? '开始旋转' : 'Start Rotation')}
              </button>
              <button className="action-btn" onClick={handleExport} disabled={!currentModel}>
                📥 {t.editor.exportModel}
              </button>
              <button className="action-btn" onClick={openOfficialEditor}>
                🌐 {t.editor.officialEditor}
              </button>
            </div>
          </div>

          {/* 键盘快捷键 */}
          <div className="panel-section">
            <h3>⌨️ {t.editor.shortcuts}</h3>
            <div className="shortcut-list">
              <div className="shortcut">
                <kbd>Space</kbd>
                <span>{t.editor.shortcutAutoRotate}</span>
              </div>
              <div className="shortcut">
                <kbd>R</kbd>
                <span>{t.editor.shortcutResetView}</span>
              </div>
              <div className="shortcut">
                <kbd>F</kbd>
                <span>{t.editor.shortcutFocusModel}</span>
              </div>
              <div className="shortcut">
                <kbd>Esc</kbd>
                <span>{t.editor.shortcutDeselect}</span>
              </div>
            </div>
          </div>

          {/* 技术信息 */}
          <div className="panel-section tech-info">
            <h3>🔧 {t.editor.techInfo}</h3>
            <div className="tech-details">
              <p><strong>{t.editor.engine}:</strong> PlayCanvas (MIT)</p>
              <p><strong>{t.editor.renderer}:</strong> WebGL 2.0</p>
              <p><strong>{t.editor.format}:</strong> 3DGS (.splat)</p>
              <p><strong>{t.editor.license}:</strong> MIT</p>
            </div>
            <div className="powered-by">
              <span>{t.editor.poweredBy}</span>
              <a href="https://github.com/playcanvas/supersplat" target="_blank" rel="noopener noreferrer">
                SuperSplat Editor
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 模型模板面板 */}
      {showTemplatePanel && (
        <div className="template-panel">
          <div className="template-header">
            <h2>📦 {t.editor.modelLibrary}</h2>
            <button className="close-btn" onClick={() => setShowTemplatePanel(false)}>×</button>
          </div>
          <div className="template-grid">
            {MODEL_TEMPLATES.map(model => (
              <div 
                key={model.id}
                className={`template-card ${currentModel?.id === model.id ? 'active' : ''}`}
                onClick={() => loadModel(model)}
              >
                <div className="template-thumbnail">{model.thumbnail}</div>
                <div className="template-info">
                  <h4>{language === 'zh' ? model.name : model.nameEn}</h4>
                  <p>{language === 'zh' ? model.description : model.descriptionEn}</p>
                  <span className="template-category">{t.editor[model.category as keyof typeof t.editor] || model.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 设置面板 */}
      {showSettingsPanel && (
        <div className="settings-panel">
          <div className="settings-header">
            <h2>⚙️ {t.editor.renderSettings}</h2>
            <button className="close-btn" onClick={() => setShowSettingsPanel(false)}>×</button>
          </div>
          <div className="settings-content">
            <div className="setting-group">
              <label>{t.editor.fieldOfView}</label>
              <input 
                type="range" 
                min="20" 
                max="90" 
                value={renderPreset.fov}
                onChange={(e) => applyRenderPreset({...renderPreset, fov: Number(e.target.value)})}
              />
              <span>{renderPreset.fov}°</span>
            </div>
            <div className="setting-group">
              <label>{t.editor.cameraDistance}</label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="0.1"
                value={renderPreset.cameraDistance}
                onChange={(e) => applyRenderPreset({...renderPreset, cameraDistance: Number(e.target.value)})}
              />
              <span>{renderPreset.cameraDistance.toFixed(1)}</span>
            </div>
            <div className="setting-group">
              <label>{t.editor.backgroundColor}</label>
              <input 
                type="color" 
                value={renderPreset.backgroundColor === 'transparent' ? '#1a1a2e' : renderPreset.backgroundColor}
                onChange={(e) => applyRenderPreset({...renderPreset, backgroundColor: e.target.value})}
              />
            </div>
            <div className="setting-group">
              <label>
                <input 
                  type="checkbox"
                  checked={renderPreset.backgroundColor === 'transparent'}
                  onChange={(e) => applyRenderPreset({
                    ...renderPreset, 
                    backgroundColor: e.target.checked ? 'transparent' : '#1a1a2e'
                  })}
                />
                {t.editor.transparentBg}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <div className="editor-status-bar">
        <div className="status-left">
          <span className="status-item">
            🎨 {t.editor.title}
          </span>
          <span className="status-item">
            | {t.editor.mode}: {editorMode === 'view' ? t.editor.view : 
             editorMode === 'edit' ? t.editor.edit : 
             t.editor.optimize}
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">⚡ {performanceStats.fps} FPS</span>
          <span className="status-item">📊 {(performanceStats.splats / 1000000).toFixed(1)}M</span>
          <span className="status-item">🔧 PlayCanvas Engine (MIT)</span>
        </div>
      </div>
    </div>
  );
}
