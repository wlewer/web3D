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

    const apiData = response.data.data as any;

    return {
      data: apiData.items || apiData.data || [],
      total: apiData.total || 0,
    };
  },

  // 获取单个资源
  getOne: async ({ resource, id }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.get(`/${resource}/${id}`);
    
    return {
      data: response.data.data,
    };
  },

  // 创建资源
  create: async ({ resource, variables }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.post(`/${resource}`, variables);
    
    return {
      data: response.data.data,
    };
  },

  // 更新资源
  update: async ({ resource, id, variables }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.put(`/${resource}/${id}`, variables);
    
    return {
      data: response.data.data,
    };
  },

  // 部分更新
  updateMany: async ({ resource, ids, variables }) => {
    const response: AxiosResponse<ApiResponse> = await axiosInstance.patch(`/${resource}/batch`, {
      ids,
      ...variables,
    });
    
    return {
      data: response.data.data,
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

    return Promise.resolve({ data });
  },
};

export default dataProvider;
