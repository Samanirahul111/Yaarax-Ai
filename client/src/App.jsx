import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import HubPage from './pages/HubPage';
import { api } from './api/client';
import { Gem } from 'lucide-react';
import Background3D from './components/Background3D';

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('yaarax_theme') || 'dark');

  // Apply theme globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yaarax_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Extract OAuth callback data
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthError = params.get('error');

    if (oauthError) {
      alert('Authentication Error: ' + oauthError);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthToken) {
      localStorage.setItem('yaarax_ai_token', oauthToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = localStorage.getItem('yaarax_ai_token');
    if (!token) { setLoading(false); return; }
    
    api.getMe()
      .then(({ user }) => {
        localStorage.setItem('yaarax_ai_user', JSON.stringify(user));
        setUser(user);
      })
      .catch(() => {
        localStorage.removeItem('yaarax_ai_token');
        localStorage.removeItem('yaarax_ai_user');
      })
      .finally(() => setLoading(false));
  }, []);

  function handleAuth({ token, user }) {
    localStorage.setItem('yaarax_ai_token', token);
    localStorage.setItem('yaarax_ai_user', JSON.stringify(user));
    setUser(user);
  }

  function handleUpdateUser(updatedUser) {
    const newUser = { ...user, ...updatedUser };
    localStorage.setItem('yaarax_ai_user', JSON.stringify(newUser));
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem('yaarax_ai_token');
    localStorage.removeItem('yaarax_ai_user');
    setUser(null);
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-logo" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent'}}>
          <span className="pulse" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, fontSize: "32px", background: "linear-gradient(135deg, #FF7E67, #F9A826)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-2px" }}>YX</span>
        </div>
        <div className="loading-text">Yaarax AI</div>
        <div className="loading-bar" />
      </div>
    );
  }

  return (
    <>
      <Background3D />
      {user
        ? <HubPage user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} theme={theme} onThemeChange={setTheme} />
        : <AuthPage onAuth={handleAuth} />}
    </>
  );
}
