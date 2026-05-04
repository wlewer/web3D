/**
 * Week2ComponentsTest - Week 2重构组件验证页面
 * 
 * 测试所有新组件功能：
 * - Base3DViewer（基础查看器）
 * - UniversalGaussianCardV3（展示台卡片）
 * - Simple3DViewer（轻量级查看器）
 * - GalleryCard（画廊卡片）
 * 
 * @version 1.0.0
 * @author Lingma AI Assistant
 * @date 2026-04-18
 */

import { useState, useRef } from 'react';
import { Base3DViewer } from '../../components/3d/Base3DViewer';
import type { Base3DViewerRef } from '../../components/3d/Base3DViewer';
import { UniversalGaussianCardV3 } from '../../components/3d/UniversalGaussianCardV3';
import { Simple3DViewer } from '../../components/3d/Simple3DViewer';
import { GalleryCard } from '../../components/3d/GalleryCard';
import './Week2ComponentsTest.css';

// 测试模型列表
const TEST_MODELS = [
  {
    id: 'butterfly',
    name: '🦋 蓝色大闪蝶',
    url: '/models/butterfly.spz',
    tags: ['SPZ', '动物']
  },
  {
    id: 'cat',
    name: '🐱 可爱猫咪',
    url: '/models/cat.spz',
    tags: ['SPZ', '宠物']
  },
  {
    id: 'room',
    name: '🏠 儿童房间',
    url: '/models/kidsroom_transparent.glb',
    tags: ['GLB', '室内']
  }
];

export function Week2ComponentsTest() {
  const baseViewerRef = useRef<Base3DViewerRef>(null);
  const [selectedModel, setSelectedModel] = useState(TEST_MODELS[0]);
  const [activeTab, setActiveTab] = useState<'base' | 'v3' | 'simple' | 'gallery'>('base');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // 记录测试结果
  const markSuccess = (componentName: string) => {
    setTestResults(prev => ({ ...prev, [componentName]: true }));
  };

  const markFailure = (componentName: string) => {
    setTestResults(prev => ({ ...prev, [componentName]: false }));
  };

  return (
    <div className="week2-test compact">
      {/* 紧凑模型选择器 */}
      <div className="model-selector compact">
        <div className="model-buttons">
          {TEST_MODELS.map(model => (
            <button
              key={model.id}
              className={`model-btn ${selectedModel.id === model.id ? 'active' : ''}`}
              onClick={() => setSelectedModel(model)}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {/* 紧凑标签页 */}
      <nav className="test-tabs compact">
        <button 
          className={activeTab === 'base' ? 'active' : ''}
          onClick={() => setActiveTab('base')}
        >
          Base3DViewer
        </button>
        <button 
          className={activeTab === 'v3' ? 'active' : ''}
          onClick={() => setActiveTab('v3')}
        >
          V3卡片
        </button>
        <button 
          className={activeTab === 'simple' ? 'active' : ''}
          onClick={() => setActiveTab('simple')}
        >
          SimpleViewer
        </button>
        <button 
          className={activeTab === 'gallery' ? 'active' : ''}
          onClick={() => setActiveTab('gallery')}
        >
          GalleryCard
        </button>
      </nav>

      {/* 左右分栏布局 */}
      <div className="test-layout">
        {/* 左侧：测试区域 */}
        <div className="test-main-area compact">
        {/* Base3DViewer 测试 */}
        {activeTab === 'base' && (
          <section className="test-section compact">
            <div className="viewer-container fullscreen">
              <Base3DViewer
                ref={baseViewerRef}
                modelUrl={selectedModel.url}
                autoCenter={true}
                enableControls={true}
                onLoadComplete={() => {
                  console.log('✅ Base3DViewer 加载成功');
                  markSuccess('Base3DViewer');
                }}
                onError={(err) => {
                  console.error('❌ Base3DViewer 加载失败:', err);
                  markFailure('Base3DViewer');
                }}
              />
            </div>
          </section>
        )}

        {/* UniversalGaussianCardV3 测试 */}
        {activeTab === 'v3' && (
          <section className="test-section compact">
            <div className="viewer-container fullscreen">
              <UniversalGaussianCardV3
                modelUrl={selectedModel.url}
                showPlatform={true}
                products={[
                  {
                    id: 'p1',
                    name: '生态研究',
                    description: '用于昆虫生态研究',
                    color: '#22c55e'
                  }
                ]}
                onLoadComplete={() => markSuccess('UniversalGaussianCardV3')}
                onError={() => markFailure('UniversalGaussianCardV3')}
              />
            </div>
          </section>
        )}

        {/* Simple3DViewer 测试 */}
        {activeTab === 'simple' && (
          <section className="test-section compact">
            <div className="viewer-container fullscreen">
              <Simple3DViewer
                modelUrl={selectedModel.url}
                enableControls={false}
                autoRotate={true}
                onLoadComplete={() => markSuccess('Simple3DViewer')}
                onError={() => markFailure('Simple3DViewer')}
              />
            </div>
          </section>
        )}

        {/* GalleryCard 测试 */}
        {activeTab === 'gallery' && (
          <section className="test-section compact">
            <div className="gallery-grid">
              {TEST_MODELS.map(model => (
                <GalleryCard
                  key={model.id}
                  id={model.id}
                  title={model.name}
                  description={`格式: ${model.tags[0]} | 分类: ${model.tags[1]}`}
                  modelUrl={model.url}
                  tags={model.tags}
                  onClick={(id) => {
                    console.log('点击卡片:', id);
                    markSuccess('GalleryCard');
                  }}
                />
              ))}
            </div>
          </section>
        )}
        </div>

        {/* 右侧：测试结果 */}
        <aside className="test-sidebar">
          <h3>📊 测试结果</h3>
          <div className="results-grid">
          {['Base3DViewer', 'UniversalGaussianCardV3', 'Simple3DViewer', 'GalleryCard'].map(name => (
            <div 
              key={name} 
              className={`result-card ${testResults[name] === true ? 'success' : testResults[name] === false ? 'fail' : 'pending'}`}
            >
              <span className="result-icon">
                {testResults[name] === true ? '✅' : testResults[name] === false ? '❌' : '⏳'}
              </span>
              <span className="result-name">{name}</span>
              <span className="result-status">
                {testResults[name] === true ? '通过' : testResults[name] === false ? '失败' : '待测试'}
              </span>
            </div>
          ))}
        </div>
        
        <div className="summary">
          <p>
            总计: 4 | 
            通过: {Object.values(testResults).filter(Boolean).length} | 
            失败: {Object.values(testResults).filter(v => v === false).length} | 
            待测试: {4 - Object.keys(testResults).length}
          </p>
        </div>
        </aside>
      </div>
    </div>
  );
}

export default Week2ComponentsTest;
