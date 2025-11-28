/**
 * 配置管理和连接检测
 */

import fetch from 'node-fetch';
import type { HealthResponse } from '../api/types';

export class ConfigManager {
  private baseUrl: string | null = null;

  /**
   * 自动检测 RedInk 服务的 base URL
   */
  async detectBaseUrl(): Promise<string> {
    if (this.baseUrl) {
      return this.baseUrl;
    }

    const candidates = [
      'http://localhost:12398',
      'http://host.docker.internal:12398',
    ];

    console.log('🔍 正在检测 RedInk 服务连接...');

    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${url}/api/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as HealthResponse;
          if (data.success) {
            console.log(`✅ 检测到 RedInk 服务: ${url}`);
            this.baseUrl = url;
            return url;
          }
        }
      } catch (error) {
        // 继续尝试下一个
        continue;
      }
    }

    throw new Error(
      '❌ 无法连接到 RedInk 服务！\n\n' +
      '请检查：\n' +
      '1. Docker 容器是否运行：docker ps | grep redink\n' +
      '2. 端口 12398 是否映射正确\n' +
      '3. 服务是否健康：docker logs redink\n' +
      '4. 尝试手动启动：docker-compose up -d\n\n' +
      '测试命令：curl http://localhost:12398/api/health'
    );
  }

  /**
   * 获取当前 base URL（如果已检测）
   */
  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  /**
   * 重置连接（用于重新检测）
   */
  reset(): void {
    this.baseUrl = null;
  }
}

// 单例
export const configManager = new ConfigManager();
