/**
 * 自动生成工作流
 *
 * 完整流程：主题 → 大纲 → 样式 → PPT生成 → 下载
 */

import { PptClient } from '../api/client';
import { SSEClient } from '../api/sse';
import { FileDownloader } from '../utils/file';
import type { PptOutline, PptStyleConfig, SSEEventData, PptPage } from '../api/types';

export interface GenerateOptions {
  topic: string;
  pageCount?: number;
  userContent?: string;
  styleDescription?: string;
  logoPath?: string;
  logoPosition?: string;
  logoSize?: string;
}

export class GenerateWorkflow {
  private client: PptClient;
  private sseClient: SSEClient | null = null;
  private fileDownloader: FileDownloader;

  constructor() {
    this.client = new PptClient();
    this.fileDownloader = new FileDownloader();
  }

  /**
   * 自动生成完整 PPT（主题 → 大纲 → 样式 → PPT → 下载）
   */
  async autoGeneratePpt(options: GenerateOptions): Promise<{
    outline: PptOutline;
    styleConfig: PptStyleConfig;
    pptId: string;
    downloadPath: string;
    filePath: string;
  }> {
    console.log('\n========================================');
    console.log('🚀 开始生成 PPT 演示文稿');
    console.log('========================================\n');

    // 1. 初始化客户端
    console.log('⏳ 初始化连接...');
    await this.client.initialize();

    // 健康检查
    const isHealthy = await this.client.checkHealth();
    if (!isHealthy) {
      throw new Error('PPT 服务不可用');
    }
    console.log('✅ 服务连接正常\n');

    // 2. 生成大纲
    console.log(`📝 主题: ${options.topic}\n`);
    if (options.userContent) {
      console.log(`📄 内容要点:\n${options.userContent}\n`);
    }

    const outlineResult = await this.client.generateOutline(
      options.topic,
      options.userContent,
      options.pageCount || 15
    );

    if (!outlineResult.success || !outlineResult.outline) {
      throw new Error(outlineResult.error || '大纲生成失败');
    }

    const outline = outlineResult.outline;

    // 显示大纲
    this.displayOutline(outline);

    // 3. 解析样式
    if (options.styleDescription) {
      console.log(`🎨 样式描述: ${options.styleDescription}\n`);
    }

    const styleResult = await this.client.parseStyle(
      options.topic,
      options.styleDescription
    );

    if (!styleResult.success || !styleResult.style_config) {
      throw new Error(styleResult.error || '样式解析失败');
    }

    const styleConfig = styleResult.style_config;

    // 显示样式配置
    this.displayStyleConfig(styleConfig);

    // 4. 处理 Logo
    let logoBase64: string | undefined;
    if (options.logoPath) {
      console.log(`📷 正在加载 Logo: ${options.logoPath}`);
      try {
        logoBase64 = await this.fileDownloader.loadLogoAsBase64(options.logoPath);
        console.log(`✅ Logo 加载成功\n`);

        // 添加 Logo 配置到样式
        styleConfig.logo_position = options.logoPosition || 'bottom-right';
        styleConfig.logo_size = options.logoSize || 'medium';
      } catch (error) {
        console.error(`❌ Logo 加载失败: ${error}`);
        console.log(`⚠️ 将生成不含 Logo 的 PPT\n`);
      }
    }

    // 5. 生成 PPT（SSE 流式）
    const baseUrl = this.client.getBaseUrl();
    this.sseClient = new SSEClient(baseUrl);

    let pptId: string | null = null;
    let downloadUrl: string | null = null;
    let filePath: string | null = null;

    console.log('🎨 开始生成 PPT...\n');

    const startTime = Date.now();

    await this.sseClient.streamGeneratePpt(
      outline,
      styleConfig,
      {
        onStart: (data: SSEEventData) => {
          console.log('✨ PPT 生成开始...');
        },
        onContentProgress: (data: SSEEventData) => {
          if (data.index !== undefined && data.total && data.title) {
            console.log(`📝 [${data.index + 1}/${data.total}] 正在生成内容: ${data.title}`);
          }
        },
        onContentComplete: (data: SSEEventData) => {
          if (data.index !== undefined && data.title) {
            console.log(`✅ [${data.index + 1}] 内容生成完成: ${data.title}`);
          }
        },
        onLayoutProgress: (data: SSEEventData) => {
          if (data.index !== undefined && data.title) {
            console.log(`🎨 [${data.index + 1}] 正在应用布局: ${data.title}`);
          }
        },
        onImageProgress: (data: SSEEventData) => {
          if (data.index !== undefined && data.status && data.title) {
            const statusLabel = data.status === 'generating_fullpage_image'
              ? '生成完整页面图片'
              : '生成背景图片';
            console.log(`🖼️  [${data.index + 1}] ${statusLabel}: ${data.title}`);
          }
        },
        onPageComplete: (data: SSEEventData) => {
          if (data.index !== undefined && data.title) {
            console.log(`✅ [${data.index + 1}] 页面完成: ${data.title}`);
          }
        },
        onError: (data: SSEEventData) => {
          console.error(`❌ 错误: ${data.error}`);
        },
        onFinish: (data: SSEEventData) => {
          pptId = data.ppt_id || null;
          downloadUrl = data.download_url || null;
          filePath = data.file_path || null;

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`\n🎉 PPT 生成完成！耗时 ${duration} 秒`);
        },
      },
      logoBase64
    );

