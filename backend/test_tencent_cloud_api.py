"""测试腾讯云混元3D标准API 3.0"""
import os
import sys
import json
import requests
import hashlib
import hmac
import time
from datetime import datetime, timezone

def load_env_file():
    """加载.env文件"""
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

# 获取配置
secret_id = os.getenv("HUNYUAN3D_SECRET_ID", "")
secret_key = os.getenv("HUNYUAN3D_SECRET_KEY", "")
version = os.getenv("HUNYUAN3D_API_VERSION", "rapid")

print("="*70)
print("腾讯云混元3D标准API 3.0测试")
print("="*70)

if not secret_id or not secret_key:
    print("\n❌ 未配置SecretId或SecretKey")
    print("\n请执行以下步骤：")
    print("1. 访问：https://console.cloud.tencent.com/cam/capi")
    print("2. 点击【新建密钥】")
    print("3. 复制SecretId和SecretKey（SecretKey只显示一次）")
    print("4. 更新backend/.env文件：")
    print("   HUNYUAN3D_SECRET_ID=你的SecretId")
    print("   HUNYUAN3D_SECRET_KEY=你的SecretKey")
    print("   HUNYUAN3D_API_VERSION=rapid  # rapid=标准版，pro=专业版")
    sys.exit(1)

print(f"\nSecretId: {secret_id[:20]}...")
print(f"SecretKey: {secret_key[:10]}...")
print(f"API版本: {version}")

