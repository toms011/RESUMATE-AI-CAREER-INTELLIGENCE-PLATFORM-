import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './components/LoadingSpinner';

import TemplateManager from './components/admin/TemplateManager';

function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalResumes: 0, bannedCount: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [banModal, setBanModal] = useState(false);
  const [banDuration, setBanDuration] = useState('1day');
  const [banReason, setBanReason] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [testLoading, setTestLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // API Key management state
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeyStats, setApiKeyStats] = useState({});
  const [apiKeyLogs, setApiKeyLogs] = useState([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState({ api_key: '', label: '', provider: 'gemini', priority: 10, adzuna_app_id: '', adzuna_app_key: '' });
  const [selectedKeyLogs, setSelectedKeyLogs] = useState(null);

  // Adzuna pair management (exclusive toggle)
  const [adzunaPairs, setAdzunaPairs] = useState([]);
  const [adzunaPairsLoading, setAdzunaPairsLoading] = useState(false);
  const [adzunaToggling, setAdzunaToggling] = useState(null); // id_key_id being toggled

  // AI Feature Controls state
  const [aiFeatures, setAiFeatures] = useState([]);
  const [aiControlsLoading, setAiControlsLoading] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    const foundUser = JSON.parse(loggedInUser);
    if (!foundUser.is_admin) {
      toast.error('You do not have admin access');
      navigate('/dashboard');
      return;
    }

    setUser(foundUser);
    fetchAllUsers();
  }, [navigate]);

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
      const bannedCount = response.data.users.filter(u => u.is_banned).length;
      setStats({
        totalUsers: response.data.users.length,
        bannedCount: bannedCount,
        totalResumes: response.data.total_resumes || 0
      });
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      await api.post(`/admin/users/${selectedUser.id}/ban`, {
        duration: banDuration,
        reason: banReason || 'No reason provided'
      });
      toast.success(`User "${selectedUser.username}" has been banned!`);
      closeBanModal();
      fetchAllUsers();
    } catch (error) {
      toast.error('Error banning user');
    }
  };

  const handleUnbanUser = async (userId, username) => {
    if (window.confirm(`Unban "${username}"?`)) {
      try {
        await api.post(`/admin/users/${userId}/unban`);
        toast.success('User unbanned successfully');
        fetchAllUsers();
      } catch (error) {
        toast.error('Error unbanning user');
      }
    }
  };

  const handleClearAICache = async () => {
    if (window.confirm('Clear all AI cache? This will reset AI memory.')) {
      try {
        await api.post('/admin/clear-cache');
        toast.success('AI cache cleared successfully');
      } catch (error) {
        toast.error('Error clearing cache');
      }
    }
  };

  // ── AI Feature Controls Functions ──
  const fetchAiFeatures = async () => {
    setAiControlsLoading(true);
    try {
      const res = await api.get('/admin/ai-features');
      setAiFeatures(res.data.features || []);
    } catch (err) {
      console.error('Error fetching AI features:', err);
    } finally {
      setAiControlsLoading(false);
    }
  };

  const handleFeatureToggle = (id, field) => {
    setAiFeatures(prev => prev.map(f => f.id === id ? { ...f, [field]: !f[field] } : f));
  };

  const handleFeatureInput = (id, field, value) => {
    setAiFeatures(prev => prev.map(f => f.id === id ? { ...f, [field]: parseInt(value) || 0 } : f));
  };

  const handleSaveFeatures = async () => {
    setSavingFeatures(true);
    try {
      await api.put('/admin/ai-features/bulk', { features: aiFeatures });
      toast.success('AI feature settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSavingFeatures(false);
    }
  };

  // ── API Key Management Functions ──
  const fetchApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const res = await api.get('/admin/api-keys');
      setApiKeys(res.data.keys || []);
      setApiKeyStats(res.data.stats || {});
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const fetchApiKeyLogs = async (keyId = null) => {
    try {
      const url = keyId ? `/admin/api-keys/logs?key_id=${keyId}&limit=50` : '/admin/api-keys/logs?limit=50';
      const res = await api.get(url);
      setApiKeyLogs(res.data.logs || []);
      setSelectedKeyLogs(keyId);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // ─── Adzuna Pair Management ───────────────────────────
  const fetchAdzunaPairs = async () => {
    setAdzunaPairsLoading(true);
    try {
      const res = await api.get('/admin/adzuna-pairs');
      setAdzunaPairs(res.data.pairs || []);
    } catch (err) {
      console.error('Error fetching Adzuna pairs:', err);
    } finally {
      setAdzunaPairsLoading(false);
    }
  };

  const handleAdzunaToggle = async (idKeyId, currentlyOn) => {
    setAdzunaToggling(idKeyId);
    try {
      if (currentlyOn) {
        // Turn OFF this pair
        await api.put(`/admin/adzuna-pairs/${idKeyId}/deactivate`);
        toast.success('Adzuna connection turned OFF');
      } else {
        // Turn ON this pair (auto turns off all others)
        await api.put(`/admin/adzuna-pairs/${idKeyId}/activate`);
        toast.success('Adzuna connection established with this key');
      }
      fetchAdzunaPairs();
      fetchApiKeys(); // refresh main key list too
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error toggling Adzuna pair');
    } finally {
      setAdzunaToggling(null);
    }
  };

  const handleAddKey = async () => {
    // Adzuna requires both App ID and App Key — adds two entries
    if (newKey.provider === 'adzuna') {
      if (!newKey.adzuna_app_id.trim() || !newKey.adzuna_app_key.trim()) {
        toast.error('Both Adzuna App ID and App Key are required');
        return;
      }
      try {
        await api.post('/admin/api-keys', {
          api_key: newKey.adzuna_app_id.trim(),
          label: newKey.label ? `${newKey.label} - App ID` : 'Adzuna App ID',
          provider: 'adzuna_id',
          priority: parseInt(newKey.priority) || 1,
        });
        await api.post('/admin/api-keys', {
          api_key: newKey.adzuna_app_key.trim(),
          label: newKey.label ? `${newKey.label} - App Key` : 'Adzuna App Key',
          provider: 'adzuna_key',
          priority: parseInt(newKey.priority) || 1,
        });
        toast.success('Adzuna credentials added successfully');
        setNewKey({ api_key: '', label: '', provider: 'gemini', priority: 10, adzuna_app_id: '', adzuna_app_key: '' });
        setShowAddKey(false);
        fetchApiKeys();
        fetchAdzunaPairs();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error adding Adzuna keys');
      }
      return;
    }
    if (!newKey.api_key.trim()) { toast.error('API key is required'); return; }
    try {
      await api.post('/admin/api-keys', newKey);
      toast.success('API key added successfully');
      setNewKey({ api_key: '', label: '', provider: 'gemini', priority: 10, adzuna_app_id: '', adzuna_app_key: '' });
      setShowAddKey(false);
      fetchApiKeys();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding key');
    }
  };

  const handleToggleKey = async (keyId, currentStatus) => {
    try {
      const endpoint = currentStatus === 'active' ? 'deactivate' : 'activate';
      await api.put(`/admin/api-keys/${keyId}/${endpoint}`);
      toast.success(`Key ${endpoint}d successfully`);
      fetchApiKeys();
    } catch (err) {
      toast.error('Error toggling key');
    }
  };

  const handleSetPrimary = async (keyId) => {
    try {
      await api.put(`/admin/api-keys/${keyId}/set-primary`);
      toast.success('Key set as primary');
      fetchApiKeys();
    } catch (err) {
      toast.error('Error setting primary key');
    }
  };

  const handleDeleteKey = async (keyId, label) => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/api-keys/${keyId}`);
      toast.success('Key deleted');
      fetchApiKeys();
    } catch (err) {
      toast.error('Error deleting key');
    }
  };

  const handleResetExhausted = async () => {
    try {
      const res = await api.post('/admin/api-keys/reset-exhausted');
      toast.success(res.data.message);
      fetchApiKeys();
    } catch (err) {
      toast.error('Error resetting keys');
    }
  };

  // Load API keys when switching to apikeys tab
  useEffect(() => {
    if (activeTab === 'apikeys') {
      fetchApiKeys();
      fetchApiKeyLogs();
      fetchAdzunaPairs();
    }
    if (activeTab === 'ai') {
      fetchAiFeatures();
    }
  }, [activeTab]);

  const [reportLoading, setReportLoading] = useState(false);

  const handleDownloadReport = async (type = 'full') => {
    setReportLoading(true);
    try {
      const response = await api.get(`/admin/report?type=${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ResuMate_Report_${type}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Error downloading report');
      console.error('Report download error:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const openBanModal = (userToBan) => {
    setSelectedUser(userToBan);
    setBanModal(true);
  };

  const closeBanModal = () => {
    setBanModal(false);
    setSelectedUser(null);
    setBanReason('');
    setBanDuration('1day');
  };

  const runTests = async () => {
    setTestLoading(true);
    setTestResults([]);
    const results = [];

    try {
      await api.get('/admin/users', { timeout: 5000 });
      results.push({ name: 'Backend Connectivity', status: 'PASS', icon: '✓', message: 'Connected to backend successfully' });
    } catch (error) {
      results.push({ name: 'Backend Connectivity', status: 'FAIL', icon: '✕', message: error.message });
    }

    try {
      const loggedUser = localStorage.getItem('user');
      if (loggedUser && JSON.parse(loggedUser).is_admin) {
        results.push({ name: 'Admin Authentication', status: 'PASS', icon: '✓', message: 'You are authenticated as admin' });
      } else {
        results.push({ name: 'Admin Authentication', status: 'FAIL', icon: '✕', message: 'Not authenticated as admin' });
      }
    } catch (error) {
      results.push({ name: 'Admin Authentication', status: 'FAIL', icon: '✕', message: error.message });
    }

    try {
      const testUser = users.find(u => !u.is_admin && u.id !== user.id);
      if (testUser) {
        await api.post(`/admin/users/${testUser.id}/ban`, { duration: '1hour', reason: 'System test' });
        await api.post(`/admin/users/${testUser.id}/unban`);
        results.push({ name: 'Ban/Unban System', status: 'PASS', icon: '✓', message: 'Ban and unban operations working' });
      } else {
        results.push({ name: 'Ban/Unban System', status: 'SKIP', icon: '⚠', message: 'No test user available' });
      }
    } catch (error) {
      results.push({ name: 'Ban/Unban System', status: 'FAIL', icon: '✕', message: error.message });
    }

    try {
      await api.post('/admin/clear-cache');
      results.push({ name: 'Cache System', status: 'PASS', icon: '✓', message: 'Cache operations working' });
    } catch (error) {
      results.push({ name: 'Cache System', status: 'FAIL', icon: '✕', message: error.message });
    }

    try {
      const response = await api.get('/admin/users');
      results.push({ name: 'User Management', status: 'PASS', icon: '✓', message: `${response.data.users.length} users found` });
    } catch (error) {
      results.push({ name: 'User Management', status: 'FAIL', icon: '✕', message: error.message });
    }

    setTestResults(results);
    setTestLoading(false);
  };

  const getUserStatus = (u) => {
    if (u.is_admin) return { badge: '★ Admin', color: 'bg-amber-100 text-amber-800' };
    if (u.is_banned) {
      if (u.banned_until) {
        return { badge: `⊘ Banned until ${new Date(u.banned_until).toLocaleDateString()}`, color: 'bg-red-100 text-red-800' };
      } else {
        return { badge: '⊘ Permanent Ban', color: 'bg-red-100 text-red-800' };
      }
    }
    return { badge: '✓ Active', color: 'bg-green-100 text-green-800' };
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="ad-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 16px', border: '3px solid rgba(99,102,241,.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'adOrbit 1s linear infinite' }} />
          <p style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 600 }}>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const tabConfig = [
    { id: 'overview', label: 'Overview', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id: 'users', label: 'Users', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
    { id: 'templates', label: 'Templates', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> },
    { id: 'ai', label: 'AI Engine', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4v1a1 1 0 001 1h1a4 4 0 010 8h-1a1 1 0 00-1 1v1a4 4 0 01-8 0v-1a1 1 0 00-1-1H6a4 4 0 010-8h1a1 1 0 001-1V6a4 4 0 014-4z"/></svg> },
    { id: 'apikeys', label: 'API Keys', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
    { id: 'reports', label: 'Reports', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { id: 'test', label: 'Diagnostics', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  ];

  const statCards = [
    {
      label: 'Total Users', value: stats.totalUsers,
      gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      iconBg: 'rgba(59,130,246,.2)',
      trendColor: '#60a5fa',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    },
    {
      label: 'Active Users', value: stats.totalUsers - stats.bannedCount,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      iconBg: 'rgba(16,185,129,.2)',
      trendColor: '#34d399',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    },
    {
      label: 'Banned', value: stats.bannedCount,
      gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
      iconBg: 'rgba(239,68,68,.2)',
      trendColor: '#f87171',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
    },
    {
      label: 'Resumes', value: stats.totalResumes,
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      iconBg: 'rgba(139,92,246,.2)',
      trendColor: '#a78bfa',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    },
  ];

  return (
    <div className="ad-page">
      {/* ── Sticky Header ── */}
      <header className="ad-header">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          {/* Left: Logo + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="ad-logo-wrap" style={{ width: 44, height: 44 }}>
              <div className="ad-logo-ring" />
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15V3m0 12l-4-4m4 4l4-4" /><rect x="3" y="17" width="18" height="4" rx="1" />
                </svg>
              </div>
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2 }}>Admin Panel</h1>
              <p style={{ fontSize: '.75rem', color: 'rgba(148,163,184,.7)', fontWeight: 500, marginTop: 2 }}>
                {stats.totalUsers} users &middot; {stats.totalResumes} resumes
              </p>
            </div>
          </div>

          {/* Right: User + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '.875rem', fontWeight: 700, color: '#e2e8f0' }}>{user.username}</p>
              <p style={{ fontSize: '.7rem', color: 'rgba(148,163,184,.5)', fontWeight: 500 }}>Administrator</p>
            </div>
            <button
              onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}
              className="ad-btn ad-btn-ghost"
              style={{ padding: '8px 14px', fontSize: '.78rem', borderRadius: 10 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>

          {/* Glow line */}
          <div className="ad-header-glow" />
        </div>
      </header>

      {/* ── Main Container ── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
          {statCards.map((card, i) => (
            <div key={card.label} className={`ad-stat ad-enter ad-d${i + 1}`}>
              <div className="ad-stat-bg" style={{ background: card.gradient }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div className="ad-stat-icon" style={{ background: card.iconBg }}>
                    {card.icon}
                  </div>
                  <span className="ad-stat-trend" style={{ background: `${card.iconBg}`, color: card.trendColor }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                    Live
                  </span>
                </div>
                <div className="ad-stat-value ad-count-pop" style={{ animationDelay: `${.15 + i * .1}s` }}>{card.value}</div>
                <div className="ad-stat-label" style={{ color: card.trendColor }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation ── */}
        <div className="ad-tabs ad-enter ad-d5" style={{ marginBottom: 28 }}>
          {tabConfig.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`ad-tab ${activeTab === tab.id ? 'ad-tab-active' : ''}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="ad-enter ad-d6">

          {/* ▸ Overview */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* System Health */}
              <div className="ad-card" style={{ padding: '28px 28px 24px' }}>
                <div className="ad-card-glow" style={{ width: 200, height: 200, top: -40, right: -40, background: 'rgba(99,102,241,.15)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>System Health</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Database', value: 'Connected', ok: true },
                      { label: 'API Server', value: 'Running', ok: true },
                      { label: 'Authentication', value: 'Enabled', ok: true },
                      { label: 'Frontend', value: 'Operational', ok: true },
                    ].map((item, i) => (
                      <div key={i} className={`ad-health-row ad-enter ad-d${i + 2}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="ad-health-dot" style={{ background: item.ok ? '#34d399' : '#f87171' }} />
                          <span style={{ fontSize: '.875rem', color: '#cbd5e1', fontWeight: 500 }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: '.78rem', fontWeight: 700, color: item.ok ? '#34d399' : '#f87171' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="ad-card" style={{ padding: '28px 28px 24px' }}>
                <div className="ad-card-glow" style={{ width: 200, height: 200, bottom: -40, left: -40, background: 'rgba(139,92,246,.12)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Quick Actions</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={handleClearAICache} className="ad-btn ad-btn-amber" style={{ width: '100%' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                      Clear AI Cache
                    </button>
                    <button onClick={() => fetchAllUsers()} className="ad-btn ad-btn-blue" style={{ width: '100%' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                      Refresh Data
                    </button>
                    <button onClick={() => setActiveTab('test')} className="ad-btn ad-btn-violet" style={{ width: '100%' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      Run Diagnostics
                    </button>
                  </div>
                </div>
              </div>

              {/* Download Reports */}
              <div className="ad-card" style={{ gridColumn: '1 / -1', padding: '28px 28px 24px' }}>
                <div className="ad-card-glow" style={{ width: 300, height: 200, top: -60, left: '50%', transform: 'translateX(-50%)', background: 'rgba(99,102,241,.1)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Download Reports</h3>
                  </div>
                  <p style={{ fontSize: '.8rem', color: 'rgba(148,163,184,.6)', marginBottom: 20, paddingLeft: 48 }}>Export platform data as CSV for offline analysis</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <button onClick={() => handleDownloadReport('full')} disabled={reportLoading} className="ad-btn ad-btn-indigo" style={{ opacity: reportLoading ? .5 : 1, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      {reportLoading ? 'Generating...' : 'Full Report'}
                    </button>
                    <button onClick={() => handleDownloadReport('users')} disabled={reportLoading} className="ad-btn ad-btn-blue" style={{ opacity: reportLoading ? .5 : 1, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Users Only
                    </button>
                    <button onClick={() => handleDownloadReport('resumes')} disabled={reportLoading} className="ad-btn ad-btn-green" style={{ opacity: reportLoading ? .5 : 1, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Resumes Only
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ▸ Users */}
          {activeTab === 'users' && (
            <div className="ad-card" style={{ padding: '28px' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>User Management</h2>
                    <p style={{ fontSize: '.8rem', color: 'rgba(148,163,184,.6)', marginTop: 4 }}>Smart ban system with automatic expiration</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ad-input"
                        style={{ paddingLeft: 40, width: 260 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Info banner */}
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.12)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span style={{ fontSize: '.8rem', color: '#93c5fd' }}>Ban system supports timed restrictions. Users are automatically unbanned when duration expires.</span>
                </div>

                {loading ? (
                  <LoadingSpinner fullPage={false} message="Loading users..." variant="dark" />
                ) : (
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>User</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const status = getUserStatus(u);
                          const badgeStyle = u.is_admin
                            ? { background: 'rgba(245,158,11,.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.2)' }
                            : u.is_banned
                              ? { background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.15)' }
                              : { background: 'rgba(16,185,129,.1)', color: '#34d399', border: '1px solid rgba(16,185,129,.15)' };
                          return (
                            <tr key={u.id}>
                              <td style={{ color: 'rgba(148,163,184,.5)', fontWeight: 600, fontSize: '.8rem' }}>#{u.id}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                    {u.username.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{u.username}</span>
                                </div>
                              </td>
                              <td style={{ color: 'rgba(148,163,184,.6)' }}>{u.email}</td>
                              <td><span className="ad-badge" style={badgeStyle}>{status.badge}</span></td>
                              <td>
                                {!u.is_admin && u.is_banned && (
                                  <button onClick={() => handleUnbanUser(u.id, u.username)} className="ad-btn ad-btn-green" style={{ padding: '6px 14px', fontSize: '.75rem', borderRadius: 8 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    Unban
                                  </button>
                                )}
                                {!u.is_admin && !u.is_banned && (
                                  <button onClick={() => openBanModal(u)} className="ad-btn ad-btn-red" style={{ padding: '6px 14px', fontSize: '.75rem', borderRadius: 8 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                    Ban
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ▸ Templates */}
          {activeTab === 'templates' && (
            <TemplateManager />
          )}

          {/* ▸ AI Engine — Feature Controls */}
          {activeTab === 'ai' && (
            <div className="afc-wrapper">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>AI Feature Controls</h2>
                  <p style={{ fontSize: '.85rem', color: '#94a3b8' }}>Toggle features on/off and configure usage limits for each AI capability</p>
                </div>
                <button onClick={handleSaveFeatures} disabled={savingFeatures} className="ad-btn ad-btn-green" style={{ minWidth: 140 }}>
                  {savingFeatures ? (
                    <><svg className="afc-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"/></svg> Saving...</>
                  ) : (
                    <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Settings</>
                  )}
                </button>
              </div>

              {aiControlsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <svg className="afc-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"/></svg>
                </div>
              ) : (
                <div className="afc-grid">
                  {aiFeatures.map(f => (
                    <div key={f.id} className="ad-card afc-feature-card" style={{ padding: '24px', opacity: f.is_enabled ? 1 : 0.55, transition: 'opacity .3s' }}>
                      <div className="ad-card-glow" style={{ width: 140, height: 140, top: -20, right: -20, background: f.is_enabled ? 'rgba(59,130,246,.1)' : 'rgba(100,116,139,.06)' }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Feature Name + Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{f.display_name}</h3>
                          <label className="afc-switch">
                            <input type="checkbox" checked={f.is_enabled} onChange={() => handleFeatureToggle(f.id, 'is_enabled')} />
                            <span className="afc-slider"></span>
                          </label>
                        </div>

                        {/* Limit Toggle */}
                        <div className="afc-limit-row" style={{ marginBottom: 14 }}>
                          <span style={{ fontSize: '.82rem', color: '#94a3b8', fontWeight: 600 }}>Usage Limits</span>
                          <label className="afc-switch afc-switch-sm">
                            <input type="checkbox" checked={f.limit_enabled} onChange={() => handleFeatureToggle(f.id, 'limit_enabled')} disabled={!f.is_enabled} />
                            <span className="afc-slider"></span>
                          </label>
                        </div>

                        {/* Limit Inputs */}
                        {f.limit_enabled && f.is_enabled && (
                          <div className="afc-limits">
                            <div className="afc-limit-field">
                              <label>Daily / User</label>
                              <input type="number" min="0" value={f.daily_limit_per_user} onChange={e => handleFeatureInput(f.id, 'daily_limit_per_user', e.target.value)} />
                            </div>
                            <div className="afc-limit-field">
                              <label>Monthly / User</label>
                              <input type="number" min="0" value={f.monthly_limit_per_user} onChange={e => handleFeatureInput(f.id, 'monthly_limit_per_user', e.target.value)} />
                            </div>
                            <div className="afc-limit-field">
                              <label>Global Daily</label>
                              <input type="number" min="0" value={f.global_daily_limit} onChange={e => handleFeatureInput(f.id, 'global_daily_limit', e.target.value)} />
                            </div>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                          <span className={`afc-badge ${f.is_enabled ? 'afc-badge-green' : 'afc-badge-red'}`}>
                            {f.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          {f.is_enabled && (
                            <span className={`afc-badge ${f.limit_enabled ? 'afc-badge-yellow' : 'afc-badge-blue'}`}>
                              {f.limit_enabled ? 'Limited' : 'Unlimited'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cache Management */}
              <div style={{ marginTop: 28 }}>
                <div className="ad-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Cache Management</h3>
                        <p style={{ fontSize: '.78rem', color: '#64748b' }}>Clear AI keyword cache and cached responses</p>
                      </div>
                    </div>
                    <button onClick={handleClearAICache} className="ad-btn ad-btn-red">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ▸ API Keys Management */}
          {activeTab === 'apikeys' && (
            <div className="akm-container">
              {/* Stats Row */}
              <div className="akm-stats-row">
                {[
                  { label: 'Total Keys', value: apiKeyStats.total_keys || 0, color: '#60a5fa', bg: 'rgba(59,130,246,.12)' },
                  { label: 'Active', value: apiKeyStats.active_keys || 0, color: '#34d399', bg: 'rgba(16,185,129,.12)' },
                  { label: 'Exhausted', value: apiKeyStats.exhausted_keys || 0, color: '#fbbf24', bg: 'rgba(245,158,11,.12)' },
                  { label: 'Success Rate (24h)', value: `${apiKeyStats.success_rate_24h || 100}%`, color: '#a78bfa', bg: 'rgba(139,92,246,.12)' },
                ].map((s, i) => (
                  <div key={i} className="akm-stat-card" style={{ borderColor: `${s.color}22` }}>
                    <span className="akm-stat-val" style={{ color: s.color }}>{s.value}</span>
                    <span className="akm-stat-lbl">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Actions Bar */}
              <div className="akm-actions-bar">
                <button onClick={() => setShowAddKey(!showAddKey)} className="ad-btn ad-btn-indigo" style={{ fontSize: '.85rem', padding: '10px 20px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add API Key
                </button>
                {(apiKeyStats.exhausted_keys || 0) > 0 && (
                  <button onClick={handleResetExhausted} className="ad-btn ad-btn-ghost" style={{ fontSize: '.85rem', padding: '10px 20px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    Reset Exhausted
                  </button>
                )}
                <button onClick={fetchApiKeys} className="ad-btn ad-btn-ghost" style={{ fontSize: '.85rem', padding: '10px 20px', marginLeft: 'auto' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  Refresh
                </button>
              </div>

              {/* Add Key Form */}
              {showAddKey && (
                <div className="akm-add-form ad-card" style={{ padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    Add New API Key
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label className="akm-form-label">Provider</label>
                      <select className="ad-input" value={newKey.provider} onChange={e => setNewKey({...newKey, provider: e.target.value})}>
                        <option value="gemini">Google Gemini</option>
                        <option value="adzuna">Adzuna (Job Finder)</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                    <div>
                      <label className="akm-form-label">Label</label>
                      <input type="text" className="ad-input" placeholder={newKey.provider === 'adzuna' ? 'e.g., Adzuna Pair 3' : 'e.g., Production Key 1'} value={newKey.label} onChange={e => setNewKey({...newKey, label: e.target.value})} />
                    </div>
                    {newKey.provider === 'adzuna' ? (
                      <>
                        <div>
                          <label className="akm-form-label">Adzuna App ID *</label>
                          <input type="text" className="ad-input" placeholder="e.g., a975bfd9" value={newKey.adzuna_app_id} onChange={e => setNewKey({...newKey, adzuna_app_id: e.target.value})} />
                        </div>
                        <div>
                          <label className="akm-form-label">Adzuna App Key *</label>
                          <input type="password" className="ad-input" placeholder="e.g., 766dcb4e..." value={newKey.adzuna_app_key} onChange={e => setNewKey({...newKey, adzuna_app_key: e.target.value})} />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="akm-form-label">API Key *</label>
                        <input type="password" className="ad-input" placeholder="AIza..." value={newKey.api_key} onChange={e => setNewKey({...newKey, api_key: e.target.value})} />
                      </div>
                    )}
                    <div>
                      <label className="akm-form-label">Priority (lower = higher)</label>
                      <input type="number" className="ad-input" min="1" max="100" value={newKey.priority} onChange={e => setNewKey({...newKey, priority: parseInt(e.target.value) || 10})} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleAddKey} className="ad-btn ad-btn-indigo" style={{ fontSize: '.85rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {newKey.provider === 'adzuna' ? 'Save Adzuna Credentials' : 'Save Key'}
                    </button>
                    <button onClick={() => setShowAddKey(false)} className="ad-btn ad-btn-ghost" style={{ fontSize: '.85rem' }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ═══ GEMINI API KEYS SECTION ═══ */}
              <div className="akm-section-header" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px', padding: '14px 20px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,.08), rgba(168,85,247,.06))', border: '1px solid rgba(99,102,241,.15)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Gemini API Keys</h3>
                  <p style={{ fontSize: '.75rem', color: '#94a3b8', margin: 0 }}>Google Gemini AI — Resume Enhancement, ATS Analysis, Career Assistant</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '.8rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,.12)', padding: '4px 12px', borderRadius: 20 }}>
                  {apiKeys.filter(k => k.provider_name === 'gemini').filter(k => k.status === 'active').length} / {apiKeys.filter(k => k.provider_name === 'gemini').length} active
                </span>
              </div>

              <div className="ad-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 8 }}>
                {apiKeysLoading ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto 12px', border: '3px solid rgba(99,102,241,.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'adOrbit 1s linear infinite' }} />
                    <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>Loading keys...</p>
                  </div>
                ) : apiKeys.filter(k => k.provider_name === 'gemini').length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <p style={{ color: '#94a3b8', fontSize: '.85rem', fontWeight: 600 }}>No Gemini keys configured</p>
                    <p style={{ color: '#64748b', fontSize: '.78rem', marginTop: 4 }}>Add a Google Gemini key to enable AI features</p>
                  </div>
                ) : (
                  <div className="akm-key-list">
                    {apiKeys.filter(k => k.provider_name === 'gemini').map((k) => (
                      <div key={k.id} className={`akm-key-row ${k.priority === 1 ? 'akm-key-primary' : ''} ${k.status === 'exhausted' ? 'akm-key-exhausted' : ''}`}>
                        <div className="akm-key-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span className={`akm-status-dot akm-status-${k.status}`} />
                            <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '.9rem' }}>{k.label}</span>
                            {k.priority === 1 && <span className="akm-primary-badge">PRIMARY</span>}
                            <span className={`akm-status-badge akm-sb-${k.status}`}>{k.status.toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '.78rem', color: '#94a3b8' }}>
                            <span style={{ fontFamily: 'monospace', letterSpacing: '.02em' }}>{k.masked_key}</span>
                            <span>Priority: {k.priority}</span>
                          </div>
                        </div>
                        <div className="akm-key-usage">
                          <div className="akm-usage-item">
                            <span className="akm-usage-val" style={{ color: '#60a5fa' }}>{k.usage_count || 0}</span>
                            <span className="akm-usage-lbl">Total</span>
                          </div>
                          <div className="akm-usage-item">
                            <span className="akm-usage-val" style={{ color: '#34d399' }}>{k.success_count || 0}</span>
                            <span className="akm-usage-lbl">Success</span>
                          </div>
                          <div className="akm-usage-item">
                            <span className="akm-usage-val" style={{ color: '#f87171' }}>{k.failure_count || 0}</span>
                            <span className="akm-usage-lbl">Failed</span>
                          </div>
                          {k.last_used_at && (
                            <div className="akm-usage-item">
                              <span className="akm-usage-val" style={{ color: '#fbbf24', fontSize: '.75rem' }}>{new Date(k.last_used_at).toLocaleString()}</span>
                              <span className="akm-usage-lbl">Last Used</span>
                            </div>
                          )}
                        </div>
                        <div className="akm-key-actions">
                          {k.priority !== 1 && k.status !== 'exhausted' && (
                            <button onClick={() => handleSetPrimary(k.id)} className="akm-action-btn akm-btn-star" title="Set as Primary">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </button>
                          )}
                          <button onClick={() => handleToggleKey(k.id, k.status)} className={`akm-action-btn ${k.status === 'active' ? 'akm-btn-pause' : 'akm-btn-play'}`} title={k.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {k.status === 'active' ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            )}
                          </button>
                          <button onClick={() => fetchApiKeyLogs(k.id)} className="akm-action-btn akm-btn-log" title="View Logs">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                          </button>
                          <button onClick={() => handleDeleteKey(k.id, k.label)} className="akm-action-btn akm-btn-del" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                        {k.last_error && (
                          <div className="akm-error-banner">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            <span>{k.last_error}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ═══ ADZUNA API KEYS — EXCLUSIVE TOGGLE SECTION ═══ */}
              <div className="akm-section-header" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px', padding: '14px 20px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(16,185,129,.08), rgba(52,211,153,.06))', border: '1px solid rgba(16,185,129,.15)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e2e8f0', margin: 0 }}>Adzuna API Connection</h3>
                  <p style={{ fontSize: '.75rem', color: '#94a3b8', margin: 0 }}>Only one API key pair can be connected at a time. Toggle ON to establish connection.</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '.8rem', fontWeight: 700, color: adzunaPairs.some(p => p.is_on) ? '#34d399' : '#f87171', background: adzunaPairs.some(p => p.is_on) ? 'rgba(16,185,129,.12)' : 'rgba(248,113,113,.12)', padding: '4px 14px', borderRadius: 20 }}>
                  {adzunaPairs.some(p => p.is_on) ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div className="ad-card" style={{ padding: 0, overflow: 'hidden' }}>
                {adzunaPairsLoading ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto 12px', border: '3px solid rgba(16,185,129,.3)', borderTopColor: '#34d399', borderRadius: '50%', animation: 'adOrbit 1s linear infinite' }} />
                    <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>Loading Adzuna keys...</p>
                  </div>
                ) : adzunaPairs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                    <p style={{ color: '#94a3b8', fontSize: '.85rem', fontWeight: 600 }}>No Adzuna keys configured</p>
                    <p style={{ color: '#64748b', fontSize: '.78rem', marginTop: 4 }}>Add Adzuna credentials above to enable Job Finder</p>
                  </div>
                ) : (
                  <div style={{ padding: 0 }}>
                    {/* Info banner */}
                    <div style={{ padding: '12px 20px', background: 'rgba(96,165,250,.06)', borderBottom: '1px solid rgba(96,165,250,.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>Turning ON a key will automatically turn OFF any other active key. Only one connection at a time.</span>
                    </div>

                    {adzunaPairs.map((pair, idx) => (
                      <div key={pair.id_key_id} style={{
                        padding: '16px 20px',
                        borderBottom: idx < adzunaPairs.length - 1 ? '1px solid rgba(148,163,184,.08)' : 'none',
                        borderLeft: `3px solid ${pair.is_on ? '#34d399' : '#334155'}`,
                        background: pair.is_on ? 'rgba(16,185,129,.04)' : 'transparent',
                        transition: 'all 0.3s ease',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {/* Left: pair info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              {/* Connection status indicator */}
                              <div style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: pair.is_on ? '#34d399' : '#475569',
                                boxShadow: pair.is_on ? '0 0 8px rgba(52,211,153,.5)' : 'none',
                                transition: 'all 0.3s ease',
                              }} />
                              <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '.92rem' }}>{pair.label || `API Key Pair ${idx + 1}`}</span>
                              <span style={{
                                fontSize: '.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                                color: pair.is_on ? '#34d399' : '#94a3b8',
                                background: pair.is_on ? 'rgba(16,185,129,.12)' : 'rgba(148,163,184,.08)',
                                border: `1px solid ${pair.is_on ? 'rgba(16,185,129,.2)' : 'rgba(148,163,184,.1)'}`,
                              }}>
                                {pair.is_on ? 'CONNECTED' : 'OFF'}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: '.78rem', color: '#94a3b8' }}>
                              <span><strong style={{ color: '#cbd5e1' }}>App ID:</strong> <span style={{ fontFamily: 'monospace', letterSpacing: '.5px' }}>{pair.masked_id}</span></span>
                              <span><strong style={{ color: '#cbd5e1' }}>App Key:</strong> <span style={{ fontFamily: 'monospace', letterSpacing: '.5px' }}>{pair.masked_key}</span></span>
                            </div>
                            {/* Usage stats row */}
                            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '.75rem' }}>
                              <span style={{ color: '#60a5fa' }}>Requests: {pair.usage_count || 0}</span>
                              <span style={{ color: '#34d399' }}>Success: {pair.success_count || 0}</span>
                              <span style={{ color: '#f87171' }}>Failed: {pair.failure_count || 0}</span>
                              {pair.last_used_at && <span style={{ color: '#fbbf24' }}>Last: {new Date(pair.last_used_at).toLocaleString()}</span>}
                            </div>
                            {pair.last_error && (
                              <div style={{ marginTop: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.15)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: '#fbbf24' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>{pair.last_error}</span>
                              </div>
                            )}
                          </div>

                          {/* Right: Toggle switch + delete */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 20 }}>
                            {/* ON/OFF Toggle Switch */}
                            <button
                              onClick={() => handleAdzunaToggle(pair.id_key_id, pair.is_on)}
                              disabled={adzunaToggling === pair.id_key_id}
                              style={{
                                position: 'relative',
                                width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                                background: pair.is_on ? 'linear-gradient(135deg, #34d399, #10b981)' : '#334155',
                                transition: 'background 0.3s ease',
                                opacity: adzunaToggling === pair.id_key_id ? 0.6 : 1,
                              }}
                              title={pair.is_on ? 'Turn OFF this connection' : 'Turn ON this connection'}
                            >
                              <div style={{
                                position: 'absolute',
                                top: 3, left: pair.is_on ? 26 : 3,
                                width: 22, height: 22, borderRadius: '50%',
                                background: '#fff',
                                boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                                transition: 'left 0.25s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {adzunaToggling === pair.id_key_id ? (
                                  <div style={{ width: 12, height: 12, border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'adOrbit .6s linear infinite' }} />
                                ) : pair.is_on ? (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                ) : (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                )}
                              </div>
                            </button>

                            {/* View Logs */}
                            <button onClick={() => fetchApiKeyLogs(pair.id_key_id)} className="akm-action-btn akm-btn-log" title="View Logs" style={{ width: 32, height: 32 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </button>

                            {/* Delete */}
                            <button onClick={async () => { if (confirm(`Delete "${pair.label || 'this pair'}"? This cannot be undone.`)) { await handleDeleteKey(pair.id_key_id, pair.label); if (pair.key_key_id) await handleDeleteKey(pair.key_key_id, pair.label); fetchAdzunaPairs(); }}} className="akm-action-btn akm-btn-del" title="Delete Pair" style={{ width: 32, height: 32 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Usage Logs */}
              {apiKeyLogs.length > 0 && (
                <div className="ad-card" style={{ padding: 24, marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Recent Usage Logs {selectedKeyLogs ? `(Key #${selectedKeyLogs})` : '(All Keys)'}
                    </h3>
                    {selectedKeyLogs && (
                      <button onClick={() => fetchApiKeyLogs()} className="ad-btn ad-btn-ghost" style={{ fontSize: '.78rem', padding: '6px 12px' }}>
                        Show All
                      </button>
                    )}
                  </div>
                  <div className="akm-log-table-wrap">
                    <table className="akm-log-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Key</th>
                          <th>Endpoint</th>
                          <th>Status</th>
                          <th>Latency</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeyLogs.slice(0, 30).map((log, i) => (
                          <tr key={log.id} className={log.success ? '' : 'akm-log-fail'}>
                            <td>{log.created_at ? new Date(log.created_at).toLocaleTimeString() : '-'}</td>
                            <td>#{log.api_key_id}</td>
                            <td><code>{log.endpoint || '-'}</code></td>
                            <td>
                              <span className={`akm-log-badge ${log.success ? 'akm-log-ok' : 'akm-log-err'}`}>
                                {log.success ? 'OK' : log.error_code || 'ERR'}
                              </span>
                            </td>
                            <td>{log.response_time_ms ? `${log.response_time_ms}ms` : '-'}</td>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.error_message || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Auto-rotation info */}
              <div className="akm-info-card" style={{ marginTop: 20 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <div>
                  <strong>Auto-Rotation Enabled</strong>
                  <p>When a Gemini or Adzuna key hits its rate limit (HTTP 429), the system automatically switches to the next available key. Adzuna credential pairs rotate together (App ID + App Key). Exhausted keys auto-recover after 1 hour. All keys are encrypted with AES at rest.</p>
                </div>
              </div>
            </div>
          )}

          {/* ▸ Reports & Analytics */}
          {activeTab === 'reports' && (
            <div className="ad-card" style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(168,85,247,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Reports & Usage Analytics</h3>
                <p style={{ fontSize: '.9rem', color: '#94a3b8', marginBottom: 24, maxWidth: 440, margin: '0 auto 24px' }}>View detailed AI usage statistics, feature analytics, per-user activity, and download comprehensive CSV/PDF reports.</p>
                <button
                  onClick={() => navigate('/admin/reports')}
                  className="ad-btn ad-btn-green"
                  style={{ padding: '12px 32px', fontSize: '.95rem' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open Reports Dashboard
                </button>
              </div>
            </div>
          )}

          {/* ▸ Diagnostics */}
          {activeTab === 'test' && (
            <div className="ad-card" style={{ padding: '28px' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>System Diagnostics</h2>
                </div>
                <p style={{ fontSize: '.8rem', color: 'rgba(148,163,184,.6)', marginBottom: 24, paddingLeft: 48 }}>Verify all components are functioning correctly</p>

                <button
                  onClick={runTests}
                  disabled={testLoading}
                  className={`ad-btn ${testLoading ? 'ad-btn-ghost' : 'ad-btn-indigo'}`}
                  style={{ marginBottom: 24, fontSize: '.95rem', padding: '14px 28px', cursor: testLoading ? 'not-allowed' : 'pointer', opacity: testLoading ? .6 : 1 }}
                >
                  {testLoading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'adOrbit .8s linear infinite' }} />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Run All Tests
                    </>
                  )}
                </button>

                {testResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {testResults.map((test, idx) => {
                      const styles = {
                        PASS: { bg: 'rgba(16,185,129,.06)', border: 'rgba(16,185,129,.15)', color: '#34d399', dotBg: '#34d399' },
                        FAIL: { bg: 'rgba(239,68,68,.06)', border: 'rgba(239,68,68,.15)', color: '#f87171', dotBg: '#f87171' },
                        SKIP: { bg: 'rgba(245,158,11,.06)', border: 'rgba(245,158,11,.15)', color: '#fbbf24', dotBg: '#fbbf24' },
                      };
                      const s = styles[test.status] || styles.SKIP;
                      return (
                        <div key={idx} className={`ad-enter ad-d${Math.min(idx + 1, 9)}`} style={{ padding: '14px 18px', borderRadius: 14, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="ad-health-dot" style={{ background: s.dotBg }} />
                            <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '.9rem' }}>{test.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '.78rem', color: 'rgba(148,163,184,.6)' }}>{test.message}</span>
                            <span className="ad-badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{test.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Ban Modal ── */}
      {banModal && (
        <div className="ad-modal-overlay">
          <div className="ad-modal">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Ban User</h2>
                <p style={{ fontSize: '.78rem', color: 'rgba(148,163,184,.6)' }}>Restrict access temporarily or permanently</p>
              </div>
            </div>

            {/* Warning */}
            <div style={{ margin: '20px 0', padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: '.8rem', color: '#fde68a' }}>Banning: <strong style={{ color: '#fbbf24' }}>{selectedUser?.username}</strong></span>
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Reason</label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g., Spam, Harassment..."
                className="ad-input"
              />
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Duration</label>
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="ad-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="1hour">1 Hour</option>
                <option value="1day">1 Day</option>
                <option value="1week">1 Week</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={closeBanModal} className="ad-btn ad-btn-ghost" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleBanUser} className="ad-btn ad-btn-red" style={{ flex: 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
