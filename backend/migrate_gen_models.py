"""
迁移脚本: 将 uploads/generation/ 下的生成模型迁移到 models/generated/ 统一管理

执行步骤:
  1. 扫描 uploads/generation/ 下所有子目录
  2. 找到 .glb 模型文件（跳过 imported_*/mock_* 等测试目录）
  3. 移动到 models/generated/{uuid}.glb
  4. 创建数据库记录（状态 approved, URL = /static-models/generated/{uuid}.glb）
  5. 清理原目录（如已空则删除）
"""
import asyncio
import os
import shutil
import uuid as uuid_mod
from pathlib import Path
from datetime import datetime
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_maker
from app.models.model import Model3D


# 项目根目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))  # backend/
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # web3D/

# 源目录和目标目录
GEN_DIR = os.path.join(SCRIPT_DIR, "uploads", "generation")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models", "generated")

# 跳过目录前缀（测试/模拟/已导入副本）
SKIP_PREFIXES = ('imported_', 'mock_', 'instantmesh_', 'sf3d_', 'triposr_')


def detect_engine(dir_name: str) -> str:
    """从目录名检测生成引擎"""
    if dir_name.startswith('hunyuan_') or dir_name.startswith('hy3d-'):
        return '混元3D'
    return 'AI生成'


def beautify_name(dir_name: str, filename: str) -> str:
    """美化文件名作为显示名称"""
    # 去掉 model_ 前缀和 .glb 后缀
    name = filename
    if name.lower().startswith('model'):
        name = name[5:]  # 去掉 "model" 或 "model_"
    name = os.path.splitext(name)[0]
    name = name.replace('_', ' ').replace('-', ' ').strip()
    name = ' '.join(w.capitalize() for w in name.split() if w)
    if not name:
        name = dir_name
    return name


async def migrate_generated_models():
    """扫描并迁移生成模型"""
    gen_path = Path(GEN_DIR)
    if not gen_path.exists():
        print(f"❌ 目录不存在: {GEN_DIR}")
        return

    # 确保目标目录存在
    os.makedirs(MODELS_DIR, exist_ok=True)

    # 收集可迁移的模型文件
    candidates = []
    for subdir in sorted(gen_path.iterdir()):
        if not subdir.is_dir():
            continue  # 根目录的 .png 源图片跳过

        dir_name = subdir.name

        # 跳过测试/模拟目录
        if any(dir_name.startswith(p) for p in SKIP_PREFIXES):
            print(f"  ⏭️  跳过测试目录: {dir_name}")
            continue

        # 查找目录中的 GLB 文件
        glb_files = list(subdir.glob("*.glb"))
        if not glb_files:
            print(f"  ⏭️  无 GLB 文件: {dir_name}")
            continue

        glb_file = glb_files[0]  # 通常每个目录只有一个
        file_size = glb_file.stat().st_size

        candidates.append({
            'dir_name': dir_name,
            'src_path': str(glb_file),
            'file_size': file_size,
        })
        print(f"  📦 [{dir_name}] {glb_file.name} ({file_size / 1024 / 1024:.1f}MB)")

    if not candidates:
        print("\n⚠️  没有找到可迁移的生成模型")
        return

    print(f"\n📊 共发现 {len(candidates)} 个生成模型，开始迁移...\n")

    # 导入数据库
    async with async_session_maker() as session:
        migrated_count = 0
        skipped_count = 0

        for c in candidates:
            model_id = str(uuid_mod.uuid4())
            static_filename = f"{model_id}.glb"
            dst_path = os.path.join(MODELS_DIR, static_filename)

            # 移动文件
            try:
                shutil.move(c['src_path'], dst_path)
                print(f"  ✅ 已移动: {c['dir_name']} → models/generated/{static_filename}")

                # 清理原目录（如已空）
                src_dir = os.path.dirname(c['src_path'])
                try:
                    remaining = os.listdir(src_dir)
                    if not remaining:
                        os.rmdir(src_dir)
                        print(f"     🗑️  已删除空目录: {c['dir_name']}")
                except OSError:
                    pass  # 删除失败不影响

            except Exception as e:
                print(f"  ❌ 移动失败: {c['dir_name']} - {e}")
                continue

            # 生成显示名称
            engine = detect_engine(c['dir_name'])
            src_basename = os.path.basename(c['src_path'])
            display_name = beautify_name(c['dir_name'], src_basename)
            if not display_name:
                display_name = f"{engine}_{c['dir_name'][:8]}"

            # 构建 URL
            model_url = f"/static-models/generated/{static_filename}"

            # 创建 DB 记录
            model = Model3D(
                id=model_id,
                name=display_name,
                description=f"从生成目录迁移: {c['dir_name']}/{src_basename}",
                category='other',
                status='approved',
                model_url=model_url,
                format='glb',
                file_size=c['file_size'],
                created_by='00000000-0000-0000-0000-000000000001',
                tags=[engine, "迁移"],
            )
            session.add(model)
            migrated_count += 1

        await session.commit()
        print(f"\n📊 迁移完成: 成功 {migrated_count}, 跳过 {skipped_count}, 总计 {len(candidates)}")


if __name__ == '__main__':
    asyncio.run(migrate_generated_models())
