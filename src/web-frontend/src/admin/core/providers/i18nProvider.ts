/**
 * Web3D Admin - 国际化提供者
 */

import { type I18nProvider } from '@refinedev/core';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const translations = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// 当前语言
let currentLocale = 'zh-CN';

/**
 * 国际化提供者
 */
export const i18nProvider: I18nProvider = {
  translate: (key: string, params?: Record<string, any>) => {
    const keys = key.split('.');
    let value: any = translations[currentLocale as keyof typeof translations];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value === 'string' && params) {
      // 替换参数
      return value.replace(/\{(\w+)\}/g, (_, param) => {
        return params[param] || `{${param}}`;
      });
    }

    return value || key;
  },

  changeLocale: (locale: string) => {
    currentLocale = locale;
    localStorage.setItem('locale', locale);
    window.location.reload();
  },

  getLocale: () => {
    return currentLocale;
  },
};

// 初始化语言
const savedLocale = localStorage.getItem('locale');
if (savedLocale && translations[savedLocale as keyof typeof translations]) {
  currentLocale = savedLocale;
}

export default i18nProvider;
