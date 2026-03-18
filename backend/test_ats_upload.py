import requests
import os

# Create a dummy resume file
with open('dummy_resume.txt', 'w') as f:
    f.write("John Doe\nSoftware Engineer\nExperience: 5 years in Python and React.\nSkills: Python, JavaScript, React, SQL.")

url = 'http://127.0.0.1:5000/ats/analyze'
files = {'file': open('dummy_resume.txt', 'rb')}

try:
    print("Sending request...")
    r = requests.post(url, files=files)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Error: {e}")
finally:
    files['file'].close()
    if os.path.exists('dummy_resume.txt'):
        os.remove('dummy_resume.txt')
