import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from './utils/api';
import toast from 'react-hot-toast';
import Layout from './components/Layout';

// ═══════════════════════════════════════════════════════════════
//  HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function JobCard({ job, onCompanyClick }) {
  const handleApplyClick = () => {
    // Track the apply click (fire-and-forget)
    api.post('/api/jobs/track-apply', {
      job_title: job.title,
      company: job.company,
      location: job.location,
      salary_range: job.salary_range,
      apply_url: job.apply_url,
      source: job.source || 'adzuna',
    }).catch(() => {}); // silent — don't block the user
  };

  return (
    <div className="jf-job-card">
      <div className="jf-card-top">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 text-sm truncate">{job.title}</h4>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{job.company || 'Not specified'}</p>
        </div>
        {job.match_score !== undefined && (
          <div className="jf-match-badge" style={{
            background: job.match_score >= 70 ? '#ecfdf5' : job.match_score >= 50 ? '#fffbeb' : '#fef2f2',
            color: job.match_score >= 70 ? '#059669' : job.match_score >= 50 ? '#d97706' : '#dc2626',
            border: `1px solid ${job.match_score >= 70 ? '#a7f3d0' : job.match_score >= 50 ? '#fde68a' : '#fecaca'}`,
          }}>
            {job.match_score}%
          </div>
        )}
      </div>
      <div className="jf-card-meta">
        <span className="jf-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {job.location || 'India'}
        </span>
        <span className="jf-salary">{job.salary_range || 'Not disclosed'}</span>
      </div>
      {job.description && <p className="text-xs text-slate-400 mt-2 jf-line-clamp-2">{job.description}</p>}
      <div className="jf-card-actions">
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="jf-apply-btn" onClick={handleApplyClick}>
          Apply Now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        {job.company && job.company !== 'Not specified' && (
          <button onClick={() => onCompanyClick(job)} className="jf-insights-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l10-5 10 5-10 5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            Company Insights
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Company Insights Loading Messages ─────────────────────────
const COMPANY_LOADING_MSGS = [
  { text: 'Studying Company Profile', icon: '🏢' },
  { text: 'Evaluating Industry Position', icon: '📊' },
  { text: 'Analyzing Work Culture Trends', icon: '🎭' },
  { text: 'Generating Interview Insights', icon: '📋' },
  { text: 'Preparing Career Strategy', icon: '🚀' },
];

// ─── Animated Loading Step (like Resume Compare) ───────────────
function CILoadingStep({ index, label, icon }) {
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const activateTimer = setTimeout(() => setActive(true), index * 2500 + 400);
    const doneTimer = setTimeout(() => setDone(true), index * 2500 + 2200);
    return () => { clearTimeout(activateTimer); clearTimeout(doneTimer); };
  }, [index]);

  return (
    <div className={`ci-lstep ${active ? 'ci-lstep-active' : ''} ${done ? 'ci-lstep-done' : ''}`}>
      <div className="ci-lstep-icon">
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        ) : active ? (
          <span className="ci-lstep-spinner" />
        ) : (
          icon
        )}
      </div>
      <span className="ci-lstep-label">{label}</span>
    </div>
  );
}

