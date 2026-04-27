# 腾讯混元3D API调用问题分析报告

## 📋 问题概述

**当前状态**：API调用始终返回 HTTP 401 错误
```json
{
  "error": {
    "message": "invalid api key",
    "code": "401002",
    "type": "gateway_error"
  }
}
```

**账户状态**：✅ 已开通服务，已获取300积分
- 国内站：100积分（有效期至2027-04-22）
- 国际站：200积分（有效期至2027-04-22）

---

## 🔍 根本原因

### ❌ 当前实现（错误）

我们使用的是 **TokenHub平台的OpenAI兼容接口**：

```python
# 错误的实现
url = "https://tokenhub.tencentmaas.com/v1/api/3d/submit"
headers = {
    "Authorization": f"Bearer {api_key}",  # sk-开头的Key
    "Content-Type": "application/json"
}
payload = {
    "model": "hy-3d-3.0",
    "prompt": "一只小狗"
}
```

**问题**：
1. TokenHub接口主要用于**国际站**或**特定测试场景**
2. 国内站混元3D的**标准API**是腾讯云API 3.0
3. 即使使用国内站创建的sk-开头的Key，也无法在TokenHub接口使用

---

### ✅ 官方标准实现（正确）

根据官方文档（https://cloud.tencent.com.cn/document/product/1804/120696），
**混元3D必须使用腾讯云API 3.0**：

```python
# 正确的实现
url = "https://ai3d.tencentcloudapi.com"
headers = {
    "Authorization": "TC3-HMAC-SHA256 Credential=..., SignedHeaders=..., Signature=...",
    "Content-Type": "application/json",
    "Host": "ai3d.tencentcloudapi.com",
    "X-TC-Action": "SubmitHunyuanTo3DJob",
    "X-TC-Version": "2025-05-13",
    "X-TC-Region": "ap-guangzhou",
    "X-TC-Timestamp": "1234567890"
}
payload = {
    "Action": "SubmitHunyuanTo3DJob",
    "Version": "2025-05-13",
    "Region": "ap-guangzhou",
    "Prompt": "一只小狗"
}
```

---

## 📊 关键差异对比

| 对比项 | 当前实现（错误） | 官方标准（正确） |
|--------|----------------|----------------|
| **API地址** | `tokenhub.tencentmaas.com` | `ai3d.tencentcloudapi.com` |
| **认证方式** | Bearer Token | TC3-HMAC-SHA256 签名 |
| **所需密钥** | sk-开头的API Key | SecretId + SecretKey |
| **Action参数** | 无 | `SubmitHunyuanTo3DJob` |
| **Version参数** | 无 | `2025-05-13` |
| **Region参数** | 无 | `ap-guangzhou` |
| **请求参数格式** | OpenAI风格（model, prompt） | 腾讯云API风格（Prompt, ImageBase64） |
| **响应格式** | `{"id": "..."}` | `{"Response": {"JobId": "...", "RequestId": "..."}}` |
| **支持的功能** | 文生3D、图生3D | 文生3D、图生3D、专业版、极速版 |
| **返回格式选项** | 无 | OBJ, GLB, STL, USDZ, FBX, MP4 |
| **PBR材质支持** | 无 | 支持（EnablePBR参数） |

---

## 🎯 需要获取的正确密钥

### 当前密钥（无法使用）
- **类型**：混元3D控制台API Key
- **格式**：`sk-JInv1BwWsbnz8TdYGiYV3fzAxWQvVIu3vnpUQxUfyC5hMZaM`
- **用途**：TokenHub平台（主要用于国际站）
- **状态**：❌ 无法用于国内站API 3.0

### 需要的密钥（必须获取）
- **类型**：腾讯云API密钥（CAM）
- **格式**：
  - SecretId：`AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  - SecretKey：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（仅显示一次）
- **用途**：腾讯云API 3.0所有服务
- **获取地址**：https://console.cloud.tencent.com/cam/capi

---

## 📝 获取SecretId和SecretKey的步骤

### 步骤1：登录腾讯云控制台
```
https://console.cloud.tencent.com/cam/capi
```

### 步骤2：进入API密钥管理
1. 左侧菜单选择【访问管理】→【API密钥管理】
2. 或直接在控制台搜索"API密钥"

### 步骤3：创建新密钥
1. 点击【新建密钥】按钮
2. 系统生成SecretId和SecretKey
3. **⚠️ 重要**：SecretKey只显示一次，必须立即复制保存！

### 步骤4：复制密钥
```
SecretId: AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SecretKey: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 步骤5：配置到项目
更新 `.env` 文件：
```env
# 腾讯云API 3.0密钥（用于混元3D）
TENCENT_CLOUD_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_CLOUD_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔧 代码修改方案

### 方案1：使用腾讯云官方SDK（推荐）

```bash
pip install tencentcloud-sdk-python-ai3d
```

```python
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.ai3d.v20250513 import ai3d_client, models

