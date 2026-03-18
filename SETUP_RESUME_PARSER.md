# Resume Parser Dependencies

To enable full resume parsing from PDF, DOCX, and other formats, install these packages:

```bash
pip install PyPDF2 python-docx beautifulsoup4 striprtf
```

## What each package does:

- **PyPDF2** - Extract text from PDF files
- **python-docx** - Extract text from DOCX files  
- **beautifulsoup4** - Parse HTML files
- **striprtf** - Extract text from RTF files

## Alternative installations:

If you want even better DOC (older Word format) support:
```bash
pip install textract
```

## Installation Steps:

1. Open your backend terminal
2. Navigate to the project: `cd backend`
3. Activate your virtual environment if using one
4. Run: `pip install PyPDF2 python-docx beautifulsoup4 striprtf`
5. Restart your Flask app: `python app.py`

## Features After Installation:

✅ PDF resume parsing
✅ DOCX resume parsing  
✅ HTML resume parsing
✅ RTF resume parsing
✅ TXT resume parsing
✅ AI-powered data extraction (using Gemini)
✅ Fallback regex extraction (email, phone, LinkedIn)
✅ Automatic database population

## How it Works:

1. User uploads a resume file
2. System extracts text from the file
3. AI analyzes text to extract:
   - Full name
   - Email, phone, LinkedIn
   - Work experience (job title, company, dates, description)
   - Education (degree, school, year)
   - Skills
4. All data is automatically saved to the database
5. User can then edit/refine in the builder
