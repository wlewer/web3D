# Web3D平台API接口详细设计文档

> 📅 创建日期：2025年4月18日  
> 📄 文档版本：v1.0  
> 🎯 目标：企业级RESTful API设计规范  
> 🔒 安全标准：OWASP Top 10防护

---

## 📚 目录

1. [API设计规范](#一api设计规范)
2. [认证模块](#二认证模块)
3. [用户模块](#三用户模块)
4. [3D模型模块](#四3d模型模块)
5. [模板模块](#五模板模块)
6. [页面模块](#六页面模块)
7. [订单支付模块](#七订单支付模块)
8. [管理后台模块](#八管理后台模块)
9. [WebSocket实时推送](#九websocket实时推送)
10. [错误码定义](#十错误码定义)

---

## 一、API设计规范

### 1.1 基础规范

- **协议**: HTTPS (TLS 1.3)
- **格式**: JSON (application/json)
- **编码**: UTF-8
- **版本控制**: URL路径版本 `/api/v1/...`
- **时区**: UTC (ISO 8601格式)

### 1.2 请求规范

#### 请求头

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>  # 用于链路追踪
```

#### 查询参数

```
GET /api/v1/models?page=1&page_size=20&category=product&sort_by=created_at&order=desc
```

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | int | 否 | 页码 | 1 |
| page_size | int | 否 | 每页数量 (10-100) | 20 |
| category | string | 否 | 分类筛选 | - |
| sort_by | string | 否 | 排序字段 | created_at |
| order | string | 否 | 排序方向 (asc/desc) | desc |

### 1.3 响应规范

#### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 业务数据
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-04-18T10:30:00Z"
  }
}
```

#### 分页响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-04-18T10:30:00Z"
  }
}
```

#### 错误响应

```json
{
  "code": 400,
  "message": "请求参数错误",
  "error": {
    "type": "validation_error",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-04-18T10:30:00Z"
  }
}
```

### 1.4 HTTP状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|---------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功（无返回内容） |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或Token失效 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如重复创建） |
| 422 | Unprocessable Entity | 业务逻辑错误 |
| 429 | Too Many Requests | 速率限制 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务不可用（维护中） |

### 1.5 速率限制

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1618876800
```

| 用户类型 | 限制 | 时间窗口 |
|---------|------|---------|
| 未认证 | 100次 | 每小时 |
| 普通用户 | 1000次 | 每小时 |
| VIP用户 | 5000次 | 每小时 |
| 管理员 | 10000次 | 每小时 |

---

## 二、认证模块

### 2.1 用户注册

**端点**: `POST /api/v1/auth/register`

**请求体**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+8613800138000",
  "invite_code": "ABC123"  // 可选
}
```

**验证规则**:
- username: 3-50字符，字母数字下划线
- email: 有效邮箱格式
- password: 最少8位，包含大小写字母+数字+特殊字符
- phone: 可选，有效手机号格式

**成功响应** (201):
```json
{
  "code": 201,
  "message": "注册成功，请查收验证邮件",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

**错误响应**:
```json
{
  "code": 409,
  "message": "用户名或邮箱已存在",
  "error": {
    "type": "conflict_error",
    "details": [
      {
        "field": "email",
        "message": "该邮箱已被注册"
      }
    ]
  }
}
```

---

### 2.2 用户登录

**端点**: `POST /api/v1/auth/login`

**请求体**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "remember_me": false  // 可选，默认false
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user_id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "avatar_url": "https://...",
    "role": "user",
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600,
    "storage_quota": 1073741824,
    "storage_used": 0
  }
}
```

**错误响应** (401):
```json
{
  "code": 401,
  "message": "邮箱或密码错误",
  "error": {
    "type": "authentication_error",
    "details": []
  }
}
```

---

### 2.3 刷新Token

**端点**: `POST /api/v1/auth/refresh`

**请求体**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "Token刷新成功",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600
  }
}
```

---

### 2.4 用户登出

**端点**: `POST /api/v1/auth/logout`

**请求头**:
```http
Authorization: Bearer <access_token>
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "登出成功"
}
```

---

### 2.5 邮箱验证

**端点**: `POST /api/v1/auth/verify-email`

**请求体**:
```json
{
  "token": "verification_token_from_email"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "邮箱验证成功"
}
```

---

### 2.6 密码重置请求

**端点**: `POST /api/v1/auth/forgot-password`

**请求体**:
```json
{
  "email": "john@example.com"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "密码重置链接已发送到您的邮箱"
}
```

---

### 2.7 密码重置确认

**端点**: `POST /api/v1/auth/reset-password`

**请求体**:
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass456!"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "密码重置成功"
}
```

---

### 2.8 OAuth2登录

**端点**: `POST /api/v1/auth/oauth/{provider}`

**路径参数**:
- provider: `google` | `github` | `wechat`

**请求体**:
```json
{
  "code": "authorization_code_from_oauth_provider",
  "redirect_uri": "https://yourapp.com/callback"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user_id": "uuid",
    "username": "john_doe",
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600,
    "is_new_user": false
  }
}
```

---

## 三、用户模块

### 3.1 获取当前用户信息

**端点**: `GET /api/v1/users/me`

**请求头**:
```http
Authorization: Bearer <access_token>
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "phone": "+8613800138000",
    "avatar_url": "https://...",
    "role": "user",
    "status": "active",
    "storage_quota": 1073741824,
    "storage_used": 524288000,
    "monthly_generations": 100,
    "generations_used": 25,
    "subscription": {
      "plan": "free",
      "status": "active",
      "expires_at": null
    },
    "created_at": "2025-01-01T00:00:00Z",
    "last_login_at": "2025-04-18T10:00:00Z"
  }
}
```

---

### 3.2 更新用户信息

**端点**: `PUT /api/v1/users/me`

**请求体**:
```json
{
  "username": "new_username",
  "phone": "+8613900139000",
  "avatar_url": "https://..."
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "用户信息更新成功",
  "data": {
    "id": "uuid",
    "username": "new_username",
    "phone": "+8613900139000",
    "avatar_url": "https://..."
  }
}
```

---

### 3.3 上传头像

**端点**: `POST /api/v1/users/me/avatar`

**请求**: multipart/form-data
```
file: <image_file>
```

**验证规则**:
- 文件类型: jpg, png, webp
- 文件大小: < 5MB
- 图片尺寸: 最小200x200px

**成功响应** (200):
```json
{
  "code": 200,
  "message": "头像上传成功",
  "data": {
    "avatar_url": "https://cdn.example.com/avatars/uuid.jpg"
  }
}
```

---

### 3.4 修改密码

**端点**: `PUT /api/v1/users/me/password`

**请求体**:
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

---

### 3.5 获取活跃会话列表

**端点**: `GET /api/v1/users/me/sessions`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0 ...",
        "device": "Chrome on Windows",
        "location": "北京, 中国",
        "is_current": true,
        "created_at": "2025-04-18T10:00:00Z",
        "last_active_at": "2025-04-18T10:30:00Z"
      }
    ]
  }
}
```

---

### 3.6 强制登出指定会话

**端点**: `DELETE /api/v1/users/me/sessions/{session_id}`

**成功响应** (204):
```json
{
  "code": 204,
  "message": "会话已终止"
}
```

---

## 四、3D模型模块

### 4.1 生成3D模型

**端点**: `POST /api/v1/models/generate`

**请求**: multipart/form-data
```
image: <image_file>
engine: hunyuan3d  // hunyuan3d | triposr
quality: standard  // standard | high
enable_texture: true
webhook_url: https://yourapp.com/webhook  // 可选
```

**验证规则**:
- image: jpg, png, webp, < 10MB
- engine: 必须为hunyuan3d或triposr
- quality: 必须为standard或high

**成功响应** (202):
```json
{
  "code": 202,
  "message": "生成任务已提交",
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "estimated_time": 30,
    "queue_position": 3
  }
}
```

---

### 4.2 查询生成任务状态

**端点**: `GET /api/v1/models/tasks/{task_id}`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_id": "uuid",
    "status": "processing",  // queued | processing | completed | failed
    "progress": 65,
    "current_step": "texture_generation",
    "steps": [
      {
        "name": "shape_generation",
        "status": "completed",
        "completed_at": "2025-04-18T10:30:15Z"
      },
      {
        "name": "texture_generation",
        "status": "processing",
        "started_at": "2025-04-18T10:30:15Z"
      }
    ],
    "model_id": null,  // completed时才有值
    "error": null,  // failed时才有值
    "created_at": "2025-04-18T10:30:00Z",
    "updated_at": "2025-04-18T10:30:20Z"
  }
}
```

---

### 4.3 获取模型列表

**端点**: `GET /api/v1/models`

**查询参数**:
```
?page=1&page_size=20&category=product&tag=chair&visibility=public&sort_by=created_at&order=desc
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "现代椅子",
        "description": "简约现代风格椅子",
        "category": "product",
        "tags": ["chair", "modern", "furniture"],
        "thumbnail_url": "https://cdn.example.com/thumbnails/uuid.jpg",
        "preview_video_url": "https://cdn.example.com/previews/uuid.mp4",
        "polygon_count": 15000,
        "texture_resolution": "2048x2048",
        "file_size": 5242880,
        "visibility": "public",
        "is_featured": false,
        "view_count": 1234,
        "download_count": 56,
        "like_count": 89,
        "owner": {
          "id": "uuid",
          "username": "designer_pro",
          "avatar_url": "https://..."
        },
        "created_at": "2025-04-15T08:00:00Z",
        "published_at": "2025-04-15T08:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

