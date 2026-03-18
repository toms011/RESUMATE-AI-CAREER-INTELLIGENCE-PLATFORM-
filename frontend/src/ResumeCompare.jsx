import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from './utils/api';
import toast from 'react-hot-toast';
import Layout from './components/Layout';

const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg'];
const MAX_SIZE_MB = 10;

// ─── Animated Loading Step ─────────────────────────────────────
function LoadingStep({ index, label, icon }) {
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const activateTimer = setTimeout(() => setActive(true), index * 3000 + 500);
    const doneTimer = setTimeout(() => setDone(true), index * 3000 + 2800);
    return () => { clearTimeout(activateTimer); clearTimeout(doneTimer); };
  }, [index]);

  return (
    <div className={`rc-lstep ${active ? 'rc-lstep-active' : ''} ${done ? 'rc-lstep-done' : ''}`}>
      <div className="rc-lstep-icon">
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        ) : active ? (
          <span className="rc-lstep-spinner" />
        ) : (
          icon
        )}
      </div>
      <span className="rc-lstep-label">{label}</span>
    </div>
  );
}

// ─── Geometric Brain Icon ──────────────────────────────────────
function GeoBrain({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <polygon points="32,4 12,18 8,40 20,56 32,52" stroke={color} strokeWidth="2.5" strokeLinejoin="round" fill={`${color}10`} />
      <line x1="32" y1="4" x2="20" y2="32" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="12" y1="18" x2="20" y2="56" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="8" y1="40" x2="32" y2="52" stroke={color} strokeWidth="1.5" opacity=".5" />
      <polygon points="32,4 52,18 56,40 44,56 32,52" stroke={color} strokeWidth="2.5" strokeLinejoin="round" fill={`${color}10`} />
      <line x1="32" y1="4" x2="44" y2="32" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="52" y1="18" x2="44" y2="56" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="56" y1="40" x2="32" y2="52" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="32" y1="4" x2="32" y2="62" stroke={color} strokeWidth="2" opacity=".3" />
      <circle cx="32" cy="4" r="3" fill={color} />
      <circle cx="32" cy="52" r="2.5" fill={color} />
    </svg>
  );
}

// ─── Step indicator ────────────────────────────────────────────
function StepIndicator({ current, total = 4 }) {
  const labels = ['Count', 'Upload', 'Target', 'Results'];
  return (
    <div className="rc-steps">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`rc-step ${i + 1 === current ? 'rc-step-active' : ''} ${i + 1 < current ? 'rc-step-done' : ''}`}>
          <div className="rc-step-circle">
            {i + 1 < current ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          <span className="rc-step-label">{labels[i]}</span>
          {i < total - 1 && <div className="rc-step-line" />}
        </div>
      ))}
    </div>
  );
}

