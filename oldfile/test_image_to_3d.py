"""测试混元3D图生3D功能"""
import os
import sys
import base64
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
print("测试混元3D图生3D功能")
print("="*70)

# 创建客户端
cred = credential.Credential(secret_id, secret_key)
httpProfile = HttpProfile()
httpProfile.endpoint = "ai3d.tencentcloudapi.com"
clientProfile = ClientProfile()
clientProfile.httpProfile = httpProfile
client = ai3d_client.Ai3dClient(cred, "ap-guangzhou", clientProfile)

# 准备测试图片（使用一个简单的PNG图片）
test_image_path = os.path.join(os.path.dirname(__file__), 'src', 'imgs', 'UI.png')

if not os.path.exists(test_image_path):
    print(f"\n⚠️ 测试图片不存在: {test_image_path}")
    print("将使用Base64编码的简单图片进行测试...")
    
    # 创建一个1x1的透明PNG图片作为测试
    import io
    from PIL import Image
    
    img = Image.new('RGBA', (100, 100), (255, 0, 0, 255))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    image_base64 = base64.b64encode(img_bytes.getvalue()).decode('utf-8')
else:
    print(f"\n使用测试图片: {test_image_path}")
    with open(test_image_path, 'rb') as f:
        image_data = f.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')

print(f"图片大小: {len(image_base64)} bytes")

# 提交图生3D任务
print("\n" + "="*70)
print("提交图生3D任务")
print("="*70)

req = models.SubmitHunyuanTo3DRapidJobRequest()
req.ImageBase64 = image_base64
req.Prompt = "一个红色的方块"

print("发送请求...")
try:
    resp = client.SubmitHunyuanTo3DRapidJob(req)
    
    job_id = resp.JobId
    request_id = resp.RequestId
    
    print(f"\n✅ 任务提交成功！")
    print(f"Job ID: {job_id}")
    print(f"Request ID: {request_id}")
    
    # 等待并查询状态
    print("\n等待10秒后查询任务状态...")
    time.sleep(10)
    
    print("\n" + "="*70)
    print("查询任务状态")
    print("="*70)
    
    req2 = models.QueryHunyuanTo3DRapidJobRequest()
    req2.JobId = job_id
    
    result = client.QueryHunyuanTo3DRapidJob(req2)
    
    print(f"任务状态: {result.Status}")
    print(f"Request ID: {result.RequestId}")
    
    if hasattr(result, 'ErrorMessage') and result.ErrorMessage:
        print(f"错误信息: {result.ErrorMessage}")
    
    if result.Status == 'SUCCESS':
        print(f"\n🎉🎉🎉 任务成功！")
        if hasattr(result, 'ResultUrl') and result.ResultUrl:
            print(f"GLB下载链接: {result.ResultUrl}")
            print("\n✅ 图生3D功能完全正常！")
    elif result.Status == 'FAIL':
        print(f"\n❌ 任务失败")
        if hasattr(result, 'ErrorMessage'):
            print(f"失败原因: {result.ErrorMessage}")
    else:
        print(f"\n⚠️ 任务仍在处理中: {result.Status}")
        print(f"Job ID: {job_id}")
        print("可以稍后使用 query_job_status.py 脚本查询")
        
except Exception as e:
    print(f"\n❌ 请求失败")
    print(f"错误类型: {type(e).__name__}")
    print(f"错误信息: {str(e)}")
    
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
print("总结")
print("="*70)
print("\n如果看到'任务成功'，说明图生3D功能正常！")
print("现在可以重启后端服务使用混元3D云端API了。")