---

### 4.4 获取模型详情

**端点**: `GET /api/v1/models/{model_id}`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "现代椅子",
    "description": "简约现代风格椅子",
    "category": "product",
    "tags": ["chair", "modern", "furniture"],
    
    "files": {
      "glb_url": "https://cdn.example.com/models/uuid.glb",
      "splat_url": "https://cdn.example.com/models/uuid.splat",
      "thumbnail_url": "https://cdn.example.com/thumbnails/uuid.jpg",
      "preview_video_url": "https://cdn.example.com/previews/uuid.mp4"
    },
    
    "metadata": {
      "polygon_count": 15000,
      "vertex_count": 8000,
      "texture_resolution": "2048x2048",
      "file_size": 5242880,
      "format_version": "2.0",
      "generation_engine": "hunyuan3d",
      "generation_params": {
        "quality": "high",
        "enable_texture": true
      }
    },
    
    "statistics": {
      "view_count": 1234,
      "download_count": 56,
      "like_count": 89,
      "comment_count": 12
    },
    
    "owner": {
      "id": "uuid",
      "username": "designer_pro",
      "avatar_url": "https://..."
    },
    
    "permissions": {
      "can_edit": false,
      "can_delete": false,
      "can_download": true,
      "can_comment": true
    },
    
    "created_at": "2025-04-15T08:00:00Z",
    "updated_at": "2025-04-15T08:30:00Z",
    "published_at": "2025-04-15T08:30:00Z"
  }
}
```

---

### 4.5 创建模型（上传）

**端点**: `POST /api/v1/models`

**请求**: multipart/form-data
```
file: <glb_file>
name: 我的模型
description: 模型描述
category: product
tags: chair,modern
visibility: private
```

**成功响应** (201):
```json
{
  "code": 201,
  "message": "模型上传成功",
  "data": {
    "id": "uuid",
    "name": "我的模型",
    "thumbnail_url": "https://...",
    "created_at": "2025-04-18T10:30:00Z"
  }
}
```

---

### 4.6 更新模型

**端点**: `PUT /api/v1/models/{model_id}`

**请求体**:
```json
{
  "name": "新名称",
  "description": "新描述",
  "category": "character",
  "tags": ["new", "tags"],
  "visibility": "public"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "模型更新成功",
  "data": {
    "id": "uuid",
    "name": "新名称",
    "updated_at": "2025-04-18T10:35:00Z"
  }
}
```

---

### 4.7 删除模型

**端点**: `DELETE /api/v1/models/{model_id}`

**成功响应** (204):
```json
{
  "code": 204,
  "message": "模型已删除"
}
```

---

### 4.8 格式转换

**端点**: `POST /api/v1/models/{model_id}/convert`

**请求体**:
```json
{
  "target_format": "splat",  // splat | glb | obj
  "quality": "high"  // low | medium | high
}
```

**成功响应** (202):
```json
{
  "code": 202,
  "message": "转换任务已提交",
  "data": {
    "task_id": "uuid",
    "status": "queued",
    "estimated_time": 60
  }
}
```

---

### 4.9 生成下载链接

**端点**: `POST /api/v1/models/{model_id}/download`

**请求体**:
```json
{
  "format": "glb"  // glb | splat | obj
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "download_url": "https://cdn.example.com/models/uuid.glb?signature=xxx&expires=1618880400",
    "expires_in": 3600,
    "file_size": 5242880
  }
}
```

---

### 4.10 点赞/取消点赞

**端点**: `POST /api/v1/models/{model_id}/like`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "liked": true,
    "like_count": 90
  }
}
```

