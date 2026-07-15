from flask import Flask, jsonify, request
from ollama import Client
import os
import json
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError

app = Flask(__name__)
client = Client()

NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
DEFAULT_NVIDIA_MODEL = os.getenv('NVIDIA_MODEL', 'meta/llama-3.1-70b-instruct')
DEFAULT_OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5-coder:3b')


def nvidia_enabled():
    return bool(os.getenv('NVIDIA_API_KEY', '').strip())


def call_nvidia(prompt, model=None):
    api_key = os.getenv('NVIDIA_API_KEY', '').strip()
    if not api_key:
        raise RuntimeError('NVIDIA_API_KEY no configurada')

    payload = {
        'model': model or DEFAULT_NVIDIA_MODEL,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.3,
    }
    data = json.dumps(payload).encode('utf-8')
    req = urlrequest.Request(
        NVIDIA_API_URL,
        data=data,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )

    try:
        with urlrequest.urlopen(req, timeout=60) as response:
            body = response.read().decode('utf-8')
    except HTTPError as error:
        detail = error.read().decode('utf-8', errors='ignore') if error.fp else str(error)
        raise RuntimeError(f'Error HTTP NVIDIA: {error.code} {detail}') from error
    except URLError as error:
        raise RuntimeError(f'No se pudo conectar con NVIDIA: {error.reason}') from error

    parsed = json.loads(body)
    return (parsed.get('choices') or [{}])[0].get('message', {}).get('content', '').strip()


def call_ollama(prompt, model=None):
    response = client.generate(
        model=model or DEFAULT_OLLAMA_MODEL,
        prompt=prompt,
        stream=False,
    )
    return response.get('response', '').strip()

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
    prompt = str(data.get('prompt', '')).strip()
    provider = str(data.get('provider', 'auto')).strip().lower()
    model = str(data.get('model', '')).strip() or None

    if not prompt:
        return jsonify({'error': 'Prompt vacío'}), 400

    try:
        if provider == 'nvidia':
            reply = call_nvidia(prompt, model)
            return jsonify({'reply': reply, 'provider': 'nvidia'})

        if provider == 'ollama':
            reply = call_ollama(prompt, model)
            return jsonify({'reply': reply, 'provider': 'ollama'})

        if nvidia_enabled():
            try:
                reply = call_nvidia(prompt, model)
                return jsonify({'reply': reply, 'provider': 'nvidia'})
            except Exception:
                # En auto hacemos fallback a Ollama si NVIDIA falla.
                pass

        reply = call_ollama(prompt, model)
        return jsonify({'reply': reply, 'provider': 'ollama'})
    except Exception as error:
        return jsonify({'error': str(error)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
