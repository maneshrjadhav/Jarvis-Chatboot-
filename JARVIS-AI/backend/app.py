from flask import Flask, jsonify
from flask_cors import CORS

from routes.chat import chat_bp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config.from_object('config')

app.register_blueprint(chat_bp)


@app.route('/')
def index():
    return jsonify({'message': 'JARVIS AI backend is running.'}), 200


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'success': True, 'status': 'JARVIS backend online'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
