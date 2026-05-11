// SuperSplat 官方场景展示页面
import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import './SuperSplatPage.css';

// 官方SuperSplat精选场景
const OFFICIAL_SCENES = [
  {
    id: 'church',
    name: 'Church of the Holy Apostles',
    nameZh: '圣徒教堂',
    emoji: '🏛️',
    description: 'Historical architecture reconstruction',
    descriptionZh: '历史建筑重建',
    sceneUrl: 'https://superspl.at/scene/34eb266d',
    color: '#667eea',
    gaussians: '5M',
    images: '1,166',
  },
  {
    id: 'bumblebee',
    name: 'Brown-banded Carder Bumblebee',
    nameZh: '棕带大黄蜂',
    emoji: '🐝',
    description: 'Wildlife specimen digitization',
    descriptionZh: '野生动物标本数字化',
    sceneUrl: 'https://superspl.at/scene/65ff2330',
    color: '#f97316',
    gaussians: '8M',
    size: '606MB',
  },
  {
    id: 'dessert',
    name: 'Exquisite Dessert',
    nameZh: '精致甜点',
    emoji: '🍰',
    description: 'Fine dessert 3D reconstruction',
    descriptionZh: '精致甜点3D重建',
    sceneUrl: 'https://superspl.at/scene/example',
    color: '#ec4899',
    gaussians: '3M',
  },
];

export function SuperSplatPage() {
  const { language } = useTranslation();
  const isZh = language.startsWith('zh');
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const currentScene = OFFICIAL_SCENES[selectedScene];

  return (
    <div className="supersplat-page">
      {/* 主内容区域 */}
      <main className="supersplat-main">
        {/* 左侧场景列表 */}
        <aside className="scene-list-panel">
          <h2 className="panel-title">🎯 {isZh ? '精选场景' : 'Featured Scenes'}</h2>
          <div className="scene-list">
            {OFFICIAL_SCENES.map((scene, index) => (
              <button
                key={scene.id}
                className={`scene-item ${index === selectedScene ? 'active' : ''}`}
                onClick={() => {
                  setSelectedScene(index);
                  setLoading(true);
                }}
                style={{ '--scene-color': scene.color } as React.CSSProperties}
              >
                <span className="scene-emoji">{scene.emoji}</span>
                <div className="scene-info">
                  <span className="scene-name">{scene.name}</span>
                  <span className="scene-meta">{scene.gaussians} Gaussians</span>
                </div>
              </button>
            ))}
          </div>
          
          {/* 技术说明 */}
          <div className="tech-explainer">
            <h3>📚 {isZh ? '什么是3DGS?' : 'What is 3DGS?'}</h3>
            <p>{isZh 
              ? '3D Gaussian Splatting 是一种新型神经渲染技术，可以从照片中重建出高质量的3D场景。'
              : '3D Gaussian Splatting is a novel neural rendering technique that can reconstruct high-quality 3D scenes from photos.'}</p>
            <ul>
              <li>🚀 <strong>{isZh ? '实时渲染' : 'Real-time Rendering'}</strong> - 60fps {isZh ? '流畅交互' : 'Smooth Interaction'}</li>
              <li>✨ <strong>{isZh ? '超高质量' : 'Ultra High Quality'}</strong> - {isZh ? '毫米级精度' : 'Millimeter-level Precision'}</li>
              <li>🌐 <strong>{isZh ? '网页原生' : 'Web Native'}</strong> - {isZh ? '无需安装插件' : 'No Plugin Required'}</li>
            </ul>
          </div>
        </aside>

        {/* 中间3D预览区 */}
        <div className="scene-preview-area">
          {loading ? (
            <div className="loading-overlay">
              <div className="loading-content">
                <div className="loading-spinner" />
                <p>{isZh ? '正在加载3D场景...' : 'Loading 3D Scene...'}</p>
                <span className="loading-hint">{isZh ? '首次加载可能需要几秒钟' : 'First load may take a few seconds'}</span>
              </div>
            </div>
          ) : (
            <div className="preview-content">
              {/* 场景预览图片/占位 */}
              <div className="scene-preview-visual" 
                style={{ background: `linear-gradient(135deg, ${currentScene.color}22 0%, #1a1a2e 100%)` }}>
                <span className="preview-emoji">{currentScene.emoji}</span>
                <span className="preview-title">{currentScene.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* 右侧信息面板 */}
        <aside className="scene-info-panel">
          <div className="info-card" style={{ '--accent-color': currentScene.color } as React.CSSProperties}>
            <span className="info-badge" style={{ background: currentScene.color }}>
              {isZh ? '3DGS 高斯泼溅' : '3D Gaussian Splatting'}
            </span>
            <h2 className="info-title">{currentScene.emoji} {isZh ? (currentScene.nameZh || currentScene.name) : currentScene.name}</h2>
            <p className="info-desc">{isZh ? (currentScene.descriptionZh || currentScene.description) : currentScene.description}</p>
            
            <div className="info-stats">
              <div className="stat-item">
                <span className="stat-value">{currentScene.gaussians}</span>
                <span className="stat-label">{isZh ? '高斯点数' : 'Gaussians'}</span>
              </div>
              {currentScene.images && (
                <div className="stat-item">
                  <span className="stat-value">{currentScene.images}</span>
                  <span className="stat-label">{isZh ? '训练图像' : 'Training Images'}</span>
                </div>
              )}
              {currentScene.size && (
                <div className="stat-item">
                  <span className="stat-value">{currentScene.size}</span>
                  <span className="stat-label">{isZh ? '文件大小' : 'File Size'}</span>
                </div>
              )}
            </div>
            
            <div className="info-tags">
              <span className="info-tag">MIT {isZh ? '开源协议' : 'License'}</span>
              <span className="info-tag">PlayCanvas</span>
              <span className="info-tag">{isZh ? '实时渲染' : 'Real-time'}</span>
            </div>
          </div>
          
          {/* 操作说明 */}
          <div className="control-guide">
            <h3>🖱️ {isZh ? '操作指南' : 'Controls'}</h3>
            <ul>
              <li><strong>{isZh ? '拖拽' : 'Drag'}</strong> - {isZh ? '旋转视角' : 'Rotate View'}</li>
              <li><strong>{isZh ? '滚轮' : 'Scroll'}</strong> - {isZh ? '缩放模型' : 'Zoom Model'}</li>
              <li><strong>{isZh ? '右键拖拽' : 'Right Drag'}</strong> - {isZh ? '平移视角' : 'Pan View'}</li>
              <li><strong>{isZh ? '双击' : 'Double Click'}</strong> - {isZh ? '重置视角' : 'Reset View'}</li>
            </ul>
          </div>
        </aside>
      </main>

      {/* 底部技术说明 */}
      <footer className="supersplat-footer">
        <div className="tech-info">
          <span>SmartAI 3D {isZh ? '支持多种3DGS技术' : 'Supports Multiple 3DGS Technologies'}: Spark.js (Three.js) + SuperSplat (PlayCanvas)</span>
        </div>
      </footer>
    </div>
  );
}
