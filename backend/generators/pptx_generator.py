"""
基于 python-pptx 的 PPT 生成器实现

使用 python-pptx 库生成标准的 .pptx 格式文件。
"""

import logging
import io
from typing import Dict, Any, Optional, List
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, PP_PARAGRAPH_ALIGNMENT
from pptx.dml.color import RGBColor
from .ppt_base import PptGeneratorBase

logger = logging.getLogger(__name__)


class PythonPptxGenerator(PptGeneratorBase):
    """使用 python-pptx 生成 PPT"""

    def __init__(self, style_config: Dict[str, Any]):
        super().__init__(style_config)
        self.prs = None
        self._setup_colors()
        self._setup_fonts()

    def _setup_colors(self):
        """从配置中提取并转换颜色"""
        self.color_primary = self._hex_to_rgb_color(
            self.style_config.get('color_primary', '#1E3A8A')
        )
        self.color_secondary = self._hex_to_rgb_color(
            self.style_config.get('color_secondary', '#3B82F6')
        )
        self.color_background = self._hex_to_rgb_color(
            self.style_config.get('color_background', '#FFFFFF')
        )
        self.color_text = self._hex_to_rgb_color(
            self.style_config.get('color_text', '#1F2937')
        )
        self.color_accent = self._hex_to_rgb_color(
            self.style_config.get('color_accent', '#DBEAFE')
        )

    def _setup_fonts(self):
        """从配置中提取字体设置"""
        self.font_title = self.style_config.get('font_title', '微软雅黑')
        self.font_title_size = self.style_config.get('font_title_size', 44)
        self.font_title_bold = self.style_config.get('font_title_bold', True)

        self.font_body = self.style_config.get('font_body', '微软雅黑')
        self.font_body_size = self.style_config.get('font_body_size', 24)
        self.font_body_bold = self.style_config.get('font_body_bold', False)

    def _hex_to_rgb_color(self, hex_color: str) -> RGBColor:
        """将十六进制颜色转换为 RGBColor 对象"""
        r, g, b = self._hex_to_rgb(hex_color)
        return RGBColor(r, g, b)

    def create_presentation(self) -> None:
        """创建新的演示文稿"""
        self.prs = Presentation()
        # 设置 16:9 宽高比
        self.prs.slide_width = Inches(10)
        self.prs.slide_height = Inches(5.625)
        logger.info("创建新的 PPT 演示文稿 (16:9)")

    def add_slide(self, page_data: Dict[str, Any], content: Dict[str, Any]) -> Any:
        """
        根据页面类型添加幻灯片

        Args:
            page_data: 页面数据
            content: 详细内容

        Returns:
            添加的幻灯片对象
        """
        page_type = page_data.get('type', 'content')
        logger.debug(f"添加幻灯片: index={page_data['index']}, type={page_type}")

        if page_type == 'cover':
            return self._create_cover_slide(page_data, content)
        elif page_type == 'section':
            return self._create_section_slide(page_data, content)
        elif page_type in ['content', 'toc']:
            return self._create_content_slide(page_data, content)
        else:
            # 默认使用内容页布局
            return self._create_content_slide(page_data, content)

    def _create_cover_slide(self, page_data: Dict[str, Any], content: Dict[str, Any]) -> Any:
        """
        创建封面页

        布局: 标题居中、副标题居中、背景渐变
        """
        # 使用空白布局
        blank_layout = self.prs.slide_layouts[6]
        slide = self.prs.slides.add_slide(blank_layout)

        # 设置背景色
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.color_primary

        # 添加主标题
        title_text = content.get('title', page_data.get('title', ''))
        title_box = slide.shapes.add_textbox(
            Inches(1), Inches(2), Inches(8), Inches(1)
        )
        title_frame = title_box.text_frame
        title_frame.text = title_text
        title_paragraph = title_frame.paragraphs[0]
        title_paragraph.alignment = PP_PARAGRAPH_ALIGNMENT.CENTER
        title_paragraph.font.name = self.font_title
        title_paragraph.font.size = Pt(self.font_title_size)
        title_paragraph.font.bold = True
        title_paragraph.font.color.rgb = RGBColor(255, 255, 255)

        # 添加副标题
        subtitle_text = content.get('subtitle', page_data.get('subtitle', ''))
        if subtitle_text:
            subtitle_box = slide.shapes.add_textbox(
                Inches(1), Inches(3.2), Inches(8), Inches(0.8)
            )
            subtitle_frame = subtitle_box.text_frame
            subtitle_frame.text = subtitle_text
            subtitle_paragraph = subtitle_frame.paragraphs[0]
            subtitle_paragraph.alignment = PP_PARAGRAPH_ALIGNMENT.CENTER
            subtitle_paragraph.font.name = self.font_body
            subtitle_paragraph.font.size = Pt(self.font_body_size)
            subtitle_paragraph.font.color.rgb = RGBColor(220, 220, 220)

        logger.info(f"封面页创建成功: {title_text}")
        return slide

    def _create_section_slide(self, page_data: Dict[str, Any], content: Dict[str, Any]) -> Any:
        """
        创建章节页

        布局: 大标题居中、背景渐变
        """
        blank_layout = self.prs.slide_layouts[6]
        slide = self.prs.slides.add_slide(blank_layout)

        # 设置背景色 (使用辅助色)
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.color_secondary

        # 添加章节标题
        title_text = content.get('title', page_data.get('title', ''))
        title_box = slide.shapes.add_textbox(
            Inches(1), Inches(2.2), Inches(8), Inches(1.2)
        )
        title_frame = title_box.text_frame
        title_frame.text = title_text
        title_paragraph = title_frame.paragraphs[0]
        title_paragraph.alignment = PP_PARAGRAPH_ALIGNMENT.CENTER
        title_paragraph.font.name = self.font_title
        title_paragraph.font.size = Pt(self.font_title_size)
        title_paragraph.font.bold = True
        title_paragraph.font.color.rgb = RGBColor(255, 255, 255)

        logger.info(f"章节页创建成功: {title_text}")
        return slide

    def _create_content_slide(self, page_data: Dict[str, Any], content: Dict[str, Any]) -> Any:
        """
        创建内容页

        布局: 标题 + 要点列表
        """
        blank_layout = self.prs.slide_layouts[6]
        slide = self.prs.slides.add_slide(blank_layout)

        # 设置背景色
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.color_background

        # 添加标题
        title_text = content.get('title', page_data.get('title', ''))
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.4), Inches(9), Inches(0.8)
        )
        title_frame = title_box.text_frame
        title_frame.text = title_text
        title_paragraph = title_frame.paragraphs[0]
        title_paragraph.font.name = self.font_title
        title_paragraph.font.size = Pt(36)
        title_paragraph.font.bold = True
        title_paragraph.font.color.rgb = self.color_primary

        # 添加分隔线
        line = slide.shapes.add_shape(
            1,  # Line shape
            Inches(0.5), Inches(1.1), Inches(9), Inches(0)
        )
        line.line.color.rgb = self.color_accent
        line.line.width = Pt(2)

        # 添加要点列表
        bullets = content.get('bullets', page_data.get('bullets', []))
        if bullets:
            content_box = slide.shapes.add_textbox(
                Inches(0.8), Inches(1.5), Inches(8.4), Inches(3.5)
            )
            text_frame = content_box.text_frame
            text_frame.word_wrap = True

            for i, bullet in enumerate(bullets):
                if i == 0:
                    # 第一个要点使用现有的段落
                    p = text_frame.paragraphs[0]
                else:
                    # 后续要点添加新段落
                    p = text_frame.add_paragraph()

                p.text = bullet
                p.level = 0
                p.font.name = self.font_body
                p.font.size = Pt(self.font_body_size)
                p.font.color.rgb = self.color_text
                p.space_before = Pt(12)
                p.space_after = Pt(12)

        logger.info(f"内容页创建成功: {title_text}, {len(bullets)} 个要点")
        return slide

    def save(self, output_path: str) -> None:
        """保存 PPT 文件"""
        if self.prs is None:
            raise ValueError("演示文稿未创建,请先调用 create_presentation()")

        self.prs.save(output_path)
        logger.info(f"PPT 保存成功: {output_path}")

    def get_slide_count(self) -> int:
        """获取幻灯片数量"""
        if self.prs is None:
            return 0
        return len(self.prs.slides)

    def set_slide_background_image(self, slide: Any, image_data: bytes) -> None:
        """
        为幻灯片设置背景图片

        Args:
            slide: 幻灯片对象
            image_data: 图片二进制数据
        """
        try:
            # 创建图片流
            image_stream = io.BytesIO(image_data)

            # 添加图片到幻灯片（全屏铺满）
            left = Inches(0)
            top = Inches(0)
            width = self.prs.slide_width
            height = self.prs.slide_height

            pic = slide.shapes.add_picture(image_stream, left, top, width=width, height=height)

            # 将图片移到最底层（作为背景）
            slide.shapes._spTree.remove(pic._element)
            slide.shapes._spTree.insert(2, pic._element)

            logger.info("背景图片设置成功")
        except Exception as e:
            logger.error(f"设置背景图片失败: {e}")
            raise

    def add_fullpage_image_slide(self, image_data: bytes) -> Any:
        """
        添加一个完整的图片页面（图片作为整个页面的内容）

        Args:
            image_data: 图片二进制数据

        Returns:
            添加的幻灯片对象
        """
        try:
            # 使用空白布局
            blank_layout = self.prs.slide_layouts[6]
            slide = self.prs.slides.add_slide(blank_layout)

            # 添加全屏图片
            image_stream = io.BytesIO(image_data)
            left = Inches(0)
            top = Inches(0)
            width = self.prs.slide_width
            height = self.prs.slide_height

            slide.shapes.add_picture(image_stream, left, top, width=width, height=height)

            logger.info("完整图片页面添加成功")
            return slide
        except Exception as e:
            logger.error(f"添加完整图片页面失败: {e}")
            raise
