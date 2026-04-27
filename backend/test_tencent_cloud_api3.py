"""腾讯云混元3D API 3.0标准实现
根据官方文档：https://cloud.tencent.com.cn/document/product/1804/120696
"""
import hashlib
import hmac
import base64
import time
import json
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import aiohttp


class TencentCloudAPIClient:
    """腾讯云API 3.0客户端（支持混元3D）"""
    
    def __init__(self, secret_id: str, secret_key: str):
        """
        初始化客户端
        
        Args:
            secret_id: 腾讯云SecretId
            secret_key: 腾讯云SecretKey
        """
        self.secret_id = secret_id
        self.secret_key = secret_key
        self.host = "ai3d.tencentcloudapi.com"
        self.service = "ai3d"
        self.version = "2025-05-13"
        self.region = "ap-guangzhou"
    
    @staticmethod
    def sign(key: bytes, msg: str) -> bytes:
        """HMAC-SHA256签名"""
        return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()
    
    def get_signature(self, payload: Dict[str, Any], timestamp: int, date: str) -> str:
        """
        生成TC3-HMAC-SHA256签名
        
        Args:
            payload: 请求参数
            timestamp: 时间戳
            date: 日期（YYYY-MM-DD）
            
        Returns:
            签名后的Authorization字符串
        """
        algorithm = "TC3-HMAC-SHA256"
        http_request_method = "POST"
        canonical_uri = "/"
        canonical_querystring = ""
        
        # 规范头部
        canonical_headers = f"content-type:application/json\nhost:{self.host}\n"
        signed_headers = "content-type;host"
        
        # 请求体哈希
        payload_str = json.dumps(payload, ensure_ascii=False)
        payload_hash = hashlib.sha256(payload_str.encode('utf-8')).hexdigest()
        
        # 规范请求
        canonical_request = (
            f"{http_request_method}\n"
            f"{canonical_uri}\n"
            f"{canonical_querystring}\n"
            f"{canonical_headers}\n"
            f"{signed_headers}\n"
            f"{payload_hash}"
        )
        
        # 凭据范围
        credential_scope = f"{date}/{self.service}/tc3_request"
        
        # 待签名字符串
        hashed_canonical_request = hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
        string_to_sign = (
            f"{algorithm}\n"
            f"{timestamp}\n"
            f"{credential_scope}\n"
            f"{hashed_canonical_request}"
        )
        
        # 计算签名密钥
        secret_date = self.sign(('TC3' + self.secret_key).encode('utf-8'), date)
        secret_service = self.sign(secret_date, self.service)
        secret_signing = self.sign(secret_service, "tc3_request")
        
        # 计算签名
        signature = hmac.new(
            secret_signing, 
            string_to_sign.encode('utf-8'), 
            hashlib.sha256
        ).hexdigest()
        
        # 构建Authorization
        authorization = (
            f"{algorithm} "
            f"Credential={self.secret_id}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, "
            f"Signature={signature}"
        )
        
        return authorization
    
    async def submit_3d_job(
        self,
        prompt: Optional[str] = None,
        image_base64: Optional[str] = None,
        image_url: Optional[str] = None,
        result_format: str = "GLB",
        enable_pbr: bool = False
    ) -> Dict[str, Any]:
        """
        提交混元生3D任务
        
        Args:
            prompt: 文本描述（文生3D）
            image_base64: 图片Base64数据（图生3D）
            image_url: 图片URL（图生3D）
            result_format: 生成格式（OBJ/GLB/STL/USDZ/FBX/MP4）
            enable_pbr: 是否开启PBR材质
            
        Returns:
            响应结果（包含JobId和RequestId）
        """
        # 参数验证：Prompt、ImageBase64、ImageUrl三选一
        if not any([prompt, image_base64, image_url]):
            raise ValueError("Prompt、ImageBase64、ImageUrl必须提供其中一个")
        
        # 构建请求参数
        payload = {
            "Action": "SubmitHunyuanTo3DJob",
            "Version": self.version,
            "Region": self.region,
        }
        
        if prompt:
            payload["Prompt"] = prompt
        if image_base64:
            payload["ImageBase64"] = image_base64
        if image_url:
            payload["ImageUrl"] = image_url
        if result_format:
            payload["ResultFormat"] = result_format
        if enable_pbr:
            payload["EnablePBR"] = enable_pbr
        
        # 生成签名
        timestamp = int(time.time())
        date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime('%Y-%m-%d')
        authorization = self.get_signature(payload, timestamp, date)
        
        # 构建请求头
        headers = {
            "Authorization": authorization,
            "Content-Type": "application/json",
            "Host": self.host,
            "X-TC-Action": "SubmitHunyuanTo3DJob",
            "X-TC-Version": self.version,
            "X-TC-Region": self.region,
            "X-TC-Timestamp": str(timestamp),
            "X-TC-Language": "zh-CN"
        }
        
        url = f"https://{self.host}"
        
        # 发送请求
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"提交任务失败: HTTP {response.status}, {error_text}")
                
                result = await response.json()
                
                # 检查响应
                if 'Response' not in result:
                    raise Exception(f"响应格式错误: {result}")
                
                response_data = result['Response']
                
                # 检查是否有错误
                if 'Error' in response_data:
                    error = response_data['Error']
                    raise Exception(f"API错误: {error.get('Code')} - {error.get('Message')}")
                
                if 'JobId' not in response_data:
                    raise Exception(f"未返回JobId: {response_data}")
                
                return {
                    "job_id": response_data['JobId'],
                    "request_id": response_data.get('RequestId'),
                    "status": "submitted"
                }
    
    async def query_3d_job(self, job_id: str) -> Dict[str, Any]:
        """
        查询混元生3D任务状态
        
        Args:
            job_id: 任务ID
            
        Returns:
            任务状态和结果
        """
        # 构建请求参数
        payload = {
            "Action": "QueryHunyuanTo3DJob",
            "Version": self.version,
            "Region": self.region,
            "JobId": job_id
        }
        
        # 生成签名
        timestamp = int(time.time())
        date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime('%Y-%m-%d')
        authorization = self.get_signature(payload, timestamp, date)
        
        # 构建请求头
        headers = {
            "Authorization": authorization,
            "Content-Type": "application/json",
            "Host": self.host,
            "X-TC-Action": "QueryHunyuanTo3DJob",
            "X-TC-Version": self.version,
            "X-TC-Region": self.region,
            "X-TC-Timestamp": str(timestamp),
            "X-TC-Language": "zh-CN"
        }
        
        url = f"https://{self.host}"
        
        # 发送请求
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"查询任务失败: HTTP {response.status}, {error_text}")
                
                result = await response.json()
                
                if 'Response' not in result:
                    raise Exception(f"响应格式错误: {result}")
                
                response_data = result['Response']
                
                if 'Error' in response_data:
                    error = response_data['Error']
                    raise Exception(f"API错误: {error.get('Code')} - {error.get('Message')}")
                
                return response_data


