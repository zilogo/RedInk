# RedInk - 小红书AI图文生成器 架构详细分析

## 📋 项目概述

**RedInk** 是一个基于AI的小红书图文内容生成器,通过用户输入的一句话主题,自动生成完整的多页图文内容。项目采用前后端分离架构,支持Docker部署,目前已发布到Docker Hub。

- **GitHub**: HisMax/RedInk
- **开源协议**: CC BY-NC-SA 4.0 (个人使用免费,商业使用需授权)
- **当前版本**: v1.3.0
- **Docker镜像**: histonemax/redink:latest

---

## 🏗️ 整体架构设计

### 技术栈总览

```
┌─────────────────────────────────────────┐
│           前端层 (Frontend)              │
│  Vue 3 + TypeScript + Vite + Pinia      │
└──────────────┬──────────────────────────┘
               │ HTTP/SSE
┌──────────────▼──────────────────────────┐
│           后端层 (Backend)               │
│        Flask + Python 3.11+             │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌─────────┐        ┌──────────┐
│ AI文案   │        │ AI图片    │
│ 生成服务 │        │ 生成服务  │
│ Gemini  │        │ Gemini-3 │
└─────────┘        └──────────┘
```

### 核心架构特点

1. **前后端分离**: Vue 3 SPA + Flask REST API
2. **流式传输**: 使用 SSE (Server-Sent Events) 实时推送图片生成进度
3. **多AI模型支持**: 可插拔的生成器架构,支持多种AI服务提供商
4. **Docker容器化**: 支持单容器部署,前端构建产物集成在Flask中
5. **配置驱动**: YAML配置文件 + Web界面配置管理

---

## 📂 项目结构详解

```
RedInk/
├── backend/                    # 后端核心代码
│   ├── app.py                 # Flask应用入口
│   ├── config.py              # 配置管理类
│   ├── routes/                # API路由层
│   │   └── api.py            # RESTful API端点
│   ├── services/              # 业务逻辑层
│   │   ├── outline.py        # 大纲生成服务
│   │   ├── image.py          # 图片生成服务
│   │   └── history.py        # 历史记录服务
│   ├── generators/            # AI生成器抽象层
│   │   ├── base.py           # 生成器基类
│   │   ├── factory.py        # 工厂模式
│   │   ├── google_genai.py   # Google Gemini生成器
│   │   ├── openai_compatible.py  # OpenAI兼容生成器
│   │   └── image_api.py      # 图片API生成器
│   ├── utils/                 # 工具类
│   │   ├── text_client.py    # 文本生成客户端
│   │   ├── genai_client.py   # Google GenAI客户端
│   │   └── image_compressor.py  # 图片压缩工具
│   └── prompts/               # Prompt模板
│       ├── outline_prompt.txt # 大纲生成提示词
│       └── image_prompt.txt   # 图片生成提示词
├── frontend/                   # 前端代码
│   ├── src/
│   │   ├── views/            # 页面视图
│   │   │   ├── HomeView.vue  # 首页(主题输入)
│   │   │   ├── OutlineView.vue  # 大纲编辑页
│   │   │   ├── GenerateView.vue # 图片生成页
│   │   │   ├── ResultView.vue   # 结果展示页
│   │   │   ├── HistoryView.vue  # 历史记录页
│   │   │   └── SettingsView.vue # 设置页
│   │   ├── stores/           # Pinia状态管理
│   │   │   └── generator.ts  # 生成器状态
│   │   ├── api/              # API请求层
│   │   │   └── index.ts      # API封装
│   │   └── router/           # Vue Router
│   │       └── index.ts      # 路由配置
│   └── package.json
├── history/                   # 生成的图片存储目录
│   └── task_xxxxx/           # 每个任务一个文件夹
│       ├── 0.png             # 原图
│       ├── thumb_0.png       # 缩略图
│       └── ...
├── text_providers.yaml        # 文本生成服务配置
├── image_providers.yaml       # 图片生成服务配置
├── docker-compose.yml         # Docker编排文件
├── Dockerfile                 # Docker镜像构建文件
├── pyproject.toml            # Python项目配置
└── README.md
```

---

## 🔧 核心模块详解

### 1. 后端架构 (Flask)

#### 1.1 应用入口 (backend/app.py)

**职责**: Flask应用初始化、日志配置、静态文件托管

