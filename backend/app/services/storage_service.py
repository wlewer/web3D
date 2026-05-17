"""
Web3D Backend - 对象存储服务
Object Storage Service (MinIO/S3)
"""
import os
from typing import Optional, BinaryIO
from pathlib import Path
from loguru import logger
from minio import Minio
from minio.error import S3Error

from app.config import settings

# 租户隔离相关导入（延迟导入避免循环依赖）
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func


# 延迟导入模型（避免循环依赖）
def _get_models():
    from app.models.tenant import Tenant
    from app.models.model import Model3D
    from app.models.user import User
    return Tenant, Model3D, User


class ObjectStorageService:
    """对象存储服务封装（MinIO/S3 兼容）"""
    
    def __init__(self):
        """初始化 MinIO 客户端"""
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        
        # 确保 Bucket 存在
        self._ensure_bucket_exists(settings.MINIO_BUCKET_MODELS)
        self._ensure_bucket_exists(settings.MINIO_BUCKET_THUMBNAILS)
        
        logger.info(f"Object Storage initialized: {settings.MINIO_ENDPOINT}")
    
    def _ensure_bucket_exists(self, bucket_name: str):
        """确保 Bucket 存在，不存在则创建"""
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"Bucket created: {bucket_name}")
        except S3Error as e:
            logger.error(f"Failed to create bucket {bucket_name}: {e}")
            raise
    
    def upload_file(
        self,
        file_path: str,
        object_name: str,
        bucket: str = None,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        上传文件到对象存储
        
        Args:
            file_path: 本地文件路径
            object_name: 对象名称（路径）
            bucket: Bucket 名称（默认使用 models bucket）
            content_type: 内容类型
            
        Returns:
            文件的 URL
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET_MODELS
        
        try:
            self.client.fput_object(
                bucket_name=bucket,
                object_name=object_name,
                file_path=file_path,
                content_type=content_type
            )
            
            # 构建 URL
            protocol = "https" if settings.MINIO_SECURE else "http"
            url = f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket}/{object_name}"
            
            logger.info(f"File uploaded: {object_name} -> {url}")
            return url
        except S3Error as e:
            logger.error(f"Failed to upload file: {e}")
            raise
    
    def upload_bytes(
        self,
        data: bytes,
        object_name: str,
        bucket: str = None,
        content_type: str = "application/octet-stream",
        length: int = None
    ) -> str:
        """
        上传字节数据到对象存储
        
        Args:
            data: 字节数据
            object_name: 对象名称
            bucket: Bucket 名称
            content_type: 内容类型
            length: 数据长度（可选）
            
        Returns:
            文件的 URL
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET_MODELS
        
        if length is None:
            length = len(data)
        
        try:
            from io import BytesIO
            self.client.put_object(
                bucket_name=bucket,
                object_name=object_name,
                data=BytesIO(data),
                length=length,
                content_type=content_type
            )
            
            # 构建 URL
            protocol = "https" if settings.MINIO_SECURE else "http"
            url = f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket}/{object_name}"
            
            logger.info(f"Bytes uploaded: {object_name} -> {url}")
            return url
        except S3Error as e:
            logger.error(f"Failed to upload bytes: {e}")
            raise
    
    def download_file(
        self,
        object_name: str,
        file_path: str,
        bucket: str = None
    ):
        """
        下载文件到本地
        
        Args:
            object_name: 对象名称
            file_path: 本地保存路径
            bucket: Bucket 名称
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET_MODELS
        
        try:
            self.client.fget_object(
                bucket_name=bucket,
                object_name=object_name,
                file_path=file_path
            )
            logger.info(f"File downloaded: {object_name} -> {file_path}")
        except S3Error as e:
            logger.error(f"Failed to download file: {e}")
            raise
    
    def delete_file(
        self,
        object_name: str,
        bucket: str = None
    ):
        """
        删除对象存储中的文件
        
        Args:
            object_name: 对象名称
            bucket: Bucket 名称
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET_MODELS
        
        try:
            self.client.remove_object(bucket, object_name)
            logger.info(f"File deleted: {object_name}")
        except S3Error as e:
            logger.error(f"Failed to delete file: {e}")
            raise
    
    def get_presigned_url(
        self,
        object_name: str,
        bucket: str = None,
        expires: int = 3600
    ) -> str:
        """
        获取预签名 URL（用于临时访问）
        
        Args:
            object_name: 对象名称
            bucket: Bucket 名称
            expires: 过期时间（秒），默认 1 小时
            
        Returns:
            预签名 URL
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET_MODELS
        
        try:
            url = self.client.presigned_get_object(
                bucket_name=bucket,
                object_name=object_name,
                expires=expires
            )
            logger.info(f"Presigned URL generated: {object_name}")
            return url
        except S3Error as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise
    
    def list_objects(
        self,
        prefix: str = "",
        bucket: str = None,
        recursive: bool = False
    ) -> list:
        """
        列出对象
        
        Args:
            prefix: 前缀过滤
            bucket: Bucket 名称
            recursive: 是否递归列出
            
        Returns:
            对象列表
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET_MODELS
        
        try:
            objects = []
            for obj in self.client.list_objects(
                bucket_name=bucket,
                prefix=prefix,
                recursive=recursive
            ):
                objects.append({
                    "name": obj.object_name,
                    "size": obj.size,
                    "last_modified": obj.last_modified,
                    "etag": obj.etag
                })
            return objects
        except S3Error as e:
            logger.error(f"Failed to list objects: {e}")
            raise
    
    def file_exists(
        self,
        object_name: str,
        bucket: str = None
    ) -> bool:
        """
        检查文件是否存在
        
        Args:
            object_name: 对象名称
            bucket: Bucket 名称
            
        Returns:
            是否存在
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET_MODELS
        
        try:
            self.client.stat_object(bucket, object_name)
            return True
        except S3Error:
            return False

    # ===== 租户隔离方法 / Tenant-aware methods =====

    async def get_tenant_bucket(self, tenant_id: str | None = None, db: AsyncSession | None = None) -> str:
        """获取租户专属bucket名称"""
        if tenant_id and db:
            Tenant, _, _ = _get_models()
            result = await db.execute(select(Tenant.slug).where(Tenant.id == tenant_id))
            tenant_slug = result.scalar_one_or_none()
            if tenant_slug:
                bucket_name = f"web3d-{tenant_slug}-models"
                self._ensure_bucket_exists(bucket_name)
                return bucket_name
        return settings.MINIO_BUCKET_MODELS

    async def upload_file_for_tenant(
        self,
        tenant_id: str,
        file: UploadFile,
        db: AsyncSession,
        category: str = "models"
    ) -> str:
        """租户级文件上传，路径格式: /{tenant_id}/{category}/{filename}"""
        bucket = await self.get_tenant_bucket(tenant_id, db)
        original_filename = file.filename or "file.bin"
        object_name = f"{tenant_id}/{category}/{original_filename}"

        content = await file.read()
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            url = self.upload_file(
                tmp_path,
                object_name,
                bucket=bucket,
                content_type=file.content_type or "application/octet-stream"
            )
        finally:
            os.unlink(tmp_path)

        return url

    async def check_storage_quota(self, tenant_id: str, file_size: int, db: AsyncSession) -> bool:
        """检查租户存储配额是否足够"""
        Tenant, Model3D, User = _get_models()
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            return False
        if tenant.max_storage_bytes == -1:
            return True

        storage_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(Model3D.file_size), 0))
            .join(User, Model3D.created_by == User.id)
            .where(User.tenant_id == tenant_id)
        )
        used = storage_result.scalar() or 0
        return (used + file_size) <= tenant.max_storage_bytes


