# SmartAI 3DGS - 3D Gaussian Splatting 技术平台

## 项目简介

基于 **React + Spark.js (Three.js-based 3DGS)** 的3D Gaussian Splatting技术官网，实现真实3DGS模型流畅渲染和手机拍照建模功能。

---

## 技术栈

| 层级 | 技术选型 |
|:---|:---|
| **前端框架** | React 18 + Vite 5 + TypeScript 5 |
| **3D渲染** | Three.js + Spark.js (3DGS) |
| **UI组件** | Ant Design 5 |
| **状态管理** | Zustand |
| **国际化** | i18n (中文/英文) |

---

## 核心功能

| 功能 | 说明 |
|:---|:---|
| 🎯 **SuperSplat** | PlayCanvas官方3DGS查看器集成 |
| 🦋 **模型展示** | 6个官方3DGS模型轮番展示 |
| 🔄 **自动轮播** | 模型自动切换展示 |
| 🌐 **多语言** | 中英文切换 |
| 📱 **响应式** | 适配所有屏幕尺寸 |
| ⚡ **AI生成** | 图生3D模型（支持Mock/Local/Cloud三种模式） |

---

## 快速开始

### 方式一：一键启动演示（推荐）

```bash
# Windows
start_demo.bat

# Mac/Linux
chmod +x start_demo.sh
./start_demo.sh
```

这将同时启动后端和前端服务，默认使用 **Mock模式** 进行技术演示。

### 方式二：手动启动

#### 1. 启动后端服务

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. 启动前端服务

```bash
cd src/web-frontend
npm install
npm run dev
```

访问 http://localhost:5173 查看效果

### 手机端测试

1. 确保手机和电脑在同一WiFi网络
2. 查看电脑IP地址：`ipconfig` (Windows) 或 `ifconfig` (Mac/Linux)
3. 在手机浏览器访问：`http://[电脑IP]:5173`
4. 点击导航栏的 "⚡ AI生成" 进行测试

---

## 项目结构

```
src/web-frontend/
├── src/
│   ├── components/3d/     # 3D组件库
│   │   ├── Spark/         # Spark.js渲染器
│   │   └── SuperSplat/    # PlayCanvas集成
│   ├── pages/             # 页面组件
│   │   ├── Home/          # 首页
│   │   ├── Gallery/       # 画廊
│   │   ├── SuperSplat/    # SuperSplat展示
│   │   └── Upload/        # 上传建模
│   ├── i18n/              # 国际化
│   └── stores/            # 状态管理
└── package.json
```

---

## 文档结构

```
docs/
├── 01-需求文档/              # 需求分析文档
├── 02-设计文档/              # 架构设计文档
├── 03-技术文档/              # 技术实现文档
├── 04-开发文档/              # 开发规范文档
├── 05-测试文档/              # 测试相关文档
├── 06-部署文档/              # 部署运维文档
├── 07-运维文档/              # 运维相关文档
├── 08-项目管理/              # 项目管理文档
└── 09-debug/                # 调试文档
```

---

## 开源技术

| 技术 | 说明 | 协议 |
|:---|:---|:---|
| Spark.js | Three.js-based 3DGS渲染 | MIT |
| PlayCanvas | WebGL游戏引擎 | MIT |
| SuperSplat | 3DGS编辑器/查看器 | MIT |
| Three.js | WebGL 3D渲染库 | MIT |

---

## License

MIT License

*最后更新：2026-04-18*
