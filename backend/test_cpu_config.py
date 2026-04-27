"""
测试CPU模式配置
"""
import os
from app.config import settings

print("=" * 60)
print("AI 3D生成配置测试")
print("=" * 60)
print(f"\n生成模式: {settings.GENERATION_MODE}")
print(f"CPU设备: {settings.CPU_DEVICE}")
print(f"CPU线程数: {settings.CPU_NUM_THREADS}")
print(f"CPU批次大小: {settings.CPU_BATCH_SIZE}")
print(f"CPU精度: {settings.CPU_PRECISION}")
print(f"\nTripoSR模型: {settings.TRIPROSR_MODEL}")
print(f"目标面数: {settings.TRIPROSR_TARGET_FACES}")
print(f"\n上传目录: {settings.UPLOAD_DIR}")
print(f"生成输出目录: {settings.GENERATION_OUTPUT_DIR}")
print(f"模型缓存目录: {settings.MODEL_CACHE_DIR}")
print("\n" + "=" * 60)

# 验证环境变量
env_mode = os.getenv('GENERATION_MODE', 'not set')
print(f"\n环境变量 GENERATION_MODE: {env_mode}")

if settings.GENERATION_MODE == 'cpu':
    print("✅ CPU模式已启用")
elif settings.GENERATION_MODE == 'mock':
    print("⚠️  Mock模式（模拟）")
elif settings.GENERATION_MODE == 'gpu':
    print("🚀 GPU模式（需要NVIDIA显卡）")
else:
    print(f"❌ 未知模式: {settings.GENERATION_MODE}")
