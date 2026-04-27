"""测试腾讯混元3D新API Key"""
import asyncio
import aiohttp
import json

API_KEY = "sk-JInv1BwWsbnz8TdYGiYV3fzAxWQvVIu3vnpUQxUfyC5hMZaM"
BASE_URL = "https://tokenhub.tencentmaas.com/v1/api/3d"

async def test_api_key():
    """测试API Key是否有效"""
    print("=" * 60)
    print("测试腾讯混元3D API Key")
    print("=" * 60)
    print(f"API Key: {API_KEY[:20]}...{API_KEY[-10:]}")
    print(f"Base URL: {BASE_URL}")
    print()
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with aiohttp.ClientSession() as session:
        # 测试1：列出可用模型
        print("🔍 测试1：获取可用模型列表...")
        try:
            async with session.get(
                f"{BASE_URL}/models",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                data = await response.json()
                print(f"状态码: {response.status}")
                if response.status == 200:
                    print("✅ API Key 有效！")
                    print("\n可用模型:")
                    if 'data' in data:
                        for model in data['data']:
                            print(f"  - {model.get('id', 'N/A')}")
                    return True
                else:
                    print(f"❌ 错误: {data}")
                    return False
        except Exception as e:
            print(f"❌ 请求失败: {e}")
            return False

if __name__ == "__main__":
    result = asyncio.run(test_api_key())
    print("\n" + "=" * 60)
    if result:
        print("🎉 API Key 测试通过！可以使用混元3D服务了")
    else:
        print("⚠️  API Key 无效或配置有误，请检查")
    print("=" * 60)
