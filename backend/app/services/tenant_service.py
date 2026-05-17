"""
Web3D Backend - 租户管理业务逻辑层
Tenant service - Business logic for multi-tenant management
"""
import re
import secrets
import unicodedata
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from loguru import logger

from app.models.tenant import Tenant, TenantConfig
from app.models.model import Model3D
from app.models.website_template import WebsiteTemplate
from app.models.user import User
from app.models.quota import UserQuota
from app.schemas.tenant import TenantCreate, TenantPlanType


# 套餐默认配额 / Plan default quotas
PLAN_QUOTAS: Dict[str, Dict[str, Any]] = {
    "free": {
        "max_models": 10,
        "max_storage_bytes": 1073741824,        # 1GB
        "max_ai_generations_monthly": 50,
        "max_pages": 5,
    },
    "professional": {
        "max_models": 100,
        "max_storage_bytes": 10737418240,       # 10GB
        "max_ai_generations_monthly": 500,
        "max_pages": 50,
    },
    "enterprise": {
        "max_models": -1,                        # unlimited
        "max_storage_bytes": -1,                 # unlimited
        "max_ai_generations_monthly": -1,        # unlimited
        "max_pages": -1,                         # unlimited
    },
}


def generate_slug(name: str) -> str:
    """
    从租户名称生成URL友好的slug
    Generate URL-friendly slug from tenant name
    
    处理中文：转为拼音近似（用连字符替代），非ASCII字符移除
    """
    # 去除首尾空白
    name = name.strip()
    # 转小写
    name = name.lower()
    # 将空格替换为连字符
    name = name.replace(" ", "-")
    # NFD归一化并移除组合字符（重音符号等）
    name = unicodedata.normalize("NFD", name)
    name = "".join(ch for ch in name if unicodedata.category(ch) != "Mn")
    # 仅保留字母数字和连字符
    name = re.sub(r"[^a-z0-9\-]", "", name)
    # 合并连续连字符
    name = re.sub(r"-{2,}", "-", name)
    # 去除首尾连字符
    name = name.strip("-")
    # 如果结果为空（如纯中文名），用随机字符串兜底
    if not name:
        name = f"tenant-{secrets.token_hex(4)}"
    # 限制长度
    return name[:100]


def generate_api_key() -> str:
    """生成API密钥 / Generate API key"""
    return f"wk_{secrets.token_urlsafe(32)}"


