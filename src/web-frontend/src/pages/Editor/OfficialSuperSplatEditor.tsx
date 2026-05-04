/**
 * 3D编辑器页面 - 整版模型展示 + Gallery风格布局
 * 支持左右切换浏览多个3D模型
 */

import { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';
import { useTranslation } from '../../i18n';
import { LeftOutlined, RightOutlined, DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import './OfficialSuperSplatEditor.css';

// 3D模型数据结构
interface Model3D {
  id: string;
  title: string;
  description: string;
  modelPath: string;
  tags: string[];
  createdAt: string;
  fileSize: string;
  author: string;
}

// 模拟模型数据（后续可接入真实数据）
const MODELS_3D: Model3D[] = [
  {
    id: 'model-1',
    title: '🎨 混元3D生成作品 #1',
    description: '使用腾讯混元3D大模型生成的专业3D模型，支持实时交互查看',
    modelPath: '/models/1.glb',
    tags: ['混元3D', 'GLB', 'AI生成'],
    createdAt: '2026-04-18',
    fileSize: '78 MB',
    author: 'SmartAI Team',
  },
  // 后续可以添加更多模型
];

// 3D模型显示组件
function ModelDisplay({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath);
  
  return (
    <primitive object={scene} scale={1.5} />
  );
}

// 3D场景组件
function Scene({ modelPath }: { modelPath: string }) {
  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.6} />
      
      {/* 主光源 */}
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1.2} 
        castShadow
      />
      
      {/* 补光 */}
      <directionalLight 
        position={[-5, 5, -5]} 
        intensity={0.4} 
      />
      
      {/* 背景光 */}
      <directionalLight 
        position={[0, -5, 0]} 
        intensity={0.3} 
      />
      
      <ModelDisplay modelPath={modelPath} />
      
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={1}
        minDistance={1}
        maxDistance={50}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    </>
  );
}

