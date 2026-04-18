// 认证服务
import type { LoginForm, RegisterForm, AuthResponse, User } from './auth.types';

// 模拟用户数据
const MOCK_USERS: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: '2026-01-01',
  },
  {
    id: '2',
    username: 'user',
    email: 'user@example.com',
    role: 'user',
    createdAt: '2026-03-15',
  },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 登录
export async function login(form: LoginForm): Promise<AuthResponse> {
  await delay(1000);

  // 简单验证
  if (form.email === 'admin@example.com' && form.password === 'admin123') {
    const user = MOCK_USERS[0];
    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user,
      message: '登录成功',
    };
  }

  if (form.email === 'user@example.com' && form.password === 'user123') {
    const user = MOCK_USERS[1];
    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user,
      message: '登录成功',
    };
  }

  return {
    success: false,
    message: '邮箱或密码错误',
  };
}

// 注册
export async function register(form: RegisterForm): Promise<AuthResponse> {
  await delay(1000);

  // 检查邮箱是否已存在
  const existing = MOCK_USERS.find((u) => u.email === form.email);
  if (existing) {
    return {
      success: false,
      message: '该邮箱已被注册',
    };
  }

  // 创建新用户
  const newUser: User = {
    id: String(MOCK_USERS.length + 1),
    username: form.username,
    email: form.email,
    role: 'user',
    createdAt: new Date().toISOString().split('T')[0],
  };

  MOCK_USERS.push(newUser);

  return {
    success: true,
    token: 'mock-jwt-token-' + Date.now(),
    user: newUser,
    message: '注册成功',
  };
}

// 获取当前用户
export function getCurrentUser(): User | null {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  if (token && userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

// 登出
export function logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}
