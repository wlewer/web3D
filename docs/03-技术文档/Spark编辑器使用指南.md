# Spark 2.0 3D编辑器使用指南

## 📋 概述

基于 `@sparkjsdev/spark ^2.0.0` 引擎开发的专业3D点云编辑器，提供完整的3D Gaussian Splat编辑功能。

## ✨ 核心功能

### 1. 基础编辑
- ✅ **点选择**: 可视化选中3D高斯点
- ✅ **删除操作**: 删除选中的点
- ✅ **撤销/重做**: Ctrl+Z / Ctrl+Y
- ✅ **视角控制**: 旋转、缩放、平移

### 2. 场景管理
- ✅ **加载模型**: 支持SPLAT、PLY格式
- ✅ **保存场景**: 导出为JSON配置
- ✅ **导出GLB**: 转换为标准3D格式
- ✅ **演示场景**: 内置示例点云

### 3. 显示设置
- ✅ **点大小调节**: 0.5 - 5.0
- ✅ **网格显示**: 开关参考网格
- ✅ **自动旋转**: 可调节速度
- ✅ **相机控制**: 重置、聚焦

### 4. 性能优化
- ✅ **实时统计**: 显示总点数和选中数
- ✅ **高效渲染**: 基于Spark 2.0引擎
- ✅ **内存管理**: 自动清理资源

## 🚀 快速开始

### 访问编辑器

1. 启动前端服务:
```bash
cd d:\HBuilderProjects\web3D\src\web-frontend
npm run dev
```

2. 打开浏览器访问: http://localhost:5173/

3. 点击顶部导航栏的 **"✨ Spark编辑器"**

### 基本操作流程

#### 1. 加载模型
```typescript
// 方式1: 通过URL加载
const editor = new SparkEditor({
  initialModelUrl: '/models/example.splat'
});

// 方式2: 在编辑器中拖拽上传（待实现）
```

#### 2. 编辑操作
- **选择点**: 鼠标左键框选
- **删除点**: 选中后点击"删除"按钮或按Delete键
- **撤销**: Ctrl+Z 或点击"撤销"按钮
- **重做**: Ctrl+Y 或点击"重做"按钮

#### 3. 调整视图
- **旋转**: 鼠标左键拖动
- **缩放**: 鼠标滚轮
- **平移**: 鼠标右键拖动
- **重置**: 点击"重置视角"或按R键

#### 4. 保存和导出
- **保存场景**: 点击"保存场景"按钮，导出JSON配置
- **导出GLB**: 点击"导出GLB"按钮，下载标准3D模型

## 🎯 技术架构

### 组件结构
```
src/pages/Editor/
├── SparkEditor.tsx          # 主编辑器组件
├── SparkEditor.css          # 样式文件
└── OfficialSuperSplatEditor.tsx  # 官方编辑器跳转页（保留）
```

### 核心依赖
```json
{
  "@sparkjsdev/spark": "^2.0.0",
  "antd": "^5.29.3",
  "react": "^19.2.4"
}
```

### API接口

#### 初始化
```typescript
const spark = new Spark({
  container: HTMLElement,
  width: string | number,
  height: string | number,
  backgroundColor: string,
  showStats: boolean
});
```

#### 加载模型
```typescript
await spark.loadModel(url: string);
await spark.loadPointCloud(points: PointData[]);
```

#### 编辑操作
```typescript
spark.undo();           // 撤销
spark.redo();           // 重做
spark.deleteSelected(); // 删除选中
spark.resetCamera();    // 重置相机
```

#### 显示控制
```typescript
spark.setRotationSpeed(speed: number);  // 旋转速度
spark.setAutoRotate(enabled: boolean);  // 自动旋转
spark.setPointSize(size: number);       // 点大小
spark.showGrid(enabled: boolean);       // 显示网格
```

#### 导出
```typescript
const sceneData = await spark.exportScene();  // 导出JSON
const glbBlob = await spark.exportGLB();      // 导出GLB
```

## 📊 界面布局

