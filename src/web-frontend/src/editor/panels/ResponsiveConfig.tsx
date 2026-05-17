/**
 * ResponsiveConfig - 响应式配置
 * Responsive Configuration
 *
 * 设备切换标签（Desktop/Tablet/Mobile），
 * 当前设备独立样式覆盖，继承/覆盖指示器。
 * 与 editorStore 的 deviceMode 联动。
 */
import React, { useCallback } from 'react';
import { Tabs, Badge, Space, Tooltip } from 'antd';
import { DesktopOutlined, TabletOutlined, MobileOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useEditorStore } from '../store/editorStore';
import type { ResponsiveBreakpoint } from '../types/page-schema';

/** 设备标签配置 */
interface DeviceTab {
  key: ResponsiveBreakpoint;
  label: string;
  icon: React.ReactNode;
  width: number;
}

const DEVICE_TABS: DeviceTab[] = [
  { key: 'desktop', label: '桌面端', icon: <DesktopOutlined />, width: 1440 },
  { key: 'tablet', label: '平板端', icon: <TabletOutlined />, width: 768 },
  { key: 'mobile', label: '移动端', icon: <MobileOutlined />, width: 375 },
];

/** ResponsiveConfig 组件属性 */
export interface ResponsiveConfigProps {
  /** 当前节点ID */
  nodeId: string;
  /** 当前节点在各断点下是否有样式覆盖 */
  hasOverrides?: Record<ResponsiveBreakpoint, boolean>;
  /** 样式类名 */
  className?: string;
}

/**
 * ResponsiveConfig - 响应式配置面板
 *
 * 切换设备预览模式，显示当前节点在各断点下的样式覆盖状态。
 */
export const ResponsiveConfig: React.FC<ResponsiveConfigProps> = ({
  nodeId,
  hasOverrides,
  className,
}) => {
  const deviceMode = useEditorStore((state) => state.canvas.deviceMode);
  const setDeviceMode = useEditorStore((state) => state.setDeviceMode);
  const nodes = useEditorStore((state) => state.nodes);

  const node = nodes[nodeId];

  // 计算各断点是否有样式覆盖
  const overrideStatus = React.useMemo(() => {
    if (hasOverrides) return hasOverrides;
    if (!node) return { desktop: false, tablet: false, mobile: false };

    return {
      desktop: !!node.responsiveStyles?.desktop && Object.keys(node.responsiveStyles.desktop).length > 0,
      tablet: !!node.responsiveStyles?.tablet && Object.keys(node.responsiveStyles.tablet).length > 0,
      mobile: !!node.responsiveStyles?.mobile && Object.keys(node.responsiveStyles.mobile).length > 0,
    };
  }, [hasOverrides, node]);

  const handleDeviceChange = useCallback(
    (key: string) => {
      setDeviceMode(key as ResponsiveBreakpoint);
    },
    [setDeviceMode],
  );

  return (
    <div className={className} style={{ padding: '12px 16px' }}>
      <Tabs
        activeKey={deviceMode}
        onChange={handleDeviceChange}
        size="small"
        style={{ marginBottom: 16 }}
        items={DEVICE_TABS.map((tab) => ({
          key: tab.key,
          label: (
            <Tooltip title={`${tab.label} (${tab.width}px)`}>
              <Space size={4}>
                {tab.icon}
                <span>{tab.label}</span>
                {overrideStatus[tab.key] && (
                  <Badge
                    dot
                    color="#1677ff"
                  />
                )}
              </Space>
            </Tooltip>
          ),
        }))}
      />

      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 6,
          fontSize: 12,
          color: '#52c41a',
        }}
      >
        <Space>
          <CheckCircleOutlined />
          <span>
            当前编辑：<strong>{DEVICE_TABS.find((d) => d.key === deviceMode)?.label}</strong>
            {deviceMode !== 'desktop' && (
              <span style={{ color: '#8c8c8c', marginLeft: 8 }}>
                未设置的样式将继承桌面端配置
              </span>
            )}
          </span>
        </Space>
      </div>

      {/* 覆盖状态指示器 */}
      <div style={{ marginTop: 12 }}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {DEVICE_TABS.map((tab) => {
            const hasOverride = overrideStatus[tab.key];
            return (
              <div
                key={tab.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: deviceMode === tab.key ? '#e6f4ff' : 'transparent',
                }}
              >
                <Space size={8}>
                  {tab.icon}
                  <span style={{ fontSize: 12 }}>{tab.label}</span>
                </Space>
                {hasOverride ? (
                  <Badge
                    count="已覆盖"
                    style={{
                      backgroundColor: '#1677ff',
                      fontSize: 10,
                      fontWeight: 500,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 11, color: '#bfbfbf' }}>继承</span>
                )}
              </div>
            );
          })}
        </Space>
      </div>
    </div>
  );
};

ResponsiveConfig.displayName = 'ResponsiveConfig';
