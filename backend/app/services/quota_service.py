"""
用户额度管理服务
User quota management service for Tencent Hunyuan3D API
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.quota import UserQuota
from app.models.user import User

logger = logging.getLogger(__name__)


class QuotaService:
    """用户额度管理服务"""
    
    # 默认资源配置 / Default resource package configuration
    DEFAULT_PACKAGES = {
        'standard': {
            'total_quota': 200,
            'package_name': '腾讯混元3D标准资源包',
            'expires_at_delta_days': 365  # 1年有效期
        },
        'pro': {
            'total_quota': 500,
            'package_name': '腾讯混元3D专业资源包',
            'expires_at_delta_days': 365
        },
        'enterprise': {
            'total_quota': 2000,
            'package_name': '腾讯混元3D企业资源包',
            'expires_at_delta_days': 365
        }
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_or_create_quota(self, user_id: str, package_type: str = 'standard') -> UserQuota:
        """
        获取或创建用户额度记录
        Get or create user quota record
        
        Args:
            user_id: 用户ID
            package_type: 资源包类型 (standard/pro/enterprise)
        
        Returns:
            UserQuota对象
        """
        # 异步查询
        result = await self.db.execute(
            select(UserQuota).where(UserQuota.user_id == user_id)
        )
        quota = result.scalar_one_or_none()
        
        if not quota:
            # 创建新的额度记录
            package_config = self.DEFAULT_PACKAGES.get(package_type, self.DEFAULT_PACKAGES['standard'])
            
            expires_at = None
            if package_config.get('expires_at_delta_days'):
                expires_at = datetime.now(timezone.utc) + timedelta(
                    days=package_config['expires_at_delta_days']
                )
            
            quota = UserQuota(
                user_id=user_id,
                total_quota=package_config['total_quota'],
                used_quota=0,
                remaining_quota=package_config['total_quota'],
                package_type=package_type,
                package_name=package_config['package_name'],
                expires_at=expires_at
            )
            
            self.db.add(quota)
            await self.db.commit()
            await self.db.refresh(quota)
            
            logger.info(f"[QuotaService] Created new quota for user {user_id}: {quota.total_quota} points")
        
        return quota
    
    async def get_quota_balance(self, user_id: str) -> Dict[str, Any]:
        """
        查询用户额度余额
        Get user quota balance
        
        Args:
            user_id: 用户ID
        
        Returns:
            包含额度信息的字典
        """
        quota = await self.get_or_create_quota(user_id)
        
        return {
            'success': True,
            'user_id': user_id,
            'total_quota': quota.total_quota,
            'used_quota': quota.used_quota,
            'remaining_quota': quota.remaining_quota,
            'package_type': quota.package_type,
            'package_name': quota.package_name,
            'starts_at': quota.starts_at.isoformat() if quota.starts_at else None,
            'expires_at': quota.expires_at.isoformat() if quota.expires_at else None,
            'is_expired': quota.is_expired,
            'usage_percentage': round(quota.usage_percentage, 2),
            'total_generations': quota.total_generations,
            'successful_generations': quota.successful_generations,
            'failed_generations': quota.failed_generations,
            'last_used_at': quota.last_used_at.isoformat() if quota.last_used_at else None
        }
    
    async def deduct_quota(self, user_id: str, amount: int, task_id: str = None) -> Dict[str, Any]:
        """
        扣除用户额度（原子操作）
        Deduct user quota (atomic operation)
        
        Args:
            user_id: 用户ID
            amount: 扣除额度数量
            task_id: 关联的任务ID（可选，用于日志）
        
        Returns:
            包含操作结果的字典
        """
        try:
            quota = await self.get_or_create_quota(user_id)
            
            # 检查是否过期
            if quota.is_expired:
                logger.warning(f"[QuotaService] Quota expired for user {user_id}")
                return {
                    'success': False,
                    'error': '额度已过期，请联系管理员续费',
                    'error_code': 'QUOTA_EXPIRED'
                }
            
            # 检查额度是否充足
            if not quota.can_afford(amount):
                logger.warning(
                    f"[QuotaService] Insufficient quota for user {user_id}: "
                    f"need {amount}, have {quota.remaining_quota}"
                )
                return {
                    'success': False,
                    'error': f'额度不足！当前剩余：{quota.remaining_quota}，需要：{amount}',
                    'error_code': 'INSUFFICIENT_QUOTA',
                    'remaining_quota': quota.remaining_quota,
                    'required_quota': amount
                }
            
            # 执行扣除
            success = quota.deduct(amount)
            
            if success:
                await self.db.commit()
                await self.db.refresh(quota)
                
                logger.info(
                    f"[QuotaService] Deducted {amount} points from user {user_id} "
                    f"(task: {task_id}), remaining: {quota.remaining_quota}"
                )
                
                return {
                    'success': True,
                    'user_id': user_id,
                    'deducted_amount': amount,
                    'remaining_quota': quota.remaining_quota,
                    'total_generations': quota.total_generations
                }
            else:
                await self.db.rollback()
                return {
                    'success': False,
                    'error': '扣除额度失败',
                    'error_code': 'DEDUCTION_FAILED'
                }
        
        except Exception as e:
            await self.db.rollback()
            logger.error(f"[QuotaService] Error deducting quota: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'系统错误：{str(e)}',
                'error_code': 'SYSTEM_ERROR'
            }
    
    async def refund_quota(self, user_id: str, amount: int, reason: str = '任务失败') -> Dict[str, Any]:
        """
        退还用户额度（任务失败时调用）
        Refund user quota (called when task fails)
        
        Args:
            user_id: 用户ID
            amount: 退还额度数量
            reason: 退还原因
        
        Returns:
            包含操作结果的字典
        """
        try:
            # 异步查询
            result = await self.db.execute(
                select(UserQuota).where(UserQuota.user_id == user_id)
            )
            quota = result.scalar_one_or_none()
            
            if not quota:
                logger.warning(f"[QuotaService] No quota found for user {user_id}, cannot refund")
                return {
                    'success': False,
                    'error': '未找到额度记录',
                    'error_code': 'QUOTA_NOT_FOUND'
                }
            
            quota.refund(amount)
            await self.db.commit()
            await self.db.refresh(quota)
            
            logger.info(
                f"[QuotaService] Refunded {amount} points to user {user_id} "
                f"(reason: {reason}), remaining: {quota.remaining_quota}"
            )
            
            return {
                'success': True,
                'user_id': user_id,
                'refunded_amount': amount,
                'remaining_quota': quota.remaining_quota,
                'reason': reason
            }
        
        except Exception as e:
            await self.db.rollback()
            logger.error(f"[QuotaService] Error refunding quota: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'系统错误：{str(e)}',
                'error_code': 'SYSTEM_ERROR'
            }
    
    def record_generation_success(self, user_id: str):
        """记录生成成功"""
        try:
            quota = self.db.query(UserQuota).filter(
                UserQuota.user_id == user_id
            ).first()
            
            if quota:
                quota.record_success()
                self.db.commit()
        except Exception as e:
            logger.error(f"[QuotaService] Error recording success: {e}")
    
    def update_quota_package(self, user_id: str, package_type: str, total_quota: int = None) -> Dict[str, Any]:
        """
        更新用户额度套餐（管理员功能）
        Update user quota package (admin function)
        
        Args:
            user_id: 用户ID
            package_type: 新套餐类型
            total_quota: 自定义总额度（可选）
        
        Returns:
            包含操作结果的字典
        """
        try:
            quota = self.get_or_create_quota(user_id, package_type)
            
            package_config = self.DEFAULT_PACKAGES.get(package_type, {})
            
            quota.package_type = package_type
            quota.package_name = package_config.get('package_name', '自定义资源包')
            
            if total_quota is not None:
                # 自定义额度
                old_total = quota.total_quota
                quota.total_quota = total_quota
                quota.remaining_quota = total_quota - quota.used_quota
                
                logger.info(
                    f"[QuotaService] Updated custom quota for user {user_id}: "
                    f"{old_total} -> {total_quota}"
                )
            else:
                # 使用默认套餐配置
                new_total = package_config.get('total_quota', quota.total_quota)
                old_total = quota.total_quota
                quota.total_quota = new_total
                quota.remaining_quota = new_total - quota.used_quota
                
                logger.info(
                    f"[QuotaService] Updated package for user {user_id}: "
                    f"{old_total} -> {new_total} ({package_type})"
                )
            
            # 更新有效期
            if package_config.get('expires_at_delta_days'):
                quota.expires_at = datetime.now(timezone.utc) + timedelta(
                    days=package_config['expires_at_delta_days']
                )
            
            self.db.commit()
            self.db.refresh(quota)
            
            return {
                'success': True,
                'user_id': user_id,
                'package_type': quota.package_type,
                'total_quota': quota.total_quota,
                'remaining_quota': quota.remaining_quota
            }
        
        except Exception as e:
            self.db.rollback()
            logger.error(f"[QuotaService] Error updating quota package: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'系统错误：{str(e)}',
                'error_code': 'SYSTEM_ERROR'
            }
