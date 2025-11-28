# PPT 生成功能设计方案

## 📋 需求分析

### 目标
在现有的图片生成功能基础上，增加将生成的图文内容导出为 PowerPoint (PPT) 文件的能力。

### 用户场景
1. 用户生成完小红书图文后，可以一键导出为 PPT 文件
2. 每张图片作为一页 PPT，包含标题和内容
3. 支持自定义 PPT 模板和样式
4. 支持批量下载多个历史记录为 PPT

---

## 🏗️ 技术方案

### 方案选择

#### 方案一：后端生成（推荐）✅

**技术栈**: `python-pptx` 库

**优点**:
- 服务端生成，客户端无需额外处理
- 支持复杂的 PPT 布局和样式
- 可以集成到现有的历史记录和下载功能
- 与现有架构一致（后端处理，前端下载）

**缺点**:
- 需要安装额外的 Python 依赖
- 服务器需要处理文件生成和存储

#### 方案二：前端生成

**技术栈**: `PptxGenJS` 库

**优点**:
- 减轻服务器压力
- 用户可以在浏览器中直接生成

**缺点**:
- 前端需要处理图片下载和 PPT 生成
- 可能受到浏览器性能限制
- 跨域问题处理复杂

### 最终选择：方案一（后端生成）

理由：
1. 与现有架构一致（图片生成、历史记录都在后端）
2. 可以复用现有的图片存储和任务管理机制
3. 用户体验更好（一键下载，无需等待前端处理）

---

## 📐 架构设计

### 整体流程

```
用户点击"导出PPT"
    ↓
POST /api/ppt/generate
    ↓
后端读取任务图片和大纲
    ↓
使用 python-pptx 生成 PPT
    ↓
保存到 history/task_xxx/output.pptx
    ↓
返回下载链接
    ↓
前端触发文件下载
```

### 目录结构变化

```
RedInk/
├── backend/
│   ├── services/
│   │   ├── outline.py
│   │   ├── image.py
│   │   ├── history.py
│   │   └── ppt.py          # 新增：PPT 生成服务
│   ├── templates/          # 新增：PPT 模板配置
│   │   └── default.yaml    # 默认 PPT 样式配置
│   └── ...
├── ppt_templates.yaml      # 新增：PPT 模板配置文件
└── ...
```

---

## 🔧 实现细节

### 1. 依赖安装

**修改 `pyproject.toml`**:
```toml
[project]
dependencies = [
    "flask>=3.0.0",
    "flask-cors>=4.0.0",
    "python-dotenv>=1.0.0",
    "google-genai>=1.0.0",
    "pyyaml>=6.0.0",
    "requests>=2.31.0",
    "pillow>=12.0.0",
    "python-pptx>=0.6.21",  # 新增
]
```

### 2. PPT 生成服务 (backend/services/ppt.py)

