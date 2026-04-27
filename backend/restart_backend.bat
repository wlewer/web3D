@echo off
chcp 65001 >nul
echo ========================================
echo 重启后端服务（应用新配置）
echo ========================================
echo.

echo [步骤1] 查找并停止旧的后端进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 正在停止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo ✅ 旧进程已停止
echo.

echo [步骤2] 等待3秒...
timeout /t 3 /nobreak >nul
echo.

echo [步骤3] 启动新的后端服务...
echo 提示：新窗口将打开，请勿关闭
start "Web3D Backend (Cloud Mode)" cmd /k "cd /d %~dp0 && python -m uvicorn app.main:app --reload --port 8000"
echo.

echo [步骤4] 等待后端启动...
timeout /t 5 /nobreak >nul
echo.

echo [步骤5] 测试额度API...
curl -s http://localhost:8000/health
echo.
echo.

echo ========================================
echo ✅ 后端服务已重启！
echo ========================================
echo.
echo 📋 下一步操作：
echo   1. 按 F5 刷新浏览器
echo   2. 重新登录（如果token过期）
echo   3. 检查额度显示（应该显示200积分）
echo   4. 测试3D生成功能
echo.
echo 💡 提示：
echo   - 后端运行在新打开的终端窗口中
echo   - 模式：Cloud（调用真实腾讯API）
echo   - 每次生成消耗：10积分（标准版）
echo   - 剩余可用：约20次
echo.
pause
