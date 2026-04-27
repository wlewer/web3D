"""
用户额度管理API
User quota management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.database import get_db
from app.services.quota_service import QuotaService
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quota", tags=["quota"])


@router.get("/balance")
async def get_quota_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    查询用户额度余额
    Get user quota balance
    
    Returns:
        包含额度信息的JSON响应
    """
    try:
        quota_service = QuotaService(db)
        balance = await quota_service.get_quota_balance(current_user.id)
        
        return {
            'success': True,
            'data': balance
        }
    
    except Exception as e:
        logger.error(f"[Quota API] Error getting balance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f'系统错误：{str(e)}')


@router.post("/deduct")
async def deduct_quota(
    amount: int,
    task_id: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    扣除用户额度
    Deduct user quota
    
    Args:
        amount: 扣除额度数量
        task_id: 关联的任务ID（可选）
    
    Returns:
        扣除结果
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail='扣除额度必须大于0')
    
    try:
        quota_service = QuotaService(db)
        result = await quota_service.deduct_quota(current_user.id, amount, task_id)
        
        if result['success']:
            return {
                'success': True,
                'data': result
            }
        else:
            # 返回具体的错误信息
            raise HTTPException(
                status_code=402 if result.get('error_code') == 'INSUFFICIENT_QUOTA' else 400,
                detail=result['error']
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Quota API] Error deducting quota: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f'系统错误：{str(e)}')


@router.post("/refund")
async def refund_quota(
    amount: int,
    reason: str = '任务失败',
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    退还用户额度（任务失败时调用）
    Refund user quota (called when task fails)
    
    Args:
        amount: 退还额度数量
        reason: 退还原因
    
    Returns:
        退还结果
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail='退还额度必须大于0')
    
    try:
        quota_service = QuotaService(db)
        result = await quota_service.refund_quota(current_user.id, amount, reason)
        
        if result['success']:
            return {
                'success': True,
                'data': result
            }
        else:
            raise HTTPException(status_code=400, detail=result['error'])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Quota API] Error refunding quota: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f'系统错误：{str(e)}')


# 管理员功能（需要admin权限）
@router.put("/admin/update-package/{user_id}")
async def admin_update_quota_package(
    user_id: str,
    package_type: str,
    total_quota: int = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    更新用户额度套餐（仅管理员）
    Update user quota package (admin only)
    
    Args:
        user_id: 目标用户ID
        package_type: 新套餐类型 (standard/pro/enterprise)
        total_quota: 自定义总额度（可选）
    """
    # TODO: 添加管理员权限检查
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='需要管理员权限')
    
    if package_type not in ['standard', 'pro', 'enterprise']:
        raise HTTPException(
            status_code=400,
            detail='无效的套餐类型，必须是: standard, pro, enterprise'
        )
    
    try:
        quota_service = QuotaService(db)
        result = await quota_service.update_quota_package(user_id, package_type, total_quota)
        
        if result['success']:
            return {
                'success': True,
                'data': result
            }
        else:
            raise HTTPException(status_code=400, detail=result['error'])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Quota API] Error updating package: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f'系统错误：{str(e)}')
