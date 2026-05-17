/**
 * EditorApp - 搭建器主页面
 * Editor Application
 *
 * 三栏布局的搭建器编辑器主界面：
 * - 左侧 280px：组件面板 + 层级树
 * - 中间：工具栏 + 画布
 * - 右侧 320px：属性面板
 *
 * 功能：
 * - 初始化 ComponentRegistry + 注册内置插件
 * - 从 API 加载页面数据
 * - 自动保存（debounce 3s）
 * - 集成 KeyboardShortcuts
 */
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Spin, Result, Button } from 'antd';

// 面板组件
import { ComponentPanel } from './panels/ComponentPanel';
import { PropertyPanel } from './panels/PropertyPanel';

// 画布组件
import { EditorCanvas } from './canvas/EditorCanvas';
import { useKeyboardShortcuts } from './canvas/KeyboardShortcuts';

// 工具栏与层级树
import { EditorToolbar } from './components/EditorToolbar';
import { PageTreePanel } from './components/PageTreePanel';

// 核心
import { ComponentRegistry } from './core/ComponentRegistry';
import { registerBuiltinPlugins } from './plugins/registry';
import { EventBus } from './core/EventBus';

// 状态
import { useEditorStore } from './store/editorStore';
import type { PageSchema, ComponentNode } from './types/page-schema';

// API
import { axiosInstance } from '@/admin/core/providers';

/** 自动保存间隔（ms） */
const AUTO_SAVE_DELAY = 3000;

/**
 * EditorApp - 搭建器主页面
 */
export const EditorApp: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  // Store 操作
  const loadPage = useEditorStore((s) => s.loadPage);
  const resetEditor = useEditorStore((s) => s.resetEditor);
  const isDirty = useEditorStore((s) => s.isDirty);
  const pageSchema = useEditorStore((s) => s.pageSchema);
  const nodes = useEditorStore((s) => s.nodes);

  // 加载状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 自动保存定时器
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 快捷键
  useKeyboardShortcuts();

  // ===== 初始化：注册插件（只执行一次） =====
  useEffect(() => {
    const registry = ComponentRegistry.getInstance();

    // 仅在注册表为空时注册（避免重复）
    if (registry.size === 0) {
      const results = registerBuiltinPlugins(registry);
      console.log(
        `[EditorApp] 注册内置插件: ${results.filter(Boolean).length}/${results.length} 成功`,
      );
    }

    return () => {
      // 编辑器卸载时重置状态
      resetEditor();
    };
  }, [resetEditor]);

  // ===== 加载页面数据 =====
  useEffect(() => {
    if (!pageId) {
      setError('缺少页面ID参数');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get(`/pages/${pageId}`);
        const pageData = response.data;

        if (cancelled) return;

        // 解析 schema_json
        let schema: PageSchema;
        let nodeMap: Record<string, ComponentNode>;

        if (pageData.schema_json) {
          try {
            const parsed = JSON.parse(pageData.schema_json);
            schema = {
              id: parsed.id || pageData.id,
              title: parsed.title || pageData.title || '未命名页面',
              slug: parsed.slug || pageData.slug || 'untitled',
              version: parsed.version || '1.0.0',
              rootNodeId: parsed.rootNodeId || 'root',
              metadata: parsed.metadata || {},
            };
            nodeMap = parsed.nodes || { root: createDefaultRootNode() };
          } catch {
            // JSON 解析失败，使用默认值
            schema = {
              id: pageData.id,
              title: pageData.title || '未命名页面',
              slug: pageData.slug || 'untitled',
              version: '1.0.0',
              rootNodeId: 'root',
              metadata: {},
            };
            nodeMap = { root: createDefaultRootNode() };
          }
        } else {
          // 没有 schema_json，使用默认空页面
          schema = {
            id: pageData.id,
            title: pageData.title || '未命名页面',
            slug: pageData.slug || 'untitled',
            version: '1.0.0',
            rootNodeId: 'root',
            metadata: {},
          };
          nodeMap = { root: createDefaultRootNode() };
        }

        loadPage(schema, nodeMap);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('[EditorApp] 加载页面失败:', err);
        setError('加载页面失败，请检查网络连接或页面ID是否正确');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPage();

    return () => {
      cancelled = true;
    };
  }, [pageId, loadPage]);

  // ===== 自动保存（debounce 3s） =====
  useEffect(() => {
    if (!isDirty || !pageId) return;

    // 清除上一次定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const schemaJson = {
          ...pageSchema,
          nodes: Object.fromEntries(
            Object.entries(nodes).map(([id, node]) => [id, { ...(node as object) }]),
          ),
        };

        await axiosInstance.put(`/pages/${pageId}/draft`, {
          schema_json: JSON.stringify(schemaJson),
        });

        const eventBus = EventBus.getInstance();
        eventBus.emit('page:saved', { pageId });
      } catch (err) {
        console.error('[EditorApp] 自动保存失败:', err);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, pageId, pageSchema, nodes]);

  // ===== 加载状态 =====
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Spin size="large" tip="正在加载页面..." />
      </div>
    );
  }

  // ===== 错误状态 =====
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Result
          status="error"
          title="加载失败"
          subTitle={error}
          extra={[
            <Button key="retry" type="primary" onClick={() => window.location.reload()}>
              重试
            </Button>,
            <Button key="back" onClick={() => navigate('/admin/pages')}>
              返回列表
            </Button>,
          ]}
        />
      </div>
    );
  }

  // ===== 编辑器三栏布局 =====
  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#f1f5f9',
        }}
      >
        {/* 左侧面板：组件面板 + 层级树 */}
        <div
          style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            borderRight: '1px solid #f0f0f0',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* 组件面板 */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ComponentPanel />
          </div>

          {/* 层级树 */}
          <PageTreePanel />
        </div>

        {/* 中间区域：工具栏 + 画布 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <EditorToolbar pageId={pageId} />
          <EditorCanvas />
        </div>

        {/* 右侧属性面板 */}
        <PropertyPanel />
      </div>
    </DndProvider>
  );
};

/** 创建默认根节点 */
function createDefaultRootNode(): ComponentNode {
  return {
    id: 'root',
    type: 'page-root',
    props: {},
    styles: {},
    children: [],
    parentId: null,
    locked: false,
    hidden: false,
    responsiveStyles: {},
  };
}

EditorApp.displayName = 'EditorApp';

export default EditorApp;
