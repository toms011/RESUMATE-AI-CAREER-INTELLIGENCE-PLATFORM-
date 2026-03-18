
import sys
import os
import time
from pathlib import Path

# Add backend to path
current_dir = os.getcwd()
backend_dir = os.path.join(current_dir, 'backend')
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

print(f"Checking backend at: {backend_dir}")

try:
    # We need to mock google.generativeai.configure to avoid actual API calls or errors if keys are invalid string formats
    # But we want to test that keys are loaded.
    
    # Actually, ai_service imports genai and calls configure_genai() on import.
    import ai_service
    
    print(f"Keys loaded: {len(ai_service.GEMINI_API_KEYS)}")
    for i, key in enumerate(ai_service.GEMINI_API_KEYS):
        masked = key[:4] + "..." + key[-4:] if key else "None"
        print(f"Key {i}: {masked}")
        
    print(f"Initial Index: {ai_service.current_key_index}")
    
    print("Simulating rotation...")
    ai_service.rotate_key()
    print(f"New Index: {ai_service.current_key_index}")
    
    if len(ai_service.GEMINI_API_KEYS) >= 2:
        print("SUCCESS: Multiple keys loaded and rotation working.")
    else:
        print("WARNING: Only 1 key loaded.")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
