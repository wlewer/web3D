/**
 * 文本区块 - 内置模板组件
 * TextBlock - Built-in template component
 */
import React from 'react';
import type { TemplateComponentProps } from '../../../types/template';

export const TextBlock: React.FC<TemplateComponentProps> = ({ config }) => {
  const props = (config.props || {}) as Record<string, unknown>;
  const content = (props.content as string) || '';
  const align = (props.align as string) || 'left';

  if (!content) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
        [文本区块 - 请在后台配置内容]
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      textAlign: align as React.CSSProperties['textAlign'],
      color: 'white',
      fontSize: '1rem',
      lineHeight: 1.8,
      maxWidth: 800,
      margin: '0 auto',
    }}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default TextBlock;
