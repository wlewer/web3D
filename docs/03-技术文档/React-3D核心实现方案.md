# React 3D核心实现方案

## 文档信息

| 项目 | 内容 |
|:---|:---|
| **文档标题** | React 3D核心实现方案 |
| **版本** | v1.0 |
| **日期** | 2026-04-18 |
| **状态** | 执行中 |

---

## 一、项目目标

### 1.1 当前阶段目标

```
第一阶段：Web端3D核心官网

✅ 动态3D背景展示（Spark 2.0）
✅ 3D作品在线预览（多种格式支持）
✅ 手机建模入口（拍照引导 + 上传）
✅ 用户作品管理（注册/登录/作品CRUD）
```

### 1.2 技术范围

| 范围 | 技术选型 |
|:---|:---|
| **前端框架** | React 18 + Vite + TypeScript |
| **3D渲染** | Three.js + React Three Fiber |
| **3DGS专用** | Spark 2.0（3DGS点云渲染） |
| **UI组件** | Ant Design 5 |
| **状态管理** | Zustand |
| **后端API** | Python + FastAPI |

---

## 二、源代码目录结构

### 2.1 标准结构

```
src/
├── web-frontend/               # Web前端应用
│   ├── src/
│   │   ├── components/        # ⭐ 组件目录
│   │   │   ├── common/        # 通用组件
│   │   │   ├── layout/        # 布局组件
│   │   │   ├── 3d/            # 3D组件 ⭐
│   │   │   └── business/      # 业务组件
│   │   ├── pages/             # ⭐ 页面目录
│   │   ├── hooks/             # 自定义Hook
│   │   ├── services/          # API服务
│   │   ├── stores/            # 状态管理
│   │   └── utils/             # 工具函数
│   └── package.json
│
├── api-gateway/                 # API网关服务
├── user-service/                # 用户服务
└── task-service/                # 任务服务
```

### 2.2 3D组件模块结构

```
src/components/3d/
├── core/                        # ⭐ 核心组件
│   ├── Scene.tsx               # 3D场景容器
│   ├── Camera.tsx              # 相机组件
│   └── Lights.tsx              # 光照组件
│
├── loaders/                     # ⭐ 加载器组件
│   ├── ModelLoader.tsx         # 通用模型加载
│   └── SparkLoader.tsx         # Spark 2.0加载
│
├── controls/                    # ⭐ 控制器组件
│   └── OrbitControls.tsx       # 轨道控制器
│
└── viewers/                     # ⭐ 查看器组件
    ├── ModelViewer.tsx         # 模型查看器
    └── SparkViewer.tsx          # Spark查看器
```

---

## 三、核心3D组件

### 3.1 场景容器组件

```tsx
// src/components/3d/core/Scene.tsx
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';

interface SceneProps {
  children: React.ReactNode;
  cameraPosition?: [number, number, number];
}

export const Scene = ({ children, cameraPosition = [0, 2, 5] }: SceneProps) => {
  return (
    <Canvas shadows dpr={[1, 2]}>
      <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <Environment preset="city" />
      <Suspense fallback={null}>
        {children}
      </Suspense>
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
};
```

### 3.2 Spark 2.0 渲染器组件

```tsx
// src/components/3d/viewers/SparkViewer.tsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface SparkViewerProps {
  url: string;
  autoRotate?: boolean;
}

export const SparkViewer = ({ url, autoRotate = false }: SparkViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Spark 2.0 渲染逻辑
    // 详见完整文档
  }, [url]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loading && <div className="absolute inset-0">加载中... {progress}%</div>}
    </div>
  );
};
```

### 3.3 3D背景组件

```tsx
// src/components/3d/Background3D.tsx
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Particles = ({ count = 2000 }) => {
  const mesh = useRef<THREE.Points>(null);
  // 生成随机位置和颜色
  const particles = useMemo(() => { /* ... */ }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = state.clock.elapsedTime * 0.075;
  });

  return <points ref={mesh}>{/* particles */}</points>;
};

export const Background3D = () => {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <color attach="background" args={['#0a0a1a']} />
        <Particles count={3000} />
      </Canvas>
    </div>
  );
};
```

---

## 四、首页实现

### 4.1 页面结构

```
src/pages/Home/
├── index.tsx                   # 主页面
├── components/
│   ├── Hero3D.tsx             # Hero 3D区域
│   ├── Features.tsx            # 功能特性
│   └── Gallery.tsx             # 作品画廊
└── hooks/
    └── useHome.ts              # 页面Hook
```

### 4.2 Hero 3D组件

```tsx
// src/pages/Home/components/Hero3D.tsx
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';

const AnimatedCube = () => {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </Float>
  );
};

export const Hero3D = () => {
  return (
    <div className="w-full h-full">
      <Canvas>
        <Suspense fallback={null}>
          <AnimatedCube />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};
```

---

## 五、安装与运行

### 5.1 初始化项目

```bash
# 创建React + Vite项目
npm create vite@latest web3d-frontend -- --template react-ts
cd web3d-frontend

# 安装3D依赖
npm install three @react-three/fiber @react-three/drei three-stdlib

# 安装UI依赖
npm install antd @ant-design/icons zustand axios react-router-dom

# 安装样式
npm install -D tailwindcss postcss autoprefixer

# 启动开发
npm run dev
```

---

## 六、实施计划

| 周次 | 任务 | 目标 |
|:---|:---|:---|
| **第一周** | 项目搭建 | 3D环境就绪 |
| **第二周** | 首页开发 | Hero 3D + 画廊 |
| **第三周** | 核心功能 | 模型查看器 + 认证 |
| **第四周** | 完善优化 | 响应式 + 性能 |

---

## 七、相关文档

| 文档 | 位置 | 说明 |
|:---|:---|:---|
| 技术架构 | `../01-需求文档/技术架构.md` | 整体技术方案 |
| 3DGS技术方案 | `../01-需求文档/3DGS技术官网完整技术方案.md` | 完整技术文档 |
| 移动端对比 | `./Flutter与React移动端方案对比.md` | 移动端选型 |

---

**文档版本历史**

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0 | 2026-04-18 | 初始版本 |
