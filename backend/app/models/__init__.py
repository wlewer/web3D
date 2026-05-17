"""Database models"""
from app.models.user import User
from app.models.model import Model3D
from app.models.model_asset import ModelAsset
from app.models.quota import UserQuota
from app.models.settings import HomepageSettings, UserSettings
from app.models.tenant import Tenant, TenantConfig
from app.models.website_template import (
    WebsiteTemplate, NavMenu, TemplateSlot, RegisteredComponent,
    _register_user_relationships,
)
from app.models.page import Page, PageVersion

# 确保 User 模型的反向关系到网站模板系统
_register_user_relationships()
