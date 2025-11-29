---
name: ppt
description: >
  Generate professional PowerPoint presentations with AI. Creates PPT outlines, applies styles,
  and generates images with multimodal AI. Use when generating PPT presentations, creating slides,
  or making business/educational presentations. Supports Logo customization and style configuration.
---

# PPT Generation Skill

通过 Claude Code 对话自动生成专业 PPT 演示文稿的 Skill。

## 功能特性

✅ **自动化流程** - 主题 → 大纲 → 样式 → PPT（含图片）→ 下载
✅ **实时进度** - SSE 流式显示 PPT 生成进度
✅ **Logo 支持** - 上传品牌 Logo，AI 自然融入设计
✅ **样式定制** - 自定义配色、字体、Logo 位置和大小
✅ **多模态 AI** - Gemini 生成精美的 PPT 图片
✅ **混合生成** - 封面用完整设计，内容页用背景+文字
✅ **错误处理** - 自动降级为纯文本 PPT

## 何时使用

当您需要：
- 生成 PPT 演示文稿
- 创建业务汇报、教学课件
- 制作产品介绍、培训材料
- 快速产出专业级幻灯片

触发关键词：
- "生成 PPT"
- "创建演示文稿"
- "制作 PPT：XXX"
- "做一个关于 XXX 的 PPT"

## 使用方法

直接在对话中提出需求，例如：

```
生成 PPT：人工智能在教育中的应用
创建一个产品介绍的演示文稿
制作团队培训的 PPT，主题是敏捷开发
```

可选参数：
- **页数**：`15 页 PPT` (默认 15 页)
- **样式**：`商务风格，蓝色主色调`
- **Logo**：上传图片文件路径

## 工作流程

1. **连接检测** - 自动检测 RedInk 服务可用性（localhost:12398）
2. **生成大纲** - 调用 AI 生成 PPT 结构化大纲
3. **解析样式** - 根据描述或主题自动生成样式配置
4. **显示配置** - 展示大纲和样式（封面/内容/总结，配色方案）
5. **生成 PPT** - SSE 实时流式生成带图片的 PPT
6. **下载文件** - 自动下载 .pptx 文件到本地

## 前置要求

1. RedInk 服务运行在本地或 Docker 容器
2. 端口映射：localhost:12398
3. 已安装依赖：`cd ~/.claude/skills/ppt && npm install`

## 输出

生成的 PPT 文件保存在：`~/.claude/skills/ppt/output/{ppt_id}/presentation.pptx`

每个 PPT 包含：
- 封面页（1 张，完整设计图片）
- 内容页（N 张，背景图片+文字）
- 章节页（可选，完整设计图片）
- 感谢页（可选，完整设计图片）

## Logo 定制

支持上传 Logo 并指定：
- **位置**：右下角、左下角、右上角、左上角、居中底部
- **大小**：小、中、大

Logo 会作为参考图片传给多模态 AI，确保品牌一致性。

## 技术实现

- **Backend**: RedInk Flask API (PPT 模块)
- **Skill**: TypeScript + Node.js
- **核心技术**: SSE 流式处理、python-pptx、多模态图片生成

## 示例主题

- 人工智能在教育中的应用
- 产品发布会演示
- 季度业务汇报
- 新员工培训课件
- 项目方案展示

## 故障排查

如果遇到连接问题：

```bash
# 检查 Docker 容器
docker ps | grep redink

# 查看日志
docker logs redink

# 测试连接
curl http://localhost:12398/api/ppt/health
```

如果图片生成失败，会自动降级为纯文本 PPT。
