/**
 * 图片区块 - 内置模板组件
 * ImageBlock - Built-in template component
 */
import React from 'react';
import type { TemplateComponentProps } from '../../../types/template';

export const ImageBlock: React.FC<TemplateComponentProps> = ({ config }) => {
  const props = (config.props || {}) as Record<string, unknown>;
  const src = (props.src as string) || '';
  const alt = (props.alt as string) || '';
  const fit = (props.fit as string) || 'cover';

  if (!src) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center' as const,
        color: 'rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        minHeight: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        [图片区块 - 请在后台配置图片地址]
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: 'auto',
          objectFit: fit as React.CSSProperties['objectFit'],
          display: 'block',
        }}
      />
    </div>
  );
};

export default ImageBlock;
