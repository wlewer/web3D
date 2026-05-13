/**
 * RenderConfigEditor - 渲染参数配置编辑器
 *
 * 支持两种模式：
 * - "global": 编辑全局默认渲染配置
 * - "model": 编辑单模型的覆盖配置（显示继承/自定义状态）
 *
 * 内部以四组 Tab 组织：相机、环绕、装饰、视觉
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, Slider, Switch, Select, Row, Col, InputNumber, Tooltip, Badge, Collapse, Radio } from 'antd';
import type { RenderConfig, CameraConfigParams, OrbitConfigParams, DecorationConfigParams, VisualConfigParams } from '@/types/render-config';

// ==================== 内置色板 ====================

const MODEL_COLORS = ['#0a0a0f', '#0f0f23', '#1a0f2e', '#0a1628', '#1c1c1c', '#2d1b4e', '#0d2137', '#667eea'];

// ==================== 环绕预设选项 ====================

const ORBIT_PRESET_OPTIONS = [
  { value: 'full-showcase', label: '全景展示', desc: '水平360° + 前后180° 全方位观赏' },
  { value: 'quick-spin', label: '快速浏览', desc: '快速水平旋转，快速掌握全貌' },
  { value: 'product-tour', label: '产品环视', desc: '平稳水平环绕，突出产品细节' },
  { value: 'product-spiral', label: '产品螺旋', desc: '从下到上螺旋展示立体感' },
  { value: 'art-vertical', label: '艺术垂直弧', desc: '沿垂直弧线正面→头顶→背面移动' },
  { value: 'art-figure8', label: '艺术8字', desc: '8字形轨迹环绕，展示全方位美感' },
  { value: 'architecture-spiral', label: '建筑螺旋', desc: '多圈螺旋上升展示建筑全貌' },
  { value: 'architecture-horizontal', label: '建筑平转', desc: '低速水平环绕展示外立面' },
  { value: 'mobile-horizontal', label: '手机水平', desc: '轻量水平环绕，适合移动端' },
];

// ==================== Props ====================

export interface RenderConfigEditorProps {
  /** 当前配置值 */
  value: RenderConfig;
  /** 配置变化回调 */
  onChange: (config: RenderConfig) => void;
  /** 编辑模式 */
  mode: 'global' | 'model';
  /** 模型模式下，显示全局默认值用于对比继承状态 */
  globalDefaults?: RenderConfig | null;
  /** 模型名称（仅模型模式） */
  modelName?: string;
}

// ==================== 工具函数 ====================

/** 深拷贝 RenderConfig */
function cloneConfig(cfg: RenderConfig): RenderConfig {
  return JSON.parse(JSON.stringify(cfg));
}

/** 获取参数是否继承自全局 */
function isInherited(global: any, local: any, key: string): boolean {
  if (local === undefined) return true;
  if (global === undefined) return false;
  return local === global;
}

// ==================== 滑块预设快捷按钮 ====================

function PresetButtons({ values, current, onChange }: { values: number[]; current: number; onChange: (v: number) => void }) {
  return (
    <span style={{ marginLeft: 8 }}>
      {values.map(v => (
        <span
          key={v}
          onClick={() => onChange(v)}
          style={{
            display: 'inline-block',
            padding: '0 6px',
            margin: '0 2px',
            fontSize: 11,
            cursor: 'pointer',
            color: current === v ? '#1677ff' : '#888',
            fontWeight: current === v ? 600 : 400,
            borderBottom: current === v ? '2px solid #1677ff' : '2px solid transparent',
          }}
        >
          {v}°
        </span>
      ))}
    </span>
  );
}

// ==================== 参数行包装 ====================

interface ParamRowProps {
  label: string;
  children: React.ReactNode;
  inherited?: boolean;
  onReset?: () => void;
}

function ParamRow({ label, children, inherited, onReset }: ParamRowProps) {
  return (
    <Row align="middle" style={{ marginBottom: 12, minHeight: 32 }}>
      <Col span={6}>
        <span style={{ fontSize: 13, color: '#ccc' }}>
          {inherited !== undefined && (
            <Tooltip title={inherited ? '继承全局默认值' : '已自定义'}>
              <span
                onClick={onReset}
                style={{ cursor: onReset ? 'pointer' : 'default', marginRight: 4 }}
              >
                {inherited ? '🌐' : '✏️'}
              </span>
            </Tooltip>
          )}
          {label}
        </span>
      </Col>
      <Col span={18} style={{ display: 'flex', alignItems: 'center' }}>
        {children}
      </Col>
    </Row>
  );
}

// ==================== 主组件 ====================

