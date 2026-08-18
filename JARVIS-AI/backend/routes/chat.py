from flask import Blueprint, jsonify, request

from services.ai_service import get_ai_response

chat_bp = Blueprint('chat_bp', __name__)


@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Invalid JSON payload.'}), 400

        message = data.get('message') if isinstance(data, dict) else None
        if not message or not str(message).strip():
            return jsonify({'success': False, 'error': 'Message is required.'}), 400

        # Delegate to the service layer which handles API calls and errors
        response_text = get_ai_response(str(message).strip())
        return jsonify({'success': True, 'response': response_text}), 200

    except ValueError as exc:
        # Input validation problems
        return jsonify({'success': False, 'error': str(exc)}), 400
    except RuntimeError as exc:
        # Service-level failures (OpenAI errors, missing config)
        return jsonify({'success': False, 'error': 'JARVIS is temporarily unavailable. Please try again.'}), 503
    except Exception:
        # Unexpected server error
        return jsonify({'success': False, 'error': 'Unexpected server error.'}), 500