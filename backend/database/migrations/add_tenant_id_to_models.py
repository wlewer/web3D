"""
为业务表添加 tenant_id 列的数据库迁移脚本
Database migration script to add tenant_id column to business tables:
  - models_3d
  - website_templates
  - nav_menus
  - template_slots

All columns are nullable for backward compatibility — existing rows
keep tenant_id=NULL and are visible to platform admins only.
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


# 需要添加 tenant_id 的表 / Tables that need tenant_id column
TENANT_AWARE_TABLES = [
    ("models_3d", "idx_models_3d_tenant_id"),
    ("website_templates", "idx_website_templates_tenant_id"),
    ("nav_menus", "idx_nav_menus_tenant_id"),
    ("template_slots", "idx_template_slots_tenant_id"),
]


def add_tenant_id_to_models():
    """为所有业务表添加 tenant_id 列"""
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

        for table_name, index_name in TENANT_AWARE_TABLES:
            # 检查表是否存在
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,)
            )
            if not cursor.fetchone():
                logger.warning(f"  Table '{table_name}' does not exist, skipping")
                continue

            # 检查 tenant_id 列是否已存在
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in cursor.fetchall()]

            if "tenant_id" not in columns:
                cursor.execute(f"""
                    ALTER TABLE {table_name} ADD COLUMN tenant_id VARCHAR(36)
                """)
                logger.info(f"  Added tenant_id column to '{table_name}' table")
            else:
                logger.info(f"  tenant_id column already exists in '{table_name}' table, skipping")

            # 创建索引（idempotent）
            cursor.execute(f"""
                CREATE INDEX IF NOT EXISTS {index_name}
                ON {table_name}(tenant_id)
            """)
            logger.info(f"  Index '{index_name}' ensured on '{table_name}.tenant_id'")

        conn.commit()
        conn.close()

        print("✅ Tenant ID columns added to business tables successfully!")
        print("\nMigration summary:")
        for table_name, index_name in TENANT_AWARE_TABLES:
            print(f"  {table_name}:")
            print(f"    - tenant_id: VARCHAR(36) FK -> tenants.id (nullable, backward compatible)")
            print(f"    - index: {index_name}")

        return True

    except Exception as e:
        print(f"❌ Failed to add tenant_id columns: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = add_tenant_id_to_models()
    sys.exit(0 if success else 1)
