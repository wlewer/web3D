# ImageToSTL 图像浮雕转换 - 使用指南

## 📋 概述

**模块2：ImageToSTL** 是一个将2D图片转换为3D浮雕模型的服务。

- **技术原理**：图片亮度 → 高度图 → 3D浮雕网格
- **生成效果**：真实的3D浮雕模型（从左侧打光可以看到原始图片）
- **真实度**：✅ 100%（非AI生成，基于几何算法）
- **状态**：✅ 已完成并测试通过

---

## 🚀 快速开始

### 1. 依赖安装

```bash
cd backend
pip install numpy-stl==3.0.0
```

### 2. API调用示例

#### 上传图片并生成3D模型

```bash
curl -X POST "http://localhost:8000/api/v1/experimental/image-to-stl/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@your_image.png"
```

**响应**：
```json
{
  "success": true,
  "task_id": "imagetostl_a1b2c3d4",
  "message": "任务已创建，正在生成中..."
}
```

#### 查询任务状态

```bash
curl "http://localhost:8000/api/v1/experimental/tasks/imagetostl_a1b2c3d4"
```

**响应**：
```json
{
  "status": "completed",
  "progress": 100,
  "message": "生成完成！",
  "glb_path": "uploads/experimental/imagetostl_a1b2c3d4_model.glb",
  "vertices": 65536,
  "faces": 130050,
  "file_size": 2347950,
  "generation_time": "0.71s"
}
```

---

## 💻 Python代码示例

### 基本用法

```python
from app.services.generation.image_to_stl_service import ImageToSTLService

# 创建服务实例
service = ImageToSTLService(
    base_height=5.0,   # 底座厚度（mm）
    max_depth=2.0,     # 浮雕最大深度（mm）
    resolution=256     # 输出分辨率（像素）
)

# 转换为GLB格式
result = await service.convert(
    image_path="uploads/input.png",
    output_path="uploads/output.glb",
    output_format='glb'
)

print(f"顶点数: {result['vertices']}")
print(f"面数: {result['faces']}")
print(f"文件大小: {result['file_size'] / 1024:.1f} KB")
print(f"耗时: {result['elapsed_time']}")
```

### 生成预览信息

```python
# 不实际生成模型，只获取预估信息
preview = service.generate_preview_info("uploads/input.png")

print(f"分辨率: {preview['resolution']}")
print(f"预估顶点数: {preview['estimated_vertices']}")
print(f"预估面数: {preview['estimated_faces']}")
print(f"预估文件大小: {preview['estimated_file_size_kb']}KB")
print(f"平均亮度: {preview['brightness']['mean']:.2f}")
```

---

## 📊 性能指标

### 测试结果（2024-04-18）

| 指标 | STL格式 | GLB格式 |
|------|---------|---------|
| **顶点数** | 65,536 | 65,536 |
| **面数** | 130,050 | 130,050 |
| **文件大小** | 6,350.2 KB | 2,292.7 KB |
| **生成时间** | 0.61秒 | 0.71秒 |
| **真实度** | 100% | 100% |

### 不同分辨率对比

| 分辨率 | 顶点数 | 面数 | 文件大小(GLB) | 生成时间 |
|--------|--------|------|---------------|----------|
| 128x128 | 16,384 | 32,258 | ~570 KB | ~0.15秒 |
| 256x256 | 65,536 | 130,050 | ~2.3 MB | ~0.71秒 |
| 512x512 | 262,144 | 522,242 | ~9.2 MB | ~2.8秒 |

---

## 🎨 适用场景

### ✅ 推荐使用

1. **个性化纪念品**
   - 照片转3D浮雕
   - 宠物肖像
   - 家庭合影

2. **3D打印**
   - 徽章制作
   - 装饰挂件
   - 艺术摆件

3. **艺术创作**
   - 风景画转3D
   - 抽象艺术
   - 纹理映射

4. **教育演示**
   - 地形模型
   - 建筑立面
   - 科学可视化

### ❌ 不推荐

1. **复杂物体识别**
   - 需要理解物体结构
   - 建议使用TripoSR/Hunyuan3D

2. **高精度建模**
   - 工业设计
   - 机械零件
   - 建议使用专业CAD软件

