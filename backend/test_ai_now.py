#!/usr/bin/env python
"""Quick test of AI service"""
import sys
import json
from ai_service import AIResumeService

print("Testing AI Service...")
print("="*60)

# Test enhance job description
result = AIResumeService.enhance_job_description(
    job_title="Software Engineer",
    company="Tech Corp", 
    description="Built features and fixed bugs"
)

print(json.dumps(result, indent=2))
print("="*60)

if result.get('success'):
    print("✅ AI SERVICE IS WORKING!")
else:
    print("❌ AI SERVICE FAILED:")
    print(f"Error: {result.get('error')}")
    sys.exit(1)
