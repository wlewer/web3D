# 统一依赖管理规范

> 📅 创建日期：2026-04-18  
> 🎯 目标：统一管理所有依赖，避免多个依赖文件导致的维护困难

---

## 📋 依赖管理原则

### ✅ 统一规范

1. **Python 依赖** - 统一在 `backend/requirements.txt`
2. **JavaScript 依赖** - 统一在 `src/web-frontend/package.json`
3. **删除** 所有子目录的独立依赖文件
4. **开源代码** - 作为代码参考，不作为独立项目维护

### ❌ 避免的问题

- ❌ 多个 `requirements.txt` 文件
- ❌ 多个 `package.json` 文件
- ❌ 版本冲突
- ❌ 维护困难

---

## 📦 当前依赖结构

### Python 后端（backend/requirements.txt）

```
backend/
└── requirements.txt          ← 唯一 Python 依赖文件
    ├── FastAPI 框架
    ├── 数据库（SQLAlchemy, asyncpg）
    ├── 认证（JWT, bcrypt）
    ├── AI 3D 生成（Hunyuan3D-2）
    └── 其他工具库
```

**总依赖数**：约 45 个

**安装命令**：
```bash
cd backend
pip install -r requirements.txt
```

---

### JavaScript 前端（src/web-frontend/package.json）

```
src/web-frontend/
└── package.json              ← 唯一 JavaScript 依赖文件
    ├── React 19 + TypeScript
    ├── 3D 引擎（Spark, Three.js, PlayCanvas）
    ├── Refine 管理后台
    ├── SuperSplat 编辑器依赖
    └── 开发工具
```

**总依赖数**：约 40 个

**安装命令**：
```bash
cd src/web-frontend
npm install
```

---

## 🔧 依赖来源说明

### Python 依赖来源

| 来源 | 数量 | 说明 |
|------|------|------|
| **FastAPI 框架** | 15 | Web 后端核心 |
| **数据库** | 5 | PostgreSQL, SQLite |
| **AI 3D 生成** | 25 | Hunyuan3D-2 及依赖 |

### JavaScript 依赖来源

| 来源 | 数量 | 说明 |
|------|------|------|
| **React 前端** | 15 | 主应用框架 |
| **3D 引擎** | 8 | Spark, Three.js, PlayCanvas |
| **管理后台** | 10 | Refine + Ant Design |
| **SuperSplat** | 7 | 3DGS 编辑器 |

---

## 📁 代码结构

### 推荐结构

```
web3D/
├── backend/
│   └── requirements.txt          ← Python 依赖（统一）
│
├── src/
│   ├── web-frontend/
│   │   └── package.json          ← JS 依赖（统一）
│   │
│   ├── supersplat/               ← 开源代码（参考用）
│   │   ├── src/                  ← SuperSplat 源码
│   │   └── package.json          ← ⚠️ 仅供参考，不独立安装
│   │
│   └── hunyuan3d/                ← 开源代码（参考用）
│       ├── *.py                  ← Hunyuan3D 源码
│       └── requirements.txt      ← ❌ 已删除，使用 backend/requirements.txt
│
└── docs/
    └── DEPENDENCY_MANAGEMENT.md  ← 本文件
```

---

## 🚀 使用指南

### 安装所有依赖

```bash
# 1. 安装 Python 后端依赖
cd backend
pip install -r requirements.txt

# 2. 安装 JavaScript 前端依赖
cd ../src/web-frontend
npm install
```

### 添加新依赖

**Python**：
```bash
# 编辑 backend/requirements.txt
echo "新包名==版本号" >> backend/requirements.txt

# 重新安装
cd backend
pip install -r requirements.txt
```

**JavaScript**：
```bash
# 使用 npm 安装（自动更新 package.json）
cd src/web-frontend
npm install 包名

# 或手动编辑 package.json
```

### 更新依赖

```bash
# Python
pip list --outdated          # 查看可更新
pip install --upgrade 包名    # 更新单个包

# JavaScript
npm outdated                 # 查看可更新
npm update                   # 更新所有包
```

---

## ⚠️ 重要注意事项

### 1. 不要创建新的依赖文件

❌ **错误做法**：
```bash
# 不要在子目录创建独立依赖文件
src/supersplat/requirements.txt    ← ❌ 错误
src/hunyuan3d/package.json         ← ❌ 错误
```

✅ **正确做法**：
```bash
# 所有依赖统一添加
backend/requirements.txt           ← ✅ Python 统一
src/web-frontend/package.json      ← ✅ JS 统一
```

### 2. 开源代码作为参考

- ✅ `src/supersplat/` - 保留源码，作为代码参考
- ✅ `src/hunyuan3d/` - 保留源码，作为代码参考
- ❌ 不独立运行这些开源项目
- ❌ 不独立安装它们的依赖

### 3. 版本兼容性

在添加依赖时注意：
- ✅ Python 版本统一使用 3.8+
- ✅ Node.js 版本统一使用 18+
- ✅ 检查依赖之间的版本冲突
- ✅ 使用 `pip freeze` 和 `npm list` 验证

---

## 📊 依赖统计

### Python 依赖分类

| 分类 | 包数 | 示例 |
|------|------|------|
| Web 框架 | 2 | fastapi, uvicorn |
| 数据库 | 5 | sqlalchemy, asyncpg |
| 认证 | 4 | python-jose, bcrypt |
| AI/ML | 25 | torch, diffusers |
| 工具 | 9 | httpx, loguru |
| **总计** | **45** | - |

### JavaScript 依赖分类

| 分类 | 包数 | 示例 |
|------|------|------|
| 核心框架 | 4 | react, typescript |
| 3D 引擎 | 8 | spark, three |
| UI 框架 | 5 | antd, refine |
| 开发工具 | 15 | vite, eslint |
| 国际化 | 4 | i18next |
| **总计** | **36** | - |

---

## 🔍 依赖冲突解决

### Python 依赖冲突

```bash
# 1. 查看依赖树
pipdeptree

# 2. 解决冲突
pip install 包名==特定版本

# 3. 使用虚拟环境隔离
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

### JavaScript 依赖冲突

```bash
# 1. 清理缓存
npm cache clean --force

# 2. 删除 node_modules
rm -rf node_modules package-lock.json

# 3. 重新安装
npm install
```

---

## 📝 维护记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-04-18 | 初始创建 | 统一依赖管理规范 |
| 2026-04-18 | 合并 Hunyuan3D 依赖 | 添加到 backend/requirements.txt |
| 2026-04-18 | 合并 SuperSplat 依赖 | 添加到 web-frontend/package.json |
| 2026-04-18 | 删除独立依赖文件 | 删除 hunyuan3d/requirements.txt |

---

## 🔗 相关文档

- **核心架构**：[`docs/03-技术文档/核心架构速查-OK.md`](../docs/03-技术文档/核心架构速查-OK.md)
- **Python 依赖**：[`backend/requirements.txt`](../backend/requirements.txt)
- **JS 依赖**：[`src/web-frontend/package.json`](../src/web-frontend/package.json)

---

**维护者**：Web3D 开发团队  
**最后更新**：2026-04-18
