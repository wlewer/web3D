# 🎨 Web3D 3D Gaussian Splatting Demo 部署指南

## 📌 快速开始

### 方式1: GitHub Pages（推荐）⭐

项目已配置自动部署到GitHub Pages，每次推送到`main`分支时会自动构建和部署。

**访问地址**: `https://yourusername.github.io/web3D/demo.html`

#### 启用GitHub Pages步骤：

1. **进入仓库设置**
   - 访问: `https://github.com/yourusername/web3D/settings/pages`

2. **配置Source**
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `/ (root)`

3. **等待首次部署**
   - 推送代码后，GitHub Actions会自动构建
   - 查看Actions进度: `https://github.com/yourusername/web3D/actions`

4. **访问Demo**
   - 部署完成后，访问: `https://yourusername.github.io/web3D/demo.html`

---

### 方式2: Gitee Pages（国内用户）

适合国内用户快速访问，需要实名认证。

#### 部署步骤：

1. **同步代码到Gitee**
   ```bash
   git remote add gitee https://gitee.com/yourusername/web3D.git
   git push gitee main
   ```

2. **启用Gitee Pages**
   - 访问: `https://gitee.com/yourusername/web3D/pages`
   - 选择分支: `main`
   - 目录: `/src/web-frontend/dist`
   - 点击"启动"

3. **访问Demo**
   - 地址: `https://yourusername.gitee.io/web3D/demo.html`

---

### 方式3: 本地预览

在本地开发环境中预览Demo：

```bash
cd src/web-frontend
npm run build
npx serve dist
```

然后访问: `http://localhost:5000/demo.html`

---

## 🔧 自定义配置

### 修改Demo页面

编辑文件: `src/web-frontend/public/demo.html`

主要可修改内容：
- 标题和描述
- 模型列表
- 样式主题
- 技术栈标签

### 添加新模型

1. **将模型文件放入public目录**
   ```
   src/web-frontend/public/
   ├── demo.html
   ├── cat.spz          # 已有
   ├── dragon.splat     # 已有
   └── your-model.spz   # 新增
   ```

2. **在demo.html中添加按钮**
   ```html
   <button class="model-btn" data-model="your-model.spz">🎯 你的模型</button>
   ```

---

## 📊 README嵌入示例

在您的项目README.md中，可以这样展示：

### 方案1: 链接方式（最简单）

```markdown
## 🎮 在线演示

[👉 点击查看3D Demo](https://yourusername.github.io/web3D/demo.html)
```

### 方案2: Badge徽章

```markdown
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge&logo=three.js)](https://yourusername.github.io/web3D/demo.html)
```

### 方案3: GIF动图 + 链接

```markdown
## 🎮 在线演示

![Web3D Demo](docs/images/demo-preview.gif)

[🚀 体验完整交互效果](https://yourusername.github.io/web3D/demo.html)
```

### 方案4: 视频嵌入（YouTube/Bilibili）

录制Demo视频后嵌入：

```markdown
<div align="center">
  <a href="https://yourusername.github.io/web3D/demo.html">
    <img src="docs/images/video-thumbnail.png" alt="Web3D Demo Video">
  </a>
  <p><strong>👆 点击观看完整演示视频</strong></p>
</div>
```

---

## 🚀 高级用法

### 使用iframe嵌入到其他网站

虽然GitHub不支持直接在README中嵌入iframe，但可以在其他网站中使用：

```html
<iframe 
  src="https://yourusername.github.io/web3D/demo.html" 
  width="100%" 
  height="600"
  frameborder="0"
  allowfullscreen>
</iframe>
```

### 创建多个Demo页面

可以为不同功能创建独立的Demo页面：

```
src/web-frontend/public/
├── demo.html              # 主Demo
├── demo-splat.html        # SPZ模型专用
├── demo-glb.html          # GLB模型专用
└── demo-editor.html       # 编辑器Demo
```

---

## 📝 注意事项

### 模型文件大小限制

- GitHub Pages单个文件限制: **100MB**
- 建议压缩SPZ/SPLAT模型
- 大模型建议使用CDN托管

### CORS跨域问题

如果从外部网站加载模型，需要配置CORS：

```javascript
// 在Vite配置中添加
server: {
  headers: {
    'Access-Control-Allow-Origin': '*'
  }
}
```

### 性能优化建议

1. **模型压缩**
   - 使用Draco压缩GLB模型
   - 减少SPZ模型的点数

2. **懒加载**
   - 按需加载模型文件
   - 显示加载进度条

3. **缓存策略**
   - 利用浏览器缓存
   - 使用Service Worker

---

## 🐛 常见问题

### Q1: GitHub Pages部署失败？

**检查项**:
- ✅ `.github/workflows/deploy-demo.yml` 是否存在
- ✅ `package.json` 中的build脚本是否正确
- ✅ 查看Actions日志排查错误

### Q2: 模型加载失败？

**解决方案**:
1. 检查模型文件路径是否正确
2. 确认模型文件格式（.spz/.splat/.glb）
3. 查看浏览器控制台错误信息

### Q3: 国内访问速度慢？

**建议**:
- 使用Gitee Pages
- 或使用CDN加速（如jsDelivr）

---

## 📞 技术支持

如有问题，请提交Issue或联系：
- 📧 Email: your-email@example.com
- 💬 Discord: [加入社区](https://discord.gg/xxx)
- 📱 WeChat: 扫码加入交流群

---

## 🌟 开源协议

本项目采用 MIT 协议，欢迎贡献代码！

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/web3D&type=Date)](https://star-history.com/#yourusername/web3D&Date)
