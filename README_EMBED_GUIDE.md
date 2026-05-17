# 📖 README 嵌入 3D Demo 完整指南

## 🎯 目标

在 GitHub/Gitee 仓库的 README.md 中展示 Web3D 项目的 3D 模型效果，让用户无需克隆代码即可在线体验。

---

## 📊 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|:---|:---|:---|:---|
| **GitHub Pages** ⭐ | 免费、自动部署、自定义域名 | 需要配置 Actions | 大多数项目 |
| **Gitee Pages** | 国内访问快、中文支持好 | 需实名认证 | 国内用户为主 |
| **StackBlitz** | 在线编辑、实时预览 | 加载较慢 | 教学演示 |
| **CodeSandbox** | 功能强大、社区活跃 | 免费版有限制 | 复杂示例 |
| **iframe 嵌入** | 直接展示 | GitHub不支持 | 个人网站/博客 |

---

## ✅ 推荐方案：GitHub Pages + README 链接

### 步骤1: 准备 Demo 页面

已完成！项目中已包含：
- ✅ `src/web-frontend/public/demo.html` - 独立 Demo 页面
- ✅ `.github/workflows/deploy-demo.yml` - 自动部署配置

### 步骤2: 启用 GitHub Pages

1. **进入仓库设置**
   ```
   https://github.com/yourusername/web3D/settings/pages
   ```

2. **配置 Source**
   - Source: **Deploy from a branch**
   - Branch: `gh-pages` / `/ (root)`
   - 点击 **Save**

3. **等待首次部署**
   - 推送代码到 `main` 分支
   - 查看 Actions: `https://github.com/yourusername/web3D/actions`
   - 等待构建完成（约2-5分钟）

4. **获取访问地址**
   ```
   https://yourusername.github.io/web3D/demo.html
   ```

### 步骤3: 更新 README.md

#### 方式A: 简单链接（最简单）

```markdown
## 🎮 在线演示

[👉 点击查看 3D Demo](https://yourusername.github.io/web3D/demo.html)
```

**效果**: 
```
## 🎮 在线演示

👉 点击查看 3D Demo
```

---

#### 方式B: Badge 徽章（美观）

```markdown
## 🎮 在线演示

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge&logo=three.js)](https://yourusername.github.io/web3D/demo.html)
```

**效果**: 
显示一个蓝色徽章，点击跳转到 Demo

---

#### 方式C: GIF 动图 + 链接（最吸引人）⭐

**步骤**:
1. 录制 Demo 操作视频（使用 OBS/ScreenToGif）
2. 转换为 GIF（建议尺寸: 800x600, < 5MB）
3. 上传到 `docs/images/demo-preview.gif`
4. 在 README 中添加：

```markdown
## 🎮 在线演示

![Web3D Demo](docs/images/demo-preview.gif)

[🚀 体验完整交互效果](https://yourusername.github.io/web3D/demo.html)
```

**效果**: 
- 显示 GIF 动图预览
- 下方有链接可跳转完整 Demo

---

#### 方式D: 截图 + 链接（轻量级）

```markdown
## 🎮 在线演示

<div align="center">
  <img src="docs/images/demo-screenshot.png" alt="Web3D Demo" width="800"/>
  <br/>
  <a href="https://yourusername.github.io/web3D/demo.html"><strong>👉 点击体验</strong></a>
</div>
```

**效果**: 
- 居中的截图
- 下方有醒目的体验链接

---

#### 方式E: 视频嵌入（YouTube/Bilibili）

**YouTube**:
```markdown
<div align="center">
  <a href="https://yourusername.github.io/web3D/demo.html">
    <img src="https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg" alt="Web3D Demo Video" width="800"/>
  </a>
  <p><strong>👆 点击观看演示视频</strong></p>
</div>
```

**Bilibili**:
```markdown
<div align="center">
  <a href="https://yourusername.github.io/web3D/demo.html">
    <img src="docs/images/bilibili-thumbnail.png" alt="Web3D Demo Video" width="800"/>
  </a>
  <p><strong>👆 B站观看演示视频</strong></p>
</div>
```

---

## 🎨 高级技巧

