"""
SQLite → PostgreSQL 数据迁移工具

用法：
    python scripts/migrate_to_postgres.py --sqlite-path ./web3d_test.db --pg-url postgresql://user:pass@host:5432/web3d

说明：
    1. 连接SQLite读取所有表数据
    2. 连接PostgreSQL（使用psycopg2同步驱动）
    3. 按依赖顺序逐表迁移（先users，再依赖users的表）
    4. 验证行数一致性
    5. 输出迁移报告

依赖：
    pip install sqlalchemy psycopg2-binary
"""
import argparse
import sys
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse

from sqlalchemy import create_engine, select, insert, text, MetaData
from sqlalchemy.orm import sessionmaker

# 将 backend 目录加入路径，以便导入模型
_BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(_BACKEND_DIR))

# 必须先导入Base，再导入所有模型，确保metadata注册完整
from app.database import Base
from app.models import user, model, quota, template, settings, website_template

# 表迁移顺序（按外键依赖排序，父表在前）
MIGRATION_ORDER = [
    "users",
    "models_3d",
    "user_quotas",
    "scene_templates",
    "template_versions",
    "homepage_settings",
    "user_settings",
    "website_templates",
    "nav_menus",
    "template_slots",
    "registered_components",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="SQLite → PostgreSQL 数据迁移工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  python scripts/migrate_to_postgres.py
  python scripts/migrate_to_postgres.py --sqlite-path ./web3d.db --pg-url postgresql://web3d_user:pass@localhost:5432/web3d
  python scripts/migrate_to_postgres.py --skip-init  # 只迁移数据，不初始化表结构
        """,
    )
    parser.add_argument(
        "--sqlite-path",
        default="./web3d_test.db",
        help="SQLite数据库文件路径 (默认: ./web3d_test.db)",
    )
    parser.add_argument(
        "--pg-url",
        default="postgresql://web3d_user:web3d_password_2025@localhost:5432/web3d",
        help="PostgreSQL连接URL (默认: postgresql://web3d_user:web3d_password_2025@localhost:5432/web3d)",
    )
    parser.add_argument(
        "--init-sql",
        default=str(_BACKEND_DIR / "database" / "init_database.sql"),
        help="PostgreSQL初始化SQL脚本路径",
    )
    parser.add_argument(
        "--skip-init",
        action="store_true",
        help="跳过表结构初始化（假设PostgreSQL表已存在）",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="跳过确认提示，直接执行",
    )
    return parser.parse_args()


def normalize_pg_url(url: str) -> str:
    """将异步URL转换为同步psycopg2 URL"""
    # 处理 postgresql+asyncpg:// -> postgresql+psycopg2://
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    if url.startswith("postgresql://") and "psycopg2" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def fix_timestamp(value):
    """修复SQLite中无时区的时间戳，确保PostgreSQL TIMESTAMPTZ兼容"""
    if value is None:
        return None
    if isinstance(value, str):
        # 尝试解析ISO格式
        try:
            dt = datetime.fromisoformat(value)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            return value
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def fix_row(row: dict) -> dict:
    """对一行数据进行类型修复"""
    return {k: fix_timestamp(v) for k, v in row.items()}


def init_postgres_schema(pg_engine, init_sql_path: Path) -> None:
    """使用init_database.sql初始化PostgreSQL表结构"""
    import psycopg2

    parsed = urlparse(str(pg_engine.url))
    # psycopg2连接参数
    conn_kwargs = {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/") if parsed.path else "web3d",
    }
    if parsed.username:
        conn_kwargs["user"] = parsed.username
    if parsed.password:
        conn_kwargs["password"] = parsed.password

    conn = psycopg2.connect(**conn_kwargs)
    conn.autocommit = True
    cur = conn.cursor()

    sql = init_sql_path.read_text(encoding="utf-8")
    # PostgreSQL不支持通过单个execute执行多个语句，需要分割
    # 但 psycopg2 cursor.execute() 可以执行包含多个语句的字符串
    cur.execute(sql)
    cur.close()
    conn.close()
    print(f"[INIT] 已执行初始化脚本: {init_sql_path}")


def create_schema_via_sqlalchemy(pg_engine) -> None:
    """使用SQLAlchemy Base.metadata.create_all()创建表"""
    Base.metadata.create_all(pg_engine)
    print("[INIT] 已通过SQLAlchemy创建表结构")


def migrate_table(sqlite_session, pg_session, table_name: str) -> dict:
    """迁移单表数据，返回统计信息"""
    table = Base.metadata.tables.get(table_name)
    if table is None:
        return {"sqlite": 0, "postgres": 0, "status": "not_in_metadata"}

    # 1. 从SQLite读取
    rows = sqlite_session.execute(select(table)).mappings().all()
    sqlite_count = len(rows)

    if sqlite_count == 0:
        return {"sqlite": 0, "postgres": 0, "status": "empty"}

    # 2. 清空PostgreSQL目标表（避免重复数据）
    pg_session.execute(text(f'TRUNCATE TABLE "{table_name}" CASCADE'))
    pg_session.commit()

    # 3. 对nav_menus做特殊处理：先插parent_id为NULL的根节点，再插其余节点
    if table_name == "nav_menus":
        root_rows = [r for r in rows if r.get("parent_id") is None]
        child_rows = [r for r in rows if r.get("parent_id") is not None]

        if root_rows:
            pg_session.execute(
                insert(table), [fix_row(dict(r)) for r in root_rows]
            )
            pg_session.commit()

        if child_rows:
            pg_session.execute(
                insert(table), [fix_row(dict(r)) for r in child_rows]
            )
            pg_session.commit()
    else:
        # 普通表直接批量插入
        pg_session.execute(
            insert(table), [fix_row(dict(r)) for r in rows]
        )
        pg_session.commit()

    # 4. 验证PostgreSQL行数
    pg_count = pg_session.execute(
        text(f'SELECT COUNT(*) FROM "{table_name}"')
    ).scalar()

    status = "ok" if pg_count == sqlite_count else "mismatch"
    return {"sqlite": sqlite_count, "postgres": pg_count, "status": status}


def main():
    args = parse_args()

    sqlite_path = Path(args.sqlite_path).resolve()
    if not sqlite_path.exists():
        print(f"❌ SQLite数据库不存在: {sqlite_path}")
        sys.exit(1)

    pg_url = normalize_pg_url(args.pg_url)
    init_sql_path = Path(args.init_sql)

    print("=" * 60)
    print("SQLite → PostgreSQL 数据迁移工具")
    print("=" * 60)
    print(f"SQLite源:  {sqlite_path}")
    print(f"PostgreSQL目标: {pg_url.replace('postgresql+psycopg2://', 'postgresql://')}")
    print(f"初始化SQL: {init_sql_path} (存在: {init_sql_path.exists()})")
    print("=" * 60)

    if not args.yes:
        confirm = input("确认开始迁移? [y/N]: ")
        if confirm.lower() not in ("y", "yes"):
            print("已取消")
            sys.exit(0)

    # 创建引擎
    sqlite_engine = create_engine(f"sqlite:///{sqlite_path}")
    pg_engine = create_engine(pg_url)

    # 检查SQLite中实际存在的表
    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)
    sqlite_tables = set(sqlite_meta.tables.keys())

    # 初始化PostgreSQL表结构
    if not args.skip_init:
        if init_sql_path.exists():
            try:
                init_postgres_schema(pg_engine, init_sql_path)
            except Exception as e:
                print(f"⚠️ 执行init.sql失败: {e}")
                print("尝试使用SQLAlchemy创建表结构...")
                create_schema_via_sqlalchemy(pg_engine)
        else:
            print("⚠️ 初始化SQL脚本不存在，使用SQLAlchemy创建表结构")
            create_schema_via_sqlalchemy(pg_engine)
    else:
        print("[INIT] 跳过表结构初始化 (--skip-init)")

    # 迁移数据
    sqlite_session = sessionmaker(sqlite_engine)()
    pg_session = sessionmaker(pg_engine)()

    report: dict[str, dict] = {}

    try:
        # 临时禁用外键约束检查（防御性措施）
        pg_session.execute(text("SET session_replication_role = 'replica';"))
        pg_session.commit()

        for table_name in MIGRATION_ORDER:
            if table_name not in sqlite_tables:
                report[table_name] = {
                    "sqlite": 0,
                    "postgres": 0,
                    "status": "not_in_sqlite",
                }
                print(f"⏭️  {table_name:30s} SQLite中不存在，跳过")
                continue

            info = migrate_table(sqlite_session, pg_session, table_name)
            report[table_name] = info

            icon = "✅" if info["status"] == "ok" else "❌"
            print(
                f"{icon} {table_name:30s} "
                f"SQLite: {info['sqlite']:4d}  →  PostgreSQL: {info['postgres']:4d}"
            )

        # 恢复外键约束
        pg_session.execute(text("SET session_replication_role = 'origin';"))
        pg_session.commit()

    except Exception as e:
        pg_session.rollback()
        print(f"\n❌ 迁移过程中发生错误: {e}")
        raise

    finally:
        sqlite_session.close()
        pg_session.close()

    # 输出最终报告
    print("\n" + "=" * 60)
    print("迁移报告 / Migration Report")
    print("=" * 60)

    total_ok = 0
    total_mismatch = 0
    total_skipped = 0

    for table_name, info in report.items():
        status = info["status"]
        if status == "ok":
            total_ok += 1
        elif status == "mismatch":
            total_mismatch += 1
        else:
            total_skipped += 1

        icon = {"ok": "✅", "mismatch": "❌"}.get(status, "⏭️")
        print(
            f"{icon} {table_name:30s} SQLite: {info['sqlite']:4d}  PostgreSQL: {info['postgres']:4d}  [{status}]"
        )

    print("=" * 60)
    print(f"总计: {total_ok} 成功, {total_mismatch} 不一致, {total_skipped} 跳过/空表")

    if total_mismatch > 0:
        print("\n❌ 迁移完成，但部分表行数不一致，请检查！")
        sys.exit(1)
    else:
        print("\n✅ 迁移完成，所有表数据一致！")


if __name__ == "__main__":
    main()
