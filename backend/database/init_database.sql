-- ============================================================================
-- Web3D平台数据库初始化脚本 (PostgreSQL 16+)
-- Web3D Platform Database Initialization Script
-- ============================================================================
-- 版本 / Version: v3.0
-- 对齐 / Aligned: SQLAlchemy ORM Models (backend/app/models/*.py)
-- 说明 / Description: 与SQLAlchemy模型严格对齐，可用于Docker首次初始化
-- ============================================================================

SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. 创建扩展 / Create Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. 辅助函数 / Helper Functions
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. 用户系统 / User System
-- ============================================================================

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'editor', 'user', 'guest')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'banned')),
    storage_quota BIGINT NOT NULL DEFAULT 1073741824,
    storage_used BIGINT NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS 'UUID主键（由应用层生成）';
COMMENT ON COLUMN users.storage_quota IS '存储配额，默认1GB（字节）';

-- ============================================================================
-- 4. 3D模型系统 / 3D Model System
-- ============================================================================

CREATE TABLE models_3d (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (category IN ('character','scene','prop','vehicle','other','box','animation','nature','animal','architecture','food','industry','art')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','archived','disabled')),
    thumbnail_url TEXT,
    model_url TEXT NOT NULL,
    format VARCHAR(20) NOT NULL
        CHECK (format IN ('glb','gltf','fbx','obj','ply','splat','stl','spz')),
    file_size BIGINT NOT NULL,
    polygon_count INTEGER,
    texture_count INTEGER,
    metadata_json JSONB,
    tags JSONB,
    display_name VARCHAR(255),
    icon VARCHAR(50),
    color_hex VARCHAR(7),
    show_on_homepage BOOLEAN NOT NULL DEFAULT FALSE,
    show_in_gallery BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    model_url_fallback TEXT,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    reviewed_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_models_3d_name ON models_3d(name);
CREATE INDEX idx_models_3d_status ON models_3d(status);
CREATE INDEX idx_models_3d_created_by ON models_3d(created_by);
CREATE INDEX idx_models_3d_category ON models_3d(category);
CREATE INDEX idx_models_3d_show_on_homepage ON models_3d(show_on_homepage) WHERE show_on_homepage = TRUE;
CREATE INDEX idx_models_3d_created_at ON models_3d(created_at);

CREATE TRIGGER trg_models_3d_updated_at
    BEFORE UPDATE ON models_3d
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE models_3d IS '3D模型元数据表';

-- ============================================================================
-- 5. 用户额度统计 / User Quota Statistics
-- ============================================================================

CREATE TABLE user_quotas (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    used_quota BIGINT NOT NULL DEFAULT 0,
    total_generations INTEGER NOT NULL DEFAULT 0,
    successful_generations INTEGER NOT NULL DEFAULT 0,
    failed_generations INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_quotas_user_id ON user_quotas(user_id);

CREATE TRIGGER trg_user_quotas_updated_at
    BEFORE UPDATE ON user_quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_quotas IS '用户API调用统计表（额度由腾讯云直接管理）';

-- ============================================================================
-- 6. 场景模板 / Scene Templates
-- ============================================================================

CREATE TABLE scene_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL DEFAULT 'product'
        CHECK (category IN ('product','architecture','art','interior','exterior')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','published','archived')),
    thumbnail_url TEXT,
    spark_config JSONB NOT NULL DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    usage_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_scene_templates_name ON scene_templates(name);
CREATE INDEX idx_scene_templates_status ON scene_templates(status);
CREATE INDEX idx_scene_templates_created_by ON scene_templates(created_by);

COMMENT ON TABLE scene_templates IS 'Spark 2.0 场景模板表';

-- ============================================================================
-- 7. 模板版本历史 / Template Version History
-- ============================================================================

CREATE TABLE template_versions (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL REFERENCES scene_templates(id),
    version VARCHAR(20) NOT NULL,
    spark_config JSONB NOT NULL,
    change_log TEXT,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);

COMMENT ON TABLE template_versions IS '场景模板版本历史表';

-- ============================================================================
-- 8. 首页系统设置 / Homepage Settings
-- ============================================================================

CREATE TABLE homepage_settings (
    id VARCHAR(36) PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_homepage_settings_key ON homepage_settings(key);

COMMENT ON TABLE homepage_settings IS '首页系统设置表（key-value）';

-- ============================================================================
-- 9. 用户个性化设置 / User Settings
-- ============================================================================

CREATE TABLE user_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_settings_key UNIQUE (user_id, key)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

COMMENT ON TABLE user_settings IS '用户个性化设置表（如列布局偏好）';

-- ============================================================================
-- 10. 官网模板 / Website Templates
-- ============================================================================

CREATE TABLE website_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'full_page',
    layout_type VARCHAR(50) NOT NULL DEFAULT 'single_column',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    layout_config JSONB NOT NULL DEFAULT '{}',
    theme_config JSONB DEFAULT '{}',
    meta_info JSONB DEFAULT '{}',
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_website_templates_name ON website_templates(name);
CREATE INDEX idx_website_templates_status ON website_templates(status);

COMMENT ON TABLE website_templates IS '官网页面模板表';

-- ============================================================================
-- 11. 导航菜单 / Navigation Menus
-- ============================================================================

CREATE TABLE nav_menus (
    id VARCHAR(36) PRIMARY KEY,
    parent_id VARCHAR(36) REFERENCES nav_menus(id),
    label JSONB NOT NULL,
    icon VARCHAR(50),
    route VARCHAR(100) NOT NULL UNIQUE,
    page_title VARCHAR(200),
    template_id VARCHAR(36) REFERENCES website_templates(id) ON DELETE SET NULL,
    page_component VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    auth_required BOOLEAN NOT NULL DEFAULT FALSE,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_nav_menus_route ON nav_menus(route);
CREATE INDEX idx_nav_menus_template_id ON nav_menus(template_id);
CREATE INDEX idx_nav_menus_parent_id ON nav_menus(parent_id);

COMMENT ON TABLE nav_menus IS '导航菜单表（支持双模渲染）';

-- ============================================================================
-- 12. 模板插槽 / Template Slots
-- ============================================================================

CREATE TABLE template_slots (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL REFERENCES website_templates(id) ON DELETE CASCADE,
    slot_key VARCHAR(100) NOT NULL,
    component_type VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    component_config JSONB NOT NULL DEFAULT '{}',
    is_dynamic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_slots_template_id ON template_slots(template_id);
CREATE INDEX idx_template_slots_slot_key ON template_slots(slot_key);

COMMENT ON TABLE template_slots IS '模板组件插槽配置表';

-- ============================================================================
-- 13. 注册组件 / Registered Components
-- ============================================================================

CREATE TABLE registered_components (
    id VARCHAR(36) PRIMARY KEY,
    component_type VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    prop_schema JSONB NOT NULL DEFAULT '{}',
    is_builtin BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_registered_components_type ON registered_components(component_type);

COMMENT ON TABLE registered_components IS '组件注册表（仅供Admin UI读取）';

-- ============================================================================
-- 完成 / Completion
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Web3D PostgreSQL 数据库初始化完成';
    RAISE NOTICE '已创建表: users, models_3d, user_quotas';
    RAISE NOTICE '          scene_templates, template_versions';
    RAISE NOTICE '          homepage_settings, user_settings';
    RAISE NOTICE '          website_templates, nav_menus';
    RAISE NOTICE '          template_slots, registered_components';
    RAISE NOTICE '========================================';
END $$;
