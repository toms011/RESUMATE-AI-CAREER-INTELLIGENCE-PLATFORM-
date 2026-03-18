
import requests
import time

def test_add_resume():
    # 1. Register a user first to get an ID
    register_url = "http://127.0.0.1:5000/register"
    unique_email = f"resume_test_{int(time.time())}@example.com"
    user_payload = {
        "username": "Resume Creator",
        "email": unique_email,
        "password": "password123"
    }
    
    print(f"1. Registering user: {unique_email}")
    try:
        reg_resp = requests.post(register_url, json=user_payload)
        print(f"   Register Status: {reg_resp.status_code}")
        
        # We need to get the user ID. 
        # The register endpoint returns {"message": "User registered successfully!"} but NOT the ID (unless I changed it).
        # Wait, I added print logs to backend but didn't change the return JSON to include ID (I only printed it to console).
        # BUT, login returns the user object with ID.
        
        # 2. Login to get ID
        login_url = "http://127.0.0.1:5000/login"
        login_payload = {"email": unique_email, "password": "password123"}
        print(f"2. Logging in...")
        login_resp = requests.post(login_url, json=login_payload)
        print(f"   Login Status: {login_resp.status_code}")
        
        if login_resp.status_code == 200:
            user_data = login_resp.json().get('user', {})
            user_id = user_data.get('id')
            print(f"   Got User ID: {user_id}")
            
            # 3. Add Resume
            add_url = "http://127.0.0.1:5000/add_resume"
            resume_payload = {
                "user_id": user_id,
                "title": "Scripted Resume"
            }
            print(f"3. Adding Resume with payload: {resume_payload}")
            add_resp = requests.post(add_url, json=resume_payload)
            print(f"   Add Resume Status: {add_resp.status_code}")
            print(f"   Response: {add_resp.text}")
        else:
            print("   Login failed, cannot proceed.")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_add_resume()
