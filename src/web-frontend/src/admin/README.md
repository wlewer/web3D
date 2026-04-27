# Web3D Admin - 后台管理系统架构说明

## 架构设计理念

### 1. DDD（领域驱动设计）分层架构

```
admin/
├── core/                    # 核心层 - 不依赖任何业务逻辑
│   ├── providers/          # Refine Providers (Auth, Data, i18n, AccessControl)
│   ├── config/             # 全局配置
│   └── types/              # 全局类型定义
│
├── shared/                  # 共享层 - 跨模块复用
│   ├── components/         # 通用组件
│   ├── hooks/              # 自定义 Hooks
│   ├── utils/              # 工具函数
│   └── constants/          # 常量定义
│
├── modules/                 # 业务模块层 - 按领域划分
│   ├── user/               # 用户管理模块
│   │   ├── types/          # 领域类型
│   │   ├── api/            # API 调用
│   │   ├── components/     # 模块内组件
│   │   ├── hooks/          # 模块内 Hooks
│   │   └── pages/          # 页面组件
│   │
│   ├── model/              # 模型管理模块
│   │   ├── types/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   │
│   └── template/           # 模板管理模块
│       ├── types/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       └── pages/
│
├── layout/                  # 布局层
│   ├── components/         # 布局组件
│   └── index.tsx           # 主布局
│
└── App.tsx                  # 应用入口
```

### 2. 设计原则

- **单一职责**: 每个模块只负责一个业务领域
- **依赖倒置**: 高层模块不依赖低层模块，都依赖抽象
- **开闭原则**: 对扩展开放，对修改关闭
- **接口隔离**: 细粒度的接口优于粗粒度接口

### 3. 技术栈

- **核心框架**: React 19 + TypeScript
- **Admin 框架**: Refine.dev 4.x
- **UI 组件库**: Ant Design 6.x
- **状态管理**: React Query (TanStack Query)
- **路由**: React Router v6
- **表单处理**: React Hook Form + Zod
- **HTTP 客户端**: Axios

### 4. 关键特性

✅ **权限控制**: RBAC 基于角色的访问控制  
✅ **国际化**: i18n 多语言支持  
✅ **主题系统**: Ant Design Token 定制 + 暗黑模式  
✅ **数据缓存**: React Query 智能缓存  
✅ **代码分割**: 懒加载 + 动态导入  
✅ **错误边界**: 全局错误处理  
✅ **响应式设计**: 适配桌面端和移动端  

## 开发规范

### 命名规范

- **文件**: kebab-case (user-list.tsx)
- **组件**: PascalCase (UserList)
- **函数/变量**: camelCase (getUserList)
- **常量**: UPPER_SNAKE_CASE (API_BASE_URL)
- **类型/接口**: PascalCase (IUser, UserDTO)

### 目录规范

- 每个模块必须有 `index.ts` 统一导出
- 类型定义放在 `types/` 目录
- API 调用放在 `api/` 目录
- 组件按功能分组

### 代码质量

- 使用 ESLint + Prettier 保证代码风格
- 所有组件必须有 TypeScript 类型
- 复杂逻辑必须编写单元测试
- 提交前运行 `npm run lint`

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev:admin

# 构建生产版本
npm run build:admin
```

## 模块开发指南

### 创建新模块

1. 在 `modules/` 下创建模块目录
2. 定义类型 (`types/index.ts`)
3. 实现 API 调用 (`api/index.ts`)
4. 创建页面组件 (`pages/`)
5. 在 `App.tsx` 中注册资源

### 示例：用户模块

```typescript
// modules/user/types/index.ts
export interface IUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
}

// modules/user/api/index.ts
export const userApi = {
  getList: () => axios.get('/users'),
  getById: (id: string) => axios.get(`/users/${id}`),
  create: (data: IUser) => axios.post('/users', data),
  update: (id: string, data: Partial<IUser>) => axios.put(`/users/${id}`, data),
  delete: (id: string) => axios.delete(`/users/${id}`),
};

// modules/user/pages/list.tsx
export const UserList = () => {
  const { data } = useList({ resource: 'users' });
  return <Table dataSource={data?.data} />;
};
```

## 性能优化

### 1. 代码分割

```typescript
const UserList = lazy(() => import('@/admin/modules/user/pages/list'));
```

### 2. 数据缓存

```typescript
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000, // 5分钟
});
```

### 3. 虚拟滚动

大数据量表格使用 Ant Design Table 的虚拟滚动：

```typescript
<Table virtual scroll={{ y: 600 }} />
```

## 部署

### Docker 多阶段构建

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:admin

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist/admin /usr/share/nginx/html/admin
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 监控与日志

- 集成 Sentry 错误追踪
- 使用 React Query Devtools 调试数据流
- 记录关键操作日志

## 安全最佳实践

✅ JWT Token 存储在 HttpOnly Cookie  
✅ 所有 API 请求携带 CSRF Token  
✅ 敏感操作需要二次确认  
✅ 输入验证防止 XSS/SQL 注入  
✅ HTTPS 强制启用  

---

**维护者**: Web3D Team  
**最后更新**: 2026-04-19