**关键特性**:
- **智能模式切换**: 检测 `frontend/dist` 是否存在
  - 存在: Docker生产模式,托管前端静态文件
  - 不存在: 开发模式,返回API信息
- **日志系统**: 结构化日志输出,支持DEBUG级别
- **配置验证**: 启动时检查YAML配置文件完整性

```python
# 启动时配置验证示例 (app.py:98-149)
if text_config_path.exists():
    active = text_config.get('active_provider')
    logger.info(f"文本生成配置: 激活={active}")
```

#### 1.2 配置管理 (backend/config.py)

**设计模式**: 单例模式 + 懒加载

**核心类**: `Config`

**配置加载流程**:
```python
load_text_providers_config()
    ↓
读取 text_providers.yaml
    ↓
缓存到 _text_providers_config
    ↓
get_active_text_provider()
```

**配置结构**:
```yaml
active_provider: gemini
providers:
  gemini:
    type: google_gemini
    api_key: AIza...
    model: gemini-2.0-flash
    temperature: 1.0
    max_output_tokens: 8000
```

**安全特性**:
- API Key 脱敏显示 (前4位+后4位,中间用*遮盖)
- 配置更新后自动清除缓存 (`reload_config()`)

#### 1.3 路由层 (backend/routes/api.py)

**API端点总览**:

| 端点 | 方法 | 功能 | 响应类型 |
|------|------|------|----------|
| `/api/outline` | POST | 生成大纲 | JSON |
| `/api/generate` | POST | 生成图片 | SSE流 |
| `/api/regenerate` | POST | 重新生成单图 | JSON |
| `/api/retry` | POST | 重试失败图片 | JSON |
| `/api/retry-failed` | POST | 批量重试 | SSE流 |
| `/api/images/<task>/<file>` | GET | 获取图片 | 图片文件 |
| `/api/history` | GET/POST | 历史记录CRUD | JSON |
| `/api/config` | GET/POST | 配置管理 | JSON |
| `/api/health` | GET | 健康检查 | JSON |

**SSE流式传输示例** (backend/routes/api.py:140-161):
```python
def generate():
    for event in image_service.generate_images(...):
        yield f"event: {event['event']}\n"
        yield f"data: {json.dumps(event['data'])}\n\n"

return Response(generate(), mimetype='text/event-stream')
```

**错误处理**:
- 统一错误格式: `{"success": false, "error": "详细错误信息"}`
- 分层错误提示: 错误类型 + 可能原因 + 解决方案

#### 1.4 服务层 (backend/services/)

##### 1.4.1 大纲生成服务 (outline.py)

**流程**:
```
用户输入主题 + 参考图片(可选)
    ↓
加载 Prompt 模板
    ↓
调用 Text Client (Gemini/OpenAI)
    ↓
解析返回的文本 (按 <page> 分割)
    ↓
返回结构化页面列表
```

**Prompt模板变量**:
- `{topic}`: 用户输入的主题
- 自动添加图片数量提示

**页面类型识别** (outline.py:98-130):
```python
"[封面]" → type: "cover"
"[内容]" → type: "content"
"[总结]" → type: "summary"
```

##### 1.4.2 图片生成服务 (image.py)

**核心特性**:

1. **两阶段生成策略**:
   - 阶段1: 先生成封面 (用于后续参考)
   - 阶段2: 并发/顺序生成其他页面

2. **并发控制** (image.py:19-21):
   ```python
   MAX_CONCURRENT = 15  # 最大并发数
   AUTO_RETRY_COUNT = 3  # 自动重试次数
   high_concurrency = config.get('high_concurrency', False)
   ```

3. **自动重试机制** (image.py:139-208):
   ```python
   for attempt in range(max_retries):
       try:
           # 生成图片
           ...
       except Exception as e:
           if attempt < max_retries - 1:
               wait_time = 2 ** attempt  # 指数退避
               time.sleep(wait_time)
               continue
   ```

4. **图片压缩优化** (image.py:76-106):
   - 原图保存: `0.png`
   - 缩略图生成: `thumb_0.png` (压缩到50KB)
   - 封面参考图压缩到200KB (减少内存占用)

