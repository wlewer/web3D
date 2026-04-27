# Web3D 项目核心架构速查手册

> 📅 最后更新：2026-04-18  
> 🎯 用途：快速查阅项目技术栈组合，避免选型错误  
> 👥 适用：所有开发人员

---

## 🚀 一、核心技术栈（必须遵守）

### 1.1 前端技术栈

| 技术 | 版本 | 官方开源地址 | 用途 |
|------|------|-------------|------|
| **React** | 19.2.4 | https://github.com/facebook/react | UI 框架 |
| **TypeScript** | 6.0.2 | https://github.com/microsoft/TypeScript | 类型系统 |
| **Vite** | 7.3.1 | https://github.com/vitejs/vite | 构建工具 |
| **Refine.dev** | 4.x | https://github.com/refinedev/refine | 管理后台框架 |
| **Ant Design** | 6.3.6 | https://github.com/ant-design/ant-design | UI 组件库 |
| **TanStack Query** | - | https://github.com/TanStack/query | 服务端状态管理 |
| **Three.js** | - | https://github.com/mrdoob/three.js | 3D 渲染引擎 |
| **@react-three/fiber** | ^9.4.0 | https://github.com/pmndrs/react-three-fiber | React + Three.js |
| **Spark 2.0** ⭐⭐⭐ | ^2.0.0 | https://github.com/worldlabsai/spark | **核心 3DGS 引擎** |
| **PlayCanvas Viewer** | ^1.19.1 | https://github.com/playcanvas/supersplat-viewer | 3D 查看器 |
| **PCUI** (可选) | ^6.1.3 | https://github.com/playcanvas/pcui | PlayCanvas UI 组件 |

### 1.2 后端技术栈

| 技术 | 版本 | 官方开源地址 | 用途 |
|------|------|-------------|------|
| **Python** | 3.11+ | https://www.python.org/ | 运行时 |
| **FastAPI** | 0.115.13 | https://github.com/tiangolo/fastapi | 异步 Web 框架 |
| **Uvicorn** | 0.34.3 | https://github.com/encode/uvicorn | ASGI 服务器 |
| **PostgreSQL** | 16 | https://www.postgresql.org/ | 主数据库 |
| **SQLAlchemy** | 2.0.41 | https://github.com/sqlalchemy/sqlalchemy | ORM |
| **asyncpg** | 0.30.0 | https://github.com/MagicStack/asyncpg | PostgreSQL 异步驱动 |
| **Redis** | 7 | https://github.com/redis/redis | 缓存 + 会话 |
| **aioredis** | 2.0.1 | https://github.com/aio-libs/aioredis-py | Redis 异步客户端 |
| **PyJWT** | 2.10.1 | https://github.com/jpadilla/pyjwt | JWT 认证 |
| **bcrypt** | 5.0.0 | https://github.com/pyca/bcrypt/ | 密码哈希 |

### 1.3 AI 3D 生成引擎 ⭐⭐⭐

| 技术 | 版本 | 官方开源地址 | 显存需求 | 用途 |
|------|------|-------------|---------|------|
| **Hunyuan3D-2** ⭐⭐⭐ | 2.1 | https://github.com/Tencent-Hunyuan/Hunyuan3D-2 | 6-16GB | **主力 3D 生成引擎** |
| **Hunyuan3D-2mini** | mini | https://github.com/Tencent-Hunyuan/Hunyuan3D-2 | 6GB | 轻量级版本 |
| **TripoSR** | - | https://github.com/VAST-AI-Research/TripoSR | 6GB | 快速生成（0.5s） |
| **TRELLIS.2** | - | https://github.com/microsoft/TRELLIS.2 | 24GB | 高质量 PBR 材质 |
| **Unique3D** | - | https://github.com/AiuniAI/Unique3D | ~8GB | 高质量网格生成 |
| **Gamba** | - | https://github.com/SkyworkAI/Gamba | 1.5GB | 极速生成（50ms） |

**在线体验**：https://hy3d.dev （腾讯混元官方服务，无需部署）

### 1.4 独立参考项目

| 项目 | 版本 | 官方开源地址 | 说明 |
|------|------|-------------|------|
| **SuperSplat** | v2.24.5 | https://github.com/playcanvas/supersplat | 官方 3DGS 编辑器（参考实现） |
| **PlayCanvas Engine** | v2.17.2 | https://github.com/playcanvas/engine | 3D 游戏引擎 |

