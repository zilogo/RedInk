/**
 * PPT API 客户端
 */

import fetch, { Response } from 'node-fetch';
import type {
  HealthResponse,
  OutlineResponse,
  StyleResponse,
  PptOutline,
  PptStyleConfig,
} from './types';
import { APIError } from './types';
import { configManager } from '../utils/config';

export class PptClient {
  private baseUrl: string | null = null;

  /**
   * 初始化客户端（检测连接）
   */
  async initialize(): Promise<void> {
    this.baseUrl = await configManager.detectBaseUrl();
  }

  /**
   * 健康检查
   */
  async checkHealth(): Promise<boolean> {
    if (!this.baseUrl) {
      await this.initialize();
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/api/ppt/health`);
      const data = (await response.json()) as HealthResponse;
      return data.success;
    } catch (error) {
      console.error('❌ PPT 服务健康检查失败:', error);
      return false;
    }
  }

  /**
   * 生成大纲
   */
  async generateOutline(topic: string, userContent?: string, pageCount: number = 15): Promise<OutlineResponse> {
    if (!this.baseUrl) {
      await this.initialize();
    }

    console.log(`📝 正在生成 PPT 大纲: ${topic.substring(0, 50)}...`);

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/api/ppt/outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          user_content: userContent,
          page_count: pageCount,
        }),
      });

      const data = (await response.json()) as OutlineResponse;

      if (!data.success) {
        throw new APIError(500, data.error || '大纲生成失败');
      }

      console.log(`✅ 大纲生成成功！共 ${data.outline?.pages?.length || 0} 页`);
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, `大纲生成失败: ${error}`);
    }
  }

  /**
   * 解析样式
   */
  async parseStyle(topic: string, styleDescription?: string): Promise<StyleResponse> {
    if (!this.baseUrl) {
      await this.initialize();
    }

    console.log(`🎨 正在解析样式配置...`);

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/api/ppt/parse-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          style_description: styleDescription,
        }),
      });

      const data = (await response.json()) as StyleResponse;

      if (!data.success) {
        throw new APIError(500, data.error || '样式解析失败');
      }

      console.log(`✅ 样式配置生成成功！`);
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, `样式解析失败: ${error}`);
    }
  }

  /**
   * 带重试的 fetch 请求
   */
  private async fetchWithRetry(
    url: string,
    options?: any,
    maxRetries: number = 3
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          const errorText = await response.text();
          throw new APIError(
            response.status,
            `HTTP ${response.status}: ${errorText}`
          );
        }

        return response;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        // 可重试的错误
        if (this.isRetriableError(error) && !isLastAttempt) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⚠️ 请求失败，${waitTime / 1000}秒后重试 (${attempt}/${maxRetries})...`);
          await this.sleep(waitTime);
          continue;
        }

        // 不可重试或最后一次尝试
        throw error;
      }
    }

    throw new Error('Unexpected: fetchWithRetry loop completed without return');
  }

  /**
   * 判断错误是否可重试
   */
  private isRetriableError(error: any): boolean {
    // 网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // 5xx 服务器错误
    if (error instanceof APIError && error.statusCode >= 500) {
      return true;
    }

    return false;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取 base URL
   */
  getBaseUrl(): string {
    if (!this.baseUrl) {
      throw new Error('客户端未初始化，请先调用 initialize()');
    }
    return this.baseUrl;
  }
}
