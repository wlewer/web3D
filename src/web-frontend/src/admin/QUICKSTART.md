# Web3D Admin - 快速开始指南

## 📋 目录结构

```
src/admin/
├── core/                    # 核心层
│   ├── providers/          # Refine Providers
│   │   ├── axios.ts        # Axios 实例配置
│   │   ├── dataProvider.ts # 数据提供者
│   │   ├── authProvider.ts # 认证提供者
│   │   ├── i18nProvider.ts # 国际化提供者
│   │   └── locales/        # 多语言资源
│   ├── config/             # 全局配置
│   │   └── theme.ts        # 主题配置
│   └── types/              # 全局类型定义
│
├── shared/                  # 共享层（待实现）
│   ├── components/         # 通用组件
│   ├── hooks/              # 自定义 Hooks
│   ├── utils/              # 工具函数
│   └── constants/          # 常量定义
│
├── modules/                 # 业务模块
│   ├── dashboard/          # 仪表盘
│   ├── auth/               # 认证模块
│   ├── user/               # 用户管理（待实现）
│   ├── model/              # 模型管理（待实现）
│   └── template/           # 模板管理（待实现）
│
├── layout/                  # 布局层
│   └── components/
│       └── AdminLayout.tsx # 主布局组件
│
├── App.tsx                  # Refine 应用入口
└── index.tsx                # 主入口文件
```

## 🚀 快速启动

### 1. 安装依赖

```bash
cd src/web-frontend
npm install
```

### 2. 配置环境变量

已创建 `.env` 文件，根据需要修改：

```env
VITE_API_BASE_URL=http://localhost:8002/api/v1
VITE_APP_NAME=Web3D Admin
VITE_DEBUG=true
```

### 3. 启动开发服务器

**启动前台应用：**
```bash
npm run dev
```

**启动管理后台：**
```bash
npm run dev:admin
```

浏览器会自动打开 `http://localhost:5173/admin/login`

### 4. 登录系统

默认测试账号：
- 用户名：`admin`
- 密码：`admin123`

> **注意**：目前登录是模拟的，需要后端 API 支持才能实现真实登录。

## 🏗️ 架构设计

### DDD 分层架构

```
┌─────────────────────────────────────┐
│       Presentation Layer            │  ← 页面组件、布局
├─────────────────────────────────────┤
│       Application Layer             │  ← 业务逻辑、Hooks
├─────────────────────────────────────┤
│       Domain Layer                  │  ← 领域模型、类型
├─────────────────────────────────────┤
│       Infrastructure Layer          │  ← API、数据库
└─────────────────────────────────────┘
```

### 核心技术栈

- **框架**: React 19 + TypeScript
- **Admin**: Refine.dev 4.x
- **UI**: Ant Design 6.x
- **路由**: React Router v6
- **状态**: React Query (TanStack Query)
- **HTTP**: Axios
- **表单**: React Hook Form（待集成）

## 📦 已实现功能

### ✅ 核心架构

- [x] Refine 集成
- [x] Data Provider（API 连接）
- [x] Auth Provider（认证系统）
- [x] i18n Provider（国际化）
- [x] 主题系统（亮色/暗色）
- [x] Axios 拦截器（请求/响应）
- [x] 错误处理机制

### ✅ 布局系统

- [x] 侧边栏菜单（可折叠）
- [x] 顶部导航栏
- [x] 用户下拉菜单
- [x] 通知徽章
- [x] 语言切换

### ✅ 页面

- [x] 登录页面
- [x] 仪表盘（统计数据 + 最近活动）
- [x] 路由守卫（未登录重定向）

## 🔧 开发指南

### 添加新模块

以"用户管理"为例：

#### 1. 创建模块目录

```bash
mkdir -p src/admin/modules/user/{types,api,components,hooks,pages}
```

#### 2. 定义类型

```typescript
// modules/user/types/index.ts
export interface IUser {
  id: string;
  username: string;
  email: string;
  // ...
}
```

#### 3. 实现 API

```typescript
// modules/user/api/index.ts
import { axiosInstance } from '@/admin/core/providers';

export const userApi = {
  getList: () => axiosInstance.get('/users'),
  getById: (id: string) => axiosInstance.get(`/users/${id}`),
  create: (data: any) => axiosInstance.post('/users', data),
  update: (id: string, data: any) => axiosInstance.put(`/users/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/users/${id}`),
};
```

