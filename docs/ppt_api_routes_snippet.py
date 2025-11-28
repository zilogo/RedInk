"""
PPT 生成 API 路由代码片段
将这段代码添加到 backend/routes/api.py 文件末尾
"""

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
