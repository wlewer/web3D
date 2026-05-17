"""
Web3D Backend - 任务状态存储抽象层
Task Store abstraction layer for 3D generation task state persistence

支持两种后端：
- RedisTaskStore: 生产环境，持久化 + TTL
- MemoryTaskStore: 开发/降级环境，内存字典回退
"""
from abc import ABC, abstractmethod
import json
import asyncio
from typing import Optional, Dict, Any
from loguru import logger


# ============== 全局实例管理 ==============
_task_store_instance: Optional["TaskStore"] = None


def get_task_store() -> "TaskStore":
    """获取当前全局TaskStore实例
    
    Raises:
        RuntimeError: 如果TaskStore尚未初始化
    """
    if _task_store_instance is None:
        raise RuntimeError(
            "TaskStore not initialized. "
            "Please ensure app startup event has run."
        )
    return _task_store_instance


def set_task_store(store: "TaskStore") -> None:
    """设置全局TaskStore实例（由main.py startup调用）"""
    global _task_store_instance
    _task_store_instance = store
    logger.info(f"[TaskStore] Global instance set: {store.__class__.__name__}")


# ============== 抽象基类 ==============
class TaskStore(ABC):
    """任务状态存储抽象基类
    
    所有3D生成任务的状态读写都通过此接口，
    底层可以是Redis或内存字典。
    """

    @abstractmethod
    async def set_task(self, task_id: str, data: dict, ttl: int = 86400) -> None:
        """创建或覆盖任务状态
        
        Args:
            task_id: 任务唯一标识
            data: 任务数据字典（会被JSON序列化）
            ttl: 过期时间（秒），默认24小时
        """
        ...

    @abstractmethod
    async def get_task(self, task_id: str) -> Optional[dict]:
        """获取任务状态
        
        Args:
            task_id: 任务唯一标识
            
        Returns:
            任务数据字典，如果不存在返回None
        """
        ...

    @abstractmethod
    async def delete_task(self, task_id: str) -> None:
        """删除任务状态
        
        Args:
            task_id: 任务唯一标识
        """
        ...

    @abstractmethod
    async def update_task(self, task_id: str, updates: dict) -> None:
        """增量更新任务状态
        
        Args:
            task_id: 任务唯一标识
            updates: 需要更新的字段字典（会合并到现有数据中）
        """
        ...


# ============== Redis实现 ==============
class RedisTaskStore(TaskStore):
    """Redis Hash存储实现
    
    Key格式: task:{task_id}
    使用Redis Hash存储字段，支持TTL自动过期。
    """

    def __init__(self, redis_client):
        """
        Args:
            redis_client: 已连接的redis.asyncio.Redis实例
        """
        self.redis = redis_client

    async def set_task(self, task_id: str, data: dict, ttl: int = 86400) -> None:
        key = f"task:{task_id}"
        # JSON序列化整个字典存储为单个hash字段
        await self.redis.hset(key, mapping={"data": json.dumps(data, ensure_ascii=False)})
        await self.redis.expire(key, ttl)
        logger.debug(f"[RedisTaskStore] SET {key} (ttl={ttl}s)")

    async def get_task(self, task_id: str) -> Optional[dict]:
        key = f"task:{task_id}"
        result = await self.redis.hget(key, "data")
        if result is None:
            return None
        # redis返回的是bytes，需要解码
        if isinstance(result, bytes):
            result = result.decode("utf-8")
        return json.loads(result)

    async def delete_task(self, task_id: str) -> None:
        key = f"task:{task_id}"
        await self.redis.delete(key)
        logger.debug(f"[RedisTaskStore] DEL {key}")

    async def update_task(self, task_id: str, updates: dict) -> None:
        key = f"task:{task_id}"
        # 先读取现有数据
        existing = await self.get_task(task_id)
        if existing is None:
            existing = {}
        # 合并更新
        existing.update(updates)
        # 写回（保留原有TTL）
        ttl = await self.redis.ttl(key)
        await self.set_task(task_id, existing, ttl=max(ttl, 60))
        logger.debug(f"[RedisTaskStore] UPDATE {key} fields={list(updates.keys())}")


# ============== 内存回退实现 ==============
class MemoryTaskStore(TaskStore):
    """内存字典实现（向后兼容 / Redis不可用时降级）
    
    与原有的 task_status = {} 行为完全一致，
    但实现了TaskStore接口，可无缝替换。
    """

    def __init__(self):
        self._store: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def set_task(self, task_id: str, data: dict, ttl: int = 86400) -> None:
        # 内存实现忽略TTL，但保留接口一致性
        async with self._lock:
            self._store[task_id] = data.copy()
        logger.debug(f"[MemoryTaskStore] SET task:{task_id}")

    async def get_task(self, task_id: str) -> Optional[dict]:
        async with self._lock:
            data = self._store.get(task_id)
            return data.copy() if data is not None else None

    async def delete_task(self, task_id: str) -> None:
        async with self._lock:
            self._store.pop(task_id, None)
        logger.debug(f"[MemoryTaskStore] DEL task:{task_id}")

    async def update_task(self, task_id: str, updates: dict) -> None:
        async with self._lock:
            if task_id not in self._store:
                self._store[task_id] = {}
            self._store[task_id].update(updates)
        logger.debug(f"[MemoryTaskStore] UPDATE task:{task_id} fields={list(updates.keys())}")