⚠️ **注意**：`src/supersplat/` 是独立项目，用于学习架构设计，不直接集成到 web-frontend

---

## 🎯 二、3D 场景开发规范

### 2.1 技术选型决策树

```
需要 3D 功能？
├─ 是 3D Gaussian Splatting (3DGS)？
│   └─ ✅ 使用 Spark 2.0 (@sparkjsdev/spark)
│
├─ 是通用 3D 模型 (GLB/GLTF/OBJ)？
│   └─ ✅ 使用 Three.js + R3F
│
├─ 需要编辑器功能？
│   ├─ 简单配置 → ✅ JSON 配置 + Spark 2.0
│   └─ 复杂编辑 → 📖 参考 src/supersplat/ 架构
│
└─ 只需查看器？
    └─ ✅ 使用 @playcanvas/supersplat-viewer
```

### 2.2 禁止使用的技术

❌ **不要引入以下技术**（与现有架构冲突）：
- GrapesJS（2D 页面编辑器，不适合 3D）
- Babylon.js（已有 Three.js + Spark 2.0）
- Unity WebGL（太重，不符合轻量级原则）
- 其他 3DGS 引擎（已有 Spark 2.0）

---

## 📊 三、数据库设计规范

### 3.1 核心数据表

```sql
-- 用户系统
users                    -- 用户表
user_roles              -- 用户角色关联
roles                   -- 角色定义
permissions             -- 权限定义

-- 3D 模型管理
models_3d               -- 3D 模型元数据
model_versions          -- 模型版本历史

-- 场景模板（Spark 2.0）
scene_templates         -- 场景模板（JSON 配置）
template_versions       -- 模板版本历史

-- 内容管理
articles                -- 文章/博客
categories              -- 分类
```

### 3.2 模板数据结构示例

```typescript
interface SceneTemplate {
  // 基本信息
  id: string;
  name: string;
  description?: string;
  category: 'product' | 'architecture' | 'art' | 'interior' | 'exterior';
  status: 'draft' | 'published' | 'archived';
  
  // Spark 2.0 配置 ⭐
  spark_config: {
    pointCloudUrl: string;        // 点云文件 URL
    backgroundColor: string;       // 背景色 (#RRGGBB)
    cameraPosition: [x, y, z];    // 相机位置
    cameraTarget: [x, y, z];      // 相机目标点
    lighting: {
      ambient: number;            // 环境光强度 (0-1)
      directional: Array<{
        position: [x, y, z];
        intensity: number;
        color: string;
      }>;
    };
    postProcessing: {
      bloom: boolean;
      toneMapping: 'aces' | 'reinhard' | 'none';
      exposure: number;
    };
  };
  
  // 元数据
  thumbnailUrl?: string;
  tags: string[];
  
  // 统计
  usageCount: number;
  likeCount: number;
  
  // 版本
  version: string;  // "1.0.0"
  isFeatured: boolean;
}
```

---

## 🏗️ 四、项目目录结构

```
web3D/
├── backend/                    # Python 后端
│   ├── app/
│   │   ├── api/v1/            # API 路由
│   │   │   ├── users.py       # 用户管理
│   │   │   ├── models.py      # 模型管理
│   │   │   └── templates.py   # 模板管理
│   │   ├── models/            # SQLAlchemy 模型
│   │   │   ├── user.py
│   │   │   ├── model.py
│   │   │   └── template.py    # ← 新建
│   │   ├── schemas/           # Pydantic Schema
│   │   ├── services/          # 业务逻辑
│   │   └── main.py            # FastAPI 入口
│   └── Dockerfile
│
├── src/
│   ├── web-frontend/          # React 前端
│   │   ├── src/
│   │   │   ├── admin/         # 管理后台 (Refine)
│   │   │   │   ├── modules/   # 业务模块
│   │   │   │   │   ├── user/
│   │   │   │   │   ├── model/
│   │   │   │   │   └── template/  # ← 新建
│   │   │   │   └── App.tsx
│   │   │   ├── components/3d/ # 3D 组件
│   │   │   │   ├── Spark/     # Spark 2.0 封装
│   │   │   │   └── Viewer/    # 查看器组件
│   │   │   └── pages/         # 页面组件
│   │   └── package.json
│   │
│   └── supersplat/            # 官方编辑器（参考实现）
│       ├── src/
│       │   ├── ui/            # PCUI 组件
│       │   └── editor.ts      # 编辑器核心
│       └── package.json
│
└── docs/                      # 文档
    ├── 00-项目索引.md
    ├── 01-需求文档/
    ├── 03-技术文档/
    │   ├── 核心架构速查.md    # ← 本文档
    │   └── 3D技术组合终极方案-完整可执行版.md
    └── 04-开发文档/
```

