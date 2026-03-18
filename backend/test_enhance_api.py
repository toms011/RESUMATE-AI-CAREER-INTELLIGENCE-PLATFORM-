
import requests
import json

url = "http://127.0.0.1:5000/api/ai/enhance-job-description"
payload = {
    "job_title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Wrote code and fixed bugs."
}

try:
    print(f"Testing {url}...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
