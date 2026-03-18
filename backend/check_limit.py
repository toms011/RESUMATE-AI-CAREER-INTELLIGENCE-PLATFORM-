
import requests
import json
import time

url = "http://127.0.0.1:5000/api/ai/improve-skills"
payload = {
    "current_skills": ["Python", "JavaScript", "HTML"],
    "job_title": "Full Stack Engineer"
}

print(f"Testing {url} with gemini-2.0-flash-exp for skills...")
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Response:", json.dumps(data, indent=2))
        if "add_skills" in data or "suggestions" in data or "skills" in data:
            print("SUCCESS: AI responding correctly for skills.")
        else:
            # Depending on how improve_skills returns, might be wrapped
            print("SUCCESS (Available keys found)")
    elif response.status_code == 429:
        print("FAILURE: Rate Limit (429) HIT.")
        print(response.text)
    else:
        print(f"FAILURE: Status {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Error: {e}")
