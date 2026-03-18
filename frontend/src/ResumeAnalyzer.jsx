import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';
import Layout from './components/Layout';

// ─── Geometric Brain SVG Icon ────────────────────────────────────
function GeoBrain({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Left hemisphere */}
      <polygon points="32,4 12,18 8,40 20,56 32,52" stroke={color} strokeWidth="2.5" strokeLinejoin="round" fill={`${color}10`} />
      <line x1="32" y1="4" x2="20" y2="32" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="12" y1="18" x2="20" y2="56" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="8" y1="40" x2="32" y2="52" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="20" y1="32" x2="8" y2="40" stroke={color} strokeWidth="1.5" opacity=".4" />
      <line x1="20" y1="32" x2="32" y2="52" stroke={color} strokeWidth="1.5" opacity=".4" />
      <line x1="20" y1="32" x2="12" y2="18" stroke={color} strokeWidth="1.5" opacity=".4" />
      {/* Right hemisphere */}
      <polygon points="32,4 52,18 56,40 44,56 32,52" stroke={color} strokeWidth="2.5" strokeLinejoin="round" fill={`${color}10`} />
      <line x1="32" y1="4" x2="44" y2="32" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="52" y1="18" x2="44" y2="56" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="56" y1="40" x2="32" y2="52" stroke={color} strokeWidth="1.5" opacity=".5" />
      <line x1="44" y1="32" x2="56" y2="40" stroke={color} strokeWidth="1.5" opacity=".4" />
      <line x1="44" y1="32" x2="32" y2="52" stroke={color} strokeWidth="1.5" opacity=".4" />
      <line x1="44" y1="32" x2="52" y2="18" stroke={color} strokeWidth="1.5" opacity=".4" />
      {/* Center stem */}
      <line x1="32" y1="4" x2="32" y2="62" stroke={color} strokeWidth="2" opacity=".3" />
      {/* Vertices */}
      <circle cx="32" cy="4" r="3" fill={color} />
      <circle cx="12" cy="18" r="2.5" fill={color} opacity=".8" />
      <circle cx="52" cy="18" r="2.5" fill={color} opacity=".8" />
      <circle cx="8" cy="40" r="2.5" fill={color} opacity=".8" />
      <circle cx="56" cy="40" r="2.5" fill={color} opacity=".8" />
      <circle cx="20" cy="56" r="2.5" fill={color} opacity=".8" />
      <circle cx="44" cy="56" r="2.5" fill={color} opacity=".8" />
      <circle cx="32" cy="52" r="2.5" fill={color} />
      <circle cx="20" cy="32" r="2" fill={color} opacity=".6" />
      <circle cx="44" cy="32" r="2" fill={color} opacity=".6" />
      <circle cx="32" cy="62" r="2" fill={color} opacity=".5" />
    </svg>
  );
}

