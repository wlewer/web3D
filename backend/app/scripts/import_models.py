"""
Web3D Backend - 扫描 models/ 目录并导入数据库
Scan the root models/ directory and import into database

用法 / Usage:
    cd backend
    python -m app.scripts.import_models

说明：
    扫描 D:\\HBuilderProjects\\web3D\\models\\ 下的所有模型文件，
    自动分类并导入到数据库 models_3d 表中，标记为 approved 状态。
    已存在的模型（同名+路径相同）会跳过，不会重复导入。
"""
import asyncio
import os
import uuid
import sys
from pathlib import Path
from datetime import datetime
import urllib.parse

# 添加 backend 目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_maker
from app.models.model import Model3D


# 模型文件扩展名
MODEL_EXTENSIONS = {'.glb', '.gltf', '.ply', '.spz', '.obj', '.fbx', '.stl', '.splat'}

# 文件到分类的映射（基于文件名关键字）
CATEGORY_MAP = {
    '海马': 'animal',
    '龙头': 'art',
    '石屋': 'architecture',
    '塔': 'architecture',
    '厨具': 'food',
    '羊兽': 'animal',
    'logo': 'other',
    '混元': 'industry',
    '胶印机': 'industry',
    '车间': 'industry',
    'hunyuan': 'industry',
    'butterfly': 'nature',
    '蝴蝶': 'nature',
    'cat': 'animal',
    '猫咪': 'animal',
    'burger': 'food',
    '汉堡': 'food',
    'fish': 'food',
    'dessert': 'food',
    '甜点': 'food',
    'caviar': 'food',
    'fly': 'animal',
    'bike': 'vehicle',
    'car': 'vehicle',
    '汽车': 'vehicle',
}

# 子目录到分类的映射
DIR_CATEGORY_MAP = {
    '实例模型': 'art',
    '车间': 'industry',
}

# 名称修饰（美化）
NAME_BEAUTIFY = {
    'hunyuan-haima': '混元海马',
    'hunyuan车间': '混元车间',
    '混元车间-new': '混元车间全景',
    '混元-胶印机': '混元胶印机',
    'hunyuan': '混元系列',
    'butterfly': '蓝色大闪蝶',
    'cat': '可爱猫咪',
    'burger': '精致汉堡',
    'fish': 'Branzino Fish',
    'dessert': 'Dessert 3DGS',
    'caviar': 'Caviar 3DGS',
    'fly': 'Fly 3DGS',
    '正业模型logo': '正业模型LOGO',
    '石屋-模型': '石屋模型',
    '厨具-模型': '厨具模型',
    '塔-模型': '古塔模型',
}


def detect_category(filename: str, subdir: str) -> str:
    """根据文件名和子目录检测分类"""
    # 优先子目录映射
    if subdir in DIR_CATEGORY_MAP:
        return DIR_CATEGORY_MAP[subdir]

    name_lower = filename.lower().replace('-', '').replace('_', '').replace(' ', '')
    for keyword, category in CATEGORY_MAP.items():
        if keyword in name_lower or keyword in filename:
            return category
    return 'other'


def beautify_name(filename: str) -> str:
    """美化文件名作为显示名称"""
    # 去掉扩展名
    stem = Path(filename).stem

    # 检查美化映射
    for key, name in NAME_BEAUTIFY.items():
        if key == stem or key.replace('-', '') == stem:
            return name

    # 默认行为：去掉数字后缀，替换分隔符
    name = stem
    for sep in ['-', '_', '.']:
        name = name.replace(sep, ' ')
    # 标题化
    words = name.split()
    formatted = ' '.join(w.capitalize() for w in words if w)
    return formatted if formatted else stem


async def import_models():
    """扫描并导入模型"""
    # 根目录的 models/ 文件夹
    # 项目根目录: web3D/models/
    # 当前文件: backend/app/scripts/import_models.py
    # 需要向上: scripts -> app -> backend -> web3D 共 4 层
    root_models_dir = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))) / 'models'

    if not root_models_dir.exists():
        print(f"❌ models/ 目录不存在: {root_models_dir}")
        print(f"   请确保 D:\\HBuilderProjects\\web3D\\models\\ 存在")
        return

    print(f"📁 扫描目录: {root_models_dir}")

    # 收集所有模型文件
    model_files = []
    for subdir in sorted(os.listdir(root_models_dir)):
        subdir_path = root_models_dir / subdir
        if not subdir_path.is_dir():
            continue
        for f in sorted(os.listdir(subdir_path)):
            ext = Path(f).suffix.lower()
            if ext in MODEL_EXTENSIONS:
                model_files.append({
                    'filename': f,
                    'subdir': subdir,
                    'filepath': str(subdir_path / f),
                    'ext': ext.lstrip('.'),
                    'size': (subdir_path / f).stat().st_size,
                })

    print(f"  发现 {len(model_files)} 个模型文件")

    if not model_files:
        print("⚠️  没有找到模型文件")
        return

    # 导入数据库
    async with async_session_maker() as session:
        imported_count = 0
        skipped_count = 0

        for mf in model_files:
            # 检查是否已存在
            query = select(Model3D).where(
                Model3D.name == mf['filename'],
                Model3D.model_url == mf['filepath']
            )
            result = await session.execute(query)
            existing = result.scalar_one_or_none()

            if existing:
                skipped_count += 1
                continue

            # 检测分类
            category = detect_category(mf['filename'], mf['subdir'])
            display_name = beautify_name(mf['filename'])

            # 相对路径作为 URL（前端通过 API 获取后拼接到静态文件服务）
            # 对路径中的中文进行 URL 编码，确保 3D 引擎能正确加载
            model_url = f"/static-models/{urllib.parse.quote(mf['subdir'])}/{urllib.parse.quote(mf['filename'])}"

            model = Model3D(
                id=str(uuid.uuid4()),
                name=display_name,
                description=f"自动导入: {mf['subdir']}/{mf['filename']}",
                category=category,
                status='approved',
                model_url=model_url,
                format=mf['ext'],
                file_size=mf['size'],
                created_by='00000000-0000-0000-0000-000000000001',  # system user
                tags=[mf['subdir'], category],
            )
            session.add(model)
            imported_count += 1
            print(f"  ✅ [{category}] {display_name} ({mf['filename']})")

        await session.commit()
        print(f"\n📊 导入完成: 新增 {imported_count}, 跳过 {skipped_count}, 总计 {len(model_files)}")


if __name__ == '__main__':
    asyncio.run(import_models())
