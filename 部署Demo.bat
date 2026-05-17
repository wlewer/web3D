@echo off
chcp 65001 >nul
echo ========================================
echo   Web3D Demo 快速部署脚本
echo ========================================
echo.

cd /d "%~dp0src\web-frontend"

echo [1/3] 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成
echo.

echo [2/3] 构建项目...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 构建完成
echo.

echo [3/3] 启动本地服务器...
echo.
echo 🌐 Demo 地址: http://localhost:5000/demo.html
echo 💡 按 Ctrl+C 停止服务器
echo.

npx serve dist -p 5000

pause
