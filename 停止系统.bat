@echo off
chcp 65001 >nul
REM ========================================
REM Web3D 平台停止脚本
REM 停止所有服务并清理资源
REM ========================================

echo.
echo ========================================
echo   Web3D 平台停止程序
echo ========================================
echo.

REM 询问是否停止Docker服务
echo 请选择要执行的操作：
echo   1. 仅停止后端和前端服务（保留Docker）
echo   2. 停止所有服务（包括Docker）
echo   3. 退出
echo.
set /p choice=请输入选项 (1/2/3): 

if "%choice%"=="3" exit /b
if "%choice%"=="" exit /b

REM 查找并关闭后端窗口
echo.
echo [1/2] 正在停止后端服务...
taskkill /FI "WINDOWTITLE eq Web3D Backend API*" /T /F >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务已停止
) else (
    echo ⚠️  后端服务未运行或已停止
)

REM 查找并关闭前端窗口
echo.
echo [2/2] 正在停止前端服务...
taskkill /FI "WINDOWTITLE eq Web3D Frontend*" /T /F >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 前端服务已停止
) else (
    echo ⚠️  前端服务未运行或已停止
)

REM 如果选择停止Docker
if "%choice%"=="2" (
    echo.
    echo [3/3] 正在停止Docker服务...
    cd backend
    docker compose down
    if %errorlevel% equ 0 (
        echo ✅ Docker服务已停止
    ) else (
        echo ❌ Docker服务停止失败
    )
    cd ..
)

echo.
echo ========================================
echo   ✅ Web3D 平台已停止
echo ========================================
echo.
echo 💡 提示：
echo   - 如需完全清理数据，可运行: docker compose down -v
echo   - 查看Docker容器状态: docker ps -a
echo   - 查看日志: docker logs web3d-backend
echo.

pause
