@echo off
chcp 65001 >nul
echo ============================================================
echo Web3D Platform - CPU模式快速启动
echo ============================================================
echo.

echo [1/3] 激活虚拟环境...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ 虚拟环境激活失败
    pause
    exit /b 1
)
echo ✅ 虚拟环境已激活
echo.

echo [2/3] 启动后端服务 (端口 8000)...
start "Web3D Backend" cmd /k "cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
echo ✅ 后端服务已启动
echo.

echo [3/3] 启动前端服务 (端口 5173)...
start "Web3D Frontend" cmd /k "cd src\web-frontend && npm run dev"
timeout /t 3 /nobreak >nul
echo ✅ 前端服务已启动
echo.

echo ============================================================
echo 🚀 服务启动完成！
echo ============================================================
echo.
echo 📱 访问地址：
echo    前端首页: http://localhost:5173
echo    实验页面: http://localhost:5173/admin/experimental-3d.html
echo    后端API:  http://localhost:8000/docs
echo    健康检查: http://localhost:8000/health
echo.
echo ⚙️  当前配置：
echo    生成模式: CPU
echo    TripoSR模型: VAST-AI/TripoSR
echo    目标面数: 5000
echo.
echo 💡 提示：
echo    - 首次使用TripoSR CPU会下载模型（约2GB）
echo    - CPU模式下生成时间约2-5分钟
echo    - 按 Ctrl+C 可停止各个服务窗口
echo.
echo ============================================================
pause
