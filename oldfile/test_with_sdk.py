"""使用腾讯云官方SDK测试混元3D API"""
import os
import sys

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

print("="*70)
print("腾讯云混元3D API测试（使用官方SDK）")
print("="*70)

if not secret_id or not secret_key:
    print("\n❌ 未找到SecretId或SecretKey")
    sys.exit(1)

print(f"SecretId: {secret_id[:20]}...")
print(f"SecretKey: {secret_key[:10]}...")

try:
    from tencentcloud.common import credential
    from tencentcloud.common.profile.client_profile import ClientProfile
    from tencentcloud.common.profile.http_profile import HttpProfile
    from tencentcloud.ai3d.v20250513 import ai3d_client, models
    
    print("\n✅ 成功导入腾讯云SDK")
    
    # 创建凭证
    cred = credential.Credential(secret_id, secret_key)
    
    # 创建HTTP配置
    httpProfile = HttpProfile()
    httpProfile.endpoint = "ai3d.tencentcloudapi.com"
    
    # 创建客户端配置
    clientProfile = ClientProfile()
    clientProfile.httpProfile = httpProfile
    
    # 创建客户端
    client = ai3d_client.Ai3dClient(cred, "ap-guangzhou", clientProfile)
    
    print("✅ 成功创建API客户端")
    
    # 测试提交任务
    print("\n" + "="*70)
    print("测试：提交文生3D任务")
    print("="*70)
    
    req = models.SubmitHunyuanTo3DRapidJobRequest()
    req.Prompt = "一只可爱的小狗"
    
    print("发送请求...")
    resp = client.SubmitHunyuanTo3DRapidJob(req)
    
    job_id = resp.JobId
    request_id = resp.RequestId
    
    print(f"\n✅ 任务提交成功！")
    print(f"Job ID: {job_id}")
    print(f"Request ID: {request_id}")
    
    # 等待几秒后查询状态
    print("\n等待5秒后查询任务状态...")
    import time
    time.sleep(5)
    
    print("\n" + "="*70)
    print("测试：查询任务状态")
    print("="*70)
    
    req2 = models.QueryHunyuanTo3DRapidJobRequest()
    req2.JobId = job_id
    
    print("发送查询请求...")
    result = client.QueryHunyuanTo3DRapidJob(req2)
    
    status = result.Status
    print(f"\n任务状态: {status}")
    
    if status == 'SUCCESS':
        result_url = result.ResultUrl
        print(f"GLB下载链接: {result_url}")
        print("\n🎉🎉🎉 测试完全成功！所有功能正常！")
    elif status == 'FAILED':
        error_msg = result.ErrorMessage
        print(f"❌ 任务失败: {error_msg}")
    else:
        print(f"⚠️ 任务仍在处理中: {status}")
        print("请稍后再次查询")
    
except ImportError as e:
    print(f"\n❌ 未安装腾讯云SDK")
    print(f"错误信息: {e}")
    print("\n请安装SDK：")
    print("pip install tencentcloud-sdk-python")
    
except Exception as e:
    print(f"\n❌ 测试失败")
    print(f"错误类型: {type(e).__name__}")
    print(f"错误信息: {str(e)}")
    
    # 打印详细错误信息
    import traceback
    print("\n详细堆栈信息:")
    traceback.print_exc()

print("\n" + "="*70)
print("总结")
print("="*70)
print("\n如果看到'测试完全成功'，说明配置正确！")
print("现在可以重启后端服务使用混元3D云端API了。")
