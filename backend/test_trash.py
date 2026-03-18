import requests

try:
    print("Listing resumes...")
    r = requests.get('http://127.0.0.1:5000/resumes?user_id=1')
    print(r.status_code, r.text)
    
    data = r.json()
    resumes = data.get('resumes', [])
    if not resumes:
        print("No resumes found to delete.")
        # Create one
        print("Creating a test resume...")
        r = requests.post('http://127.0.0.1:5000/add_resume', json={"user_id": 1, "title": "Test Resume"})
        print(r.status_code, r.text)
        resume_id = r.json()['resume_id']
    else:
        resume_id = resumes[0]['id']
        
    print(f"Attempting to trash resume {resume_id}...")
    r = requests.patch(f'http://127.0.0.1:5000/resumes/{resume_id}/trash')
    print(r.status_code)
    print(r.text)

except Exception as e:
    print(f"Error: {e}")
