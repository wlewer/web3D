# Web3D平台 - 世界顶尖3D内容生成与管理平台

> 🚀 **颠覆性产品** | 🏆 **企业级架构** | ⚡ **高性能渲染** | 🔒 **安全合规**

---

## 📖 项目概述

Web3D平台是一个**世界顶尖级别**的3D内容生成、管理与展示平台，整合了最新的AI 3D生成技术与WebGL2高斯渲染引擎，为用户提供从**单张图片到高质量3D模型**的完整解决方案。

### 🎯 核心价值

1. **极速生成**: 50ms-10秒完成3D模型生成（Hunyuan3D-2mini + TripoSR双引擎）
2. **高保真渲染**: Spark 2.0支持亿级高斯点阵，98%+设备兼容
3. **模板化设计**: 可视化页面编辑器，支持多种布局场景
4. **企业级后台**: 完整的用户管理、资产管理、订单支付系统
5. **安全可靠**: JWT认证、RBAC权限、数据加密、审计日志

---

## 📚 文档导航

### 🏗️ 技术架构文档

| 文档名称 | 路径 | 说明 |
|---------|------|------|
| **3D技术组合终极方案** | [docs/03-技术文档/3D技术组合终极方案-完整可执行版.md](./docs/03-技术文档/3D技术组合终极方案-完整可执行版.md) | 12项3D技术全面对比与最佳组合推荐 |
| **后台系统设计执行任务清单** | [docs/03-技术文档/Web3D平台后台系统设计执行任务清单.md](./docs/03-技术文档/Web3D平台后台系统设计执行任务清单.md) | 500+详细任务分解，12周开发计划 |
| **API接口详细设计文档** | [docs/03-技术文档/API接口详细设计文档.md](./docs/03-技术文档/API接口详细设计文档.md) | 100+ RESTful API端点完整规范 |
| **数据库Schema设计文档** | [docs/03-技术文档/数据库Schema设计文档.md](./docs/03-技术文档/数据库Schema设计文档.md) | PostgreSQL企业级数据库设计 |
| **项目开发进度跟踪表** | [docs/03-技术文档/项目开发进度跟踪表.md](./docs/03-技术文档/项目开发进度跟踪表.md) | 每日站会记录，燃尽图跟踪 |

### 📋 需求文档

| 文档名称 | 路径 | 说明 |
|---------|------|------|
| **3D生成技术完整分析报告** | [docs/01-需求文档/3D生成技术完整分析报告.md](./docs/01-需求文档/3D生成技术完整分析报告.md) | 技术选型决策参考 |

---

## 🏆 核心技术栈

### 后端技术

```
FastAPI (Python 3.10+)
├── SQLAlchemy 2.0 (ORM)
├── PostgreSQL 16 (数据库)
├── Redis 7.2 (缓存/队列)
├── Celery 5.3 (异步任务)
├── MinIO (对象存储)
└── RabbitMQ (消息中间件)
```

### AI生成引擎

```
Hunyuan3D-2mini (腾讯混元)
├── 0.6B参数，仅需6GB VRAM
├── 形状生成 + 纹理合成
└── 商用许可，完全开源

TripoSR (VAST + Stability AI)
├── <0.5秒极速推理
├── 6GB VRAM需求
└── MIT许可证
```

### 前端技术

```
React 18 + TypeScript
├── Three.js + React Three Fiber (3D渲染)
├── Spark 2.0 (高斯点阵渲染)
├── Zustand (状态管理)
├── React Router (路由)
└── Ant Design / MUI (UI组件)
```

### DevOps

```
Docker + Docker Compose
├── Nginx (反向代理/负载均衡)
├── Prometheus + Grafana (监控)
├── Loki + Promtail (日志聚合)
└── GitHub Actions (CI/CD)
```

---

## 📊 系统架构

```
                    ┌──────────────┐
                    │   Cloudflare  │
                    │   (CDN+WAF)   │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
                    │   Nginx LB   │
                    │  (SSL终止)    │
                    └──┬───────┬───┘
                       │       │
              ┌────────▼┐  ┌───▼────────┐
              │ Frontend │  │  Backend   │
              │  (React) │  │ (FastAPI)  │
              └─────────┘  └─────┬──────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Internal Network      │
                    ├──────────┬──────────────┤
                    │          │              │
              ┌─────▼───┐ ┌───▼────┐  ┌─────▼─────┐
              │PostgreSQL│ │ Redis  │  │   MinIO   │
              └─────────┘ └────────┘  └───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Celery Workers        │
                    │  (GPU Nodes)            │
                    ├──────────┬──────────────┤
                    │          │              │
              ┌─────▼───┐ ┌───▼────┐  ┌─────▼─────┐
              │Hunyuan3D│ │TripoSR │  │  Blender  │
              └─────────┘ └────────┘  └───────────┘
```

