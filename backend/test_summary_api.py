
import requests
import json
import time

# Correct Request URL including /api/ai prefix
url = "http://127.0.0.1:5000/api/ai/generate-summary"
payload = {
    "full_name": "Test User",
    "job_title": "Software Engineer",
    "experience_years": 5,
    "skills": ["Python", "Flask", "React", "AI"]
}

try:
    print(f"Testing {url}...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
