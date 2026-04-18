// 上传服务 (Mock API)
import { type UploadRequest, type UploadResponse } from './upload.types';

// 模拟上传延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 上传图片到服务器
export async function uploadImages(request: UploadRequest): Promise<UploadResponse> {
  // 模拟 API 调用
  await delay(2000);

  // 模拟随机成功/失败
  const success = Math.random() > 0.1; // 90% 成功率

  if (success) {
    return {
      success: true,
      modelId: `model_${Date.now()}`,
      message: '上传成功，模型正在处理中...',
    };
  } else {
    return {
      success: false,
      message: '上传失败，请重试',
    };
  }
}

// 验证图片格式
export function validateImage(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: '不支持的图片格式，请使用 JPG、PNG 或 WebP' };
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB
    return { valid: false, error: '图片大小不能超过 50MB' };
  }
  
  if (file.size < 100 * 1024) { // 100KB
    return { valid: false, error: '图片大小不能小于 100KB' };
  }
  
  return { valid: true };
}

// 生成唯一 ID
export function generateId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
