// 认证页面组件
import { useState } from 'react';
import { Input, Button, Form, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from '../../i18n';
import { login, register } from './auth.service';
import './AuthPage.css';

interface AuthPageProps {
  mode?: 'login' | 'register';
  onSuccess?: () => void;
}

export function AuthPage({ mode: initialMode = 'login', onSuccess }: AuthPageProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);

  // 登录表单提交
  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values);
      if (result.success && result.token && result.user) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('auth_user', JSON.stringify(result.user));
        message.success(t.auth.loginSuccess);
        onSuccess?.();
      } else {
        message.error(result.message || t.auth.loginFailed);
      }
    } catch {
      message.error(t.auth.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  // 注册表单提交
  const handleRegister = async (values: { username: string; email: string; password: string; confirmPassword: string }) => {
    // 验证密码确认
    if (values.password !== values.confirmPassword) {
      message.error(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const result = await register(values);
      if (result.success && result.token && result.user) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('auth_user', JSON.stringify(result.user));
        message.success(t.auth.registerSuccess);
        onSuccess?.();
      } else {
        message.error(result.message || t.auth.registerFailed);
      }
    } catch {
      message.error(t.auth.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  // 切换模式
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* 切换标签 */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            {t.auth.login}
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            {t.auth.register}
          </button>
        </div>

        {/* 登录表单 */}
        {mode === 'login' && (
          <Form
            name="login"
            className="auth-form"
            onFinish={handleLogin}
            layout="vertical"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: t.auth.invalidEmail },
                { type: 'email', message: t.auth.invalidEmail },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={t.auth.email}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: t.auth.passwordTooShort }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t.auth.password}
                size="large"
              />
            </Form.Item>

            <div className="auth-options">
              <a href="#" className="auth-link">
                {t.auth.forgotPassword}
              </a>
            </div>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                {t.auth.loginButton}
              </Button>
            </Form.Item>

            <div className="auth-footer">
              <span>{t.auth.noAccount}</span>
              <button type="button" onClick={toggleMode} className="auth-link">
                {t.auth.register}
              </button>
            </div>

            {/* 测试账号提示 */}
            <div className="auth-hint">
              <p>测试账号：admin@example.com / admin123</p>
              <p>测试账号：user@example.com / user123</p>
            </div>
          </Form>
        )}

        {/* 注册表单 */}
        {mode === 'register' && (
          <Form
            name="register"
            className="auth-form"
            onFinish={handleRegister}
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t.auth.username}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: t.auth.invalidEmail },
                { type: 'email', message: t.auth.invalidEmail },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={t.auth.email}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: t.auth.passwordTooShort }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t.auth.password}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[{ required: true, message: '请确认密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t.auth.confirmPassword}
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                {t.auth.registerButton}
              </Button>
            </Form.Item>

            <div className="auth-footer">
              <span>{t.auth.hasAccount}</span>
              <button type="button" onClick={toggleMode} className="auth-link">
                {t.auth.login}
              </button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}
