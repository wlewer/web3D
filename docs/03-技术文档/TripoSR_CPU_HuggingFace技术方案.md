# TripoSR CPU版本 + HuggingFace API 技术方案

## 📋 方案概述

基于《3D本地电脑+手机-OK.md》文档分析，实现**普通电脑可用的AI 3D生成**功能。

**核心策略**：
- **TripoSR纯CPU本地生成**：验证官方源码CPU推理能力
- **HuggingFace API云端生成**：作为快速替代方案
- **后台入口**：登录后可访问，不在官网首页展示

---

## 🎯 一、官方源码集成方案

### 1.1 TripoSR官方源码

**GitHub仓库**：https://github.com/VAST-AI-Research/TripoSR

**核心特点**：
- ✅ 官方支持CPU推理
- ✅ 最低要求：8GB系统内存
- ⏱️ 生成时间：3-10分钟/模型（取决于硬件）
- 💰 成本：0（本地运行）

**依赖清单**（官方requirements.txt）：
```
torch>=2.0.0
torchvision
rembg
git+https://github.com/tatsy/torchmcubes.git
gradio
pygltflib
trimesh
numpy
Pillow
```

### 1.2 HuggingFace Inference API

**API文档**：https://huggingface.co/docs/api-inference/index

**优势**：
- ✅ 无需本地GPU
- ⏱️ 生成时间：30-60秒
- 🆓 免费额度：每月一定调用次数
- 📈 质量：与官方演示一致

---

## 🏗️ 二、技术架构设计

### 2.1 后端架构

```
┌─────────────────────────────────────────────────────┐
│  FastAPI Backend (app/api/v1/experimental/)         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  /experimental/triposr/cpu/upload                   │
│  ├── 接收图片上传                                    │
│  ├── 调用TripoSRService (mode='cpu')               │
│  ├── 后台异步处理（因为CPU慢）                       │
│  ├── 返回task_id                                    │
│  └── 进度查询接口                                    │
│                                                      │
│  /experimental/huggingface/upload                   │
│  ├── 接收图片上传                                    │
│  ├── 调用HuggingFaceService                         │
│  ├── 异步请求云端API                                │
│  ├── 返回task_id                                    │
│  └── 结果下载接口                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2.2 前端后台入口

```
登录后台 (/admin/dashboard.html)
└── 侧边栏新增菜单："🧪 AI 3D生成实验"
    └── 点击跳转到 /admin/experimental-3d.html
        ├── 双模式选择器（本地CPU / 云端API）
        ├── 图片上传区
        ├── 进度显示
        └── 结果预览与下载
```

---

## 📝 三、实施步骤

### 阶段1：环境准备（0.5天）

#### 1.1 创建独立虚拟环境
```bash
cd backend
conda create -n triposr python=3.10 -y
conda activate triposr
```

#### 1.2 安装CPU版PyTorch
```bash
# CPU版本（无GPU环境）
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 如果有NVIDIA GPU，使用CUDA版本
# pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
```

#### 1.3 克隆TripoSR官方源码
```bash
cd backend
git clone https://github.com/VAST-AI-Research/TripoSR.git
cd TripoSR
pip install -r requirements.txt
```

#### 1.4 下载模型权重
```bash
# TripoSR模型权重（约400MB）
python -c "
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id='VAST-AI/TripoSR',
    local_dir='./weights'
)
"
```

---

### 阶段2：后端服务开发（1天）

#### 2.1 创建服务层文件

**文件结构**：
```
backend/app/services/experimental/
├── __init__.py
├── triposr_cpu_service.py      # TripoSR CPU版本
├── huggingface_service.py       # HuggingFace API
└── experimental_utils.py        # 通用工具函数
```

**triposr_cpu_service.py 核心代码**：
```python
"""
TripoSR CPU版本 - 基于官方源码集成
"""
import time
import asyncio
from pathlib import Path
import logging
import torch
import numpy as np
from PIL import Image
from rembg import remove

