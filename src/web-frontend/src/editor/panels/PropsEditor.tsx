/**
 * PropsEditor - 组件属性编辑器
 * Props Editor
 *
 * 根据选中组件的当前属性，生成对应的表单编辑器。
 * 支持基本类型：string、number、boolean、object、array。
 * 属性变更通过 CommandManager 执行（支持撤销）。
 */
import React, { useCallback, useMemo } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Switch,
  Space,
  Empty,
} from 'antd';
import { useEditorStore } from '../store/editorStore';
import { ComponentRegistry } from '../core/ComponentRegistry';

/** PropsEditor 组件属性 */
export interface PropsEditorProps {
  /** 当前编辑的节点ID */
  nodeId: string;
}

/** 推断值的类型 */
function inferType(value: unknown): 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'string';
}

/**
 * PropsEditor - 组件属性编辑面板
 *
 * 读取组件插件的 defaultConfig，结合当前节点 props 生成表单。
 */
export const PropsEditor: React.FC<PropsEditorProps> = ({ nodeId }) => {
  const updateNodeProps = useEditorStore((state) => state.updateNodeProps);
  const nodes = useEditorStore((state) => state.nodes);
  const node = nodes[nodeId];

  const registry = useMemo(() => ComponentRegistry.getInstance(), []);

  const plugin = useMemo(() => {
    if (!node) return undefined;
    return registry.get(node.type);
  }, [node, registry]);

  // 合并当前 props 和 defaultConfig 生成可编辑的字段列表
  const editableProps = useMemo(() => {
    if (!plugin) return [];

    const defaultConfig = plugin.defaultConfig ?? {};
    const currentProps = node?.props ?? {};

    // 合并所有键
    const allKeys = new Set([...Object.keys(defaultConfig), ...Object.keys(currentProps)]);

    return Array.from(allKeys).map((key) => {
      const currentValue = currentProps[key];
      const defaultValue = defaultConfig[key];
      const value = currentValue !== undefined ? currentValue : defaultValue;
      const type = inferType(value);

      return {
        key,
        label: key,
        value,
        type,
        hasOverride: currentValue !== undefined && currentValue !== defaultValue,
      };
    });
  }, [plugin, node]);

  const handlePropChange = useCallback(
    (key: string, value: unknown) => {
      updateNodeProps(nodeId, { [key]: value });
    },
    [nodeId, updateNodeProps],
  );

  if (!node || !plugin) {
    return (
      <Empty
        description="无法编辑该组件的属性"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 32 }}
      />
    );
  }

  if (editableProps.length === 0) {
    return (
      <Empty
        description="该组件无可编辑属性"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 32 }}
      />
    );
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <Form layout="vertical" size="small">
        {editableProps.map((prop) => (
          <Form.Item
            key={prop.key}
            label={
              <Space size={4}>
                <span style={{ fontSize: 12, fontWeight: prop.hasOverride ? 600 : 400 }}>
                  {prop.label}
                </span>
                {prop.hasOverride && (
                  <span style={{ fontSize: 10, color: '#1677ff' }}>已修改</span>
                )}
              </Space>
            }
            style={{ marginBottom: 12 }}
          >
            <PropInput
              prop={prop}
              onChange={(value) => handlePropChange(prop.key, value)}
            />
          </Form.Item>
        ))}
      </Form>
    </div>
  );
};

PropsEditor.displayName = 'PropsEditor';

/** 单个属性输入组件 */
interface PropInputProps {
  prop: {
    key: string;
    label: string;
    value: unknown;
    type: string;
  };
  onChange: (value: unknown) => void;
}

const PropInput: React.FC<PropInputProps> = ({ prop, onChange }) => {
  const { type, value } = prop;

  if (type === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        onChange={onChange}
        size="small"
      />
    );
  }

  if (type === 'number') {
    return (
      <InputNumber
        value={typeof value === 'number' ? value : undefined}
        onChange={(v) => onChange(v ?? 0)}
        style={{ width: '100%' }}
        size="small"
      />
    );
  }

  if (type === 'object' || type === 'array') {
    return (
      <Input.TextArea
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch {
            // 解析失败时不更新，保持当前值
          }
        }}
        rows={3}
        size="small"
        style={{ fontFamily: 'monospace', fontSize: 11 }}
      />
    );
  }

  // 字符串类型（默认）
  // 特殊处理一些已知属性
  if (prop.key.toLowerCase().includes('color')) {
    return (
      <Input
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        placeholder="#1890ff"
      />
    );
  }

  if (prop.key.toLowerCase().includes('url') || prop.key.toLowerCase().includes('src')) {
    return (
      <Input
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        placeholder="https://..."
      />
    );
  }

  return (
    <Input
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      size="small"
    />
  );
};
