/**
 * PPT Skill 主入口
 *
 * 用法示例：
 *   node dist/index.js "人工智能在教育中的应用"
 *   node dist/index.js "产品发布会" --pages 20
 *   node dist/index.js "季度汇报" --style "商务风格，蓝色主色调"
 *   node dist/index.js "团队培训" --logo ./logo.png
 */

import { GenerateWorkflow, GenerateOptions } from './workflows/generate';

async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('❌ 请提供 PPT 主题！');
    console.error('\n用法: node dist/index.js "你的主题" [选项]');
    console.error('\n示例:');
    console.error('  node dist/index.js "人工智能在教育中的应用"');
    console.error('  node dist/index.js "产品发布会" --pages 20');
    console.error('  node dist/index.js "季度汇报" --style "商务风格，蓝色主色调"');
    console.error('  node dist/index.js "团队培训" --logo ./logo.png');
    console.error('\n选项:');
    console.error('  --pages <数量>      PPT 页数 (默认: 15)');
    console.error('  --content <内容>    内容要点');
    console.error('  --style <描述>      样式描述');
    console.error('  --logo <路径>       Logo 图片路径');
    console.error('  --logo-pos <位置>   Logo 位置 (bottom-right, bottom-left, top-right, top-left, bottom-center)');
    console.error('  --logo-size <大小>  Logo 大小 (small, medium, large)');
    process.exit(1);
  }

  const topic = args[0];

  // 解析选项
  const options: GenerateOptions = {
    topic,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--pages':
        options.pageCount = parseInt(args[++i], 10);
        break;
      case '--content':
        options.userContent = args[++i];
        break;
      case '--style':
        options.styleDescription = args[++i];
        break;
      case '--logo':
        options.logoPath = args[++i];
        break;
      case '--logo-pos':
        options.logoPosition = args[++i];
        break;
      case '--logo-size':
        options.logoSize = args[++i];
        break;
      default:
        console.warn(`⚠️ 未知选项: ${arg}`);
    }
  }

  try {
    const workflow = new GenerateWorkflow();
    await workflow.autoGeneratePpt(options);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

// 运行
main();
