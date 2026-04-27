# 🚀 ImageToSTL 快速启动指南

**5分钟快速体验真实的图片转3D功能！**

---

## ⚡ 快速开始（3步完成）

### 步骤1：安装依赖（1分钟）

```bash
cd d:/HBuilderProjects/web3D/backend
pip install numpy-stl==3.0.0
```

**预期输出**：
```
Successfully installed numpy-stl-3.0.0 python-utils-3.8.2
```

---

### 步骤2：运行测试（1分钟）

```bash
python test_image_to_stl.py
```

**预期输出**：
```
============================================================
✅ ImageToSTL 图像浮雕转换服务测试通过！
============================================================

测试结果总结:
  - STL格式: ✅ 成功 (6350.2 KB, 0.61秒)
  - GLB格式: ✅ 成功 (2292.7 KB, 0.71秒)
  - 生成质量: 真实3D浮雕模型（非AI生成）
  - 适用场景: 3D打印、个性化纪念品、艺术创作
```

**生成的文件**：
- `uploads/experimental/test_output.stl` - STL格式（6.3MB）
- `uploads/experimental/test_output.glb` - GLB格式（2.3MB）

---

### 步骤3：启动后端服务（1分钟）

```bash
uvicorn main:app --reload --port 8000
```

**预期输出**：
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## 🎨 使用方式

### 方式1：前端界面（推荐）

1. **打开浏览器**：
   ```
   http://localhost:5173/admin/experimental/generation
   ```

2. **选择ImageToSTL模式**：
   - 找到"🎨 ImageToSTL"卡片
   - 点击选中

3. **上传图片**：
   - 点击上传区域
   - 选择PNG或JPG图片

4. **等待生成**：
   - 进度条显示0-100%
   - 耗时约1秒

5. **下载模型**：
   - 生成完成后显示3D预览
   - 点击下载按钮保存GLB文件

---

### 方式2：API调用

#### 上传图片并生成

```bash
curl -X POST "http://localhost:8000/api/v1/experimental/image-to-stl/upload" \
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

#### 下载生成的模型

```bash
curl -O "http://localhost:8000/uploads/experimental/imagetostl_a1b2c3d4_model.glb"
```

---

### 方式3：Python代码

```python
import asyncio
from app.services.generation.image_to_stl_service import ImageToSTLService

async def main():
    # 创建服务实例
    service = ImageToSTLService(
        base_height=5.0,   # 底座厚度（mm）
        max_depth=2.0,     # 浮雕深度（mm）
        resolution=256     # 分辨率（像素）
    )
    
    # 转换为GLB格式
    result = await service.convert(
        image_path="uploads/input.png",
        output_path="uploads/output.glb",
        output_format='glb'
    )
    
    print(f"✅ 生成成功!")
    print(f"顶点数: {result['vertices']}")
    print(f"面数: {result['faces']}")
    print(f"文件大小: {result['file_size'] / 1024:.1f} KB")
    print(f"耗时: {result['elapsed_time']}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| **生成时间** | < 1秒 |
| **顶点数** | 65,536 |
| **面数** | 130,050 |
| **STL文件大小** | ~6.3 MB |
| **GLB文件大小** | ~2.3 MB |
| **压缩率** | 64% (GLB vs STL) |

---

## 🎯 参数调优

### 调整浮雕效果

```python
# 更强烈的立体感
service = ImageToSTLService(
    base_height=5.0,
    max_depth=5.0,  # 增加浮雕深度（默认2.0）
    resolution=256
)

# 更细腻的浮雕
service = ImageToSTLService(
    base_height=5.0,
    max_depth=1.0,  # 减小浮雕深度
    resolution=256
)
```

### 调整分辨率

```python
# 快速预览（低分辨率）
service = ImageToSTLService(resolution=128)  # ~0.15秒

# 标准质量（默认）
service = ImageToSTLService(resolution=256)  # ~0.71秒

# 高质量
service = ImageToSTLService(resolution=512)  # ~2.8秒
```

---

## 🔍 验证生成结果

### 方法1：在线3D查看器

1. 访问 [https://gltf-viewer.donmccurdy.com/](https://gltf-viewer.donmccurdy.com/)
2. 拖拽生成的`.glb`文件
3. 旋转查看3D效果

### 方法2：Blender

1. 打开Blender
2. File → Import → glTF 2.0 (.glb/.gltf)
3. 选择生成的文件
4. 从左侧打光可以看到原始图片

### 方法3：Windows 3D查看器

1. 右键点击`.glb`文件
2. 选择"打开方式" → "3D查看器"
3. 旋转查看模型

---

## ❓ 常见问题

### Q1: 生成的模型太平怎么办？

**A**: 增加`max_depth`参数：
```python
service = ImageToSTLService(max_depth=5.0)  # 从2.0增加到5.0
```

### Q2: 文件太大怎么办？

**A**: 降低分辨率：
```python
service = ImageToSTLService(resolution=128)  # 从256降到128
```

### Q3: 如何获得更好的浮雕效果？

**A**: 使用高对比度图片：
- ✅ 黑白照片
- ✅ 清晰的轮廓
- ❌ 避免模糊图片
- ❌ 避免低对比度图片

### Q4: 支持彩色吗？

**A**: 当前版本只支持灰度浮雕。彩色版本在开发计划中。

### Q5: 可以批量处理吗？

**A**: 当前版本支持单个文件。批量处理功能在开发计划中。

---

## 📚 相关文档

- **完整使用指南**: [IMAGE_TO_STL_USAGE.md](IMAGE_TO_STL_USAGE.md)
- **架构文档**: [MODULAR_ARCHITECTURE.md](MODULAR_ARCHITECTURE.md)
- **实施报告**: [IMPLEMENTATION_REPORT_MODULE2.md](IMPLEMENTATION_REPORT_MODULE2.md)

---

## 🎉 恭喜！

您已经成功部署并运行了**ImageToSTL图像浮雕转换服务**！

这是当前环境下**唯一100%真实可用**的图片转3D方案：
- ✅ 无需GPU
- ✅ 无需Python 3.9+
- ✅ 无需Mock
- ✅ 生成真实的3D浮雕模型
- ✅ < 1秒完成转换

**下一步建议**：
1. 尝试不同的图片
2. 调整参数获得最佳效果
3. 探索3D打印应用
4. 分享给朋友体验

---

**最后更新**: 2024-04-18  
**版本**: v1.0.0  
**状态**: ✅ 生产就绪
