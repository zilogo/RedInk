"""
PPT生成器基类

定义PPT生成器的统一接口,支持多种PPT生成引擎的可插拔实现。
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class PptGeneratorBase(ABC):
    """PPT生成器抽象基类"""

    def __init__(self, style_config: Dict[str, Any]):
        """
        初始化生成器

        Args:
            style_config: 样式配置字典,包含颜色、字体等信息
        """
        self.style_config = style_config

    @abstractmethod
    def create_presentation(self) -> None:
        """创建新的演示文稿对象"""
        pass

    @abstractmethod
    def add_slide(self, page_data: Dict[str, Any], content: Dict[str, Any]) -> Any:
        """
        添加一张幻灯片

        Args:
            page_data: 页面数据,包含 index, type, title, layout 等
            content: 页面详细内容,包含 title, bullets, notes 等

        Returns:
            生成的幻灯片对象
        """
        pass

    @abstractmethod
    def save(self, output_path: str) -> None:
        """
        保存演示文稿到文件

        Args:
            output_path: 输出文件路径 (.pptx)
        """
        pass

    @abstractmethod
    def get_slide_count(self) -> int:
        """获取当前幻灯片数量"""
        pass

    def _hex_to_rgb(self, hex_color: str) -> tuple:
        """
        将十六进制颜色转换为RGB元组

        Args:
            hex_color: 十六进制颜色字符串,如 "#1E3A8A"

        Returns:
            (r, g, b) 元组
        """
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