---

## 🔧 五、开发命令速查

### 5.1 前端开发

```bash
# 进入前端目录
cd src/web-frontend

# 安装依赖
npm install

# 启动开发服务器 (http://localhost:5173)
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check
```

### 5.2 后端开发

```bash
# 进入后端目录
cd backend

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器 (http://localhost:8000)
uvicorn app.main:app --reload --port 8000

# 运行数据库迁移
python -m app.database
```

### 5.3 Docker 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 重启单个服务
docker-compose restart backend

# 停止所有服务
docker-compose down
```

### 5.4 数据库操作

```bash
# 连接 PostgreSQL (宿主机端口 5433)
psql -h localhost -p 5433 -U web3d_user -d web3d

# 或使用 Navicat
# Host: localhost
# Port: 5433
# User: web3d_user
# Password: admin123 (开发环境)
# Database: web3d
```

---

## ⚠️ 六、常见错误与解决方案

### 6.1 技术选型错误

| 错误 | 正确做法 |
|------|---------|
| 想用 GrapesJS 做 3D 编辑器 | ❌ 改用 Spark 2.0 + JSON 配置 |
| 想引入 Babylon.js | ❌ 已有 Three.js + Spark 2.0 |
| 想重新开发编辑器 | ❌ 参考 src/supersplat/ 架构 |
| 想用 SQLite 生产环境 | ❌ 必须用 PostgreSQL |

### 6.2 数据库连接问题

```bash
# 问题：Navicat 连接失败
# 解决：PostgreSQL 使用 trust 认证（开发环境）
docker exec web3d-postgres sh -c "sed -i 's/md5$/trust/g' /var/lib/postgresql/data/pg_hba.conf"
docker exec web3d-postgres psql -U web3d_user -d web3d -c "SELECT pg_reload_conf();"

# 注意：生产环境必须改回 scram-sha-256 或 md5
```

### 6.3 Docker 端口映射

```yaml
# docker-compose.yml
services:
  postgres:
    ports:
      - "5433:5432"  # 宿主机 5433 → 容器内 5432
  
  redis:
    ports:
      - "6379:6379"
  
  backend:
    ports:
      - "8000:8000"
