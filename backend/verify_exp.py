
import requests
import json
import time

url = "http://127.0.0.1:5000/api/ai/enhance-job-description"
payload = {
    "job_title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Wrote code and fixed bugs."
}

print(f"Testing {url} with gemini-2.0-flash-exp...")
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Response:", json.dumps(data, indent=2))
        if "description" in data:
            print("SUCCESS: AI responding correctly via gemini-2.0-flash-exp.")
        else:
            print("FAILURE: Invalid response format.")
    else:
        print(f"FAILURE: Status {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Error: {e}")