```python
"""PPT 生成服务"""
import logging
import os
from pathlib import Path
from typing import Dict, Any, Optional
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from PIL import Image

logger = logging.getLogger(__name__)


class PPTService:
    """PPT 生成服务类"""

    def __init__(self):
        logger.debug("初始化 PPTService...")
        self.history_root_dir = Path(__file__).parent.parent.parent / "history"
        self.template_config = self._load_template_config()
        logger.info("PPTService 初始化完成")

    def _load_template_config(self) -> dict:
        """加载 PPT 模板配置"""
        config_path = Path(__file__).parent.parent.parent / 'ppt_templates.yaml'
        if config_path.exists():
            import yaml
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}

        # 默认配置
        return {
            'slide_width': 10,      # 英寸
            'slide_height': 7.5,    # 英寸（16:9）
            'title_font_size': 44,
            'content_font_size': 24,
            'title_font_name': '微软雅黑',
            'content_font_name': '微软雅黑',
        }

    def generate_ppt(
        self,
        task_id: str,
        outline: Dict[str, Any],
        template: str = 'default'
    ) -> str:
        """
        生成 PPT 文件

        Args:
            task_id: 任务 ID
            outline: 大纲数据 (包含 pages 列表)
            template: 模板名称

        Returns:
            PPT 文件路径
        """
        try:
            logger.info(f"开始生成 PPT: task_id={task_id}, template={template}")

            # 创建 Presentation 对象
            prs = Presentation()
            prs.slide_width = Inches(self.template_config['slide_width'])
            prs.slide_height = Inches(self.template_config['slide_height'])

            # 任务目录
            task_dir = self.history_root_dir / task_id
            if not task_dir.exists():
                raise FileNotFoundError(f"任务目录不存在: {task_id}")

            pages = outline.get('pages', [])
            logger.debug(f"大纲包含 {len(pages)} 页")

            # 遍历页面，生成幻灯片
            for page in pages:
                index = page['index']
                page_type = page['type']
                content = page['content']

                # 图片路径
                image_path = task_dir / f"{index}.png"
                if not image_path.exists():
                    logger.warning(f"图片不存在: {image_path}，跳过该页")
                    continue

                # 添加空白幻灯片
                blank_slide_layout = prs.slide_layouts[6]  # 空白布局
                slide = prs.slides.add_slide(blank_slide_layout)

                # 添加图片（全屏或居中）
                self._add_image_to_slide(slide, image_path, prs)

                # 可选：添加文本框（覆盖在图片上）
                if page_type == 'cover':
                    # 封面：只添加主标题
                    self._add_title_textbox(slide, content, prs)
                # 其他页面可以选择不添加文本，因为图片本身已包含文字

            # 保存 PPT
            output_filename = f"{task_id}.pptx"
            output_path = task_dir / output_filename
            prs.save(str(output_path))

            logger.info(f"✅ PPT 生成成功: {output_path}")
            return str(output_path)

        except Exception as e:
            logger.error(f"❌ PPT 生成失败: {str(e)}")
            raise

    def _add_image_to_slide(self, slide, image_path: Path, prs: Presentation):
        """
        将图片添加到幻灯片（自适应缩放，保持比例）

        Args:
            slide: 幻灯片对象
            image_path: 图片路径
            prs: Presentation 对象
        """
        # 获取图片尺寸
        img = Image.open(image_path)
        img_width, img_height = img.size
        img_ratio = img_width / img_height

        # 幻灯片尺寸
        slide_width = prs.slide_width
        slide_height = prs.slide_height
        slide_ratio = slide_width / slide_height

        # 计算缩放后的尺寸（保持比例，填充幻灯片）
        if img_ratio > slide_ratio:
            # 图片更宽，以高度为准
            pic_height = slide_height
            pic_width = int(pic_height * img_ratio)
        else:
            # 图片更高，以宽度为准
            pic_width = slide_width
            pic_height = int(pic_width / img_ratio)

        # 居中位置
        left = (slide_width - pic_width) // 2
        top = (slide_height - pic_height) // 2

        # 添加图片
        slide.shapes.add_picture(
            str(image_path),
            left, top,
            width=pic_width,
            height=pic_height
        )

    def _add_title_textbox(self, slide, text: str, prs: Presentation):
        """
        在幻灯片顶部添加标题文本框

        Args:
            slide: 幻灯片对象
            text: 标题文本
            prs: Presentation 对象
        """
        # 提取标题（取第一行或前50字）
        title_text = text.split('\n')[0][:50]

        # 添加文本框（顶部居中）
        left = Inches(1)
        top = Inches(0.5)
        width = prs.slide_width - Inches(2)
        height = Inches(1)

        textbox = slide.shapes.add_textbox(left, top, width, height)
        text_frame = textbox.text_frame
        text_frame.text = title_text

        # 样式设置
        paragraph = text_frame.paragraphs[0]
        paragraph.alignment = PP_ALIGN.CENTER
        paragraph.font.size = Pt(self.template_config['title_font_size'])
        paragraph.font.name = self.template_config['title_font_name']
        paragraph.font.bold = True

    def get_ppt_path(self, task_id: str) -> Optional[str]:
        """
        获取已生成的 PPT 路径

        Args:
            task_id: 任务 ID

        Returns:
            PPT 文件路径，如果不存在则返回 None
        """
        ppt_path = self.history_root_dir / task_id / f"{task_id}.pptx"
        if ppt_path.exists():
            return str(ppt_path)
        return None


# 全局服务实例
_ppt_service_instance = None


def get_ppt_service() -> PPTService:
    """获取 PPT 生成服务实例"""
    global _ppt_service_instance
    if _ppt_service_instance is None:
        _ppt_service_instance = PPTService()
    return _ppt_service_instance
```

### 3. API 路由 (backend/routes/api.py)

在 `api.py` 中添加以下端点:

