# 腾讯混元3D云端API配置指南

## 🔴 重要说明

**混元3D使用的是腾讯云标准API 3.0，不是TokenHub平台！**

- ❌ **错误方式**：`tokenhub.tencentmaas.com` + `sk- API Key`
- ✅ **正确方式**：`ai3d.tencentcloudapi.com` + `SecretId/SecretKey`

---

## 📋 第一步：获取SecretId和SecretKey

### 1. 访问腾讯云控制台

打开浏览器，访问：https://console.cloud.tencent.com/cam/capi

### 2. 创建API密钥

1. 如果还没有密钥，点击【新建密钥】按钮
2. 系统会生成一对密钥：
   - **SecretId**：形如 `AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **SecretKey**：形如 `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（只显示一次！）

### 3. 复制并保存密钥

⚠️ **重要**：SecretKey只在创建时显示一次，请务必妥善保存！

---

## ⚙️ 第二步：配置环境变量

编辑 `backend/.env` 文件，添加以下配置：

```bash
# ==================== 腾讯混元3D云端API配置 ====================
# SecretId: 腾讯云API密钥ID（形如AKIDxxxxxxxx）
HUNYUAN3D_SECRET_ID=你的SecretId

# SecretKey: 腾讯云API密钥（形如xxxxxxxx，只在创建时显示一次）
HUNYUAN3D_SECRET_KEY=你的SecretKey

# API版本：rapid=标准版，pro=专业版
HUNYUAN3D_API_VERSION=rapid
```

**示例**：
```bash
HUNYUAN3D_SECRET_ID=AKIDz8krbsJ5yKBZQpn74WFkmLPx3EXAMPLE
HUNYUAN3D_SECRET_KEY=GkTXxxxxxxxxxxxxxxxxxxxxxxxxxx
HUNYUAN3D_API_VERSION=rapid
```

---

## 🧪 第三步：测试API调用

运行测试脚本验证配置是否正确：

```bash
cd backend
python test_tencent_cloud_api.py
```

**预期输出**：
```
✅ 任务提交成功！
Job ID: job-xxxxx
Request ID: xxxxx-xxxxx-xxxxx

✅ 测试完成！所有功能正常！
```

---

## 📊 API接口说明

### 支持的API版本

| 版本 | Action名称 | 说明 |
|------|-----------|------|
| rapid | SubmitHunyuanTo3DRapidJob | 标准版（快速） |
| pro | SubmitHunyuanTo3DProJob | 专业版（高质量） |

### 核心接口

1. **提交任务**：`SubmitHunyuanTo3DRapidJob` / `SubmitHunyuanTo3DProJob`
   - 支持文生3D、图生3D
   - 返回JobId用于查询

2. **查询任务**：`QueryHunyuanTo3DRapidJob` / `QueryHunyuanTo3DProJob`
   - 根据JobId查询任务状态
   - 任务完成后返回GLB下载链接

### API参数

#### 文生3D
```json
{
  "Prompt": "一只可爱的小狗"
}
```

#### 图生3D
```json
{
  "ImageBase64": "base64编码的图片数据",
  "Prompt": "可选的文本提示"
}
```

---

## 💰 资源包与费用

### 免费资源包

新用户可获得免费资源包：
- 国际站：200次
- 积分：100次
- 总计：300次

查看资源包：https://console.cloud.tencent.com/ai3d/resource-pack

### 计费方式

- 按量付费
- 超出免费额度后按实际使用量计费

---

## 🔗 官方文档

- **产品文档**：https://cloud.tencent.com/document/product/1804
- **API文档**：https://cloud.tencent.com/document/api/1804/120696
- **API Explorer**：https://console.cloud.tencent.com/api/explorer?Product=ai3d

---

## ❓ 常见问题

### Q1: 为什么之前使用sk- API Key返回401？

A: sk- API Key是TokenHub平台的认证方式，不适用于混元3D。混元3D使用的是腾讯云标准API 3.0，需要使用SecretId/SecretKey进行TC3-HMAC-SHA256签名认证。

### Q2: SecretKey丢失了怎么办？

A: SecretKey只在创建时显示一次，如果丢失需要重新创建新的密钥对。旧密钥可以禁用或删除。

### Q3: 如何选择rapid还是pro版本？

A: 
- **rapid（标准版）**：速度快，适合快速原型开发
- **pro（专业版）**：质量高，适合生产环境

在`.env`文件中修改`HUNYUAN3D_API_VERSION`即可切换。

### Q4: 任务超时怎么办？

A: 默认超时时间为5分钟（300秒）。如果任务较复杂，可以增加超时时间。

---

## 📞 技术支持

如果遇到问题，请联系腾讯云技术支持：

1. 访问：https://console.cloud.tencent.com/workorder
2. 选择产品：AI 3D
3. 描述问题并提供Request ID

---

## ✅ 配置检查清单

- [ ] 已注册腾讯云账号并完成实名认证
- [ ] 已开通混元3D服务
- [ ] 已创建API密钥（SecretId/SecretKey）
- [ ] 已在.env文件中配置SecretId和SecretKey
- [ ] 已运行测试脚本验证配置
- [ ] 测试脚本返回"测试完成！所有功能正常！"

完成以上步骤后，重启后端服务即可使用混元3D云端API！
