
import requests
import json
import time

url = "http://127.0.0.1:5000/api/ai/enhance-job-description"
payload = {
    "job_title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Wrote code and fixed bugs."
}

print(f"Testing {url} with gemini-1.5-flash...")
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "description" in data:
            print("SUCCESS: AI responding correctly via new model.")
        else:
            print("FAILURE: Invalid response format.")
            print(json.dumps(data, indent=2))
    elif response.status_code == 429:
        print("FAILURE: Still hitting Rate Limit (429).")
        print(response.text)
    else:
        print(f"FAILURE: Status {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Error: {e}")
