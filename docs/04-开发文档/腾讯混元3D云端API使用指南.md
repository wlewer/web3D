# 腾讯混元3D云端API使用指南

## 📋 前置准备

### 1. 获取腾讯云API Key

1. **访问腾讯云控制台**
   - 网址：https://console.cloud.tencent.com/hunyuan
   - 需要注册/登录腾讯云账号

2. **开通混元3D服务**
   - 进入"混元大模型"产品页
   - 找到"混元3D"服务
   - 点击"立即开通"

3. **获取API密钥**
   - 进入"API密钥管理"页面
   - 创建新的API密钥（或使用已有密钥）
   - 复制 `SecretId` 和 `SecretKey`
   - **注意**：部分服务使用Bearer Token格式，请根据实际文档确认

4. **查看免费额度**
   - 新用户通常有免费试用额度
   - 查看"用量统计"了解剩余配额

---

## ⚙️ 配置步骤

### 步骤1：编辑 `.env` 文件

打开 `backend/.env` 文件，修改第39行：

```env
# 修改前
HUNYUAN3D_CLOUD_API_KEY=your_api_key_here

# 修改后（替换为你的真实API Key）
HUNYUAN3D_CLOUD_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**可选配置**（第40行）：
```env
# 选择不同的模型版本
HUNYUAN3D_CLOUD_MODEL=hy-3d-3.0        # 标准版（推荐）
# HUNYUAN3D_CLOUD_MODEL=hy-3d-3.1      # 专业版（最高质量）
# HUNYUAN3D_CLOUD_MODEL=HY-3D-Express  # 极速版（最快生成）
```

### 步骤2：重启后端服务

```bash
cd d:/HBuilderProjects/web3D/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

看到以下日志表示启动成功：
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 🧪 测试流程

### 方法1：通过前端页面测试

1. **访问GenerationPage**
   - 浏览器打开：http://localhost:5173/generation
   - 或你配置的React前端地址

2. **选择"HuggingFace"模式**
   - 点击第七个卡片（HuggingFace图标）
   - 上传一张清晰的物体图片（PNG/JPG格式）
   - 建议：白色背景、单一物体、光照均匀

3. **观察生成进度**
   - 进度条会显示：10% → 30% → 100%
   - 预计耗时：1-3分钟（取决于图片和网络）
   - 完成后自动显示3D预览

4. **下载GLB模型**
   - 点击"下载模型"按钮
   - 文件格式：`.glb`（glTF 2.0二进制）
   - 可用于Unity、Blender、Three.js等

### 方法2：通过API直接测试

```bash
# 使用curl测试
curl -X POST "http://localhost:8000/api/v1/experimental/huggingface/upload" \
  -F "file=@test_image.png" \
  -H "Content-Type: multipart/form-data"
```

响应示例：
```json
{
  "task_id": "hunyuan_cloud_a1b2c3d4",
  "status": "processing",
  "message": "生成任务已提交，请在后台查看进度"
}
```

查询任务状态：
```bash
curl "http://localhost:8000/api/v1/experimental/status/hunyuan_cloud_a1b2c3d4"
```

---

## 🔍 常见问题排查

### 问题1：提示 "HUNYUAN3D_CLOUD_API_KEY未配置"

**原因**：`.env` 文件中API Key未正确设置

**解决**：
1. 检查 `backend/.env` 第39行是否填写了真实的API Key
2. 确保没有多余的空格或引号
3. 重启后端服务使配置生效

### 问题2：生成失败 "任务失败: Invalid API Key"

**原因**：API Key错误或已过期

**解决**：
1. 登录腾讯云控制台重新获取API Key
2. 确认使用的是正确的密钥格式（Bearer Token vs SecretId/SecretKey）
3. 检查API Key是否有调用权限

### 问题3：超时错误 "请求超时"

**原因**：网络不稳定或图片过大

