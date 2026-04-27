# 模型文件上传与下载 API

> 📅 创建日期：2026-04-19  
> 🎯 功能：本地文件存储的模型上传/下载  
> ✅ 状态：**已实现**

---

## 📋 API 端点

### 1. 上传模型文件

**端点**: `POST /api/v1/models/upload`

**请求**:
```bash
curl -X POST "http://localhost:8000/api/v1/models/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@model.glb" \
  -F "name=My 3D Model" \
  -F "description=A test model" \
  -F "category=product"
```

**支持格式**: GLB, GLTF, OBJ, FBX, PLY  
**最大大小**: 100MB

**响应**:
```json
{
  "id": "uuid",
  "name": "My 3D Model",
  "description": "A test model",
  "category": "product",
  "status": "pending",
  "format": "glb",
  "file_size": 1024000,
  "model_url": "uploads/models/xxx.glb",
  "created_at": "2026-04-19T18:00:00"
}
```

---

### 2. 下载模型文件

**端点**: `GET /api/v1/models/{model_id}/download`

**请求**:
```bash
curl -X GET "http://localhost:8000/api/v1/models/xxx/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_model.glb
```

**权限**: 
- 已审核通过的模型：所有登录用户可下载
- 待审核模型：仅创建者和管理员可下载

**响应**: 文件流（二进制）

---

## 🔧 实现细节

### 本地存储结构

```
backend/
└── uploads/
    └── models/
        ├── abc123.glb
        ├── def456.obj
        └── ghi789.fbx
```

### 文件验证

1. **扩展名检查** - 只允许指定格式
2. **大小限制** - 最大 100MB
3. **内容读取** - 防止空文件

### 数据库记录

上传成功后自动创建 `Model3D` 记录：
- `model_url`: 本地文件路径
- `status`: "pending"（待审核）
- `file_size`: 实际文件大小
- `format`: 文件扩展名

---

## 🚀 使用示例

### Python 客户端

```python
import requests

# 上传
with open('model.glb', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/v1/models/upload',
        headers={'Authorization': 'Bearer TOKEN'},
        files={'file': f},
        data={
            'name': 'My Model',
            'category': 'product'
        }
    )
    model_id = response.json()['id']

# 下载
response = requests.get(
    f'http://localhost:8000/api/v1/models/{model_id}/download',
    headers={'Authorization': 'Bearer TOKEN'}
)

with open('downloaded.glb', 'wb') as f:
    f.write(response.content)
```

### JavaScript 客户端

```javascript
// 上传
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'My Model');
formData.append('category', 'product');

const response = await fetch('http://localhost:8000/api/v1/models/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const model = await response.json();

// 下载
const downloadResponse = await fetch(
  `http://localhost:8000/api/v1/models/${model.id}/download`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const blob = await downloadResponse.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${model.name}.${model.format}`;
a.click();
```

---

## ⚠️ 注意事项

### 开发环境 vs 生产环境

| 特性 | 开发环境 | 生产环境 |
|------|---------|---------|
| **存储方式** | 本地文件系统 | MinIO/OSS/S3 |
| **文件路径** | `uploads/models/xxx.glb` | `https://cdn.example.com/xxx.glb` |
| **可扩展性** | 单服务器 | 分布式存储 |
| **备份** | 手动 | 自动 |

### 迁移到 OSS

将来切换到对象存储时，只需修改：

1. **上传逻辑**：
   ```python
   # 当前：本地保存
   with open(local_path, 'wb') as f:
       f.write(content)
   
   # 未来：OSS 上传
   from app.services.storage_service import get_storage_service
   storage = get_storage_service()
   url = storage.upload_bytes(data=content, object_name=object_name)
   ```

2. **下载逻辑**：
   ```python
   # 当前：FileResponse
   return FileResponse(path=str(model_path))
   
   # 未来：重定向到 OSS URL
   return {"download_url": presigned_url}
   ```

---

## 🧪 测试步骤

### 1. 准备测试文件

找一个小的 GLB 文件（< 10MB）用于测试。

### 2. 获取认证 Token

```bash
# 登录
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 保存 token
TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

### 3. 上传测试

```bash
curl -X POST "http://localhost:8000/api/v1/models/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.glb" \
  -F "name=Test Model" \
  -F "category=product"
```

### 4. 下载测试

```bash
curl -X GET "http://localhost:8000/api/v1/models/MODEL_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.glb
```

### 5. 验证文件

```bash
# 检查文件大小
ls -lh downloaded.glb

# 对比 MD5
md5sum test.glb downloaded.glb
```

---

## 📊 性能考虑

### 当前限制

- **并发上传**: 受限于服务器磁盘 I/O
- **存储空间**: 受限于服务器硬盘容量
- **带宽**: 受限于服务器网络

### 优化建议（未来）

1. **异步上传** - 使用 Celery 后台处理
2. **分片上传** - 大文件分块上传
3. **CDN 加速** - 静态资源 CDN 分发
4. **压缩存储** - GLB 文件压缩

---

## 🔗 相关文档

- **模型管理 API**: [`backend/app/api/v1/models.py`](file://d:\HBuilderProjects\web3D\backend\app\api\v1\models.py)
- **存储服务**: [`backend/app/services/storage_service.py`](file://d:\HBuilderProjects\web3D\backend\app\services\storage_service.py)
- **数据模型**: [`backend/app/models/model.py`](file://d:\HBuilderProjects\web3D\backend\app\models\model.py)

---

**最后更新**: 2026-04-19  
**维护人**: 开发团队  
**状态**: ✅ 已完成，本地测试可用
