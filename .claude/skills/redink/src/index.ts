/**
 * RedInk Skill 主入口
 *
 * 用法示例：
 *   node dist/index.js "秋日穿搭"
 */

import { GenerateWorkflow } from './workflows/generate';

async function main() {
  // 从命令行参数获取主题
  const topic = process.argv[2];

  if (!topic) {
    console.error('❌ 请提供主题！');
    console.error('\n用法: node dist/index.js "你的主题"');
    console.error('示例: node dist/index.js "秋日穿搭指南"');
    process.exit(1);
  }

  try {
    const workflow = new GenerateWorkflow();
    await workflow.autoGenerateContent(topic);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

// 运行
main();