```python
# ==================== PPT 生成相关 API ====================

@api_bp.route('/ppt/generate/<task_id>', methods=['POST'])
def generate_ppt(task_id):
    """
    生成 PPT 文件

    请求体:
    {
        "outline": { "pages": [...] },
        "template": "default"  # 可选
    }
    """
    try:
        data = request.get_json()
        outline = data.get('outline')
        template = data.get('template', 'default')

        if not outline:
            return jsonify({
                "success": False,
                "error": "参数错误：outline 不能为空"
            }), 400

        _log_request('/ppt/generate', {'task_id': task_id, 'template': template})

        from backend.services.ppt import get_ppt_service
        ppt_service = get_ppt_service()

        # 生成 PPT
        ppt_path = ppt_service.generate_ppt(task_id, outline, template)

        logger.info(f"✅ PPT 生成成功: {ppt_path}")

        return jsonify({
            "success": True,
            "ppt_url": f"/api/ppt/download/{task_id}",
            "message": "PPT 生成成功"
        }), 200

    except FileNotFoundError as e:
        logger.error(f"❌ 任务不存在: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"任务不存在: {task_id}"
        }), 404
    except Exception as e:
        _log_error('/ppt/generate', e)
        return jsonify({
            "success": False,
            "error": f"PPT 生成失败: {str(e)}"
        }), 500


@api_bp.route('/ppt/download/<task_id>', methods=['GET'])
def download_ppt(task_id):
    """下载 PPT 文件"""
    try:
        from backend.services.ppt import get_ppt_service
        ppt_service = get_ppt_service()

        ppt_path = ppt_service.get_ppt_path(task_id)
        if not ppt_path:
            return jsonify({
                "success": False,
                "error": f"PPT 文件不存在: {task_id}\n请先生成 PPT"
            }), 404

        return send_file(
            ppt_path,
            mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation',
            as_attachment=True,
            download_name=f"{task_id}.pptx"
        )

    except Exception as e:
        _log_error('/ppt/download', e)
        return jsonify({
            "success": False,
            "error": f"下载失败: {str(e)}"
        }), 500


@api_bp.route('/ppt/check/<task_id>', methods=['GET'])
def check_ppt_exists(task_id):
    """检查 PPT 是否已生成"""
    try:
        from backend.services.ppt import get_ppt_service
        ppt_service = get_ppt_service()

        ppt_path = ppt_service.get_ppt_path(task_id)
        exists = ppt_path is not None

        return jsonify({
            "success": True,
            "exists": exists,
            "ppt_url": f"/api/ppt/download/{task_id}" if exists else None
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
```

### 4. 前端 API 封装 (frontend/src/api/index.ts)

添加 PPT 相关的 API 方法:

```typescript
// ==================== PPT 生成相关 API ====================

/**
 * 生成 PPT 文件
 */
export async function generatePPT(
  taskId: string,
  outline: { raw: string; pages: Page[] },
  template: string = 'default'
): Promise<{
  success: boolean
  ppt_url?: string
  message?: string
  error?: string
}> {
  const response = await axios.post(`${API_BASE_URL}/ppt/generate/${taskId}`, {
    outline,
    template
  })
  return response.data
}

/**
 * 下载 PPT 文件
 */
export function downloadPPT(taskId: string) {
  window.open(`${API_BASE_URL}/ppt/download/${taskId}`, '_blank')
}

/**
 * 检查 PPT 是否已生成
 */
export async function checkPPTExists(taskId: string): Promise<{
  success: boolean
  exists: boolean
  ppt_url?: string
  error?: string
}> {
  const response = await axios.get(`${API_BASE_URL}/ppt/check/${taskId}`)
  return response.data
}
```

### 5. 前端 UI 修改 (frontend/src/views/ResultView.vue)

在结果页面添加 PPT 导出按钮:

