# 🧪 Complete System Testing Guide

## Prerequisites
- Backend running on `http://127.0.0.1:5000`
- Frontend running on your development server
- Chrome/Firefox/Safari browser
- PDF viewer installed

## Test 1: Template System API

### 1.1 Get List of Templates
**URL:** `http://127.0.0.1:5000/templates`  
**Method:** GET  
**Expected Response:**
```json
[
  {
    "id": 1,
    "name": "Modern Professional",
    "category": "modern",
    "description": "...",
    "is_active": true
  },
  {
    "id": 2,
    "name": "Classic Corporate",
    "category": "classic",
    "description": "...",
    "is_active": true
  },
  {
    "id": 3,
    "name": "Minimal & Clean",
    "category": "minimal",
    "description": "...",
    "is_active": true
  }
]
```
✅ **Pass:** Shows 3+ templates  
❌ **Fail:** Empty array or error

## Test 2: Frontend Template Selection

### 2.1 Open Resume Editor
1. Login to application
2. Click on a resume
3. Scroll to "Select Template" section
4. **Expected:** Grid of 3 template cards with preview images

✅ **Pass:** Templates load and display  
❌ **Fail:** No templates shown or error message

### 2.2 Select Modern Template
1. Click "Modern Professional" card
2. **Expected:** Border highlights, checkmark appears
3. **Check backend log:** `POST /resume/1/template HTTP/1.1" 200`

✅ **Pass:** Template selected, 200 response  
❌ **Fail:** Error response or no visual feedback

### 2.3 Select Classic Template
1. Click "Classic Corporate" card
2. **Expected:** Modern template border disappears, Classic is highlighted
3. **Check backend log:** `POST /resume/1/template HTTP/1.1" 200`

✅ **Pass:** Template switched successfully  
❌ **Fail:** Multiple templates highlighted or error

### 2.4 Select Minimal Template  
1. Click "Minimal & Clean" card
2. **Expected:** Minimal template highlighted
3. **Verify:** Can switch between all three templates repeatedly

✅ **Pass:** All templates selectable  
❌ **Fail:** Can't switch or selection stuck

## Test 3: PDF Download - Modern Template

### 3.1 Fill Resume Data
**Fill these fields (minimum required):**
- **Personal Info:**
  - Full Name: "Test User"
  - Email: "test@example.com"
  - Phone: "123-456-7890"
  - LinkedIn: "linkedin.com/in/testuser"
  - Summary: "Experienced professional with 5+ years in tech"

- **Add Experience:**
  - Job Title: "Senior Developer"
  - Company: "Tech Corp"
  - Start Date: "2020"
  - End Date: "2024"
  - Description: "Led development of microservices" (or click AI Generate)

- **Add Education:**
  - Degree: "B.S. Computer Science"
  - Institution: "Tech University"
  - Year: "2020"

- **Add Skills:**
  - Skill: "Python" (Proficiency: Expert)
  - Skill: "JavaScript" (Proficiency: Advanced)

### 3.2 Select Modern Template
1. Scroll to template selector
2. Click "Modern Professional"
3. **Verify:** Border highlights, checkmark shows

### 3.3 Download PDF
1. Click "⬇ Download PDF" button (top right)
2. PDF should download in ~1-2 seconds
3. Filename: `<resume-title>.pdf`

### 3.4 Open PDF and Verify Modern Template
**Check these elements:**
- ✅ Header with "Test User" name
- ✅ Header has blue/purple background (Modern style)
- ✅ Contact info properly formatted
- ✅ "Professional Summary" section with your text
- ✅ "Professional Experience" section
- ✅ Job title: "Senior Developer"
- ✅ Company: "Tech Corp"
- ✅ Experience dates: "2020 - 2024"
- ✅ Job description displayed
- ✅ "Education" section with degree
- ✅ "Skills & Expertise" section with Python and JavaScript
- ✅ Proper spacing and typography
- ✅ No missing styling or broken layout

**Pass Criteria:**
- All data visible and properly formatted
- Professional appearance
- No blank sections
- Text is readable (not too small)
- Proper margins and spacing

❌ **Fail Signs:**
- Missing data (blank sections)
- Broken styling (no background colors)
- Misaligned text
- Text too small/too large
- Wrong template style (expecting Modern but got Classic)

## Test 4: PDF Download - Classic Template

### 4.1 Switch to Classic Template
1. Scroll to template selector
2. Click "Classic Corporate"
3. Verify selection changes

