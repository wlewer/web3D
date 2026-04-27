"""测试腾讯混元3D的两种API调用方式"""
import requests
import json
import hashlib
import hmac
import base64
import time
from datetime import datetime, timezone

print("="*70)
print("腾讯混元3D API调用方式测试")
print("="*70)

# 方式1：TokenHub OpenAI兼容接口（国际站）
def test_tokenhub_api(api_key):
    """测试TokenHub的OpenAI兼容接口"""
    print("\n" + "="*70)
    print("方式1：TokenHub OpenAI兼容接口（国际站）")
    print("="*70)
    
    url = "https://tokenhub.tencentmaas.com/v1/api/3d/submit"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "hy-3d-3.0",
        "prompt": "一只小狗"
    }
    
    print(f"URL: {url}")
    print(f"认证: Bearer Token (sk-开头)")
    print(f"请求: {json.dumps(payload, ensure_ascii=False)}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功！Task ID: {data.get('id')}")
            return True
        else:
            print(f"❌ 失败: {response.text[:300]}")
            return False
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False

# 方式2：腾讯云API 3.0（国内站）
def sign(key, msg):
    """HMAC-SHA256签名"""
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def get_signature_key(secret_key, date, service, request):
    """生成签名密钥"""
    k_date = sign(('TC3' + secret_key).encode('utf-8'), date)
    k_service = sign(k_date, service)
    k_signing = sign(k_service, request)
    return k_signing

def test_tencent_cloud_api(secret_id, secret_key):
    """测试腾讯云API 3.0接口"""
    print("\n" + "="*70)
    print("方式2：腾讯云API 3.0（国内站）")
    print("="*70)
    
    # API端点
    host = "ai3d.tencentcloudapi.com"
    service = "ai3d"
    version = "2025-05-13"
    action = "SubmitHunyuanTo3DJob"
    region = "ap-guangzhou"
    
    # 请求参数
    payload = {
        "Prompt": "一只小狗"
    }
    
    # 时间戳
    timestamp = int(time.time())
    date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime('%Y-%m-%d')
    
    # 构建签名
    algorithm = "TC3-HMAC-SHA256"
    http_request_method = "POST"
    canonical_uri = "/"
    canonical_querystring = ""
    canonical_headers = f"content-type:application/json\nhost:{host}\n"
    signed_headers = "content-type;host"
    payload_hash = hashlib.sha256(json.dumps(payload, ensure_ascii=False).encode('utf-8')).hexdigest()
    canonical_request = f"{http_request_method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
    
    credential_scope = f"{date}/{service}/tc3_request"
    hashed_canonical_request = hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    string_to_sign = f"{algorithm}\n{timestamp}\n{credential_scope}\n{hashed_canonical_request}"
    
    secret_date = sign(('TC3' + secret_key).encode('utf-8'), date)
    secret_service = sign(secret_date, service)
    secret_signing = sign(secret_service, "tc3_request")
    signature = hmac.new(secret_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    
    authorization = f"{algorithm} Credential={secret_id}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
    
    headers = {
        "Authorization": authorization,
        "Content-Type": "application/json",
        "Host": host,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Region": region,
        "X-TC-Timestamp": str(timestamp)
    }
    
    url = f"https://{host}"
    print(f"URL: {url}")
    print(f"认证: SecretId/SecretKey (TC3-HMAC-SHA256签名)")
    print(f"Action: {action}")
    print(f"请求: {json.dumps(payload, ensure_ascii=False)}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功！Job ID: {data.get('Response', {}).get('JobId')}")
            return True
        else:
            print(f"❌ 失败: {response.text[:300]}")
            return False
    except Exception as e:
        print(f"❌ 异常: {e}")
        return False

if __name__ == "__main__":
    # 测试TokenHub API
    tokenhub_key = "sk-JInv1BwWsbnz8TdYGiYV3fzAxWQvVIu3vnpUQxUfyC5hMZaM"
    result1 = test_tokenhub_api(tokenhub_key)
    
    # 提示用户输入SecretId和SecretKey测试API 3.0
    print("\n" + "="*70)
    print("如果您有SecretId和SecretKey，可以继续测试API 3.0方式")
    print("="*70)
    print("\n获取SecretId和SecretKey的方法：")
    print("1. 登录 https://console.cloud.tencent.com/cam/capi")
    print("2. 点击【API密钥管理】->【新建密钥】")
    print("3. 复制SecretId和SecretKey")
    print("\n⚠️  注意：SecretKey只显示一次，请妥善保管！")
    
    use_api3 = input("\n是否测试API 3.0方式？(y/n): ").strip().lower()
    
    if use_api3 == 'y':
        secret_id = input("请输入SecretId: ").strip()
        secret_key = input("请输入SecretKey: ").strip()
        
        if secret_id and secret_key:
            result2 = test_tencent_cloud_api(secret_id, secret_key)
        else:
            print("❌ SecretId或SecretKey不能为空")
    else:
        print("\n已跳过API 3.0测试")
    
    # 总结
    print("\n" + "="*70)
    print("测试总结")
    print("="*70)
    print(f"TokenHub方式: {'✅ 成功' if result1 else '❌ 失败'}")
    print("\n📋 建议：")
    print("  - 如果TokenHub方式失败，请检查Key是否来自国际站")
    print("  - 国内站请使用API 3.0方式（需要SecretId/SecretKey）")
    print("  - 国际站可以使用TokenHub方式（Bearer Token）")
