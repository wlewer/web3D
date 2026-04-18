// SuperSplat 官方场景展示页面
import { useState, useEffect } from 'react';
import './SuperSplatPage.css';

// 官方SuperSplat精选场景
const OFFICIAL_SCENES = [
  {
    id: 'church',
    name: 'Church of the Holy Apostles',
    emoji: '🏛️',
    description: 'Historical architecture reconstruction - 教堂建筑3D重建',
    sceneUrl: 'https://superspl.at/scene/34eb266d',
    color: '#667eea',
    gaussians: '5M',
    images: '1,166',
  },
  {
    id: 'bumblebee',
    name: 'Brown-banded Carder Bumblebee',
    emoji: '🐝',
    description: 'Wildlife specimen digitization - 微距生物数字化',
    sceneUrl: 'https://superspl.at/scene/65ff2330',
    color: '#f97316',
    gaussians: '8M',
    size: '606MB',
  },
  {
    id: 'dessert',
    name: 'Exquisite Dessert',
    emoji: '🍰',
    description: 'Fine dessert 3D reconstruction - 甜点精细建模',
    sceneUrl: 'https://superspl.at/scene/example',
    color: '#ec4899',
    gaussians: '3M',
  },
];

export function SuperSplatPage() {
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState(0);

  useEffect(() => {
    // 模拟加载
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
          <h2 className="panel-title">🎯 精选场景</h2>
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
            <h3>📚 什么是3DGS?</h3>
            <p>3D Gaussian Splatting 是一种新型神经渲染技术，可以从照片中重建出高质量的3D场景。</p>
            <ul>
              <li>🚀 <strong>实时渲染</strong> - 60fps流畅交互</li>
              <li>✨ <strong>超高质量</strong> - 毫米级精度</li>
              <li>🌐 <strong>网页原生</strong> - 无需安装插件</li>
            </ul>
          </div>
        </aside>

        {/* 中间3D预览区 */}
        <div className="scene-preview-area">
          {loading ? (
            <div className="loading-overlay">
              <div className="loading-content">
                <div className="loading-spinner" />
                <p>正在加载3D场景...</p>
                <span className="loading-hint">首次加载可能需要几秒钟</span>
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
              
              {/* 跳转到官方查看 */}
              <div className="preview-action">
                <a 
                  href={currentScene.sceneUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-full-btn"
                >
                  🔗 在 SuperSplat 官方查看完整3D效果
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 右侧信息面板 */}
        <aside className="scene-info-panel">
          <div className="info-card" style={{ '--accent-color': currentScene.color } as React.CSSProperties}>
            <span className="info-badge" style={{ background: currentScene.color }}>
              3D Gaussian Splatting
            </span>
            <h2 className="info-title">{currentScene.emoji} {currentScene.name}</h2>
            <p className="info-desc">{currentScene.description}</p>
            
            <div className="info-stats">
              <div className="stat-item">
                <span className="stat-value">{currentScene.gaussians}</span>
                <span className="stat-label">高斯点数</span>
              </div>
              {currentScene.images && (
                <div className="stat-item">
                  <span className="stat-value">{currentScene.images}</span>
                  <span className="stat-label">训练图像</span>
                </div>
              )}
              {currentScene.size && (
                <div className="stat-item">
                  <span className="stat-value">{currentScene.size}</span>
                  <span className="stat-label">文件大小</span>
                </div>
              )}
            </div>
            
            <div className="info-tags">
              <span className="info-tag">MIT开源</span>
              <span className="info-tag">PlayCanvas</span>
              <span className="info-tag">Real-time</span>
            </div>
          </div>
          
          {/* 操作说明 */}
          <div className="control-guide">
            <h3>🖱️ 在官方查看器中操作</h3>
            <ul>
              <li><strong>拖拽</strong> - 旋转视角</li>
              <li><strong>滚轮</strong> - 缩放模型</li>
              <li><strong>右键拖拽</strong> - 平移视角</li>
              <li><strong>双击</strong> - 重置视角</li>
            </ul>
          </div>
          
          {/* 相关链接 */}
          <div className="links-card">
            <h3>🔗 相关资源</h3>
            <a href="https://superspl.at/editor" target="_blank" rel="noopener noreferrer">
              🎨 SuperSplat Editor
            </a>
            <a href="https://github.com/playcanvas/supersplat" target="_blank" rel="noopener noreferrer">
              📦 GitHub (MIT开源)
            </a>
            <a href="https://playcanvas.com" target="_blank" rel="noopener noreferrer">
              ⚡ PlayCanvas Engine
            </a>
          </div>
        </aside>
      </main>

      {/* 底部技术说明 */}
      <footer className="supersplat-footer">
        <div className="tech-info">
          <span>SmartAI 3D 支持多种3DGS技术：Spark.js (Three.js) + SuperSplat (PlayCanvas)</span>
        </div>
      </footer>
    </div>
  );
}
