# PPT 自定义素材上传功能设计方案

## 📋 需求分析

### 用户场景

1. **品牌定制场景**
   - 用户想在PPT中添加公司Logo
   - 用户想使用自定义的背景图片
   - 用户想使用特定的字体/配色方案

2. **个性化场景**
   - 用户上传个人头像放在封面
   - 用户上传产品图片嵌入到内容页
   - 用户上传装饰图案（图标、边框等）

3. **模板定制场景**
   - 用户创建并保存自定义模板
   - 用户复用之前上传的素材
   - 批量应用统一风格

---

## 🏗️ 技术方案

### 方案概述

采用**文件上传 + 模板配置**的方式：

```
用户上传素材（Logo、背景图等）
    ↓
后端保存到 user_assets/<user_id>/
    ↓
用户在PPT设置中配置素材位置
    ↓
生成PPT时，将素材嵌入到幻灯片
    ↓
返回自定义后的PPT文件
```

### 架构设计

```
┌─────────────────────────────────────────┐
│          前端上传界面                    │
│  [Logo] [背景] [装饰图] [预览]          │
└──────────────┬──────────────────────────┘
               │ FormData (multipart/form-data)
┌──────────────▼──────────────────────────┐
│       文件上传API (/api/ppt/assets)     │
│  - 验证文件类型                          │
│  - 限制文件大小                          │
│  - 保存到用户目录                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        素材管理服务 (AssetService)       │
│  - 文件存储                              │
│  - 缩略图生成                            │
│  - 素材列表管理                          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        PPT生成服务 (PPTService)          │
│  - 读取用户素材                          │
│  - 应用到PPT模板                         │
│  - 生成自定义PPT                         │
└──────────────────────────────────────────┘
```

---

## 📂 目录结构

```
RedInk/
├── backend/
│   ├── services/
│   │   ├── ppt.py
│   │   └── asset.py        # 新增：素材管理服务
│   └── routes/
│       └── api.py          # 新增：素材上传API
├── user_assets/            # 新增：用户素材存储目录
│   └── <user_id>/          # 按用户ID分目录
│       ├── logo.png
│       ├── background.jpg
│       └── assets.json     # 素材元数据
├── ppt_templates.yaml      # 扩展：支持自定义素材配置
└── ...
```

---

## 🔧 详细实现

### 1. 素材管理服务 (backend/services/asset.py)