3. **动态场景**
   - 人物动作
   - 动画角色
   - 建议使用AI生成方案

---

## ⚙️ 参数调优

### base_height（底座厚度）

- **默认值**: 5.0 mm
- **范围**: 1.0 - 20.0 mm
- **建议**:
  - 小型纪念品: 3.0 mm
  - 标准尺寸: 5.0 mm
  - 大型摆件: 10.0 mm

### max_depth（浮雕深度）

- **默认值**: 2.0 mm
- **范围**: 0.5 - 10.0 mm
- **建议**:
  - 细腻浮雕: 1.0 mm
  - 标准浮雕: 2.0 mm
  - 强烈立体感: 5.0 mm

### resolution（分辨率）

- **默认值**: 256 像素
- **范围**: 64 - 1024 像素
- **建议**:
  - 快速预览: 128 像素
  - 标准质量: 256 像素
  - 高质量: 512 像素
  - 超高质量: 1024 像素（较慢）

---

## 🔧 故障排除

### 问题1：导入错误 `ModuleNotFoundError: No module named 'stl'`

**解决方案**：
```bash
pip install numpy-stl==3.0.0
```

### 问题2：GLB导出失败

**原因**：trimesh未安装

**解决方案**：
```bash
pip install trimesh
```

### 问题3：生成的模型太平

**原因**：max_depth设置过小

**解决方案**：
```python
service = ImageToSTLService(max_depth=5.0)  # 增加浮雕深度
```

### 问题4：文件过大

**原因**：分辨率过高

**解决方案**：
```python
service = ImageToSTLService(resolution=128)  # 降低分辨率
```

---

## 📁 文件结构

```
backend/
├── app/
│   └── services/
│       └── generation/
│           ├── image_to_stl_service.py  # 核心服务类
│           └── __init__.py
├── api/
│   └── v1/
│       └── experimental.py  # API路由（包含image-to-stl端点）
├── uploads/
│   └── experimental/  # 上传和输出目录
│       ├── {task_id}_input.png  # 输入图片
│       └── {task_id}_model.glb  # 输出模型
└── test_image_to_stl.py  # 测试脚本
```

---

## 🧪 运行测试

```bash
cd backend
python test_image_to_stl.py
```

**预期输出**：
```
============================================================
ImageToSTL 图像浮雕转换服务测试
============================================================

1. 导入ImageToSTL服务...
   ✅ 导入成功

2. 创建ImageToSTL服务实例...
   ✅ 实例创建成功

3. 创建测试图片...
   ✅ 测试图片创建成功

4. 生成预览信息...
   ✅ 预览信息:
   - 分辨率: 256x256
   - 预估顶点数: 65536
   - 预估面数: 130050

5. 测试转换为STL格式...
   ✅ STL转换成功!
   - 顶点数: 65536
   - 面数: 130050
   - 文件大小: 6350.2 KB
   - 耗时: 0.61s

6. 测试转换为GLB格式...
   ✅ GLB转换成功!
   - 顶点数: 65536
   - 面数: 130050
   - 文件大小: 2292.7 KB
   - 耗时: 0.71s

============================================================
✅ ImageToSTL 图像浮雕转换服务测试通过！
============================================================
```

---

## 📚 相关文档

- [模块化架构文档](MODULAR_ARCHITECTURE.md)
- [后端requirements.txt](requirements.txt)
- [TripoSR CPU服务](app/services/generation/triposr_cpu_service.py)

---

## 🎯 下一步计划

### 短期优化
- [ ] 添加更多输出格式（OBJ、PLY）
- [ ] 支持彩色浮雕（RGB映射）
- [ ] 添加平滑滤波选项
- [ ] 批量处理支持

### 长期规划
- [ ] Web界面集成
- [ ] 实时预览功能
- [ ] 云端部署
- [ ] API限流和认证

---

## 📞 技术支持

如有问题，请查看：
1. 日志文件：`backend/logs/app.log`
2. 测试脚本：`backend/test_image_to_stl.py`
3. 架构文档：`backend/MODULAR_ARCHITECTURE.md`

---

**最后更新**: 2024-04-18  
**版本**: v1.0.0  
**状态**: ✅ 生产就绪
