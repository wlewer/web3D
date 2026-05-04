@echo off
chcp 65001 >nul
REM ========================================
REM Web3D 平台本地开发启动脚本
REM 仅包含：后端API + 前端展示（无Docker）
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Web3D 本地开发环境启动
echo ========================================
echo.

REM ─── 第一步：Python 自动探测 ───
echo [1/3] 检查Python环境...
set PYTHON_CMD=

REM 尝试多个可能的 Python 路径
if exist "D:\Program Files\Python-3.12.13\python.exe" set PYTHON_CMD="D:\Program Files\Python-3.12.13\python.exe"
if exist "D:\Program Files\Python312\python.exe" set PYTHON_CMD="D:\Program Files\Python312\python.exe"
if exist "C:\Program Files\Python312\python.exe" set PYTHON_CMD="C:\Program Files\Python312\python.exe"

REM 如果硬编码路径都不存在，尝试从 PATH 寻找
if "%PYTHON_CMD%"=="" (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "delims=" %%a in ('where python') do (
            set PYTHON_CMD="%%a"
            goto :PYTHON_FOUND
        )
    )
)

:PATH_FALLBACK
if "%PYTHON_CMD%"=="" (
    where py >nul 2>&1
    if !errorlevel! equ 0 (
        set PYTHON_CMD=py -3
        echo ℹ️  使用 py launcher (自动选择 Python 3)
    )
)

:PYTHON_FOUND
if "%PYTHON_CMD%"=="" (
    echo ❌ 未找到 Python！请安装 Python 3.12
    echo    下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✅ Python: %PYTHON_CMD%

REM ─── 检查并创建虚拟环境 ───
if not exist "backend\.venv312\Scripts\python.exe" (
    echo ⚠️  虚拟环境不存在，正在创建...
    cd backend
    %PYTHON_CMD% -m venv .venv312
    if !errorlevel! neq 0 (
        echo ❌ 虚拟环境创建失败
        cd ..
        pause
        exit /b 1
    )
    echo ✅ 虚拟环境创建成功
    
    echo ⏳ 安装Python依赖（首次运行可能需要几分钟）...
    .venv312\Scripts\pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo ❌ 依赖安装失败
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo ✅ 依赖安装完成
) else (
    echo ✅ Python虚拟环境已存在
)

REM ─── 检查端口冲突 ───
echo.
echo ℹ️  检查端口是否可用...
netstat -ano 2>nul | findstr ":8000 " >nul 2>&1
if !errorlevel! equ 0 (
    echo ⚠️  端口 8000 已被占用！请关闭占用程序后重试。
    echo    使用: netstat -ano ^| findstr :8000
)
netstat -ano 2>nul | findstr ":5173 " >nul 2>&1
if !errorlevel! equ 0 (
    echo ⚠️  端口 5173 已被占用！请关闭占用程序后重试。
    echo    使用: netstat -ano ^| findstr :5173
)

REM ─── 启动后端服务 ───
echo.
echo [2/3] 启动后端API服务...
start "Web3D Backend API" cmd /k "cd /d %~dp0backend && .venv312\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ⏳ 等待后端启动...
timeout /t 3 /nobreak >nul

REM ─── 检查前端依赖 ───
echo.
echo [3/3] 启动前端服务...
if not exist "src\web-frontend\node_modules" (
    echo ⚠️  前端依赖未安装，正在安装...
    cd src\web-frontend
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ 前端依赖安装失败
        cd /d %~dp0
        pause
        exit /b 1
    )
    cd /d %~dp0
    echo ✅ 前端依赖安装完成
)

REM ─── 启动前端服务 ───
start "Web3D Frontend" cmd /k "cd /d %~dp0src\web-frontend && npm run dev"

echo.
echo ========================================
echo   🚀 Web3D 本地开发环境启动完成！
echo ========================================
echo.
echo 📍 访问地址：
echo   ┌─────────────────────────────────────┐
echo   │  前端展示: http://localhost:5173      │
echo   │  后台管理: http://localhost:5173/admin/login │
echo   │  后端API:  http://localhost:8000      │
echo   │  API文档:  http://localhost:8000/docs │
echo   └─────────────────────────────────────┘
echo.
echo 🔐 默认管理员账号：
echo   用户名: admin
echo   密码: Admin123456
echo.
echo 💡 提示：
echo   - 已打开2个命令行窗口（后端和前端）
echo   - 等待看到 "Uvicorn running on" 和 "Local:" 消息
echo   - 关闭窗口或按 Ctrl+C 可停止服务
echo   - 此模式不使用Docker，数据存储在SQLite
echo   - 生产环境请使用 Docker 部署
echo.
echo ========================================
echo.

pause
