"""
创建用户额度表的数据库迁移脚本（简化版）
Database migration script to create user_quotas table (simplified version)
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# 直接导入SQLite
import sqlite3
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')


def create_quota_table():
    """创建user_quotas表"""
    try:
        # SQLite数据库路径
        db_path = backend_dir / "web3d.db"
        
        logger.info(f"Connecting to database: {db_path}")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        logger.info("Creating user_quotas table...")
        
        # 创建user_quotas表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_quotas (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL UNIQUE,
                total_quota BIGINT NOT NULL DEFAULT 200,
                used_quota BIGINT NOT NULL DEFAULT 0,
                remaining_quota BIGINT NOT NULL DEFAULT 200,
                package_type VARCHAR(50) NOT NULL DEFAULT 'standard',
                package_name VARCHAR(100),
                starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                total_generations INTEGER NOT NULL DEFAULT 0,
                successful_generations INTEGER NOT NULL DEFAULT 0,
                failed_generations INTEGER NOT NULL DEFAULT 0,
                last_used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id 
            ON user_quotas(user_id)
        """)
        
        conn.commit()
        conn.close()
        
        print("✅ user_quotas table created successfully!")
        print("Table schema:")
        print(f"  - id: VARCHAR(36) PRIMARY KEY")
        print(f"  - user_id: VARCHAR(36) UNIQUE FOREIGN KEY -> users.id")
        print(f"  - total_quota: BIGINT (default: 200)")
        print(f"  - used_quota: BIGINT (default: 0)")
        print(f"  - remaining_quota: BIGINT (default: 200)")
        print(f"  - package_type: VARCHAR(50)")
        print(f"  - package_name: VARCHAR(100)")
        print(f"  - starts_at: TIMESTAMP")
        print(f"  - expires_at: TIMESTAMP (nullable)")
        print(f"  - total_generations: INTEGER (default: 0)")
        print(f"  - successful_generations: INTEGER (default: 0)")
        print(f"  - failed_generations: INTEGER (default: 0)")
        print(f"  - last_used_at: TIMESTAMP (nullable)")
        print(f"  - created_at: TIMESTAMP")
        print(f"  - updated_at: TIMESTAMP")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create user_quotas table: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_quota_table()
    sys.exit(0 if success else 1)
