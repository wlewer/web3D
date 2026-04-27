"""
Web3D Backend - 用户API路由
User API endpoints with full CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
import math

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    PasswordResetRequest,
    BatchOperationRequest,
)
from app.dependencies import get_current_user, require_role
from app.core.security import get_password_hash
from loguru import logger

router = APIRouter()


@router.get("/", response_model=UserListResponse)
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    username: Optional[str] = None,
    email: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """
    获取用户列表（分页+筛选）
    Get user list with pagination and filters
    """
    try:
        # 构建查询
        query = db.query(User)
        
        # 应用筛选条件
        if username:
            query = query.filter(User.username.ilike(f"%{username}%"))
        if email:
            query = query.filter(User.email.ilike(f"%{email}%"))
        if role:
            query = query.filter(User.role == role)
        if status_filter:
            query = query.filter(User.status == status_filter)
        
        # 获取总数
        total = query.count()
        
        # 分页
        offset = (page - 1) * page_size
        users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()
        
        # 计算总页数
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return UserListResponse(
            data=[UserResponse.model_validate(user) for user in users],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"Failed to list users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取单个用户详情
    Get single user details
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    创建新用户（仅管理员）
    Create new user (admin only)
    """
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(
        or_(User.username == user_data.username, User.email == user_data.email)
    ).first()
    
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
    
    # 创建新用户
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        phone=user_data.phone,
        avatar_url=user_data.avatar_url,
        role=user_data.role.value,
        status="active",
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"User created: {new_user.username} by {current_user.username}")
    
    return UserResponse.model_validate(new_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新用户信息
    Update user information
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 权限检查：只能修改自己的信息，除非是管理员
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # 更新字段
    update_data = user_data.model_dump(exclude_unset=True)
    
    # 如果更新用户名或邮箱，检查是否与其他用户冲突
    if "username" in update_data or "email" in update_data:
        query = db.query(User).filter(User.id != user_id)
        if "username" in update_data:
            query = query.filter(User.username == update_data["username"])
        if "email" in update_data:
            query = query.filter(User.email == update_data["email"])
        
        if query.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    logger.info(f"User updated: {user.username} by {current_user.username}")
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    删除用户（仅管理员）
    Delete user (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 防止删除自己
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    logger.info(f"User deleted: {user.username} by {current_user.username}")
    
    return None


@router.post("/batch")
async def batch_operation(
    operation: BatchOperationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    批量操作用户
    Batch operation on users
    """
    users = db.query(User).filter(User.id.in_(operation.ids)).all()
    
    if not users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No users found with provided IDs"
        )
    
    action = operation.action
    
    for user in users:
        # 防止操作自己
        if user.id == current_user.id:
            continue
            
        if action == "activate":
            user.status = "active"
        elif action == "deactivate":
            user.status = "inactive"
        elif action == "suspend":
            user.status = "banned"
        elif action == "delete":
            db.delete(user)
    
    db.commit()
    
    logger.info(f"Batch operation '{action}' performed on {len(users)} users by {current_user.username}")
    
    return {"message": f"Successfully performed {action} on {len(users)} users"}


@router.post("/reset-password")
async def reset_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    重置用户密码（仅管理员）
    Reset user password (admin only)
    """
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    user = db.query(User).filter(User.id == request.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.password_hash = get_password_hash(request.new_password)
    db.commit()
    
    logger.info(f"Password reset for user {user.username} by {current_user.username}")
    
    return {"message": "Password reset successfully"}


@router.get("/stats")
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    获取用户统计信息
    Get user statistics
    """
    total = db.query(func.count(User.id)).scalar()
    active = db.query(func.count(User.id)).filter(User.status == "active").scalar()
    inactive = db.query(func.count(User.id)).filter(User.status == "inactive").scalar()
    banned = db.query(func.count(User.id)).filter(User.status == "banned").scalar()
    
    # 按角色统计
    roles = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    by_role = {role: count for role, count in roles}
    
    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "banned": banned,
        "byRole": by_role,
    }
