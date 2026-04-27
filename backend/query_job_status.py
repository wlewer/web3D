"""查询混元3D任务详细状态"""
import os
import sys
import time
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.ai3d.v20250513 import ai3d_client, models

# 手动读取.env文件
env_path = os.path.join(os.path.dirname(__file__), '.env')
secret_id = None
secret_key = None

with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line.startswith('HUNYUAN3D_SECRET_ID='):
            secret_id = line.split('=', 1)[1].strip()
        elif line.startswith('HUNYUAN3D_SECRET_KEY='):
            secret_key = line.split('=', 1)[1].strip()

if not secret_id or not secret_key:
    print("❌ 未找到SecretId或SecretKey")
    sys.exit(1)

print("="*70)
print("查询混元3D任务状态")
print("="*70)

# 使用上次测试的Job ID
job_id = "1438492635039277056"
print(f"Job ID: {job_id}")

# 创建客户端
cred = credential.Credential(secret_id, secret_key)
httpProfile = HttpProfile()
httpProfile.endpoint = "ai3d.tencentcloudapi.com"
clientProfile = ClientProfile()
clientProfile.httpProfile = httpProfile
client = ai3d_client.Ai3dClient(cred, "ap-guangzhou", clientProfile)

# 查询任务
req = models.QueryHunyuanTo3DRapidJobRequest()
req.JobId = job_id

print("\n查询任务状态...")
result = client.QueryHunyuanTo3DRapidJob(req)

print(f"\n任务状态: {result.Status}")
print(f"Request ID: {result.RequestId}")

if hasattr(result, 'ErrorMessage') and result.ErrorMessage:
    print(f"错误信息: {result.ErrorMessage}")

if hasattr(result, 'ErrorCode') and result.ErrorCode:
    print(f"错误代码: {result.ErrorCode}")

if result.Status == 'SUCCESS':
    print(f"\n✅ 任务成功！")
    if hasattr(result, 'ResultUrl') and result.ResultUrl:
        print(f"GLB下载链接: {result.ResultUrl}")
elif result.Status == 'FAIL':
    print(f"\n❌ 任务失败")
    if hasattr(result, 'ErrorMessage'):
        print(f"失败原因: {result.ErrorMessage}")
else:
    print(f"\n⚠️ 任务状态: {result.Status}")

print("\n" + "="*70)
print("提示")
print("="*70)
print("如果任务仍在处理中，可以稍后再次运行此脚本查询。")
print("命令: python query_job_status.py")
