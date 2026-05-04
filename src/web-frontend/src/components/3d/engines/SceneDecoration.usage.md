# SceneDecoration 场景装饰组件使用指南

## 📋 概述

`SceneDecoration` 是一个统一的场景装饰管理组件，集成了三种装饰效果：

1. **粒子背景** (ParticleBackground) - 3D空间中的紫色渐变粒子
2. **展示台** (DisplayPlatform) - 圆柱体平台 + 装饰环
3. **产品标签** (ProductLabels) - Canvas渲染的3D标签精灵

所有装饰模块可以独立开关，通过配置对象统一管理。

---

## 🚀 快速开始

### 基础用法

```typescript
import { Base3DViewer } from './components/3d/Base3DViewer';
import type { DecorationConfig } from './components/3d/engines/SceneDecoration';

// 配置装饰效果
const decorations: DecorationConfig = {
  particles: {
    enabled: true,
    count: 3000,
    size: 0.05,
    opacity: 0.6
  },
  platform: {
    enabled: true,
    platformColor: '#1a1a2e',
    ringColor: '#667eea'
  },
  labels: {
    enabled: true,
    products: [
      {
        id: 'product-1',
        name: '产品名称',
        nameEn: 'Product Name',
        description: '产品描述',
        descriptionEn: 'Product Description',
        position: [0, 1, 0],
        color: '#667eea'
      }
    ],
    language: 'zh'
  }
};

// 在Base3DViewer中使用
<Base3DViewer
  modelUrl="/models/example.spz"
  decorations={decorations}
  onLoadComplete={() => console.log('加载完成')}
/>
```

---

## 📖 API 文档

### DecorationConfig 类型定义

```typescript
interface DecorationConfig {
  particles?: ParticleConfig;   // 粒子背景配置
  platform?: PlatformConfig;    // 展示台配置
  labels?: LabelsConfig;        // 产品标签配置
}
```

### ParticleConfig（粒子背景）

```typescript
interface ParticleConfig {
  enabled?: boolean;        // 是否启用，默认false
  count?: number;           // 粒子数量，默认3000
  size?: number;            // 粒子大小，默认0.05
  opacity?: number;         // 透明度，默认0.6
  spread?: number;          // 扩散范围，默认30
  colorRange?: {            // 颜色范围（RGB）
    r: [number, number];    // R通道范围，默认[0.4, 0.7]
    g: [number, number];    // G通道范围，默认[0.3, 0.5]
    b: [number, number];    // B通道范围，默认[0.9, 1.0]
  };
}
```

**示例：**

```typescript
// 创建星空效果
particles: {
  enabled: true,
  count: 5000,
  size: 0.03,
  opacity: 0.8,
  spread: 50,
  colorRange: {
    r: [0.8, 1.0],  // 白色
    g: [0.8, 1.0],
    b: [0.9, 1.0]
  }
}

// 创建火焰效果
particles: {
  enabled: true,
  count: 2000,
  size: 0.08,
  opacity: 0.7,
  spread: 20,
  colorRange: {
    r: [0.8, 1.0],  // 红色-橙色
    g: [0.2, 0.5],
    b: [0.0, 0.2]
  }
}
```

### PlatformConfig（展示台）

```typescript
interface PlatformConfig {
  enabled?: boolean;        // 是否启用，默认false
  platformColor?: string;   // 平台颜色，默认'#1a1a2e'
  ringColor?: string;       // 装饰环颜色，默认'#667eea'
  platformY?: number;       // 平台Y轴位置，默认-1
}
```

**示例：**

```typescript
// 金色展示台
platform: {
  enabled: true,
  platformColor: '#FFD700',
  ringColor: '#FFA500',
  platformY: -0.8
}

// 科技感蓝色展示台
platform: {
  enabled: true,
  platformColor: '#001f3f',
  ringColor: '#0074D9',
  platformY: -1.2
}
```

### LabelsConfig（产品标签）

