/**
 * PPT生成功能的API客户端
 *
 * 提供PPT大纲生成、样式解析、PPT生成和下载等功能的HTTP接口封装
 */

import axios from 'axios'

const API_BASE_URL = '/api/ppt'

// ==================== 类型定义 ====================

export interface PptPage {
  index: number
  type: 'cover' | 'toc' | 'section' | 'content' | 'summary' | 'thankyou'
  title: string
  subtitle?: string
  bullets?: string[]
  layout: string
  notes?: string
}

export interface PptOutline {
  topic: string
  pages: PptPage[]
}

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

// API 响应类型
export interface OutlineResponse {
  success: boolean
  outline?: PptOutline
  error?: string
}

export interface StyleResponse {
  success: boolean
  style_config?: PptStyleConfig
  error?: string
}

// SSE 事件类型
export interface PptProgressEvent {
  event: 'start' | 'content_progress' | 'content_complete' | 'layout_progress' | 'page_complete' | 'finish' | 'error'
  data: {
    ppt_id?: string
    total_pages?: number
    index?: number
    status?: string
    title?: string
    content?: any
    layout?: string
    download_url?: string
    file_path?: string
    success_count?: number
    error?: string
  }
}

// ==================== API 函数 ====================

/**
 * 生成PPT大纲
 *
 * @param topic PPT主题（必填）
 * @param userContent 用户提供的内容（可选）
 * @param pageCount 建议页数（默认15）
 * @returns 大纲生成结果
 */
export async function generatePptOutline(
  topic: string,
  userContent?: string,
  pageCount: number = 15
): Promise<OutlineResponse> {
  const response = await axios.post<OutlineResponse>(`${API_BASE_URL}/outline`, {
    topic,
    user_content: userContent,
    page_count: pageCount
  })
  return response.data
}

/**
 * 解析样式描述
 *
 * @param topic PPT主题
 * @param styleDescription 样式描述（可选，如"商务风格，蓝色主色调，专业字体"）
 * @returns 样式配置
 */
export async function parsePptStyle(
  topic: string,
  styleDescription?: string
): Promise<StyleResponse> {
  const response = await axios.post<StyleResponse>(`${API_BASE_URL}/parse-style`, {
    topic,
    style_description: styleDescription
  })
  return response.data
}

/**
 * 生成PPT文件（SSE流式传输）
 *
 * @param outline PPT大纲
 * @param styleConfig 样式配置
 * @param logoBase64 Logo图片的Base64编码（可选）
 * @param callbacks 事件回调函数
 * @returns 可用于取消的函数
 */
export async function generatePpt(
  outline: PptOutline,
  styleConfig: PptStyleConfig,
  logoBase64: string | undefined,
  callbacks: {
    onStart?: (data: PptProgressEvent['data']) => void
    onContentProgress?: (data: PptProgressEvent['data']) => void
    onContentComplete?: (data: PptProgressEvent['data']) => void
    onLayoutProgress?: (data: PptProgressEvent['data']) => void
    onPageComplete?: (data: PptProgressEvent['data']) => void
    onFinish?: (data: PptProgressEvent['data']) => void
    onError?: (data: PptProgressEvent['data']) => void
    onStreamError?: (error: Error) => void
  }
): Promise<() => void> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outline,
        style_config: styleConfig,
        logo_base64: logoBase64
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let cancelled = false

    // 异步处理SSE流
    ;(async () => {
      try {
        while (!cancelled) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim() || cancelled) continue

            const [eventLine, dataLine] = line.split('\n')
            if (!eventLine || !dataLine) continue

            const eventType = eventLine.replace('event: ', '').trim()
            const eventData = dataLine.replace('data: ', '').trim()

            try {
              const data = JSON.parse(eventData)

              switch (eventType) {
                case 'start':
                  callbacks.onStart?.(data)
                  break
                case 'content_progress':
                  callbacks.onContentProgress?.(data)
                  break
                case 'content_complete':
                  callbacks.onContentComplete?.(data)
                  break
                case 'layout_progress':
                  callbacks.onLayoutProgress?.(data)
                  break
                case 'page_complete':
                  callbacks.onPageComplete?.(data)
                  break
                case 'finish':
                  callbacks.onFinish?.(data)
                  break
                case 'error':
                  callbacks.onError?.(data)
                  break
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e)
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          callbacks.onStreamError?.(error as Error)
        }
      } finally {
        reader.cancel()
      }
    })()

    // 返回取消函数
    return () => {
      cancelled = true
      reader.cancel()
    }
  } catch (error) {
    callbacks.onStreamError?.(error as Error)
    return () => {} // 返回空函数
  }
}

/**
 * 下载PPT文件
 *
 * @param pptId PPT ID
 * @returns 下载URL
 */
export function getPptDownloadUrl(pptId: string): string {
  return `${API_BASE_URL}/download/${pptId}`
}

/**
 * 触发浏览器下载PPT文件
 *
 * @param pptId PPT ID
 * @param filename 保存的文件名（默认为 presentation.pptx）
 */
export function downloadPptFile(pptId: string, filename: string = 'presentation.pptx'): void {
  const url = getPptDownloadUrl(pptId)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 健康检查
 *
 * @returns 服务状态
 */
export async function checkPptHealth(): Promise<{
  success: boolean
  message?: string
}> {
  const response = await axios.get(`${API_BASE_URL}/health`)
  return response.data
}
