/**
 * CategoryFilter - 分类筛选
 * Category Filter
 *
 * Tab 切换组件分类，显示每个分类的组件数量 badge。
 * 分类数据从 ComponentRegistry 获取。
 */
import React, { useMemo } from 'react';
import { Tabs, Badge } from 'antd';
import type { TabsProps } from 'antd';
import { ComponentRegistry } from '../core/ComponentRegistry';
import { ComponentCategory } from '../types/plugin';

/** 分类标签配置 */
interface CategoryTab {
  /** Tab 标签键 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 对应的 ComponentCategory */
  category?: ComponentCategory;
}

/** 预定义分类标签列表 */
const CATEGORY_TABS: CategoryTab[] = [
  { key: 'all', label: '全部' },
  { key: ComponentCategory.LAYOUT, label: '布局' },
  { key: ComponentCategory.BASIC_UI, label: '基础UI' },
  { key: ComponentCategory.THREE_D_ATOMIC, label: '3D' },
  { key: ComponentCategory.MARKETING, label: '营销' },
  { key: ComponentCategory.AI, label: 'AI' },
];

/** CategoryFilter 组件属性 */
export interface CategoryFilterProps {
  /** 当前选中的分类 key */
  activeKey: string;
  /** 分类切换回调 */
  onChange: (key: string) => void;
  /** 分类数量（可选，不传则从 ComponentRegistry 计算） */
  categoryCounts?: Record<string, number>;
  /** 样式类名 */
  className?: string;
}

/**
 * CategoryFilter - 分类筛选 Tab
 *
 * 从 ComponentRegistry 获取各分类的组件数量，显示带 badge 的 Tab。
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  activeKey,
  onChange,
  categoryCounts: externalCounts,
  className,
}) => {
  const registry = useMemo(() => ComponentRegistry.getInstance(), []);

  const counts = useMemo(() => {
    if (externalCounts) return externalCounts;

    const registryCounts = registry.getCategoryCounts();
    const allCount = registry.getAll().length;

    return {
      all: allCount,
      ...registryCounts,
    };
  }, [externalCounts, registry]);

  const items: TabsProps['items'] = useMemo(
    () =>
      CATEGORY_TABS.map((tab) => {
        const count = counts[tab.key] ?? 0;
        return {
          key: tab.key,
          label: (
            <span>
              {tab.label}
              {count > 0 && (
                <Badge
                  count={count}
                  size="small"
                  style={{
                    marginLeft: 6,
                    backgroundColor: '#e6f4ff',
                    color: '#1677ff',
                    fontSize: 11,
                    fontWeight: 500,
                    boxShadow: 'none',
                  }}
                />
              )}
            </span>
          ),
        };
      }),
    [counts],
  );

  return (
    <div className={className} style={{ padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
      <Tabs
        activeKey={activeKey}
        onChange={onChange}
        items={items}
        size="small"
        style={{ marginBottom: 0 }}
      />
    </div>
  );
};

CategoryFilter.displayName = 'CategoryFilter';