```

---

## 📚 七、关键文档索引

### 7.1 必读文档

| 文档 | 路径 | 用途 |
|------|------|------|
| **核心架构速查** | `docs/03-技术文档/核心架构速查.md` | ⭐ 本文档，快速查阅 |
| 3D 技术组合方案 | `docs/03-技术文档/3D技术组合终极方案-完整可执行版.md` | 详细技术分析 |
| 后台系统设计 | `docs/03-技术文档/3D生成平台-后台管理系统设计文档.md` | 后台架构设计 |
| API 接口设计 | `docs/03-技术文档/API接口详细设计文档.md` | API 规范 |
| 数据库 Schema | `docs/03-技术文档/数据库Schema设计文档.md` | 数据库设计 |

### 7.2 开发规范

| 文档 | 路径 |
|------|------|
| 代码模块化规范 | `docs/04-开发文档/代码模块化规范.md` |
| 文档组织规范 | `docs/09-规范标准/文档组织规范.md` |

---

## 🎓 八、完整开源资源索引

### 8.1 前端框架与库

| 技术 | GitHub 地址 | npm 包 | 文档 |
|------|-----------|--------|------|
| React | https://github.com/facebook/react | `react` | https://react.dev |
| TypeScript | https://github.com/microsoft/TypeScript | `typescript` | https://www.typescriptlang.org |
| Vite | https://github.com/vitejs/vite | `vite` | https://vite.dev |
| Refine.dev | https://github.com/refinedev/refine | `@refinedev/core` | https://refine.dev/docs |
| Ant Design | https://github.com/ant-design/ant-design | `antd` | https://ant.design |
| TanStack Query | https://github.com/TanStack/query | `@tanstack/react-query` | https://tanstack.com/query |

### 8.2 3D 渲染引擎

| 技术 | GitHub 地址 | npm 包 | 文档 |
|------|-----------|--------|------|
| **Spark 2.0** ⭐⭐⭐ | https://github.com/worldlabsai/spark | `@sparkjsdev/spark` | 查看仓库 README |
| Three.js | https://github.com/mrdoob/three.js | `three` | https://threejs.org |
| React Three Fiber | https://github.com/pmndrs/react-three-fiber | `@react-three/fiber` | https://docs.pmnd.rs/react-three-fiber |
| PlayCanvas Viewer | https://github.com/playcanvas/supersplat-viewer | `@playcanvas/supersplat-viewer` | 查看仓库 README |
| PCUI | https://github.com/playcanvas/pcui | `@playcanvas/pcui` | 查看仓库 README |
| PlayCanvas Engine | https://github.com/playcanvas/engine | `playcanvas` | https://developer.playcanvas.com |

### 8.3 AI 3D 生成引擎

| 技术 | GitHub 地址 | HuggingFace | 在线体验 |
|------|-----------|-------------|----------|
| **Hunyuan3D-2** ⭐⭐⭐ | https://github.com/Tencent-Hunyuan/Hunyuan3D-2 | `tencent/Hunyuan3D-2` | https://hy3d.dev |
| Hunyuan3D-2mini | https://github.com/Tencent-Hunyuan/Hunyuan3D-2 | `tencent/Hunyuan3D-2mini` | https://hy3d.dev |
| TripoSR | https://github.com/VAST-AI-Research/TripoSR | `stabilityai/TripoSR` | - |
| TRELLIS.2 | https://github.com/microsoft/TRELLIS.2 | - | - |
| Unique3D | https://github.com/AiuniAI/Unique3D | - | - |
| Gamba | https://github.com/SkyworkAI/Gamba | - | - |

### 8.4 后端框架与数据库

| 技术 | GitHub 地址 | PyPI 包 | 文档 |
|------|-----------|---------|------|
| FastAPI | https://github.com/tiangolo/fastapi | `fastapi` | https://fastapi.tiangolo.com |
| Uvicorn | https://github.com/encode/uvicorn | `uvicorn` | https://www.uvicorn.org |
| SQLAlchemy | https://github.com/sqlalchemy/sqlalchemy | `sqlalchemy` | https://docs.sqlalchemy.org |
| asyncpg | https://github.com/MagicStack/asyncpg | `asyncpg` | https://magicstack.github.io/asyncpg |
| PyJWT | https://github.com/jpadilla/pyjwt | `PyJWT` | https://pyjwt.readthedocs.io |
| bcrypt | https://github.com/pyca/bcrypt/ | `bcrypt` | https://pypi.org/project/bcrypt |
| aioredis | https://github.com/aio-libs/aioredis-py | `aioredis` | https://aioredis.readthedocs.io |

### 8.5 基础设施

| 技术 | 官方网站 | Docker Hub | 文档 |
|------|---------|-----------|------|
| PostgreSQL | https://www.postgresql.org/ | `postgres:16` | https://www.postgresql.org/docs |
| Redis | https://redis.io/ | `redis:7` | https://redis.io/docs |
| Python | https://www.python.org/ | `python:3.11` | https://docs.python.org/3 |
| Docker | https://www.docker.com/ | - | https://docs.docker.com |

### 8.6 参考项目

| 项目 | GitHub 地址 | 说明 |
|------|-----------|------|
| **SuperSplat** | https://github.com/playcanvas/supersplat | 官方 3DGS 编辑器（学习架构） |
| World Labs Spark | https://github.com/worldlabsai/spark | Spark 2.0 官方仓库 |

---

## 🔄 九、版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-04-18 | 初始版本，记录核心技术栈组合 |
| v1.1 | 2026-04-18 | 添加完整开源地址索引，补充 Hunyuan3D 等 AI 生成引擎 |

---

## 📦 十、快速下载与安装指南

### 10.1 前端依赖安装

```bash
# 进入前端目录
cd src/web-frontend