---

### 4.11 收藏/取消收藏

**端点**: `POST /api/v1/models/{model_id}/favorite`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "favorited": true
  }
}
```

---

### 4.12 获取我的收藏

**端点**: `GET /api/v1/users/me/favorites`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "model": { /* 模型对象 */ },
        "favorited_at": "2025-04-18T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 15
    }
  }
}
```

---

### 4.13 评论列表

**端点**: `GET /api/v1/models/{model_id}/comments`

**查询参数**:
```
?page=1&page_size=20&sort_by=created_at
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "content": "很棒的模型！",
        "user": {
          "id": "uuid",
          "username": "user123",
          "avatar_url": "https://..."
        },
        "reply_to": null,
        "replies": [],
        "like_count": 5,
        "created_at": "2025-04-18T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 12
    }
  }
}
```

---

### 4.14 发表评论

**端点**: `POST /api/v1/models/{model_id}/comments`

**请求体**:
```json
{
  "content": "这个模型太棒了！",
  "parent_id": null  // 回复评论时填写父评论ID
}
```

**成功响应** (201):
```json
{
  "code": 201,
  "message": "评论发表成功",
  "data": {
    "id": "uuid",
    "content": "这个模型太棒了！",
    "created_at": "2025-04-18T10:30:00Z"
  }
}
```

