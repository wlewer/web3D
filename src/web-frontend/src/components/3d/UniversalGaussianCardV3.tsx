/**
 * UniversalGaussianCardV3 - 通用高斯卡片组件（重构版）
 * 
 * 基于新架构重构的组件，使用核心引擎层和装饰模块
 * 完全对齐 UniversalGaussianCardV2，作为其直接替代品
 * 
 * 架构分层：
 * - 核心引擎层：SmartCenteringEngine, ModelLoader, CameraManager
 * - 基础组件层：Base3DViewer
 * - 统一控制层：DecorationControlProps（装饰控制协议）
 * - 业务组件层：UniversalGaussianCardV3（本组件）
 * 
 * 装饰控制：
 * - 使用统一的 DecorationControlProps 接口
 * - 通过 decorationControls prop 传递给 Base3DViewer
 * - 由 Base3DViewer 内部转换为 DecorationConfig 供 SceneDecoration 消费
 * - 消除手动构建 decoration config 的冗余
 * 
 * @version 3.2.0
 */

import { useRef, useEffect, useCallback, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Base3DViewer } from './Base3DViewer';
import type { Base3DViewerRef, Base3DViewerProps } from './Base3DViewer';
import type { DecorationControlProps } from './types/decorations';
import type { CameraConfig } from './engines/CameraManager';
import './UniversalGaussianCardV3.css';

// ==================== 类型定义 ====================

export interface UniversalGaussianCardV3Props extends
  Omit<Base3DViewerProps, 'decorations' | 'decorationControls'>,
  DecorationControlProps {
  // ========== V3 独有扩展 ==========
  /** 额外 CSS 类名 */
  className?: string;
  /** 截图回调 */
  onScreenshot?: (dataUrl: string) => void;
  /** 保存相机配置回调（对齐V2） */
  onCameraConfigSave?: (config: CameraConfig) => void;
}

// ==================== 主组件 ====================

/**
 * 通用高斯卡片组件V3（重构版）
 * 
 * 特点：
 * - 完全对齐 V2 所有功能，作为其直接替代品
 * - 透传所有 Base3DViewer 属性和事件回调
 * - forwardRef 支持
 * - 使用统一的 DecorationControlProps 协议控制装饰
 * - 装饰配置由 Base3DViewer 内部统一管理
 */
export const UniversalGaussianCardV3 = forwardRef<Base3DViewerRef, UniversalGaussianCardV3Props>(({
  // 核心
  modelUrl,
  // 相机控制
  autoCenter = true,
  margin = 2.5,
  layout = 'grid',
  enableControls,
  autoRotate,
  autoRotateSpeed,
  fov,
  // UI配置
  backgroundColor,
  showTitle,
  title,
  subtitle,
  showStats,
  // 统一装饰控制
  showParticles,
  showPlatform,
  showLabels,
  products,
  language,
  particleSize,
  // 相机配置
  customCameraConfig,
  // 环绕控制
  orbitEnabled,
  orbitDuration,
  orbitMode,
  orbitModeParams,
  orbitSpeed,
  orbitCenterYOffset,
  onOrbitStateChange,
  onOrbitCycleComplete,
  // 事件回调
  onCameraConfigSave,
  onLoadComplete,
  onError,
  onProgress,
  onClick,
  onDoubleClick,
  onInteraction,
  onScreenshot,
  // 其他
  className = '',
}: UniversalGaussianCardV3Props, ref) => {
  const viewerRef = useRef<Base3DViewerRef>(null);
  const [loading, setLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);

  // ✅ 对齐V2：forwardRef 暴露 Base3DViewerRef 方法
  useImperativeHandle(ref, () => ({
    getModel: () => viewerRef.current?.getModel() || null,
    getStats: () => viewerRef.current?.getStats() || { pointCount: 0, loaded: false, loading: true, progress: 0, fps: 0 },
    reload: () => viewerRef.current?.reload(),
    toggleAutoRotate: () => viewerRef.current?.toggleAutoRotate(),
    screenshot: () => viewerRef.current?.screenshot() || '',
    dispose: () => viewerRef.current?.dispose(),
    saveCameraConfig: () => viewerRef.current?.saveCameraConfig() as CameraConfig,
    loadCameraConfig: (config: CameraConfig) => viewerRef.current?.loadCameraConfig(config),
    resetCamera: () => viewerRef.current?.resetCamera(),
    startOrbit: (d) => viewerRef.current?.startOrbit(d),
    stopOrbit: () => viewerRef.current?.stopOrbit(),
    getOrbitController: () => viewerRef.current?.getOrbitController() || null,
  }), []);

  // 模型加载完成回调
  const handleLoadComplete = useCallback(() => {
    setModelLoaded(true);
    setLoading(false);
    onLoadComplete?.();
  }, [onLoadComplete]);

  // 模型加载错误回调
  const handleError = useCallback((error: Error) => {
    console.error('❌ 模型加载失败:', error);
    setLoading(false);
    onError?.(error);
  }, [onError]);

  // 截图回调
  const handleScreenshot = useCallback(() => {
    if (viewerRef.current) {
      const dataUrl = viewerRef.current.screenshot();
      onScreenshot?.(dataUrl);
    }
  }, [onScreenshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // 资源清理由 Base3DViewer 的 dispose 方法自动处理
    };
  }, []);

  // ★ 稳定 decorationControls 对象引用，防止每渲染创建新对象导致级联重渲染
  const decorationControlsMemo = useMemo<DecorationControlProps>(() => ({
    showParticles,
    showPlatform,
    showLabels,
    products,
    language,
    particleSize,
  }), [showParticles, showPlatform, showLabels, products, language, particleSize]);

  return (
    <div className={`universal-gaussian-card-v3 ${className}`}>
      {/* 3D查看器 */}
      <div className="viewer-container">
        <Base3DViewer
          ref={viewerRef}
          modelUrl={modelUrl}
          autoCenter={autoCenter}
          margin={margin}
          layout={layout}
          enableControls={enableControls}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          fov={fov}
          backgroundColor={backgroundColor}
          showTitle={showTitle}
          title={title}
          subtitle={subtitle}
          showStats={showStats}
          decorationControls={decorationControlsMemo}
          orbitEnabled={orbitEnabled}
          orbitDuration={orbitDuration}
          orbitMode={orbitMode}
          orbitModeParams={orbitModeParams}
          orbitSpeed={orbitSpeed}
          orbitCenterYOffset={orbitCenterYOffset}
          onOrbitStateChange={onOrbitStateChange}
          onOrbitCycleComplete={onOrbitCycleComplete}
          customCameraConfig={customCameraConfig}
          onCameraConfigSave={onCameraConfigSave}
          onLoadComplete={handleLoadComplete}
          onError={handleError}
          onProgress={onProgress}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onInteraction={onInteraction}
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
      
      {/* 截图按钮（可选） */}
      {modelLoaded && onScreenshot && (
        <button 
          className="screenshot-btn"
          onClick={handleScreenshot}
          title={language === 'en-US' ? 'Screenshot' : '截图'}
        >
          📷 {language === 'en-US' ? 'Screenshot' : '截图'}
        </button>
      )}
    </div>
  );
});

// ==================== 导出 ====================

export default UniversalGaussianCardV3;
