# Web3D Backend - Docker镜像（多阶段构建）
# Stage 1: builder - 安装依赖
FROM python:3.12-slim AS builder

WORKDIR /build

# 安装系统依赖（编译所需）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt \
    && pip install --no-cache-dir --prefix=/install asyncpg aiosqlite

# Stage 2: runtime - 最小化运行时镜像
FROM python:3.12-slim

WORKDIR /app

# 仅安装运行时系统依赖（如curl用于healthcheck）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 从builder阶段复制已安装的Python依赖
COPY --from=builder /install /usr/local

# 创建非root用户
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# 复制应用代码
COPY app/ ./app/
COPY config.py .
COPY database.py .
COPY dependencies.py .
COPY static/ ./static/

# 创建必要的目录并设置权限
RUN mkdir -p /app/uploads /app/cache \
    && chown -R appuser:appgroup /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
