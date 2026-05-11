"""验证腾讯混元3D API Key有效性"""
import os
import sys
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
                    # 去除注释
                    if '#' in value:
                        value = value.split('#')[0].strip()
                    os.environ[key.strip()] = value.strip()

load_env_file()

api_key = os.getenv("HUNYUAN3D_CLOUD_API_KEY", "")

print("="*70)
print("腾讯混元3D API Key 验证")
print("="*70)
print(f"API Key: {api_key[:20]}...{api_key[-10:] if len(api_key) > 30 else ''}")
print(f"Key长度: {len(api_key)}")
print(f"Key前缀: {api_key[:5] if api_key else '空'}")

if not api_key:
    print("\n❌ 错误：未配置API Key")
    exit(1)

if not api_key.startswith("sk-"):
    print("\n⚠️  警告：API Key不是以'sk-'开头")
    print("   TokenHub平台的Key应该以'sk-'开头")

# 测试1：检查Key格式
print("\n" + "="*70)
print("测试1：Key格式检查")
print("="*70)

if len(api_key) < 30:
    print(f"❌ Key长度过短（{len(api_key)}字符），正常应该在50-100字符")
elif len(api_key) > 200:
    print(f"❌ Key长度过长（{len(api_key)}字符），可能包含多余内容")
else:
    print(f"✅ Key长度正常（{len(api_key)}字符）")

# 测试2：尝试调用API
print("\n" + "="*70)
print("测试2：API调用测试")
print("="*70)

url = "https://tokenhub.tencentmaas.com/v1/api/3d/submit"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "hy-3d-3.0",
    "prompt": "测试"
}

print(f"请求URL: {url}")
print(f"请求方法: POST")
print(f"认证方式: Bearer Token")

try:
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    
    print(f"\n响应状态码: {response.status_code}")
    print(f"响应头: {dict(response.headers)}")
    
    try:
        result = response.json()
        print(f"\n响应内容:")
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except:
        print(f"\n响应文本: {response.text[:500]}")
    
    if response.status_code == 200:
        print("\n✅ API调用成功！")
        if 'id' in result:
            print(f"   Job ID: {result['id']}")
        if 'request_id' in result:
            print(f"   Request ID: {result['request_id']}")
    elif response.status_code == 401:
        print("\n❌ 认证失败（401）")
        error_msg = result.get('error', {}) if isinstance(result, dict) else {}
        print(f"   错误代码: {error_msg.get('code', '未知')}")
        print(f"   错误信息: {error_msg.get('message', '未知')}")
        print(f"\n可能原因：")
        print(f"   1. API Key无效或已过期")
        print(f"   2. API Key来自错误的平台（需要TokenHub平台的Key，不是腾讯云控制台的Key）")
        print(f"   3. 账户未开通混元3D服务")
        print(f"   4. Key的权限不足")
        
        print(f"\n解决方案：")
        print(f"   1. 确认Key来自TokenHub平台：https://console.cloud.tencent.com/tokenhub")
        print(f"   2. 检查是否已开通混元3D服务")
        print(f"   3. 检查是否有免费额度或余额")
        print(f"   4. 尝试重新创建API Key")
    elif response.status_code == 403:
        print("\n❌ 禁止访问（403）")
        print(f"   可能原因：账户欠费、服务未开通、权限不足")
    elif response.status_code == 429:
        print("\n⚠️  请求频率超限（429）")
    else:
        print(f"\n❌ 未知错误（{response.status_code}）")
        
except requests.exceptions.Timeout:
    print("\n❌ 请求超时")
except requests.exceptions.ConnectionError as e:
    print(f"\n❌ 连接错误: {e}")
except Exception as e:
    print(f"\n❌ 未知错误: {e}")
    import traceback
    traceback.print_exc()

# 测试3：检查账户状态
print("\n" + "="*70)
print("测试3：账户状态检查建议")
print("="*70)
print("\n请确认以下事项：")
print("   □ 已登录腾讯云控制台")
print("   □ 已开通混元3D服务")
print("   □ 已获得免费资源包（国内站100积分 + 国际站200积分）")
print("   □ API Key来自TokenHub平台（不是普通腾讯云API密钥）")
print("   □ Key未过期")
print("   □ 账户有足够余额或免费额度")

print("\n" + "="*70)
print("获取正确的API Key步骤：")
print("="*70)
print("1. 访问TokenHub控制台：https://console.cloud.tencent.com/tokenhub")
print("2. 进入【API密钥管理】或【应用管理】")
print("3. 创建新的API Key（应该以sk-开头）")
print("4. 复制并替换.env文件中的HUNYUAN3D_CLOUD_API_KEY")
print("5. 重启后端服务")