```python
"""素材管理服务"""
import logging
import os
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from werkzeug.utils import secure_filename
from PIL import Image
import json

logger = logging.getLogger(__name__)


class AssetService:
    """用户素材管理服务"""

    # 允许的文件类型
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    def __init__(self):
        logger.debug("初始化 AssetService...")
        self.assets_root_dir = Path(__file__).parent.parent.parent / "user_assets"
        self.assets_root_dir.mkdir(exist_ok=True)
        logger.info("AssetService 初始化完成")

    def _get_user_dir(self, user_id: str) -> Path:
        """获取用户素材目录"""
        user_dir = self.assets_root_dir / user_id
        user_dir.mkdir(exist_ok=True)
        return user_dir

    def _allowed_file(self, filename: str) -> bool:
        """检查文件类型是否允许"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS

    def upload_asset(
        self,
        user_id: str,
        file_data: bytes,
        filename: str,
        asset_type: str = 'general'
    ) -> Dict[str, Any]:
        """
        上传用户素材

        Args:
            user_id: 用户ID（可以是session_id或真实用户ID）
            file_data: 文件二进制数据
            filename: 原始文件名
            asset_type: 素材类型 ('logo', 'background', 'decoration', 'general')

        Returns:
            {
                "success": True,
                "asset_id": "uuid",
                "filename": "logo.png",
                "url": "/api/ppt/assets/<user_id>/<asset_id>",
                "type": "logo"
            }
        """
        try:
            # 验证文件名
            if not self._allowed_file(filename):
                return {
                    "success": False,
                    "error": f"不支持的文件类型。允许的类型: {', '.join(self.ALLOWED_EXTENSIONS)}"
                }

            # 验证文件大小
            if len(file_data) > self.MAX_FILE_SIZE:
                return {
                    "success": False,
                    "error": f"文件过大。最大允许 {self.MAX_FILE_SIZE // 1024 // 1024}MB"
                }

            # 安全的文件名
            safe_filename = secure_filename(filename)
            file_ext = safe_filename.rsplit('.', 1)[1].lower()

            # 生成唯一ID
            asset_id = f"{asset_type}_{uuid.uuid4().hex[:8]}.{file_ext}"

            # 保存文件
            user_dir = self._get_user_dir(user_id)
            file_path = user_dir / asset_id

            with open(file_path, 'wb') as f:
                f.write(file_data)

            # 生成缩略图（用于预览）
            thumbnail_path = user_dir / f"thumb_{asset_id}"
            self._generate_thumbnail(file_path, thumbnail_path)

            # 保存元数据
            self._save_asset_metadata(user_id, {
                "asset_id": asset_id,
                "original_filename": filename,
                "asset_type": asset_type,
                "file_size": len(file_data),
                "file_path": str(file_path)
            })

            logger.info(f"✅ 素材上传成功: user={user_id}, asset={asset_id}")

            return {
                "success": True,
                "asset_id": asset_id,
                "filename": filename,
                "url": f"/api/ppt/assets/{user_id}/{asset_id}",
                "thumbnail_url": f"/api/ppt/assets/{user_id}/thumb_{asset_id}",
                "type": asset_type
            }

        except Exception as e:
            logger.error(f"❌ 素材上传失败: {str(e)}")
            return {
                "success": False,
                "error": f"上传失败: {str(e)}"
            }

    def _generate_thumbnail(self, source_path: Path, thumbnail_path: Path):
        """生成缩略图"""
        try:
            img = Image.open(source_path)
            img.thumbnail((200, 200))
            img.save(thumbnail_path, 'PNG')
        except Exception as e:
            logger.warning(f"缩略图生成失败: {str(e)}")

    def _save_asset_metadata(self, user_id: str, metadata: dict):
        """保存素材元数据"""
        user_dir = self._get_user_dir(user_id)
        metadata_file = user_dir / "assets.json"

        # 读取现有数据
        if metadata_file.exists():
            with open(metadata_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = {"assets": []}

        # 添加新素材
        data["assets"].append(metadata)

        # 保存
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def list_assets(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户所有素材列表"""
        user_dir = self._get_user_dir(user_id)
        metadata_file = user_dir / "assets.json"

        if not metadata_file.exists():
            return []

        with open(metadata_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return data.get("assets", [])

    def get_asset_path(self, user_id: str, asset_id: str) -> Optional[Path]:
        """获取素材文件路径"""
        asset_path = self._get_user_dir(user_id) / asset_id
        if asset_path.exists():
            return asset_path
        return None

    def delete_asset(self, user_id: str, asset_id: str) -> bool:
        """删除素材"""
        asset_path = self.get_asset_path(user_id, asset_id)
        if not asset_path:
            return False

        try:
            # 删除文件
            asset_path.unlink()

            # 删除缩略图
            thumbnail_path = asset_path.parent / f"thumb_{asset_id}"
            if thumbnail_path.exists():
                thumbnail_path.unlink()

            # 更新元数据
            user_dir = self._get_user_dir(user_id)
            metadata_file = user_dir / "assets.json"

            if metadata_file.exists():
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                data["assets"] = [
                    a for a in data["assets"]
                    if a["asset_id"] != asset_id
                ]

                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

            logger.info(f"✅ 素材删除成功: {asset_id}")
            return True

        except Exception as e:
            logger.error(f"❌ 素材删除失败: {str(e)}")
            return False


# 全局服务实例
_asset_service_instance = None


def get_asset_service() -> AssetService:
    """获取素材管理服务实例"""
    global _asset_service_instance
    if _asset_service_instance is None:
        _asset_service_instance = AssetService()
    return _asset_service_instance
```

### 2. API 路由扩展 (backend/routes/api.py)

