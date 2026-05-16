# Web3D 平台 - 3D 模型生成与管理平台

## 📋 项目简介

Web3D 是一个全栈 3D 模型生成与管理平台，集成多种 AI 3D 生成引擎，提供从模型生成、展示、管理到官网模板引擎的一站式解决方案。支持 **图生 3D 模型**、**3D 模型画廊展示**、**后台统一管控** 等核心功能。

---

## ✨ 核心功能

### 🎨 3D 渲染与展示
| 功能 | 说明 |
|:---|:---|
| **SPZ 渐进式渲染** | 支持 3D Gaussian Splatting SPZ 格式，边下载边渲染，首帧极速呈现 |
| **多格式兼容** | 支持 glTF/GLB / SPZ / STL 等多种 3D 格式 |
| **智能居中引擎** | 自动计算模型包围盒，自适应相机距离，无需手动调参 |
| **5 种环绕模式** | 自动环绕、手动拖拽、缩放、平移、预设视角切换 |
| **产品标签系统** | 3D 场景内标签标注，后台可配置标签数量与内容 |

### 🤖 AI 3D 生成引擎
| 引擎 | 模式 | 状态 |
|:---|:---|:---|
| **腾讯混元 3D** | 云端 API（标准版/专业版/极速版） | ✅ 生产可用 |
| **TripoSR** | CPU 程序化生成 / GPU 推理 | ⚠️ CPU 降级可用 |
| **ImageToSTL** | CPU 图片浮雕生成 | ✅ 可用 |
| **SF3D** | GPU 模式（Mock 就绪） | 🚧 待部署 |
| **InstantMesh** | GPU 模式（Mock 就绪） | 🚧 待部署 |

### 🏗️ 官网模板引擎
| 功能 | 说明 |
|:---|:---|
| **页面模板系统** | 可视化编辑页面布局，支持全页/区块/组件三种模板类型 |
| **Slot 插槽机制** | 每个模板内含多个插槽，可独立配置组件类型和参数 |
| **导航菜单管理** | 树形菜单编辑，支持多级菜单、绑定模板、批量排序 |
| **组件注册表** | 内置 9 个注册组件，支持动态加载和懒加载 |
| **双模渲染** | 模板模式（动态渲染）与遗留组件模式（硬编码页面）无缝切换 |

### 🛠️ 后台管理系统
| 模块 | 功能 |
|:---|:---|
| **仪表盘** | 系统状态概览，统计数据 |
| **模型管理** | 模型列表、上传、编辑、删除、状态控制 |
| **模板管理** | 模板 CRUD、插槽管理、发布/归档 |
| **导航菜单** | 菜单树编辑、模板绑定、排序、可见性控制 |
| **用户管理** | 用户列表、角色分配、状态管理 |
| **AI 生成** | 多引擎生成、任务队列、历史记录 |
| **系统设置** | 运行模式切换、额度配置、API 密钥管理 |

### 🌐 前台页面
| 页面 | 说明 |
|:---|:---|
| **首页** | 3D 模型轮播展示，Hero 区域，功能入口 |
| **模型画廊** | 模型卡片网格展示，分类筛选，搜索 |
| **3D 车间** | 沉浸式 3D 场景展示 |
| **模型上传** | 文件上传与 AI 3D 生成入口 |
| **用户登录** | JWT 认证登录 |
| **图书查看器/画廊** | 电子书阅读体验 |
| **Spark 编辑器** | 3D 场景在线编辑 |

---

## 🏗️ 技术栈

### 前端技术栈

| 层级 | 技术选型 |
|:---|:---|
| **框架** | React 18 + TypeScript 6 + Vite 8 |
| **UI 组件** | Ant Design 5 + @ant-design/icons |
| **3D 渲染** | Three.js (0.180) + threepipe + @react-three/fiber + @react-three/drei |
| **3DGS 渲染** | PlayCanvas + SuperSplat + @playcanvas/splat-transform |
| **后台框架** | Refine (4.x) + @refinedev/antd |
| **状态管理** | Zustand 5 |
| **动画引擎** | @tweenjs/tween.js |
| **HTTP 请求** | Axios |
| **路由** | react-router-dom v7 |
| **数据获取** | @tanstack/react-query |
| **国际化** | 内置中英文 i18n |

