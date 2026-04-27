# 数据库SQL执行指南

> 📅 创建日期：2025年4月18日  
> 📄 版本：v1.0  
> 🗄️ 数据库：PostgreSQL 16+

---

## 📦 文件说明

### 可用的SQL文件

| 文件名 | 路径 | 说明 | 状态 |
|--------|------|------|------|
| **init_database.sql** | `backend/database/init_database.sql` | 完整数据库初始化脚本（含中英双语注释） | ✅ 可直接执行 |
| **migrations/** | `backend/database/migrations/` | Alembic迁移脚本目录 | ⏳ 待生成 |

---

## ✅ SQL文件特点

### 1. 完整的中英双语注释

每个字段都有两种注释方式：

```sql
-- 方式1：行内注释（便于阅读）
username VARCHAR(50) UNIQUE NOT NULL,  -- 用户名 / Username for login

-- 方式2：COMMENT ON COLUMN（存储在数据库中，可通过工具查看）
COMMENT ON COLUMN users.username IS '用户名 - Username for login and display';
```

### 2. 可直接执行

- ✅ 纯SQL语句，无Markdown格式
- ✅ 包含所有必要的CREATE TABLE、INDEX、TRIGGER、COMMENT
- ✅ 按依赖顺序排列（先创建被引用的表）
- ✅ 包含错误处理和完成提示

### 3. 完整的对象创建

- ✅ 扩展（Extensions）
- ✅ 表（Tables）
- ✅ 索引（Indexes）
- ✅ 触发器（Triggers）
- ✅ 函数（Functions）
- ✅ 注释（Comments）

---

## 🚀 执行方法

### 方法1：命令行执行（推荐）

```bash
# 1. 连接到PostgreSQL数据库
psql -h localhost -U postgres -d web3d

# 2. 执行初始化脚本
\i backend/database/init_database.sql

# 或者一行命令
psql -h localhost -U postgres -d web3d_production -f backend/database/init_database.sql
```

### 方法2：Docker容器内执行

```bash
# 进入PostgreSQL容器
docker exec -it web3d-postgres psql -U postgres -d web3d_production

# 执行脚本（需要先将脚本复制到容器内）
docker cp backend/database/init_database.sql web3d-postgres:/tmp/
docker exec -it web3d-postgres psql -U postgres -d web3d_production -f /tmp/init_database.sql
```

### 方法3：图形化工具

#### pgAdmin 4

1. 打开pgAdmin，连接到数据库
2. 右键点击数据库 → Query Tool
3. 打开文件：`backend/database/init_database.sql`
4. 点击执行按钮（▶️）或按F5

#### DBeaver

1. 连接到PostgreSQL数据库
2. SQL编辑器 → 打开文件
3. 选择 `backend/database/init_database.sql`
4. 执行SQL脚本（Alt+X）

#### DataGrip

1. 连接到数据库
2. 控制台 → 运行SQL文件
3. 选择 `init_database.sql`
4. 执行

---

## 📋 执行前检查清单

### 1. 环境准备

- [ ] PostgreSQL 16+ 已安装并运行
- [ ] 数据库 `web3d` 已创建
- [ ] 用户权限足够（需要CREATE、ALTER权限）
- [ ] 磁盘空间充足（预计需要1-2GB）

### 2. 创建数据库

```sql
-- 如果数据库不存在，先创建
CREATE DATABASE web3d 
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;
```

### 3. 备份现有数据（如果有）

```bash
# 备份现有数据库
pg_dump -h localhost -U postgres -Fc web3d > backup_$(date +%Y%m%d).dump
```

---

## 🔍 验证执行结果

### 1. 检查表是否创建成功

```sql
-- 查看所有表
\dt

-- 或者
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**预期输出**：
```
List of relations
 Schema |         Name          | Type  |  Owner   
--------+-----------------------+-------+----------
 public | users                 | table | postgres
 public | user_sessions         | table | postgres
 public | user_oauth_bindings   | table | postgres
 public | models_3d             | table | postgres
 ...
```

### 2. 检查字段注释

```sql
-- 查看users表的字段注释
SELECT 
    column_name,
    col_description(('public.users'::regclass)::oid, ordinal_position) AS comment
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;
```

**预期输出**：
```
   column_name    |                        comment                        
------------------+---------------------------------------------------------
 id               | 用户唯一ID - Unique user identifier
 username         | 用户名 - Username for login and display
 email            | 邮箱地址 - Email address for login and notifications
 password_hash    | 密码哈希（bcrypt加密）- Password hash encrypted with bcrypt
 ...
```

### 3. 检查索引

```sql
-- 查看users表的索引
\di users*

-- 或者
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;
```

### 4. 检查触发器

```sql
-- 查看所有触发器
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### 5. 测试插入数据

```sql
-- 插入测试用户
INSERT INTO users (username, email, password_hash, role, status)
VALUES (
    'test_user',
    'test@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILp92S.0i',
    'user',
    'active'
);

-- 查询验证
SELECT id, username, email, role, status FROM users WHERE username = 'test_user';

-- 清理测试数据
DELETE FROM users WHERE username = 'test_user';
```

---

## ⚠️ 常见问题

### Q1: 执行时提示"extension already exists"

**原因**: 扩展已经存在

**解决**: 脚本中已使用 `CREATE EXTENSION IF NOT EXISTS`，可以忽略此警告

### Q2: 提示"relation already exists"

**原因**: 表已经存在

**解决**: 
```sql
-- 方案1：删除现有表后重新创建（会丢失数据！）
DROP TABLE IF EXISTS users CASCADE;
-- 然后重新执行脚本

-- 方案2：使用Alembic迁移（推荐用于生产环境）
alembic upgrade head
```

### Q3: 权限不足

**错误信息**: `permission denied for database web3d`

**解决**:
```sql
-- 使用超级用户执行
psql -h localhost -U postgres -d web3d_production -f init_database.sql

-- 或者授予权限
GRANT ALL PRIVILEGES ON DATABASE web3d TO your_user;
GRANT ALL ON SCHEMA public TO your_user;
```

### Q4: 编码问题

**错误信息**: `invalid byte sequence for encoding "UTF8"`

**解决**:
```sql
-- 确保数据库使用UTF8编码
SHOW server_encoding;  -- 应该是 UTF8

-- 设置客户端编码
SET client_encoding = 'UTF8';
```

### Q5: 注释不显示

**原因**: 某些GUI工具可能不显示COMMENT

**解决**: 
```sql
-- 使用psql命令行查看
\d+ users  -- 会显示完整的表结构和注释

-- 或者查询系统表
SELECT 
    c.column_name,
    pg_catalog.col_description(
        ('public.users'::regclass)::oid, 
        c.ordinal_position
    ) AS comment
FROM information_schema.columns c
WHERE c.table_schema = 'public' 
  AND c.table_name = 'users';
```

---

## 🔄 后续维护

### 使用Alembic进行迁移

初始化完成后，建议使用Alemband管理后续的数据库变更：

```bash
# 1. 初始化Alembic
cd backend
alembic init alembic

# 2. 配置alembic.ini
# 修改 sqlalchemy.url = postgresql://user:pass@localhost/web3d

# 3. 创建迁移脚本
alembic revision --autogenerate -m "add new table"

# 4. 应用迁移
alembic upgrade head

# 5. 回滚迁移
alembic downgrade -1
```

### 定期备份

```bash
# 每日全量备份
0 3 * * * pg_dump -h localhost -U postgres -Fc web3d > /backup/web3d_$(date +\%Y\%m\%d).dump

# 每小时增量备份（需要配置WAL归档）
```

---

## 📞 技术支持

如遇到问题，请：

1. 检查PostgreSQL日志：`/var/log/postgresql/postgresql-16-main.log`
2. 查看错误信息中的具体行号
3. 联系DBA团队：dba@web3d.com

---

**最后更新**: 2025年4月18日  
**维护者**: Web3D数据库团队
