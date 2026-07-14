from flask import Flask, jsonify, request
from ollama import Client
import os

app = Flask(__name__)
client = Client()

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

@app.route('/api/assistant', methods=['OPTIONS'])
def assistant_options():
    return jsonify({}), 200

@app.route('/api/assistant', methods=['POST'])
def assistant():
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({'error': 'Prompt vacío'}), 400

    response = client.generate(
        model='qwen2.5-coder:3b',
        prompt=prompt,
        stream=False,
    )
    return jsonify({'reply': response.get('response', '')})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