export function OfficialSuperSplatEditor() {
  // const { t } = useTranslation();  // 暂未使用，保留以便将来扩展
  const { language } = useTranslation();
  const isZh = language === 'zh-CN';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentModel = MODELS_3D[currentIndex];
  
  // 导航
  const goPrev = useCallback(() => {
    setIsLoading(true);
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);
  
  const goNext = useCallback(() => {
    setIsLoading(true);
    setCurrentIndex(prev => Math.min(MODELS_3D.length - 1, prev + 1));
  }, []);
  
  // 键盘导航
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  }, [goPrev, goNext]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // 监听模型切换，延迟隐藏加载层
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // 给模型加载留出时间
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isLoading]);
  
  return (
    <div className="official-editor-page">
      {/* 背景动画 */}
      <div className="background-effects">
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="glow glow-3" />
      </div>
      
      {/* 主内容区 - Gallery风格 */}
      <div className="editor-main-container">
        {/* 左侧导航箭头 */}
        <button
          className={`editor-nav-arrow editor-nav-prev ${currentIndex === 0 ? 'disabled' : ''}`}
          onClick={goPrev}
          disabled={currentIndex === 0}
          title={isZh ? '上一个模型' : 'Previous Model'}
        >
          <LeftOutlined />
        </button>
        
        {/* 中间3D展示区域 - 整版 */}
        <div className="editor-3d-viewport">
          {/* 模型信息头部 */}
          <div className="editor-model-header">
            <div className="editor-model-title">
              <span className="editor-model-icon">🎨</span>
              <div>
                <h2 className="editor-model-name">{currentModel.title}</h2>
                <p className="editor-model-subtitle">{currentModel.description}</p>
              </div>
            </div>
            <div className="editor-model-actions">
              <button 
                className="editor-action-btn"
                onClick={() => setShowInfo(true)}
                title={isZh ? '模型信息' : 'Model Info'}
              >
                <InfoCircleOutlined />
              </button>
              <button 
                className="editor-action-btn primary"
                onClick={() => window.open(currentModel.modelPath, '_blank')}
                title={isZh ? '下载模型' : 'Download Model'}
              >
                <DownloadOutlined />
                <span>{isZh ? '下载' : 'Download'}</span>
              </button>
            </div>
          </div>
          
          {/* 3D Canvas - 整版展示 */}
          <div className="editor-canvas-container">
            {/* 加载覆盖层 */}
            <div 
              className={`editor-loading-overlay ${isLoading ? 'visible' : 'hidden'}`}
              style={{ 
                opacity: isLoading ? 1 : 0,
                visibility: isLoading ? 'visible' : 'hidden',
                pointerEvents: isLoading ? 'auto' : 'none'
              }}
            >
              <div className="editor-spinner" />
              <p>{isZh ? '正在加载3D模型...' : 'Loading 3D model...'}</p>
            </div>
            
            <Canvas 
              camera={{ position: [5, 3, 5], fov: 45 }}
              style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }}
              gl={{ 
                antialias: true, 
                alpha: false,
                powerPreference: 'high-performance'
              }}
            >
              {/* 背景颜色 */}
              <color attach="background" args={['#0a0a1a']} />
              
              {/* 加载fallback */}
              <Suspense fallback={
                <group>
                  <mesh>
                    <torusGeometry args={[1, 0.3, 16, 32]} />
                    <meshStandardMaterial color="#667eea" emissive="#667eea" emissiveIntensity={0.5} />
                  </mesh>
                </group>
              }>
                <Scene modelPath={currentModel.modelPath} />
              </Suspense>
            </Canvas>
          </div>
          
          {/* 底部控制提示 */}
          <div className="editor-controls-hint">
            <div className="editor-hint-item">
              <span className="hint-icon">🖱️</span>
              <span>{isZh ? '左键旋转' : 'Left: Rotate'}</span>
            </div>
            <div className="editor-hint-item">
              <span className="hint-icon">🔄</span>
              <span>{isZh ? '自动旋转' : 'Auto Rotate'}</span>
            </div>
            <div className="editor-hint-item">
              <span className="hint-icon">📱</span>
              <span>{isZh ? '拖拽切换' : 'Drag to Switch'}</span>
            </div>
            <div className="editor-hint-item">
              <span className="hint-icon">⌨️</span>
              <span>{isZh ? '← → 键切换' : '← → Keys'}</span>
            </div>
          </div>
          
          {/* 标签 */}
          <div className="editor-tags">
            {currentModel.tags.map(tag => (
              <span key={tag} className="editor-tag">{tag}</span>
            ))}
          </div>
        </div>
        
        {/* 右侧导航箭头 */}
        <button
          className={`editor-nav-arrow editor-nav-next ${currentIndex >= MODELS_3D.length - 1 ? 'disabled' : ''}`}
          onClick={goNext}
          disabled={currentIndex >= MODELS_3D.length - 1}
          title={isZh ? '下一个模型' : 'Next Model'}
        >
          <RightOutlined />
        </button>
      </div>
      
      {/* 底部页码指示器 */}
      <div className="editor-pagination">
        {MODELS_3D.map((_, index) => (
          <button
            key={index}
            className={`editor-pagination-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
            title={`模型 ${index + 1}`}
          />
        ))}
        <span className="editor-pagination-text">
          {currentIndex + 1} / {MODELS_3D.length}
        </span>
      </div>
      
      {/* 模型信息弹窗 */}
      <Modal
        title={isZh ? '模型详细信息' : 'Model Details'}
        open={showInfo}
        onCancel={() => setShowInfo(false)}
        footer={null}
        width={600}
      >
        <div className="editor-model-info-modal">
          <div className="info-item">
            <span className="info-label">{isZh ? '模型名称' : 'Model Name'}</span>
            <span className="info-value">{currentModel.title}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{isZh ? '文件大小' : 'File Size'}</span>
            <span className="info-value">{currentModel.fileSize}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{isZh ? '创建时间' : 'Created'}</span>
            <span className="info-value">{currentModel.createdAt}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{isZh ? '作者' : 'Author'}</span>
            <span className="info-value">{currentModel.author}</span>
          </div>
          <div className="info-item">
            <span className="info-label">{isZh ? '描述' : 'Description'}</span>
            <span className="info-value">{currentModel.description}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default OfficialSuperSplatEditor;
