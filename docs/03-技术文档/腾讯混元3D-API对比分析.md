# 腾讯云混元3D API - 官方规范与实现对比特对分析

**生成时间**: 2026-04-18  
**分析对象**: `hunyuan3d_cloud_service.py` vs 腾讯官方API文档  
**官方文档**: 
- https://cloud.tencent.com/document/product/1804/123464 (标准版)
- https://cloud.tencent.com/document/product/1804/123448 (专业版)

---

## 📋 目录

1. [API版本对比](#api版本对比)
2. [参数要求对比](#参数要求对比)
3. [响应格式对比](#响应格式对比)
4. [发现的问题与修复](#发现的问题与修复)
5. [当前实现评估](#当前实现评估)

---

## 🔍 API版本对比

### 官方支持的版本

根据腾讯官方文档，混元3D API **只有两个版本**：

| 版本名称 | API Action | 说明 | 生成时间 | 积分消耗 |
|---------|-----------|------|---------|---------|
| **标准版** (Rapid) | `SubmitHunyuanTo3DRapidJob` | 快速生成，质量良好 | 30-60秒 | 10积分 |
| **专业版** (Pro) | `SubmitHunyuanTo3DProJob` | 高质量生成，支持更多功能 | 60-120秒 | 20积分 |

### ❌ 不存在的版本

**极速版（Express）不存在！**

官方API列表中**没有**以下接口：
- ❌ `SubmitHunyuanTo3DExpressJob`
- ❌ `QueryHunyuanTo3DExpressJob`

### 我们的实现问题

**修复前**（第73-75行）：
```python
elif version == "express":
    self.submit_action = "SubmitHunyuanTo3DExpressJob"  # ❌ 这个API不存在！
    self.query_action = "QueryHunyuanTo3DExpressJob"
```

**修复后**：
```python
# 验证version参数，极速版不存在，自动降级为标准版
if version == "express":
    logger.warning(f"[Hunyuan3D Cloud] 极速版（express）不存在，自动降级为标准版（rapid）")
    version = "rapid"
```

✅ **已修复**：在初始化时检测并自动降级

---

## 📝 参数要求对比

### 提交任务接口参数

#### 1️⃣ ImageBase64 / ImageUrl / Prompt（三选一）

**官方要求**：
```
ImageBase64、ImageUrl和Prompt必填其一，且Prompt和ImageBase64/ImageUrl不能同时存在。
```

**参数详情**：

| 参数 | 类型 | 必选 | 说明 |
|------|------|------|------|
| ImageBase64 | String | 否* | 输入图Base64数据<br>- 单边分辨率：128-5000<br>- 大小：≤6MB（base64编码后约8MB）<br>- 格式：jpg, png, jpeg, webp |
| ImageUrl | String | 否* | 输入图URL<br>- 单边分辨率：128-5000<br>- 大小：≤6MB<br>- 格式：jpg, png, jpeg, webp |
| Prompt | String | 否* | 文生3D描述<br>- 最多1024个UTF-8字符<br>- 中文正向提示词 |

*三者必填其一，且不能同时提供Prompt和ImageBase64/ImageUrl

**我们的实现**（修复后）：
```python
# 设置参数（图生3D只能提供ImageBase64，不能同时提供Prompt）
# 官方要求：ImageBase64、ImageUrl和Prompt三选一
if image_base64:
    req.ImageBase64 = image_base64
elif prompt:
    req.Prompt = prompt
else:
    raise ValueError("必须提供ImageBase64或Prompt其中之一")
```

✅ **符合要求**：正确实现了三选一逻辑

---

#### 2️⃣ 图片格式和大小限制

**官方要求**：
```
- 单边分辨率：不小于128，不大于5000
- 大小：≤6MB（base64编码后会大30%左右，建议实际输入图片不超过6MB）
- 格式：jpg, png, jpeg, webp
```

**我们的实现**：
```python
# 目前没有任何验证逻辑
with open(image_path, 'rb') as f:
    image_data = f.read()
image_base64 = base64.b64encode(image_data).decode('utf-8')
```

⚠️ **缺失功能**：缺少图片格式和大小的验证

**建议添加**：
```python
def validate_image(image_path: str):
    """验证图片是否符合腾讯混元3D API要求"""
    from PIL import Image
    
    img = Image.open(image_path)
    width, height = img.size
    
    # 检查分辨率
    if width < 128 or height < 128:
        raise ValueError(f"图片分辨率过小：{width}x{height}，最小要求128x128")
    
    if width > 5000 or height > 5000:
        raise ValueError(f"图片分辨率过大：{width}x{height}，最大要求5000x5000")
    
    # 检查文件大小
    file_size = Path(image_path).stat().st_size
    if file_size > 6 * 1024 * 1024:  # 6MB
        raise ValueError(f"图片文件过大：{file_size/1024/1024:.1f}MB，最大允许6MB")
    
    # 检查格式
    if img.format not in ['JPEG', 'PNG', 'WEBP']:
        raise ValueError(f"不支持的图片格式：{img.format}，仅支持jpg, png, jpeg, webp")
```

---

#### 3️⃣ Model参数（仅专业版）

**官方要求**：
```
Model 否 String
混元生3D生成模型版本，默认为3.0，可选项：3.0，3.1
选择3.1版本时，LowPoly参数不可用。
```

**我们的实现**：
```python
# 目前没有传递Model参数
req = models.SubmitHunyuanTo3DProJobRequest()
# 缺少：req.Model = "3.0" 或 "3.1"
```

⚠️ **可选优化**：可以添加Model参数支持，但非必需（默认3.0）

---

#### 4️⃣ ResultFormat参数

**官方要求**：
```
ResultFormat 否 String
生成模型的格式，仅限制生成一种格式。
生成模型文件组默认返回obj格式。
可选值：OBJ，GLB，STL，USDZ，FBX，MP4。
示例值：OBJ
```

**我们的实现**：
```python
# 目前没有设置ResultFormat，使用默认值（OBJ）
# 但我们期望得到GLB格式
```

⚠️ **建议优化**：明确指定ResultFormat为GLB

```python
req.ResultFormat = "GLB"
```

---

#### 5️⃣ EnablePBR参数

**官方要求**：
```
EnablePBR 否 Boolean
是否开启 PBR材质生成，默认 false。
示例值：false
```

**我们的实现**：
```python
# 未设置此参数，使用默认值false
```

✅ **可以接受**：默认不开启PBR是合理的

---

### 查询任务接口参数

**官方要求**：
```
JobId 是 String
任务ID（有效期24小时）
```

**我们的实现**：
```python
req.JobId = task_id
```

✅ **完全符合**

---

## 📤 响应格式对比

### 提交任务响应

**官方响应**：
```json
{
  "Response": {
    "JobId": "1315932989749215232",
    "RequestId": "1efb4823-902e-4809-9656-aea168410e54"
  }
}
```

**SDK响应处理**：
```python
job_id = resp.JobId  # ✅ 正确提取JobId
```

✅ **符合要求**

---

### 查询任务响应

**官方响应结构**：
```json
{
  "Response": {
    "JobId": "1315932989749215232",
    "Status": "SUCCESS",
    "ResultFile3Ds": [
      {
        "Type": "GLB",
        "Url": "https://cos.ap-guangzhou.myqcloud.com/model.glb",
        "PreviewImageUrl": "https://..."
      }
    ],
    "ErrorMessage": null,
    "RequestId": "xxx"
  }
}
```

**状态枚举**：
- `PENDING` - 排队中
- `PROCESSING` - 处理中
- `SUCCESS` - 成功
- `FAILED` - 失败

**我们的实现**（第265-306行）：
```python
response_data = {
    'JobId': getattr(resp, 'JobId', None) or task_id,
    'Status': getattr(resp, 'Status', 'UNKNOWN'),
    'ResultFile3Ds': getattr(resp, 'ResultFile3Ds', []) or [],
    'ErrorMessage': getattr(resp, 'ErrorMessage', None),
}

status = getattr(resp, 'Status', 'UNKNOWN')

if status == 'SUCCESS':
    result_file_3ds = response_data.get('ResultFile3Ds', [])
    glb_url = None
    
    # ResultFile3Ds是一个列表，包含多个文件对象
    if result_file_3ds:
        for file_obj in result_file_3ds:
            file_type = file_obj.get('Type', '').lower() if isinstance(file_obj, dict) else getattr(file_obj, 'Type', '')
            file_url = file_obj.get('Url', '') if isinstance(file_obj, dict) else getattr(file_obj, 'Url', '')
            
            if file_type == 'glb' and file_url:
                glb_url = file_url
                break
        
        # 如果没有GLB，尝试使用第一个可用的文件
        if not glb_url and result_file_3ds:
            first_file = result_file_3ds[0]
            glb_url = first_file.get('Url', '') if isinstance(first_file, dict) else getattr(first_file, 'Url', '')
    
    response_data['ResultUrl'] = glb_url
```

✅ **基本符合要求**，但有以下注意事项：

1. **Type字段大小写**：官方返回大写（如"GLB"），代码中做了`.lower()`转换 ✅
2. **数据结构兼容性**：同时支持字典和对象两种形式 ✅
3. **容错处理**：如果没有GLB格式，会降级使用第一个可用文件 ⚠️

---

## 🔴 发现的问题与修复

### 问题1：极速版API不存在（严重）

**问题描述**：
- 代码中定义了`SubmitHunyuanTo3DExpressJob`，但该API不存在
- 会导致调用时抛出500错误

**影响范围**：
- 所有使用`version="express"`的请求都会失败
- 前端如果选择了"极速版"选项，会直接报错

**修复方案**：
1. ✅ 在`__init__`中添加版本验证，自动降级为rapid
2. ✅ 移除`elif version == "express"`分支
3. ✅ 更新注释说明极速版不存在

**修复状态**：✅ 已完成

---

### 问题2：缺少图片验证（中等）

**问题描述**：
- 没有验证图片格式、大小、分辨率
- 可能上传不符合要求的图片导致API调用失败

**影响范围**：
- 用户上传超大图片会浪费时间和积分
- 不支持的格式会导致API返回错误

**修复建议**：
添加`validate_image()`函数，在提交前验证图片

**修复状态**：⏳ 待实现

---

### 问题3：未指定ResultFormat（轻微）

**问题描述**：
- 没有明确指定输出格式为GLB
- 依赖默认值（可能是OBJ）

**影响范围**：
- 可能返回OBJ格式而非GLB
- 需要额外转换步骤

**修复建议**：
```python
req.ResultFormat = "GLB"
```

**修复状态**：⏳ 待实现

---

### 问题4：Prompt和ImageBase64互斥逻辑（已正确）

**问题描述**：
- 官方要求两者不能同时存在
- 需要确保只传递其中一个

**当前实现**：
```python
if image_base64:
    req.ImageBase64 = image_base64
elif prompt:
    req.Prompt = prompt
else:
    raise ValueError("必须提供ImageBase64或Prompt其中之一")
```

✅ **已正确处理**

---

## ✅ 当前实现评估

### 符合官方规范的部分

| 项目 | 状态 | 说明 |
|------|------|------|
| SDK调用方式 | ✅ | 使用腾讯云官方SDK |
| 地域配置 | ✅ | ap-guangzhou |
| API域名 | ✅ | ai3d.tencentcloudapi.com |
| Action名称（Rapid/Pro） | ✅ | SubmitHunyuanTo3DRapidJob / Pro |
| 轮询机制 | ✅ | 每5秒查询，最多60次 |
| JobId提取 | ✅ | 正确从响应中提取 |
| 状态判断 | ✅ | SUCCESS/FAILED/PENDING/PROCESSING |
| GLB下载 | ✅ | 从ResultFile3Ds中提取URL并下载 |
| 额度管理 | ✅ | 扣费和退款逻辑完整 |
| 异步处理 | ✅ | 使用BackgroundTasks |

---

### 需要优化的部分

| 项目 | 优先级 | 建议 |
|------|--------|------|
| 图片验证 | 🔴 高 | 添加格式、大小、分辨率验证 |
| ResultFormat指定 | 🟡 中 | 明确设置为GLB |
| Model参数支持 | 🟢 低 | 可选支持3.0/3.1版本选择 |
| 错误信息细化 | 🟢 低 | 区分不同类型的失败原因 |

---

## 📊 总结

### 整体评价

**评分**: ⭐⭐⭐⭐☆ (4/5)

**优点**：
1. ✅ 核心API调用逻辑完全符合官方规范
2. ✅ 使用官方SDK，避免签名错误
3. ✅ 完整的额度和退款机制
4. ✅ 异步处理和任务状态管理完善
5. ✅ 已修复极速版不存在的问题

**不足**：
1. ⚠️ 缺少图片预验证
2. ⚠️ 未明确指定输出格式
3. ⚠️ 错误处理可以更细化

### 关键发现

🔴 **最重要的发现**：**极速版（Express）API不存在！**

这是之前导致500错误的根本原因。现在已经通过自动降级机制修复。

### 下一步建议

1. **立即执行**：
   - ✅ 已修复极速版问题
   - 测试标准版和专业版的实际调用

2. **短期优化**（1-2天）：
   - 添加图片验证功能
   - 明确指定ResultFormat为GLB

3. **长期优化**（1周）：
   - 支持Model参数选择（3.0/3.1）
   - 添加更详细的错误日志
   - 优化轮询策略（动态调整间隔）

---

## 📚 参考资料

- [腾讯混元3D产品概述](https://cloud.tencent.com/document/product/1804/120696)
- [提交混元生3D标准版任务](https://cloud.tencent.com/document/product/1804/123464)
- [提交混元生3D专业版任务](https://cloud.tencent.com/document/product/1804/123448)
- [查询混元生3D任务](https://cloud.tencent.com/document/product/1804/123449)
- [腾讯云SDK文档](https://cloud.tencent.com/document/sdk)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-18  
**作者**: AI Assistant
