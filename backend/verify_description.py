
import requests
import json

url = "http://127.0.0.1:5000/api/ai/enhance-job-description"
payload = {
    "job_title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Wrote code and fixed bugs."
}

print(f"Testing {url}...")
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    
    data = response.json()
    print("Response Keys:", data.keys())
    
    if "description" in data and isinstance(data["description"], str) and len(data["description"]) > 0:
        print("SUCCESS: 'description' found and is valid string.")
        print("Preview:", data["description"][:50] + "...")
    else:
        print("FAILURE: 'description' missing or invalid.")
        print("Full Response:", json.dumps(data, indent=2))

except Exception as e:
    print(f"Error: {e}")
