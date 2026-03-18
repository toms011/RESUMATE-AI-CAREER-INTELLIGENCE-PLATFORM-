
import requests
import time

def test_register():
    url = "http://127.0.0.1:5000/register"
    unique_email = f"test_{int(time.time())}@example.com"
    payload = {
        "username": "Direct Test User",
        "email": unique_email,
        "password": "password123"
    }
    
    print(f"Sending registration request to {url}")
    print(f"Payload: {payload}")
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_register()
