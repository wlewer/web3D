@echo off
REM Web3D Backend - Windows 快速启动脚本
REM Quick start script for Windows

echo ========================================
echo   Web3D Backend 快速启动
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Python，请先安装Python 3.8+
    pause
    exit /b 1
)
echo [✓] Python已安装

REM 检查虚拟环境
if not exist "venv" (
    echo [提示] 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
echo [提示] 激活虚拟环境...
call venv\Scripts\activate.bat

REM 安装依赖
echo [提示] 检查并安装依赖...
pip install -r requirements.txt -q

REM 检查.env文件
if not exist ".env" (
    echo [提示] 复制环境变量配置文件...
    copy .env.example .env
    echo [警告] 请编辑 .env 文件配置数据库和Redis连接信息
    echo.
    pause
)

REM 检查Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未检测到Docker，请手动启动PostgreSQL和Redis
    echo [提示] 或者安装Docker Desktop后运行: docker-compose up -d
    echo.
) else (
    echo [提示] 启动数据库服务（Docker）...
    docker-compose up -d
    echo [提示] 等待数据库启动...
    timeout /t 5 /nobreak >nul
)

REM 启动后端服务
echo.
echo ========================================
echo   启动 FastAPI 服务器
echo ========================================
echo [提示] API文档: http://localhost:8000/docs
echo [提示] 登录页面: http://localhost:8000/login.html
echo [提示] 管理后台: http://localhost:8000/admin/dashboard.html
echo.
echo 按 Ctrl+C 停止服务器
echo.

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
