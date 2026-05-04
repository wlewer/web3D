@echo off
chcp 65001 >nul
REM ========================================
REM Web3D 平台完整启动脚本
REM 包含：Docker服务 + 后端API + 前端展示
REM ========================================

echo.
echo ========================================
echo   Web3D 平台启动程序
echo ========================================
echo.

REM 检查Docker是否运行
echo [1/5] 检查Docker环境...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker未运行或未安装
    echo 请先启动Docker Desktop
    pause
    exit /b 1
)
echo ✅ Docker已就绪

REM 启动Docker服务（PostgreSQL, Redis, MinIO）
echo.
echo [2/5] 启动Docker基础服务...
cd backend
docker compose up -d
if %errorlevel% neq 0 (
    echo ❌ Docker服务启动失败
    pause
    exit /b 1
)
echo ✅ Docker服务已启动
cd ..

REM 等待数据库就绪
echo ⏳ 等待数据库初始化...
timeout /t 5 /nobreak >nul

REM 检查后端虚拟环境
echo.
echo [3/5] 检查Python环境...
if not exist "backend\.venv312\Scripts\python.exe" (
    echo ⚠️  虚拟环境不存在，正在创建...
    cd backend
    python -m venv .venv312
    .venv312\Scripts\pip install -r requirements.txt
    cd ..
    echo ✅ 虚拟环境创建完成
) else (
    echo ✅ Python虚拟环境已存在
)

REM 启动后端服务
echo.
echo [4/5] 启动后端API服务...
start "Web3D Backend API" cmd /k "cd backend && .venv312\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ⏳ 等待后端启动...
timeout /t 3 /nobreak >nul

REM 检查前端node_modules
echo.
echo [5/5] 启动前端服务...
if not exist "src\web-frontend\node_modules" (
    echo ⚠️  前端依赖未安装，正在安装...
    cd src\web-frontend
    call npm install
    cd ..\..
    echo ✅ 前端依赖安装完成
)

REM 启动前端服务
start "Web3D Frontend" cmd /k "cd src\web-frontend && npm run dev"

echo.
echo ========================================
echo   🚀 Web3D 平台启动完成！
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
echo 📊 Docker服务状态：
echo   PostgreSQL: localhost:25432
echo   Redis:      localhost:26379
echo   MinIO:      http://localhost:9000 (控制台: http://localhost:9001)
echo.
echo 💡 提示：
echo   - 已打开2个命令行窗口（后端和前端）
echo   - 等待看到 "Uvicorn running on" 和 "Local:" 消息
echo   - 关闭窗口或按 Ctrl+C 可停止服务
echo   - 停止Docker服务: cd backend ^&^& docker compose down
echo.
echo ========================================
echo.

pause
