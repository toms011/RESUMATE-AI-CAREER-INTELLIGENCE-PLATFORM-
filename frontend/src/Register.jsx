import { useState, useEffect } from 'react';
import api from './utils/api';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/register', formData);
      toast.success("Registration Successful! Please Login.");
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden">
      
      {/* ═══════ LEFT PANEL – Animated Hero ═══════ */}
      <div className="lg-auth-left lg-hero">
        
        {/* Floating Orbs */}
        <div className="lg-orb lg-orb-1" />
        <div className="lg-orb lg-orb-2" />
        <div className="lg-orb lg-orb-3" />
        <div className="lg-orb lg-orb-4" />
        <div className="lg-orb lg-orb-5" />

        {/* Grid Overlay */}
        <div className="lg-grid" />

        {/* Accent Lines */}
        <div className="lg-accent-line" style={{ top: '22%', background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)', animationDelay: '0s' }} />
        <div className="lg-accent-line" style={{ top: '50%', background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)', animationDelay: '-2s' }} />
        <div className="lg-accent-line" style={{ top: '78%', background: 'linear-gradient(90deg, transparent, #6366f1, transparent)', animationDelay: '-4s' }} />

        {/* Content */}
        <div className="relative z-10 text-center px-10 flex flex-col items-center">
          
          {/* Animated Logo */}
          <div className="lg-slide-up lg-delay-1 mb-8">
            <div className="lg-logo-wrap">
              <div className="lg-logo-glow" />
              <div className="lg-logo-ring" />
              <div className="lg-logo-ring-inner" />
              <img src="/logo.svg" alt="ResuMate AI" className="h-20 w-20 relative z-10" />
            </div>
          </div>

          {/* Title */}
          <h1 className="lg-slide-up lg-delay-2 text-5xl font-bold text-white mb-3 tracking-tight">
            Join ResuMate
          </h1>
          
          {/* Subtitle */}
          <p className="lg-slide-up lg-delay-3 text-purple-200/80 text-lg max-w-sm mx-auto leading-relaxed mb-10">
            Design your resume. Analyze your strengths. Discover your future.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <div className="lg-badge" style={{ animationDelay: '.6s' }}>
              <span className="lg-badge-icon" style={{ background: 'rgba(139,92,246,.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              Free Account, No Card Required
            </div>
            <div className="lg-badge" style={{ animationDelay: '.8s' }}>
              <span className="lg-badge-icon" style={{ background: 'rgba(6,182,212,.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
                </svg>
              </span>
              Resume Analyzer & Side-by-Side Compare
            </div>
            <div className="lg-badge" style={{ animationDelay: '1s' }}>
              <span className="lg-badge-icon" style={{ background: 'rgba(99,102,241,.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>
                </svg>
              </span>
              AI Job Finder & Company Insights
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ RIGHT PANEL – Animated Form ═══════ */}
      <div className="lg-auth-right">
        
        {/* Subtle floating dots */}
        <div className="lg-particles">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="lg-dot"
              style={{
                width: 4 + (i % 3) * 2 + 'px',
                height: 4 + (i % 3) * 2 + 'px',
                left: 15 + i * 14 + '%',
                bottom: 5 + (i * 7) % 30 + '%',
                background: ['#8b5cf6','#6366f1','#06b6d4','#3b82f6','#8b5cf6','#6366f1'][i],
                animationDelay: i * -1 + 's',
                animationDuration: 5 + i * .8 + 's',
              }}
            />
          ))}
        </div>

        {/* Form Card */}
        <div className="max-w-md w-full lg-form-card">
          
          {/* Mobile Logo */}
          <div className="lg-mobile-logo lg-slide-up lg-delay-1">
            <div className="lg-logo-wrap">
              <div className="lg-logo-glow" />
              <div className="lg-logo-ring" />
              <img src="/logo.svg" alt="ResuMate AI" className="h-14 w-14 relative z-10" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="lg-slide-up lg-delay-2 text-3xl font-bold text-slate-900">
              Create Account
            </h2>
            <p className="lg-slide-up lg-delay-3 text-slate-500 mt-2">
              Sign up for free and start building
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username Input */}
            <div className="lg-slide-up lg-delay-3">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <div className="lg-input-wrap">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    name="username" 
                    onChange={handleChange} 
                    required 
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-slate-800 placeholder-slate-400"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div className="lg-slide-up lg-delay-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <div className="lg-input-wrap">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="3"/><path d="M22 7l-10 6L2 7"/>
                    </svg>
                  </span>
                  <input 
                    type="email" 
                    name="email" 
                    onChange={handleChange} 
                    required 
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-slate-800 placeholder-slate-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="lg-slide-up lg-delay-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="lg-input-wrap">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="password" 
                    onChange={handleChange} 
                    required 
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-slate-800 placeholder-slate-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 focus:outline-none transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.97 9.97 0 015.196 1.453M15 12a3 3 0 11-4.773-2.427M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg-slide-up lg-delay-6">
              <button 
                type="submit" 
                disabled={loading}
                className={`lg-btn w-full py-3.5 px-4 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{animation:'lsRingSpin .7s linear infinite'}} />
                    Creating Account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Get Started
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="lg-slide-up lg-delay-6 flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Footer Link */}
          <div className="lg-slide-up lg-delay-7 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-bold hover:underline transition-colors">
                Log In
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Register;