# 🚀 Web3D Demo 快速开始指南

## ⚡ 5分钟快速体验

### 方式1: 本地预览（推荐用于开发）

**Windows 用户**:
```bash
# 双击运行
部署Demo.bat
```

**Mac/Linux 用户**:
```bash
cd src/web-frontend
npm install
npm run build
npx serve dist -p 5000
```

然后访问: **http://localhost:5000/demo.html**

---

### 方式2: GitHub Pages（在线访问）

🔗 **访问地址**: `https://kk357924266.gitee.io/web3D/demo.html`

> 💡 **提示**: Gitee Pages 需要手动启用，请按照以下步骤操作

---

## 📋 Gitee Pages 启用步骤

### 第1步: 进入 Pages 设置
访问: https://gitee.com/kk357924266/web3D/pages

### 第2步: 配置部署
- **分支**: `master`
- **目录**: `/src/web-frontend/dist`
- **强制 HTTPS**: ✅ 勾选
- 点击 **"启动"** 按钮

### 第3步: 等待部署
- 首次部署约需 2-5 分钟
- 查看部署状态在 Pages 页面

### 第4步: 访问 Demo
部署完成后访问:
```
https://kk357924266.gitee.io/web3D/demo.html
```

---

## 🎯 Demo 功能说明

### 支持的模型格式
- ✅ **SPZ** - 3D Gaussian Splatting 格式
- ✅ **SPLAT** - 高斯泼溅点云格式
- ✅ **GLB/GLTF** - 标准 3D 模型格式

### 交互操作
| 操作 | 鼠标/触摸 |
|:---|:---|
| **旋转** | 左键拖拽 |
| **平移** | 右键拖拽 |
| **缩放** | 滚轮 / 双指捏合 |
| **重置视角** | 双击画布 |

### 模型切换
点击底部按钮可切换不同模型：
- 🐱 猫咪模型 (cat.spz)
- 🐉 龙模型 (dragon.splat)
- 🦋 蝴蝶模型 (butterfly.splat)

---

## 🔧 自定义配置

### 添加新模型

1. **将模型文件放入 public 目录**
   ```bash
   cp your-model.spz src/web-frontend/public/
   ```

2. **编辑 demo.html，添加按钮**
   ```html
   <button class="model-btn" data-model="your-model.spz">
     🎯 你的模型名称
   </button>
   ```

3. **重新构建并部署**
   ```bash
   npm run build
   git add .
   git commit -m "add new model"
   git push
   ```

### 修改样式主题

编辑 `demo.html` 中的 CSS：

```css
/* 修改背景渐变 */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 修改主色调 */
.model-btn {
  border-color: #667eea;
  color: #667eea;
}
```

---

## 📊 性能优化建议

### 模型文件大小
- **推荐**: < 50MB
- **最大**: 100MB (Gitee Pages 限制)
- **优化**: 使用 Draco 压缩 GLB 模型

### 加载速度
- 使用 CDN 加速模型文件
- 启用浏览器缓存
- 考虑使用渐进式加载

---

## 🐛 常见问题

### Q1: 模型加载失败？

**检查项**:
1. 模型文件是否在 `public` 目录
2. 文件名是否正确（区分大小写）
3. 浏览器控制台是否有错误

**解决方案**:
```javascript
// F12 打开控制台，查看错误信息
console.log('模型路径:', modelUrl);
```

### Q2: Gitee Pages 访问 404？

**原因**: 
- 未启用 Gitee Pages
- 部署路径配置错误

**解决**:
1. 确认 Pages 已启动
2. 检查目录设置为 `/src/web-frontend/dist`
3. 等待 2-5 分钟让部署生效

### Q3: 移动端显示异常？

**解决**:
- 确保 viewport meta 标签存在
- 测试不同屏幕尺寸
- 调整 canvas 高度

---

## 📞 获取帮助

### 文档
- [完整部署指南](DEMO_DEPLOYMENT_GUIDE.md)
- [README 嵌入指南](README_EMBED_GUIDE.md)
- [项目总结](DEMO_SUMMARY.md)

### 联系方式
- 📧 Email: kk357924266@example.com
- 💬 Gitee Issues: https://gitee.com/kk357924266/web3D/issues

---

## 🎉 开始体验！

现在您可以：
1. ✅ 本地预览 Demo
2. ✅ 部署到 Gitee Pages
3. ✅ 分享给朋友和同事
4. ✅ 收集反馈并优化

**祝您使用愉快！** 🚀
