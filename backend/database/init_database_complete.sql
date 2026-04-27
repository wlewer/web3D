-- ============================================================================
-- Web3D平台完整数据库初始化脚本（生产就绪版）
-- Web3D Platform Complete Database Initialization Script (Production Ready)
-- ============================================================================
-- 版本 / Version: v4.0 (企业级多模板系统版)
-- 数据库 / Database: PostgreSQL 16+
-- 数据库名 / Database Name: web3d
-- 创建日期 / Created: 2025-04-18
-- 最后更新 / Last Updated: 2025-04-18
-- 说明 / Description: 包含所有核心表+企业级多模板系统，完整的中英双语注释，可直接执行
-- 表清单 / Tables: 22张核心表 + 3张模板增强表 = 25张表
--   用户系统: users, user_sessions, user_oauth_bindings
--   3D模型: models_3d, model_versions, model_favorites, model_comments, model_likes
--   模板系统: templates, template_versions, template_ratings, template_usage_stats
--   页面系统: user_pages, page_sections, user_custom_blocks
--   订阅支付: subscription_plans, subscriptions, orders, invoices
--   任务队列: generation_tasks
--   审计日志: audit_logs, api_call_logs
-- ============================================================================

-- 设置客户端编码 / Set client encoding
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. 创建扩展 / Create Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";           -- UUID生成函数 / UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- 性能监控 / Performance monitoring
CREATE EXTENSION IF NOT EXISTS "pgcrypto";            -- 加密函数 / Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "btree_gin";           -- GIN索引支持B-tree操作符 / GIN index for B-tree operators

-- ============================================================================
-- 2. 通用函数和触发器 / Common Functions and Triggers
-- ============================================================================

-- 自动更新updated_at字段 / Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 软删除触发器函数 / Soft delete trigger function
CREATE OR REPLACE FUNCTION set_deleted_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        NEW.deleted_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 3. 用户系统 / User System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 用户表 / Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息 / Basic Information
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- 角色与状态 / Role & Status
    role VARCHAR(20) NOT NULL DEFAULT 'user' 
        CHECK (role IN ('admin', 'editor', 'user', 'guest')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'banned', 'pending_verification')),
    
    -- 配额管理 / Quota Management
    storage_quota BIGINT NOT NULL DEFAULT 1073741824,  -- 1GB
    storage_used BIGINT NOT NULL DEFAULT 0,
    monthly_generations INTEGER NOT NULL DEFAULT 10,
    generations_used INTEGER NOT NULL DEFAULT 0,
    generation_quota_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- 偏好设置 / Preferences
    preferred_language VARCHAR(10) DEFAULT 'zh-CN' 
        CHECK (preferred_language IN ('zh-CN', 'en-US', 'ja-JP', 'ko-KR')),
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 时间戳 / Timestamps
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 索引 / Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- 触发器 / Triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 注释 / Comments
COMMENT ON TABLE users IS '用户表 - Stores system user information';
COMMENT ON COLUMN users.id IS '用户唯一ID - Unique user identifier';
COMMENT ON COLUMN users.username IS '用户名 - Username for login and display';
COMMENT ON COLUMN users.email IS '邮箱地址 - Email address for login and notifications';
COMMENT ON COLUMN users.password_hash IS '密码哈希（bcrypt加密）- Password hash encrypted with bcrypt';
COMMENT ON COLUMN users.phone IS '手机号码 - Phone number for SMS notifications';
COMMENT ON COLUMN users.avatar_url IS '头像URL - URL of user avatar image';
COMMENT ON COLUMN users.role IS '用户角色：admin(管理员)/editor(编辑)/user(普通用户)/guest(访客) - User role';
COMMENT ON COLUMN users.status IS '用户状态：active(活跃)/inactive(非活跃)/banned(封禁)/pending_verification(待验证) - User account status';
COMMENT ON COLUMN users.storage_quota IS '存储配额（字节）- Storage quota in bytes';
COMMENT ON COLUMN users.storage_used IS '已使用存储（字节）- Used storage in bytes';
COMMENT ON COLUMN users.monthly_generations IS '每月AI生成次数配额 - Monthly AI generation quota';
COMMENT ON COLUMN users.generations_used IS '本月已使用生成次数 - Generations used this month';
COMMENT ON COLUMN users.generation_quota_reset_at IS '配额重置时间 - Quota reset timestamp';
COMMENT ON COLUMN users.preferred_language IS '首选语言 - Preferred language';
COMMENT ON COLUMN users.timezone IS '时区 - Timezone';
COMMENT ON COLUMN users.email_verified_at IS '邮箱验证时间 - Email verification timestamp';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间 - Last login timestamp';
COMMENT ON COLUMN users.last_login_ip IS '最后登录IP地址 - Last login IP address';
COMMENT ON COLUMN users.created_at IS '账户创建时间 - Account creation timestamp';
COMMENT ON COLUMN users.updated_at IS '最后更新时间 - Last update timestamp';
COMMENT ON COLUMN users.deleted_at IS '软删除时间（NULL=未删除）- Soft delete timestamp (NULL=not deleted)';