# 导入TripoSR官方模块
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / 'TripoSR'))

from models.triposr import TripoSRModel
from utils.mesh import save_mesh

logger = logging.getLogger(__name__)

class TripoSRCPUService:
    """TripoSR纯CPU推理服务"""
    
    def __init__(self):
        self.device = torch.device('cpu')
        self.model = None
        self.weights_path = Path('backend/TripoSR/weights')
        
    async def initialize(self):
        """加载模型"""
        if self.model is None:
            logger.info("Loading TripoSR model on CPU...")
            self.model = TripoSRModel.from_pretrained(
                str(self.weights_path)
            ).to(self.device)
            self.model.eval()
            logger.info("TripoSR model loaded successfully")
    
    async def generate(
        self,
        image_path: str,
        task_id: str,
        progress_callback=None
    ) -> dict:
        """
        从图片生成3D模型（CPU模式）
        
        Args:
            image_path: 输入图片路径
            task_id: 任务ID
            progress_callback: 进度回调函数
            
        Returns:
            {
                'task_id': str,
                'status': 'completed',
                'glb_path': str,
                'generation_time': float
            }
        """
        try:
            start_time = time.time()
            
            # 步骤1: 图片预处理（去背景）
            if progress_callback:
                await progress_callback(10, "正在预处理图片...")
            
            input_image = Image.open(image_path).convert('RGB')
            
            # 去除背景
            if progress_callback:
                await progress_callback(20, "正在去除背景...")
            
            input_image = remove(input_image)
            
            # 步骤2: 调整图片大小
            if progress_callback:
                await progress_callback(30, "正在调整图片...")
            
            input_image = input_image.resize((256, 256))
            input_tensor = self._preprocess_image(input_image)
            
            # 步骤3: TripoSR推理（CPU模式，需要时间）
            if progress_callback:
                await progress_callback(40, "正在进行3D重建（这可能需要3-10分钟）...")
            
            with torch.no_grad():
                # TripoSR官方推理流程
                mesh = self.model.generate(
                    input_tensor,
                    target_face_count=10000
                )
            
            if progress_callback:
                await progress_callback(90, "正在生成网格...")
            
            # 步骤4: 保存结果
            output_dir = Path('uploads/experimental') / task_id
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / 'model.glb'
            
            save_mesh(mesh, str(output_path))
            
            generation_time = time.time() - start_time
            
            logger.info(f"TripoSR CPU generation completed in {generation_time:.2f}s")
            
            return {
                'task_id': task_id,
                'status': 'completed',
                'glb_path': str(output_path),
                'generation_time': generation_time,
                'mode': 'triposr_cpu'
            }
            
        except Exception as e:
            logger.error(f"TripoSR CPU generation failed: {e}", exc_info=True)
            return {
                'task_id': task_id,
                'status': 'failed',
                'error': str(e)
            }
    
    def _preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """图片预处理"""
        image_array = np.array(image) / 255.0
        tensor = torch.from_numpy(image_array).float()
        tensor = tensor.permute(2, 0, 1).unsqueeze(0)
        return tensor.to(self.device)


# 全局服务实例
_triposr_service = None

def get_triposr_cpu_service() -> TripoSRCPUService:
    global _triposr_service
    if _triposr_service is None:
        _triposr_service = TripoSRCPUService()
    return _triposr_service
