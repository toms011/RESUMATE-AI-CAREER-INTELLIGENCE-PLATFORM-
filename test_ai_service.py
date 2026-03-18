#!/usr/bin/env python3
"""
Quick test to verify AI service is working
"""

import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.ai_service import AIResumeService
import json

# Load environment variables
load_dotenv()

def test_ai_service():
    """Test AI service methods"""
    print("\n" + "="*60)
    print("Testing AI Resume Service")
    print("="*60)
    
    # Check if API key is configured
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return False
    
    print(f"✓ API Key configured: {api_key[:10]}...")
    
    # Test 1: Enhance job description
    print("\n1. Testing enhance_job_description...")
    result = AIResumeService.enhance_job_description(
        job_title="Software Engineer",
        company="Tech Corp",
        description="Developed web applications using React and Node.js"
    )
    
    if result.get('error'):
        print(f"❌ Error: {result['error']}")
        return False
    elif result.get('success'):
        print("✓ Success!")
        print(f"Response: {json.dumps(result, indent=2)}")
    else:
        print(f"⚠️  Unexpected response: {result}")
    
    # Test 2: Generate summary
    print("\n2. Testing generate_professional_summary...")
    result = AIResumeService.generate_professional_summary(
        full_name="John Doe",
        job_title="Full Stack Developer",
        experience_years=5,
        skills=["Python", "React", "AWS"]
    )
    
    if result.get('error'):
        print(f"❌ Error: {result['error']}")
        return False
    elif result.get('success'):
        print("✓ Success!")
        print(f"Response: {json.dumps(result, indent=2)}")
    else:
        print(f"⚠️  Unexpected response: {result}")
    
    print("\n" + "="*60)
    print("✓ AI Service Tests Completed!")
    print("="*60)
    return True

if __name__ == "__main__":
    try:
        test_ai_service()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