export default function ResumeCompare() {
  const navigate = useNavigate();
  const fileInputRefs = useRef([]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [resumeCount, setResumeCount] = useState(2);
  const [files, setFiles] = useState([]);
  const [targetJob, setTargetJob] = useState('');

  // Analysis state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  // Duplicate detection state
  const [duplicateInfo, setDuplicateInfo] = useState(null);   // { similarity_score, duplicates, message }
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/compare-resumes/history');
      setHistory(res.data.history || []);
    } catch (err) {
      console.error('Error fetching comparison history:', err);
    }
  };

  const loadFromHistory = async (item) => {
    try {
      const res = await api.get(`/compare-resumes/history/${item.id}`);
      if (res.data.comparison) {
        setResult(res.data.comparison);
        setStep(4);
        setHistoryOpen(false);
        toast.success('Comparison loaded from history');
      } else {
        toast.error('No data stored for this comparison');
      }
    } catch (err) {
      toast.error('Failed to load comparison');
    }
  };

  const deleteFromHistory = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/compare-resumes/history/${id}`);
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success('Deleted from history');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // ── File handling ──
  const handleFileChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported format: .${ext}`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large (max ${MAX_SIZE_MB}MB)`);
      return;
    }

    setFiles(prev => {
      const updated = [...prev];
      updated[index] = file;
      return updated;
    });
  };

  const removeFile = (index) => {
    setFiles(prev => {
      const updated = [...prev];
      updated[index] = null;
      return updated;
    });
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
  };

  const validFiles = files.filter(Boolean);
  const allUploaded = validFiles.length === resumeCount;

  // ── Step navigation ──
  const goStep = (s) => {
    if (s === 2) {
      setFiles(Array(resumeCount).fill(null));
    }
    setStep(s);
  };

  // ── Check duplicates before comparing ──
  const handleCheckAndCompare = async () => {
    if (validFiles.length < 2) {
      toast.error('Please upload at least 2 resumes');
      return;
    }
    setCheckingDuplicates(true);
    setDuplicateInfo(null);

    try {
      const formData = new FormData();
      validFiles.forEach(f => formData.append('files', f));

      const res = await api.post('/compare-resumes/check-duplicates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      if (res.data?.duplicate_detected) {
        setDuplicateInfo(res.data);
        setCheckingDuplicates(false);
        return; // Show modal, don't proceed
      }
    } catch (err) {
      console.error('Duplicate check failed, proceeding anyway:', err);
    }

    setCheckingDuplicates(false);
    handleCompare(); // No duplicates, proceed
  };

  // ── Compare ──
  const handleCompare = async () => {
    if (validFiles.length < 2) {
      toast.error('Please upload at least 2 resumes');
      return;
    }
    setLoading(true);
    setProgress('Uploading resumes...');
    setResult(null);

    try {
      const formData = new FormData();
      validFiles.forEach(f => formData.append('files', f));
      if (targetJob.trim()) {
        formData.append('target_job', targetJob.trim());
      }

      setProgress('Analyzing and comparing resumes with AI...');

      const response = await api.post('/compare-resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      if (response.data?.comparison) {
        setResult(response.data.comparison);
        setStep(4);
        toast.success('Comparison complete!');
        fetchHistory();
      } else {
        toast.error(response.data?.message || 'Comparison failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Comparison failed';
      if (err.response?.status === 429) {
        toast.error('API quota exceeded. Please wait a few minutes.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // ── Download report ──
  const handleDownload = async (format) => {
    if (!result) return;
    const setDl = format === 'pdf' ? setDownloadingPdf : setDownloadingDocx;
    setDl(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/compare-resumes/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ comparison: result }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ResuMate_Comparison_Report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded!`);
    } catch (err) {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDl(false);
    }
  };

  // ── Reset ──
  const handleReset = () => {
    setStep(1);
    setResumeCount(2);
    setFiles([]);
    setTargetJob('');
    setResult(null);
  };

  // ── Score color ──
  const scoreColor = (sc) => sc >= 80 ? '#059669' : sc >= 60 ? '#d97706' : '#ef4444';
  const scoreLabel = (sc) => sc >= 80 ? 'Excellent' : sc >= 60 ? 'Good' : 'Needs Work';

  return (
    <Layout>
      <div className="rc-page">
        {/* ═══ HEADER ═══ */}
        <div className="rc-hero">
          <div className="rc-hero-glow" />
          <div className="rc-hero-content">
            <div className="rc-hero-icon">
              <GeoBrain size={40} color="#6366f1" />
            </div>
            <div>
              <h1 className="rc-hero-title">Resume Comparison</h1>
              <p className="rc-hero-sub">Compare multiple resumes side-by-side with AI and find the best match</p>
            </div>
          </div>
          <div className="rc-hero-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setHistoryOpen(!historyOpen)} className="rh-btn" title="Recent Comparisons">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Recent Comparisons</span>
              {history.length > 0 && <span className="rh-badge">{history.length}</span>}
            </button>
            <button onClick={() => navigate('/resume-analyzer')} className="rc-btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Single Analyzer
            </button>
          </div>
        </div>

        {/* ─── RECENT COMPARISONS SIDEBAR ─── */}
        {historyOpen && (
          <div className="rh-overlay" onClick={() => setHistoryOpen(false)}>
            <div className="rh-panel" onClick={(e) => e.stopPropagation()}>
              <div className="rh-header">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Recent Comparisons
                </h3>
                <button onClick={() => setHistoryOpen(false)} className="rh-close">{'\u2715'}</button>
              </div>
              <div className="rh-list">
                {history.length === 0 ? (
                  <div className="rh-empty">
                    <p className="text-slate-400 text-sm">No recent comparisons yet</p>
                  </div>
                ) : (
                  history.map(h => (
                    <div key={h.id} className="rh-item" onClick={() => loadFromHistory(h)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">
                            {h.winner_name ? `🏆 ${h.winner_name}` : 'Comparison'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{h.target_job || 'General'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(h.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="rh-count-tag">{h.resume_count} files</span>
                          <button onClick={(e) => deleteFromHistory(h.id, e)} className="rh-delete" title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP INDICATOR ═══ */}
        {step < 4 && <StepIndicator current={step} />}

        {/* ═══ AI DISCLAIMER ═══ */}
        <div className="rc-disclaimer">
          <GeoBrain size={16} color="#6366f1" />
          <span>AI-powered analysis using Google Gemini. Results are advisory — use professional judgment for final decisions.</span>
        </div>

        {/* ═══════ STEP 1: COUNT ═══════ */}
        {step === 1 && (
          <div className="rc-card rc-enter">
            <div className="rc-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h2 className="rc-card-title">How many resumes do you want to compare?</h2>
            <p className="rc-card-sub">Select between 2 and {MAX_FILES} resumes. Our API supports up to {MAX_FILES} simultaneous comparisons.</p>

            <div className="rc-count-selector">
              {[2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`rc-count-btn ${resumeCount === n ? 'rc-count-btn-active' : ''}`}
                  onClick={() => setResumeCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <p className="rc-count-label">{resumeCount} resumes selected</p>

            <button className="rc-btn-primary" onClick={() => goStep(2)}>
              Continue
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}

        {/* ═══════ STEP 2: UPLOAD ═══════ */}
        {step === 2 && (
          <div className="rc-card rc-enter">
            <h2 className="rc-card-title">Upload {resumeCount} Resumes</h2>
            <p className="rc-card-sub">Supported: PDF, DOCX, TXT, PNG, JPG (max {MAX_SIZE_MB}MB each)</p>

            <div className="rc-upload-grid">
              {Array.from({ length: resumeCount }, (_, i) => (
                <div key={i} className={`rc-upload-slot ${files[i] ? 'rc-upload-slot-filled' : ''}`}>
                  <div className="rc-upload-num">{i + 1}</div>
                  {files[i] ? (
                    <div className="rc-upload-file">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      <div className="rc-upload-file-info">
                        <span className="rc-upload-file-name">{files[i].name}</span>
                        <span className="rc-upload-file-size">{(files[i].size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button className="rc-upload-remove" onClick={() => removeFile(i)} title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ) : (
                    <label className="rc-upload-label">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span>Choose file</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(i, e)}
                        ref={el => fileInputRefs.current[i] = el}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="rc-nav-btns">
              <button className="rc-btn-ghost" onClick={() => setStep(1)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <button className="rc-btn-primary" onClick={() => goStep(3)} disabled={!allUploaded}>
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* ═══════ STEP 3: TARGET JOB ═══════ */}
        {step === 3 && !loading && (
          <div className="rc-card rc-enter">
            <div className="rc-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <h2 className="rc-card-title">Target Job Profile (Optional)</h2>
            <p className="rc-card-sub">Enter a specific job role to find the best resume for that position. Leave blank to compare overall career strength.</p>

            <input
              type="text"
              className="rc-input"
              placeholder="e.g. Senior Full Stack Developer, Data Scientist, Product Manager..."
              value={targetJob}
              onChange={(e) => setTargetJob(e.target.value)}
            />

            <div className="rc-target-hint">
              {targetJob.trim() ? (
                <span className="rc-hint-active">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                  Comparing for: <strong>{targetJob}</strong>
                </span>
              ) : (
                <span className="rc-hint-default">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
                  Will compare overall career strength
                </span>
              )}
            </div>

            <div className="rc-nav-btns">
              <button className="rc-btn-ghost" onClick={() => setStep(2)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <button className="rc-btn-primary rc-btn-compare" onClick={handleCheckAndCompare} disabled={checkingDuplicates}>
                {checkingDuplicates ? (
                  <>
                    <span className="rc-dup-spinner" />
                    Checking Resumes...
                  </>
                ) : (
                  <>
                    <GeoBrain size={18} color="white" />
                    Compare {resumeCount} Resumes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══════ DUPLICATE DETECTION MODAL ═══════ */}
        {duplicateInfo && (
          <div className="rc-dup-overlay rc-enter">
            <div className="rc-dup-backdrop" onClick={() => setDuplicateInfo(null)} />
            <div className="rc-dup-modal">
              {/* Warning Icon */}
              <div className="rc-dup-icon-wrap">
                <div className="rc-dup-icon-pulse" />
                <div className="rc-dup-icon-inner">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
              </div>

              <h2 className="rc-dup-title">Similar Resumes Detected</h2>
              <p className="rc-dup-desc">
                The uploaded resumes appear to be {duplicateInfo.similarity_score >= 0.99 ? 'identical' : 'highly similar'}
                {' '}({Math.round(duplicateInfo.similarity_score * 100)}% similarity).
              </p>

              {/* Affected Files */}
              {duplicateInfo.duplicates && duplicateInfo.duplicates.length > 0 && (
                <div className="rc-dup-files">
                  {duplicateInfo.duplicates.map((d, i) => (
                    <div key={i} className="rc-dup-file-pair">
                      <div className="rc-dup-file-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>{d.file_a}</span>
                      </div>
                      <div className="rc-dup-vs">
                        <span className={`rc-dup-score ${d.similarity_score >= 0.99 ? 'rc-dup-score-red' : 'rc-dup-score-amber'}`}>
                          {Math.round(d.similarity_score * 100)}%
                        </span>
                      </div>
                      <div className="rc-dup-file-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>{d.file_b}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="rc-dup-question">What would you like to do?</p>

              {/* Action Buttons */}
              <div className="rc-dup-actions">
                <button className="rc-dup-btn rc-dup-btn-replace" onClick={() => {
                  setDuplicateInfo(null);
                  setStep(2); // Go back to upload to replace files
                  toast('Replace the similar resume and try again', { icon: '📄' });
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Replace Resume
                </button>
                <button className="rc-dup-btn rc-dup-btn-continue" onClick={() => {
                  setDuplicateInfo(null);
                  handleCompare(); // Proceed anyway
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  Continue Anyway
                </button>
                <button className="rc-dup-btn rc-dup-btn-cancel" onClick={() => {
                  setDuplicateInfo(null);
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ LOADING ═══════ */}
        {loading && (
          <div className="rc-loading-overlay rc-enter">
            <div className="rc-loading-backdrop" />
            <div className="rc-loading-card">
              {/* Animated geometric brain */}
              <div className="rc-loading-brain-wrap">
                <div className="rc-loading-pulse-ring" />
                <div className="rc-loading-pulse-ring rc-loading-pulse-ring-2" />
                <div className="rc-loading-brain-inner">
                  <GeoBrain size={48} color="#6366f1" className="rc-loading-brain-breathe" />
                </div>
                <div className="rc-loading-orbit rc-loading-orbit-1"><div className="rc-loading-orbit-dot" /></div>
                <div className="rc-loading-orbit rc-loading-orbit-2"><div className="rc-loading-orbit-dot" /></div>
                <div className="rc-loading-orbit rc-loading-orbit-3"><div className="rc-loading-orbit-dot" /></div>
              </div>

              <h2 className="rc-loading-title">AI is Comparing Your Resumes...</h2>
              <p className="rc-loading-sub">{progress || 'Preparing analysis...'}</p>

              {/* Animated Steps */}
              <div className="rc-loading-steps">
                <LoadingStep index={0} label="Extracting Resume Data" icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                } />
                <LoadingStep index={1} label="Analyzing Skills & Experience" icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                } />
                <LoadingStep index={2} label="Comparing Against Target Role" icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                } />
                <LoadingStep index={3} label="Calculating Match Scores" icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                } />
                <LoadingStep index={4} label="Selecting Best Resume" icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                } />
              </div>

              {/* Progress bar */}
              <div className="rc-loading-progress-track">
                <div className="rc-loading-progress-bar" />
              </div>

              <p className="rc-loading-note">This may take 30-60 seconds for {resumeCount} resumes</p>
            </div>
          </div>
        )}

        {/* ═══════ STEP 4: RESULTS ═══════ */}
        {step === 4 && result && (
          <div className="rc-results rc-enter">

            {/* ── TARGET CONTEXT ── */}
            <div className="rc-result-target">
              <span className="rc-result-target-label">
                {result.target_job_profile && result.target_job_profile !== 'General Career Strength'
                  ? `Target: ${result.target_job_profile}`
                  : 'General Career Strength Comparison'}
              </span>
              <span className="rc-result-target-count">{result.total_resumes || result.comparison_results?.length} resumes compared</span>
            </div>

            {/* ── WINNER CARD ── */}
            {result.best_resume && (
              <div className="rc-winner-card">
                <div className="rc-winner-badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Best Match
                </div>
                <div className="rc-winner-name">{result.best_resume.resume_name}</div>
                <div className="rc-winner-score" style={{ color: scoreColor(result.best_resume.match_score || 0) }}>
                  {result.best_resume.match_score || 0}<span>/100</span>
                </div>
                <div className="rc-winner-reason">{result.best_resume.reason}</div>

                {result.best_resume.details && (
                  <div className="rc-winner-details">
                    {Object.entries(result.best_resume.details).map(([key, val]) => val ? (
                      <div key={key} className="rc-winner-detail">
                        <span className="rc-winner-detail-label">{key.replace(/_/g, ' ').replace(/advantage/i, '').trim()}</span>
                        <span className="rc-winner-detail-val">{val}</span>
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
            )}

            {/* ── RANKING TABLE ── */}
            {result.ranking && result.ranking.length > 0 && (
              <div className="rc-section">
                <h3 className="rc-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                  Final Ranking
                </h3>
                <div className="rc-ranking-table">
                  <div className="rc-ranking-header">
                    <span>Rank</span><span>Resume</span><span>Score</span><span>Verdict</span>
                  </div>
                  {result.ranking.map((r, i) => (
                    <div key={i} className={`rc-ranking-row ${i === 0 ? 'rc-ranking-row-winner' : ''}`}>
                      <span className="rc-ranking-rank">
                        {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                      </span>
                      <span className="rc-ranking-name">{r.resume_name}</span>
                      <span className="rc-ranking-score" style={{ color: scoreColor(r.match_score) }}>{r.match_score}</span>
                      <span className="rc-ranking-verdict">{r.one_line_verdict}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── INDIVIDUAL ANALYSES ── */}
            <div className="rc-section">
              <h3 className="rc-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Individual Analysis
              </h3>
              <div className="rc-individual-grid">
                {(result.comparison_results || []).map((res, i) => {
                  const isBest = res.resume_name === result.best_resume?.resume_name;
                  return (
                    <div key={i} className={`rc-indiv-card ${isBest ? 'rc-indiv-card-best' : ''}`}>
                      <div className="rc-indiv-header">
                        <div>
                          <span className="rc-indiv-name">{res.resume_name}</span>
                          {isBest && <span className="rc-indiv-best-tag">BEST</span>}
                          {res.career_stage && <span className="rc-indiv-stage">{res.career_stage}</span>}
                        </div>
                        <div className="rc-indiv-score" style={{ color: scoreColor(res.match_score) }}>
                          {res.match_score}<small>/100</small>
                        </div>
                      </div>

                      {res.key_skills && res.key_skills.length > 0 && (
                        <div className="rc-indiv-skills">
                          {res.key_skills.slice(0, 6).map((s, j) => (
                            <span key={j} className="rc-skill-tag">{s}</span>
                          ))}
                        </div>
                      )}

                      <div className="rc-indiv-cols">
                        <div>
                          <h4 className="rc-col-label rc-col-label-green">Strengths</h4>
                          {(res.strengths || []).map((s, j) => (
                            <p key={j} className="rc-col-item rc-col-item-green">✓ {s}</p>
                          ))}
                        </div>
                        <div>
                          <h4 className="rc-col-label rc-col-label-red">Weaknesses</h4>
                          {(res.weaknesses || []).map((w, j) => (
                            <p key={j} className="rc-col-item rc-col-item-red">✗ {w}</p>
                          ))}
                        </div>
                      </div>

                      {res.improvement_suggestions && res.improvement_suggestions.length > 0 && (
                        <div className="rc-indiv-suggestions">
                          <h4 className="rc-col-label rc-col-label-blue">Improvement Suggestions</h4>
                          {res.improvement_suggestions.map((s, j) => (
                            <p key={j} className="rc-col-item rc-col-item-blue">→ {s}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── COMPARISON SUMMARY ── */}
            {result.comparison_summary && (
              <div className="rc-section">
                <h3 className="rc-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  Comparison Summary
                </h3>
                <p className="rc-summary-text">{result.comparison_summary}</p>
              </div>
            )}

            {/* ── EXPORT ── */}
            <div className="rc-export-section">
              <div className="rc-export-inner">
                <h3 className="rc-export-title">Download Comparison Report</h3>
                <p className="rc-export-sub">Get a professional branded report with all comparison details</p>
                <div className="rc-export-btns">
                  <button className="rc-export-btn rc-export-btn-pdf" onClick={() => handleDownload('pdf')} disabled={downloadingPdf}>
                    {downloadingPdf ? <span className="rc-spinner" /> : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
                    )}
                    PDF Report
                  </button>
                  <button className="rc-export-btn rc-export-btn-docx" onClick={() => handleDownload('docx')} disabled={downloadingDocx}>
                    {downloadingDocx ? <span className="rc-spinner" /> : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    )}
                    Word Report
                  </button>
                </div>
              </div>
            </div>

            {/* ── ACTIONS ── */}
            <div className="rc-bottom-actions">
              <button className="rc-btn-ghost" onClick={handleReset}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                New Comparison
              </button>
              <button className="rc-btn-ghost" onClick={() => navigate('/resume-analyzer')}>
                Single Analyzer
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
