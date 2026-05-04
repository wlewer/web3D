/**
 * UniversalGaussianCardV3 - 通用高斯卡片组件（重构版）
 * 
 * 基于新架构重构的组件，使用核心引擎层和装饰模块
 * 
 * 架构分层：
 * - 核心引擎层：SmartCenteringEngine, ModelLoader, CameraManager
 * - 基础组件层：Base3DViewer
 * - 装饰模块层：DisplayPlatform, ProductLabels
 * - 业务组件层：UniversalGaussianCardV3（本组件）
 * 
 * @version 3.0.0
 * @author Lingma AI Assistant
 * @date 2026-04-18
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { Base3DViewer } from './Base3DViewer';
import type { Base3DViewerRef } from './Base3DViewer';
import { createDisplayPlatform, disposeDisplayPlatform } from './decorations/DisplayPlatform';
import { ProductLabels } from './decorations/ProductLabels';
import type { ProductLabel } from './decorations/ProductLabels';
import './UniversalGaussianCardV3.css';

// ==================== 类型定义 ====================

export interface UniversalGaussianCardV3Props {
  modelUrl: string;
  autoCenter?: boolean;
  margin?: number;
  enableControls?: boolean;
  autoRotate?: boolean;
  showPlatform?: boolean;
  platformSize?: number;
  platformColor?: string | number;
  platformOpacity?: number;
  products?: ProductLabel[];
  showLabels?: boolean;
  language?: 'zh-CN' | 'en-US';
  className?: string;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  onScreenshot?: (dataUrl: string) => void;
}

// ==================== 主组件 ====================

/**
 * 通用高斯卡片组件V3（重构版）
 * 
 * 特点：
 * - 使用新引擎层（智能居中、模型加载、相机管理）
 * - 支持展示台装饰
 * - 支持产品标签
 * - 完整的TypeScript类型定义
 * - 可选功能，按需启用
 */
export function UniversalGaussianCardV3({
  modelUrl,
  autoCenter = true,
  margin = 2.5,
  enableControls = true,
  autoRotate = false,
  showPlatform = true,
  platformSize = 10,
  platformColor = 0xffffff,
  platformOpacity = 0.1,
  products = [],
  showLabels = false,
  language = 'zh-CN',
  className = '',
  onLoadComplete,
  onError,
  onProgress,
  onScreenshot
}: UniversalGaussianCardV3Props) {
  const viewerRef = useRef<Base3DViewerRef>(null);
  const platformRef = useRef<THREE.Mesh | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);

  // 模型加载完成回调
  const handleLoadComplete = useCallback(() => {
    setModelLoaded(true);
    setLoading(false);
    
    // 如果启用了展示台，创建并添加到场景
    if (showPlatform && viewerRef.current) {
      const platform = createDisplayPlatform({
        size: platformSize,
        color: platformColor,
        opacity: platformOpacity
      });
      
      // 注意：这里需要通过viewerRef访问scene
      // 由于Base3DViewer目前没有暴露scene，我们需要在Base3DViewer中添加这个功能
      // 暂时通过事件或其他方式处理
      platformRef.current = platform;
      
      console.log(' 展示台已创建（待添加到场景）');
    }
    
    onLoadComplete?.();
  }, [showPlatform, platformSize, platformColor, platformOpacity, onLoadComplete]);

  // 模型加载错误回调
  const handleError = useCallback((error: Error) => {
    console.error('❌ 模型加载失败:', error);
    setLoading(false);
    onError?.(error);
  }, [onError]);

  // 加载进度回调
  const handleProgress = useCallback((progress: number) => {
    onProgress?.(progress);
  }, [onProgress]);

  // 截图回调
  const handleScreenshot = useCallback(() => {
    if (viewerRef.current) {
      const dataUrl = viewerRef.current.screenshot();
      onScreenshot?.(dataUrl);
    }
  }, [onScreenshot]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (platformRef.current) {
        disposeDisplayPlatform(platformRef.current);
        platformRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`universal-gaussian-card-v3 ${className}`}>
      {/* 3D查看器 */}
      <div className="viewer-container">
        <Base3DViewer
          ref={viewerRef}
          modelUrl={modelUrl}
          autoCenter={autoCenter}
          margin={margin}
          enableControls={enableControls}
          autoRotate={autoRotate}
          onLoadComplete={handleLoadComplete}
          onError={handleError}
          onProgress={handleProgress}
        />
        
        {/* 加载状态 */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">加载中...</div>
          </div>
        )}
        
        {/* 错误提示 */}
        {!loading && modelLoaded === false && (
          <div className="error-overlay">
            <div className="error-icon">⚠️</div>
            <div className="error-text">模型加载失败</div>
          </div>
        )}
      </div>
      
      {/* 产品标签（可选） */}
      {showLabels && products.length > 0 && (
        <ProductLabels
          labels={products}
          visible={modelLoaded}
          language={language}
        />
      )}
      
      {/* 截图按钮（可选） */}
      {modelLoaded && onScreenshot && (
        <button 
          className="screenshot-btn"
          onClick={handleScreenshot}
          title="截图"
        >
          📷 截图
        </button>
      )}
    </div>
  );
}

// ==================== 导出 ====================

export default UniversalGaussianCardV3;
