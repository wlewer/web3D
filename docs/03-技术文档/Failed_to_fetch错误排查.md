# "Failed to fetch" 错误排查指南

> **问题**：生成3D模型时显示"生成失败：Failed to fetch"  
> **更新时间**：2026-04-18

---

## 🔍 常见原因

### **1. 未登录或Token过期** 🔴 最常见

**症状**：
- 浏览器Console显示：`401 Unauthorized`
- Network标签中请求状态为401

**解决方案**：
```bash
# 1. 重新登录
访问：http://localhost:5173/admin
用户名：admin
密码：Admin123456

# 2. 确认登录成功
打开浏览器Console，输入：
localStorage.getItem('access_token')
# 应该返回一个字符串，而不是null
```

---

### **2. 后端服务未启动** 🔴

**症状**：
- 浏览器Console显示：`ERR_CONNECTION_REFUSED`
- Network标签中请求状态为`(failed)`

**检查方法**：
```bash
# Windows PowerShell
netstat -ano | findstr :8000

# 应该看到类似输出：
# TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING    3444
```

**解决方案**：
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

---

### **3. CORS跨域问题** 🟡

**症状**：
- 浏览器Console显示：`Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:5173' has been blocked by CORS policy`

**检查配置**：
后端 `backend/app/config.py` 第70-77行：
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",  # ← 必须包含这个
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:8080"
]
```

**解决方案**：
如果缺少5173，添加后重启后端：
```bash
cd backend
python -m uvicorn app.main:app --reload
```

---

### **4. API路径错误** 🟡

**症状**：
- 浏览器Console显示：`404 Not Found`
- Network标签中URL不正确

**检查前端代码**：
`ProfessionalGenerationPage.tsx` 中的API调用应该是：
```typescript
// ✅ 正确
fetch('http://localhost:8000/api/v1/experimental/huggingface/upload', ...)

// ❌ 错误（相对路径）
fetch('/api/v1/experimental/huggingface/upload', ...)
```

---

### **5. 网络防火墙阻止** 🟡

**症状**：
- 浏览器Console显示：`ERR_NETWORK_ACCESS_DENIED`

**解决方案**：
```bash
# Windows防火墙允许Python
# 控制面板 → Windows Defender 防火墙 → 允许应用通过防火墙
# 找到 python.exe，勾选专用和公用
```

---

## 🛠️ 完整诊断流程

### **步骤1：检查登录状态**

打开浏览器Console（F12），输入：
```javascript
// 检查token
console.log('Token:', localStorage.getItem('access_token'));

// 如果返回 null，说明未登录
// 需要重新登录
```

**如果未登录**：
1. 访问 http://localhost:5173/admin
2. 输入用户名：`admin`
3. 输入密码：`Admin123456`
4. 点击登录
5. 再次检查token

---

### **步骤2：检查后端服务**

```bash
# 终端1：检查端口
netstat -ano | findstr :8000

# 如果没有输出，说明后端未启动
# 启动后端：
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**预期输出**：
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

---

### **步骤3：测试API连通性**

在浏览器Console中输入：
```javascript
// 测试额度查询API
fetch('http://localhost:8000/api/v1/quota/balance', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(err => {
  console.error('Error:', err);
});
```

**预期结果**：
```javascript
Status: 200
Response: {total_quota: 200, used_quota: 0, remaining_quota: 200}
```

**如果失败**：
- Status 401 → Token无效，重新登录
- Status 404 → API路径错误
- Status 0 或 Error → 后端未启动或网络问题

---

### **步骤4：检查Network标签**

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 点击 **"🚀 开始生成"** 按钮
4. 观察请求列表

**查找失败的请求**：
- URL: `http://localhost:8000/api/v1/experimental/huggingface/upload`
- Method: POST
- Status: 应该是 200

**点击该请求，查看**：
- **Headers** 标签：
  - Request Headers 中是否有 `Authorization: Bearer xxx`？
  - Content-Type 是否是 `multipart/form-data`？
  
- **Response** 标签：
  - 有什么错误信息？

- **Preview** 标签：
  - JSON响应内容是什么？

---

### **步骤5：查看后端日志**

在后端运行的终端中，查看日志输出：

**正常情况**：
```
INFO: [EXPERIMENTAL] Hunyuan3D mode: mock
INFO: [EXPERIMENTAL] Mock mode: received image uploads/experimental/hunyuan_cloud_xxx_input.png
INFO: [EXPERIMENTAL] Deducted 10 points from user 1, remaining: 190
```

**异常情况**：
```
ERROR: Authentication failed
ERROR: Task creation failed: ...
```

---

## ✅ 快速修复清单

按顺序执行以下步骤：

### **1. 确保已登录**
```bash
# 浏览器Console
localStorage.getItem('access_token')
# 应该返回字符串，不是null
```

### **2. 确保后端运行**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### **3. 确保前端运行**
```bash
cd src/web-frontend
npm run dev
```

