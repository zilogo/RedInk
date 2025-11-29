"""
PPT生成核心服务

负责协调大纲生成、样式解析、内容扩展和PPT文件生成的整个流程。
"""

import logging
import json
import uuid
import os
import re
import yaml
from pathlib import Path
from typing import Dict, Any, List, Optional, Generator
from ..utils.text_client import get_text_chat_client
from ..generators.pptx_generator import PythonPptxGenerator
from .ppt_image_service import PptImageService

logger = logging.getLogger(__name__)


class PptService:
    """PPT生成服务"""

    def __init__(self):
        self.output_dir = Path("history")
        self.output_dir.mkdir(exist_ok=True)
        self.prompts_dir = Path("backend/prompts")
        self.text_config = self._load_text_config()
        self.client = self._get_client()

    def _load_text_config(self) -> dict:
        """加载文本生成配置"""
        config_path = Path(__file__).parent.parent.parent / 'text_providers.yaml'

        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    return yaml.safe_load(f) or {}
            except yaml.YAMLError as e:
                logger.error(f"文本配置 YAML 解析失败: {e}")
                raise ValueError(f"文本配置文件格式错误: {e}")

        # 默认配置
        return {
            'active_provider': 'google_gemini',
            'providers': {
                'google_gemini': {
                    'type': 'google_gemini',
                    'model': 'gemini-2.0-flash-exp',
                    'temperature': 1.0,
                    'max_output_tokens': 8000
                }
            }
        }

    def _get_client(self):
        """根据配置获取客户端"""
        active_provider = self.text_config.get('active_provider', 'google_gemini')
        providers = self.text_config.get('providers', {})

        if not providers:
            raise ValueError("未找到任何文本生成服务商配置")

        if active_provider not in providers:
            raise ValueError(f"激活的服务商 '{active_provider}' 未在配置中找到")

        provider_config = providers[active_provider]
        return get_text_chat_client(provider_config)

    def _load_prompt(self, prompt_name: str) -> str:
        """加载 Prompt 模板"""
        prompt_path = self.prompts_dir / prompt_name
        if not prompt_path.exists():
            logger.error(f"Prompt 文件不存在: {prompt_path}")
            raise FileNotFoundError(f"Prompt 文件不存在: {prompt_name}")

        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()

    def generate_outline(
        self,
        topic: str,
        user_content: Optional[str] = None,
        page_count: int = 15
    ) -> Dict[str, Any]:
        """
        生成PPT大纲

        Args:
            topic: PPT主题
            user_content: 用户提供的内容(可选)
            page_count: 建议页数

        Returns:
            包含 topic 和 pages 列表的字典
        """
        logger.info(f"开始生成PPT大纲: topic={topic}, page_count={page_count}")

        try:
            # 加载 Prompt 模板
            prompt_template = self._load_prompt('ppt_outline_prompt.txt')

            # 填充变量
            prompt = prompt_template.format(
                topic=topic,
                user_content=user_content or "请根据主题自由发挥,设计专业且有深度的内容",
                page_count=page_count
            )

            # 从配置中获取模型参数
            active_provider = self.text_config.get('active_provider', 'google_gemini')
            providers = self.text_config.get('providers', {})
            provider_config = providers.get(active_provider, {})

            model = provider_config.get('model', 'gemini-2.0-flash-exp')
            temperature = provider_config.get('temperature', 1.0)
            max_output_tokens = provider_config.get('max_output_tokens', 8000)

            logger.info(f"调用文本生成 API: model={model}, temperature={temperature}")

            # 调用文本生成AI
            response = self.client.generate_text(
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_output_tokens=max_output_tokens
            )

            # 解析大纲
            pages = self._parse_outline_response(response)

            logger.info(f"大纲生成成功,共 {len(pages)} 页")
            return {
                "success": True,
                "outline": {
                    "topic": topic,
                    "pages": pages
                }
            }

        except Exception as e:
            logger.error(f"大纲生成失败: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": f"大纲生成异常: {str(e)}"
            }

    def _parse_outline_response(self, response: str) -> List[Dict[str, Any]]:
        """
        解析AI返回的大纲XML格式

        示例输入:
        <page index="0" type="cover">
        标题: AI在教育中的应用
        副标题: 探索未来教育
        </page>
        """
        pages = []

        # 使用正则表达式提取每个 <page> 块
        page_pattern = r'<page\s+index="(\d+)"\s+type="(\w+)">(.*?)</page>'
        matches = re.findall(page_pattern, response, re.DOTALL)

        for match in matches:
            index, page_type, content = match
            index = int(index)

            page = {
                "index": index,
                "type": page_type,
                "layout": self._infer_layout(page_type)
            }

            # 解析内容
            content = content.strip()

            # 提取标题
            title_match = re.search(r'标题:\s*(.+?)(?:\n|$)', content)
            if title_match:
                page['title'] = title_match.group(1).strip()

            # 提取副标题 (仅封面页)
            if page_type == 'cover':
                subtitle_match = re.search(r'副标题:\s*(.+?)(?:\n|$)', content)
                if subtitle_match:
                    page['subtitle'] = subtitle_match.group(1).strip()

            # 提取要点列表
            bullets_match = re.search(r'要点:(.*)', content, re.DOTALL)
            if bullets_match:
                bullets_text = bullets_match.group(1).strip()
                # 按行分割并提取以 - 或 • 开头的行
                bullets = []
                for line in bullets_text.split('\n'):
                    line = line.strip()
                    if line.startswith('-') or line.startswith('•'):
                        bullet = line.lstrip('-•').strip()
                        if bullet:
                            bullets.append(bullet)
                if bullets:
                    page['bullets'] = bullets

            pages.append(page)

        logger.debug(f"解析大纲成功,共 {len(pages)} 页")
        return pages

    def _infer_layout(self, page_type: str) -> str:
        """根据页面类型推断布局类型"""
        layout_map = {
            'cover': 'title_slide',
            'toc': 'title_and_bullets',
            'section': 'section_header',
            'content': 'title_and_bullets',
            'summary': 'title_and_bullets',
            'thankyou': 'title_slide'
        }
        return layout_map.get(page_type, 'title_and_bullets')

    def parse_style_description(
        self,
        style_description: Optional[str],
        topic: str
    ) -> Dict[str, Any]:
        """
        解析用户的样式描述或AI推荐样式

        Args:
            style_description: 用户的样式描述(可选)
            topic: PPT主题

        Returns:
            样式配置字典
        """
        logger.info(f"解析样式描述: {style_description or '未提供,使用AI推荐'}")

        try:
            # 加载 Prompt 模板
            prompt_template = self._load_prompt('ppt_style_prompt.txt')

            # 填充变量
            prompt = prompt_template.format(
                style_description=style_description or "请根据主题推荐合适的样式",
                topic=topic
            )

            # 从配置中获取模型参数
            active_provider = self.text_config.get('active_provider', 'google_gemini')
            providers = self.text_config.get('providers', {})
            provider_config = providers.get(active_provider, {})

            model = provider_config.get('model', 'gemini-2.0-flash-exp')
            temperature = provider_config.get('temperature', 1.0)
            max_output_tokens = provider_config.get('max_output_tokens', 8000)

            logger.info(f"调用文本生成 API: model={model}, temperature={temperature}")

            # 调用文本生成AI
            response = self.client.generate_text(
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_output_tokens=max_output_tokens
            )

            # 解析JSON配置
            # 提取JSON部分 (可能被Markdown代码块包裹)
            json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 尝试直接解析
                json_str = response

            style_config = json.loads(json_str)

            logger.info(f"样式解析成功: theme_id={style_config.get('theme_id')}")
            return {
                "success": True,
                "style_config": style_config
            }

        except Exception as e:
            logger.error(f"样式解析失败: {str(e)}", exc_info=True)
            # 返回默认配置
            return {
                "success": True,
                "style_config": self._get_default_style_config()
            }

    def _get_default_style_config(self) -> Dict[str, Any]:
        """获取默认样式配置"""
        return {
            "theme_id": "business-blue",
            "color_primary": "#1E3A8A",
            "color_secondary": "#3B82F6",
            "color_background": "#FFFFFF",
            "color_text": "#1F2937",
            "color_accent": "#DBEAFE",
            "font_title": "微软雅黑",
            "font_title_size": 44,
            "font_title_bold": True,
            "font_body": "微软雅黑",
            "font_body_size": 24,
            "font_body_bold": False,
            "logo_position": "bottom-right",
            "logo_size": "medium",
            "layout_preferences": [
                "prefer_bullets_over_paragraphs",
                "use_clean_backgrounds",
                "minimal_decorations"
            ],
            "layout_ai_freestyle": True
        }

    def generate_ppt(
        self,
        outline: Dict[str, Any],
        style_config: Dict[str, Any],
        logo_base64: Optional[str] = None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        生成PPT文件 (生成器函数,支持SSE流式传输)

        Args:
            outline: PPT大纲
            style_config: 样式配置
            logo_base64: Logo图片的Base64编码（可选）

        Yields:
            SSE事件字典
        """
        ppt_id = f"ppt_{uuid.uuid4().hex[:8]}"
        topic = outline.get('topic', 'PPT演示文稿')
        pages = outline.get('pages', [])

        logger.info(f"开始生成PPT: ppt_id={ppt_id}, pages={len(pages)}, has_logo={bool(logo_base64)}")

        try:
            # 创建输出目录
            ppt_dir = self.output_dir / ppt_id
            ppt_dir.mkdir(parents=True, exist_ok=True)

            # 初始化生成器
            generator = PythonPptxGenerator(style_config)
            generator.create_presentation()

            # 初始化图片生成服务（默认启用以提升美观度）
            image_service = None
            try:
                image_service = PptImageService()
                if logo_base64:
                    logger.info("图片生成服务已启用（检测到Logo）")
                else:
                    logger.info("图片生成服务已启用（无Logo，使用纯背景图片）")
            except Exception as e:
                logger.warning(f"图片生成服务初始化失败，将使用纯文本PPT: {e}")
                image_service = None

            # 发送开始事件
            yield {
                "event": "start",
                "data": {
                    "ppt_id": ppt_id,
                    "total_pages": len(pages)
                }
            }

            # 逐页生成
            for page in pages:
                index = page['index']
                page_type = page['type']
                title = page.get('title', '')

                # Step 1: 生成页面详细内容
                yield {
                    "event": "content_progress",
                    "data": {
                        "index": index,
                        "status": "generating_content",
                        "title": title
                    }
                }

                # 扩展页面内容
                detailed_content = self._expand_page_content(page, topic, outline)

                yield {
                    "event": "content_complete",
                    "data": {
                        "index": index,
                        "content": detailed_content
                    }
                }

                # Step 2: 应用布局并生成幻灯片
                yield {
                    "event": "layout_progress",
                    "data": {
                        "index": index,
                        "status": "applying_layout",
                        "layout": page.get('layout', 'title_and_bullets')
                    }
                }

                try:
                    # 如果启用了图片生成服务，则生成带图片的页面
                    if image_service:
                        # 判断是否使用完整页面设计
                        if image_service.should_use_fullpage(page_type):
                            # 生成完整页面设计图片
                            logger.info(f"页面 {index} 使用完整页面设计模式")
                            yield {
                                "event": "image_progress",
                                "data": {
                                    "index": index,
                                    "status": "generating_fullpage_image",
                                    "title": title
                                }
                            }

                            image_data = image_service.generate_page_image(
                                page_data=page,
                                style_config=style_config,
                                user_topic=topic,
                                logo_base64=logo_base64,
                                image_type='fullpage',
                                aspect_ratio='16:9'
                            )

                            # 添加完整图片页面
                            slide = generator.add_fullpage_image_slide(image_data)
                            logger.info(f"页面 {index} 完整图片生成成功")
                        else:
                            # 生成背景图片 + 文字内容
                            logger.info(f"页面 {index} 使用背景图片模式")
                            yield {
                                "event": "image_progress",
                                "data": {
                                    "index": index,
                                    "status": "generating_background_image",
                                    "title": title
                                }
                            }

                            image_data = image_service.generate_page_image(
                                page_data=page,
                                style_config=style_config,
                                user_topic=topic,
                                logo_base64=logo_base64,
                                image_type='background',
                                aspect_ratio='16:9'
                            )

                            # 先添加页面（文字内容）
                            slide = generator.add_slide(page, detailed_content)
                            # 再设置背景图片
                            generator.set_slide_background_image(slide, image_data)
                            logger.info(f"页面 {index} 背景图片生成成功")
                    else:
                        # 不使用图片，仅生成文字页面
                        slide = generator.add_slide(page, detailed_content)

                    yield {
                        "event": "page_complete",
                        "data": {
                            "index": index,
                            "status": "done",
                            "title": title
                        }
                    }

                except Exception as e:
                    logger.error(f"页面 {index} 生成失败: {str(e)}", exc_info=True)
                    yield {
                        "event": "error",
                        "data": {
                            "index": index,
                            "error": str(e)
                        }
                    }

            # 保存PPT文件
            output_path = ppt_dir / "presentation.pptx"
            generator.save(str(output_path))

            # 发送完成事件
            yield {
                "event": "finish",
                "data": {
                    "ppt_id": ppt_id,
                    "download_url": f"/api/ppt/download/{ppt_id}",
                    "file_path": str(output_path),
                    "total_pages": len(pages),
                    "success_count": generator.get_slide_count()
                }
            }

            logger.info(f"PPT生成完成: {output_path}")

        except Exception as e:
            logger.error(f"PPT生成失败: {str(e)}", exc_info=True)
            yield {
                "event": "error",
                "data": {
                    "error": f"PPT生成异常: {str(e)}"
                }
            }

    def _expand_page_content(
        self,
        page: Dict[str, Any],
        topic: str,
        outline: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        扩展页面详细内容

        对于MVP阶段,直接返回原始内容,不调用AI扩展
        """
        # MVP: 直接使用原始数据
        content = {
            "title": page.get('title', ''),
            "subtitle": page.get('subtitle', ''),
            "bullets": page.get('bullets', [])
        }

        return content


# 单例模式
_service_instance = None


def get_ppt_service() -> PptService:
    """获取PPT服务单例"""
    global _service_instance
    if _service_instance is None:
        _service_instance = PptService()
    return _service_instance


def reset_ppt_service():
    """重置PPT服务(配置更新后调用)"""
    global _service_instance
    _service_instance = None
