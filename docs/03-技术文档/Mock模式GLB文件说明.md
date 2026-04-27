# Mock模式GLB文件说明

> **更新时间**：2026-04-18  
> **适用版本**：标准版（hy-3d-3.0）Mock模式

---

## ✅ 是的！标准版Mock模式已经有GLB文件

### **当前状态**

项目根目录下已经存在一个示例GLB文件：

```
backend/assets/example.glb
文件大小：1012 bytes (约1KB)
创建时间：2026-04-20 23:18
```

---

## 📦 GLB文件位置

### **主路径**
```
d:\HBuilderProjects\web3D\backend\assets\example.glb
```

### **备用路径**（代码会自动查找）
```
backend/assets/example.glb
assets/example.glb
backend/assets/example_model.glb
```

---

## 🔧 Mock模式如何使用GLB文件

### **工作流程**

```python
async def _handle_mock_generation(...):
    # 1. 模拟进度更新（0% → 100%，6秒）
    for progress in [10, 30, 50, 70, 90, 100]:
        await asyncio.sleep(1)
        task_status['progress'] = progress
    
    # 2. 查找示例GLB文件
    example_glb = Path('backend/assets/example.glb')
    
    # 3. 如果找到，复制到输出目录
    if example_glb.exists():
        output_path = upload_dir / f"{task_id}_model.glb"
        shutil.copy2(example_glb, output_path)
        task_status['glb_path'] = str(output_path)
    
    # 4. 标记任务完成
    task_status['status'] = 'completed'
```

### **关键点**

✅ **有GLB文件时**：
- 复制 `example.glb` 到 `uploads/experimental/` 目录
- 前端可以正常加载和显示3D模型
- 用户可以旋转、缩放、下载

❌ **没有GLB文件时**：
- 创建一个最小的有效GLB占位符（12字节）
- 前端可能显示空白或错误
- 建议准备真实的GLB文件

---

## 🎯 如何验证GLB文件是否正常工作

### **步骤1：检查文件是否存在**

```bash
cd backend
ls -lh assets/example.glb
```

应该看到：
```
-rw-r--r-- 1 boston 197121 1012  4月 20 23:18 assets/example.glb
```

---

### **步骤2：启动后端服务**

```bash
cd backend
python -m uvicorn app.main:app --reload
```

查看日志，应该看到：
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

### **步骤3：测试生成**

1. 访问：http://localhost:5173/admin
2. 登录：admin / Admin123456
3. 菜单：**3D大模型** → **专业版3D生成**
4. 上传图片
5. 选择：**hy-3d-3.0 标准版**
6. 点击 **"🚀 开始生成"**

---

### **步骤4：观察日志**

**后端日志**应该显示：
```
INFO: [EXPERIMENTAL] Hunyuan3D mode: mock
INFO: [EXPERIMENTAL] Mock mode: received image uploads/experimental/hunyuan_cloud_xxx_input.png
INFO: [EXPERIMENTAL] Deducted 10 points from user 1, remaining: 190
INFO: [EXPERIMENTAL] Copied example GLB: backend/assets/example.glb -> uploads/experimental/hunyuan_cloud_xxx_model.glb
INFO: [EXPERIMENTAL] Mock generation completed: uploads/experimental/hunyuan_cloud_xxx_model.glb
```

**关键日志**：
- ✅ `Copied example GLB` - 表示成功复制了GLB文件
- ❌ `Example GLB not found, creating placeholder` - 表示没找到文件，创建了占位符

---

### **步骤5：检查前端**

**浏览器Console**应该显示：
```javascript
[ProfessionalGeneration] Task submitted: hunyuan_cloud_xxx
[ProfessionalGeneration] Progress: 10%
[ProfessionalGeneration] Progress: 30%
[ProfessionalGeneration] Progress: 50%
[ProfessionalGeneration] Progress: 70%
[ProfessionalGeneration] Progress: 90%
[ProfessionalGeneration] Progress: 100%
[ProfessionalGeneration] Model generated successfully: http://localhost:8000/api/v1/experimental/download/hunyuan_cloud_xxx
[ModelPreview] Model loaded successfully
```

**右侧面板**应该显示：
- ✅ 3D模型（可能是简单的几何体）
- ✅ 可以旋转、缩放
- ✅ "⬇️ 下载GLB"按钮可用

---

## 📊 Mock模式 vs Cloud模式对比

### **标准版（hy-3d-3.0）**

| 特性 | Mock模式 | Cloud模式 |
|------|---------|----------|
| **GLB来源** | `assets/example.glb`（固定文件） | 腾讯API生成（根据图片） |
| **生成时间** | 6秒 | 30-60秒 |
| **模型内容** | 固定的示例模型 | 根据上传图片生成 |
| **模型质量** | 取决于example.glb | 高质量（95分） |
| **费用** | 0元 | 10积分（约1元） |
| **网络要求** | 不需要 | 需要 |
| **API密钥** | 不需要 | 需要 |
| **额度扣除** | ✅ 扣除10积分 | ✅ 扣除10积分 |
| **适用场景** | 开发测试、UI演示 | 生产环境、真实使用 |

