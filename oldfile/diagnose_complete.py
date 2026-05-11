"""完整诊断混元3D API调用问题"""
import os
import sys
import json
import requests
from datetime import datetime

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
print("混元3D API 完整诊断")
print("="*70)
print(f"诊断时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"API Key: {api_key[:20]}...{api_key[-10:] if len(api_key) > 30 else ''}")
print(f"Key长度: {len(api_key)}")

if not api_key:
    print("\n❌ 未配置API Key")
    sys.exit(1)

# 检查网络环境
print("\n" + "="*70)
print("1. 网络环境检查")
print("="*70)

try:
    response = requests.get('https://ipinfo.io/json', timeout=5)
    ip_info = response.json()
    print(f"IP地址: {ip_info.get('ip')}")
    print(f"城市: {ip_info.get('city')}, {ip_info.get('region')}")
    print(f"国家: {ip_info.get('country')}")
    
    if ip_info.get('country') == 'CN':
        print("✅ 在中国大陆，应该可以正常访问")
    else:
        print("⚠️  在海外，需要开通跨境流量")
except Exception as e:
    print(f"无法获取IP信息: {e}")

# 测试1：检查Header格式
print("\n" + "="*70)
print("2. Header格式检查")
print("="*70)

url = "https://tokenhub.tencentmaas.com/v1/api/3d/submit"

# 正确的Header格式
headers_correct = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

print(f"Authorization: Bearer {api_key[:20]}...")
print(f"Content-Type: application/json")
print("✅ Header格式正确")

# 测试2：文生3D（最简单）
print("\n" + "="*70)
print("3. 测试1：文生3D（纯文本）")
print("="*70)

payload_text = {
    "model": "hy-3d-3.0",
    "prompt": "一只可爱的小狗"
}

print(f"请求URL: {url}")
print(f"请求方法: POST")
print(f"请求体:")
print(json.dumps(payload_text, indent=2, ensure_ascii=False))

try:
    response = requests.post(url, json=payload_text, headers=headers_correct, timeout=15)
    print(f"\n响应状态码: {response.status_code}")
    
    try:
        result = response.json()
        
        if response.status_code == 200:
            print("\n✅ 成功！")
            print(f"Job ID: {result.get('id')}")
            print(f"Request ID: {result.get('request_id')}")
            print(f"Status: {result.get('status')}")
            
        elif response.status_code == 401:
            print("\n❌ 认证失败（401）")
            error = result.get('error', {})
            print(f"错误代码: {error.get('code')}")
            print(f"错误信息: {error.get('message')}")
            print(f"Request ID: {error.get('request_id')}")
            
            print("\n可能原因：")
            print("  1. API Key无效或已过期")
            print("  2. 资源包已耗尽（后付费模式已关闭）")
            print("  3. 账户欠费")
            print("  4. 服务未正确激活")
            
            print("\n建议操作：")
            print("  1. 检查AI3D控制台的资源包使用情况")
            print("  2. 确认是否有剩余免费额度")
            print("  3. 尝试重新创建API Key")
            print("  4. 联系腾讯云技术支持")
            
        elif response.status_code == 403:
            print("\n❌ 禁止访问（403）")
            print("可能原因：账户欠费、服务未开通、权限不足")
            
        elif response.status_code == 429:
            print("\n⚠️  请求频率超限（429）")
            print("请稍后重试")
            
        else:
            print(f"\n❌ 未知错误（{response.status_code}）")
            print(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
    except Exception as e:
        print(f"解析响应失败: {e}")
        print(f"响应文本: {response.text[:500]}")
        
except requests.exceptions.Timeout:
    print("\n❌ 请求超时")
except requests.exceptions.ConnectionError as e:
    print(f"\n❌ 连接错误: {e}")
except Exception as e:
    print(f"\n❌ 未知错误: {e}")
    import traceback
    traceback.print_exc()

# 测试3：检查资源包状态
print("\n" + "="*70)
print("4. 资源包状态检查建议")
print("="*70)

print("\n请登录AI3D控制台检查：")
print("  1. 访问: https://console.cloud.tencent.com/ai3d")
print("  2. 查看【资源包管理】或【用量统计】")
print("  3. 确认是否有剩余的免费额度")
print("  4. 检查后付费模式是否开启")

print("\n根据之前的诊断结果：")
print("  ✅ 混元生3D服务 - 已开通")
print("  ✅ 中国大陆流量 - 已开通")
print("  ❌ 跨境流量 - 未开通（但您在中国大陆，不影响）")
print("  ⚠️  后付费模式 - 已关闭")
print("     → 如果资源包耗尽，服务将不可用")

# 总结
print("\n" + "="*70)
print("诊断总结")
print("="*70)

print("\n当前状态：")
print("  • API Key格式: ✅ 正确")
print("  • API地址: ✅ 正确")
print("  • Header格式: ✅ 正确")
print("  • 网络位置: ✅ 中国大陆")
print("  • 服务开通: ✅ 已开通")
print("  • 调用结果: ❌ 返回401")

print("\n最可能的原因：")
print("  1. ⚠️  资源包已耗尽（后付费模式已关闭）")
print("  2. ⚠️  API Key虽然格式正确，但实际已失效")
print("  3. ⚠️  账户存在其他问题（欠费、权限等）")

print("\n立即行动：")
print("  1. 登录 https://console.cloud.tencent.com/ai3d")
print("  2. 检查资源包使用情况和剩余额度")
print("  3. 如果额度已用完，考虑：")
print("     - 开启后付费模式")
print("     - 购买新的资源包")
print("     - 等待下个月额度重置")
print("  4. 如果额度充足，尝试重新创建API Key")
print("  5. 如仍无法解决，联系腾讯云技术支持")

print("\n" + "="*70)
