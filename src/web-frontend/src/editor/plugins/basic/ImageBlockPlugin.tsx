/**
 * 图片区块插件 - ImageBlockPlugin
 * Image block with lazy loading and object-fit support
 */
import React, { useState } from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Renderer =====

interface ImageBlockRendererProps {
  src?: string;
  alt?: string;
  objectFit?: string;
  borderRadius?: string;
  [key: string]: unknown;
}

const ImageBlockRenderer: React.FC<ImageBlockRendererProps> = ({
  src = '',
  alt = '',
  objectFit = 'cover',
  borderRadius = '0',
  ...rest
}) => {
  const [error, setError] = useState(false);

  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set([
    'width', 'height', 'maxWidth', 'margin', 'padding',
  ]);

  for (const [key, value] of Object.entries(rest)) {
    if (styleKeys.has(key)) {
      styleFromProps[key] = value;
    } else {
      passThrough[key] = value;
    }
  }

  if (!src || error) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.04)',
          borderRadius,
          border: '1px dashed rgba(0,0,0,0.15)',
          color: 'rgba(0,0,0,0.25)',
          fontSize: 14,
          ...styleFromProps,
        }}
      >
        {error ? '[图片加载失败]' : '[图片区块 - 请设置图片地址]'}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden', borderRadius, ...styleFromProps }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: objectFit as React.CSSProperties['objectFit'],
        }}
        {...passThrough}
      />
    </div>
  );
};

// ===== Editor =====

interface ImageBlockEditorProps {
  src?: string;
  alt?: string;
  onConfigChange?: (key: string, value: unknown) => void;
  [key: string]: unknown;
}

const ImageBlockEditor: React.FC<ImageBlockEditorProps> = ({
  src = '',
  alt = '',
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
        <label style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>图片URL</label>
        <input
          type="text"
          value={src}
          onChange={(e) => onConfigChange?.('src', e.target.value)}
          placeholder="https://example.com/image.jpg"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>替代文本 (alt)</label>
        <input
          type="text"
          value={alt}
          onChange={(e) => onConfigChange?.('alt', e.target.value)}
          placeholder="图片描述"
          style={inputStyle}
        />
      </div>
    </div>
  );
};

// ===== Plugin Definition =====

export const ImageBlockPlugin: IComponentPlugin = {
  id: 'builtin.image-block',
  name: '图片',
  category: ComponentCategory.BASIC_UI,
  version: '1.0.0',
  icon: '🖼️',
  description: '图片区块，支持懒加载和object-fit适配',

  renderer: ImageBlockRenderer as React.FC<Record<string, unknown>>,
  editor: ImageBlockEditor as React.FC<Record<string, unknown>>,

  defaultConfig: {
    src: '',
    alt: '',
    objectFit: 'cover',
    borderRadius: '0',
  },

  defaultStyles: {
    width: '100%',
  },
};

export default ImageBlockPlugin;