### 1. 添加特性列表

```markdown
## 🎮 在线演示

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://yourusername.github.io/web3D/demo.html)

**Demo 特性**:
- ✅ 纯前端实现，无需后端
- ✅ 支持 SPZ / SPLAT / GLB 多格式
- ✅ 智能居中算法，自动适配相机
- ✅ 响应式设计，支持移动端
- ✅ 实时模型切换，流畅交互
```

---

### 2. 添加技术栈徽章

```markdown
## 🎮 在线演示

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://yourusername.github.io/web3D/demo.html)

**技术栈**:
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.180-000000?logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
```

---

### 3. 添加 Star 历史图表

```markdown
## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/web3D&type=Date)](https://star-history.com/#yourusername/web3D&Date)
```

---

### 4. 完整的 README 头部示例

```markdown
# Web3D - 3D Gaussian Splatting Platform

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://yourusername.github.io/web3D/demo.html)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/yourusername/web3D?style=flat-square)](https://github.com/yourusername/web3D/stargazers)

![Web3D Demo](docs/images/demo-preview.gif)

**基于 Three.js + Spark Renderer 的高性能 3D 渲染引擎**

[快速开始](#-快速开始) · [在线演示](https://yourusername.github.io/web3D/demo.html) · [文档](docs/) · [贡献指南](CONTRIBUTING.md)

</div>
```

---

## 🚫 常见误区

### ❌ 错误做法

1. **直接在 README 中嵌入 iframe**
   ```html
   <!-- GitHub 不支持！ -->
   <iframe src="https://yourusername.github.io/web3D/demo.html"></iframe>
   ```

2. **使用绝对路径引用本地图片**
   ```markdown
   <!-- 错误：其他人看不到 -->
   ![Demo](C:/Users/xxx/project/docs/demo.png)
   
   <!-- 正确：使用相对路径 -->
   ![Demo](docs/images/demo.png)
   ```

3. **忘记替换占位符**
   ```markdown
   <!-- 错误：还是占位符 -->
   [Demo](https://yourusername.github.io/web3D/demo.html)
   
   <!-- 正确：替换为实际用户名 -->
   [Demo](https://boston.github.io/web3D/demo.html)
   ```

---

## 📝 最佳实践清单

- [ ] Demo 页面已创建 (`public/demo.html`)
- [ ] GitHub Actions 配置完成 (`.github/workflows/deploy-demo.yml`)
- [ ] GitHub Pages 已启用
- [ ] README.md 已添加 Demo 链接
- [ ] 已测试链接可正常访问
- [ ] 已添加特性说明和技术栈
- [ ] （可选）已录制 GIF/视频
- [ ] （可选）已添加 Star 历史图表

---

## 🔧 故障排查

### Q1: GitHub Pages 部署失败？

**检查项**:
```bash
# 1. 查看 Actions 日志
https://github.com/yourusername/web3D/actions

# 2. 确认 workflow 文件存在
ls .github/workflows/deploy-demo.yml

# 3. 手动触发部署
git commit --allow-empty -m "trigger deploy"
git push
```

### Q2: Demo 页面 404？

**解决方案**:
```bash
# 1. 确认 demo.html 在 public 目录
ls src/web-frontend/public/demo.html

# 2. 重新构建
cd src/web-frontend
npm run build

# 3. 检查 dist 目录
ls dist/demo.html
```

### Q3: 模型加载失败？

**检查浏览器控制台**:
```javascript
// F12 打开控制台，查看错误信息
// 常见原因：
// - 模型文件路径错误
// - CORS 跨域问题
// - 文件格式不支持
```

---

## 📞 需要帮助？

- 📖 查看完整部署文档: [DEMO_DEPLOYMENT_GUIDE.md](DEMO_DEPLOYMENT_GUIDE.md)
- 💬 提交 Issue: [GitHub Issues](https://github.com/yourusername/web3D/issues)
- 📧 联系作者: your-email@example.com

---

## 🎉 完成！

现在您的 README 已经可以展示 3D Demo 了！

**下一步**:
1. 推送到 GitHub
2. 等待自动部署
3. 分享链接给朋友们 🚀
