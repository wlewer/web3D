/**
 * UnifiedTable - 统一表格组件
 *
 * 特性：
 * - 完全兼容 antd Table Props，零影响透传
 * - 右上角「设置列」按钮：显示/隐藏列 + 拖拽重排
 * - 统一分页配置
 * - 列状态持久化到 localStorage
 *
 * 使用方式：
 *   <UnifiedTable
 *     storageKey="admin_model_list"
 *     columns={columns}
 *     dataSource={data}
 *     rowKey="id"
 *     ...
 *   />
 *
 * 不影响任何现有的 dataSource、loading、pagination、onChange 等数据流
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Table, Popover, Checkbox, Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { TableProps, TableColumnsType } from 'antd';

// ==================== 常量 ====================

const LS_PREFIX = 'unified_table_cols_';

const DEFAULT_PAGINATION = {
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
};

// ==================== 类型 ====================

interface ColumnSetting {
  key: string;
  title: string;
  visible: boolean;
}

export interface UnifiedTableProps<T> extends TableProps<T> {
  /** 唯一标识，用于 localStorage 持久化列设置 */
  storageKey: string;
}

// ==================== 工具函数 ====================

/** 获取列标题的显示文本 */
function getColumnDisplayTitle(col: any): string {
  if (typeof col.title === 'string') return col.title || String(col.key) || '列';
  // ReactNode 类型无法直接转字符串，使用 key 作为回退
  return String(col.key) || '列';
}

/** 从 localStorage 读取列设置 */
function loadColumnSettings(storageKey: string): { key: string; visible: boolean }[] | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ==================== 组件 ====================

function UnifiedTable<T extends object>(props: UnifiedTableProps<T>) {
  const { storageKey, columns, pagination, title: userTitle, ...rest } = props;

  // 列设置状态
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const dragItemRef = React.useRef<number | null>(null);

  // 稳定初始化：仅当 columns 结构真正变化时才重新初始化
  const initRef = useRef<string>('init');
  useEffect(() => {
    if (!columns || !Array.isArray(columns)) return;

    // 计算列的稳定标识（基于 key），避免引用变化导致重复初始化
    const colsKey = (columns as any[]).map((c: any) => String(c.key ?? '')).join('|');
    if (initRef.current === colsKey) return; // columns 结构未变，跳过
    initRef.current = colsKey;

    const saved = loadColumnSettings(storageKey);
    const defaultSettings: ColumnSetting[] = (columns as any[])
      .filter((col: any) => col.key != null)
      .map((col: any) => ({
        key: String(col.key),
        title: getColumnDisplayTitle(col),
        visible: true,
      }));

    if (saved && saved.length > 0) {
      const merged = defaultSettings.map(def => {
        const savedItem = saved.find((s: any) => s.key === def.key);
        if (savedItem) {
          return { ...def, visible: savedItem.visible };
        }
        return def;
      });
      setColumnSettings(merged);
    } else {
      setColumnSettings(defaultSettings);
    }
  }, [columns, storageKey]);

  // 持久化列设置
  const saveSettings = useCallback((settings: ColumnSetting[]) => {
    try {
      localStorage.setItem(
        LS_PREFIX + storageKey,
        JSON.stringify(settings.map(s => ({ key: s.key, visible: s.visible }))),
      );
    } catch {
      // localStorage 不可用时忽略
    }
  }, [storageKey]);

  // 切换列显隐
  const toggleColumn = useCallback((key: string) => {
    setColumnSettings(prev => {
      const next = prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c);
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  // 拖拽重排
  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const dragIdx = dragItemRef.current;
    if (dragIdx === null || dragIdx === index) return;

    setColumnSettings(prev => {
      const next = [...prev];
      const [removed] = next.splice(dragIdx, 1);
      next.splice(index, 0, removed);
      saveSettings(next);
      return next;
    });
    dragItemRef.current = index;
  }, [saveSettings]);

  const handleDragEnd = useCallback(() => {
    dragItemRef.current = null;
  }, []);

  // 处理 columns：过滤 + 排序
  const processedColumns: TableColumnsType<T> | undefined = useMemo(() => {
    if (!columns) return undefined;

    // 过滤并排序
    const result: any[] = [];
    const existingKeys = new Set<string>();
    const hiddenKeys = new Set<string>();

    // 第一步：按 settings 顺序，添加可见列；记录隐藏列
    for (const setting of columnSettings) {
      if (!setting.visible) {
        hiddenKeys.add(setting.key);
        continue;
      }
      const col = (columns as any[]).find((c: any) => String(c.key) === setting.key);
      if (col) {
        result.push(col);
        existingKeys.add(setting.key);
      }
    }

    // 第二步：添加在原始 columns 中有但在 settings 中没有的新列（追加到末尾）
    // 排除已被用户隐藏的列
    for (const col of columns as any[]) {
      if (col.key != null && !existingKeys.has(String(col.key)) && !hiddenKeys.has(String(col.key))) {
        result.push(col);
        existingKeys.add(String(col.key));
      }
    }

    return result as TableColumnsType<T>;
  }, [columns, columnSettings]);

  // 列设置面板内容
  const settingsContent = useMemo(() => (
    <div style={{ width: 240, maxHeight: 320, overflowY: 'auto' }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: '#999' }}>
        勾选显示/隐藏，拖拽调整顺序
      </div>
      {columnSettings.map((col, index) => (
        <div
          key={col.key}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 0',
            cursor: 'grab',
            borderBottom: index < columnSettings.length - 1 ? '1px solid #f0f0f0' : 'none',
            userSelect: 'none',
          }}
        >
          <span style={{ marginRight: 8, color: '#bbb', fontSize: 14, cursor: 'grab', flexShrink: 0 }}>
            ⠿
          </span>
          <Checkbox
            checked={col.visible}
            onChange={() => toggleColumn(col.key)}
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              marginLeft: 8,
              fontSize: 13,
              color: col.visible ? '#333' : '#bbb',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {col.title}
          </span>
        </div>
      ))}
    </div>
  ), [columnSettings, handleDragStart, handleDragOver, handleDragEnd, toggleColumn]);

  // 设置按钮（独立于 title render，避免闭包问题）
  const settingsButton = useMemo(() => (
    <Popover
      content={settingsContent}
      title="列设置"
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottomRight"
    >
      <Button type="text" size="small" icon={<SettingOutlined />}>
        设置列
      </Button>
    </Popover>
  ), [settingsContent, popoverOpen]);

  // title 渲染函数：包装用户自定义 title + 设置按钮
  const titleRender = useCallback((data: readonly T[]) => {
    const userNode = userTitle ? userTitle(data) : null;
    if (userNode) {
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1 }}>{userNode}</div>
          {settingsButton}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
        {settingsButton}
      </div>
    );
  }, [userTitle, settingsButton]);

  // 分页：用户传入的优先，否则用统一默认值
  const mergedPagination = pagination !== undefined
    ? pagination === false
      ? false
      : { ...DEFAULT_PAGINATION, ...(typeof pagination === 'object' ? pagination : {}) }
    : DEFAULT_PAGINATION;

  return (
    <Table<T>
      columns={processedColumns}
      pagination={mergedPagination}
      title={titleRender}
      {...rest}
    />
  );
}

export default UnifiedTable;
