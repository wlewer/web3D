@echo off
chcp 65001 >nul
REM ========================================
REM Web3D 平台本地开发启动脚本（单终端模式）
REM 仅包含：后端API + 前端展示（无Docker）
REM ========================================

setlocal enabledelayedexpansion

set "ROOT=%~dp0"

echo.
echo ========================================
echo   Web3D 本地开发环境启动
echo ========================================
echo.

REM ─── 第一步：Python 自动探测 ───
echo [1/4] 检查Python环境...
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
cd /d "%ROOT%backend"
if not exist ".venv312\Scripts\python.exe" (
    echo ⚠️  虚拟环境不存在，正在创建...
    %PYTHON_CMD% -m venv .venv312
    if !errorlevel! neq 0 (
        echo ❌ 虚拟环境创建失败
        pause
        exit /b 1
    )
    echo ✅ 虚拟环境创建成功

    echo ⏳ 安装Python依赖（首次运行可能需要几分钟）...
    .venv312\Scripts\pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ Python虚拟环境已存在
)

REM ─── 检查端口并清理 ───
echo.
echo [2/4] 检查端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 "') do (
    echo ⚠️  端口 8000 被 PID %%a 占用，正在释放...
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 "') do (
    echo ⚠️  端口 5173 被 PID %%a 占用，正在释放...
    taskkill /f /pid %%a >nul 2>&1
)

REM ─── 启动后端（后台运行，输出到日志文件） ───
echo.
echo [3/4] 启动后端API服务...
cd /d "%ROOT%backend"
start /b "" .venv312\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "%ROOT%backend\uvicorn.log" 2>&1
echo ℹ️  后端日志: backend\uvicorn.log

REM 等待后端就绪（最多 10 秒）
set BACKEND_WAIT=0
:BACKEND_WAIT_LOOP
>nul 2>&1 timeout /t 1
set /a BACKEND_WAIT+=1
netstat -ano 2>nul | findstr ":8000 " >nul 2>&1
if !errorlevel! neq 0 (
    if !BACKEND_WAIT! lss 10 goto :BACKEND_WAIT_LOOP
    echo ⚠️  后端启动超过 10 秒，检查日志: backend\uvicorn.log
    echo    按任意键继续启动前端...
    pause >nul
)
echo ✅ 后端就绪

REM ─── 检查前端依赖 ───
echo.
echo [4/4] 启动前端服务...
cd /d "%ROOT%src\web-frontend"
if not exist "node_modules" (
    echo ⚠️  前端依赖未安装，正在安装...
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ 前端依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 前端依赖安装完成
)

REM ─── 启动前端（前台运行，Ctrl+C 停止后自动清理后端） ───
echo.
echo ========================================
echo   => Frontend: http://localhost:5173
echo   => Backend:  http://localhost:8000
echo   => Admin:    http://localhost:5173/admin/login
echo.
echo   => Account: admin / Admin123456
echo.
echo   => Press Ctrl+C to stop all services
echo ========================================
echo.

call npm run dev

REM ─── 前端停止后，清理后端 ───
echo.
echo 正在停止后端服务...
taskkill /f /fi "WINDOWTITLE eq *python*" >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
echo ✅ 所有服务已停止
echo.

pause
