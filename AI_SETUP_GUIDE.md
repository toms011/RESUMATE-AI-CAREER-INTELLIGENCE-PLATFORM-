# 🚀 AI Resume Builder - Setup Guide

## Getting Started with Gemini AI Integration

### Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### Step 2: Configure Backend Environment

```bash
cd backend

# Create .env file from template
cp .env.example .env

# Edit .env and add your API key:
# GEMINI_API_KEY=your_actual_api_key_here
```

### Step 3: Install Dependencies

```bash
# Install Python dependencies
pipenv install

# Or if you prefer pip
pip install -r requirements.txt
```

### Step 4: Start Backend Server

```bash
cd backend
python app.py
```

The backend will run on `http://localhost:5000`

### Step 5: Start Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

---

## 🎨 AI Features Available

### 1. **Enhance Job Description**
- Input: Job title, company, current description
- Output: AI-generated bullet points with action verbs
- Perfect for: Making job descriptions more impactful

### 2. **Generate Professional Summary**
- Input: Name, target job, experience years, skills
- Output: Compelling 2-3 sentence professional summary
- Perfect for: Creating tailored summaries for different roles

### 3. **Improve Skills**
- Input: Current skills, optional target job
- Output: Skills to add/remove, better wording suggestions
- Perfect for: Optimizing your skills section

### 4. **ATS Compatibility Score**
- Input: Full resume text
- Output: Score (0-100), issues, improvements, strengths
- Perfect for: Ensuring your resume passes ATS systems

### 5. **Job Match Analysis**
- Input: Resume text, job posting
- Output: Match score, missing keywords, gaps, alignments
- Perfect for: Tailoring resumes for specific jobs

---

## 📋 API Endpoints

All endpoints require POST requests with JSON body:

```
POST /api/ai/enhance-job-description
POST /api/ai/generate-summary
POST /api/ai/improve-skills
POST /api/ai/ats-score
POST /api/ai/job-match
```

---

## 🔧 Troubleshooting

### "GEMINI_API_KEY not configured"
- Check that `.env` file exists in `backend/` directory
- Verify the API key is correctly set
- Restart the Flask server

### Import errors
- Make sure all dependencies are installed: `pipenv install`
- Check that you're using Python 3.7+

### CORS errors
- Ensure Flask is running on `http://localhost:5000`
- Check that frontend is configured to use the correct API base URL

---

## 📝 Using the AI Panel

The AI Enhancement Panel is integrated into the Edit Resume page:

1. Navigate to edit a resume
2. Scroll to the bottom to find the "✨ AI Resume Enhancement" section
3. Click on the tab for the feature you want
4. Fill in the required information
5. Click the action button
6. View results instantly

---

## 🎯 Example Usage

### Enhance Job Description
```json
{
  "job_title": "Software Engineer",
  "company": "TechCorp",
  "description": "Worked on web development"
}
```

### Generate Summary
```json
{
  "full_name": "John Doe",
  "job_title": "Full Stack Developer",
  "experience_years": 5,
  "skills": ["Python", "React", "Node.js", "MongoDB"]
}
```

---

## ⚠️ Important Notes

- Keep your API key secret - never commit `.env` to Git
- Each AI request counts towards your Google Gemini API quota
- Results are best when you provide complete, detailed information
- The AI is a helper - always review and customize suggestions

---

## 🆘 Need Help?

- Check the AI responses for error messages
- Verify API key is valid
- Ensure backend is running and accessible
- Check browser console for frontend errors

Good luck building amazing resumes! 🚀