```vue
<template>
  <div class="result-view">
    <!-- 现有的图片展示代码 -->

    <!-- 操作按钮区域 -->
    <div class="actions">
      <!-- 现有的下载按钮 -->
      <button @click="downloadAllImages" class="btn-primary">
        📦 下载所有图片 (ZIP)
      </button>

      <!-- 新增：导出 PPT 按钮 -->
      <button
        @click="handleExportPPT"
        class="btn-secondary"
        :disabled="isExportingPPT"
      >
        {{ isExportingPPT ? '生成中...' : '📄 导出为 PPT' }}
      </button>

      <!-- 如果 PPT 已生成，显示下载链接 -->
      <button
        v-if="pptExists"
        @click="handleDownloadPPT"
        class="btn-success"
      >
        ✅ 下载 PPT
      </button>
    </div>

    <!-- 加载提示 -->
    <div v-if="isExportingPPT" class="loading-message">
      <span class="spinner"></span>
      正在生成 PPT，请稍候...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGeneratorStore } from '../stores/generator'
import { generatePPT, checkPPTExists, downloadPPT } from '../api'

const store = useGeneratorStore()
const isExportingPPT = ref(false)
const pptExists = ref(false)

// 检查 PPT 是否已存在
onMounted(async () => {
  if (store.taskId) {
    try {
      const result = await checkPPTExists(store.taskId)
      pptExists.value = result.exists
    } catch (error) {
      console.error('检查 PPT 失败:', error)
    }
  }
})

// 导出 PPT
async function handleExportPPT() {
  if (!store.taskId) {
    alert('任务 ID 不存在')
    return
  }

  isExportingPPT.value = true

  try {
    const result = await generatePPT(
      store.taskId,
      store.outline,
      'default'
    )

    if (result.success) {
      pptExists.value = true
      alert('PPT 生成成功！')

      // 自动触发下载
      if (result.ppt_url) {
        downloadPPT(store.taskId)
      }
    } else {
      alert(`PPT 生成失败: ${result.error}`)
    }
  } catch (error: any) {
    console.error('导出 PPT 失败:', error)
    alert(`导出失败: ${error.message}`)
  } finally {
    isExportingPPT.value = false
  }
}

// 下载 PPT
function handleDownloadPPT() {
  if (store.taskId) {
    downloadPPT(store.taskId)
  }
}
</script>

<style scoped>
.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: center;
}

.btn-primary, .btn-secondary, .btn-success {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-secondary {
  background: #2196F3;
  color: white;
}

.btn-success {
  background: #FF9800;
  color: white;
}

.btn-primary:hover, .btn-secondary:hover, .btn-success:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-primary:disabled, .btn-secondary:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.loading-message {
  margin-top: 1rem;
  text-align: center;
  color: #666;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
```

### 6. PPT 模板配置文件 (ppt_templates.yaml)

在项目根目录创建:

```yaml
# PPT 模板配置
default:
  slide_width: 10        # 幻灯片宽度（英寸）
  slide_height: 5.625    # 幻灯片高度（英寸，16:9 比例）
  title_font_size: 44    # 标题字号
  content_font_size: 24  # 内容字号
  title_font_name: '微软雅黑'
  content_font_name: '微软雅黑'
  background_color: '#FFFFFF'

professional:
  slide_width: 10
  slide_height: 7.5      # 4:3 比例
  title_font_size: 36
  content_font_size: 20
  title_font_name: 'Arial'
  content_font_name: 'Arial'
  background_color: '#F5F5F5'
```

---

## 🧪 测试方案

### 单元测试

创建 `backend/tests/test_ppt_service.py`:

```python
import pytest
from backend.services.ppt import PPTService
from pathlib import Path


def test_ppt_service_init():
    """测试 PPT 服务初始化"""
    service = PPTService()
    assert service is not None
    assert service.template_config is not None


def test_generate_ppt_success(tmp_path):
    """测试 PPT 生成成功"""
    service = PPTService()

    # 准备测试数据
    task_id = "test_task_001"
    outline = {
        "pages": [
            {"index": 0, "type": "cover", "content": "测试封面"},
            {"index": 1, "type": "content", "content": "测试内容页1"},
        ]
    }

    # 创建测试图片
    # ... (创建测试图片的代码)

    # 生成 PPT
    ppt_path = service.generate_ppt(task_id, outline)

    assert Path(ppt_path).exists()
    assert ppt_path.endswith('.pptx')


def test_generate_ppt_missing_task():
    """测试任务不存在时的错误处理"""
    service = PPTService()

    with pytest.raises(FileNotFoundError):
        service.generate_ppt("non_existent_task", {"pages": []})
```

### 集成测试

使用 Postman 或 curl 测试 API:

```bash
# 1. 生成 PPT
curl -X POST http://localhost:12398/api/ppt/generate/task_xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "outline": {
      "pages": [
        {"index": 0, "type": "cover", "content": "封面标题"},
        {"index": 1, "type": "content", "content": "内容页1"}
      ]
    },
    "template": "default"
  }'

# 2. 检查 PPT 是否存在
curl http://localhost:12398/api/ppt/check/task_xxxxx

# 3. 下载 PPT
curl -O http://localhost:12398/api/ppt/download/task_xxxxx
```

---

