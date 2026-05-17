/**
 * 布局容器插件 - ContainerPlugin
 * Layout container supporting Flex/Grid layout
 */
import React from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Renderer =====

interface ContainerRendererProps {
  children?: React.ReactNode;
  display?: string;
  flexDirection?: string;
  gap?: string;
  padding?: string;
  [key: string]: unknown;
}

const ContainerRenderer: React.FC<ContainerRendererProps> = ({
  children,
  display = 'flex',
  flexDirection = 'column',
  gap = '16px',
  padding = '24px',
  ...rest
}) => {
  // Extract style-related props from rest
  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set([
    'width', 'height', 'minHeight', 'maxWidth', 'backgroundColor',
    'borderRadius', 'border', 'margin', 'overflow', 'flexWrap',
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
        display: display as React.CSSProperties['display'],
        flexDirection: flexDirection as React.CSSProperties['flexDirection'],
        gap,
        padding,
        boxSizing: 'border-box',
        width: '100%',
        ...styleFromProps,
      }}
      {...passThrough}
    >
      {children}
    </div>
  );
};

// ===== Plugin Definition =====

export const ContainerPlugin: IComponentPlugin = {
  id: 'builtin.container',
  name: '布局容器',
  category: ComponentCategory.LAYOUT,
  version: '1.0.0',
  icon: '📦',
  description: '通用布局容器，支持Flex/Grid布局方式',

  renderer: ContainerRenderer as React.FC<Record<string, unknown>>,

  allowChildren: true,
  allowedChildTypes: [], // 空数组=允许所有已注册类型

  defaultConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
  },

  defaultStyles: {
    width: '100%',
    minHeight: '80px',
    boxSizing: 'border-box',
  },
};

export default ContainerPlugin;
