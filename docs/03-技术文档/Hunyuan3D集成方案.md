# Hunyuan3D AI 生成服务 - 三模式架构使用指南

## 📋 概述

本项目实现了完整的"图生3D"功能，支持三种运行模式，方便从演示到生产的平滑过渡：

| 模式 | 用途 | 依赖 | 适用场景 |
|------|------|------|----------|
| **Mock模式** | 技术演示和验证 | 无 | 本地测试、手机端演示 |
| **Local模式** | 真实AI生成 | NVIDIA GPU + Hunyuan3D服务 | 本地开发、私有部署 |
| **Cloud模式** | 云端API调用 | 腾讯云API Key | 生产环境、无需GPU |

---

## 🚀 快速开始（Mock模式）

### 1. 启动后端服务

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 启动前端服务

```bash
cd src/web-frontend
npm run dev
```

### 3. 访问生成页面

打开浏览器访问：`http://localhost:5173`，点击导航栏的 **"⚡ AI生成"** 按钮。

### 4. 测试流程

1. 上传一张清晰的图片（建议主体明确）
2. Mock模式会在5秒后模拟生成完成
3. 查看任务状态和进度条
4. 点击"下载 GLB 模型"按钮（Mock模式返回示例文件）

---

## 🔧 切换到 Local 模式（本地GPU服务）

### 前置条件

- NVIDIA GPU（推荐 RTX 3090 或更高）
- CUDA 11.8+
- 已部署 Hunyuan3D API 服务

### 配置步骤

1. 复制环境变量文件：
   ```bash
   cd backend
   cp .env.example .env
   ```

2. 编辑 `.env` 文件：
   ```env
   HUNYUAN3D_MODE=local
   HUNYUAN3D_BASE_URL=http://localhost:8081
   HUNYUAN3D_TIMEOUT=300
   ```

3. 重启后端服务

### 部署 Hunyuan3D API 服务

参考官方文档：https://github.com/Tencent/Hunyuan3D-1

```bash
# 克隆仓库
git clone https://github.com/Tencent/Hunyuan3D-1.git
cd Hunyuan3D-1

# 安装依赖
pip install -r requirements.txt

# 启动API服务
python api_server.py --host 0.0.0.0 --port 8081
```

---

## ☁️ 切换到 Cloud 模式（腾讯云服务）

### 前置条件

- 腾讯云账号
- 已申请 Hunyuan3D API Key

### 配置步骤

1. 编辑 `.env` 文件：
   ```env
   HUNYUAN3D_MODE=cloud
   HUNYUAN3D_CLOUD_API_KEY=your_api_key_here
   HUNYUAN3D_TIMEOUT=300
   ```

2. 重启后端服务

### 申请 API Key

访问腾讯云官网：https://hy3d.dev

---

## 📱 手机端测试

### 方法一：局域网访问

1. 确保手机和电脑在同一WiFi网络
2. 查看电脑IP地址：
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
3. 在手机浏览器访问：`http://[电脑IP]:5173`
4. 上传手机相册中的图片进行测试

### 方法二：内网穿透（推荐）

使用 ngrok 或 frp 将本地服务暴露到公网：

```bash
# 使用 ngrok
ngrok http 5173
```

然后在手机浏览器访问 ngrok 提供的URL。

---

## 🏗️ 技术架构

### 后端架构

```
backend/
├── app/
│   ├── api/v1/generation.py          # API路由
│   ├── services/generation/
│   │   └── hunyuan3d_service.py      # 三模式服务实现
│   └── config.py                      # 配置管理
└── .env                               # 环境变量
```

### 前端架构

```
src/web-frontend/
├── src/pages/Generation/
│   ├── GenerationPage.tsx             # 主页面组件
│   ├── GenerationPage.css             # 样式文件
│   └── generation.service.ts          # API服务封装
└── src/App.tsx                        # 路由配置
```

### 数据流

```
用户上传图片
    ↓
前端调用 uploadAndGenerate()
    ↓
后端接收请求 → 根据HUNYUAN3D_MODE选择模式
    ↓
Mock模式: 立即返回模拟任务ID
Local模式: 调用本地Hunyuan3D API
Cloud模式: 调用腾讯云API
    ↓
前端轮询查询状态 (waitForCompletion)
    ↓
生成完成后下载GLB模型
```

---

## 📊 API 接口说明

### 1. 上传并生成

```http
POST /api/v1/generation/upload
Content-Type: multipart/form-data

file: <image_file>
enable_texture: false
```

**响应：**
```json
{
  "uid": "mock_1234567890",
  "status": "processing",
  "warning": "This is a mock response..."
}
```

### 2. 查询生成状态

```http
GET /api/v1/generation/status/{uid}
```

**响应：**
```json
{
  "status": "completed",
  "model_base64": null,
  "warning": "This is a mock response..."
}
```

### 3. 下载模型

```http
GET /api/v1/generation/download/{uid}
```

---

## 🔍 常见问题

### Q1: Mock模式下能下载真实的GLB模型吗？

A: Mock模式仅用于演示流程，不生成真实模型。如需真实模型，请切换到 Local 或 Cloud 模式。

### Q2: 如何确认当前运行的是哪种模式？

A: 在GenerationPage页面顶部会显示当前模式提示。也可以在后端日志中查看：
```
INFO: Hunyuan3DService initialized in MOCK mode
```

### Q3: Local模式启动失败怎么办？

A: 检查以下几点：
1. Hunyuan3D API服务是否正常运行（访问 http://localhost:8081/docs）
2. 网络连接是否正常
3. 查看后端日志中的错误信息

### Q4: 手机端无法访问怎么办？

A: 
1. 确保防火墙允许8000和5173端口
2. 检查手机和电脑是否在同一网络
3. 尝试使用内网穿透工具

### Q5: 如何切换模式？

A: 修改 `backend/.env` 文件中的 `HUNYUAN3D_MODE`，然后重启后端服务。

---

## 📝 下一步计划

1. **完善 Cloud 模式**：实现腾讯云API调用逻辑
2. **添加批量生成**：支持一次上传多张图片
3. **优化用户体验**：添加实时预览、模型编辑等功能
4. **性能监控**：记录生成时间、成功率等指标

---

## 📚 相关文档

- [Hunyuan3D 官方仓库](https://github.com/Tencent/Hunyuan3D-1)
- [腾讯云 Hunyuan3D 服务](https://hy3d.dev)
- [项目技术架构文档](../../docs/03-技术文档/)

---

## 💡 技术支持

如有问题，请查看：
1. 后端日志：`backend/logs/`
2. 前端控制台：浏览器开发者工具
3. API文档：http://localhost:8000/docs
