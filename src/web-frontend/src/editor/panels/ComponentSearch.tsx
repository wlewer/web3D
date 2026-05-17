/**
 * ComponentSearch - 组件搜索
 * Component Search
 *
 * 实时过滤组件列表，支持 debounce 300ms。
 * 搜索匹配：组件名称 + 描述。
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Input, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

/** 搜索项接口 */
export interface SearchableItem {
  /** 显示名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 唯一标识 */
  id: string;
}

/** ComponentSearch 组件属性 */
export interface ComponentSearchProps {
  /** 搜索占位文本 */
  placeholder?: string;
  /** 搜索变更回调（debounce 后触发） */
  onSearch: (query: string) => void;
  /** 是否有搜索结果（用于控制空状态显示） */
  hasResults?: boolean;
  /** 当前搜索关键词 */
  value?: string;
  /** 自定义空状态提示 */
  emptyDescription?: string;
  /** 样式类名 */
  className?: string;
  /** debounce 延迟（毫秒） */
  debounceMs?: number;
}

/**
 * ComponentSearch - 组件搜索输入框
 *
 * 提供带 debounce 的实时搜索能力，支持搜索空状态提示。
 */
export const ComponentSearch: React.FC<ComponentSearchProps> = ({
  placeholder = '搜索组件...',
  onSearch,
  hasResults = true,
  value: controlledValue,
  emptyDescription = '未找到匹配的组件，尝试其他关键词',
  className,
  debounceMs = 300,
}) => {
  const [inputValue, setInputValue] = useState(controlledValue ?? '');
  const [debouncedValue, setDebouncedValue] = useState(controlledValue ?? '');

  // 同步外部受控值
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInputValue(controlledValue);
      setDebouncedValue(controlledValue);
    }
  }, [controlledValue]);

  // Debounce 逻辑
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
      onSearch(inputValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs, onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);


  const showEmpty = !hasResults && debouncedValue.length > 0;

  return (
    <div className={className} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
      <Input.Search
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onSearch={onSearch}
        allowClear
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        style={{ width: '100%' }}
      />
      {showEmpty && (
        <div style={{ marginTop: 16 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={emptyDescription}
          />
        </div>
      )}
    </div>
  );
};

ComponentSearch.displayName = 'ComponentSearch';