---

### 4.15 删除评论

**端点**: `DELETE /api/v1/comments/{comment_id}`

**成功响应** (204):
```json
{
  "code": 204,
  "message": "评论已删除"
}
```

---

## 五、模板模块

### 5.1 获取模板列表

**端点**: `GET /api/v1/templates`

**查询参数**:
```
?category=gallery&is_premium=false&sort_by=usage_count&page=1&page_size=20
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "现代画廊",
        "slug": "modern-gallery",
        "description": "适合展示3D模型的现代化布局",
        "category": "gallery",
        "thumbnail_url": "https://...",
        "preview_url": "https://...",
        "usage_count": 1234,
        "rating": 4.8,
        "rating_count": 156,
        "is_premium": false,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 50
    }
  }
}
```

---

### 5.2 获取模板详情

**端点**: `GET /api/v1/templates/{template_id}`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "现代画廊",
    "slug": "modern-gallery",
    "description": "适合展示3D模型的现代化布局",
    "category": "gallery",
    "thumbnail_url": "https://...",
    "preview_url": "https://...",
    
    "layout_config": {
      "sections": [
        {
          "type": "hero",
          "config": {
            "title": "欢迎来到我的3D世界",
            "subtitle": "探索精美的3D模型",
            "background_type": "gradient",
            "background_value": "#667eea to #764ba2"
          }
        },
        {
          "type": "gallery",
          "config": {
            "layout": "grid",
            "columns": 3,
            "show_filters": true
          }
        }
      ]
    },
    
    "style_config": {
      "primary_color": "#667eea",
      "secondary_color": "#764ba2",
      "font_family": "Inter, sans-serif",
      "border_radius": "8px"
    },
    
    "usage_count": 1234,
    "rating": 4.8,
    "rating_count": 156,
    "is_premium": false,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### 5.3 评分模板

**端点**: `POST /api/v1/templates/{template_id}/rate`

**请求体**:
```json
{
  "rating": 5,
  "comment": "非常好用的模板！"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "评分成功",
  "data": {
    "average_rating": 4.8,
    "rating_count": 157
  }
}
```

---

## 六、页面模块

### 6.1 创建自定义页面

**端点**: `POST /api/v1/pages`

**请求体**:
```json
{
  "title": "我的作品集",
  "slug": "my-portfolio",
  "template_id": "uuid",
  "page_config": {
    "custom_title": "个性化标题"
  },
  "meta_title": "我的3D作品集",
  "meta_description": "展示我的3D设计作品",
  "meta_keywords": ["3d", "portfolio", "design"]
}
```

**成功响应** (201):
```json
{
  "code": 201,
  "message": "页面创建成功",
  "data": {
    "id": "uuid",
    "title": "我的作品集",
    "slug": "my-portfolio",
    "status": "draft",
    "created_at": "2025-04-18T10:30:00Z"
  }
}
```

---

### 6.2 获取页面列表

