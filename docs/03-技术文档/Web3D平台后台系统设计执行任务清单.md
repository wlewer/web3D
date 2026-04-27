# Web3D平台后台系统设计执行任务清单

> 📅 创建日期：2025年4月18日  
> 📄 文档版本：v1.0（世界顶尖产品级）  
> 🎯 目标：打造颠覆性3D内容生成与管理平台  
> 🏆 标准：企业级、高可用、可扩展、安全合规  
> ⏱️ 周期：12周完整开发周期

---

## 📚 目录

1. [系统架构总览](#一系统架构总览)
2. [技术栈选型](#二技术栈选型)
3. [数据库设计](#三数据库设计)
4. [API接口设计](#四api接口设计)
5. [功能模块详细任务清单](#五功能模块详细任务清单)
6. [安全设计方案](#六安全设计方案)
7. [性能优化方案](#七性能优化方案)
8. [部署架构](#八部署架构)
9. [监控与运维](#九监控与运维)
10. [里程碑计划](#十里程碑计划)

---

## 一、系统架构总览

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           客户端层 (Client Layer)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web前端 (React + R3F)  │  移动端 (PWA)  │  管理后台 (React Admin)         │
└──────────────┬──────────┴────────┬───────┴──────────────┬──────────────────┘
               │                   │                      │
               └───────────────────┼──────────────────────┘
                                   │ HTTPS/WSS
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                         API网关层 (API Gateway)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Nginx反向代理  │  负载均衡  │  SSL终止  │  速率限制  │  CORS配置          │
└──────────────┬─────────────────────────────────────────────────┬───────────┘
               │                                                 │
┌──────────────▼──────────┐                          ┌──────────▼───────────┐
│   应用服务层             │                          │   异步任务层          │
│   (FastAPI Services)    │◄──── Redis Pub/Sub ─────►│   (Celery Workers)   │
├─────────────────────────┤                          ├──────────────────────┤
│ • 用户认证服务           │                          │ • 3D模型生成任务      │
│ • 3D生成服务            │                          │ • 格式转换任务        │
│ • 资产管理服务           │                          │ • 缩略图生成任务      │
│ • 模板管理服务           │                          │ • 批量处理任务        │
│ • 订单支付服务           │                          │ • 邮件通知任务        │
│ • 数据统计服务           │                          │ • 清理过期文件任务    │
└──────────┬──────────────┘                          └──────────┬───────────┘
           │                                                    │
           └────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────────────┐
│                         数据存储层 (Data Layer)                              │
├────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (主数据库)  │  Redis (缓存/队列)  │  MinIO (对象存储)          │
└────────────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────────────┐
│                         AI生成引擎层 (AI Engine)                             │
├────────────────────────────────────────────────────────────────────────────┤
│  Hunyuan3D-2mini  │  TripoSR  │  Blender转换  │  Spark渲染引擎             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **微服务化**：各功能模块独立部署，便于扩展
2. **异步处理**：耗时操作通过消息队列异步执行
3. **缓存优先**：Redis多级缓存，减少数据库压力
4. **动静分离**：静态资源CDN加速，动态请求后端处理
5. **安全加固**：JWT认证、RBAC权限、SQL注入防护、XSS防护
6. **可观测性**：全链路日志、指标监控、分布式追踪
7. **弹性伸缩**：容器化部署，支持水平扩展
8. **多租户隔离**：数据隔离、资源配额、权限分级

---

## 二、技术栈选型

### 2.1 后端技术栈

| 类别 | 技术选型 | 版本 | 理由 |
|------|---------|------|------|
| **Web框架** | FastAPI | 0.109+ | 高性能、自动生成OpenAPI文档、异步支持 |
| **ORM** | SQLAlchemy 2.0 | 2.0+ | 类型安全、异步支持、迁移工具完善 |
| **数据库** | PostgreSQL | 16+ | ACID事务、JSONB支持、地理空间扩展 |
| **缓存** | Redis | 7.2+ | 高速缓存、消息队列、会话存储 |
| **对象存储** | MinIO | RELEASE.2024+ | S3兼容、自托管、高性能 |
| **任务队列** | Celery | 5.3+ | 分布式任务调度、定时任务 |
| **消息中间件** | RabbitMQ | 3.12+ | 可靠消息传递、任务路由 |
| **认证** | JWT + OAuth2 | - | 无状态认证、第三方登录 |
| **验证** | Pydantic | 2.5+ | 数据验证、序列化、类型检查 |
| **日志** | Loguru | 0.7+ | 结构化日志、彩色输出 |
| **监控** | Prometheus + Grafana | - | 指标采集、可视化监控 |
| **追踪** | OpenTelemetry | - | 分布式追踪、性能分析 |

### 2.2 前端技术栈

| 类别 | 技术选型 | 版本 | 理由 |
|------|---------|------|------|
| **框架** | React | 18.2+ | 组件化、生态丰富 |
| **3D渲染** | Three.js + R3F | r160+ | WebGL抽象、声明式API |
| **高斯渲染** | Spark 2.0 | 2.0+ | 亿级Splat渲染、WebGL2 |
| **状态管理** | Zustand | 4.5+ | 轻量级、TypeScript友好 |
| **路由** | React Router | 6.21+ | 声明式路由、懒加载 |
| **UI库** | Ant Design / MUI | 5.x | 企业级组件、主题定制 |
| **HTTP客户端** | Axios | 1.6+ | 拦截器、取消请求 |
| **表单** | React Hook Form | 7.49+ | 高性能、最小重渲染 |
| **图表** | ECharts / Recharts | 5.x | 数据可视化 |

### 2.3 DevOps技术栈

| 类别 | 技术选型 | 版本 | 理由 |
|------|---------|------|------|
| **容器化** | Docker | 24.0+ | 环境一致性、快速部署 |
| **编排** | Docker Compose / K8s | - | 服务编排、自动扩缩容 |
| **CI/CD** | GitHub Actions / GitLab CI | - | 自动化测试、部署 |
| **反向代理** | Nginx | 1.25+ | 负载均衡、SSL终止 |
| **CDN** | Cloudflare / 阿里云CDN | - | 全球加速、DDoS防护 |

---

## 三、数据库设计

### 3.1 核心表结构

#### 用户系统

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user', 'guest')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    storage_quota BIGINT DEFAULT 1073741824, -- 1GB默认配额
    storage_used BIGINT DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户会话表
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户OAuth绑定表
CREATE TABLE user_oauth_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- google, github, wechat
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

#### 3D资产管理系统

```sql
-- 3D模型表
CREATE TABLE models_3d (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- product, character, scene, other
    tags TEXT[], -- 标签数组
    source_type VARCHAR(20) CHECK (source_type IN ('upload', 'generate', 'import')),
    generation_engine VARCHAR(50), -- hunyuan3d, triposr, custom
    
    -- 文件路径
    original_file_path TEXT, -- 原始上传文件
    glb_file_path TEXT, -- GLB格式
    splat_file_path TEXT, -- Splat格式
    thumbnail_path TEXT, -- 缩略图
    preview_video_path TEXT, -- 预览视频
    
    -- 元数据
    file_size BIGINT,
    polygon_count INTEGER,
    texture_resolution VARCHAR(20), -- 1024x1024, 2048x2048
    format_version VARCHAR(20),
    
    -- 生成参数
    generation_params JSONB, -- 保存生成时的参数
    quality_score FLOAT, -- 质量评分 0-1
    processing_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- 访问控制
    visibility VARCHAR(20) DEFAULT 'private' 
        CHECK (visibility IN ('public', 'private', 'unlisted')),
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- 统计
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- 模型版本表
CREATE TABLE model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models_3d(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    change_log TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模型收藏表
CREATE TABLE model_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model_id UUID REFERENCES models_3d(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, model_id)
);

-- 模型评论表
CREATE TABLE model_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models_3d(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES model_comments(id),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_models_user_id ON models_3d(user_id);
CREATE INDEX idx_models_category ON models_3d(category);
CREATE INDEX idx_models_visibility ON models_3d(visibility);
CREATE INDEX idx_models_created ON models_3d(created_at DESC);
CREATE INDEX idx_models_tags ON models_3d USING GIN(tags);
```

#### 模板管理系统

```sql
-- 模板表
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL友好的标识符
    description TEXT,
    category VARCHAR(50), -- gallery, book, showcase, custom
    thumbnail_url TEXT,
    preview_url TEXT,
    
    -- 模板配置
    layout_config JSONB NOT NULL, -- 布局配置
    style_config JSONB, -- 样式配置
    component_config JSONB, -- 组件配置
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    rating FLOAT DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户自定义页面表
CREATE TABLE user_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    
    -- 页面配置（覆盖模板默认配置）
    page_config JSONB,
    custom_css TEXT,
    custom_js TEXT,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 页面区块表（支持拖拽编辑）
CREATE TABLE page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES user_pages(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- hero, gallery, text, video, 3d_viewer
    position INTEGER NOT NULL, -- 排序位置
    config JSONB NOT NULL, -- 区块配置
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_slug ON templates(slug);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_pages_user_id ON user_pages(user_id);
CREATE INDEX idx_pages_slug ON user_pages(slug);
CREATE INDEX idx_sections_page_id ON page_sections(page_id);
```

#### 订单与支付系统

```sql
-- 套餐表
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    
    -- 配额
    storage_quota BIGINT NOT NULL, -- 存储空间
    monthly_generations INTEGER NOT NULL, -- 每月生成次数
    max_model_size BIGINT, -- 最大模型大小
    priority_queue BOOLEAN DEFAULT FALSE, -- 优先队列
    
    features JSONB, -- 功能列表
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订阅表
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    
    stripe_subscription_id VARCHAR(255), -- Stripe订阅ID
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    
    payment_method VARCHAR(50), -- stripe, alipay, wechat
    stripe_payment_intent_id VARCHAR(255),
    
    items JSONB NOT NULL, -- 订单项
    metadata JSONB,
    
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

#### 系统日志与审计

```sql
-- 操作日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- create_model, delete_model, update_profile
    resource_type VARCHAR(50),
    resource_id UUID,
    
    ip_address INET,
    user_agent TEXT,
    
    request_data JSONB,
    response_data JSONB,
    
    status VARCHAR(20), -- success, failed
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API调用日志表
CREATE TABLE api_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    
    status_code INTEGER,
    response_time_ms INTEGER,
    
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_api_logs_created ON api_call_logs(created_at DESC);
```

### 3.2 数据库优化策略

1. **分区表**：对`audit_logs`和`api_call_logs`按月分区
2. **索引优化**：根据查询模式添加复合索引
3. **连接池**：PgBouncer连接池，最大连接数100
4. **读写分离**：主库写，从库读（可选）
5. **定期维护**：VACUUM ANALYZE每周执行
6. **备份策略**：每日全量备份，每小时增量备份

---

## 四、API接口设计

### 4.1 API规范

- **版本控制**：`/api/v1/...`
- **认证方式**：Bearer Token (JWT)
- **响应格式**：统一JSON格式
- **错误码**：HTTP状态码 + 业务错误码
- **限流**：基于IP和用户ID的速率限制

### 4.2 核心API端点

#### 认证模块

```python
# POST /api/v1/auth/register
# 用户注册
Request:
{
    "username": "string",
    "email": "string",
    "password": "string",
    "phone": "string (optional)"
}

Response:
{
    "code": 200,
    "message": "注册成功",
    "data": {
        "user_id": "uuid",
        "access_token": "jwt_token",
        "refresh_token": "jwt_token"
    }
}

# POST /api/v1/auth/login
# 用户登录
Request:
{
    "email": "string",
    "password": "string"
}

Response:
{
    "code": 200,
    "data": {
        "access_token": "jwt_token",
        "refresh_token": "jwt_token",
        "expires_in": 3600
    }
}

# POST /api/v1/auth/refresh
# 刷新Token
Request:
{
    "refresh_token": "string"
}

# POST /api/v1/auth/logout
# 登出
```

#### 3D模型生成模块

```python
# POST /api/v1/models/generate
# 生成3D模型
Request (multipart/form-data):
{
    "image": File,
    "engine": "hunyuan3d | triposr",
    "quality": "standard | high",
    "enable_texture": true,
    "webhook_url": "string (optional)"
}

Response:
{
    "code": 200,
    "data": {
        "task_id": "uuid",
        "status": "queued",
        "estimated_time": 30
    }
}

# GET /api/v1/models/tasks/{task_id}
# 查询任务状态
Response:
{
    "code": 200,
    "data": {
        "task_id": "uuid",
        "status": "processing | completed | failed",
        "progress": 50,
        "model_id": "uuid (when completed)",
        "error": "string (when failed)"
    }
}

# GET /api/v1/models
# 获取模型列表（支持分页、筛选、搜索）
Query Params:
- page: int
- page_size: int
- category: string
- tag: string
- sort_by: created_at | view_count | like_count
- order: asc | desc

Response:
{
    "code": 200,
    "data": {
        "items": [...],
        "total": 100,
        "page": 1,
        "page_size": 20
    }
}

# GET /api/v1/models/{model_id}
# 获取模型详情

# PUT /api/v1/models/{model_id}
# 更新模型信息

# DELETE /api/v1/models/{model_id}
# 删除模型

# POST /api/v1/models/{model_id}/convert
# 格式转换（GLB -> Splat）
Request:
{
    "target_format": "splat | glb | obj"
}

# POST /api/v1/models/{model_id}/download
# 生成下载链接
Response:
{
    "code": 200,
    "data": {
        "download_url": "signed_url",
        "expires_in": 3600
    }
}
```

#### 模板管理模块

```python
# GET /api/v1/templates
# 获取模板列表
Query Params:
- category: string
- is_premium: boolean
- sort_by: usage_count | rating

# GET /api/v1/templates/{template_id}
# 获取模板详情

# POST /api/v1/pages
# 创建自定义页面
Request:
{
    "title": "string",
    "slug": "string",
    "template_id": "uuid",
    "page_config": {}
}

# PUT /api/v1/pages/{page_id}
# 更新页面配置

# POST /api/v1/pages/{page_id}/sections
# 添加页面区块
Request:
{
    "section_type": "hero | gallery | text",
    "position": 0,
    "config": {}
}

# PUT /api/v1/pages/{page_id}/sections/{section_id}
# 更新区块配置

# DELETE /api/v1/pages/{page_id}/sections/{section_id}
# 删除区块

# POST /api/v1/pages/{page_id}/publish
# 发布页面
```

#### 用户管理模块（Admin）

```python
# GET /api/v1/admin/users
# 获取用户列表（管理员）

# PUT /api/v1/admin/users/{user_id}
# 更新用户信息（管理员）

# PUT /api/v1/admin/users/{user_id}/ban
# 封禁用户

# GET /api/v1/admin/statistics
# 获取系统统计数据
Response:
{
    "code": 200,
    "data": {
        "total_users": 1000,
        "total_models": 5000,
        "storage_used": "100GB",
        "daily_active_users": 200,
        "revenue_today": 1000.00
    }
}
```

#### WebSocket实时推送

```python
# ws://domain.com/ws/notifications
# 实时通知通道

Message Format:
{
    "type": "task_update | system_notification",
    "data": {
        "task_id": "uuid",
        "status": "processing",
        "progress": 50
    }
}
```

### 4.3 API安全机制

1. **JWT认证**：Access Token有效期1小时，Refresh Token有效期7天
2. **速率限制**：
   - 未认证用户：100次/小时
   - 普通用户：1000次/小时
   - VIP用户：5000次/小时
3. **CORS配置**：白名单域名
4. **输入验证**：Pydantic严格验证
5. **SQL注入防护**：ORM参数化查询
6. **XSS防护**：输出转义
7. **CSRF防护**：SameSite Cookie
8. **敏感数据加密**：密码bcrypt加密，敏感字段AES加密

---

## 五、功能模块详细任务清单

### 5.1 Phase 1: 基础设施搭建（第1-2周）

#### Week 1: 服务器与环境准备

**任务1.1.1: GPU服务器配置**
- [ ] 购买/租赁GPU服务器（RTX 4090 24GB或A100 80GB）
- [ ] 安装Ubuntu 22.04 LTS操作系统
- [ ] 配置SSH密钥登录，禁用密码登录
- [ ] 配置防火墙（UFW），仅开放必要端口（22, 80, 443）
- [ ] 安装NVIDIA驱动（535+）
- [ ] 安装CUDA Toolkit 12.1
- [ ] 安装cuDNN 8.9
- [ ] 验证GPU可用性：`nvidia-smi`

**任务1.1.2: Docker环境搭建**
- [ ] 安装Docker Engine 24.0+
- [ ] 安装Docker Compose v2
- [ ] 配置Docker镜像加速器（阿里云/腾讯云）
- [ ] 创建Docker网络：`web3d-network`
- [ ] 编写基础Dockerfile（Python 3.10 + CUDA）

**任务1.1.3: 数据库部署**
- [ ] 部署PostgreSQL 16（Docker）
  - [ ] 配置持久化卷
  - [ ] 设置超级用户密码
  - [ ] 创建应用数据库：`web3d_production`
  - [ ] 创建只读用户：`web3d_reader`
  - [ ] 启用pg_stat_statements扩展
- [ ] 部署Redis 7.2（Docker）
  - [ ] 配置持久化（RDB + AOF）
  - [ ] 设置密码认证
  - [ ] 配置最大内存：4GB
  - [ ] 启用LRU淘汰策略
- [ ] 部署MinIO（Docker）
  - [ ] 创建Bucket：`web3d-models`, `web3d-thumbnails`, `web3d-backups`
  - [ ] 配置访问密钥
  - [ ] 设置生命周期规则（临时文件7天过期）

**任务1.1.4: 消息队列部署**
- [ ] 部署RabbitMQ 3.12（Docker）
  - [ ] 创建虚拟主机：`web3d`
  - [ ] 创建用户：`celery_user`
  - [ ] 配置死信队列
  - [ ] 启用Management Plugin

**任务1.1.5: 监控基础设施**
- [ ] 部署Prometheus（Docker）
  - [ ] 配置scrape targets
  - [ ] 配置告警规则
- [ ] 部署Grafana（Docker）
  - [ ] 添加Prometheus数据源
  - [ ] 导入预设Dashboard
- [ ] 部署Loki + Promtail（日志聚合）

#### Week 2: 项目初始化

**任务1.2.1: 后端项目初始化**
- [ ] 创建FastAPI项目结构
  ```
  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py              # 应用入口
  │   ├── config.py            # 配置管理
  │   ├── database.py          # 数据库连接
  │   ├── dependencies.py      # 依赖注入
  │   ├── models/              # SQLAlchemy模型
  │   ├── schemas/             # Pydantic模式
  │   ├── services/            # 业务逻辑
  │   ├── api/                 # API路由
  │   │   ├── v1/
  │   │   │   ├── auth.py
  │   │   │   ├── models.py
  │   │   │   ├── templates.py
  │   │   │   └── admin.py
  │   ├── core/                # 核心功能
  │   │   ├── security.py      # 安全相关
  │   │   ├── celery_app.py    # Celery配置
  │   │   └── websocket.py     # WebSocket管理
  │   ├── tasks/               # Celery任务
  │   │   ├── generate_model.py
  │   │   ├── convert_format.py
  │   │   └── cleanup.py
  │   └── utils/               # 工具函数
  ├── tests/                   # 测试
  ├── alembic/                 # 数据库迁移
  ├── requirements.txt
  ├── Dockerfile
  └── docker-compose.yml
  ```
- [ ] 配置环境变量（`.env.example`）
- [ ] 安装Python依赖
- [ ] 配置Alembic数据库迁移
- [ ] 编写健康检查端点：`GET /health`

**任务1.2.2: 前端项目初始化**
- [ ] 创建React项目（Vite + TypeScript）
- [ ] 安装核心依赖：
  - [ ] React 18
  - [ ] Three.js + @react-three/fiber + @react-three/drei
  - [ ] Spark 2.0
  - [ ] Zustand
  - [ ] React Router
  - [ ] Axios
  - [ ] Ant Design / MUI
- [ ] 配置TypeScript严格模式
- [ ] 配置ESLint + Prettier
- [ ] 配置Husky预提交钩子
- [ ] 创建项目目录结构

**任务1.2.3: CI/CD流水线配置**
- [ ] 创建GitHub Actions工作流
  - [ ] 代码检查（linting）
  - [ ] 单元测试
  - [ ] 构建Docker镜像
  - [ ] 推送到镜像仓库
- [ ] 配置自动部署（staging环境）

---

### 5.2 Phase 2: 后端核心开发（第3-5周）

#### Week 3: 认证与授权系统

**任务2.1.1: JWT认证实现**
- [ ] 实现JWT Token生成与验证
  - [ ] Access Token（1小时有效期）
  - [ ] Refresh Token（7天有效期）
  - [ ] Token黑名单机制（Redis）
- [ ] 实现密码加密（bcrypt）
- [ ] 实现邮箱验证流程
  - [ ] 发送验证邮件（SMTP/SendGrid）
  - [ ] 验证Token生成与校验
- [ ] 实现密码重置流程
  - [ ] 生成重置链接
  - [ ] 验证重置Token
  - [ ] 更新密码

**任务2.1.2: OAuth2第三方登录**
- [ ] 集成Google OAuth
  - [ ] 创建Google Cloud项目
  - [ ] 配置OAuth Consent Screen
  - [ ] 实现回调处理
- [ ] 集成GitHub OAuth
- [ ] 集成微信登录（国内用户）
- [ ] 实现账号绑定/解绑功能

**任务2.1.3: RBAC权限系统**
- [ ] 定义角色：admin, editor, user, guest
- [ ] 定义权限点：
  - [ ] `models:create`, `models:read`, `models:update`, `models:delete`
  - [ ] `templates:create`, `templates:read`, ...
  - [ ] `users:manage`, `system:monitor`
- [ ] 实现权限装饰器：`@require_permission("models:create")`
- [ ] 实现中间件：验证Token有效性

**任务2.1.4: 会话管理**
- [ ] 实现会话存储（Redis）
- [ ] 实现单设备登录限制（可选）
- [ ] 实现活跃会话列表
- [ ] 实现强制登出功能

#### Week 4: 3D模型生成服务

**任务2.2.1: Hunyuan3D-2mini集成**
- [ ] 安装Hunyuan3D-2依赖
- [ ] 下载模型权重（6GB）
- [ ] 封装生成Pipeline
  ```python
  class Hunyuan3DGenerator:
      def __init__(self):
          self.shape_pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(...)
          self.tex_pipeline = Hunyuan3DPaintPipeline.from_pretrained(...)
      
      async def generate(self, image: bytes, enable_texture: bool = True) -> dict:
          # 1. 形状生成
          mesh = self.shape_pipeline(image=image)[0]
          
          # 2. 纹理生成（可选）
          if enable_texture:
              mesh = self.tex_pipeline(mesh, image=image)
          
          # 3. 导出GLB
          glb_path = f"/tmp/{uuid.uuid4()}.glb"
          mesh.export(glb_path)
          
          return {"glb_path": glb_path, "format": "glb"}
  ```
- [ ] 实现显存管理（生成后释放）
- [ ] 实现并发控制（信号量限制同时生成数量）
- [ ] 编写单元测试

**任务2.2.2: TripoSR集成**
- [ ] 安装TripoSR依赖
- [ ] 下载模型权重
- [ ] 封装生成Pipeline
- [ ] 实现快速生成模式（无纹理）
- [ ] 实现高质量模式（带纹理）

**任务2.2.3: 异步任务队列**
- [ ] 配置Celery Worker
  - [ ] 定义任务队列：`model_generation`, `format_conversion`
  - [ ] 配置重试策略（最多3次）
  - [ ] 配置超时时间（300秒）
- [ ] 实现任务状态追踪
  - [ ] 任务创建时写入Redis
  - [ ] 任务进度更新（每10%）
  - [ ] 任务完成/失败通知
- [ ] 实现WebSocket实时推送
  - [ ] 监听Celery任务状态
  - [ ] 向前端推送进度更新

**任务2.2.4: 文件存储服务**
- [ ] 实现MinIO上传服务
  ```python
  class StorageService:
      async def upload_file(self, file: bytes, filename: str, bucket: str = "web3d-models") -> str:
          # 生成唯一文件名
          unique_name = f"{uuid.uuid4()}_{filename}"
          
          # 上传到MinIO
          self.minio_client.put_object(bucket, unique_name, file)
          
          # 返回访问URL
          return self.minio_client.presigned_get_object(bucket, unique_name, expires=3600)
  ```
- [ ] 实现文件下载服务（预签名URL）
- [ ] 实现文件删除服务
- [ ] 实现文件元数据存储（数据库）
- [ ] 实现文件去重（SHA256哈希）

#### Week 5: 资产管理API

**任务2.3.1: 模型CRUD API**
- [ ] 实现创建模型接口
  - [ ] 接收上传文件
  - [ ] 验证文件格式（.glb, .obj, .fbx）
  - [ ] 提取元数据（顶点数、面数、纹理分辨率）
  - [ ] 生成缩略图（Three.js离屏渲染）
  - [ ] 存储到MinIO
  - [ ] 写入数据库
- [ ] 实现查询模型列表
  - [ ] 分页支持
  - [ ] 筛选（分类、标签、可见性）
  - [ ] 排序（创建时间、浏览量、点赞数）
  - [ ] 全文搜索（PostgreSQL tsvector）
- [ ] 实现获取模型详情
- [ ] 实现更新模型信息
- [ ] 实现删除模型（软删除）
  - [ ] 标记为deleted
  - [ ] 异步清理文件（7天后）

**任务2.3.2: 格式转换服务**
- [ ] 实现GLB到Splat转换
  - [ ] 调用Blender脚本（后台进程）
  - [ ] 或使用trimesh库直接转换
  - [ ] 优化高斯参数（位置、颜色、不透明度）
- [ ] 实现OBJ/GLTF导入
- [ ] 实现批量转换
- [ ] 实现转换任务队列

**任务2.3.3: 社交功能API**
- [ ] 实现点赞/取消点赞
- [ ] 实现收藏/取消收藏
- [ ] 实现评论系统
  - [ ] 创建评论
  - [ ] 回复评论（嵌套）
  - [ ] 删除评论
  - [ ] 评论审核（管理员）
- [ ] 实现分享链接生成

**任务2.3.4: 统计分析API**
- [ ] 实现模型浏览量统计
  - [ ] 每次访问+1（Redis计数器）
  - [ ] 每小时同步到数据库
- [ ] 实现下载量统计
- [ ] 实现用户行为分析
  - [ ] 平均停留时间
  - [ ] 转化率（浏览->下载）

---

### 5.3 Phase 3: 管理后台开发（第6-8周）

#### Week 6: 管理员Dashboard

**任务3.1.1: Dashboard首页**
- [ ] 实现关键指标卡片
  - [ ] 总用户数
  - [ ] 今日活跃用户
  - [ ] 总模型数
  - [ ] 今日新增模型
  - [ ] 存储空间使用率
  - [ ] 今日收入
- [ ] 实现趋势图表
  - [ ] 用户增长曲线（近30天）
  - [ ] 模型生成量趋势
  - [ ] 收入趋势
- [ ] 实现实时活动流
  - [ ] 最新注册用户
  - [ ] 最新生成的模型
  - [ ] 最新订单

**任务3.1.2: 用户管理界面**
- [ ] 实现用户列表表格
  - [ ] 显示：用户名、邮箱、角色、状态、注册时间
  - [ ] 搜索：用户名、邮箱
  - [ ] 筛选：角色、状态
  - [ ] 排序：注册时间、最后登录
- [ ] 实现用户详情弹窗
  - [ ] 基本信息
  - [ ] 存储使用情况
  - [ ] 模型列表
  - [ ] 订单历史
- [ ] 实现用户操作
  - [ ] 编辑用户信息
  - [ ] 修改角色
  - [ ] 封禁/解封
  - [ ] 重置密码
  - [ ] 删除用户（谨慎操作）

**任务3.1.3: 模型管理界面**
- [ ] 实现模型列表
  - [ ] 网格视图/列表视图切换
  - [ ] 显示缩略图、名称、作者、创建时间
  - [ ] 批量操作：删除、设为精选
- [ ] 实现模型审核
  - [ ] 待审核模型列表
  - [ ] 审核通过/拒绝
  - [ ] 拒绝原因填写
- [ ] 实现精选模型管理
  - [ ] 设为精选
  - [ ] 取消精选
  - [ ] 排序调整

#### Week 7: 模板管理系统

**任务3.2.1: 模板编辑器**
- [ ] 实现可视化模板编辑器
  - [ ] 拖拽式布局设计
  - [ ] 实时预览
  - [ ] 撤销/重做
- [ ] 实现区块组件库
  - [ ] Hero区块（大图+标题）
  - [ ] Gallery区块（3D模型网格）
  - [ ] Text区块（富文本）
  - [ ] Video区块（嵌入视频）
  - [ ] 3D Viewer区块（交互式查看器）
  - [ ] Contact区块（联系表单）
- [ ] 实现样式配置面板
  - [ ] 颜色选择器
  - [ ] 字体选择
  - [ ] 间距调整
  - [ ] 背景设置（纯色/渐变/图片）

**任务3.2.2: 模板市场**
- [ ] 实现模板列表页面
  - [ ] 分类筛选
  - [ ] 搜索
  - [ ] 排序（热门、最新、评分）
- [ ] 实现模板详情页
  - [ ] 预览图轮播
  - [ ] 功能介绍
  - [ ] 用户评价
  - [ ] 使用按钮
- [ ] 实现模板评分系统
  - [ ] 星级评分
  - [ ] 文字评价

**任务3.2.3: 自定义页面管理**
- [ ] 实现页面列表
- [ ] 实现页面编辑器（复用模板编辑器）
- [ ] 实现页面发布/下架
- [ ] 实现SEO配置
  - [ ] Meta标题
  - [ ] Meta描述
  - [ ] 关键词
  - [ ] Open Graph标签

#### Week 8: 数据统计与监控

**任务3.3.1: 数据分析Dashboard**
- [ ] 实现用户分析
  - [ ] 新用户注册趋势
  - [ ] 活跃用户分布（地域、设备）
  - [ ] 用户留存率
- [ ] 实现内容分析
  - [ ] 热门模型排行
  - [ ] 热门分类
  - [ ] 热门标签云
- [ ] 实现收入分析
  - [ ] 收入来源分布
  - [ ] ARPU（每用户平均收入）
  - [ ] LTV（用户生命周期价值）

**任务3.3.2: 系统监控**
- [ ] 集成Prometheus指标
  - [ ] API响应时间
  - [ ] QPS
  - [ ] 错误率
  - [ ] GPU利用率
  - [ ] 内存使用率
- [ ] 配置告警规则
  - [ ] API响应时间>2s
  - [ ] 错误率>5%
  - [ ] GPU显存>90%
  - [ ] 磁盘空间>80%
- [ ] 实现告警通知
  - [ ] 邮件通知
  - [ ] Slack/Webhook通知

**任务3.3.3: 日志管理**
- [ ] 集成Loki日志聚合
- [ ] 实现日志查询界面
  - [ ] 按时间范围筛选
  - [ ] 按日志级别筛选
  - [ ] 关键字搜索
- [ ] 实现错误追踪
  - [ ] Sentry集成
  - [ ] 错误堆栈展示
  - [ ] 错误频率统计

---

### 5.4 Phase 4: 前端集成与优化（第9-10周）

#### Week 9: 官网页面开发

**任务4.1.1: 首页开发**
- [ ] 实现Hero区域
  - [ ] 3D背景动画（粒子效果）
  - [ ] 主标题+副标题
  - [ ] CTA按钮（开始使用/观看演示）
- [ ] 实现特性展示区
  - [ ] 图标+文字说明
  - [ ] 悬停动画
- [ ] 实现3D模型展示区
  - [ ] 精选模型轮播
  - [ ] 点击查看详情
- [ ] 实现用户评价区
- [ ] 实现FAQ区
- [ ] 实现Footer

**任务4.1.2: 产品展示页**
- [ ] 实现模型画廊
  - [ ] 瀑布流布局
  - [ ] 无限滚动加载
  - [ ] 筛选侧边栏（分类、标签、价格）
- [ ] 实现模型详情弹窗
  - [ ] 3D查看器（Spark 2.0）
  - [ ] 模型信息
  - [ ] 下载/购买按钮
  - [ ] 相关推荐

**任务4.1.3: 定价页面**
- [ ] 实现定价卡片
  - [ ] Free / Pro / Enterprise
  - [ ] 功能对比表
  - [ ] CTA按钮
- [ ] 实现常见问题

**任务4.1.4: 关于我们/联系我们**
- [ ] 团队介绍
- [ ] 联系方式
- [ ] 地图嵌入

#### Week 10: 用户中心与3D查看器

**任务4.2.1: 用户Dashboard**
- [ ] 实现个人信息页
  - [ ] 头像上传
  - [ ] 基本信息编辑
  - [ ] 密码修改
- [ ] 实现我的模型页
  - [ ] 模型列表
  - [ ] 上传新模型
  - [ ] 生成新模型
- [ ] 实现我的收藏页
- [ ] 实现订单历史页

**任务4.2.2: 3D模型生成向导**
- [ ] 实现步骤条
  - Step 1: 上传图片
  - Step 2: 选择引擎（Hunyuan3D/TripoSR）
  - Step 3: 配置参数（质量、是否纹理）
  - Step 4: 提交生成
- [ ] 实现实时进度显示
  - [ ] 进度条
  - [ ] 当前阶段提示
  - [ ] 预计剩余时间
- [ ] 实现生成结果预览
  - [ ] 3D查看器
  - [ ] 下载按钮
  - [ ] 重新生成按钮

**任务4.2.3: Spark 2.0集成**
- [ ] 封装SplatRenderer组件
  ```typescript
  interface SplatRendererProps {
    url: string;
    autoRotate?: boolean;
    showControls?: boolean;
    backgroundColor?: string;
  }
  
  export function SplatRenderer({ url, autoRotate, showControls, backgroundColor }: SplatRendererProps) {
    const { scene, camera } = useThree();
    const splatRef = useRef<SplatMesh>(null);
    
    useEffect(() => {
      const splat = new SplatMesh({ url });
      scene.add(splat);
      splatRef.current = splat;
      
      return () => {
        scene.remove(splat);
        splat.dispose();
      };
    }, [url]);
    
    // 自动旋转
    useFrame(() => {
      if (autoRotate && splatRef.current) {
        splatRef.current.rotation.y += 0.01;
      }
    });
    
    return null;
  }
  ```
- [ ] 实现控制器
  - [ ] 旋转
  - [ ] 缩放
  - [ ] 平移
  - [ ] 重置视角
- [ ] 实现全屏模式
- [ ] 实现截图功能
- [ ] 实现VR模式（可选）

**任务4.2.4: 移动端优化**
- [ ] 实现响应式布局
  - [ ] 断点：768px, 1024px, 1440px
  - [ ] 移动端导航（汉堡菜单）
- [ ] 优化3D渲染性能
  - [ ] 降低阴影质量
  - [ ] 减少后处理效果
  - [ ] 动态LOD
- [ ] 实现触摸手势
  - [ ] 单指旋转
  - [ ] 双指缩放
  - [ ] 双指平移
- [ ] 实现PWA
  - [ ] Service Worker
  - [ ] 离线缓存
  - [ ] 添加到主屏幕

---

### 5.5 Phase 5: 测试与上线（第11-12周）

#### Week 11: 全面测试

**任务5.1.1: 单元测试**
- [ ] 后端单元测试（pytest）
  - [ ] 认证模块测试（覆盖率>90%）
  - [ ] 模型生成服务测试
  - [ ] 文件存储服务测试
  - [ ] API端点测试
- [ ] 前端单元测试（Jest + React Testing Library）
  - [ ] 组件测试
  - [ ] Hooks测试
  - [ ] 工具函数测试
- [ ] 配置CI自动运行测试

**任务5.1.2: 集成测试**
- [ ] API集成测试
  - [ ] 完整业务流程测试（注册->登录->生成模型->下载）
  - [ ] 错误场景测试
- [ ] 数据库迁移测试
- [ ] 第三方服务Mock测试

**任务5.1.3: 性能测试**
- [ ] API压力测试（k6/Locust）
  - [ ] 并发用户：100, 500, 1000
  - [ ] 目标QPS：>1000
  - [ ] 目标响应时间：<200ms (P95)
- [ ] 3D渲染性能测试
  - [ ] 不同设备FPS测试
  - [ ] 内存占用测试
  - [ ] 加载时间测试
- [ ] 数据库性能测试
  - [ ] 复杂查询执行时间
  - [ ] 并发连接测试

**任务5.1.4: 安全测试**
- [ ] OWASP Top 10扫描
  - [ ] SQL注入测试
  - [ ] XSS测试
  - [ ] CSRF测试
  - [ ] 身份验证绕过测试
- [ ] 渗透测试
  - [ ] 手动测试关键流程
  - [ ] 漏洞扫描工具（Nessus/OpenVAS）
- [ ] 依赖漏洞扫描（Dependabot/Snyk）

#### Week 12: 部署与上线

**任务5.2.1: Docker容器化**
- [ ] 编写生产环境Dockerfile
  - [ ] 多阶段构建
  - [ ] 最小化镜像体积
  - [ ] 非root用户运行
- [ ] 编写docker-compose.prod.yml
  - [ ] 服务定义
  - [ ] 网络配置
  - [ ] 卷挂载
  - [ ] 环境变量
- [ ] 构建并测试Docker镜像

**任务5.2.2: CDN配置**
- [ ] 配置Cloudflare/阿里云CDN
  - [ ] 添加域名
  - [ ] 配置SSL证书
  - [ ] 配置缓存规则
    - 静态资源：1年
    - API响应：不缓存
  - [ ] 启用DDoS防护
  - [ ] 启用WAF

**任务5.2.3: 域名与SSL**
- [ ] 购买域名
- [ ] 配置DNS记录
  - [ ] A记录指向服务器IP
  - [ ] CNAME记录用于CDN
- [ ] 申请SSL证书（Let's Encrypt）
- [ ] 配置HTTPS重定向
- [ ] 配置HSTS

**任务5.2.4: 生产环境部署**
- [ ] 服务器准备
  - [ ] 安装Docker
  - [ ] 配置防火墙
  - [ ] 配置监控代理
- [ ] 部署数据库
  - [ ] 初始化Schema
  - [ ] 运行迁移
  - [ ] 导入初始数据（模板、套餐）
- [ ] 部署后端服务
  - [ ] 启动FastAPI
  - [ ] 启动Celery Worker
  - [ ] 启动Celery Beat（定时任务）
- [ ] 部署前端
  - [ ] 构建生产版本
  - [ ] 上传到CDN/对象存储
- [ ] 配置Nginx反向代理
- [ ] 验证部署
  - [ ] 健康检查
  - [ ] 端到端测试

**任务5.2.5: 监控与告警配置**
- [ ] 配置Prometheus监控
- [ ] 配置Grafana Dashboard
- [ ] 配置告警通知渠道
- [ ] 配置日志聚合（Loki）
- [ ] 配置错误追踪（Sentry）

**任务5.2.6: 备份与灾难恢复**
- [ ] 配置数据库自动备份
  - [ ] 每日全量备份
  - [ ] 每小时增量备份
  - [ ] 保留30天
- [ ] 配置文件存储备份
- [ ] 编写灾难恢复手册
- [ ] 进行恢复演练

**任务5.2.7: 正式上线**
- [ ] 灰度发布（10%流量）
- [ ] 监控系统稳定性
- [ ] 逐步增加流量（50% -> 100%）
- [ ] 收集用户反馈
- [ ] 修复紧急Bug

---

## 六、安全设计方案

### 6.1 认证与授权

1. **JWT安全**
   - Access Token有效期：1小时
   - Refresh Token有效期：7天
   - Token黑名单（Redis）
   - 密钥轮换（每30天）

2. **密码安全**
   - bcrypt加密（cost factor 12）
   - 密码强度要求（最少8位，包含大小写+数字）
   - 登录失败锁定（5次失败锁定15分钟）

3. **会话安全**
   - HttpOnly Cookie
   - SameSite=Strict
   - Secure Flag（HTTPS only）

### 6.2 数据安全

1. **传输加密**
   - TLS 1.3
   - HSTS启用
   - 证书自动续期

2. **存储加密**
   - 敏感字段AES-256加密
   - 数据库透明加密（TDE）
   - 备份加密

3. **数据脱敏**
   - 日志中脱敏手机号、邮箱
   - API响应中隐藏敏感信息

### 6.3 API安全

1. **速率限制**
   - 基于IP：100次/小时（未认证）
   - 基于用户：1000次/小时（普通用户）
   - 突发流量控制

2. **输入验证**
   - Pydantic严格验证
   - 文件类型白名单
   - 文件大小限制（100MB）

3. **输出编码**
   - HTML实体编码
   - JSON Content-Type

### 6.4 基础设施安全

1. **网络安全**
   - 防火墙规则（仅开放80/443）
   - VPC内网隔离
   - DDoS防护（Cloudflare）

2. **访问控制**
   - SSH密钥登录
   - 堡垒机（可选）
   - 最小权限原则

3. **漏洞管理**
   - 定期依赖更新
   - 安全扫描（每周）
   - 补丁管理

---

## 七、性能优化方案

### 7.1 后端优化

1. **数据库优化**
   - 连接池（PgBouncer）
   - 查询优化（EXPLAIN ANALYZE）
   - 索引优化
   - 读写分离（可选）

2. **缓存策略**
   - Redis缓存热点数据
   - CDN缓存静态资源
   - 浏览器缓存（Cache-Control）

3. **异步处理**
   - Celery异步任务
   - WebSocket实时推送
   - 后台批处理

### 7.2 前端优化

1. **代码分割**
   - 路由懒加载
   - 组件懒加载
   - 动态导入

2. **资源优化**
   - 图片压缩（WebP）
   - 字体子集化
   - Tree Shaking

3. **渲染优化**
   - React.memo
   - useMemo/useCallback
   - 虚拟列表

### 7.3 3D渲染优化

1. **Spark 2.0优化**
   - LoD细节层级
   - 渐进式加载
   - 虚拟内存管理

2. **Three.js优化**
   - 几何体合并
   - 材质复用
   - 视锥剔除

---

## 八、部署架构

### 8.1 生产环境拓扑

```
                    ┌──────────────┐
                    │   Cloudflare  │
                    │   (CDN+WAF)   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Nginx LB   │
                    │  (SSL终止)    │
                    └──┬───────┬───┘
                       │       │
              ┌────────▼┐  ┌───▼────────┐
              │ Frontend │  │  Backend   │
              │  (Static)│  │ (FastAPI)  │
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
                    └─────────────────────────┘
```

### 8.2 扩展策略

1. **水平扩展**
   - 后端服务：多实例部署
   - Celery Worker：动态增减
   - 数据库：读写分离+分片

2. **垂直扩展**
   - GPU升级
   - 内存扩容
   - SSD存储

---

## 九、监控与运维

### 9.1 监控指标

1. **应用指标**
   - QPS
   - 响应时间（P50/P95/P99）
   - 错误率
   - 活跃用户数

2. **系统指标**
   - CPU使用率
   - 内存使用率
   - GPU利用率
   - 磁盘I/O

3. **业务指标**
   - 日活/月活
   - 转化率
   - 收入
   - 用户留存

### 9.2 告警规则

| 指标 | 阈值 | 级别 | 通知方式 |
|------|------|------|---------|
| API响应时间P95 | >2s | Warning | Slack |
| API错误率 | >5% | Critical | Slack + 电话 |
| GPU显存使用率 | >90% | Warning | Slack |
| 磁盘空间 | >80% | Warning | 邮件 |
| 数据库连接数 | >80% | Critical | Slack + 电话 |

### 9.3 运维手册

1. **日常运维**
   - 日志检查（每日）
   - 备份验证（每周）
   - 安全扫描（每周）
   - 依赖更新（每月）

2. **故障处理**
   - 服务宕机重启流程
   - 数据库恢复流程
   - 数据回滚流程

3. **容量规划**
   - 用户增长预测
   - 存储需求预测
   - GPU资源规划

---

## 十、里程碑计划

### Milestone 1: MVP上线（第4周末）
- ✅ 用户注册/登录
- ✅ 3D模型生成（Hunyuan3D-2mini）
- ✅ 模型查看器（Spark 2.0）
- ✅ 基础管理后台

### Milestone 2: 功能完善（第8周末）
- ✅ 模板管理系统
- ✅ 自定义页面
- ✅ 社交功能（点赞/评论/收藏）
- ✅ 数据统计Dashboard

### Milestone 3: 商业化（第10周末）
- ✅ 订阅系统
- ✅ 支付集成
- ✅ 高级功能（高清生成、优先队列）
- ✅ 移动端优化

### Milestone 4: 生产就绪（第12周末）
- ✅ 全面测试通过
- ✅ 安全审计完成
- ✅ 性能达标
- ✅ 正式部署上线

---

## 附录

### A. 开发规范

1. **代码规范**
   - Python: PEP 8 + Black格式化
   - TypeScript: ESLint + Prettier
   - 提交信息：Conventional Commits

2. **Git分支策略**
   - main: 生产分支
   - staging: 预发布分支
   - feature/*: 功能分支
   - hotfix/*: 紧急修复分支

3. **文档规范**
   - API文档：OpenAPI/Swagger
   - 代码注释：Google Style
   - README：每个模块必须有

### B. 参考资源

- FastAPI官方文档：https://fastapi.tiangolo.com/
- React Three Fiber文档：https://docs.pmnd.rs/react-three-fiber/
- Spark 2.0文档：https://github.com/sparkjsdev/spark
- PostgreSQL最佳实践：https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server

---

**文档版本**：v1.0  
**最后更新**：2025年4月18日  
**维护者**：Web3D项目组  
**审批人**：技术总监
