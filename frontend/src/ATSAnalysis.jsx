import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell } from 'recharts';
import Layout from './components/Layout';

/* ─── Reusable Sub-components ─────────────────────────────────── */

function ScoreRing({ score, size = 130, stroke = 10, label }) {
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (circ * score) / 100;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    return (
        <div className="ats-score-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
                    strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
                    strokeDashoffset={offset} className="ats-ring-fill" style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }} />
            </svg>
            <div className="ats-ring-label">
                <span className="ats-ring-number" style={{ color }}>{score}</span>
                {label && <span className="ats-ring-text">{label}</span>}
            </div>
        </div>
    );
}

function SectionCard({ title, icon, children, accent = '#6366f1', className = '' }) {
    return (
        <div className={`ats-card ats-card-reveal ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="ats-card-icon" style={{ background: `${accent}12`, color: accent }}>{icon}</div>
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function Chip({ text, color = '#6366f1', variant = 'filled' }) {
    return variant === 'filled' ? (
        <span className="ats-chip" style={{ background: `${color}12`, color, border: `1px solid ${color}22` }}>{text}</span>
    ) : (
        <span className="ats-chip" style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>{text}</span>
    );
}

function SeverityBadge({ severity }) {
    const map = { critical: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }, warning: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' }, suggestion: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' } };
    const s = map[severity] || map.suggestion;
    return <span className="ats-severity" style={{ background: s.bg, color: s.color, borderColor: s.border }}>{severity}</span>;
}

function ProgressBar({ value, color = '#6366f1', height = 8, label, showValue = true }) {
    return (
        <div className="ats-progress-wrap">
            {(label || showValue) && (
                <div className="flex justify-between items-center mb-1.5">
                    {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
                    {showValue && <span className="text-sm font-bold" style={{ color }}>{value}%</span>}
                </div>
            )}
            <div className="ats-progress-track" style={{ height }}>
                <div className="ats-progress-bar" style={{ width: `${value}%`, background: color, height }} />
            </div>
        </div>
    );
}

function ATSAnalysis() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [file, setFile] = useState(null);
    const [jdMode, setJdMode] = useState('text'); // 'text' or 'file'
    const [jdText, setJdText] = useState('');
    const [jdFile, setJdFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [analysisCount, setAnalysisCount] = useState(0);
    const [history, setHistory] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);

    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const foundUser = JSON.parse(loggedInUser);
            setUser(foundUser);
            fetchStats(foundUser.id);
            fetchHistory();
        } else {
            navigate('/login');
        }
    }, []);

    const fetchStats = async (userId) => {
        try {
            const response = await api.get('/ats/stats');
            setAnalysisCount(response.data.count);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/ats/history');
            setHistory(res.data.history || []);
        } catch (err) {
            console.error('Error fetching ATS history:', err);
        }
    };

    const loadFromHistory = async (item) => {
        try {
            const res = await api.get(`/ats/history/${item.type}/${item.id}`);
            if (res.data.analysis) {
                setResult(res.data.analysis);
                setHistoryOpen(false);
                toast.success('Analysis loaded from history');
            } else {
                toast.error('No analysis data stored for this entry');
            }
        } catch (err) {
            toast.error('Failed to load analysis');
        }
    };

    const deleteFromHistory = async (item, e) => {
        e.stopPropagation();
        try {
            await api.delete(`/ats/history/${item.type}/${item.id}`);
            setHistory(prev => prev.filter(h => !(h.id === item.id && h.type === item.type)));
            toast.success('Deleted from history');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleJdFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setJdFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Please select a resume file first");
            return;
        }

        // Validation: If JD info is provided, great. If not, we still allow resume-only analysis for now 
        // unless the requirement "At least one input required" meant JD specifically. 
        // Based on "Job Description Matching", valid check is usually: if matching requested, JD needed.
        // For now, I will proceed with just the Resume to existing endpoint, but log the JD state.

        if (jdMode === 'text' && jdText.trim()) {
            console.log("Analyzing with JD Text:", jdText.substring(0, 50) + "...");
        } else if (jdMode === 'file' && jdFile) {
            console.log("Analyzing with JD File:", jdFile.name);
        }

        const formData = new FormData();
        formData.append('file', file);

        if (jdMode === 'text' && jdText.trim()) {
            formData.append('jd_text', jdText);
        } else if (jdMode === 'file' && jdFile) {
            formData.append('jd_file', jdFile);
        }

        setLoading(true);
        try {
            const response = await api.post('/ats/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log("Analysis Result:", response.data);
            setResult(response.data); // Store full response to check analysis_type
            toast.success("Analysis Complete!");
            fetchStats(user.id);
            fetchHistory();
        } catch (error) {
            console.error("ATS Analysis error:", error);
            toast.error("Failed to analyze resume. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            ◎ ATS Resume Analysis
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-2xl">
                            Get instant feedback on your resume's compatibility with Applicant Tracking Systems.
                            Upload your file to get started.
                        </p>
                    </div>
                    <div className="bg-purple-50 text-purple-700 px-6 py-3 rounded-xl border border-purple-100 shadow-sm text-center">
                        <div className="text-xs font-bold uppercase tracking-wider mb-1">Total Analyzed</div>
                        <div className="text-3xl font-extrabold">{analysisCount}</div>
                    </div>
                    <button onClick={() => setHistoryOpen(!historyOpen)}
                        className="rh-btn ml-3" title="Recent Analyses">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>Recent Analyses</span>
                        {history.length > 0 && <span className="rh-badge">{history.length}</span>}
                    </button>
                </div>

                {/* ─── RECENT ANALYSES SIDEBAR ─── */}
                {historyOpen && (
                    <div className="rh-overlay" onClick={() => setHistoryOpen(false)}>
                        <div className="rh-panel" onClick={(e) => e.stopPropagation()}>
                            <div className="rh-header">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    Recent ATS Analyses
                                </h3>
                                <button onClick={() => setHistoryOpen(false)} className="rh-close">{'\u2715'}</button>
                            </div>
                            <div className="rh-list">
                                {history.length === 0 ? (
                                    <div className="rh-empty">
                                        <p className="text-slate-400 text-sm">No recent analyses yet</p>
                                    </div>
                                ) : (
                                    history.map(h => (
                                        <div key={`${h.type}-${h.id}`} className="rh-item" onClick={() => loadFromHistory(h)}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-800 text-sm truncate">{h.filename || 'Untitled'}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`rh-type-tag ${h.type === 'match' ? 'rh-type-match' : 'rh-type-ats'}`}>
                                                            {h.type === 'match' ? 'JD Match' : 'ATS'}
                                                        </span>
                                                        <span className="text-xs text-slate-400">{formatDate(h.created_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className={`rh-score ${h.score >= 70 ? 'rh-score-good' : h.score >= 50 ? 'rh-score-mid' : 'rh-score-low'}`}>
                                                        {h.score}
                                                    </span>
                                                    <button onClick={(e) => deleteFromHistory(h, e)} className="rh-delete" title="Remove">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Upload Inputs */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* 1. Resume Upload */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4">1. Upload Resume <span className="text-red-500">*</span></h3>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                    ↑
                                </div>
                                <h4 className="font-bold text-slate-800 mb-2">
                                    {file ? file.name : "Click or Drag & Drop"}
                                </h4>
                                <p className="text-slate-500 text-xs">
                                    PDF, DOCX, TXT (Max 16MB)
                                </p>
                            </div>
                        </div>

                        {/* 2. Job Description Input */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4">2. Job Description Matching</h3>

                            {/* Tabs */}
                            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                                <button
                                    onClick={() => setJdMode('text')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${jdMode === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Paste Text
                                </button>
                                <button
                                    onClick={() => setJdMode('file')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${jdMode === 'file' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Upload File
                                </button>
                            </div>

                            {/* Input Area */}
                            {jdMode === 'text' ? (
                                <div>
                                    <textarea
                                        value={jdText}
                                        onChange={(e) => setJdText(e.target.value)}
                                        placeholder="Paste the job description here..."
                                        className="w-full h-40 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-y"
                                    ></textarea>
                                    <p className="text-xs text-slate-400 text-right mt-1">
                                        {jdText.length} characters
                                    </p>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors relative">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleJdFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="text-3xl mb-2">▤</div>
                                    <p className="font-medium text-slate-700 text-sm">
                                        {jdFile ? jdFile.name : "Upload Job Description"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">.pdf, .docx, .txt</p>
                                </div>
                            )}
                        </div>

                        {/* Analyze Button */}
                        <button
                            onClick={handleAnalyze}
                            disabled={!file || loading}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${!file || loading
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-purple-500/30'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : (
                                "Start AI Analysis"
                            )}
                        </button>
                    </div>

                    {/* Right Column: Results */}
                    <div className="lg:col-span-2">
                        {/* History Chart */}
                        <MatchHistoryChart history={history} />

                        {!result ? (
                            <div className="ats-card text-center flex flex-col items-center justify-center min-h-[400px]">
                                <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mb-6">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">No Analysis Results Yet</h3>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    Upload your resume and start the analysis to see your ATS score, section breakdown, keyword analysis, and improvement recommendations.
                                </p>
                            </div>
                        ) : result.match_result ? (
                            /* ═══════════════════════════════════════════════
                               ENHANCED JD MATCH RESULTS
                               ═══════════════════════════════════════════════ */
                            <MatchResultView result={result.match_result} />
                        ) : (
                            /* ═══════════════════════════════════════════════
                               ENHANCED STANDARD ATS RESULTS
                               ═══════════════════════════════════════════════ */
                            <ATSResultView result={result.ats_analysis} />
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

/* ═══════════════════════════════════════════════════════════════
   STANDARD ATS RESULT VIEW — Enhanced
   ═══════════════════════════════════════════════════════════════ */
function ATSResultView({ result }) {
    const a = result;
    const sectionScores = a.section_scores || [];
    const fmt = a.formatting_analysis || {};
    const kw = a.keyword_analysis || {};
    const issues = a.issues || [];
    const quickWins = a.quick_wins || [];
    const recs = a.detailed_recommendations || [];

    // Radar chart data from section scores
    const radarData = sectionScores.map(s => ({ section: s.section?.replace(/\s+/g, '\n'), score: s.score, fullMark: 100 }));

    // Bar chart for formatting checks
    const fmtChecks = [
        { name: 'Standard Sections', value: fmt.has_standard_sections ? 100 : 0 },
        { name: 'Bullet Points', value: fmt.uses_bullet_points ? 100 : 0 },
        { name: 'Measurable Results', value: fmt.has_measurable_achievements ? 100 : 0 },
        { name: 'Contact Info', value: fmt.has_contact_info ? 100 : 0 },
        { name: 'Prof. Summary', value: fmt.has_professional_summary ? 100 : 0 },
    ];

    const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
    const sortedIssues = [...issues].sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

    return (
        <div className="space-y-6 ats-results-animate">
            {/* AI Disclaimer */}
            <div className="ats-ai-disclaimer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>AI-generated content — please review carefully before use.</span>
            </div>

            {/* ─── HERO: Score + Verdict + Summary ─── */}
            <div className="ats-card ats-hero-card">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreRing score={a.score || 0} size={150} stroke={12} />
                    <div className="flex-1 text-center md:text-left">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">ATS Compatibility Score</p>
                        <h2 className="text-4xl font-extrabold text-slate-800 mb-1">{a.score}/100</h2>
                        {a.verdict && (
                            <span className={`ats-verdict ${a.score >= 80 ? 'ats-verdict-good' : a.score >= 60 ? 'ats-verdict-mid' : 'ats-verdict-low'}`}>
                                {a.verdict}
                            </span>
                        )}
                        {a.summary && <p className="text-slate-600 mt-3 leading-relaxed text-sm">{a.summary}</p>}
                    </div>
                </div>
            </div>

            {/* ─── SECTION SCORES RADAR + READABILITY ─── */}
            {sectionScores.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Radar Chart */}
                    <div className="lg:col-span-3">
                        <SectionCard title="Section-by-Section Breakdown" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><line x1="22" y1="8.5" x2="12" y2="15.5"/><line x1="2" y1="8.5" x2="12" y2="15.5"/></svg>} accent="#6366f1">
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData} outerRadius="70%">
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="section" tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                        <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    </div>

                    {/* Section list scores */}
                    <div className="lg:col-span-2">
                        <SectionCard title="Section Scores" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>} accent="#0891b2">
                            <div className="space-y-3 max-h-56 overflow-y-auto ats-scrollbar pr-1">
                                {sectionScores.map((s, i) => (
                                    <div key={i}>
                                        <ProgressBar value={s.score || 0} label={s.section} color={s.score >= 80 ? '#10b981' : s.score >= 60 ? '#f59e0b' : '#ef4444'} height={6} />
                                        {s.feedback && <p className="text-xs text-slate-400 mt-0.5 ml-1">{s.feedback}</p>}
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </div>
                </div>
            )}

            {/* ─── FORMATTING ANALYSIS ─── */}
            {(fmt.readability_score !== undefined || fmt.has_standard_sections !== undefined) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Formatting Checklist" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>} accent="#059669">
                        <div className="space-y-3">
                            {fmtChecks.map((check, i) => (
                                <div key={i} className="flex items-center justify-between py-1">
                                    <span className="text-sm text-slate-700">{check.name}</span>
                                    {check.value === 100 ? (
                                        <span className="ats-check-pass">✓ Present</span>
                                    ) : (
                                        <span className="ats-check-fail">✕ Missing</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {fmt.formatting_notes && (
                            <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">{fmt.formatting_notes}</p>
                        )}
                    </SectionCard>

                    <SectionCard title="Readability & Parsing" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>} accent="#8b5cf6">
                        <div className="flex flex-col items-center py-4">
                            <ScoreRing score={fmt.readability_score || 0} size={110} stroke={8} label="Readability" />
                            <p className="text-xs text-slate-400 mt-3 text-center max-w-xs">
                                {(fmt.readability_score || 0) >= 80 ? 'Excellent — ATS parsers will read this easily.' :
                                    (fmt.readability_score || 0) >= 60 ? 'Good but could improve structure for better parsing.' :
                                        'Poor readability — may confuse ATS parsers. Simplify formatting.'}
                            </p>
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* ─── KEYWORD ANALYSIS ─── */}
            {(kw.detected_keywords || kw.recommended_keywords) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Detected Keywords" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>} accent="#059669">
                        {kw.keyword_density && (
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold text-slate-400 uppercase">Keyword Density:</span>
                                <span className={`ats-density-badge ${kw.keyword_density === 'High' ? 'ats-density-high' : kw.keyword_density === 'Medium' ? 'ats-density-med' : 'ats-density-low'}`}>
                                    {kw.keyword_density}
                                </span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {(kw.detected_keywords || []).map((k, i) => <Chip key={i} text={k} color="#059669" />)}
                        </div>
                        {kw.industry_keywords_present && kw.industry_keywords_present.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Industry-Specific Terms</p>
                                <div className="flex flex-wrap gap-2">
                                    {kw.industry_keywords_present.map((k, i) => <Chip key={i} text={k} color="#0891b2" />)}
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Recommended Keywords to Add" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} accent="#f59e0b">
                        <div className="flex flex-wrap gap-2">
                            {(kw.recommended_keywords || []).map((k, i) => <Chip key={i} text={k} color="#d97706" />)}
                        </div>
                        <p className="text-xs text-slate-400 mt-3">Adding these keywords could improve your ATS match rate significantly.</p>
                    </SectionCard>
                </div>
            )}

            {/* ─── QUICK WINS ─── */}
            {quickWins.length > 0 && (
                <SectionCard title="Quick Wins — Easiest Improvements" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>} accent="#f59e0b">
                    <div className="space-y-2">
                        {quickWins.map((win, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="ats-quick-number">{i + 1}</span>
                                <span className="text-sm text-slate-700">{win}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ─── STRENGTHS ─── */}
            {a.advantages && a.advantages.length > 0 && (
                <SectionCard title="Strengths Detected" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} accent="#10b981">
                    <ul className="space-y-2">
                        {a.advantages.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            )}

            {/* ─── ISSUES (sorted by severity) ─── */}
            {sortedIssues.length > 0 && (
                <SectionCard title={`Issues to Fix (${sortedIssues.length})`} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} accent="#ef4444">
                    <div className="space-y-3">
                        {sortedIssues.map((issue, i) => (
                            <div key={i} className="ats-issue-card">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="ats-issue-section">{issue.section || 'General'}</span>
                                    <SeverityBadge severity={issue.severity || 'suggestion'} />
                                </div>
                                <p className="font-semibold text-slate-800 text-sm mb-1">{issue.problem}</p>
                                <p className="text-slate-500 text-xs mb-2">{issue.reason}</p>
                                <div className="ats-issue-fix">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                                    <span>{issue.fix}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ─── DETAILED RECOMMENDATIONS ─── */}
            {recs.length > 0 && (
                <SectionCard title="Detailed Recommendations" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>} accent="#6366f1">
                    <div className="space-y-3">
                        {recs.map((rec, i) => (
                            <div key={i} className="ats-rec-card">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="ats-rec-category">{rec.category || 'General'}</span>
                                    <span className={`ats-rec-impact ${rec.impact === 'high' ? 'ats-impact-high' : rec.impact === 'medium' ? 'ats-impact-med' : 'ats-impact-low'}`}>
                                        {rec.impact} impact
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700">{rec.recommendation}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════════
   JD MATCH RESULT VIEW — Enhanced
   ═══════════════════════════════════════════════════════════════ */
function MatchResultView({ result }) {
    const m = result;
    const sb = m.skillBreakdown || {};
    const ea = m.experienceAnalysis || {};
    const suggestions = m.improvementSuggestions || [];
    const tips = m.ats_optimization_tips || [];

    // Multi-score bar data
    const scoreMetrics = [
        { name: 'Overall Match', value: m.matchScore || 0, color: '#6366f1' },
        { name: 'Skills Match', value: m.skillMatchPercentage || 0, color: '#8b5cf6' },
        { name: 'Experience Match', value: m.experienceMatchPercentage || 0, color: '#0891b2' },
        { name: 'Qualification Match', value: m.qualificationMatchPercentage || 0, color: '#059669' },
    ];

    return (
        <div className="space-y-6 ats-results-animate">
            {/* AI Disclaimer */}
            <div className="ats-ai-disclaimer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>AI-generated content — please review carefully before use.</span>
            </div>

            {/* ─── HERO: Match Score + Verdict ─── */}
            <div className="ats-card ats-hero-card">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreRing score={m.matchScore || 0} size={150} stroke={12} />
                    <div className="flex-1 text-center md:text-left">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Job Match Score</p>
                        <h2 className="text-4xl font-extrabold text-slate-800 mb-1">{m.matchScore}%</h2>
                        {m.verdict && (
                            <span className={`ats-verdict ${(m.matchScore || 0) >= 80 ? 'ats-verdict-good' : (m.matchScore || 0) >= 60 ? 'ats-verdict-mid' : 'ats-verdict-low'}`}>
                                {m.verdict}
                            </span>
                        )}
                        {m.summary && <p className="text-slate-600 mt-3 leading-relaxed text-sm">{m.summary}</p>}
                    </div>
                </div>
            </div>

            {/* ─── MULTI-SCORE BARS ─── */}
            <SectionCard title="Match Breakdown" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>} accent="#6366f1">
                <div className="space-y-4 py-2">
                    {scoreMetrics.map((metric, i) => (
                        <ProgressBar key={i} value={metric.value} label={metric.name} color={metric.color} height={10} />
                    ))}
                </div>
            </SectionCard>

            {/* ─── SKILL BREAKDOWN ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Matched Skills */}
                <SectionCard title="Matched Hard Skills" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} accent="#10b981">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(sb.matched_hard_skills || []).map((s, i) => <Chip key={i} text={s} color="#10b981" />)}
                        {(!sb.matched_hard_skills || sb.matched_hard_skills.length === 0) && <span className="text-slate-400 text-sm italic">None detected</span>}
                    </div>
                    {sb.matched_soft_skills && sb.matched_soft_skills.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Matched Soft Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {sb.matched_soft_skills.map((s, i) => <Chip key={i} text={s} color="#8b5cf6" />)}
                            </div>
                        </div>
                    )}
                    {sb.bonus_skills && sb.bonus_skills.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Bonus Skills (Extra Value)</p>
                            <div className="flex flex-wrap gap-2">
                                {sb.bonus_skills.map((s, i) => <Chip key={i} text={s} color="#0891b2" />)}
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* Missing Skills */}
                <SectionCard title="Missing Skills" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>} accent="#ef4444">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(sb.missing_hard_skills || []).map((s, i) => <Chip key={i} text={s} color="#ef4444" />)}
                        {(!sb.missing_hard_skills || sb.missing_hard_skills.length === 0) && <span className="text-emerald-500 text-sm italic">No critical hard skills missing!</span>}
                    </div>
                    {sb.missing_soft_skills && sb.missing_soft_skills.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Missing Soft Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {sb.missing_soft_skills.map((s, i) => <Chip key={i} text={s} color="#d97706" />)}
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* ─── KEYWORDS ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Matched Keywords" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} accent="#10b981">
                    <div className="flex flex-wrap gap-2">
                        {(m.matchedKeywords || []).length > 0 ? (
                            m.matchedKeywords.map((kw, i) => <Chip key={i} text={kw} color="#059669" />)
                        ) : (
                            <span className="text-slate-400 text-sm italic">No specific keywords matched.</span>
                        )}
                    </div>
                </SectionCard>

                <SectionCard title="Missing Keywords" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>} accent="#ef4444">
                    <div className="flex flex-wrap gap-2">
                        {(m.missingKeywords || []).length > 0 ? (
                            m.missingKeywords.map((kw, i) => <Chip key={i} text={kw} color="#ef4444" />)
                        ) : (
                            <span className="text-emerald-500 text-sm italic">Great — no key terms are missing!</span>
                        )}
                    </div>
                </SectionCard>
            </div>

            {/* ─── EXPERIENCE ANALYSIS ─── */}
            {(ea.required_years || ea.candidate_level) && (
                <SectionCard title="Experience Analysis" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>} accent="#6366f1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="ats-exp-box">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Required</p>
                            <p className="text-lg font-bold text-slate-800">{ea.required_years || 'N/A'}</p>
                        </div>
                        <div className="ats-exp-box">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Your Level</p>
                            <p className="text-lg font-bold text-indigo-600">{ea.candidate_level || 'N/A'}</p>
                        </div>
                    </div>
                    {ea.relevant_experience && ea.relevant_experience.length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Relevant Experience</p>
                            <ul className="space-y-1">
                                {ea.relevant_experience.map((exp, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-emerald-500 mt-0.5">✓</span> {exp}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {ea.experience_gaps && ea.experience_gaps.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-red-500 uppercase mb-2">Experience Gaps</p>
                            <ul className="space-y-1">
                                {ea.experience_gaps.map((gap, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-red-400 mt-0.5">✕</span> {gap}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </SectionCard>
            )}

            {/* ─── STRENGTHS & WEAKNESSES ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {m.strengths && m.strengths.length > 0 && (
                    <SectionCard title="Strengths" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>} accent="#10b981">
                        <ul className="space-y-2">
                            {m.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span> {s}
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                )}

                {m.weaknesses && m.weaknesses.length > 0 && (
                    <SectionCard title="Weaknesses" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/></svg>} accent="#ef4444">
                        <ul className="space-y-2">
                            {m.weaknesses.map((w, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span> {w}
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                )}
            </div>

            {/* ─── ATS OPTIMIZATION TIPS ─── */}
            {tips.length > 0 && (
                <SectionCard title="ATS Optimization Tips" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>} accent="#f59e0b">
                    <div className="space-y-2">
                        {tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="ats-quick-number">{i + 1}</span>
                                <span className="text-sm text-slate-700">{tip}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ─── IMPROVEMENT SUGGESTIONS ─── */}
            {suggestions.length > 0 && (
                <SectionCard title="Improvement Suggestions" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>} accent="#6366f1">
                    <div className="space-y-3">
                        {suggestions.map((sug, i) => {
                            const isObj = typeof sug === 'object';
                            return (
                                <div key={i} className="ats-rec-card">
                                    {isObj && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="ats-rec-category">{sug.area || 'General'}</span>
                                            <span className={`ats-rec-impact ${sug.priority === 'high' ? 'ats-impact-high' : sug.priority === 'medium' ? 'ats-impact-med' : 'ats-impact-low'}`}>
                                                {sug.priority} priority
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-700">{isObj ? sug.suggestion : sug}</p>
                                    {isObj && sug.impact && <p className="text-xs text-slate-400 mt-1">Impact: {sug.impact}</p>}
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════════
   MATCH HISTORY CHART
   ═══════════════════════════════════════════════════════════════ */
const MatchHistoryChart = ({ history }) => {
    if (!history || history.length === 0) return null;

    const data = [...history].reverse().map(item => ({
        date: new Date(item.timestamp).toLocaleDateString(),
        score: item.match_score
    }));

    return (
        <div className="ats-card mb-6">
            <h3 className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-6">Match Score Progress</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3}
                            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ATSAnalysis;