**端点**: `GET /api/v1/users/me/pages`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "我的作品集",
        "slug": "my-portfolio",
        "status": "published",
        "view_count": 234,
        "created_at": "2025-04-18T10:30:00Z",
        "published_at": "2025-04-18T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5
    }
  }
}
```

---

### 6.3 获取页面详情

**端点**: `GET /api/v1/pages/{page_id}`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "title": "我的作品集",
    "slug": "my-portfolio",
    "template_id": "uuid",
    "page_config": {},
    "custom_css": "",
    "custom_js": "",
    
    "seo": {
      "meta_title": "我的3D作品集",
      "meta_description": "展示我的3D设计作品",
      "meta_keywords": ["3d", "portfolio", "design"],
      "og_image": "https://..."
    },
    
    "sections": [
      {
        "id": "uuid",
        "type": "hero",
        "position": 0,
        "config": {
          "title": "欢迎来到我的3D世界",
          "subtitle": "探索精美的3D模型"
        },
        "is_visible": true
      }
    ],
    
    "status": "published",
    "view_count": 234,
    "created_at": "2025-04-18T10:30:00Z",
    "published_at": "2025-04-18T11:00:00Z"
  }
}
```

---

### 6.4 更新页面配置

**端点**: `PUT /api/v1/pages/{page_id}`

**请求体**:
```json
{
  "title": "新标题",
  "page_config": {},
  "custom_css": ".hero { background: red; }",
  "meta_title": "新SEO标题"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "页面更新成功",
  "data": {
    "id": "uuid",
    "updated_at": "2025-04-18T10:35:00Z"
  }
}
```

---

### 6.5 添加页面区块

**端点**: `POST /api/v1/pages/{page_id}/sections`

**请求体**:
```json
{
  "section_type": "gallery",
  "position": 1,
  "config": {
    "layout": "masonry",
    "columns": 3,
    "models": ["uuid1", "uuid2", "uuid3"]
  }
}
```

**成功响应** (201):
```json
{
  "code": 201,
  "message": "区块添加成功",
  "data": {
    "id": "uuid",
    "section_type": "gallery",
    "position": 1
  }
}
```

---

### 6.6 更新区块配置

**端点**: `PUT /api/v1/pages/{page_id}/sections/{section_id}`

**请求体**:
```json
{
  "config": {
    "layout": "grid",
    "columns": 4
  },
  "position": 2
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "区块更新成功"
}
```

---

### 6.7 删除区块

**端点**: `DELETE /api/v1/pages/{page_id}/sections/{section_id}`

**成功响应** (204):
```json
{
  "code": 204,
  "message": "区块已删除"
}
```

---

### 6.8 发布页面

**端点**: `POST /api/v1/pages/{page_id}/publish`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "页面发布成功",
  "data": {
    "status": "published",
    "published_at": "2025-04-18T10:30:00Z",
    "public_url": "https://app.example.com/p/my-portfolio"
  }
}
```

---

### 6.9 下架页面

**端点**: `POST /api/v1/pages/{page_id}/unpublish`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "页面已下架",
  "data": {
    "status": "draft"
  }
}
```

---

## 七、订单支付模块

### 7.1 获取套餐列表

**端点**: `GET /api/v1/plans`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "免费版",
        "slug": "free",
        "description": "适合个人用户体验",
        "price_monthly": 0,
        "price_yearly": 0,
        
        "quotas": {
          "storage_quota": 1073741824,
          "monthly_generations": 10,
          "max_model_size": 10485760,
          "priority_queue": false
        },
        
        "features": [
          "10次/月3D生成",
          "1GB存储空间",
          "基础支持"
        ],
        
        "is_active": true,
        "is_popular": false
      },
      {
        "id": "uuid",
        "name": "专业版",
        "slug": "pro",
        "description": "适合专业设计师",
        "price_monthly": 29.99,
        "price_yearly": 299.99,
        
        "quotas": {
          "storage_quota": 107374182400,
          "monthly_generations": 100,
          "max_model_size": 104857600,
          "priority_queue": true
        },
        
        "features": [
          "100次/月3D生成",
          "100GB存储空间",
          "优先队列",
          "高清纹理生成",
          "优先技术支持"
        ],
        
        "is_active": true,
        "is_popular": true
      }
    ]
  }
}
```

---

### 7.2 创建订阅

**端点**: `POST /api/v1/subscriptions`

**请求体**:
```json
{
  "plan_id": "uuid",
  "billing_cycle": "monthly",  // monthly | yearly
  "payment_method": "stripe"  // stripe | alipay | wechat
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "请完成支付",
  "data": {
    "subscription_id": "uuid",
    "payment_url": "https://checkout.stripe.com/...",
    "expires_in": 1800
  }
}
```

---

### 7.3 获取当前订阅

**端点**: `GET /api/v1/users/me/subscription`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "plan": {
      "id": "uuid",
      "name": "专业版",
      "slug": "pro"
    },
    "status": "active",
    "current_period_start": "2025-04-01T00:00:00Z",
    "current_period_end": "2025-05-01T00:00:00Z",
    "cancel_at_period_end": false,
    "created_at": "2025-04-01T00:00:00Z"
  }
}
```

