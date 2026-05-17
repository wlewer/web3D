"""
创建页面搭建器相关表的数据库迁移脚本
Database migration script to create pages and page_versions tables
Idempotent: checks if tables exist before creating
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

import sqlite3
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')


def create_pages_tables():
    """创建pages和page_versions表（幂等执行）"""
    try:
        # 查找SQLite数据库路径
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
        # 1. 检查并创建 pages 表
        # ============================================================
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='pages'"
        )
        if cursor.fetchone():
            logger.info("Table 'pages' already exists, skipping creation")
        else:
            logger.info("Creating pages table...")
            cursor.execute("""
                CREATE TABLE pages (
                    id VARCHAR(36) PRIMARY KEY,
                    tenant_id VARCHAR(36),
                    title VARCHAR(200) NOT NULL,
                    slug VARCHAR(200) NOT NULL,
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'draft',
                    current_version INTEGER DEFAULT 1,
                    schema_json TEXT,
                    published_schema_json TEXT,
                    seo_title VARCHAR(200),
                    seo_description TEXT,
                    is_homepage BOOLEAN DEFAULT 0,
                    created_by VARCHAR(36),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)

            # 创建索引
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_pages_tenant_id
                ON pages(tenant_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_pages_slug
                ON pages(slug)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_pages_status
                ON pages(status)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_pages_created_by
                ON pages(created_by)
            """)

            logger.info("  pages table created successfully")

        # ============================================================
        # 2. 检查并创建 page_versions 表
        # ============================================================
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='page_versions'"
        )
        if cursor.fetchone():
            logger.info("Table 'page_versions' already exists, skipping creation")
        else:
            logger.info("Creating page_versions table...")
            cursor.execute("""
                CREATE TABLE page_versions (
                    id VARCHAR(36) PRIMARY KEY,
                    page_id VARCHAR(36) NOT NULL,
                    version_number INTEGER NOT NULL,
                    schema_json TEXT NOT NULL,
                    change_summary VARCHAR(500),
                    created_by VARCHAR(36),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)

            # 创建索引
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_page_versions_page_id
                ON page_versions(page_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_page_versions_version_number
                ON page_versions(page_id, version_number)
            """)

            logger.info("  page_versions table created successfully")

        conn.commit()
        conn.close()

        print("✅ Pages tables created successfully!")
        print("\nTable schema summary:")
        print("  pages:")
        print("    - id: VARCHAR(36) PRIMARY KEY")
        print("    - tenant_id: VARCHAR(36) FK -> tenants.id (nullable)")
        print("    - title: VARCHAR(200) NOT NULL")
        print("    - slug: VARCHAR(200) NOT NULL")
        print("    - description: TEXT")
        print("    - status: VARCHAR(20) DEFAULT 'draft'")
        print("    - current_version: INTEGER DEFAULT 1")
        print("    - schema_json: TEXT (当前草稿)")
        print("    - published_schema_json: TEXT (已发布版本)")
        print("    - seo_title: VARCHAR(200)")
        print("    - seo_description: TEXT")
        print("    - is_homepage: BOOLEAN DEFAULT 0")
        print("    - created_by: VARCHAR(36) FK -> users.id")
        print("    - created_at, updated_at: TIMESTAMP")
        print("  page_versions:")
        print("    - id: VARCHAR(36) PRIMARY KEY")
        print("    - page_id: VARCHAR(36) NOT NULL FK -> pages.id ON DELETE CASCADE")
        print("    - version_number: INTEGER NOT NULL")
        print("    - schema_json: TEXT NOT NULL")
        print("    - change_summary: VARCHAR(500)")
        print("    - created_by: VARCHAR(36) FK -> users.id")
        print("    - created_at: TIMESTAMP")

        return True

    except Exception as e:
        print(f"❌ Failed to create pages tables: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_pages_tables()
    sys.exit(0 if success else 1)
