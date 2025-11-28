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
    MAX_ASSETS_PER_USER = 50  # 每个用户最多50个素材

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

            # 检查用户素材数量
            current_assets = self.list_assets(user_id)
            if len(current_assets) >= self.MAX_ASSETS_PER_USER:
                return {
                    "success": False,
                    "error": f"素材数量已达上限（{self.MAX_ASSETS_PER_USER}个）。请删除一些素材后重试。"
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
                "file_path": str(file_path),
                "uploaded_at": str(Path(file_path).stat().st_ctime)
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
            logger.debug(f"缩略图生成成功: {thumbnail_path}")
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
            logger.debug(f"删除文件: {asset_path}")

            # 删除缩略图
            thumbnail_path = asset_path.parent / f"thumb_{asset_id}"
            if thumbnail_path.exists():
                thumbnail_path.unlink()
                logger.debug(f"删除缩略图: {thumbnail_path}")

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

    def get_asset_by_type(self, user_id: str, asset_type: str) -> Optional[Dict[str, Any]]:
        """根据类型获取素材（返回最新的一个）"""
        assets = self.list_assets(user_id)
        type_assets = [a for a in assets if a['asset_type'] == asset_type]

        if type_assets:
            # 返回最新上传的
            return type_assets[-1]
        return None

    def cleanup_old_assets(self, user_id: str, days: int = 30) -> int:
        """清理超过指定天数的素材"""
        import time

        user_dir = self._get_user_dir(user_id)
        metadata_file = user_dir / "assets.json"

        if not metadata_file.exists():
            return 0

        with open(metadata_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        current_time = time.time()
        cutoff_time = current_time - (days * 24 * 60 * 60)

        cleaned_count = 0
        new_assets = []

        for asset in data["assets"]:
            asset_path = Path(asset["file_path"])
            if asset_path.exists():
                file_mtime = asset_path.stat().st_mtime
                if file_mtime < cutoff_time:
                    # 删除文件
                    asset_path.unlink()
                    # 删除缩略图
                    thumb_path = asset_path.parent / f"thumb_{asset['asset_id']}"
                    if thumb_path.exists():
                        thumb_path.unlink()
                    cleaned_count += 1
                    logger.info(f"清理过期素材: {asset['asset_id']}")
                else:
                    new_assets.append(asset)
            else:
                # 文件已不存在，从元数据中移除
                cleaned_count += 1

        # 更新元数据
        data["assets"] = new_assets
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info(f"清理完成: user={user_id}, 删除 {cleaned_count} 个素材")
        return cleaned_count


# 全局服务实例
_asset_service_instance = None


def get_asset_service() -> AssetService:
    """获取素材管理服务实例"""
    global _asset_service_instance
    if _asset_service_instance is None:
        _asset_service_instance = AssetService()
    return _asset_service_instance