---

### 7.4 取消订阅

**端点**: `POST /api/v1/subscriptions/{subscription_id}/cancel`

**请求体**:
```json
{
  "reason": "价格太高"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "订阅将在当前周期结束后取消",
  "data": {
    "status": "active",
    "cancel_at_period_end": true,
    "current_period_end": "2025-05-01T00:00:00Z"
  }
}
```

---

### 7.5 获取订单列表

**端点**: `GET /api/v1/users/me/orders`

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "order_number": "ORD-20250418-001",
        "amount": 29.99,
        "currency": "USD",
        "status": "paid",
        "items": [
          {
            "name": "专业版月度订阅",
            "quantity": 1,
            "price": 29.99
          }
        ],
        "paid_at": "2025-04-01T10:00:00Z",
        "created_at": "2025-04-01T09:55:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5
    }
  }
}
```

---

### 7.6 Webhook回调（Stripe）

**端点**: `POST /api/v1/webhooks/stripe`

**说明**: 此端点由Stripe调用，无需认证

**请求体** (Stripe事件):
```json
{
  "id": "evt_123",
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "subscription": "sub_123",
      "amount_paid": 2999,
      "currency": "usd"
    }
  }
}
```

**成功响应** (200):
```json
{
  "received": true
}
```

---

## 八、管理后台模块

### 8.1 获取系统统计

**端点**: `GET /api/v1/admin/statistics`

**权限**: admin

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "users": {
      "total": 10000,
      "active_today": 1234,
      "new_today": 56,
      "growth_rate_7d": 5.2
    },
    "models": {
      "total": 50000,
      "generated_today": 234,
      "total_storage_used": 107374182400
    },
    "revenue": {
      "today": 1234.56,
      "this_month": 12345.67,
      "growth_rate_mom": 15.3
    },
    "system": {
      "api_qps": 123.45,
      "avg_response_time_ms": 85,
      "error_rate": 0.5,
      "gpu_utilization": 65.2
    }
  }
}
```

---

### 8.2 获取用户列表

**端点**: `GET /api/v1/admin/users`

**权限**: admin

**查询参数**:
```
?page=1&page_size=20&role=user&status=active&search=john
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "username": "john_doe",
        "email": "john@example.com",
        "role": "user",
        "status": "active",
        "storage_used": 524288000,
        "storage_quota": 1073741824,
        "created_at": "2025-01-01T00:00:00Z",
        "last_login_at": "2025-04-18T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 10000
    }
  }
}
```

---

### 8.3 更新用户角色

**端点**: `PUT /api/v1/admin/users/{user_id}/role`

**权限**: admin

**请求体**:
```json
{
  "role": "editor"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "用户角色更新成功",
  "data": {
    "id": "uuid",
    "role": "editor"
  }
}
```

---

### 8.4 封禁/解封用户

**端点**: `PUT /api/v1/admin/users/{user_id}/ban`

**权限**: admin

**请求体**:
```json
{
  "action": "ban",  // ban | unban
  "reason": "发布违规内容"
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "用户已封禁",
  "data": {
    "status": "banned"
  }
}
```

---

### 8.5 获取待审核模型

**端点**: `GET /api/v1/admin/models/pending`

