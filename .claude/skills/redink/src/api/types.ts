/**
 * RedInk API 类型定义
 */

// 页面类型
export type PageType = 'cover' | 'content' | 'summary';

// 页面对象
export interface Page {
  index: number;
  type: PageType;
  content: string;
}

// 大纲生成响应
export interface OutlineResponse {
  success: boolean;
  pages?: Page[];
  error?: string;
}

// 图片生成 SSE 事件类型
export type SSEEventType = 'progress' | 'complete' | 'error' | 'finish';

// SSE 事件数据
export interface SSEEventData {
  index?: number;
  total?: number;
  image_url?: string;
  error?: string;
  task_id?: string;
  generated?: Record<number, string>;
  failed?: Record<number, string>;
}

// SSE 事件处理器
export interface SSEHandlers {
  onProgress?: (data: SSEEventData) => void;
  onComplete?: (data: SSEEventData) => void;
  onError?: (data: SSEEventData) => void;
  onFinish?: (data: SSEEventData) => void;
}

// 图片生成请求
export interface GenerateImagesRequest {
  pages: Page[];
  task_id: string;
  full_outline?: string;
  user_topic?: string;
  user_images?: string[]; // base64 encoded
}

// 健康检查响应
export interface HealthResponse {
  success: boolean;
  message: string;
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
