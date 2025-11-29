<template>
  <div class="container ppt-home-container">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <div class="brand-pill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M7 3v18M12 8h5M12 12h5M12 16h5"></path>
          </svg>
          AI 智能 PPT 生成
        </div>
        <h1 class="page-title">一键生成专业演示文稿</h1>
        <p class="page-subtitle">输入主题和内容，让 AI 帮你生成结构清晰、设计精美的 PPT</p>
      </div>

      <!-- Input Form -->
      <div class="ppt-form-container">
        <!-- 主题输入 -->
        <div class="form-group">
          <label class="form-label required">PPT 主题</label>
          <input
            v-model="topic"
            type="text"
            class="form-input"
            placeholder="例如：人工智能在现代教育中的应用"
            :disabled="loading"
          />
        </div>

        <!-- 页数输入 -->
        <div class="form-group">
          <label class="form-label">建议页数</label>
          <input
            v-model.number="pageCount"
            type="number"
            class="form-input form-input-number"
            min="5"
            max="50"
            :disabled="loading"
          />
          <p class="form-hint">建议 10-20 页，AI 将根据内容自动调整</p>
        </div>

        <!-- 内容输入（可选） -->
        <div class="form-group">
          <label class="form-label">
            内容要点
            <span class="optional-badge">可选</span>
          </label>
          <textarea
            v-model="userContent"
            class="form-textarea"
            rows="6"
            placeholder="输入你希望包含的内容要点，AI 会据此生成大纲。留空则由 AI 自由发挥。

示例：
- 介绍 AI 技术在教育中的应用场景
- 分析 AI 如何提升教学质量
- 展望未来教育的发展趋势"
            :disabled="loading"
          ></textarea>
        </div>

        <!-- 样式描述（可选） -->
        <div class="form-group">
          <label class="form-label">
            样式风格
            <span class="optional-badge">可选</span>
          </label>
          <textarea
            v-model="styleDescription"
            class="form-textarea"
            placeholder="例如：商务风格，蓝色主色调，简约大方&#10;可以详细描述配色、字体、版式等期望"
            rows="3"
            :disabled="loading"
          ></textarea>
          <p class="form-hint">描述期望的视觉风格，留空则由 AI 根据主题自动推荐</p>
        </div>

        <!-- Logo 上传（可选） -->
        <div class="form-group">
          <label class="form-label">
            品牌 Logo
            <span class="optional-badge">可选</span>
          </label>
          <div class="logo-upload-area" @click="triggerFileInput" :class="{ 'has-logo': logoPreview }">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              @change="handleLogoUpload"
              style="display: none;"
              :disabled="loading"
            />
            <div v-if="!logoPreview" class="upload-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p>点击上传 Logo 图片</p>
              <p class="upload-hint">支持 PNG、JPG、WEBP 格式，建议透明背景</p>
            </div>
            <div v-else class="logo-preview-container">
              <img :src="logoPreview" alt="Logo Preview" class="logo-preview" />
              <button @click.stop="removeLogo" class="remove-logo-btn" :disabled="loading">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <p class="form-hint">上传品牌 Logo，AI 会将其自然融入 PPT 设计中</p>
        </div>

        <!-- Logo 配置（仅在上传 Logo 后显示） -->
        <div v-if="logoPreview" class="logo-config-section">
          <div class="form-group-row">
            <div class="form-group half-width">
              <label class="form-label">Logo 位置</label>
              <select v-model="logoPosition" class="form-select">
                <option value="bottom-right">右下角</option>
                <option value="bottom-left">左下角</option>
                <option value="top-right">右上角</option>
                <option value="top-left">左上角</option>
                <option value="bottom-center">居中底部</option>
              </select>
            </div>
            <div class="form-group half-width">
              <label class="form-label">Logo 大小</label>
              <select v-model="logoSize" class="form-select">
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <button
            class="btn btn-primary btn-large"
            @click="handleGenerate"
            :disabled="!topic.trim() || loading"
          >
            <span v-if="loading" class="spinner-sm"></span>
            <span v-else>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              生成大纲
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePptStore } from '../../stores/ppt'
import { generatePptOutline, parsePptStyle } from '../../api/ppt'

const router = useRouter()
const pptStore = usePptStore()

// 表单数据
const topic = ref('')
const userContent = ref('')
const styleDescription = ref('')
const pageCount = ref(15)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string>('')
const logoPosition = ref<string>('bottom-right')
const logoSize = ref<string>('medium')

