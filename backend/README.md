# Web3D Backend - 认证系统

> 🚀 FastAPI后端认证系统已完成  
> ✅ JWT Token管理 | ✅ bcrypt密码加密 | ✅ RBAC权限控制

## 📁 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # 应用入口
│   ├── config.py               # 配置管理
│   ├── database.py             # 数据库连接
│   ├── dependencies.py         # 依赖注入（认证中间件）
│   ├── core/
│   │   ├── __init__.py
│   │   └── security.py         # JWT/密码加密工具
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py             # 用户数据模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── auth.py             # Pydantic验证模式
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth_service.py     # 认证业务逻辑
│   └── api/
│       ├── __init__.py
│       └── v1/
│           ├── __init__.py
│           ├── auth.py         # 认证API路由 ✅
│           ├── users.py        # 用户API（占位）
│           ├── models.py       # 模型API（占位）
│           └── templates.py    # 模板API（占位）
├── .env.example                # 环境变量示例
├── requirements.txt            # Python依赖
└── README.md                   # 本文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑.env文件，修改以下关键配置：
# - DATABASE_URL: PostgreSQL连接字符串
# - REDIS_URL: Redis连接字符串
# - SECRET_KEY: JWT密钥（至少32字符）
```

### 3. 启动数据库和Redis

**使用Docker（推荐）**：

```bash
# 创建docker-compose.yml
cat > docker-compose.yml << EOF
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
EOF

# 启动服务
docker-compose up -d
```

### 4. 启动后端服务

```bash
# 开发模式（自动重载）
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 或使用Python直接运行
python app/main.py
```

### 5. 访问API文档

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📡 API接口

### 认证接口

#### 1. 用户注册

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test1234",
  "phone": "13800138000"
}
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

#### 2. 用户登录

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test1234"
}
```

#### 3. 刷新Token

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

#### 4. 获取当前用户信息

```bash
GET /api/v1/auth/me
Authorization: Bearer eyJ...
```

#### 5. 用户登出

```bash
POST /api/v1/auth/logout
Authorization: Bearer eyJ...
```

## 🔐 安全特性

### 1. JWT Token管理

- **Access Token**: 有效期60分钟
- **Refresh Token**: 有效期7天
- **Token黑名单**: 登出时将Token加入Redis黑名单
- **Token类型验证**: 防止Access/Refresh Token混用

### 2. 密码安全

- **bcrypt加密**: cost factor 12
- **密码强度验证**: 最少8位，需包含字母和数字
- **防暴力破解**: 登录失败不提示具体错误

### 3. RBAC权限控制

```python
# 使用示例
from app.dependencies import require_admin, require_editor

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin)  # 仅管理员可访问
):
    ...
```

**角色层级**：
- `admin` (3): 最高权限
- `editor` (2): 编辑权限
- `user` (1): 普通用户
- `guest` (0): 访客

## 🧪 测试认证系统

### 使用curl测试

```bash
# 1. 注册用户
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test1234"
  }'

# 2. 登录获取Token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'

# 保存返回的access_token

# 3. 使用Token访问受保护接口
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 使用Swagger UI测试

1. 访问 http://localhost:8000/docs
2. 点击 `/api/v1/auth/register` 接口
3. 点击 "Try it out"
4. 填写注册信息并执行
5. 复制返回的 `access_token`
6. 点击右上角 "Authorize" 按钮
7. 粘贴Token并授权
8. 现在可以测试所有需要认证的接口

## 📝 下一步开发

认证系统已完成，接下来可以开发：

1. ✅ **选项A完成** - 后端认证系统
2. ⏳ **选项C** - 3D模型生成API封装
3. ⏳ **选项B** - Refine管理后台初始化
4. ⏳ **选项D** - Spark 2.0前端组件集成

## 🛠️ 常见问题

### Q1: 数据库连接失败？

检查`.env`文件中的`DATABASE_URL`是否正确，确保PostgreSQL正在运行。

### Q2: Redis连接失败？

检查`.env`文件中的`REDIS_URL`和密码是否正确。

### Q3: Token验证失败？

确保`SECRET_KEY`在`.env`中正确配置，且前后端使用相同的密钥。

### Q4: 如何修改Token过期时间？

修改`.env`文件：
```env
ACCESS_TOKEN_EXPIRE_MINUTES=120  # 改为2小时
REFRESH_TOKEN_EXPIRE_DAYS=14     # 改为14天
```

## 📄 许可证

MIT License

---

**开发团队**: Web3D项目组  
**最后更新**: 2025-04-18
