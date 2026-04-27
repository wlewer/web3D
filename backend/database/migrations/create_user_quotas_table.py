"""
创建用户额度表的数据库迁移脚本
Database migration script to create user_quotas table
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import engine, Base
from app.models.quota import UserQuota
from loguru import logger


def create_quota_table():
    """创建user_quotas表"""
    try:
        logger.info("Creating user_quotas table...")
        
        # 只创建UserQuota表
        UserQuota.__table__.create(engine, checkfirst=True)
        
        logger.success("✅ user_quotas table created successfully!")
        logger.info(f"Table schema:")
        logger.info(f"  - id: String(36) PRIMARY KEY")
        logger.info(f"  - user_id: String(36) FOREIGN KEY -> users.id")
        logger.info(f"  - total_quota: BigInteger (default: 200)")
        logger.info(f"  - used_quota: BigInteger (default: 0)")
        logger.info(f"  - remaining_quota: BigInteger (default: 200)")
        logger.info(f"  - package_type: String(50)")
        logger.info(f"  - package_name: String(100)")
        logger.info(f"  - starts_at: DateTime")
        logger.info(f"  - expires_at: DateTime (nullable)")
        logger.info(f"  - total_generations: Integer (default: 0)")
        logger.info(f"  - successful_generations: Integer (default: 0)")
        logger.info(f"  - failed_generations: Integer (default: 0)")
        logger.info(f"  - last_used_at: DateTime (nullable)")
        logger.info(f"  - created_at: DateTime")
        logger.info(f"  - updated_at: DateTime")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create user_quotas table: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_quota_table()
    sys.exit(0 if success else 1)
