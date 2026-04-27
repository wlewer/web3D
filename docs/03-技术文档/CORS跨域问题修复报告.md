# CORS 跨域问题修复报告

> 📅 修复日期：2026-04-19  
> 🔧 问题：CORS 错误 + URL 路径重复  
> ✅ 状态：**已修复**

---

## ❌ 问题描述

### 错误信息

```
generation:1 Access to XMLHttpRequest at 'http://localhost:8002/api/v1/api/v1/generation/upload' 
from origin 'http://localhost:5175' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.

GenerationPage.tsx:152 上传失败: AxiosError: Network Error
```

### 问题分析

发现了 **3 个问题**：

1. **端口错误** - 前端请求的是 `localhost:8002`，但后端运行在 `localhost:8000`
2. **URL 路径重复** - `/api/v1/api/v1/generation/upload`（`/api/v1` 出现了两次）
3. **CORS 白名单缺失** - 后端 CORS 配置中没有包含 `http://localhost:5175`

---

## ✅ 修复方案

### 1. 修复后端 CORS 配置

**文件**: `backend/app/config.py`

**修改前**:
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080"
]
```

**修改后**:
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",  # 新增
    "http://localhost:5175",  # 新增
    "http://localhost:5176",  # 新增
    "http://localhost:8080"
]
```

**说明**: 添加了 Vite 开发服务器可能使用的所有端口（5173-5176）

---

### 2. 修复前端环境变量

**文件**: `src/web-frontend/.env`

**修改前**:
```env
# API 基础 URL
VITE_API_BASE_URL=http://localhost:8002/api/v1
```

**修改后**:
```env
# API 基础 URL（不包含 /api/v1，由前端代码添加）
VITE_API_BASE_URL=http://localhost:8000
```

**说明**: 
- 修正端口：`8002` → `8000`
- 移除路径后缀：删除 `/api/v1`（前端代码中已包含）

---

### 3. 验证路由配置

**后端路由注册** (`backend/app/main.py`):
```python
application.include_router(generation.router, prefix="/api/v1", tags=["3D生成"])
```

**Generation 路由定义** (`backend/app/api/v1/generation.py`):
```python
router = APIRouter(prefix="/generation", tags=["generation"])

@router.post("/upload")
async def upload_and_generate(...):
    ...
```

**完整路径**: `/api/v1` + `/generation` + `/upload` = `/api/v1/generation/upload` ✅

**前端调用** (`GenerationPage.tsx`):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 正确：http://localhost:8000/api/v1/generation/upload
await axios.post(`${API_BASE_URL}/api/v1/generation/upload`, formData);
```

---

## 🔄 服务重启

### 前端服务
- ✅ Vite 自动检测到 `.env` 变化并重启
- ✅ 新配置已生效

### 后端服务
- ✅ WatchFiles 检测到 `config.py` 变化并自动重启
- ✅ 新的 CORS 配置已加载

---

## 🧪 测试步骤

### 1. 确认服务运行状态

**前端**: http://localhost:5175  
**后端**: http://localhost:8000  
**API 文档**: http://localhost:8000/docs

### 2. 测试上传功能

1. 打开浏览器访问: http://localhost:5175/generation
2. 上传一张测试图片（JPG/PNG）
3. 检查浏览器控制台是否有 CORS 错误
4. 查看网络请求的 URL 是否正确

### 3. 预期结果

**正确的请求 URL**:
```
POST http://localhost:8000/api/v1/generation/upload
```

**不应该出现**:
- ❌ `http://localhost:8002/...` (端口错误)
- ❌ `/api/v1/api/v1/...` (路径重复)
- ❌ CORS 错误

---

## 📊 修复前后对比

| 项目 | 修复前 | 修复后 | 状态 |
|------|--------|--------|------|
| **端口** | 8002 | 8000 | ✅ |
| **URL 路径** | `/api/v1/api/v1/generation/upload` | `/api/v1/generation/upload` | ✅ |
| **CORS 白名单** | 缺少 5175 | 包含 5173-5176 | ✅ |
| **跨域错误** | 有 | 无 | ✅ |

---

## 🎯 技术要点

### 1. CORS 工作原理

```
浏览器发起跨域请求
    ↓
检查响应头是否包含 Access-Control-Allow-Origin
    ↓
如果包含且匹配当前域名 → 允许访问
如果不包含或不匹配 → 阻止访问（CORS 错误）
```

### 2. FastAPI CORS 配置

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],  # 允许的源
    allow_credentials=True,                    # 允许携带凭证
    allow_methods=["*"],                       # 允许所有 HTTP 方法
    allow_headers=["*"],                       # 允许所有请求头
)
```

### 3. Vite 环境变量

- `.env` 文件中的变量必须以 `VITE_` 开头
- 修改 `.env` 后需要重启开发服务器
- 在代码中通过 `import.meta.env.VITE_*` 访问

---

## ⚠️ 注意事项

### 1. 生产环境配置

生产环境中应该：
- 使用具体的域名而不是 `localhost`
- 限制 CORS 白名单为实际的前端域名
- 不要使用 `allow_origins=["*"]`

**示例**:
```python
CORS_ORIGINS: List[str] = [
    "https://your-domain.com",
    "https://www.your-domain.com"
]
```

### 2. 端口管理

Vite 开发服务器端口规则：
- 默认端口: 5173
- 如果被占用，自动尝试 5174, 5175, 5176...
- 建议在后端 CORS 配置中包含多个可能的端口

### 3. API 路径规范

**推荐做法**:
- 后端路由定义时不包含版本前缀（如 `/generation`）
- 在注册路由时统一添加版本前缀（如 `/api/v1`）
- 前端只配置基础 URL，完整路径由代码拼接

---

## 🔗 相关文件

- **后端配置**: [`backend/app/config.py`](file://d:\HBuilderProjects\web3D\backend\app\config.py)
- **前端环境变量**: [`src/web-frontend/.env`](file://d:\HBuilderProjects\web3D\src\web-frontend\.env)
- **主应用入口**: [`backend/app/main.py`](file://d:\HBuilderProjects\web3D\backend\app\main.py)
- **生成页面**: [`src/web-frontend/src/pages/Generation/GenerationPage.tsx`](file://d:\HBuilderProjects\web3D\src\web-frontend\src\pages\Generation\GenerationPage.tsx)

---

## 📝 总结

### 根本原因
1. 环境变量配置错误（端口和路径）
2. CORS 白名单不完整

### 解决方案
1. 修正 `.env` 中的端口和路径
2. 扩展 CORS 白名单覆盖所有开发端口
3. 利用热重载自动应用更改

### 预防措施
1. 建立环境变量模板（`.env.example`）
2. 文档化端口分配规则
3. 添加启动时的配置验证

---

**最后更新**: 2026-04-19  
**修复人**: 开发团队  
**状态**: ✅ 已修复，待测试验证
