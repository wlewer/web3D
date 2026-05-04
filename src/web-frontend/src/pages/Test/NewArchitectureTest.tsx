/**
 * NewArchitectureTest - 新架构测试页面
 * 
 * 用于测试Week 2完成的所有新组件：
 * - Base3DViewer
 * - UniversalGaussianCardV3
 * - Simple3DViewer
 * - GalleryCard
 * - 装饰模块
 * 
 * @version 1.0.0
 * @author Lingma AI Assistant
 * @date 2026-04-18
 */

import { useState, useRef } from 'react';
import { Base3DViewer } from '../../components/3d/Base3DViewer';
import { UniversalGaussianCardV3 } from '../../components/3d/UniversalGaussianCardV3';
import { Simple3DViewer } from '../../components/3d/Simple3DViewer';
import { GalleryCard } from '../../components/3d/GalleryCard';
import type { Base3DViewerRef } from '../../components/3d/Base3DViewer';
import './NewArchitectureTest.css';

// 测试数据
const TEST_MODELS = [
  {
    id: 'butterfly',
    name: '蓝色大闪蝶',
    url: '/models/butterfly.spz',
    tags: ['SPZ', '动物', '生态']
  },
  {
    id: 'cat',
    name: '可爱猫咪',
    url: '/models/cat.spz',
    tags: ['SPZ', '宠物', '卡通']
  },
  {
    id: 'room',
    name: '儿童房间',
    url: '/models/kidsroom_transparent.glb',
    tags: ['GLB', '室内', '场景']
  }
];

