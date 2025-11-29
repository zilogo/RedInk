# PPT Skill 使用指南

## 快速开始

### 1. 安装依赖

```bash
cd .claude/skills/ppt
npm install
npm run build
```

### 2. 确保后端服务运行

```bash
# 检查服务
curl http://localhost:12398/api/ppt/health

# 如果服务未运行，启动 RedInk 服务
cd /path/to/RedInk
uv run python -m backend.app
```

### 3. 生成 PPT

```bash
# 基本用法
node dist/index.js "你的 PPT 主题"

# 示例
node dist/index.js "人工智能在教育中的应用"
```

## 高级用法

### 指定页数

```bash
node dist/index.js "产品发布会" --pages 20
```

### 添加内容要点

```bash
node dist/index.js "季度汇报" --content "介绍 Q1 业绩
分析市场趋势
展望 Q2 计划"
```

### 自定义样式

```bash
node dist/index.js "团队培训" --style "商务风格，蓝色主色调，简约大方"
```

### 上传 Logo

```bash
node dist/index.js "公司介绍" --logo /path/to/company-logo.png
```

### Logo 位置和大小

```bash
node dist/index.js "品牌展示" \
  --logo ./logo.png \
  --logo-pos bottom-right \
  --logo-size medium
```

**Logo 位置选项**:
- `bottom-right` - 右下角（默认）
- `bottom-left` - 左下角
- `top-right` - 右上角
- `top-left` - 左上角
- `bottom-center` - 居中底部

**Logo 大小选项**:
- `small` - 小
- `medium` - 中（默认）
- `large` - 大

### 组合使用

```bash
node dist/index.js "AI 技术分享" \
  --pages 15 \
  --content "介绍大模型基础
演示实际应用案例
讨论未来发展趋势" \
  --style "科技风格，渐变蓝紫色，现代感" \
  --logo ./company-logo.png \
  --logo-pos bottom-right \
  --logo-size medium
```

## 输出

生成的 PPT 文件保存在：

```
.claude/skills/ppt/output/{ppt_id}/presentation.pptx
```

文件大小取决于：
- 页数
- 是否包含图片（Logo）
- 图片生成数量

**典型大小**:
- 纯文本 PPT（5 页）：~34 KB
- 带图片 PPT（15 页）：~5-10 MB

## 在 Claude Code 中使用

在 Claude Code 对话中，直接使用自然语言即可：

```
生成 PPT：人工智能在教育中的应用
```

```
创建一个产品发布会的演示文稿，20 页，商务风格
```

```
制作团队培训 PPT，主题是敏捷开发，上传我们的 Logo
```

Claude Code 会自动调用这个 skill 并生成 PPT。

## 工作流程

1. **连接检测** - 检查 RedInk 服务可用性
2. **生成大纲** - 调用 AI 生成结构化大纲
3. **解析样式** - 根据描述生成样式配置
4. **显示预览** - 展示大纲和样式
5. **生成 PPT** - SSE 实时流式生成
6. **下载文件** - 自动下载到本地

## 常见问题

### Q: 无法连接到服务

**A**: 检查 RedInk 服务是否运行：

```bash
# 检查服务
curl http://localhost:12398/api/ppt/health

# 启动服务
cd /path/to/RedInk
uv run python -m backend.app
```

### Q: Logo 上传失败

**A**: 确保：
- Logo 文件存在
- 格式为 PNG、JPG 或 WEBP
- 文件大小 < 5MB
- 路径正确（绝对路径或相对于执行目录）

### Q: PPT 生成很慢

**A**: 正常情况：
- 纯文本 PPT：< 30 秒
- 带图片 PPT：6-10 分钟（15 页）

如果上传了 Logo，系统会调用多模态 AI 生成图片，耗时较长。

### Q: 图片生成失败

**A**: 系统会自动降级为纯文本 PPT，不影响文件生成。可能原因：
- API 配额不足
- 网络超时
- 多模态 API 错误

## 开发

### 开发模式

```bash
npm run dev  # 自动编译 TypeScript
```

### 测试

```bash
npm test  # 运行测试用例
```

### 修改代码

修改 `src/` 目录下的 TypeScript 文件后，运行：

```bash
npm run build
```

## 技术架构

```
.claude/skills/ppt/
├── src/
│   ├── api/          # API 客户端
│   │   ├── types.ts  # 类型定义
│   │   ├── client.ts # HTTP 客户端
│   │   └── sse.ts    # SSE 处理器
│   ├── utils/        # 工具类
│   │   ├── config.ts # 配置管理
│   │   └── file.ts   # 文件处理
│   ├── workflows/    # 工作流
│   │   └── generate.ts
│   └── index.ts      # 主入口
├── dist/             # 编译输出
├── output/           # PPT 文件输出
├── package.json
├── tsconfig.json
├── SKILL.md          # Skill 定义
└── README.md         # 文档
```

## License

MIT
