"""
Web3D Backend - 租户上下文管理
Tenant context management using contextvars for async-safe isolation

Provides per-request tenant context via ContextVar, ensuring coroutine-safe
tenant_id and platform_admin state without thread-local pitfalls.
"""
from contextvars import ContextVar

# 当前租户ID / Current tenant ID (set by middleware or dependency)
_current_tenant_id: ContextVar[str | None] = ContextVar('current_tenant_id', default=None)

# 是否为平台超管 / Whether current user is a platform admin (tenant_id=NULL admin)
_is_platform_admin: ContextVar[bool] = ContextVar('is_platform_admin', default=False)


def get_current_tenant_id() -> str | None:
    """
    获取当前请求的租户ID
    Get current request's tenant ID from context
    """
    return _current_tenant_id.get()


def set_current_tenant_id(tenant_id: str | None) -> None:
    """
    设置当前请求的租户ID
    Set current request's tenant ID into context
    """
    _current_tenant_id.set(tenant_id)


def is_platform_admin() -> bool:
    """
    判断当前用户是否为平台超管（tenant_id=NULL的admin）
    Check if current user is a platform admin (bypasses tenant filter)
    """
    return _is_platform_admin.get()


def set_platform_admin(is_admin: bool) -> None:
    """
    设置平台超管标记
    Set platform admin flag in context
    """
    _is_platform_admin.set(is_admin)


def clear_tenant_context() -> None:
    """
    清除租户上下文（请求结束时调用）
    Clear tenant context (call at request end to prevent context leak)
    """
    _current_tenant_id.set(None)
    _is_platform_admin.set(False)