```typescript
interface LabelsConfig {
  enabled?: boolean;        // 是否启用，默认false
  products?: ProductLabel[];// 产品标签数据
  language?: 'zh' | 'en';   // 语言，默认'zh'
}

interface ProductLabel {
  id: string;                        // 唯一标识
  name: string;                      // 中文名称
  nameEn?: string;                   // 英文名称
  description: string;               // 中文描述
  descriptionEn?: string;            // 英文描述
  position?: [number, number, number]; // 3D位置，默认[0, 0, 0]
  color?: string;                    // 边框颜色，默认'#667eea'
}
```

**示例：**

```typescript
labels: {
  enabled: true,
  language: 'zh',
  products: [
    {
      id: 'label-1',
      name: '核心部件',
      nameEn: 'Core Component',
      description: '这是产品的核心部件，负责主要功能',
      descriptionEn: 'The core component responsible for main functions',
      position: [0.5, 1.2, 0.3],
      color: '#FF6B6B'
    },
    {
      id: 'label-2',
      name: '辅助模块',
      nameEn: 'Auxiliary Module',
      description: '提供辅助功能的模块',
      descriptionEn: 'Module providing auxiliary functions',
      position: [-0.5, 0.8, -0.2],
      color: '#4ECDC4'
    }
  ]
}
```

---

## 💡 使用场景

### 场景1：首页全屏展示（Featured Layout）

```typescript
const featuredDecorations: DecorationConfig = {
  particles: { enabled: true, count: 3000 },
  platform: { enabled: true },
  labels: { enabled: false }
};

<Base3DViewer
  modelUrl="/models/hero.spz"
  decorations={featuredDecorations}
  autoRotate={true}
  enableControls={true}
/>
```

### 场景2：产品展示页（带标签）

```typescript
const productDecorations: DecorationConfig = {
  particles: { enabled: false },
  platform: { enabled: true },
  labels: {
    enabled: true,
    products: [
      {
        id: 'feature-1',
        name: '智能芯片',
        description: '采用最新AI芯片，性能提升300%',
        position: [0.3, 1.0, 0.2],
        color: '#667eea'
      }
    ]
  }
};

<Base3DViewer
  modelUrl="/models/product.spz"
  decorations={productDecorations}
/>
```

### 场景3：画廊预览（无装饰）

```typescript
const galleryDecorations: DecorationConfig = {
  particles: { enabled: false },
  platform: { enabled: false },
  labels: { enabled: false }
};

<Base3DViewer
  modelUrl="/models/thumb.spz"
  decorations={galleryDecorations}
  autoRotate={true}
  enableControls={false}
/>
```

### 场景4：动态切换装饰

```typescript
const [showParticles, setShowParticles] = useState(false);
const [showPlatform, setShowPlatform] = useState(true);

const decorations: DecorationConfig = {
  particles: { enabled: showParticles },
  platform: { enabled: showPlatform },
  labels: { enabled: false }
};

<Base3DViewer
  modelUrl="/models/demo.spz"
  decorations={decorations}
/>

<button onClick={() => setShowParticles(!showParticles)}>
  切换粒子背景
</button>
```

---

## 🔧 高级用法

### 直接操作SceneDecoration类

如果你需要更精细的控制，可以直接使用`SceneDecoration`类：

```typescript
import { SceneDecoration } from './components/3d/engines/SceneDecoration';

// 在Three.js场景中手动创建
const scene = new THREE.Scene();
const decoration = new SceneDecoration(scene);

// 应用配置
decoration.apply({
  particles: { enabled: true, count: 5000 },
  platform: { enabled: true },
  labels: { enabled: true, products: [...] }
});

// 动态更新标签
decoration.updateLabels(newProducts);

// 显示/隐藏所有装饰
decoration.setVisible(false);
decoration.setVisible(true);

// 单独控制标签
decoration.showLabels();
decoration.hideLabels();

// 获取装饰引用
const particles = decoration.getParticles();
const platform = decoration.getPlatform();
const labelsGroup = decoration.getLabelsGroup();

// 清理资源
decoration.dispose();
```

---