### 4.2 Download PDF
1. Click "⬇ Download PDF"
2. Download ~1-2 seconds
3. Filename: `<resume-title>.pdf`

### 4.3 Open PDF and Verify Classic Template
**Check these elements:**
- ✅ Header with centered name
- ✅ Header uses serif fonts (Times New Roman style)
- ✅ Black/formal color scheme
- ✅ Corporate styling
- ✅ Traditional resume layout
- ✅ All data present (same as Modern template)

**Expected Visual Differences:**
- Times New Roman font (serif)
- Formal, conservative styling
- Black section headers with underlines
- Traditional corporate appearance

## Test 5: PDF Download - Minimal Template

### 5.1 Switch to Minimal Template
1. Scroll to template selector
2. Click "Minimal & Clean"
3. Verify selection changes

### 5.2 Download PDF
1. Click "⬇ Download PDF"
2. Download ~1-2 seconds

### 5.3 Open PDF and Verify Minimal Template
**Check these elements:**
- ✅ Clean, minimalist design
- ✅ Sans-serif font (Arial/Helvetica)
- ✅ Minimal color usage
- ✅ Focus on content
- ✅ ATS-friendly formatting
- ✅ All data present

**Expected Visual Differences:**
- Minimal styling
- Light gray colors
- Clean typography
- Maximum readability
- Good for ATS scanning

## Test 6: AI Enhancement Features

### 6.1 Test Professional Summary
1. Open Personal Info section
2. Click "✨ AI Enhance" next to Summary
3. Wait 2-3 seconds for AI response
4. **Expected:** Professional summary appears in field

✅ **Pass:** Summary generated and populated  
❌ **Fail:** Error message or timeout

### 6.2 Test Job Description Generation
1. Open Work Experience section
2. Add new job (or edit existing)
3. Fill job title: "Software Engineer"
4. Fill company: "Tech Company"
5. Click "🤖 AI Generate" button
6. Wait 2-3 seconds
7. **Expected:** Multiple bullet points generated

✅ **Pass:** Bullet points appear in description  
❌ **Fail:** Error or no response

### 6.3 Use AI-Generated Content in PDF
1. Keep AI-generated bullet points
2. Select a template
3. Download PDF
4. **Verify:** Bullet points appear properly formatted

## Test 7: Cross-Template Consistency

### 7.1 Template Switching
1. Select Modern template → Download
2. Open PDF, note appearance
3. Switch to Classic template → Download  
4. Open PDF, note appearance
5. Switch to Minimal template → Download
6. Open PDF, note appearance

**Pass Criteria:**
- Each template has distinct visual style
- All data present in all templates
- Professional appearance in all versions
- No formatting errors

## Test 8: Edge Cases

### 8.1 Missing Data
1. Create resume with only name
2. Download PDF
3. **Expected:** Header appears, empty sections are skipped

✅ **Pass:** PDF generates, shows only filled sections  
❌ **Fail:** Error or broken layout

### 8.2 Long Text
1. Add very long summary (multiple paragraphs)
2. Add experience with many bullet points
3. Download PDF
4. **Expected:** Text wraps properly, good pagination

✅ **Pass:** Text wraps, readable, multiple pages if needed  
❌ **Fail:** Text overlaps, unreadable, broken layout

### 8.3 Special Characters
1. Add name with special characters: "José García"
2. Add email: "test+tag@example.com"
3. Download PDF
4. **Expected:** Special characters display correctly

✅ **Pass:** All characters render properly  
❌ **Fail:** Garbled text, encoding errors

## Summary Report

### All Tests Passing ✅
- Template system API functional
- All 3 templates selectable
- PDFs download successfully
- Modern template renders correctly
- Classic template renders correctly
- Minimal template renders correctly
- Data populates in all templates
- AI features working (if GEMINI_API_KEY set)
- Edge cases handled properly

### Troubleshooting

**If any test fails:**
1. Check backend logs for errors
2. Check browser developer console (F12 → Console tab)
3. Verify resume has data
4. Restart backend (kill Python, run app.py again)
5. Clear browser cache
6. Try in incognito mode

**Common Issues:**
- PDF not downloading: Check browser popup blocker
- Templates not showing: Restart backend
- Data missing in PDF: Refresh page before downloading
- Wrong template rendering: Clear browser cache

## Success Criteria

✅ **System Ready When:**
- All tests pass
- PDFs look professional in all templates
- No errors in console or backend logs
- Data correctly populates across templates
- Download completes in 1-2 seconds

🎉 **If all above tests pass, the system is production-ready!**