5. **任务状态管理** (image.py:252-261):
   ```python
   _task_states[task_id] = {
       "pages": pages,
       "generated": {},
       "failed": {},
       "cover_image": cover_image_data,  # 压缩后的封面
       "full_outline": full_outline,     # 完整大纲上下文
       "user_images": user_images,       # 用户上传的参考图
       "user_topic": user_topic          # 用户原始输入
   }
   ```

**SSE事件类型**:
```python
"progress"  → 生成中 (发送index, status: generating)
"complete"  → 单图完成 (发送image_url)
"error"     → 单图失败 (发送error message)
"finish"    → 全部完成 (发送task_id, 汇总统计)
```

##### 1.4.3 历史记录服务 (history.py)

**存储方式**: JSON文件 + 文件系统图片

```
history/
├── history_data.json   # 元数据索引
└── task_xxxxx/        # 图片文件夹
    ├── 0.png
    └── thumb_0.png
```

**功能**:
- CRUD操作
- 分页查询
- 关键词搜索
- 统计信息
- 图片扫描同步

#### 1.5 生成器抽象层 (backend/generators/)

**设计模式**: 策略模式 + 工厂模式

##### 工厂类 (factory.py)
```python
class ImageGeneratorFactory:
    GENERATORS = {
        'google_genai': GoogleGenAIGenerator,
        'openai_compatible': OpenAICompatibleGenerator,
        'image_api': ImageApiGenerator,
    }

    @classmethod
    def create(cls, provider, config):
        generator_class = cls.GENERATORS[provider]
        return generator_class(config)
```

##### 基类接口 (base.py)
```python
class ImageGeneratorBase(ABC):
    @abstractmethod
    def generate_image(self, prompt: str, **kwargs) -> bytes:
        pass
```

##### 实现类示例 (google_genai.py)
```python
class GoogleGenAIGenerator(ImageGeneratorBase):
    def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "3:4",
        reference_image: bytes = None,
        **kwargs
    ) -> bytes:
        # 调用 Google GenAI API
        # 返回图片二进制数据
```

**扩展性**: 支持自定义生成器注册
```python
ImageGeneratorFactory.register_generator('custom', CustomGenerator)
```

---

### 2. 前端架构 (Vue 3)

#### 2.1 路由设计 (frontend/src/router/index.ts)

**流程式导航**:
```
HomeView (/)
    ↓ 输入主题
OutlineView (/outline)
    ↓ 编辑大纲
GenerateView (/generate)
    ↓ 生成图片
ResultView (/result)
```

**独立页面**:
- `/history` - 历史记录
- `/settings` - 系统设置

#### 2.2 状态管理 (Pinia)

**Store**: `useGeneratorStore` (frontend/src/stores/generator.ts)

**状态结构**:
```typescript
interface GeneratorState {
  stage: 'input' | 'outline' | 'generating' | 'result'
  topic: string
  outline: {
    raw: string
    pages: Page[]
  }
  progress: {
    current: number
    total: number
    status: 'idle' | 'generating' | 'done' | 'error'
  }
  images: GeneratedImage[]
  taskId: string | null
  recordId: string | null
  userImages: File[]  // 用户上传的参考图片
}
```

**关键Actions**:
- `setOutline()` - 设置大纲
- `updatePage()` - 更新单页内容
- `syncRawFromPages()` - 同步raw文本
- `startGeneration()` - 开始生成
- `updateProgress()` - 更新进度
- `updateImage()` - 更新图片URL (重新生成时刷新)
- `getFailedImages()` - 获取失败列表

**持久化**: 使用 `localStorage` 自动保存状态 (stores/generator.ts:277-305)
```typescript
watch(() => store.stage, () => {
  store.saveToStorage()
}, { deep: true })
```

#### 2.3 API层 (frontend/src/api/index.ts)

**核心功能**:
1. **Axios封装**: 统一的HTTP请求
2. **SSE流处理**: 手动解析Server-Sent Events
3. **图片URL生成**: 支持缩略图/原图切换

**SSE处理示例** (api/index.ts:383-448):
```typescript
async function generateImagesPost(...) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ pages, task_id, full_outline, ... })
  })

  const reader = response.body.getReader()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value)
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

      const [eventLine, dataLine] = line.split('\n')
      const eventType = eventLine.replace('event: ', '')
      const data = JSON.parse(dataLine.replace('data: ', ''))

      // 触发回调
      switch (eventType) {
        case 'progress': onProgress(data); break
        case 'complete': onComplete(data); break
        case 'error': onError(data); break
        case 'finish': onFinish(data); break
      }
    }
  }
}
```