export function NewArchitectureTest() {
  const [activeTest, setActiveTest] = useState<'base' | 'v3' | 'simple' | 'gallery'>('base');
  const [selectedModel, setSelectedModel] = useState(TEST_MODELS[0]);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // 记录测试结果
  const markTestResult = (testName: string, success: boolean) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: success
    }));
  };

  return (
    <div className="new-architecture-test">
      <header className="test-header">
        <h1>🧪 新架构测试页面</h1>
        <p>Week 2完成组件验证 | 相机配置测试入口</p>
      </header>

      {/* 测试导航 */}
      <nav className="test-nav">
        <button 
          className={activeTest === 'base' ? 'active' : ''}
          onClick={() => setActiveTest('base')}
        >
          Base3DViewer
        </button>
        <button 
          className={activeTest === 'v3' ? 'active' : ''}
          onClick={() => setActiveTest('v3')}
        >
          UniversalGaussianCardV3
        </button>
        <button 
          className={activeTest === 'simple' ? 'active' : ''}
          onClick={() => setActiveTest('simple')}
        >
          Simple3DViewer
        </button>
        <button 
          className={activeTest === 'gallery' ? 'active' : ''}
          onClick={() => setActiveTest('gallery')}
        >
          GalleryCard
        </button>
      </nav>

      {/* 模型选择 */}
      <div className="model-selector">
        <h3>选择测试模型：</h3>
        <div className="model-list">
          {TEST_MODELS.map(model => (
            <button
              key={model.id}
              className={selectedModel.id === model.id ? 'active' : ''}
              onClick={() => setSelectedModel(model)}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {/* 测试区域 */}
      <div className="test-area">
        {activeTest === 'base' && (
          <Base3DViewerTest 
            modelUrl={selectedModel.url}
            onResult={(success) => markTestResult('Base3DViewer', success)}
          />
        )}
        
        {activeTest === 'v3' && (
          <V3CardTest 
            modelUrl={selectedModel.url}
            onResult={(success) => markTestResult('UniversalGaussianCardV3', success)}
          />
        )}
        
        {activeTest === 'simple' && (
          <SimpleViewerTest 
            modelUrl={selectedModel.url}
            onResult={(success) => markTestResult('Simple3DViewer', success)}
          />
        )}
        
        {activeTest === 'gallery' && (
          <GalleryCardTest 
            models={TEST_MODELS}
            onResult={(success) => markTestResult('GalleryCard', success)}
          />
        )}
      </div>

      {/* 测试结果统计 */}
      <div className="test-results">
        <h3>📊 测试结果统计</h3>
        <div className="results-grid">
          {Object.entries(testResults).map(([testName, success]) => (
            <div key={testName} className={`result-item ${success ? 'success' : 'fail'}`}>
              <span className="result-icon">{success ? '✅' : '❌'}</span>
              <span className="result-name">{testName}</span>
            </div>
          ))}
        </div>
        <div className="summary">
          <p>
            总计: {Object.keys(testResults).length} | 
            通过: {Object.values(testResults).filter(Boolean).length} | 
            失败: {Object.values(testResults).filter(v => !v).length}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== 子测试组件 ====================

function Base3DViewerTest({ modelUrl, onResult }: { modelUrl: string; onResult: (success: boolean) => void }) {
  const viewerRef = useRef<Base3DViewerRef>(null);

  return (
    <div className="test-section">
      <h2>Base3DViewer 测试</h2>
      <div className="test-description">
        <p>✅ 测试项目：</p>
        <ul>
          <li>模型加载（SPZ/GLB格式）</li>
          <li>智能居中对齐</li>
          <li>相机控制器</li>
          <li>截图功能</li>
          <li>相机配置保存/加载</li>
        </ul>
      </div>
      
      <div className="test-container">
        <Base3DViewer
          ref={viewerRef}
          modelUrl={modelUrl}
          autoCenter={true}
          enableControls={true}
          onLoadComplete={() => onResult(true)}
          onError={() => onResult(false)}
        />
      </div>
    </div>
  );
}

function V3CardTest({ modelUrl, onResult }: { modelUrl: string; onResult: (success: boolean) => void }) {
  return (
    <div className="test-section">
      <h2>UniversalGaussianCardV3 测试</h2>
      <div className="test-description">
        <p>✅ 测试项目：</p>
        <ul>
          <li>展示台装饰模块</li>
          <li>产品标签显示</li>
          <li>加载状态UI</li>
          <li>错误处理</li>
        </ul>
      </div>
      
      <div className="test-container">
        <UniversalGaussianCardV3
          modelUrl={modelUrl}
          showPlatform={true}
          showLabels={true}
          products={[
            {
              id: 'p1',
              name: ' 生态研究',
              description: '用于昆虫生态研究',
              color: '#22c55e'
            }
          ]}
          onLoadComplete={() => onResult(true)}
          onError={() => onResult(false)}
        />
      </div>
    </div>
  );
}

function SimpleViewerTest({ modelUrl, onResult }: { modelUrl: string; onResult: (success: boolean) => void }) {
  return (
    <div className="test-section">
      <h2>Simple3DViewer 测试</h2>
      <div className="test-description">
        <p>✅ 测试项目：</p>
        <ul>
          <li>轻量级加载</li>
          <li>自动旋转</li>
          <li>点击交互</li>
          <li>最小化UI</li>
        </ul>
      </div>
      
      <div className="test-container simple">
        <Simple3DViewer
          modelUrl={modelUrl}
          enableControls={false}
          autoRotate={true}
          onLoadComplete={() => onResult(true)}
          onError={() => onResult(false)}
        />
      </div>
    </div>
  );
}

function GalleryCardTest({ models, onResult }: { models: typeof TEST_MODELS; onResult: (success: boolean) => void }) {
  return (
    <div className="test-section">
      <h2>GalleryCard 测试</h2>
      <div className="test-description">
        <p>✅ 测试项目：</p>
        <ul>
          <li>网格布局</li>
          <li>卡片悬停效果</li>
          <li>标签显示</li>
          <li>点击交互</li>
        </ul>
      </div>
      
      <div className="gallery-grid">
        {models.map(model => (
          <GalleryCard
            key={model.id}
            id={model.id}
            title={model.name}
            description={`测试模型 - ${model.tags.join(', ')}`}
            modelUrl={model.url}
            tags={model.tags}
            onClick={() => {
              console.log('Clicked:', model.id);
              onResult(true);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default NewArchitectureTest;