**权限**: admin

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "可疑模型",
        "owner": {
          "id": "uuid",
          "username": "user123"
        },
        "thumbnail_url": "https://...",
        "created_at": "2025-04-18T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 15
    }
  }
}
```

---

### 8.6 审核模型

**端点**: `POST /api/v1/admin/models/{model_id}/review`

**权限**: admin

**请求体**:
```json
{
  "action": "approve",  // approve | reject
  "reason": "内容合规"  // reject时必填
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "审核完成",
  "data": {
    "status": "approved"
  }
}
```

---

### 8.7 设为精选模型

**端点**: `POST /api/v1/admin/models/{model_id}/feature`

**权限**: admin

**请求体**:
```json
{
  "featured": true,
  "priority": 1
}
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "操作成功"
}
```

---

### 8.8 获取操作日志

**端点**: `GET /api/v1/admin/audit-logs`

**权限**: admin

**查询参数**:
```
?page=1&page_size=50&action=create_model&user_id=uuid
```

**成功响应** (200):
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "username": "admin"
        },
        "action": "create_model",
        "resource_type": "model",
        "resource_id": "uuid",
        "ip_address": "192.168.1.1",
        "status": "success",
        "created_at": "2025-04-18T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 50,
      "total": 1000
    }
  }
}
```

---

## 九、WebSocket实时推送

### 9.1 连接WebSocket

**端点**: `ws://domain.com/ws/notifications`

**连接参数**:
```
?token=<access_token>
```

### 9.2 消息格式

#### 任务进度更新

```json
{
  "type": "task_update",
  "data": {
    "task_id": "uuid",
    "status": "processing",
    "progress": 65,
    "current_step": "texture_generation",
    "estimated_remaining_seconds": 15
  }
}
```

#### 系统通知

```json
{
  "type": "system_notification",
  "data": {
    "id": "uuid",
    "title": "系统维护通知",
    "message": "系统将于今晚22:00进行维护",
    "level": "info",  // info | warning | error
    "created_at": "2025-04-18T10:30:00Z"
  }
}
```

#### 新评论通知

```json
{
  "type": "new_comment",
  "data": {
    "model_id": "uuid",
    "comment_id": "uuid",
    "user": {
      "username": "user123",
      "avatar_url": "https://..."
    },
    "content": "很棒的模型！",
    "created_at": "2025-04-18T10:30:00Z"
  }
}
```

---

## 十、错误码定义

### 10.1 通用错误码

| 错误码 | 类型 | 说明 |
|--------|------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| AUTHENTICATION_ERROR | 401 | 认证失败 |
| PERMISSION_ERROR | 403 | 权限不足 |
| NOT_FOUND_ERROR | 404 | 资源不存在 |
| CONFLICT_ERROR | 409 | 资源冲突 |
| RATE_LIMIT_ERROR | 429 | 速率限制 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 10.2 业务错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| USER_ALREADY_EXISTS | 409 | 用户已存在 |
| INVALID_CREDENTIALS | 401 | 邮箱或密码错误 |
| EMAIL_NOT_VERIFIED | 403 | 邮箱未验证 |
| TOKEN_EXPIRED | 401 | Token已过期 |
| TOKEN_INVALID | 401 | Token无效 |
| INSUFFICIENT_STORAGE | 422 | 存储空间不足 |
| GENERATION_QUOTA_EXCEEDED | 422 | 生成次数超限 |
| MODEL_NOT_FOUND | 404 | 模型不存在 |
| TEMPLATE_NOT_FOUND | 404 | 模板不存在 |
| PAYMENT_FAILED | 422 | 支付失败 |
| SUBSCRIPTION_EXPIRED | 403 | 订阅已过期 |

---

## 附录

### A. OpenAPI/Swagger文档

所有API端点都自动生成OpenAPI 3.0文档，访问地址：
- Swagger UI: `https://api.example.com/docs`
- ReDoc: `https://api.example.com/redoc`
- JSON Spec: `https://api.example.com/openapi.json`

### B. SDK示例

#### Python SDK

```python
from web3d_client import Web3DClient

client = Web3DClient(api_key="your_api_key")

# 生成3D模型
task = client.models.generate(
    image="path/to/image.jpg",
    engine="hunyuan3d",
    enable_texture=True
)

# 查询任务状态
status = client.models.get_task_status(task.task_id)

# 下载模型
if status.status == "completed":
    download_url = client.models.get_download_url(status.model_id)
```

#### JavaScript SDK

```javascript
import { Web3DClient } from '@web3d/sdk';

const client = new Web3DClient({ apiKey: 'your_api_key' });

// 生成3D模型
const task = await client.models.generate({
  image: file,
  engine: 'hunyuan3d',
  enableTexture: true
});

// 监听任务进度
client.on('task_update', (data) => {
  console.log(`Progress: ${data.progress}%`);
});
```

---

**文档版本**: v1.0  
**最后更新**: 2025年4月18日  
**维护者**: Web3D后端团队  
**联系方式**: api-support@web3d.com
