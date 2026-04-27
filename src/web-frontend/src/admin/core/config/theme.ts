/**
 * Web3D Admin - Ant Design 主题配置
 * 
 * 基于 Ant Design 5 Token 系统的主题定制
 */

import { type ThemeConfig, theme } from 'antd';

// 品牌色
const PRIMARY_COLOR = '#667eea';
const SUCCESS_COLOR = '#52c41a';
const WARNING_COLOR = '#faad14';
const ERROR_COLOR = '#ff4d4f';

/**
 * 亮色主题
 */
export const lightTheme: ThemeConfig = {
  token: {
    // 基础色板
    colorPrimary: PRIMARY_COLOR,
    colorSuccess: SUCCESS_COLOR,
    colorWarning: WARNING_COLOR,
    colorError: ERROR_COLOR,
    colorInfo: PRIMARY_COLOR,

    // 圆角
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,

    // 字体
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,

    // 行高
    lineHeight: 1.5715,
    lineHeightLG: 1.5,
    lineHeightSM: 1.6667,

    // 间距
    padding: 16,
    paddingXS: 8,
    paddingSM: 12,
    paddingLG: 24,
    margin: 16,
    marginXS: 8,
    marginSM: 12,
    marginLG: 24,

    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',

    // 动画
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.2s',
    motionDurationFast: '0.1s',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      triggerBg: '#ffffff',
    },
    Menu: {
      itemBg: 'transparent',
      itemHoverBg: 'rgba(102, 126, 234, 0.08)',
      itemSelectedBg: 'rgba(102, 126, 234, 0.12)',
      itemColor: 'rgba(0, 0, 0, 0.65)',
      itemSelectedColor: PRIMARY_COLOR,
      itemHoverColor: PRIMARY_COLOR,
    },
    Table: {
      headerBg: '#fafafa',
      rowHoverBg: '#f5f5f5',
      borderColor: '#f0f0f0',
    },
    Card: {
      boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
    Button: {
      primaryShadow: `0 2px 0 rgba(102, 126, 234, 0.2)`,
    },
  },
};

/**
 * 暗色主题
 */
export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: PRIMARY_COLOR,
    colorBgBase: '#141414',
    colorTextBase: 'rgba(255, 255, 255, 0.85)',
  },
  components: {
    Layout: {
      headerBg: '#1f1f1f',
      siderBg: '#1f1f1f',
      triggerBg: '#1f1f1f',
    },
    Menu: {
      itemBg: 'transparent',
      itemHoverBg: 'rgba(102, 126, 234, 0.15)',
      itemSelectedBg: 'rgba(102, 126, 234, 0.2)',
      itemColor: 'rgba(255, 255, 255, 0.65)',
      itemSelectedColor: PRIMARY_COLOR,
      itemHoverColor: PRIMARY_COLOR,
    },
    Table: {
      headerBg: '#1f1f1f',
      rowHoverBg: '#262626',
      borderColor: '#303030',
    },
  },
};

/**
 * 获取当前主题
 */
export const getCurrentTheme = (): ThemeConfig => {
  const isDark = localStorage.getItem('theme') === 'dark';
  return isDark ? darkTheme : lightTheme;
};

/**
 * 切换主题
 */
export const toggleTheme = () => {
  const currentTheme = localStorage.getItem('theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  window.location.reload();
};

export default lightTheme;
