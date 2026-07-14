import os
from pathlib import Path
from dotenv import dotenv_values
import google.generativeai as genai

BASE_DIR = Path(__file__).resolve().parent
config = dotenv_values(BASE_DIR / ".env")
api_key = (os.getenv("GEMINI_API_KEY") or config.get("GEMINI_API_KEY", "")).strip()

if not api_key or api_key == "TU_API_KEY_AQUI":
    raise ValueError("Añade tu clave real en el archivo .env")

genai.configure(api_key=api_key)

model = genai.GenerativeModel("gemini-2.0-flash")
response = model.generate_content("Responde en una frase corta: ¿qué es Gemini?")
print(response.text)
