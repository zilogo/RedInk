---
name: redink
description: >
  Generate Xiaohongshu (小红书) image-text content with AI. Creates styled images and outlines
  for social media posts. Use when generating 小红书 content, creating social media posts with
  images, or making styled image content. Supports topics like fashion, food, lifestyle, travel.
---

# RedInk Skill

通过 Claude Code 对话自动生成小红书图文内容的 Skill。

## 功能特性

✅ **自动化流程** - 主题 → 大纲 → 图片 → 保存（无需手动干预）
✅ **实时进度** - SSE 流式显示图片生成进度
✅ **错误处理** - 自动重试网络错误，友好的错误提示
✅ **Docker 集成** - 自动检测 Docker 容器中的 RedInk 服务

## 何时使用

当您需要：
- 生成小红书图文内容
- 创建带图片的社交媒体帖子
- 制作风格化的图文素材
- 快速产出主题相关的视觉内容

触发关键词：
- "生成小红书内容"
- "创建小红书帖子"
- "制作图文素材"
- "小红书主题：XXX"

## 使用方法

直接在对话中提出需求，例如：

```
生成小红书内容：秋日穿搭指南
创建一个咖啡店探店的小红书帖子
制作健身新手入门的图文内容
```

## 工作流程

1. **连接检测** - 自动检测 RedInk 服务可用性（Docker localhost:12398）
2. **生成大纲** - 调用 AI 生成 6-12 页结构化大纲
3. **显示大纲** - 展示每页标题和类型（封面/内容/总结）
4. **生成图片** - SSE 实时流式生成所有图片
5. **下载保存** - 并发下载所有图片到本地 `output/{task_id}/`

## 前置要求

1. RedInk 服务运行在 Docker 容器中
2. 端口映射：localhost:12398
3. 已安装依赖：`cd ~/.claude/skills/redink && npm install`

## 输出

生成的图片保存在：`~/.claude/skills/redink/output/{task_id}/`

每个任务包含：
- 封面图（1 张）
- 内容页（4-10 张）
- 总结页（1 张）

## 技术实现

- **Backend**: RedInk Flask API (Docker)
- **Skill**: TypeScript + Node.js
- **核心技术**: SSE 流式处理、并发下载、自动重试

## 示例主题

- 秋日穿搭指南
- 咖啡店探店
- 健身新手入门
- 周末美食推荐
- 旅行目的地攻略

## 故障排查

如果遇到连接问题：

```bash
# 检查 Docker 容器
docker ps | grep redink

# 查看日志
docker logs redink

# 测试连接
curl http://localhost:12398/api/health
```