#### 2.4 视图组件

##### HomeView.vue - 主题输入页
- 文本输入框 (主题描述)
- 图片上传 (可选参考图,支持多张)
- 调用 `generateOutline()` API

##### OutlineView.vue - 大纲编辑页
- 展示解析后的页面列表
- 支持编辑每页描述
- 页面排序、删除、新增
- 确认后进入生成页

##### GenerateView.vue - 图片生成页
- SSE实时进度展示
- 进度条 + 页面状态
- 生成完成自动跳转结果页

##### ResultView.vue - 结果展示页
- 图片网格展示 (缩略图)
- 单图重新生成按钮
- 批量重试失败图片
- 下载所有图片 (ZIP)
- 保存到历史记录

##### HistoryView.vue - 历史记录页
- 分页列表
- 搜索功能
- 查看/删除记录
- 重新生成功能

##### SettingsView.vue - 设置页
- 文本生成服务配置
  - 选择服务商 (Gemini/OpenAI兼容)
  - API Key管理 (脱敏显示)
  - 模型参数配置
- 图片生成服务配置
  - 选择服务商
  - 高并发模式开关
  - 模型参数配置

---

## 🔄 核心业务流程

### 完整生成流程

```
用户输入主题
    ↓
POST /api/outline
    ↓
OutlineService.generate_outline()
    ↓
调用文本生成AI (Gemini/OpenAI)
    ↓
返回结构化大纲 (JSON)
    ↓
用户编辑确认大纲
    ↓
POST /api/generate (SSE)
    ↓
ImageService.generate_images()
    ↓
【阶段1】生成封面
    - 调用图片生成AI
    - 保存原图 + 缩略图
    - 压缩封面为参考图(200KB)
    - 发送 SSE: complete
    ↓
【阶段2】生成其他页面
    - 高并发模式: ThreadPoolExecutor(15线程)
    - 顺序模式: 逐个生成
    - 每个页面使用封面作为参考
    - 自动重试3次(指数退避)
    - 发送 SSE: progress/complete/error
    ↓
全部完成
    ↓
发送 SSE: finish
    ↓
前端展示结果页
```

### 图片生成两阶段策略

**阶段1: 封面生成** (backend/services/image.py:263-333)
```python
# 1. 找到封面页(type=cover)或使用第一页
cover_page = [p for p in pages if p["type"] == "cover"][0]

# 2. 生成封面(使用用户上传的图片作为参考)
index, success, filename, error = self._generate_single_image(
    cover_page,
    task_id,
    reference_image=None,
    user_images=compressed_user_images  # 用户参考图
)

# 3. 读取并压缩封面图(200KB)作为后续参考
cover_image_data = compress_image(cover_data, max_size_kb=200)
self._task_states[task_id]["cover_image"] = cover_image_data
```

**阶段2: 内容页生成** (backend/services/image.py:336-496)
```python
# 高并发模式
if high_concurrency:
    with ThreadPoolExecutor(max_workers=15) as executor:
        future_to_page = {
            executor.submit(
                self._generate_single_image,
                page,
                task_id,
                cover_image_data,  # 使用封面作为参考
                0,
                full_outline,
                compressed_user_images,
                user_topic
            ): page
            for page in other_pages
        }

        for future in as_completed(future_to_page):
            # 收集结果并发送SSE事件
            ...
```

---

## 🐳 Docker部署架构

### Dockerfile 多阶段构建

**阶段1: 前端构建** (Dockerfile:5-23)
```dockerfile
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
RUN npm install -g pnpm
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build
```

**阶段2: 最终镜像** (Dockerfile:25-70)
```dockerfile
FROM python:3.11-slim
WORKDIR /app

# 安装Python依赖
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev

# 复制后端代码
COPY backend/ ./backend/

# 复制空白配置模板(不包含API Key)
COPY docker/text_providers.yaml ./
COPY docker/image_providers.yaml ./

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 12398
CMD ["uv", "run", "python", "-m", "backend.app"]
```

### 安全特性

1. **API Key保护**:
   - Docker镜像不包含任何API Key
   - 空白配置模板仅作占位
   - 用户在Web界面配置真实Key

