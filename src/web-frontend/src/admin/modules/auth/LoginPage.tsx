/**
 * Web3D Admin - 登录页面
 */

import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authProvider } from '../../core/providers/authProvider';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const result = await authProvider.login({
        username: values.username,
        password: values.password,
      });

      if (result.success) {
        message.success('登录成功');
        // 直接跳转到后台页面
        setTimeout(() => {
          window.location.href = '/admin/';
        }, 500);
      } else {
        message.error(result.error?.message || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error('登录失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      const result = await authProvider.login({
        username: 'admin',
        password: 'Admin123456',
      });

      if (result.success) {
        message.success('快速登录成功（开发者模式）');
        // 直接跳转到后台页面
        setTimeout(() => {
          window.location.href = '/admin/';
        }, 500);
      } else {
        message.error('快速登录失败，请检查后端服务');
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error('快速登录失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0, color: '#667eea' }}>
            Web3D Admin
          </Title>
          <Text type="secondary">管理后台登录</Text>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                fontSize: 16,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              登录
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="default"
              block
              size="large"
              loading={loading}
              onClick={handleQuickLogin}
              style={{
                height: 48,
                fontSize: 16,
              }}
            >
              ⚡ 快速登录（开发者模式）
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            默认账号: admin / 密码: Admin123456
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
