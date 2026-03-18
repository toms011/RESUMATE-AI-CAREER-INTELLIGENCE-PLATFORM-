// frontend/src/CareerAssistant.jsx
// AI Career Assistant — focused job & industry guidance page

import { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import api from './utils/api';

/* ─── Static data for sidebar panels ──────────────────────── */
const SUGGESTED_PROMPTS = [
  "What skills should a Data Analyst learn in 2025?",
  "Trending tech jobs in India right now",
  "How to switch from BCA to Data Science?",
  "Top certifications for a Cloud Engineer",
  "Average salary of a DevOps Engineer in India",
  "Is AI engineering in high demand globally?",
  "Remote job trends in 2025",
  "Best programming languages to learn for backend development",
  "How to prepare for a product manager interview?",
  "Career roadmap after 3 years as a Software Engineer",
];

const QUICK_INSIGHTS = {
  trendingRoles: [
    "AI/ML Engineer",
    "Cloud Architect",
    "Data Scientist",
    "Cybersecurity Analyst",
    "Full-Stack Developer",
    "DevOps Engineer",
  ],
  growingIndustries: [
    "Fintech",
    "HealthTech",
    "EdTech",
    "Green Energy Tech",
    "AI & Automation",
  ],
  certifications: [
    "AWS Solutions Architect",
    "Google Cloud Professional",
    "Azure Administrator",
    "TensorFlow Developer",
    "PMP / Agile / Scrum",
  ],
};

/* ─── Simple markdown → JSX renderer ─────────────────────── */
function MarkdownLine({ text }) {
  // bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

function MarkdownResponse({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Heading lines starting with # or **
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const content = line.replace(/^#{1,3}\s+/, '');
          return (
            <p key={i} className="font-bold text-blue-700 dark:text-blue-300 text-base mt-3">
              <MarkdownLine text={content} />
            </p>
          );
        }
        // Bullet lines
        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
          const content = line.trim().replace(/^[•\-*]\s*/, '');
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="text-blue-500 mt-0.5 shrink-0">•</span>
              <span><MarkdownLine text={content} /></span>
            </div>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line.trim())) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="text-blue-500 shrink-0 font-semibold">{line.match(/^\d+/)[0]}.</span>
              <span><MarkdownLine text={line.replace(/^\d+\.\s/, '')} /></span>
            </div>
          );
        }
        // Bold-only line (acts as sub-heading)
        if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
          return (
            <p key={i} className="font-semibold text-slate-800 dark:text-slate-100 mt-2">
              <MarkdownLine text={line.trim()} />
            </p>
          );
        }
        return (
          <p key={i}>
            <MarkdownLine text={line} />
          </p>
        );
      })}
    </div>
  );
}

/* ─── Message bubble ──────────────────────────────────────── */
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isBlocked = msg.blocked;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold mr-2 mt-1 shrink-0">
          AI
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : isBlocked
            ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <MarkdownResponse text={msg.content} />
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold ml-2 mt-1 shrink-0">
          U
        </div>
      )}
    </div>
  );
}