-- ----------------------------------------------------------------------------
-- 3.2 用户会话表 / User Sessions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    country VARCHAR(100),
    city VARCHAR(100),
    
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON user_sessions(last_active_at DESC);

COMMENT ON TABLE user_sessions IS '用户会话表 - Stores user session information';
COMMENT ON COLUMN user_sessions.user_id IS '用户ID - User ID';
COMMENT ON COLUMN user_sessions.token_hash IS 'Access Token哈希 - Access token hash';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'Refresh Token哈希 - Refresh token hash';
COMMENT ON COLUMN user_sessions.ip_address IS 'IP地址 - IP address';
COMMENT ON COLUMN user_sessions.user_agent IS '浏览器User-Agent - Browser user agent';
COMMENT ON COLUMN user_sessions.device_info IS '设备信息JSON - Device information in JSON';
COMMENT ON COLUMN user_sessions.country IS '国家 - Country';
COMMENT ON COLUMN user_sessions.city IS '城市 - City';
COMMENT ON COLUMN user_sessions.expires_at IS '过期时间 - Expiration timestamp';
COMMENT ON COLUMN user_sessions.last_active_at IS '最后活跃时间 - Last active timestamp';

-- ----------------------------------------------------------------------------
-- 3.3 OAuth绑定表 / OAuth Bindings Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_oauth_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) NOT NULL 
        CHECK (provider IN ('google', 'github', 'wechat', 'apple')),
    provider_user_id VARCHAR(255) NOT NULL,
    provider_username VARCHAR(255),
    
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    extra_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON user_oauth_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON user_oauth_bindings(provider);

CREATE TRIGGER update_oauth_bindings_updated_at 
    BEFORE UPDATE ON user_oauth_bindings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_oauth_bindings IS '用户OAuth绑定表 - Stores user OAuth provider bindings';
COMMENT ON COLUMN user_oauth_bindings.provider IS 'OAuth提供商：google/github/wechat/apple - OAuth provider';
COMMENT ON COLUMN user_oauth_bindings.provider_user_id IS '提供商用户ID - Provider user ID';
COMMENT ON COLUMN user_oauth_bindings.access_token_encrypted IS '加密的Access Token - Encrypted access token';
COMMENT ON COLUMN user_oauth_bindings.refresh_token_encrypted IS '加密的Refresh Token - Encrypted refresh token';