# 测试代码
async def test_api():
    """测试腾讯云API 3.0调用"""
    # 从环境变量获取SecretId和SecretKey
    secret_id = os.getenv("TENCENT_CLOUD_SECRET_ID", "")
    secret_key = os.getenv("TENCENT_CLOUD_SECRET_KEY", "")
    
    if not secret_id or not secret_key:
        print("⚠️  未配置TENCENT_CLOUD_SECRET_ID和TENCENT_CLOUD_SECRET_KEY")
        print("\n获取方法：")
        print("1. 登录 https://console.cloud.tencent.com/cam/capi")
        print("2. 点击【API密钥管理】->【新建密钥】")
        print("3. 复制SecretId和SecretKey")
        print("\n⚠️  注意：SecretKey只显示一次，请妥善保管！")
        return
    
    print("="*70)
    print("腾讯混元3D API 3.0 测试")
    print("="*70)
    print(f"SecretId: {secret_id[:20]}...")
    print(f"API地址: ai3d.tencentcloudapi.com")
    print(f"认证方式: TC3-HMAC-SHA256")
    
    # 创建客户端
    client = TencentCloudAPIClient(secret_id, secret_key)
    
    try:
        # 测试1：文生3D
        print("\n" + "="*70)
        print("测试1：文生3D")
        print("="*70)
        
        result = await client.submit_3d_job(
            prompt="一只可爱的小狗",
            result_format="GLB"
        )
        
        print(f"✅ 提交成功！")
        print(f"Job ID: {result['job_id']}")
        print(f"Request ID: {result['request_id']}")
        
        # 测试2：查询任务状态
        print("\n" + "="*70)
        print("测试2：查询任务状态")
        print("="*70)
        
        query_result = await client.query_3d_job(result['job_id'])
        print(f"任务状态: {query_result.get('Status')}")
        print(f"响应数据: {json.dumps(query_result, ensure_ascii=False, indent=2)}")
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_api())
