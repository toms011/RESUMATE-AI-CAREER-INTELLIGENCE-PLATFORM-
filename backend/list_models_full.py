
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

print("--- SEARCHING FOR 1.5/FLASH MODELS ---")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        if '1.5' in m.name or 'flash' in m.name:
            print(f"ID: {m.name} | Display: {m.display_name}")
print("--- END SEARCH ---")
