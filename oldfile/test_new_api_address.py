"""测试新的OpenAI兼容接口地址"""
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
print("测试新的OpenAI兼容接口地址")
print("="*70)

if not api_key:
    print("❌ 未配置API Key")
    sys.exit(1)

# 测试两个不同的API地址
api_addresses = [
    "https://tokenhub.tencentmaas.com/v1/api/3d/submit",  # 旧地址
    "https://api.ai3d.cloud.tencent.com/v1/3d/submit",     # 新地址（猜测）
    "https://api.ai3d.cloud.tencent.com/3d/submit",        # 新地址（备选）
]

for url in api_addresses:
    print("\n" + "="*70)
    print(f"测试地址: {url}")
    print("="*70)
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "hy-3d-3.0",
        "prompt": "一只小狗"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"响应状态码: {response.status_code}")
        
        try:
            result = response.json()
            print(f"响应内容:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            if response.status_code == 200 and 'id' in result:
                print("\n✅ 成功！找到正确的API地址！")
                print(f"   Job ID: {result['id']}")
                break
            elif response.status_code == 401:
                print("\n❌ 认证失败（401）")
                error = result.get('error', {})
                print(f"   错误: {error.get('message')}")
            elif response.status_code == 404:
                print("\n❌ 地址不存在（404）")
            else:
                print(f"\n⚠️  其他错误: {response.status_code}")
        except Exception as e:
            print(f"解析响应失败: {e}")
            print(f"响应文本: {response.text[:500]}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败（可能是地址错误）")
    except requests.exceptions.Timeout:
        print("❌ 请求超时")
    except Exception as e:
        print(f"请求失败: {e}")

print("\n" + "="*70)
print("总结")
print("="*70)
print("请检查以上测试结果，确定正确的API地址")
