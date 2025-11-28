# PPT 自定义素材功能 - 快速集成指南

## 🎯 功能概述

允许用户上传自定义素材（Logo、背景图、装饰图标等）并应用到生成的PPT中，实现品牌定制化。

---

## 📦 已创建的文件

1. ✅ **`backend/services/asset.py`** - 素材管理服务（核心代码，已创建）
2. ✅ **`docs/PPT_CUSTOM_ASSETS_DESIGN.md`** - 完整设计方案
3. ✅ **`docs/PPT_ASSETS_QUICK_GUIDE.md`** - 本快速指南

---

## 🚀 5分钟快速集成

### 步骤 1: 添加依赖（30秒）

编辑 `pyproject.toml`，确保包含：

```toml
[project]
dependencies = [
    # ... 现有依赖 ...
    "python-pptx>=0.6.21",
    "pillow>=12.0.0",       # 已有
    "werkzeug>=3.0.0",      # 新增（用于 secure_filename）
]
```

运行：
```bash
uv sync
```

### 步骤 2: 添加API路由（2分钟）

在 `backend/routes/api.py` 文件**末尾**添加以下代码：

```python
# ==================== 素材管理 API ====================

@api_bp.route('/ppt/assets/upload', methods=['POST'])
def upload_ppt_asset():
    """上传PPT素材"""
    try:
        from backend.services.asset import get_asset_service
        asset_service = get_asset_service()

        # multipart/form-data 上传
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"success": False, "error": "未选择文件"}), 400

            user_id = request.form.get('user_id', 'anonymous')
            asset_type = request.form.get('asset_type', 'general')

            file_data = file.read()
            filename = file.filename

        # JSON base64 上传
        else:
            data = request.get_json()
            import base64

            file_data_b64 = data.get('file_data')
            filename = data.get('filename')
            user_id = data.get('user_id', 'anonymous')
            asset_type = data.get('asset_type', 'general')

            if not file_data_b64 or not filename:
                return jsonify({"success": False, "error": "缺少参数"}), 400

            if ',' in file_data_b64:
                file_data_b64 = file_data_b64.split(',')[1]
            file_data = base64.b64decode(file_data_b64)

        # 上传素材
        result = asset_service.upload_asset(user_id, file_data, filename, asset_type)

        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        _log_error('/ppt/assets/upload', e)
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route('/ppt/assets/<user_id>', methods=['GET'])
def list_ppt_assets(user_id):
    """获取用户素材列表"""
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
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route('/ppt/assets/<user_id>/<asset_id>', methods=['GET'])
def get_ppt_asset(user_id, asset_id):
    """获取素材文件"""
    try:
        from backend.services.asset import get_asset_service
        asset_service = get_asset_service()
        asset_path = asset_service.get_asset_path(user_id, asset_id)

        if not asset_path:
            return jsonify({"success": False, "error": "素材不存在"}), 404

        return send_file(asset_path, mimetype='image/png')
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route('/ppt/assets/<user_id>/<asset_id>', methods=['DELETE'])
def delete_ppt_asset(user_id, asset_id):
    """删除素材"""
    try:
        from backend.services.asset import get_asset_service
        asset_service = get_asset_service()
        success = asset_service.delete_asset(user_id, asset_id)

        if success:
            return jsonify({"success": True, "message": "删除成功"}), 200
        else:
            return jsonify({"success": False, "error": "删除失败"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
```

### 步骤 3: 修改PPT生成服务（2分钟）

在 `backend/services/ppt.py` 中，修改 `generate_ppt` 方法签名，添加 `custom_assets` 参数：

```python
def generate_ppt(
    self,
    task_id: str,
    outline: Dict[str, Any],
    template: str = 'default',
    custom_assets: Optional[Dict[str, str]] = None  # 新增这一行
) -> str:
```

然后在生成幻灯片的循环中，添加素材应用逻辑：

```python
# 在 for page in pages 循环内，添加图片后：

# 添加Logo（如果有）
if custom_assets and 'logo' in custom_assets:
    from backend.services.asset import get_asset_service
    asset_service = get_asset_service()

    # 解析 user_id 和 asset_id
    # custom_assets['logo'] 格式: "/api/ppt/assets/user123/logo_xxx.png"
    parts = custom_assets['logo'].split('/')
    if len(parts) >= 5:
        user_id = parts[-2]
        asset_id = parts[-1]
        logo_path = asset_service.get_asset_path(user_id, asset_id)

        if logo_path:
            # 在右上角添加Logo
            logo_size = Inches(0.8)
            left = prs.slide_width - logo_size - Inches(0.3)
            top = Inches(0.3)

            slide.shapes.add_picture(
                str(logo_path),
                left, top,
                width=logo_size,
                height=logo_size
            )

# 类似地添加背景图和装饰图标...
```

### 步骤 4: 修改生成PPT的API（1分钟）

在 `backend/routes/api.py` 的 `generate_ppt` 函数中，接收 `custom_assets` 参数：

```python
@api_bp.route('/ppt/generate/<task_id>', methods=['POST'])
def generate_ppt(task_id):
    try:
        data = request.get_json()
        outline = data.get('outline')
        template = data.get('template', 'default')
        custom_assets = data.get('custom_assets')  # 新增这一行

        # ...

        # 生成 PPT
        ppt_path = ppt_service.generate_ppt(
            task_id,
            outline,
            template,
            custom_assets  # 传递自定义素材
        )

        # ...
```

---

## 🧪 测试

