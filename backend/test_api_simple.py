"""测试腾讯混元3D API Key有效性 - 使用requests"""
import requests
import os
import json

# 从环境变量读取API Key
API_KEY = os.getenv("HUNYUAN3D_CLOUD_API_KEY", "sk-JInv1BwWsbnz8TdYGiYV3fzAxWQvVIu3vnpUQxUfyC5hMZaM")
BASE_URL = "https://tokenhub.tencentmaas.com/v1/api/3d"

def test_api_key():
    """测试API Key是否有效"""
    print("=" * 70)
    print("测试腾讯混元3D API Key")
    print("=" * 70)
    print(f"API Key: {API_KEY[:15]}...{API_KEY[-10:]}")
    print(f"Base URL: {BASE_URL}")
    print()
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 测试：尝试提交一个简单的任务（使用文本提示）
    print("🔍 测试：提交3D生成任务...")
    url = f"{BASE_URL}/submit"
    
    payload = {
        "model": "hy-3d-3.0",
        "prompt": "一只小狗"  # 使用纯文本测试
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Key 有效！")
            print(f"\n响应数据:")
            print(f"  - Task ID: {data.get('id', 'N/A')}")
            print(f"  - Status: {data.get('status', 'N/A')}")
            print(f"  - Request ID: {data.get('request_id', 'N/A')}")
            return True
        else:
            error_text = response.text
            print(f"❌ API Key 无效或配置有误")
            print(f"错误信息: {error_text}")
            
            # 分析错误类型
            if "401" in error_text or "invalid api key" in error_text.lower():
                print("\n⚠️  问题分析：")
                print("  1. API Key格式错误或已过期")
                print("  2. 该Key可能是混元文本模型的Key，不是混元3D的Key")
                print("  3. 请确认Key来自：https://console.cloud.tencent.com/ai3d/api-key")
                print("     而不是：https://console.cloud.tencent.com/tokenhub")
            elif "403" in error_text:
                print("\n⚠️  问题分析：")
                print("  1. API Key有效但权限不足")
                print("  2. 可能需要开通混元3D服务或充值")
            elif "404" in error_text:
                print("\n⚠️  问题分析：")
                print("  1. API端点URL可能不正确")
                print("  2. 检查base_url是否为：https://tokenhub.tencentmaas.com/v1/api/3d")
            
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

if __name__ == "__main__":
    result = test_api_key()
    print("\n" + "=" * 70)
    if result:
        print("🎉 API Key 测试通过！可以使用混元3D服务了")
    else:
        print("⚠️  API Key 无效或配置有误，请检查")
        print("\n📋 排查步骤：")
        print("  1. 访问 https://console.cloud.tencent.com/ai3d/api-key")
        print("  2. 确认这是混元3D专属控制台（不是文本模型）")
        print("  3. 点击'查看'按钮获取完整Key")
        print("  4. 确保Key格式为：sk-xxxxxxxxxx")
        print("  5. 更新 backend/.env 文件中的 HUNYUAN3D_CLOUD_API_KEY")
    print("=" * 70)
