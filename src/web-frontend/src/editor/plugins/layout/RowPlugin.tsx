/**
 * 行布局插件 - RowPlugin
 * Horizontal flex container for row-based layouts
 */
import React from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Renderer =====

interface RowRendererProps {
  children?: React.ReactNode;
  gap?: string;
  alignItems?: string;
  justifyContent?: string;
  [key: string]: unknown;
}

const RowRenderer: React.FC<RowRendererProps> = ({
  children,
  gap = '16px',
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  ...rest
}) => {
  // Extract style-related props from rest
  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set([
    'width', 'height', 'minHeight', 'maxWidth', 'backgroundColor',
    'borderRadius', 'border', 'margin', 'padding', 'flexWrap',
  ]);

  for (const [key, value] of Object.entries(rest)) {
    if (styleKeys.has(key)) {
      styleFromProps[key] = value;
    } else {
      passThrough[key] = value;
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap,
        alignItems: alignItems as React.CSSProperties['alignItems'],
        justifyContent: justifyContent as React.CSSProperties['justifyContent'],
        width: '100%',
        boxSizing: 'border-box',
        ...styleFromProps,
      }}
      {...passThrough}
    >
      {children}
    </div>
  );
};

// ===== Plugin Definition =====

export const RowPlugin: IComponentPlugin = {
  id: 'builtin.row',
  name: '行',
  category: ComponentCategory.LAYOUT,
  version: '1.0.0',
  icon: '↔️',
  description: '水平Flex行容器，用于横向排列子组件',

  renderer: RowRenderer as React.FC<Record<string, unknown>>,

  allowChildren: true,
  allowedChildTypes: ['builtin.column'],

  defaultConfig: {
    gap: '16px',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },

  defaultStyles: {
    width: '100%',
    minHeight: '48px',
    boxSizing: 'border-box',
  },
};

export default RowPlugin;
