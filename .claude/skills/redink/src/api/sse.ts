/**
 * SSE (Server-Sent Events) 流式响应处理器
 *
 * 这是项目的核心难点：Node.js 需要手动解析 SSE 格式
 */

import fetch from 'node-fetch';
import type { SSEHandlers, SSEEventData, Page, GenerateImagesRequest } from './types';

export class SSEClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * 流式生成图片（监听 SSE 事件）
   */
  async streamGenerateImages(
    pages: Page[],
    taskId: string,
    handlers: SSEHandlers,
    fullOutline?: string,
    userTopic?: string
  ): Promise<void> {
    const url = `${this.baseUrl}/api/generate`;

    const payload: GenerateImagesRequest = {
      pages,
      task_id: taskId,
      full_outline: fullOutline,
      user_topic: userTopic,
    };

    console.log(`🎨 开始生成 ${pages.length} 张图片...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      // 手动解析 SSE 流
      await this.parseSSEStream(response.body, handlers);
    } catch (error) {
      console.error('❌ SSE 流处理失败:', error);
      throw error;
    }
  }

  /**
   * 解析 SSE 流
   */
  private async parseSSEStream(
    stream: NodeJS.ReadableStream | null,
    handlers: SSEHandlers
  ): Promise<void> {
    if (!stream) {
      throw new Error('响应流为空');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // 读取流
    for await (const chunk of stream) {
      // 将 chunk 转换为字符串并追加到缓冲区
      buffer += decoder.decode(chunk as Buffer, { stream: true });

      // SSE 事件以 "\n\n" 分隔
      const events = buffer.split('\n\n');

      // 保留最后一个不完整的事件在缓冲区
      buffer = events.pop() || '';

      // 处理每个完整事件
      for (const event of events) {
        if (event.trim()) {
          this.processSSEEvent(event, handlers);
        }
      }
    }

    // 处理剩余缓冲区（如果有）
    if (buffer.trim()) {
      this.processSSEEvent(buffer, handlers);
    }
  }

  /**
   * 处理单个 SSE 事件
   */
  private processSSEEvent(eventText: string, handlers: SSEHandlers): void {
    const lines = eventText.split('\n');

    let eventType: string | null = null;
    let dataText: string | null = null;

    // 解析事件行
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.replace('event:', '').trim();
      } else if (line.startsWith('data:')) {
        dataText = line.replace('data:', '').trim();
      }
    }

    // 如果没有事件类型或数据，跳过
    if (!eventType || !dataText) {
      return;
    }

    // 解析 JSON 数据
    let data: SSEEventData;
    try {
      data = JSON.parse(dataText);
    } catch (error) {
      console.error('❌ JSON 解析失败:', dataText);
      return;
    }

    // 路由到对应的处理器
    switch (eventType) {
      case 'progress':
        handlers.onProgress?.(data);
        break;
      case 'complete':
        handlers.onComplete?.(data);
        break;
      case 'error':
        handlers.onError?.(data);
        break;
      case 'finish':
        handlers.onFinish?.(data);
        break;
      default:
        console.warn(`⚠️ 未知事件类型: ${eventType}`);
    }
  }
}
