<template>
  <div class="container">
    <div class="page-header">
      <div>
        <h1 class="page-title">生成 PPT</h1>
        <p class="page-subtitle">
          <span v-if="isGenerating">
            正在生成第 {{ pptStore.progress.current }} / {{ pptStore.progress.total }} 页
          </span>
          <span v-else-if="pptStore.stage === 'result'">
            PPT 生成完成，共 {{ pptStore.progress.total }} 页
          </span>
          <span v-else>准备生成...</span>
        </p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button
          class="btn"
          @click="router.push('/ppt/outline')"
          style="border: 1px solid var(--border-color)"
          :disabled="isGenerating"
        >
          返回大纲
        </button>
        <button
          v-if="pptStore.stage === 'result'"
          class="btn btn-primary"
          @click="downloadPpt"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          下载 PPT
        </button>
      </div>
    </div>

    <div class="card">
      <!-- 进度条 -->
      <div style="margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-weight: 600; font-size: 15px;">
            {{ getProgressStatusText() }}
          </span>
          <span style="color: var(--primary); font-weight: 700; font-size: 18px;">
            {{ pptStore.progressPercentage }}%
          </span>
        </div>
        <div class="progress-container">
          <div
            class="progress-bar"
            :style="{ width: pptStore.progressPercentage + '%' }"
          />
        </div>
        <div v-if="pptStore.progress.currentPageTitle" class="current-page-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          正在处理:{{ pptStore.progress.currentPageTitle }}
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">生成失败</div>
          <div style="font-size: 14px;">{{ error }}</div>
        </div>
      </div>

      <!-- 生成日志 -->
      <div class="generation-log">
        <div class="log-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          生成日志
        </div>
        <div class="log-content">
          <div
            v-for="(log, idx) in logs"
            :key="idx"
            class="log-item"
            :class="log.type"
          >
            <span class="log-timestamp">{{ log.timestamp }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="log-empty">
            暂无日志
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePptStore } from '../../stores/ppt'
import { generatePpt, downloadPptFile } from '../../api/ppt'

const router = useRouter()
const pptStore = usePptStore()

interface LogItem {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error'
}

const error = ref('')
const logs = ref<LogItem[]>([])
let cancelGeneration: (() => void) | null = null

const isGenerating = computed(() => {
  return pptStore.progress.status === 'generating_content' ||
         pptStore.progress.status === 'applying_layout'
})

function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const now = new Date()
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  logs.value.push({ timestamp, message, type })

  // 自动滚动到底部
  setTimeout(() => {
    const logContent = document.querySelector('.log-content')
    if (logContent) {
      logContent.scrollTop = logContent.scrollHeight
    }
  }, 50)
}

function getProgressStatusText(): string {
  const status = pptStore.progress.status
  if (status === 'generating_content') return '正在生成内容'
  if (status === 'applying_layout') return '正在应用布局'
  if (status === 'done') return '生成完成'
  if (status === 'error') return '生成失败'
  return '准备中'
}

async function startGeneration() {
  if (!pptStore.outline.pages.length || !pptStore.styleConfig) {
    error.value = '缺少必要的生成数据，请返回重新生成大纲'
    return
  }

  pptStore.startGeneration()
  error.value = ''
  logs.value = []

  addLog(`开始生成 PPT: ${pptStore.topic}`)
  addLog(`共 ${pptStore.outline.pages.length} 页`)

  try {
    cancelGeneration = await generatePpt(
      pptStore.outline,
      pptStore.styleConfig!,
      pptStore.logoBase64 || undefined,
      {
        onStart: (data) => {
          addLog(`初始化完成，准备生成 ${data.total_pages} 页`)
          pptStore.updateProgress(0, 'generating_content', '')
        },
        onContentProgress: (data) => {
          addLog(`生成内容: 第 ${data.index! + 1} 页 - ${data.title}`, 'info')
          pptStore.updateProgress(data.index! + 1, 'generating_content', data.title || '')
        },
        onContentComplete: (data) => {
          addLog(`内容完成: 第 ${data.index! + 1} 页`, 'success')
        },
        onLayoutProgress: (data) => {
          addLog(`应用布局: 第 ${data.index! + 1} 页 (${data.layout})`, 'info')
          pptStore.updateProgress(data.index! + 1, 'applying_layout', '')
        },
        onPageComplete: (data) => {
          addLog(`页面完成: 第 ${data.index! + 1} 页`, 'success')
        },
        onFinish: (data) => {
          addLog(`PPT 生成完成！`, 'success')
          addLog(`文件路径: ${data.file_path}`, 'info')

          pptStore.finishGeneration(
            data.ppt_id!,
            data.download_url!,
            data.file_path!
          )
        },
        onError: (data) => {
          const errorMsg = data.error || '生成失败'
          error.value = errorMsg
          addLog(`错误: ${errorMsg}`, 'error')
          pptStore.setError(errorMsg)
        },
        onStreamError: (err) => {
          const errorMsg = err.message || '连接失败'
          error.value = errorMsg
          addLog(`连接错误: ${errorMsg}`, 'error')
          pptStore.setError(errorMsg)
        }
      }
    )
  } catch (err: any) {
    error.value = err.message || '启动生成失败'
    addLog(`启动失败: ${error.value}`, 'error')
    pptStore.setError(error.value)
  }
}

function downloadPpt() {
  if (pptStore.pptId) {
    const filename = `${pptStore.topic || 'presentation'}.pptx`
    downloadPptFile(pptStore.pptId, filename)
    addLog(`开始下载: ${filename}`, 'success')
  }
}

onMounted(() => {
  // 如果不在 generating 或 result 阶段，自动开始生成
  if (pptStore.stage !== 'generating' && pptStore.stage !== 'result') {
    startGeneration()
  } else if (pptStore.stage === 'result') {
    addLog('PPT 已生成完成', 'success')
  }
})

onUnmounted(() => {
  // 清理：取消SSE连接
  if (cancelGeneration) {
    cancelGeneration()
  }
})
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-subtitle {
  color: #6b7280;
  font-size: 14px;
}

.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 32px;
}

.progress-container {
  width: 100%;
  height: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  border-radius: 6px;
}

.current-page-info {
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f8f9ff;
  border-radius: 6px;
  font-size: 14px;
  color: #667eea;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 24px;
}

.generation-log {
  margin-top: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.log-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.8;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.log-item:hover {
  background: #f9fafb;
}

.log-item.success {
  color: #059669;
}

.log-item.error {
  color: #dc2626;
}

.log-item.info {
  color: #4b5563;
}

.log-timestamp {
  flex-shrink: 0;
  color: #9ca3af;
  font-size: 12px;
}

.log-message {
  flex: 1;
}

.log-empty {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .card {
    padding: 20px;
  }
}
</style>
