"""
Web3D Backend - API 快速测试脚本
Quick test script for API endpoints
"""
import requests
import json
import sys

# 设置 UTF-8 编码
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_health():
    """测试健康检查端点"""
    print_section("1. 健康检查")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_register():
    """测试用户注册"""
    print_section("2. 用户注册")
    data = {
        "username": "admin",
        "email": "admin@web3d.com",
        "password": "Admin123456",
        "role": "admin"
    }
    response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    result = response.json()
    if result.get("code") == 200 and result.get("data"):
        return result["data"].get("access_token")
    return None

def test_login(email="admin@web3d.com", password="Admin123456"):
    """测试用户登录"""
    print_section("3. 用户登录")
    data = {
        "email": email,
        "password": password
    }
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2, ensure_ascii=False)}")
    # 从 ResponseModel 中提取 token
    if result.get("code") == 200 and result.get("data"):
        return result["data"].get("access_token")
    return None

def test_get_users(token):
    """测试获取用户列表"""
    print_section("4. 获取用户列表")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/users/", headers=headers, params={"page": 1, "page_size": 10})
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_create_user(token):
    """测试创建用户"""
    print_section("5. 创建新用户")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = {
        "username": "testuser",
        "email": "test@web3d.com",
        "password": "test123",
        "phone": "13800138000",
        "role": "user"
    }
    response = requests.post(f"{BASE_URL}/api/v1/users/", headers=headers, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    return response.json().get("id")

def test_get_user_stats(token):
    """测试获取用户统计"""
    print_section("6. 获取用户统计")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/users/stats", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_create_model(token, user_id):
    """测试创建模型"""
    print_section("7. 创建3D模型")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = {
        "name": "Test Model",
        "description": "A test 3D model",
        "category": "character",
        "format": "glb",
        "model_url": "https://example.com/model.glb",
        "thumbnail_url": "https://example.com/thumb.png",
        "file_size": 1024000,
        "polygon_count": 5000,
        "texture_count": 3,
        "tags": ["test", "demo"]
    }
    response = requests.post(f"{BASE_URL}/api/v1/models/", headers=headers, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    return response.json().get("id")

def test_get_models(token):
    """测试获取模型列表"""
    print_section("8. 获取模型列表")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/models/", headers=headers, params={"page": 1, "page_size": 10})
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_get_model_stats(token):
    """测试获取模型统计"""
    print_section("9. 获取模型统计")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/v1/models/stats", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

if __name__ == "__main__":
    print("\n🚀 Web3D Backend API Test Suite\n")
    
    try:
        # 1. 健康检查
        test_health()
        
        # 2. 尝试登录（如果用户已存在）
        token = None
        try:
            token = test_login()
            if not token:
                raise Exception("Login failed")
        except Exception as e:
            print(f"用户不存在，尝试注册... ({str(e)})")
            token = test_register()
            if not token:
                # 注册成功但没有返回 token，再次登录
                token = test_login()
        
        if not token:
            print("❌ 无法获取认证令牌")
            exit(1)
        
        # 3. 测试用户API
        test_get_users(token)
        user_id = test_create_user(token)
        test_get_user_stats(token)
        
        # 4. 测试模型API
        model_id = test_create_model(token, user_id)
        test_get_models(token)
        test_get_model_stats(token)
        
        print_section("✅ 所有测试完成！")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
