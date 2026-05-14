/**
 * 官网模板系统类型定义
 * Website Template System TypeScript types
 */

// ===== 导航菜单 =====

export interface NavMenuItem {
  id: string;
  parent_id: string | null;
  /** 多语言标签 {"zh": "画廊", "en": "Gallery"} */
  label: Record<string, string>;
  /** emoji 或 iconify ID */
  icon: string | null;
  /** 前端路由路径 */
  route: string;
  page_title: string | null;

  /** 模板块ID（非空 = 模板模式，空 = 遗留组件模式） */
  template_id: string | null;
  /** 遗留组件标识 */
  page_component: string | null;

  sort_order: number;
  is_visible: boolean;
  auth_required: boolean;
  config: Record<string, unknown> | null;
  children: NavMenuItem[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NavMenuListResponse {
  data: NavMenuItem[];
  total: number;
}

// ===== 模板定义 =====

export interface TemplateSection {
  id: string;
  width: 'full' | 'contained' | 'narrow';
  style?: Record<string, string>;
  /** 子元素：可直接是 slot key 或嵌套 section */
  children: string[];
  /** 网格配置（多列时） */
  grid?: { columns: number };
}

export interface LayoutConfig {
  grid?: {
    columns: number;
    gap: number;
    maxWidth: number | null;
  };
  sections: TemplateSection[];
}

export interface ThemeConfig {
  cssVariables?: Record<string, string>;
  fonts?: Record<string, string>;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  layout_type: string;
  status: string;
  version: string;
  is_default: boolean;
  layout_config: LayoutConfig;
  theme_config: ThemeConfig | null;
  meta_info: Record<string, unknown> | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  slots?: TemplateSlot[] | null;
}

export interface TemplateListResponse {
  data: WebsiteTemplate[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ===== 模板插槽 =====

export interface DataSourceConfig {
  type: 'api' | 'static' | 'context';
  endpoint?: string;
  method?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  key?: string;
}

export interface SlotComponentConfig {
  dataSource?: DataSourceConfig;
  props?: Record<string, unknown>;
  renderConfig?: Record<string, unknown>;
  filterConfig?: Record<string, unknown>;
}

export interface TemplateSlot {
  id: string;
  template_id: string;
  slot_key: string;
  component_type: string;
  sort_order: number;
  component_config: SlotComponentConfig;
  is_dynamic: boolean;
  created_at: string | null;
}

// ===== 注册组件 =====

export interface PropSchemaItem {
  key: string;
  type: 'boolean' | 'number' | 'string' | 'select' | 'color' | 'image' | 'richtext' | 'datasource' | 'renderConfig' | 'array' | 'object';
  label: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface RegisteredComponent {
  id: string;
  component_type: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  category: string;
  prop_schema: {
    props: PropSchemaItem[];
  };
  is_builtin: boolean;
  is_active: boolean;
  created_at: string | null;
}

export interface ComponentListResponse {
  data: RegisteredComponent[];
  total: number;
}

// ===== 页面上下文（渲染时传递） =====

export interface PageContext {
  route: string;
  params: Record<string, string>;
  query: Record<string, string>;
  language: string;
  user: unknown | null;
}

// ===== ARenderProps：模板组件统一 Props =====

export interface TemplateComponentProps {
  config: SlotComponentConfig;
  context: PageContext;
  templateScope?: Record<string, unknown>;
}
