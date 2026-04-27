import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button, Collapse, Slider, Input, Checkbox, message, Progress } from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SettingOutlined,
  PictureOutlined
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { uploadAndGenerate, waitForCompletion, downloadModel } from './generation.service'
import { useTranslation } from '../../i18n'
import './GenerationPage.css'

const { Panel } = Collapse

// 官方示例图片列表 - 包含所有65张图片
const ALL_EXAMPLE_IMAGES = [
  '004.png', '052.png', '073.png', '075.png', '1008.png', '101.png', '1022.png', '1029.png', '1037.png', '1079.png',
  '1111.png', '1123.png', '1128.png', '1135.png', '1146.png', '1148.png', '1154.png', '1180.png', '1196.png', '1204.png',
  '1234.png', '1310.png', '1316.png', '1354.png', '1429.png', '1493.png', '1582.png', '1583.png', '1596.png', '1601.png',
  '1603.png', '1626.png', '1627.png', '1654.png', '167.png', '1670.png', '1679.png', '1687.png', '1698.png', '1715.png',
  '1735.png', '1738.png', '1744.png', '1758.png', '1772.png', '1773.png', '1778.png', '179.png', '1898.png', '191.png',
  '195.png', '197.png', '198.png', '202.png', '203.png', '218.png', '219.png', '379.png', '380.png', '419.png',
  '583.png', '888.png', '895.png', 'example_000.png', 'example_002.png'
]

const IMAGES_PER_PAGE = 20

