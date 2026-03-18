import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';
import Layout from './components/Layout';
import { TEMPLATES as LOCAL_TEMPLATES } from './utils/templates';
import LoadingSpinner from './components/LoadingSpinner';

/* ─────────────────────────────────────────────
   Template preview card color schemes
   ───────────────────────────────────────────── */
const TEMPLATE_VISUALS = {
  classic: {
    accent: '#334155',
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
    badge: 'bg-slate-700 text-white',
    icon: '≡',
    headerStripe: '#334155',
  },
  modern: {
    accent: '#2563eb',
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    badge: 'bg-blue-600 text-white',
    icon: '◆',
    headerStripe: '#2563eb',
  },
  minimal: {
    accent: '#64748b',
    bg: 'bg-gradient-to-br from-gray-50 to-zinc-50',
    badge: 'bg-zinc-600 text-white',
    icon: '✦',
    headerStripe: '#64748b',
  },
  creative: {
    accent: '#d946ef',
    bg: 'bg-gradient-to-br from-fuchsia-50 to-pink-50',
    badge: 'bg-fuchsia-600 text-white',
    icon: '✦',
    headerStripe: '#d946ef',
  },
  professional: {
    accent: '#f59e0b',
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    badge: 'bg-amber-600 text-white',
    icon: '◼',
    headerStripe: '#f59e0b',
  },
};

/* ─────────────────────────────────────────────
   Mini A4 Preview — shows a tiny skeleton of the template style
   ───────────────────────────────────────────── */