### 1. 测试素材上传

```bash
# 上传Logo
curl -X POST http://localhost:12398/api/ppt/assets/upload \
  -F "file=@test_logo.png" \
  -F "user_id=test_user" \
  -F "asset_type=logo"

# 响应示例:
{
  "success": true,
  "asset_id": "logo_a1b2c3d4.png",
  "url": "/api/ppt/assets/test_user/logo_a1b2c3d4.png",
  "thumbnail_url": "/api/ppt/assets/test_user/thumb_logo_a1b2c3d4.png"
}
```

### 2. 测试素材列表

```bash
curl http://localhost:12398/api/ppt/assets/test_user

# 响应示例:
{
  "success": true,
  "assets": [
    {
      "asset_id": "logo_a1b2c3d4.png",
      "original_filename": "test_logo.png",
      "asset_type": "logo",
      "file_size": 12345
    }
  ],
  "total": 1
}
```

### 3. 测试生成带素材的PPT

```bash
curl -X POST http://localhost:12398/api/ppt/generate/task_xxx \
  -H "Content-Type: application/json" \
  -d '{
    "outline": {
      "pages": [
        {"index": 0, "type": "cover", "content": "封面"},
        {"index": 1, "type": "content", "content": "内容"}
      ]
    },
    "custom_assets": {
      "logo": "/api/ppt/assets/test_user/logo_a1b2c3d4.png"
    }
  }'
```

---

## 📁 目录结构

素材存储结构：

```
RedInk/
├── user_assets/              # 新创建的目录
│   ├── anonymous/            # 匿名用户
│   │   ├── logo_xxx.png
│   │   ├── thumb_logo_xxx.png
│   │   ├── background_yyy.jpg
│   │   └── assets.json       # 元数据
│   ├── user_001/             # 真实用户
│   │   ├── logo_xxx.png
│   │   └── assets.json
│   └── ...
└── ...
```

---

## 🎨 前端集成（可选）

如果需要前端上传界面，创建简单的上传组件：

```vue
<template>
  <div class="asset-upload">
    <h3>上传Logo</h3>
    <input
      type="file"
      @change="handleUpload"
      accept="image/*"
    />

    <div v-if="uploadedAsset" class="preview">
      <img :src="uploadedAsset.thumbnail_url" />
      <p>{{ uploadedAsset.filename }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

const uploadedAsset = ref(null)

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', 'anonymous')
  formData.append('asset_type', 'logo')

  try {
    const response = await axios.post('/api/ppt/assets/upload', formData)
    uploadedAsset.value = response.data
    alert('上传成功！')
  } catch (error) {
    alert('上传失败')
  }
}
</script>
```

---

## ✅ 验证清单

- [ ] 后端启动无错误
- [ ] 访问 `/api/ppt/assets/upload` 可以上传文件
- [ ] `user_assets/` 目录被创建
- [ ] 素材文件和缩略图被保存
- [ ] `assets.json` 元数据文件被创建
- [ ] 可以查看素材列表
- [ ] 可以下载素材文件
- [ ] 生成PPT时Logo显示在右上角
- [ ] 可以删除素材

---

## 🔒 安全特性

已实现的安全措施：

1. ✅ **文件类型白名单**: 只允许图片格式
2. ✅ **文件大小限制**: 最大 10MB
3. ✅ **文件名安全处理**: 使用 `secure_filename` 防止路径遍历
4. ✅ **用户隔离**: 按 user_id 分目录存储
5. ✅ **数量限制**: 每个用户最多 50 个素材

---

## 🐛 常见问题

### 1. `No module named 'werkzeug'`

**解决**:
```bash
uv pip install werkzeug
# 或添加到 pyproject.toml 后运行 uv sync
```

### 2. 上传后找不到文件

**原因**: 路径解析错误

**解决**: 检查 `user_assets/` 目录是否被创建在项目根目录

### 3. 图片无法显示在PPT中

**原因**:
- 素材路径解析错误
- 文件不存在

**解决**:
- 检查日志输出
- 确认素材文件存在
- 验证路径格式正确

---

## 📊 使用流程

```
1. 用户上传Logo文件
    ↓
2. 保存到 user_assets/anonymous/logo_xxx.png
    ↓
3. 生成缩略图 thumb_logo_xxx.png
    ↓
4. 记录元数据到 assets.json
    ↓
5. 返回素材URL
    ↓
6. 用户生成PPT时，传入 custom_assets
    ↓
7. PPTService 读取素材文件
    ↓
8. 将Logo添加到每页PPT的右上角
    ↓
9. 返回生成的PPT文件
```

---

## 🎯 下一步

基础功能完成后，可以扩展：

1. **批量上传**: 支持一次上传多个素材
2. **素材预览**: 在生成前预览效果
3. **模板保存**: 保存常用的素材组合
4. **素材库**: 预设一些通用素材供选择
5. **权限管理**: 区分公开和私有素材

---

## 📞 需要帮助？

- 查看完整设计文档: `docs/PPT_CUSTOM_ASSETS_DESIGN.md`
- 查看代码实现: `backend/services/asset.py`
- 提交Issue到GitHub

---

## 总结

通过这个功能，用户可以：

✅ 上传自己的Logo、背景图等素材
✅ 素材自动生成缩略图便于预览
✅ 生成PPT时自动应用素材
✅ 实现品牌定制化的PPT
✅ 管理和删除已上传的素材

核心代码已全部创建，只需按步骤集成API路由即可使用！🚀
