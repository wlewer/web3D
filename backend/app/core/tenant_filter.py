"""
Web3D Backend - 租户查询自动过滤器
Tenant Query Filter - Automatic WHERE tenant_id = :id injection

Uses SQLAlchemy 2.0's ``do_orm_execute`` event to automatically append
tenant_id filters to ORM select queries against tenant-aware models.

Design principles:
  - No tenant context → no filter (backward compatible with existing code)
  - Platform admin (tenant_id=NULL admin) → bypass all filters
  - Only filters models that have a ``tenant_id`` column
  - Only applies to SELECT (read) queries; writes are controlled at service layer
"""
from contextlib import contextmanager

from sqlalchemy import event, select
from sqlalchemy.orm import Session
from loguru import logger

from app.core.tenant_context import get_current_tenant_id, is_platform_admin, set_current_tenant_id


def install_tenant_filter():
    """
    注册租户查询过滤器事件监听器
    Register the tenant query filter on the SQLAlchemy Session class.

    Must be called once at application startup (in main.py).
    Uses SQLAlchemy 2.0's ``do_orm_execute`` event which fires for both
    sync and async ORM executions.

    The event handler returns a modified statement that includes the
    tenant_id filter, effectively intercepting the query before it
    reaches the database.
    """
    @event.listens_for(Session, "do_orm_execute")
    def _tenant_orm_execute(orm_context):
        """
        在 ORM 执行前自动注入 tenant_id 过滤条件

        do_orm_execute event signature: receives an ORMExecuteState object.
        We inspect the query's column descriptions for tenant-aware models
        and append WHERE tenant_id = :id clauses.

        Returning None lets the execution proceed normally.
        To modify the statement, we use orm_context.statement manipulation
        and invoke_statement() pattern.
        """
        # 超管绕过所有租户过滤 / Platform admin bypasses tenant filter
        if is_platform_admin():
            return

        # 无租户上下文时不过滤 / No tenant context → no filter (backward compatible)
        tenant_id = get_current_tenant_id()
        if tenant_id is None:
            return

        statement = orm_context.statement

        # 仅对 SELECT 语句添加过滤 / Only filter SELECT statements
        if not is_select_statement(statement):
            return

        # 遍历查询涉及的实体，为含 tenant_id 的模型追加过滤
        modified = False
        new_stmt = statement

        for col_desc in orm_context.column_descriptions:
            entity = col_desc.get("entity")
            if entity is None:
                continue

            table = _get_entity_table(entity)
            if table is not None and "tenant_id" in table.columns:
                new_stmt = new_stmt.where(table.c.tenant_id == tenant_id)
                modified = True

        if modified:
            # 用修改后的 statement 重新执行查询
            return orm_context.invoke_statement(statement=new_stmt)

        # 未修改则正常执行
        return None


def _get_entity_table(entity):
    """
    从实体描述中提取 Table 对象
    Extract the Table object from an entity description.

    Handles both regular mapper entities and AliasedInsp entities.
    """
    # 直接有 __table__ 属性（常规 mapper）
    table = getattr(entity, "__table__", None)
    if table is not None:
        return table

    # AliasedInsp 情况：通过 mapper.local_table 获取
    mapper = getattr(entity, "mapper", None)
    if mapper is not None:
        return getattr(mapper, "local_table", None)

    # 通过 inspect 获取
    try:
        from sqlalchemy import inspect as sa_inspect
        mapper = sa_inspect(entity)
        return getattr(mapper, "local_table", None)
    except Exception:
        return None


def is_select_statement(statement) -> bool:
    """判断是否为 SELECT 语句 / Check if statement is a SELECT"""
    return getattr(statement, "is_select", lambda: False)()


@contextmanager
def disable_tenant_filter():
    """
    临时禁用租户过滤器的上下文管理器
    Context manager to temporarily disable tenant filtering.

    Usage::

        with disable_tenant_filter():
            # 此区间内的查询不会被自动添加 tenant_id 过滤
            results = await db.execute(select(Model3D))

    Useful for platform admin tools that need cross-tenant queries
    without elevating the user to platform admin.
    """
    original = get_current_tenant_id()
    set_current_tenant_id(None)
    try:
        yield
    finally:
        set_current_tenant_id(original)
