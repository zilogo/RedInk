"""
PPT生成 API 路由

提供PPT大纲生成、样式解析、PPT生成、文件下载等接口。
"""

import logging
import json
import os
from pathlib import Path
from flask import Blueprint, request, jsonify, Response, send_file
from ..services.ppt_service import get_ppt_service

logger = logging.getLogger(__name__)

# 获取项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent

# 创建蓝图
ppt_bp = Blueprint('ppt', __name__, url_prefix='/api/ppt')


def _format_sse(event: str, data: dict) -> str:
    """格式化SSE消息"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@ppt_bp.route('/outline', methods=['POST'])
def generate_outline():
    """
    生成PPT大纲

    Request Body:
    {
        "topic": "PPT主题",
        "user_content": "用户提供的内容(可选)",
        "page_count": 15
    }

    Response:
    {
        "success": true,
        "outline": {
            "topic": "...",
            "pages": [...]
        }
    }
    """
    try:
        data = request.json
        topic = data.get('topic', '').strip()
        user_content = data.get('user_content', '').strip() or None
        page_count = data.get('page_count', 15)

        # 参数验证
        if not topic:
            return jsonify({
                "success": False,
                "error": "参数错误: topic 不能为空"
            }), 400

        # 调用服务
        ppt_service = get_ppt_service()
        result = ppt_service.generate_outline(topic, user_content, page_count)

        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        logger.error(f"大纲生成接口异常: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500


@ppt_bp.route('/parse-style', methods=['POST'])
def parse_style():
    """
    解析样式描述

    Request Body:
    {
        "style_description": "商务风格,蓝色主色调...",
        "topic": "PPT主题"
    }

    Response:
    {
        "success": true,
        "style_config": {...}
    }
    """
    try:
        data = request.json
        style_description = data.get('style_description', '').strip() or None
        topic = data.get('topic', '').strip()

        if not topic:
            return jsonify({
                "success": False,
                "error": "参数错误: topic 不能为空"
            }), 400

        # 调用服务
        ppt_service = get_ppt_service()
        result = ppt_service.parse_style_description(style_description, topic)

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"样式解析接口异常: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500


@ppt_bp.route('/generate', methods=['POST'])
def generate_ppt():
    """
    生成PPT文件 (SSE流式传输)

    Request Body:
    {
        "outline": {
            "topic": "...",
            "pages": [...]
        },
        "style_config": {...},
        "logo_base64": "data:image/png;base64,..." (可选)
    }

    Response: SSE事件流
    - event: start
    - event: content_progress
    - event: content_complete
    - event: layout_progress
    - event: page_complete
    - event: error
    - event: finish
    """
    try:
        data = request.json
        outline = data.get('outline', {})
        style_config = data.get('style_config', {})
        logo_base64 = data.get('logo_base64')

        # 参数验证
        if not outline or not outline.get('pages'):
            return jsonify({
                "success": False,
                "error": "参数错误: outline 不能为空"
            }), 400

        # 调用服务生成器
        ppt_service = get_ppt_service()

        def generate_stream():
            """生成SSE事件流"""
            try:
                for event_data in ppt_service.generate_ppt(outline, style_config, logo_base64):
                    event = event_data.get('event', 'message')
                    data = event_data.get('data', {})
                    yield _format_sse(event, data)

            except Exception as e:
                logger.error(f"PPT生成流异常: {str(e)}", exc_info=True)
                yield _format_sse('error', {"error": str(e)})

        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )

    except Exception as e:
        logger.error(f"PPT生成接口异常: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500


@ppt_bp.route('/download/<ppt_id>', methods=['GET'])
def download_ppt(ppt_id: str):
    """
    下载PPT文件

    Args:
        ppt_id: PPT任务ID

    Response:
        .pptx 文件
    """
    try:
        # 构建文件路径(使用绝对路径)
        ppt_path = PROJECT_ROOT / "history" / ppt_id / "presentation.pptx"

        if not ppt_path.exists():
            return jsonify({
                "success": False,
                "error": f"PPT文件不存在: {ppt_id}"
            }), 404

        # 发送文件
        return send_file(
            ppt_path,
            mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation',
            as_attachment=True,
            download_name=f"{ppt_id}.pptx"
        )

    except Exception as e:
        logger.error(f"PPT下载接口异常: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500


@ppt_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "success": True,
        "service": "ppt",
        "status": "running"
    }), 200
