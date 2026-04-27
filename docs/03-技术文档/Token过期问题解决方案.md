# Token过期问题解决方案

> **问题**：401 Unauthorized - Token expired or invalid  
> **更新时间**：2026-04-18

---

## 🚨 问题现象

浏览器Console显示：
```
GET http://localhost:8000/api/v1/quota/balance 401 (Unauthorized)
Token expired or invalid, user needs to login
```

前端页面显示：
```
生成失败：Failed to fetch
```

---

## ✅ 立即解决

### **方法1：手动清除并重新登录（推荐）**

#### **步骤1：清除旧Token**

打开浏览器Console（F12），输入：
```javascript
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
console.log('Tokens cleared');
```

#### **步骤2：重新登录**

1. 访问：http://localhost:5173/admin
2. 输入用户名：`admin`
3. 输入密码：`Admin123456`
4. 点击登录

#### **步骤3：验证**

登录后，在Console中输入：
```javascript
console.log('Token:', localStorage.getItem('access_token'));
// 应该输出一长串字符串
```

#### **步骤4：重新测试**

进入"3D大模型" → "专业版3D生成"，重新尝试生成。

---

### **方法2：使用改进后的自动处理（已实施）**

我已经改进了代码，现在当检测到401错误时：

1. ✅ 显示友好提示："登录已过期，请重新登录"
2. ✅ 自动清除无效token
3. ✅ 2秒后自动跳转到登录页
4. ✅ 停止当前的生成任务

**您只需要**：
- 看到提示后等待跳转
- 或手动刷新页面重新登录

---

## 🔍 为什么会出现这个问题？

### **常见原因**

| 原因 | 说明 | 频率 |
|------|------|------|
| **Token自然过期** | JWT token有有效期（通常几小时） | ⭐⭐⭐⭐⭐ |
| **后端重启** | 后端服务重启后，旧token失效 | ⭐⭐⭐⭐ |
| **数据库重置** | 用户数据被重置，token失效 | ⭐⭐ |
| **长时间未使用** | 浏览器关闭后session过期 | ⭐⭐⭐ |
| **多设备登录** | 在其他地方登录，当前token失效 | ⭐ |

---

## 💡 预防措施

### **1. 定期检查Token状态**

在应用中添加token检查：
```javascript
// 每次页面加载时检查
useEffect(() => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    message.warning('请先登录');
    window.location.href = '/admin/login';
  }
}, []);
```

### **2. 实现Token刷新机制**

使用refresh token自动续期：
```javascript
// 当access_token即将过期时
if (tokenExpiryTime - Date.now() < 5 * 60 * 1000) { // 5分钟内
  refreshToken();
}
```

### **3. 延长Token有效期**

修改后端配置（如果安全允许）：
```python
# backend/app/config.py
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24小时
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30天
```

---

## 🛠️ 技术细节

### **JWT Token工作原理**

```
用户登录
  ↓
后端生成JWT Token
  ↓
返回给前端
  ↓
前端存储在localStorage
  ↓
每次API请求携带Token
  ↓
后端验证Token
  ↓
有效 → 返回数据
无效 → 返回401
```

### **Token结构**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
↑ Header           ↑ Payload（包含过期时间）        ↑ Signature
```

### **401错误处理流程**

```
前端发起请求
  ↓
后端返回401
  ↓
前端检测到401
  ↓
显示提示信息
  ↓
清除本地token
  ↓
跳转到登录页
  ↓
用户重新登录
  ↓
获取新token
  ↓
继续操作
```

---

## 📊 改进内容

### **之前的行为**

```typescript
// 静默处理，使用默认额度
if (response.status === 401) {
  console.warn('Token expired');
  setTotalQuota(200);
  setUsedQuota(0);
  return;
}
```

**问题**：
- ❌ 用户不知道token已过期
- ❌ 继续使用默认值，可能产生误导
- ❌ 后续API调用仍会失败

---

### **现在的行为**

```typescript
// 友好提示 + 自动跳转
if (response.status === 401) {
  message.warning('登录已过期，请重新登录');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  setTimeout(() => {
    window.location.href = '/admin/login';
  }, 2000);
  return;
}
```

**优势**：
- ✅ 明确告知用户问题
- ✅ 自动清理无效数据
- ✅ 引导用户重新登录
- ✅ 避免后续错误

---

## 🎯 最佳实践

### **1. 登录状态管理**

```typescript
// 创建认证上下文
const AuthContext = createContext<{
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}>(null);

// 全局监听认证状态
function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('access_token')
  );
  
  const login = (token: string) => {
    localStorage.setItem('access_token', token);
    setIsAuthenticated(true);
  };
  
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
  };
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### **2. API拦截器**

```typescript
// axios拦截器自动处理401
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      message.warning('登录已过期，请重新登录');
      localStorage.removeItem('access_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);
```

### **3. Token刷新**

```typescript
// 后台自动刷新token
useEffect(() => {
  const refreshInterval = setInterval(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
      } catch (err) {
        // 刷新失败，需要重新登录
        logout();
      }
    }
  }, 15 * 60 * 1000); // 每15分钟刷新
  
  return () => clearInterval(refreshInterval);
}, []);
```

---

## ❓ 常见问题

### **Q1: Token有效期是多久？**

**A**: 取决于后端配置，通常是：
- Access Token: 15分钟 - 24小时
- Refresh Token: 7天 - 30天

查看后端配置：
```python
# backend/app/config.py
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24小时
```

---

### **Q2: 如何知道Token是否即将过期？**

**A**: 解码JWT token查看exp字段：
```javascript
const token = localStorage.getItem('access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
const expiryDate = new Date(payload.exp * 1000);
console.log('Token expires at:', expiryDate);
```

---

### **Q3: 能否让Token永不过期？**

**A**: 技术上可以，但**不推荐**，因为：
- ❌ 安全风险高
- ❌ 无法强制用户重新认证
- ❌ 无法撤销访问权限

**建议**：使用合理的有效期 + refresh token机制

---

### **Q4: 为什么有时需要频繁登录？**

**A**: 可能原因：
1. Token有效期设置太短
2. 后端频繁重启
3. 数据库被重置
4. 浏览器清除了localStorage

**解决**：检查后端日志和配置

---

### **Q5: 多个标签页会共享Token吗？**

**A**: 是的，localStorage在所有标签页共享。但如果：
- 一个标签页登出
- 其他标签页的token仍有效，直到下次API调用

**建议**：使用Storage事件同步状态：
```javascript
window.addEventListener('storage', (e) => {
  if (e.key === 'access_token' && !e.newValue) {
    // 其他标签页已登出
    window.location.reload();
  }
});
```

---

## 📝 总结

### **核心要点**

1. ✅ **401错误 = Token过期**，需要重新登录
2. ✅ **已改进代码**，自动提示并跳转登录页
3. ✅ **定期清理**无效的token
4. ✅ **考虑实现**token自动刷新机制

### **下一步建议**

**短期**：
- 遇到401时重新登录即可
- 系统会自动提示和跳转

**中期**：
- 实现token自动刷新
- 添加全局认证状态管理

**长期**：
- 实现SSO单点登录
- 添加多因素认证
- 实现会话管理

---

**现在您只需要重新登录一次，问题就解决了！** 🎉
