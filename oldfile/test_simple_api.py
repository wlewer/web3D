"""简单测试腾讯云API密钥"""
import os
import sys

# 手动读取.env文件
env_path = os.path.join(os.path.dirname(__file__), '.env')
print(f"读取配置文件: {env_path}")

secret_id = None
secret_key = None

with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line.startswith('HUNYUAN3D_SECRET_ID='):
            secret_id = line.split('=', 1)[1].strip()
        elif line.startswith('HUNYUAN3D_SECRET_KEY='):
            secret_key = line.split('=', 1)[1].strip()

print("="*70)
print("密钥信息检查")
print("="*70)
print(f"SecretId长度: {len(secret_id)}")
print(f"SecretId: '{secret_id}'")
print(f"SecretKey长度: {len(secret_key)}")
print(f"SecretKey: '{secret_key}'")

# 检查是否有隐藏字符
print("\n" + "="*70)
print("字符检查")
print("="*70)
print(f"SecretId首字符: {ord(secret_id[0])} ('{secret_id[0]}')")
print(f"SecretId尾字符: {ord(secret_id[-1])} ('{secret_id[-1]}')")
print(f"SecretKey首字符: {ord(secret_key[0])} ('{secret_key[0]}')")
print(f"SecretKey尾字符: {ord(secret_key[-1])} ('{secret_key[-1]}')")

# 检查是否包含空格或换行
if ' ' in secret_key or '\n' in secret_key or '\r' in secret_key:
    print("\n⚠️ 警告：SecretKey包含空格或换行符！")
    print(f"SecretKey的repr: {repr(secret_key)}")
else:
    print("\n✅ SecretKey格式正常")

if ' ' in secret_id or '\n' in secret_id or '\r' in secret_id:
    print("⚠️ 警告：SecretId包含空格或换行符！")
    print(f"SecretId的repr: {repr(secret_id)}")
else:
    print("✅ SecretId格式正常")
