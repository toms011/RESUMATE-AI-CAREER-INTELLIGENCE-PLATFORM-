
import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000/api/ai"

def test_endpoint(name, endpoint, payload):
    print(f"\n--- Testing {name} ---")
    url = f"{BASE_URL}/{endpoint}"
    try:
        start = time.time()
        response = requests.post(url, json=payload)
        duration = time.time() - start
        
        print(f"Status: {response.status_code} (Time: {duration:.2f}s)")
        print(f"Raw Response Text: {response.text[:500]}...") # Print first 500 chars
        
        try:
            data = response.json()
            print("Parsed JSON Keys:", list(data.keys()))
            
            if response.status_code == 200:
                if "error" in data:
                    print(f"🔴 AI RETURNED ERROR: {data['error']}")
                elif "success" in data and data["success"]:
                    print("✅ SUCCESS Flag Present")
                    # Check for specific fields
                    if "description" in data: print(f"   Found 'description' (Length: {len(data['description'])})")
                    if "bullet_points" in data: print(f"   Found 'bullet_points' (Count: {len(data['bullet_points'])})")
                    if "summary" in data: print(f"   Found 'summary' (Length: {len(data['summary'])})")
                    if "add_skills" in data: print(f"   Found 'add_skills' (Count: {len(data['add_skills'])})")
                else:
                     print("⚠️ Valid JSON but missing 'success' or 'error' flag")
            else:
                print("🔴 HTTP Error Status")
                
        except json.JSONDecodeError:
            print("🔴 CRITICAL: Response is NOT valid JSON")
            
    except Exception as e:
        print(f"🔴 EXCEPTION: {e}")

# 1. Enhance Job Description
test_endpoint("Enhance Job Description", "enhance-job-description", {
    "job_title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Fixed bugs and wrote code."
})

# 2. Enhance Education
test_endpoint("Enhance Education", "enhance-education-description", {
    "degree": "B.Sc Computer Science",
    "institution": "University of Tech",
    "description": "Studied algorithms."
})

# 3. Improve Skills
test_endpoint("Improve Skills", "improve-skills", {
    "current_skills": ["Python", "React"],
    "job_title": "Full Stack Developer"
})

# 4. Generate Summary
test_endpoint("Generate Summary", "generate-summary", {
    "full_name": "John Doe",
    "job_title": "Software Engineer",
    "skills": ["Python", "React", "Node.js"],
    "experience_years": "5"
})
