# Web3D 平台 - 快速启动指南

> **版本**: v1.0  
> **更新时间**: 2026-04-19  
> **状态**: ✅ 已就绪可测试

---

## 🚀 一键启动（所有服务）

### Windows PowerShell
```powershell
# 终端 1: 启动后端
cd d:\HBuilderProjects\web3D\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 终端 2: 启动前端
cd d:\HBuilderProjects\web3D\src\web-frontend
npm run dev

# 终端 3: 访问后台管理（前端已包含）
# 直接访问 http://localhost:5173/admin/login
```

---

## 📋 服务清单

| 服务 | 地址 | 状态 | 说明 |
|:---|:---|:---|:---|
| **后端 API** | http://localhost:8000 | ✅ 运行中 | FastAPI + SQLite |
| **API 文档** | http://localhost:8000/docs | ✅ 可用 | Swagger UI |
| **前端展示** | http://localhost:5173 | ✅ 运行中 | React + Spark 2.0 |
| **后台管理** | http://localhost:5173/admin/login | ✅ 运行中 | Refine Admin |

---

## 🔐 登录凭证

### 后台管理账号
```
用户名: admin
密码: admin123
邮箱: admin@web3d.com
角色: 管理员
```

---

## 🎯 核心功能测试

### 1. 测试后端 API

#### 健康检查
```bash
curl http://localhost:8000/health
```

#### 用户登录
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

预期响应：
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "email": "admin@web3d.com",
      "role": "admin"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

#### 获取模型列表
```bash
curl http://localhost:8000/api/v1/models/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 2. 测试后台管理

#### 步骤：
1. 打开浏览器访问：http://localhost:5173/admin/login
2. 输入用户名 `admin` 和密码 `admin123`
3. 点击登录
4. 进入管理后台

#### 可测试模块：
- ✅ **仪表盘** - 查看系统概览
- ✅ **用户管理** - 查看/编辑用户列表
- ✅ **模型管理** - 查看 3D 模型列表
- ✅ **模板管理** - 查看场景模板

---

### 3. 测试前端展示

#### 访问地址：
http://localhost:5173

#### 页面：
- **首页** (/) - 展示 Spark 2.0 渲染的蝴蝶模型
- **上传页面** (/upload) - 上传图片生成 3D 模型
- **画廊页面** (/gallery) - 浏览所有 3D 模型
- **SuperSplat 编辑器** (/supersplat) - 3DGS 编辑器

---

## 📊 架构说明

### 后端职责
- ✅ **3D 生成技术** - Hunyuan3D AI 生成（当前 Mock 模式）
- ✅ **数据管理** - 用户、模型、模板 CRUD
- ✅ **认证授权** - JWT Token 管理
- ✅ **文件存储** - 本地文件系统（Mock Storage）

### 前端职责
- ✅ **3D 渲染展示** - Spark 2.0 引擎
- ✅ **用户界面** - React + TypeScript
- ✅ **交互体验** - 上传、预览、编辑

### 后台管理职责
- ✅ **内容管理** - 审核模型、管理用户
- ✅ **数据统计** - 仪表盘展示
- ✅ **系统配置** - 模板管理、权限控制

---

## ⚠️ 注意事项

### 1. 端口占用
确保以下端口未被占用：
- **8000** - 后端 API
- **5173** - 前端 Vite 开发服务器

如果端口被占用，可以修改：
- 后端：`python -m uvicorn app.main:app --port 8001`
- 前端：修改 `vite.config.ts` 中的 `server.port`

### 2. 数据库
- 当前使用 **SQLite** (`backend/web3d.db`)
- 首次启动会自动创建数据库和表
- 默认管理员账户已创建

### 3. Hunyuan3D 服务
- 当前使用 **Mock 模式**
- 3D 生成功能会返回模拟数据
- 真实部署需要 GPU 服务器

### 4. 环境变量
前端 `.env` 文件：
```env
VITE_API_BASE_URL=http://localhost:8000
```

后端 `backend/app/config.py`：
```python
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
]
```

---

## 🛠️ 常见问题

### Q1: 后台管理无法登录？
**A:** 检查以下几点：
1. 后端是否正常运行（http://localhost:8000/health）
2. 浏览器控制台是否有 CORS 错误
3. 用户名和密码是否正确（admin / admin123）

### Q2: 前端无法访问后端 API？
**A:** 
1. 检查后端是否在 8000 端口运行
2. 检查 `.env` 文件中的 `VITE_API_BASE_URL`
3. 清除浏览器缓存并刷新

### Q3: 出现 "You cannot render a <Router> inside another <Router>" 错误？
**A:** 这是因为嵌套了多个 Router。确保：
- 主应用 `App.tsx` 只有一个 `BrowserRouter`
- 子组件（如 AdminEntry）只使用 `Routes` 和 `Route`，不再包裹 `BrowserRouter`
- 已修复：`admin/index.tsx` 已移除内部的 `BrowserRouter`

### Q4: 如何重置管理员密码？
**A:** 删除数据库文件 `backend/web3d.db`，然后重新运行：
```bash
cd d:\HBuilderProjects\web3D\backend
python create_admin.py
```

### Q5: 如何查看 API 文档？
**A:** 访问 http://localhost:8000/docs (Swagger UI)

---

## 📁 重要文件

### 后端
- `backend/app/main.py` - FastAPI 应用入口
- `backend/app/api/v1/` - API 路由
- `backend/app/services/` - 业务逻辑
- `backend/create_admin.py` - 创建管理员脚本

### 前端
- `src/web-frontend/src/admin/` - 后台管理代码
- `src/web-frontend/src/components/3d/Spark/` - Spark 2.0 集成
- `src/web-frontend/.env` - 环境变量

### 文档
- `docs/03-技术文档/核心架构速查-OK.md` - 核心技术栈
- `docs/03-技术文档/核心功能架构说明.md` - 功能架构
- `docs/03-技术文档/后端本地测试可行性报告.md` - 测试指南

---

## 🎓 下一步计划

### 短期目标
1. ✅ 修复 API URL 配置
2. ✅ 创建默认管理员账户
3. ✅ 支持用户名登录
4. ⏳ 实现模型文件上传/下载 API
5. ⏳ 完善后台管理页面

### 中期目标
1. 部署真实的 Hunyuan3D 服务
2. 切换到 PostgreSQL 数据库
3. 集成 MinIO 对象存储
4. 添加更多 AI 生成引擎

### 长期目标
1. GPU 集群管理
2. 多租户支持
3. CDN 加速
4. 移动端适配

---

## 📞 技术支持

如有问题，请查阅文档或联系开发团队。

**核心文档**：
- [核心架构速查-OK.md](./docs/03-技术文档/核心架构速查-OK.md)
- [核心功能架构说明.md](./docs/03-技术文档/核心功能架构说明.md)
- [后台管理系统设计文档](./docs/03-技术文档/3D生成平台-后台管理系统设计文档.md)

---

*本文档由 AI 技术团队编制*  
*最后更新: 2026-04-19*