2. **数据持久化**:
   ```bash
   docker run -v ./output:/app/output histonemax/redink:latest
   ```

3. **自定义配置挂载** (可选):
   ```bash
   docker run -v ./text_providers.yaml:/app/text_providers.yaml ...
   ```

### 健康检查
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s \
    CMD python -c "import urllib.request; \
        urllib.request.urlopen('http://localhost:12398/api/health')"
```

---

## ⚡ 性能优化设计

### 1. 图片压缩策略 (backend/utils/image_compressor.py)

**三层压缩**:
1. **缩略图** (50KB) - 列表展示
2. **参考图** (200KB) - AI生成参考
3. **原图** (不压缩) - 下载使用

**算法**:
```python
def compress_image(image_data: bytes, max_size_kb: int = 50) -> bytes:
    img = Image.open(BytesIO(image_data))

    # 降低分辨率
    max_dimension = 800
    img.thumbnail((max_dimension, max_dimension))

    # 二分查找最优质量值
    low, high = 10, 95
    while low < high:
        mid = (low + high + 1) // 2
        output = BytesIO()
        img.save(output, format='PNG', optimize=True, quality=mid)
        if len(output.getvalue()) <= max_size_kb * 1024:
            low = mid
        else:
            high = mid - 1

    return output.getvalue()
```

### 2. 并发控制

**配置项**: `high_concurrency: false`

| 模式 | 行为 | 适用场景 |
|------|------|----------|
| 关闭(默认) | 顺序生成 | GCP 300$ 试用账号 |
| 开启 | 最多15张并发 | 付费API,高速率限制 |

**实现** (backend/services/image.py:353-415):
```python
if high_concurrency:
    with ThreadPoolExecutor(max_workers=15) as executor:
        # 并发生成
        ...
else:
    for page in other_pages:
        # 顺序生成
        ...
```

### 3. SSE流式传输

**优势**:
- 实时进度推送
- 减少客户端轮询
- 节省服务器资源

**前端处理**:
```typescript
// 手动解析SSE流
const reader = response.body.getReader()
while (true) {
  const { done, value } = await reader.read()
  // 解析 event: xxx\ndata: {...}\n\n 格式
  ...
}
```

### 4. 缓存策略

**配置缓存** (backend/config.py:19-49):
```python
_image_providers_config = None  # 类变量缓存

@classmethod
def load_image_providers_config(cls):
    if cls._image_providers_config is not None:
        return cls._image_providers_config  # 直接返回缓存
    # 首次加载...
```

**服务单例** (backend/services/image.py:744-757):
```python
_service_instance = None

def get_image_service():
    global _service_instance
    if _service_instance is None:
        _service_instance = ImageService()
    return _service_instance

def reset_image_service():  # 配置更新后重置
    global _service_instance
    _service_instance = None
```

### 5. 任务状态管理

**内存存储** (backend/services/image.py:252-261):
```python
self._task_states[task_id] = {
    "cover_image": cover_image_data,  # 压缩到200KB
    "full_outline": full_outline,
    "user_images": compressed_user_images,  # 压缩到200KB
    # 避免存储大量原图数据
}
```

**清理机制**:
```python
def cleanup_task(self, task_id: str):
    if task_id in self._task_states:
        del self._task_states[task_id]
```

---

## 🔒 安全设计

### 1. API Key保护

**脱敏显示** (backend/routes/api.py:695-717):
```python
def _mask_api_key(key: str) -> str:
    if len(key) <= 8:
        return '*' * len(key)
    return key[:4] + '*' * (len(key) - 8) + key[-4:]

# 返回给前端
provider_copy['api_key_masked'] = _mask_api_key(api_key)
provider_copy['api_key'] = ''  # 不返回实际值
```

**更新时保留原值** (backend/routes/api.py:795-809):
```python
for name, new_config in new_providers.items():
    # 如果前端传来空字符串,保留后端原有API Key
    if new_config.get('api_key') in ['', None]:
        if name in existing_providers:
            new_config['api_key'] = existing_providers[name]['api_key']
```

### 2. 输入验证

**示例** (backend/routes/api.py:73-78):
```python
if not topic:
    return jsonify({
        "success": False,
        "error": "参数错误：topic 不能为空。\n请提供要生成图文的主题内容。"
    }), 400
