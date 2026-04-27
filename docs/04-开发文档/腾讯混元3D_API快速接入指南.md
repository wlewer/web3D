# 腾讯混元3D官方API快速接入指南

> 📌 **重要提示**：本指南基于腾讯云TokenHub平台最新文档，适用于Web3D项目快速接入

---

## 🎯 接入概览

- **平台**：腾讯云TokenHub（大模型服务平台）
- **API格式**：`sk-tp-xxxxxxxxxxxxxxxx`
- **免费额度**：新用户赠送100万Tokens（90天有效期）
- **Base URL**：`https://tokenhub.tencentmaas.com/v1/api/3d`
- **认证方式**：Bearer Token

---

## 📝 第一步：注册腾讯云账号

### 1.1 创建账号
- 访问：[https://cloud.tencent.com/](https://cloud.tencent.com/)
- 点击右上角"注册"按钮
- 使用手机号或邮箱注册

### 1.2 实名认证（必须）
> ⚠️ 未完成实名认证无法生成API Key

**认证方式**（任选其一）：
- **个人认证**：微信扫码 / 银行卡认证
- **企业认证**：营业执照认证

**操作路径**：
```
腾讯云控制台 → 右上角头像 → 账号信息 → 实名认证
```

---

## 🔑 第二步：获取API Key

### 2.1 访问TokenHub控制台
- 地址：[https://console.cloud.tencent.com/tokenhub](https://console.cloud.tencent.com/tokenhub)
- 首次访问可能需要开通服务，点击"立即开通"

### 2.2 生成API Key
1. 在左侧导航栏找到 **"Token Plan"** 菜单
2. 点击进入"Token Plan"页面
3. 找到 **"密钥管理"** 区域
4. 点击 **"生成密钥"** 按钮
5. 系统生成专属API Key（格式：`sk-tp-xxxxxxxxxxxxxxxx`）

### 2.3 复制API Key
1. 点击密钥旁边的 **"复制"** 按钮
2. ⚠️ **重要提示**：
   - API Key只显示一次，关闭后无法再次查看完整内容
   - 请妥善保存，建议粘贴到密码管理器
   - **不要上传到公开代码仓库**

---

## ⚙️ 第三步：配置到Web3D项目

### 3.1 编辑环境变量文件
打开 `d:/HBuilderProjects/web3D/backend/.env` 文件

找到第51行：
```env
HUNYUAN3D_CLOUD_API_KEY=sk-tp-your-real-api-key-here
```

替换为您复制的真实API Key：
```env
HUNYUAN3D_CLOUD_API_KEY=sk-tp-您刚才复制的真实Key
```

**示例**：
```env
# 修改前
HUNYUAN3D_CLOUD_API_KEY=sk-tp-your-real-api-key-here

# 修改后（假设您的Key是sk-tp-abc123xyz...）
HUNYUAN3D_CLOUD_API_KEY=sk-tp-abc123xyz456def789ghi012jkl345mno678
```

### 3.2 选择模型版本（可选）
编辑第52行，选择您需要的模型版本：

```env
# 标准版（推荐，平衡质量与速度）
HUNYUAN3D_CLOUD_MODEL=hy-3d-3.0

# 专业版（最高质量，适合精细模型）
# HUNYUAN3D_CLOUD_MODEL=hy-3d-3.1

# 极速版（最快生成）
# HUNYUAN3D_CLOUD_MODEL=HY-3D-Express
```

### 3.3 重启后端服务

**Windows PowerShell**：
```powershell
cd d:/HBuilderProjects/web3D/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**看到以下日志表示启动成功**：
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 🧪 第四步：验证API连接

### 4.1 方法一：通过后台页面测试（推荐）

1. **访问后台管理系统**
   - 地址：`http://localhost:5173/admin`
   - 使用账号登录

2. **进入3D官方模型页面**
   - 左侧菜单：AI生成实验 → 3D官方模型
   - 或直接访问：`http://localhost:5173/admin/professional/generation`

3. **上传测试图片**
   - 点击"上传图片"区域
   - 选择一张清晰的物体图片（PNG/JPG格式）
   - **图片建议**：
     - 白色或纯色背景
     - 单一主体物体
     - 光照均匀
     - 分辨率：512x512 ~ 1024x1024

4. **观察生成过程**
   - 进度条显示：10% → 30% → 100%
   - 预计耗时：1-3分钟
   - 完成后自动显示3D预览

5. **下载模型**
   - 点击"下载模型"按钮
   - 文件格式：`.glb`（glTF 2.0二进制）
   - 可用于Unity、Blender、Three.js等工具

### 4.2 方法二：通过API直接测试

**提交生成任务**：
```bash
curl -X POST "http://localhost:8000/api/v1/experimental/huggingface/upload" \
  -F "file=@test_image.png" \
  -H "Content-Type: multipart/form-data"
```

**预期响应**：
```json
{
  "task_id": "hunyuan_cloud_a1b2c3d4",
  "status": "processing",
  "message": "生成任务已提交，请在后台查看进度"
}
```

**查询任务状态**：
```bash
curl "http://localhost:8000/api/v1/experimental/status/hunyuan_cloud_a1b2c3d4"
```

---

## ✅ 接入检查清单

在开始使用前，请逐项确认：

- [ ] 已注册腾讯云账号
- [ ] 已完成实名认证（必须）
- [ ] 已访问TokenHub控制台
- [ ] 已在"Token Plan"页面生成API Key
- [ ] 已复制API Key并妥善保存
- [ ] 已修改 `backend/.env` 文件第51行
- [ ] 已重启后端服务
- [ ] 后端启动日志无错误
- [ ] 网络连接正常（可访问腾讯云API）
- [ ] 已准备好测试图片

**全部打勾后，即可开始使用！** 🎉

---

## 💰 费用与额度说明

### 免费额度
- **新用户福利**：100万Tokens（90天有效期）
- **适用场景**：开发和测试阶段
- **查看方式**：TokenHub控制台 → Token Plan → 剩余额度

### 付费模式
- **按量付费**：超出免费额度后，按实际使用量收费
- **计费单位**：Token
- **价格参考**：具体以官网实时价格为准

### 查看用量
```
TokenHub控制台 → Token Plan → 用量详情
```

**显示信息**：
- 每日Token总用量
- 分钟级输入/输出Token用量
- 请求维度Token用量

---

## 🔍 常见问题排查

### 问题1：HTTP 401 - invalid api key

**错误信息**：
```json
{
  "error": {
    "message": "invalid api key",
    "code": "401002",
    "type": "gateway_error"
  }
}
```

**原因**：
- API Key未配置或配置错误
- API Key格式不正确（必须是 `sk-tp-xxx` 格式）

**解决方案**：
1. 检查 `backend/.env` 第51行是否填写了真实API Key
2. 确保格式为：`HUNYUAN3D_CLOUD_API_KEY=sk-tp-xxxxx`
3. 确保没有多余的空格或引号
4. 重启后端服务：`python -m uvicorn app.main:app --reload`

---

### 问题2：生成失败 - 任务超时

**原因**：
- 图片过大（超过2MB）
- 网络不稳定
- 腾讯云API响应慢

**解决方案**：
1. 压缩图片至1MB以内（推荐512x512或1024x1024）
2. 检查网络连接
3. 使用纯色背景、单一物体的图片
4. 稍后重试

---

### 问题3：生成质量不理想

**优化建议**：

**图片要求**：
- ✅ 白色或纯色背景
- ✅ 单一主体物体
- ✅ 光照均匀，避免强烈阴影
- ✅ 分辨率：512x512 ~ 1024x1024
- ❌ 避免多物体混杂
- ❌ 避免透明背景（使用PNG时）
- ❌ 避免低分辨率模糊图片

**模型选择**：
- 追求质量：使用 `hy-3d-3.1`（专业版）
- 追求速度：使用 `HY-3D-Express`（极速版）
- 平衡方案：使用 `hy-3d-3.0`（标准版，默认）

---

## 📚 官方文档参考

- **混元3D API文档**：https://cloud.tencent.com/document/product/1823/130082
- **TokenHub快速入门**：https://cloud.tencent.com/document/product/1823/130119
- **TokenHub平台首页**：https://cloud.tencent.com/product/tokenhub
- **API协议说明**：https://cloud.tencent.com/document/product/1823/130078

---

## 📞 技术支持

- **腾讯云工单**：控制台 → 工单 → 提交问题
- **社区论坛**：https://cloud.tencent.com/developer/community
- **客服咨询**：腾讯云官网右下角在线客服

---

## 🎯 快速开始（3分钟搞定）

1. **注册认证**（1分钟）
   - 访问 https://cloud.tencent.com/ 注册并认证

2. **获取Key**（1分钟）
   - 访问 https://console.cloud.tencent.com/tokenhub
   - Token Plan → 生成密钥 → 复制Key

3. **配置项目**（1分钟）
   - 修改 `backend/.env` 第51行
   - 重启后端服务

4. **测试验证**
   - 访问 http://localhost:5173/admin/professional/generation
   - 上传图片，等待生成完成

**完成！** 

---

*文档版本：v1.0*  
*更新时间：2026-04-18*  
*适用平台：腾讯云TokenHub*