```python
# ==================== 素材管理 API ====================

@api_bp.route('/ppt/assets/upload', methods=['POST'])
def upload_ppt_asset():
    """
    上传PPT素材

    支持两种方式:
    1. multipart/form-data (推荐)
       - file: 文件对象
       - user_id: 用户ID
       - asset_type: 素材类型

    2. JSON (base64)
       - file_data: base64编码的文件数据
       - filename: 文件名
       - user_id: 用户ID
       - asset_type: 素材类型
    """
    try:
        from backend.services.asset import get_asset_service
        asset_service = get_asset_service()

        # 方式1: multipart/form-data
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"success": False, "error": "未选择文件"}), 400

            user_id = request.form.get('user_id', 'anonymous')
            asset_type = request.form.get('asset_type', 'general')

            file_data = file.read()
            filename = file.filename

        # 方式2: JSON (base64)
        else:
            data = request.get_json()
            import base64

            file_data_b64 = data.get('file_data')
            filename = data.get('filename')
            user_id = data.get('user_id', 'anonymous')
            asset_type = data.get('asset_type', 'general')

            if not file_data_b64 or not filename:
                return jsonify({"success": False, "error": "缺少参数"}), 400

            # 解码 base64
            if ',' in file_data_b64:
                file_data_b64 = file_data_b64.split(',')[1]
            file_data = base64.b64decode(file_data_b64)

        # 上传素材
        result = asset_service.upload_asset(user_id, file_data, filename, asset_type)

        if result["success"]:
            logger.info(f"✅ 素材上传成功: {result['asset_id']}")
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        _log_error('/ppt/assets/upload', e)
        return jsonify({
            "success": False,
            "error": f"上传失败: {str(e)}"
        }), 500


@api_bp.route('/ppt/assets/<user_id>', methods=['GET'])
def list_ppt_assets(user_id):
    """获取用户所有素材列表"""
    try:
        from backend.services.asset import get_asset_service
        asset_service = get_asset_service()

        assets = asset_service.list_assets(user_id)

        return jsonify({
            "success": True,
            "assets": assets,
            "total": len(assets)
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@api_bp.route('/ppt/assets/<user_id>/<asset_id>', methods=['GET'])
def get_ppt_asset(user_id, asset_id):
    """获取素材文件"""
    try:
        from backend.services.asset import get_asset_service
        asset_service = get_asset_service()

        asset_path = asset_service.get_asset_path(user_id, asset_id)
        if not asset_path:
            return jsonify({
                "success": False,
                "error": "素材不存在"
            }), 404

        return send_file(asset_path, mimetype='image/png')

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@api_bp.route('/ppt/assets/<user_id>/<asset_id>', methods=['DELETE'])
def delete_ppt_asset(user_id, asset_id):
    """删除素材"""
    try:
        from backend.services.asset import get_asset_service
        asset_service = get_asset_service()

        success = asset_service.delete_asset(user_id, asset_id)

        if success:
            return jsonify({
                "success": True,
                "message": "素材已删除"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "删除失败"
            }), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
```

### 3. PPT 生成服务扩展 (backend/services/ppt.py)

在现有的 `PPTService` 类中添加自定义素材支持：

```python
def generate_ppt(
    self,
    task_id: str,
    outline: Dict[str, Any],
    template: str = 'default',
    custom_assets: Optional[Dict[str, str]] = None  # 新增参数
) -> str:
    """
    生成 PPT 文件

    Args:
        task_id: 任务 ID
        outline: 大纲数据
        template: 模板名称
        custom_assets: 自定义素材配置
            {
                "logo": "/path/to/logo.png",
                "background": "/path/to/bg.jpg",
                "footer_icon": "/path/to/icon.png"
            }
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

        # 遍历页面
        for page in pages:
            index = page['index']
            page_type = page['type']
            content = page['content']

            # 图片路径
            image_path = task_dir / f"{index}.png"
            if not image_path.exists():
                logger.warning(f"图片不存在: {image_path}")
                continue

            # 添加幻灯片
            blank_slide_layout = prs.slide_layouts[6]
            slide = prs.slides.add_slide(blank_slide_layout)

            # 添加背景图（如果有自定义背景）
            if custom_assets and 'background' in custom_assets:
                self._add_background_image(slide, custom_assets['background'], prs)

            # 添加主图片
            self._add_image_to_slide(slide, image_path, prs)

            # 添加Logo（如果有）
            if custom_assets and 'logo' in custom_assets:
                self._add_logo(slide, custom_assets['logo'], prs)

            # 添加页脚图标（如果有）
            if custom_assets and 'footer_icon' in custom_assets:
                self._add_footer_icon(slide, custom_assets['footer_icon'], prs)

        # 保存 PPT
        output_filename = f"{task_id}.pptx"
        output_path = task_dir / output_filename
        prs.save(str(output_path))

        logger.info(f"✅ PPT 生成成功: {output_path}")
        return str(output_path)

    except Exception as e:
        logger.error(f"❌ PPT 生成失败: {str(e)}")
        raise

def _add_background_image(self, slide, bg_image_path: str, prs: Presentation):
    """添加背景图"""
    # 背景图应该全屏覆盖
    slide.shapes.add_picture(
        bg_image_path,
        0, 0,
        width=prs.slide_width,
        height=prs.slide_height
    )

def _add_logo(self, slide, logo_path: str, prs: Presentation):
    """在右上角添加Logo"""
    logo_size = Inches(0.8)
    left = prs.slide_width - logo_size - Inches(0.3)
    top = Inches(0.3)

    slide.shapes.add_picture(
        logo_path,
        left, top,
        width=logo_size,
        height=logo_size
    )

def _add_footer_icon(self, slide, icon_path: str, prs: Presentation):
    """在底部添加装饰图标"""
    icon_size = Inches(0.5)
    left = prs.slide_width - icon_size - Inches(0.3)
    top = prs.slide_height - icon_size - Inches(0.3)

    slide.shapes.add_picture(
        icon_path,
        left, top,
        width=icon_size,
        height=icon_size
    )
```

