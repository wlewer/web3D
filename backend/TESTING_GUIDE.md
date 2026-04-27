# 🚀 Web3D 后端认证系统 - 快速测试指南

> 📅 创建日期：2025-04-18  
> ✅ 状态：已就绪，可立即测试

---

## 📋 测试前准备

### 1. 确保PostgreSQL和Redis运行

**方式A：使用Docker（推荐）**

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: web3d
      POSTGRES_USER: web3d_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7.2
    ports:
      - "6379:6379"
    command: redis-server --requirepass your_redis_password

volumes:
  postgres_data:
```

启动服务：
```bash
cd backend
docker-compose up -d
```

**方式B：手动安装**

- PostgreSQL 16+: https://www.postgresql.org/download/
- Redis 7.2+: https://redis.io/download/

---

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，修改以下关键配置：

```env
# 数据库配置
DATABASE_URL=postgresql://web3d_user:your_password@localhost:5432/web3d

# Redis配置
REDIS_URL=redis://:your_redis_password@localhost:6379/0

# JWT密钥（至少32字符）
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars

# CORS配置（添加前端地址）
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

---

### 3. 安装Python依赖

```bash
cd backend
pip install -r requirements.txt
```

---

## 🧪 开始测试

### 步骤1: 启动后端服务

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

看到以下输出表示成功：
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

### 步骤2: 访问API文档

打开浏览器访问：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

在Swagger UI中：
1. 展开 `/api/v1/auth/register` 接口
2. 点击 "Try it out"
3. 填写注册信息：
   ```json
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "Test1234",
     "phone": "13800138000"
   }
   ```
4. 点击 "Execute"
5. 复制返回的 `access_token`
6. 点击右上角 "Authorize" 按钮
7. 粘贴Token并授权
8. 测试其他需要认证的接口

---

### 步骤3: 使用简化登录页面测试

打开浏览器访问：
```
http://localhost:8000/login.html
```

**自动流程**：
1. 页面加载时自动注册测试用户
2. 输入邮箱和密码（默认已填充）
3. 点击"登录"按钮
4. 登录成功后跳转到管理后台

**管理后台功能**：
- ✅ 显示用户信息
- ✅ 统计卡片（模拟数据）
- ✅ 侧边栏导航
- ✅ 退出登录

---

### 步骤4: 运行自动化测试脚本

```bash
cd backend
pip install requests
python test_auth.py
```

**预期输出**：
```
============================================================
Web3D Backend Authentication System Test
============================================================

🔍 Testing health endpoint...
Status: 200
✅ Health check passed

📝 Testing user registration...
Status: 200
✅ Registration successful

🔑 Testing user login...
Status: 200
✅ Login successful

👤 Testing get current user...
Status: 200
✅ Get user info successful

🔄 Testing token refresh...
Status: 200
✅ Token refresh successful

============================================================
✅ All tests completed!
============================================================
```

---

## 📡 API接口测试示例

### 1. 用户注册

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**响应**：
```json
{
  "code": 200,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com",
      "role": "user",
      "status": "active"
    },
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

### 2. 用户登录

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### 3. 获取当前用户信息

```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. 刷新Token

```bash
curl -X POST "http://localhost:8000/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 🔍 常见问题排查

### Q1: 数据库连接失败？

**错误信息**：
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**解决方案**：
1. 检查PostgreSQL是否运行：`docker ps | grep postgres`
2. 检查`.env`中的`DATABASE_URL`是否正确
3. 检查防火墙是否阻止5432端口

### Q2: Redis连接失败？

**错误信息**：
```
redis.exceptions.ConnectionError
```

**解决方案**：
1. 检查Redis是否运行：`docker ps | grep redis`
2. 检查`.env`中的`REDIS_URL`和密码是否正确
3. 测试Redis连接：`redis-cli -h localhost -p 6379 -a your_password ping`

### Q3: Token验证失败？

**错误信息**：
```
HTTP 401: Could not validate credentials
```

**解决方案**：
1. 检查`.env`中的`SECRET_KEY`是否正确
2. 确保Token格式正确：`Bearer eyJ...`
3. 检查Token是否过期（Access Token 60分钟）

### Q4: CORS错误？

**错误信息**：
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**解决方案**：
1. 检查`.env`中的`CORS_ORIGINS`是否包含前端地址
2. 重启后端服务使配置生效

---

## 📊 测试清单

完成以下测试项，确认认证系统正常工作：

- [ ] 后端服务成功启动
- [ ] 访问 http://localhost:8000/docs 看到Swagger文档
- [ ] 健康检查端点返回正常：`GET /health`
- [ ] 用户注册成功：`POST /api/v1/auth/register`
- [ ] 用户登录成功：`POST /api/v1/auth/login`
- [ ] 获取用户信息成功：`GET /api/v1/auth/me`
- [ ] Token刷新成功：`POST /api/v1/auth/refresh`
- [ ] 简化登录页面可以正常登录
- [ ] 管理后台Dashboard可以正常访问
- [ ] 自动化测试脚本全部通过

---

## 🎯 下一步开发

认证系统测试通过后，可以继续开发：

### 选项C: 3D模型生成API（核心功能）
- Hunyuan3D-2mini集成
- TripoSR集成
- Celery异步任务队列
- WebSocket实时进度推送

### 选项B: Refine管理后台（完整后台）
- Refine项目初始化
- 数据提供者配置
- 用户管理CRUD
- 模型管理CRUD（带3D预览）
- 模板管理系统

### 选项D: Spark 2.0前端组件
- SplatRenderer组件
- ModelViewer查看器
- 画廊组件
- 移动端优化

---

## 📞 技术支持

如有问题，请查阅：
1. `backend/README.md` - 完整使用文档
2. `backend/COMPLETION_REPORT.md` - 完成报告
3. http://localhost:8000/docs - Swagger API文档

---

**祝测试顺利！** 🎉
