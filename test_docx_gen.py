
from backend.docx_service import DOCXGenerator
import sys
import os
import datetime

# Mock data class mimicking SQLAlchemy objects
class MockObj:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

data = {
    "personal_info": MockObj(full_name="Test User", email="test@test.com", phone="123", linkedin="li", location="NY", summary="<b>Hello</b>"),
    "experiences": [MockObj(job_title="Dev", company="Corp", start_date="2020", end_date="2021", description="Did stuff")],
    "education": [MockObj(degree="BS", institution="Uni", year="2019")],
    "skills": [MockObj(name="Python"), "Java", {"name": "React"}]
}

try:
    print("Testing DOCX generation...")
    buffer = DOCXGenerator.generate(data)
    size = buffer.getbuffer().nbytes
    print(f"Success! Generated {size} bytes.")
    
    # Optional: write to disk to inspect manually if needed, but bytes check confirms basic function
    with open("test_output.docx", "wb") as f:
        f.write(buffer.getvalue())
    print("Saved test_output.docx")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