// ─── Circular Progress Ring ─────────────────────────────────────
function ScoreRing({ score, size = 140, stroke = 10, color }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;
  const autoColor = color || (score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444');
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="ra-ring-spin" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={autoColor}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={offset} className="ra-ring-fill" style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-extrabold" style={{ color: autoColor }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Section Card Wrapper ────────────────────────────────────────
function SectionCard({ title, icon, children, delay = 0, accent = '#6366f1' }) {
  return (
    <div className="ra-section-card ra-reveal" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="ra-section-icon" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Tag/Chip Component ──────────────────────────────────────────
function Chip({ text, color = '#6366f1', variant = 'filled' }) {
  return variant === 'filled' ? (
    <span className="ra-chip" style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>{text}</span>
  ) : (
    <span className="ra-chip" style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>{text}</span>
  );
}

// ─── Chat Message Component ──────────────────────────────────────
function ChatMessage({ msg }) {
  return (
    <div className={`ra-chat-msg ${msg.role === 'user' ? 'ra-chat-msg-user' : 'ra-chat-msg-ai'}`}>
      <div className={`ra-chat-avatar ${msg.role === 'user' ? 'ra-chat-avatar-user' : 'ra-chat-avatar-ai'}`}>
        {msg.role === 'user' ? '\u{1F464}' : <GeoBrain size={18} color="#6366f1" />}
      </div>
      <div className={`ra-chat-bubble ${msg.role === 'user' ? 'ra-chat-bubble-user' : 'ra-chat-bubble-ai'}`}>
        {msg.role === 'ai' ? (
          <div className="ra-chat-ai-text" dangerouslySetInnerHTML={{
            __html: msg.text
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\n/g, '<br/>')
              .replace(/\u2022/g, '<span class="ra-chat-bullet">\u2022</span>')
          }} />
        ) : (
          <p>{msg.text}</p>
        )}
        <span className="ra-chat-time">{msg.time}</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
function ResumeAnalyzer() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // History state
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Job opportunities state
  const [jobsData, setJobsData] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [expandedRoles, setExpandedRoles] = useState({});
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobSearchResults, setJobSearchResults] = useState(null);
  const [jobSearchLoading, setJobSearchLoading] = useState(false);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
      fetchHistory();
    } else {
      navigate('/login');
    }
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Loading stage messages ───────────────────────────────────
  const loadingMessages = [
    { text: 'Uploading file...', sub: 'Preparing your resume for analysis' },
    { text: 'Extracting content...', sub: 'Reading text from your document' },
    { text: 'AI is analyzing your career profile...', sub: 'Evaluating skills, experience & market fit' },
    { text: 'Building career intelligence report...', sub: 'Generating personalized insights' },
  ];

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStage(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  // ─── History Functions ──────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      const res = await api.get('/resume-analyzer/history');
      setHistory(res.data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const loadFromHistory = async (id) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/resume-analyzer/history/${id}`);
      setResult(res.data.analysis);
      setAnalysisId(res.data.analysis_id);
      setChatMessages([]);
      setChatOpen(false);
      setHistoryOpen(false);
      toast.success('Analysis loaded from history');
    } catch (err) {
      toast.error('Failed to load analysis');
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteFromHistory = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/resume-analyzer/history/${id}`);
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success('Analysis deleted');
      if (analysisId === id) {
        setResult(null);
        setAnalysisId(null);
      }
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ─── Chat Functions ───────────────────────────────────────────
  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user', text: msg, time: now };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await api.post('/resume-analyzer/chat', { message: msg, analysis_id: analysisId });
      const aiMsg = { role: 'ai', text: res.data.response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I could not process your question. Please try again.', time: now }]);
    } finally {
      setChatLoading(false);
      chatInputRef.current?.focus();
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  };

  // ─── Job Opportunities Functions ──────────────────────────────
  const fetchRecommendedJobs = async (aid) => {
    setJobsLoading(true);
    setJobsError('');
    try {
      const res = await api.get(`/jobs/recommended${aid ? `?analysis_id=${aid}` : ''}`);
      setJobsData(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not load job opportunities';
      if (err.response?.status === 429) {
        setJobsError('Daily job search limit reached. Try again tomorrow.');
      } else if (err.response?.status === 404) {
        setJobsError('');
        setJobsData({ recommended_jobs: [] });
      } else {
        setJobsError(msg);
      }
    } finally {
      setJobsLoading(false);
    }
  };

  const handleJobSearch = async () => {
    const q = jobSearchQuery.trim();
    if (!q || jobSearchLoading) return;
    setJobSearchLoading(true);
    setJobSearchResults(null);
    try {
      const res = await api.get(`/jobs/search?role=${encodeURIComponent(q)}`);
      setJobSearchResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Job search failed');
    } finally {
      setJobSearchLoading(false);
    }
  };

  const toggleRoleExpand = (role) => {
    setExpandedRoles(prev => ({ ...prev, [role]: !prev[role] }));
  };

  // Auto-fetch jobs when analysis result is available
  useEffect(() => {
    if (result && analysisId) {
      fetchRecommendedJobs(analysisId);
    }
  }, [result, analysisId]);

  // ─── File Handling ────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    const maxSize = 10 * 1024 * 1024;
    if (f.size > maxSize) { toast.error('File too large. Maximum size is 10MB.'); return; }
    const ext = f.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg'];
    if (!allowed.includes(ext)) { toast.error(`Unsupported format: .${ext}. Use PDF, DOCX, TXT, PNG, or JPG.`); return; }
    setFile(f);
    setResult(null);
    setAnalysisId(null);
    setChatMessages([]);
    if (['png', 'jpg', 'jpeg'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    setLoading(true);
    setLoadingStage(0);
    setChatMessages([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/resume-analyzer/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResult(response.data.analysis);
      setAnalysisId(response.data.analysis_id || null);
      toast.success('Career analysis complete!');
      fetchHistory();
    } catch (error) {
      console.error('Resume Analyzer error:', error);
      const msg = error.response?.data?.message;
      const status = error.response?.status;
      if (status === 429 || (msg && msg.toLowerCase().includes('quota'))) {
        toast.error('AI quota exceeded. Please wait a few minutes and try again.', { duration: 6000 });
      } else if (status === 400) {
        toast.error(msg || 'Could not read the file. Try a different format (PDF, DOCX, or TXT).', { duration: 5000 });
      } else {
        toast.error(msg || 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setAnalysisId(null);
    setChatMessages([]);
    setChatOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Report Download Handlers ─────────────────────────────────
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const handleDownloadReport = async (format) => {
    const setLoading = format === 'pdf' ? setDownloadingPdf : setDownloadingDocx;
    setLoading(true);
    try {
      const payload = {
        analysis: result,
        analysis_id: analysisId || null,
        filename: file?.name || 'Resume',
      };
      const response = await api.post(`/resume-analyzer/export/${format}`, payload, {
        responseType: 'blob',
        timeout: 60000,
      });
      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (file?.name || 'Resume').replace(/\.[^.]+$/, '');
      link.href = url;
      link.download = `ResuMate_Career_Report_${safeName}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded!`);
    } catch (error) {
      console.error(`Download ${format} error:`, error);
      toast.error(`Failed to download ${format.toUpperCase()} report. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return '📄';
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📕';
    if (ext === 'docx') return '📘';
    if (['png', 'jpg', 'jpeg'].includes(ext)) return '🖼️';
    return '📄';
  };

  const formatSalary = (val) => {
    if (!val) return '--';
    const num = Number(val);
    if (num >= 100000) return `\u20B9${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `\u20B9${(num / 1000).toFixed(0)}K`;
    return `\u20B9${num}`;
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' \u2022 ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;

  // ═══════ LOADING STATE ═══════
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="ra-loading-container">
            {/* Animated brain icon */}
            <div className="ra-brain-wrap">
              <div className="ra-brain-pulse" />
              <div className="ra-brain-icon"><GeoBrain size={40} color="#6366f1" /></div>
              <div className="ra-orbit ra-orbit-1"><div className="ra-orbit-dot" /></div>
              <div className="ra-orbit ra-orbit-2"><div className="ra-orbit-dot" /></div>
              <div className="ra-orbit ra-orbit-3"><div className="ra-orbit-dot" /></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-8 ra-stage-text">{loadingMessages[loadingStage].text}</h2>
            <p className="text-slate-400 mt-2 text-sm">{loadingMessages[loadingStage].sub}</p>
            {/* Progress dots */}
            <div className="flex gap-2 mt-6">
              {loadingMessages.map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full transition-all duration-500 ${i <= loadingStage ? 'bg-indigo-500 scale-110' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ═══════ RESULTS VIEW ═══════
  if (result) {
    const a = result; // alias
    return (
      <Layout>
        <div className="max-w-7xl mx-auto pb-12 relative">
          {/* Header with toolbar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 ra-reveal" style={{ animationDelay: '0ms' }}>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                <span className="ra-header-icon"><GeoBrain size={28} color="#6366f1" /></span> Career Intelligence Report
              </h1>
              <p className="text-slate-500 mt-1">AI-powered deep analysis of your resume & career potential</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setHistoryOpen(!historyOpen)}
                className="ra-toolbar-btn" title="Analysis History">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span className="hidden sm:inline">History</span>
                {history.length > 0 && <span className="ra-history-badge">{history.length}</span>}
              </button>
              <button onClick={() => { setChatOpen(!chatOpen); setTimeout(() => chatInputRef.current?.focus(), 200); }}
                className="ra-toolbar-btn ra-toolbar-btn-chat" title="Ask AI about this analysis">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                <span className="hidden sm:inline">Ask AI</span>
              </button>
              <button onClick={handleReset} className="ra-toolbar-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </div>

          {/* ─── HISTORY SIDEBAR OVERLAY ─── */}
          {historyOpen && (
            <div className="ra-history-overlay" onClick={() => setHistoryOpen(false)}>
              <div className="ra-history-panel" onClick={(e) => e.stopPropagation()}>
                <div className="ra-history-header">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Analysis History
                  </h3>
                  <button onClick={() => setHistoryOpen(false)} className="ra-history-close">{'\u2715'}</button>
                </div>
                <div className="ra-history-list">
                  {history.length === 0 ? (
                    <div className="ra-history-empty">
                      <p className="text-slate-400 text-sm">No previous analyses yet</p>
                    </div>
                  ) : (
                    history.map(h => (
                      <div key={h.id} className={`ra-history-item ${analysisId === h.id ? 'ra-history-item-active' : ''}`}
                        onClick={() => loadFromHistory(h.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{h.filename || 'Untitled'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{formatDate(h.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`ra-history-score ${(h.opportunity_score || 0) >= 70 ? 'ra-score-good' : (h.opportunity_score || 0) >= 50 ? 'ra-score-mid' : 'ra-score-low'}`}>
                              {h.opportunity_score || 0}
                            </span>
                            <button onClick={(e) => deleteFromHistory(h.id, e)} className="ra-history-delete" title="Delete">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="ra-history-stage">{h.career_stage || 'N/A'}</span>
                          <p className="text-xs text-slate-400 truncate flex-1">{h.career_summary || ''}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── CHAT PANEL (Slide-in from right) ─── */}
          <div className={`ra-chat-panel ${chatOpen ? 'ra-chat-panel-open' : ''}`}>
            <div className="ra-chat-panel-header">
              <div className="flex items-center gap-2">
                <span className="text-lg"><GeoBrain size={22} color="#6366f1" /></span>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">AI Career Advisor</h4>
                  <p className="text-xs text-slate-400">Ask about your analysis</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="ra-chat-close">{'\u2715'}</button>
            </div>
            <div className="ra-chat-messages">
              {chatMessages.length === 0 && (
                <div className="ra-chat-empty">
                  <div className="text-3xl mb-3">{'\uD83D\uDCAC'}</div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">Ask anything about your analysis</p>
                  <p className="text-xs text-slate-400 mb-4">Get deeper insights, explanations, or career advice</p>
                  <div className="ra-chat-suggestions">
                    {[
                      'Why is my opportunity score this value?',
                      'How can I improve my salary range?',
                      'What should I learn first from missing skills?',
                      'Explain my 3-month plan in detail',
                    ].map((q, i) => (
                      <button key={i} className="ra-chat-suggestion" onClick={() => { setChatInput(q); chatInputRef.current?.focus(); }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.length > 0 && (
                <div className="ra-ai-disclaimer-sm">
                  <span>AI-generated content — please review carefully before use.</span>
                </div>
              )}
              {chatMessages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {chatLoading && (
                <div className="ra-chat-msg ra-chat-msg-ai">
                  <div className="ra-chat-avatar ra-chat-avatar-ai"><GeoBrain size={18} color="#6366f1" /></div>
                  <div className="ra-chat-bubble ra-chat-bubble-ai">
                    <div className="ra-chat-typing"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="ra-chat-input-area">
              <div className="ra-chat-input-wrap">
                <textarea ref={chatInputRef} value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown} placeholder="Ask about your analysis..."
                  rows={1} className="ra-chat-input" maxLength={2000} />
                <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}
                  className={`ra-chat-send ${(!chatInput.trim() || chatLoading) ? 'ra-chat-send-disabled' : ''}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* AI Disclaimer */}
          <div className="ra-ai-disclaimer ra-reveal" style={{ animationDelay: '80ms' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>AI-generated content — please review carefully before use.</span>
          </div>

          {/* ─── TOP ROW: Summary + Score ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Career Summary */}
            <div className="lg:col-span-2 ra-section-card ra-reveal" style={{ animationDelay: '100ms' }}>
              <div className="flex items-start gap-4">
                <div className="ra-career-badge">
                  <span className="text-sm font-bold text-white">{a.career_stage || 'N/A'}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Profile Summary</h3>
                  <p className="text-slate-600 leading-relaxed">{a.career_summary || 'No summary available.'}</p>
                </div>
              </div>
            </div>

            {/* Opportunity Score */}
            <div className="ra-section-card ra-reveal ra-score-card" style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col items-center text-center">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Opportunity Score</h3>
                <ScoreRing score={a.opportunity_score || 0} size={130} stroke={10} />
                <p className="text-xs text-slate-400 mt-3">
                  {(a.opportunity_score || 0) >= 80 ? 'Excellent market position!' : (a.opportunity_score || 0) >= 60 ? 'Good potential — room to grow' : 'Needs improvement for competitive edge'}
                </p>
              </div>
            </div>
          </div>

          {/* ─── SKILLS SECTION ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SectionCard title="Technical Skills" icon="⚙" delay={300} accent="#6366f1">
              <div className="flex flex-wrap gap-2">
                {(a.technical_skills || []).map((s, i) => <Chip key={i} text={s} color="#6366f1" />)}
                {(!a.technical_skills || a.technical_skills.length === 0) && <span className="text-slate-400 text-sm italic">No skills detected</span>}
              </div>
              {a.tools_and_frameworks && a.tools_and_frameworks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Tools & Frameworks</p>
                  <div className="flex flex-wrap gap-2">
                    {a.tools_and_frameworks.map((t, i) => <Chip key={i} text={t} color="#0891b2" />)}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Soft Skills" icon="💡" delay={400} accent="#8b5cf6">
              <div className="flex flex-wrap gap-2">
                {(a.soft_skills || []).map((s, i) => <Chip key={i} text={s} color="#8b5cf6" />)}
                {(!a.soft_skills || a.soft_skills.length === 0) && <span className="text-slate-400 text-sm italic">No soft skills detected</span>}
              </div>
            </SectionCard>
          </div>

          {/* ─── MISSING SKILLS ─── */}
          {a.missing_skills && a.missing_skills.length > 0 && (
            <SectionCard title="Critical Missing Skills" icon="⚠" delay={450} accent="#ef4444">
              <div className="flex flex-wrap gap-2">
                {a.missing_skills.map((s, i) => <Chip key={i} text={s} color="#ef4444" />)}
              </div>
              <p className="text-xs text-slate-400 mt-3">These skills are in high demand for your profile — consider learning them.</p>
            </SectionCard>
          )}

          {/* ─── JOB ROLES + INDUSTRY ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 mt-6">
            <SectionCard title="Best-Fit Job Roles" icon="🎯" delay={500} accent="#059669">
              <div className="space-y-3">
                {(a.job_roles || []).map((jr, i) => (
                  <div key={i} className="ra-role-item">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">{jr.role}</span>
                      <span className="text-sm font-bold" style={{ color: jr.match_percentage >= 80 ? '#059669' : jr.match_percentage >= 60 ? '#f59e0b' : '#ef4444' }}>{jr.match_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                      <div className="h-2 rounded-full ra-bar-fill" style={{ width: `${jr.match_percentage}%`, background: jr.match_percentage >= 80 ? '#059669' : jr.match_percentage >= 60 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <p className="text-xs text-slate-400">{jr.reason}</p>
                  </div>
                ))}
                {(!a.job_roles || a.job_roles.length === 0) && <p className="text-slate-400 text-sm italic">No roles detected</p>}
              </div>
            </SectionCard>

            <SectionCard title="Industry Fit Analysis" icon="🏢" delay={550} accent="#0891b2">
              <div className="space-y-3">
                {(a.industry_fit || []).map((ind, i) => (
                  <div key={i} className="ra-role-item">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">{ind.industry}</span>
                      <span className="text-sm font-bold text-cyan-600">{ind.fit_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full ra-bar-fill" style={{ width: `${ind.fit_percentage}%`, background: '#0891b2' }} />
                    </div>
                  </div>
                ))}
                {(!a.industry_fit || a.industry_fit.length === 0) && <p className="text-slate-400 text-sm italic">No industry data</p>}
              </div>
            </SectionCard>
          </div>

          {/* ─── SALARY + WEAKNESSES ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SectionCard title="Salary Estimation (India)" icon="💰" delay={600} accent="#f59e0b">
              <div className="flex items-center gap-6 py-2">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Minimum</p>
                  <p className="text-2xl font-extrabold text-amber-600">{formatSalary(a.salary_estimation_inr?.min)}</p>
                </div>
                <div className="text-3xl text-slate-200">→</div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Maximum</p>
                  <p className="text-2xl font-extrabold text-emerald-600">{formatSalary(a.salary_estimation_inr?.max)}</p>
                </div>
                <div className="text-xs text-slate-400 ml-auto">per annum</div>
              </div>
              <p className="text-xs text-slate-400 mt-2 border-t pt-3 border-slate-100">
                Based on your skills, experience, and current Indian market trends (IT Services, Product, Startups, Remote).
              </p>
            </SectionCard>

            <SectionCard title="Weaknesses Identified" icon="📉" delay={650} accent="#ef4444">
              <ul className="space-y-2">
                {(a.weaknesses || []).map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                    <span>{w}</span>
                  </li>
                ))}
                {(!a.weaknesses || a.weaknesses.length === 0) && <p className="text-slate-400 text-sm italic">No major weaknesses detected</p>}
              </ul>
            </SectionCard>
          </div>

          {/* ─── CERTIFICATIONS ─── */}
          {a.certification_recommendations && a.certification_recommendations.length > 0 && (
            <SectionCard title="Recommended Certifications" icon="🎓" delay={700} accent="#8b5cf6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {a.certification_recommendations.map((cert, i) => (
                  <div key={i} className="ra-cert-card">
                    <p className="font-semibold text-slate-800 text-sm">{typeof cert === 'string' ? cert : cert.name}</p>
                    {typeof cert !== 'string' && cert.provider && <p className="text-xs text-indigo-500 font-medium mt-1">{cert.provider}</p>}
                    {typeof cert !== 'string' && cert.reason && <p className="text-xs text-slate-400 mt-1">{cert.reason}</p>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ─── ROADMAP ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 mt-6">
            <SectionCard title="3-Month Improvement Plan" icon="🚀" delay={800} accent="#6366f1">
              <ol className="space-y-2">
                {(a.three_month_plan || []).map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="ra-step-num" style={{ background: '#6366f1' }}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
                {(!a.three_month_plan || a.three_month_plan.length === 0) && <p className="text-slate-400 text-sm italic">No plan generated</p>}
              </ol>
            </SectionCard>

            <SectionCard title="6-Month Growth Roadmap" icon="🗺️" delay={850} accent="#059669">
              <ol className="space-y-2">
                {(a.six_month_plan || []).map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="ra-step-num" style={{ background: '#059669' }}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
                {(!a.six_month_plan || a.six_month_plan.length === 0) && <p className="text-slate-400 text-sm italic">No roadmap generated</p>}
              </ol>
            </SectionCard>
          </div>

          {/* ─── ATS + STRUCTURE ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SectionCard title="ATS Compatibility Feedback" icon="🤖" delay={900} accent="#0891b2">
              <ul className="space-y-2">
                {(a.ats_improvements || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">→</span>
                    <span>{item}</span>
                  </li>
                ))}
                {(!a.ats_improvements || a.ats_improvements.length === 0) && <p className="text-slate-400 text-sm italic">No ATS issues detected</p>}
              </ul>
            </SectionCard>

            <SectionCard title="Resume Structure Issues" icon="📝" delay={950} accent="#f59e0b">
              <ul className="space-y-2">
                {(a.structure_issues || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
                {(!a.structure_issues || a.structure_issues.length === 0) && <p className="text-emerald-600 text-sm font-medium">✓ Resume structure looks good!</p>}
              </ul>
            </SectionCard>
          </div>

          {/* ─── ACTION PLAN ─── */}
          <SectionCard title="Personalized Action Plan" icon="⚡" delay={1000} accent="#6366f1">
            <div className="ra-action-plan-grid">
              {(a.action_plan || []).map((action, i) => (
                <div key={i} className="ra-action-item">
                  <div className="ra-action-num">{i + 1}</div>
                  <p className="text-sm text-slate-700">{action}</p>
                </div>
              ))}
              {(!a.action_plan || a.action_plan.length === 0) && <p className="text-slate-400 text-sm italic">No action plan generated</p>}
            </div>
          </SectionCard>

          {/* ═══════ 💼 JOB OPPORTUNITIES SECTION ═══════ */}
          <div className="ra-jobs-section ra-reveal" style={{ animationDelay: '1050ms' }}>
            <div className="ra-jobs-header">
              <div className="ra-jobs-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">Available Job Opportunities</h3>
                <p className="text-sm text-slate-400 mt-0.5">Real-time vacancies matching your resume profile in India</p>
              </div>
            </div>

            {/* Job Search Bar */}
            <div className="ra-job-search-bar">
              <div className="ra-job-search-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search for a specific role (e.g., React Developer)"
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJobSearch()}
                  className="ra-job-search-input"
                />
                <button onClick={handleJobSearch} disabled={jobSearchLoading || !jobSearchQuery.trim()} className="ra-job-search-btn">
                  {jobSearchLoading ? <span className="ra-job-spinner" /> : 'Search'}
                </button>
              </div>
            </div>

            {/* Custom Search Results */}
            {jobSearchResults && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-600">
                    Search: "{jobSearchResults.role}" — {jobSearchResults.total} results
                  </h4>
                  <button onClick={() => setJobSearchResults(null)} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                </div>
                <div className="ra-job-grid">
                  {(jobSearchResults.jobs || []).slice(0, 10).map((job, i) => (
                    <div key={i} className="ra-job-card">
                      <div className="ra-job-card-top">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-800 text-sm truncate">{job.title}</h5>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{job.company}</p>
                        </div>
                      </div>
                      <div className="ra-job-meta">
                        <span className="ra-job-location">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {job.location || 'India'}
                        </span>
                        <span className="ra-job-salary">{job.salary_range || 'Not disclosed'}</span>
                      </div>
                      {job.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{job.description}</p>}
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="ra-job-apply-btn">
                        Apply Now
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </a>
                    </div>
                  ))}
                </div>
                {(jobSearchResults.jobs || []).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">No jobs found for this search. Try a different role.</p>
                )}
              </div>
            )}

            {/* Loading State */}
            {jobsLoading && (
              <div className="ra-jobs-loading">
                <div className="ra-job-spinner-lg" />
                <p className="text-sm text-slate-500 mt-3">Finding matching job opportunities...</p>
              </div>
            )}

            {/* Error State */}
            {jobsError && !jobsLoading && (
              <div className="ra-jobs-error">
                <p className="text-sm text-amber-700">{jobsError}</p>
                <button onClick={() => fetchRecommendedJobs(analysisId)} className="ra-jobs-retry-btn">Retry</button>
              </div>
            )}

            {/* Recommended Jobs by Role */}
            {!jobsLoading && !jobsError && jobsData && (
              <div className="ra-jobs-results">
                {(jobsData.recommended_jobs || []).length === 0 && (
                  <div className="ra-jobs-empty">
                    <div className="text-3xl mb-2">💼</div>
                    <p className="text-slate-500 text-sm">No matching vacancies found right now. Check back later!</p>
                  </div>
                )}

                {(jobsData.recommended_jobs || []).map((roleGroup, ri) => (
                  <div key={ri} className="ra-job-role-group">
                    <div className="ra-job-role-header" onClick={() => toggleRoleExpand(roleGroup.role)}>
                      <div className="flex items-center gap-3">
                        <div className="ra-job-role-icon">💼</div>
                        <div>
                          <h4 className="font-bold text-slate-800">{roleGroup.role}</h4>
                          <p className="text-xs text-slate-400">{roleGroup.jobs?.length || 0} opportunities found</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="ra-job-role-match" style={{ color: roleGroup.role_match >= 80 ? '#059669' : roleGroup.role_match >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {roleGroup.role_match}% match
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                          style={{ transform: expandedRoles[roleGroup.role] !== false ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {expandedRoles[roleGroup.role] !== false && (
                      <div className="ra-job-grid">
                        {(roleGroup.jobs || []).map((job, ji) => (
                          <div key={ji} className="ra-job-card">
                            <div className="ra-job-card-top">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-slate-800 text-sm truncate">{job.title}</h5>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{job.company}</p>
                              </div>
                              <div className="ra-job-match-badge" style={{
                                background: job.match_score >= 70 ? '#ecfdf5' : job.match_score >= 50 ? '#fffbeb' : '#fef2f2',
                                color: job.match_score >= 70 ? '#059669' : job.match_score >= 50 ? '#d97706' : '#dc2626',
                                border: `1px solid ${job.match_score >= 70 ? '#a7f3d0' : job.match_score >= 50 ? '#fde68a' : '#fecaca'}`,
                              }}>
                                {job.match_score}%
                              </div>
                            </div>
                            <div className="ra-job-meta">
                              <span className="ra-job-location">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {job.location || 'India'}
                              </span>
                              <span className="ra-job-salary">{job.salary_range || 'Not disclosed'}</span>
                            </div>
                            {job.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{job.description}</p>}
                            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="ra-job-apply-btn">
                              Apply Now
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {jobsData.total_jobs > 0 && (
                  <p className="text-xs text-slate-400 text-center mt-4">
                    Showing {jobsData.total_jobs} jobs • Powered by Adzuna • Updated {new Date(jobsData.fetched_at).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── EXPORT REPORT SECTION ─── */}
          <div className="ra-export-section ra-reveal" style={{ animationDelay: '1100ms' }}>
            <div className="ra-export-glow" />
            <div className="ra-export-inner">
              <div className="ra-export-header">
                <div className="ra-export-icon-wrap">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Export Your Career Report</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Download a professional report to share or keep for reference</p>
                </div>
              </div>
              <div className="ra-export-buttons">
                <button
                  onClick={() => handleDownloadReport('pdf')}
                  disabled={downloadingPdf}
                  className="ra-export-btn ra-export-btn-pdf"
                >
                  {downloadingPdf ? (
                    <span className="ra-export-spinner" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  )}
                  <span className="ra-export-btn-text">
                    <span className="ra-export-btn-label">{downloadingPdf ? 'Generating...' : 'Download PDF'}</span>
                    <span className="ra-export-btn-sub">Professional formatted report</span>
                  </span>
                </button>
                <button
                  onClick={() => handleDownloadReport('docx')}
                  disabled={downloadingDocx}
                  className="ra-export-btn ra-export-btn-docx"
                >
                  {downloadingDocx ? (
                    <span className="ra-export-spinner" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                  )}
                  <span className="ra-export-btn-text">
                    <span className="ra-export-btn-label">{downloadingDocx ? 'Generating...' : 'Download Word'}</span>
                    <span className="ra-export-btn-sub">Editable .docx document</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── FLOATING CHAT BUTTON ─── */}
          {!chatOpen && (
            <button onClick={() => { setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 200); }}
              className="ra-fab-chat" title="Ask AI about this analysis">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </button>
          )}
        </div>
      </Layout>
    );
  }

  // ═══════ UPLOAD VIEW ═══════
  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="text-center mb-10 ra-reveal" style={{ animationDelay: '0ms' }}>
          <div className="ra-page-icon-wrap mb-4">
            <span className="ra-page-icon"><GeoBrain size={36} color="#6366f1" /></span>
            <div className="ra-page-icon-ring ra-page-icon-ring-1" />
            <div className="ra-page-icon-ring ra-page-icon-ring-2" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 mb-3">AI Resume Analyzer</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Upload your resume in any format and get deep career intelligence — job matches, salary estimates, skill gaps, and a personalized growth roadmap.
          </p>
        </div>

        {/* Upload Card */}
        <div className="ra-upload-card ra-reveal" style={{ animationDelay: '150ms' }}>
          <div className="ra-upload-card-glow" />

          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Your Resume
          </h2>

          {/* Drop Zone */}
          <div
            className={`ra-dropzone ${dragActive ? 'ra-dropzone-active' : ''} ${file ? 'ra-dropzone-has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => handleFile(e.target.files[0])} className="hidden" />

            {file ? (
              <div className="text-center">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl mx-auto mb-3 border-2 border-indigo-200 shadow" />
                ) : (
                  <div className="text-5xl mb-3">{getFileIcon()}</div>
                )}
                <p className="font-bold text-slate-800">{file.name}</p>
                <p className="text-slate-400 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="mt-3 text-xs text-red-500 hover:text-red-700 font-bold">Remove File</button>
              </div>
            ) : (
              <div className="text-center">
                <div className="ra-upload-icon-wrap mb-4">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p className="font-bold text-slate-800 mb-1">Click or Drag & Drop your resume</p>
                <p className="text-slate-400 text-sm">PDF, DOCX, TXT, PNG, JPG — Max 10MB</p>
              </div>
            )}
          </div>

          {/* Supported Formats */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {['PDF', 'DOCX', 'TXT', 'PNG', 'JPG'].map(fmt => (
              <span key={fmt} className="ra-format-badge">{fmt}</span>
            ))}
          </div>

          {/* Analyze Button */}
          <button onClick={handleAnalyze} disabled={!file}
            className={`ra-analyze-btn mt-6 ${!file ? 'ra-analyze-btn-disabled' : ''}`}>
            <span className="flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Analyze with AI
            </span>
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {[
            { icon: '🎯', title: 'Job Role Matching', desc: 'AI suggests best-fit roles for your profile', color: '#059669' },
            { icon: '💰', title: 'Salary Estimation', desc: 'INR salary range based on market trends', color: '#f59e0b' },
            { icon: '📊', title: 'Skill Gap Analysis', desc: 'Missing skills critical for your career', color: '#ef4444' },
            { icon: '🏢', title: 'Industry Fit', desc: 'Which industries match your expertise', color: '#0891b2' },
            { icon: '🗺️', title: 'Growth Roadmap', desc: '3 & 6 month personalized career plan', color: '#8b5cf6' },
            { icon: '🤖', title: 'ATS Compatibility', desc: 'Resume structure & format feedback', color: '#6366f1' },
          ].map((feat, i) => (
            <div key={i} className="ra-feature-card ra-reveal" style={{ animationDelay: `${300 + i * 80}ms` }}>
              <div className="ra-feature-icon" style={{ background: `${feat.color}12`, color: feat.color }}>{feat.icon}</div>
              <h4 className="font-bold text-slate-800 text-sm mt-3">{feat.title}</h4>
              <p className="text-slate-400 text-xs mt-1">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* ─── RECENT HISTORY ON UPLOAD PAGE ─── */}
        {history.length > 0 && (
          <div className="mt-10 ra-reveal" style={{ animationDelay: '250ms' }}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Recent Analyses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {history.slice(0, 6).map(h => (
                <div key={h.id} className="ra-history-card" onClick={() => loadFromHistory(h.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{h.filename || 'Untitled'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(h.created_at)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="ra-history-stage">{h.career_stage || 'N/A'}</span>
                        <p className="text-xs text-slate-400 truncate flex-1">{h.career_summary || ''}</p>
                      </div>
                    </div>
                    <div className={`ra-history-score-lg ${(h.opportunity_score || 0) >= 70 ? 'ra-score-good' : (h.opportunity_score || 0) >= 50 ? 'ra-score-mid' : 'ra-score-low'}`}>
                      {h.opportunity_score || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ResumeAnalyzer;
