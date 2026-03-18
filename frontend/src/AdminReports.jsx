import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';

/* ──────────────────────────────────────────────────────────────
   ADMIN REPORTS — AI Usage Analytics + Generated Reports
   ────────────────────────────────────────────────────────────── */

function AdminReports() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');    // overview | users | reports
  const [loading, setLoading] = useState(true);

  // AI Usage Stats
  const [stats, setStats] = useState({
    total_today: 0, total_month: 0, tokens_month: 0,
    active_users: 0, most_used_feature: null, most_active_user: null,
    feature_breakdown: [],
  });

  // User usage table
  const [userUsage, setUserUsage] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userFilter, setUserFilter] = useState('');

  // Generated reports
  const [reports, setReports] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);

  // Job applications
  const [jobApps, setJobApps] = useState([]);
  const [jobAppPage, setJobAppPage] = useState(1);
  const [jobAppTotal, setJobAppTotal] = useState(0);
  const [jobAppSearch, setJobAppSearch] = useState('');
  const [jobAppStats, setJobAppStats] = useState({ total_applications: 0, today: 0, unique_users: 0, top_companies: [] });
  const [exportingApps, setExportingApps] = useState(false);

  // Export loading
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // ── AUTH CHECK ──
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('user'));
    if (!stored || !stored.is_admin) {
      navigate('/login');
      return;
    }
    setUser(stored);
  }, [navigate]);

  // ── FETCH STATS ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/ai-usage/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, []);

  // ── FETCH USER USAGE ──
  const fetchUserUsage = useCallback(async (page = 1) => {
    try {
      const params = { page, per_page: 15 };
      if (userFilter) params.feature = userFilter;
      const res = await api.get('/admin/ai-usage/users', { params });
      setUserUsage(res.data.users);
      setUserTotal(res.data.total);
      setUserPage(page);
    } catch (err) {
      console.error('User usage fetch error:', err);
    }
  }, [userFilter]);

  // ── FETCH GENERATED REPORTS ──
  const fetchReports = useCallback(async (page = 1) => {
    try {
      const res = await api.get('/admin/ai-usage/reports', { params: { page, per_page: 15 } });
      setReports(res.data.reports);
      setReportTotal(res.data.total);
      setReportPage(page);
    } catch (err) {
      console.error('Reports fetch error:', err);
    }
  }, []);

  // ── FETCH JOB APPLICATIONS ──
  const fetchJobApps = useCallback(async (page = 1, search = '') => {
    try {
      const params = { page, per_page: 20 };
      if (search) params.search = search;
      const res = await api.get('/admin/job-applications', { params });
      setJobApps(res.data.applications);
      setJobAppTotal(res.data.total);
      setJobAppPage(page);
      if (res.data.stats) setJobAppStats(res.data.stats);
    } catch (err) {
      console.error('Job applications fetch error:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUserUsage(), fetchReports(), fetchJobApps()]);
      setLoading(false);
    };
    load();
  }, [user, fetchStats, fetchUserUsage, fetchReports, fetchJobApps]);

  // ── EXPORT HANDLERS ──
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await api.get('/admin/ai-usage/export/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ResuMate_AI_Usage_Report.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('CSV export failed');
    }
    setExportingCsv(false);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await api.get('/admin/ai-usage/export/pdf', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ResuMate_AI_Usage_Report.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported');
    } catch {
      toast.error('PDF export failed');
    }
    setExportingPdf(false);
  };

  const FEATURE_ICONS = {
    resume_analyzer: '🔬', resume_compare: '⚖️', company_insights: '🏢',
    job_match_ai: '🎯', report_generation: '📄', ats_analysis: '🛡️', career_chat: '💬',
  };

  const REPORT_TYPE_LABELS = {
    resume_analysis: 'Resume Analysis', resume_comparison: 'Resume Comparison',
    job_intelligence: 'Job Intelligence', company_insight: 'Company Insight',
  };

  // ── SECTIONS ──
  const sections = [
    { id: 'overview', label: 'Usage Overview', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id: 'users', label: 'User Usage', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { id: 'reports', label: 'Generated Reports', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { id: 'applications', label: 'Job Applications', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
  ];

  if (!user) return null;

  if (loading) {
    return (
      <div className="ar-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="ar-spin" style={{ width: 48, height: 48, margin: '0 auto 16px' }} />
            <p style={{ color: '#94a3b8', fontWeight: 600 }}>Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-page">
      {/* ── Header ── */}
      <header className="ar-header">
        <div className="ar-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => navigate('/admin')} className="ar-back-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div>
              <h1 className="ar-title">AI Reports & Analytics</h1>
              <p className="ar-subtitle">Monitor AI feature usage, track performance, and export reports</p>
            </div>
          </div>
          <div className="ar-export-btns">
            <button onClick={handleExportCsv} disabled={exportingCsv} className="ar-btn ar-btn-csv">
              {exportingCsv ? <span className="ar-btn-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
              Export CSV
            </button>
            <button onClick={handleExportPdf} disabled={exportingPdf} className="ar-btn ar-btn-pdf">
              {exportingPdf ? <span className="ar-btn-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
              Export PDF
            </button>
          </div>
        </div>
        <div className="ar-header-glow" />
      </header>

      <main className="ar-main">
        {/* ── Stat Cards ── */}
        <div className="ar-stats-grid">
          {[
            { label: 'Requests Today', value: stats.total_today, color: '#6366f1', bg: 'rgba(99,102,241,.12)' },
            { label: 'Requests This Month', value: stats.total_month, color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
            { label: 'Tokens Used', value: stats.tokens_month?.toLocaleString?.() || '0', color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
            { label: 'Active Users Today', value: stats.active_users, color: '#10b981', bg: 'rgba(16,185,129,.12)' },
            { label: 'Most Used Feature', value: stats.most_used_feature?.replace(/_/g, ' ') || '—', color: '#f59e0b', bg: 'rgba(245,158,11,.12)', small: true },
            { label: 'Top User', value: stats.most_active_user?.username || '—', color: '#ec4899', bg: 'rgba(236,72,153,.12)', small: true },
          ].map((s, i) => (
            <div key={i} className="ar-stat-card">
              <div className="ar-stat-icon" style={{ background: s.bg }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
              </div>
              <div className={`ar-stat-val ${s.small ? 'ar-stat-val-sm' : ''}`} style={{ color: s.color }}>{s.value}</div>
              <div className="ar-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Section Tabs ── */}
        <div className="ar-tabs">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`ar-tab ${activeSection === s.id ? 'ar-tab-active' : ''}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeSection === 'overview' && (
          <div className="ar-card">
            <h3 className="ar-card-title">Feature Usage Breakdown</h3>
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th style={{ textAlign: 'center' }}>Today</th>
                    <th style={{ textAlign: 'center' }}>This Month</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Limits</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.feature_breakdown.map((f, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{ marginRight: 8 }}>{FEATURE_ICONS[f.feature_name] || '⚡'}</span>
                        {f.display_name}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#e2e8f0' }}>{f.requests_today}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#e2e8f0' }}>{f.requests_month}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`ar-badge ${f.is_enabled ? 'ar-badge-green' : 'ar-badge-red'}`}>
                          {f.is_enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`ar-badge ${f.limit_enabled ? 'ar-badge-amber' : 'ar-badge-gray'}`}>
                          {f.limit_enabled ? 'On' : 'Off'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USER USAGE ── */}
        {activeSection === 'users' && (
          <div className="ar-card">
            <div className="ar-card-head">
              <h3 className="ar-card-title">User AI Usage</h3>
              <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); fetchUserUsage(1); }}
                className="ar-select">
                <option value="">All Features</option>
                {stats.feature_breakdown.map(f => (
                  <option key={f.feature_name} value={f.feature_name}>{f.display_name}</option>
                ))}
              </select>
            </div>
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Feature</th>
                    <th style={{ textAlign: 'center' }}>Requests</th>
                    <th style={{ textAlign: 'center' }}>Tokens</th>
                    <th>Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {userUsage.map((u, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{u.username}</td>
                      <td>
                        <span style={{ marginRight: 6 }}>{FEATURE_ICONS[u.feature_name] || '⚡'}</span>
                        {u.feature_name.replace(/_/g, ' ')}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#60a5fa' }}>{u.request_count}</td>
                      <td style={{ textAlign: 'center', color: '#a78bfa' }}>{u.total_tokens}</td>
                      <td style={{ color: '#94a3b8', fontSize: '.8rem' }}>
                        {u.last_used ? new Date(u.last_used).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {userUsage.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No usage data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {userTotal > 15 && (
              <div className="ar-pagination">
                <button disabled={userPage <= 1} onClick={() => fetchUserUsage(userPage - 1)} className="ar-page-btn">← Prev</button>
                <span className="ar-page-info">Page {userPage} of {Math.ceil(userTotal / 15)}</span>
                <button disabled={userPage >= Math.ceil(userTotal / 15)} onClick={() => fetchUserUsage(userPage + 1)} className="ar-page-btn">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── GENERATED REPORTS ── */}
        {activeSection === 'reports' && (
          <div className="ar-card">
            <h3 className="ar-card-title">Generated Reports</h3>
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Report Type</th>
                    <th>Format</th>
                    <th>Generated Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.username}</td>
                      <td>{REPORT_TYPE_LABELS[r.report_type] || r.report_type}</td>
                      <td>
                        <span className={`ar-badge ${r.report_format === 'pdf' ? 'ar-badge-red' : 'ar-badge-blue'}`}>
                          {r.report_format?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '.8rem' }}>
                        {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No reports generated yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {reportTotal > 15 && (
              <div className="ar-pagination">
                <button disabled={reportPage <= 1} onClick={() => fetchReports(reportPage - 1)} className="ar-page-btn">← Prev</button>
                <span className="ar-page-info">Page {reportPage} of {Math.ceil(reportTotal / 15)}</span>
                <button disabled={reportPage >= Math.ceil(reportTotal / 15)} onClick={() => fetchReports(reportPage + 1)} className="ar-page-btn">Next →</button>
              </div>
            )}
          </div>
        )}
        {/* ── JOB APPLICATIONS ── */}
        {activeSection === 'applications' && (
          <div>
            {/* Application Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Total Applications', value: jobAppStats.total_applications, color: '#6366f1', bg: 'rgba(99,102,241,.12)' },
                { label: 'Applied Today', value: jobAppStats.today, color: '#10b981', bg: 'rgba(16,185,129,.12)' },
                { label: 'Unique Users', value: jobAppStats.unique_users, color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
              ].map((s, i) => (
                <div key={i} className="ar-stat-card">
                  <div className="ar-stat-icon" style={{ background: s.bg }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                  </div>
                  <div className="ar-stat-val" style={{ color: s.color }}>{s.value}</div>
                  <div className="ar-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Top Companies */}
            {jobAppStats.top_companies?.length > 0 && (
              <div className="ar-card" style={{ marginBottom: 20 }}>
                <h3 className="ar-card-title">Top Companies Applied To</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                  {jobAppStats.top_companies.map((c, i) => (
                    <div key={i} style={{
                      background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)',
                      borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '.85rem' }}>{c.company}</span>
                      <span style={{ background: '#6366f1', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 700 }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applications Table */}
            <div className="ar-card">
              <div className="ar-card-head">
                <h3 className="ar-card-title">Application Log</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search job title, company, location..."
                    value={jobAppSearch}
                    onChange={(e) => setJobAppSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchJobApps(1, jobAppSearch); }}
                    className="ar-select"
                    style={{ minWidth: 250 }}
                  />
                  <button onClick={() => fetchJobApps(1, jobAppSearch)} className="ar-btn ar-btn-csv" style={{ padding: '6px 14px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Search
                  </button>
                  <button
                    onClick={async () => {
                      setExportingApps(true);
                      try {
                        const res = await api.get('/admin/job-applications/export/csv', { responseType: 'blob' });
                        const blob = new Blob([res.data], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'ResuMate_Job_Applications.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('CSV exported');
                      } catch { toast.error('Export failed'); }
                      setExportingApps(false);
                    }}
                    disabled={exportingApps}
                    className="ar-btn ar-btn-pdf"
                    style={{ padding: '6px 14px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {exportingApps ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>
              <div className="ar-table-wrap">
                <table className="ar-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Job Title</th>
                      <th>Company</th>
                      <th>Location</th>
                      <th>Salary</th>
                      <th>Source</th>
                      <th>Applied At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobApps.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: '#e2e8f0' }}>
                          <div>{a.username}</div>
                          <div style={{ fontSize: '.7rem', color: '#64748b' }}>{a.email}</div>
                        </td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.apply_url ? (
                            <a href={a.apply_url} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'none' }}>
                              {a.job_title}
                            </a>
                          ) : a.job_title}
                        </td>
                        <td style={{ fontWeight: 600, color: '#cbd5e1' }}>{a.company}</td>
                        <td style={{ color: '#94a3b8' }}>{a.location}</td>
                        <td style={{ color: '#94a3b8', fontSize: '.8rem' }}>{a.salary_range}</td>
                        <td>
                          <span className="ar-badge ar-badge-blue" style={{ textTransform: 'capitalize' }}>{a.source}</span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                          {a.applied_at ? new Date(a.applied_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {jobApps.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No job applications tracked yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {jobAppTotal > 20 && (
                <div className="ar-pagination">
                  <button disabled={jobAppPage <= 1} onClick={() => fetchJobApps(jobAppPage - 1, jobAppSearch)} className="ar-page-btn">← Prev</button>
                  <span className="ar-page-info">Page {jobAppPage} of {Math.ceil(jobAppTotal / 20)}</span>
                  <button disabled={jobAppPage >= Math.ceil(jobAppTotal / 20)} onClick={() => fetchJobApps(jobAppPage + 1, jobAppSearch)} className="ar-page-btn">Next →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminReports;
