#!/usr/bin/env python3
"""
Test script for resume parser with AI enhancement
Tests the complete resume parsing pipeline
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.resume_parser import extract_text_from_file, parse_resume
from backend.ai_service import AIResumeService
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

def test_text_extraction():
    """Test text extraction from various file formats"""
    print("\n" + "="*60)
    print("Testing Text Extraction")
    print("="*60)
    
    # Create a test resume text file
    test_dir = Path("backend") / "uploads"
    test_dir.mkdir(parents=True, exist_ok=True)
    test_txt = test_dir / "test_resume.txt"
    
    sample_resume = """
    JOHN SMITH
    john.smith@email.com | (555) 123-4567
    linkedin.com/in/johnsmith
    
    PROFESSIONAL SUMMARY
    Experienced software developer with 5+ years of expertise in Python, JavaScript, and cloud technologies.
    Passionate about building scalable applications and mentoring junior developers.
    
    EXPERIENCE
    
    Senior Software Developer
    Tech Corporation Inc. | January 2020 - Present
    - Led development of microservices architecture using Python and AWS
    - Improved application performance by 40% through database optimization
    - Mentored team of 3 junior developers
    
    Software Developer
    StartUp Solutions | June 2018 - December 2019
    - Developed full-stack web applications using React and Node.js
    - Implemented CI/CD pipelines using Docker and Jenkins
    - Reduced deployment time from 45 minutes to 10 minutes
    
    EDUCATION
    
    Bachelor of Science in Computer Science
    State University | May 2018
    
    SKILLS
    
    Programming Languages: Python, JavaScript, Java, C++
    Web Technologies: React, Node.js, Django, REST APIs
    Cloud Platforms: AWS, Google Cloud, Azure
    Databases: PostgreSQL, MongoDB, Redis
    Tools & Platforms: Docker, Kubernetes, Git, Jenkins
    
    CERTIFICATIONS
    
    AWS Solutions Architect Associate | 2021
    Python Professional Developer | 2020
    """
    
    with open(test_txt, 'w') as f:
        f.write(sample_resume)
    
    print(f"\nCreated test resume: {test_txt}")
    
    # Test extraction
    text = extract_text_from_file(str(test_txt))
    print(f"✓ Extracted {len(text)} characters")
    print(f"First 200 chars: {text[:200]}...")
    
    return str(test_txt)

def test_ai_parsing(filepath):
    """Test AI-based resume parsing"""
    print("\n" + "="*60)
    print("Testing AI-Based Resume Parsing")
    print("="*60)
    
    parsed_data = parse_resume(filepath, AIResumeService)
    
    if parsed_data.get('error'):
        print(f"⚠️  Error: {parsed_data.get('error')}")
        return None
    
    print("\n✓ Parsing Results:")
    print(f"  Name: {parsed_data.get('full_name')}")
    print(f"  Email: {parsed_data.get('email')}")
    print(f"  Phone: {parsed_data.get('phone')}")
    print(f"  LinkedIn: {parsed_data.get('linkedin')}")
    print(f"  Summary: {parsed_data.get('summary', '')[:100]}...")
    
    print(f"\n  Experiences ({len(parsed_data.get('experiences', []))})")
    for i, exp in enumerate(parsed_data.get('experiences', []), 1):
        print(f"    {i}. {exp.get('job_title')} at {exp.get('company')} ({exp.get('start_date')} - {exp.get('end_date')})")
    
    print(f"\n  Education ({len(parsed_data.get('education', []))})")
    for i, edu in enumerate(parsed_data.get('education', []), 1):
        print(f"    {i}. {edu.get('degree')} from {edu.get('institution')} ({edu.get('year')})")
    
    print(f"\n  Skills ({len(parsed_data.get('skills', []))})")
    for i, skill in enumerate(parsed_data.get('skills', []), 1):
        if isinstance(skill, dict):
            print(f"    {i}. {skill.get('name')} - {skill.get('proficiency')}")
        else:
            print(f"    {i}. {skill}")
    
    print("\n✓ Full parsed data (JSON):")
    print(json.dumps(parsed_data, indent=2)[:1000] + "...")
    
    return parsed_data

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("RESUME PARSER TEST SUITE")
    print("="*60)
    
    # Check for API key
    if not os.getenv('GEMINI_API_KEY'):
        print("\n⚠️  Warning: GEMINI_API_KEY not set in environment")
        print("AI parsing will fall back to regex extraction")
    else:
        print("\n✓ GEMINI_API_KEY is configured")
    
    # Test 1: Text extraction
    try:
        filepath = test_text_extraction()
    except Exception as e:
        print(f"\n❌ Text extraction test failed: {e}")
        return
    
    # Test 2: AI parsing
    try:
        parsed_data = test_ai_parsing(filepath)
        if parsed_data:
            print("\n✓ All tests passed!")
        else:
            print("\n⚠️  Parsing returned no data")
    except Exception as e:
        print(f"\n❌ AI parsing test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