/* ─── Typing indicator ────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold mr-2 mt-1 shrink-0">
        AI
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 h-4">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function CareerAssistant() {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [history, setHistory]     = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount + load history
  useEffect(() => {
    inputRef.current?.focus();
    fetchHistory();
  }, []);

  /* ── History helpers ──────────────────────────────────── */
  const fetchHistory = async () => {
    try {
      const res = await api.get('/career-assistant/history');
      setHistory(res.data.history || []);
    } catch { /* ignore */ }
  };

  const loadFromHistory = async (item) => {
    try {
      const res = await api.get(`/career-assistant/history/${item.id}`);
      const data = res.data;
      setMessages([
        { role: 'user', content: data.query },
        { role: 'assistant', content: data.response, blocked: false },
      ]);
    } catch {
      setMessages([
        { role: 'user', content: item.query },
        { role: 'assistant', content: item.response, blocked: false },
      ]);
    }
    setHistoryOpen(false);
  };

  const deleteFromHistory = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/career-assistant/history/${id}`);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch { /* ignore */ }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async (queryText) => {
    const query = (queryText || input).trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/career-assistant', { query });
      const data = res.data;

      const aiMsg = {
        role: 'assistant',
        content: data.response || data.message || 'Sorry, I could not generate a response.',
        blocked: data.blocked || false,
      };
      setMessages(prev => [...prev, aiMsg]);
      fetchHistory();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Network error. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${errMsg}`, blocked: false }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Layout>
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
            ◎
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">AI Career Assistant</h1>
            <p className="text-slate-500 text-sm">Powered by Google Gemini</p>
          </div>

          {/* History button */}
          <button onClick={() => setHistoryOpen(true)} className="rh-btn ml-3" title="Recent Chats">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Recent Chats</span>
            {history.length > 0 && <span className="rh-badge">{history.length}</span>}
          </button>
        </div>

        {/* Disclaimer banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-blue-700 text-xs flex items-start gap-2">
          <span className="mt-0.5">ⓘ</span>
          <span>
            <strong>Note:</strong> This AI assistant provides career and industry guidance only.
            Always verify job information and salary data from official sources such as LinkedIn, Glassdoor, or official company portals.
          </span>
        </div>
      </div>

      {/* ── 3-Column Layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_220px] gap-5 h-[calc(100vh-260px)] min-h-[500px]">

        {/* LEFT — Suggested Prompts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            ※ Suggested Questions
          </h3>
          <div className="space-y-2">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="w-full text-left text-xs text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl px-3 py-2.5 transition-all leading-snug disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — Chat Interface */}
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 select-none">
                <div className="text-6xl mb-4">◎</div>
                <p className="text-lg font-semibold text-slate-500 mb-1">
                  Your AI Career Assistant is ready
                </p>
                <p className="text-sm max-w-xs">
                  Ask about job trends, career switches, skill gaps, salaries, certifications, and more.
                </p>
              </div>
            )}

            {messages.length > 0 && (
              <div className="flex justify-center mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  AI-generated content — please review carefully before use.
                </span>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/60 rounded-b-2xl">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about careers, job trends, skills, salaries… (Enter to send)"
                disabled={loading}
                className="flex-1 resize-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-1 self-end"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <>Send <span>↑</span></>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              This assistant is restricted to career & industry topics only.
            </p>
          </div>
        </div>

        {/* RIGHT — Quick Insights */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto shadow-sm space-y-5">
          {/* Trending Roles */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              ★ Trending Roles
            </h3>
            <div className="space-y-1.5">
              {QUICK_INSIGHTS.trendingRoles.map((role, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {i + 1}
                  </span>
                  {role}
                </div>
              ))}
            </div>
          </div>

          {/* Growing Industries */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              ↗ Growing Industries
            </h3>
            <div className="space-y-1.5">
              {QUICK_INSIGHTS.growingIndustries.map((ind, i) => (
                <div key={i} className="text-xs bg-green-50 border border-green-100 text-green-700 rounded-lg px-2.5 py-1.5 font-medium">
                  {ind}
                </div>
              ))}
            </div>
          </div>

          {/* Top Certifications */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              △ Top Certifications
            </h3>
            <div className="space-y-1.5">
              {QUICK_INSIGHTS.certifications.map((cert, i) => (
                <div key={i} className="text-xs bg-purple-50 border border-purple-100 text-purple-700 rounded-lg px-2.5 py-1.5 font-medium">
                  {cert}
                </div>
              ))}
            </div>
          </div>

          {/* AI Skill Tip */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-700 mb-1">※ AI Skill Match Tip</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your resume skills are analyzed to generate personalized career path suggestions. Ask the assistant to review your profile!
            </p>
          </div>
        </div>

      </div>

      {/* ── Recent History Sidebar ─────────────────────────── */}
      {historyOpen && (
        <div className="rh-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="rh-panel" onClick={(e) => e.stopPropagation()}>
            <div className="rh-header">
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Recent Chats</h2>
                <p style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 2 }}>{history.length} conversations</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="rh-close">{'\u2715'}</button>
            </div>
            <div className="rh-list">
              {history.length === 0 ? (
                <div className="rh-empty">
                  <p style={{ fontSize: '2rem', marginBottom: 8 }}>💬</p>
                  <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>No chat history yet</p>
                </div>
              ) : history.map(h => (
                <div key={h.id} className="rh-item" onClick={() => loadFromHistory(h)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '.82rem', fontWeight: 600, color: '#334155', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.query}
                      </p>
                      <p style={{ fontSize: '.72rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.response || ''}
                      </p>
                      <p style={{ fontSize: '.65rem', color: '#cbd5e1', marginTop: 4 }}>
                        {formatDate(h.created_at)}
                      </p>
                    </div>
                    <button onClick={(e) => deleteFromHistory(h.id, e)} className="rh-delete" title="Remove">
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