# 安装所有依赖（package.json 中已配置）
npm install

# 或单独安装某个包
npm install @sparkjsdev/spark@^2.0.0
npm install @refinedev/core@^5.0.12
npm install antd@^6.3.6
```

### 10.2 后端依赖安装

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装所有依赖（requirements.txt 中已配置）
pip install -r requirements.txt

# 或单独安装某个包
pip install fastapi==0.115.13
pip install sqlalchemy==2.0.41
pip install asyncpg==0.30.0
```

### 10.3 AI 生成引擎部署

#### 方案 A：使用官方云服务（推荐初期）

```python
# 无需部署，直接访问 https://hy3d.dev
# 或等待腾讯开放 API
```

#### 方案 B：自部署 Hunyuan3D-2mini（生产环境）

```bash
# 1. 克隆仓库
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git
cd Hunyuan3D-2

# 2. 安装依赖
pip install -r requirements.txt

# 3. 下载模型（需要 HuggingFace 账号）
# 从 HuggingFace 下载 tencent/Hunyuan3D-2mini

# 4. 测试运行
python demo.py --image_path test.png --output_dir output
```

**硬件要求**：
- GPU: NVIDIA RTX 3060 或更高（6GB+ VRAM）
- 内存: 16GB+
- 存储: 50GB+（模型文件 + 缓存）

#### 方案 C：其他 AI 引擎

```bash
# TripoSR
git clone https://github.com/VAST-AI-Research/TripoSR.git
cd TripoSR
pip install -r requirements.txt

# TRELLIS.2
git clone https://github.com/microsoft/TRELLIS.2.git
cd TRELLIS.2
pip install -r requirements.txt

# Unique3D
git clone https://github.com/AiuniAI/Unique3D.git
cd Unique3D
pip install -r requirements.txt
```

### 10.4 Docker 服务启动

```bash
# 启动所有服务（PostgreSQL + Redis + Backend）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend

# 停止所有服务
docker-compose down
```

### 10.5 数据库初始化

```bash
# 连接 PostgreSQL
docker exec -it web3d-postgres psql -U web3d_user -d web3d

# 执行初始化脚本
docker exec -i web3d-postgres psql -U web3d_user -d web3d < backend/init_database_complete.sql

# 或使用 Navicat
# Host: localhost
# Port: 5433
# User: web3d_user
# Password: admin123
# Database: web3d
```

### 10.6 参考项目克隆

```bash
# SuperSplat 编辑器（学习架构）
git clone https://github.com/playcanvas/supersplat.git
cd supersplat
npm install
npm run develop  # http://localhost:3000

# Spark 2.0 示例
git clone https://github.com/worldlabsai/spark.git
cd spark
# 查看 README 了解使用方法
```

---

## 💡 十一、重要提醒

### ✅ 必须遵守的原则

1. **优先使用官方开源代码**：避免自研，直接使用成熟方案
2. **保持技术栈统一**：不要随意引入新框架
3. **Spark 2.0 是核心**：所有 3DGS 相关功能基于 Spark 2.0
4. **JSON 配置优先**：模板系统使用 JSON 而非复杂编辑器
5. **参考 SuperSplat 架构**：学习其设计模式，不直接复制代码

### ❌ 禁止的行为

1. 不要引入与现有架构冲突的技术（如 GrapesJS、Babylon.js）
2. 不要在没有充分调研的情况下更换核心技术栈
3. 不要在生产环境使用 trust 认证
4. 不要忽略 TypeScript 类型检查

---

**📝 维护说明**：
- ✅ 每次技术栈变更时，必须更新本文档
- ✅ 新增依赖时，在对应章节添加说明（包括官方开源地址）
- ✅ 发现选型错误时，立即修正并记录原因
- ✅ 保持所有 GitHub 链接可访问
- ✅ 定期验证 HuggingFace 模型可用性

**👥 责任人**：所有项目开发人员

**🔗 快速链接**：
- 前端依赖: `src/web-frontend/package.json`
- 后端依赖: `backend/requirements.txt`
- Docker 配置: `docker-compose.yml`
- 数据库脚本: `backend/init_database_complete.sql`