## 📊 进度追踪

### 实现步骤（按优先级）

#### 阶段一：基础功能（必须）
- [x] 添加 `python-pptx` 依赖到 `pyproject.toml`
- [x] 创建 `backend/services/ppt.py` 服务
- [x] 添加 API 路由 `/api/ppt/*`
- [x] 前端 API 封装 (api/index.ts)
- [x] 前端 UI (ResultView.vue 添加按钮)

#### 阶段二：优化功能（推荐）
- [ ] 支持自定义 PPT 模板选择
- [ ] 添加文本覆盖选项（用户可选是否在图片上添加文本）
- [ ] 批量导出（从历史记录批量生成多个 PPT）
- [ ] PPT 预览功能

#### 阶段三：高级功能（可选）
- [ ] 支持 PDF 导出
- [ ] 支持长图合成
- [ ] 自定义 PPT 主题颜色
- [ ] 添加转场动画
- [ ] 添加备注栏（将大纲内容添加到备注）

---

## 🎨 UI/UX 设计建议

### ResultView 页面布局

```
┌─────────────────────────────────────┐
│         生成结果 - 9张图片             │
├─────────────────────────────────────┤
│  [图1] [图2] [图3]                   │
│  [图4] [图5] [图6]                   │
│  [图7] [图8] [图9]                   │
├─────────────────────────────────────┤
│  操作区域:                           │
│  [📦 下载所有图片(ZIP)]               │
│  [📄 导出为 PPT]                     │
│  [✅ 下载 PPT] (已生成时显示)         │
│  [💾 保存到历史记录]                 │
└─────────────────────────────────────┘
```

### HistoryView 页面增强

在历史记录详情页添加:
```
┌─────────────────────────────────────┐
│  历史记录详情 - 任务 task_xxxxx      │
├─────────────────────────────────────┤
│  [查看图片]  [导出PPT]  [下载图片]   │
└─────────────────────────────────────┘
```

---

## 🐛 注意事项

### 1. 字体问题
- **问题**: 不同操作系统的字体不同
- **解决**:
  - 使用通用字体 (Arial, 微软雅黑)
  - 或者将字体文件打包到 Docker 镜像

### 2. 图片尺寸
- **问题**: 生成的图片是 3:4 比例，PPT 通常是 16:9
- **解决**:
  - 自动缩放并居中
  - 或者提供裁剪选项

### 3. 文件存储
- **问题**: 生成的 PPT 文件占用存储空间
- **解决**:
  - 定期清理旧的 PPT 文件
  - 或者按需生成（不持久化存储）

### 4. 并发处理
- **问题**: 多个用户同时生成 PPT 可能造成性能问题
- **解决**:
  - 添加任务队列
  - 或者限制并发数量

---

## 📈 性能优化

### 1. 按需生成
- 不在图片生成时自动创建 PPT
- 用户点击"导出 PPT"时才生成
- 生成后缓存，下次直接下载

### 2. 异步生成
- 大文件 PPT 生成可能耗时较长
- 使用后台任务队列（如 Celery）
- 生成完成后通知用户

### 3. 缓存策略
- 已生成的 PPT 文件缓存 7 天
- 定期清理过期文件

---

## 🔐 安全考虑

### 1. 路径遍历攻击
- 验证 `task_id` 格式，不包含 `../` 等危险字符
- 使用 `Path.resolve()` 解析路径

### 2. 文件大小限制
- 限制单个 PPT 文件大小（如 50MB）
- 防止恶意用户生成超大文件

### 3. 权限控制
- 确保用户只能下载自己生成的 PPT
- 或者使用临时令牌验证

---

## 📚 参考资料

- [python-pptx 官方文档](https://python-pptx.readthedocs.io/)
- [PowerPoint Open XML 格式规范](https://docs.microsoft.com/en-us/office/open-xml/structure-of-a-presentationml-document)
- [Flask 文件下载最佳实践](https://flask.palletsprojects.com/en/2.3.x/patterns/fileuploads/)

---

## 🎯 总结

这个方案的核心思路是:
1. **复用现有架构**: 基于现有的图片生成和历史记录功能
2. **后端生成**: 使用 `python-pptx` 在后端生成 PPT
3. **按需生成**: 用户主动触发，不自动生成
4. **简单实用**: 先实现基础功能，再逐步优化

实现后，用户可以在 ResultView 页面一键导出 PPT，每张图片作为一页幻灯片，非常适合小红书内容的演示和分享。
