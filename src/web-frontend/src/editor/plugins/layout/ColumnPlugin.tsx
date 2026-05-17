/**
 * 列布局插件 - ColumnPlugin
 * Flex child item for column-based layouts within a Row
 */
import React from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Renderer =====

interface ColumnRendererProps {
  children?: React.ReactNode;
  flex?: number | string;
  minWidth?: string;
  [key: string]: unknown;
}

const ColumnRenderer: React.FC<ColumnRendererProps> = ({
  children,
  flex = 1,
  minWidth = '0',
  ...rest
}) => {
  // Extract style-related props from rest
  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set([
    'width', 'height', 'minHeight', 'maxWidth', 'backgroundColor',
    'borderRadius', 'border', 'margin', 'padding', 'overflow',
    'alignItems', 'justifyContent',
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
        flex: typeof flex === 'number' ? flex : Number(flex) || 1,
        minWidth,
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

export const ColumnPlugin: IComponentPlugin = {
  id: 'builtin.column',
  name: '列',
  category: ComponentCategory.LAYOUT,
  version: '1.0.0',
  icon: '↕️',
  description: 'Flex列子项，用于Row内部纵向排列内容',

  renderer: ColumnRenderer as React.FC<Record<string, unknown>>,

  allowChildren: true,
  allowedChildTypes: [], // 空数组=允许所有已注册类型

  defaultConfig: {
    flex: 1,
    minWidth: '0',
  },

  defaultStyles: {
    minWidth: '0',
    boxSizing: 'border-box',
  },
};

export default ColumnPlugin;
