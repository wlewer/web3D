/**
 * Web3D Admin - 认证提供者
 * 
 * 实现 Refine 的 AuthProvider 接口，处理登录、登出、权限检查等
 */

import { type AuthProvider } from '@refinedev/core';
import axiosInstance from './axios';
import type { IUser } from '../types';

/**
 * 认证提供者
 */
export const authProvider: AuthProvider = {
  // 登录
  login: async ({ username, password }) => {
    try {
      const response = await axiosInstance.post('/auth/login', {
        username,
        password,
      });

      // 后端返回格式: { code: 200, message: '...', data: { user, access_token, ... } }
      const responseData = response.data;
      const loginData = responseData.data || responseData;
      
      const { access_token, user } = loginData;

      if (!access_token || !user) {
        throw new Error('登录响应数据格式错误');
      }

      // 存储 token 和用户信息
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_info', JSON.stringify(user));

      return {
        success: true,
        redirectTo: '/admin',
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: {
          message: error.response?.data?.message || error.message || '登录失败，请检查用户名和密码',
          name: error.response?.data?.error || 'LoginError',
        },
      };
    }
  },

  // 登出
  logout: async () => {
    try {
      // 调用后端登出接口（可选）
      await axiosInstance.post('/auth/logout').catch(() => {
        // 忽略错误，确保本地清理
      });
    } finally {
      // 清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
    }

    return {
      success: true,
      redirectTo: '/admin/login',
    };
  },

  // 检查用户是否已认证
  check: async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      return {
        authenticated: false,
        error: {
          message: '未登录',
          name: 'NotAuthenticated',
        },
        logout: true,
        redirectTo: '/admin/login',
      };
    }

    // 可选：验证 token 是否有效
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        throw new Error('User info not found');
      }
      
      return {
        authenticated: true,
      };
    } catch {
      return {
        authenticated: false,
        error: {
          message: 'Token 无效或已过期',
          name: 'InvalidToken',
        },
        logout: true,
        redirectTo: '/admin/login',
      };
    }
  },

  // 获取用户信息
  getIdentity: async () => {
    const userInfo = localStorage.getItem('user_info');
    
    if (!userInfo) {
      return null;
    }

    try {
      const user: IUser = JSON.parse(userInfo);
      return {
        ...user,
        name: user.username,
        avatar: user.avatar,
      };
    } catch {
      return null;
    }
  },

  // 获取权限
  getPermissions: async () => {
    const userInfo = localStorage.getItem('user_info');
    
    if (!userInfo) {
      return null;
    }

    try {
      const user: IUser = JSON.parse(userInfo);
      return user.role;
    } catch {
      return null;
    }
  },

  // 注册（可选）
  register: async ({ username, email, password }) => {
    try {
      await axiosInstance.post('/auth/register', {
        username,
        email,
        password,
      });

      return {
        success: true,
        redirectTo: '/admin/login',
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.response?.data?.message || '注册失败',
          name: error.response?.data?.error || 'RegisterError',
        },
      };
    }
  },

  // 忘记密码（可选）
  forgotPassword: async ({ email }) => {
    try {
      await axiosInstance.post('/auth/forgot-password', { email });

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.response?.data?.message || '发送重置邮件失败',
          name: error.response?.data?.error || 'ForgotPasswordError',
        },
      };
    }
  },

  // 更新密码（可选）
  updatePassword: async ({ password }) => {
    try {
      await axiosInstance.post('/auth/update-password', { password });

      return {
        success: true,
        redirectTo: '/admin',
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.response?.data?.message || '密码更新失败',
          name: error.response?.data?.error || 'UpdatePasswordError',
        },
      };
    }
  },

  // 错误处理
  onError: async (error) => {
    if (error.status === 401 || error.status === 403) {
      return {
        logout: true,
        redirectTo: '/admin/login',
      };
    }

    return {};
  },
};

export default authProvider;