// 状态
const loading = ref(false)
const error = ref('')

// DOM 引用
const fileInputRef = ref<HTMLInputElement>()

// 从 store 恢复数据
if (pptStore.topic) {
  topic.value = pptStore.topic
  userContent.value = pptStore.userContent
  styleDescription.value = pptStore.styleDescription
  pageCount.value = pptStore.pageCount
  logoPreview.value = pptStore.logoBase64 || ''
  logoPosition.value = pptStore.logoPosition || 'bottom-right'
  logoSize.value = pptStore.logoSize || 'medium'
}

// Logo 上传处理
function triggerFileInput() {
  if (loading.value) return
  fileInputRef.value?.click()
}

function handleLogoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // 验证文件类型
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    error.value = '请上传 PNG、JPG 或 WEBP 格式的图片'
    return
  }

  // 验证文件大小（限制 5MB）
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Logo 图片不能超过 5MB'
    return
  }

  logoFile.value = file

  // 生成预览
  const reader = new FileReader()
  reader.onload = (e) => {
    logoPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  logoFile.value = null
  logoPreview.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// 生成大纲
async function handleGenerate() {
  if (!topic.value.trim()) {
    error.value = '请输入 PPT 主题'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // 保存用户输入（包括 Logo 和配置）
    pptStore.setInput(
      topic.value,
      userContent.value,
      styleDescription.value,
      pageCount.value,
      logoPreview.value || undefined,
      logoPosition.value,
      logoSize.value
    )

    // 1. 生成大纲
    const outlineResult = await generatePptOutline(
      topic.value,
      userContent.value || undefined,
      pageCount.value
    )

    if (!outlineResult.success || !outlineResult.outline) {
      throw new Error(outlineResult.error || '大纲生成失败')
    }

    // 2. 解析样式
    const styleResult = await parsePptStyle(
      topic.value,
      styleDescription.value || undefined
    )

    if (!styleResult.success || !styleResult.style_config) {
      throw new Error(styleResult.error || '样式解析失败')
    }

    // 如果上传了 Logo，将位置和大小添加到样式配置中
    if (logoPreview.value) {
      styleResult.style_config.logo_position = logoPosition.value
      styleResult.style_config.logo_size = logoSize.value
    }

    // 保存到 store
    pptStore.setOutline(outlineResult.outline)
    pptStore.setStyleConfig(styleResult.style_config)

    // 跳转到大纲编辑页
    router.push('/ppt/outline')
  } catch (err: any) {
    console.error('生成失败:', err)
    error.value = err.message || '生成失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.ppt-home-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 60px 20px;
}

.hero-section {
  text-align: center;
  margin-bottom: 40px;
}

.hero-content {
  margin-bottom: 48px;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 18px;
  color: #666;
  line-height: 1.6;
}

/* Form Styles */
.ppt-form-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 32px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group:last-of-type {
  margin-bottom: 32px;
}

.form-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.form-label.required::after {
  content: '*';
  color: #ef4444;
  margin-left: 4px;
}

.optional-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 400;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.6;
}

.form-input:disabled,
.form-textarea:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.form-input-number {
  width: 120px;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.form-hint {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

/* Logo Upload Styles */
.logo-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.logo-upload-area:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.logo-upload-area.has-logo {
  padding: 16px;
  border-style: solid;
  border-color: #667eea;
  background: white;
}

.upload-placeholder svg {
  margin: 0 auto 16px;
  color: #9ca3af;
}

.upload-placeholder p {
  font-size: 15px;
  color: #4b5563;
  margin-bottom: 4px;
}

.upload-placeholder .upload-hint {
  font-size: 13px;
  color: #9ca3af;
}

.logo-preview-container {
  position: relative;
  display: inline-block;
  max-width: 200px;
}

.logo-preview {
  max-width: 100%;
  max-height: 120px;
  border-radius: 8px;
  object-fit: contain;
}

.remove-logo-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  background: #ef4444;
  color: white;
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.remove-logo-btn:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.remove-logo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-large {
  padding: 14px 40px;
  font-size: 16px;
}

.spinner-sm {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 36px;
  }

  .page-subtitle {
    font-size: 16px;
  }

  .ppt-form-container {
    padding: 24px;
  }
}

/* Logo 配置区域 */
.logo-config-section {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9ff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.form-group-row {
  display: flex;
  gap: 16px;
}

.form-group.half-width {
  flex: 1;
  margin-bottom: 0;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.form-select:hover {
  border-color: #667eea;
}

.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
</style>
