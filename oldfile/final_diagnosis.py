"""最终诊断 - 流量已全部开通"""
import os
import sys
import json
import requests
from datetime import datetime

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
print("混元3D API 最终诊断（流量已全部开通）")
print("="*70)
print(f"诊断时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"API Key: {api_key[:20]}...{api_key[-10:] if len(api_key) > 30 else ''}")
print(f"Key长度: {len(api_key)}")

if not api_key:
    print("\n❌ 未配置API Key")
    sys.exit(1)

# 服务开通状态确认
print("\n" + "="*70)
print("✅ 服务开通状态（已确认）")
print("="*70)
print("  ✅ 混元生3D服务 - 已开通")
print("  ✅ 中国大陆流量 - 已开通")
print("  ✅ 跨境流量 - 已开通（刚刚开通）")
print("  ⚠️  后付费模式 - 需要确认")

# 测试不同的模型版本
print("\n" + "="*70)
print("测试不同的模型版本")
print("="*70)

url = "https://tokenhub.tencentmaas.com/v1/api/3d/submit"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 测试不同模型
models_to_test = [
    ("hy-3d-3.0", "标准版"),
    ("hy-3d-3.1", "专业版"),
    ("HY-3D-Express", "极速版"),
]

for model_code, model_name in models_to_test:
    print(f"\n{'='*70}")
    print(f"测试模型: {model_name} ({model_code})")
    print(f"{'='*70}")
    
    payload = {
        "model": model_code,
        "prompt": "测试"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"响应状态码: {response.status_code}")
        
        try:
            result = response.json()
            
            if response.status_code == 200:
                print(f"✅ 成功！Job ID: {result.get('id')}")
                print("\n" + "="*70)
                print("🎉 找到可用的模型！")
                print("="*70)
                sys.exit(0)
            elif response.status_code == 401:
                print(f"❌ 401 认证失败")
                error = result.get('error', {})
                print(f"   错误: {error.get('message')}")
            elif response.status_code == 400:
                print(f"⚠️  400 请求错误（可能是模型名称问题）")
                print(f"   响应: {json.dumps(result, ensure_ascii=False)}")
            else:
                print(f"⚠️  状态码: {response.status_code}")
                print(f"   响应: {json.dumps(result, ensure_ascii=False)}")
        except Exception as e:
            print(f"解析失败: {e}")
            
    except Exception as e:
        print(f"请求失败: {e}")

# 如果所有模型都失败
print("\n" + "="*70)
print("最终建议")
print("="*70)

print("\n服务状态已全部正确开通，但仍然返回401，最可能的原因：")
print("\n1. ⚠️  资源包已耗尽")
print("   - 您获得的300积分可能已经用完")
print("   - 后付费模式如果关闭，服务将不可用")
print("\n2. ⚠️  API Key已失效")
print("   - 虽然格式正确，但Key本身可能已被撤销")
print("\n3. ⚠️  账户欠费")
print("   - 检查账户是否有欠费记录")

print("\n" + "="*70)
print("立即行动")
print("="*70)

print("\n请执行以下步骤：")
print("\n1. 登录AI3D控制台检查资源包：")
print("   https://console.cloud.tencent.com/ai3d")
print("   → 查看【资源包管理】或【用量统计】")
print("   → 确认是否有剩余免费额度")

print("\n2. 检查后付费模式：")
print("   → 在控制台找到【后付费设置】")
print("   → 如果已关闭，考虑开启（按量付费）")
print("   → 或者购买新的资源包")

print("\n3. 如果额度充足但仍然401：")
print("   → 尝试重新创建API Key")
print("   → 删除旧Key，创建新Key")
print("   → 更新.env文件并重启服务")

print("\n4. 如果仍然无法解决：")
print("   → 联系腾讯云技术支持")
print("   → 提供Request ID查询具体问题")
print("   → Request ID: eb27327b-92d0-4081-bef6-b35dc6ade8dc")

print("\n" + "="*70)
