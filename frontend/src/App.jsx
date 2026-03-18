import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './utils/api';
import Register from './Register';
import toast from 'react-hot-toast';
import Login from './Login';
import EditResume from './EditResume';
import AdminDashboard from './AdminDashboard';
import AdminReports from './AdminReports';
import Layout from './components/Layout';
import ResumeBuilder from './components/ResumeBuilder';
import ResumeLanding from './ResumeLanding';
import TrashResumes from './TrashResumes';
import MyResumes from './MyResumes';
import ATSAnalysis from './ATSAnalysis';
import TemplateManager from './components/admin/TemplateManager';
import EditorPage from './editor/EditorPage';
import DesignStudio from './DesignStudio';
import CareerAssistant from './CareerAssistant';
import ResumeAnalyzer from './ResumeAnalyzer';
import ResumeCompare from './ResumeCompare';
import JobFinder from './JobFinder';
import AboutUs from './AboutUs';
import CertificateLayoutList from './pages/admin/certificates/CertificateLayoutList';
import CertificateDesigner from './pages/admin/certificates/CertificateDesigner';
import ResumeDesigner from './pages/resume/ResumeDesigner';
import LoadingSpinner from './components/LoadingSpinner';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      const foundUser = JSON.parse(loggedInUser);
      if (foundUser.is_admin) {
        navigate('/admin');
        return;
      }
      setUser(foundUser);
      fetchStats();
    } else {
      navigate('/login');
    }
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/resumes');
      setResumes(response.data.resumes);
      setTimeout(() => setStatsLoaded(true), 200);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleCreateResume = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/add_resume', {
        title: newTitle
      });
      toast.success("Resume Created!");
      setNewTitle('');
      navigate('/resume-start');
    } catch (error) {
      toast.error("Error creating resume");
    }
  };

  // Compute greeting based on time of day
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (!user) return <LoadingSpinner message="Loading dashboard..." sub="Fetching your data" />;

  const quickLinks = [
    { label: 'My Resumes', desc: 'View & manage all resumes', path: '/my-resumes', color: '#3b82f6', bg: '#eff6ff', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    )},
    { label: 'Design Studio', desc: 'Templates & visual editor', path: '/design-studio', color: '#8b5cf6', bg: '#f5f3ff', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
    )},
    { label: 'Career Assistant', desc: 'AI career guidance & tips', path: '/career-assistant', color: '#06b6d4', bg: '#ecfeff', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    )},
    { label: 'Resume Analyzer', desc: 'Deep AI career intelligence', path: '/resume-analyzer', color: '#8b5cf6', bg: '#f5f3ff', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    )},
    { label: 'Trash', desc: 'Recover deleted resumes', path: '/trash', color: '#ef4444', bg: '#fef2f2', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
    )},
  ];

  return (
    <Layout>

      {/* ═══════ HERO BANNER ═══════ */}
      <div className="db-hero db-enter db-d1 mb-8">
        {/* Orbs */}
        <div className="db-hero-orb db-hero-orb-1" />
        <div className="db-hero-orb db-hero-orb-2" />
        <div className="db-hero-orb db-hero-orb-3" />
        <div className="db-hero-grid" />

        {/* Particles */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="db-particle" style={{
            width: 4 + i * 1.5 + 'px', height: 4 + i * 1.5 + 'px',
            left: 15 + i * 18 + '%', bottom: '10%',
            background: ['#818cf8','#67e8f9','#c084fc','#60a5fa','#a78bfa'][i],
            animationDelay: i * -1.2 + 's', animationDuration: 5 + i + 's',
          }} />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <p className="text-indigo-300 text-sm font-semibold uppercase tracking-widest mb-1">{getGreeting()}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">{user.username}</h1>
            <p className="text-slate-400 text-base max-w-lg">
              Ready to land your dream job? Build and optimize your resume with AI-powered tools.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            {user.is_admin && (
              <button onClick={() => navigate('/admin')}
                className="bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5">
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Admin Panel
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ STAT CARDS ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="db-stat db-enter db-d2" style={{'--stat-accent': 'linear-gradient(90deg, #6366f1, #818cf8)'}}>
          <div className="db-stat-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className={`db-stat-value ${statsLoaded ? 'db-count-up' : ''}`}>{resumes.length}</div>
          <div className="db-stat-label">Total Resumes</div>
        </div>

        <div className="db-stat db-enter db-d3" style={{'--stat-accent': 'linear-gradient(90deg, #10b981, #34d399)'}}>
          <div className="db-stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          </div>
          <div className={`db-stat-value ${statsLoaded ? 'db-count-up' : ''}`}>{resumes.filter(r => r.template).length}</div>
          <div className="db-stat-label">With Template</div>
        </div>

        <div className="db-stat db-enter db-d4" style={{'--stat-accent': 'linear-gradient(90deg, #f59e0b, #fbbf24)'}}>
          <div className="db-stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className={`db-stat-value ${statsLoaded ? 'db-count-up' : ''}`}>{resumes.length > 0 ? new Date(resumes[resumes.length - 1]?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}</div>
          <div className="db-stat-label">Last Created</div>
        </div>

        <div className="db-stat db-enter db-d5" style={{'--stat-accent': 'linear-gradient(90deg, #8b5cf6, #a78bfa)'}}>
          <div className="db-stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div className={`db-stat-value ${statsLoaded ? 'db-count-up' : ''}`}>AI</div>
          <div className="db-stat-label">Powered</div>
        </div>
      </div>

      {/* ═══════ MAIN GRID ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* CREATE RESUME */}
        <div className="db-action-card db-enter db-d5 flex flex-col justify-between">
          <div className="db-card-glow" style={{ background: 'rgba(99,102,241,.08)', top: '-20%', right: '-10%' }} />

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Create New Resume</h2>
                <p className="text-slate-400 text-sm">Start from scratch with our AI-powered builder</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateResume} className="space-y-4">
            <div className="lg-input-wrap">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.66V20a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h5.34"/><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/></svg>
                </span>
                <input type="text" placeholder="e.g. Senior Product Designer" value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)} required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-slate-800 placeholder-slate-400 font-medium" />
              </div>
            </div>
            <button type="submit" className="db-btn-primary w-full py-3.5 px-4 text-base">
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Resume
              </span>
            </button>
          </form>
        </div>

        {/* ATS ANALYSIS */}
        <div className="db-action-card db-enter db-d6 flex flex-col justify-between">
          <div className="db-card-glow" style={{ background: 'rgba(139,92,246,.08)', bottom: '-20%', left: '-10%' }} />

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">ATS Score Analyzer</h2>
                <p className="text-slate-400 text-sm">Check if your resume passes Applicant Tracking Systems</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Get an instant ATS compatibility score and actionable feedback to improve your resume's chances.
            </p>
          </div>

          <button onClick={() => navigate('/ats-analysis')}
            className="db-btn-secondary w-full py-3.5 px-4 text-base">
            <span className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Analyze with AI
            </span>
          </button>
        </div>
      </div>

      {/* ═══════ QUICK LINKS ═══════ */}
      <div className="db-enter db-d7 mb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((link, i) => (
            <div key={link.path} className="db-quick-link" onClick={() => navigate(link.path)}>
              <div className="db-quick-link-icon" style={{ background: link.bg, color: link.color }}>
                {link.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-700 text-sm">{link.label}</div>
                <div className="text-xs text-slate-400 truncate">{link.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      </div>

    </Layout>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-resumes" element={<MyResumes />} />
        <Route path="/design-studio" element={<DesignStudio />} />
        <Route path="/ats-analysis" element={<ATSAnalysis />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/templates" element={<TemplateManager />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/edit-resume/:id" element={<EditResume />} />
        <Route path="/resume-start" element={<ResumeLanding />} />
        <Route path="/build-resume/:id" element={<ResumeBuilder />} />
        <Route path="/resume/:id/editor" element={<EditorPage />} />
        <Route path="/trash" element={<TrashResumes />} />
        <Route path="/career-assistant" element={<CareerAssistant />} />
        <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
        <Route path="/resume-compare" element={<ResumeCompare />} />
        <Route path="/jobs" element={<JobFinder />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/admin/certificates" element={<CertificateLayoutList />} />
        <Route path="/admin/certificates/new" element={<CertificateDesigner />} />
        <Route path="/admin/certificates/edit/:id" element={<CertificateDesigner />} />
        <Route path="/resume/:id/designer" element={<ResumeDesigner />} />
      </Routes>
    </Router>
  );
}

export default App;