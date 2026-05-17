/**
 * StyleEditor - 样式编辑器
 * Style Editor
 *
 * 提供 margin/padding 盒模型可视化编辑、颜色选择、字体样式、
 * 阴影、圆角、透明度等样式属性的编辑能力。
 * 属性变更通过 CommandManager 执行（支持撤销）。
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  InputNumber,
  Slider,
  Space,
  Divider,
  Switch,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  BorderOuterOutlined,
  BorderInnerOutlined,
  RadiusUpleftOutlined,
  RadiusUprightOutlined,
  RadiusBottomleftOutlined,
  RadiusBottomrightOutlined,
} from '@ant-design/icons';
import { ColorPicker } from './ColorPicker';
import { useEditorStore } from '../store/editorStore';


/** CSS 单位 */
type CSSUnit = 'px' | '%' | 'em' | 'rem' | 'auto';

/** 盒模型边 */
type BoxEdge = 'top' | 'right' | 'bottom' | 'left';

/** StyleEditor 组件属性 */
export interface StyleEditorProps {
  /** 当前编辑的节点ID */
  nodeId: string;
}

/** 解析数值和单位 */
function parseValue(value: unknown): { num: number | null; unit: CSSUnit } {
  if (value === undefined || value === null || value === 'auto') {
    return { num: null, unit: 'px' };
  }
  const str = String(value);
  const match = str.match(/^(-?\d+(?:\.\d+)?)(px|%|em|rem)$/);
  if (match) {
    return { num: parseFloat(match[1]), unit: match[2] as CSSUnit };
  }
  const numMatch = str.match(/^(-?\d+(?:\.\d+)?)$/);
  if (numMatch) {
    return { num: parseFloat(numMatch[1]), unit: 'px' };
  }
  return { num: null, unit: 'px' };
}

/**

 * StyleEditor - 样式属性编辑面板
 *
 * 编辑组件的 margin、padding、颜色、字体、阴影、圆角、透明度等样式。
 */
