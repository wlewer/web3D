/**
 * Web3D Admin - Refine Data Provider
 * 
 * 实现 Refine 的数据提供者接口，连接后端 API
 */

import { type DataProvider } from '@refinedev/core';
import axiosInstance from './axios';
import type { AxiosResponse } from 'axios';

// 通用响应结构
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * snake_case 转 camelCase
 * 将后端API返回的下划线命名转换为前端使用的驼峰命名
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 递归转换对象的所有键名为 camelCase
 */
function transformKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }
  if (obj !== null && obj !== undefined && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = transformKeys(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * 创建 Data Provider
 */
export const dataProvider: DataProvider = {
  // 获取列表
  getList: async ({ resource, pagination, sorters, filters }) => {
    const pageSize = pagination?.pageSize || 10;
    const pageNum = (pagination as any)?.current || (pagination as any)?.currentPage || 1;
    
    // 构建查询参数
    const params: Record<string, any> = {
      page: pageNum,
      pageSize,
    };

    // 添加排序
    if (sorters && sorters.length > 0) {
      const sorter = sorters[0];
      params.sortBy = sorter.field;
      params.sortOrder = sorter.order;
    }

    // 添加筛选
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        if ('field' in filter) {
          params[filter.field] = filter.value;
        }
      });
    }

    const response: AxiosResponse<ApiResponse> = await axiosInstance.get(`/${resource}`, {
      params,
    });

    // 后端返回格式: { data: [...items], total: N, page: N, page_size: N, total_pages: N }
    const responseBody = response.data as any;
    const apiDataArray = responseBody.data || [];
    const total = responseBody.total || 0;

    return {
      data: transformKeys(apiDataArray),
      total: total,
    };
  },

  // 获取单个资源
  getOne: async ({ resource, id }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.get(`/${resource}/${id}`);
    
    return {
      data: transformKeys(response.data.data),
    };
  },

  // 创建资源
  create: async ({ resource, variables }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.post(`/${resource}`, variables);
    
    return {
      data: transformKeys(response.data.data),
    };
  },

  // 更新资源
  update: async ({ resource, id, variables }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.put(`/${resource}/${id}`, variables);
    
    return {
      data: transformKeys(response.data.data),
    };
  },

  // 部分更新
  updateMany: async ({ resource, ids, variables }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.patch(`/${resource}/batch`, {
      ids,
      ...variables,
    });
    
    return {
      data: transformKeys(response.data.data),
    };
  },

  // 删除资源
  deleteOne: async ({ resource, id }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.delete(`/${resource}/${id}`);
    
    return {
      data: response.data.data,
    };
  },

  // 批量删除
  deleteMany: async ({ resource, ids }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.delete(`/${resource}/batch`, {
      data: { ids },
    });
    
    return {
      data: response.data.data,
    };
  },

  // 获取数量
  getApiUrl: () => {
    return axiosInstance.defaults.baseURL || '';
  },

  // 自定义方法
  custom: async ({ url, method, payload, query, headers }) => {
    let requestUrl = `${url}?`;

    if (query) {
      const queryString = typeof query === 'string' 
        ? query 
        : new URLSearchParams(query as Record<string, string>).toString();
      requestUrl = `${requestUrl}&${queryString}`;
    }

    let axiosResponse;
    switch (method) {
      case 'put':
      case 'post':
      case 'patch':
        axiosResponse = await axiosInstance[method](url, payload, { headers });
        break;
      case 'delete':
        axiosResponse = await axiosInstance.delete(url, { data: payload, headers });
        break;
      default:
        axiosResponse = await axiosInstance.get(requestUrl, { headers });
        break;
    }

    const { data } = axiosResponse;

    return Promise.resolve({ data: transformKeys(data) });
  },
};

export default dataProvider;
