# PPT Generation Claude Code Skill

通过 Claude Code 对话自动生成专业 PPT 演示文稿的 Skill。

## 功能特性

✅ **自动化流程** - 主题 → 大纲 → 样式 → PPT（含图片）→ 下载
✅ **实时进度** - SSE 流式显示 PPT 生成进度
✅ **Logo 支持** - 上传品牌 Logo，AI 自然融入设计
✅ **样式定制** - 自定义配色、字体、Logo 位置和大小
✅ **多模态 AI** - Gemini 生成精美的 PPT 图片
✅ **混合生成** - 封面用完整设计，内容页用背景+文字

## 快速开始

### 前置要求

1. RedInk 服务运行在本地或 Docker 容器
2. 端口映射：localhost:12398

### 安装

```bash
cd .claude/skills/ppt
npm install
npm run build
```

### 使用

```bash
# 基本用法
node dist/index.js "你的主题"

# 指定页数
node dist/index.js "你的主题" --pages 20

# 指定样式
node dist/index.js "你的主题" --style "商务风格，蓝色主色调"

# 上传 Logo
node dist/index.js "你的主题" --logo /path/to/logo.png

# 完整示例
node dist/index.js "人工智能在教育中的应用" --pages 15 --style "科技风格，渐变蓝紫色" --logo ./company-logo.png
```

### 输出

生成的 PPT 文件保存在：`output/{ppt_id}/presentation.pptx`

## 工作流程

1. **连接检测** - 自动检测 RedInk 服务可用性
2. **生成大纲** - 调用 AI 生成 PPT 结构化大纲（15 页）
3. **解析样式** - 根据描述或主题自动生成样式配置
4. **显示配置** - 展示大纲和样式（封面/内容/章节，配色方案）
5. **生成 PPT** - SSE 实时流式生成带图片的 PPT
6. **下载文件** - 自动下载 .pptx 文件到本地

## 技术架构

```
src/
├── api/
│   ├── types.ts       # TypeScript 类型定义
│   ├── client.ts      # PPT API 客户端
│   └── sse.ts         # SSE 流式处理器 (核心)
├── utils/
│   ├── config.ts      # 配置管理和连接检测
│   └── file.ts        # 文件下载和 Logo 处理
├── workflows/
│   └── generate.ts    # 自动生成工作流
└── index.ts           # 主入口
```

## PPT 页面类型

- **cover** - 封面页（完整图片设计）
- **toc** - 目录页（背景图片+文字）
- **section** - 章节页（完整图片设计）
- **content** - 内容页（背景图片+文字）
- **summary** - 总结页（背景图片+文字）
- **thankyou** - 感谢页（完整图片设计）

## Logo 定制

支持的位置：
- `bottom-right` - 右下角（默认）
- `bottom-left` - 左下角
- `top-right` - 右上角
- `top-left` - 左上角
- `bottom-center` - 居中底部

支持的大小：
- `small` - 小
- `medium` - 中（默认）
- `large` - 大

## 故障排查

### 无法连接到服务

```bash
# 检查容器运行
docker ps | grep redink

# 查看日志
docker logs redink

# 重启服务
docker-compose restart

# 测试连接
curl http://localhost:12398/api/ppt/health
```

### PPT 生成失败

可能原因：
1. API 配额不足（检查多模态 API 配额）
2. 网络超时（会自动重试）
3. Logo 格式不支持（仅支持 PNG、JPG、WEBP）
4. 图片生成失败（会自动降级为纯文本 PPT）

### 图片生成失败

如果图片生成失败，系统会自动降级为纯文本 PPT：
- 不影响 PPT 文件生成
- 保留所有文字内容和布局
- 仅缺失视觉图片元素

## 性能指标

- 健康检查：< 1 秒
- 大纲生成：5-15 秒
- 样式解析：5-10 秒
- 单张图片：20-40 秒
- 15 页 PPT（带图）：6-10 分钟
- 15 页 PPT（纯文本）：< 30 秒

## 开发

```bash
# 开发模式（自动编译）
npm run dev

# 编译
npm run build

# 测试
npm test
```

## License

MIT
