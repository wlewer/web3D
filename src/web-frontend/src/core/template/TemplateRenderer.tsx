/**
 * 模板渲染引擎 - 核心组件
 *
 * LayoutEngine  - 根据 layout_config.sections 渲染页面区块结构
 * SlotRenderer  - 将插槽配置渲染为实际 React 组件
 * TemplateRenderer - 顶层入口：加载模板+slot 数据，驱动布局渲染
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import type {
  WebsiteTemplate,
  TemplateSlot,
  TemplateSection,
  SlotComponentConfig,
  PageContext,
  ThemeConfig,
} from '../../types/template';
import { fetchTemplate, fetchTemplateSlots } from '../../services/templateService';
import { hasComponent, getComponentEntry } from './ComponentRegistry';
import { ErrorBoundary } from './ErrorBoundary';
import { resolveDataSource } from './DataSourceEngine';

// ===== 简单内存缓存（避免重复 fetch 同一模板） =====

interface CacheEntry {
  template: WebsiteTemplate;
  slots: TemplateSlot[];
}

const templateCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

// ===== 主题 CSS 变量注入 =====

function applyTheme(theme: ThemeConfig | null | undefined): void {
  const root = document.documentElement;
  if (theme?.cssVariables) {
    Object.entries(theme.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}

// ===== 区块样式映射 =====

function sectionStyle(section: TemplateSection): React.CSSProperties {
  return {
    ...(section.style || {}),
    width: section.width === 'full' ? '100%' :
           section.width === 'contained' ? 'min(100%, 1200px)' :
           section.width === 'narrow' ? 'min(100%, 800px)' : '100%',
    marginLeft: section.width !== 'full' ? 'auto' : undefined,
    marginRight: section.width !== 'full' ? 'auto' : undefined,
    position: (section.style || {}).position as React.CSSProperties['position'],
  };
}

// ===== SlotRenderer - 单个插槽渲染 =====

interface SlotRendererProps {
  slots: TemplateSlot[];
  section: TemplateSection;
  context: PageContext;
  allSections: TemplateSection[];
}

const SlotRenderer: React.FC<SlotRendererProps> = React.memo(({ slots, section, context, allSections }) => {
  return (
    <>
      {section.children.map((childKey, idx) => {
        // 解析 childKey: "slot:hero-3d" -> "hero-3d"
        if (childKey.startsWith('slot:')) {
          const slotKey = childKey.slice(5);
          const slot = slots.find(s => s.slot_key === slotKey);

          if (!slot) {
            return (
              <div key={idx} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                [未配置的插槽: {slotKey}]
              </div>
            );
          }

          return (
            <SlotComponent
              key={idx}
              componentType={slot.component_type}
              config={slot.component_config}
              context={context}
            />
          );
        }

        // 嵌套 section: childKey = section ID
        const nestedSection = findNestedSection(allSections, childKey);
        if (nestedSection) {
          return (
            <div key={idx} style={sectionStyle(nestedSection)}>
              <SlotRenderer slots={slots} section={nestedSection} context={context} allSections={allSections} />
            </div>
          );
        }

        return null;
      })}
    </>
  );
});

/**
 * 在模板的全部 sections 中查找嵌套 section
 * 所有 sections 为同级数组，线性搜索 section.id 即可
 * children 数组可能同时包含 "slot:xxx" 引用和 section ID
 */
function findNestedSection(
  allSections: TemplateSection[],
  childId: string,
): TemplateSection | null {
  return allSections.find(s => s.id === childId) || null;
}

// ===== SlotComponent - 按需加载组件实例 =====

interface SlotComponentProps {
  componentType: string;
  config: SlotComponentConfig;
  context: PageContext;
}

const SlotComponent: React.FC<SlotComponentProps> = React.memo(({ componentType, config, context }) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [resolvedData, setResolvedData] = useState<unknown>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);

    // 解析数据源
    if (config.dataSource) {
      setDataLoading(true);
      resolveDataSource(config.dataSource, context)
        .then(data => {
          if (!cancelled) {
            setResolvedData(data);
            setDataLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setDataLoading(false);
        });
    }

    // 加载组件
    if (!hasComponent(componentType)) {
      setLoadError(true);
      return;
    }

    const entry = getComponentEntry(componentType);
    if (!entry) {
      setLoadError(true);
      return;
    }

    entry.loader()
      .then(mod => {
        if (!cancelled) {
          setComponent(() => mod.default);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => { cancelled = true; };
  }, [componentType, config.dataSource, context]);

  if (loadError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b6b' }}>
        组件加载失败: {componentType}
      </div>
    );
  }

  if (!Component || dataLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
        加载中...
      </div>
    );
  }

  // 将解析后的数据通过 templateScope 传递给组件
  const templateScope = {
    ...(resolvedData ? { data: resolvedData } : {}),
  };

  return <Component config={config} context={context} templateScope={templateScope} />;
});

// ===== LayoutEngine - 主布局引擎 =====

interface LayoutEngineProps {
  template: WebsiteTemplate;
  slots: TemplateSlot[];
  context: PageContext;
}

const LayoutEngine: React.FC<LayoutEngineProps> = React.memo(({ template, slots, context }) => {
  const { layout_config } = template;

  if (!layout_config?.sections || layout_config.sections.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        模板布局为空，请配置 layout_config.sections
      </div>
    );
  }

  return (
    <div
      className="template-layout"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {layout_config.sections.map((section) => (
        <div key={section.id} style={sectionStyle(section)}>
          <SlotRenderer slots={slots} section={section} context={context} allSections={layout_config.sections} />
        </div>
      ))}
    </div>
  );
});

// ===== TemplateRenderer - 顶层入口 =====

interface TemplateRendererProps {
  templateId: string;
  context: PageContext;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({ templateId, context }) => {
  const [template, setTemplate] = useState<WebsiteTemplate | null>(null);
  const [slots, setSlots] = useState<TemplateSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // 缓存读取 + fetch
  const loadTemplateData = useCallback(async (id: string) => {
    // 检查缓存
    const cached = templateCache.get(id);
    if (cached) {
      setTemplate(cached.template);
      setSlots(cached.slots);
      applyTheme(cached.template.theme_config);
      setLoading(false);
      return;
    }

    try {
      const [tpl, slotList] = await Promise.all([
        fetchTemplate(id),
        fetchTemplateSlots(id),
      ]);
      if (!mountedRef.current) return;

      // 写入缓存
      templateCache.set(id, { template: tpl, slots: slotList });
      // TTL 后自动清除
      setTimeout(() => templateCache.delete(id), CACHE_TTL);

      setTemplate(tpl);
      setSlots(slotList);
      applyTheme(tpl.theme_config);
    } catch (err: any) {
      if (!mountedRef.current) return;
      console.error('TemplateRenderer: 加载模板失败', err);
      setError(err.message || '模板加载失败');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);
    loadTemplateData(templateId);
    return () => { mountedRef.current = false; };
  }, [templateId, loadTemplateData]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
        模板加载中...
      </div>
    );
  }

  if (error || !template) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#ff6b6b' }}>
        <h3>模板加载失败</h3>
        <p>{error || '未找到模板'}</p>
      </div>
    );
  }

  return <ErrorBoundary><LayoutEngine template={template} slots={slots} context={context} /></ErrorBoundary>;
};

export { LayoutEngine, SlotRenderer };
export default TemplateRenderer;
