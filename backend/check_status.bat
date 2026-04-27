@echo off
chcp 65001 >nul
echo ============================================================
echo Web3D平台 - 服务状态检查
echo ============================================================
echo.

echo [1/4] 检查Python环境...
python --version
if errorlevel 1 (
    echo ❌ Python未安装或未添加到PATH
    exit /b 1
)
echo ✅ Python环境正常
echo.

echo [2/4] 检查numpy-stl依赖...
python -c "import stl; print('✅ numpy-stl已安装')" 2>nul
if errorlevel 1 (
    echo ❌ numpy-stl未安装
    echo 请运行: pip install numpy-stl==3.0.0
    exit /b 1
)
echo.

echo [3/4] 检查后端服务...
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  后端服务未运行
    echo 请运行: cd backend ^&^& python -m uvicorn app.main:create_application --factory --host 0.0.0.0 --port 8000
) else (
    echo ✅ 后端服务运行中 (http://localhost:8000)
)
echo.

echo [4/4] 检查前端服务...
curl -s http://localhost:5173/ >nul 2>&1
if errorlevel 1 (
    echo ⚠️  前端服务未运行
    echo 请运行: cd src/web-frontend ^&^& npm run dev
) else (
    echo ✅ 前端服务运行中 (http://localhost:5173)
)
echo.

echo ============================================================
echo 访问地址
echo ============================================================
echo 前端界面: http://localhost:5173/admin/experimental/generation
echo 后端API:  http://localhost:8000
echo API文档:  http://localhost:8000/docs
echo.
echo ImageToSTL入口:
echo   1. 打开浏览器访问前端界面
echo   2. 找到第一个卡片 "🎨 ImageToSTL"
echo   3. 点击图片选中
echo   4. 上传图片即可使用
echo.
echo ============================================================
pause
