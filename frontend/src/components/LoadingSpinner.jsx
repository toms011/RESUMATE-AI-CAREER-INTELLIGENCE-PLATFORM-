/**
 * LoadingSpinner — Eye-catching multi-layered animated loader.
 *
 * Props
 * ──────
 *  message   : string   — Main text (default "Loading…")
 *  sub       : string   — Subtitle / hint text (optional)
 *  fullPage  : boolean  — true → centers in a 100 vh overlay (default true)
 *  size      : 'sm' | 'md' | 'lg' — spinner diameter (default 'md')
 *  variant   : 'default' | 'dark' — colour theme (default 'default')
 */

export default function LoadingSpinner({
  message = 'Loading\u2026',
  sub = '',
  fullPage = true,
  size = 'md',
  variant = 'default',
}) {
  const dark = variant === 'dark';
  const dims = { sm: 80, md: 120, lg: 160 };
  const d = dims[size] || dims.md;

  const wrapper = fullPage ? 'ls-overlay' : 'ls-inline';

  return (
    <div className={`${wrapper}${dark ? ' ls-dark' : ''}`}>
      {/* floating background blobs */}
      {fullPage && (
        <div className="ls-blobs">
          <div className="ls-blob ls-blob-1" />
          <div className="ls-blob ls-blob-2" />
          <div className="ls-blob ls-blob-3" />
        </div>
      )}

      <div className="ls-card">
        {/* main spinner assembly */}
        <div className="ls-spinner" style={{ width: d, height: d }}>
          {/* outer rotating ring with gradient */}
          <svg className="ls-orbit ls-orbit-outer" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="lsGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="lsGrad1d" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="none" stroke={dark ? 'url(#lsGrad1d)' : 'url(#lsGrad1)'} strokeWidth="3" strokeLinecap="round" strokeDasharray="180 97" />
          </svg>

          {/* inner counter-rotating ring */}
          <svg className="ls-orbit ls-orbit-inner" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="lsGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity=".8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="lsGrad2d" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0" />
                <stop offset="60%" stopColor="#67e8f9" stopOpacity=".8" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="34" fill="none" stroke={dark ? 'url(#lsGrad2d)' : 'url(#lsGrad2)'} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="120 94" />
          </svg>

          {/* orbiting glowing dots */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <span key={i} className="ls-particle" style={{ '--i': i, '--count': 8 }} />
          ))}

          {/* center icon */}
          <div className="ls-icon-wrap">
            <svg className="ls-icon" viewBox="0 0 40 40" fill="none" width={d * 0.36} height={d * 0.36}>
              <rect x="6" y="5" width="28" height="30" rx="4" stroke="currentColor" strokeWidth="2" />
              <line className="ls-line-1" x1="11" y1="13" x2="29" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line className="ls-line-2" x1="11" y1="19" x2="25" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line className="ls-line-3" x1="11" y1="25" x2="21" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line className="ls-line-4" x1="11" y1="31" x2="17" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* text with gradient shimmer */}
        {message && <p className="ls-msg"><span>{message}</span></p>}
        {sub && <p className="ls-sub">{sub}</p>}

        {/* animated progress bar */}
        <div className="ls-progress">
          <div className="ls-progress-bar" />
        </div>
      </div>
    </div>
  );
}