### 后端技术栈

| 层级 | 技术选型 |
|:---|:---|
| **Web 框架** | FastAPI (0.109) |
| **ASGI 服务器** | Uvicorn (0.27) |
| **ORM** | SQLAlchemy 2.0 (异步) |
| **数据库** | SQLite (开发) / PostgreSQL (生产) |
| **数据库迁移** | Alembic |
| **认证** | JWT (python-jose) + bcrypt (passlib) |
| **数据验证** | Pydantic 2 + pydantic-settings |
| **云 SDK** | 腾讯云官方 SDK (tencentcloud-sdk-python) |
| **日志** | Loguru |
| **3D 处理** | Trimesh + numpy + Pillow + OpenCV |

---

## 📁 项目结构

```
web3D/
├── backend/                          # Python 后端
│   ├── app/
│   │   ├── api/v1/                   # API 路由
│   │   │   ├── auth.py               # 认证接口
│   │   │   ├── users.py              # 用户管理
│   │   │   ├── models.py             # 3D 模型 CRUD
│   │   │   ├── website.py            # 官网模板系统
│   │   │   ├── generation.py         # AI 3D 生成
│   │   │   ├── templates.py          # 渲染模板
│   │   │   ├── experimental.py       # 实验性功能
│   │   │   ├── settings.py           # 系统设置
│   │   │   └── quota.py              # 额度管理
│   │   ├── models/                   # SQLAlchemy 模型
│   │   ├── schemas/                  # Pydantic 数据模式
│   │   ├── services/                 # 业务逻辑层
│   │   │   └── generation/           # AI 生成服务
│   │   ├── core/                     # 核心工具
│   │   │   └── security.py           # JWT + 密码
│   │   ├── config.py                 # 配置管理
│   │   ├── database.py               # 数据库连接
│   │   ├── dependencies.py           # 依赖注入
│   │   └── main.py                   # 应用入口
│   ├── database/                     # 数据库迁移
│   ├── uploads/                      # 上传文件
│   ├── static/                       # 静态页面
│   ├── .env                          # 环境配置
│   └── requirements.txt              # Python 依赖
│
├── src/
│   └── web-frontend/                 # React 前端
│       ├── src/
│       │   ├── admin/                # 后台管理系统
│       │   │   ├── modules/
│       │   │   │   ├── dashboard/    # 仪表盘
│       │   │   │   ├── model/        # 模型管理
│       │   │   │   ├── template/     # 模板管理
│       │   │   │   ├── user/         # 用户管理
│       │   │   │   ├── auth/         # 登录
│       │   │   │   └── experimental/ # 实验功能
│       │   │   ├── components/       # 通用组件
│       │   │   ├── layout/           # 布局
│       │   │   └── core/             # 后台核心
│       │   ├── core/template/        # 模板引擎
│       │   │   ├── ComponentRegistry # 组件注册表
│       │   │   ├── TemplateRenderer  # 模板渲染器
│       │   │   ├── TemplateProvider  # 模板上下文
│       │   │   └── builtin/          # 内置组件
│       │   ├── pages/                # 前台页面
│       │   │   ├── Home/             # 首页
│       │   │   ├── Gallery/          # 模型画廊
│       │   │   ├── Workshop3D/       # 3D 车间
│       │   │   ├── Upload/           # 模型上传
│       │   │   ├── Auth/             # 登录
│       │   │   ├── BookViewer/       # 图书查看器
│       │   │   ├── BookGallery/      # 图书画廊
│       │   │   ├── Editor/           # 3D 编辑器
│       │   │   └── SuperSplat/       # SuperSplat
│       │   ├── components/3d/        # 3D 组件
│       │   ├── types/               # TypeScript 类型
│       │   ├── i18n/                 # 国际化
│       │   └── stores/               # 状态管理
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/                            # 项目文档
└── .vscode/                         # VS Code 配置
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **Python** >= 3.11
- **npm** >= 9

### 一键启动（推荐）

```bash
# Windows
start.bat

# Mac/Linux
./start.sh
```

### 手动启动

#### 1. 启动后端

```bash
cd backend

