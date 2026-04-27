# 🚀 Web3D 快速开始指南

## ⚡ 30秒启动

### Windows用户
```bash
双击 start.bat
```

### Linux/Mac用户
```bash
chmod +x start.sh
./start.sh
```

---

## 🌐 访问地址

启动后自动打开浏览器，或手动访问：

- **前端**: http://localhost:5173
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs

---

## 🎯 快速测试AI生成功能

### 步骤1: 选择生成模型

点击左侧菜单：
- 🚀 **SF3D** - 极速高质量（推荐）
- ⚡ **TripoSR** - 超快原型
- 🔧 **InstantMesh** - 精细网格

### 步骤2: 上传图片

1. 点击上传区域
2. 选择一张图片（JPG/PNG）
3. 自动开始生成

### 步骤3: 查看结果

- 观察进度条动画
- 等待生成完成
- 在3D查看器中预览
- 下载GLB模型文件

---

## 📊 当前模式说明

### ✅ Mock模式（默认）

**特点**:
- 无需GPU
- UI完全可用
- 返回示例模型
- 适合开发和演示

**如何识别**:
生成结果会显示 "MOCK MODE" 警告

---

### 🎮 Real模式（需部署）

**特点**:
- 需要NVIDIA GPU
- 真实图片转3D
- 生成实际模型
- 适合生产环境

**如何启用**:
1. 准备GPU（RTX 3060+）
2. 安装PyTorch
3. 安装模型引擎（如TripoSR）
4. 重启服务

**详细步骤**: 查看 [AI模型部署指南.md](docs/03-技术文档/AI模型部署指南.md)

---

## 🔍 系统检查

运行健康检查：
```bash
cd backend
python check_system.py
```

会显示：
- ✅ Python版本
- ✅ GPU状态
- ✅ 已安装的引擎
- ✅ 配置状态
- ✅ 下一步建议

---

## 🛠️ 常见问题

### Q: 控制台有WebGL警告？
A: 已修复！如果还有，清除浏览器缓存（Ctrl+Shift+Delete）

### Q: 生成页面显示错误？
A: 确认后端服务正在运行（端口8000）

### Q: 3D模型不显示？
A: 
1. 按F12打开开发者工具
2. 检查Console是否有错误
3. 检查Network标签中模型是否加载成功

### Q: 如何停止服务？
A: 在命令行窗口按 Ctrl+C

### Q: 如何切换到真实生成？
A: 
1. 查看 [AI模型部署指南.md](docs/03-技术文档/AI模型部署指南.md)
2. 准备GPU环境
3. 安装模型引擎
4. 重启服务

---

## 📚 重要文档

| 文档 | 用途 |
|------|------|
| [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md) | 本次更新总结 |
| [AI_GENERATION_COMPLETE.md](AI_GENERATION_COMPLETE.md) | AI生成功能报告 |
| [docs/03-技术文档/AI模型部署指南.md](docs/03-技术文档/AI模型部署指南.md) | 部署教程 |
| [docs/03-技术文档/Spark编辑器使用指南.md](docs/03-技术文档/Spark编辑器使用指南.md) | 编辑器使用 |

---

## 💡 提示

- **开发时**: 使用Mock模式即可，无需GPU
- **演示时**: Mock模式完全够用，UI流程完整
- **生产时**: 部署Real模式获得真实效果
- **调试时**: 查看 `backend/logs/app.log`

---

## 🆘 获取帮助

1. 运行 `python backend/check_system.py` 诊断
2. 查看相关文档
3. 检查后端日志
4. 提交GitHub Issue

---

**最后更新**: 2026-04-18  
**版本**: v2.1.0