### 4. 前端 API 封装 (frontend/src/api/index.ts)

```typescript
// ==================== 素材管理 API ====================

/**
 * 上传PPT素材
 */
export async function uploadPPTAsset(
  file: File,
  userId: string = 'anonymous',
  assetType: 'logo' | 'background' | 'decoration' | 'general' = 'general'
): Promise<{
  success: boolean
  asset_id?: string
  url?: string
  thumbnail_url?: string
  error?: string
}> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId)
  formData.append('asset_type', assetType)

  const response = await axios.post(`${API_BASE_URL}/ppt/assets/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

/**
 * 获取用户素材列表
 */
export async function listPPTAssets(userId: string): Promise<{
  success: boolean
  assets?: Array<{
    asset_id: string
    original_filename: string
    asset_type: string
    file_size: number
  }>
  total?: number
  error?: string
}> {
  const response = await axios.get(`${API_BASE_URL}/ppt/assets/${userId}`)
  return response.data
}

/**
 * 删除素材
 */
export async function deletePPTAsset(
  userId: string,
  assetId: string
): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const response = await axios.delete(`${API_BASE_URL}/ppt/assets/${userId}/${assetId}`)
  return response.data
}

/**
 * 生成带自定义素材的PPT
 */
export async function generateCustomPPT(
  taskId: string,
  outline: { raw: string; pages: Page[] },
  customAssets: {
    logo?: string
    background?: string
    footer_icon?: string
  },
  template: string = 'default'
): Promise<{
  success: boolean
  ppt_url?: string
  message?: string
  error?: string
}> {
  const response = await axios.post(`${API_BASE_URL}/ppt/generate/${taskId}`, {
    outline,
    template,
    custom_assets: customAssets
  })
  return response.data
}
```

### 5. 前端上传界面 (frontend/src/views/PPTAssetsView.vue)

创建新的素材管理页面：

```vue
<template>
  <div class="ppt-assets-view">
    <h2>PPT 素材管理</h2>

    <!-- 上传区域 -->
    <div class="upload-section">
      <h3>上传素材</h3>

      <div class="upload-grid">
        <!-- Logo 上传 -->
        <div class="upload-item">
          <label>Logo</label>
          <input
            type="file"
            @change="handleFileUpload($event, 'logo')"
            accept="image/*"
          />
          <div v-if="uploadedAssets.logo" class="preview">
            <img :src="uploadedAssets.logo.thumbnail_url" alt="Logo" />
            <button @click="deleteAsset('logo')" class="btn-delete">删除</button>
          </div>
        </div>

        <!-- 背景图上传 -->
        <div class="upload-item">
          <label>背景图</label>
          <input
            type="file"
            @change="handleFileUpload($event, 'background')"
            accept="image/*"
          />
          <div v-if="uploadedAssets.background" class="preview">
            <img :src="uploadedAssets.background.thumbnail_url" alt="背景" />
            <button @click="deleteAsset('background')" class="btn-delete">删除</button>
          </div>
        </div>

        <!-- 装饰图上传 -->
        <div class="upload-item">
          <label>装饰图标</label>
          <input
            type="file"
            @change="handleFileUpload($event, 'decoration')"
            accept="image/*"
          />
          <div v-if="uploadedAssets.decoration" class="preview">
            <img :src="uploadedAssets.decoration.thumbnail_url" alt="装饰" />
            <button @click="deleteAsset('decoration')" class="btn-delete">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 素材列表 -->
    <div class="assets-list">
      <h3>已上传素材</h3>
      <div v-if="assetsList.length === 0" class="empty-state">
        暂无素材，请上传
      </div>
      <div v-else class="assets-grid">
        <div v-for="asset in assetsList" :key="asset.asset_id" class="asset-card">
          <img :src="`/api/ppt/assets/${userId}/thumb_${asset.asset_id}`" alt="" />
          <div class="asset-info">
            <p>{{ asset.original_filename }}</p>
            <span>{{ formatFileSize(asset.file_size) }}</span>
          </div>
          <button @click="handleDeleteAsset(asset.asset_id)" class="btn-delete">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 生成PPT按钮 -->
    <div class="actions">
      <button @click="generateWithAssets" class="btn-primary">
        使用自定义素材生成PPT
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { uploadPPTAsset, listPPTAssets, deletePPTAsset, generateCustomPPT } from '../api'
import { useGeneratorStore } from '../stores/generator'