class TenantService:
    """租户管理业务逻辑"""

    @staticmethod
    async def create_tenant(
        db: AsyncSession,
        data: TenantCreate,
        owner_id: Optional[str] = None,
    ) -> Tenant:
        """
        创建租户（含默认配置）
        Create tenant with default config
        
        Args:
            db: 异步数据库会话
            data: 创建租户请求数据
            owner_id: 所有者用户ID
        
        Returns:
            Tenant: 创建的租户对象
        """
        # 1. 生成slug（如果未提供则自动生成）
        slug = data.slug or generate_slug(data.name)
        
        # 2. 检查slug唯一性
        existing = await db.execute(
            select(Tenant).where(Tenant.slug == slug)
        )
        if existing.scalar_one_or_none():
            # 添加后缀避免重复
            slug = f"{slug}-{secrets.token_hex(3)}"
        
        # 3. 生成api_key
        api_key = generate_api_key()
        
        # 4. 获取套餐默认配额
        plan = data.plan_type.value if isinstance(data.plan_type, TenantPlanType) else data.plan_type
        default_quotas = PLAN_QUOTAS.get(plan, PLAN_QUOTAS["free"]).copy()
        
        # 5. 创建Tenant
        tenant = Tenant(
            name=data.name,
            slug=slug,
            domain=data.domain,
            api_key=api_key,
            plan_type=plan,
            status="active",
            max_models=data.max_models if data.max_models is not None else default_quotas["max_models"],
            max_storage_bytes=data.max_storage_bytes if data.max_storage_bytes is not None else default_quotas["max_storage_bytes"],
            max_ai_generations_monthly=(
                data.max_ai_generations_monthly
                if data.max_ai_generations_monthly is not None
                else default_quotas["max_ai_generations_monthly"]
            ),
            max_pages=data.max_pages if data.max_pages is not None else default_quotas["max_pages"],
            owner_user_id=data.owner_user_id or owner_id,
            logo_url=data.logo_url,
            favicon_url=data.favicon_url,
        )
        
        db.add(tenant)
        await db.flush()
        
        # 6. 创建默认TenantConfig
        config = TenantConfig(
            tenant_id=tenant.id,
            theme_config={
                "primaryColor": "#667eea",
                "fontFamily": "system-ui, -apple-system, sans-serif",
            },
            features_enabled={
                "ai_generation": True,
                "plugin_market": plan != "free",
                "custom_domain": plan != "free",
            },
        )
        db.add(config)
        await db.flush()
        
        # 刷新tenant以获得完整数据
        await db.refresh(tenant)
        
        logger.info(
            f"[TenantService] Tenant created: id={tenant.id}, name={tenant.name}, "
            f"slug={tenant.slug}, plan={tenant.plan_type}"
        )
        
        return tenant

    @staticmethod
    async def get_tenant_usage(db: AsyncSession, tenant_id: str) -> Dict[str, Any]:
        """
        获取租户当前用量
        Get tenant current usage statistics
        
        Args:
            db: 异步数据库会话
            tenant_id: 租户ID
        
        Returns:
            dict: 包含各项用量和配额的字典
        """
        # 获取租户信息
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            return {"error": "Tenant not found"}
        
        # 1. 模型数量
        models_count_result = await db.execute(
            select(sa_func.count(Model3D.id))
            .select_from(Model3D)
            .join(User, Model3D.created_by == User.id)
            .where(User.tenant_id == tenant_id)
        )
        models_count = models_count_result.scalar() or 0
        
        # 2. 存储使用量（通过该租户用户上传的模型文件大小求和）
        storage_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(Model3D.file_size), 0))
            .select_from(Model3D)
            .join(User, Model3D.created_by == User.id)
            .where(User.tenant_id == tenant_id)
        )
        storage_used = storage_result.scalar() or 0
        
        # 3. 本月AI生成次数（通过UserQuota统计）
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # 使用UserQuota表的total_generations统计
        ai_gen_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(UserQuota.total_generations), 0))
            .select_from(UserQuota)
            .join(User, UserQuota.user_id == User.id)
            .where(User.tenant_id == tenant_id)
        )
        ai_generations_this_month = ai_gen_result.scalar() or 0
        
        # 4. 页面数量（WebsiteTemplate）
        pages_count_result = await db.execute(
            select(sa_func.count(WebsiteTemplate.id))
            .select_from(WebsiteTemplate)
            .join(User, WebsiteTemplate.created_by == User.id)
            .where(User.tenant_id == tenant_id)
        )
        pages_count = pages_count_result.scalar() or 0
        
        return {
            "tenant_id": tenant_id,
            "plan_type": tenant.plan_type,
            "models": {
                "used": models_count,
                "limit": tenant.max_models,
                "unlimited": tenant.max_models == -1,
            },
            "storage": {
                "used": storage_used,
                "limit": tenant.max_storage_bytes,
                "unlimited": tenant.max_storage_bytes == -1,
            },
            "ai_generations": {
                "used_this_month": ai_generations_this_month,
                "limit": tenant.max_ai_generations_monthly,
                "unlimited": tenant.max_ai_generations_monthly == -1,
            },
            "pages": {
                "used": pages_count,
                "limit": tenant.max_pages,
                "unlimited": tenant.max_pages == -1,
            },
        }

    @staticmethod
    async def upgrade_plan(
        db: AsyncSession,
        tenant_id: str,
        new_plan: str,
    ) -> Tenant:
        """
        切换租户套餐并更新配额
        Upgrade/downgrade tenant plan and update quotas
        
        Args:
            db: 异步数据库会话
            tenant_id: 租户ID
            new_plan: 新套餐类型
        
        Returns:
            Tenant: 更新后的租户对象
        """
        # 验证套餐类型
        valid_plans = [e.value for e in TenantPlanType]
        if new_plan not in valid_plans:
            raise ValueError(f"Invalid plan type: {new_plan}. Must be one of: {', '.join(valid_plans)}")
        
        # 获取租户
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise ValueError("Tenant not found")
        
        old_plan = tenant.plan_type
        
        # 更新套餐类型
        tenant.plan_type = new_plan
        
        # 根据套餐更新配额
        quotas = PLAN_QUOTAS.get(new_plan, PLAN_QUOTAS["free"])
        tenant.max_models = quotas["max_models"]
        tenant.max_storage_bytes = quotas["max_storage_bytes"]
        tenant.max_ai_generations_monthly = quotas["max_ai_generations_monthly"]
        tenant.max_pages = quotas["max_pages"]
        
        await db.flush()
        await db.refresh(tenant)
        
        logger.info(
            f"[TenantService] Tenant plan upgraded: id={tenant_id}, "
            f"{old_plan} -> {new_plan}"
        )
        
        return tenant