#### 4. 创建列表页

```typescript
// modules/user/pages/UserList.tsx
import { useTable } from '@refinedev/antd';
import { Table } from 'antd';

export const UserList = () => {
  const { tableProps } = useTable({
    resource: 'users',
  });

  return <Table {...tableProps} rowKey="id" />;
};
```

#### 5. 注册资源

在 `App.tsx` 中添加：

```typescript
{
  name: 'users',
  list: '/users',
  create: '/users/create',
  edit: '/users/edit/:id',
  show: '/users/show/:id',
}
```

### 使用 Refine Hooks

```typescript
import { useList, useOne, useCreate, useUpdate, useDelete } from '@refinedev/core';

// 获取列表
const { data } = useList({ resource: 'users' });

// 获取单个
const { data } = useOne({ resource: 'users', id: '1' });

// 创建
const { mutate } = useCreate();
mutate({ resource: 'users', values: userData });

// 更新
const { mutate } = useUpdate();
mutate({ resource: 'users', id: '1', values: userData });

// 删除
const { mutate } = useDelete();
mutate({ resource: 'users', id: '1' });
```

### 国际化使用

```typescript
import { useTranslate } from '@refinedev/core';

const translate = useTranslate();

// 使用
<h1>{translate('user.title')}</h1>
<p>{translate('common.total', { total: 100 })}</p>
```

### 主题切换

```typescript
import { toggleTheme } from '@/admin/core/config/theme';

<button onClick={toggleTheme}>切换主题</button>
```

## 🎨 主题定制

编辑 `core/config/theme.ts`：

```typescript
export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#667eea',  // 品牌色
    borderRadius: 6,           // 圆角
    fontSize: 14,              // 字体大小
    // ...
  },
};
```

## 🌍 国际化

### 添加新语言

1. 创建语言文件：`core/providers/locales/ja-JP.ts`
2. 在 `i18nProvider.ts` 中注册：

```typescript
const translations = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,  // 新增
};
```

### 翻译键规范

```
模块.子模块.键名
例如：
- user.title
- user.createSuccess
- common.confirm
```

## 🔐 权限控制

### RBAC 角色

- `super_admin`: 超级管理员（所有权限）
- `admin`: 管理员（大部分权限）
- `editor`: 编辑者（内容管理）
- `viewer`: 查看者（只读）

### 权限检查

```typescript
import { useCan } from '@refinedev/core';

const { data: canAccess } = useCan({
  resource: 'users',
  action: 'create',
});

if (canAccess) {
  // 显示创建按钮
}
```

## 📊 性能优化

### 代码分割

```typescript
const UserList = lazy(() => import('@/admin/modules/user/pages/UserList'));
```

### 数据缓存

React Query 自动缓存，配置在 `index.tsx`：

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});
```

## 🐛 调试技巧

### 1. React Query Devtools

已集成，在开发模式下按 `Ctrl + Alt + Q` 打开。

### 2. 网络请求日志

Axios 拦截器自动记录所有请求：

```
[API Success] GET /users - 123ms
```

### 3. 错误边界

所有错误都会被捕获并显示友好提示。

## 🚢 部署

### 构建生产版本

```bash
npm run build:admin
```

输出目录：`dist/`

### Docker 部署

创建 `Dockerfile.admin`：

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:admin

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📝 下一步计划

### 短期（本周）

- [ ] 用户管理模块（CRUD）
- [ ] 模型管理模块（列表 + 审核）
- [ ] 通用表格组件（搜索 + 筛选 + 导出）
- [ ] 通用表单组件（动态验证）

### 中期（本月）

- [ ] 模板编辑器（拖拽布局）
- [ ] 3D 预览集成（Spark Viewer）
- [ ] 操作日志系统
- [ ] 权限细化（按钮级）

### 长期（季度）

- [ ] 数据分析看板
- [ ] 实时通知系统
- [ ] 移动端适配
- [ ] 单元测试覆盖

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

---

**维护者**: Web3D Team  
**最后更新**: 2026-04-19
