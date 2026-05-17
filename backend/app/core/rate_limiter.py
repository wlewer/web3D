"""
Web3D Backend - 限流中间件
Rate limiting middleware using SlowAPI

三级限流策略：
- 未认证用户：100次/小时
- 普通用户：1000次/小时
- VIP用户：5000次/小时

Redis可用时使用Redis存储，否则使用内存存储
"""
import time
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.routing import Match
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from limits import parse

from app.config import settings


# ==================== 限流键与角色解析 ====================

def _get_role_from_request(request: Request) -> str:
    """从请求中解析用户角色（从JWT token）"""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            from jose import jwt, JWTError
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            return payload.get("role", "guest")
        except (JWTError, Exception):
            pass
    return "guest"


def _get_rate_limit_key(request: Request) -> str:
    """生成限流键（基于角色+客户端IP）"""
    role = _get_role_from_request(request)
    client_ip = get_remote_address(request)
    return f"{role}:{client_ip}"


def _get_limit_for_role(role: str) -> int:
    """根据角色获取每小时限流阈值"""
    if role == "vip":
        return settings.RATE_LIMIT_PER_HOUR_VIP
    elif role in ("user", "editor", "admin"):
        return settings.RATE_LIMIT_PER_HOUR_USER
    else:
        return settings.RATE_LIMIT_PER_HOUR_UNAUTHENTICATED


# ==================== SlowAPI Limiter 实例 ====================

_storage_uri = settings.REDIS_URL if settings.REDIS_ENABLED else None
limiter = Limiter(
    key_func=_get_rate_limit_key,
    storage_uri=_storage_uri,
    headers_enabled=True,
    swallow_errors=False,
    config_filename="",  # 禁用自动读取.env文件（避免Windows编码问题）
)


# ==================== 角色限流中间件 ====================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    基于角色的全局限流中间件
    
    在SlowAPIMiddleware之前运行，处理所有无显式装饰器的路由。
    支持三级限流：未认证 / 普通用户 / VIP用户。
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ):
        # 只处理HTTP请求
        if request.scope.get("type") != "http":
            return await call_next(request)

        # 检查路由是否已有SlowAPI显式装饰器（避免重复计数）
        handler = None
        for route in request.app.routes:
            match, _ = route.matches(request.scope)
            if match == Match.FULL and hasattr(route, "endpoint"):
                handler = route.endpoint
                break

        if handler:
            handler_name = f"{handler.__module__}.{handler.__name__}"
            if handler_name in limiter._route_limits:
                # 路由有@limiter.limit装饰器，跳过全局限流
                return await call_next(request)

        # 角色限流检查
        role = _get_role_from_request(request)
        limit = _get_limit_for_role(role)
        key = _get_rate_limit_key(request)
        endpoint = request.url.path or "/"

        limit_item = parse(f"{limit}/hour")
        rate_limiter = limiter.limiter

        if not rate_limiter.hit(limit_item, key, endpoint):
            # 超限，计算Retry-After
            try:
                stats = rate_limiter.get_window_stats(limit_item, key, endpoint)
                retry_after = max(1, int(stats.reset_time - time.time()))
            except Exception:
                retry_after = 3600

            logger.warning(
                f"Rate limit exceeded: role={role}, key={key}, "
                f"endpoint={endpoint}, limit={limit}/hour"
            )

            return JSONResponse(
                status_code=429,
                content={
                    "detail": "请求过于频繁，请稍后再试",
                    "retry_after": retry_after,
                    "limit": limit,
                },
                headers={"Retry-After": str(retry_after)},
            )

        response = await call_next(request)
        return response


# ==================== FastAPI 集成 ====================

def setup_rate_limiting(app):
    """在FastAPI应用中配置限流"""
    # 设置全局limiter实例（供SlowAPI使用）
    app.state.limiter = limiter

    # 添加SlowAPI中间件（内层，处理显式装饰器路由）
    app.add_middleware(SlowAPIMiddleware)

    # 添加角色限流中间件（外层，处理全局限流）
    app.add_middleware(RateLimitMiddleware)

    # 注册SlowAPI异常处理器
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    logger.info(
        f"Rate limiting enabled: unauth={settings.RATE_LIMIT_PER_HOUR_UNAUTHENTICATED}/h, "
        f"user={settings.RATE_LIMIT_PER_HOUR_USER}/h, "
        f"vip={settings.RATE_LIMIT_PER_HOUR_VIP}/h, "
        f"storage={'redis' if settings.REDIS_ENABLED else 'memory'}"
    )
