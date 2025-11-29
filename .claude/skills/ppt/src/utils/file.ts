/**
 * 文件下载和 Logo 处理工具
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

export class FileDownloader {
  private readonly OUTPUT_DIR = path.join(process.cwd(), 'output');

  /**
   * 下载 PPT 文件
   */
  async downloadPpt(baseUrl: string, pptId: string): Promise<string> {
    const url = `${baseUrl}/api/ppt/download/${pptId}`;
    const outputDir = path.join(this.OUTPUT_DIR, pptId);
    const outputPath = path.join(outputDir, 'presentation.pptx');

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📥 正在下载 PPT 文件...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const buffer = await response.buffer();
      fs.writeFileSync(outputPath, buffer);

      console.log(`✅ PPT 文件下载完成: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`❌ PPT 文件下载失败:`, error);
      throw error;
    }
  }

  /**
   * 读取 Logo 文件并转换为 Base64
   */
  async loadLogoAsBase64(logoPath: string): Promise<string> {
    if (!fs.existsSync(logoPath)) {
      throw new Error(`Logo 文件不存在: ${logoPath}`);
    }

    const ext = path.extname(logoPath).toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

    if (!validExtensions.includes(ext)) {
      throw new Error(`Logo 格式不支持: ${ext}，仅支持 PNG、JPG、WEBP`);
    }

    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };

    const mimeType = mimeTypes[ext];
    const buffer = fs.readFileSync(logoPath);
    const base64 = buffer.toString('base64');

    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * 获取文件大小（格式化）
   */
  getFormattedFileSize(filePath: string): string {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}
