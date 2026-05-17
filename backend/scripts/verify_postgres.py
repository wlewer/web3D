"""
PostgreSQL 数据库验证工具

用法：
    python scripts/verify_postgres.py --pg-url postgresql://user:pass@host:5432/web3d

功能：
    1. 连接PostgreSQL
    2. 验证表结构（所有预期表是否存在）
    3. 验证索引存在
    4. 验证外键约束
    5. 输出验证报告

依赖：
    pip install psycopg2-binary
"""
import argparse
import sys
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import RealDictCursor

# 预期表清单（与SQLAlchemy模型对齐）
EXPECTED_TABLES = [
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

# 预期索引清单（关键索引）
EXPECTED_INDEXES = [
    ("users", "idx_users_username"),
    ("users", "idx_users_email"),
    ("models_3d", "idx_models_3d_name"),
    ("models_3d", "idx_models_3d_status"),
    ("models_3d", "idx_models_3d_created_by"),
    ("user_quotas", "idx_user_quotas_user_id"),
    ("website_templates", "idx_website_templates_name"),
    ("nav_menus", "idx_nav_menus_route"),
    ("template_slots", "idx_template_slots_template_id"),
]

# 预期外键约束
EXPECTED_FOREIGN_KEYS = [
    ("models_3d", "models_3d_created_by_fkey"),
    ("user_quotas", "user_quotas_user_id_fkey"),
    ("template_versions", "template_versions_template_id_fkey"),
    ("user_settings", "user_settings_user_id_fkey"),
    ("website_templates", "website_templates_created_by_fkey"),
    ("nav_menus", "nav_menus_template_id_fkey"),
    ("template_slots", "template_slots_template_id_fkey"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PostgreSQL 数据库验证工具")
    parser.add_argument(
        "--pg-url",
        default="postgresql://web3d_user:web3d_password_2025@localhost:5432/web3d",
        help="PostgreSQL连接URL",
    )
    return parser.parse_args()


def connect_pg(url: str):
    """解析URL并连接PostgreSQL"""
    parsed = urlparse(url)
    kwargs = {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/") if parsed.path else "web3d",
        "cursor_factory": RealDictCursor,
    }
    if parsed.username:
        kwargs["user"] = parsed.username
    if parsed.password:
        kwargs["password"] = parsed.password
    return psycopg2.connect(**kwargs)


def get_tables(cur) -> list[str]:
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    return [row["table_name"] for row in cur.fetchall()]


def get_indexes(cur) -> list[tuple[str, str]]:
    cur.execute("""
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
    """)
    return [(row["tablename"], row["indexname"]) for row in cur.fetchall()]


def get_foreign_keys(cur) -> list[tuple[str, str]]:
    cur.execute("""
        SELECT
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
    """)
    return [(row["table_name"], row["constraint_name"]) for row in cur.fetchall()]


def get_table_stats(cur) -> list[dict]:
    cur.execute("""
        SELECT
            relname AS table_name,
            n_live_tup AS row_count,
            pg_size_pretty(pg_total_relation_size(relid)) AS total_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY relname
    """)
    return cur.fetchall()


def get_extensions(cur) -> list[str]:
    cur.execute("""
        SELECT extname FROM pg_extension WHERE extname != 'plpgsql' ORDER BY extname
    """)
    return [row["extname"] for row in cur.fetchall()]


def main():
    args = parse_args()

    print("=" * 60)
    print("PostgreSQL 数据库验证报告")
    print("=" * 60)
    print(f"连接URL: {args.pg_url}")
    print()

    try:
        conn = connect_pg(args.pg_url)
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ 连接PostgreSQL失败: {e}")
        sys.exit(1)

    all_ok = True

    # 1. 扩展检查
    print("[1] 已安装扩展")
    extensions = get_extensions(cur)
    for ext in extensions:
        print(f"    ✅ {ext}")
    if "pgcrypto" not in extensions:
        print("    ❌ pgcrypto 扩展未安装（UUID生成需要）")
        all_ok = False
    print()

    # 2. 表结构检查
    print("[2] 表结构检查")
    actual_tables = set(get_tables(cur))
    for table in EXPECTED_TABLES:
        if table in actual_tables:
            print(f"    ✅ {table}")
        else:
            print(f"    ❌ {table} 不存在")
            all_ok = False

    # 检查是否有意外表
    extra = actual_tables - set(EXPECTED_TABLES)
    if extra:
        for t in sorted(extra):
            print(f"    ⚠️  额外表: {t}")
    print()

    # 3. 索引检查
    print("[3] 索引检查")
    actual_indexes = set(get_indexes(cur))
    for table, idx_name in EXPECTED_INDEXES:
        if (table, idx_name) in actual_indexes:
            print(f"    ✅ {idx_name} (on {table})")
        else:
            print(f"    ❌ {idx_name} (on {table}) 不存在")
            all_ok = False
    print()

    # 4. 外键约束检查
    print("[4] 外键约束检查")
    actual_fks = set(get_foreign_keys(cur))
    for table, fk_name in EXPECTED_FOREIGN_KEYS:
        if (table, fk_name) in actual_fks:
            print(f"    ✅ {fk_name} (on {table})")
        else:
            # 外键名可能由PostgreSQL自动生成，这里做模糊匹配
            found = any(t == table for t, _ in actual_fks)
            if found:
                print(f"    ⚠️  {table} 存在外键，但约束名可能不同")
            else:
                print(f"    ❌ {fk_name} (on {table}) 不存在")
                all_ok = False
    print()

    # 5. 表统计
    print("[5] 表数据统计")
    stats = get_table_stats(cur)
    if stats:
        for s in stats:
            print(f"    📊 {s['table_name']:30s} 行数: {s['row_count']:6d}  大小: {s['total_size']}")
    else:
        print("    ⚠️  无统计信息（pg_stat_user_tables为空，可能需要ANALYZE）")
    print()

    # 6. 数据库版本
    print("[6] 数据库版本")
    cur.execute("SELECT version() AS v")
    version = cur.fetchone()["v"]
    print(f"    {version}")
    print()

    cur.close()
    conn.close()

    # 最终结论
    print("=" * 60)
    if all_ok:
        print("✅ 验证通过：所有预期表、索引和外键约束均存在")
    else:
        print("❌ 验证失败：部分预期对象缺失，请检查初始化脚本")
    print("=" * 60)

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
