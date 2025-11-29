/**
 * PPT生成功能的状态管理
 *
 * 管理PPT生成的完整流程状态，包括主题输入、大纲编辑、生成进度和结果展示
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 页面数据类型
export interface PptPage {
  index: number
  type: 'cover' | 'toc' | 'section' | 'content' | 'summary' | 'thankyou'
  title: string
  subtitle?: string
  bullets?: string[]
  layout: string
  notes?: string
}

// 大纲类型
export interface PptOutline {
  topic: string
  pages: PptPage[]
}

// 样式配置类型
export interface PptStyleConfig {
  theme_id: string
  color_primary: string
  color_secondary: string
  color_background: string
  color_text: string
  color_accent?: string
  font_title: string
  font_title_size: number
  font_title_bold?: boolean
  font_body: string
  font_body_size: number
  font_body_bold?: boolean
  logo_url?: string
  logo_position?: string
  logo_size?: string
  layout_preferences?: string[]
  layout_ai_freestyle?: boolean
}

// 生成进度类型
export interface PptGenerationProgress {
  current: number
  total: number
  status: 'idle' | 'generating_content' | 'applying_layout' | 'done' | 'error'
  currentPageTitle: string
}

export const usePptStore = defineStore('ppt', () => {
  // ===== 状态 =====

  // 当前阶段
  const stage = ref<'input' | 'outline' | 'generating' | 'result'>('input')

  // 用户输入
  const topic = ref('')
  const userContent = ref('')
  const styleDescription = ref('')
  const pageCount = ref(15)
  const logoBase64 = ref<string>('')  // Logo 图片 Base64 编码
  const logoPosition = ref<string>('bottom-right')  // Logo 位置
  const logoSize = ref<string>('medium')  // Logo 大小

  // 生成的大纲
  const outline = ref<PptOutline>({
    topic: '',
    pages: []
  })

  // 样式配置
  const styleConfig = ref<PptStyleConfig | null>(null)

  // 生成进度
  const progress = ref<PptGenerationProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    currentPageTitle: ''
  })

  // 生成结果
  const pptId = ref<string | null>(null)
  const downloadUrl = ref<string | null>(null)
  const filePath = ref<string | null>(null)

  // ===== 计算属性 =====

  // 进度百分比
  const progressPercentage = computed(() => {
    if (progress.value.total === 0) return 0
    return Math.round((progress.value.current / progress.value.total) * 100)
  })

  // 是否可以下载
  const canDownload = computed(() => {
    return stage.value === 'result' && downloadUrl.value !== null
  })

  // 获取页面数量
  const pageTotal = computed(() => outline.value.pages.length)

  // ===== Actions =====

  /**
   * 设置用户输入
   */
  function setInput(
    topicText: string,
    content: string = '',
    style: string = '',
    count: number = 15,
    logo: string = '',
    position: string = 'bottom-right',
    size: string = 'medium'
  ) {
    topic.value = topicText
    userContent.value = content
    styleDescription.value = style
    pageCount.value = count
    logoBase64.value = logo
    logoPosition.value = position
    logoSize.value = size
  }

  /**
   * 设置大纲
   */
  function setOutline(newOutline: PptOutline) {
    outline.value = newOutline
    stage.value = 'outline'
  }

  /**
   * 设置样式配置
   */
  function setStyleConfig(config: PptStyleConfig) {
    styleConfig.value = config
  }

  /**
   * 更新单个页面
   */
  function updatePage(index: number, updates: Partial<PptPage>) {
    const pageIndex = outline.value.pages.findIndex(p => p.index === index)
    if (pageIndex !== -1) {
      outline.value.pages[pageIndex] = {
        ...outline.value.pages[pageIndex],
        ...updates
      }
    }
  }

  /**
   * 删除页面
   */
  function deletePage(index: number) {
    outline.value.pages = outline.value.pages.filter(p => p.index !== index)
    // 重新编号
    outline.value.pages.forEach((page, idx) => {
      page.index = idx
    })
  }

  /**
   * 添加页面
   */
  function addPage(page: PptPage) {
    outline.value.pages.push(page)
  }

  /**
   * 移动页面
   */
  function movePage(fromIndex: number, toIndex: number) {
    const pages = [...outline.value.pages]
    const [removed] = pages.splice(fromIndex, 1)
    pages.splice(toIndex, 0, removed)

    // 重新编号
    pages.forEach((page, idx) => {
      page.index = idx
    })

    outline.value.pages = pages
  }

  /**
   * 开始生成
   */
  function startGeneration() {
    stage.value = 'generating'
    progress.value = {
      current: 0,
      total: outline.value.pages.length,
      status: 'generating_content',
      currentPageTitle: ''
    }
  }

  /**
   * 更新进度
   */
  function updateProgress(
    current: number,
    status: PptGenerationProgress['status'],
    pageTitle: string = ''
  ) {
    progress.value.current = current
    progress.value.status = status
    progress.value.currentPageTitle = pageTitle
  }

  /**
   * 完成生成
   */
  function finishGeneration(
    id: string,
    downloadPath: string,
    file: string
  ) {
    pptId.value = id
    downloadUrl.value = downloadPath
    filePath.value = file
    stage.value = 'result'
    progress.value.status = 'done'
  }

  /**
   * 生成失败
   */
  function setError(message: string) {
    progress.value.status = 'error'
    console.error('PPT生成失败:', message)
  }

  /**
   * 重置状态
   */
  function reset() {
    stage.value = 'input'
    topic.value = ''
    userContent.value = ''
    styleDescription.value = ''
    pageCount.value = 15
    outline.value = { topic: '', pages: [] }
    styleConfig.value = null
    progress.value = {
      current: 0,
      total: 0,
      status: 'idle',
      currentPageTitle: ''
    }
    pptId.value = null
    downloadUrl.value = null
    filePath.value = null
  }

  /**
   * 返回到大纲编辑
   */
  function backToOutline() {
    stage.value = 'outline'
    progress.value.status = 'idle'
  }

  /**
   * 返回到输入页
   */
  function backToInput() {
    stage.value = 'input'
  }

  // ===== 持久化 =====

  /**
   * 保存到 localStorage
   */
  function saveToStorage() {
    const state = {
      stage: stage.value,
      topic: topic.value,
      userContent: userContent.value,
      styleDescription: styleDescription.value,
      pageCount: pageCount.value,
      logoBase64: logoBase64.value,
      logoPosition: logoPosition.value,
      logoSize: logoSize.value,
      outline: outline.value,
      styleConfig: styleConfig.value,
      pptId: pptId.value,
      downloadUrl: downloadUrl.value,
      filePath: filePath.value
    }
    localStorage.setItem('ppt_state', JSON.stringify(state))
  }

  /**
   * 从 localStorage 恢复
   */
  function loadFromStorage() {
    const saved = localStorage.getItem('ppt_state')
    if (saved) {
      try {
        const state = JSON.parse(saved)
        stage.value = state.stage
        topic.value = state.topic
        userContent.value = state.userContent
        styleDescription.value = state.styleDescription
        pageCount.value = state.pageCount
        logoBase64.value = state.logoBase64 || ''
        logoPosition.value = state.logoPosition || 'bottom-right'
        logoSize.value = state.logoSize || 'medium'
        outline.value = state.outline
        styleConfig.value = state.styleConfig
        pptId.value = state.pptId
        downloadUrl.value = state.downloadUrl
        filePath.value = state.filePath
      } catch (e) {
        console.error('恢复PPT状态失败:', e)
      }
    }
  }

  /**
   * 清除存储
   */
  function clearStorage() {
    localStorage.removeItem('ppt_state')
  }

  return {
    // 状态
    stage,
    topic,
    userContent,
    styleDescription,
    pageCount,
    logoBase64,
    logoPosition,
    logoSize,
    outline,
    styleConfig,
    progress,
    pptId,
    downloadUrl,
    filePath,

    // 计算属性
    progressPercentage,
    canDownload,
    pageTotal,

    // Actions
    setInput,
    setOutline,
    setStyleConfig,
    updatePage,
    deletePage,
    addPage,
    movePage,
    startGeneration,
    updateProgress,
    finishGeneration,
    setError,
    reset,
    backToOutline,
    backToInput,
    saveToStorage,
    loadFromStorage,
    clearStorage
  }
})
