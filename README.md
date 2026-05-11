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

## V3组件技术核心渲染解析

### 核心优势：SPZ 格式带来的渲染革命

V3 组件采用 **SPZ（3D Gaussian Splatting）** 格式，与传统 Web 3D 的 glTF/GLB（多边形网格）有本质区别：

| 对比维度 | 传统 glTF/GLB | V3 组件 SPZ |
|:---|:---|:---|
| **数据本质** | 三角形网格 + UV贴图 + 纹理图片 | 高斯椭球体（数学公式描述） |
| **文件大小** | 中等（纹理图片可能很大） | 更小（纯数学参数，无纹理图片） |
| **解码速度** | 需解析网格、UV、纹理、材质、动画 | 直接传入 GPU 计算 |
| **渲染方式** | CPU 三角化 → GPU 光栅化 | GPU 并行计算，每个高斯独立 |
| **加载模式** | 全量下载完才能渲染 | **渐进式渲染**（边下载边渲染） |
| **相机适配** | 需手动调参 | 自动智能居中 |

### 渐进式渲染（加载快的关键）

SPZ 支持 **边下载边渲染**，不像传统格式必须等整个文件下载完成。高斯数据流到达后立即在 GPU 上并行计算呈现：

- **首帧时间极短**：无需等待完整文件，点开就看
- **由粗到精**：先渲染粗糙全景，数据流持续到达后细节逐步丰富
- **用户感知**：一秒出全景，三秒达高清，体验接近图片加载

### 智能居中引擎

每次模型加载完成后自动计算：
- 模型真实包围盒（不依赖元数据）
- 最佳相机距离（自适应 canvas 宽高比）
- 自动居中到视野中央

确保任何尺寸/位置的模型都自动完美居中，无需人工调参。

### 三引擎协同架构

```
UniversalGaussianCardV3（业务组件）
    ↓
Base3DViewer（基础渲染器）
    ├── ModelLoader           → 多格式统一加载 + 预加载缓存
    ├── SmartCenteringEngine  → 自动相机适配
    ├── CameraManager         → 平滑过渡动画
    ├── SceneDecoration       → 粒子/展示台/标签（零开销开关）
    └── OrbitController       → 环绕动画（5种模式）
```

### 加载速度解析

快速加载源于四个技术层级的叠加：

1. **SPZ 格式优势** — 文件体积小，GPU 直通渲染，不阻塞主线程
2. **渐进式渲染** — 首帧时间极短，用户体验从"等十秒看一张图"变为"秒开即看"
3. **预加载机制** — `ModelLoader.preloadBatch()` 支持批量后台预加载
4. **浏览器缓存** — 二次加载时本地缓存加速，但首次加载已比传统 glTF 快

### 适用场景

- 在线教育（3D 教学模型即时展示）
- 数字展厅（秒开高精度文物/艺术品）
- 电商展示（3D 商品即时预览）
- AI 3D生成（生成后即刻查看效果）

---

## License

MIT License

*最后更新：2026-04-18*
