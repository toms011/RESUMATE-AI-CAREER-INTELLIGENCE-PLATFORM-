"""
Resume Parser Module
Extracts text from various file formats and uses AI to parse resume data
"""

import os
import json
import re
from pathlib import Path


def _clean_pdf_text(text: str) -> str:
    """
    Post-process raw PDF-extracted text:
    - Merge broken words (hy-\nphenation)
    - Normalise bullet characters
    - Collapse excessive newlines
    - Remove stray whitespace
    """
    if not text:
        return text

    # Merge hyphenated line-breaks  (e.g.  "engi-\nneer" → "engineer")
    text = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', text)

    # Normalise bullet chars to standard dash
    text = re.sub(r'[•●■►▪▸➤⬥]', '- ', text)

    # Collapse 3+ newlines into 2
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove trailing spaces on every line
    text = re.sub(r'[ \t]+\n', '\n', text)

    # Collapse multiple spaces into one
    text = re.sub(r'[ \t]{2,}', ' ', text)

    return text.strip()

def extract_job_description_text(filepath):
    """
    Extract text from a job description file.
    Wrapper around extract_text_from_file with potential future JD-specific cleaning.
    """
    return extract_text_from_file(filepath)

def extract_text_from_file(filepath):
    """
    Extract text from various file formats
    Supports: TXT, PDF, DOCX, DOC, HTML, RTF
    """
    file_ext = Path(filepath).suffix.lower()
    text = ""
    
    try:
        if file_ext == '.txt':
            with open(filepath, 'r', encoding='utf-8') as f:
                text = f.read()
        
        elif file_ext == '.pdf':
            # ── BEST-EFFORT PDF TEXT EXTRACTION ──────────────────────────────
            # Try pdfplumber first (preserves layout & whitespace better),
            # fall back to PyPDF2 if unavailable.
            extracted = False

            # 1. pdfplumber — superior for styled/template-generated PDFs
            if not extracted:
                try:
                    import pdfplumber
                    with pdfplumber.open(filepath) as pdf:
                        pages_text = []
                        for page in pdf.pages:
                            page_text = page.extract_text(
                                x_tolerance=2,
                                y_tolerance=2
                            )
                            if page_text:
                                pages_text.append(page_text)
                        if pages_text:
                            text = "\n\n".join(pages_text)
                            extracted = True
                            print("PDF extracted via pdfplumber")
                except ImportError:
                    pass
                except Exception as e:
                    print(f"pdfplumber extraction failed: {e}")

            # 2. PyPDF2 fallback
            if not extracted:
                try:
                    import PyPDF2
                    with open(filepath, 'rb') as f:
                        pdf_reader = PyPDF2.PdfReader(f)
                        for page in pdf_reader.pages:
                            page_text = page.extract_text()
                            if page_text:
                                text += page_text + "\n"
                    if text.strip():
                        extracted = True
                        print("PDF extracted via PyPDF2")
                except ImportError:
                    print("PyPDF2 not installed.")
                except Exception as e:
                    print(f"PyPDF2 extraction failed: {e}")

            if not extracted:
                text = ""
                print("PDF: No text could be extracted from any page")
            else:
                # Post-process: clean up common extraction artifacts
                text = _clean_pdf_text(text)
        
        elif file_ext == '.docx':
            try:
                from docx import Document
                doc = Document(filepath)
                text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            except ImportError:
                print("python-docx not installed. Install with: pip install python-docx")
                text = ""
        
        elif file_ext == '.doc':
            try:
                import textract
                text = textract.process(filepath).decode('utf-8')
            except ImportError:
                print("textract not installed. Install with: pip install textract")
                text = ""
        
        elif file_ext == '.html':
            try:
                from bs4 import BeautifulSoup
                with open(filepath, 'r', encoding='utf-8') as f:
                    soup = BeautifulSoup(f, 'html.parser')
                    text = soup.get_text()
            except ImportError:
                with open(filepath, 'r', encoding='utf-8') as f:
                    text = f.read()
        
        elif file_ext == '.rtf':
            try:
                from striprtf.striprtf import rtf_to_text
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    text = rtf_to_text(f.read())
            except ImportError:
                print("striprtf not installed. Install with: pip install striprtf")
                text = ""
    
    except Exception as e:
        print(f"Error extracting text from {filepath}: {str(e)}")
        text = ""
    
    return text.strip()


