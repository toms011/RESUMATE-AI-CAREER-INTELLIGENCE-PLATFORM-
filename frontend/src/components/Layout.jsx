// frontend/src/components/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Safe check in case user is null
  const user = JSON.parse(localStorage.getItem('user')) || { username: 'Guest', email: '' };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '▦' },
    { name: 'My Resumes', path: '/my-resumes', icon: '▤' },
    { name: 'Layout & Design', path: '/design-studio', icon: '◆' },
    { name: 'ATS Analysis', path: '/ats-analysis', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v6c0 5.25 3.75 10.13 9 11.25C17.25 23.13 21 18.25 21 13V7l-9-5z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    )},
    { name: 'Resume Analyzer', path: '/resume-analyzer', icon: '⬡' },
    { name: 'Resume Compare', path: '/resume-compare', icon: '⬢' },
    { name: 'Job Finder', path: '/jobs', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="13" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="12.01" strokeWidth="3" strokeLinecap="round" />
        <line x1="2" y1="13" x2="22" y2="13" strokeWidth="1.5" />
      </svg>
    )},
    { name: 'Career Assistant', path: '/career-assistant', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="12 2 14.5 9.5 22 9.5 16 14 18.5 22 12 17 5.5 22 8 14 2 9.5 9.5 9.5" strokeWidth="1.5" />
      </svg>
    )},
    { name: 'Trash', path: '/trash', icon: '⊘' },
    { name: 'About Us', path: '/about', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )},
  ];

  // If user is Admin, add Admin links
  if (user && user.is_admin) {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: '⛊' });
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">

      {/* --- SIDEBAR --- */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl">
        <div className="p-4 flex items-center gap-3">
          <img src="/logo.svg" alt="ResuMate AI" className="h-10 w-10" />
          <div>
            <div className="text-lg font-bold tracking-wider text-white">ResuMate</div>
            <div className="text-xs text-slate-400">Design. Analyze. Discover.</div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${location.pathname === item.path
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
            >
              <span className="mr-3 text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile Snippet */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-lg shadow-lg">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-white truncate">{user.username}</div>
              <div className="text-slate-500 text-xs truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>→</span> Sign Out
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex justify-between items-center px-8 shadow-sm z-10">
          <h2 className="text-xl font-semibold text-slate-800">
            {menuItems.find(m => m.path === location.pathname)?.name || 'Editor'}
          </h2>
          <div className="flex gap-4">
            {/* You can add notification bells or search bars here later */}
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}

export default Layout;