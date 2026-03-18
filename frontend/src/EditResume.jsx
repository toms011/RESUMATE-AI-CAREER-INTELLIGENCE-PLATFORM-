import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api, { API_BASE } from './utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './components/LoadingSpinner';
import AIEnhancementPanel from './components/AIEnhancementPanel';
import AIResumeService from './services/AIResumeService';
import TemplateSelector from './components/TemplateSelector';
import ResumePreview from './components/ResumePreview';

// Reusable input components for consistent styling
const Input = (props) => (
  <input
    {...props}
    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
  />
);

const Select = (props) => (
  <select
    {...props}
    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
  />
);

function EditResume() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const componentRef = useRef(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState({});

  // --- STATE ---
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '', email: '', phone: '', linkedin: '', summary: ''
  });
  const [experiences, setExperiences] = useState([]);
  const [newExp, setNewExp] = useState({
    job_title: '', company: '', start_date: '', end_date: '', description: ''
  });
  const [education, setEducation] = useState([]);
  const [newEdu, setNewEdu] = useState({
    degree: '', institution: '', year: ''
  });
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState({ name: '', proficiency: 'Intermediate' });
  const [additionalDetails, setAdditionalDetails] = useState({
    languages: [], awards: [], certifications: [], activities: [], websites: [], references: []
  });
  const [currentTemplateId, setCurrentTemplateId] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/resume/${id}`);
      setResumeTitle(response.data.title);

      if (response.data.personal_info) setPersonalInfo(response.data.personal_info);
      if (response.data.experiences) setExperiences(response.data.experiences);
      if (response.data.education) setEducation(response.data.education);
      if (response.data.skills) setSkills(response.data.skills);
      if (response.data.additional_details) setAdditionalDetails(prev => ({ ...prev, ...response.data.additional_details }));

      // If template_id is in response, set it
      if (response.data.design_settings && response.data.design_settings.template) {
        setCurrentTemplateId(response.data.design_settings.template);
      }

    } catch (error) {
      console.error("Error loading resume:", error);
      toast.error("Failed to load resume data. Please try again.");
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- INLINE EDIT HANDLER ---
  const handleInlineUpdate = (section, itemId, field, value) => {
    // Debounce or just update state directly? React state updates are fast enough for typing usually.
    // We will update state locally. The "Save" buttons will persist it, or we can auto-save.
    // For now, let's update local state so it reflects in UI.

    if (section === 'personal_info') {
      setPersonalInfo(prev => ({ ...prev, [field]: value }));
    } else if (section === 'experience') {
      setExperiences(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    } else if (section === 'education') {
      setEducation(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    } else if (section === 'skills') {
      setSkills(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    }
  };

  // --- HANDLERS (Personal Info) ---
  const handleChange = (e) => {
    setPersonalInfo({ ...personalInfo, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/resume/${id}/personal_info`, personalInfo);
      toast.success("Personal Info Saved!");
    } catch (error) { toast.error("Error saving info"); }
  };

  // AI enhance professional summary
  const handleAIEnhanceSummary = async () => {
    if (!personalInfo.full_name) {
      toast.error("Please enter your name first");
      return;
    }

    setAiLoading({ ...aiLoading, summary: true });
    try {
      const skillsList = skills.map(s => s.name);
      const enhanced = await AIResumeService.enhanceSummary(personalInfo.full_name, skillsList);
      setPersonalInfo({ ...personalInfo, summary: enhanced });
      toast.success("Summary enhanced with AI!");
    } catch (error) {
      toast.error("Error enhancing summary");
    } finally {
      setAiLoading({ ...aiLoading, summary: false });
    }
  };

  // --- HANDLERS (Experience) ---
  const handleExpChange = (e) => {
    setNewExp({ ...newExp, [e.target.name]: e.target.value });
  };

  const handleAIGenerate = async () => {
    if (!newExp.job_title || !newExp.company) {
      toast.error("Please enter job title and company first");
      return;
    }

    setAiLoading({ ...aiLoading, newExp: true });
    try {
      const generated = await AIResumeService.generateJobDescription(newExp.job_title, newExp.company);
      setNewExp({ ...newExp, description: generated });
      toast.success("Job description generated!");
    } catch (error) {
      toast.error("Error generating description");
    } finally {
      setAiLoading({ ...aiLoading, newExp: false });
    }
  };

  const handleAddExp = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/resume/${id}/experience`, newExp);
      toast.success("Experience added!");
      setNewExp({ job_title: '', company: '', start_date: '', end_date: '', description: '' });
      fetchData();
    } catch (error) { toast.error("Error adding experience."); }
  };

  const handleDeleteExp = async (expId) => {
    if (!window.confirm("Are you sure you want to delete this experience?")) return;
    try {
      await api.delete(`/experience/${expId}`);
      toast.success("Experience deleted.");
      fetchData();
    } catch (error) { toast.error("Error deleting experience."); }
  };

  // --- HANDLERS (Education) ---
  const handleEduChange = (e) => {
    setNewEdu({ ...newEdu, [e.target.name]: e.target.value });
  };

  const handleAddEdu = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/resume/${id}/education`, newEdu);
      toast.success("Education added!");
      setNewEdu({ degree: '', institution: '', year: '' });
      fetchData();
    } catch (error) { toast.error("Error adding education."); }
  };

  const handleDeleteEdu = async (eduId) => {
    if (!window.confirm("Are you sure you want to delete this education entry?")) return;
    try {
      await api.delete(`/education/${eduId}`);
      toast.success("Education entry deleted.");
      fetchData();
    } catch (error) { toast.error("Error deleting education entry."); }
  };

  // --- HANDLERS (Skills) ---
  const handleSkillChange = (e) => {
    setNewSkill({ ...newSkill, [e.target.name]: e.target.value });
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/resume/${id}/skill`, newSkill);
      toast.success("Skill added!");
      setNewSkill({ name: '', proficiency: 'Intermediate' });
      fetchData();
    } catch (error) { toast.error("Error adding skill."); }
  };

  const handleDeleteSkill = async (skillId) => {
    if (!window.confirm("Are you sure you want to delete this skill?")) return;
    try {
      await api.delete(`/skill/${skillId}`);
      toast.success("Skill deleted.");
      fetchData();
    } catch (error) { toast.error("Error deleting skill."); }
  };

  if (loading) {
    return <LoadingSpinner message="Loading resume…" sub="Setting up your editor" />;
  }

  // Sidebar Navigation
  const user = JSON.parse(localStorage.getItem('user')) || { username: 'Guest', email: '' };
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '▦' },
    { name: 'My Resumes', path: '/dashboard', icon: '▤' },
    { name: 'Create New', path: '/create', icon: '+' },
  ];
  if (user && user.role === 'admin') {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: '⛊' });
  }

  // --- RENDER ---
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 gap-0">

      {/* ===== LEFT SIDEBAR (Fixed Width) ===== */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl flex-shrink-0 overflow-y-auto">
        <div className="p-4 flex items-center gap-3 border-b border-slate-800">
          <img src="/logo.svg" alt="ResuMate AI" className="h-10 w-10" />
          <div>
            <div className="text-lg font-bold tracking-wider text-white">ResuMate</div>
            <div className="text-xs text-slate-400">Design. Analyze. Discover.</div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${location.pathname === item.path
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="font-semibold text-sm">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4 space-y-2">
          <div className="text-xs text-slate-400 px-2">Logged in as</div>
          <div className="text-sm font-semibold text-slate-100 px-2 truncate">{user.username}</div>
          <button
            onClick={() => {
              localStorage.removeItem('user');
              navigate('/login');
            }}
            className="w-full text-left px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
          >
            → Logout
          </button>
        </div>
      </aside>

      {/* ===== MIDDLE PANEL (Form/Editor - Main Content Area) ===== */}
      <main className="flex-1 bg-white overflow-y-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* HEADER WITH DOWNLOAD BUTTON */}
          <div className="sticky top-0 bg-white border-b border-slate-200 z-40 px-8 py-5 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Editing: {resumeTitle}</h1>
                <p className="text-slate-500 text-sm mt-1">Build your resume live.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm border ${isEditing
                    ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {isEditing ? '✎ Edit Mode: ON' : '◉ Preview Mode'}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-slate-100 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => window.open(`${API_BASE}/resume/${id}/download`, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all text-sm"
                >
                  ⬇ Download PDF
                </button>
              </div>
            </div>
          </div>

          {/* Content Wrapper */}
          <div className="p-8 max-w-4xl">

            {/* AI ASSISTANCE INFO BANNER */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl mb-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl">✦</div>
                <div>
                  <h3 className="font-bold text-lg mb-1">AI-Powered Resume Building</h3>
                  <p className="text-purple-100 text-sm">
                    Use the <span className="font-bold bg-purple-500 px-2 py-0.5 rounded">✦ AI Generate</span> buttons throughout this form to create professional, ATS-optimized content.
                    Our AI analyzes your input and generates compelling descriptions that help your resume stand out to recruiters and applicant tracking systems.
                  </p>
                </div>
              </div>
            </div>

            {/* 1. PERSONAL INFO */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="text-3xl">●</span> Personal Information
              </h3>
              <form onSubmit={handleSaveInfo} className="space-y-6">
                {/* Basic Contact Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                    <Input name="full_name" placeholder="e.g., John Smith" value={personalInfo.full_name || ''} onChange={handleChange} required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                      <Input name="email" type="email" placeholder="your.email@example.com" value={personalInfo.email || ''} onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <Input name="phone" placeholder="+1 (555) 123-4567" value={personalInfo.phone || ''} onChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">LinkedIn Profile</label>
                    <Input name="linkedin" placeholder="https://linkedin.com/in/yourprofile" value={personalInfo.linkedin || ''} onChange={handleChange} />
                  </div>
                </div>

                {/* Professional Summary with AI */}
                <div className="border-t pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Professional Summary</label>
                      <p className="text-xs text-slate-500 mt-1">Write 2-3 sentences highlighting your experience, skills, and career goals. This appears at the top of your resume.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAIEnhanceSummary}
                      disabled={aiLoading.summary}
                      className="flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors bg-purple-50 px-4 py-2 rounded-lg hover:bg-purple-100"
                    >
                      {aiLoading.summary ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                          <span>Enhancing...</span>
                        </>
                      ) : (
                        <>
                          <span>✦</span>
                          <span>AI Enhance</span>
                        </>
                      )}
                    </button>
                  </div>
                  <Textarea
                    name="summary"
                    placeholder="Example: Experienced software engineer with 5+ years developing scalable web applications. Specialized in React, Node.js, and cloud technologies. Passionate about creating user-centric solutions and mentoring junior developers."
                    value={personalInfo.summary || ''}
                    onChange={handleChange}
                    rows="5"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg">
                    ▪ Save Personal Info
                  </button>
                </div>
              </form>
            </div>

            {/* 2. EXPERIENCE */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="text-3xl">◼</span> Work Experience
              </h3>

              {/* Existing Experiences */}
              <div className="space-y-6 mb-8">
                {experiences.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="text-4xl mb-3">◼</div>
                    <p className="text-slate-500">No work experience added yet.</p>
                    <p className="text-slate-400 text-sm">Add your first job below to get started!</p>
                  </div>
                ) : (
                  experiences.map(exp => (
                    <div key={exp.id} className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border-2 border-slate-200 relative group hover:shadow-md transition-shadow">
                      <button onClick={() => handleDeleteExp(exp.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white p-2 rounded-lg shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div className="mb-3 pr-10">
                        <h4 className="font-bold text-xl text-slate-800">{exp.job_title}</h4>
                        <p className="text-slate-600 font-semibold text-lg">{exp.company}</p>
                        <p className="text-sm text-slate-500 mt-1">▦ {exp.start_date} - {exp.end_date}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <p className="text-sm font-semibold text-slate-600 mb-2">Key Responsibilities & Achievements:</p>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{exp.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Experience Form */}
              <div className="border-t-2 border-slate-200 pt-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                  <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>+</span> Add New Work Experience
                  </h4>
                  <form onSubmit={handleAddExp} className="space-y-5">
                    {/* Job Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Job Title *</label>
                        <Input name="job_title" placeholder="e.g., Senior Software Engineer" value={newExp.job_title} onChange={handleExpChange} required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name *</label>
                        <Input name="company" placeholder="e.g., Google Inc." value={newExp.company} onChange={handleExpChange} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                        <Input name="start_date" placeholder="e.g., January 2020" value={newExp.start_date} onChange={handleExpChange} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                        <Input name="end_date" placeholder="e.g., Present or December 2023" value={newExp.end_date} onChange={handleExpChange} />
                      </div>
                    </div>

                    {/* Description with AI */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <label className="block text-sm font-bold text-slate-700">Job Description & Achievements *</label>
                          <p className="text-xs text-slate-500 mt-1">
                            Describe your responsibilities, accomplishments, and impact. Use bullet points for better readability.
                            <br />
                            <span className="text-purple-600 font-semibold">※ Tip:</span> Click "AI Generate" to create professional, ATS-optimized bullet points!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAIGenerate}
                          disabled={aiLoading.newExp}
                          className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all px-5 py-2.5 rounded-lg shadow-lg"
                        >
                          {aiLoading.newExp ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <span>✦</span>
                              <span>AI Generate</span>
                            </>
                          )}
                        </button>
                      </div>
                      <Textarea
                        name="description"
                        placeholder="Example:&#10;• Led a team of 5 developers to build a customer portal using React and Node.js&#10;• Improved application performance by 40% through code optimization&#10;• Implemented CI/CD pipeline reducing deployment time by 60%"
                        value={newExp.description}
                        onChange={handleExpChange}
                        rows="7"
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg flex items-center gap-2">
                        <span>+</span>
                        <span>Add Experience</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* 3. EDUCATION */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="text-3xl">△</span> Education
              </h3>

              {/* Existing Education */}
              <div className="space-y-4 mb-8">
                {education.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="text-4xl mb-3">△</div>
                    <p className="text-slate-500">No education entries added yet.</p>
                    <p className="text-slate-400 text-sm">Add your education background below!</p>
                  </div>
                ) : (
                  education.map(edu => (
                    <div key={edu.id} className="bg-gradient-to-br from-slate-50 to-green-50 p-5 rounded-xl border-2 border-slate-200 flex justify-between items-center group hover:shadow-md transition-shadow">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">{edu.degree}</h4>
                        <p className="text-slate-600 font-medium">{edu.institution}</p>
                        <p className="text-sm text-slate-500 mt-1">▦ Graduated: {edu.year}</p>
                      </div>
                      <button onClick={() => handleDeleteEdu(edu.id)} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white p-2 rounded-lg shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Education Form */}
              <div className="border-t-2 border-slate-200 pt-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>+</span> Add Education
                  </h4>
                  <form onSubmit={handleAddEdu} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Degree / Qualification *</label>
                        <Input name="degree" placeholder="e.g., Bachelor of Science in Computer Science" value={newEdu.degree} onChange={handleEduChange} required />
                        <p className="text-xs text-slate-500 mt-1">Include your major or specialization</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Institution Name *</label>
                        <Input name="institution" placeholder="e.g., Stanford University" value={newEdu.institution} onChange={handleEduChange} required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Year of Completion</label>
                      <Input name="year" placeholder="e.g., 2020 or 2018 - 2022" value={newEdu.year} onChange={handleEduChange} />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg flex items-center gap-2">
                        <span>+</span>
                        <span>Add Education</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* 4. SKILLS */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="text-3xl">⚒</span> Skills & Technologies
              </h3>

              {/* Existing Skills */}
              <div className="mb-8">
                {skills.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="text-4xl mb-3">⚒</div>
                    <p className="text-slate-500">No skills added yet.</p>
                    <p className="text-slate-400 text-sm">Add your technical and soft skills below!</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-slate-600 mb-4 font-medium">Your Skills ({skills.length})</p>
                    <div className="flex flex-wrap gap-3">
                      {skills.map(skill => (
                        <div key={skill.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 group hover:shadow-md transition-shadow">
                          <div>
                            <p className="font-semibold text-slate-800">{skill.name}</p>
                            <p className="text-xs text-slate-500">{skill.proficiency}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white p-1.5 rounded"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add New Skill Form */}
              <div className="border-t-2 border-slate-200 pt-8">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                  <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>+</span> Add New Skill
                  </h4>
                  <form onSubmit={handleAddSkill} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Skill Name *</label>
                        <Input
                          name="name"
                          placeholder="e.g., React, Python, Project Management"
                          value={newSkill.name}
                          onChange={handleSkillChange}
                          required
                        />
                        <p className="text-xs text-slate-500 mt-1">Enter technical skills, tools, or soft skills</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Proficiency Level</label>
                        <Select name="proficiency" value={newSkill.proficiency} onChange={handleSkillChange}>
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg flex items-center gap-2">
                        <span>+</span>
                        <span>Add Skill</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* 5. TEMPLATE SELECTOR */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="text-3xl">◆</span> Select a Template
              </h3>
              <div className="max-w-xl mx-auto">
                <TemplateSelector
                  resumeId={id}
                  currentTemplateId={currentTemplateId}
                  onTemplateSelect={(templateId) => setCurrentTemplateId(templateId)}
                />
              </div>
            </div>

            {/* 6. ADVANCED AI TOOLS */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <span className="text-3xl">◈</span> Advanced AI Tools
              </h3>
              <p className="text-slate-600 mb-6">
                Use these advanced tools to optimize your entire resume, check ATS compatibility, and match against job postings.
              </p>
              <AIEnhancementPanel />
            </div>
          </div>
        </div>
      </main>

      {/* ===== RIGHT PANEL (Preview) ===== */}
      <section className="w-1/2 bg-gray-50 border-l border-gray-200 overflow-visible flex flex-col justify-start items-center p-3 flex-shrink relative z-0">
        <div ref={componentRef} className="w-full">
          <ResumePreview
            data={personalInfo}
            experiences={experiences}
            education={education}
            skills={skills}
            additionalDetails={additionalDetails}
            templateId={currentTemplateId}
            blurMode={false}
            isEditing={isEditing}
            onUpdate={handleInlineUpdate}
          />
        </div>
      </section>
    </div>
  );
}

export default EditResume;