export const RenderConfigEditor: React.FC<RenderConfigEditorProps> = ({
  value,
  onChange,
  mode,
  globalDefaults,
  modelName,
}) => {
  // 内部 Tab
  const [tab, setTab] = useState<string>('camera');

  // 更新任意路径
  const updatePath = useCallback(
    <K extends keyof RenderConfig>(section: K, patch: Partial<RenderConfig[K]>) => {
      const next = cloneConfig(value);
      const current = next[section] || {} as any;
      next[section] = { ...current, ...patch } as RenderConfig[K];
      onChange(next);
    },
    [value, onChange],
  );

  // 判断是否继承（仅 model 模式）
  const isInheritedFromGlobal = useCallback(
    (section: keyof RenderConfig, key: string) => {
      if (mode !== 'model' || !globalDefaults) return undefined;
      return isInherited(
        (globalDefaults as any)?.[section],
        (value as any)?.[section],
        key,
      );
    },
    [mode, globalDefaults, value],
  );

  // 重置为全局默认
  const resetToGlobal = useCallback(
    (section: keyof RenderConfig, key: string) => {
      if (mode !== 'model') return;
      const next = cloneConfig(value);
      if (next[section] && globalDefaults?.[section]) {
        delete (next[section] as any)[key];
        // 如果 section 所有字段都变成 undefined, 删除整个 section
        const remaining = Object.keys(next[section] as object).filter(k => (next[section] as any)[k] !== undefined);
        if (remaining.length === 0) {
          delete next[section];
        }
      }
      onChange(next);
    },
    [value, onChange, mode, globalDefaults],
  );

  // ===== 渲染: 相机面板 =====
  const renderCameraPanel = () => {
    const c = value.camera || {};
    return (
      <div>
        <ParamRow label="视野角度 (FOV)" inherited={isInheritedFromGlobal('camera', 'fov')} onReset={() => resetToGlobal('camera', 'fov')}>
          <Slider min={10} max={90} step={1} value={c.fov ?? 50} onChange={v => updatePath('camera', { fov: v })} style={{ width: 180 }} />
          <InputNumber min={10} max={90} value={c.fov ?? 50} onChange={v => updatePath('camera', { fov: v ?? 50 })} size="small" style={{ width: 60, marginLeft: 8 }} />
          <PresetButtons values={[30, 50, 70, 90]} current={c.fov ?? 50} onChange={v => updatePath('camera', { fov: v })} />
        </ParamRow>
        <ParamRow label="自动旋转" inherited={isInheritedFromGlobal('camera', 'autoRotate')} onReset={() => resetToGlobal('camera', 'autoRotate')}>
          <Switch checked={c.autoRotate ?? true} onChange={v => updatePath('camera', { autoRotate: v })} />
        </ParamRow>
        <ParamRow label="旋转速度" inherited={isInheritedFromGlobal('camera', 'autoRotateSpeed')} onReset={() => resetToGlobal('camera', 'autoRotateSpeed')}>
          <Slider min={0.2} max={5.0} step={0.1} value={c.autoRotateSpeed ?? 1.0} onChange={v => updatePath('camera', { autoRotateSpeed: v })} style={{ width: 200 }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{(c.autoRotateSpeed ?? 1.0).toFixed(1)}x</span>
        </ParamRow>
        <ParamRow label="相机距离" inherited={isInheritedFromGlobal('camera', 'margin')} onReset={() => resetToGlobal('camera', 'margin')}>
          <Slider min={1.0} max={6.0} step={0.1} value={c.margin ?? 2.5} onChange={v => updatePath('camera', { margin: v })} style={{ width: 200 }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{(c.margin ?? 2.5).toFixed(1)}x</span>
        </ParamRow>
        <ParamRow label="智能居中" inherited={isInheritedFromGlobal('camera', 'autoCenter')} onReset={() => resetToGlobal('camera', 'autoCenter')}>
          <Switch checked={c.autoCenter ?? true} onChange={v => updatePath('camera', { autoCenter: v })} />
        </ParamRow>

        {/* 高级: 精确镜头控制 */}
        <Collapse size="small" style={{ marginTop: 8, background: 'transparent' }} items={[{
          key: 'advanced',
          label: <span style={{ fontSize: 12, color: '#888' }}>高级: 精确镜头位置 (覆盖 Smart Fit)</span>,
          children: (
            <div>
              <ParamRow label="Position X">
                <InputNumber size="small" value={c.position?.[0] ?? 0} onChange={v => updatePath('camera', { position: [v ?? 0, c.position?.[1] ?? 0, c.position?.[2] ?? 0] as [number, number, number] })} step={0.1} style={{ width: 80 }} />
                <span style={{ margin: '0 4px', color: '#666' }}>Y</span>
                <InputNumber size="small" value={c.position?.[1] ?? 0} onChange={v => updatePath('camera', { position: [c.position?.[0] ?? 0, v ?? 0, c.position?.[2] ?? 0] as [number, number, number] })} step={0.1} style={{ width: 80 }} />
                <span style={{ margin: '0 4px', color: '#666' }}>Z</span>
                <InputNumber size="small" value={c.position?.[2] ?? 0} onChange={v => updatePath('camera', { position: [c.position?.[0] ?? 0, c.position?.[1] ?? 0, v ?? 0] as [number, number, number] })} step={0.1} style={{ width: 80 }} />
              </ParamRow>
              <ParamRow label="Target X">
                <InputNumber size="small" value={c.target?.[0] ?? 0} onChange={v => updatePath('camera', { target: [v ?? 0, c.target?.[1] ?? 0, c.target?.[2] ?? 0] as [number, number, number] })} step={0.1} style={{ width: 80 }} />
                <span style={{ margin: '0 4px', color: '#666' }}>Y</span>
                <InputNumber size="small" value={c.target?.[1] ?? 0} onChange={v => updatePath('camera', { target: [c.target?.[0] ?? 0, v ?? 0, c.target?.[2] ?? 0] as [number, number, number] })} step={0.1} style={{ width: 80 }} />
                <span style={{ margin: '0 4px', color: '#666' }}>Z</span>
                <InputNumber size="small" value={c.target?.[2] ?? 0} onChange={v => updatePath('camera', { target: [c.target?.[0] ?? 0, c.target?.[1] ?? 0, v ?? 0] as [number, number, number] })} step={0.1} style={{ width: 80 }} />
              </ParamRow>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                设置精确位置后会自动设置 customCameraConfig，覆盖 smart fit 自动居中逻辑
              </div>
            </div>
          ),
        }]} />
      </div>
    );
  };

  // ===== 渲染: 环绕面板 =====
  const renderOrbitPanel = () => {
    const o = value.orbit || {};
    const selectedPreset = ORBIT_PRESET_OPTIONS.find(p => p.value === o.presetId);
    return (
      <div>
        <ParamRow label="启用环绕" inherited={isInheritedFromGlobal('orbit', 'enabled')} onReset={() => resetToGlobal('orbit', 'enabled')}>
          <Switch checked={o.enabled ?? false} onChange={v => updatePath('orbit', { enabled: v })} />
          <span style={{ marginLeft: 8, fontSize: 11, color: '#666' }}>启用后将替代 autoRotate</span>
        </ParamRow>
        <ParamRow label="环绕预设" inherited={isInheritedFromGlobal('orbit', 'presetId')} onReset={() => resetToGlobal('orbit', 'presetId')}>
          <Select
            value={o.presetId ?? 'full-showcase'}
            onChange={v => updatePath('orbit', { presetId: v })}
            options={ORBIT_PRESET_OPTIONS}
            style={{ width: 260 }}
            size="small"
          />
        </ParamRow>
        {selectedPreset && (
          <div style={{ fontSize: 11, color: '#888', margin: '-4px 0 12px 0', paddingLeft: '25%' }}>
            {selectedPreset.desc}
          </div>
        )}
        <ParamRow label="速度倍率" inherited={isInheritedFromGlobal('orbit', 'speed')} onReset={() => resetToGlobal('orbit', 'speed')}>
          <Slider min={0.5} max={3.0} step={0.1} value={o.speed ?? 1.0} onChange={v => updatePath('orbit', { speed: v })} style={{ width: 200 }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{(o.speed ?? 1.0).toFixed(1)}x</span>
        </ParamRow>
        <ParamRow label="环绕周期" inherited={isInheritedFromGlobal('orbit', 'duration')} onReset={() => resetToGlobal('orbit', 'duration')}>
          <Slider min={4000} max={30000} step={1000} value={o.duration ?? 12000} onChange={v => updatePath('orbit', { duration: v })} style={{ width: 200 }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{((o.duration ?? 12000) / 1000).toFixed(0)}s</span>
        </ParamRow>
        <ParamRow label="中心偏移 Y" inherited={isInheritedFromGlobal('orbit', 'centerYOffset')} onReset={() => resetToGlobal('orbit', 'centerYOffset')}>
          <Slider min={-2.0} max={2.0} step={0.1} value={o.centerYOffset ?? 0} onChange={v => updatePath('orbit', { centerYOffset: v })} style={{ width: 200 }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{(o.centerYOffset ?? 0).toFixed(1)}</span>
        </ParamRow>
      </div>
    );
  };

  // ===== 渲染: 装饰面板 =====
  const renderDecorationPanel = () => {
    const d = value.decorations || {};
    return (
      <div>
        <ParamRow label="粒子背景" inherited={isInheritedFromGlobal('decorations', 'showParticles')} onReset={() => resetToGlobal('decorations', 'showParticles')}>
          <Switch checked={d.showParticles ?? true} onChange={v => updatePath('decorations', { showParticles: v })} />
        </ParamRow>
        <ParamRow label="粒子大小" inherited={isInheritedFromGlobal('decorations', 'particleSize')} onReset={() => resetToGlobal('decorations', 'particleSize')}>
          <Slider min={0.05} max={2.0} step={0.05} value={d.particleSize ?? 0.3} onChange={v => updatePath('decorations', { particleSize: v })} style={{ width: 200 }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{(d.particleSize ?? 0.3).toFixed(2)}</span>
        </ParamRow>
        <ParamRow label="展示台" inherited={isInheritedFromGlobal('decorations', 'showPlatform')} onReset={() => resetToGlobal('decorations', 'showPlatform')}>
          <Switch checked={d.showPlatform ?? true} onChange={v => updatePath('decorations', { showPlatform: v })} />
        </ParamRow>
        <ParamRow label="产品标签" inherited={isInheritedFromGlobal('decorations', 'showLabels')} onReset={() => resetToGlobal('decorations', 'showLabels')}>
          <Switch checked={d.showLabels ?? false} onChange={v => updatePath('decorations', { showLabels: v })} />
        </ParamRow>
        {(d.showLabels ?? false) && (
          <ParamRow label="标签数量" inherited={isInheritedFromGlobal('decorations', 'labelCount')} onReset={() => resetToGlobal('decorations', 'labelCount')}>
            <Radio.Group
              value={d.labelCount ?? 3}
              onChange={e => updatePath('decorations', { labelCount: e.target.value })}
              size="small"
              optionType="button"
              buttonStyle="solid"
              options={[
                { value: 2, label: '2 个标签' },
                { value: 3, label: '3 个标签' },
              ]}
            />
            <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>自动环绕均布</span>
          </ParamRow>
        )}
        <ParamRow label="语言">
          <Select
            value={d.language ?? 'zh-CN'}
            onChange={v => updatePath('decorations', { language: v as 'zh-CN' | 'en-US' })}
            options={[
              { value: 'zh-CN', label: '中文' },
              { value: 'en-US', label: 'English' },
            ]}
            size="small"
            style={{ width: 120 }}
          />
        </ParamRow>
      </div>
    );
  };

  // ===== 渲染: 视觉面板 =====
  const renderVisualPanel = () => {
    const v = value.visual || {};
    return (
      <div>
        <ParamRow label="背景色" inherited={isInheritedFromGlobal('visual', 'backgroundColor')} onReset={() => resetToGlobal('visual', 'backgroundColor')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {MODEL_COLORS.map(c => (
              <div
                key={c}
                onClick={() => updatePath('visual', { backgroundColor: c })}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: c,
                  cursor: 'pointer',
                  border: (v.backgroundColor ?? '#0a0a0f') === c ? '2px solid #1677ff' : '2px solid transparent',
                  outline: (v.backgroundColor ?? '#0a0a0f') === c ? '1px solid #fff' : 'none',
                }}
              />
            ))}
            <input
              type="color"
              value={v.backgroundColor ?? '#0a0a0f'}
              onChange={e => updatePath('visual', { backgroundColor: e.target.value })}
              style={{ width: 30, height: 24, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}
            />
          </div>
        </ParamRow>
        <ParamRow label="标题叠加" inherited={isInheritedFromGlobal('visual', 'showTitle')} onReset={() => resetToGlobal('visual', 'showTitle')}>
          <Switch checked={v.showTitle ?? true} onChange={val => updatePath('visual', { showTitle: val })} />
        </ParamRow>
        <ParamRow label="统计信息" inherited={isInheritedFromGlobal('visual', 'showStats')} onReset={() => resetToGlobal('visual', 'showStats')}>
          <Switch checked={v.showStats ?? true} onChange={val => updatePath('visual', { showStats: val })} />
        </ParamRow>
      </div>
    );
  };

  // ===== 组装 Tab 项 =====
  const tabItems = useMemo(() => [
    { key: 'camera', label: '📷 相机', children: renderCameraPanel() },
    { key: 'orbit', label: '🔄 环绕', children: renderOrbitPanel() },
    { key: 'decoration', label: '🎨 装饰', children: renderDecorationPanel() },
    { key: 'visual', label: '👁️ 视觉', children: renderVisualPanel() },
  ], [value, globalDefaults, mode]);

  return (
    <div>
      {mode === 'model' && modelName && (
        <div style={{ marginBottom: 8, padding: '4px 10px', background: '#1a1a2e', borderRadius: 6, fontSize: 12, color: '#aaa' }}>
          编辑模型: <strong style={{ color: '#fff' }}>{modelName}</strong>
          {globalDefaults && (
            <span style={{ marginLeft: 8 }}>
              🌐=继承 | ✏️=自定义(点击恢复全局)
            </span>
          )}
        </div>
      )}
      <Tabs activeKey={tab} onChange={setTab} items={tabItems} size="small" />
    </div>
  );
};

export default RenderConfigEditor;
