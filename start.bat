@echo off
REM Web3D 快速启动脚本 - Windows版本
REM Quick Start Script for Web3D - Windows Version

echo.
echo ========================================
echo   Web3D 项目快速启动
echo ========================================
echo.

REM 检查Python
echo [1/4] 检查Python环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python未安装或未添加到PATH
    echo 请安装Python 3.9+ : https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✅ Python已安装

REM 运行系统健康检查
echo.
echo [2/4] 运行系统健康检查...
cd backend
python check_system.py
cd ..

echo.
echo [3/4] 启动后端服务...
start "Web3D Backend" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"
echo ⏳ 等待后端启动...
timeout /t 5 /nobreak >nul

echo.
echo [4/4] 启动前端服务...
start "Web3D Frontend" cmd /k "cd src\web-frontend && npm run dev"

echo.
echo ========================================
echo   🚀 服务启动中...
echo ========================================
echo.
echo 访问地址:
echo   前端: http://localhost:5173
echo   后端: http://localhost:8000
echo   API文档: http://localhost:8000/docs
echo.
echo 提示:
echo   - 两个命令行窗口会自动打开
echo   - 等待看到 "Local:" 和 "Uvicorn running on" 消息
echo   - 按 Ctrl+C 可以停止服务
echo.
echo ========================================
echo.

pause
