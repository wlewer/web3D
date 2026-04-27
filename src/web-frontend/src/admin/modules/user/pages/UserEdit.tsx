/**
 * 用户管理 - 编辑用户页
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { UserForm } from '../components/UserForm';
import { userApi } from '../api';
import type { IUserUpdateDTO } from '../types';

export const UserEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<Partial<IUserUpdateDTO>>();

  useEffect(() => {
    if (!id) {
      message.error('用户 ID 不能为空');
      navigate('/admin/users');
      return;
    }

    // 获取用户信息
    userApi.getById(id)
      .then((response) => {
        setInitialValues(response.data);
      })
      .catch(() => {
        message.error('获取用户信息失败');
        navigate('/admin/users');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, navigate]);

  const handleSuccess = () => {
    navigate('/admin/users');
  };

  const handleCancel = () => {
    navigate('/admin/users');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <UserForm
      mode="edit"
      userId={id}
      initialValues={initialValues}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default UserEdit;
