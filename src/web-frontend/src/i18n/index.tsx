// 国际化上下文和 Provider
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { zhCN, type Translations } from './zh-CN';
import { enUS } from './en-US';

// 支持的语言
export const LANGUAGES = {
  'zh-CN': { name: '中文', nativeName: '简体中文', flag: '🇨🇳' },
  'en-US': { name: 'English', nativeName: 'English', flag: '🇺🇸' },
} as const;

export type Language = keyof typeof LANGUAGES;

// 语言包映射
const translationsMap: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// 上下文类型
interface I18nContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

// 创建上下文
const I18nContext = createContext<I18nContextType | null>(null);

// Provider Props
interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

// Provider 组件
export function I18nProvider({ children, defaultLanguage = 'zh-CN' }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // 从 localStorage 读取保存的语言
    const saved = localStorage.getItem('language');
    if (saved && saved in LANGUAGES) {
      return saved as Language;
    }
    return defaultLanguage;
  });

  // 设置语言
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // 可以在这里添加语言切换的统计或日志
  }, []);

  // 切换语言
  const toggleLanguage = useCallback(() => {
    const newLang = language === 'zh-CN' ? 'en-US' : 'zh-CN';
    setLanguage(newLang);
  }, [language, setLanguage]);

  // 获取翻译
  const t = useMemo(() => translationsMap[language], [language]);

  const value = useMemo(
    () => ({
      language,
      t,
      setLanguage,
      toggleLanguage,
    }),
    [language, t, setLanguage, toggleLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Hook: 使用翻译
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

// Hook: 获取当前语言
export function useLanguage() {
  const { language, setLanguage, toggleLanguage } = useTranslation();
  return { language, setLanguage, toggleLanguage, languages: LANGUAGES };
}

// 辅助函数：格式化翻译字符串
export function formatMessage(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`));
}
