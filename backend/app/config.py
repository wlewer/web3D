"""
Web3D Backend - 配置管理
Application configuration management
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """应用配置类"""
    
    # ==================== 应用配置 ====================
    APP_NAME: str = "Web3D Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # ==================== 服务器配置 ====================
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # ==================== 数据库配置 ====================
    # 开发环境使用SQLite（无需配置）
    DATABASE_URL: str = "sqlite+aiosqlite:///./web3d_test.db"
    # 生产环境使用PostgreSQL
    # DATABASE_URL: str = "postgresql://web3d_user:web3d_password_2025@localhost:5432/web3d"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # ==================== Redis配置 ====================
    # 开发环境禁用Redis（可选）
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False  # 开发环境禁用
    REDIS_MAX_CONNECTIONS: int = 50
    
    # ==================== JWT配置 ====================
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ==================== OAuth2配置 ====================
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    
    # ==================== MinIO配置 ====================
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET_MODELS: str = "web3d-models"
    MINIO_BUCKET_THUMBNAILS: str = "web3d-thumbnails"
    
    # ==================== Celery配置 ====================
    CELERY_BROKER_URL: str = "amqp://guest:guest@localhost:5672//"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    # ==================== 邮件配置 ====================
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@web3d.com"
    
    # ==================== CORS配置 ====================
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:8080"
    ]
    
    # ==================== 限流配置 ====================
    RATE_LIMIT_PER_HOUR_UNAUTHENTICATED: int = 100
    RATE_LIMIT_PER_HOUR_USER: int = 1000
    RATE_LIMIT_PER_HOUR_VIP: int = 5000
    
    # ==================== AI 3D生成配置 ====================
    # 生成模式: mock（模拟）| cpu（CPU推理）| gpu（GPU加速）
    GENERATION_MODE: str = "mock"
    
    # CPU模式配置
    CPU_DEVICE: str = "cpu"
    CPU_NUM_THREADS: int = 8
    CPU_BATCH_SIZE: int = 1
    CPU_PRECISION: str = "float32"
    
    # GPU模式配置
    CUDA_DEVICE: int = 0
    GPU_MEMORY_FRACTION: float = 0.8
    GPU_PRECISION: str = "float16"
    
    # TripoSR模型配置
    TRIPROSR_MODEL: str = "VAST-AI/TripoSR"
    TRIPROSR_TARGET_FACES: int = 5000  # CPU建议5000面，GPU可以10000+
    
    # 文件存储路径
    UPLOAD_DIR: str = "./uploads"
    GENERATION_OUTPUT_DIR: str = "./uploads/generation"
    MODEL_CACHE_DIR: str = "./cache/models"
    
    # ==================== 腾讯混元3D云端API配置 ====================
    # 运行模式：mock=模拟模式（开发测试），cloud=云端模式（生产环境）
    HUNYUAN3D_MODE: str = "mock"
    
    # 旧配置（已废弃，保留兼容）
    HUNYUAN3D_CLOUD_API_KEY: str = ""  # 腾讯云API密钥（旧版sk-格式，已不再使用）
    HUNYUAN3D_CLOUD_MODEL: str = "hy-3d-3.0"  # 默认模型版本（旧版）
    
    # 新配置（腾讯云标准API 3.0）
    HUNYUAN3D_SECRET_ID: str = ""  # 腾讯云SecretId
    HUNYUAN3D_SECRET_KEY: str = ""  # 腾讯云SecretKey
    HUNYUAN3D_API_VERSION: str = "rapid"  # API版本：rapid=标准版，pro=专业版
    HUNYUAN3D_ENDPOINT: str = "domestic"  # API站点：domestic=国内站，intl=国际站
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 允许 Ssettings 中未定义的额外字段（如 VERSION_*）
        protected_namespaces = ()  # 禁用受保护命名空间检查，避免 model_ 前缀警告


# 创建全局配置实例
settings = Settings()
