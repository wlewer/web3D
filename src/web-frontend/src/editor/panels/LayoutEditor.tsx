/**
 * LayoutEditor - 布局编辑器
 * Layout Editor
 *
 * 提供宽度/高度、display 类型、flex 布局、定位等布局属性的编辑能力。
 * 使用可视化图标辅助理解布局概念。
 */
import React, { useCallback, useMemo } from 'react';
import {
  InputNumber,
  Select,
  Space,
  Divider,
  Radio,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  BlockOutlined,
  AppstoreOutlined,
  TableOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '../store/editorStore';

/** LayoutEditor 组件属性 */
export interface LayoutEditorProps {
  /** 当前编辑的节点ID */
  nodeId: string;
}

/** 尺寸单位 */
type SizeUnit = 'px' | '%' | 'auto' | 'vh' | 'vw';

/** 解析尺寸值 */
function parseSize(value: unknown): { num: number | null; unit: SizeUnit } {
  if (value === undefined || value === null || value === 'auto') {
    return { num: null, unit: 'auto' };
  }
  const str = String(value);
  if (str === 'auto') return { num: null, unit: 'auto' };
  const match = str.match(/^(-?\d+(?:\.\d+)?)(px|%|vh|vw)$/);
  if (match) {
    return { num: parseFloat(match[1]), unit: match[2] as SizeUnit };
  }
  const numMatch = str.match(/^(-?\d+(?:\.\d+)?)$/);
  if (numMatch) {
    return { num: parseFloat(numMatch[1]), unit: 'px' };
  }
  return { num: null, unit: 'auto' };
}

/** 格式化尺寸值 */
function formatSize(num: number | null, unit: SizeUnit): string | undefined {
  if (unit === 'auto') return 'auto';
  if (num === null || num === undefined) return undefined;
  return `${num}${unit}`;
}

/**
 * LayoutEditor - 布局属性编辑面板
 *
 * 编辑组件的尺寸、display、flex 和定位属性。
 */
export const LayoutEditor: React.FC<LayoutEditorProps> = ({ nodeId }) => {
  const updateNodeStyles = useEditorStore((state) => state.updateNodeStyles);
  const nodes = useEditorStore((state) => state.nodes);

  const node = nodes[nodeId];
  const styles = (node?.styles ?? {}) as Record<string, unknown>;

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

  // 解析尺寸
  const width = useMemo(() => parseSize(styles.width), [styles]);
  const height = useMemo(() => parseSize(styles.height), [styles]);

  // display
  const display = useMemo(() => String(styles.display || 'block'), [styles]);

  // flex 相关
  const flexDirection = useMemo(() => String(styles.flexDirection || 'row'), [styles]);
  const justifyContent = useMemo(() => String(styles.justifyContent || 'flex-start'), [styles]);
  const alignItems = useMemo(() => String(styles.alignItems || 'stretch'), [styles]);
  const flexWrap = useMemo(() => String(styles.flexWrap || 'nowrap'), [styles]);

  // 定位
  const position = useMemo(() => String(styles.position || 'static'), [styles]);
  const top = useMemo(() => parseSize(styles.top), [styles]);
  const right = useMemo(() => parseSize(styles.right), [styles]);
  const bottom = useMemo(() => parseSize(styles.bottom), [styles]);
  const left = useMemo(() => parseSize(styles.left), [styles]);
  const zIndex = useMemo(() => {
    const val = styles.zIndex;
    return val === undefined || val === null ? undefined : parseInt(String(val), 10);
  }, [styles]);

  if (!node) {
    return null;
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* 尺寸 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        尺寸
      </Divider>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Space size={4} direction="vertical" style={{ width: '100%' }}>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>宽度</span>
            <SizeInput
              value={width}
              onChange={(val) => updateStyle({ width: val })}
            />
          </Space>
        </Col>
        <Col span={12}>
          <Space size={4} direction="vertical" style={{ width: '100%' }}>
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>高度</span>
            <SizeInput
              value={height}
              onChange={(val) => updateStyle({ height: val })}
            />
          </Space>
        </Col>
      </Row>

      {/* Display 类型 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        Display
      </Divider>
      <Radio.Group
        value={display}
        onChange={(e) => updateStyle({ display: e.target.value })}
        buttonStyle="solid"
        size="small"
      >
        <Radio.Button value="block">
          <Tooltip title="块级布局">
            <BlockOutlined /> 块级
          </Tooltip>
        </Radio.Button>
        <Radio.Button value="flex">
          <Tooltip title="Flex 弹性布局">
            <AppstoreOutlined /> Flex
          </Tooltip>
        </Radio.Button>
        <Radio.Button value="grid">
          <Tooltip title="Grid 网格布局">
            <TableOutlined /> Grid
          </Tooltip>
        </Radio.Button>
        <Radio.Button value="inline-block">
          <Tooltip title="行内块">
            <DragOutlined /> 行内块
          </Tooltip>
        </Radio.Button>
      </Radio.Group>

      {/* Flex 布局 */}
      {display === 'flex' && (
        <>
          <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
            Flex 布局
          </Divider>

          {/* 方向 */}
          <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#595959' }}>方向</span>
            <Radio.Group
              value={flexDirection}
              onChange={(e) => updateStyle({ flexDirection: e.target.value })}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="row">
                <Tooltip title="水平排列">
                  <ArrowRightOutlined /> 水平
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="column">
                <Tooltip title="垂直排列">
                  <ArrowDownOutlined /> 垂直
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="row-reverse">
                <Tooltip title="水平反向">
                  <ArrowLeftOutlined /> 水平反向
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="column-reverse">
                <Tooltip title="垂直反向">
                  <ArrowUpOutlined /> 垂直反向
                </Tooltip>
              </Radio.Button>
            </Radio.Group>
          </Space>

          {/* 主轴对齐 */}
          <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#595959' }}>主轴对齐 (justifyContent)</span>
            <Radio.Group
              value={justifyContent}
              onChange={(e) => updateStyle({ justifyContent: e.target.value })}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="flex-start">
                <Tooltip title="起点对齐">
                  <AlignLeftOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="center">
                <Tooltip title="居中对齐">
                  <AlignCenterOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="flex-end">
                <Tooltip title="终点对齐">
                  <AlignRightOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="space-between">
                <Tooltip title="两端对齐">
                  <SwapOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="space-around">
                <Tooltip title="均匀分布">
                  <span>环绕</span>
                </Tooltip>
              </Radio.Button>
            </Radio.Group>
          </Space>

          {/* 交叉轴对齐 */}
          <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#595959' }}>交叉轴对齐 (alignItems)</span>
            <Radio.Group
              value={alignItems}
              onChange={(e) => updateStyle({ alignItems: e.target.value })}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="flex-start">
                <Tooltip title="顶部对齐">
                  <VerticalAlignTopOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="center">
                <Tooltip title="居中对齐">
                  <VerticalAlignMiddleOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="flex-end">
                <Tooltip title="底部对齐">
                  <VerticalAlignBottomOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="stretch">
                <Tooltip title="拉伸填满">
                  <span>拉伸</span>
                </Tooltip>
              </Radio.Button>
            </Radio.Group>
          </Space>

          {/* 换行 */}
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <span style={{ fontSize: 12, color: '#595959' }}>换行</span>
            <Radio.Group
              value={flexWrap}
              onChange={(e) => updateStyle({ flexWrap: e.target.value })}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="nowrap">不换行</Radio.Button>
              <Radio.Button value="wrap">换行</Radio.Button>
              <Radio.Button value="wrap-reverse">反向换行</Radio.Button>
            </Radio.Group>
          </Space>
        </>
      )}

      {/* 定位 */}
      <Divider orientation="left" style={{ margin: '16px 0 12px', fontSize: 12, color: '#8c8c8c' }}>
        定位
      </Divider>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Radio.Group
          value={position}
          onChange={(e) => updateStyle({ position: e.target.value })}
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button value="static">static</Radio.Button>
          <Radio.Button value="relative">relative</Radio.Button>
          <Radio.Button value="absolute">absolute</Radio.Button>
          <Radio.Button value="fixed">fixed</Radio.Button>
          <Radio.Button value="sticky">sticky</Radio.Button>
        </Radio.Group>

        {position !== 'static' && (
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Space size={4} direction="vertical" style={{ width: '100%' }}>
                <span style={{ fontSize: 11, color: '#8c8c8c' }}>Top</span>
                <SizeInput
                  value={top}
                  onChange={(val) => updateStyle({ top: val })}
                />
              </Space>
            </Col>
            <Col span={12}>
              <Space size={4} direction="vertical" style={{ width: '100%' }}>
                <span style={{ fontSize: 11, color: '#8c8c8c' }}>Right</span>
                <SizeInput
                  value={right}
                  onChange={(val) => updateStyle({ right: val })}
                />
              </Space>
            </Col>
            <Col span={12}>
              <Space size={4} direction="vertical" style={{ width: '100%' }}>
                <span style={{ fontSize: 11, color: '#8c8c8c' }}>Bottom</span>
                <SizeInput
                  value={bottom}
                  onChange={(val) => updateStyle({ bottom: val })}
                />
              </Space>
            </Col>
            <Col span={12}>
              <Space size={4} direction="vertical" style={{ width: '100%' }}>
                <span style={{ fontSize: 11, color: '#8c8c8c' }}>Left</span>
                <SizeInput
                  value={left}
                  onChange={(val) => updateStyle({ left: val })}
                />
              </Space>
            </Col>
            <Col span={12}>
              <Space size={4} direction="vertical" style={{ width: '100%' }}>
                <span style={{ fontSize: 11, color: '#8c8c8c' }}>Z-Index</span>
                <InputNumber
                  value={zIndex}
                  onChange={(v) => updateStyle({ zIndex: v !== null ? String(v) : undefined })}
                  size="small"
                  style={{ width: '100%' }}
                />
              </Space>
            </Col>
          </Row>
        )}
      </Space>
    </div>
  );
};

LayoutEditor.displayName = 'LayoutEditor';

/** 尺寸输入组件 */
interface SizeInputProps {
  value: { num: number | null; unit: SizeUnit };
  onChange: (val: string | undefined) => void;
}

const SizeInput: React.FC<SizeInputProps> = ({ value, onChange }) => {
  const handleNumberChange = (num: number | null) => {
    if (value.unit === 'auto') {
      onChange(num !== null ? `${num}px` : 'auto');
    } else {
      onChange(formatSize(num, value.unit));
    }
  };

  const handleUnitChange = (unit: SizeUnit) => {
    if (unit === 'auto') {
      onChange('auto');
    } else {
      onChange(formatSize(value.num, unit));
    }
  };

  const isAuto = value.unit === 'auto';

  return (
    <Space.Compact style={{ width: '100%' }}>
      <InputNumber
        value={isAuto ? undefined : value.num}
        onChange={handleNumberChange}
        disabled={isAuto}
        size="small"
        style={{ flex: 1 }}
        placeholder={isAuto ? 'auto' : undefined}
      />
      <Select
        value={value.unit}
        onChange={handleUnitChange}
        size="small"
        style={{ width: 70 }}
        options={[
          { value: 'px', label: 'px' },
          { value: '%', label: '%' },
          { value: 'vh', label: 'vh' },
          { value: 'vw', label: 'vw' },
          { value: 'auto', label: 'auto' },
        ]}
      />
    </Space.Compact>
  );
};