function MiniPreview({ template }) {
  const cat = template.category || 'classic';
  const styles = template.styles || {};
  const accent = styles.accentColor || TEMPLATE_VISUALS[cat]?.headerStripe || '#2563eb';

  return (
    <div className="w-full aspect-[210/297] bg-white rounded-lg border border-slate-200 overflow-hidden relative shadow-inner">
      {/* Header bar */}
      <div className="w-full h-[18%] flex items-end px-3 pb-2" style={{ backgroundColor: accent }}>
        <div className="space-y-1 w-full">
          <div className="h-1.5 bg-white/80 rounded w-2/3" />
          <div className="h-1 bg-white/50 rounded w-2/5" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="px-3 py-2 space-y-2">
        {/* Section 1 */}
        <div>
          <div className="h-1 rounded w-1/3 mb-1" style={{ backgroundColor: accent, opacity: 0.7 }} />
          <div className="space-y-0.5">
            <div className="h-0.5 bg-slate-200 rounded w-full" />
            <div className="h-0.5 bg-slate-200 rounded w-5/6" />
            <div className="h-0.5 bg-slate-200 rounded w-4/6" />
          </div>
        </div>

        {/* Section 2 */}
        <div>
          <div className="h-1 rounded w-2/5 mb-1" style={{ backgroundColor: accent, opacity: 0.7 }} />
          <div className="space-y-0.5">
            <div className="h-0.5 bg-slate-200 rounded w-full" />
            <div className="h-0.5 bg-slate-200 rounded w-3/4" />
          </div>
        </div>

        {/* Section 3 */}
        <div>
          <div className="h-1 rounded w-1/4 mb-1" style={{ backgroundColor: accent, opacity: 0.7 }} />
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-1.5 rounded-full px-1" style={{ backgroundColor: accent, opacity: 0.15, width: `${18 + i * 5}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DesignStudio — Main page component
   ───────────────────────────────────────────── */
function DesignStudio() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      const foundUser = JSON.parse(loggedInUser);
      if (foundUser.is_admin) { navigate('/admin'); return; }
      setUser(foundUser);
      loadData();
    } else {
      navigate('/login');
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resumeRes, templateRes] = await Promise.all([
        api.get('/resumes'),
        api.get('/templates').catch(() => ({ data: [] })),
      ]);
      setResumes(resumeRes.data.resumes || []);
      const tpls = (templateRes.data && Array.isArray(templateRes.data) && templateRes.data.length > 0)
        ? templateRes.data
        : LOCAL_TEMPLATES;
      setTemplates(tpls);
    } catch (err) {
      console.error('Error loading data:', err);
      setTemplates(LOCAL_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  /* Apply template to a resume, then open the editor */
  const handleApplyAndEdit = async () => {
    if (!selectedResume || !selectedTemplate) {
      toast.error('Select a resume and a template first');
      return;
    }
    setApplyingTemplate(true);
    try {
      await api.post(`/resume/${selectedResume}/template`, {
        template_id: selectedTemplate,
      });
      toast.success('Template applied!');
      navigate(`/resume/${selectedResume}/editor`);
    } catch (err) {
      console.error('Error applying template:', err);
      toast.error('Failed to apply template');
    } finally {
      setApplyingTemplate(false);
    }
  };

  /* Open editor directly (no template change) */
  const handleOpenEditor = () => {
    if (!selectedResume) {
      toast.error('Select a resume first');
      return;
    }
    navigate(`/resume/${selectedResume}/editor`);
  };

  /* Category filter */
  const categories = ['all', ...new Set(templates.map(t => t.category || 'classic'))];
  const filteredTemplates = activeCategory === 'all'
    ? templates
    : templates.filter(t => (t.category || 'classic') === activeCategory);

  if (!user) return <LoadingSpinner message="Loading studio…" />;

  return (
    <Layout>
      {/* ── Page Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          ◆ Layout & Design Studio
        </h1>
        <p className="text-slate-500 mt-1">
          Choose a resume, pick a template, and fine-tune your design in the editor.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner fullPage={false} message="Loading your design studio…" />
      ) : (
        <div className="space-y-10">

          {/* ═══════════════════════════════════════
              STEP 1 — Select a Resume
             ═══════════════════════════════════════ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20">1</span>
              <h2 className="text-lg font-bold text-slate-700">Select a Resume</h2>
              <span className="text-xs text-slate-400 ml-2">{resumes.length} available</span>
            </div>

            {resumes.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                <p className="text-slate-400 mb-4">No resumes yet. Create one first!</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors"
                >
                  + Create Resume
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {resumes.map(resume => {
                  const isSelected = selectedResume === resume.id;
                  return (
                    <button
                      key={resume.id}
                      onClick={() => setSelectedResume(resume.id)}
                      className={`
                        relative text-left p-4 rounded-xl border-2 transition-all duration-200
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10 ring-2 ring-blue-200'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }
                      `}
                    >
                      {/* Doc icon */}
                      <div className={`text-3xl mb-2 ${isSelected ? 'text-blue-500' : 'text-slate-300'}`}>▤</div>

                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                        {resume.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </p>

                      {/* Selected check */}
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════
              STEP 2 — Choose a Template
             ═══════════════════════════════════════ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold shadow-lg shadow-purple-500/20">2</span>
              <h2 className="text-lg font-bold text-slate-700">Choose a Template</h2>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-200
                    ${activeCategory === cat
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }
                  `}
                >
                  {cat === 'all' ? 'All Templates' : cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredTemplates.map(template => {
                const cat = template.category || 'classic';
                const visual = TEMPLATE_VISUALS[cat] || TEMPLATE_VISUALS.classic;
                const isSelected = selectedTemplate === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`
                      group relative text-left rounded-2xl border-2 overflow-hidden transition-all duration-300
                      ${isSelected
                        ? 'border-purple-500 shadow-lg shadow-purple-500/15 ring-2 ring-purple-200 scale-[1.02]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {/* Preview area */}
                    <div className={`p-4 ${visual.bg}`}>
                      <MiniPreview template={template} />
                    </div>

                    {/* Info section */}
                    <div className="p-4 bg-white border-t border-slate-100">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-purple-700' : 'text-slate-800'}`}>
                          {template.name}
                        </h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 uppercase ${visual.badge}`}>
                          {cat}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md z-10">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ═══════════════════════════════════════
              STEP 3 — Actions Bar
             ═══════════════════════════════════════ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20">3</span>
              <h2 className="text-lg font-bold text-slate-700">Open Editor</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              {/* Selection summary */}
              <div className="flex flex-wrap items-center gap-4 mb-5">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${selectedResume ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                  <span className="text-lg">{selectedResume ? '▤' : '□'}</span>
                  <span className={`text-sm font-medium ${selectedResume ? 'text-blue-700' : 'text-slate-400'}`}>
                    {selectedResume
                      ? resumes.find(r => r.id === selectedResume)?.title || 'Selected'
                      : 'No resume selected'}
                  </span>
                </div>

                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${selectedTemplate ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
                  <span className="text-lg">{selectedTemplate ? '◆' : '□'}</span>
                  <span className={`text-sm font-medium ${selectedTemplate ? 'text-purple-700' : 'text-slate-400'}`}>
                    {selectedTemplate
                      ? templates.find(t => t.id === selectedTemplate)?.name || 'Selected'
                      : 'No template selected (optional)'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleApplyAndEdit}
                  disabled={!selectedResume || !selectedTemplate || applyingTemplate}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-md
                    ${selectedResume && selectedTemplate && !applyingTemplate
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 hover:shadow-lg'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    }
                  `}
                >
                  {applyingTemplate ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Apply Template & Edit
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenEditor}
                  disabled={!selectedResume}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2
                    ${selectedResume
                      ? 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      : 'border-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Open Editor (Keep Current Template)
                </button>

                <button
                  onClick={() => selectedResume && navigate(`/resume/${selectedResume}/designer`)}
                  disabled={!selectedResume}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2
                    ${selectedResume
                      ? 'border-indigo-400 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-500'
                      : 'border-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12-1a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  Open Canvas Designer
                </button>
              </div>
            </div>
          </section>

        </div>
      )}
    </Layout>
  );
}

export default DesignStudio;
