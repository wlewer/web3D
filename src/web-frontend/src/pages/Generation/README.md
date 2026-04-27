# Generation 模块 - AI 3D模型生成

## 📋 模块说明

本模块实现了"图生3D"功能，支持三种运行模式：
- **Mock模式**：技术演示（默认）
- **Local模式**：本地GPU服务
- **Cloud模式**：腾讯云API

---

## 📁 文件结构

```
Generation/
├── GenerationPage.tsx          # 主页面组件
├── GenerationPage.css          # 样式文件
├── generation.service.ts       # API服务封装
└── index.ts                    # 导出文件
```

---

## 🚀 快速使用

### 1. 在应用中访问

导航栏点击 **"⚡ AI生成"** 即可进入。

### 2. 上传测试

1. 点击"上传图片生成 3D 模型"
2. 选择任意图片
3. 等待5秒（Mock模式）
4. 下载GLB模型

---

## 🔧 技术实现

### 前端组件

**GenerationPage.tsx**
- React函数组件
- Ant Design UI库
- 状态管理：useState
- 异步处理：async/await

**generation.service.ts**
- Axios HTTP客户端
- TypeScript类型定义
- 三个核心方法：
  - `uploadAndGenerate()` - 上传并生成
  - `waitForCompletion()` - 轮询等待
  - `downloadModel()` - 下载模型

### 后端API

```
POST   /api/v1/generation/upload       # 上传
GET    /api/v1/generation/status/{uid} # 查询状态
GET    /api/v1/generation/download/{uid} # 下载
```

---

## 📊 数据流

```
用户上传图片
    ↓
uploadAndGenerate(file)
    ↓
POST /api/v1/generation/upload
    ↓
返回 { uid, status }
    ↓
waitForCompletion(uid, onProgress)
    ↓
轮询 GET /api/v1/generation/status/{uid}
    ↓
status === 'completed'
    ↓
downloadModel(uid)
    ↓
GET /api/v1/generation/download/{uid}
    ↓
下载GLB文件
```

---

## 🎨 UI特性

- ✅ 实时进度条
- ✅ 任务状态提示
- ✅ 模式信息Alert
- ✅ 响应式设计
- ✅ 移动端适配
- ✅ 友好的错误提示

---

## 🔍 代码示例

### 上传并生成

```typescript
import { uploadAndGenerate } from './generation.service'

const handleUpload = async (file: File) => {
  try {
    const response = await uploadAndGenerate(file, {
      enableTexture: false
    })
    console.log('Task ID:', response.uid)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
```

### 轮询等待

```typescript
import { waitForCompletion } from './generation.service'

await waitForCompletion(
  uid,
  (progress) => console.log(`Progress: ${progress}%`),
  3000,  // 轮询间隔
  300000 // 最大等待时间
)
```

### 下载模型

```typescript
import { downloadModel } from './generation.service'

await downloadModel(uid)
// 自动触发浏览器下载
```

---

## ⚙️ 配置说明

### 环境变量

```env
# 后端配置（backend/.env）
HUNYUAN3D_MODE=mock              # mock | local | cloud
HUNYUAN3D_BASE_URL=http://localhost:8081
HUNYUAN3D_CLOUD_API_KEY=
HUNYUAN3D_TIMEOUT=300
```

### 前端配置

```typescript
// src/web-frontend/.env
VITE_API_URL=http://localhost:8000
```

---

## 🧪 测试建议

### Mock模式测试

```bash
# 无需任何配置，直接启动
start_demo.bat
```

### Local模式测试

```bash
# 1. 部署Hunyuan3D服务
# 2. 修改 HUNYUAN3D_MODE=local
# 3. 重启后端
```

### Cloud模式测试

```bash
# 1. 申请腾讯云API Key
# 2. 修改 HUNYUAN3D_MODE=cloud
# 3. 设置 HUNYUAN3D_CLOUD_API_KEY
# 4. 重启后端
```

---

## 📚 相关文档

- [Hunyuan3D集成方案](../../docs/03-技术文档/Hunyuan3D集成方案.md)
- [快速开始](../../docs/03-技术文档/快速开始.md)
- [三模式架构设计](../../docs/03-技术文档/三模式架构设计说明.md)

---

## 💡 开发提示

### 添加新功能

1. 在 `generation.service.ts` 中添加API方法
2. 在 `GenerationPage.tsx` 中调用新方法
3. 更新UI组件展示新数据

### 调试技巧

```typescript
// 查看API请求详情
console.log('Request:', response.config)
console.log('Response:', response.data)

// 查看后端日志
tail -f backend/logs/backend.log
```

---

## 🎯 下一步

- [ ] 添加批量上传功能
- [ ] 实现模型在线预览
- [ ] 添加生成历史记录
- [ ] 支持更多图片格式

---

*最后更新：2026-04-18*
