import os
from pathlib import Path
from dotenv import dotenv_values
import requests

BASE_DIR = Path(__file__).resolve().parent
config = dotenv_values(BASE_DIR / ".env")
api_key = (os.getenv("NVIDIA_API_KEY") or config.get("NVIDIA_API_KEY", "")).strip()
model = (os.getenv("NVIDIA_MODEL") or config.get("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")).strip()
prompt = (os.getenv("NVIDIA_PROMPT") or config.get("NVIDIA_PROMPT", "Responde en una frase corta: ¿qué es NVIDIA?")).strip()

if not api_key or api_key == "TU_API_KEY_AQUI":
    raise ValueError("Añade tu clave real de NVIDIA en el archivo .env")

url = "https://integrate.api.nvidia.com/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}
payload = {
    "model": model,
    "messages": [
        {"role": "user", "content": prompt}
    ],
    "temperature": 0.7,
}

response = requests.post(url, headers=headers, json=payload, timeout=60)
response.raise_for_status()
data = response.json()
print(f"Modelo usado: {model}")
print(data["choices"][0]["message"]["content"])
