@echo off
REM 创建虚拟环境
"D:\Program Files\Python-3.12.13\python.exe" -m venv ..\.venv

if %errorlevel% equ 0 (
    echo 虚拟环境创建成功
    REM 安装依赖
    ..\.venv\Scripts\pip install -r requirements.txt
    
    if %errorlevel% equ 0 (
        echo 依赖安装完成
        echo.
        echo 启动后端服务...
        ..\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ) else (
        echo 依赖安装失败
        pause
    )
) else (
    echo 虚拟环境创建失败
    pause
)