def parse_resume_with_ai(resume_text, ai_service):
    """
    Use AI service to extract structured data from resume text
    Returns a dictionary with parsed resume components
    """
    try:
        # Create a detailed prompt for the AI to parse the resume
        prompt = f"""You are an expert resume parser. The text below was extracted from a PDF file. 
PDF extraction often produces messy, jumbled text — words may run together, sections may be out of order, 
bullet points may be lost, and whitespace may be wrong. YOUR JOB is to intelligently reconstruct 
the structured resume data despite the messy formatting.

IMPORTANT: Return ONLY valid JSON with no markdown, no code blocks, no extra text. Just the raw JSON object.

RESUME TEXT (may be messy — extract intelligently):
---START---
{resume_text}
---END---

EXTRACTION INSTRUCTIONS:
1. SEPARATE fields that may be merged together (e.g. "johndoe@gmail.com+919876543210" → email + phone)
2. IDENTIFY section headers even if they run together with content (e.g. "PROFESSIONAL SUMMARYDedicated professional..." → section = summary, text = "Dedicated professional...")
3. RECONSTRUCT bullet points from run-together text
4. SPLIT contact info that may appear on one line (email, phone, location, LinkedIn)
5. EXTRACT dates even if they are merged with job titles or company names
6. For the summary field, extract ONLY the professional summary content — do NOT include other resume sections, emails, phone numbers, skill lists, or section headers inside the summary

Extract and structure the data into this exact JSON format:
{{
    "full_name": "string - the person's full name",
    "email": "string - email address (look for @domain pattern)",
    "phone": "string - phone number with country code if available (look for +XX or number patterns)",
    "linkedin": "string - LinkedIn URL if present",
    "job_title": "string - current or most recent job title",
    "location": "string - city/state/country",
    "summary": "string - ONLY the professional summary or objective paragraph. Do NOT include emails, phones, skills, section headers, or any other resume sections here. Just the actual summary text, 2-4 sentences max.",
    "experiences": [
        {{
            "job_title": "string - exact job title",
            "company": "string - company name",
            "start_date": "string - start date (MM/YYYY or YYYY)",
            "end_date": "string - end date (MM/YYYY or YYYY or 'Present')",
            "description": "string - job responsibilities and achievements, each on a new line prefixed with '- '"
        }}
    ],
    "education": [
        {{
            "degree": "string - degree name (e.g., Bachelor of Science, MBA)",
            "institution": "string - school/university/college name",
            "year": "string - graduation year in YYYY format",
            "field": "string - field of study",
            "grade": "string - GPA or grade if mentioned, otherwise empty string"
        }}
    ],
    "skills": [
        {{
            "name": "string - individual skill name (separate each skill)",
            "proficiency": "string - Beginner/Intermediate/Advanced/Expert based on context"
        }}
    ],
    "certifications": [
        {{
            "name": "string - certification name",
            "issuer": "string - issuing organization",
            "year": "string - year obtained"
        }}
    ],
    "awards": [
        {{
            "title": "string - award title",
            "organization": "string - awarding organization",
            "year": "string - year received"
        }}
    ],
    "languages": [
        {{
            "language": "string - language name (e.g., English, Hindi, Spanish)",
            "proficiency": "string - Native/Fluent/Intermediate/Basic"
        }}
    ]
}}

Rules:
- The text may be VERY messy — use contextual intelligence to separate fields
- Extract EVERYTHING mentioned in the resume
- For the SUMMARY field: Only include the actual professional summary paragraph. If you see text like "PROFESSIONAL SUMMARY" followed by the actual summary, extract only the summary content after the header. Never stuff contact info, skills, education, or other sections into the summary.
- If skills appear as a comma-separated list (e.g. "Python, Java, SQL"), split them into separate skill objects
- If contact info appears merged, separate each field properly  
- For dates, preserve the original format if clear, otherwise use MM/YYYY or YYYY
- Return empty arrays if no data found for that section
- Return empty strings for individual fields if data not found
- DO NOT include markdown, code blocks, or any text outside the JSON object
- Start with {{ and end with }} — nothing else"""

        print(f"Sending resume text ({len(resume_text)} chars) to AI for parsing...")
        
        # Call AI service
        response = ai_service.parse_resume(prompt)
        
        # Parse the response
        if response and 'text' in response:
            try:
                # Extract JSON from response
                json_str = response['text'].strip()
                
                # Remove markdown code blocks if present
                if '```json' in json_str:
                    json_str = json_str.split('```json')[1].split('```')[0].strip()
                elif '```' in json_str:
                    json_str = json_str.split('```')[1].split('```')[0].strip()
                
                # Parse JSON
                data = json.loads(json_str)
                print(f"Successfully parsed resume with AI. Found {len(data.get('experiences', []))} experiences, {len(data.get('education', []))} education entries, {len(data.get('skills', []))} skills")
                return data
            except json.JSONDecodeError as e:
                print(f"Error parsing AI response as JSON: {str(e)}")
                print(f"AI Response was: {response['text'][:500]}")
                return None
        else:
            print(f"No valid response from AI service: {response}")
            return None
    
    except Exception as e:
        print(f"Error using AI to parse resume: {str(e)}")
        import traceback
        traceback.print_exc()
        return None