```

### 3. CORS配置

**开发模式允许本地端口** (backend/config.py:12):
```python
CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']
```

**生产模式**: 前后端同域,无需CORS

### 4. 错误信息分级

**用户友好错误提示** (backend/routes/api.py:95-99):
```python
return jsonify({
    "success": False,
    "error": f"大纲生成异常。\n错误详情: {error_msg}\n建议：检查后端日志获取更多信息"
}), 500
```

**详细日志记录** (backend/routes/api.py:32-37):
```python
def _log_error(endpoint: str, error: Exception):
    logger.error(f"❌ 请求失败: {endpoint}")
    logger.error(f"  错误类型: {type(error).__name__}")
    logger.error(f"  错误信息: {str(error)}")
    logger.debug(f"  堆栈跟踪:\n{traceback.format_exc()}")
```

---

## 🎯 扩展性设计

### 1. 生成器可插拔

**添加新生成器步骤**:

1. 创建类 `backend/generators/custom.py`:
```python
from .base import ImageGeneratorBase

class CustomGenerator(ImageGeneratorBase):
    def generate_image(self, prompt: str, **kwargs) -> bytes:
        # 实现自定义逻辑
        ...
```

2. 注册到工厂:
```python
from .custom import CustomGenerator
ImageGeneratorFactory.GENERATORS['custom'] = CustomGenerator
```

3. 添加配置:
```yaml
# image_providers.yaml
providers:
  custom:
    type: custom
    api_key: xxx
    ...
```

### 2. Prompt模板化

**文件位置**: `backend/prompts/`
- `outline_prompt.txt` - 大纲生成
- `image_prompt.txt` - 图片生成

**变量替换**:
```python
prompt = template.format(
    topic=topic,
    page_content=page_content,
    full_outline=full_outline,
    ...
)
```

### 3. 配置驱动

**YAML配置 + Web界面双向同步**:
- 修改YAML文件 → 重启后生效
- Web界面修改 → 实时生效 (无需重启)

**配置更新流程**:
```
用户在SettingsView修改
    ↓
POST /api/config
    ↓
写入YAML文件
    ↓
Config.reload_config()  # 清除缓存
    ↓
reset_image_service()   # 重置服务单例
```

---

## 📊 监控与日志

### 日志系统 (backend/app.py:10-35)

**日志级别**:
```python
logging.getLogger('backend').setLevel(logging.DEBUG)
logging.getLogger('werkzeug').setLevel(logging.INFO)
logging.getLogger('urllib3').setLevel(logging.WARNING)
```

**格式化输出**:
```
23:45:12 | INFO     | backend.services.image
  └─ 开始图片生成任务: task_id=task_a1b2c3, pages=9
```

**关键日志点**:
- API请求/响应 (routes/api.py:19-37)
- 配置加载 (config.py:37)
- 图片生成进度 (services/image.py:190, 205)
- 错误堆栈 (routes/api.py:36)

### 健康检查

**端点**: `GET /api/health`
```json
{
  "success": true,
  "message": "服务正常运行"
}
```

**Docker健康检查**:
```bash
docker inspect --format='{{.State.Health.Status}}' redink
# 输出: healthy
```

---

## 🚀 部署方案

### 1. Docker一键部署 (推荐)

```bash
docker run -d \
  -p 12398:12398 \
  -v ./output:/app/output \
  histonemax/redink:latest
```

**访问**: http://localhost:12398

### 2. Docker Compose

```yaml
services:
  redink:
    image: histonemax/redink:latest
    ports:
      - "12398:12398"
    volumes:
      - ./output:/app/output
    restart: unless-stopped
