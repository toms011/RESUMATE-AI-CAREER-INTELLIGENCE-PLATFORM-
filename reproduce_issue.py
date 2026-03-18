
import sys
import os
import json

# Add backend to path
current_dir = os.getcwd()
backend_dir = os.path.join(current_dir, 'backend')
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from backend import ai_service

def test_summary():
    print("\n--- Testing Summary Generation ---")
    try:
        res = ai_service.AIResumeService.generate_professional_summary(
            full_name="John Doe",
            job_title="Software Engineer",
            experience_years=5,
            skills=["Python", "React", "AWS"]
        )
        with open('reproduction_summary.json', 'w') as f:
            json.dump(res, f, indent=2)
    except Exception as e:
        print(f"ERROR: {e}")

def test_experience():
    print("\n--- Testing Experience Enhancement ---")
    try:
        res = ai_service.AIResumeService.enhance_job_description(
            job_title="Software Engineer",
            company="Tech Corp",
            description="Wrote code and fixed bugs."
        )
        with open('reproduction_experience.json', 'w') as f:
            json.dump(res, f, indent=2)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_summary()
    test_experience()