def extract_email(text):
    """Extract email from text using regex"""
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    matches = re.findall(email_pattern, text)
    return matches[0] if matches else ""


def extract_phone(text):
    """Extract phone number from text using regex"""
    phone_patterns = [
        r'\+?1?\s?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}',  # US
        r'\+\d{1,3}\s?\d{1,14}',  # International
    ]
    for pattern in phone_patterns:
        matches = re.findall(pattern, text)
        if matches:
            return matches[0]
    return ""


def extract_linkedin(text):
    """Extract LinkedIn URL from text"""
    linkedin_pattern = r'(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-]+'
    matches = re.findall(linkedin_pattern, text, re.IGNORECASE)
    return matches[0] if matches else ""


def extract_name(text):
    """Try to extract name from resume (usually at the top)"""
    lines = text.split('\n')[:10]  # Check first 10 lines
    # Look for lines that might be names
    for line in lines:
        line = line.strip()
        if len(line) > 3 and len(line) < 50 and line[0].isupper():
            # Basic heuristic: short, capitalized line is likely a name
            word_count = len(line.split())
            if 1 <= word_count <= 3:
                return line
    return ""


def parse_resume(filepath, ai_service=None):
    """
    Main function to parse a resume file
    Returns dictionary with structured resume data
    """
    print(f"\n{'='*60}")
    print(f"Starting resume parse: {filepath}")
    print(f"{'='*60}")
    
    # Extract text from file
    resume_text = extract_text_from_file(filepath)
    
    if not resume_text or resume_text.startswith("[Error"):
        print(f"ERROR: Could not extract text from file")
        return {
            "error": "Could not extract text from file",
            "full_name": "",
            "email": "",
            "phone": "",
            "linkedin": "",
            "job_title": "",
            "location": "",
            "summary": resume_text,
            "experiences": [],
            "education": [],
            "skills": [],
            "certifications": [],
            "awards": []
        }
    
    print(f"Extracted {len(resume_text)} characters from file")
    
    # Try to use AI if available
    parsed_data = None
    if ai_service:
        print("Attempting AI-based parsing...")
        parsed_data = parse_resume_with_ai(resume_text, ai_service)
    
    # If AI parsing succeeded, validate and return it
    if parsed_data and not parsed_data.get('error'):
        print("✓ AI parsing successful!")
        # Ensure all required fields are present
        parsed_data.setdefault('full_name', '')
        parsed_data.setdefault('email', '')
        parsed_data.setdefault('phone', '')
        parsed_data.setdefault('linkedin', '')
        parsed_data.setdefault('job_title', '')
        parsed_data.setdefault('location', '')
        parsed_data.setdefault('summary', '')
        parsed_data.setdefault('experiences', [])
        parsed_data.setdefault('education', [])
        parsed_data.setdefault('skills', [])
        parsed_data.setdefault('certifications', [])
        parsed_data.setdefault('awards', [])
        return parsed_data
    
    # If AI parsing failed, use regex extraction as fallback
    print("AI parsing failed or not available, using regex extraction as fallback...")
    fallback_data = {
        "full_name": extract_name(resume_text),
        "email": extract_email(resume_text),
        "phone": extract_phone(resume_text),
        "linkedin": extract_linkedin(resume_text),
        "job_title": "",
        "location": "",
        "summary": resume_text[:500],  # First 500 chars as summary
        "experiences": [],
        "education": [],
        "skills": [],
        "certifications": [],
        "awards": []
    }
    print(f"✓ Fallback extraction complete: {fallback_data['full_name']}, {fallback_data['email']}")
    return fallback_data
