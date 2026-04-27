# AI 3D生成模型部署指南

本文档介绍如何部署和启用真实的AI 3D生成功能。

## 📋 目录

- [当前状态](#当前状态)
- [系统要求](#系统要求)
- [安装依赖](#安装依赖)
- [部署各模型](#部署各模型)
- [配置环境变量](#配置环境变量)
- [测试与验证](#测试与验证)
- [故障排除](#故障排除)

---

## 🎯 当前状态

### ✅ 已实现功能

1. **SparkViewer WebGL警告修复** - 已抑制无关警告信息
2. **多模型架构** - 支持4种生成引擎的集成框架
3. **Mock模式** - 所有模型都可在无GPU情况下演示UI流程
4. **自动降级** - 真实引擎不可用时自动回退到Mock模式

### ⚠️ 需要部署的内容

目前所有模型都处于**Mock模式**，返回的是示例模型文件。要获得真实的图片转3D效果，需要部署以下任一引擎：

| 模型 | 速度 | 显存需求 | 质量 | 许可证 | 推荐场景 |
|------|------|---------|------|--------|---------|
| **SF3D** | ~0.5秒 | 9GB | ⭐⭐⭐⭐ | Apache-2.0 | 生产环境首选 |
| **TripoSR** | <1秒 | 4-6GB | ⭐⭐⭐ | MIT | 快速原型 |
| **InstantMesh** | 10-25秒 | 8-12GB | ⭐⭐⭐⭐⭐ | 待确认 | 高质量项目 |
| **Hunyuan3D-2.1** | 30-60秒 | 16GB+ | ⭐⭐⭐⭐⭐ | 腾讯社区 | SOTA质量 |

---

## 💻 系统要求

### 硬件要求

- **GPU**: NVIDIA RTX 3060 (12GB) 或更高
- **显存**: 
  - TripoSR: 最低 6GB
  - SF3D: 最低 9GB
  - InstantMesh: 最低 12GB
  - Hunyuan3D: 最低 16GB
- **内存**: 16GB RAM 或更高
- **存储**: 至少 50GB 可用空间（用于模型权重）

### 软件要求

- **操作系统**: Linux (Ubuntu 20.04+) / Windows 10/11
- **Python**: 3.9 - 3.11
- **CUDA**: 11.8 或 12.x
- **cuDNN**: 对应CUDA版本
- **PyTorch**: 2.0+

---

## 📦 安装依赖

### 1. 创建虚拟环境

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. 安装基础依赖

```bash
pip install -r requirements.txt
```

### 3. 安装PyTorch (CUDA版本)

```bash
# CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# CUDA 12.x
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

验证安装：
```python
import torch
print(torch.cuda.is_available())  # 应输出 True
print(torch.cuda.get_device_name(0))  # 显示GPU名称
```

---

## 🚀 部署各模型

### 方案1: SF3D (推荐 - 速度与质量平衡)

#### 安装

```bash
pip install sf3d
```

#### 下载模型权重

```bash
# 从HuggingFace下载
huggingface-cli download stabilityai/sf3d --local-dir ./models/sf3d
```

#### 测试

```python
from sf3d import SF3DPipeline

pipeline = SF3DPipeline.from_pretrained("./models/sf3d").to("cuda")
mesh = pipeline(image_path="test.jpg", target_face_count=10000)
mesh.export("output.glb")
```

---

### 方案2: TripoSR (最快 - 适合原型)

#### 安装

```bash
pip install triposr
```

#### 下载模型

```bash
huggingface-cli download VAST-AI/TripoSR-Lite --local-dir ./models/triposr
```

#### 测试

```python
from triposr import TripoSRLite

model = TripoSRLite.from_pretrained("./models/triposr")
mesh = model.generate("test.jpg", target_face_count=5000)
mesh.export("output.glb")
```

---

### 方案3: InstantMesh (最高质量)

#### 安装

```bash
pip install instantmesh
```

#### 下载模型

```bash
huggingface-cli download TencentARC/InstantMesh --local-dir ./models/instantmesh
```

#### 测试

```python
from instantmesh import InstantMeshPipeline

pipeline = InstantMeshPipeline.from_pretrained("./models/instantmesh").to("cuda")
mesh = pipeline(image_path="test.jpg", target_face_count=10000, texture_size=1024)
mesh.export("output.glb")
```

---

### 方案4: Hunyuan3D-2.1 (腾讯官方)

#### 克隆仓库

```bash
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1.git
cd Hunyuan3D-2.1
pip install -e .
```

#### 下载模型

```bash
# 使用官方脚本下载
python scripts/download_weights.py
```

#### 启动服务

```bash
# 启动本地API服务
python app.py --host 0.0.0.0 --port 8081
```

---

## ⚙️ 配置环境变量

编辑 `backend/.env` 文件：

```bash
# 选择运行模式: mock | local | cloud
HUNYUAN3D_MODE=local

# 本地服务地址（如果部署了Hunyuan3D）
HUNYUAN3D_BASE_URL=http://localhost:8081

# 腾讯云服务API Key（如果使用云端模式）
HUNYUAN3D_CLOUD_API_KEY=your_api_key_here

# GPU加速选项
USE_GPU=true
CUDA_VISIBLE_DEVICES=0
```

---

## 🧪 测试与验证

### 1. 检查可用引擎

启动后端服务后，查看日志：

```
INFO: Available engines: ['sf3d', 'triposr']
```

这表示SF3D和TripoSR已成功加载。

### 2. 测试生成

访问前端页面：
- http://localhost:5173/sf3d-generation
- http://localhost:5173/triposr-generation
- http://localhost:5173/instantmesh-generation

上传图片并观察：
- ✅ 真实生成：会显示实际生成时间（如0.5秒、15秒等）
- ⚠️ Mock模式：会显示 "MOCK MODE" 警告

### 3. 性能监控

在生成过程中监控GPU使用情况：

```bash
# Linux
nvidia-smi -l 1

# Windows
打开任务管理器 -> 性能 -> GPU
```

---

## 🔧 故障排除

### 问题1: "No CUDA GPU found"

**原因**: PyTorch未正确安装CUDA版本

**解决**:
```bash
# 卸载CPU版本
pip uninstall torch torchvision torchaudio

# 重新安装CUDA版本
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 问题2: "Out of memory"

**原因**: 显存不足

**解决**:
1. 降低分辨率参数
2. 减少batch size
3. 关闭其他GPU应用
4. 使用更轻量的模型（如TripoSR）

### 问题3: 模型下载失败

**原因**: HuggingFace访问慢或被墙

**解决**:
```bash
# 使用镜像
export HF_ENDPOINT=https://hf-mirror.com

# 或使用国内镜像
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

### 问题4: ImportError: No module named 'xxx'

**原因**: 依赖未安装

**解决**:
```bash
# 重新安装所有依赖
pip install -r requirements.txt

# 或单独安装缺失模块
pip install sf3d  # 举例
```

---

## 📊 性能对比

| 模型 | 生成时间 | 显存占用 | 模型大小 | 推荐分辨率 |
|------|---------|---------|---------|-----------|
| SF3D | 0.5s | 9GB | ~5GB | 512x512 |
| TripoSR | 0.8s | 5GB | ~2GB | 256x256 |
| InstantMesh | 15s | 10GB | ~8GB | 512x512 |
| Hunyuan3D | 45s | 16GB | ~12GB | 1024x1024 |

---

## 🎓 最佳实践

### 1. 开发环境

- 使用 **Mock模式** 进行UI开发和测试
- 无需GPU即可验证交互流程

### 2. 测试环境

- 部署 **TripoSR** 进行快速验证
- 低显存需求，适合CI/CD测试

### 3. 生产环境

- 部署 **SF3D** 作为主引擎（速度与质量平衡）
- 备用 **InstantMesh** 用于高质量需求
- 配置负载均衡和队列管理

### 4. 混合策略

```python
# 根据图片复杂度自动选择引擎
if image_complexity == "simple":
    engine = "triposr"  # 快速
elif image_complexity == "complex":
    engine = "instantmesh"  # 高质量
else:
    engine = "sf3d"  # 默认
```

---

## 📚 参考资源

- [SF3D GitHub](https://github.com/Stability-AI/generative-models)
- [TripoSR GitHub](https://github.com/VAST-AI-Research/TripoSR)
- [InstantMesh GitHub](https://github.com/TencentARC/InstantMesh)
- [Hunyuan3D GitHub](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1)
- [PyTorch官方文档](https://pytorch.org/)

---

## ❓ 常见问题

**Q: 没有GPU可以使用吗？**  
A: 可以！Mock模式完全不需要GPU，可以正常演示UI和交互流程。

**Q: 哪个模型最适合初学者？**  
A: 推荐从 **TripoSR** 开始，显存需求最低，安装最简单。

**Q: 可以同时部署多个模型吗？**  
A: 可以！系统会自动检测可用的引擎，并在运行时选择。

**Q: 如何切换Mock模式和真实模式？**  
A: 修改服务初始化时的 `mode` 参数：
```python
service = SF3DService(mode="mock")   # Mock模式
service = SF3DService(mode="real")   # 真实模式
```

---

## 📞 获取帮助

如有问题，请：
1. 查看后端日志：`backend/logs/app.log`
2. 检查GPU状态：`nvidia-smi`
3. 查阅本文档的故障排除部分
4. 提交Issue到项目GitHub

---

**最后更新**: 2026-04-18
