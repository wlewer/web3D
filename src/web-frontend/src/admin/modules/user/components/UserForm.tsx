/**
 * 用户管理 - 用户表单组件（创建/编辑）
 */

import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Card,
  message,
  Upload,
  Avatar,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useTranslate } from '@refinedev/core';
import type { IUserCreateDTO, IUserUpdateDTO } from '../types';
import { userApi } from '../api';

const { Option } = Select;
const { TextArea } = Input;

interface UserFormProps {
  mode: 'create' | 'edit';
  userId?: string;
  initialValues?: Partial<IUserCreateDTO | IUserUpdateDTO>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({
  mode,
  userId,
  initialValues,
  onSuccess,
  onCancel,
}) => {
  const translate = useTranslate();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string>('');

  // 初始化表单
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      if ('avatar' in initialValues && initialValues.avatar) {
        setAvatarUrl(initialValues.avatar as string);
      }
    }
  }, [initialValues, form]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (mode === 'create') {
        await userApi.create(values as IUserCreateDTO);
        message.success('用户创建成功');
      } else {
        if (!userId) {
          throw new Error('用户 ID 不能为空');
        }
        await userApi.update(userId, values as IUserUpdateDTO);
        message.success('用户更新成功');
      }
      
      onSuccess?.();
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 头像上传处理
  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'done') {
      const url = info.file.response?.url || URL.createObjectURL(info.file.originFileObj);
      setAvatarUrl(url);
      form.setFieldValue('avatar', url);
      message.success('头像上传成功');
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };

  return (
    <Card
      title={mode === 'create' ? '创建用户' : '编辑用户'}
      extra={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            loading={loading}
            onClick={() => form.submit()}
          >
            {mode === 'create' ? '创建' : '保存'}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          role: 'viewer',
          status: 'active',
          ...initialValues,
        }}
      >
        {/* 头像上传 */}
        <Form.Item label="头像">
          <Space direction="vertical" align="center">
            <Avatar
              size={80}
              src={avatarUrl}
              icon={<UserOutlined />}
            />
            <Upload
              name="avatar"
              listType="picture-card"
              showUploadList={false}
              onChange={handleAvatarChange}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('只能上传图片文件！');
                }
                const isLt2M = file.size / 1024 / 1024 < 2;
                if (!isLt2M) {
                  message.error('图片大小不能超过 2MB！');
                }
                return isImage && isLt2M;
              }}
            >
              <Button icon={<UploadOutlined />}>上传头像</Button>
            </Upload>
          </Space>
        </Form.Item>

        {/* 用户名 */}
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 20, message: '用户名长度为 3-20 个字符' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="请输入用户名"
            disabled={mode === 'edit'}
          />
        </Form.Item>

        {/* 邮箱 */}
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="请输入邮箱"
          />
        </Form.Item>

        {/* 手机号 */}
        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
          ]}
        >
          <Input
            prefix={<PhoneOutlined />}
            placeholder="请输入手机号"
          />
        </Form.Item>

        {/* 密码（仅创建时显示） */}
        {mode === 'create' && (
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少 6 个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>
        )}

        {/* 角色 */}
        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select placeholder="请选择角色">
            <Option value="super_admin">超级管理员</Option>
            <Option value="admin">管理员</Option>
            <Option value="editor">编辑者</Option>
            <Option value="viewer">查看者</Option>
          </Select>
        </Form.Item>

        {/* 状态（仅编辑时显示） */}
        {mode === 'edit' && (
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">活跃</Option>
              <Option value="inactive">未激活</Option>
              <Option value="suspended">已禁用</Option>
            </Select>
          </Form.Item>
        )}

        {/* 备注 */}
        <Form.Item name="remark" label="备注">
          <TextArea
            rows={4}
            placeholder="请输入备注信息"
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UserForm;
