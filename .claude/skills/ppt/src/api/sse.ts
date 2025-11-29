/**
 * SSE (Server-Sent Events) 客户端
 *
 * 处理 PPT 生成的流式传输
 */

import fetch from 'node-fetch';
import type {
  PptOutline,
  PptStyleConfig,
  SSEHandlers,
  SSEEventData,
  SSEEventType,
  GeneratePptRequest,
} from './types';

export class SSEClient {
  constructor(private baseUrl: string) {}

  /**
   * 流式生成 PPT
   */
  async streamGeneratePpt(
    outline: PptOutline,
    styleConfig: PptStyleConfig,
    handlers: SSEHandlers,
    logoBase64?: string
  ): Promise<void> {
    const url = `${this.baseUrl}/api/ppt/generate`;

    const body: GeneratePptRequest = {
      outline,
      style_config: styleConfig,
      logo_base64: logoBase64,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      // 处理 SSE 流
      await this.processSSEStream(response.body, handlers);

    } catch (error) {
      console.error('❌ SSE 连接失败:', error);
      if (handlers.onError) {
        handlers.onError({ error: String(error) });
      }
      throw error;
    }
  }

  /**
   * 处理 SSE 流
   */
  private async processSSEStream(stream: any, handlers: SSEHandlers): Promise<void> {
    return new Promise((resolve, reject) => {
      let buffer = '';

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();

        // 按 \n\n 分割事件
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // 保留未完成的部分

        for (const event of events) {
          if (!event.trim()) continue;

          try {
            const parsed = this.parseSSEEvent(event);
            if (parsed) {
              this.handleSSEEvent(parsed.event, parsed.data, handlers);
            }
          } catch (error) {
            console.error('❌ SSE 事件解析错误:', error);
          }
        }
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * 解析 SSE 事件
   */
  private parseSSEEvent(eventText: string): { event: SSEEventType; data: SSEEventData } | null {
    const lines = eventText.split('\n');
    let event: SSEEventType | null = null;
    let dataText = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.substring(7).trim() as SSEEventType;
      } else if (line.startsWith('data: ')) {
        dataText = line.substring(6).trim();
      }
    }

    if (!event || !dataText) {
      return null;
    }

    try {
      const data = JSON.parse(dataText) as SSEEventData;
      return { event, data };
    } catch (error) {
      console.error('❌ JSON 解析失败:', dataText);
      return null;
    }
  }

  /**
   * 处理 SSE 事件
   */
  private handleSSEEvent(event: SSEEventType, data: SSEEventData, handlers: SSEHandlers): void {
    switch (event) {
      case 'start':
        if (handlers.onStart) {
          handlers.onStart(data);
        }
        break;

      case 'content_progress':
        if (handlers.onContentProgress) {
          handlers.onContentProgress(data);
        }
        break;

      case 'content_complete':
        if (handlers.onContentComplete) {
          handlers.onContentComplete(data);
        }
        break;

      case 'layout_progress':
        if (handlers.onLayoutProgress) {
          handlers.onLayoutProgress(data);
        }
        break;

      case 'image_progress':
        if (handlers.onImageProgress) {
          handlers.onImageProgress(data);
        }
        break;

      case 'page_complete':
        if (handlers.onPageComplete) {
          handlers.onPageComplete(data);
        }
        break;

      case 'error':
        if (handlers.onError) {
          handlers.onError(data);
        }
        break;

      case 'finish':
        if (handlers.onFinish) {
          handlers.onFinish(data);
        }
        break;

      default:
        console.log(`[未知事件] ${event}:`, data);
    }
  }
}
