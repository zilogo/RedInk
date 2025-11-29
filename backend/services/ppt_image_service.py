"""PPT 图片生成服务 - 用于生成 PPT 页面的背景图片或完整设计"""
import logging
import os
import base64
from typing import Dict, Any, Optional, Literal
from backend.config import Config
from backend.generators.factory import ImageGeneratorFactory

logger = logging.getLogger(__name__)


class PptImageService:
    """PPT 图片生成服务类"""

    def __init__(self, provider_name: str = None):
        """
        初始化 PPT 图片生成服务

        Args:
            provider_name: 服务商名称，如果为None则使用配置文件中的激活服务商
        """
        logger.debug("初始化 PptImageService...")

        # 获取服务商配置
        if provider_name is None:
            provider_name = Config.get_active_image_provider()

        logger.info(f"使用图片服务商: {provider_name}")
        provider_config = Config.get_image_provider_config(provider_name)

        # 创建生成器实例
        provider_type = provider_config.get('type', provider_name)
        logger.debug(f"创建生成器: type={provider_type}")
        self.generator = ImageGeneratorFactory.create(provider_type, provider_config)

        # 保存配置信息
        self.provider_name = provider_name
        self.provider_config = provider_config

        # 加载提示词模板
        self.background_template = self._load_prompt_template('ppt_background_prompt.txt')
        self.fullpage_template = self._load_prompt_template('ppt_fullpage_prompt.txt')

        logger.info(f"PptImageService 初始化完成: provider={provider_name}, type={provider_type}")

    def _load_prompt_template(self, filename: str) -> str:
        """加载 Prompt 模板"""
        prompt_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "prompts",
            filename
        )
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning(f"Prompt 模板未找到: {filename}，使用默认模板")
            return self._get_default_template(filename)

    def _get_default_template(self, filename: str) -> str:
        """获取默认模板（当文件不存在时）"""
        if 'background' in filename:
            return """为 PPT 页面生成专业的背景图片。

【页面信息】
- 标题：{page_title}
- 副标题：{page_subtitle}
- 要点：{page_bullets}

【样式要求】
- 主题风格：{theme_id}
- 主色调：{color_primary}
- 辅助色：{color_secondary}

【设计规范】
- 16:9 比例，适合投影展示
- 背景不要过于复杂，留出文字空间
- Logo 要清晰可见但不喧宾夺主
- 整体风格与主题保持一致

{logo_instruction}
"""
        else:
            return """为 PPT 页面生成完整的设计图片（包含文字布局）。

【页面信息】
- 标题：{page_title}
- 副标题：{page_subtitle}
- 要点：{page_bullets}

【样式要求】
- 主题风格：{theme_id}
- 主色调：{color_primary}
- 辅助色：{color_secondary}

【设计规范】
- 16:9 比例，适合投影展示
- 包含完整的文字排版和视觉元素
- Logo 位置：{logo_position}
- 整体风格专业、现代

{logo_instruction}
"""

    def generate_page_image(
        self,
        page_data: Dict[str, Any],
        style_config: Dict[str, Any],
        user_topic: str,
        logo_base64: Optional[str] = None,
        image_type: Literal['background', 'fullpage'] = 'background',
        aspect_ratio: str = '16:9'
    ) -> bytes:
        """
        生成单个页面的图片

        Args:
            page_data: 页面数据，包含 title, subtitle, bullets 等
            style_config: 样式配置，包含颜色、字体、主题等
            user_topic: PPT 主题
            logo_base64: Logo 图片的 Base64 编码（可选）
            image_type: 图片类型，'background' 为背景图，'fullpage' 为完整页面设计
            aspect_ratio: 图片比例，默认 16:9

        Returns:
            图片的二进制数据
        """
        # 选择模板
        template = self.background_template if image_type == 'background' else self.fullpage_template

        # 准备页面信息
        page_title = page_data.get('title', '')
        page_subtitle = page_data.get('subtitle', '')
        page_bullets = '\n'.join([f"- {bullet}" for bullet in page_data.get('bullets', [])])
        page_type = page_data.get('type', 'content')

        # 准备样式信息
        theme_id = style_config.get('theme_id', 'business-blue')
        color_primary = style_config.get('color_primary', '#1E3A8A')
        color_secondary = style_config.get('color_secondary', '#3B82F6')
        color_background = style_config.get('color_background', '#FFFFFF')
        logo_position = style_config.get('logo_position', 'bottom-right')
        logo_size = style_config.get('logo_size', 'medium')

        # Logo 指令
        if logo_base64:
            logo_instruction = f"""
【Logo 要求】
- 位置：{logo_position}（右下角/左上角/居中底部）
- 大小：{logo_size}（小/中/大）
- 用户已提供 Logo 图片，请自然融入设计中，保持清晰可见
"""
        else:
            logo_instruction = "【Logo 要求】\n- 无需添加 Logo"

        # 构建 prompt
        prompt = template.format(
            page_title=page_title,
            page_subtitle=page_subtitle or "无",
            page_bullets=page_bullets or "无",
            page_type=page_type,
            user_topic=user_topic,
            theme_id=theme_id,
            color_primary=color_primary,
            color_secondary=color_secondary,
            color_background=color_background,
            logo_position=logo_position,
            logo_size=logo_size,
            logo_instruction=logo_instruction.strip()
        )

        logger.info(f"生成 PPT 图片: {page_title} ({image_type})")
        logger.debug(f"Prompt: {prompt[:200]}...")

        # 调用图片生成器
        # 如果有 logo，解码并传递
        reference_images = []
        if logo_base64:
            try:
                # 移除 Data URL 前缀（如果有）
                if ',' in logo_base64:
                    logo_base64 = logo_base64.split(',')[1]
                logo_bytes = base64.b64decode(logo_base64)
                reference_images.append(logo_bytes)
            except Exception as e:
                logger.warning(f"Logo 解码失败: {e}，将不使用 Logo")

        # 生成图片
        image_data = self.generator.generate_image(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            reference_images=reference_images if reference_images else None
        )

        return image_data

    def should_use_fullpage(self, page_type: str) -> bool:
        """
        判断是否应该使用完整页面设计（而非背景图）

        Args:
            page_type: 页面类型

        Returns:
            True 表示使用完整页面设计，False 表示使用背景图
        """
        # 封面和章节页使用完整设计，内容页使用背景图
        return page_type in ['cover', 'section', 'thankyou']