export const StyleEditor: React.FC<StyleEditorProps> = ({ nodeId }) => {
  const updateNodeStyles = useEditorStore((state) => state.updateNodeStyles);
  const nodes = useEditorStore((state) => state.nodes);

  const node = nodes[nodeId];
  const styles = (node?.styles ?? {}) as Record<string, unknown>;

  // 统一圆角开关
  const [unifiedRadius, setUnifiedRadius] = useState(true);
  // 统一 margin 开关
  const [unifiedMargin, setUnifiedMargin] = useState(false);
  // 统一 padding 开关
  const [unifiedPadding, setUnifiedPadding] = useState(false);

  // 样式更新辅助函数
  const updateStyle = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const cleaned: Record<string, unknown> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleaned[key] = value;
        }
      });
      if (Object.keys(cleaned).length > 0) {
        updateNodeStyles(nodeId, cleaned);
      }
    },
    [nodeId, updateNodeStyles],
  );

  // Margin 值
  const marginValues = useMemo(() => {
    const edges: BoxEdge[] = ['top', 'right', 'bottom', 'left'];
    return edges.reduce(
      (acc, edge) => {
        acc[edge] = parseValue(styles[`margin${capitalize(edge)}`] ?? styles.margin);
        return acc;
      },
      {} as Record<BoxEdge, { num: number | null; unit: CSSUnit }>,
    );
  }, [styles]);

  // Padding 值
  const paddingValues = useMemo(() => {
    const edges: BoxEdge[] = ['top', 'right', 'bottom', 'left'];
    return edges.reduce(
      (acc, edge) => {
        acc[edge] = parseValue(styles[`padding${capitalize(edge)}`] ?? styles.padding);
        return acc;
      },
      {} as Record<BoxEdge, { num: number | null; unit: CSSUnit }>,
    );
  }, [styles]);

  // 圆角值
  const radiusValues = useMemo(() => {
    const corners = [
      { key: 'borderTopLeftRadius', label: '左上' },
      { key: 'borderTopRightRadius', label: '右上' },
      { key: 'borderBottomLeftRadius', label: '左下' },
      { key: 'borderBottomRightRadius', label: '右下' },
    ];
    return corners.map((c) => ({
      ...c,
      ...parseValue(styles[c.key] ?? styles.borderRadius),
    }));
  }, [styles]);

  // 透明度
  const opacity = useMemo(() => {
    const val = styles.opacity;
    if (val === undefined || val === null) return 100;
    return Math.round(parseFloat(String(val)) * 100);
  }, [styles]);

  // 字体相关
  const fontSize = useMemo(() => parseValue(styles.fontSize).num ?? 14, [styles]);
  const lineHeight = useMemo(() => parseValue(styles.lineHeight).num ?? 1.5, [styles]);
  const fontWeight = useMemo(() => {
    const val = styles.fontWeight;
    return val === undefined || val === null ? 400 : parseInt(String(val), 10);
  }, [styles]);

  if (!node) {
    return null;
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* 盒模型 - Margin */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        <BorderOuterOutlined style={{ marginRight: 6 }} />
        Margin
        <Switch
          checked={unifiedMargin}
          onChange={setUnifiedMargin}
          size="small"
          style={{ marginLeft: 8 }}
          checkedChildren="统一"
          unCheckedChildren="独立"
        />
      </Divider>
      <BoxModelEditor
        values={marginValues}
        unified={unifiedMargin}
        prefix="margin"
        onChange={updateStyle}
      />

      {/* 盒模型 - Padding */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        <BorderInnerOutlined style={{ marginRight: 6 }} />
        Padding
        <Switch
          checked={unifiedPadding}
          onChange={setUnifiedPadding}
          size="small"
          style={{ marginLeft: 8 }}
          checkedChildren="统一"
          unCheckedChildren="独立"
        />
      </Divider>
      <BoxModelEditor
        values={paddingValues}
        unified={unifiedPadding}
        prefix="padding"
        onChange={updateStyle}
      />

      {/* 颜色 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        颜色
      </Divider>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Row align="middle">
          <Col span={6}><span style={{ fontSize: 12 }}>背景色</span></Col>
          <Col span={18}>
            <ColorPicker
              value={String(styles.backgroundColor ?? '')}
              onChange={(color) => updateStyle({ backgroundColor: color })}
              allowClear
            />
          </Col>
        </Row>
        <Row align="middle">
          <Col span={6}><span style={{ fontSize: 12 }}>文字色</span></Col>
          <Col span={18}>
            <ColorPicker
              value={String(styles.color ?? '')}
              onChange={(color) => updateStyle({ color })}
              allowClear
            />
          </Col>
        </Row>
      </Space>

      {/* 字体样式 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        字体
      </Divider>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Row align="middle">
          <Col span={8}><span style={{ fontSize: 12 }}>字体大小</span></Col>
          <Col span={16}>
            <InputNumber
              min={8}
              max={120}
              value={fontSize}
              onChange={(v) => updateStyle({ fontSize: v !== null ? `${v}px` : undefined })}
              addonAfter="px"
              size="small"
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        <Row align="middle">
          <Col span={8}><span style={{ fontSize: 12 }}>行高</span></Col>
          <Col span={16}>
            <InputNumber
              min={0.5}
              max={5}
              step={0.1}
              value={lineHeight}
              onChange={(v) => updateStyle({ lineHeight: v !== null ? String(v) : undefined })}
              size="small"
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        <Row align="middle">
          <Col span={8}><span style={{ fontSize: 12 }}>字重</span></Col>
          <Col span={16}>
            <Slider
              min={100}
              max={900}
              step={100}
              value={fontWeight}
              onChange={(v) => updateStyle({ fontWeight: String(v) })}
              marks={{ 400: '400', 700: '700' }}
            />
          </Col>
        </Row>
      </Space>

      {/* 圆角 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        圆角
        <Switch
          checked={unifiedRadius}
          onChange={setUnifiedRadius}
          size="small"
          style={{ marginLeft: 8 }}
          checkedChildren="统一"
          unCheckedChildren="独立"
        />
      </Divider>
      <Row gutter={[8, 8]}>
        {unifiedRadius ? (
          <Col span={24}>
            <InputNumber
              min={0}
              max={100}
              value={radiusValues[0].num ?? 0}
              onChange={(v) => {
                const val = v !== null ? `${v}px` : undefined;
                updateStyle({
                  borderRadius: val,
                  borderTopLeftRadius: undefined,
                  borderTopRightRadius: undefined,
                  borderBottomLeftRadius: undefined,
                  borderBottomRightRadius: undefined,
                });
              }}
              addonAfter="px"
              size="small"
              style={{ width: '100%' }}
            />
          </Col>
        ) : (
          radiusValues.map((corner) => (
            <Col span={12} key={corner.key}>
              <Space size={4}>
                <Tooltip title={corner.label}>
                  {corner.key.includes('TopLeft') && <RadiusUpleftOutlined />}
                  {corner.key.includes('TopRight') && <RadiusUprightOutlined />}
                  {corner.key.includes('BottomLeft') && <RadiusBottomleftOutlined />}
                  {corner.key.includes('BottomRight') && <RadiusBottomrightOutlined />}
                </Tooltip>
                <InputNumber
                  min={0}
                  max={100}
                  value={corner.num ?? 0}
                  onChange={(v) => {
                    updateStyle({
                      [corner.key]: v !== null ? `${v}px` : undefined,
                      borderRadius: undefined,
                    });
                  }}
                  addonAfter="px"
                  size="small"
                  style={{ width: '100%' }}
                />
              </Space>
            </Col>
          ))
        )}
      </Row>

      {/* 阴影 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        阴影
      </Divider>
      <BoxShadowEditor
        value={String(styles.boxShadow ?? '')}
        onChange={(shadow) => updateStyle({ boxShadow: shadow || undefined })}
      />

      {/* 透明度 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        透明度
      </Divider>
      <Slider
        min={0}
        max={100}
        value={opacity}
        onChange={(v) => updateStyle({ opacity: String(v / 100) })}
        tooltip={{ formatter: (v) => `${v}%` }}
      />
    </div>
  );
};

StyleEditor.displayName = 'StyleEditor';

// ===== 子组件 =====

/** 盒模型编辑器 */
interface BoxModelEditorProps {
  values: Record<BoxEdge, { num: number | null; unit: CSSUnit }>;
  unified: boolean;
  prefix: 'margin' | 'padding';
  onChange: (updates: Record<string, string | undefined>) => void;
}

const BoxModelEditor: React.FC<BoxModelEditorProps> = ({
  values,
  unified,
  prefix,
  onChange,
}) => {
  const edges: BoxEdge[] = ['top', 'right', 'bottom', 'left'];

  if (unified) {
    const first = values.top;
    return (
      <InputNumber
        min={0}
        max={200}
        value={first.num ?? 0}
        onChange={(v) => {
          const val = v !== null ? `${v}px` : undefined;
          onChange({ [prefix]: val });
        }}
        addonAfter="px"
        size="small"
        style={{ width: '100%' }}
      />
    );
  }

  return (
    <Row gutter={[8, 8]}>
      {edges.map((edge) => (
        <Col span={12} key={edge}>
          <Space size={4}>
            <span style={{ fontSize: 11, color: '#8c8c8c', width: 28 }}>
              {edge === 'top' && '上'}
              {edge === 'right' && '右'}
              {edge === 'bottom' && '下'}
              {edge === 'left' && '左'}
            </span>
            <InputNumber
              min={0}
              max={200}
              value={values[edge].num ?? 0}
              onChange={(v) => {
                const key = `${prefix}${capitalize(edge)}`;
                onChange({
                  [key]: v !== null ? `${v}px` : undefined,
                  [prefix]: undefined,
                });
              }}
              addonAfter="px"
              size="small"
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
      ))}
    </Row>
  );
};

/** 阴影简化编辑器 */
interface BoxShadowEditorProps {
  value: string;
  onChange: (shadow: string) => void;
}

const BoxShadowEditor: React.FC<BoxShadowEditorProps> = ({ value, onChange }) => {
  const [x, y, blur, spread, color] = useMemo(() => {
    // 尝试解析 box-shadow: x y blur spread color
    const match = value.match(/^(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(\d+)px\s+(.+)$/);
    if (match) {
      return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
        parseInt(match[4], 10),
        match[5],
      ];
    }
    return [0, 2, 4, 0, 'rgba(0,0,0,0.1)'];
  }, [value]);

  const updateShadow = useCallback(
    (updates: Partial<{ x: number; y: number; blur: number; spread: number; color: string }>) => {
      const next = {
        x: updates.x ?? x,
        y: updates.y ?? y,
        blur: updates.blur ?? blur,
        spread: updates.spread ?? spread,
        color: updates.color ?? color,
      };
      onChange(`${next.x}px ${next.y}px ${next.blur}px ${next.spread}px ${next.color}`);
    },
    [x, y, blur, spread, color, onChange],
  );

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Space size={4} direction="vertical" style={{ width: '100%' }}>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>X 偏移</span>
            <InputNumber
              value={x}
              onChange={(v) => updateShadow({ x: v ?? 0 })}
              addonAfter="px"
              size="small"
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
        <Col span={12}>
          <Space size={4} direction="vertical" style={{ width: '100%' }}>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>Y 偏移</span>
            <InputNumber
              value={y}
              onChange={(v) => updateShadow({ y: v ?? 0 })}
              addonAfter="px"
              size="small"
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
        <Col span={12}>
          <Space size={4} direction="vertical" style={{ width: '100%' }}>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>模糊</span>
            <InputNumber
              min={0}
              value={blur}
              onChange={(v) => updateShadow({ blur: v ?? 0 })}
              addonAfter="px"
              size="small"
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
        <Col span={12}>
          <Space size={4} direction="vertical" style={{ width: '100%' }}>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>扩散</span>
            <InputNumber
              value={spread}
              onChange={(v) => updateShadow({ spread: v ?? 0 })}
              addonAfter="px"
              size="small"
              style={{ width: '100%' }}
            />
          </Space>
        </Col>
      </Row>
      <ColorPicker
        value={color}
        onChange={(c) => updateShadow({ color: c })}
        label="阴影颜色"
      />
    </Space>
  );
};

/** 首字母大写 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