-- ============================================================================
-- 4. 3D模型系统 / 3D Model System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 3D模型表 / 3D Models Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS models_3d (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 基本信息 / Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) 
        CHECK (category IN ('product', 'character', 'scene', 'architecture', 'other')),
    tags TEXT[] DEFAULT '{}',
    
    -- 来源信息 / Source Information
    source_type VARCHAR(20) NOT NULL DEFAULT 'upload'
        CHECK (source_type IN ('upload', 'generate', 'import')),
    generation_engine VARCHAR(50),
    original_file_path TEXT,
    
    -- 文件路径 / File Paths
    glb_file_path TEXT,
    splat_file_path TEXT,
    obj_file_path TEXT,
    thumbnail_path TEXT,
    preview_video_path TEXT,
    
    -- 文件元数据 / File Metadata
    file_size BIGINT,
    polygon_count INTEGER,
    vertex_count INTEGER,
    texture_resolution VARCHAR(20),
    format_version VARCHAR(20),
    
    -- 生成参数 / Generation Parameters
    generation_params JSONB,
    quality_score FLOAT CHECK (quality_score >= 0 AND quality_score <= 1),
    
    -- 处理状态 / Processing Status
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- 访问控制 / Access Control
    visibility VARCHAR(20) NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('public', 'private', 'unlisted')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    featured_priority INTEGER DEFAULT 0,
    
    -- 审核状态 / Moderation Status
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_reason TEXT,
    
    -- 统计信息 / Statistics
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    favorite_count INTEGER NOT NULL DEFAULT 0,
    
    -- 多语言支持 / Internationalization Support
    name_i18n JSONB DEFAULT '{"zh-CN": "", "en-US": ""}',
    description_i18n JSONB DEFAULT '{"zh-CN": "", "en-US": ""}',
    
    -- 时间戳 / Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 索引 / Indexes
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models_3d(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_models_category ON models_3d(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_models_visibility ON models_3d(visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_models_processing_status ON models_3d(processing_status);
CREATE INDEX IF NOT EXISTS idx_models_moderation_status ON models_3d(moderation_status);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models_3d(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_models_view_count ON models_3d(view_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_models_is_featured ON models_3d(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_models_tags ON models_3d USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_models_search ON models_3d 
    USING GIN(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_models_name_i18n ON models_3d USING GIN(name_i18n);
CREATE INDEX IF NOT EXISTS idx_models_description_i18n ON models_3d USING GIN(description_i18n);

CREATE TRIGGER update_models_updated_at 
    BEFORE UPDATE ON models_3d 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE models_3d IS '3D模型表 - Stores 3D model metadata and files';
COMMENT ON COLUMN models_3d.user_id IS '所有者用户ID - Owner user ID';
COMMENT ON COLUMN models_3d.name IS '模型名称 - Model name';
COMMENT ON COLUMN models_3d.description IS '模型描述 - Model description';
COMMENT ON COLUMN models_3d.category IS '模型分类：product/character/scene/architecture/other - Model category';
COMMENT ON COLUMN models_3d.tags IS '标签数组 - Tags array';
COMMENT ON COLUMN models_3d.source_type IS '来源类型：upload/generate/import - Source type';
COMMENT ON COLUMN models_3d.generation_engine IS 'AI生成引擎 - AI generation engine';
COMMENT ON COLUMN models_3d.visibility IS '可见性：public/private/unlisted - Visibility';
COMMENT ON COLUMN models_3d.is_featured IS '是否精选 - Is featured';
COMMENT ON COLUMN models_3d.moderation_status IS '审核状态：pending/approved/rejected - Moderation status';
COMMENT ON COLUMN models_3d.view_count IS '浏览量 - View count';
COMMENT ON COLUMN models_3d.download_count IS '下载次数 - Download count';
COMMENT ON COLUMN models_3d.like_count IS '点赞数 - Like count';
COMMENT ON COLUMN models_3d.comment_count IS '评论数 - Comment count';
COMMENT ON COLUMN models_3d.favorite_count IS '收藏数 - Favorite count';
COMMENT ON COLUMN models_3d.name_i18n IS '多语言名称 - Localized names';
COMMENT ON COLUMN models_3d.description_i18n IS '多语言描述 - Localized descriptions';

-- ----------------------------------------------------------------------------
-- 4.2 模型版本表 / Model Versions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models_3d(id) ON DELETE CASCADE,
    
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    change_log TEXT,
    
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versions_model_id ON model_versions(model_id);
CREATE INDEX IF NOT EXISTS idx_versions_number ON model_versions(model_id, version_number DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_unique ON model_versions(model_id, version_number);

COMMENT ON TABLE model_versions IS '模型版本表 - Stores model version history';
COMMENT ON COLUMN model_versions.model_id IS '模型ID - Model ID';
COMMENT ON COLUMN model_versions.version_number IS '版本号 - Version number';
COMMENT ON COLUMN model_versions.file_path IS '文件路径 - File path';
COMMENT ON COLUMN model_versions.change_log IS '变更日志 - Change log';

-- ----------------------------------------------------------------------------
-- 4.3 模型收藏表 / Model Favorites Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models_3d(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON model_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_model_id ON model_favorites(model_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON model_favorites(created_at DESC);

COMMENT ON TABLE model_favorites IS '模型收藏表 - Stores model favorites';
COMMENT ON COLUMN model_favorites.user_id IS '用户ID - User ID';
COMMENT ON COLUMN model_favorites.model_id IS '模型ID - Model ID';

-- ----------------------------------------------------------------------------
-- 4.4 模型评论表 / Model Comments Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models_3d(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    parent_id UUID REFERENCES model_comments(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    like_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_model_id ON model_comments(model_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON model_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON model_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON model_comments(is_approved) WHERE is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_comments_created ON model_comments(created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON model_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE model_comments IS '模型评论表 - Stores model comments';
COMMENT ON COLUMN model_comments.model_id IS '模型ID - Model ID';
COMMENT ON COLUMN model_comments.user_id IS '评论者ID - Commenter ID';
COMMENT ON COLUMN model_comments.parent_id IS '父评论ID（嵌套回复）- Parent comment ID (nested replies)';
COMMENT ON COLUMN model_comments.content IS '评论内容 - Comment content';
COMMENT ON COLUMN model_comments.is_approved IS '是否审核通过 - Is approved';

-- ----------------------------------------------------------------------------
-- 4.5 模型点赞表 / Model Likes Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models_3d(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON model_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_model_id ON model_likes(model_id);

COMMENT ON TABLE model_likes IS '模型点赞表 - Stores model likes';
COMMENT ON COLUMN model_likes.user_id IS '用户ID - User ID';
COMMENT ON COLUMN model_likes.model_id IS '模型ID - Model ID';

-- ============================================================================
-- 5. 模板系统 / Template System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 模板表 / Templates Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('gallery', 'book', 'showcase', 'portfolio', 'custom')),
    
    thumbnail_url TEXT,
    preview_url TEXT,
    demo_page_url TEXT,
    
    layout_config JSONB NOT NULL,
    style_config JSONB,
    component_config JSONB,
    
    usage_count INTEGER NOT NULL DEFAULT 0,
    rating FLOAT NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER NOT NULL DEFAULT 0,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_is_premium ON templates(is_premium);
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_rating ON templates(rating DESC);

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE templates IS '页面模板表 - Stores page templates';
COMMENT ON COLUMN templates.name IS '模板名称 - Template name';
COMMENT ON COLUMN templates.slug IS 'URL友好标识符 - URL-friendly slug';
COMMENT ON COLUMN templates.category IS '模板分类 - Template category';
COMMENT ON COLUMN templates.layout_config IS '布局配置JSON - Layout configuration JSON';
COMMENT ON COLUMN templates.style_config IS '样式配置JSON - Style configuration JSON';
COMMENT ON COLUMN templates.is_premium IS '是否付费模板 - Is premium template';

-- ============================================================================
-- 5.1.1 模板系统增强字段 / Templates Table Enhancements (Multi-Template System)
-- ============================================================================

-- 难度等级
ALTER TABLE templates ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) 
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'));

-- 行业标签
ALTER TABLE templates ADD COLUMN IF NOT EXISTS industry_tags TEXT[] DEFAULT '{}';

-- 风格标签
ALTER TABLE templates ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';

-- 预览图片数组
ALTER TABLE templates ADD COLUMN IF NOT EXISTS preview_images TEXT[] DEFAULT '{}';

-- 演示视频URL
ALTER TABLE templates ADD COLUMN IF NOT EXISTS demo_video_url TEXT;

-- 文档URL
ALTER TABLE templates ADD COLUMN IF NOT EXISTS documentation_url TEXT;

-- 作者信息
ALTER TABLE templates ADD COLUMN IF NOT EXISTS author_name VARCHAR(100);

-- 价格与许可
ALTER TABLE templates ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS license_type VARCHAR(50) DEFAULT 'standard'
    CHECK (license_type IN ('free', 'standard', 'extended', 'exclusive'));

-- 统计信息
ALTER TABLE templates ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- 发布时间
ALTER TABLE templates ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_templates_difficulty ON templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_templates_industry_tags ON templates USING GIN(industry_tags);
CREATE INDEX IF NOT EXISTS idx_templates_style_tags ON templates USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_templates_price ON templates(price);
CREATE INDEX IF NOT EXISTS idx_templates_published_at ON templates(published_at DESC);

-- 添加注释
COMMENT ON COLUMN templates.difficulty IS '难度等级：beginner/intermediate/advanced - Difficulty level';
COMMENT ON COLUMN templates.industry_tags IS '行业标签数组 - Industry tags array';
COMMENT ON COLUMN templates.style_tags IS '风格标签数组 - Style tags array';
COMMENT ON COLUMN templates.preview_images IS '预览图片URL数组 - Preview image URLs';
COMMENT ON COLUMN templates.demo_video_url IS '演示视频URL - Demo video URL';
COMMENT ON COLUMN templates.documentation_url IS '文档URL - Documentation URL';
COMMENT ON COLUMN templates.author_name IS '作者名称 - Author name';
COMMENT ON COLUMN templates.price IS '模板价格（0=免费）- Template price (0=free)';
COMMENT ON COLUMN templates.license_type IS '许可类型：free/standard/extended/exclusive - License type';
COMMENT ON COLUMN templates.download_count IS '下载次数 - Download count';
COMMENT ON COLUMN templates.published_at IS '发布时间 - Publication timestamp';

-- ----------------------------------------------------------------------------
-- 5.2 模板评分表 / Template Ratings Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS template_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_template_id ON template_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON template_ratings(user_id);

COMMENT ON TABLE template_ratings IS '模板评分表 - Stores template ratings';
COMMENT ON COLUMN template_ratings.rating IS '评分（1-5星）- Rating (1-5 stars)';
COMMENT ON COLUMN template_ratings.comment IS '评价内容 - Review comment';

-- ============================================================================
-- 6. 页面系统 / Page System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 用户页面表 / User Pages Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id),
    
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    
    page_config JSONB,
    custom_css TEXT,
    custom_js TEXT,
    
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT[],
    og_image_url TEXT,
    
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    
    view_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pages_user_id ON user_pages(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_slug ON user_pages(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_status ON user_pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_published_at ON user_pages(published_at DESC) WHERE status = 'published';

CREATE TRIGGER update_pages_updated_at 
    BEFORE UPDATE ON user_pages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_pages IS '用户自定义页面表 - Stores user custom pages';
COMMENT ON COLUMN user_pages.title IS '页面标题 - Page title';
COMMENT ON COLUMN user_pages.slug IS 'URL标识符 - URL slug';
COMMENT ON COLUMN user_pages.page_config IS '页面配置JSON - Page configuration JSON';
COMMENT ON COLUMN user_pages.custom_css IS '自定义CSS - Custom CSS';
COMMENT ON COLUMN user_pages.custom_js IS '自定义JavaScript - Custom JavaScript';
COMMENT ON COLUMN user_pages.meta_title IS 'SEO标题 - SEO meta title';
COMMENT ON COLUMN user_pages.meta_description IS 'SEO描述 - SEO meta description';
COMMENT ON COLUMN user_pages.status IS '页面状态：draft/published/archived - Page status';

-- ============================================================================
-- 6.1.1 用户页面增强字段 / User Pages Enhancements (Multi-Template System)
-- ============================================================================

-- 模板版本追踪
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS template_version VARCHAR(20);

-- 自动更新设置
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS auto_update_enabled BOOLEAN DEFAULT FALSE;

-- 上次检查更新时间
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS last_template_update_check TIMESTAMP WITH TIME ZONE;

-- 主题预设
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50);

-- 配色方案
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS color_scheme JSONB DEFAULT '{
    "primary": "#3B82F6",
    "secondary": "#10B981",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#1F2937"
}';

-- 排版配置
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS typography_config JSONB DEFAULT '{
    "heading_font": "Inter",
    "body_font": "Roboto",
    "heading_size_scale": 1.2,
    "line_height": 1.6
}';

-- 间距配置
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS spacing_config JSONB DEFAULT '{
    "section_padding": "80px",
    "container_max_width": "1200px",
    "grid_gap": "24px"
}';

-- 动画配置
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS animation_config JSONB DEFAULT '{
    "scroll_animations": true,
    "hover_effects": true,
    "transition_duration": "0.3s"
}';

-- SEO配置
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS seo_config JSONB DEFAULT '{
    "canonical_url": null,
    "robots": "index,follow",
    "sitemap_priority": 0.5
}';

-- 分析工具配置
ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT '{
    "google_analytics_id": null,
    "facebook_pixel_id": null,
    "custom_tracking_code": null
}';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pages_template_version ON user_pages(template_version);
CREATE INDEX IF NOT EXISTS idx_pages_theme_preset ON user_pages(theme_preset);

-- 添加注释
COMMENT ON COLUMN user_pages.template_version IS '使用的模板版本 - Template version used';
COMMENT ON COLUMN user_pages.auto_update_enabled IS '是否启用自动更新 - Auto-update enabled';
COMMENT ON COLUMN user_pages.last_template_update_check IS '上次检查更新时间 - Last update check timestamp';
COMMENT ON COLUMN user_pages.theme_preset IS '主题预设 - Theme preset';
COMMENT ON COLUMN user_pages.color_scheme IS '配色方案JSON - Color scheme JSON';
COMMENT ON COLUMN user_pages.typography_config IS '排版配置JSON - Typography configuration JSON';
COMMENT ON COLUMN user_pages.spacing_config IS '间距配置JSON - Spacing configuration JSON';
COMMENT ON COLUMN user_pages.animation_config IS '动画配置JSON - Animation configuration JSON';
COMMENT ON COLUMN user_pages.seo_config IS 'SEO配置JSON - SEO configuration JSON';
COMMENT ON COLUMN user_pages.analytics_config IS '分析工具配置JSON - Analytics configuration JSON';

-- ----------------------------------------------------------------------------
-- 6.2 页面区块表 / Page Sections Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES user_pages(id) ON DELETE CASCADE,
    
    section_type VARCHAR(50) NOT NULL
        CHECK (section_type IN ('hero', 'gallery', 'text', 'video', '3d_viewer', 'contact', 'custom')),
    
    position INTEGER NOT NULL,
    config JSONB NOT NULL,
    
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_page_id ON page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_sections_position ON page_sections(page_id, position);
CREATE INDEX IF NOT EXISTS idx_sections_type ON page_sections(section_type);

CREATE TRIGGER update_sections_updated_at 
    BEFORE UPDATE ON page_sections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE page_sections IS '页面区块表 - Stores page sections/blocks';
COMMENT ON COLUMN page_sections.section_type IS '区块类型 - Section type';
COMMENT ON COLUMN page_sections.position IS '排序位置 - Sort position';
COMMENT ON COLUMN page_sections.config IS '区块配置JSON - Section configuration JSON';
COMMENT ON COLUMN page_sections.is_visible IS '是否可见 - Is visible';

-- ============================================================================
-- 7. 订阅支付系统 / Subscription & Payment System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 套餐表 / Subscription Plans Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    storage_quota BIGINT NOT NULL,
    monthly_generations INTEGER NOT NULL,
    max_model_size BIGINT,
    priority_queue BOOLEAN NOT NULL DEFAULT FALSE,
    max_pages INTEGER,
    
    features JSONB NOT NULL DEFAULT '[]',
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_display_order ON subscription_plans(display_order);

CREATE TRIGGER update_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscription_plans IS '订阅套餐表 - Stores subscription plans';
COMMENT ON COLUMN subscription_plans.name IS '套餐名称 - Plan name';
COMMENT ON COLUMN subscription_plans.price_monthly IS '月度价格 - Monthly price';
COMMENT ON COLUMN subscription_plans.price_yearly IS '年度价格 - Yearly price';
COMMENT ON COLUMN subscription_plans.storage_quota IS '存储配额 - Storage quota';
COMMENT ON COLUMN subscription_plans.monthly_generations IS '每月生成次数 - Monthly generations';
COMMENT ON COLUMN subscription_plans.features IS '功能列表JSON - Features list JSON';

-- ----------------------------------------------------------------------------
-- 7.2 订阅表 / Subscriptions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
    
    billing_cycle VARCHAR(20) NOT NULL
        CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscriptions IS '用户订阅表 - Stores user subscriptions';
COMMENT ON COLUMN subscriptions.status IS '订阅状态 - Subscription status';
COMMENT ON COLUMN subscriptions.billing_cycle IS '账单周期：monthly/yearly - Billing cycle';
COMMENT ON COLUMN subscriptions.current_period_end IS '当前周期结束时间 - Current period end time';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe订阅ID - Stripe subscription ID';

-- ----------------------------------------------------------------------------
-- 7.3 订单表 / Orders Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    items JSONB NOT NULL,
    metadata JSONB,
    customer_note TEXT,
    
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON orders(stripe_payment_intent_id);

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE orders IS '订单表 - Stores orders';
COMMENT ON COLUMN orders.order_number IS '订单号 - Order number';
COMMENT ON COLUMN orders.amount IS '金额 - Amount';
COMMENT ON COLUMN orders.status IS '订单状态：pending/paid/failed/refunded/cancelled - Order status';
COMMENT ON COLUMN orders.payment_method IS '支付方式 - Payment method';
COMMENT ON COLUMN orders.items IS '订单项JSON - Order items JSON';

-- ----------------------------------------------------------------------------
-- 7.4 发票表 / Invoices Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_url TEXT,
    
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'void')),
    
    stripe_invoice_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

COMMENT ON TABLE invoices IS '发票表 - Stores invoices';
COMMENT ON COLUMN invoices.invoice_number IS '发票号 - Invoice number';
COMMENT ON COLUMN invoices.subtotal IS '小计 - Subtotal';
COMMENT ON COLUMN invoices.tax IS '税额 - Tax amount';
COMMENT ON COLUMN invoices.total IS '总计 - Total amount';

-- ============================================================================
-- 8. 任务队列系统 / Task Queue System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 8.1 生成任务表 / Generation Tasks Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    task_type VARCHAR(50) NOT NULL
        CHECK (task_type IN ('model_generation', 'format_conversion', 'thumbnail_generation')),
    
    engine VARCHAR(50),
    
    status VARCHAR(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    celery_task_id VARCHAR(255),
    
    input_data JSONB NOT NULL,
    output_data JSONB,
    result_model_id UUID REFERENCES models_3d(id),
    
    error_message TEXT,
    error_traceback TEXT,
    
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_celery_id ON generation_tasks(celery_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON generation_tasks(created_at DESC);

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON generation_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE generation_tasks IS '3D生成任务表 - Stores 3D generation tasks';
COMMENT ON COLUMN generation_tasks.task_type IS '任务类型 - Task type';
COMMENT ON COLUMN generation_tasks.engine IS '生成引擎 - Generation engine';
COMMENT ON COLUMN generation_tasks.status IS '任务状态 - Task status';
COMMENT ON COLUMN generation_tasks.progress IS '进度百分比 - Progress percentage';
COMMENT ON COLUMN generation_tasks.celery_task_id IS 'Celery任务ID - Celery task ID';
COMMENT ON COLUMN generation_tasks.input_data IS '输入数据JSON - Input data JSON';
COMMENT ON COLUMN generation_tasks.output_data IS '输出数据JSON - Output data JSON';
COMMENT ON COLUMN generation_tasks.result_model_id IS '结果模型ID - Result model ID';

-- ============================================================================
-- 9. 审计日志系统 / Audit Log System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 9.1 操作日志表（分区表）/ Audit Logs Table (Partitioned)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    request_data JSONB,
    response_data JSONB,
    
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('success', 'failed')),
    status_code INTEGER,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 创建分区（示例：2025年4-6月）
CREATE TABLE IF NOT EXISTS audit_logs_2025_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS audit_logs_2025_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS audit_logs_2025_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS '操作审计日志表（分区表）- Stores audit logs (partitioned)';
COMMENT ON COLUMN audit_logs.action IS '操作类型 - Action type';
COMMENT ON COLUMN audit_logs.resource_type IS '资源类型 - Resource type';
COMMENT ON COLUMN audit_logs.resource_id IS '资源ID - Resource ID';
COMMENT ON COLUMN audit_logs.status IS '操作状态：success/failed - Operation status';

-- ----------------------------------------------------------------------------
-- 9.2 API调用日志表（分区表）/ API Call Logs Table (Partitioned)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS api_call_logs_2025_04 PARTITION OF api_call_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_call_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_call_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_call_logs(created_at DESC);

COMMENT ON TABLE api_call_logs IS 'API调用日志表（分区表）- Stores API call logs (partitioned)';
COMMENT ON COLUMN api_call_logs.endpoint IS 'API端点 - API endpoint';
COMMENT ON COLUMN api_call_logs.method IS 'HTTP方法 - HTTP method';
COMMENT ON COLUMN api_call_logs.status_code IS 'HTTP状态码 - HTTP status code';
COMMENT ON COLUMN api_call_logs.response_time_ms IS '响应时间（毫秒）- Response time in milliseconds';

-- ============================================================================
-- 10. 多模板系统增强表 / Multi-Template System Enhancement Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 10.1 模板版本表 / Template Versions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    version_number VARCHAR(20) NOT NULL,
    changelog TEXT,
    
    layout_config JSONB NOT NULL,
    style_config JSONB,
    component_config JSONB,
    
    is_stable BOOLEAN NOT NULL DEFAULT TRUE,
    release_notes TEXT,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_number ON template_versions(template_id, version_number DESC);

COMMENT ON TABLE template_versions IS '模板版本历史表 - Stores template version history';
COMMENT ON COLUMN template_versions.version_number IS '版本号（语义化）- Semantic version number';
COMMENT ON COLUMN template_versions.is_stable IS '是否稳定版 - Is stable release';

-- ----------------------------------------------------------------------------
-- 10.2 模板使用统计表 / Template Usage Stats Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS template_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    
    views INTEGER NOT NULL DEFAULT 0,
    previews INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0,
    purchases INTEGER NOT NULL DEFAULT 0,
    active_instances INTEGER NOT NULL DEFAULT 0,
    
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_template_date ON template_usage_stats(template_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON template_usage_stats(date);

CREATE TRIGGER update_usage_stats_updated_at 
    BEFORE UPDATE ON template_usage_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE template_usage_stats IS '模板使用统计表 - Stores template usage statistics';
COMMENT ON COLUMN template_usage_stats.views IS '浏览量 - View count';
COMMENT ON COLUMN template_usage_stats.previews IS '预览次数 - Preview count';
COMMENT ON COLUMN template_usage_stats.downloads IS '下载次数 - Download count';
COMMENT ON COLUMN template_usage_stats.purchases IS '购买次数 - Purchase count';
COMMENT ON COLUMN template_usage_stats.active_instances IS '活跃实例数 - Active instances';
COMMENT ON COLUMN template_usage_stats.revenue IS '收入 - Revenue';

-- ----------------------------------------------------------------------------
-- 10.3 用户自定义区块库 / User Custom Blocks Library
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_custom_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    block_type VARCHAR(50) NOT NULL
        CHECK (block_type IN ('hero', 'gallery', 'text', 'video', '3d_viewer', 'contact', 'custom')),
    
    thumbnail_url TEXT,
    
    config_schema JSONB NOT NULL,
    default_config JSONB NOT NULL,
    
    html_template TEXT,
    css_styles TEXT,
    js_logic TEXT,
    
    category VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_blocks_user_id ON user_custom_blocks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custom_blocks_type ON user_custom_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_custom_blocks_is_public ON user_custom_blocks(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_custom_blocks_tags ON user_custom_blocks USING GIN(tags);

CREATE TRIGGER update_custom_blocks_updated_at 
    BEFORE UPDATE ON user_custom_blocks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_custom_blocks IS '用户自定义区块库 - Stores user custom blocks';
COMMENT ON COLUMN user_custom_blocks.config_schema IS '配置Schema（JSON Schema）- Configuration schema';
COMMENT ON COLUMN user_custom_blocks.default_config IS '默认配置 - Default configuration';
COMMENT ON COLUMN user_custom_blocks.html_template IS 'HTML模板 - HTML template';
COMMENT ON COLUMN user_custom_blocks.css_styles IS 'CSS样式 - CSS styles';
COMMENT ON COLUMN user_custom_blocks.js_logic IS 'JavaScript逻辑 - JavaScript logic';
COMMENT ON COLUMN user_custom_blocks.is_public IS '是否公开分享 - Is publicly shared';

-- ============================================================================
-- 11. 初始化数据 / Initial Data
-- ============================================================================

-- 插入默认套餐 / Insert default subscription plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, 
                                 storage_quota, monthly_generations, max_model_size, 
                                 priority_queue, max_pages, features, is_active, is_popular, display_order)
VALUES 
('免费版', 'free', '适合个人用户体验', 0, 0, 
 1073741824, 10, 10485760, FALSE, 1, 
 '["10次/月3D生成", "1GB存储空间", "基础支持"]'::jsonb, TRUE, FALSE, 1),
('专业版', 'pro', '适合专业设计师', 29.99, 299.99, 
 107374182400, 100, 104857600, TRUE, 10, 
 '["100次/月3D生成", "100GB存储空间", "优先队列", "高清纹理生成", "优先技术支持"]'::jsonb, TRUE, TRUE, 2),
('企业版', 'enterprise', '适合团队和企业', 99.99, 999.99, 
 1099511627776, 1000, 1073741824, TRUE, -1, 
 '["无限次3D生成", "1TB存储空间", "最高优先级", "API访问", "专属技术支持", "定制开发"]'::jsonb, TRUE, FALSE, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 完成提示 / Completion Message
-- ============================================================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '数据库初始化完成 / Database initialized successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已创建表数量 / Tables created: %', table_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '核心表清单 / Core tables:';
    RAISE NOTICE '  ✓ users (用户表)';
    RAISE NOTICE '  ✓ user_sessions (会话表)';
    RAISE NOTICE '  ✓ user_oauth_bindings (OAuth绑定表)';
    RAISE NOTICE '  ✓ models_3d (3D模型表)';
    RAISE NOTICE '  ✓ model_versions (模型版本表)';
    RAISE NOTICE '  ✓ model_favorites (收藏表)';
    RAISE NOTICE '  ✓ model_comments (评论表)';
    RAISE NOTICE '  ✓ model_likes (点赞表)';
    RAISE NOTICE '  ✓ templates (模板表)';
    RAISE NOTICE '  ✓ template_versions (模板版本表) [新增]';
    RAISE NOTICE '  ✓ template_ratings (模板评分表)';
    RAISE NOTICE '  ✓ template_usage_stats (模板使用统计) [新增]';
    RAISE NOTICE '  ✓ user_pages (用户页面表)';
    RAISE NOTICE '  ✓ page_sections (页面区块表)';
    RAISE NOTICE '  ✓ user_custom_blocks (自定义区块库) [新增]';
    RAISE NOTICE '  ✓ subscription_plans (套餐表)';
    RAISE NOTICE '  ✓ subscriptions (订阅表)';
    RAISE NOTICE '  ✓ orders (订单表)';
    RAISE NOTICE '  ✓ invoices (发票表)';
    RAISE NOTICE '  ✓ generation_tasks (生成任务表)';
    RAISE NOTICE '  ✓ audit_logs (审计日志表)';
    RAISE NOTICE '  ✓ api_call_logs (API日志表)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已插入初始数据 / Initial data inserted:';
    RAISE NOTICE '  ✓ 3个订阅套餐 (免费/专业/企业)';
    RAISE NOTICE '========================================';
END $$;