# 创建虚拟环境（首次）
python -m venv .venv
# 或使用项目统一虚拟环境
# python -m venv ../../.venv312

# 激活虚拟环境
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

后端服务默认运行在 **http://localhost:8000**，API 文档访问 **http://localhost:8000/docs**

#### 2. 启动前端

```bash
cd src/web-frontend

# 安装依赖（首次）
npm install

# 启动开发服务器
npm run dev

# 启动后台管理（可选）
npm run dev:admin
```

前端开发服务器默认运行在 **http://localhost:5173**

---

## 🔧 配置说明

### 环境变量（`backend/.env`）

| 变量 | 默认值 | 说明 |
|:---|:---|:---|
| `HOST` | `0.0.0.0` | 后端监听地址 |
| `PORT` | `8000` | 后端端口 |
| `DEBUG` | `true` | 调试模式 |
| `DATABASE_URL` | `sqlite+aiosqlite:///./web3d_test.db` | 数据库连接 |
| `SECRET_KEY` | `your-secret-key` | JWT 签名密钥 |
| `HUNYUAN3D_MODE` | `mock` | 混元 3D 模式（mock/cloud） |
| `GENERATION_MODE` | `mock` | 生成模式（mock/cpu/gpu） |

### 生成模式切换

在 `backend/.env` 中配置：

```ini
# Mock 模式（默认，无需 GPU，用于开发测试）
GENERATION_MODE=mock
HUNYUAN3D_MODE=mock

# 云端模式（调用腾讯混元 3D API，需要 SecretId/SecretKey）
GENERATION_MODE=mock
HUNYUAN3D_MODE=cloud
# VERSION_LIST=hy-3d-3.0,hy-3d-3.1,HY-3D-Express
```

---

## 🎯 API 概览

| 端点 | 说明 | 认证 |
|:---|:---|:---:|
| `GET /health` | 健康检查 | 否 |
| `POST /api/v1/auth/login` | 用户登录 | 否 |
| `POST /api/v1/auth/register` | 用户注册 | 否 |
| `GET /api/v1/models` | 模型列表（分页） | 可选 |
| `POST /api/v1/models` | 创建模型 | 需要 |
| `POST /api/v1/generate` | AI 3D 生成 | 需要 |
| `GET /api/v1/nav-menus/flat` | 导航菜单平铺列表 | 否 |
| `GET /api/v1/nav-menus` | 导航菜单树形结构 | 可选 |
| `GET /api/v1/website-templates` | 模板列表 | 可选 |
| `GET /api/v1/website-templates/{id}` | 模板详情（含插槽） | 否 |
| `POST /api/v1/website-templates` | 创建模板 | 需要 |
| `PUT /api/v1/website-templates/{id}` | 更新模板 | 需要 |
| `DELETE /api/v1/website-templates/{id}` | 删除模板 | 需要 |
| `POST /api/v1/website-templates/{id}/publish` | 发布模板 | 需要 |
| `GET /api/v1/website-templates/{id}/slots` | 模板插槽列表 | 否 |
| `POST /api/v1/website-templates/{id}/slots` | 添加插槽 | 需要 |
| `GET /api/v1/components` | 注册组件列表 | 否 |
| `GET /api/v1/users` | 用户列表 | 需要 |
| `GET /api/v1/settings` | 系统设置 | 需要 |

---

## 🏗️ 官网模板引擎架构

```
导航菜单管理（后台）
    │
    ▼
NavMenu (树形结构)
    ├── template_id ────→ WebsiteTemplate（页面模板）
    │                         ├── layout_config（区块结构定义）
    │                         ├── theme_config（CSS 变量）
    │                         └── slots[]（组件插槽）
    │                               ├── slot_key（插槽标识）
    │                               ├── component_type（组件类型）
    │                               └── component_config（组件参数）
    │
    └── page_component ──→ Legacy Page（传统硬编码页面）

前端渲染链路：
    TemplateProvider（加载模板数据）
        ↓
    TemplateRenderer（解析 layout_config 区块结构）
        ↓
    ComponentRegistry（按 component_type 查找注册组件）
        ↓
    内置组件 / 动态懒加载页面
```

---

## 📜 License

MIT License

---

*最后更新：2026-05-01*
