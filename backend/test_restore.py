import requests

try:
    print("Listing trash resumes...")
    r = requests.get('http://127.0.0.1:5000/resumes/trash?user_id=1')
    print(r.status_code, r.text)
    
    data = r.json()
    resumes = data.get('resumes', [])
    if not resumes:
        print("No resumes in trash to restore.")
    else:
        resume_id = resumes[0]['id']
        print(f"Attempting to restore resume {resume_id}...")
        r = requests.patch(f'http://127.0.0.1:5000/resumes/{resume_id}/restore')
        print(r.status_code)
        print(r.text)

except Exception as e:
    print(f"Error: {e}")
