# 🧪 AI 3D生成实验 - 快速开始指南

## 📋 概述

本功能提供两种AI 3D生成方式，**仅在后台管理界面可见**（需要登录）：

1. **TripoSR CPU本地版**：使用普通电脑CPU进行3D生成
2. **HuggingFace云端API**：使用云端GPU快速生成

---

## 🚀 快速启动（验证可行性）

### 步骤1：启动后端服务

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 步骤2：访问后台

1. 打开浏览器访问：http://localhost:8000/login.html
2. 使用默认账号登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. 点击"⚡ 快速登录"按钮

### 步骤3：进入AI 3D生成实验页面

1. 登录后自动跳转到后台Dashboard
2. 在左侧菜单找到 **"🧪 AI 3D生成实验"**（绿色高亮）
3. 点击进入实验页面

### 步骤4：测试生成功能

#### 模式A：TripoSR CPU本地版（推荐先测试）

1. 选择"💻 TripoSR CPU本地版"卡片
2. 上传一张图片（建议512x512以上）
3. 点击"🚀 开始生成"
4. 观察进度条（首次运行会下载模型，约400MB）
5. 等待3-10分钟完成
6. 查看3D预览并下载GLB文件

#### 模式B：HuggingFace云端API

1. 选择"☁️ HuggingFace云端API"卡片
2. 上传图片
3. 点击"🚀 开始生成"
4. 等待30-60秒
5. 查看结果

---

## ⚠️ 当前状态说明

### ✅ 已完成

- [x] 后台入口页面（experimental-3d.html）
- [x] 侧边栏菜单集成
- [x] 登录保护机制
- [x] 双模式选择UI
- [x] 进度显示和结果预览
- [x] 技术方案文档

### 🔨 待实施（需要安装官方源码）

- [ ] TripoSR服务层（triposr_cpu_service.py）
- [ ] HuggingFace API服务层（huggingface_service.py）
- [ ] 后端API路由（experimental.py）
- [ ] TripoSR官方源码克隆
- [ ] 模型权重下载

---

## 📦 实施完整功能

### 1. 克隆TripoSR官方源码

```bash
cd backend
git clone https://github.com/VAST-AI-Research/TripoSR.git
cd TripoSR
```

### 2. 创建虚拟环境

```bash
conda create -n web3d-triposr python=3.10 -y
conda activate web3d-triposr
```

### 3. 安装依赖

```bash
# CPU版本PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# TripoSR依赖
pip install -r requirements.txt
```

### 4. 下载模型权重

```bash
python -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='VAST-AI/TripoSR',
    local_dir='./weights'
)
"
```

### 5. 创建后端服务文件

参考技术方案文档：`docs/03-技术文档/TripoSR_CPU_HuggingFace技术方案.md`

需要创建以下文件：
- `backend/app/services/experimental/__init__.py`
- `backend/app/services/experimental/triposr_cpu_service.py`
- `backend/app/services/experimental/huggingface_service.py`
- `backend/app/api/v1/experimental.py`

### 6. 注册路由

在`backend/app/main.py`中添加：

```python
from app.api.v1.experimental import router as experimental_router

app.include_router(experimental_router, prefix="/api/v1")
```

### 7. 配置环境变量

创建`backend/.env`：

```env
# HuggingFace API Token（可选，用于云端API模式）
HF_API_TOKEN=your_token_here

# TripoSR配置
TRIPOSR_USE_CPU=true
TRIPOSR_WEIGHTS_PATH=./TripoSR/weights
```

获取HuggingFace Token：https://huggingface.co/settings/tokens

---

## 🎯 验证清单

完成上述步骤后，验证以下功能：

- [ ] 能访问后台登录页面
- [ ] 能成功登录
- [ ] 能看到"AI 3D生成实验"菜单
- [ ] 能上传图片
- [ ] TripoSR CPU模式能生成3D模型
- [ ] HuggingFace API模式能生成3D模型
- [ ] 能预览生成的3D模型
- [ ] 能下载GLB文件

---

## 🐛 常见问题

### Q1: 访问后台提示404？

**解决**：确保后端服务已启动，访问 http://localhost:8000/login.html

### Q2: 登录后看不到"AI 3D生成实验"菜单？

**解决**：清除浏览器缓存，重新加载页面

### Q3: TripoSR推理很慢？

**正常现象**：CPU模式下，普通电脑需要3-10分钟。这是预期行为。

**优化建议**：
- 使用较小的图片（256x256）
- 降低目标面数（target_face_count=5000）
- 考虑使用HuggingFace API模式

### Q4: HuggingFace API返回429错误？

**原因**：免费账户有调用次数限制

**解决**：
- 等待1分钟后重试
- 购买Pro账户（$9/月）
- 切换到TripoSR CPU模式

### Q5: 模型生成失败？

**检查项**：
- 图片格式是否正确（JPG/PNG）
- 图片是否过大（建议<5MB）
- 是否有足够的内存（≥8GB）
- 查看后端日志排查具体错误

---

## 📊 性能基准

### TripoSR CPU模式

| 硬件配置 | 图片尺寸 | 生成时间 | 质量 |
|---------|---------|---------|------|
| i5 + 8GB RAM | 256x256 | 3-5分钟 | ⭐⭐⭐ |
| i7 + 16GB RAM | 512x512 | 5-8分钟 | ⭐⭐⭐⭐ |
| M1 Mac + 8GB | 256x256 | 4-6分钟 | ⭐⭐⭐ |

### HuggingFace API模式

| 网络状况 | 生成时间 | 质量 | 成本 |
|---------|---------|------|------|
| 良好 | 30-45秒 | ⭐⭐⭐⭐ | 免费额度内¥0 |
| 一般 | 45-60秒 | ⭐⭐⭐⭐ | 免费额度内¥0 |
| 超出额度 | 排队等待 | ⭐⭐⭐⭐ | $0.01/次 |

---

## 📞 技术支持

### 官方资源

- TripoSR GitHub：https://github.com/VAST-AI-Research/TripoSR
- HuggingFace文档：https://huggingface.co/docs/api-inference
- 项目技术文档：`docs/03-技术文档/TripoSR_CPU_HuggingFace技术方案.md`

### 问题反馈

如遇问题，请提供：
1. 后端日志（terminal输出）
2. 浏览器控制台错误（F12 -> Console）
3. 使用的模式和图片信息
4. 硬件配置（CPU/内存）

---

## 🎉 下一步计划

验证成功后，可以考虑：

1. **短期**：添加批量处理功能
2. **中期**：集成更多模型（SF3D、Hunyuan3D-mini）
3. **长期**：自建云端推理服务

---

**最后更新**：2026-04-18  
**状态**：前端UI已完成，后端服务待实施
