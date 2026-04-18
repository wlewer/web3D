// 上传页面类型定义
export interface UploadImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export interface UploadRequest {
  images: File[];
  title: string;
  description: string;
  category: 'model' | 'scene' | 'animation';
  isPublic: boolean;
}

export interface UploadResponse {
  success: boolean;
  modelId?: string;
  message: string;
}