    if (!pptId || !downloadUrl || !filePath) {
      throw new Error('PPT 生成失败：未收到完整的响应数据');
    }

    // 6. 下载 PPT 文件
    console.log('\n📥 正在下载 PPT 文件...\n');

    const downloadedPath = await this.fileDownloader.downloadPpt(baseUrl, pptId);

    // 7. 输出结果
    console.log('\n========================================');
    console.log('✅ 全部完成！');
    console.log('========================================\n');
    console.log(`📁 保存位置: ${downloadedPath}`);
    console.log(`📊 统计信息:`);
    console.log(`   - 主题: ${options.topic}`);
    console.log(`   - 页数: ${outline.pages.length} 页`);
    console.log(`   - 文件大小: ${this.fileDownloader.getFormattedFileSize(downloadedPath)}`);
    console.log(`   - PPT ID: ${pptId}`);

    if (logoBase64) {
      console.log(`   - Logo: ${options.logoPath}`);
      console.log(`   - Logo 位置: ${styleConfig.logo_position}`);
      console.log(`   - Logo 大小: ${styleConfig.logo_size}`);
    }

    console.log('\n========================================\n');

    return {
      outline,
      styleConfig,
      pptId,
      downloadPath: downloadUrl,
      filePath: downloadedPath,
    };
  }

  /**
   * 显示大纲
   */
  private displayOutline(outline: PptOutline): void {
    console.log('\n📋 PPT 大纲：');
    console.log('----------------------------------------');
    outline.pages.forEach((page: PptPage) => {
      const typeLabel = this.getPageTypeLabel(page.type);
      const subtitle = page.subtitle ? ` - ${page.subtitle}` : '';
      console.log(`  ${page.index + 1}. [${typeLabel}] ${page.title}${subtitle}`);
      if (page.bullets && page.bullets.length > 0) {
        page.bullets.forEach((bullet: string) => {
          console.log(`     • ${bullet}`);
        });
      }
    });
    console.log('----------------------------------------\n');
  }

  /**
   * 显示样式配置
   */
  private displayStyleConfig(config: PptStyleConfig): void {
    console.log('\n🎨 样式配置：');
    console.log('----------------------------------------');
    console.log(`  主题 ID: ${config.theme_id}`);
    console.log(`  主色调: ${config.color_primary}`);
    console.log(`  辅助色: ${config.color_secondary}`);
    console.log(`  背景色: ${config.color_background}`);
    console.log(`  文字色: ${config.color_text}`);
    console.log(`  标题字体: ${config.font_title} (${config.font_title_size}pt)`);
    console.log(`  正文字体: ${config.font_body} (${config.font_body_size}pt)`);
    console.log('----------------------------------------\n');
  }

  /**
   * 获取页面类型标签
   */
  private getPageTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      cover: '封面',
      toc: '目录',
      section: '章节',
      content: '内容',
      summary: '总结',
      thankyou: '感谢',
    };
    return labels[type] || type;
  }
}
