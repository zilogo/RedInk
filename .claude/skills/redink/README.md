# RedInk Claude Code Skill

通过 Claude Code 对话自动生成小红书图文内容的 Skill。

## 功能特性

✅ **自动化流程** - 主题 → 大纲 → 图片 → 保存（无需手动干预）
✅ **实时进度** - SSE 流式显示图片生成进度
✅ **错误处理** - 自动重试网络错误，友好的错误提示
✅ **Docker 集成** - 自动检测 Docker 容器中的 RedInk 服务

## 快速开始

### 前置要求

1. RedInk 服务运行在 Docker 容器中
2. 端口映射：localhost:12398

### 安装

```bash
cd .claude/skills/redink
npm install
npm run build
```

### 使用

```bash
# 基本用法
node dist/index.js "你的主题"

# 示例
node dist/index.js "秋日穿搭指南"
node dist/index.js "咖啡店探店"
node dist/index.js "健身新手入门"
```

### 输出

生成的图片保存在：`output/{task_id}/`

## 工作流程

1. **连接检测** - 自动检测 RedInk 服务可用性
2. **生成大纲** - 调用 AI 生成 6-12 页结构化大纲
3. **显示大纲** - 展示每页标题和类型（封面/内容/总结）
4. **生成图片** - SSE 实时流式生成所有图片
5. **下载保存** - 并发下载所有图片到本地

## 技术架构

```
src/
├── api/
│   ├── types.ts       # TypeScript 类型定义
│   ├── client.ts      # RedInk API 客户端
│   └── sse.ts         # SSE 流式处理器 (核心)
├── utils/
│   ├── config.ts      # 配置管理和连接检测
│   └── file.ts        # 文件下载工具
├── workflows/
│   └── generate.ts    # 自动生成工作流
└── index.ts           # 主入口
```

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
curl http://localhost:12398/api/health
```

### 图片生成失败

可能原因：
1. API 配额不足（检查 GCP 配额）
2. 网络超时（会自动重试 3 次）
3. 模型错误（检查配置文件中的模型名称）

## 性能指标

- 健康检查：< 1 秒
- 大纲生成：5-15 秒
- 单张图片：30-60 秒
- 6 张图片（顺序）：3-6 分钟

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
