"""
Web3D Backend - Redis连接管理
Redis client singleton with graceful degradation
"""
from typing import Optional
from loguru import logger

# redis.asyncio 在 redis>=4.2 中可用
from redis.asyncio import Redis, ConnectionPool

from app.config import settings


class RedisManager:
    """Redis连接管理器（单例模式）
    
    特点：
    - 基于config中REDIS_URL和REDIS_ENABLED配置
    - 连接失败时优雅降级（返回None，不崩溃）
    - startup时尝试连接，shutdown时关闭
    """

    _instance: Optional["RedisManager"] = None
    _redis: Optional[Redis] = None
    _pool: Optional[ConnectionPool] = None
    _available: bool = False

    def __new__(cls) -> "RedisManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def redis(self) -> Optional[Redis]:
        """获取Redis客户端实例（可能为None）"""
        return self._redis

    @property
    def available(self) -> bool:
        """Redis是否可用"""
        return self._available and self._redis is not None

    async def connect(self) -> bool:
        """尝试连接Redis
        
        Returns:
            bool: 是否成功连接
        """
        if not settings.REDIS_ENABLED:
            logger.info("[RedisManager] Redis is disabled in settings (REDIS_ENABLED=False)")
            return False

        try:
            # 解析REDIS_URL创建连接池
            self._pool = ConnectionPool.from_url(
                settings.REDIS_URL,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                decode_responses=True,  # 自动解码字符串
            )
            self._redis = Redis(connection_pool=self._pool)

            # 验证连接
            await self._redis.ping()
            self._available = True

            logger.info(
                f"[RedisManager] Connected to Redis: {settings.REDIS_URL} "
                f"(max_connections={settings.REDIS_MAX_CONNECTIONS})"
            )
            return True

        except Exception as e:
            logger.warning(f"[RedisManager] Failed to connect Redis: {e}")
            self._redis = None
            self._pool = None
            self._available = False
            return False

    async def disconnect(self) -> None:
        """关闭Redis连接"""
        if self._redis is not None:
            try:
                await self._redis.close()
                logger.info("[RedisManager] Redis connection closed")
            except Exception as e:
                logger.warning(f"[RedisManager] Error closing Redis: {e}")
            finally:
                self._redis = None
                self._available = False

        if self._pool is not None:
            try:
                await self._pool.disconnect()
            except Exception:
                pass
            finally:
                self._pool = None


# 模块级便捷函数
def get_redis_manager() -> RedisManager:
    """获取RedisManager单例"""
    return RedisManager()


async def get_redis_client() -> Optional[Redis]:
    """获取Redis客户端（可能为None）"""
    return RedisManager().redis
