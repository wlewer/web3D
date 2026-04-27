@echo off
chcp 65001 >nul
echo ========================================
echo   Web3D - Hunyuan3D AI 生成服务演示
echo ========================================
echo.

echo [1/3] 检查环境变量配置...
if not exist ".env" (
    echo 警告: .env 文件不存在，将使用默认配置（Mock模式）
    echo 提示: 复制 .env.example 为 .env 可自定义配置
) else (
    echo ✓ 环境变量配置文件已找到
)
echo.

echo [2/3] 启动后端服务 (端口 8000)...
start "Web3D Backend" cmd /k "cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
echo ✓ 后端服务已启动
echo.

echo [3/3] 启动前端服务 (端口 5173)...
start "Web3D Frontend" cmd /k "cd src\web-frontend && npm run dev"
timeout /t 3 /nobreak >nul
echo ✓ 前端服务已启动
echo.

echo ========================================
echo   启动完成！
echo ========================================
echo.
echo 📱 访问地址:
echo    • 本地访问: http://localhost:5173
echo    • 局域网访问: http://[你的IP]:5173
echo.
echo 🔧 当前运行模式: Mock（演示模式）
echo    • 上传图片后 5 秒模拟生成完成
echo    • 用于技术验证和手机端测试
echo.
echo 📖 切换到真实生成模式:
echo    1. 编辑 backend\.env 文件
echo    2. 设置 HUNYUAN3D_MODE=local 或 cloud
echo    3. 重启后端服务
echo.
echo 📚 详细文档: docs\03-技术文档\Hunyuan3D集成方案.md
echo.
echo 按任意键关闭此窗口...
pause >nul
