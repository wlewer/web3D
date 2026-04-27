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
  const { t, language } = useTranslation();
  const isZh = language === 'zh';
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
  const [chatOpen, setChatOpen] = useState(false);

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
      setUploadError(t.upload.errorNoImages);
      return;
    }
    
    if (!title.trim()) {
      setUploadError(t.upload.errorNoTitle);
      return;
    }
    
    setIsUploading(true);
    setUploadError('');
    
    try {
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
      setUploadError(t.upload.errorUploadFailed);
      setImages(prev => prev.map(img => ({ ...img, status: 'error' })));
    } finally {
      setIsUploading(false);
    }
  }, [images, title, description, category, isPublic, t]);

  return (
    <div className="upload-page">
      {/* 左侧主内容区 */}
      <div className="upload-main">
        <div className="upload-container">
          {/* 标题 */}
          <div className="upload-header">
            <h1 className="upload-title">{t.upload.title}</h1>
            <p className="upload-subtitle">{t.upload.subtitle}</p>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(img.id);
                      }}
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
              <label>{t.upload.titleLabel}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.upload.titlePlaceholder}
                disabled={isUploading}
              />
            </div>

            <div className="form-group">
              <label>{t.upload.descLabel}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.upload.descPlaceholder}
                rows={3}
                disabled={isUploading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t.upload.categoryLabel}</label>
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
                <label>{t.upload.publicLabel}</label>
                <div className="switch-wrapper">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      disabled={isUploading}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className="switch-label">{isPublic ? '✓' : '✗'}</span>
                </div>
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
                <>🚀 {t.upload.submit}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 右侧联系面板 */}
      <aside className="upload-sidebar">
        {/* 微信联系 */}
        <div className="contact-card">
          <h3 className="contact-title">
            <span className="contact-icon">💬</span>
            {t.contact.title}
          </h3>
          
          <div className="wechat-section">
            <div className="wechat-qr-placeholder">
              <span className="wechat-icon">👆</span>
              <p>{t.contact.wechat}</p>
            </div>
            <div className="wechat-number">
              <label>{t.contact.wechatId}</label>
              <div className="wechat-id-display">
                <span>{t.contact.wechatIdValue}</span>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard?.writeText(t.contact.wechatIdValue)}
                  title={isZh ? '复制' : 'Copy'}
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          <div className="contact-divider"></div>

          <div className="contact-methods">
            <a href="mailto:contact@smartai3d.com" className="contact-item">
              <span className="contact-item-icon">📧</span>
              <span>contact@smartai3d.com</span>
            </a>
            <a href="tel:+86-400-888-9999" className="contact-item">
              <span className="contact-item-icon">📞</span>
              <span>400-888-9999</span>
            </a>
          </div>
        </div>

        {/* AI客服入口 */}
        <div className="ai-chat-card" onClick={() => setChatOpen(!chatOpen)}>
          <div className="ai-chat-header">
            <span className="ai-avatar">🤖</span>
            <div className="ai-info">
              <h4>{t.contact.aiChat}</h4>
              <span className="ai-status">
                <span className="status-dot"></span>
                {t.contact.aiChatOnline}
              </span>
            </div>
          </div>
          <p className="ai-chat-desc">{t.contact.aiChatDesc}</p>
          <button className="ai-chat-btn">
            {chatOpen ? `💬 ${t.contact.aiChatting}` : `🚀 ${t.contact.aiChatStart}`}
          </button>
          <p className="ai-chat-hint">{t.contact.aiChatHint}</p>
        </div>

        {/* 帮助指南 */}
        <div className="help-card">
          <h3 className="help-title">
            <span>📖</span> {t.contact.helpGuide}
          </h3>
          <ul className="help-list">
            <li>
              <span className="help-num">1</span>
              <span>{t.contact.helpStep1}</span>
            </li>
            <li>
              <span className="help-num">2</span>
              <span>{t.contact.helpStep2}</span>
            </li>
            <li>
              <span className="help-num">3</span>
              <span>{t.contact.helpStep3}</span>
            </li>
            <li>
              <span className="help-num">4</span>
              <span>{t.contact.helpStep4}</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* AI客服弹窗 */}
      {chatOpen && (
        <div className="chat-modal-overlay" onClick={() => setChatOpen(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div className="chat-modal-title">
                <span className="ai-avatar-small">🤖</span>
                <span>{t.contact.aiChat}</span>
              </div>
              <button className="chat-modal-close" onClick={() => setChatOpen(false)}>✕</button>
            </div>
            <div className="chat-modal-body">
              <div className="chat-welcome">
                <span className="chat-welcome-icon">👋</span>
                <p>
                  {isZh 
                    ? '您好！我是AI智能客服，请问有什么可以帮助您的？'
                    : 'Hello! I am AI customer service. How can I help you?'}
                </p>
              </div>
              <div className="chat-suggestions">
                <h5>{isZh ? '常见问题' : 'FAQ'}</h5>
                <div className="suggestion-chips">
                  <button className="suggestion-chip">
                    {isZh ? '如何上传照片？' : 'How to upload photos?'}
                  </button>
                  <button className="suggestion-chip">
                    {isZh ? '建模需要多久？' : 'How long to model?'}
                  </button>
                  <button className="suggestion-chip">
                    {isZh ? '支持哪些格式？' : 'What formats supported?'}
                  </button>
                  <button className="suggestion-chip">
                    {isZh ? '如何导出模型？' : 'How to export model?'}
                  </button>
                </div>
              </div>
              <p className="chat-note">
                {isZh 
                  ? '💡 提示：AI客服需要登录后使用完整功能'
                  : '💡 Note: Login required for full AI chat features'}
              </p>
            </div>
            <div className="chat-modal-footer">
              <input 
                type="text" 
                placeholder={isZh ? '输入您的问题...' : 'Type your question...'}
                className="chat-input"
              />
              <button className="chat-send-btn">➤</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
