/**
 * 模板渲染引擎 - 核心组件
 *
 * LayoutEngine  - 根据 layout_config.sections 渲染页面区块结构
 * SlotRenderer  - 将插槽配置渲染为实际 React 组件
 * TemplateRenderer - 顶层入口：加载模板+slot 数据，驱动布局渲染
 */
import React, { useEffect, useState } from 'react';
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
}

const SlotRenderer: React.FC<SlotRendererProps> = React.memo(({ slots, section, context }) => {
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
        const nestedSection = findNestedSection(section, childKey);
        if (nestedSection) {
          return (
            <div key={idx} style={sectionStyle(nestedSection)}>
              <SlotRenderer slots={slots} section={nestedSection} context={context} />
            </div>
          );
        }

        return null;
      })}
    </>
  );
});

/**
 * 在模板的全部 sections 中查找嵌套 section（简单实现：仅在同级查找）
 */
function findNestedSection(
  parentSection: TemplateSection,
  childId: string,
): TemplateSection | null {
  // 简单实现：忽略跨层级嵌套，仅支持 slot: 引用
  return null;
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

  useEffect(() => {
    let cancelled = false;

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
  }, [componentType]);

  if (loadError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b6b' }}>
        组件加载失败: {componentType}
      </div>
    );
  }

  if (!Component) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
        加载中...
      </div>
    );
  }

  return <Component config={config} context={context} />;
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
          <SlotRenderer slots={slots} section={section} context={context} />
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchTemplate(templateId),
      fetchTemplateSlots(templateId),
    ])
      .then(([tpl, slotList]) => {
        if (!cancelled) {
          setTemplate(tpl);
          setSlots(slotList);
          applyTheme(tpl.theme_config);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('TemplateRenderer: 加载模板失败', err);
          setError(err.message || '模板加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [templateId]);

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

  return <LayoutEngine template={template} slots={slots} context={context} />;
};

export { LayoutEngine, SlotRenderer };
export default TemplateRenderer;
