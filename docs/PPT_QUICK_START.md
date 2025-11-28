# PPT 功能快速实施指南

## 🚀 5 分钟快速开始

### 步骤 1: 安装依赖

```bash
cd /Users/wangsanyong/workspace/RedInk

# 添加 python-pptx 到依赖
# 编辑 pyproject.toml，在 dependencies 中添加:
# "python-pptx>=0.6.21"

# 安装依赖
uv sync
```

### 步骤 2: 创建 PPT 服务文件

```bash
# 创建 PPT 服务
touch backend/services/ppt.py
```

将以下代码复制到 `backend/services/ppt.py`:

```python
"""PPT 生成服务 - 最小可行版本"""
import logging
import os
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches
from PIL import Image

logger = logging.getLogger(__name__)


class PPTService:
    def __init__(self):
        self.history_root_dir = Path(__file__).parent.parent.parent / "history"

    def generate_ppt(self, task_id: str, outline: dict) -> str:
        """生成 PPT 文件"""
        logger.info(f"开始生成 PPT: task_id={task_id}")

        # 创建演示文稿
        prs = Presentation()
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(5.625)  # 16:9

        # 任务目录
        task_dir = self.history_root_dir / task_id
        if not task_dir.exists():
            raise FileNotFoundError(f"任务目录不存在: {task_id}")

        pages = outline.get('pages', [])

        # 为每张图片创建幻灯片
        for page in pages:
            index = page['index']
            image_path = task_dir / f"{index}.png"

            if not image_path.exists():
                logger.warning(f"图片不存在: {image_path}")
                continue

            # 添加空白幻灯片
            blank_layout = prs.slide_layouts[6]
            slide = prs.slides.add_slide(blank_layout)

            # 添加图片（全屏）
            img = Image.open(image_path)
            img_width, img_height = img.size
            img_ratio = img_width / img_height

            slide_width = prs.slide_width
            slide_height = prs.slide_height
            slide_ratio = slide_width / slide_height

            if img_ratio > slide_ratio:
                pic_height = slide_height
                pic_width = int(pic_height * img_ratio)
            else:
                pic_width = slide_width
                pic_height = int(pic_width / img_ratio)

            left = (slide_width - pic_width) // 2
            top = (slide_height - pic_height) // 2

            slide.shapes.add_picture(
                str(image_path), left, top,
                width=pic_width, height=pic_height
            )

        # 保存
        output_path = task_dir / f"{task_id}.pptx"
        prs.save(str(output_path))
        logger.info(f"✅ PPT 生成成功: {output_path}")
        return str(output_path)

    def get_ppt_path(self, task_id: str):
        """获取 PPT 路径"""
        ppt_path = self.history_root_dir / task_id / f"{task_id}.pptx"
        return str(ppt_path) if ppt_path.exists() else None


_service = None

def get_ppt_service():
    global _service
    if _service is None:
        _service = PPTService()
    return _service
```

### 步骤 3: 添加 API 路由

在 `backend/routes/api.py` 文件末尾添加:

```python
# ==================== PPT 生成 API ====================

@api_bp.route('/ppt/generate/<task_id>', methods=['POST'])
def generate_ppt(task_id):
    """生成 PPT"""
    try:
        data = request.get_json()
        outline = data.get('outline')

        if not outline:
            return jsonify({"success": False, "error": "outline 不能为空"}), 400

        from backend.services.ppt import get_ppt_service
        ppt_service = get_ppt_service()
        ppt_path = ppt_service.generate_ppt(task_id, outline)

        return jsonify({
            "success": True,
            "ppt_url": f"/api/ppt/download/{task_id}",
            "message": "PPT 生成成功"
        }), 200

    except FileNotFoundError:
        return jsonify({"success": False, "error": f"任务不存在: {task_id}"}), 404
    except Exception as e:
        logger.error(f"生成 PPT 失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route('/ppt/download/<task_id>', methods=['GET'])
def download_ppt(task_id):
    """下载 PPT"""
    try:
        from backend.services.ppt import get_ppt_service
        ppt_service = get_ppt_service()
        ppt_path = ppt_service.get_ppt_path(task_id)

        if not ppt_path:
            return jsonify({"success": False, "error": "PPT 文件不存在"}), 404

        return send_file(
            ppt_path,
            mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation',
            as_attachment=True,
            download_name=f"{task_id}.pptx"
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
```

### 步骤 4: 前端 API 封装

在 `frontend/src/api/index.ts` 文件末尾添加:

```typescript
// ==================== PPT 生成 API ====================

export async function generatePPT(
  taskId: string,
  outline: { raw: string; pages: Page[] }
): Promise<{
  success: boolean
  ppt_url?: string
  message?: string
  error?: string
}> {
  const response = await axios.post(`${API_BASE_URL}/ppt/generate/${taskId}`, {
    outline
  })
  return response.data
}

export function downloadPPT(taskId: string) {
  window.open(`${API_BASE_URL}/ppt/download/${taskId}`, '_blank')
}
```

