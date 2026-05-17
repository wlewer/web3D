/**
 * EditorToolbar - 编辑器顶部工具栏
 * Editor Toolbar
 *
 * 提供页面操作入口：
 * - 左侧：返回按钮 + 页面标题（可编辑）
 * - 中间：设备预览切换（Desktop/Tablet/Mobile）
 * - 右侧：保存状态、撤销/重做、预览、发布
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Button, Space, Input, Tooltip, Badge, Dropdown, message } from 'antd';
import {
  ArrowLeftOutlined,
  DesktopOutlined,
  TabletOutlined,
  MobileOutlined,
  UndoOutlined,
  RedoOutlined,
  EyeOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import type { ResponsiveBreakpoint } from '../types/page-schema';
import { ComponentRegistry } from '../core/ComponentRegistry';
import { axiosInstance } from '@/admin/core/providers';

/** 保存状态 */
type SaveStatus = 'saved' | 'saving' | 'unsaved';

/** EditorToolbar 组件属性 */
export interface EditorToolbarProps {
  /** 页面ID（用于保存草稿） */
  pageId?: string;
}

/**
 * EditorToolbar - 顶部工具栏
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({ pageId }) => {
  const navigate = useNavigate();

  // Store 状态
  const pageSchema = useEditorStore((s) => s.pageSchema);
  const setPageTitle = useEditorStore((s) => s.setPageTitle);
  const history = useEditorStore((s) => s.history);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const isDirty = useEditorStore((s) => s.isDirty);
  const nodes = useEditorStore((s) => s.nodes);
  const canvas = useEditorStore((s) => s.canvas);
  const setDeviceMode = useEditorStore((s) => s.setDeviceMode);

  // 编辑标题状态
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(pageSchema.title);

  // 保存状态
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    isDirty ? 'unsaved' : 'saved',
  );

  // 同步 isDirty 到 saveStatus
  React.useEffect(() => {
    if (isDirty) {
      setSaveStatus('unsaved');
    }
  }, [isDirty]);

  // 设备模式
  const deviceMode = canvas.deviceMode;

  /** 返回管理后台 */
  const handleGoBack = useCallback(() => {
    navigate('/admin/pages');
  }, [navigate]);

  /** 标题编辑确认 */
  const handleTitleConfirm = useCallback(() => {
    if (titleValue.trim()) {
      setPageTitle(titleValue.trim());
    }
    setEditingTitle(false);
  }, [titleValue, setPageTitle]);

  /** 标题双击编辑 */
  const handleTitleDoubleClick = useCallback(() => {
    setTitleValue(pageSchema.title);
    setEditingTitle(true);
  }, [pageSchema.title]);

  /** 设备模式切换 */
  const handleDeviceChange = useCallback(
    (mode: ResponsiveBreakpoint) => {
      setDeviceMode(mode);
    },
    [setDeviceMode],
  );

  /** 保存草稿 */
  const handleSaveDraft = useCallback(async () => {
    if (!pageId) return;

    setSaveStatus('saving');
    try {
      const schemaJson = {
        ...pageSchema,
        nodes: Object.fromEntries(
          Object.entries(nodes).map(([id, node]) => [id, { ...node }]),
        ),
      };

      await axiosInstance.put(`/pages/${pageId}/draft`, {
        schema_json: JSON.stringify(schemaJson),
      });

      setSaveStatus('saved');
      message.success('草稿已保存');
    } catch (error) {
      console.error('保存草稿失败:', error);
      setSaveStatus('unsaved');
      message.error('保存失败');
    }
  }, [pageId, pageSchema, nodes]);

  /** 预览页面 */
  const handlePreview = useCallback(() => {
    if (!pageId) return;
    const url = `/preview/${pageId}`;
    window.open(url, '_blank');
  }, [pageId]);

  /** 发布页面 */
  const handlePublish = useCallback(async () => {
    if (!pageId) return;

    try {
      await axiosInstance.post(`/pages/${pageId}/publish`);
      message.success('页面已发布');
    } catch (error) {
      console.error('发布失败:', error);
      message.error('发布失败');
    }
  }, [pageId]);

  // 保存状态显示
  const saveStatusDisplay = useMemo(() => {
    switch (saveStatus) {
      case 'saved':
        return (
          <Tooltip title="已保存">
            <Space size={4} style={{ color: '#52c41a', fontSize: 12 }}>
              <CloudOutlined />
              <span>已保存</span>
            </Space>
          </Tooltip>
        );
      case 'saving':
        return (
          <Tooltip title="保存中...">
            <Space size={4} style={{ color: '#1890ff', fontSize: 12 }}>
              <CloudUploadOutlined spin />
              <span>保存中...</span>
            </Space>
          </Tooltip>
        );
      case 'unsaved':
        return (
          <Tooltip title="有未保存的变更">
            <Space size={4} style={{ color: '#ff4d4f', fontSize: 12 }}>
              <Badge status="error" />
              <span>未保存</span>
            </Space>
          </Tooltip>
        );
    }
  }, [saveStatus]);

  return (
    <div
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0,
      }}
    >
      {/* 左侧：返回 + 标题 */}
      <Space size={12}>
        <Tooltip title="返回页面管理">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleGoBack}
            style={{ padding: '4px 8px' }}
          />
        </Tooltip>

        <div style={{ width: 1, height: 20, backgroundColor: '#f0f0f0' }} />

        {editingTitle ? (
          <Input
            size="small"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onPressEnter={handleTitleConfirm}
            onBlur={handleTitleConfirm}
            autoFocus
            style={{ width: 200 }}
          />
        ) : (
          <span
            onDoubleClick={handleTitleDoubleClick}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#262626',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            title="双击编辑标题"
          >
            {pageSchema.title}
          </span>
        )}
      </Space>

      {/* 中间：设备预览切换 */}
      <Space size={4}>
        <Tooltip title="桌面端">
          <Button
            type={deviceMode === 'desktop' ? 'primary' : 'text'}
            icon={<DesktopOutlined />}
            onClick={() => handleDeviceChange('desktop')}
            size="small"
          />
        </Tooltip>
        <Tooltip title="平板端">
          <Button
            type={deviceMode === 'tablet' ? 'primary' : 'text'}
            icon={<TabletOutlined />}
            onClick={() => handleDeviceChange('tablet')}
            size="small"
          />
        </Tooltip>
        <Tooltip title="移动端">
          <Button
            type={deviceMode === 'mobile' ? 'primary' : 'text'}
            icon={<MobileOutlined />}
            onClick={() => handleDeviceChange('mobile')}
            size="small"
          />
        </Tooltip>
      </Space>

      {/* 右侧：保存状态 + 撤销/重做 + 预览 + 发布 */}
      <Space size={12}>
        {saveStatusDisplay}

        <div style={{ width: 1, height: 20, backgroundColor: '#f0f0f0' }} />

        <Space size={4}>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button
              type="text"
              icon={<UndoOutlined />}
              onClick={undo}
              disabled={!history.canUndo}
              size="small"
            />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Shift+Z)">
            <Button
              type="text"
              icon={<RedoOutlined />}
              onClick={redo}
              disabled={!history.canRedo}
              size="small"
            />
          </Tooltip>
        </Space>

        <div style={{ width: 1, height: 20, backgroundColor: '#f0f0f0' }} />

        <Tooltip title="保存草稿">
          <Button
            type="text"
            icon={<SaveOutlined />}
            onClick={handleSaveDraft}
            size="small"
          >
            保存
          </Button>
        </Tooltip>

        <Tooltip title="在新窗口预览">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={handlePreview}
            size="small"
          >
            预览
          </Button>
        </Tooltip>

        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handlePublish}
          size="small"
        >
          发布
        </Button>
      </Space>
    </div>
  );
};

EditorToolbar.displayName = 'EditorToolbar';

export default EditorToolbar;
