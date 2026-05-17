/**
 * 按钮区块插件 - ButtonBlockPlugin
 * Button with multiple style variants
 */
import React from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Style Variants =====

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<ButtonSize, { padding: string; fontSize: string }> = {
  small: { padding: '4px 12px', fontSize: '12px' },
  medium: { padding: '8px 20px', fontSize: '14px' },
  large: { padding: '12px 28px', fontSize: '16px' },
};

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: '#1677ff',
    color: '#fff',
    border: '1px solid #1677ff',
  },
  secondary: {
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #d9d9d9',
  },
  outline: {
    background: 'transparent',
    color: '#1677ff',
    border: '1px solid #1677ff',
  },
  ghost: {
    background: 'transparent',
    color: '#333',
    border: '1px solid transparent',
  },
  link: {
    background: 'transparent',
    color: '#1677ff',
    border: 'none',
    padding: 0,
    textDecoration: 'underline',
  },
};

// ===== Renderer =====

interface ButtonBlockRendererProps {
  text?: string;
  variant?: string;
  size?: string;
  link?: string;
  openInNewTab?: boolean;
  [key: string]: unknown;
}

const ButtonBlockRenderer: React.FC<ButtonBlockRendererProps> = ({
  text = '按钮',
  variant = 'primary',
  size = 'medium',
  link = '',
  openInNewTab = false,
  ...rest
}) => {
  const sizeConfig = SIZE_MAP[(size as ButtonSize) || 'medium'] || SIZE_MAP.medium;
  const variantStyle = VARIANT_STYLES[(variant as ButtonVariant) || 'primary'] || VARIANT_STYLES.primary;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: 6,
    fontWeight: 500,
    lineHeight: 1.5,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    ...sizeConfig,
    ...variantStyle,
  };

  const handleClick = () => {
    if (link) {
      if (openInNewTab) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = link;
      }
    }
  };

  if (link && variant !== 'link') {
    return (
      <a
        href={link}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        style={{ textDecoration: 'none', ...baseStyle }}
        {...rest}
      >
        {text}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={baseStyle}
      {...rest}
    >
      {text}
    </button>
  );
};

// ===== Plugin Definition =====

export const ButtonBlockPlugin: IComponentPlugin = {
  id: 'builtin.button-block',
  name: '按钮',
  category: ComponentCategory.BASIC_UI,
  version: '1.0.0',
  icon: '🔘',
  description: '按钮组件，支持primary/secondary/outline/ghost/link多种样式变体',

  renderer: ButtonBlockRenderer as React.FC<Record<string, unknown>>,

  defaultConfig: {
    text: '按钮',
    variant: 'primary',
    size: 'medium',
    link: '',
    openInNewTab: false,
  },

  defaultStyles: {
    display: 'inline-flex',
  },
};

export default ButtonBlockPlugin;