### 步骤 5: 修改前端页面

在 `frontend/src/views/ResultView.vue` 中，找到下载按钮区域，添加:

```vue
<!-- 在下载图片按钮后面添加 -->
<button
  @click="handleExportPPT"
  class="btn-secondary"
  :disabled="isExportingPPT"
  style="margin-left: 1rem; padding: 0.75rem 1.5rem; background: #2196F3; color: white; border: none; border-radius: 8px; cursor: pointer;"
>
  {{ isExportingPPT ? '生成中...' : '📄 导出为 PPT' }}
</button>
```

在 `<script setup>` 中添加:

```typescript
import { generatePPT, downloadPPT } from '../api'

const isExportingPPT = ref(false)

async function handleExportPPT() {
  if (!store.taskId) {
    alert('任务 ID 不存在')
    return
  }

  isExportingPPT.value = true

  try {
    const result = await generatePPT(store.taskId, store.outline)

    if (result.success) {
      alert('PPT 生成成功！')
      downloadPPT(store.taskId)
    } else {
      alert(`生成失败: ${result.error}`)
    }
  } catch (error: any) {
    alert(`导出失败: ${error.message}`)
  } finally {
    isExportingPPT.value = false
  }
}
```

### 步骤 6: 更新依赖配置

编辑 `pyproject.toml`:

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
    "python-pptx>=0.6.21",  # 新增这一行
]
```

### 步骤 7: 测试

```bash
# 1. 重启后端
cd /Users/wangsanyong/workspace/RedInk
uv run python -m backend.app

# 2. 重启前端（如果在开发模式）
cd frontend
pnpm dev

# 3. 访问应用
# http://localhost:5173 (开发模式)
# 或 http://localhost:12398 (生产模式)

# 4. 生成一组图片后，点击"导出为 PPT"按钮测试
```

---

## 🧪 快速测试（使用 curl）

```bash
# 假设你已经有一个任务 task_abc123

# 1. 生成 PPT
curl -X POST http://localhost:12398/api/ppt/generate/task_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "outline": {
      "pages": [
        {"index": 0, "type": "cover", "content": "封面"},
        {"index": 1, "type": "content", "content": "内容页1"}
      ]
    }
  }'

# 2. 下载 PPT
curl -O http://localhost:12398/api/ppt/download/task_abc123
```

---

## ✅ 验证清单

完成后，确认以下功能正常:

- [ ] 后端启动无错误
- [ ] 访问 `/api/ppt/generate/<task_id>` 返回成功
- [ ] 生成的 PPT 文件在 `history/<task_id>/` 目录下
- [ ] 前端按钮显示正常
- [ ] 点击按钮后可以下载 PPT
- [ ] 用 PowerPoint 打开 PPT 文件，每页显示对应图片

---

## 🐛 常见问题

### 1. 导入错误: `No module named 'pptx'`

**原因**: 依赖未安装

**解决**:
```bash
uv sync
# 或
pip install python-pptx
```

### 2. 文件不存在错误

**原因**: 任务目录或图片不存在

**解决**: 确保先生成图片，再导出 PPT

### 3. PPT 无法打开

**原因**: 图片路径错误或图片损坏

**解决**: 检查 `history/<task_id>/` 目录下的图片是否存在且完整

### 4. 前端按钮不显示

**原因**:
- 没有重新构建前端
- 代码位置错误

**解决**:
```bash
cd frontend
pnpm build  # 如果是生产模式
# 或重启开发服务器
pnpm dev
```

---

## 📦 Docker 部署

如果使用 Docker，需要更新 Dockerfile:

```dockerfile
# 在 Dockerfile 中确保安装了 python-pptx
# (已通过 pyproject.toml 自动安装)

# 如果需要中文字体支持，添加:
RUN apt-get update && apt-get install -y \
    fonts-wqy-microhei \
    fonts-wqy-zenhei \
    && rm -rf /var/lib/apt/lists/*
```

重新构建镜像:
```bash
docker build -t redink:ppt .
docker run -d -p 12398:12398 -v ./output:/app/output redink:ppt
```

---

## 🎯 下一步优化

基础功能完成后，可以考虑:

1. **添加模板选择**: 支持多种 PPT 样式
2. **批量导出**: 从历史记录批量生成
3. **自定义选项**: 是否添加文本、选择比例等
4. **PDF 导出**: 将 PPT 转为 PDF
5. **进度提示**: 大文件生成时显示进度条

---

## 📞 需要帮助？

- 查看完整设计文档: `docs/PPT_FEATURE_DESIGN.md`
- 查看架构文档: `ARCHITECTURE.md`
- 提交 Issue: https://github.com/HisMax/RedInk/issues

祝你实现顺利！🎉
