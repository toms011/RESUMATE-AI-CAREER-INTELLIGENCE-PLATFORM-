import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../utils/api';
import toast from 'react-hot-toast';
import ResumePreview from './ResumePreview';
import { useReactToPrint } from 'react-to-print';
import LoadingSpinner from './LoadingSpinner';
import TemplateSelector from './TemplateSelector';
import { AIEnhancementPanel } from './AIEnhancementPanel';
import ATSChecker from './ATSChecker';
import AIResumeService from '../services/AIResumeService';
import './ResumeBuilder.css';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Country, State, City } from 'country-state-city';
import { searchJobTitles } from '../services/JobTitleService';
import { searchCompanies } from '../services/CompanyService';
import { searchDegrees, searchMajors } from '../services/EducationService';
import { searchInstitutions } from '../services/InstitutionService';
import { searchGlobalSkills, getSuggestedSkills } from '../services/SkillsService';
import { searchLanguages } from '../services/LanguageService';
import RichTextEditor from './RichTextEditor';
import { RESUME_STYLES, mmToPx } from '../utils/resumeStyles';

const STEPS = [
  { id: 1, name: 'Templates', label: 'Templates', icon: '◆' },
  { id: 2, name: 'Header', label: 'Header', icon: '●' },
  { id: 3, name: 'Experience', label: 'Experience', icon: '◼' },
  { id: 4, name: 'Education', label: 'Education', icon: '△' },
  { id: 5, name: 'Skills', label: 'Skills', icon: '⚡' },
  { id: 6, name: 'Summary', label: 'Summary', icon: '✎' },
  { id: 7, name: 'Additional Details', label: 'Additional Details', icon: '✦' },
  { id: 8, name: 'Layout & Design', label: 'Layout & Design', icon: '◆' },
  { id: 9, name: 'Finalize', label: 'Finalize', icon: '✓' },
];

function ResumeBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef(null);

  console.log('ResumeBuilder mounted, id:', id);

  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [fontScale, setFontScale] = useState(1.0); // 1.0 = 100% size
  const [isAutoFitting, setIsAutoFitting] = useState(false);
  const [isFitCalculated, setIsFitCalculated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const isFirstLoad = useRef(true); // skip auto-save on initial data fetch
  const autoSaveTimer = useRef(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [templateId, setTemplateId] = useState(1);
  const [aiLoading, setAiLoading] = useState({});
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Resume Data
  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    job_title: '',
    email: '',
    phone: '',
    linkedin: '',
    location: '',
    country: '',
    state: '',
    city: '',
    additional_info: '',
    summary: '',
    profile_image_url: '',
    profile_image_enabled: false,
  });

  // Auto-Fit Engine
  useEffect(() => {
    // Check fit when data or scale changes
    // Only active during editing/preview, or Finalize step
    const checkFit = () => {
      const paperElement = document.getElementById('resume-paper');
      if (!paperElement) return;

      const A4_HEIGHT_PX = mmToPx(297);
      const currentHeight = paperElement.offsetHeight;

      // Auto-shrink if overflowing
      if (currentHeight > A4_HEIGHT_PX + 5) {
        if (fontScale > 0.85) {
          if (!isAutoFitting) setIsAutoFitting(true);
          setFontScale(prev => Math.max(0.85, prev - 0.02));
        } else {
          // Limit reached
          setIsAutoFitting(false);
          setIsFitCalculated(true);
        }
      } else {
        // Fits
        if (isAutoFitting) {
          setIsAutoFitting(false);
          setIsFitCalculated(true);
        }
      }
    };

    const timer = setTimeout(checkFit, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [personalInfo, fontScale, isAutoFitting]);


  const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);
  const [additionalDetails, setAdditionalDetails] = useState({
    languages: [],
    awards: [],
    certifications: [],
    activities: [],
    websites: [],
    references: [],
  });

  const [designSettings, setDesignSettings] = useState({
    colors: 'blue',
    template: 1,
    fontFamily: 'Calibri',
    fontSize: 11,
    headingSize: 14,
  });

  const [visibleSections, setVisibleSections] = useState({
    languages: false,
    awards: false,
    certifications: false,
    activities: false,
    websites: false,
    references: false,
  });

  const handlePrint = useReactToPrint({
    contentRef: componentRef,          // v3 API — replaces `content: () => ref.current`
    documentTitle: resumeTitle || 'resume',
    // Enforce A4 paper size and strip browser default margins.
    // This style block is injected into the print iframe's <head>,
    // making @page work correctly and neutralising the zoom transform.
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      html, body {
        width: 210mm;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }
      /* Override the screen-layout panel styles — must come first so the
         visibility: visible rules in the copied stylesheet take effect */
      .resume-preview-panel {
        all: unset !important;
        display: block !important;
        position: static !important;
        width: 210mm !important;
        height: auto !important;
        overflow: visible !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .resume-preview-panel > div {
        display: block !important;
      }
      /* Kill the responsive scale transform */
      .preview-scaler {
        transform: none !important;
        transform-origin: unset !important;
        transition: none !important;
        width: 210mm !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      /* Reset the grey preview backdrop */
      .preview-container {
        position: static !important;
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        width: 210mm !important;
        height: auto !important;
        display: block !important;
      }
      /* The A4 paper */
      .resume-paper {
        width: 210mm !important;
        min-height: 297mm !important;
        height: auto !important;
        margin: 0 !important;
        padding: 15mm 18mm !important;
        box-sizing: border-box !important;
        box-shadow: none !important;
        border: none !important;
        background: white !important;
        transform: none !important;
        overflow: visible !important;
      }
      /* Section page-break control */
      .resume-section,
      .resume-entry,
      .experience-entry,
      .education-entry {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      /* Preserve exact colors */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      /* Strip screen-only decoration */
      *:not(.resume-paper) {
        box-shadow: none !important;
        text-shadow: none !important;
      }
    `,
  });

  // Keep preview template in sync with design settings
  useEffect(() => {
    if (designSettings.template) {
      setTemplateId(designSettings.template);
    }
  }, [designSettings.template]);

  // Fetch Resume Data
  useEffect(() => {
    fetchResumeData();
  }, [id]);

  // Strip HTML tags from a string — fixes dates saved as <p>2024-01-01</p> by old editor
  const stripHtml = (val) => {
    if (!val || typeof val !== 'string') return val || '';
    if (!val.includes('<')) return val.trim();
    const div = document.createElement('div');
    div.innerHTML = val;
    return (div.textContent || div.innerText || '').trim();
  };

  const fetchResumeData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching resume with ID: ${id}`);
      const response = await api.get(`/resume/${id}`);
      console.log('Resume data fetched:', response.data);
      setResumeTitle(response.data.title);

      if (response.data.personal_info) setPersonalInfo(response.data.personal_info);

      // Sanitise any HTML-wrapped dates that may have slipped in from an old rich-text editor
      if (response.data.experiences) {
        setExperiences(response.data.experiences.map(exp => ({
          ...exp,
          start_date:  stripHtml(exp.start_date),
          end_date:    stripHtml(exp.end_date),
          description: stripHtml(exp.description),
        })));
      }

      if (response.data.education) {
        setEducation(response.data.education.map(edu => ({
          ...edu,
          start_date: stripHtml(edu.start_date),
          end_date:   stripHtml(edu.end_date),
          year:       stripHtml(edu.year),
        })));
      }

      if (response.data.skills) setSkills(response.data.skills);
      if (response.data.additional_details) setAdditionalDetails(prev => ({ ...prev, ...response.data.additional_details }));
      if (response.data.design_settings) {
        setDesignSettings(response.data.design_settings);
        if (response.data.design_settings.template) {
          setTemplateId(response.data.design_settings.template);
        }
      }

      setLoading(false);
      // Mark first load complete — auto-save now active
      isFirstLoad.current = false;
    } catch (error) {
      console.error('Error fetching resume:', error);
      setLoading(false);
      const errorMsg = error.response?.data?.message || 'Failed to load resume. Redirecting...';
      setError(errorMsg);
      toast.error(errorMsg);
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  // ─── Auto-save: fires 1.5s after any data change ──────────────────────────
  useEffect(() => {
    // Skip the very first mount (data is being fetched, not edited)
    if (isFirstLoad.current) return;

    // Clear any pending timer
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    setAutoSaveStatus('saving');
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await saveResumeData(true); // silent = true
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(''), 3000);
      } catch {
        setAutoSaveStatus('error');
      }
    }, 1500);

    return () => clearTimeout(autoSaveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalInfo, experiences, education, skills, additionalDetails, templateId]);

  // Save Resume Data (called by auto-save AND manual next/complete)
  const saveResumeData = async (silent = false) => {
    try {
      if (!silent) setSaving(true);

      // Backend now supports all PersonalInfo fields
      const personalPayload = {
        full_name: (personalInfo.full_name || `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`).trim(),
        first_name: personalInfo.first_name || '',
        last_name: personalInfo.last_name || '',
        job_title: personalInfo.job_title || '',
        email: personalInfo.email || '',
        phone: personalInfo.phone || '',
        linkedin: personalInfo.linkedin || '',
        github: personalInfo.github || '',
        location: personalInfo.location || '',
        country: personalInfo.country || '',
        country_name: personalInfo.country_name || '',
        state: personalInfo.state || '',
        state_name: personalInfo.state_name || '',
        city: personalInfo.city || '',
        summary: personalInfo.summary || '',
        additional_info: personalInfo.additional_info || '',
        profile_image_url: personalInfo.profile_image_url || '',
        profile_image_enabled: !!personalInfo.profile_image_enabled,
      };

      const experiencesPayload = experiences.map((exp) => ({
        job_title:   exp.job_title  || '',
        company:     exp.company    || '',
        start_date:  stripHtml(exp.start_date),
        end_date:    stripHtml(exp.end_date),
        description: stripHtml(exp.description),
      }));

      const fmtEduDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00'); // avoid timezone shift
        return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };

      const educationPayload = education.map((edu) => {
        // Build year string from start/end dates if available (takes priority over legacy year field)
        let yearStr = '';
        if (edu.start_date || edu.end_date || edu.currently_studying) {
          const start = edu.start_date ? fmtEduDate(edu.start_date) : '';
          const end   = edu.currently_studying ? 'Present' : (edu.end_date ? fmtEduDate(edu.end_date) : '');
          yearStr = [start, end].filter(Boolean).join(' – ');
        } else {
          yearStr = edu.graduation_date || edu.year || '';
        }
        return {
          degree:      edu.degree      || '',
          institution: edu.institution || '',
          year:        yearStr,
          grade:       edu.grade       || '',
        };
      });

      const skillsPayload = skills.map((skill) => ({
        name: skill.name || '',
        proficiency: skill.proficiency || 'Intermediate',
      }));

      await api.post(`/resume/${id}`, {
        title: resumeTitle,
        personal_info: personalPayload,
        experiences: experiencesPayload,
        education: educationPayload,
        skills: skillsPayload,
        additional_details: additionalDetails,
        template_id: templateId,
      });
      if (!silent) toast.success('Resume saved successfully!');
    } catch (error) {
      console.error('Error saving resume:', error);
      if (!silent) toast.error('Failed to save resume');
      else throw error; // let auto-save handler catch it
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleNextStep = async () => {
    await saveResumeData();
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // On the final step, save and navigate away
      toast.success('All changes saved!');
      navigate('/dashboard');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // AI Summary Generation Handler
  const handleGenerateSummary = async () => {
    // 1. Calculate Years of Experience
    let years = 0;
    experiences.forEach(exp => {
      if (exp.start_date) {
        const start = new Date(exp.start_date);
        const end = exp.end_date ? new Date(exp.end_date) : new Date();
        if (!isNaN(start) && !isNaN(end)) {
          const diffTime = Math.abs(end - start);
          const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
          years += diffYears;
        }
      }
    });
    const expYears = Math.max(0, Math.round(years * 10) / 10); // Round to 1 decimal

    // 2. Get Job Title (Handle both snake_case and camelCase from potential backend/frontend mismatch)
    const firstExp = experiences.length > 0 ? experiences[0] : null;
    const derivedJobTitle = firstExp ? (firstExp.job_title || firstExp.jobTitle || 'Professional') : 'Professional';
    const jobTitle = personalInfo.job_title || derivedJobTitle;

    // 3. Get Name (Handle missing full_name)
    const fullName = personalInfo.full_name || `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`.trim() || 'Candidate';

    // 4. Get Skills
    const skillsList = skills.map(s => typeof s === 'object' ? s.name : s).filter(Boolean);

    setAiLoading(prev => ({ ...prev, 'summary-gen': true }));
    try {
      const result = await AIResumeService.generateSummary(
        fullName,
        jobTitle,
        expYears,
        skillsList
      );

      if (result.error) {
        toast.error('AI Error: ' + result.error);
      } else if (result.success && (result.summary || result.professional_summary)) {
        setPersonalInfo(prev => ({ ...prev, summary: result.summary || result.professional_summary }));
        toast.success('Summary generated successfully!');
      } else {
        console.error("Unexpected AI Response:", result);
        toast.error('Unexpected AI response. Check console for details.');
      }
    } catch (error) {
      console.error('AI Summary Error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setAiLoading(prev => ({ ...prev, 'summary-gen': false }));
    }
  };

  // standardized AI Enhancement Handler
  const handleEnhanceExperience = async (type, id, title, subtitle, description) => {
    // type can be 'experience' (default implicit in old calls) or 'education'
    // If first arg is not string 'experience'/'education', it's legacy call (expId, jobTitle...)

    // Normalize arguments for legacy calls
    let itemType = 'experience';
    let itemId = type;
    let itemTitle = id;
    let itemSubtitle = title;
    let itemDesc = description;

    if (type === 'education') {
      itemType = 'education';
      itemId = id;
      itemTitle = title;     // Degree
      itemSubtitle = subtitle; // Institution
      itemDesc = description;
    } else if (type === 'experience') {
      // Explicit new call
      itemType = 'experience';
      itemId = id;
      itemTitle = title;
      itemSubtitle = subtitle;
      itemDesc = description;
    } else if (typeof type !== 'string' || (type !== 'education' && type !== 'experience')) {
      // Legacy call: handleEnhanceExperience(expId, jobTitle, company, description)
      // This handles the case where type is the ID (number or string)
      itemId = type;
      itemTitle = id;
      itemSubtitle = title;
      itemDesc = subtitle;
    }

    if (!itemTitle || !itemSubtitle) {
      toast.error('Please fill in title/degree and company/institution first');
      return;
    }

    const loadingKey = itemType === 'education' ? `edu-desc-${itemId}` : `exp-desc-${itemId}`;
    setAiLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      let result;
      if (itemType === 'education') {
        result = await AIResumeService.enhanceEducation(itemTitle, itemSubtitle, itemDesc || 'Provide details');
      } else {
        result = await AIResumeService.enhanceJobDescription(itemTitle, itemSubtitle, itemDesc || 'Provide details');
      }

      if (result.error) {
        toast.error('AI Error: ' + result.error);
      } else if (result.success && result.description) {
        const enhancedText = result.description;

        if (itemType === 'education') {
          setEducation(prev => prev.map(e => e.id === itemId ? { ...e, description: enhancedText, aiFeedback: result.feedback } : e));
        } else {
          setExperiences(prev => prev.map(e => e.id === itemId ? { ...e, description: enhancedText, aiFeedback: result.feedback } : e));
        }
        toast.success(`${itemType === 'education' ? 'Education' : 'Experience'} enhanced!`);
      } else if (result.suggestion) {
        // Fallback
        if (itemType === 'education') {
          setEducation(prev => prev.map(e => e.id === itemId ? { ...e, description: result.suggestion } : e));
        } else {
          setExperiences(prev => prev.map(e => e.id === itemId ? { ...e, description: result.suggestion } : e));
        }
        toast.success('Enhanced!');
      } else {
        console.error('AI Response missing description:', result);
        toast.error('Unexpected AI response');
      }
    } catch (error) {
      console.error('AI Enhancement Error:', error);
      toast.error('Failed to enhance with AI');
    } finally {
      setAiLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  if (loading) {
    console.log('ResumeBuilder is loading...');
    return <LoadingSpinner message="Loading resume…" sub="Preparing your builder" />;
  }

  if (error) {
    console.error('ResumeBuilder error state:', error);
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '20px',
        background: '#f3f4f6',
        padding: '20px',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: '40px' }}>✕</div>
        <div style={{ fontSize: '20px', color: '#ef4444', fontWeight: 'bold' }}>Error Loading Resume</div>
        <div style={{ fontSize: '16px', color: '#6b7280', textAlign: 'center', maxWidth: '400px' }}>{error}</div>
        <div style={{ fontSize: '14px', color: '#9ca3af' }}>Redirecting to dashboard...</div>
      </div>
    );
  }

  console.log('ResumeBuilder rendering with state:', {
    currentStep,
    loading,
    resumeTitle,
    personalInfo,
    experiences: experiences.length,
    education: education.length,
    skills: skills.length,
  });

  return (
    <div className="resume-builder">
      {/* LEFT SIDEBAR - Progress Steps */}
      <div className="resume-sidebar">
        <div className="sidebar-header">
          <button
            className="sidebar-back-btn"
            onClick={() => navigate('/my-resumes')}
            title="Back to My Resumes"
          >
            ← My Resumes
          </button>
          <div className="resume-logo">▤ Resume Now</div>
        </div>

        <div className="steps-container">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`step-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''
                }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <div className="step-circle">
                {currentStep > step.id ? (
                  <span className="checkmark">✓</span>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className="step-line"></div>
              <div className="step-name">{step.label}</div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <a href="#terms">Terms</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#contact">Contact Us</a>
          <p>© 2026, NOW Limited. All rights reserved.</p>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="resume-content">
        <div className="content-wrapper">
          {/* Step Content */}
          <div className="form-section">
            {currentStep === 1 && (
              <TemplateStep
                resumeId={id}
                templateId={templateId}
                onTemplateChange={(tid) => {
                  setTemplateId(tid);
                  setDesignSettings({ ...designSettings, template: tid });
                }}
              />
            )}
            {currentStep === 2 && <HeaderStep data={personalInfo} onChange={setPersonalInfo} />}
            {currentStep === 3 && (
              <ExperienceStep
                data={experiences}
                onChange={setExperiences}
                onEnhanceWithAI={handleEnhanceExperience}
                aiLoading={aiLoading}
              />
            )}
            {currentStep === 4 && (
              <EducationStep
                data={education}
                onChange={setEducation}
                onEnhanceWithAI={handleEnhanceExperience}
                aiLoading={aiLoading}
              />
            )}
            {currentStep === 5 && (
              <SkillsStep
                data={skills}
                onChange={setSkills}
                experiences={experiences}
                education={education}
                jobTitle={personalInfo.job_title}
              />
            )}
            {currentStep === 6 && (
              <SummaryStep
                data={personalInfo}
                onChange={setPersonalInfo}
                onGenerateSummary={handleGenerateSummary}
                aiLoading={aiLoading}
              />
            )}
            {currentStep === 7 && (
              <AdditionalDetailsStep
                data={additionalDetails}
                onChange={setAdditionalDetails}
                visibleSections={visibleSections}
                onToggleSection={setVisibleSections}
              />
            )}
            {currentStep === 8 && (
              <LayoutDesignStep
                designSettings={designSettings}
                onDesignChange={setDesignSettings}
                templateId={templateId}
                onTemplateChange={(tid) => {
                  setTemplateId(tid);
                  setDesignSettings({ ...designSettings, template: tid });
                }}
                fontScale={fontScale}
                onFontScaleChange={setFontScale}
                resumeId={id}
              />
            )}
            {currentStep === 9 && (
              <FinalizeStep
                designSettings={designSettings}
                onDesignChange={setDesignSettings}
                visibleSections={visibleSections}
                onDownload={handlePrint}
                resumeId={id}
                fontScale={fontScale}
                // Props for Edit Tab
                personalInfo={personalInfo}
                setPersonalInfo={setPersonalInfo}
                experiences={experiences}
                setExperiences={setExperiences}
                education={education}
                setEducation={setEducation}
                skills={skills}
                setSkills={setSkills}
                additionalDetails={additionalDetails}
                setAdditionalDetails={setAdditionalDetails}
                onEnhanceWithAI={handleEnhanceExperience}
                aiLoading={aiLoading}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="form-navigation">
            <button
              className="btn btn-secondary"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
            >
              Back
            </button>

            {/* Auto-save status badge */}
            <span style={{
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
              color: autoSaveStatus === 'saved'  ? '#16a34a'
                   : autoSaveStatus === 'saving' ? '#9ca3af'
                   : autoSaveStatus === 'error'  ? '#ef4444'
                   : 'transparent',
              transition: 'color 0.3s'
            }}>
              {autoSaveStatus === 'saving' && '↻ Saving…'}
              {autoSaveStatus === 'saved'  && '✓ Saved'}
              {autoSaveStatus === 'error'  && '⚠ Save failed'}
            </span>

            <button className="btn btn-primary" onClick={handleNextStep} disabled={saving}>
              {currentStep === STEPS.length ? 'Complete' : 'Continue'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PREVIEW PANEL — ref must be on the element that has the
           .resume-preview-panel class so the print-CSS visibility trick works
           inside the react-to-print iframe. */}
      <div className="resume-preview-panel" ref={componentRef}>
        <div>
          <ResumePreview
            data={personalInfo}
            experiences={experiences}
            education={education}
            skills={skills}
            additionalDetails={additionalDetails}
            templateId={templateId}
            designSettings={designSettings}
            blurMode={currentStep === 6} // Enable blur mode only for Summary step
            fontScale={fontScale}
          />
          {isAutoFitting && (
            <div className="auto-fit-overlay" style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(255,255,255,0.8)', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4b5563', fontWeight: 'bold'
            }}>
              ✦ Auto-fitting to A4...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= STEP COMPONENTS =============

function TemplateStep({ resumeId, templateId, onTemplateChange }) {
  return (
    <div className="step-content">
      <h1>Templates we recommend for you</h1>
      <p>You can always change your template later.</p>
      <TemplateSelector
        resumeId={resumeId}
        currentTemplateId={templateId}
        onTemplateSelect={onTemplateChange}
      />
    </div>
  );
}

function HeaderStep({ data, onChange }) {
  const [emailError, setEmailError] = useState('');
  const [linkedinError, setLinkedinError] = useState('');

  // ── Image compression helper ────────────────────────────────────────
  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 160;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateLinkedIn = (url) => {
    return /^https:\/\/(www\.)?linkedin\.com\/.*$/.test(url);
  };
  // Parsing location string if structured data is missing (fallback)
  useEffect(() => {
    // If we have a location string but no structured data, try to parse or leave it
    // Implementation of reverse parsing is complex, so we rely on user to re-select if they want smart features
    // We could potentially try to match if strict format "City, State, Country" is used.
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }

    if (name === 'linkedin') {
      if (value && !validateLinkedIn(value)) {
        setLinkedinError('Please enter a valid LinkedIn URL (https://linkedin.com/...)');
      } else {
        setLinkedinError('');
      }
    }

    const updated = { ...data, [name]: value };
    if (name === 'first_name' || name === 'last_name') {
      updated.full_name = `${updated.first_name || ''} ${updated.last_name || ''}`.trim();
    }
    onChange(updated);
  };

  const handlePhoneChange = (value, countryData) => {
    onChange({ ...data, phone: `+${value}` });
  };

  const handleCountryChange = (e) => {
    const countryCode = e.target.value;
    const country = Country.getCountryByCode(countryCode);
    onChange({
      ...data,
      country: countryCode,
      countryName: country ? country.name : '',
      state: '',
      city: '',
      location: country ? country.name : ''
    });
  };

  const handleStateChange = (e) => {
    const stateCode = e.target.value;
    const state = State.getStateByCodeAndCountry(stateCode, data.country);
    onChange({
      ...data,
      state: stateCode,
      stateName: state ? state.name : '',
      city: '',
      location: `${state ? state.name : ''}, ${data.countryName || ''}`
    });
  };

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    onChange({
      ...data,
      city: cityName,
      location: `${cityName}, ${data.stateName || ''}, ${data.countryName || ''}`
    });
  };

  const countries = Country.getAllCountries();
  const states = data.country ? State.getStatesOfCountry(data.country) : [];
  const cities = data.state ? City.getCitiesOfState(data.country, data.state) : [];

  return (
    <div className="step-content">
      <h1>Let's start with your header</h1>
      <p>Include your full name and multiple ways for employers to reach you.</p>

      <div className="form-grid">

        {/* ── Profile Picture (optional) ─────────────────────────────── */}
        <div className="form-group full-width" style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '10px' }}>
            Profile Picture&nbsp;
            <span style={{ fontWeight: 400, fontSize: '12px', color: '#9ca3af' }}>(optional — not required for ATS)</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* Circle preview */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              border: '2px dashed #d1d5db', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#f9fafb', flexShrink: 0
            }}>
              {data.profile_image_url
                ? <img src={data.profile_image_url} alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '32px', color: '#d1d5db' }}>●</span>
              }
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Upload trigger */}
              <label htmlFor="profile-img-upload" style={{
                cursor: 'pointer', background: '#2563eb', color: '#fff',
                padding: '7px 16px', borderRadius: '7px', fontSize: '13px',
                fontWeight: '500', display: 'inline-block', width: 'fit-content'
              }}>
                {data.profile_image_url ? '▢ Change Photo' : '▢ Upload Photo'}
              </label>
              <input
                id="profile-img-upload"
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    alert('Image must be under 2MB. Please choose a smaller file.');
                    return;
                  }
                  const compressed = await compressImage(file);
                  onChange({ ...data, profile_image_url: compressed, profile_image_enabled: true });
                  e.target.value = '';
                }}
              />

              {/* Show on resume toggle */}
              {data.profile_image_url && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px',
                  cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={!!data.profile_image_enabled}
                    onChange={(e) => onChange({ ...data, profile_image_enabled: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                  />
                  Show on resume
                </label>
              )}

              {/* Remove */}
              {data.profile_image_url && (
                <button type="button"
                  onClick={() => onChange({ ...data, profile_image_url: '', profile_image_enabled: false })}
                  style={{ background: 'none', border: 'none', color: '#ef4444',
                    cursor: 'pointer', fontSize: '13px', padding: 0, textAlign: 'left' }}>
                  ✕ Remove Photo
                </button>
              )}

              <span style={{ fontSize: '11px', color: '#9ca3af' }}>JPG or PNG, max 2MB</span>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>First Name</label>
          <input
            type="text"
            name="first_name"
            value={data.first_name}
            onChange={handleChange}
            placeholder="First name"
          />
        </div>

        <div className="form-group">
          <label>Last Name</label>
          <input
            type="text"
            name="last_name"
            value={data.last_name}
            onChange={handleChange}
            placeholder="Last name"
          />
        </div>

        <div className="form-group">
          <label>Desired Job Title</label>
          <input
            type="text"
            name="job_title"
            value={data.job_title}
            onChange={handleChange}
            placeholder="e.g. Product Manager"
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={data.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            style={{ borderColor: emailError ? '#ef4444' : '#e5e7eb' }}
          />
          {emailError && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{emailError}</span>}
        </div>

        <div className="form-group">
          <label>Phone</label>
          <PhoneInput
            country={'in'}
            value={data.phone}
            onChange={handlePhoneChange}
            inputStyle={{ width: '100%', height: '42px', borderRadius: '8px', borderColor: '#e5e7eb' }}
            containerStyle={{ width: '100%' }}
            dropdownStyle={{ background: 'white', zIndex: 9999 }}
            enableSearch={true}
            searchPlaceholder="Search country..."
          />
        </div>

        {/* Location Section */}
        <div className="form-group full-width" style={{ marginTop: '10px' }}>
          <label style={{ marginBottom: '8px', display: 'block' }}>Location</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {/* Country */}
            <select
              className="form-control"
              value={data.country || ''}
              onChange={handleCountryChange}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', width: '100%' }}
            >
              <option value="">Select Country</option>
              {countries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>

            {/* State */}
            <select
              className="form-control"
              value={data.state || ''}
              onChange={handleStateChange}
              disabled={!data.country}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', width: '100%', opacity: !data.country ? 0.6 : 1 }}
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>

            {/* City */}
            <select
              className="form-control"
              value={data.city || ''}
              onChange={handleCityChange}
              disabled={!data.state}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                width: '100%',
                opacity: !data.state ? 0.6 : 1,
                gridColumn: '1 / -1'
              }}
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          {/* Hidden input to ensure logic still works if it relies on manual typing? No, we rely on the derived string */}
        </div>

        <div className="form-group full-width">
          <label>LinkedIn URL</label>
          <input
            type="url"
            name="linkedin"
            value={data.linkedin}
            onChange={handleChange}
            placeholder="https://linkedin.com/in/you"
            style={{ borderColor: linkedinError ? '#ef4444' : '#e5e7eb' }}
          />
          {linkedinError && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{linkedinError}</span>}
        </div>

        <div className="form-group full-width">
          <label>Additional info</label>
          <input
            type="text"
            name="additional_info"
            value={data.additional_info}
            onChange={handleChange}
            placeholder="Portfolio, other contact, etc."
          />
        </div>
      </div>
    </div>
  );
}

function ExperienceStep({ data, onChange, onEnhanceWithAI, aiLoading }) {
  // Local state for suggestions per experience ID
  const [suggestions, setSuggestions] = useState({});

  const updateSuggestions = (id, type, list) => {
    setSuggestions(prev => ({
      ...prev,
      [id]: { ...prev[id], [type]: list }
    }));
  };

  const addExperience = () => {
    onChange([
      ...data,
      {
        id: Date.now(),
        job_title: '',
        company: '',
        companyLocation: {
          country: '',
          state: '',
          countryName: '',
          stateName: ''
        },
        start_date: '',
        end_date: '',
        current: false,
        description: '',
      },
    ]);
  };

  const updateExperience = (id, field, value) => {
    onChange(
      data.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const removeExperience = (id) => {
    onChange(data.filter((exp) => exp.id !== id));
  };

  const handleJobTitleChange = (id, value) => {
    // Allow only alphabets and spaces
    if (/^[a-zA-Z\s]*$/.test(value)) {
      updateExperience(id, 'job_title', value);

      // Debounced search
      if (value.length > 1) {
        searchJobTitles(value).then(results => {
          updateSuggestions(id, 'jobTitles', results);
        });
      }
    }
  };

  const handleCompanyChange = (id, value) => {
    updateExperience(id, 'company', value);
    if (value.length > 1) {
      searchCompanies(value).then(results => {
        updateSuggestions(id, 'companies', results);
      });
    }
  };

  const handleCountryChange = (id, countryCode) => {
    const country = Country.getCountryByCode(countryCode);
    const updated = data.map(exp => {
      if (exp.id === id) {
        return {
          ...exp,
          companyLocation: {
            country: countryCode,
            countryName: country ? country.name : '',
            state: '',
            stateName: ''
          }
        };
      }
      return exp;
    });
    onChange(updated);
  };

  const handleStateChange = (id, stateCode) => {
    const exp = data.find(e => e.id === id);
    const countryCode = exp.companyLocation?.country;
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);

    const updated = data.map(e => {
      if (e.id === id) {
        return {
          ...e,
          companyLocation: {
            ...e.companyLocation,
            state: stateCode,
            stateName: state ? state.name : ''
          }
        };
      }
      return e;
    });
    onChange(updated);
  };

  const handleAIEnhance = async (exp) => {
    if (onEnhanceWithAI) {
      await onEnhanceWithAI(exp.id, exp.job_title, exp.company, exp.description);
    }
  };

  return (
    <div className="step-content">
      <h1>Add details about your work experience</h1>
      <p>Start with your most recent job first.</p>

      {data.map((exp, index) => {
        const countries = Country.getAllCountries();
        // Safely access country code
        const countryCode = exp.companyLocation ? exp.companyLocation.country : '';
        const states = countryCode ? State.getStatesOfCountry(countryCode) : [];

        const currentSuggestions = suggestions[exp.id] || {};
        const jobTitleSuggestions = currentSuggestions.jobTitles || [];
        const companySuggestions = currentSuggestions.companies || [];

        return (
          <div key={exp.id} className="experience-card" style={{ marginBottom: '30px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Experience #{index + 1}</h3>
              {data.length > 0 && (
                <button onClick={() => removeExperience(exp.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  Remove
                </button>
              )}
            </div>

            <div className="form-grid">
              {/* Job Title */}
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  list={`job-titles-${exp.id}`}
                  value={exp.job_title}
                  onChange={(e) => handleJobTitleChange(exp.id, e.target.value)}
                  placeholder="e.g. Software Engineer"
                  autoComplete="off"
                />
                {!exp.job_title && <span style={{ fontSize: '11px', color: '#6b7280' }}>Required</span>}
                <datalist id={`job-titles-${exp.id}`}>
                  {jobTitleSuggestions.map((title) => <option key={title} value={title} />)}
                </datalist>
              </div>

              {/* Company */}
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  list={`companies-${exp.id}`}
                  value={exp.company}
                  onChange={(e) => handleCompanyChange(exp.id, e.target.value)}
                  placeholder="Company Name"
                  autoComplete="off"
                />
                {!exp.company && <span style={{ fontSize: '11px', color: '#6b7280' }}>Required</span>}
                <datalist id={`companies-${exp.id}`}>
                  {companySuggestions.map((comp) => <option key={comp} value={comp} />)}
                </datalist>
              </div>

              {/* Location Grid - Company Location */}
              <div className="form-group full-width" style={{ marginTop: '10px' }}>
                <label style={{ marginBottom: '8px', display: 'block' }}>Company Location</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <select
                    className="form-control"
                    value={exp.companyLocation?.country || ''}
                    onChange={(e) => handleCountryChange(exp.id, e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', width: '100%' }}
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    className="form-control"
                    value={exp.companyLocation?.state || ''}
                    onChange={(e) => handleStateChange(exp.id, e.target.value)}
                    disabled={!countryCode}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', width: '100%', opacity: !countryCode ? 0.6 : 1 }}
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {(!exp.companyLocation?.country || !exp.companyLocation?.state) && (
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>Location is required</span>
                )}
              </div>

              {/* Dates */}
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={exp.start_date}
                  onChange={(e) => updateExperience(exp.id, 'start_date', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>End Date</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'normal' }}>
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                    />
                    Currently working here
                  </label>
                </div>
                <input
                  type="date"
                  value={exp.end_date}
                  onChange={(e) => updateExperience(exp.id, 'end_date', e.target.value)}
                  disabled={exp.current}
                  style={{ width: '100%', opacity: exp.current ? 0.5 : 1 }}
                />
                {exp.start_date && exp.end_date && !exp.current && new Date(exp.start_date) > new Date(exp.end_date) && (
                  <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    End date cannot be before start date
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Description</label>
                  <button
                    className="btn-ai"
                    onClick={() => handleAIEnhance(exp)}
                    disabled={aiLoading[`exp-desc-${exp.id}`]}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      background: '#f0fdf4',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {aiLoading[`exp-desc-${exp.id}`] ? '✦ Enhancing...' : '✦ Enhance with AI'}
                  </button>
                </div>
                <textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                  placeholder="Describe your responsibilities and achievements..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />

                {/* AI Feedback Section */}
                {exp.aiFeedback && (
                  <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>※</span>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#0369a1', fontWeight: '600' }}>AI Suggestions for Improvement</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#0c4a6e', lineHeight: '1.5' }}>
                          {exp.aiFeedback}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button className="btn-secondary-outline full-width" onClick={addExperience} style={{ padding: '12px' }}>
        + Add Another Experience
      </button>
    </div>
  );
}

function EducationStep({ data, onChange, onEnhanceWithAI, aiLoading }) {
  const [suggestions, setSuggestions] = useState({});

  const EDUCATION_TYPES = [
    "School / Secondary Education",
    "Higher Secondary / Pre-University",
    "Diploma",
    "Undergraduate (UG)",
    "Postgraduate (PG)",
    "Doctorate (PhD)",
    "Professional Certification"
  ];

  const updateSuggestions = (id, type, list) => {
    setSuggestions(prev => ({
      ...prev,
      [id]: { ...prev[id], [type]: list }
    }));
  };

  const addEducation = () => {
    onChange([
      ...data,
      {
        id: Date.now(),
        type: '',
        institution: '',
        institutionLocation: {
          country: '',
          state: '',
          countryName: '',
          stateName: ''
        },
        degree: '',
        field_of_study: '',
        start_date: '',
        end_date: '',
        currently_studying: false,
        grade: '',
        description: '',
      },
    ]);
  };

  const updateEducation = (id, field, value) => {
    onChange(
      data.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu))
    );
  };

  const removeEducation = (id) => {
    onChange(data.filter((edu) => edu.id !== id));
  };

  const handleDegreeChange = (id, value) => {
    updateEducation(id, 'degree', value);
    if (value.length > 1) {
      searchDegrees(value).then(results => {
        updateSuggestions(id, 'degrees', results);
      });
    }
  };

  const handleMajorChange = (id, value) => {
    updateEducation(id, 'field_of_study', value);
    if (value.length > 1) {
      searchMajors(value).then(results => {
        updateSuggestions(id, 'majors', results);
      });
    }
  };

  const handleInstitutionChange = (id, value) => {
    updateEducation(id, 'institution', value);

    // Check if value matches any suggestion exactly to auto-fill location
    const suggestionsList = suggestions[id]?.institutions || [];
    const matchedInstitution = suggestionsList.find(i => i.name === value);

    if (matchedInstitution) {
      // Find Country Code
      const allCountries = Country.getAllCountries();
      const foundCountry = allCountries.find(c => c.name === matchedInstitution.country);

      if (foundCountry) {
        const countryCode = foundCountry.isoCode;

        // Find State Code
        const allStates = State.getStatesOfCountry(countryCode);
        // Try exact match or match containing name
        const foundState = allStates.find(s =>
          s.name === matchedInstitution.state ||
          s.name.includes(matchedInstitution.state) ||
          matchedInstitution.state.includes(s.name)
        );

        const updated = data.map(edu => {
          if (edu.id === id) {
            return {
              ...edu,
              institution: value,
              institutionLocation: {
                country: countryCode,
                countryName: foundCountry.name,
                state: foundState ? foundState.isoCode : '',
                stateName: foundState ? foundState.name : ''
              }
            };
          }
          return edu;
        });
        onChange(updated);
      }
    }

    if (value.length > 1) {
      searchInstitutions(value).then(results => {
        updateSuggestions(id, 'institutions', results);
      });
    }
  };

  const handleCountryChange = (id, countryCode) => {
    const country = Country.getCountryByCode(countryCode);
    const updated = data.map(edu => {
      if (edu.id === id) {
        return {
          ...edu,
          institutionLocation: {
            country: countryCode,
            countryName: country ? country.name : '',
            state: '',
            stateName: ''
          }
        };
      }
      return edu;
    });
    onChange(updated);
  };

  const handleStateChange = (id, stateCode) => {
    const edu = data.find(e => e.id === id);
    const countryCode = edu.institutionLocation?.country;
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);

    const updated = data.map(e => {
      if (e.id === id) {
        return {
          ...e,
          institutionLocation: {
            ...e.institutionLocation,
            state: stateCode,
            stateName: state ? state.name : ''
          }
        };
      }
      return e;
    });
    onChange(updated);
  };

  return (
    <div className="step-content">
      <h1>Education Details</h1>
      <p>Add your educational background to showcase your academic achievements.</p>

      {data.map((edu, index) => {
        const countries = Country.getAllCountries();
        const countryCode = edu.institutionLocation?.country || '';
        const states = countryCode ? State.getStatesOfCountry(countryCode) : [];

        const currentSuggestions = suggestions[edu.id] || {};
        const degreeSuggestions = currentSuggestions.degrees || [];
        const majorSuggestions = currentSuggestions.majors || [];
        const institutionSuggestions = currentSuggestions.institutions || [];

        return (
          <div key={edu.id} className="education-card" style={{ marginBottom: '30px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Education #{index + 1}</h3>
              <button onClick={() => removeEducation(edu.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                Remove
              </button>
            </div>

            <div className="form-grid">
              {/* Type of Education */}
              <div className="form-group full-width">
                <label>Education Type</label>
                <select
                  className="form-control"
                  value={edu.type}
                  onChange={(e) => updateEducation(edu.id, 'type', e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                >
                  <option value="">Select Education Type</option>
                  {EDUCATION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {!edu.type && <span style={{ fontSize: '11px', color: '#6b7280' }}>Required</span>}
              </div>

              {/* Institution Name */}
              <div className="form-group full-width">
                <label>Institution Name</label>
                <input
                  type="text"
                  list={`institutions-${edu.id}`}
                  value={edu.institution}
                  onChange={(e) => handleInstitutionChange(edu.id, e.target.value)}
                  placeholder="e.g. Stanford University"
                  autoComplete="off"
                />
                {!edu.institution && <span style={{ fontSize: '11px', color: '#6b7280' }}>Required</span>}
                <datalist id={`institutions-${edu.id}`}>
                  {institutionSuggestions.map((inst, idx) => (
                    <option key={idx} value={inst.name}>{inst.name} - {inst.state}, {inst.country}</option>
                  ))}
                </datalist>
              </div>

              {/* Degree */}
              <div className="form-group">
                <label>Degree / Qualification</label>
                <input
                  type="text"
                  list={`degrees-${edu.id}`}
                  value={edu.degree}
                  onChange={(e) => handleDegreeChange(edu.id, e.target.value)}
                  placeholder="e.g. Bachelor of Science"
                  autoComplete="off"
                />
                {!edu.degree && <span style={{ fontSize: '11px', color: '#6b7280' }}>Required</span>}
                <datalist id={`degrees-${edu.id}`}>
                  {degreeSuggestions.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>

              {/* Field of Study */}
              <div className="form-group">
                <label>Field of Study / Major</label>
                <input
                  type="text"
                  list={`majors-${edu.id}`}
                  value={edu.field_of_study}
                  onChange={(e) => handleMajorChange(edu.id, e.target.value)}
                  placeholder="e.g. Computer Science"
                  autoComplete="off"
                />
                {!edu.field_of_study && <span style={{ fontSize: '11px', color: '#6b7280' }}>Required</span>}
                <datalist id={`majors-${edu.id}`}>
                  {majorSuggestions.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              {/* Location */}
              <div className="form-group full-width">
                <label style={{ marginBottom: '8px', display: 'block' }}>Institution Location</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <select
                    className="form-control"
                    value={countryCode}
                    onChange={(e) => handleCountryChange(edu.id, e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', width: '100%' }}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                  </select>
                  <select
                    className="form-control"
                    value={edu.institutionLocation?.state || ''}
                    onChange={(e) => handleStateChange(edu.id, e.target.value)}
                    disabled={!countryCode}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', width: '100%', opacity: !countryCode ? 0.6 : 1 }}
                  >
                    <option value="">Select State</option>
                    {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                  </select>
                </div>
                {(!edu.institutionLocation?.country || !edu.institutionLocation?.state) && (
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>Location is required</span>
                )}
              </div>

              {/* Dates */}
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={edu.start_date}
                  onChange={(e) => updateEducation(edu.id, 'start_date', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>End Date</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'normal' }}>
                    <input
                      type="checkbox"
                      checked={edu.currently_studying}
                      onChange={(e) => updateEducation(edu.id, 'currently_studying', e.target.checked)}
                    />
                    Currently studying
                  </label>
                </div>
                <input
                  type="date"
                  value={edu.end_date}
                  onChange={(e) => updateEducation(edu.id, 'end_date', e.target.value)}
                  disabled={edu.currently_studying}
                  style={{ width: '100%', opacity: edu.currently_studying ? 0.5 : 1 }}
                />
                {edu.start_date && edu.end_date && !edu.currently_studying && new Date(edu.start_date) > new Date(edu.end_date) && (
                  <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    End date cannot be before start date
                  </span>
                )}
              </div>

              {/* Grade and Description */}
              <div className="form-group">
                <label>Grade / GPA / Percentage (Optional)</label>
                <input
                  type="text"
                  value={edu.grade}
                  onChange={(e) => updateEducation(edu.id, 'grade', e.target.value)}
                  placeholder="e.g. 3.8/4.0 or 85%"
                />
              </div>
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Description / Achievements (Optional)</label>
                  <button
                    onClick={() => {
                      const loading = aiLoading[`edu-desc-${edu.id}`];
                      if (!loading) {
                        onEnhanceWithAI('education', edu.id, edu.degree, edu.institution, edu.description);
                      }
                    }}
                    disabled={!edu.description || aiLoading[`edu-desc-${edu.id}`]}
                    className="ai-enhance-btn"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: !edu.description ? 0.5 : 1
                    }}
                  >
                    {aiLoading[`edu-desc-${edu.id}`] ? (
                      <>
                        <span className="animate-spin">✦</span> Enhancing...
                      </>
                    ) : (
                      <>
                        <span>✦</span> Enhance with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={edu.description}
                  onChange={(e) => updateEducation(edu.id, 'description', e.target.value)}
                  placeholder="Relevant coursework, awards, honors, etc."
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />

                {/* AI Feedback Section */}
                {edu.aiFeedback && (
                  <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>※</span>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#0369a1', fontWeight: '600' }}>AI Suggestions for Improvement</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#0c4a6e', lineHeight: '1.5' }}>
                          {edu.aiFeedback}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button className="btn-secondary-outline full-width" onClick={addEducation} style={{ padding: '12px' }}>
        + Add Another Education
      </button>
    </div>
  );
}

function SkillsStep({ data, onChange, experiences, education, jobTitle }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recommendedSkills, setRecommendedSkills] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiNote, setAiNote] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    // Load local recommended skills based on profile when component mounts
    const recs = getSuggestedSkills(experiences, education);
    // Filter out skills that are already added
    const existingNames = data.map(s => typeof s === 'object' ? s.name : s);
    const filteredRecs = recs.filter(s => !existingNames.includes(s));
    setRecommendedSkills(filteredRecs);
  }, [experiences, education, data]);

  const handleGetAiSuggestions = async () => {
    setLoadingAi(true);
    const currentSkills = data.map(s => typeof s === 'object' ? s.name : s);
    const prevTitles = experiences.map(e => e.job_title).filter(Boolean);

    const result = await AIResumeService.improveSkills(currentSkills, jobTitle, prevTitles);

    if (result.success && result.suggestions) {
      setAiSuggestions(result.suggestions.add_skills || []);
      setAiNote(result.suggestions.compatibility_note || '');
      toast.success('AI Skills Generated!');
    } else {
      toast.error('Failed to get AI suggestions');
    }
    setLoadingAi(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length > 1) {
      searchGlobalSkills(value).then(results => {
        // Filter out already added skills
        const existingNames = data.map(s => typeof s === 'object' ? s.name : s);
        setSuggestions(results.filter(s => !existingNames.includes(s)));
      });
    } else {
      setSuggestions([]);
    }
  };

  const addSkill = (skill) => {
    const existingNames = data.map(s => typeof s === 'object' ? s.name : s);
    if (skill && !existingNames.includes(skill)) {
      onChange([...data, skill]);
      setInputValue('');
      setSuggestions([]);
      // Update recommended list to remove added skill
      setRecommendedSkills(prev => prev.filter(s => s !== skill));
      setAiSuggestions(prev => prev.filter(s => s !== skill));
    }
  };

  const removeSkill = (skillToRemove) => {
    const nameToRemove = typeof skillToRemove === 'object' ? skillToRemove.name : skillToRemove;
    onChange(data.filter(skill => (typeof skill === 'object' ? skill.name : skill) !== nameToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Allow adding custom skill if not empty and not duplicate
      if (inputValue.trim()) {
        addSkill(inputValue.trim());
      }
    }
  };

  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingValue, setEditingValue] = useState('');

  const startEditing = (index, skill) => {
    setEditingIndex(index);
    setEditingValue(typeof skill === 'object' ? skill.name : skill);
  };

  const saveEditing = (index) => {
    if (editingValue.trim()) {
      const newData = [...data];
      const oldSkill = newData[index];
      if (typeof oldSkill === 'object') {
        newData[index] = { ...oldSkill, name: editingValue.trim() };
      } else {
        newData[index] = editingValue.trim();
      }
      onChange(newData);
    }
    setEditingIndex(-1);
    setEditingValue('');
  };

  const cancelEditing = () => {
    setEditingIndex(-1);
    setEditingValue('');
  };

  return (
    <div className="step-content">
      <h1>Skills</h1>
      <p>Add skills that are relevant to the job you're applying for.</p>

      {/* Selected Skills Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {data.map((skill, index) => {
          if (editingIndex === index) {
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => saveEditing(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditing(index);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  autoFocus
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid #2563eb',
                    fontSize: '14px',
                    outline: 'none',
                    width: '150px'
                  }}
                />
              </div>
            );
          }

          return (
            <div key={index} style={{
              background: '#eff6ff',
              color: '#2563eb',
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid #dbeafe',
              cursor: 'pointer'
            }}
              onDoubleClick={() => startEditing(index, skill)}
              title="Double-click to edit"
            >
              {typeof skill === 'object' ? skill.name : skill}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing(index, skill); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: '12px', display: 'flex', alignItems: 'center' }}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSkill(skill); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: '14px', display: 'flex', alignItems: 'center' }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="form-group full-width" style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill and press Enter (e.g. Project Management)"
          className="form-control"
          autoComplete="off"
        />

        {/* Dropdown for Search Suggestions */}
        {suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginTop: '5px',
            zIndex: 10,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {suggestions.map((skill, idx) => (
              <div
                key={idx}
                onClick={() => addSkill(skill)}
                style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #f3f4f6',
                  ':hover': { background: '#f9fafb' }
                }}
                onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.background = 'white'}
              >
                {skill}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Suggestions Button */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <button
          onClick={handleGetAiSuggestions}
          disabled={loadingAi}
          className="btn-ai full-width"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loadingAi ? '◈ Analyzing Profile...' : '◈ Get Smart Suggestions from AI'}
        </button>
      </div>

      {/* AI Results */}
      {aiSuggestions.length > 0 && (
        <div style={{
          marginBottom: '25px',
          background: '#fdf4ff',
          border: '1px solid #fbcfe8',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#db2777', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✦ AI Recommended for {jobTitle || 'You'}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 10px', marginBottom: '10px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>AI-generated content — please review carefully before use.</span>
          </div>
          {aiNote && (
            <p style={{ fontSize: '12px', color: '#be185d', marginBottom: '12px', fontStyle: 'italic' }}>
              "{aiNote}"
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {aiSuggestions.map((skill, idx) => (
              <button
                key={idx}
                onClick={() => addSkill(skill)}
                style={{
                  background: 'white',
                  border: '1px solid #f9a8d4',
                  color: '#be185d',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Skills Section (Local) */}
      {recommendedSkills.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>Basic Recommendations:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {recommendedSkills.slice(0, 10).map((skill, idx) => ( // Show top 10
              <button
                key={idx}
                onClick={() => addSkill(skill)}
                style={{
                  background: 'none',
                  border: '1px dashed #9ca3af',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  color: '#4b5563',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  ':hover': { borderColor: '#2563eb', color: '#2563eb', background: '#eff6ff' }
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.color = '#2563eb';
                  e.target.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#9ca3af';
                  e.target.style.color = '#4b5563';
                  e.target.style.background = 'none';
                }}
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStep({ data, onChange, onGenerateSummary, aiLoading }) {
  // Mock Prewritten Options
  const PREWRITTEN_OPTIONS = [
    { id: 1, title: 'General Professional', text: 'Dedicated and results-oriented professional with a strong track record of success. Proven ability to manage multiple projects simultaneously while maintaining high standards of quality.' },
    { id: 2, title: 'Software Engineer', text: 'Innovative Software Engineer with 5+ years of experience in full-stack development. Expert in React, Node.js, and cloud architecture with a passion for building scalable solutions.' },
    { id: 3, title: 'Project Manager', text: 'Strategic Project Manager skilled in leading cross-functional teams to deliver complex projects on time and within budget. Certified PMP with expertise in Agile methodologies.' },
    { id: 4, title: 'Customer Service', text: 'Empathetic Customer Service Representative committed to providing exceptional support. Strong communication skills and a proven ability to resolve issues efficiently.' },
    { id: 5, title: 'Data Analyst', text: 'Detail-oriented Data Analyst proficient in SQL, Python, and Tableau. Experienced in transforming raw data into actionable insights to drive business growth.' },
  ];

  const handleChange = (e) => {
    onChange({ ...data, summary: e.target.value });
  };

  const handleOptionClick = (text) => {
    // Append or Replace logic - here we append if empty, or replace if user confirms
    if (!data.summary || window.confirm("Replace current summary?")) {
      onChange({ ...data, summary: text });
    }
  };

  const handleGenerate = async () => {
    if (data.summary && !window.confirm("This will replace your current summary. Continue?")) {
      return;
    }
    await onGenerateSummary();
  };

  const isLoading = aiLoading && aiLoading['summary-gen'];

  return (
    <div className="step-content" style={{ maxWidth: '100%' }}>
      <h1>Craft your professional summary</h1>
      <p>Use our AI to generate a personalized summary based on your profile, or choose a pre-written example.</p>

      <div className="summary-step-container">
        {/* Left Panel: Prewritten Options */}
        <div className="prewritten-panel">
          <div className="prewritten-header">Recommended for you</div>
          <div className="prewritten-list">
            {PREWRITTEN_OPTIONS.map(opt => (
              <div key={opt.id} className="prewritten-card" onClick={() => handleOptionClick(opt.text)}>
                <h4>{opt.title}</h4>
                <p>{opt.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Panel: Editor */}
        <div className="editor-panel">
          <div className="editor-container">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                className="ai-enhance-btn"
                onClick={handleGenerate}
                disabled={isLoading}
                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-small" style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                    Generating...
                  </>
                ) : (
                  <>✦ Generate AI Summary</>
                )}
              </button>
            </div>

            <RichTextEditor
              value={data.summary || ''}
              onChange={(val) => onChange({ ...data, summary: val })}
              placeholder="Type your professional summary here or generate one with AI..."
              disabled={isLoading}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right', marginTop: '4px' }}>
            {/* HTML stripping for char count is optional but nice */}
            {data.summary ? data.summary.replace(/<[^>]*>/g, '').length : 0} characters
          </div>
        </div>
      </div>
    </div>
  );
}

function AdditionalDetailsStep({ data, onChange, visibleSections, onToggleSection }) {
  const handleAddItem = (section, initialItem) => {
    const currentItems = data[section] || [];
    onChange({
      ...data,
      [section]: [...currentItems, initialItem]
    });
  };

  const handleRemoveItem = (section, index) => {
    const currentItems = [...(data[section] || [])];
    currentItems.splice(index, 1);
    onChange({
      ...data,
      [section]: currentItems
    });
  };

  return (
    <div className="step-content">
      <h1>Select (optional) details to add</h1>
      <p>Pick anything you'd like to highlight that's not already on your resume.</p>

      <div className="sections-grid">
        <SectionButton
          name="Languages"
          icon="◎"
          visible={visibleSections.languages}
          onToggle={() => onToggleSection({ ...visibleSections, languages: !visibleSections.languages })}
        />
        <SectionButton
          name="Awards & Honors"
          icon="★"
          visible={visibleSections.awards}
          onToggle={() => onToggleSection({ ...visibleSections, awards: !visibleSections.awards })}
        />
        <SectionButton
          name="Certifications"
          icon="≡"
          visible={visibleSections.certifications}
          onToggle={() => onToggleSection({ ...visibleSections, certifications: !visibleSections.certifications })}
        />
        <SectionButton
          name="Activities"
          icon="◎"
          visible={visibleSections.activities}
          onToggle={() => onToggleSection({ ...visibleSections, activities: !visibleSections.activities })}
        />
        <SectionButton
          name="Social Links"
          icon="↗"
          visible={visibleSections.websites}
          onToggle={() => onToggleSection({ ...visibleSections, websites: !visibleSections.websites })}
        />
        <SectionButton
          name="References"
          icon="●"
          visible={visibleSections.references}
          onToggle={() => onToggleSection({ ...visibleSections, references: !visibleSections.references })}
        />
      </div>

      <div className="additional-details-forms">
        {visibleSections.languages && (
          <LanguageSectionEditor
            items={data.languages}
            onChange={(newItems) => onChange({ ...data, languages: newItems })}
          />
        )}

        {visibleSections.awards && (
          <SectionEditor
            title="Awards & Honors"
            items={data.awards}
            onAdd={(newItem) => handleAddItem('awards', newItem)}
            onRemove={(idx) => handleRemoveItem('awards', idx)}
            type="text"
            placeholder="e.g. Employee of the Month 2023"
          />
        )}

        {visibleSections.certifications && (
          <SectionEditor
            title="Certifications & Licenses"
            items={data.certifications}
            onAdd={(newItem) => handleAddItem('certifications', newItem)}
            onRemove={(idx) => handleRemoveItem('certifications', idx)}
            type="text"
            placeholder="e.g. AWS Certified Solutions Architect"
          />
        )}

        {visibleSections.activities && (
          <SectionEditor
            title="Activities"
            items={data.activities}
            onAdd={(newItem) => handleAddItem('activities', newItem)}
            onRemove={(idx) => handleRemoveItem('activities', idx)}
            type="text"
            placeholder="e.g. Volunteer at Local Shelter"
          />
        )}

        {visibleSections.websites && (
          <SectionEditor
            title="Websites & Social Links"
            items={data.websites}
            onAdd={(newItem) => handleAddItem('websites', newItem)}
            onRemove={(idx) => handleRemoveItem('websites', idx)}
            type="link"
            placeholder="e.g. LinkedIn"
          />
        )}

        {visibleSections.references && (
          <SectionEditor
            title="References"
            items={data.references}
            onAdd={(newItem) => handleAddItem('references', newItem)}
            onRemove={(idx) => handleRemoveItem('references', idx)}
            type="reference"
            placeholder="Reference Name"
          />
        )}
      </div>
    </div>
  );
}

function SectionButton({ name, icon, visible, onToggle }) {
  return (
    <button
      className={`section-button ${visible ? 'selected' : ''}`}
      onClick={onToggle}
    >
      <span>{icon}</span>
      <span>{name}</span>
      {visible && <span className="checkmark">✓</span>}
    </button>
  );
}



function SectionEditor({ title, items = [], onAdd, onUpdate, onRemove, type, placeholder }) {
  // Local state for new item inputs
  const [newItemValue, setNewItemValue] = useState('');
  // For complex types (link, reference)
  const [newLabel, setNewLabel] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');

  const [loading, setLoading] = useState(false);

  const handleEnhance = async (value) => {
    if (!value.trim()) return;

    setLoading(true);
    // Determine context based on title
    let context = "general";
    if (title.includes("Activity")) context = "Activity/Volunteering";
    if (title.includes("Award")) context = "Award/Honor";
    if (title.includes("Certification")) context = "Certification";

    const result = await AIResumeService.enhanceText(value, context);

    if (result.success && result.enhanced_text) {
      if (type === 'text') setNewItemValue(result.enhanced_text);
      toast.success('Enhanced with AI!');
    } else {
      toast.error('Failed to enhance');
    }
    setLoading(false);
  };

  const handleAddItem = () => {
    // This function is kept for reference but logic is moved to button click for simplicity
    // or check if it's meant to be used.
    // Currently the Add button uses inline logic.
  };

  return (
    <div className="section-editor" style={{ marginTop: '20px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>{title}</h3>

      {/* Chips/List Display */}
      <div className="items-list" style={{ marginBottom: '20px' }}>
        {items.length === 0 && <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No items added yet.</p>}
        {items.map((item, idx) => (
          <div key={idx} style={{
            background: '#f3f4f6',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '14px', color: '#1f2937' }}>
              {type === 'text' && item}
              {type === 'link' && (
                <span><strong>{item.label}</strong> - {item.link}</span>
              )}
              {type === 'reference' && (
                <span><strong>{item.name}</strong> ({item.contact})</span>
              )}
            </span>
            <button
              onClick={() => onRemove(idx)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add New Item Form */}
      <div className="form-grid">
        {type === 'text' && (
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Add Item</label>
            <input
              type="text"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              placeholder={placeholder}
              className="form-control"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newItemValue.trim()) {
                    onAdd(newItemValue);
                    setNewItemValue('');
                  }
                }
              }}
            />
            {newItemValue && (
              <button
                className="ai-enhance-btn-small"
                onClick={() => handleEnhance(newItemValue)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '38px', // Adjust based on label height
                  fontSize: '11px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                {loading ? '✦...' : '✦ Enhance'}
              </button>
            )}
          </div>
        )}

        {type === 'link' && (
          <>
            <div className="form-group">
              <label>Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Portfolio"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>URL</label>
              <input
                type="text"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://..."
                className="form-control"
              />
            </div>
          </>
        )}

        {type === 'reference' && (
          <>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Contact Info</label>
              <input
                type="text"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="Email or Phone"
                className="form-control"
              />
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => {
            // Logic to add item
            if (type === 'text' && newItemValue.trim()) {
              onAdd(newItemValue);
              setNewItemValue('');
            } else if (type === 'link' && newLink.trim()) {
              onAdd({ label: newLabel, link: newLink });
              setNewLabel('');
              setNewLink('');
            } else if (type === 'reference' && newName.trim()) {
              onAdd({ name: newName, contact: newContact });
              setNewName('');
              setNewContact('');
            }
          }}
          className="btn btn-primary"
          disabled={
            (type === 'text' && !newItemValue.trim()) ||
            (type === 'link' && !newLink.trim()) ||
            (type === 'reference' && !newName.trim())
          }
        >
          + Add {title.slice(0, -1)}
        </button>
      </div>
    </div >
  );
}

// ─── Step 8: Layout & Design ──────────────────────────────────
function LayoutDesignStep({ designSettings, onDesignChange, templateId, onTemplateChange, fontScale, onFontScaleChange, resumeId }) {
  const DESIGN_TEMPLATES = [
    { id: 1, name: 'Classic Professional', description: 'Traditional layout with serif fonts', preview: '≡', color: '#374151' },
    { id: 2, name: 'Modern Minimal', description: 'Clean sans-serif with blue accents', preview: '◆', color: '#2563eb' },
    { id: 3, name: 'Creative Centered', description: 'Centered headers with fuchsia tones', preview: '✦', color: '#d946ef' },
  ];

  const ACCENT_COLORS = [
    '#333333', '#2563eb', '#059669', '#d946ef', '#dc2626',
    '#f59e0b', '#6366f1', '#0891b2', '#84cc16', '#ec4899',
  ];

  const FONT_OPTIONS = [
    'Calibri', 'Arial', 'Times New Roman', 'Georgia',
    'Roboto', 'Inter', 'Lato', 'Montserrat', 'Open Sans', 'Merriweather',
  ];

  return (
    <div className="step-content">
      <h1>Layout & Design</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Customize the visual appearance of your resume. All templates are ATS-friendly.
      </p>

      {/* Template Selection */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Template Style</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {DESIGN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onTemplateChange(t.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '16px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                border: templateId === t.id ? `2px solid ${t.color}` : '2px solid #e2e8f0',
                background: templateId === t.id ? `${t.color}08` : 'white',
                boxShadow: templateId === t.id ? `0 0 0 3px ${t.color}20` : 'none',
              }}
            >
              <span style={{ fontSize: '32px' }}>{t.preview}</span>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{t.name}</span>
              <span style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>{t.description}</span>
              {templateId === t.id && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: t.color,
                  background: `${t.color}15`, padding: '2px 10px', borderRadius: '20px'
                }}>Selected</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Accent Color</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onDesignChange({ ...designSettings, colors: color })}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                backgroundColor: color, border: designSettings.colors === color ? '3px solid #1e293b' : '2px solid #e2e8f0',
                boxShadow: designSettings.colors === color ? '0 0 0 2px white, 0 0 0 4px ' + color : 'none',
                transition: 'all 0.15s'
              }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Typography */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Typography</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Font Family</label>
            <select
              value={designSettings.fontFamily || 'Calibri'}
              onChange={(e) => onDesignChange({ ...designSettings, fontFamily: e.target.value })}
              className="form-control"
            >
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Font Size ({designSettings.fontSize || 11}pt)</label>
            <input
              type="range" min="8" max="14" step="0.5"
              value={designSettings.fontSize || 11}
              onChange={(e) => onDesignChange({ ...designSettings, fontSize: parseFloat(e.target.value) })}
              className="form-control"
            />
          </div>
        </div>
      </div>

      {/* Density / Font Scale */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Content Density</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Compact', scale: 0.85, desc: 'Fit more content' },
            { label: 'Standard', scale: 1.0, desc: 'Balanced spacing' },
            { label: 'Spacious', scale: 1.1, desc: 'More breathing room' },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => onFontScaleChange(preset.scale)}
              style={{
                padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', flex: '1 1 120px',
                border: fontScale === preset.scale ? '2px solid #2563eb' : '2px solid #e2e8f0',
                background: fontScale === preset.scale ? '#eff6ff' : 'white',
                textAlign: 'center', transition: 'all 0.15s'
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', display: 'block' }}>{preset.label}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{preset.desc}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
            Fine-tune: {Math.round(fontScale * 100)}%
          </label>
          <input
            type="range" min="0.7" max="1.3" step="0.01"
            value={fontScale}
            onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
      </div>

      {/* Advanced Editor Link */}
      {resumeId && (
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)',
          border: '1px solid #bfdbfe', borderRadius: '12px',
          padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 4px', color: '#1e40af', fontSize: '15px', fontWeight: 700 }}>
              Advanced Editor
            </h4>
            <p style={{ margin: 0, color: '#3b82f6', fontSize: '13px' }}>
              Drag-and-drop section reordering, precision spacing controls, and live preview.
            </p>
          </div>
          <button
            onClick={() => window.location.href = `/resume/${resumeId}/editor`}
            style={{
              background: '#2563eb', color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: '8px', fontWeight: 700,
              fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)', transition: 'all 0.2s'
            }}
          >
            Open Editor →
          </button>
        </div>
      )}
    </div>
  );
}

function FinalizeStep({
  designSettings, onDesignChange, visibleSections, onDownload, resumeId, fontScale,
  personalInfo, setPersonalInfo,
  experiences, setExperiences,
  education, setEducation,
  skills, setSkills,
  additionalDetails, setAdditionalDetails,
  onEnhanceWithAI, aiLoading
}) {
  const [activeTab, setActiveTab] = useState('download');
  const [expandedSection, setExpandedSection] = useState(null);
  const [atsMode, setAtsMode] = useState(false);
  const [showATSModal, setShowATSModal] = useState(false);

  // Helper to generate plain text for AI
  const getResumeAsText = () => {
    const parts = [];
    if (personalInfo) {
      parts.push(`Name: ${personalInfo.full_name}`);
      parts.push(`Role: ${personalInfo.job_title}`);
      parts.push(`Summary: ${personalInfo.summary}`);
    }

    if (experiences?.length) {
      parts.push('\nEXPERIENCE:');
      experiences.forEach(exp => {
        parts.push(`${exp.job_title} at ${exp.company} (${exp.start_date} - ${exp.end_date}): ${exp.description}`);
      });
    }

    if (education?.length) {
      parts.push('\nEDUCATION:');
      education.forEach(edu => {
        parts.push(`${edu.degree} from ${edu.institution} (${edu.year})`);
      });
    }

    if (skills?.length) {
      parts.push('\nSKILLS:');
      const skillList = skills.map(s => typeof s === 'string' ? s : s.name).join(', ');
      parts.push(skillList);
    }

    return parts.join('\n');
  };

  // Toggle Accordion
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // ATS Analysis Logic
  const getATSScore = () => {
    let score = 100;
    const warnings = [];
    const passed = [];

    // 1. Template Check
    if (designSettings.template === 1 || designSettings.template === 4) { // Modern/Creative often have tables/columns
      // These are actually ATS-friendly templates, no penalty needed
      passed.push("Template structure is clean and ATS-friendly.");
    } else {
      passed.push("Template structure is clean and single-column.");
    }

    // 2. Content Checks
    if (!personalInfo.summary || personalInfo.summary.length < 50) {
      score -= 10;
      warnings.push("Summary is too short. Aim for at least 50 characters to include keywords.");
    } else {
      passed.push("Summary length is good.");
    }

    if (skills.length < 5) {
      score -= 10;
      warnings.push("Add more skills (at least 5) to improve keyword matching.");
    } else {
      passed.push("Skills section is well-populated.");
    }

    return { score, warnings, passed };
  };

  const atsAnalysis = getATSScore();

  // Downloads - Using direct backend URLs
  const handleDownload = async (format) => {
    if (!resumeId) {
      console.error("No resume ID found for download");
      return;
    }

    // UX: Show loading state via DOM manipulation since we don't have easy access to local state here
    const btn = document.activeElement;
    let originalText = "";
    if (btn) {
      originalText = btn.innerText;
      btn.innerText = "Generating...";
      btn.disabled = true;
      document.body.style.cursor = 'wait';
    }

    try {
      // Use POST to send styling parameters (fontScale)
      // Note: Backend might need CORS preflight for POST, but localhost should be fine or proxy
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/resume/${resumeId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          format: format,
          fontScale: fontScale,
          // We can also send margins if custom, but for now specific scale is key
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Server error");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Attempt to get filename from headers
      const disposition = response.headers.get('Content-Disposition');
      let filename = `resume.${format === 'word' ? 'doc' : format}`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Download error:", e);
      alert("Failed to generate Word file. Please try again.\nDetails: " + e.message);
    } finally {
      if (btn) {
        btn.innerText = originalText || (format === 'doc' ? "Download Word" : "Download DOCX");
        btn.disabled = false;
        document.body.style.cursor = 'default';
      }
    }
  };

  const TEMPLATES = [
    { id: 1, name: 'Modern', color: 'blue' },
    { id: 2, name: 'Classic', color: 'gray' },
    { id: 3, name: 'Minimal', color: 'white' },
    { id: 4, name: 'Creative', color: 'teal' },
  ];

  const COLORS = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Gray', value: '#6B7280' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Green', value: '#10B981' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Pink', value: '#EC4899' },
  ];

  const FONTS = [
    "Calibri", "Arial", "Times New Roman", "Georgia",
    "Roboto", "Open Sans", "Lato", "Montserrat", "Merriweather"
  ];

  const renderEditTab = () => (
    <div className="edit-tab-container">
      <h3>◆ Customize Your Look</h3>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Refine the visual style of your resume. Content changes should be made in previous steps.
      </p>

      {/* Visual Style Section */}
      <div className="accordion-item" style={{ overflow: 'visible' }}>
        <div className="accordion-content" style={{ display: 'block', padding: '1.5rem' }}>
          <div className="design-section">
            <h4>Accent Color</h4>
            <div className="color-grid">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`color-button ${designSettings.colors === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => onDesignChange({ ...designSettings, colors: color.value })}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="design-section">
            <h4>Choose Template</h4>
            <div className="template-grid">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className={`template-button ${designSettings.template === template.id ? 'selected' : ''}`}
                  onClick={() => onDesignChange({ ...designSettings, template: template.id })}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <div className="design-section">
            <h4>Typography</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Font Family</label>
                <select
                  value={designSettings.fontFamily}
                  onChange={(e) => onDesignChange({ ...designSettings, fontFamily: e.target.value })}
                  className="form-control"
                >
                  {FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Font Size ({designSettings.fontSize}pt)</label>
                <input
                  type="range" min="8" max="14"
                  value={designSettings.fontSize}
                  onChange={(e) => onDesignChange({ ...designSettings, fontSize: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderATSCheck = () => (
    <div className="ats-check-container">

      {/* NEW: Gemini AI Scan Section */}
      <div className="ats-ai-section" style={{
        background: '#eff6ff',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid #bfdbfe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h4 style={{ margin: '0 0 5px 0', color: '#1e40af' }}>✦ AI Deep Scan</h4>
          <p style={{ margin: 0, color: '#1e3a8a', fontSize: '14px' }}>
            Use Google Gemini to analyze your resume against real-world ATS algorithms.
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ background: '#2563eb', border: 'none' }}
          onClick={() => setShowATSModal(true)}
        >
          Run Deep Scan
        </button>
      </div>

      <div className="ats-score-card">
        <div className="score-circle" style={{ borderColor: atsAnalysis.score > 80 ? '#10b981' : '#f59e0b' }}>
          <span>{atsAnalysis.score}%</span>
          <small>Basic Score</small>
        </div>
        <div className="ats-toggle">
          <label className="toggle-label">
            <input type="checkbox" checked={atsMode} onChange={(e) => setAtsMode(e.target.checked)} />
            <span className="slider round"></span>
            Force ATS-Friendly Mode
          </label>
          <p className="hint">Simplifies formatting for better parsing</p>
        </div>
      </div>

      <div className="ats-feedback">
        <h4>Basic Formatting Checks</h4>
        <ul className="feedback-list">
          {atsAnalysis.warnings.map((w, i) => (
            <li key={i} className="warning">⚠ {w}</li>
          ))}
          {atsAnalysis.passed.map((p, i) => (
            <li key={i} className="passed">✓ {p}</li>
          ))}
        </ul>
      </div>

      {atsAnalysis.score < 80 && (
        <div className="ats-recommendation">
          <p><strong>Recommendation:</strong> Switch to "Minimal Clean" template for best ATS results.</p>
          <button className="btn btn-secondary btn-sm" onClick={() => onDesignChange({ ...designSettings, template: 3 })}>
            Apply Minimal Template
          </button>
        </div>
      )}
    </div>
  );

  const renderDownloadTab = () => (
    <div className="download-tab-container">
      <div className="design-summary">
        <h3>Ready to Export?</h3>
        <p>Choose your preferred format below. Your resume is saved automatically.</p>
      </div>

      <div className="download-grid">
        <div className="download-card">
          <div className="icon">▤</div>
          <h4>PDF Document</h4>
          <p>Best for emailing and preserving layout exactly as seen.</p>
          <button className="btn btn-Download" onClick={onDownload}>Download PDF</button>
        </div>

        <div className="download-card">
          <div className="icon">✎</div>
          <h4>Word (.doc)</h4>
          <p>Editable format compatible with most ATS and HR systems.</p>
          <button className="btn btn-Download" onClick={() => handleDownload('doc')}>Download Word</button>
        </div>

        <div className="download-card">
          <div className="icon">▤</div>
          <h4>Word (.docx)</h4>
          <p>Modern Word format. Good for editing, may shift layout slightly.</p>
          <button className="btn btn-Download" onClick={() => handleDownload('docx')}>Download DOCX</button>
        </div>
      </div>

      <div className="final-checklist">
        <h4>Final Checklist</h4>
        <ul>
          <li>{personalInfo.email ? '✓' : '□'} Email attached</li>
          <li>{personalInfo.phone ? '✓' : '□'} Phone number attached</li>
          <li>{skills.length > 0 ? '✓' : '□'} Skills included</li>
          <li>{experiences.length > 0 ? '✓' : '□'} Experience added</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="step-content finalize-step">
      <h1>Finalize & Download</h1>
      <p>Review your content, check ATS compatibility, and export.</p>

      {/* Go to Advanced Editor CTA */}
      {resumeId && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: '#1e40af', fontSize: '14px' }}>◆ Want more control?</h4>
            <p style={{ margin: 0, color: '#3b82f6', fontSize: '13px' }}>
              Open the advanced editor with section reordering, typography, and spacing controls.
            </p>
          </div>
          <button
            onClick={() => window.location.href = `/resume/${resumeId}/editor`}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              transition: 'all 0.2s'
            }}
          >
            Open Resume Editor →
          </button>
        </div>
      )}

      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          ◆ Design & Style
        </button>
        <button
          className={`tab-btn ${activeTab === 'ats' ? 'active' : ''}`}
          onClick={() => setActiveTab('ats')}
        >
          ◎ ATS Check
        </button>
        <button
          className={`tab-btn ${activeTab === 'download' ? 'active' : ''}`}
          onClick={() => setActiveTab('download')}
        >
          ↓ Download
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'edit' && renderEditTab()}
        {activeTab === 'ats' && renderATSCheck()}
        {activeTab === 'download' && renderDownloadTab()}
      </div>
      {/* ATS Modal */}
      <ATSChecker
        isVisible={showATSModal}
        onClose={() => setShowATSModal(false)}
        resumeText={getResumeAsText()}
      />
    </div >
  );
}


function LanguageSectionEditor({ items = [], onChange }) {
  const [inputValue, setInputValue] = useState('');
  const [proficiency, setProficiency] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.length > 1) {
        const results = await searchLanguages(inputValue);
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [inputValue]);

  const addLanguage = () => {
    // Store as structured object
    const langName = inputValue.trim();
    if (!langName) return;

    // Check duplicates
    const currentNames = items.map(i => typeof i === 'string' ? i : i.language);
    if (!currentNames.includes(langName)) {
      onChange([...items, { language: langName, proficiency }]);
    }
    setInputValue('');
    setProficiency('');
    setSuggestions([]);
  };

  const removeLanguage = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleSuggestionClick = (lang) => {
    setInputValue(lang);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="section-editor" style={{ marginTop: '20px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Languages</h3>

      {/* Chips Display */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            background: '#e0e7ff',
            borderRadius: '16px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: '#3730a3'
          }}>
            <span>
              {typeof item === 'string' ? item : `${item.language}${item.proficiency ? ` - ${item.proficiency}` : ''}`}
            </span>
            <button
              onClick={() => removeLanguage(idx)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3730a3', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Standardized Form Layout */}
      <div className="form-grid">
        <div className="form-group" style={{ position: 'relative' }}>
          <label>Language</label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. English"
            className="form-control"
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onFocus={() => inputValue.length > 1 && setShowSuggestions(true)}
          />
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(s)}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Proficiency (Optional)</label>
          <select
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value)}
            className="form-control"
          >
            <option value="">Select...</option>
            <option value="Native">Native</option>
            <option value="Fluent">Fluent</option>
            <option value="Proficient">Proficient</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Basic">Basic</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={addLanguage}
          className="btn btn-primary"
          disabled={!inputValue.trim()}
        >
          + Add Language
        </button>
      </div>
    </div>
  );
}

export default ResumeBuilder;
