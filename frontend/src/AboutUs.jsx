import Layout from './components/Layout';

/* ──────────────────────────────────────────────────────────────
   ABOUT US — ResuMate Career Intelligence Platform
   ────────────────────────────────────────────────────────────── */

function AboutUs() {
  const features = [
    { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>), title: 'Build ATS-Optimized Resumes', desc: 'Create resumes that pass automated screening systems and reach real recruiters.' },
    { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>), title: 'Analyze Skill Gaps & Opportunities', desc: 'Deep AI analysis reveals your strengths, gaps, and growth potential.' },
    { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="8" height="16" rx="1"/><rect x="14" y="4" width="8" height="16" rx="1"/><line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" opacity=".5"/></svg>), title: 'Compare Resume Versions', desc: 'Side-by-side intelligent comparison to pick the strongest version for any role.' },
    { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>), title: 'Discover Relevant Job Openings', desc: 'Real-time job search powered by AI matching your profile to opportunities.' },
    { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="21" x2="9" y2="9"/><line x1="15" y1="21" x2="15" y2="9"/><line x1="3" y1="9" x2="21" y2="9"/></svg>), title: 'Research Companies Before Applying', desc: 'AI-driven company insights so you apply with knowledge and confidence.' },
    { icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>), title: 'Generate Professional Reports', desc: 'Export career intelligence reports in PDF & CSV for interviews and planning.' },
  ];

  const values = [
    { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>), label: 'Precision', desc: 'Every insight is data-driven, not guesswork.' },
    { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>), label: 'Speed', desc: 'Actionable results in seconds, not hours.' },
    { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), label: 'Privacy', desc: 'Your data stays yours. Always.' },
    { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>), label: 'Accessibility', desc: 'Built for everyone — students, freshers & pros.' },
  ];

  return (
    <Layout>
      <div className="au-page">

        {/* ── HERO ── */}
        <div className="au-hero">
          <div className="au-hero-glow" />
          <div className="au-hero-content">
            <span className="au-hero-badge">About ResuMate</span>
            <h1 className="au-hero-title">Career Intelligence Platform</h1>
            <p className="au-hero-tagline">
              AI Career Intelligence Platform
            </p>
          </div>
        </div>

        {/* ── INTRO ── */}
        <section className="au-section">
          <div className="au-intro-card">
            <p className="au-intro-text">
              ResuMate CareerOS is an AI-powered career intelligence platform designed to help individuals build stronger resumes, understand their professional strengths, and discover real job opportunities with clarity and confidence.
            </p>
            <div className="au-intro-divider" />
            <p className="au-intro-highlight">
              We believe a resume should be more than a document.&nbsp;
              <strong>It should be a strategy.</strong>
            </p>
            <p className="au-intro-text" style={{ marginTop: 16 }}>
              That's why ResuMate goes beyond traditional resume builders. Our platform combines intelligent resume creation, deep AI analysis, multi-resume comparison, real-time job discovery, and company-level insights into one seamless ecosystem.
            </p>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="au-section">
          <h2 className="au-section-title">
            <span className="au-section-icon">✦</span>
            What We Help You Do
          </h2>
          <p className="au-section-sub">Whether you're a student, fresher, or experienced professional</p>
          <div className="au-features-grid">
            {features.map((f, i) => (
              <div key={i} className="au-feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="au-feature-icon">{f.icon}</div>
                <h3 className="au-feature-title">{f.title}</h3>
                <p className="au-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MISSION ── */}
        <section className="au-section">
          <div className="au-mission-card">
            <div className="au-mission-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h2 className="au-mission-title">Our Mission</h2>
            <p className="au-mission-text">
              To turn career uncertainty into structured opportunity.
            </p>
            <p className="au-mission-sub">
              We leverage advanced AI technologies to provide actionable insights — not generic suggestions. Every feature is built to help users make informed career decisions based on data, market trends, and intelligent analysis.
            </p>
          </div>
        </section>

        {/* ── VALUES ── */}
        <section className="au-section">
          <h2 className="au-section-title">
            <span className="au-section-icon">◈</span>
            What Drives Us
          </h2>
          <div className="au-values-grid">
            {values.map((v, i) => (
              <div key={i} className="au-value-card">
                <span className="au-value-icon">{v.icon}</span>
                <h4 className="au-value-label">{v.label}</h4>
                <p className="au-value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CLOSING ── */}
        <section className="au-section">
          <div className="au-closing-card">
            <h3 className="au-closing-headline">
              ResuMate CareerOS is not just a resume tool.
            </h3>
            <p className="au-closing-sub">
              It is a <strong>complete career intelligence system.</strong>
            </p>
            <div className="au-closing-divider" />
            <p className="au-closing-vision">
              As we continue to evolve, our goal is to build a smarter future where job seekers are empowered with <em>clarity, strategy, and confidence.</em>
            </p>
          </div>
        </section>

        {/* ── CREATOR MARK ── */}
        <div className="au-creator-mark">
          <div className="au-creator-line" />
          <div className="au-creator-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              <line x1="12" y1="22" x2="12" y2="15.5" />
              <polyline points="22 8.5 12 15.5 2 8.5" />
            </svg>
            <span>Built by <strong>T11</strong></span>
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default AboutUs;
