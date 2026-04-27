#!/bin/bash
# Web3D 快速启动脚本 - Linux/Mac版本
# Quick Start Script for Web3D - Linux/Mac Version

echo ""
echo "========================================"
echo "  Web3D 项目快速启动"
echo "========================================"
echo ""

# 检查Python
echo "[1/4] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3未安装"
    echo "请安装Python 3.9+ : https://www.python.org/downloads/"
    exit 1
fi
echo "✅ Python已安装: $(python3 --version)"

# 运行系统健康检查
echo ""
echo "[2/4] 运行系统健康检查..."
cd backend
python3 check_system.py
cd ..

echo ""
echo "[3/4] 启动后端服务..."
gnome-terminal -- bash -c "cd backend && uvicorn app.main:app --reload --port 8000; exec bash" 2>/dev/null || \
xterm -e "cd backend && uvicorn app.main:app --reload --port 8000" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"'/backend && uvicorn app.main:app --reload --port 8000"' 2>/dev/null || \
echo "⚠️  无法自动打开终端，请手动运行: cd backend && uvicorn app.main:app --reload --port 8000"

echo "⏳ 等待后端启动..."
sleep 5

echo ""
echo "[4/4] 启动前端服务..."
gnome-terminal -- bash -c "cd src/web-frontend && npm run dev; exec bash" 2>/dev/null || \
xterm -e "cd src/web-frontend && npm run dev" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"'/src/web-frontend && npm run dev"' 2>/dev/null || \
echo "⚠️  无法自动打开终端，请手动运行: cd src/web-frontend && npm run dev"

echo ""
echo "========================================"
echo "  🚀 服务启动中..."
echo "========================================"
echo ""
echo "访问地址:"
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:8000"
echo "  API文档: http://localhost:8000/docs"
echo ""
echo "提示:"
echo "  - 两个终端窗口会自动打开（如果支持）"
echo "  - 等待看到 'Local:' 和 'Uvicorn running on' 消息"
echo "  - 按 Ctrl+C 可以停止服务"
echo ""
echo "========================================"
echo ""

read -p "按回车键继续..."
