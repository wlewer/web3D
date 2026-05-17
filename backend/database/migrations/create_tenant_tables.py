"""
创建租户相关表的数据库迁移脚本
Database migration script to create tenants and tenant_configs tables,
and add tenant_id column to users table
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

import sqlite3
import logging
import uuid
import secrets

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')


def create_tenant_tables():
    """创建tenants和tenant_configs表，并为users表添加tenant_id列"""
    try:
        # 查找SQLite数据库路径（优先使用app配置中的数据库）
        # 配置默认指向 ./web3d_test.db
        db_candidates = [
            backend_dir / "web3d_test.db",
            backend_dir / "web3d.db",
            backend_dir / "database" / "web3d.db",
        ]
        db_path = None
        for candidate in db_candidates:
            if candidate.exists():
                db_path = candidate
                break

        if db_path is None:
            logger.error("No SQLite database found. Searched: %s", [str(c) for c in db_candidates])
            return False

        logger.info(f"Connecting to database: {db_path}")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # ============================================================
        # 1. 创建 tenants 表
        # ============================================================
        logger.info("Creating tenants table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tenants (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(100) NOT NULL UNIQUE,
                domain VARCHAR(255),
                api_key VARCHAR(255) UNIQUE,
                plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                max_models INTEGER DEFAULT 10,
                max_storage_bytes BIGINT DEFAULT 1073741824,
                max_ai_generations_monthly INTEGER DEFAULT 50,
                max_pages INTEGER DEFAULT 5,
                owner_user_id VARCHAR(36),
                logo_url VARCHAR(500),
                favicon_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (owner_user_id) REFERENCES users(id)
            )
        """)

        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tenants_slug
            ON tenants(slug)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tenants_api_key
            ON tenants(api_key)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tenants_plan_type
            ON tenants(plan_type)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tenants_status
            ON tenants(status)
        """)

        # ============================================================
        # 2. 创建 tenant_configs 表
        # ============================================================
        logger.info("Creating tenant_configs table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tenant_configs (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) NOT NULL UNIQUE,
                theme_config TEXT,
                site_title VARCHAR(255),
                site_description TEXT,
                meta_keywords VARCHAR(500),
                features_enabled TEXT,
                custom_head_html TEXT,
                custom_footer_html TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
        """)

        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tenant_configs_tenant_id
            ON tenant_configs(tenant_id)
        """)

        # ============================================================
        # 3. 为 users 表添加 tenant_id 列（向后兼容）
        # ============================================================
        logger.info("Adding tenant_id column to users table...")

        # 检查列是否已存在
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]

        if "tenant_id" not in columns:
            cursor.execute("""
                ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36)
            """)
            logger.info("  Added tenant_id column to users table")
        else:
            logger.info("  tenant_id column already exists in users table, skipping")

        # 创建索引（idempotent）
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_tenant_id
            ON users(tenant_id)
        """)

        conn.commit()
        conn.close()

        print("✅ Tenant tables created successfully!")
        print("\nTable schema summary:")
        print("  tenants:")
        print("    - id: VARCHAR(36) PRIMARY KEY")
        print("    - name: VARCHAR(255) NOT NULL")
        print("    - slug: VARCHAR(100) NOT NULL UNIQUE")
        print("    - domain: VARCHAR(255)")
        print("    - api_key: VARCHAR(255) UNIQUE")
        print("    - plan_type: VARCHAR(50) DEFAULT 'free'")
        print("    - status: VARCHAR(20) DEFAULT 'active'")
        print("    - max_models: INTEGER DEFAULT 10")
        print("    - max_storage_bytes: BIGINT DEFAULT 1073741824")
        print("    - max_ai_generations_monthly: INTEGER DEFAULT 50")
        print("    - max_pages: INTEGER DEFAULT 5")
        print("    - owner_user_id: VARCHAR(36) FK -> users.id")
        print("    - logo_url: VARCHAR(500)")
        print("    - favicon_url: VARCHAR(500)")
        print("    - created_at, updated_at, expires_at: TIMESTAMP")
        print("  tenant_configs:")
        print("    - id: VARCHAR(36) PRIMARY KEY")
        print("    - tenant_id: VARCHAR(36) NOT NULL UNIQUE FK -> tenants.id")
        print("    - theme_config: TEXT (JSON)")
        print("    - site_title, site_description, meta_keywords")
        print("    - features_enabled: TEXT (JSON)")
        print("    - custom_head_html, custom_footer_html: TEXT")
        print("    - created_at, updated_at: TIMESTAMP")
        print("  users:")
        print("    - tenant_id: VARCHAR(36) FK -> tenants.id (nullable, backward compatible)")

        return True

    except Exception as e:
        print(f"❌ Failed to create tenant tables: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_tenant_tables()
    sys.exit(0 if success else 1)
