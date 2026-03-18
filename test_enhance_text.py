
import requests
import json

url = "http://127.0.0.1:5000/api/ai/enhance-text"

tests = [
    {"text": "Volunteer at dog shelter", "context_type": "Activity/Volunteering"},
    {"text": "Employee of the month", "context_type": "Award"},
    {"text": "React Certification", "context_type": "Certification"}
]

for t in tests:
    print(f"\n--- Testing: {t['text']} ({t['context_type']}) ---")
    try:
        response = requests.post(url, json=t)
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.status_code, response.text)
    except Exception as e:
        print("Request failed:", e)