# 全局服务实例（单例模式）
_storage_service_instance: Optional[ObjectStorageService] = None


def get_storage_service() -> ObjectStorageService:
    """获取对象存储服务实例"""
    global _storage_service_instance
    if _storage_service_instance is None:
        # 如果 MinIO 未配置，返回 Mock 服务
        if not settings.MINIO_ENDPOINT:
            logger.warning("MinIO not configured, using mock storage service")
            _storage_service_instance = MockStorageService()
        else:
            _storage_service_instance = ObjectStorageService()
    return _storage_service_instance


class MockStorageService:
    """Mock 对象存储服务（用于开发环境）"""
    
    def __init__(self):
        self.storage_dir = Path("storage/mock")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Mock Storage Service initialized")
    
    def upload_file(self, file_path: str, object_name: str, bucket: str = None, content_type: str = "application/octet-stream") -> str:
        """模拟上传：复制文件到本地存储"""
        dest_path = self.storage_dir / object_name
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        import shutil
        shutil.copy2(file_path, dest_path)
        
        url = f"http://localhost:8000/storage/mock/{object_name}"
        logger.info(f"[Mock] File uploaded: {object_name}")
        return url
    
    def upload_bytes(self, data: bytes, object_name: str, bucket: str = None, content_type: str = "application/octet-stream", length: int = None) -> str:
        """模拟上传：保存字节数据"""
        dest_path = self.storage_dir / object_name
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(dest_path, 'wb') as f:
            f.write(data)
        
        url = f"http://localhost:8000/storage/mock/{object_name}"
        logger.info(f"[Mock] Bytes uploaded: {object_name}")
        return url
    
    def download_file(self, object_name: str, file_path: str, bucket: str = None):
        """模拟下载：从本地存储复制"""
        src_path = self.storage_dir / object_name
        if not src_path.exists():
            raise FileNotFoundError(f"File not found: {object_name}")
        
        import shutil
        shutil.copy2(src_path, file_path)
        logger.info(f"[Mock] File downloaded: {object_name}")
    
    def delete_file(self, object_name: str, bucket: str = None):
        """模拟删除：删除本地文件"""
        file_path = self.storage_dir / object_name
        if file_path.exists():
            file_path.unlink()
            logger.info(f"[Mock] File deleted: {object_name}")
    
    def get_presigned_url(self, object_name: str, bucket: str = None, expires: int = 3600) -> str:
        """模拟预签名 URL"""
        return f"http://localhost:8000/storage/mock/{object_name}"
    
    def list_objects(self, prefix: str = "", bucket: str = None, recursive: bool = False) -> list:
        """模拟列出对象"""
        objects = []
        for file_path in self.storage_dir.rglob("*"):
            if file_path.is_file() and str(file_path).startswith(str(self.storage_dir / prefix)):
                rel_path = file_path.relative_to(self.storage_dir)
                objects.append({
                    "name": str(rel_path),
                    "size": file_path.stat().st_size,
                    "last_modified": file_path.stat().st_mtime,
                    "etag": ""
                })
        return objects
    
    def file_exists(self, object_name: str, bucket: str = None) -> bool:
        """模拟检查文件存在"""
        file_path = self.storage_dir / object_name
        return file_path.exists()

    # ===== 租户隔离方法 / Tenant-aware mock methods =====

    async def get_tenant_bucket(self, tenant_id: str | None = None, db: AsyncSession | None = None) -> str:
        """Mock：返回默认bucket名称"""
        return "mock-bucket"

    async def upload_file_for_tenant(
        self,
        tenant_id: str,
        file: UploadFile,
        db: AsyncSession,
        category: str = "models"
    ) -> str:
        """Mock：租户级文件上传"""
        original_filename = file.filename or "file.bin"
        object_name = f"{tenant_id}/{category}/{original_filename}"
        import tempfile
        content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            url = self.upload_file(tmp_path, object_name)
        finally:
            os.unlink(tmp_path)
        return url

    async def check_storage_quota(self, tenant_id: str, file_size: int, db: AsyncSession) -> bool:
        """Mock：始终返回True（开发环境不限制）"""
        logger.debug(f"[MockStorage] Storage quota check for tenant {tenant_id}: {file_size} bytes -> always True")
        return True
