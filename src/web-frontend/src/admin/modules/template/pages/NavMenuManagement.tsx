/**
 * 导航菜单管理页面
 * NavMenu Management Page - Admin UI
 */
import React, { useState, useEffect, useCallback } from 'react';
import UnifiedTable from '@/admin/components/UnifiedTable';
import {
  Button, Space, Tag, Switch, Input, InputNumber, Modal, message,
  Popconfirm, Card, Tooltip, Select, Form, Drawer,
  type TableColumnsType,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { axiosInstance } from '@/admin/core/providers';

// ===== 类型 =====

interface NavMenuItem {
  id: string;
  parent_id: string | null;
  label: Record<string, string>;
  icon: string | null;
  route: string;
  page_title: string | null;
  template_id: string | null;
  page_component: string | null;
  sort_order: number;
  is_visible: boolean;
  auth_required: boolean;
  config: Record<string, unknown> | null;
  children: NavMenuItem[] | null;
  created_at: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
}

const PAGE_COMPONENT_OPTIONS = [
  { value: 'home', label: '首页 (HomePage)' },
  { value: 'gallery', label: '画廊 (GalleryPage)' },
  { value: 'workshop', label: '3D车间 (Workshop3D)' },
  { value: 'auth', label: '登录 (AuthPage)' },
  { value: 'upload', label: '上传 (UploadPage)' },
  { value: 'spark-editor', label: 'Spark编辑器' },
  { value: 'book', label: '图书查看器' },
  { value: 'book-gallery', label: '图书画廊' },
  { value: 'week2-components-test', label: '组件测试' },
];

export const NavMenuManagement: React.FC = () => {
  const [menus, setMenus] = useState<NavMenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<NavMenuItem | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [form] = Form.useForm();

  // 获取列表
  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await axiosInstance.get('/api/v1/nav-menus/flat', { params: { include_hidden: true } });
      setMenus(resp.data.data || []);
    } catch (err: any) {
      message.error('获取菜单列表失败: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取模板选项
  const fetchTemplates = useCallback(async () => {
    try {
      const resp = await axiosInstance.get('/api/v1/website-templates', { params: { status: 'published', page_size: 100 } });
      setTemplates((resp.data.data || []).map((t: any) => ({ id: t.id, name: t.name })));
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => { fetchMenus(); fetchTemplates(); }, [fetchMenus, fetchTemplates]);

  // 打开编辑抽屉
  const openEdit = (menu: NavMenuItem | null) => {
    setEditingMenu(menu);
    if (menu) {
      form.setFieldsValue({
        label_zh: menu.label?.zh || '',
        label_en: menu.label?.en || '',
        icon: menu.icon || '',
        route: menu.route,
        page_title: menu.page_title || '',
        template_id: menu.template_id || undefined,
        page_component: menu.page_component || undefined,
        sort_order: menu.sort_order,
        is_visible: menu.is_visible,
        auth_required: menu.auth_required,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ sort_order: 0, is_visible: true, auth_required: false });
    }
    setDrawerOpen(true);
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        label: { zh: values.label_zh, en: values.label_en },
        icon: values.icon || null,
        route: values.route,
        page_title: values.page_title || null,
        template_id: values.template_id || null,
        page_component: values.page_component || null,
        sort_order: values.sort_order,
        is_visible: values.is_visible,
        auth_required: values.auth_required,
      };

      if (editingMenu) {
        await axiosInstance.put(`/api/v1/nav-menus/${editingMenu.id}`, payload);
        message.success('菜单已更新');
      } else {
        await axiosInstance.post('/api/v1/nav-menus', payload);
        message.success('菜单已创建');
      }
      setDrawerOpen(false);
      fetchMenus();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单验证错误
      message.error('保存失败: ' + (err?.message || ''));
    }
  };

  // 一键切换到模板模式（清除 page_component）
  const switchToTemplateMode = async (menu: NavMenuItem) => {
    try {
      await axiosInstance.put(`/api/v1/nav-menus/${menu.id}`, { page_component: null });
      message.success(`「${menu.label?.zh || menu.route}」已切换到模板模式`);
      fetchMenus();
    } catch (err: any) {
      message.error('切换失败: ' + (err?.message || ''));
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/api/v1/nav-menus/${id}`);
      message.success('菜单已删除');
      fetchMenus();
    } catch (err: any) {
      message.error('删除失败: ' + (err?.message || ''));
    }
  };

  // 切换可见性
  const toggleVisibility = async (menu: NavMenuItem) => {
    try {
      await axiosInstance.put(`/api/v1/nav-menus/${menu.id}`, { is_visible: !menu.is_visible });
      message.success(`菜单已${menu.is_visible ? '隐藏' : '显示'}`);
      fetchMenus();
    } catch (err: any) {
      message.error('操作失败: ' + (err?.message || ''));
    }
  };

  // 列定义
  const columns: TableColumnsType<NavMenuItem> = [
    {
      title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 70,
    },
    {
      title: '显示名称', key: 'label', width: 180,
      render: (_, record) => (
        <Space>
          {record.icon && <span>{record.icon}</span>}
          <span>{record.label?.zh || record.label?.en || '-'}</span>
        </Space>
      ),
    },
    {
      title: '路由', dataIndex: 'route', key: 'route', width: 180,
      render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    {
      title: '页面组件', dataIndex: 'page_component', key: 'page_component', width: 130,
      render: (v: string | null) => v ? <Tag color="blue">{v}</Tag> : <Tag color="default">模板模式</Tag>,
    },
    {
      title: '模板绑定', dataIndex: 'template_id', key: 'template_id', width: 150,
      render: (v: string | null) => {
        if (!v) return <Tag>未绑定</Tag>;
        const tpl = templates.find(t => t.id === v);
        return <Tag color="purple">{tpl?.name || v.slice(0, 8)}</Tag>;
      },
    },
    {
      title: '可见', dataIndex: 'is_visible', key: 'is_visible', width: 70,
      render: (v: boolean, record) => (
        <Switch size="small" checked={v} onChange={() => toggleVisibility(record)} />
      ),
    },
    {
      title: '需登录', dataIndex: 'auth_required', key: 'auth_required', width: 80,
      render: (v: boolean) => v ? <Tag color="orange">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 220, fixed: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>
          {record.page_component && record.template_id ? (
            <Popconfirm
              title={`确定将「${record.label?.zh || record.route}」切换到模板模式？`}
              description="切换后页面将使用模板引擎渲染，遗留组件将被移除"
              onConfirm={() => switchToTemplateMode(record)}
            >
              <Tooltip title="切换到模板模式"><Button size="small" type="primary" ghost>模板</Button></Tooltip>
            </Popconfirm>
          ) : null}
          <Popconfirm title="确定删除此菜单？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Space><MenuOutlined /> 导航菜单管理</Space>}
      extra={
        <Space>
          <Tooltip title="刷新"><Button icon={<ReloadOutlined />} onClick={fetchMenus} /></Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>新增菜单</Button>
        </Space>
      }
    >
      <UnifiedTable
        storageKey="admin_nav_menu_list"
        columns={columns}
        dataSource={menus}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={false}
      />

      <Drawer
        title={editingMenu ? '编辑导航菜单' : '新增导航菜单'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={500}
        extra={
          <Button type="primary" onClick={handleSave}>保存</Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="label_zh" label="中文名称" rules={[{ required: true, message: '请输入中文名称' }]}>
            <Input placeholder="如：画廊" />
          </Form.Item>
          <Form.Item name="label_en" label="英文名称" rules={[{ required: true, message: '请输入英文名称' }]}>
            <Input placeholder="如：Gallery" />
          </Form.Item>
          <Form.Item name="icon" label="图标" tooltip="支持 emoji，如 🏭">
            <Input placeholder="如：🏭" maxLength={10} />
          </Form.Item>
          <Form.Item name="route" label="路由路径" rules={[{ required: true, message: '请输入路由' }]}>
            <Input placeholder="如：/gallery" />
          </Form.Item>
          <Form.Item name="page_title" label="页面标题">
            <Input placeholder="浏览器标签页标题" />
          </Form.Item>
          <Form.Item name="template_id" label="绑定模板" tooltip="绑定后使用模板渲染模式">
            <Select
              allowClear
              placeholder="留空 = 使用遗留组件模式"
              options={templates.map(t => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
          <Form.Item name="page_component" label="遗留页面组件" tooltip="未绑定模板时生效">
            <Select
              allowClear
              placeholder="选择已有页面组件"
              options={PAGE_COMPONENT_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" tooltip="数字越小越靠前">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_visible" label="可见" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="auth_required" label="需要登录" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  );
};

export default NavMenuManagement;