function CompanyModal({ company, jobRole, jobDesc, analysisId, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msgIndex, setMsgIndex] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % COMPANY_LOADING_MSGS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError('');
    setMsgIndex(0);
    try {
      const res = await api.post('/company/analyze', {
        company_name: company,
        job_role: jobRole || '',
        job_description: jobDesc || '',
        analysis_id: analysisId || null,
      });
      setAnalysis(res.data.analysis || res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Company analysis failed';
      setError(msg);
      if (err.response?.status === 429) {
        toast.error('Daily company analysis limit reached (5/day)');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!analysis) return;
    const setDl = format === 'pdf' ? setDownloadingPdf : setDownloadingDocx;
    setDl(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/company/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ company_name: company, job_role: jobRole, analysis }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ResuMate_Company_Report_${company.replace(/\s+/g, '_')}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded!`);
    } catch (err) {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDl(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [company]);

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="ci-overlay" onClick={onClose}>
      <div className="ci-modal" onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="ci-header">
          <div className="ci-header-left">
            <div className="ci-header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
            </div>
            <div>
              <h2 className="ci-company-name">{company}</h2>
              <div className="ci-header-meta">
                {jobRole && <span className="ci-meta-tag">{jobRole}</span>}
                <span className="ci-meta-date">{today}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ci-close-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="ci-body">
          {/* LOADING STATE */}
          {loading && (
            <div className="ci-loading-screen">
              {/* Animated Brain / Pulsing Center */}
              <div className="ci-loading-brain-wrap">
                <div className="ci-loading-pulse-ring" />
                <div className="ci-loading-pulse-ring ci-loading-pulse-ring-2" />
                <div className="ci-loading-brain-inner">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/>
                  </svg>
                </div>
                <div className="ci-loading-orbit ci-loading-orbit-1"><div className="ci-loading-orbit-dot" /></div>
                <div className="ci-loading-orbit ci-loading-orbit-2"><div className="ci-loading-orbit-dot" /></div>
                <div className="ci-loading-orbit ci-loading-orbit-3"><div className="ci-loading-orbit-dot" /></div>
              </div>

              <h3 className="ci-loading-heading">Analyzing Company Intelligence...</h3>
              <p className="ci-loading-subtext">{COMPANY_LOADING_MSGS[msgIndex].icon} {COMPANY_LOADING_MSGS[msgIndex].text}</p>

              {/* Animated Steps */}
              <div className="ci-loading-steps">
                <CILoadingStep index={0} label="Studying Company Profile" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
                } />
                <CILoadingStep index={1} label="Evaluating Industry Position" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                } />
                <CILoadingStep index={2} label="Analyzing Work Culture" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                } />
                <CILoadingStep index={3} label="Generating Interview Insights" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                } />
                <CILoadingStep index={4} label="Preparing Career Strategy" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                } />
              </div>

              {/* Progress bar */}
              <div className="ci-loading-progress-track">
                <div className="ci-loading-progress-bar" />
              </div>

              <p className="ci-loading-eta">This may take 10-15 seconds</p>
            </div>
          )}

          {/* ERROR STATE */}
          {error && !loading && (
            <div className="ci-error">
              <div className="ci-error-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <p className="ci-error-text">{error}</p>
              <button onClick={fetchAnalysis} className="ci-retry-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                Try Again
              </button>
            </div>
          )}

          {/* ANALYSIS CONTENT */}
          {analysis && !loading && (
            <div className="ci-report">
              {/* Report Title Bar */}
              <div className="ci-report-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L3 7v6c0 5.25 3.75 10.13 9 11.25C17.25 23.13 21 18.25 21 13V7l-9-5z"/></svg>
                AI-Generated Intelligence Report
              </div>

              {/* Section 1: Company Overview */}
              <CISection num="01" title="Company Overview" color="#6366f1"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>}>
                <p className="ci-text">{analysis.company_overview}</p>
              </CISection>

              {/* Section 2: Industry Position & Size (two-column) */}
              <div className="ci-two-col">
                <CISection num="02" title="Industry Position" color="#0891b2"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>}>
                  <p className="ci-text">{analysis.industry_position}</p>
                </CISection>
                <CISection num="03" title="Company Size" color="#8b5cf6"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}>
                  <p className="ci-text">{analysis.company_size_estimate}</p>
                </CISection>
              </div>

              {/* Section 3: Work Culture */}
              <CISection num="04" title="Work Culture & Environment" color="#059669"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}>
                <p className="ci-text">{analysis.work_culture}</p>
              </CISection>

              {/* Section 4: Interview Process */}
              {analysis.interview_process && (
                <CISection num="05" title="Interview Process" color="#f59e0b"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>
                  <div className="ci-interview-steps">
                    {['Resume Screening', 'Technical Round', 'HR Round', 'Final Interview'].map((step, i) => (
                      <div key={i} className="ci-interview-step">
                        <div className="ci-istep-num">{i + 1}</div>
                        <div className="ci-istep-line" />
                        <span className="ci-istep-label">{step}</span>
                      </div>
                    ))}
                  </div>
                  <p className="ci-text mt-3">{analysis.interview_process}</p>
                </CISection>
              )}

              {/* Section 5: Key Skills */}
              {analysis.key_skills_they_value && analysis.key_skills_they_value.length > 0 && (
                <CISection num="06" title="Key Skills They Value" color="#ef4444"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}>
                  <div className="ci-skills-grid">
                    {analysis.key_skills_they_value.map((s, i) => (
                      <span key={i} className="ci-skill-tag">{s}</span>
                    ))}
                  </div>
                </CISection>
              )}

              {/* Section 6: Salary Expectation */}
              {analysis.salary_expectation_inr && (
                <div className="ci-salary-card">
                  <div className="ci-salary-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    <h4>Salary Expectation (INR)</h4>
                  </div>
                  <p className="ci-salary-text">{analysis.salary_expectation_inr}</p>
                </div>
              )}

              {/* Section 7: Growth Opportunities */}
              <CISection num="07" title="Growth Opportunities" color="#059669"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}>
                <p className="ci-text">{analysis.growth_opportunities}</p>
              </CISection>

              {/* Section 8: Risks */}
              {analysis.risks && (
                <CISection num="08" title="Risks & Challenges" color="#ef4444"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}>
                  <p className="ci-text">{analysis.risks}</p>
                </CISection>
              )}

              {/* Section 9: Preparation Tips */}
              {analysis.preparation_tips && analysis.preparation_tips.length > 0 && (
                <CISection num="09" title="Preparation Tips" color="#6366f1"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}>
                  <div className="ci-checklist">
                    {analysis.preparation_tips.map((tip, i) => (
                      <div key={i} className="ci-check-item">
                        <div className="ci-check-box">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </CISection>
              )}

              {/* Profile Match */}
              {analysis.profile_match && (
                <div className="ci-match-card">
                  <div className="ci-match-header">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <h4>Why You Match This Company</h4>
                  </div>
                  <p className="ci-match-text">{analysis.profile_match}</p>
                </div>
              )}

              {/* Export Buttons */}
              <div className="ci-export-section">
                <h4 className="ci-export-title">Download Company Intelligence Report</h4>
                <div className="ci-export-btns">
                  <button className="ci-export-btn ci-export-pdf" onClick={() => handleExport('pdf')} disabled={downloadingPdf}>
                    {downloadingPdf ? <span className="ci-btn-spinner" /> : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    )}
                    PDF Report
                  </button>
                  <button className="ci-export-btn ci-export-docx" onClick={() => handleExport('docx')} disabled={downloadingDocx}>
                    {downloadingDocx ? <span className="ci-btn-spinner" /> : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    )}
                    Word Report
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="ci-footer">
                <span>Generated by ResuMate AI</span>
                <span>{today}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CISection({ num, title, color, icon, children }) {
  return (
    <div className="ci-section">
      <div className="ci-section-head">
        <div className="ci-section-num" style={{ background: `${color}15`, color }}>{num}</div>
        <div className="ci-section-icon" style={{ color }}>{icon}</div>
        <h4 className="ci-section-title">{title}</h4>
      </div>
      <div className="ci-section-body">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN JOB FINDER COMPONENT
// ═══════════════════════════════════════════════════════════════

function JobFinder() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Resume analyses
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  // Recommended jobs
  const [recommendedJobs, setRecommendedJobs] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  // All jobs
  const [allJobs, setAllJobs] = useState([]);
  const [allJobsLoading, setAllJobsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('newest');

  // Search
  const [searchRole, setSearchRole] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Company modal
  const [companyModal, setCompanyModal] = useState(null);

  // Export
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('recommended');

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
      fetchAnalyses();
      fetchAllJobs(1, 'newest');
    } else {
      navigate('/login');
    }
  }, []);

  // ─── API Calls ───────────────────────────────────────────────

  const fetchAnalyses = async () => {
    try {
      const res = await api.get('/jobs/analyses');
      const list = res.data.analyses || [];
      setAnalyses(list);
      if (list.length > 0) {
        setSelectedAnalysis(list[0]);
        fetchRecommended(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching analyses:', err);
    }
  };

  const fetchRecommended = async (analysisId) => {
    if (!analysisId) return;
    setRecLoading(true);
    try {
      const res = await api.get(`/jobs/recommended?analysis_id=${analysisId}`);
      setRecommendedJobs(res.data);
    } catch (err) {
      console.error('Recommended jobs error:', err);
      if (err.response?.status === 429) {
        toast.error('Daily job search limit reached. Try again tomorrow.');
      }
    } finally {
      setRecLoading(false);
    }
  };

  const fetchAllJobs = async (p = 1, sort = 'newest') => {
    setAllJobsLoading(true);
    try {
      const res = await api.get(`/jobs/all?page=${p}&per_page=20&sort=${sort}`);
      setAllJobs(res.data.jobs || []);
      setTotalPages(res.data.pages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error('All jobs error:', err);
    } finally {
      setAllJobsLoading(false);
    }
  };

  const handleSearch = async () => {
    const role = searchRole.trim();
    if (!role) { toast.error('Enter a job role to search'); return; }
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const loc = searchLocation.trim() || 'india';
      const res = await api.get(`/jobs/search?role=${encodeURIComponent(role)}&location=${encodeURIComponent(loc)}`);
      setSearchResults(res.data);
      setActiveTab('search');
    } catch (err) {
      const msg = err.response?.data?.message || 'Search failed';
      toast.error(msg);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAnalysisChange = (e) => {
    const id = parseInt(e.target.value);
    const a = analyses.find(x => x.id === id);
    setSelectedAnalysis(a);
    if (a) fetchRecommended(a.id);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    fetchAllJobs(1, newSort);
  };

  const openCompanyModal = (job) => {
    setCompanyModal({
      company: job.company,
      jobRole: job.role || job.title || '',
      jobDesc: job.description || '',
    });
  };

  const handleJobExport = async (format) => {
    const setDl = format === 'pdf' ? setExportingPdf : setExportingDocx;
    setDl(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        recommended_jobs: recommendedJobs?.recommended_jobs || [],
        search_results: searchResults?.jobs || [],
        all_jobs: allJobs,
        analysis_id: selectedAnalysis?.id || null,
      };
      const res = await fetch(`${API_BASE}/jobs/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ResuMate_Job_Intelligence_Report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded!`);
    } catch (err) {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDl(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;

  return (
    <Layout>
      <div className="jf-page">
        {/* ─── PAGE HEADER ─── */}
        <div className="jf-header jf-enter">
          <div className="jf-header-left">
            <div className="jf-page-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">Job Finder</h1>
              <p className="text-slate-500 mt-1">Discover opportunities matched to your resume profile</p>
            </div>
          </div>
        </div>

        {/* ─── SEARCH BAR ─── */}
        <div className="jf-search-section jf-enter" style={{ animationDelay: '100ms' }}>
          <div className="jf-search-row">
            <div className="jf-search-field">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Job role (e.g., React Developer, Data Analyst)"
                value={searchRole}
                onChange={e => setSearchRole(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="jf-search-input"
              />
            </div>
            <div className="jf-search-field jf-search-field-loc">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <input
                type="text"
                placeholder="Location (default: India)"
                value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="jf-search-input"
              />
            </div>
            <button onClick={handleSearch} disabled={searchLoading || !searchRole.trim()} className="jf-search-btn">
              {searchLoading ? <span className="jf-spinner" /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── TAB BAR ─── */}
        <div className="jf-tabs jf-enter" style={{ animationDelay: '150ms' }}>
          <button className={`jf-tab ${activeTab === 'recommended' ? 'jf-tab-active' : ''}`}
            onClick={() => setActiveTab('recommended')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Recommended
          </button>
          {searchResults && (
            <button className={`jf-tab ${activeTab === 'search' ? 'jf-tab-active' : ''}`}
              onClick={() => setActiveTab('search')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search Results
            </button>
          )}
          <button className={`jf-tab ${activeTab === 'all' ? 'jf-tab-active' : ''}`}
            onClick={() => setActiveTab('all')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            All Jobs
          </button>
        </div>

        {/* ═══════ RECOMMENDED TAB ═══════ */}
        {activeTab === 'recommended' && (
          <div className="jf-content jf-enter">
            {/* Analysis Selector */}
            {analyses.length > 0 && (
              <div className="jf-analysis-selector">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Based on resume:</label>
                <select value={selectedAnalysis?.id || ''} onChange={handleAnalysisChange} className="jf-analysis-select">
                  {analyses.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.filename || 'Untitled'} — {a.career_stage || 'N/A'} (Score: {a.opportunity_score || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {analyses.length === 0 && !recLoading && (
              <div className="jf-empty-state">
                <div className="text-5xl mb-4">📄</div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">No Resume Analyzed Yet</h3>
                <p className="text-sm text-slate-400 mb-4">Upload and analyze your resume to get personalized job recommendations</p>
                <button onClick={() => navigate('/resume-analyzer')} className="jf-cta-btn">
                  Go to Resume Analyzer
                </button>
              </div>
            )}

            {recLoading && (
              <div className="jf-loading">
                <div className="jf-spinner-lg" />
                <p className="text-sm text-slate-500 mt-3">Finding matching opportunities...</p>
              </div>
            )}

            {!recLoading && recommendedJobs && (
              <>
                {(recommendedJobs.recommended_jobs || []).length === 0 && (
                  <div className="jf-empty-state">
                    <div className="text-4xl mb-3">💼</div>
                    <p className="text-slate-500">No matches found right now. Try searching or check back later!</p>
                  </div>
                )}

                {(recommendedJobs.recommended_jobs || []).map((roleGroup, ri) => (
                  <div key={ri} className="jf-role-section">
                    <div className="jf-role-header">
                      <div className="flex items-center gap-3">
                        <div className="jf-role-badge">💼</div>
                        <div>
                          <h3 className="font-bold text-slate-800">{roleGroup.role}</h3>
                          <p className="text-xs text-slate-400">{roleGroup.jobs?.length || 0} opportunities</p>
                        </div>
                      </div>
                      <span className="jf-role-match" style={{
                        color: roleGroup.role_match >= 80 ? '#059669' : roleGroup.role_match >= 60 ? '#f59e0b' : '#ef4444'
                      }}>
                        {roleGroup.role_match}% role match
                      </span>
                    </div>
                    <div className="jf-job-grid">
                      {(roleGroup.jobs || []).map((job, ji) => (
                        <JobCard key={ji} job={job} onCompanyClick={openCompanyModal} />
                      ))}
                    </div>
                  </div>
                ))}

                {recommendedJobs.total_jobs > 0 && (
                  <p className="text-xs text-slate-400 text-center mt-4">
                    {recommendedJobs.total_jobs} jobs found • Powered by Adzuna
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════ SEARCH RESULTS TAB ═══════ */}
        {activeTab === 'search' && searchResults && (
          <div className="jf-content jf-enter">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700">
                Results for "{searchResults.role}" — {searchResults.total} found
              </h3>
              <button onClick={() => { setSearchResults(null); setActiveTab('recommended'); }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium">Clear</button>
            </div>
            <div className="jf-job-grid">
              {(searchResults.jobs || []).map((job, i) => (
                <JobCard key={i} job={job} onCompanyClick={openCompanyModal} />
              ))}
            </div>
            {(searchResults.jobs || []).length === 0 && (
              <div className="jf-empty-state">
                <p className="text-slate-500">No jobs found for "{searchResults.role}". Try a different search term.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ ALL JOBS TAB ═══════ */}
        {activeTab === 'all' && (
          <div className="jf-content jf-enter">
            {/* Sort controls */}
            <div className="jf-sort-bar">
              <span className="text-xs font-bold text-slate-400 uppercase">Sort by:</span>
              {['newest', 'salary', 'relevance'].map(s => (
                <button key={s} onClick={() => handleSortChange(s)}
                  className={`jf-sort-btn ${sortBy === s ? 'jf-sort-active' : ''}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {allJobsLoading && (
              <div className="jf-loading">
                <div className="jf-spinner-lg" />
                <p className="text-sm text-slate-500 mt-3">Loading jobs...</p>
              </div>
            )}

            {!allJobsLoading && (
              <>
                <div className="jf-job-grid">
                  {allJobs.map((job, i) => (
                    <JobCard key={i} job={job} onCompanyClick={openCompanyModal} />
                  ))}
                </div>

                {allJobs.length === 0 && (
                  <div className="jf-empty-state">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-slate-500">No jobs cached yet. Jobs are fetched automatically in the background.</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="jf-pagination">
                    <button disabled={page <= 1} onClick={() => fetchAllJobs(page - 1, sortBy)} className="jf-page-btn">
                      ← Prev
                    </button>
                    <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => fetchAllJobs(page + 1, sortBy)} className="jf-page-btn">
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════ EXPORT SECTION ═══════ */}
        {(recommendedJobs || allJobs.length > 0 || searchResults) && (
          <div className="jf-export-section jf-enter" style={{ animationDelay: '200ms' }}>
            <div className="jf-export-inner">
              <div className="jf-export-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <div>
                  <h3 className="jf-export-title">Export Job Intelligence Report</h3>
                  <p className="jf-export-sub">Download a professional report with all job listings and details</p>
                </div>
              </div>
              <div className="jf-export-btns">
                <button className="jf-export-btn jf-export-pdf" onClick={() => handleJobExport('pdf')} disabled={exportingPdf}>
                  {exportingPdf ? <span className="jf-spinner" /> : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  )}
                  Download PDF
                </button>
                <button className="jf-export-btn jf-export-docx" onClick={() => handleJobExport('docx')} disabled={exportingDocx}>
                  {exportingDocx ? <span className="jf-spinner" /> : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  )}
                  Download Word
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ COMPANY INSIGHTS MODAL ═══════ */}
        {companyModal && (
          <CompanyModal
            company={companyModal.company}
            jobRole={companyModal.jobRole}
            jobDesc={companyModal.jobDesc}
            analysisId={selectedAnalysis?.id}
            onClose={() => setCompanyModal(null)}
          />
        )}
      </div>
    </Layout>
  );
}

export default JobFinder;