## ⚠️ 注意事项

### 1. 性能优化

- **粒子数量**：建议不超过5000个，否则可能影响性能
- **标签数量**：建议不超过10个，每个标签都会创建Canvas纹理
- **展示台**：只有一个，性能开销很小

### 2. 内存管理

- 组件卸载时会自动调用`dispose()`清理资源
- 如果手动创建`SceneDecoration`实例，记得在不需要时调用`dispose()`

### 3. 标签显示时机

- 产品标签初始状态为**隐藏**
- 只有在模型加载完成后才会自动显示（通过`showLabels()`方法）
- 这避免了加载过程中标签跳动的问题

### 4. 语言切换

- 产品标签支持中英文切换
- 通过`language`参数控制
- 如果某个语言的文本不存在，会自动回退到另一种语言

---

## 🎨 自定义样式

### 修改粒子颜色

```typescript
particles: {
  enabled: true,
  colorRange: {
    r: [0.0, 0.3],  // 青色
    g: [0.8, 1.0],
    b: [0.8, 1.0]
  }
}
```

### 修改展示台高度

```typescript
platform: {
  enabled: true,
  platformY: -0.5  // 调整Y轴位置
}
```

### 修改标签样式

标签样式在`SceneDecoration.createLabelSprite()`方法中硬编码，如需自定义：

1. 复制`SceneDecoration.ts`文件
2. 修改`createLabelSprite()`方法中的Canvas绘制逻辑
3. 调整字体、颜色、背景等

---

## 📦 导出路径

```typescript
// 从引擎模块导出
import { SceneDecoration } from './components/3d/engines';
import type { 
  DecorationConfig,
  ParticleConfig,
  PlatformConfig,
  LabelsConfig,
  ProductLabel
} from './components/3d/engines';

// 或者直接从文件导入
import { SceneDecoration } from './components/3d/engines/SceneDecoration';
```

---

## 🔗 相关组件

- **Base3DViewer** - 基础3D查看器，已集成SceneDecoration
- **UniversalGaussianCardV2** - 完整功能卡片，内置装饰模块
- **SmartCenteringEngine** - 智能居中引擎
- **ModelLoader** - 统一模型加载器

---

## 📝 版本历史

- **v1.0.0** (2026-04-18) - 初始版本
  - 集成粒子背景、展示台、产品标签
  - 支持独立开关和配置
  - 完整的TypeScript类型定义
  - 自动资源清理

---

## ❓ 常见问题

### Q: 如何禁用所有装饰？

A: 不传递`decorations` prop，或传递空对象：

```typescript
<Base3DViewer
  modelUrl="/models/demo.spz"
  decorations={{}}  // 或者完全不传
/>
```

### Q: 粒子背景为什么看不到？

A: 检查以下几点：
1. `enabled`是否设置为`true`
2. 背景色是否与粒子颜色对比度足够
3. 相机距离是否太远（粒子spread默认为30）

### Q: 产品标签位置不对？

A: 标签位置是相对于模型中心的3D坐标，需要根据实际模型调整`position`参数。可以先设置为`[0, 0, 0]`，然后逐步调整。

### Q: 如何动态添加/删除标签？

A: 使用`updateLabels()`方法：

```typescript
decorationRef.current?.updateLabels(newProducts);
```

---

## 🎯 最佳实践

1. **根据布局选择装饰**：
   - Featured: 启用粒子和展示台
   - Grid/List: 仅启用必要的装饰
   - Gallery: 禁用所有装饰

2. **性能优先**：
   - 移动端减少粒子数量（1000-2000）
   - 桌面端可以使用更多粒子（3000-5000）

3. **用户体验**：
   - 产品标签只在必要时启用
   - 确保标签文字清晰可读
   - 避免标签遮挡模型关键部分

4. **代码组织**：
   - 将装饰配置提取为常量
   - 不同页面使用不同的配置预设
   - 使用TypeScript类型保证配置正确性

---

**最后更新**: 2026-04-18  
**维护者**: Lingma AI Assistant
