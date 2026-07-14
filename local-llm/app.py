from ollama import Client

client = Client()

prompt = "Escribe una respuesta corta: ¿qué es Ollama?"
response = client.generate(model='qwen2.5-coder:3b', prompt=prompt)
print(response['response'])