def sign(key, msg):
    """HMAC-SHA256签名"""
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def get_signature(secret_id, secret_key, payload, timestamp, date, action):
    """生成TC3-HMAC-SHA256签名"""
    service = "ai3d"
    host = "ai3d.tencentcloudapi.com"
    algorithm = "TC3-HMAC-SHA256"
    
    # 1. 拼接规范请求串
    http_request_method = "POST"
    canonical_uri = "/"
    canonical_querystring = ""
    canonical_headers = f"content-type:application/json\nhost:{host}\n"
    signed_headers = "content-type;host"
    payload_str = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
    payload_hash = hashlib.sha256(payload_str.encode('utf-8')).hexdigest()
    
    canonical_request = (
        f"{http_request_method}\n"
        f"{canonical_uri}\n"
        f"{canonical_querystring}\n"
        f"{canonical_headers}\n"
        f"{signed_headers}\n"
        f"{payload_hash}"
    )
    
    # 2. 拼等待签名字符串
    credential_scope = f"{date}/{service}/tc3_request"
    hashed_canonical_request = hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    string_to_sign = (
        f"{algorithm}\n"
        f"{timestamp}\n"
        f"{credential_scope}\n"
        f"{hashed_canonical_request}"
    )
    
    # 3. 计算签名
    secret_date = sign(('TC3' + secret_key).encode('utf-8'), date)
    secret_service = sign(secret_date, service)
    secret_signing = sign(secret_service, "tc3_request")
    signature = hmac.new(
        secret_signing,
        string_to_sign.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # 4. 拼接Authorization
    authorization = (
        f"{algorithm} "
        f"Credential={secret_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )
    
    return authorization

# API配置
url = "https://ai3d.tencentcloudapi.com"
region = "ap-guangzhou"
api_version = "2025-05-13"

# 根据版本设置Action名称
if version == "pro":
    submit_action = "SubmitHunyuanTo3DProJob"
    query_action = "QueryHunyuanTo3DProJob"
else:
    submit_action = "SubmitHunyuanTo3DRapidJob"
    query_action = "QueryHunyuanTo3DRapidJob"

# 测试提交任务
print("\n" + "="*70)
print("测试1：提交文生3D任务")
print("="*70)

timestamp = int(time.time())
date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime('%Y-%m-%d')

payload = {
    "Prompt": "一只可爱的小狗"
}

# 生成签名
authorization = get_signature(secret_id, secret_key, payload, timestamp, date, submit_action)

# 请求头
headers = {
    "Authorization": authorization,
    "Content-Type": "application/json",
    "X-TC-Action": submit_action,
    "X-TC-Version": api_version,
    "X-TC-Region": region,
    "X-TC-Timestamp": str(timestamp)
}

print(f"API地址: {url}")
print(f"Action: {submit_action}")
print(f"Version: {api_version}")
print(f"Region: {region}")
print(f"Timestamp: {timestamp}")
print(f"请求体: {json.dumps(payload, ensure_ascii=False)}")
print(f"Authorization: {authorization[:50]}...")

try:
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    print(f"\n响应状态码: {response.status_code}")
    
    try:
        result = response.json()
        print(f"响应内容:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if response.status_code == 200 and 'Response' in result:
            response_data = result['Response']
            
            if 'Error' in response_data:
                error_info = response_data['Error']
                print(f"\n❌ API错误")
                print(f"错误码: {error_info.get('Code')}")
                print(f"错误信息: {error_info.get('Message')}")
            else:
                job_id = response_data.get('JobId')
                
                if job_id:
                    print(f"\n✅ 任务提交成功！")
                    print(f"Job ID: {job_id}")
                    print(f"Request ID: {response_data.get('RequestId')}")
                    
                    # 测试查询任务
                    print("\n" + "="*70)
                    print("测试2：查询任务状态")
                    print("="*70)
                    
                    time.sleep(5)  # 等待5秒
                    
                    query_payload = {
                        "JobId": job_id
                    }
                    
                    query_timestamp = int(time.time())
                    query_date = datetime.fromtimestamp(query_timestamp, tz=timezone.utc).strftime('%Y-%m-%d')
                    
                    query_authorization = get_signature(
                        secret_id, secret_key, query_payload, query_timestamp, query_date, query_action
                    )
                    
                    query_headers = {
                        "Authorization": query_authorization,
                        "Content-Type": "application/json",
                        "X-TC-Action": query_action,
                        "X-TC-Version": api_version,
                        "X-TC-Region": region,
                        "X-TC-Timestamp": str(query_timestamp)
                    }
                    
                    print(f"Action: {query_action}")
                    print(f"请求体: {json.dumps(query_payload, ensure_ascii=False)}")
                    
                    query_response = requests.post(url, json=query_payload, headers=query_headers, timeout=10)
                    print(f"响应状态码: {query_response.status_code}")
                    
                    try:
                        query_result = query_response.json()
                        print(f"响应内容:")
                        print(json.dumps(query_result, indent=2, ensure_ascii=False))
                        
                        if query_response.status_code == 200 and 'Response' in query_result:
                            query_response_data = query_result['Response']
                            
                            if 'Error' in query_response_data:
                                error_info = query_response_data['Error']
                                print(f"\n❌ 查询失败")
                                print(f"错误码: {error_info.get('Code')}")
                                print(f"错误信息: {error_info.get('Message')}")
                            else:
                                status = query_response_data.get('Status')
                                print(f"\n任务状态: {status}")
                                
                                if status == 'SUCCESS':
                                    result_url = query_response_data.get('ResultUrl')
                                    if result_url:
                                        print(f"GLB下载链接: {result_url}")
                                        print("\n✅ 测试完成！所有功能正常！")
                                    else:
                                        print("⚠️ 任务完成但没有ResultUrl")
                                elif status == 'FAILED':
                                    error_msg = query_response_data.get('ErrorMessage', '未知错误')
                                    print(f"❌ 任务失败: {error_msg}")
                                else:
                                    print(f"⚠️ 任务仍在处理中: {status}")
                    except Exception as e:
                        print(f"解析查询响应失败: {e}")
                else:
                    print("\n❌ 响应中没有JobId")
        else:
            print(f"\n❌ 请求失败")
            
    except Exception as e:
        print(f"解析响应失败: {e}")
        print(f"响应文本: {response.text[:500]}")
        
except Exception as e:
    print(f"请求失败: {e}")

print("\n" + "="*70)
print("总结")
print("="*70)
print("\n如果测试成功，请确保.env文件中已正确配置：")
print("  HUNYUAN3D_SECRET_ID=你的SecretId")
print("  HUNYUAN3D_SECRET_KEY=你的SecretKey")
print("  HUNYUAN3D_API_VERSION=rapid  # 或 pro")
print("\n然后重启后端服务即可使用混元3D云端API。")
