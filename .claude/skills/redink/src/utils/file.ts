/**
 * 文件下载工具
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

export class FileDownloader {
  /**
   * 下载单张图片
   */
  async downloadImage(
    baseUrl: string,
    taskId: string,
    filename: string,
    outputDir: string
  ): Promise<string> {
    const url = `${baseUrl}/api/images/${taskId}/${filename}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const localPath = path.join(outputDir, filename);

      fs.writeFileSync(localPath, Buffer.from(buffer));

      return localPath;
    } catch (error) {
      console.error(`❌ 下载 ${filename} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量下载所有图片
   */
  async downloadAllImages(
    baseUrl: string,
    taskId: string,
    filenames: string[],
    projectRoot: string = process.cwd()
  ): Promise<string[]> {
    // 创建输出目录
    const outputDir = path.join(projectRoot, 'output', taskId);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`📁 准备下载 ${filenames.length} 张图片到: ${outputDir}`);

    // 并发下载所有图片
    const downloadedPaths: string[] = [];

    await Promise.all(
      filenames.map(async (filename, index) => {
        try {
          const localPath = await this.downloadImage(baseUrl, taskId, filename, outputDir);
          downloadedPaths[index] = localPath;
          console.log(`✅ 已下载: ${filename}`);
        } catch (error) {
          console.error(`❌ 下载失败: ${filename}`, error);
          downloadedPaths[index] = '';
        }
      })
    );

    // 过滤掉失败的
    const successfulPaths = downloadedPaths.filter((p) => p !== '');

    console.log(`✅ 成功下载 ${successfulPaths.length}/${filenames.length} 张图片`);

    return successfulPaths;
  }
}