---

## 🎨 示例GLB文件的内容

### **当前文件信息**

```
文件名：example.glb
大小：1012 bytes
格式：glTF 2.0 Binary
内容：未知（需要3D软件查看）
```

### **如何查看GLB内容**

**方法1：在线查看器**
```
访问：https://gltf-viewer.donmccurdy.com/
拖入：backend/assets/example.glb
```

**方法2：Three.js Editor**
```
访问：https://threejs.org/editor/
导入：File → Import → 选择 example.glb
```

**方法3：Blender**
```
打开Blender
File → Import → glTF 2.0 (.glb/.gltf)
选择 example.glb
```

---

## 🔄 如何替换示例GLB文件

如果您想使用更好的示例模型：

### **步骤1：下载新的GLB文件**

推荐来源：
- [Poly Haven](https://polyhaven.com/models) - CC0许可
- [Khronos glTF-Sample-Models](https://github.com/KhronosGroup/glTF-Sample-Assets)
- [Kenney Assets](https://kenney.nl/assets)

### **步骤2：重命名并替换**

```bash
# 备份原文件
cd backend/assets
cp example.glb example.glb.bak

# 放入新文件（重命名为example.glb）
cp your_new_model.glb example.glb
```

### **步骤3：重启后端**

```bash
cd backend
python -m uvicorn app.main:app --reload
```

### **步骤4：重新测试**

重复上面的测试步骤，应该能看到新的3D模型。

---

## 💡 常见问题

### **Q1: 为什么Mock模式要用固定的GLB文件？**

**A**: Mock模式的目的是**测试UI流程和业务逻辑**，而不是生成真实的3D模型。使用固定文件可以：
- ✅ 快速响应（6秒）
- ✅ 零成本
- ✅ 无需网络
- ✅ 稳定可靠

---

### **Q2: 如果删除example.glb会怎样？**

**A**: 代码会自动创建一个最小的GLB占位符（12字节），但这个文件：
- ❌ 不是有效的3D模型
- ❌ 前端可能显示空白
- ❌ 无法看到3D效果

**建议**：保留example.glb文件或替换为更好的模型。

---

### **Q3: Mock模式的GLB和Cloud模式生成的有什么区别？**

**A**: 

| 对比项 | Mock GLB | Cloud GLB |
|--------|---------|-----------|
| **来源** | 固定文件 | AI实时生成 |
| **内容** | 与上传图片无关 | 根据图片内容生成 |
| **质量** | 取决于文件本身 | 高质量（95分） |
| **唯一性** | 每次相同 | 每次不同 |
| **用途** | 测试UI | 真实使用 |

**举例**：
```
上传一张鞋子的照片

Mock模式：
→ 返回 example.glb（可能是个立方体或其他固定模型）
→ 与鞋子无关

Cloud模式：
→ 调用腾讯API
→ 返回真实的鞋子3D模型
→ 与上传的照片高度相似
```

---

### **Q4: 如何知道当前使用的是哪个GLB文件？**

**A**: 查看后端日志：

```
# 成功复制示例文件
INFO: [EXPERIMENTAL] Copied example GLB: backend/assets/example.glb -> uploads/experimental/hunyuan_cloud_xxx_model.glb

# 创建占位符
WARNING: [EXPERIMENTAL] Example GLB not found, creating placeholder
INFO: [EXPERIMENTAL] Created minimal GLB placeholder: uploads/experimental/hunyuan_cloud_xxx_model.glb
```

---

### **Q5: 可以为不同模型版本使用不同的GLB文件吗？**

**A**: 可以！修改代码即可：

```python
# 根据版本选择不同的示例文件
version_glb_map = {
    'hy-3d-3.0': 'assets/example_standard.glb',
    'hy-3d-3.1': 'assets/example_pro.glb',
    'HY-3D-Express': 'assets/example_express.glb',
}

example_glb = Path(version_glb_map.get(version, 'assets/example.glb'))
```

然后准备对应的GLB文件即可。

---

## 📝 总结

### **核心要点**

1. ✅ **已有GLB文件**：`backend/assets/example.glb`（1KB）
2. ✅ **自动使用**：Mock模式会自动复制该文件
3. ✅ **完整流程**：可以测试上传、生成、预览、下载
4. ⚠️ **固定内容**：与上传的图片无关
5. 🔄 **可替换**：可以换成更好的示例模型

### **下一步建议**

**如果想看到更好的3D效果**：
1. 从Poly Haven下载一个免费的GLB模型
2. 替换 `backend/assets/example.glb`
3. 重启后端
4. 重新测试

**如果想体验真实AI生成**：
1. 配置腾讯云API密钥
2. 切换到Cloud模式
3. 上传真实图片
4. 等待30-60秒
5. 获得根据图片生成的3D模型

---

**Mock模式让您快速测试UI，Cloud模式让您获得真实结果！** 🎉