```

**huggingface_service.py 核心代码**：
```python
"""
HuggingFace Inference API集成
"""
import aiohttp
import asyncio
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class HuggingFaceService:
    """HuggingFace API服务"""
    
    def __init__(self, api_token: str = None):
        self.api_token = api_token or "your_hf_token_here"
        self.api_url = "https://api-inference.huggingface.co/models/VAST-AI/TripoSR"
        
    async def generate(self, image_path: str, task_id: str) -> dict:
        """
        使用HuggingFace API生成3D模型
        
        Args:
            image_path: 图片路径
            task_id: 任务ID
            
        Returns:
            生成结果字典
        """
        try:
            # 读取图片
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/octet-stream"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    data=image_data
                ) as response:
                    if response.status == 200:
                        # 保存结果
                        output_dir = Path('uploads/experimental') / task_id
                        output_dir.mkdir(parents=True, exist_ok=True)
                        output_path = output_dir / 'model.glb'
                        
                        with open(output_path, 'wb') as f:
                            f.write(await response.read())
                        
                        return {
                            'task_id': task_id,
                            'status': 'completed',
                            'glb_path': str(output_path),
                            'mode': 'huggingface'
                        }
                    else:
                        error_text = await response.text()
                        return {
                            'task_id': task_id,
                            'status': 'failed',
                            'error': f"API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            logger.error(f"HuggingFace API failed: {e}", exc_info=True)
            return {
                'task_id': task_id,
                'status': 'failed',
                'error': str(e)
            }
```

#### 2.2 创建API路由

**文件**：`backend/app/api/v1/experimental.py`

```python
"""
实验性AI 3D生成功能 - 后台管理专用
"""
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
import uuid
import asyncio
from pathlib import Path

from app.services.experimental.triposr_cpu_service import get_triposr_cpu_service
from app.services.experimental.huggingface_service import HuggingFaceService

router = APIRouter(prefix="/experimental", tags=["experimental"])

# 存储任务状态
task_status = {}

@router.post("/triposr/cpu/upload")
async def upload_triposr_cpu(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """TripoSR CPU版本生成（需要登录）"""
    
    task_id = f"triposr_cpu_{uuid.uuid4().hex[:8]}"
    
    # 保存上传文件
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())
    
    # 初始化任务状态
    task_status[task_id] = {
        'status': 'processing',
        'progress': 0,
        'message': '正在启动生成...'
    }
    
    # 后台异步处理
    async def process_triposr():
        service = get_triposr_cpu_service()
        await service.initialize()
        
        async def progress_callback(progress: int, message: str):
            task_status[task_id]['progress'] = progress
            task_status[task_id]['message'] = message
        
        result = await service.generate(image_path, task_id, progress_callback)
        task_status[task_id].update(result)
    
    if background_tasks:
        background_tasks.add_task(process_triposr)
    else:
        # 同步执行（测试用）
        await process_triposr()
    
    return {
        'task_id': task_id,
        'status': 'processing',
        'message': '生成任务已提交，请在后台查看进度'
    }

@router.post("/huggingface/upload")
async def upload_huggingface(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """HuggingFace API生成（需要登录）"""
    
    task_id = f"hf_{uuid.uuid4().hex[:8]}"
    
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())
    
    task_status[task_id] = {
        'status': 'processing',
        'progress': 0
    }
    
    async def process_hf():
        service = HuggingFaceService()
        result = await service.generate(image_path, task_id)
        task_status[task_id].update(result)
    
    if background_tasks:
        background_tasks.add_task(process_hf)
    else:
        await process_hf()
    
    return {
        'task_id': task_id,
        'status': 'processing'
    }

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    if task_id not in task_status:
        return JSONResponse(status_code=404, content={'error': 'Task not found'})
    
    return task_status[task_id]

@router.get("/download/{task_id}")
async def download_result(task_id: str):
    """下载生成结果"""
    from fastapi.responses import FileResponse
    
    result = task_status.get(task_id)
    if not result or result.get('status') != 'completed':
        return JSONResponse(status_code=404, content={'error': 'Result not ready'})
    
    glb_path = result.get('glb_path')
    if not glb_path:
        return JSONResponse(status_code=404, content={'error': 'File not found'})
    
    return FileResponse(
        path=glb_path,
        filename=f"model_{task_id}.glb",
        media_type="model/gltf-binary"
    )
```

#### 2.3 注册路由

在`backend/app/main.py`中添加：
```python
from app.api.v1.experimental import router as experimental_router

app.include_router(experimental_router, prefix="/api/v1")
```

---

### 阶段3：后台入口开发（0.5天）

#### 3.1 创建后台页面

**文件**：`backend/static/experimental-3d.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>🧪 AI 3D生成实验</title>
    <style>
        /* 样式省略，参考dashboard.html */
    </style>
</head>
<body>
    <div id="app">
        <h1>🧪 AI 3D生成实验（后台专用）</h1>
        
        <div class="mode-selector">
            <button onclick="selectMode('triposr_cpu')">
                本地CPU (TripoSR)
            </button>
            <button onclick="selectMode('huggingface')">
                云端API (HuggingFace)
            </button>
        </div>
        
        <div class="upload-area">
            <input type="file" id="imageInput" accept="image/*">
            <button onclick="startGeneration()">开始生成</button>
        </div>
        
        <div class="progress-area">
            <progress id="progressBar" value="0" max="100"></progress>
            <p id="statusText">等待开始...</p>
        </div>
        
        <div class="result-area" id="resultArea" style="display:none;">
            <model-viewer src="" camera-controls auto-rotate></model-viewer>
            <button onclick="downloadModel()">下载GLB</button>
        </div>
    </div>
    
    <script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.1.1/dist/model-viewer.min.js"></script>
    <script>
        // 检查登录
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login.html';
        }
        
        let currentMode = 'triposr_cpu';
        let currentTaskId = null;
        
        function selectMode(mode) {
            currentMode = mode;
            // 更新UI
        }
        
        async function startGeneration() {
            const file = document.getElementById('imageInput').files[0];
            if (!file) {
                alert('请先选择图片');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            const apiEndpoint = currentMode === 'triposr_cpu' 
                ? '/api/v1/experimental/triposr/cpu/upload'
                : '/api/v1/experimental/huggingface/upload';
            
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const result = await response.json();
            currentTaskId = result.task_id;
            
            // 轮询进度
            pollProgress();
        }
        
        async function pollProgress() {
            const interval = setInterval(async () => {
                const response = await fetch(`/api/v1/experimental/task/${currentTaskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const status = await response.json();
                
                if (status.progress) {
                    document.getElementById('progressBar').value = status.progress;
                    document.getElementById('statusText').textContent = status.message;
                }
                
                if (status.status === 'completed') {
                    clearInterval(interval);
                    showResult();
                }
            }, 1000);
        }
    </script>
</body>
</html>
```

#### 3.2 在后台dashboard.html中添加入口

修改`backend/static/admin/dashboard.html`，在侧边栏菜单中添加：

```html
<!-- 在现有菜单项后添加 -->
<li class="menu-item" onclick="showPage('experimental')">
    <span class="menu-icon">🧪</span>
    <span class="menu-text">AI 3D生成实验</span>
</li>
```

并添加对应的页面容器：
```html
<div id="experimentalPage" style="display: none;">
    <iframe src="/app/experimental-3d.html" style="width:100%; height:100vh; border:none;"></iframe>
</div>
```

---

### 阶段4：测试验证（0.5天）

#### 4.1 单元测试

```bash
# 测试TripoSR CPU服务
cd backend
python -m pytest tests/test_triposr_cpu.py -v

# 测试HuggingFace API
python -m pytest tests/test_huggingface.py -v
```

#### 4.2 集成测试

1. 启动后端：`uvicorn app.main:app --reload --port 8000`
2. 访问后台：http://localhost:8000/admin/dashboard.html
3. 登录后查看"AI 3D生成实验"菜单
4. 上传图片，观察进度和结果

#### 4.3 性能测试

**TripoSR CPU测试**：
- 硬件：普通电脑（8GB内存，CPU）
- 图片尺寸：256x256
- 预期时间：3-10分钟
- 预期质量：基础几何+简单纹理

**HuggingFace测试**：
- 网络：需要稳定互联网
- 预期时间：30-60秒
- 预期质量：与官方演示一致

---

## 📊 四、成本与资源评估

### 4.1 TripoSR CPU版本

| 项目 | 成本 | 说明 |
|------|------|------|
| 硬件 | ¥0 | 利用现有电脑 |
| 电费 | ¥0.1/次 | 假设10分钟 |
| 时间 | 3-10分钟 | CPU推理 |
| 质量 | ⭐⭐⭐ | 基础模型 |
| 并发 | 1个/次 | CPU限制 |

### 4.2 HuggingFace API

| 项目 | 成本 | 说明 |
|------|------|------|
| 免费额度 | 每月100次 | 足够测试 |
| 超出后 | $0.01/次 | 按需付费 |
| 时间 | 30-60秒 | 云端GPU |
| 质量 | ⭐⭐⭐⭐ | 高质量 |
| 并发 | 1个/次 | API限制 |

---

## 🚀 五、部署指南

### 5.1 本地开发部署

```bash
# 1. 克隆TripoSR
cd backend
git clone https://github.com/VAST-AI-Research/TripoSR.git

# 2. 创建虚拟环境
conda create -n web3d-triposr python=3.10 -y
conda activate web3d-triposr

# 3. 安装依赖
cd TripoSR
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# 4. 下载权重
python -c "from huggingface_hub import snapshot_download; snapshot_download('VAST-AI/TripoSR', local_dir='./weights')"

# 5. 启动后端
cd ..
uvicorn app.main:app --reload --port 8000
```

### 5.2 环境变量配置

创建`backend/.env`：
```env
# HuggingFace API Token（可选）
HF_API_TOKEN=your_token_here

# TripoSR配置
TRIPOSR_USE_CPU=true
TRIPOSR_WEIGHTS_PATH=./TripoSR/weights
```

---

## ⚠️ 六、注意事项

### 6.1 已知问题

1. **TripoSR CPU速度**：
   - 普通电脑需要3-10分钟
   - 建议添加进度提示
   - 不推荐生产环境使用

2. **HuggingFace限流**：
   - 免费账户有调用次数限制
   - 可能需要排队等待
   - 建议购买Pro账户（$9/月）

3. **许可证**：
   - TripoSR：MIT License ✅ 可商用
   - HuggingFace模型：需查看具体模型许可证

### 6.2 最佳实践

1. **开发阶段**：使用HuggingFace API（快速验证）
2. **测试阶段**：使用TripoSR CPU（零成本）
3. **生产阶段**：考虑自建GPU服务器或使用云服务

---

## 📈 七、未来扩展

### 7.1 短期（本月）

- [ ] 添加多图片批量处理
- [ ] 添加模型预览3D编辑器集成
- [ ] 优化TripoSR CPU推理速度

### 7.2 中期（下月）

- [ ] 集成更多模型（SF3D、Hunyuan3D-mini）
- [ ] 支持自定义参数调整
- [ ] 添加模型优化和后处理

### 7.3 长期（未来）

- [ ] 自建云端推理服务
- [ ] 移动端部署（ONNX/MNN）
- [ ] 实时生成体验优化

---

## 📞 八、技术支持

### 8.1 官方资源

- TripoSR GitHub：https://github.com/VAST-AI-Research/TripoSR
- HuggingFace文档：https://huggingface.co/docs
- 技术文档参考：`docs/03-技术文档/3D本地电脑+手机-OK.md`

### 8.2 问题排查

**问题1**：TripoSR推理很慢
- 解决：确认使用CPU版本，检查内存是否充足（≥8GB）
- 优化：减小图片分辨率，降低目标面数

**问题2**：HuggingFace API返回429
- 解决：免费账户限流，等待1分钟后重试
- 优化：购买Pro账户或使用其他API

**问题3**：模型生成失败
- 解决：检查图片格式（支持JPG/PNG）
- 优化：使用去背景后的图片效果更好

---

**文档版本**：v1.0  
**最后更新**：2026-04-18  
**状态**：待实施
