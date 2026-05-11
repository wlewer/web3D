"""测试混元3D TokenHub API的正确参数格式"""
import os
import sys
import json
import requests

# 手动读取.env文件
def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    if '#' in value:
                        value = value.split('#')[0].strip()
                    os.environ[key.strip()] = value.strip()

load_env_file()

api_key = os.getenv("HUNYUAN3D_CLOUD_API_KEY", "")

print("="*70)
print("测试混元3D TokenHub API参数格式")
print("="*70)

if not api_key:
    print("❌ 未配置API Key")
    sys.exit(1)

url = "https://tokenhub.tencentmaas.com/v1/api/3d/submit"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 测试1：文生3D（最简单）
print("\n" + "="*70)
print("测试1：文生3D（纯文本）")
print("="*70)

payload1 = {
    "model": "hy-3d-3.0",
    "prompt": "一只可爱的小狗"
}

print(f"请求URL: {url}")
print(f"请求参数:")
print(json.dumps(payload1, indent=2, ensure_ascii=False))

try:
    response = requests.post(url, json=payload1, headers=headers, timeout=10)
    print(f"\n响应状态码: {response.status_code}")
    
    try:
        result = response.json()
        print(f"响应内容:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if response.status_code == 200 and 'id' in result:
            print("\n✅ 文生3D成功！")
            print(f"   Job ID: {result['id']}")
        elif response.status_code == 401:
            print("\n❌ 认证失败")
            error = result.get('error', {})
            print(f"   错误: {error.get('message')}")
    except Exception as e:
        print(f"解析响应失败: {e}")
        print(f"响应文本: {response.text[:500]}")
        
except Exception as e:
    print(f"请求失败: {e}")

# 测试2：图生3D - 不带前缀的Base64
print("\n" + "="*70)
print("测试2：图生3D - Base64不带前缀")
print("="*70)

# 创建一个简单的1x1像素PNG图片的Base64
test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

payload2 = {
    "model": "hy-3d-3.0",
    "image": test_image_base64,  # 不带 data:image/png;base64, 前缀
    "prompt": "测试图片"
}

print(f"请求参数:")
print(json.dumps({
    "model": payload2["model"],
    "image": test_image_base64[:50] + "...",  # 只显示前50个字符
    "prompt": payload2["prompt"]
}, indent=2, ensure_ascii=False))

try:
    response = requests.post(url, json=payload2, headers=headers, timeout=10)
    print(f"\n响应状态码: {response.status_code}")
    
    try:
        result = response.json()
        print(f"响应内容:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if response.status_code == 200 and 'id' in result:
            print("\n✅ 图生3D成功（不带前缀）！")
        elif response.status_code == 401:
            print("\n❌ 认证失败")
            error = result.get('error', {})
            print(f"   错误: {error.get('message')}")
        elif response.status_code == 400:
            print("\n⚠️  请求参数错误")
            error = result.get('error', {})
            print(f"   错误: {error.get('message')}")
    except Exception as e:
        print(f"解析响应失败: {e}")
        print(f"响应文本: {response.text[:500]}")
        
except Exception as e:
    print(f"请求失败: {e}")

# 测试3：图生3D - 带前缀的Base64（当前实现）
print("\n" + "="*70)
print("测试3：图生3D - Base64带前缀（当前实现）")
print("="*70)

payload3 = {
    "model": "hy-3d-3.0",
    "image": f"data:image/png;base64,{test_image_base64}",  # 带前缀
    "prompt": "测试图片"
}

print(f"请求参数:")
print(json.dumps({
    "model": payload3["model"],
    "image": "data:image/png;base64," + test_image_base64[:30] + "...",
    "prompt": payload3["prompt"]
}, indent=2, ensure_ascii=False))

try:
    response = requests.post(url, json=payload3, headers=headers, timeout=10)
    print(f"\n响应状态码: {response.status_code}")
    
    try:
        result = response.json()
        print(f"响应内容:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if response.status_code == 200 and 'id' in result:
            print("\n✅ 图生3D成功（带前缀）！")
        elif response.status_code == 401:
            print("\n❌ 认证失败")
            error = result.get('error', {})
            print(f"   错误: {error.get('message')}")
        elif response.status_code == 400:
            print("\n⚠️  请求参数错误")
            error = result.get('error', {})
            print(f"   错误: {error.get('message')}")
    except Exception as e:
        print(f"解析响应失败: {e}")
        print(f"响应文本: {response.text[:500]}")
        
except Exception as e:
    print(f"请求失败: {e}")

print("\n" + "="*70)
print("总结")
print("="*70)
print("请对比以上三个测试的结果，确定正确的参数格式")