---

## 🚀 快速开始

### 前置要求

- **GPU服务器**: NVIDIA RTX 4090 24GB（推荐）或 RTX 3060 12GB（最低）
- **操作系统**: Ubuntu 22.04 LTS
- **Docker**: 24.0+
- **Node.js**: 18+
- **Python**: 3.10+

### 1. 克隆项目

```bash
git clone https://github.com/your-org/web3d.git
cd web3d
```

### 2. 环境配置

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env
cp src/web-frontend/.env.example src/web-frontend/.env

# 编辑配置文件
vim backend/.env
```

### 3. 启动基础设施

```bash
cd backend
docker-compose up -d postgres redis minio rabbitmq
```

### 4. 安装依赖

```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd ../src/web-frontend
npm install
```

### 5. 数据库迁移

```bash
cd backend
alembic upgrade head
```

### 6. 启动服务

```bash
# 后端API
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Celery Worker
celery -A app.core.celery_app worker --loglevel=info

# 前端开发服务器
cd ../src/web-frontend
npm run dev
```

### 7. 访问应用

- **前端**: http://localhost:5173
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **管理后台**: http://localhost:5173/admin

---

## 📁 项目结构

```
web3d/
├── docs/                          # 文档
│   ├── 01-需求文档/
│   │   └── 3D生成技术完整分析报告.md
│   ├── 03-技术文档/
│   │   ├── 3D技术组合终极方案-完整可执行版.md
│   │   ├── Web3D平台后台系统设计执行任务清单.md
│   │   ├── API接口详细设计文档.md
│   │   ├── 数据库Schema设计文档.md
│   │   └── 项目开发进度跟踪表.md
│   └── README.md                  # 本文档
│
├── backend/                       # 后端服务
│   ├── app/
│   │   ├── api/v1/               # API路由
│   │   ├── core/                 # 核心功能
│   │   ├── models/               # SQLAlchemy模型
│   │   ├── schemas/              # Pydantic模式
│   │   ├── services/             # 业务逻辑
│   │   ├── tasks/                # Celery任务
│   │   └── utils/                # 工具函数
│   ├── alembic/                  # 数据库迁移
│   ├── tests/                    # 测试
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
│
├── src/web-frontend/             # 前端应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3d/              # 3D组件
│   │   │   ├── common/          # 通用组件
│   │   │   └── layout/          # 布局组件
│   │   ├── pages/               # 页面
│   │   ├── hooks/               # React Hooks
│   │   ├── stores/              # Zustand状态
│   │   ├── utils/               # 工具函数
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🎯 核心功能模块

### 1. 用户系统

- ✅ 邮箱/密码注册登录
- ✅ OAuth2第三方登录（Google/GitHub/微信）
- ✅ JWT Token认证
- ✅ RBAC权限管理（admin/editor/user/guest）
- ✅ 用户资料管理
- ✅ 会话管理

### 2. 3D模型生成

- ✅ Hunyuan3D-2mini集成（高质量）
- ✅ TripoSR集成（极速）
- ✅ 异步任务队列
- ✅ WebSocket实时进度推送
- ✅ 格式转换（GLB ↔ Splat ↔ OBJ）
- ✅ 批量生成

### 3. 资产管理系统

- ✅ 模型上传/下载
- ✅ 模型列表/详情/搜索
- ✅ 标签与分类
- ✅ 版本控制
- ✅ 点赞/收藏/评论
- ✅ 社交分享

### 4. 模板系统

- ✅ 可视化模板编辑器
- ✅ 拖拽式页面构建
- ✅ 多种区块组件（Hero/Gallery/Text/Video/3D Viewer）
- ✅ 样式自定义
- ✅ 模板市场
- ✅ 评分与评价

### 5. 页面系统

- ✅ 自定义页面创建
- ✅ SEO优化（Meta标签/Open Graph）
- ✅ 发布/下架管理
- ✅ 自定义CSS/JS
- ✅ 响应式设计

### 6. 订阅与支付

- ✅ 套餐管理（Free/Pro/Enterprise）
- ✅ Stripe支付集成
- ✅ 支付宝/微信支付（国内）
- ✅ 订单管理
- ✅ 发票生成
- ✅ 订阅周期管理

### 7. 管理后台

- ✅ Dashboard数据统计
- ✅ 用户管理（封禁/角色调整）
- ✅ 模型审核
- ✅ 模板管理
- ✅ 订单管理
- ✅ 系统监控
- ✅ 操作日志

---

