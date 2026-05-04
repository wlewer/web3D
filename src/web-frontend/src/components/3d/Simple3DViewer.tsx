/**
 * Simple3DViewer - 轻量级3D查看器
 * 
 * 最小化版本的3D查看器，专注于快速加载和渲染
 * 
 * 特点：
 * - 无装饰功能（无展示台、无标签）
 * - 最小化UI
 * - 快速加载
 * - 适合画廊、列表等需要高性能的场景
 * 
 * @version 1.0.0
 * @author Lingma AI Assistant
 * @date 2026-04-18
 */

import { useRef, useCallback, useState } from 'react';
import { Base3DViewer } from './Base3DViewer';
import type { Base3DViewerRef } from './Base3DViewer';
import './Simple3DViewer.css';

// ==================== 类型定义 ====================

export interface Simple3DViewerProps {
  modelUrl: string;
  autoCenter?: boolean;
  margin?: number;
  enableControls?: boolean;
  autoRotate?: boolean;
  className?: string;
  onClick?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

// ==================== 主组件 ====================

/**
 * 轻量级3D查看器
 * 
 * 适用场景：
 * - 画廊预览
 * - 列表展示
 * - 快速加载场景
 * - 不需要复杂功能的场合
 */
export function Simple3DViewer({
  modelUrl,
  autoCenter = true,
  margin = 2.5,
  enableControls = false,  // 默认禁用控制器，提高性能
  autoRotate = true,       // 默认启用自动旋转，增强展示效果
  className = '',
  onClick,
  onLoadComplete,
  onError
}: Simple3DViewerProps) {
  const viewerRef = useRef<Base3DViewerRef>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 模型加载完成
  const handleLoadComplete = useCallback(() => {
    setLoading(false);
    onLoadComplete?.();
  }, [onLoadComplete]);

  // 模型加载错误
  const handleError = useCallback((err: Error) => {
    setLoading(false);
    setError(err.message);
    onError?.(err);
  }, [onError]);

  // 点击事件
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <div 
      className={`simple-3d-viewer ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <Base3DViewer
        ref={viewerRef}
        modelUrl={modelUrl}
        autoCenter={autoCenter}
        margin={margin}
        enableControls={enableControls}
        autoRotate={autoRotate}
        onLoadComplete={handleLoadComplete}
        onError={handleError}
      />
      
      {/* 加载状态 */}
      {loading && (
        <div className="simple-loading">
          <div className="simple-spinner"></div>
        </div>
      )}
      
      {/* 错误状态 */}
      {error && (
        <div className="simple-error">
          <span>⚠️</span>
          <span>加载失败</span>
        </div>
      )}
    </div>
  );
}

// ==================== 导出 ====================

export default Simple3DViewer;
