import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button, Upload, message, Progress } from 'antd'
import { UploadOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { useTranslation } from '../../i18n'

interface GenerationPageProps {
  title: string
  model: string // 'hunyuan' | 'sf3d' | 'triposr' | 'instantmesh'
  apiEndpoint: string
  mockTime?: number
  description?: string
  githubUrl?: string
  specs?: {
    speed: string
    memory: string
    license: string
  }
}

export function MultiModelGenerationPage({
  title,
  model,
  apiEndpoint,
  mockTime = 5000,
  description,
  githubUrl,
  specs
}: GenerationPageProps) {
  const { t } = useTranslation()
  
  const [uploading, setUploading] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [modelViewerHtml, setModelViewerHtml] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 动态加载ModelViewer
  useEffect(() => {
    if (!document.querySelector('script[src*="model-viewer"]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.1.1/dist/model-viewer.min.js'
      script.type = 'module'
      document.head.appendChild(script)
    }
  }, [])

  // 处理文件上传
  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setStatus('uploading')
    setProgress(0)
    setModelViewerHtml('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      console.log('[Generation] Uploading to:', `/api/v1/generation/${apiEndpoint}/upload`)
      
      const response = await fetch(`/api/v1/generation/${apiEndpoint}/upload`, {
        method: 'POST',
        body: formData
      })

      console.log('[Generation] Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Generation] Error response:', errorText)
        throw new Error(`Upload failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('[Generation] Result:', result)
      
      setTaskId(result.uid)
      setStatus('processing')
      message.success('生成任务已提交！')

      // 模拟进度
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + (100 / (mockTime / 100))
        })
      }, 100)

      // 等待完成
      await new Promise(resolve => setTimeout(resolve, mockTime))
      clearInterval(interval)
      
      setProgress(100)
      setStatus('completed')

      // 构建ModelViewer
      const downloadUrl = `/api/v1/generation/download/${result.uid}`
      console.log('[Generation] Model viewer URL:', downloadUrl)
      
      const modelViewerTemplate = `
        <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
          <model-viewer 
            style="width: 100%; height: 100%;"
            src="${downloadUrl}"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            environment-image="neutral"
            ar>
          </model-viewer>
        </div>
      `
      setModelViewerHtml(modelViewerTemplate)
      message.success('3D 模型生成完成！')
    } catch (error: any) {
      console.error('[Generation] Error:', error)
      setStatus('error')
      message.error('生成失败：' + (error.message || '未知错误'))
    } finally {
      setUploading(false)
    }
  }, [apiEndpoint, mockTime])

  // 下载模型
  const handleDownload = useCallback(() => {
    if (taskId) {
      window.open(`/api/v1/generation/download/${taskId}`, '_blank')
    }
  }, [taskId])

  // 重置
  const handleReset = () => {
    setUploading(false)
    setTaskId(null)
    setProgress(0)
    setStatus('idle')
    setSelectedImage(null)
    setModelViewerHtml('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="official-generation-page">
      <div className="generation-container">
        {/* 左侧：输入区域 */}
        <div className="input-panel">
          <div className="panel-title">{title}</div>
          
          {description && (
            <div style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              {description}
            </div>
          )}
          
          {specs && (
            <div style={{ marginBottom: 16, fontSize: 13, color: '#999' }}>
              <div>⚡ 速度: {specs.speed}</div>
              <div>💾 显存: {specs.memory}</div>
              <div>📄 许可证: {specs.license}</div>
              {githubUrl && <div style={{ marginTop: 8 }}><a href={githubUrl} target="_blank" rel="noopener noreferrer">🔗 GitHub</a></div>}
            </div>
          )}

          {/* 图片上传 */}
          <div className="image-preview-container" onClick={() => fileInputRef.current?.click()}>
            {selectedImage ? (
              <div className="selected-image-wrapper">
                <img src={selectedImage} alt="preview" className="preview-image" />
                <button className="clear-image-btn" onClick={(e) => { e.stopPropagation(); handleReset(); }}>×</button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <UploadOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <p>点击上传图片</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (event) => {
                  setSelectedImage(event.target?.result as string)
                  handleUpload(file)
                }
                reader.readAsDataURL(file)
              }
            }}
            style={{ display: 'none' }}
          />

          <Button
            className="generate-btn"
            type="primary"
            size="large"
            loading={status === 'processing'}
            disabled={!selectedImage || status === 'processing'}
            onClick={() => fileInputRef.current?.click()}
          >
            {status === 'processing' ? '生成中...' : '生成形状'}
          </Button>
        </div>

        {/* 右侧：生成结果 */}
        <div className="output-panel">
          <div className="panel-title">生成的网格</div>
          
          <div className="mesh-preview-container">
            {status === 'processing' && (
              <div className="progress-overlay">
                <Progress type="circle" percent={Math.round(progress)} />
                <p>正在生成 3D 模型...</p>
              </div>
            )}
            
            {status === 'completed' && modelViewerHtml ? (
              <div dangerouslySetInnerHTML={{ __html: modelViewerHtml }} />
            ) : (
              <div className="empty-mesh-placeholder">
                <p>暂无网格数据</p>
              </div>
            )}
          </div>

          {status === 'completed' && (
            <div className="mesh-info-section">
              <Button
                type="primary"
                size="large"
                icon={<DownloadOutlined />}
                className="download-btn"
                onClick={handleDownload}
              >
                下载 GLB 模型
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
