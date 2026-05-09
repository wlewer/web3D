"""
模型版本配置加载器

从环境变量(.env)加载模型版本配置，提供配置驱动的版本信息查询接口。
所有版本相关的硬编码映射全部替换为从此模块读取。

配置格式（.env）:
    VERSION_LIST=hy-3d-3.0,hy-3d-3.1,HY-3D-Express
    VERSION_{版本标识}_{属性}=值

支持的属性:
    API_VERSION: 腾讯云API版本 (rapid|pro|express)
    ENDPOINT: API站点 (domestic|intl)
    DISPLAY: 显示名称
    COST: 额度消耗 (整数)
    MODE: 模式覆盖 (mock|cloud，可选，不设置则用全局 HUNYUAN3D_MODE)
    MOCK_FILE: Mock GLB文件路径 (可选，不设置则用默认 fallback)
    PREFIX: 目录前缀 (可选，不设置则自动生成)
    MESSAGE_CLOUD: 云端模式处理消息模板 (可选，支持 {display} {estimated_time} 占位符)
    SECRET_ID: 腾讯云SecretId覆盖 (可选，不设置则用全局 HUNYUAN3D_SECRET_ID)
    SECRET_KEY: 腾讯云SecretKey覆盖 (可选，不设置则用全局 HUNYUAN3D_SECRET_KEY)
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Dict, Optional

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ModelVersionConfig:
    """单个模型版本的完整配置"""
    name: str                     # 原始名称，如 hy-3d-3.0
    api_version: str = "rapid"    # 腾讯云API版本 rapid|pro|express
    endpoint: str = "domestic"    # API站点 domestic|intl
    display: str = ""             # 中文显示名，如"标准版"
    cost: int = 10                # 额度消耗
    mode: Optional[str] = None    # 模式覆盖 (None=使用全局HUNYUAN3D_MODE)
    mock_file: str = ""           # Mock GLB文件路径 (空=使用默认fallback)
    prefix: str = ""              # 目录前缀 (空=自动生成)
    message_cloud: str = ""       # 云端模式处理消息模板 (空=使用默认)
    secret_id: Optional[str] = None  # 腾讯云SecretId覆盖 (None=用全局)
    secret_key: Optional[str] = None  # 腾讯云SecretKey覆盖 (None=用全局)


# 所有已知版本的默认配置（供 .env 中没有显式配置时兜底）
_DEFAULT_VERSIONS: Dict[str, dict] = {
    'hy-3d-3.0': {
        'api_version': 'rapid',
        'endpoint': 'domestic',
        'display': '标准版',
        'cost': 10,
        'prefix': 'hy3d-rapid',
        'message_cloud': '云端GPU处理中（{display}，预计1-3分钟）...',
    },
    'hy-3d-3.1': {
        'api_version': 'pro',
        'endpoint': 'domestic',
        'display': '专业版',
        'cost': 20,
        'prefix': 'hy3d-pro',
        'message_cloud': '云端GPU处理中（{display}，预计1-3分钟）...',
    },
    'HY-3D-Express': {
        'api_version': 'express',
        'endpoint': 'intl',
        'display': '极速版',
        'cost': 1,
        'prefix': 'hy3d-express',
        'message_cloud': '国际站云端处理中（{display}·国际站，预计10-30秒）...',
    },
    # 兼容 key（供前端直接传 rapid/pro/express 时使用）
    'rapid': {
        'api_version': 'rapid',
        'endpoint': 'domestic',
        'display': '标准版',
        'cost': 10,
        'prefix': 'hy3d-rapid',
        'message_cloud': '云端GPU处理中（{display}，预计1-3分钟）...',
    },
    'pro': {
        'api_version': 'pro',
        'endpoint': 'domestic',
        'display': '专业版',
        'cost': 20,
        'prefix': 'hy3d-pro',
        'message_cloud': '云端GPU处理中（{display}，预计1-3分钟）...',
    },
    'express': {
        'api_version': 'express',
        'endpoint': 'intl',
        'display': '极速版',
        'cost': 1,
        'prefix': 'hy3d-express',
        'message_cloud': '国际站云端处理中（{display}·国际站，预计10-30秒）...',
    },
}


class ModelVersionsConfig:
    """模型版本配置集合

    从环境变量加载 VERSION_ 前缀的配置，以 .env 为准，默认值为兜底。
    支持运行时热加载（每次查询都重新检查环境变量）。
    """

    def __init__(self):
        self._cache: Dict[str, ModelVersionConfig] = {}

    def _build_config(self, name: str) -> ModelVersionConfig:
        """构建单个版本配置（从环境变量读取，默认值兜底）"""
        defaults = _DEFAULT_VERSIONS.get(name, {})
        prefix_key = f'VERSION_{name}_'

        api_version = os.getenv(f'{prefix_key}API_VERSION',
                                defaults.get('api_version', 'rapid'))
        endpoint = os.getenv(f'{prefix_key}ENDPOINT',
                             defaults.get('endpoint', 'domestic'))
        display = os.getenv(f'{prefix_key}DISPLAY',
                            defaults.get('display', name))
        cost_str = os.getenv(f'{prefix_key}COST',
                             str(defaults.get('cost', 10)))
        mode = os.getenv(f'{prefix_key}MODE')  # 可选，不设置为 None
        mock_file = os.getenv(f'{prefix_key}MOCK_FILE', '')
        env_prefix = os.getenv(f'{prefix_key}PREFIX', '')

        # 新增配置属性
        message_cloud = os.getenv(f'{prefix_key}MESSAGE_CLOUD',
                                  defaults.get('message_cloud', ''))
        secret_id = os.getenv(f'{prefix_key}SECRET_ID') or None
        secret_key = os.getenv(f'{prefix_key}SECRET_KEY') or None

        try:
            cost = int(cost_str)
        except (ValueError, TypeError):
            cost = defaults.get('cost', 10)

        # 自动生成目录前缀（如果.env中未设置）
        if not env_prefix:
            env_prefix = defaults.get('prefix', f'model-{name.replace(".", "-")}')

        return ModelVersionConfig(
            name=name,
            api_version=api_version,
            endpoint=endpoint,
            display=display,
            cost=cost,
            mode=mode,
            mock_file=mock_file,
            prefix=env_prefix,
            message_cloud=message_cloud,
            secret_id=secret_id,
            secret_key=secret_key,
        )

    def get(self, name: str) -> Optional[ModelVersionConfig]:
        """获取指定版本的配置

        Args:
            name: 版本标识，如 hy-3d-3.0、rapid 等

        Returns:
            ModelVersionConfig 或 None（版本不存在）
        """
        if name not in self._cache:
            # 检查是否在已知版本列表中
            available = self.get_version_list()
            if name not in available:
                return None
            self._cache[name] = self._build_config(name)
        return self._cache[name]

    def get_version_list(self) -> list:
        """获取所有可用版本名称列表"""
        version_list_str = os.getenv('VERSION_LIST', '')
        if version_list_str:
            names = [v.strip() for v in version_list_str.split(',') if v.strip()]
            # 确保兼容 key（rapid/pro/express）也在列表中
            for compat_key in ['rapid', 'pro', 'express']:
                if compat_key not in names:
                    names.append(compat_key)
            return names
        # 未配置 VERSION_LIST 时使用所有已知版本
        return list(_DEFAULT_VERSIONS.keys())

    def get_all(self) -> Dict[str, ModelVersionConfig]:
        """获取所有版本配置"""
        return {name: self.get(name) for name in self.get_version_list() if self.get(name)}

    def get_mode(self, name: str) -> str:
        """获取指定版本的有效模式

        优先级：版本级 MODE > 全局 HUNYUAN3D_MODE > 'mock'

        Args:
            name: 版本标识

        Returns:
            'mock' 或 'cloud'
        """
        # 1. 尝试版本级覆盖
        vc = self.get(name)
        if vc and vc.mode:
            return vc.mode.lower()

        # 2. 使用全局配置（优先 settings，兜底 os.getenv）
        global_mode = getattr(settings, 'HUNYUAN3D_MODE', None) or os.getenv('HUNYUAN3D_MODE', 'mock')
        return global_mode.lower()

    def invalidate_cache(self):
        """清除缓存（下次查询会重新从环境变量读取）"""
        self._cache.clear()

    def get_mock_file_path(self, name: str, default_path: str = '') -> str:
        """获取指定版本的 mock GLB 文件路径

        Args:
            name: 版本标识
            default_path: 默认 fallback 路径

        Returns:
            mock GLB 文件路径（可能不存在，调用方需做 fallback 处理）
        """
        vc = self.get(name)
        if vc and vc.mock_file:
            return vc.mock_file
        return default_path

    def get_cloud_message(self, name: str) -> str:
        """获取指定版本的云端处理消息模板

        支持 {display} {estimated_time} 占位符，调用方用 .format() 填充。

        Args:
            name: 版本标识

        Returns:
            消息模板字符串（不包含占位符时直接使用）
        """
        vc = self.get(name)
        if vc and vc.message_cloud:
            return vc.message_cloud
        # 兜底到默认值
        defaults = _DEFAULT_VERSIONS.get(name, {})
        return defaults.get('message_cloud', '云端GPU处理中（{display}，预计1-3分钟）...')

    def get_secrets(self, name: str) -> tuple:
        """获取指定版本的 API 密钥对

        优先级：版本级 SECRET_ID/SECRET_KEY > 全局 HUNYUAN3D_SECRET_ID/SECRET_KEY

        Args:
            name: 版本标识

        Returns:
            (secret_id, secret_key) 元组，均为 None 表示未配置
        """
        vc = self.get(name)

        # 1. 尝试版本级密钥
        if vc:
            if vc.secret_id and vc.secret_key:
                return (vc.secret_id, vc.secret_key)

        # 2. 使用全局密钥
        global_id = os.getenv('HUNYUAN3D_SECRET_ID')
        global_key = os.getenv('HUNYUAN3D_SECRET_KEY')
        return (global_id, global_key)


# 全局单例
model_versions = ModelVersionsConfig()
