"""全面诊断腾讯混元3D API调用问题"""
import requests
import os
import json

# 从环境变量读取API Key
API_KEY = os.getenv("HUNYUAN3D_CLOUD_API_KEY", "sk-JInv1BwWsbnz8TdYGiYV3fzAxWQvVIu3vnpUQxUfyC5hMZaM")
BASE_URL = "https://tokenhub.tencentmaas.com/v1/api/3d"

def print_section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)

def test_1_text_to_3d():
    """测试1：文生3D（官方示例，最简单）"""
    print_section("测试1：文生3D（官方cURL示例）")
    
    url = f"{BASE_URL}/submit"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "hy-3d-3.0",
        "prompt": "一只小狗"
    }
    
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
    print()
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 成功！")
            print(f"响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"❌ 失败")
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False

def test_2_image_to_3d_simple():
    """测试2：图生3D（简化版，不包含完整base64）"""
    print_section("测试2：图生3D（简化参数）")
    
    url = f"{BASE_URL}/submit"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 使用一个最小的透明PNG的base64（1x1像素）
    minimal_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    payload = {
        "model": "hy-3d-3.0",
        "image": f"data:image/png;base64,{minimal_png}",
        "result_format": "glb"
    }
    
    print(f"URL: {url}")
    print(f"Payload keys: {list(payload.keys())}")
    print(f"Image length: {len(payload['image'])} chars")
    print()
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 成功！")
            print(f"响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"❌ 失败")
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False

def test_3_image_without_prefix():
    """测试3：图生3D（不带data:image前缀）"""
    print_section("测试3：图生3D（不带前缀的base64）")
    
    url = f"{BASE_URL}/submit"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 纯base64，不带前缀
    minimal_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    payload = {
        "model": "hy-3d-3.0",
        "image": minimal_png,
        "result_format": "glb"
    }
    
    print(f"URL: {url}")
    print(f"Payload keys: {list(payload.keys())}")
    print()
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 成功！")
            print(f"响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"❌ 失败")
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False

def test_4_check_account_status():
    """测试4：检查账户状态（通过查询任务列表）"""
    print_section("测试4：尝试查询任务（验证Key权限）")
    
    url = f"{BASE_URL}/query"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # 使用一个不存在的task_id测试
    payload = {
        "model": "hy-3d-3.0",
        "id": "9999999999999999999"
    }
    
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
    print()
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Key有效！")
            print(f"响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"❌ 失败")
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("腾讯混元3D API 全面诊断工具")
    print("=" * 70)
    print(f"API Key: {API_KEY[:15]}...{API_KEY[-10:]}")
    print(f"Base URL: {BASE_URL}")
    
    results = {}
    
    # 运行所有测试
    results['text_to_3d'] = test_1_text_to_3d()
    results['image_simple'] = test_2_image_to_3d_simple()
    results['image_no_prefix'] = test_3_image_without_prefix()
    results['check_account'] = test_4_check_account_status()
    
    # 总结
    print_section("诊断总结")
    
    if results['text_to_3d']:
        print("✅ 文生3D功能正常")
        print("📌 结论：API Key有效，问题可能出在图生3D的参数格式上")
    elif results['check_account']:
        print("✅ API Key有效（查询接口成功）")
        print("📌 结论：Key有效但提交接口有问题，可能是参数格式错误")
    else:
        print("❌ 所有测试都失败")
        print("\n可能的原因：")
        print("  1. API Key虽然来自正确控制台，但未激活或已禁用")
        print("  2. 账户未完成实名认证")
        print("  3. 账户未开通混元3D服务（需要手动开通）")
        print("  4. API Key有IP白名单限制")
        print("  5. 账户余额不足（虽然新用户有200积分，但可能未到账）")
    
    print("\n📋 建议操作：")
    print("  1. 登录 https://console.cloud.tencent.com/ai3d/api-key")
    print("  2. 检查Key的状态（是否启用）")
    print("  3. 检查账户是否完成实名认证")
    print("  4. 查看账户余额/积分")
    print("  5. 联系腾讯云客服确认服务状态")