```

### 3. 本地开发部署

**后端**:
```bash
cd RedInk
uv sync
uv run python -m backend.app
# 访问: http://localhost:12398
```

**前端**:
```bash
cd frontend
pnpm install
pnpm dev
# 访问: http://localhost:5173
```

---

## 🔮 架构亮点总结

### 1. **技术创新**
- SSE流式传输实现实时进度推送
- 两阶段图片生成策略 (封面优先)
- 三层图片压缩优化 (原图/参考图/缩略图)

### 2. **工程化**
- 前后端分离 + Docker单容器部署
- 工厂模式实现生成器可插拔
- 配置驱动 + Web可视化管理

### 3. **性能优化**
- 并发控制 (支持1-15张并发)
- 图片压缩 (节省传输和存储)
- 配置缓存 + 服务单例

### 4. **用户体验**
- 流式进度展示 (实时反馈)
- 失败自动重试 (指数退避)
- 单图重新生成 (灵活调整)
- 历史记录管理 (便捷复用)

### 5. **安全性**
- API Key脱敏显示
- Docker镜像无密钥
- 错误信息分级
- 配置更新即时生效

### 6. **可维护性**
- 清晰的目录结构
- 统一的错误处理
- 详细的日志记录
- Prompt模板化

---

## 📝 未来规划 (Roadmap)

根据README提及的未来计划:

1. **格式扩展**
   - 支持PPT生成
   - 支持PDF导出
   - 支持长图合成

2. **历史记录优化**
   - 标签分类
   - 批量操作
   - 云端同步

3. **多模态支持**
   - 视频生成
   - 音频配音
   - 动画效果

---

## 🎓 技术要点

### 关键设计模式

1. **工厂模式**: `ImageGeneratorFactory` 管理多种生成器
2. **策略模式**: `ImageGeneratorBase` 定义统一接口
3. **单例模式**: `get_image_service()` 全局服务实例
4. **模板方法**: Prompt模板变量替换

### 核心算法

1. **图片压缩**: 二分查找最优质量值
2. **并发控制**: ThreadPoolExecutor + futures
3. **自动重试**: 指数退避 (2^attempt 秒)
4. **SSE解析**: 状态机解析事件流

### 技术栈深度

- **Flask**: 轻量级Web框架,支持SSE流式响应
- **Vue 3**: Composition API + Pinia状态管理
- **Pinia**: 替代Vuex,更简洁的状态管理
- **SSE**: 单向实时通信,比WebSocket更轻量
- **ThreadPoolExecutor**: Python并发编程,适合I/O密集任务
- **Docker多阶段构建**: 优化镜像体积

---

## 📊 架构图总结

### 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                    用户界面层                        │
│  HomeView | OutlineView | GenerateView | ResultView │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                  前端状态层 (Pinia)                  │
│  generator.ts: stage, outline, progress, images     │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                  API通信层 (Axios/SSE)               │
│  generateOutline() | generateImagesPost() | ...     │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/SSE
┌────────────────────▼────────────────────────────────┐
│               Flask路由层 (api.py)                   │
│  /api/outline | /api/generate | /api/config | ...   │
└────┬───────────────────────────────────────┬────────┘
     │                                       │
┌────▼──────────────┐              ┌────────▼─────────┐
│  OutlineService   │              │  ImageService    │
│  ─────────────    │              │  ────────────    │
│  - Text Client    │              │  - Generator     │
│  - Prompt模板     │              │  - 两阶段生成     │
│  - 页面解析       │              │  - 并发控制       │
└────┬──────────────┘              └────────┬─────────┘
     │                                      │
┌────▼──────────────┐              ┌────────▼─────────┐
│ Google Gemini     │              │ Image Generators │
│ OpenAI Compatible │              │ ──────────────── │
└───────────────────┘              │ - Google GenAI   │
                                   │ - OpenAI API     │
                                   │ - Image API      │
                                   └──────────────────┘
```

### 数据流向图

```
输入主题
    ↓
生成大纲
    ↓
用户编辑
    ↓
生成封面 ─────→ 压缩到200KB ─────→ 作为参考图
    ↓                                    ↓
保存原图 + 缩略图                        │
    ↓                                    │
生成其他页面 ←──────────────────────────┘
    ↓
每页生成完成 ──→ SSE推送 ──→ 前端更新进度
    ↓
全部完成 ──→ 保存到历史记录 ──→ 展示结果页
```

---

**总结**: RedInk是一个架构清晰、工程化完善的AI图文生成项目,采用模块化设计和可插拔架构,在性能、用户体验和可维护性之间取得了良好平衡。核心亮点是SSE流式传输、两阶段生成策略和图片压缩优化,适合作为AI应用开发的参考案例。

---

## 📚 参考资料

- **项目地址**: https://github.com/HisMax/RedInk
- **Docker Hub**: https://hub.docker.com/r/histonemax/redink
- **作者**: 默子 (Histone) - histonemax@gmail.com
- **创建日期**: 2025-11-28
- **文档版本**: v1.0
