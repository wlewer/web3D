/**
 * Web3D Admin - Axios 实例配置
 * 
 * 提供统一的 HTTP 客户端，包含拦截器、错误处理等
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

// 扩展 AxiosRequestConfig 以支持 metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}

// API 基础 URL（从环境变量读取）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// 创建 Axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('access_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加请求时间戳（用于调试）
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error: AxiosError) => {
    console.error('[Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    // 计算请求耗时
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime || endTime;
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`[API Success] ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);

    return response;
  },
  (error: AxiosError<any>) => {
    console.error('[Response Error]', error);

    // 统一错误处理
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message.error(data?.message || '请求参数错误');
          break;
        case 401:
          message.error('未授权，请重新登录');
          // 清除 token 并跳转到登录页
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_info');
          window.location.href = '/admin/login';
          break;
        case 403:
          message.error('权限不足，无法访问该资源');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 409:
          message.error(data?.message || '资源冲突');
          break;
        case 422:
          message.error(data?.message || '数据验证失败');
          break;
        case 500:
          message.error('服务器内部错误，请稍后重试');
          break;
        case 502:
        case 503:
        case 504:
          message.error('服务暂时不可用，请稍后重试');
          break;
        default:
          message.error(data?.message || `请求失败 (${status})`);
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      message.error('网络错误，请检查网络连接');
    } else {
      // 其他错误
      message.error(error.message || '未知错误');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