# 初始化客户端
cred = credential.Credential(secret_id, secret_key)
client = ai3d_client.Ai3dClient(cred, "ap-guangzhou")

# 提交任务
req = models.SubmitHunyuanTo3DJobRequest()
req.Prompt = "一只小狗"
req.ResultFormat = "GLB"

resp = client.SubmitHunyuanTo3DJob(req)
job_id = resp.JobId
```

### 方案2：手动实现API 3.0签名（当前方案）

已创建测试脚本：`test_tencent_cloud_api3.py`

核心实现：
```python
class TencentCloudAPIClient:
    def __init__(self, secret_id, secret_key):
        self.host = "ai3d.tencentcloudapi.com"
        self.service = "ai3d"
        self.version = "2025-05-13"
        self.region = "ap-guangzhou"
    
    async def submit_3d_job(self, prompt=None, image_base64=None, image_url=None):
        # TC3-HMAC-SHA256签名
        # 发送请求到 ai3d.tencentcloudapi.com
        # 返回 JobId
```

---

## 📌 官方API参数说明

### 提交混元生3D任务（SubmitHunyuanTo3DJob）

**必需公共参数**：
- `Action`: `SubmitHunyuanTo3DJob`
- `Version`: `2025-05-13`
- `Region`: `ap-guangzhou`

**业务参数**（三选一）：
- `Prompt`（文生3D）：3D内容描述，最多1024字符
- `ImageBase64`（图生3D）：Base64编码，≤6MB
- `ImageUrl`（图生3D）：图片URL

**可选参数**：
- `ResultFormat`: OBJ/GLB/STL/USDZ/FBX/MP4（默认GLB）
- `EnablePBR`: 是否开启PBR材质（默认false）

**返回参数**：
- `JobId`: 任务ID（有效期24小时）
- `RequestId`: 唯一请求ID

---

## ✅ 下一步行动计划

### 1. 获取SecretId和SecretKey
- [ ] 登录 https://console.cloud.tencent.com/cam/capi
- [ ] 创建API密钥
- [ ] 复制SecretId和SecretKey
- [ ] 更新 `.env` 文件

### 2. 测试API 3.0调用
- [ ] 运行 `python test_tencent_cloud_api3.py`
- [ ] 验证文生3D功能
- [ ] 验证图生3D功能
- [ ] 验证查询任务功能

### 3. 集成到项目
- [ ] 替换现有的 `hunyuan3d_cloud_service.py`
- [ ] 更新环境变量配置
- [ ] 测试完整流程
- [ ] 更新文档

---

## 📚 相关资源

### 官方文档
- [混元生3D API概览](https://cloud.tencent.com/document/product/1804/120826)
- [提交混元生3D任务](https://cloud.tencent.com/document/product/1804/120829)
- [API 3.0签名方法](https://cloud.tencent.com/document/api/1804/120829)
- [API Explorer在线调试](https://console.cloud.tencent.com/api/explorer?Product=ai3d&Version=2025-05-13&Action=SubmitHunyuanTo3DJob)

### 测试脚本
- `test_tencent_cloud_api3.py`: API 3.0完整实现和测试
- `test_hunyuan3d_both_apis.py`: 两种方式对比测试

---

## ⚠️ 重要提醒

1. **密钥安全**：SecretKey只显示一次，必须妥善保管
2. **不要泄露**：切勿将密钥提交到代码仓库
3. **定期轮换**：建议定期更换API密钥
4. **权限最小化**：仅为必要服务授予权限
5. **监控使用**：定期查看API调用记录和费用

---

## 🎉 预期结果

完成上述修改后，API调用将：
- ✅ 返回HTTP 200成功状态
- ✅ 获得JobId用于查询任务状态
- ✅ 支持文生3D和图生3D
- ✅ 支持多种输出格式（GLB/OBJ/STL等）
- ✅ 支持PBR材质生成
- ✅ 消耗国内站的100积分额度
