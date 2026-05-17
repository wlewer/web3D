/**
 * 文本区块插件 - TextBlockPlugin
 * Rich text block with HTML rendering capability
 */
import React, { useState } from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Renderer =====

interface TextBlockRendererProps {
  content?: string;
  textAlign?: string;
  [key: string]: unknown;
}

const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({
  content = '<p>请输入文本</p>',
  textAlign = 'left',
  ...rest
}) => {
  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set([
    'color', 'fontSize', 'lineHeight', 'padding', 'margin',
    'maxWidth', 'backgroundColor',
  ]);

  for (const [key, value] of Object.entries(rest)) {
    if (styleKeys.has(key)) {
      styleFromProps[key] = value;
    } else {
      passThrough[key] = value;
    }
  }

  if (!content) {
    return (
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          color: 'rgba(0,0,0,0.25)',
          border: '1px dashed rgba(0,0,0,0.15)',
          borderRadius: 4,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        [文本区块 - 请输入内容]
      </div>
    );
  }

  return (
    <div
      style={{
        textAlign: textAlign as React.CSSProperties['textAlign'],
        wordBreak: 'break-word',
        ...styleFromProps,
      }}
      dangerouslySetInnerHTML={{ __html: content }}
      {...passThrough}
    />
  );
};

// ===== Editor =====

interface TextBlockEditorProps {
  content?: string;
  onConfigChange?: (key: string, value: unknown) => void;
  [key: string]: unknown;
}

const TextBlockEditor: React.FC<TextBlockEditorProps> = ({
  content = '<p>请输入文本</p>',
  onConfigChange,
}) => {
  const [text, setText] = useState(content);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onConfigChange?.('content', e.target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>
        文本内容（支持HTML）
      </label>
      <textarea
        value={text}
        onChange={handleChange}
        rows={6}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          fontSize: 13,
          lineHeight: 1.6,
          resize: 'vertical',
          fontFamily: 'monospace',
        }}
      />
    </div>
  );
};

// ===== Plugin Definition =====

export const TextBlockPlugin: IComponentPlugin = {
  id: 'builtin.text-block',
  name: '文本',
  category: ComponentCategory.BASIC_UI,
  version: '1.0.0',
  icon: '📝',
  description: '富文本区块，支持HTML内容渲染',

  renderer: TextBlockRenderer as React.FC<Record<string, unknown>>,
  editor: TextBlockEditor as React.FC<Record<string, unknown>>,

  defaultConfig: {
    content: '<p>请输入文本</p>',
    textAlign: 'left',
  },

  defaultStyles: {
    fontSize: '14px',
    lineHeight: 1.8,
  },
};

export default TextBlockPlugin;
