"""
Web3D Backend - 应用入口
FastAPI application entry point
"""
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
import os

from app.config import settings
from app.database import engine, Base
from app.api.v1 import auth, users, models, templates, generation, experimental, quota, website, tenants, model_pipeline, pages
from app.api.v1 import settings as settings_router
from app.core.redis_client import get_redis_manager
from app.core.task_store import RedisTaskStore, MemoryTaskStore, set_task_store
from app.core.rate_limiter import setup_rate_limiting
from app.core.tenant_middleware import TenantResolverMiddleware
from app.core.tenant_filter import install_tenant_filter


def create_application() -> FastAPI:
    """创建FastAPI应用实例"""
    
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Web3D Platform API - 3D模型生成与管理平台",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )
    
    # 先注册API路由（确保优先级高于静态文件）
    application.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
    application.include_router(users.router, prefix="/api/v1/users", tags=["用户"])
    application.include_router(models.router, prefix="/api/v1/models", tags=["3D模型"])
    application.include_router(templates.router, prefix="/api/v1/templates", tags=["模板"])
    application.include_router(generation.router, prefix="/api/v1", tags=["3D生成"])
    application.include_router(experimental.router, prefix="/api/v1", tags=["实验性功能"])
    application.include_router(quota.router, prefix="/api/v1", tags=["额度管理"])
    application.include_router(settings_router.router, prefix="/api/v1/settings", tags=["系统设置"])
    
    # 租户管理路由（仅平台管理员）
    application.include_router(tenants.router, prefix="/api/v1/tenants", tags=["租户管理"])
    
    # 模型优化管线路由
    application.include_router(model_pipeline.router, prefix="/api/v1/models", tags=["模型优化"])

    # 页面搭建器路由
    application.include_router(pages.router, prefix="/api/v1/pages", tags=["页面搭建器"])
    
    # 官网模板系统路由
    application.include_router(website.nav_router, prefix="/api/v1")
    application.include_router(website.template_router, prefix="/api/v1")
    application.include_router(website.component_router, prefix="/api/v1")
    application.include_router(website.public_router, prefix="/api/v1")
    
    # 健康检查端点
    @application.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT
        }
    
    # 根路径：显示服务信息并链接到文档
    @application.get("/")
    async def root():
        """
        根路径：返回Web3D Platform API服务信息
        访问 http://localhost:8000/docs 查看完整API文档
        """
        return {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "environment": settings.ENVIRONMENT,
            "docs": "/docs",
            "health": "/health",
            "admin_frontend": "http://localhost:5173/admin/login",
            "message": "Web3D Platform API 服务正常运行中。请访问 /docs 查看API文档，或访问前端管理后台。"
        }
    
    # 根路径重定向到登录页
    @application.get("/login.html")
    async def redirect_to_login():
        return RedirectResponse(url="/app/login.html")
    
    # 管理后台根路径重定向
    @application.get("/admin")
    async def redirect_to_admin():
        return RedirectResponse(url="/app/login.html")
    
    # 配置CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 配置租户解析中间件（在CORS之后、限流之前）
    application.add_middleware(TenantResolverMiddleware)
    
    # 配置限流中间件
    setup_rate_limiting(application)
    
    # 最后挂载静态文件到子路径（避免拦截API）
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    if os.path.exists(static_dir):
        application.mount("/app", StaticFiles(directory=static_dir, html=True), name="static")
        logger.info(f"Static files mounted from: {static_dir}")
    else:
        # Docker 容器内路径
        static_dir_docker = "/app/static"
        if os.path.exists(static_dir_docker):
            application.mount("/app", StaticFiles(directory=static_dir_docker, html=True), name="static")
            logger.info(f"Static files mounted from: {static_dir_docker}")
        else:
            logger.warning(f"Static directory not found")
    
    # 挂载生成模型的静态文件目录（用于浏览器直接访问自动保存的生成模型）
    gen_models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "generation")
    gen_models_dir_abs = os.path.abspath(gen_models_dir)
    if os.path.exists(gen_models_dir_abs):
        application.mount("/generation-models", StaticFiles(directory=gen_models_dir_abs), name="generation-models")
        logger.info(f"Generation models mounted from: {gen_models_dir_abs}")
    else:
        logger.warning(f"Generation models directory not found: {gen_models_dir_abs}")


    # ========== 挂载根目录 models/ 静态文件 ==========
    # 前端画廊页面可以直接访问 /static-models/ 获取模型文件
    # 需同时配置 Vite proxy 代理 /static-models -> http://localhost:8000/static-models
    models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "models")
    models_dir_abs = os.path.abspath(models_dir)
    if os.path.exists(models_dir_abs):
        application.mount("/static-models", StaticFiles(directory=models_dir_abs), name="static-models")
        logger.info(f"Static models mounted from: {models_dir_abs}")
    else:
        logger.warning(f"Models directory not found: {models_dir_abs}")
    
    # 启动事件
    @application.on_event("startup")
    async def startup_event():
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        logger.info(f"Environment: {settings.ENVIRONMENT}")

        # 注册租户查询自动过滤器
        install_tenant_filter()
        logger.info("Tenant query filter installed")

        # 0. 安全启动验证
        try:
            settings.validate_security()
            logger.info("Security validation passed")
        except ValueError as e:
            logger.error(f"Security validation failed: {e}")
            if not settings.DEBUG:
                raise

        # 1. 初始化Redis连接
        redis_manager = get_redis_manager()
        redis_connected = await redis_manager.connect()

        # 2. 初始化TaskStore（Redis可用则用Redis，否则回退到内存）
        if redis_connected and redis_manager.redis is not None:
            task_store = RedisTaskStore(redis_manager.redis)
            logger.info("[Startup] Using RedisTaskStore for task state persistence")
        else:
            task_store = MemoryTaskStore()
            logger.info("[Startup] Using MemoryTaskStore (Redis unavailable or disabled)")

        set_task_store(task_store)

        # 3. 创建数据库表（生产环境应使用Alembic迁移）
        if settings.DEBUG:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created (DEBUG mode)")
    
    # 关闭事件
    @application.on_event("shutdown")
    async def shutdown_event():
        logger.info("Shutting down application")
        # 关闭Redis连接
        redis_manager = get_redis_manager()
        await redis_manager.disconnect()
    
    return application


app = create_application()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.WORKERS
    )
