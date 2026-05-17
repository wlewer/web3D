/**
 * 全宽区块插件 - SectionPlugin
 * Full-width section with constrained inner content area
 */
import React from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Renderer =====

interface SectionRendererProps {
  children?: React.ReactNode;
  maxWidth?: string;
  padding?: string;
  backgroundColor?: string;
  [key: string]: unknown;
}

const SectionRenderer: React.FC<SectionRendererProps> = ({
  children,
  maxWidth = '1200px',
  padding = '48px 24px',
  backgroundColor = 'transparent',
  ...rest
}) => {
  // Extract style-related props from rest
  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set([
    'minHeight', 'backgroundImage', 'backgroundSize',
    'borderBottom', 'borderTop',
  ]);

  for (const [key, value] of Object.entries(rest)) {
    if (styleKeys.has(key)) {
      styleFromProps[key] = value;
    } else {
      passThrough[key] = value;
    }
  }

  return (
    <section
      style={{
        width: '100%',
        backgroundColor,
        boxSizing: 'border-box',
        ...styleFromProps,
      }}
      {...passThrough}
    >
      <div
        style={{
          maxWidth,
          margin: '0 auto',
          padding,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </section>
  );
};

// ===== Plugin Definition =====

export const SectionPlugin: IComponentPlugin = {
  id: 'builtin.section',
  name: '全宽区块',
  category: ComponentCategory.LAYOUT,
  version: '1.0.0',
  icon: '📑',
  description: '全宽Section区块，内部内容区定宽居中',

  renderer: SectionRenderer as React.FC<Record<string, unknown>>,

  allowChildren: true,
  allowedChildTypes: [], // 空数组=允许所有已注册类型

  defaultConfig: {
    maxWidth: '1200px',
    padding: '48px 24px',
    backgroundColor: 'transparent',
  },

  defaultStyles: {
    width: '100%',
    boxSizing: 'border-box',
  },
};

export default SectionPlugin;
