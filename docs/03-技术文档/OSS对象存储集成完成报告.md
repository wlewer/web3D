# OSS 对象存储集成完成报告

> 📅 完成日期：2026-04-19  
> 🎯 功能：MinIO/S3 兼容的对象存储服务  
> ✅ 状态：**已完成并支持 Mock 模式**

---

## ✅ 已完成的工作

### 1. 对象存储服务封装

**文件**: [`backend/app/services/storage_service.py`](file://d:\HBuilderProjects\web3D\backend\app\services\storage_service.py) (363 行)

**核心类**：

| 类名 | 用途 | 说明 |
|------|------|------|
| `ObjectStorageService` | MinIO 服务 | 生产环境使用 |
| `MockStorageService` | Mock 服务 | 开发环境使用 |
| `get_storage_service()` | 工厂函数 | 自动选择服务 |

---

### 2. 完整的功能实现

#### 2.1 文件上传（2 种方式）

```python
# 方式 1: 从本地文件上传
url = storage.upload_file(
    file_path="/path/to/model.glb",
    object_name="models/2026/04/model_123.glb",
    bucket="web3d-models",
    content_type="model/gltf-binary"
)

# 方式 2: 从字节数据上传
url = storage.upload_bytes(
    data=binary_data,
    object_name="thumbnails/thumb_123.jpg",
    bucket="web3d-thumbnails",
    content_type="image/jpeg"
)
```

#### 2.2 文件下载

```python
storage.download_file(
    object_name="models/2026/04/model_123.glb",
    file_path="/tmp/downloaded_model.glb",
    bucket="web3d-models"
)
```

#### 2.3 文件删除

```python
storage.delete_file(
    object_name="models/2026/04/model_123.glb",
    bucket="web3d-models"
)
```

#### 2.4 预签名 URL（临时访问）

```python
# 生成 1 小时有效的临时访问链接
temp_url = storage.get_presigned_url(
    object_name="private/model.glb",
    bucket="web3d-models",
    expires=3600  # 1 小时
)
```

#### 2.5 列出对象

```python
objects = storage.list_objects(
    prefix="models/2026/04/",
    bucket="web3d-models",
    recursive=True
)

# 返回：
# [
#   {"name": "models/2026/04/model_1.glb", "size": 1024000, ...},
#   {"name": "models/2026/04/model_2.glb", "size": 2048000, ...}
# ]
```

#### 2.6 检查文件存在

```python
exists = storage.file_exists(
    object_name="models/2026/04/model_123.glb",
    bucket="web3d-models"
)
```

---

### 3. Mock 模式（开发环境）

当 MinIO 未配置时，自动切换到 Mock 模式：

```python
# backend/app/config.py
MINIO_ENDPOINT: str = ""  # 空字符串触发 Mock 模式
```

**Mock 模式特点**：
- ✅ 文件保存到本地 `storage/mock/` 目录
- ✅ 所有 API 方法都可用
- ✅ 无需安装 MinIO
- ✅ 适合本地开发和测试

**文件结构**：
```
storage/
└── mock/
    ├── models/
    │   └── 2026/
    │       └── 04/
    │           └── model_123.glb
    └── thumbnails/
        └── thumb_123.jpg
```

---

## 🗄️ Bucket 配置

### 默认 Buckets

| Bucket 名称 | 用途 | 文件类型 |
|------------|------|---------|
| `web3d-models` | 3D 模型文件 | .glb, .gltf, .obj, .fbx |
| `web3d-thumbnails` | 缩略图 | .jpg, .png, .webp |

### 自动创建

服务启动时自动检查并创建 Buckets：

```python
def __init__(self):
    self.client = Minio(...)
    self._ensure_bucket_exists(settings.MINIO_BUCKET_MODELS)
    self._ensure_bucket_exists(settings.MINIO_BUCKET_THUMBNAILS)
```

---

## 🔧 配置说明

### 环境变量（`.env`）

```env
# MinIO 配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minio_password_2025
MINIO_SECURE=false
MINIO_BUCKET_MODELS=web3d-models
MINIO_BUCKET_THUMBNAILS=web3d-thumbnails
```

### 开发环境（Mock 模式）

```env
# 留空即可启用 Mock 模式
MINIO_ENDPOINT=
```

---

## 🚀 使用示例

### 示例 1: 在 API 中使用

```python
from app.services.storage_service import get_storage_service

@router.post("/upload")
async def upload_model(file: UploadFile = File(...)):
    storage = get_storage_service()
    
    # 保存临时文件
    temp_path = f"/tmp/{uuid.uuid4()}.glb"
    with open(temp_path, 'wb') as f:
        f.write(await file.read())
    
    # 上传到对象存储
    object_name = f"models/{datetime.now().strftime('%Y/%m')}/{uuid.uuid4()}.glb"
    url = storage.upload_file(
        file_path=temp_path,
        object_name=object_name,
        content_type=file.content_type
    )
    
    # 清理临时文件
    os.remove(temp_path)
    
    return {"url": url}
```

### 示例 2: 生成预签名 URL

```python
@router.get("/models/{model_id}/download")
async def download_model(model_id: str):
    storage = get_storage_service()
    
    # 从数据库获取模型路径
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    
    # 生成临时下载链接（1 小时有效）
    presigned_url = storage.get_presigned_url(
        object_name=model.model_url,
        expires=3600
    )
    
    return {"download_url": presigned_url}
```

### 示例 3: 删除模型文件

```python
@router.delete("/models/{model_id}")
async def delete_model(model_id: str):
    storage = get_storage_service()
    
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    
    # 删除对象存储中的文件
    storage.delete_file(object_name=model.model_url)
    
    # 删除数据库记录
    db.delete(model)
    db.commit()
    
    return {"message": "Model deleted"}
```

---

## 📊 与 Hunyuan3D 集成

### 当前状态

`generation.py` 目前使用本地文件系统保存上传的图片。可以优化为使用对象存储：

**修改前**：
```python
# 保存到本地
temp_path = UPLOAD_DIR / f"{uuid.uuid4()}.{file_ext}"
with open(temp_path, 'wb') as buffer:
    buffer.write(content)
```

**修改后**：
```python
from app.services.storage_service import get_storage_service

storage = get_storage_service()

# 上传到对象存储
object_name = f"uploads/{uuid.uuid4()}.{file_ext}"
url = storage.upload_bytes(
    data=content,
    object_name=object_name,
    bucket="web3d-models",
    content_type=file.content_type
)
```

---

## 🐳 Docker Compose 配置

项目中已包含 MinIO 服务配置：

```yaml
# backend/docker-compose.yml
web3d-minio:
  image: minio/minio:latest
  container_name: web3d-minio
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minio_password_2025
  ports:
    - "9000:9000"      # API 端口
    - "9001:9001"      # Console 端口
  volumes:
    - web3d_minio_data:/data
  command: server /data --console-address ":9001"
```

**启动命令**：
```bash
cd backend
docker-compose up -d web3d-minio
```

**访问 Console**：
- URL: http://localhost:9001
- 用户名: `minioadmin`
- 密码: `minio_password_2025`

---

## 🧪 测试建议

### 1. 单元测试

```python
def test_upload_file():
    """测试文件上传"""
    storage = get_storage_service()
    
    # 创建测试文件
    test_file = Path("/tmp/test.txt")
    test_file.write_text("Hello World")
    
    # 上传
    url = storage.upload_file(
        file_path=str(test_file),
        object_name="test/test.txt"
    )
    
    assert url is not None
    assert "test.txt" in url
    
    # 清理
    test_file.unlink()

def test_mock_mode():
    """测试 Mock 模式"""
    # 确保使用 Mock 服务
    storage = MockStorageService()
    
    url = storage.upload_bytes(
        data=b"test data",
        object_name="test.bin"
    )
    
    assert url.startswith("http://localhost:8000/storage/mock/")
    assert storage.file_exists("test.bin")
```

### 2. 集成测试

1. **启动 MinIO**：
   ```bash
   docker-compose up -d web3d-minio
   ```

2. **配置环境变量**：
   ```env
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minio_password_2025
   ```

3. **运行测试**：
   ```bash
   pytest tests/test_storage.py -v
   ```

---

## 📝 下一步计划

### 短期（本周）

1. **集成到现有 API**
   - 修改 `generation.py` 使用对象存储
   - 修改 `models.py` 上传 GLB 文件
   - 修改 `templates.py` 上传缩略图

2. **添加文件清理任务**
   - 定期清理临时文件
   - Celery 定时任务

3. **添加文件大小限制**
   - 最大上传大小配置
   - 文件类型白名单

### 中期（下周）

1. **CDN 集成**
   - 配置 CloudFront/阿里云 CDN
   - 加速静态资源访问

2. **图片处理**
   - 自动生成缩略图
   - 图片压缩和优化

3. **统计分析**
   - 存储空间使用情况
   - 流量统计

---

## 🔗 相关文档

- **存储服务代码**: [`backend/app/services/storage_service.py`](file://d:\HBuilderProjects\web3D\backend\app\services\storage_service.py)
- **配置文件**: [`backend/app/config.py`](file://d:\HBuilderProjects\web3D\backend\app\config.py)
- **Docker Compose**: [`backend/docker-compose.yml`](file://d:\HBuilderProjects\web3D\backend\docker-compose.yml)
- **依赖文件**: [`backend/requirements.txt`](file://d:\HBuilderProjects\web3D\backend\requirements.txt)

---

## 💡 常见问题

### Q1: Mock 模式和真实 MinIO 有什么区别？

**A**: 
- **Mock 模式**: 文件保存到本地磁盘，适合开发测试
- **MinIO**: 分布式对象存储，适合生产环境

切换只需修改 `MINIO_ENDPOINT` 配置。

### Q2: 如何迁移从 Mock 到 MinIO？

**A**:
1. 启动 MinIO 容器
2. 修改 `.env` 配置
3. 重启后端服务
4. （可选）迁移已有文件到 MinIO

### Q3: 支持其他 S3 兼容服务吗？

**A**: 支持！只需修改配置：

```env
# 阿里云 OSS
MINIO_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_SECURE=true

# AWS S3
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=your_aws_key
MINIO_SECRET_KEY=your_aws_secret
MINIO_SECURE=true
```

### Q4: 如何处理大文件上传？

**A**: MinIO 支持分片上传（Multipart Upload），对于 >100MB 的文件：

```python
# 使用分片上传
self.client.fput_object(
    bucket_name=bucket,
    object_name=object_name,
    file_path=file_path,
    part_size=10*1024*1024  # 10MB per part
)
```

---

## 📈 总结

### 已完成

- ✅ 完整的对象存储服务封装
- ✅ MinIO 集成
- ✅ Mock 模式支持
- ✅ 7 个核心方法实现
- ✅ 详细的错误处理和日志
- ✅ Docker Compose 配置

### 优势

1. **灵活性** - 支持 MinIO、AWS S3、阿里云 OSS
2. **易用性** - 统一的 API 接口
3. **安全性** - 预签名 URL 临时访问
4. **可扩展** - 易于添加新功能
5. **开发友好** - Mock 模式无需外部依赖

### 适用场景

- 3D 模型文件存储
- 缩略图和预览图
- 用户上传的图片
- 模板配置文件
- 备份和归档

---

**最后更新**: 2026-04-19  
**维护人**: 开发团队  
**状态**: ✅ 已完成，可集成到现有 API
