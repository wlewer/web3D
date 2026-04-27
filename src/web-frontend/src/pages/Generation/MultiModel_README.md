# 多模型3D生成系统 - 使用指南

## 📋 概述

本系统集成了三种开源3D生成模型，提供不同速度和质量的生成方案供用户选择和对比。

## 🎯 三个模型方案

### 1. SF3D (Stability AI) 🚀
- **速度**: ~0.5秒（极速）
- **显存需求**: 9GB
- **许可证**: Apache-2.0（商业友好）
- **优势**: 速度与质量的完美平衡
- **适用场景**: 日常使用，平衡速度和效果
- **GitHub**: https://github.com/Stability-AI/generative-models

### 2. TripoSR (VAST-AI) ⚡
- **速度**: <1秒（超快）
- **显存需求**: 4-6GB（最低）
- **许可证**: MIT
- **优势**: 极速生成，适合批量处理
- **适用场景**: 概念验证、快速原型、批量生成
- **GitHub**: https://github.com/VAST-AI-Research/TripoSR

### 3. InstantMesh (Tencent ARC) 🔷
- **速度**: 10-25秒（较慢）
- **显存需求**: 8-12GB
- **许可证**: 待确认
- **优势**: 高质量网格和纹理
- **适用场景**: 精细建模、专业项目
- **GitHub**: https://github.com/TencentARC/InstantMesh

## 🚀 快速开始

### 前端访问

启动前端服务后，在顶部导航栏可以看到四个AI生成选项：

1. **⚡ AI生成** - Hunyuan3D-2.1（腾讯）
2. **🚀 SF3D** - Stability AI
3. **⚡ TripoSR** - VAST-AI
4. **🔷 InstantMesh** - Tencent ARC

点击任意一个即可进入对应的生成页面。

### 使用流程

1. **上传图片**: 点击上传区域选择图片（支持JPG/PNG）
2. **自动开始**: 上传图片后自动生成3D模型
3. **等待完成**: 根据模型不同，等待时间从0.5秒到25秒不等
4. **查看结果**: 在右侧预览生成的3D模型
5. **下载模型**: 点击下载按钮保存GLB文件

## 🏗️ 技术架构

### 后端结构

```
backend/app/services/generation/
├── hunyuan3d_service.py     # Hunyuan3D服务（已有）
├── sf3d_service.py          # SF3D服务（新增）
├── triposr_service.py       # TripoSR服务（新增）
└── instantmesh_service.py   # InstantMesh服务（新增）
```

### API端点

```bash
# Hunyuan3D
POST /api/v1/generation/upload

# SF3D
POST /api/v1/generation/sf3d/upload

# TripoSR
POST /api/v1/generation/triposr/upload

# InstantMesh
POST /api/v1/generation/instantmesh/upload
```

### 前端结构

```
src/pages/Generation/
├── GenerationPage.tsx                # Hunyuan3D页面（已有）
├── MultiModelGenerationPage.tsx      # 通用生成页面组件（新增）
├── SF3DGenerationPage.tsx            # SF3D页面（新增）
├── TripoSRGenerationPage.tsx         # TripoSR页面（新增）
└── InstantMeshGenerationPage.tsx     # InstantMesh页面（新增）
```

## 💾 运行模式

### Mock模式（当前默认）

**特点**:
- ✅ 无需GPU即可运行
- ✅ 快速演示UI和交互流程
- ❌ 返回固定的示例模型，不是真正的AI生成

**如何识别**: 
- 页面会显示 "MOCK MODE" 警告
- 所有图片都生成同一个白色人偶模型

### Real模式（需要GPU）

**要求**:
- NVIDIA GPU（显存根据模型而定）
- 安装对应模型的依赖包
- 配置环境变量 `HUNYUAN3D_MODE=real`

**启用步骤**:

1. **安装SF3D依赖**:
```bash
pip install git+https://github.com/Stability-AI/generative-models
```

2. **安装TripoSR依赖**:
```bash
pip install triposr
```

3. **安装InstantMesh依赖**:
```bash
pip install git+https://github.com/TencentARC/InstantMesh
```

4. **修改服务模式**:
在对应的Service文件中，将mode改为"real"：
```python
service = get_sf3d_service(mode="real")  # 或 "mock"
```

## 📊 性能对比（Mock模式模拟时间）

| 模型 | 模拟生成时间 | 实际预期时间 | 显存需求 |
|------|-------------|-------------|----------|
| SF3D | 0.5秒 | ~0.5秒 | 9GB |
| TripoSR | 0.8秒 | <1秒 | 4-6GB |
| InstantMesh | 15秒 | 10-25秒 | 8-12GB |
| Hunyuan3D | 5秒 | 10-25秒 | 29GB |

## 🎨 下一步计划

### 阶段1: Demo测试（当前）
- ✅ 实现三种模型的Mock版本
- ✅ 创建独立的生成页面
- ✅ 添加导航菜单
- ⬜ 测试UI和交互流程

### 阶段2: 真实部署
- ⬜ 安装GPU依赖
- ⬜ 配置Real模式
- ⬜ 测试真实生成效果

### 阶段3: 组合优化
- ⬜ 实现SF3D → Hunyuan组合流程
- ⬜ 实现TripoSR → InstantMesh组合流程
- ⬜ 创建对比界面（四模型并行展示）

### 阶段4: 最终重构
- ⬜ 根据实际效果选择最佳方案
- ⬜ 优化用户体验
- ⬜ 完善文档

## 🔧 故障排除

### 问题1: 所有模型都生成同一个白色人偶

**原因**: 当前处于Mock模式
**解决**: 这是正常现象，用于演示UI。要获得真实生成，需要部署Real模式。

### 问题2: 页面加载缓慢

**原因**: ModelViewer脚本首次加载
**解决**: 刷新页面即可，脚本会被缓存

### 问题3: 模型无法显示

**检查**:
1. 浏览器控制台是否有错误
2. 后端服务是否正常运行（http://localhost:8000）
3. GLB文件是否正确生成

## 📝 技术选型建议

根据您的硬件和需求选择合适的模型：

### 有高端GPU (RTX 3090/4090/A100, 24GB+)
- **推荐**: Hunyuan3D-2.1（最高质量）
- **备选**: SF3D + Hunyuan组合

### 有中端GPU (RTX 3060/4060, 8-12GB)
- **推荐**: SF3D（平衡方案）
- **备选**: InstantMesh（精细建模）

### 有低端GPU (GTX 1660/RTX 2060, 4-6GB)
- **推荐**: TripoSR（超快原型）

### 无GPU
- **推荐**: 继续使用Mock模式进行UI测试
- **备选**: 申请腾讯云API Key使用云端服务

## 🎯 总结

目前我们已经成功实现了：
1. ✅ 三种开源3D生成模型的Mock版本
2. ✅ 独立的前端生成页面
3. ✅ 统一的导航菜单
4. ✅ 完整的API端点

**下一步**: 您可以根据实际效果选择：
- 继续测试UI和交互
- 部署Real模式进行真实生成
- 或者先对比三种方案的效果再做决定

---

**文档最后更新**: 2024年
**相关文档**: [三种3D生成方案实现计划.md](../../docs/03-技术文档/三种3D生成方案实现计划.md)