### **4. 清除浏览器缓存**
```
Ctrl + Shift + Delete
选择"缓存的图片和文件"
点击"清除数据"
刷新页面（F5）
```

### **5. 重新测试**
1. 访问 http://localhost:5173/admin
2. 登录（如果需要）
3. 进入"3D大模型" → "专业版3D生成"
4. 上传图片
5. 选择"hy-3d-3.0 标准版"
6. 点击"开始生成"

---

## 🐛 常见错误及解决方案

### **错误1：401 Unauthorized**

**原因**：Token无效或过期

**解决**：
```javascript
// 1. 清除旧token
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');

// 2. 重新登录
// 访问 /admin 页面重新登录
```

---

### **错误2：404 Not Found**

**原因**：API路径错误

**检查**：
```typescript
// ProfessionalGenerationPage.tsx 第461行
const response = await fetch('http://localhost:8000/api/v1/experimental/huggingface/upload', {
  //              ^^^^^^^^^^^^^^^^^^^^ 必须是完整的URL
  method: 'POST',
  ...
});
```

**如果看到相对路径**，修改为完整URL。

---

### **错误3：CORS Error**

**原因**：后端CORS配置不包含前端地址

**解决**：
编辑 `backend/app/config.py`：
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",  # ← 确保有这个
    ...
]
```

重启后端。

---

### **错误4：Connection Refused**

**原因**：后端未启动

**解决**：
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

---

### **错误5：Network Error**

**原因**：防火墙或代理阻止

**解决**：
1. 检查Windows防火墙设置
2. 如果使用代理，添加localhost到例外列表
3. 尝试禁用代理软件测试

---

## 📊 调试工具

### **浏览器Console命令**

```javascript
// 1. 检查登录状态
console.log('Token:', localStorage.getItem('access_token'));

// 2. 测试API连通性
fetch('http://localhost:8000/api/v1/quota/balance', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(res => res.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));

// 3. 检查当前页面URL
console.log('Current URL:', window.location.href);

// 4. 检查所有localStorage
console.log('All storage:', localStorage);
```

---

### **后端日志查看**

```bash
# Windows PowerShell
cd backend
Get-Content logs/app.log -Tail 50 -Wait

# 或者直接在启动终端查看实时日志
```

---

## 💡 预防措施

### **1. 添加Token检查**

在 `ProfessionalGenerationPage.tsx` 中添加：

```typescript
// 组件加载时检查登录状态
useEffect(() => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    message.warning('请先登录');
    // 可以跳转到登录页
    // window.location.href = '/admin/login';
  }
}, []);
```

---

### **2. 添加错误重试**

```typescript
const startGeneration = async () => {
  try {
    // ... 现有代码
  } catch (err: any) {
    if (err.message.includes('Failed to fetch')) {
      setError('网络连接失败，请检查后端服务是否启动');
      // 可以提供重试按钮
    } else {
      setError('生成失败：' + err.message);
    }
  }
};
```

---

### **3. 添加健康检查**

```typescript
// 定期检查后端是否可用
useEffect(() => {
  const checkBackend = async () => {
    try {
      const res = await fetch('http://localhost:8000/health');
      if (!res.ok) {
        message.warning('后端服务异常');
      }
    } catch (err) {
      message.error('无法连接到后端服务');
    }
  };
  
  checkBackend();
}, []);
```

---

## 📞 获取帮助

如果以上步骤都无法解决问题，请提供以下信息：

1. **浏览器Console完整错误信息**
   ```
   截图或复制Console中的所有红色错误
   ```

2. **Network标签的请求详情**
   ```
   - 请求URL
   - 请求方法
   - 状态码
   - 响应内容
   ```

3. **后端日志**
   ```
   复制后端终端的最后20行日志
   ```

4. **登录状态**
   ```javascript
   console.log(localStorage.getItem('access_token'));
   ```

5. **服务状态**
   ```bash
   netstat -ano | findstr :8000
   netstat -ano | findstr :5173
   ```

---

## ✅ 验证修复

修复后，应该看到：

**后端日志**：
```
INFO: [EXPERIMENTAL] Hunyuan3D mode: mock
INFO: [EXPERIMENTAL] Mock mode: received image ...
INFO: [EXPERIMENTAL] Copied example GLB: ...
INFO: [EXPERIMENTAL] Mock generation completed: ...
```

**前端Console**：
```
[ProfessionalGeneration] Task submitted: hunyuan_cloud_xxx
[ProfessionalGeneration] Progress: 10%
[ProfessionalGeneration] Progress: 30%
...
[ProfessionalGeneration] Model generated successfully
[ModelPreview] Model loaded successfully
```

**右侧面板**：
- ✅ 显示3D模型
- ✅ 可以旋转、缩放
- ✅ "⬇️ 下载GLB"按钮可用

---

**大多数"Failed to fetch"错误都是因为未登录或后端未启动！** 🎯