export function GenerationPage() {
  const { t } = useTranslation()

  const [uploading, setUploading] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [modelViewerHtml, setModelViewerHtml] = useState<string>('')
  const [generatedObjPath, setGeneratedObjPath] = useState<string>('')
  const [generatedGlbPath, setGeneratedGlbPath] = useState<string>('')
  const [stats, setStats] = useState<any>(null)
  
  // 分页控制
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = Math.ceil(ALL_EXAMPLE_IMAGES.length / IMAGES_PER_PAGE)
  const currentImages = ALL_EXAMPLE_IMAGES.slice(
    currentPage * IMAGES_PER_PAGE,
    (currentPage + 1) * IMAGES_PER_PAGE
  )

  // 高级选项
  const [steps, setSteps] = useState(30)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [seed, setSeed] = useState(1234)
  const [octreeResolution, setOctreeResolution] = useState(256)
  const [removeBackground, setRemoveBackground] = useState(true)
  const [randomizeSeed, setRandomizeSeed] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 动态加载ModelViewer脚本
  useEffect(() => {
    if (!document.querySelector('script[src*="model-viewer"]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.1.1/dist/model-viewer.min.js'
      script.type = 'module'
      document.head.appendChild(script)
    }
  }, [])

  // 处理官方示例图片点击
  const handleExampleClick = useCallback(async (imageName: string) => {
    const imagePath = `/hunyuan3d/assets/example_images/${imageName}`
    setSelectedImage(imagePath)
    setSelectedFileName(imageName)

    // 尝试从示例图片生成
    try {
      const response = await fetch(imagePath)
      const blob = await response.blob()
      const file = new File([blob], imageName, { type: 'image/png' })
      await handleGenerate(file)
    } catch (error) {
      message.error(t.generation.error.loadExampleFailed)
    }
  }, [t])

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string)
        setSelectedFileName(file.name)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  // 生成3D模型
  const handleGenerate = async (file: File) => {
    setUploading(true)
    setStatus('uploading')
    setProgress(0)
    setModelViewerHtml('')
    setStats(null)

    try {
      const response = await uploadAndGenerate(file, {
        steps,
        guidanceScale,
        seed: randomizeSeed ? Math.floor(Math.random() * 10000000) : seed,
        octreeResolution,
        removeBackground
      })

      setTaskId(response.uid)
      setStatus('processing')
      message.success(t.generation.error.taskSubmitted)

      // 轮询状态
      await waitForCompletion(
        response.uid,
        (progress) => setProgress(progress),
        3000,
        300000
      )

      setStatus('completed')
      setProgress(100)

      // 构建ModelViewer HTML
      const modelViewerTemplate = `
        <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
          <model-viewer
            style="width: 100%; height: 100%;"
            src="/api/v1/generation/download/${response.uid}"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            environment-image="neutral"
            ar>
          </model-viewer>
        </div>
      `
      setModelViewerHtml(modelViewerTemplate)
      setGeneratedGlbPath(`/static/${response.uid}/white_mesh.glb`)
      setGeneratedObjPath(`/static/${response.uid}/white_mesh.obj`)

      message.success(t.generation.error.modelComplete)
    } catch (error: any) {
      setStatus('error')
      message.error(
        t.generation.error.generationFailedWithMsg.replace('{{error}}', error.message || t.generation.error.generationFailed)
      )
    } finally {
      setUploading(false)
    }
  }

  // 重置
  const handleReset = () => {
    setUploading(false)
    setTaskId(null)
    setProgress(0)
    setStatus('idle')
    setSelectedImage(null)
    setSelectedFileName('')
    setModelViewerHtml('')
    setStats(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="official-generation-page">
      <div className="generation-container">
        {/* 左侧：输入区域 */}
        <div className="input-panel">
          <div className="panel-title">{t.generation.panelImagePrompt}</div>

          {/* 图片上传/展示区域 */}
          <div className="image-preview-container">
            {selectedImage ? (
              <div className="selected-image-wrapper">
                <img
                  src={selectedImage}
                  alt={selectedFileName}
                  className="preview-image"
                />
                <button
                  className="clear-image-btn"
                  onClick={handleReset}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <PictureOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <p>{t.generation.uploadPlaceholder}</p>
              </div>
            )}
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* 上传按钮 */}
          <Button
            className="upload-btn"
            type="default"
            size="large"
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || status === 'processing'}
          >
            {t.generation.uploadImage}
          </Button>
          
          {/* 生成按钮 */}
          <Button
            className="generate-btn"
            type="primary"
            size="large"
            loading={status === 'processing'}
            disabled={!selectedImage || status === 'processing'}
            onClick={async () => {
              if (!selectedImage) return
              
              // 如果是示例图片，需要从URL获取File对象
              if (selectedImage.startsWith('/hunyuan3d/')) {
                try {
                  setUploading(true)
                  setStatus('uploading')
                  const response = await fetch(selectedImage)
                  const blob = await response.blob()
                  const file = new File([blob], selectedFileName, { type: 'image/png' })
                  await handleGenerate(file)
                } catch (error) {
                  message.error(t.generation.error.loadExampleFailed)
                  setUploading(false)
                  setStatus('idle')
                }
              } else {
                // 本地上传的图片，提示重新上传
                message.info('请重新上传图片后点击生成')
              }
            }}
          >
            {status === 'processing' ? t.generation.generatingEllipsis : t.generation.generateShape}
          </Button>

          {/* 高级选项 */}
          <Collapse
            className="advanced-options"
            ghost
            expandIconPosition="end"
          >
            <Panel header={t.generation.advancedOptions} key="1">
              <div className="option-item">
                <label>{t.generation.inferenceSteps}</label>
                <Slider
                  min={1}
                  max={100}
                  value={steps}
                  onChange={setSteps}
                  disabled={uploading}
                />
              </div>

              <div className="option-item">
                <label>{t.generation.guidanceScale}</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  step={0.5}
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value) || 7.5)}
                  disabled={uploading}
                />
              </div>

              <div className="option-item">
                <label>{t.generation.octreeResolution}</label>
                <Slider
                  min={16}
                  max={512}
                  value={octreeResolution}
                  onChange={setOctreeResolution}
                  disabled={uploading}
                />
              </div>

              <div className="option-item checkbox-item">
                <Checkbox
                  checked={removeBackground}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                  disabled={uploading}
                >
                  {t.generation.removeBackground}
                </Checkbox>
              </div>

              <div className="option-item checkbox-item">
                <Checkbox
                  checked={randomizeSeed}
                  onChange={(e) => setRandomizeSeed(e.target.checked)}
                  disabled={uploading}
                >
                  {t.generation.randomizeSeed}
                </Checkbox>
              </div>

              {!randomizeSeed && (
                <div className="option-item">
                  <label>{t.generation.seed}</label>
                  <Input
                    type="number"
                    min={0}
                    max={10000000}
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 1234)}
                    disabled={uploading}
                  />
                </div>
              )}
            </Panel>
          </Collapse>
        </div>

        {/* 右侧：生成结果区域 */}
        <div className="output-panel">
          <div className="panel-title">{t.generation.panelGeneratedMesh}</div>

          {/* 3D模型预览 */}
          <div className="mesh-preview-container">
            {status === 'processing' && (
              <div className="progress-overlay">
                <Progress
                  type="circle"
                  percent={progress}
                  format={(percent) => `${percent}%`}
                />
                <p>{t.generation.generatingModel}</p>
              </div>
            )}

            {status === 'completed' && modelViewerHtml ? (
              <div
                className="model-viewer-wrapper"
                dangerouslySetInnerHTML={{ __html: modelViewerHtml }}
              />
            ) : (
              <div className="empty-mesh-placeholder">
                <p>{t.generation.noMeshPlaceholder}</p>
              </div>
            )}
          </div>

          {/* 下载和路径信息 */}
          {status === 'completed' && (
            <div className="mesh-info-section">
              <Button
                type="primary"
                size="large"
                icon={<DownloadOutlined />}
                className="download-btn"
                onClick={() => taskId && downloadModel(taskId)}
              >
                {t.generation.download}
              </Button>

              <div className="path-info">
                <div className="path-item">
                  <label>{t.generation.objPath}</label>
                  <Input
                    value={generatedObjPath}
                    readOnly
                  />
                </div>
                <div className="path-item">
                  <label>{t.generation.glbPath}</label>
                  <Input
                    value={generatedGlbPath}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 示例图片库 */}
      <div className="examples-section">
        <div className="examples-header">
          <div className="section-title">
            <SettingOutlined /> {t.generation.imageExamples} ({ALL_EXAMPLE_IMAGES.length} images)
          </div>
          
          {/* 翻页控制 */}
          <div className="pagination-controls">
            <Button
              size="small"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            >
              ‹ 上一页
            </Button>
            <span className="page-indicator">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              size="small"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            >
              下一页 ›
            </Button>
          </div>
        </div>
        
        <div className="examples-grid" key={currentPage}>
          {currentImages.map((imgName, index) => (
            <div 
              key={imgName}
              className="example-item"
              style={{
                animationDelay: `${index * 50}ms`,
                opacity: 0,
                animation: 'fadeInUp 0.5s ease forwards'
              }}
              onClick={() => handleExampleClick(imgName)}
            >
              <img 
                src={`/hunyuan3d/assets/example_images/${imgName}`}
                alt={imgName}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GenerationPage
