/**
 * ColorPicker - 颜色选择器
 * Color Picker
 *
 * 预设色板 + 自定义颜色输入 + 透明度滑块 + 最近使用记录。
 * 基于 Ant Design ColorPicker 组件封装。
 */
import React, { useState, useCallback, useEffect } from 'react';
import { ColorPicker as AntColorPicker, Space, Tag, Input, Row, Col, Slider } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { ClockCircleOutlined } from '@ant-design/icons';

/** 预设常用颜色 */
const PRESET_COLORS = [
  '#000000', '#ffffff', '#f5222d', '#fa541c', '#fa8c16', '#faad14',
  '#fadb14', '#a0d911', '#52c41a', '#13c8c9', '#1890ff', '#2f54eb',
  '#722ed1', '#eb2f96', '#bfbfbf', '#8c8c8c',
];

/** 最近使用颜色最大数量 */
const MAX_RECENT_COLORS = 5;

/** ColorPicker 组件属性 */
export interface ColorPickerProps {
  /** 当前颜色值（hex 或 rgba 字符串） */
  value?: string;
  /** 颜色变更回调 */
  onChange: (color: string) => void;
  /** 是否允许透明 */
  allowClear?: boolean;
  /** 标签文本 */
  label?: string;
  /** 样式类名 */
  className?: string;
}

/**
 * ColorPicker - 颜色选择器
 *
 * 提供预设色板、自定义输入、透明度控制和最近使用记录。
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  allowClear = true,
  label,
  className,
}) => {
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('editor_recent_colors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [internalColor, setInternalColor] = useState<string | undefined>(value);

  useEffect(() => {
    setInternalColor(value);
  }, [value]);

  const handleColorChange = useCallback(
    (color: Color) => {
      const colorString = color.toHexString();
      setInternalColor(colorString);
      onChange(colorString);

      // 更新最近使用记录
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== colorString);
        const next = [colorString, ...filtered].slice(0, MAX_RECENT_COLORS);
        try {
          localStorage.setItem('editor_recent_colors', JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [onChange],
  );

  const handlePresetClick = useCallback(
    (color: string) => {
      setInternalColor(color);
      onChange(color);

      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== color);
        const next = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
        try {
          localStorage.setItem('editor_recent_colors', JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [onChange],
  );

  const handleHexInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      setInternalColor(hex);
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        onChange(hex);
      }
    },
    [onChange],
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      if (!internalColor) return;
      const baseColor = internalColor.startsWith('#') ? internalColor : '#000000';
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const b = parseInt(baseColor.slice(5, 7), 16);
      const rgba = `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
      setInternalColor(rgba);
      onChange(rgba);
    },
    [internalColor, onChange],
  );

  const opacity = useMemo(() => {
    if (!internalColor) return 100;
    if (internalColor.startsWith('rgba')) {
      const match = internalColor.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
      return match ? Math.round(parseFloat(match[1]) * 100) : 100;
    }
    return 100;
  }, [internalColor]);

  return (
    <div className={className} style={{ padding: '8px 0' }}>
      {label && <div style={{ marginBottom: 8, fontSize: 12, color: '#8c8c8c' }}>{label}</div>}

      <Row gutter={[8, 8]} align="middle">
        <Col>
          <AntColorPicker
            value={internalColor}
            onChange={handleColorChange}
            allowClear={allowClear}
            showText
            presets={[
              {
                label: '预设',
                colors: PRESET_COLORS,
              },
            ]}
          />
        </Col>
        <Col flex="auto">
          <Input
            size="small"
            value={internalColor}
            onChange={handleHexInputChange}
            placeholder="#1890ff"
            style={{ fontFamily: 'monospace' }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 6, fontSize: 12, color: '#8c8c8c' }}>透明度</div>
        <Slider
          min={0}
          max={100}
          value={opacity}
          onChange={handleOpacityChange}
          tooltip={{ formatter: (v) => `${v}%` }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <Space size={[4, 4]} wrap>
          {PRESET_COLORS.map((color) => (
            <div
              key={color}
              onClick={() => handlePresetClick(color)}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: color,
                cursor: 'pointer',
                border: internalColor === color ? '2px solid #1677ff' : '1px solid #d9d9d9',
                boxSizing: 'border-box',
              }}
              title={color}
            />
          ))}
        </Space>
      </div>

      {recentColors.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 6, fontSize: 12, color: '#8c8c8c' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            最近使用
          </div>
          <Space size={[4, 4]} wrap>
            {recentColors.map((color) => (
              <Tag
                key={color}
                color={color}
                style={{ cursor: 'pointer' }}
                onClick={() => handlePresetClick(color)}
              >
                {color}
              </Tag>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};

ColorPicker.displayName = 'ColorPicker';

// eslint-disable-next-line react-refresh/only-export-components
function useMemo<T>(factory: () => T, deps: React.DependencyList): T {
  return React.useMemo(factory, deps);
}