## 🔒 安全特性

### 认证与授权

- **JWT Token**: Access Token（1小时）+ Refresh Token（7天）
- **密码加密**: bcrypt（cost factor 12）
- **RBAC权限**: 细粒度权限控制
- **OAuth2**: 第三方登录安全集成

### 数据安全

- **传输加密**: TLS 1.3
- **存储加密**: 敏感字段AES-256
- **SQL注入防护**: ORM参数化查询
- **XSS防护**: 输出转义
- **CSRF防护**: SameSite Cookie

### API安全

- **速率限制**: 基于IP和用户ID
- **输入验证**: Pydantic严格验证
- **CORS配置**: 白名单域名
- **文件上传**: 类型白名单 + 大小限制

---

## 📈 性能指标

### 生成性能

| 引擎 | 推理时间 | VRAM需求 | 适用场景 |
|------|---------|---------|---------|
| Hunyuan3D-2mini | 5-10秒 | 6GB | 高质量电商展示 |
| TripoSR | <0.5秒 | 6GB | 实时交互/批量生成 |

### 渲染性能

| 指标 | 数值 |
|------|------|
| Spark 2.0设备覆盖率 | 98%+ |
| 移动端FPS | 30-45 |
| 最大Splat数量 | 106M |
| WebGL2兼容性 | Chrome/Firefox/Safari/Edge |

### API性能

| 指标 | 目标值 |
|------|--------|
| QPS | >1000 |
| P95响应时间 | <200ms |
| 错误率 | <0.5% |
| 可用性 | 99.9% |

---

## 🧪 测试

### 运行测试

```bash
# 后端单元测试
cd backend
pytest tests/ -v --cov=app --cov-report=html

# 前端单元测试
cd ../src/web-frontend
npm test

# E2E测试
npm run test:e2e
```

### 性能压测

```bash
# k6压力测试
k6 run tests/performance/api_load_test.js

# Locust分布式压测
locust -f tests/performance/locustfile.py --users 1000 --spawn-rate 100
```

---

## 📦 部署

### Docker部署

```bash
# 生产环境
cd backend
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose logs -f
```

### Kubernetes部署（可选）

```bash
kubectl apply -f k8s/
```

### CDN配置

1. 配置Cloudflare/阿里云CDN
2. 添加域名并配置SSL
3. 设置缓存规则
4. 启用DDoS防护和WAF

---

## 📊 监控与告警

### Prometheus指标

- API响应时间
- QPS
- 错误率
- GPU利用率
- 内存使用率
- 数据库连接数

### Grafana Dashboard

- 系统概览
- API性能
- 业务指标
- 资源使用

### 告警规则

| 指标 | 阈值 | 级别 |
|------|------|------|
| API响应时间P95 | >2s | Warning |
| API错误率 | >5% | Critical |
| GPU显存使用率 | >90% | Warning |
| 磁盘空间 | >80% | Warning |

---

## 🤝 贡献指南

### 开发流程

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 代码规范

- **Python**: PEP 8 + Black格式化
- **TypeScript**: ESLint + Prettier
- **提交信息**: Conventional Commits
- **分支命名**: `feature/*`, `bugfix/*`, `hotfix/*`

---

## 📄 许可证

本项目采用 **MIT License** - 详见 [LICENSE](LICENSE) 文件

### 第三方组件许可证

| 组件 | 许可证 |
|------|--------|
| Hunyuan3D-2 | 腾讯混元许可（可商用） |
| TripoSR | MIT |
| Spark 2.0 | MIT |
| FastAPI | MIT |
| React | MIT |
| Three.js | MIT |

---

## 📞 联系方式

- **项目主页**: https://github.com/your-org/web3d
- **问题反馈**: https://github.com/your-org/web3d/issues
- **技术支持**: support@web3d.com
- **商务合作**: business@web3d.com

---

## 🙏 致谢

感谢以下开源项目的贡献者：

- [Tencent Hunyuan](https://github.com/Tencent-Hunyuan/Hunyuan3D-2)
- [VAST AI Research](https://github.com/VAST-AI-Research/TripoSR)
- [World Labs](https://github.com/sparkjsdev/spark)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)

---

## 📅 更新日志

### v1.0.0 (2025-04-18)

- ✨ 初始版本发布
- 🎯 集成Hunyuan3D-2mini和TripoSR
- 🎨 Spark 2.0高斯渲染引擎
- 🔐 完整用户认证与权限系统
- 📊 管理后台Dashboard
- 💳 订阅与支付系统
- 📱 移动端优化与PWA支持

---

**Made with ❤️ by Web3D Team**

⭐ 如果这个项目对您有帮助，请给我们一个Star！
