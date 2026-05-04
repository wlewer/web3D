// 相机配置保存功能测试页面
import { useState, useRef, useEffect } from 'react';
import { UniversalGaussianCardV2, type UniversalGaussianCardRef, type CameraConfig } from '../../components/3d/UniversalGaussianCardV2';
import './CameraConfigTest.css';

// 测试模型列表
const TEST_MODELS = [
  {
    id: 'butterfly',
    name: '🦋 蓝色大闪蝶',
    url: '/models/butterfly.spz'
  },
  {
    id: 'cat',
    name: '🐱 可爱猫咪',
    url: '/models/cat.spz'
  },
  {
    id: 'room',
    name: '🏠 儿童房间',
    url: '/models/kidsroom.spz'
  }
];

export function CameraConfigTest() {
  // const { t } = useTranslation();  // 暂未使用，保留以便将来扩展
  const cardRef = useRef<UniversalGaussianCardRef>(null);
  
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [cameraConfigs, setCameraConfigs] = useState<Record<string, CameraConfig>>({});
  const [configsLoaded, setConfigsLoaded] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  const currentModel = TEST_MODELS[currentModelIndex];
  const currentConfig = cameraConfigs[currentModel.id];
  
  // ★ 调试日志：打印当前模型和配置状态
  console.log(' [测试页面] 当前模型:', currentModel.id, '配置存在:', !!currentConfig, 'configsLoaded:', configsLoaded);
  
  // 从localStorage加载所有配置
  useEffect(() => {
    const saved = localStorage.getItem('test-camera-configs');
    if (saved) {
      try {
        setCameraConfigs(JSON.parse(saved));
        console.log('✅ 已加载保存的相机配置');
      } catch (e) {
        console.error('加载配置失败:', e);
      } finally {
        // 标记配置已加载完成
        setConfigsLoaded(true);
      }
    } else {
      // 没有保存的配置，也标记为已加载
      setConfigsLoaded(true);
    }
  }, []);
  
  // 显示提示消息
  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 2000);
  };
  
  // 保存当前相机配置
  const handleSaveCamera = () => {
    if (!cardRef.current) {
      showNotification('❌ 组件未就绪', 'error');
      return;
    }
    
    try {
      const config = cardRef.current.saveCameraConfig();
      
      const newConfigs = {
        ...cameraConfigs,
        [currentModel.id]: config
      };
      
      setCameraConfigs(newConfigs);
      localStorage.setItem('test-camera-configs', JSON.stringify(newConfigs));
      
      console.log('💾 保存的配置:', config);
      showNotification('✅ 镜头已保存！', 'success');
    } catch (error) {
      console.error('保存失败:', error);
      showNotification('❌ 保存失败', 'error');
    }
  };
  
  // 重置相机到默认位置
  const handleResetCamera = () => {
    if (!cardRef.current) {
      showNotification('❌ 组件未就绪', 'error');
      return;
    }
    
    try {
      cardRef.current.resetCamera();
      
      const newConfigs = { ...cameraConfigs };
      delete newConfigs[currentModel.id];
      setCameraConfigs(newConfigs);
      localStorage.setItem('test-camera-configs', JSON.stringify(newConfigs));
      
      showNotification('🔄 已重置为默认视角', 'info');
    } catch (error) {
      console.error('重置失败:', error);
      showNotification('❌ 重置失败', 'error');
    }
  };
  
  // 切换模型
  const handleSwitchModel = (index: number) => {
    setCurrentModelIndex(index);
    const model = TEST_MODELS[index];
    const hasConfig = cameraConfigs[model.id] ? '有保存配置' : '无保存配置';
    showNotification(`📦 切换到: ${model.name} (${hasConfig})`, 'info');
  };
  
  // 清除所有配置
  const handleClearAll = () => {
    if (confirm('确定要清除所有保存的相机配置吗？')) {
      setCameraConfigs({});
      localStorage.removeItem('test-camera-configs');
      showNotification('🗑️ 已清除所有配置', 'info');
    }
  };
  
  // 导出配置
  const handleExport = () => {
    const dataStr = JSON.stringify(cameraConfigs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `camera-configs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification('📤 配置已导出', 'success');
  };
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // 只在非输入框状态下响应
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 's':
            event.preventDefault();
            handleSaveCamera();
            break;
          case 'r':
            event.preventDefault();
            handleResetCamera();
            break;
        }
      } else {
        // 数字键切换模型
        if (event.key >= '1' && event.key <= '9') {
          const index = parseInt(event.key) - 1;
          if (index < TEST_MODELS.length) {
            handleSwitchModel(index);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cameraConfigs, currentModel]);
  
  return (
    <div className="camera-config-test">
      {/* 提示信息 */}
      {showToast && (
        <div className={`toast toast-${showToast.type}`}>
          {showToast.message}
        </div>
      )}
      
      {/* 主内容区 */}
      <div className="test-content">
        {/* 左侧：3D查看器 */}
        <div className="viewer-section">
          {/* 顶部合并栏 */}
          <div className="top-bar">
            <div className="model-info">
              <h2>{currentModel.name}</h2>
              <span className={`config-status ${currentConfig ? 'saved' : 'unsaved'}`}>
                {currentConfig ? '✅ 已保存配置' : '⚪ 使用默认视角'}
              </span>
            </div>
          </div>
                    
          {/* 控制按钮行 */}
          <div className="control-buttons-row">
            <button 
              className="btn btn-save"
              onClick={handleSaveCamera}
              title="Ctrl+S"
            >
              💾 保存镜头
            </button>
            <button 
              className="btn btn-reset"
              onClick={handleResetCamera}
              title="Ctrl+R"
            >
               重置镜头
            </button>
            <div className="steps-hint-inline">
              <span>调整镜头 → 点击保存 → 下次自动恢复</span>
            </div>
          </div>
          
          <UniversalGaussianCardV2
            ref={cardRef}
            key={`model-${currentModel.url}-${configsLoaded}`}
            modelUrl={currentModel.url}
            customCameraConfig={currentConfig || null}
            layout="featured"
            autoRotate={false}
            showParticles={true}
            showPlatform={true}
            autoCenter={true}
            margin={2.2}
          />
        </div>
        
        {/* 右侧：控制面板 */}
        <aside className="control-panel">
          <div className="panel-section">
            <h3>📦 选择模型</h3>
            <div className="model-list">
              {TEST_MODELS.map((model, index) => (
                <button
                  key={model.id}
                  className={`model-item ${index === currentModelIndex ? 'active' : ''}`}
                  onClick={() => handleSwitchModel(index)}
                >
                  <span className="model-name">{model.name}</span>
                  <span className="model-key">[{index + 1}]</span>
                  {cameraConfigs[model.id] && (
                    <span className="saved-badge">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="panel-section">
            <h3> 配置统计</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">总模型数:</span>
                <span className="stat-value">{TEST_MODELS.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">已保存:</span>
                <span className="stat-value highlight">{Object.keys(cameraConfigs).length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">未保存:</span>
                <span className="stat-value">{TEST_MODELS.length - Object.keys(cameraConfigs).length}</span>
              </div>
            </div>
          </div>
          
          <div className="panel-section">
            <h3>⚙️ 操作</h3>
            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={handleExport}>
                📤 导出配置
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                🗑️ 清除全部
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
