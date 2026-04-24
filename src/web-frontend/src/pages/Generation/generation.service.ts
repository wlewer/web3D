/**
 * 3D生成服务API
 * 支持三种模式：Mock演示 | 本地GPU | 云端API
 */
import axios from 'axios'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分钟超时
  headers: {
    'Content-Type': 'multipart/form-data'
  }
})

/**
 * 上传并生成3D模型
 * @param {File} file - 图片文件
 * @param {Object} options - 生成选项
 * @returns {Promise} 生成结果
 */
export async function uploadAndGenerate(
  file: File,
  options: { 
    enableTexture?: boolean;
    steps?: number;
    guidanceScale?: number;
    seed?: number;
    octreeResolution?: number;
    removeBackground?: boolean;
  } = {}
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('enable_texture', String(options.enableTexture || false))
  
  // 高级参数
  if (options.steps !== undefined) {
    formData.append('steps', String(options.steps))
  }
  if (options.guidanceScale !== undefined) {
    formData.append('guidance_scale', String(options.guidanceScale))
  }
  if (options.seed !== undefined) {
    formData.append('seed', String(options.seed))
  }
  if (options.octreeResolution !== undefined) {
    formData.append('octree_resolution', String(options.octreeResolution))
  }
  if (options.removeBackground !== undefined) {
    formData.append('remove_background', String(options.removeBackground))
  }
  
  try {
    const response = await api.post('/api/v1/generation/upload', formData)
    return response.data
  } catch (error) {
    console.error('上传失败:', error)
    throw error
  }
}

/**
 * 查询生成状态
 * @param {string} uid - 任务ID
 * @returns {Promise} 状态信息
 */
export async function getGenerationStatus(uid) {
  try {
    const response = await api.get(`/api/v1/generation/status/${uid}`)
    return response.data
  } catch (error) {
    console.error('查询状态失败:', error)
    throw error
  }
}

/**
 * 下载生成的模型
 * @param {string} uid - 任务ID
 * @returns {Promise} 模型文件URL
 */
export async function downloadModel(uid) {
  try {
    const response = await api.get(`/api/v1/generation/download/${uid}`, {
      responseType: 'blob'
    })
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `model_${uid}.glb`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    return url
  } catch (error) {
    console.error('下载失败:', error)
    throw error
  }
}

/**
 * 轮询等待生成完成
 * @param {string} uid - 任务ID
 * @param {Function} onProgress - 进度回调
 * @param {number} pollInterval - 轮询间隔（毫秒）
 * @param {number} maxWaitTime - 最大等待时间（毫秒）
 * @returns {Promise} 完成后的状态
 */
export async function waitForCompletion(
  uid: string,
  onProgress: ((progress: number) => void) | null = null,
  pollInterval: number = 3000,
  maxWaitTime: number = 300000
) {
  const startTime = Date.now()
  
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        // 检查超时
        if (Date.now() - startTime > maxWaitTime) {
          clearInterval(interval)
          reject(new Error('生成超时'))
          return
        }
        
        const status = await getGenerationStatus(uid)
        
        if (status.status === 'completed') {
          clearInterval(interval)
          if (onProgress) onProgress(100)
          resolve(status)
        } else if (status.status === 'failed') {
          clearInterval(interval)
          reject(new Error(status.error || status.message || '生成失败'))
        } else {
          // 使用真实后端状态，而非模拟进度
          // cloud模式会等待云端API完成后才返回completed
          // mock模式5秒后自动完成
          const elapsed = Date.now() - startTime
          const progress = Math.min((elapsed / maxWaitTime) * 90, 90)
          if (onProgress) onProgress(progress)
          
          console.log('[Generation] Status:', status.status, 'Progress:', Math.round(progress) + '%')
        }
      } catch (error) {
        clearInterval(interval)
        reject(error)
      }
    }, pollInterval)
  })
}

export default {
  uploadAndGenerate,
  getGenerationStatus,
  downloadModel,
  waitForCompletion
}
