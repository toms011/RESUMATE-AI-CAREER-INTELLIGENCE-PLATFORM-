
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env variables manually to be sure
load_dotenv('backend/.env')

key1 = os.getenv('GEMINI_API_KEY')
key2 = os.getenv('GEMINI_API_KEY_2')

print(f"Key 1 found: {bool(key1)}")
print(f"Key 2 found: {bool(key2)}")

def test_key(key, name):
    if not key:
        print(f"Skipping {name}: No key provided")
        return False
        
    print(f"\n--- Testing {name} ---")
    try:
        genai.configure(api_key=key)
        model = genai.GenerativeModel("models/gemini-2.5-flash") # Using the model from code
        response = model.generate_content("Say 'Test OK'")
        print(f"Response: {response.text}")
        print("SUCCESS")
        return True
    except Exception as e:
        print(f"FAILURE: {e}")
        return False

k1_status = test_key(key1, "KEY 1")
k2_status = test_key(key2, "KEY 2")

if k2_status and not k1_status:
    print("\nRECOMMENDATION: Key 2 works but Key 1 failed. Swapping is advised.")
elif not k1_status and not k2_status:
    print("\nCRITICAL: Both keys failed.")
else:
    print("\nBoth keys seem operational.")
