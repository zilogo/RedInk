/**
 * PPT 生成前端 API 代码片段
 * 将这段代码添加到 frontend/src/api/index.ts 文件末尾
 */

// ==================== PPT 生成相关 API ====================

/**
 * 生成 PPT 文件
 */
export async function generatePPT(
  taskId: string,
  outline: { raw: string; pages: Page[] },
  template: string = 'default'
): Promise<{
  success: boolean
  ppt_url?: string
  message?: string
  error?: string
}> {
  const response = await axios.post(`${API_BASE_URL}/ppt/generate/${taskId}`, {
    outline,
    template
  })
  return response.data
}

/**
 * 下载 PPT 文件
 */
export function downloadPPT(taskId: string) {
  window.open(`${API_BASE_URL}/ppt/download/${taskId}`, '_blank')
}

/**
 * 检查 PPT 是否已生成
 */
export async function checkPPTExists(taskId: string): Promise<{
  success: boolean
  exists: boolean
  ppt_url?: string
  error?: string
}> {
  const response = await axios.get(`${API_BASE_URL}/ppt/check/${taskId}`)
  return response.data
}
