/**
 * 自动生成工作流
 *
 * 完整流程：主题 → 大纲 → 图片 → 保存
 */

import { RedInkClient } from '../api/client';
import { SSEClient } from '../api/sse';
import { FileDownloader } from '../utils/file';
import type { Page, SSEEventData } from '../api/types';
import * as crypto from 'crypto';

export class GenerateWorkflow {
  private client: RedInkClient;
  private sseClient: SSEClient | null = null;
  private fileDownloader: FileDownloader;

  constructor() {
    this.client = new RedInkClient();
    this.fileDownloader = new FileDownloader();
  }

  /**
   * 自动生成完整内容（主题 → 大纲 → 图片 → 保存）
   */
  async autoGenerateContent(topic: string): Promise<{
    taskId: string;
    pages: Page[];
    downloadedFiles: string[];
    outputDir: string;
  }> {
    console.log('\n========================================');
    console.log('🚀 开始生成小红书图文内容');
    console.log('========================================\n');

    // 1. 初始化客户端
    console.log('⏳ 初始化连接...');
    await this.client.initialize();

    // 健康检查
    const isHealthy = await this.client.checkHealth();
    if (!isHealthy) {
      throw new Error('RedInk 服务不可用');
    }
    console.log('✅ 服务连接正常\n');

    // 2. 生成大纲
    console.log(`📝 主题: ${topic}\n`);
    const outlineResult = await this.client.generateOutline(topic);

    if (!outlineResult.success || !outlineResult.pages) {
      throw new Error(outlineResult.error || '大纲生成失败');
    }

    const pages = outlineResult.pages;

    // 显示大纲
    console.log('\n📋 大纲生成完成：');
    console.log('----------------------------------------');
    pages.forEach((page) => {
      const typeLabel = {
        cover: '封面',
        content: '内容',
        summary: '总结',
      }[page.type];
      console.log(`  ${page.index + 1}. [${typeLabel}] ${page.content.substring(0, 40)}...`);
    });
    console.log('----------------------------------------\n');

    // 3. 生成 task ID
    const taskId = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 4. 生成图片（SSE 流式）
    const baseUrl = this.client.getBaseUrl();
    this.sseClient = new SSEClient(baseUrl);

    const generatedImages: Record<number, string> = {};
    const failedImages: Record<number, string> = {};

    console.log('🎨 开始生成图片...\n');

    await this.sseClient.streamGenerateImages(
      pages,
      taskId,
      {
        onProgress: (data: SSEEventData) => {
          if (data.index !== undefined && data.total) {
            console.log(`⏳ 正在生成第 ${data.index + 1}/${data.total} 张图片...`);
          }
        },
        onComplete: (data: SSEEventData) => {
          if (data.index !== undefined && data.image_url) {
            generatedImages[data.index] = data.image_url;
            const page = pages[data.index];
            const typeLabel = {
              cover: '封面',
              content: '内容',
              summary: '总结',
            }[page.type];
            console.log(`✅ 第 ${data.index + 1} 张完成 [${typeLabel}]: ${page.content.substring(0, 30)}...`);
          }
        },
        onError: (data: SSEEventData) => {
          if (data.index !== undefined && data.error) {
            failedImages[data.index] = data.error;
            console.error(`❌ 第 ${data.index + 1} 张失败: ${data.error}`);
          }
        },
        onFinish: (data: SSEEventData) => {
          console.log('\n🎉 图片生成完成！');
          if (data.generated) {
            console.log(`✅ 成功: ${Object.keys(data.generated).length} 张`);
          }
          if (data.failed && Object.keys(data.failed).length > 0) {
            console.log(`❌ 失败: ${Object.keys(data.failed).length} 张`);
          }
        },
      },
      pages.map((p) => p.content).join('\n\n'),
      topic
    );

    // 5. 下载图片
    console.log('\n📥 开始下载图片...\n');

    const imageFilenames = Object.keys(generatedImages)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((index) => `${index}.png`);

    const downloadedFiles = await this.fileDownloader.downloadAllImages(
      baseUrl,
      taskId,
      imageFilenames
    );

    // 6. 输出结果
    const outputDir = `${process.cwd()}/output/${taskId}`;

    console.log('\n========================================');
    console.log('✅ 全部完成！');
    console.log('========================================\n');
    console.log(`📁 保存位置: ${outputDir}`);
    console.log(`📊 统计信息:`);
    console.log(`   - 大纲页数: ${pages.length}`);
    console.log(`   - 生成成功: ${downloadedFiles.length} 张`);
    console.log(`   - 生成失败: ${Object.keys(failedImages).length} 张`);

    if (downloadedFiles.length > 0) {
      console.log(`\n📸 图片列表:`);
      downloadedFiles.forEach((file, index) => {
        const page = pages[index];
        if (page) {
          const typeLabel = {
            cover: '封面',
            content: '内容',
            summary: '总结',
          }[page.type];
          console.log(`   ${index + 1}. ${file.split('/').pop()} [${typeLabel}] ${page.content.substring(0, 30)}...`);
        }
      });
    }

    if (Object.keys(failedImages).length > 0) {
      console.log(`\n⚠️ 失败的图片:`);
      Object.entries(failedImages).forEach(([index, error]) => {
        console.log(`   - 第 ${parseInt(index) + 1} 张: ${error}`);
      });
    }

    console.log('\n========================================\n');

    return {
      taskId,
      pages,
      downloadedFiles,
      outputDir,
    };
  }
}
