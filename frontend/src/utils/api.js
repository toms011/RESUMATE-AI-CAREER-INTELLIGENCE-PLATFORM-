/**
 * Centralized API configuration + Axios instance with JWT interceptor.
 * 
 * Usage:
 *   import api, { API_BASE } from '../utils/api';
 *   const res = await api.get('/resumes?user_id=1');
 *   const res = await api.post('/resume/1', payload);
 */
import axios from 'axios';

// Single source of truth for the backend URL.
// In production, set VITE_API_BASE in .env  (e.g.  VITE_API_BASE=https://api.mysite.com)
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT token ───────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // When sending FormData, remove the default Content-Type so the browser
    // can set multipart/form-data with the correct boundary automatically.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 (expired / invalid token) ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — only redirect if we're NOT already on login/register
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
