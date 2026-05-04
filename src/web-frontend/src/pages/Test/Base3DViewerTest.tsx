/**
 * Base3DViewer 测试页面
 * 
 * 用于测试基础3D查看器的功能
 */

import React, { useRef } from 'react';
import { Base3DViewer } from '../../components/3d/Base3DViewer';
import type { Base3DViewerRef } from '../../components/3d/Base3DViewer';

export function Base3DViewerTest() {
  const viewerRef = useRef<Base3DViewerRef>(null);

  const handleLoadComplete = () => {
    console.log('✅ 模型加载完成');
  };

  const handleError = (error: Error) => {
    console.error('❌ 模型加载失败:', error);
  };

  const handleProgress = (progress: number) => {
    console.log(`📊 加载进度: ${progress}%`);
  };

  const handleScreenshot = () => {
    if (viewerRef.current) {
      const dataUrl = viewerRef.current.screenshot();
      const link = document.createElement('a');
      link.download = 'screenshot.png';
      link.href = dataUrl;
      link.click();
    }
  };

  const handleSaveConfig = () => {
    if (viewerRef.current) {
      try {
        const config = viewerRef.current.saveCameraConfig();
        console.log('💾 相机配置已保存:', config);
        localStorage.setItem('cameraConfig', JSON.stringify(config));
      } catch (error) {
        console.error('保存配置失败:', error);
      }
    }
  };

  const handleLoadConfig = () => {
    if (viewerRef.current) {
      try {
        const configStr = localStorage.getItem('cameraConfig');
        if (configStr) {
          const config = JSON.parse(configStr);
          viewerRef.current.loadCameraConfig(config);
          console.log('📂 相机配置已加载');
        }
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    }
  };

  const handleResetCamera = () => {
    if (viewerRef.current) {
      viewerRef.current.resetCamera();
      console.log('🔄 相机已重置');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Base3DViewer 测试页面</h1>
      
      {/* 控制按钮 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={handleScreenshot}>📸 截图</button>
        <button onClick={handleSaveConfig}>💾 保存配置</button>
        <button onClick={handleLoadConfig}>📂 加载配置</button>
        <button onClick={handleResetCamera}>🔄 重置相机</button>
        <button onClick={() => viewerRef.current?.reload()}>🔁 重新加载</button>
        <button onClick={() => viewerRef.current?.toggleAutoRotate()}>🔄 切换自动旋转</button>
      </div>

      {/* 3D查看器 */}
      <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
        <Base3DViewer
          ref={viewerRef}
          modelUrl="/models/butterfly.spz"
          autoCenter={true}
          margin={2.5}
          autoRotate={true}
          enableControls={true}
          backgroundColor="#0a0a0f"
          onLoadComplete={handleLoadComplete}
          onError={handleError}
          onProgress={handleProgress}
        />
      </div>

      {/* 说明 */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>测试说明</h3>
        <ul>
          <li>✅ 使用新引擎层（SmartCenteringEngine、ModelLoader、CameraManager）</li>
          <li>✅ 支持SPZ/GLB/GLTF/PLY格式</li>
          <li>✅ 智能居中对齐</li>
          <li>✅ 相机配置保存/加载</li>
          <li>✅ 截图功能</li>
          <li>✅ 完整的TypeScript类型定义</li>
        </ul>
        
        <h3>测试模型</h3>
        <p>当前测试模型：butterfly.spz</p>
        <p>可以修改modelUrl测试其他模型：</p>
        <ul>
          <li>/models/cat.spz</li>
          <li>/models/burger-from-amboy.spz</li>
          <li>/models/1.glb</li>
          <li>/models/sample-dragon2.ply</li>
        </ul>
      </div>
    </div>
  );
}