```
┌─────────────────────────────────────────────┐
│  工具栏 (Toolbar)                            │
│  [撤销] [重做] [删除] | [重置] | [保存] [导出] │
├──────────────────────────┬──────────────────┤
│                          │                  │
│   3D视图区域              │   属性面板        │
│   (Viewport)             │   (Properties)   │
│                          │                  │
│                          │  - 场景信息       │
│                          │  - 显示设置       │
│                          │  - 动画控制       │
│                          │  - 快捷键         │
│                          │                  │
└──────────────────────────┴──────────────────┘
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Delete | 删除选中点 |
| R | 重置视角 |
| F | 聚焦选中对象 |
| Space | 暂停/继续旋转 |

## 🔧 高级用法

### 自定义场景数据

```typescript
// 生成自定义点云
const points = [];
for (let i = 0; i < 10000; i++) {
  points.push({
    x: Math.random() * 10 - 5,
    y: Math.random() * 10 - 5,
    z: Math.random() * 10 - 5,
    r: Math.random(),
    g: Math.random(),
    b: Math.random(),
    a: 1
  });
}

await spark.loadPointCloud(points);
```

### 事件监听

```typescript
// 监听选择变化
spark.on('selectionChanged', (count: number) => {
  console.log(`选中了 ${count} 个点`);
});

// 监听场景变化
spark.on('sceneChanged', () => {
  const stats = spark.getSceneStats();
  console.log(`总点数: ${stats.pointCount}`);
});
```

### 保存回调

```typescript
<SparkEditor 
  onSave={(sceneData) => {
    // 自定义保存逻辑
    console.log('场景数据:', sceneData);
    // 可以发送到后端API
    fetch('/api/scenes/save', {
      method: 'POST',
      body: JSON.stringify(sceneData)
    });
  }}
/>
```

## 🎨 样式定制

编辑器使用CSS变量，可以轻松定制主题：

```css
.spark-editor-container {
  --primary-color: #ff6b35;
  --background-dark: #0a0f1c;
  --background-light: #1a1a2e;
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
}
```

## 📝 注意事项

### 性能优化
1. **点数限制**: 建议单次加载不超过100万个点
2. **内存管理**: 编辑器会自动清理未使用的资源
3. **渲染优化**: Spark 2.0已内置LOD和视锥剔除

### 浏览器兼容性
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### 已知限制
1. 当前版本仅支持点云编辑，暂不支持网格编辑
2. 大文件加载可能需要较长时间
3. 移动端触摸操作尚未优化

## 🚀 未来计划

### 短期（v1.1）
- [ ] 支持拖拽上传文件
- [ ] 添加批量操作工具
- [ ] 优化移动端体验
- [ ] 添加更多导出格式（PLY、OBJ）

### 中期（v1.2）
- [ ] 支持网格编辑
- [ ] 添加纹理映射功能
- [ ] 实现协作编辑
- [ ] 集成AI辅助优化

### 长期（v2.0）
- [ ] 完整的时间轴动画
- [ ] 物理引擎集成
- [ ] VR/AR支持
- [ ] 云端同步

## 📚 相关资源

- **Spark官方文档**: https://sparkjs.dev/docs
- **项目源码**: `src/web-frontend/src/pages/Editor/SparkEditor.tsx`
- **技术方案**: `docs/03-技术文档/核心架构速查-OK.md`

## 💡 常见问题

### Q: 为什么编辑器显示空白？
A: 检查以下几点：
1. 确认Spark依赖已正确安装
2. 检查浏览器控制台是否有错误
3. 确认容器元素有正确的高度

### Q: 如何加载自己的模型？
A: 目前需要通过代码传入`initialModelUrl`参数，后续会添加UI上传功能。

### Q: 导出的JSON如何使用？
A: JSON包含完整的场景配置，可以通过`loadScene()`方法重新加载。

### Q: 性能如何优化？
A: 
1. 减少点数（使用删除功能）
2. 降低点大小
3. 关闭不必要的特效
4. 使用LOD功能（如果可用）

---

**最后更新**: 2024年  
**版本**: v1.0.0  
**维护者**: Web3D Team
