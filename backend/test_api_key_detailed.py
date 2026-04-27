"""测试腾讯混元3D API Key的有效性 - 使用多种可能的API地址"""
import requests
import os
import json

API_KEY = os.getenv("HUNYUAN3D_CLOUD_API_KEY", "sk-JInv1BwWsbnz8TdYGiYV3fzAxWQvVIu3vnpUQxUfyC5hMZaM")

# 可能的API地址
API_URLS = {
    "国内站": "https://tokenhub.tencentmaas.com/v1/api/3d",
    "国内站备用": "https://tokenhub.tencentmaas.com/v1/api/3d",
}

def test_api(base_url, site_name):
    """测试指定地址"""
    print(f"\n{'='*70}")
    print(f"测试：{site_name}")
    print(f"URL: {base_url}")
    print(f"{'='*70}")
    
    url = f"{base_url}/submit"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "hy-3d-3.0",
        "prompt": "一只小狗"
    }
    
    print(f"请求: {json.dumps(payload, ensure_ascii=False)}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.text[:500]}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功！Task ID: {data.get('id')}")
            return True
        else:
            print(f"❌ 失败")
            return False
            
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False

if __name__ == "__main__":
    print("="*70)
    print("腾讯混元3D API Key 测试工具")
    print("="*70)
    print(f"API Key: {API_KEY[:15]}...{API_KEY[-10:]}")
    print(f"Key长度: {len(API_KEY)} 字符")
    print(f"Key前缀: {API_KEY[:10]}")
    
    # 测试所有可能的地址
    results = {}
    for site_name, base_url in API_URLS.items():
        results[site_name] = test_api(base_url, site_name)
    
    # 总结
    print(f"\n{'='*70}")
    print("测试结果总结")
    print(f"{'='*70}")
    
    for site_name, success in results.items():
        status = "✅ 成功" if success else "❌ 失败"
        print(f"{site_name}: {status}")
    
    if not any(results.values()):
        print(f"\n⚠️  所有地址都返回401错误")
        print(f"\n可能的原因：")
        print(f"  1. API Key无效或已禁用")
        print(f"  2. API Key格式不正确")
        print(f"  3. 账户服务未正确开通")
        print(f"  4. Key可能需要等待激活（创建后等几分钟）")
        print(f"\n建议操作：")
        print(f"  1. 登录控制台确认Key状态：https://console.cloud.tencent.com/ai3d/api-key")
        print(f"  2. 检查Key是否被禁用")
        print(f"  3. 尝试重新创建一个新的API Key")
        print(f"  4. 确认账户已完成实名认证")
        print(f"  5. 等待几分钟后重试")
