"""测试腾讯云混元3D SDK调用"""
import sys
import os
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

# 加载环境变量
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print("✓ .env文件已加载")
except ImportError:
    print("⚠ python-dotenv未安装，使用系统环境变量")

from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.ai3d.v20250513 import ai3d_client, models
import base64
import logging

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_sdk_call():
    """测试SDK调用"""
    
    # 从环境变量读取密钥（支持两种命名方式）
    secret_id = os.getenv('TENCENTCLOUD_SECRET_ID') or os.getenv('HUNYUAN3D_SECRET_ID', '')
    secret_key = os.getenv('TENCENTCLOUD_SECRET_KEY') or os.getenv('HUNYUAN3D_SECRET_KEY', '')
    
    if not secret_id or not secret_key:
        logger.error("请设置环境变量 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY")
        return
    
    logger.info(f"SecretId: {secret_id[:10]}...")
    logger.info(f"SecretKey: {secret_key[:10]}...")
    
    try:
        # 1. 初始化客户端
        cred = credential.Credential(secret_id, secret_key)
        
        http_profile = HttpProfile()
        http_profile.endpoint = "ai3d.tencentcloudapi.com"
        http_profile.reqTimeout = 60
        
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile
        
        client = ai3d_client.Ai3dClient(cred, "ap-guangzhou", client_profile)
        logger.info("✓ 客户端初始化成功")
        
        # 2. 准备测试图片（使用一个小的base64图片）
        # 这里使用一个1x1像素的PNG图片作为测试
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        logger.info(f"测试图片大小: {len(test_image_base64)} bytes")
        
        # 3. 提交任务 - 标准版
        logger.info("\n=== 测试 SubmitHunyuanTo3DRapidJob ===")
        req = models.SubmitHunyuanTo3DRapidJobRequest()
        req.ImageBase64 = test_image_base64
        
        logger.info(f"请求参数: ImageBase64长度={len(req.ImageBase64)}")
        
        resp = client.SubmitHunyuanTo3DRapidJob(req)
        
        logger.info(f"✓ 响应类型: {type(resp)}")
        logger.info(f"✓ 响应属性: {[attr for attr in dir(resp) if not attr.startswith('_')]}")
        
        # 尝试访问JobId
        if hasattr(resp, 'JobId'):
            logger.info(f"✓ JobId: {resp.JobId}")
        else:
            logger.error("✗ 响应对象没有 JobId 属性!")
            logger.error(f"  响应内容: {resp}")
        
        # 尝试转换为JSON
        if hasattr(resp, 'to_json_string'):
            logger.info(f"✓ 响应JSON: {resp.to_json_string()}")
        
        job_id = resp.JobId
        logger.info(f"\n任务ID: {job_id}")
        
        # 4. 查询任务状态
        logger.info("\n=== 测试 QueryHunyuanTo3DRapidJob ===")
        query_req = models.QueryHunyuanTo3DRapidJobRequest()
        query_req.JobId = job_id
        
        logger.info(f"查询参数: JobId={query_req.JobId}")
        
        query_resp = client.QueryHunyuanTo3DRapidJob(query_req)
        
        logger.info(f"✓ 查询响应类型: {type(query_resp)}")
        logger.info(f"✓ 查询响应属性: {[attr for attr in dir(query_resp) if not attr.startswith('_')]}")
        
        # 安全访问所有可能的属性
        status = getattr(query_resp, 'Status', 'NOT_FOUND')
        logger.info(f"✓ Status: {status}")
        
        job_id_from_query = getattr(query_resp, 'JobId', 'NOT_FOUND')
        logger.info(f"✓ JobId: {job_id_from_query}")
        
        error_msg = getattr(query_resp, 'ErrorMessage', None)
        logger.info(f"✓ ErrorMessage: {error_msg}")
        
        result_files = getattr(query_resp, 'ResultFile3Ds', None)
        logger.info(f"✓ ResultFile3Ds: {result_files}")
        
        # 尝试转换为JSON
        if hasattr(query_resp, 'to_json_string'):
            logger.info(f"✓ 查询响应JSON: {query_resp.to_json_string()}")
        
        logger.info("\n✅ SDK调用测试完成!")
        
    except Exception as e:
        logger.error(f"\n❌ 测试失败: {e}", exc_info=True)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sdk_call()
