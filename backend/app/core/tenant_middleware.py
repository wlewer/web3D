"""
Web3D Backend - 租户解析中间件
Tenant Resolver Middleware - Extracts tenant context from request

Resolves tenant_id from 3 sources in priority order:
  1. X-Tenant-ID request header (API call mode)
  2. JWT token's tenant_id field (user login mode)
  3. Request Host domain matching (custom domain mode)

Stores resolved tenant_id in request.state for downstream access.
Does NOT set ContextVar here — that is done in dependencies.py after
user authentication, which is the authoritative source.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger

from app.core.tenant_context import set_current_tenant_id, clear_tenant_context


# 不需要租户解析的路径前缀 / Path prefixes that skip tenant resolution
_SKIP_PATHS = (
    "/docs", "/redoc", "/openapi.json", "/health",
    "/app/",  # 静态文件
    "/static-models/",
    "/generation-models/",
)


class TenantResolverMiddleware(BaseHTTPMiddleware):
    """
    租户解析中间件
    Resolves tenant identity from request and stores in request.state.

    Priority:
      1. X-Tenant-ID header (API key / explicit tenant specification)
      2. JWT Authorization Bearer token → tenant_id claim
      3. Host header domain matching against tenants.domain
    """

    async def dispatch(self, request: Request, call_next):
        # 跳过不需要租户上下文的路径
        path = request.url.path
        if any(path.startswith(skip) for skip in _SKIP_PATHS):
            request.state.tenant_id = None
            request.state.tenant = None
            return await call_next(request)

        tenant_id = None

        # ===== 优先级1: X-Tenant-ID 请求头 =====
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            logger.debug(f"Tenant resolved from header: {tenant_id}")

        # ===== 优先级2: JWT token 中的 tenant_id =====
        if not tenant_id:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]  # strip "Bearer "
                tenant_id = self._extract_tenant_from_jwt(token)
                if tenant_id:
                    logger.debug(f"Tenant resolved from JWT: {tenant_id}")

        # ===== 优先级3: Host 域名匹配 =====
        if not tenant_id:
            host = request.headers.get("host", "").split(":")[0]
            # 排除 localhost / 127.0.0.1 等开发域名
            if host and host not in ("localhost", "127.0.0.1", ""):
                tenant_id = await self._resolve_tenant_by_domain(host, request)
                if tenant_id:
                    logger.debug(f"Tenant resolved from domain: {host} -> {tenant_id}")

        # 将 tenant_id 存入 request.state（供依赖层使用）
        request.state.tenant_id = tenant_id
        request.state.tenant = None  # 延迟加载完整 Tenant 对象（按需查询）

        # 同时设置 ContextVar，使得非依赖注入路径（如中间件内）也能获取
        # 注意：最终权威设置在 dependencies.py 的 get_current_user 中
        set_current_tenant_id(tenant_id)

        try:
            response = await call_next(request)
            return response
        finally:
            # 请求结束时清理上下文，防止协程复用时泄漏
            clear_tenant_context()

    @staticmethod
    def _extract_tenant_from_jwt(token: str) -> str | None:
        """
        从 JWT token 中提取 tenant_id 字段
        Extract tenant_id from JWT payload without full verification.
        The token will be verified later by dependencies.py; here we only
        parse the claims to obtain the tenant_id hint.
        """
        try:
            from app.core.security import decode_token
            payload = decode_token(token, token_type="access")
            return payload.get("tenant_id")
        except Exception:
            # Token 解码失败不影响请求继续，后续依赖层会处理 401
            return None

    @staticmethod
    async def _resolve_tenant_by_domain(host: str, request: Request) -> str | None:
        """
        通过域名查询匹配的租户
        Resolve tenant_id by matching host against tenants.domain column.

        Uses a short-lived DB session to avoid coupling with request-session lifecycle.
        """
        try:
            from app.database import async_session_maker
            from app.models.tenant import Tenant
            from sqlalchemy import select

            async with async_session_maker() as session:
                result = await session.execute(
                    select(Tenant.id).where(Tenant.domain == host, Tenant.status == "active")
                )
                row = result.scalar_one_or_none()
                return str(row) if row else None
        except Exception as e:
            logger.warning(f"Failed to resolve tenant by domain '{host}': {e}")
            return None
