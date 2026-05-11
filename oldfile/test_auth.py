"""
Web3D Backend - 认证系统测试脚本
Authentication system test script
"""
import requests
import json


BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"


def test_health():
    """测试健康检查端点"""
    print("\n🔍 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    print("✅ Health check passed")


def test_register():
    """测试用户注册"""
    print("\n📝 Testing user registration...")
    
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "Test1234",
        "phone": "13800138000"
    }
    
    response = requests.post(
        f"{API_BASE}/auth/register",
        json=user_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Registration successful")
        return response.json()["data"]
    else:
        print(f"❌ Registration failed: {response.text}")
        return None


def test_login(email: str, password: str):
    """测试用户登录"""
    print("\n🔑 Testing user login...")
    
    login_data = {
        "email": email,
        "password": password
    }
    
    response = requests.post(
        f"{API_BASE}/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Login successful")
        return response.json()["data"]
    else:
        print(f"❌ Login failed: {response.text}")
        return None


def test_get_me(access_token: str):
    """测试获取当前用户信息"""
    print("\n👤 Testing get current user...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{API_BASE}/auth/me", headers=headers)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Get user info successful")
    else:
        print(f"❌ Get user info failed: {response.text}")


def test_refresh_token(refresh_token: str):
    """测试刷新Token"""
    print("\n🔄 Testing token refresh...")
    
    response = requests.post(
        f"{API_BASE}/auth/refresh",
        json={"refresh_token": refresh_token},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Token refresh successful")
        return response.json()["data"]["access_token"]
    else:
        print(f"❌ Token refresh failed: {response.text}")
        return None


def main():
    """运行所有测试"""
    print("=" * 60)
    print("Web3D Backend Authentication System Test")
    print("=" * 60)
    
    try:
        # 1. 健康检查
        test_health()
        
        # 2. 用户注册
        register_result = test_register()
        
        if register_result:
            email = register_result["user"]["email"]
            access_token = register_result["access_token"]
            refresh_token = register_result["refresh_token"]
            
            # 3. 用户登录（使用刚注册的账号）
            login_result = test_login(email, "Test1234")
            
            if login_result:
                access_token = login_result["access_token"]
                refresh_token = login_result["refresh_token"]
                
                # 4. 获取当前用户信息
                test_get_me(access_token)
                
                # 5. 刷新Token
                new_access_token = test_refresh_token(refresh_token)
                
                if new_access_token:
                    # 6. 使用新Token获取用户信息
                    test_get_me(new_access_token)
        
        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to server")
        print("Please make sure the backend is running at http://localhost:8000")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


if __name__ == "__main__":
    main()
