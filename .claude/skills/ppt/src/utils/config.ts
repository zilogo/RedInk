/**
 * 配置管理和连接检测
 */

import fetch from 'node-fetch';

class ConfigManager {
  private readonly DEFAULT_BASE_URL = 'http://localhost:12398';
  private readonly DOCKER_BASE_URL = 'http://localhost:12398';

  /**
   * 检测并返回可用的 base URL
   */
  async detectBaseUrl(): Promise<string> {
    const urls = [this.DEFAULT_BASE_URL, this.DOCKER_BASE_URL];

    for (const url of urls) {
      if (await this.checkConnection(url)) {
        return url;
      }
    }

    throw new Error(
      `无法连接到 RedInk 服务！\n\n` +
      `请确保：\n` +
      `1. RedInk 服务正在运行\n` +
      `2. 端口 12398 已正确映射\n` +
      `3. Docker 容器状态正常\n\n` +
      `测试命令: curl http://localhost:12398/api/ppt/health`
    );
  }

  /**
   * 检查连接
   */
  private async checkConnection(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/ppt/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      baseUrl: this.DEFAULT_BASE_URL,
      pageCount: 15,
      logoPosition: 'bottom-right',
      logoSize: 'medium',
    };
  }
}

export const configManager = new ConfigManager();
