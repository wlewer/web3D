# Web3D Backend 模块化架构与依赖管理规范

**版本**: v2.0  
**更新日期**: 2025-04-18  
**适用环境**: Python 3.8.5, CPU-only, Windows

---

## 📋 目录

1. [架构设计原则](#1-架构设计原则)
2. [依赖管理策略](#2-依赖管理策略)
3. [模块隔离方案](#3-模块隔离方案)
4. [代码目录结构](#4-代码目录结构)
5. [当前可用模块](#5-当前可用模块)
6. [未来升级路径](#6-未来升级路径)
7. [开发规范](#7-开发规范)

---

## 1. 架构设计原则

### 1.1 核心原则

```
✅ 统一依赖管理 - 所有依赖集中在一个requirements.txt
✅ 模块化隔离 - 每个开源框架独立模块，避免互相干扰
✅ 版本锁定 - 所有依赖必须指定确切版本
✅ 按需安装 - 不同功能使用不同的依赖分组
✅ 向后兼容 - 保持Python 3.8兼容性
```

### 1.2 解决的问题

**之前的问题**：
- ❌ 依赖重复维护（4个requirements.txt文件）
- ❌ 版本冲突（omegaconf、trimesh等版本不一致）
- ❌ 模块混乱（所有服务混在一个目录）
- ❌ 安装困难（子目录依赖文件导致冲突）

**现在的方案**：
- ✅ 单一依赖入口（backend/requirements.txt）
- ✅ 版本统一管理（所有版本锁定）
- ✅ 模块清晰隔离（按开源框架分组）
- ✅ 安装简单（一条命令安装所有依赖）

---

## 2. 依赖管理策略

### 2.1 统一依赖文件

**唯一依赖文件**：`backend/requirements.txt`

**禁止操作**：
```bash
# ❌ 禁止在子目录创建requirements.txt
cd backend/triposr_lib
pip install -r requirements.txt  # 错误！

# ❌ 禁止创建额外的依赖文件
pip install -r requirements-cpu.txt  # 错误！
pip install -r requirements-gpu.txt  # 错误！
```

**正确操作**：
```bash
# ✅ 只使用主依赖文件
cd backend
pip install -r requirements.txt
```

### 2.2 依赖分组策略

所有依赖按功能模块分组，每个模块有清晰的状态标识：

| 标识 | 含义 | 示例 |
|------|------|------|
| ✅ | 当前可用，已安装 | ImageToSTL, 通用3D处理 |
| ⚠️ | 降级可用，部分功能 | TripoSR CPU |
| 🚧 | 需要GPU/升级Python | Hunyuan3D, SF3D |
| # | 注释掉，暂不使用 | TripoSR官方GPU版 |

### 2.3 版本锁定规则

```python
# ✅ 正确：所有版本必须锁定
trimesh[easy]==4.11.5
numpy==1.24.4
Pillow==10.1.0

# ❌ 错误：未指定版本
trimesh
numpy
Pillow
```

### 2.4 子目录依赖文件处理

**triposr_lib/requirements.txt**：
```
位置: backend/triposr_lib/requirements.txt
作用: 仅作参考，记录官方TripoSR需要的依赖
操作: 不要直接安装！所有依赖已合并到主requirements.txt
```

**其他子目录**：
- 不创建requirements.txt
- 不创建package.json
- 不创建任何独立的依赖文件

---

## 3. 模块隔离方案

### 3.1 服务模块目录结构

```
backend/app/services/generation/
├── __init__.py                    # 模块初始化
├── image_to_stl_service.py        # 模块2：ImageToSTL（当前可用）
├── triposr_cpu_service.py         # 模块3：TripoSR CPU（降级可用）
├── hunyuan3d_service.py           # 模块4：Hunyuan3D（需要GPU）
├── sf3d_service.py                # 模块5：SF3D（需要GPU）
├── instantmesh_service.py         # 模块6：InstantMesh（需要GPU）
└── generation_router.py           # 统一路由（调度所有模块）
```

### 3.2 模块隔离原则

**每个模块必须**：
1. ✅ 独立的Service类（不互相依赖）
2. ✅ 独立的配置文件（使用.env环境变量）
3. ✅ 独立的错误处理（不影响其他模块）
4. ✅ 独立的日志输出（便于调试）

**示例**：
```python
# ✅ 正确：模块独立
class ImageToSTLService:
    """模块2：ImageToSTL图像浮雕转换"""
    def __init__(self):
        self.config = {"base_height": 5.0}
    
    def convert(self, image_path):
        # 只使用numpy-stl依赖
        # 不影响其他模块
        pass

# ❌ 错误：模块互相依赖
class ImageToSTLService:
    def __init__(self):
        from triposr_cpu_service import TripoSRCPU  # 错误！
        self.triposr = TripoSRCPU()  # 不应该依赖其他模块
```

### 3.3 统一路由调度

```python
# backend/app/services/generation/generation_router.py
from .image_to_stl_service import ImageToSTLService
from .triposr_cpu_service import TripoSRCPU
from .hunyuan3d_service import Hunyuan3DService

class GenerationRouter:
    """统一路由：根据配置选择生成模块"""
    
    def __init__(self):
        self.services = {
            'image_to_stl': ImageToSTLService(),
            'triposr_cpu': TripoSRCPU(),
            'hunyuan3d': Hunyuan3DService(),
        }
    
    def generate(self, mode, image_path):
        """根据mode选择对应的生成服务"""
        service = self.services.get(mode)
        if not service:
            raise ValueError(f"不支持的生成模式: {mode}")
        
        return service.generate(image_path)
```

---

## 4. 代码目录结构

### 4.1 完整目录树

```
backend/
├── requirements.txt               # ✅ 唯一依赖文件（v2.0）
├── .env                           # 环境变量配置
├── app/
│   ├── api/v1/
│   │   └── experimental.py        # API路由
│   └── services/
│       └── generation/
│           ├── __init__.py
│           ├── image_to_stl_service.py    # 模块2
│           ├── triposr_cpu_service.py     # 模块3
│           ├── hunyuan3d_service.py       # 模块4
│           ├── sf3d_service.py            # 模块5
│           ├── instantmesh_service.py     # 模块6
│           └── generation_router.py       # 统一路由
├── triposr_lib/                   # TripoSR官方代码（已克隆）
│   ├── requirements.txt           # ⚠️ 仅作参考，不要安装！
│   ├── tsr/                       # 官方源码
│   └── README.md
└── uploads/                       # 生成的文件
```

### 4.2 开源代码库管理

**TripoSR官方代码**：
```
位置: backend/triposr_lib/
来源: git clone https://github.com/VAST-AI-Research/TripoSR.git
用途: 参考官方实现，学习架构设计
操作: 
  - ✅ 可以阅读源码
  - ✅ 可以参考架构
  - ❌ 不要直接安装其依赖
  - ❌ 不要修改其源码
```

**其他开源框架**：
- Hunyuan3D: 参考GitHub仓库，不克隆代码
- SF3D: 参考GitHub仓库，不克隆代码
- InstantMesh: 参考GitHub仓库，不克隆代码
- ImageToSTL: 参考GitHub仓库，不克隆代码

---

## 5. 当前可用模块

### 5.1 模块状态总览

| 模块 | 状态 | Python版本 | GPU需求 | 真实度 | 可用场景 |
|------|------|-----------|---------|--------|---------|
| **模块1：通用3D处理** | ✅ 完全可用 | 3.8+ | 不需要 | 100% | 所有3D操作 |
| **模块2：ImageToSTL** | ✅ 完全可用 | 3.8+ | 不需要 | 100% | 图片转3D浮雕 |
| **模块3：TripoSR CPU** | ⚠️ 降级可用 | 3.8 | 不需要 | 30% | 演示/原型 |
| **模块4：Hunyuan3D** | 🚧 需要GPU | 3.9+ | 8GB+ | 0% | Mock模式 |
| **模块5：SF3D** | 🚧 需要GPU | 3.9+ | 9GB+ | 0% | Mock模式 |
| **模块6：InstantMesh** | 🚧 未实现 | 3.9+ | 8GB+ | 0% | TODO |
| **模块7：TripoSR GPU** | 🚧 需要升级 | 3.9+ | 4-6GB | 0% | Mock模式 |

### 5.2 模块2：ImageToSTL（✅ 已完成并测试通过）

**技术原理**：
```
图片（PNG/JPG） 
  → 灰度转换 
  → 亮度提取 
  → 高度图映射 
  → 3D浮雕网格 
  → STL/GLB导出
```

**生成效果**：
- ✅ 真实的3D浮雕模型
- ✅ 从左侧打光可以看到原始图片
- ✅ 文件大小：STL 6.3MB / GLB 2.3MB
- ✅ 顶点数：65,536
- ✅ 面数：130,050
- ✅ 生成速度：< 1秒
- ✅ 支持3D打印

**测试结果**（2024-04-18）：
```bash
✅ STL格式: 6350.2 KB, 耗时0.61秒
✅ GLB格式: 2292.7 KB, 耗时0.71秒
✅ 真实度: 100%（非AI生成，真实几何体）
```

**依赖**：
```python
numpy-stl==3.0.0  # ✅ 已安装
trimesh           # ✅ 已安装（GLB导出）
```

**API路由**：
```python
POST /api/v1/experimental/image-to-stl/upload
```

**代码示例**：
```python
from app.services.generation.image_to_stl_service import ImageToSTLService

service = ImageToSTLService(base_height=5.0, max_depth=2.0)
result = service.convert(
    image_path="uploads/input.png",
    output_path="uploads/output.stl"
)
print(f"生成成功: {result['faces']} 个面")
```

### 5.3 模块3：TripoSR CPU（当前降级）

**当前实现**：增强版程序化生成器

**技术原理**：
```
图片（PNG/JPG）
  → 特征分析（宽高比、颜色方差）
  → 选择几何体（球体/圆柱体/扁圆柱体/复杂组合体）
  → 提取主色调
  → trimesh生成3D网格
  → GLB导出
```

**生成效果**：
- ⚠️ 不是AI生成，是程序化几何体
- ⚠️ 根据图片特征选择形状
- ✅ 文件大小：80-120 KB
- ✅ 顶点数：约2.5K
- ⚠️ 不支持3D打印（形状太简单）

**依赖**：
```python
trimesh[easy]==4.11.5  # 已安装
numpy==1.24.4          # 已安装
Pillow==10.1.0         # 已安装
rembg==2.0.50          # 已安装（背景移除）
```

**代码示例**：
```python
from app.services.generation.triposr_cpu_service import TripoSRCPU

engine = TripoSRCPU(device="cpu", target_faces=5000)
engine.load_model()  # 自动检测Python版本，降级到程序化生成器

result = await engine.generate(
    image_path="uploads/input.png",
    output_path="uploads/output.glb"
)
print(f"生成成功: {result['file_size']} KB")
```

---

## 6. 未来升级路径

### 6.1 升级到Python 3.9+

**目标**：启用TripoSR官方GPU版（模块7）

**步骤**：

1. **安装Python 3.9**：
```bash
# Windows
conda create -n triposr python=3.9
conda activate triposr
```

2. **安装TripoSR依赖**：
```bash
cd backend
# 编辑requirements.txt，取消注释模块7的依赖
pip install -r requirements.txt
```

3. **验证安装**：
```bash
python -c "from tsr.system import TSR; print('TripoSR加载成功')"
```

4. **系统自动切换**：
```python
# triposr_cpu_service.py 已有自动检测逻辑
python_version = sys.version_info
if python_version.minor >= 9:
    # 自动使用真实TripoSR AI模型
    from tsr.system import TSR
```

### 6.2 添加GPU支持

**目标**：启用Hunyuan3D、SF3D、InstantMesh

**步骤**：

1. **安装CUDA 11.8+**：
```bash
# 检查CUDA版本
nvcc --version
```

2. **安装PyTorch with CUDA**：
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

3. **启用GPU模块**：
```bash
# 编辑requirements.txt，取消注释模块4-6的依赖
pip install -r requirements.txt
```

4. **配置GPU服务**：
```python
# .env文件
GENERATION_MODE=gpu  # 从cpu改为gpu
```

### 6.3 升级时间表

| 阶段 | 目标 | 预计时间 | 依赖模块 |
|------|------|---------|---------|
| **阶段1** | ImageToSTL集成 | 2-3小时 | 模块2 |
| **阶段2** | Python 3.9升级 | 1-2天 | 模块3+7 |
| **阶段3** | GPU环境部署 | 1周 | 模块4-6 |
| **阶段4** | 全模块可用 | 2周 | 所有模块 |

---

## 7. 开发规范

### 7.1 新增模块流程

**步骤1**：评估可行性
```
- Python版本要求？
- GPU需求？
- 依赖冲突？
- 当前环境是否支持？
```

**步骤2**：添加依赖到requirements.txt
```python
# ==================== 模块8：新模块名称 ====================
# 状态：✅/⚠️/🚧
# 官方GitHub: URL
# 技术原理：简要说明
# 依赖包（需要时取消注释）：
# package==version
```

**步骤3**：创建独立Service类
```python
# backend/app/services/generation/new_module_service.py
class NewModuleService:
    """模块8：新模块说明"""
    
    def __init__(self):
        # 独立配置，不依赖其他模块
        pass
    
    def generate(self, image_path):
        # 独立实现
        pass
```

**步骤4**：注册到统一路由
```python
# backend/app/services/generation/generation_router.py
self.services = {
    # ... 其他模块
    'new_module': NewModuleService(),
}
```

**步骤5**：添加API路由
```python
# backend/app/api/v1/experimental.py
@router.post("/new-module/upload")
async def upload_new_module(file: UploadFile):
    # 调用NewModuleService
    pass
```

**步骤6**：前端集成
```typescript
// GenerationPage.tsx
{
  id: 'new_module',
  icon: '',
  label: '新模块',
  desc: '模块说明',
  endpoint: '/api/v1/experimental/new-module/upload',
}
```

### 7.2 禁止操作

**❌ 禁止创建独立依赖文件**：
```bash
# 错误示例
cd backend/new_module
echo "package==1.0" > requirements.txt  # 禁止！
```

**❌ 禁止修改子目录依赖文件**：
```bash
# 错误示例
cd backend/triposr_lib
pip install -r requirements.txt  # 禁止！
```

**❌ 禁止模块互相依赖**：
```python
# 错误示例
class ModuleA:
    def __init__(self):
        from module_b import ModuleB  # 禁止！
        self.module_b = ModuleB()
```

**❌ 禁止硬编码配置**：
```python
# 错误示例
class MyService:
    def __init__(self):
        self.api_key = "sk-123456"  # 禁止！使用.env
```

### 7.3 必须遵守

**✅ 必须使用统一依赖文件**：
```bash
# 正确示例
cd backend
pip install -r requirements.txt
```

**✅ 必须使用环境变量**：
```python
# 正确示例
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("API_KEY")
```

**✅ 必须添加模块注释**：
```python
# ==================== 模块X：模块名称（状态标识） ====================
# 状态：✅/⚠️/
# 官方GitHub: URL
# 技术原理：说明
```

**✅ 必须独立错误处理**：
```python
# 正确示例
class MyService:
    def generate(self):
        try:
            # 生成逻辑
            pass
        except Exception as e:
            logger.error(f"模块X生成失败: {e}", exc_info=True)
            raise  # 不影响其他模块
```

---

## 📝 总结

### 核心要点

1. **统一依赖**：只有一个`backend/requirements.txt`，所有依赖在此管理
2. **模块隔离**：每个开源框架独立Service类，不互相依赖
3. **版本锁定**：所有依赖必须指定确切版本
4. **按需安装**：GPU模块默认注释，需要时取消注释
5. **向后兼容**：保持Python 3.8兼容性

### 当前可用

- ✅ **ImageToSTL**：100%可用，图片转3D浮雕
- ✅ **TripoSR CPU**：30%可用，程序化生成器
- 🚧 **其他模块**：需要GPU或Python 3.9+

### 下一步

1. 集成ImageToSTL模块（2-3小时）
2. 测试完整流程
3. 评估是否升级到Python 3.9+

---

**文档维护**：
- 每次新增模块时更新此文档
- 每次依赖变更时更新requirements.txt
- 保持文档与代码同步

**联系方式**：
- 项目地址：d:\HBuilderProjects\web3D
- 问题反馈：在项目issue中提出
