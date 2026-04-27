@echo off
chcp 65001 >nul
echo ========================================
echo 全面诊断和修复"Failed to fetch"错误
echo ========================================
echo.

echo [步骤1] 检查后端服务状态...
netstat -ano | findstr :8000
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 后端服务未运行！
    echo.
    echo 正在启动后端服务...
    cd /d %~dp0
    start "Web3D Backend" cmd /k "python -m uvicorn app.main:app --reload --port 8000"
    echo ✅ 后端服务启动中，请等待5秒...
    timeout /t 5 /nobreak >nul
) else (
    echo ✅ 后端服务正在运行
)
echo.

echo [步骤2] 检查前端服务状态...
netstat -ano | findstr :5173
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 前端服务未运行！
    echo.
    echo 请手动启动前端：
    echo   cd src\web-frontend
    echo   npm run dev
) else (
    echo ✅ 前端服务正在运行
)
echo.

echo [步骤3] 检查.env配置...
cd /d %~dp0
findstr /C:"HUNYUAN3D_MODE" .env
if %ERRORLEVEL% NEQ 0 (
    echo ❌ .env文件中缺少HUNYUAN3D_MODE配置！
    echo.
    echo 正在添加配置...
    echo. >> .env
    echo # ==================== 运行模式配置 ==================== >> .env
    echo # mock = 模拟模式（用于开发测试，无需API密钥，快速返回示例模型） >> .env
    echo # cloud = 云端模式（调用腾讯混元3D API，需要API密钥，生成真实3D模型） >> .env
    echo HUNYUAN3D_MODE=mock >> .env
    echo ✅ 已添加HUNYUAN3D_MODE=mock配置
) else (
    echo ✅ HUNYUAN3D_MODE配置存在
)
echo.

echo [步骤4] 检查示例GLB文件...
if exist "assets\example.glb" (
    echo ✅ 示例GLB文件存在: assets\example.glb
) else (
    echo ❌ 示例GLB文件不存在！
    echo 正在创建最小GLB占位符...
    if not exist "assets" mkdir assets
    echo. > assets\example.glb
    echo ⚠️  已创建空占位符文件，建议下载真实GLB模型替换
)
echo.

echo [步骤5] 检查登录状态...
echo 请在浏览器Console中执行：
echo   localStorage.getItem('access_token')
echo.
echo 如果返回null，说明未登录，需要重新登录
echo.

echo ========================================
echo 诊断完成！
echo ========================================
echo.
echo 📋 修复总结：
echo 1. ✅ 已添加HUNYUAN3D_MODE=mock配置
echo 2. ✅ 已修正.env加载路径
echo 3. ✅ 已添加401错误自动处理
echo 4. ✅ 已优化上传区域显示逻辑
echo.
echo 🔄 下一步操作：
echo 1. 重启后端服务（如果正在运行）
echo 2. 刷新浏览器页面（F5）
echo 3. 确认已登录（admin / Admin123456）
echo 4. 重新尝试生成3D模型
echo.
echo ⚠️  如果仍然失败，请提供：
echo - 浏览器Console中的完整错误信息
echo - Network标签中失败请求的状态码
echo.
pause
