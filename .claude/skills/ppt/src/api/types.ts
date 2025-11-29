/**
 * PPT API 类型定义
 */

// 页面类型
export type PageType = 'cover' | 'toc' | 'section' | 'content' | 'summary' | 'thankyou';

// 页面对象
export interface PptPage {
  index: number;
  type: PageType;
  title: string;
  subtitle?: string;
  bullets?: string[];
  layout: string;
  notes?: string;
}

// 大纲
export interface PptOutline {
  topic: string;
  pages: PptPage[];
}

// 样式配置
export interface PptStyleConfig {
  theme_id: string;
  color_primary: string;
  color_secondary: string;
  color_background: string;
  color_text: string;
  color_accent?: string;
  font_title: string;
  font_title_size: number;
  font_title_bold?: boolean;
  font_body: string;
  font_body_size: number;
  font_body_bold?: boolean;
  logo_url?: string;
  logo_position?: string;
  logo_size?: string;
  layout_preferences?: string[];
  layout_ai_freestyle?: boolean;
}

// 大纲生成响应
export interface OutlineResponse {
  success: boolean;
  outline?: PptOutline;
  error?: string;
}

// 样式解析响应
export interface StyleResponse {
  success: boolean;
  style_config?: PptStyleConfig;
  error?: string;
}

// PPT 生成 SSE 事件类型
export type SSEEventType = 'start' | 'content_progress' | 'content_complete' | 'layout_progress' | 'image_progress' | 'page_complete' | 'error' | 'finish';

// SSE 事件数据
export interface SSEEventData {
  index?: number;
  total?: number;
  title?: string;
  status?: string;
  error?: string;
  ppt_id?: string;
  download_url?: string;
  file_path?: string;
}

// SSE 事件处理器
export interface SSEHandlers {
  onStart?: (data: SSEEventData) => void;
  onContentProgress?: (data: SSEEventData) => void;
  onContentComplete?: (data: SSEEventData) => void;
  onLayoutProgress?: (data: SSEEventData) => void;
  onImageProgress?: (data: SSEEventData) => void;
  onPageComplete?: (data: SSEEventData) => void;
  onError?: (data: SSEEventData) => void;
  onFinish?: (data: SSEEventData) => void;
}

// PPT 生成请求
export interface GeneratePptRequest {
  outline: PptOutline;
  style_config: PptStyleConfig;
  logo_base64?: string;
}

// 健康检查响应
export interface HealthResponse {
  success: boolean;
  service: string;
  status: string;
}

// API 错误
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}
