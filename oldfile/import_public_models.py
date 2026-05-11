"""
导入前端 public/models 中的现有模型到数据库
使用方式：cd backend && python import_public_models.py --yes

该脚本会：
1. 扫描前端 public/models 目录中的模型文件
2. 将其拷贝到 backend/uploads/generation/imported_xxx/ 标准化目录
3. 在 models_3d 表创建对应的数据库记录
4. model_url 指向 http://localhost:8000/generation-models/... 供前端访问
"""
import os
import sys
import shutil
import uuid
from pathlib import Path
from datetime import datetime

# 添加项目路径到 sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 配置路径
BACKEND_DIR = Path(__file__).parent
FRONTEND_PUBLIC_MODELS = Path(r"D:\HBuilderProjects\web3D\src\web-frontend\public\models")
TARGET_DIR = BACKEND_DIR / "uploads" / "generation"

# 支持的模型格式
SUPPORTED_FORMATS = {
    '.glb': 'glb',
    '.gltf': 'gltf',
    '.fbx': 'fbx',
    '.obj': 'obj',
    '.ply': 'ply',
    '.splat': 'splat',
    '.spz': 'splat',  # 压缩的splat格式
}

# 后端开发时使用 web3d_test.db（见 backend/app/config.py)
DB_PATH = BACKEND_DIR / "web3d_test.db"
if not DB_PATH.exists():
    DB_PATH = BACKEND_DIR / "database" / "web3d.db"

print(f"数据库路径: {DB_PATH}")
print(f"源目录: {FRONTEND_PUBLIC_MODELS}")
print(f"目标目录: {TARGET_DIR}")

# 扫描源目录中的模型文件
model_files = []
for f in sorted(FRONTEND_PUBLIC_MODELS.iterdir()):
    if f.is_file() and f.suffix.lower() in SUPPORTED_FORMATS:
        model_files.append(f)
    elif f.is_dir() and f.name != "panoramas":
        # 也扫描子目录
        for sub_f in sorted(f.iterdir()):
            if sub_f.is_file() and sub_f.suffix.lower() in SUPPORTED_FORMATS:
                model_files.append(sub_f)

print(f"\n找到 {len(model_files)} 个模型文件:")
for f in model_files:
    size_mb = f.stat().st_size / (1024 * 1024)
    print(f"  - {f.relative_to(FRONTEND_PUBLIC_MODELS)} ({size_mb:.1f} MB)")


def get_safe_name(filename: str) -> str:
    """从文件名提取安全目录名"""
    name = filename.rsplit('.', 1)[0]  # 去掉扩展名
    # 替换不安全字符
    for ch in r'<>:"/\|?*':
        name = name.replace(ch, '_')
    return name[:50]  # 限制长度


def import_to_db():
    """导入模型到数据库"""
    try:
        import sqlite3

        # SQLite 数据库
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 获取第一个可用的管理员用户
        cursor.execute("SELECT id, username FROM users ORDER BY role DESC LIMIT 1")
        admin_row = cursor.fetchone()
        if not admin_row:
            print("❌ 未找到管理员用户，请先创建管理员账号")
            conn.close()
            return False
        
        admin_id = admin_row[0]
        admin_name = admin_row[1]
        print(f"\n管理员用户: {admin_name} (ID: {admin_id})")

        imported_count = 0
        skipped_count = 0

        for src_file in model_files:
            fmt = SUPPORTED_FORMATS.get(src_file.suffix.lower(), 'glb')
            safe_name = get_safe_name(src_file.name)
            dir_name = f"imported_{safe_name}"
            target_dir = TARGET_DIR / dir_name
            target_path = target_dir / f"model.{fmt}"

            # 检查是否已导入
            cursor.execute(
                "SELECT id FROM models_3d WHERE model_url LIKE ?",
                (f"%{dir_name}/model.{fmt}",)
            )
            if cursor.fetchone():
                print(f"  ⏭️  已存在: {src_file.name}")
                skipped_count += 1
                continue

            # 创建目标目录
            target_dir.mkdir(parents=True, exist_ok=True)

            # 拷贝文件
            file_size = src_file.stat().st_size
            # 小文件（<100MB）直接拷贝，大文件创建硬链接
            if file_size < 100 * 1024 * 1024:
                shutil.copy2(str(src_file), str(target_path))
            else:
                # 大文件用拷贝（Windows 硬链接需要管理员权限）
                shutil.copy2(str(src_file), str(target_path))
            
            print(f"  📄 已拷贝: {src_file.name} -> {target_path}")

            # 构造中文名
            display_name = safe_name.replace('-', '_').replace('.', '_')
            model_name = f"导入模型_{display_name}"

            # 创建数据库记录
            model_id = str(uuid.uuid4())
            now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            model_url = f"http://localhost:8000/generation-models/{dir_name}/model.{fmt}"

            cursor.execute("""
                INSERT INTO models_3d (
                    id, name, description, category, status,
                    thumbnail_url, model_url, format, file_size,
                    tags, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                model_id,
                model_name,
                f"从前端资源库导入的3D模型 ({src_file.name})",
                'other',
                'approved',
                None,
                model_url,
                fmt,
                file_size,
                '["导入", "3D模型"]',
                admin_id,
                now,
                now,
            ))
            conn.commit()
            imported_count += 1
            print(f"  ✅ 已导入数据库: {model_name} (URL: {model_url})")

        conn.close()
        print(f"\n===== 导入完成 =====")
        print(f"成功导入: {imported_count} 个")
        print(f"已存在跳过: {skipped_count} 个")
        return True

    except Exception as e:
        print(f"\n❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # 支持 -y/--yes 参数跳过确认
    auto_confirm = '-y' in sys.argv or '--yes' in sys.argv
    
    if not auto_confirm:
        proceed = input("\n是否继续导入？(y/N): ").strip().lower()
        if proceed != 'y':
            print("已取消")
            sys.exit(0)
    
    import_to_db()
