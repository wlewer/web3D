/**
 * 3D模型查看器插件 - ModelViewerPlugin
 * Single 3D model viewer with lazy-loaded Three.js component
 */
import React, { Suspense, lazy, useRef } from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Fallback placeholder for when Base3DViewer fails to load =====

const ViewerFallback: React.FC<Record<string, unknown>> = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  }}>
    3D查看器加载失败
  </div>
);

// ===== Lazy-loaded 3D viewer (avoids heavy dependency at module level) =====
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Lazy3DViewer: React.FC<Record<string, unknown>> = lazy(async () => {
  try {
    const mod = await import('../../../components/3d/Base3DViewer');
    return { default: mod.Base3DViewer as unknown as React.ComponentType<Record<string, unknown>> };
  } catch {
    return { default: ViewerFallback };
  }
}) as unknown as React.FC<Record<string, unknown>>;

// ===== Renderer =====

interface ModelViewerRendererProps {
  modelUrl?: string;
  autoRotate?: boolean;
  backgroundColor?: string;
  cameraDistance?: number;
  [key: string]: unknown;
}

const ModelViewerRenderer: React.FC<ModelViewerRendererProps> = ({
  modelUrl = '',
  autoRotate = true,
  backgroundColor = '#000000',
  cameraDistance = 5,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Placeholder when no model URL
  if (!modelUrl) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: backgroundColor,
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
        }}
      >
        [3D模型查看器 - 请设置模型URL]
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 300,
        background: backgroundColor,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <Suspense
        fallback={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 300,
            color: 'rgba(255,255,255,0.5)',
          }}>
            加载3D查看器...
          </div>
        }
      >
        <Lazy3DViewer
          modelUrl={modelUrl}
          autoRotate={autoRotate}
          margin={cameraDistance}
          {...rest}
        />
      </Suspense>
    </div>
  );
};

// ===== Editor =====

interface ModelViewerEditorProps {
  modelUrl?: string;
  autoRotate?: boolean;
  onConfigChange?: (key: string, value: unknown) => void;
  [key: string]: unknown;
}

const ModelViewerEditor: React.FC<ModelViewerEditorProps> = ({
  modelUrl = '',
  autoRotate = true,
  onConfigChange,
}) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 12px',
    border: '1px solid #d9d9d9',
    borderRadius: 6,
    fontSize: 13,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>
          模型URL
        </label>
        <input
          type="text"
          value={modelUrl}
          onChange={(e) => onConfigChange?.('modelUrl', e.target.value)}
          placeholder="/models/example.glb"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={autoRotate}
          onChange={(e) => onConfigChange?.('autoRotate', e.target.checked)}
        />
        <label style={{ fontSize: 12, color: '#666' }}>自动旋转</label>
      </div>
    </div>
  );
};

// ===== Plugin Definition =====

export const ModelViewerPlugin: IComponentPlugin = {
  id: 'builtin.model-viewer',
  name: '3D模型查看器',
  category: ComponentCategory.THREE_D_ATOMIC,
  version: '1.0.0',
  icon: '🎯',
  description: '单模型3D查看器，支持GLB/GLTF/SPZ格式模型展示',

  renderer: ModelViewerRenderer as React.FC<Record<string, unknown>>,
  editor: ModelViewerEditor as React.FC<Record<string, unknown>>,

  defaultConfig: {
    modelUrl: '',
    autoRotate: true,
    backgroundColor: '#000000',
    cameraDistance: 5,
  },

  defaultStyles: {
    width: '100%',
    minHeight: '300px',
  },

  dependencies: {
    scripts: [],
    components: [],
  },
};

export default ModelViewerPlugin;