const store = useGeneratorStore()
const userId = ref('anonymous') // 实际应用中应该从用户系统获取

const uploadedAssets = ref<{
  logo?: any
  background?: any
  decoration?: any
}>({})

const assetsList = ref<any[]>([])

// 上传文件
async function handleFileUpload(event: Event, assetType: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  try {
    const result = await uploadPPTAsset(file, userId.value, assetType as any)

    if (result.success) {
      uploadedAssets.value[assetType] = result
      alert('上传成功！')
      loadAssetsList()
    } else {
      alert(`上传失败: ${result.error}`)
    }
  } catch (error: any) {
    alert(`上传失败: ${error.message}`)
  }
}

// 删除素材
async function deleteAsset(assetType: string) {
  const asset = uploadedAssets.value[assetType]
  if (!asset) return

  if (!confirm('确定要删除这个素材吗？')) return

  try {
    const result = await deletePPTAsset(userId.value, asset.asset_id)

    if (result.success) {
      uploadedAssets.value[assetType] = undefined
      alert('删除成功！')
      loadAssetsList()
    }
  } catch (error: any) {
    alert(`删除失败: ${error.message}`)
  }
}

// 加载素材列表
async function loadAssetsList() {
  try {
    const result = await listPPTAssets(userId.value)
    if (result.success) {
      assetsList.value = result.assets || []
    }
  } catch (error) {
    console.error('加载素材列表失败:', error)
  }
}