**解决**：
1. 压缩图片至1MB以内（推荐512x512或1024x1024）
2. 检查网络连接（需要访问腾讯云API）
3. 增加超时时间（修改 `hunyuan3d_cloud_service.py` 第40行）

### 问题4：生成质量不理想

**优化建议**：
1. **图片要求**：
   - 白色或纯色背景
   - 单一主体物体
   - 光照均匀，避免强烈阴影
   - 分辨率：512x512 ~ 1024x1024

2. **模型选择**：
   - 追求质量：使用 `hy-3d-3.1`（专业版）
   - 追求速度：使用 `HY-3D-Express`（极速版）
   - 平衡方案：使用 `hy-3d-3.0`（标准版，默认）

---

## 💰 费用说明

### 腾讯云混元3D计费方式

| 项目 | 说明 |
|------|------|
| **免费额度** | 新用户通常赠送一定次数的免费调用 |
| **按量付费** | 超出免费额度后，按生成次数收费 |
| **价格参考** | 约 ¥0.5-2.0 / 次（具体以官网为准） |
| **账单查询** | 控制台 → 费用中心 → 账单详情 |

**省钱技巧**：
- 开发阶段充分利用免费额度
- 批量生成前先用小图测试效果
- 选择合适的模型版本（极速版更便宜）

---

## 📊 性能对比

| 指标 | 云端API | 本地Mini | 本地Turbo |
|------|---------|----------|-----------|
| **硬件需求** | 无需GPU | 8GB显存 | 8GB显存 |
| **生成时间** | 1-3分钟 | 45-98秒 | 8-18秒 |
| **质量评分** | 95分 | 90分 | 85-90分 |
| **部署难度** | ⭐极简 | ⭐⭐中等 | ⭐⭐⭐困难 |
| **维护成本** | 零维护 | 需更新模型 | 需更新模型 |
| **并发支持** | ✅高并发 | ❌单实例 | ❌单实例 |

---

## 🚀 进阶用法

### 自定义模型参数

修改 `hunyuan3d_cloud_service.py` 的 `generate()` 方法：

```python
result = await engine.generate(
    image_path=str(image_path),
    output_path=str(output_path),
    prompt="a detailed 3D model",  # 可选：添加文本描述
    result_format="glb"             # 输出格式：glb/obj/fbx
)
```

### 批量生成脚本

创建 `batch_generate.py`：

```python
import asyncio
from pathlib import Path
from app.services.generation.hunyuan3d_cloud_service import get_hunyuan3d_cloud

async def batch_generate():
    engine = get_hunyuan3d_cloud()
    image_dir = Path("input_images")
    output_dir = Path("output_models")
    output_dir.mkdir(exist_ok=True)
    
    for image_path in image_dir.glob("*.png"):
        output_path = output_dir / f"{image_path.stem}.glb"
        print(f"Processing: {image_path.name}")
        
        result = await engine.generate(
            image_path=str(image_path),
            output_path=str(output_path)
        )
        
        if result['success']:
            print(f"✅ Success: {result['output_path']}")
        else:
            print(f"❌ Failed: {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(batch_generate())
```

---

## 📞 技术支持

- **官方文档**：https://cloud.tencent.com.cn/document/product/1823/130082
- **API参考**：https://cloud.tencent.com/document/api/1823
- **工单系统**：腾讯云控制台 → 工单 → 提交问题
- **社区论坛**：https://cloud.tencent.com/developer/community

---

## ✅ 检查清单

在开始使用前，请确认：

- [ ] 已注册腾讯云账号并实名认证
- [ ] 已开通混元3D服务
- [ ] 已获取有效的API Key
- [ ] 已在 `.env` 中配置API Key
- [ ] 后端服务已重启
- [ ] 网络连接正常（可访问腾讯云API）
- [ ] 准备了测试图片（白色背景、清晰物体）

完成以上步骤后，即可开始使用腾讯混元3D云端API生成3D模型！🎉
