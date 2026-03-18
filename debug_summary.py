
import requests
import json

url = "http://127.0.0.1:5000/api/ai/generate-summary"

payload = {
    "experience_years": 5,
    "skills": ["Python", "JavaScript", "React"]
    # Missing full_name and job_title to test defaults
}

print(f"Sending POST to {url}...")
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print("Response JSON:")
        print(json.dumps(data, indent=2))
        
        # Mimic Frontend Logic check
        if data.get("error"):
            print("Frontend Check: CAUGHT ERROR -> " + data["error"])
        elif data.get("success") and (data.get("summary") or data.get("professional_summary")):
             print("Frontend Check: SUCCESS")
        else:
             print("Frontend Check: FAILED -> UNEXPECTED AI RESPONSE")
             
    except json.JSONDecodeError:
        print("Failed to decode JSON. Raw text:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
