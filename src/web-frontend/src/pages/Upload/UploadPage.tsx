// 上传页面组件
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from '../../i18n';
import { 
  uploadImages, 
  validateImage, 
  generateId,
  type UploadImage,
} from './upload.service';
import './UploadPage.css';

export function UploadPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状态
  const [images, setImages] = useState<UploadImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'model' | 'scene' | 'animation'>('model');
  const [isPublic, setIsPublic] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // 处理文件选择
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newImages: UploadImage[] = [];
    
    Array.from(files).forEach(file => {
      const validation = validateImage(file);
      if (validation.valid) {
        const id = generateId();
        const preview = URL.createObjectURL(file);
        
        newImages.push({
          id,
          file,
          preview,
          status: 'pending',
          progress: 0,
        });
      } else {
        alert(validation.error);
      }
    });
    
    setImages(prev => [...prev, ...newImages]);
  }, []);

  // 删除图片
  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.preview);
      }
      return prev.filter(i => i.id !== id);
    });
  }, []);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // 点击上传区域
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 提交上传
  const handleSubmit = useCallback(async () => {
    if (images.length === 0) {
      setUploadError(t.gallery.emptyTitle);
      return;
    }
    
    if (!title.trim()) {
      setUploadError(t.auth.username + ' 不能为空');
      return;
    }
    
    setIsUploading(true);
    setUploadError('');
    
    try {
      // 更新状态为上传中
      setImages(prev => prev.map(img => ({ ...img, status: 'uploading' })));
      
      const response = await uploadImages({
        images: images.map(img => img.file),
        title: title.trim(),
        description: description.trim(),
        category,
        isPublic,
      });
      
      if (response.success) {
        setUploadSuccess(true);
        // 清空表单
        setTimeout(() => {
          setImages([]);
          setTitle('');
          setDescription('');
          setCategory('model');
          setIsPublic(true);
          setUploadSuccess(false);
        }, 3000);
      } else {
        setUploadError(response.message);
        setImages(prev => prev.map(img => ({ ...img, status: 'error' })));
      }
    } catch (error) {
      setUploadError(t.common.error);
      setImages(prev => prev.map(img => ({ ...img, status: 'error' })));
    } finally {
      setIsUploading(false);
    }
  }, [images, title, description, category, isPublic, t]);

  return (
    <div className="upload-page">
      <div className="upload-container">
        {/* 标题 */}
        <div className="upload-header">
          <h1 className="upload-title">{t.upload.title}</h1>
          <p className="upload-subtitle">{t.upload.dragDrop}</p>
        </div>

        {/* 上传区域 */}
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
          />
          
          <div className="upload-icon">📷</div>
          <p className="upload-text">{t.upload.dragDrop}</p>
          <p className="upload-or">{t.upload.or}</p>
          <button className="upload-button">{t.upload.selectFile}</button>
          <p className="upload-hint">{t.upload.supported}</p>
        </div>

        {/* 图片预览 */}
        {images.length > 0 && (
          <div className="upload-preview">
            <h3>{t.upload.preview} ({images.length})</h3>
            <div className="preview-grid">
              {images.map(img => (
                <div key={img.id} className="preview-item">
                  <img src={img.preview} alt="preview" />
                  <button
                    className="preview-remove"
                    onClick={() => handleRemoveImage(img.id)}
                  >
                    ✕
                  </button>
                  <div className={`preview-status ${img.status}`}>
                    {img.status === 'uploading' && '⬆️'}
                    {img.status === 'processing' && '⚙️'}
                    {img.status === 'completed' && '✅'}
                    {img.status === 'error' && '❌'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 表单 */}
        <div className="upload-form">
          <div className="form-group">
            <label>{t.auth.username}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给作品起个名字..."
              disabled={isUploading}
            />
          </div>

          <div className="form-group">
            <label>{t.auth.loginButton}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述一下你的作品..."
              rows={4}
              disabled={isUploading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t.gallery.categoryAll}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                disabled={isUploading}
              >
                <option value="model">{t.gallery.categoryModel}</option>
                <option value="scene">{t.gallery.categoryScene}</option>
                <option value="animation">{t.gallery.categoryAnimation}</option>
              </select>
            </div>

            <div className="form-group">
              <label>公开</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={isUploading}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* 错误/成功消息 */}
        {uploadError && (
          <div className="upload-message error">
            ❌ {uploadError}
          </div>
        )}
        
        {uploadSuccess && (
          <div className="upload-message success">
            ✅ {t.upload.success}
          </div>
        )}

        {/* 提交按钮 */}
        <div className="upload-actions">
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={isUploading || images.length === 0}
          >
            {isUploading ? (
              <>
                <span className="spinner"></span>
                {t.upload.processing}
              </>
            ) : (
              t.upload.submit
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