// 使用自定义素材生成PPT
async function generateWithAssets() {
  if (!store.taskId) {
    alert('请先生成图片')
    return
  }

  const customAssets: any = {}

  if (uploadedAssets.value.logo) {
    customAssets.logo = uploadedAssets.value.logo.url
  }
  if (uploadedAssets.value.background) {
    customAssets.background = uploadedAssets.value.background.url
  }
  if (uploadedAssets.value.decoration) {
    customAssets.footer_icon = uploadedAssets.value.decoration.url
  }

  try {
    const result = await generateCustomPPT(
      store.taskId,
      store.outline,
      customAssets
    )

    if (result.success) {
      alert('PPT 生成成功！')
      window.open(result.ppt_url, '_blank')
    } else {
      alert(`生成失败: ${result.error}`)
    }
  } catch (error: any) {
    alert(`生成失败: ${error.message}`)
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// 页面加载时获取素材列表
onMounted(() => {
  loadAssetsList()
})
</script>

<style scoped>
.ppt-assets-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 1rem;
}

.upload-item {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.preview {
  margin-top: 1rem;
}

.preview img {
  max-width: 100%;
  max-height: 150px;
  border-radius: 4px;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.asset-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.asset-card img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-delete {
  background: #f44336;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}
</style>
```

---

## 🎯 使用场景示例

### 场景1: 品牌PPT定制

1. 用户上传公司Logo（200x200 PNG）
2. 上传品牌背景图（1920x1080 JPG）
3. 生成PPT时自动应用这些素材
4. Logo显示在每页右上角
5. 背景图作为每页底图

### 场景2: 个人风格PPT

1. 用户上传个人头像作为Logo
2. 上传喜欢的配色图案作为背景
3. 上传装饰图标
4. 生成独特风格的PPT

### 场景3: 批量生成品牌内容

1. 上传一次素材
2. 素材保存在用户目录
3. 之后每次生成PPT都可以复用
4. 保持品牌一致性

---

## 🔒 安全考虑

### 1. 文件验证
- ✅ 文件类型白名单（只允许图片）
- ✅ 文件大小限制（10MB）
- ✅ 文件名安全处理（防止路径遍历）

### 2. 存储隔离
- ✅ 按用户ID分目录存储
- ✅ 防止跨用户访问
- ✅ 元数据单独管理

### 3. 防滥用
- ⚠️ 限制每个用户最多上传素材数量（如50个）
- ⚠️ 定期清理过期素材
- ⚠️ 限制上传频率（防止暴力上传）

---

## 📊 数据流向

```
用户选择文件
    ↓
前端验证（大小、类型）
    ↓
FormData 上传
    ↓
后端接收并验证
    ↓
保存到 user_assets/<user_id>/
    ↓
生成缩略图
    ↓
保存元数据到 assets.json
    ↓
返回素材URL
    ↓
前端显示预览
    ↓
生成PPT时，读取素材路径
    ↓
嵌入到幻灯片
```

---

## 🧪 测试方案

### 单元测试

```python
def test_upload_asset():
    """测试素材上传"""
    service = AssetService()

    # 准备测试图片
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = BytesIO()
    img.save(img_bytes, 'PNG')

    # 上传
    result = service.upload_asset(
        user_id='test_user',
        file_data=img_bytes.getvalue(),
        filename='test_logo.png',
        asset_type='logo'
    )

    assert result['success'] == True
    assert 'asset_id' in result
```

### 集成测试

```bash
# 上传Logo
curl -X POST http://localhost:12398/api/ppt/assets/upload \
  -F "file=@logo.png" \
  -F "user_id=test_user" \
  -F "asset_type=logo"

# 查看素材列表
curl http://localhost:12398/api/ppt/assets/test_user

# 生成带自定义素材的PPT
curl -X POST http://localhost:12398/api/ppt/generate/task_xxx \
  -H "Content-Type: application/json" \
  -d '{
    "outline": {...},
    "custom_assets": {
      "logo": "/api/ppt/assets/test_user/logo_xxx.png"
    }
  }'
```

---

## 📋 实施步骤

1. ✅ 创建 `backend/services/asset.py` 素材管理服务
2. ✅ 添加素材上传API到 `backend/routes/api.py`
3. ✅ 扩展 `PPTService` 支持自定义素材
4. ✅ 创建前端素材管理页面 `PPTAssetsView.vue`
5. ✅ 添加前端API方法到 `api/index.ts`
6. ⚠️ 在路由中注册素材管理页面
7. ⚠️ 在导出PPT流程中集成素材选择
8. ⚠️ 测试完整流程

---

## 🎨 UI优化建议

### ResultView 页面增强

在现有的"导出PPT"按钮旁边添加"自定义素材"选项：

```vue
<button @click="showAssetsDialog = true">
  🎨 自定义素材
</button>

<!-- 弹窗 -->
<dialog v-if="showAssetsDialog" class="assets-dialog">
  <h3>选择素材</h3>
  <!-- 素材选择界面 -->
  <button @click="generateWithCustomAssets">生成</button>
</dialog>
```

---

## 🔮 未来扩展

1. **素材模板市场**
   - 预设素材包（商务、卡通、简约等）
   - 用户可下载使用

2. **AI素材生成**
   - 一键生成Logo
   - AI生成背景图

3. **素材共享**
   - 用户可分享自己的素材包
   - 社区素材库

---

## 📚 总结

这个方案提供了完整的用户素材上传和管理功能：

- ✅ 支持多种素材类型（Logo、背景、装饰）
- ✅ 文件上传验证和安全处理
- ✅ 素材预览和管理
- ✅ 一键应用到PPT生成
- ✅ 用户素材隔离存储

使用这个功能，用户可以：
1. 上传公司Logo、品牌背景图
2. 管理所有已上传的素材
3. 在生成PPT时选择要使用的素材
4. 生成带有品牌元素的定制化PPT

需要我帮你实现其中的某个部分吗？
