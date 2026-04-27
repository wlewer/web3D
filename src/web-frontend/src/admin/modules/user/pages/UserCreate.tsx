/**
 * 用户管理 - 创建用户页
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserForm } from '../components/UserForm';

export const UserCreate: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/admin/users');
  };

  const handleCancel = () => {
    navigate('/admin/users');
  };

  return (
    <UserForm
      mode="create"
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default UserCreate;
