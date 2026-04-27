"""测试新的API Key"""
import os
import sys
import json
import requests

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
print("测试新的API Key")
print("="*70)

print(f"API Key: {api_key}")
print(f"Key长度: {len(api_key)}")

if not api_key:
    print("❌ 未配置API Key")
    sys.exit(1)

# 测试TokenHub API
url = "https://tokenhub.tencentmaas.com/v1/api/3d/submit"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "hy-3d-3.0",
    "prompt": "一只小狗"
}

print(f"\n请求URL: {url}")
print(f"请求方法: POST")
print(f"请求体: {json.dumps(payload, ensure_ascii=False)}")

try:
    response = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"\n响应状态码: {response.status_code}")
    
    try:
        result = response.json()
        
        if response.status_code == 200:
            print("\n🎉🎉 成功！API Key有效！")
            print("="*70)
            print(f"Job ID: {result.get('id')}")
            print(f"Status: {result.get('status')}")
            print(f"Request ID: {result.get('request_id')}")
            print("="*70)
            print("\n系统可以正常使用了！")
        elif response.status_code == 401:
            print("\n❌ 401 认证失败")
            error = result.get('error', {})
            print(f"错误代码: {error.get('code')}")
            print(f"错误信息: {error.get('message')}")
            print(f"Request ID: {error.get('request_id')}")
        else:
            print(f"\n⚠️  状态码: {response.status_code}")
            print(f"响应: {json.dumps(result, ensure_ascii=False)}")
    except Exception as e:
        print(f"解析失败: {e}")
        print(f"响应文本: {response.text[:500]}")
        
except Exception as e:
    print(f"请求失败: {e}")
