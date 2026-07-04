import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Gem, User, Mail, Key, Shield, AlertTriangle, Rocket, Brain, Palette } from 'lucide-react';

export default function AuthPage({ onAuth }) {
  const [mode, setMode]         = useState('login'); // 'login' | 'register' | '2fa'
  const [form, setForm]         = useState({ username: '', email: '', password: '', code: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [tempUser, setTempUser] = useState(null); // Used for 2FA step
  const cardRef = useRef(null);

  // 3D tilt mouse tracking
  function handleMouseMove(e) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`;
  }
  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg)';
  }

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const data = await api.login({ email: form.email, password: form.password });
        if (data.requires2FA) {
          setTempUser(data);
          setMode('2fa');
        } else {
          onAuth(data);
        }
      } else if (mode === 'register') {
        const data = await api.register({
          username: form.username,
          email: form.email,
          password: form.password
        });
        onAuth(data);
      } else if (mode === '2fa') {
        const data = await api.verify2FA({
          userId: tempUser.userId,
          code: form.code
        });
        onAuth(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    if (mode === '2fa') {
      setMode('login');
      setTempUser(null);
    } else {
      setMode(m => m === 'login' ? 'register' : 'login');
    }
    setError('');
    setForm(f => ({ ...f, code: '' }));
  }

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div ref={cardRef} className={`auth-container ${mode === 'register' ? 'register-mode' : ''}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div className="auth-card-glass">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo-v2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, fontSize: "32px", background: "linear-gradient(135deg, #FF7E67, #F9A826)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-2px" }}>YX</span>
            </div>
            <h1 className="auth-title-v2">Yaarax AI</h1>
            <p className="auth-subtitle-v2">
              {mode === 'login' && 'The most powerful AI ever built.'}
              {mode === 'register' && 'Join the future of intelligence.'}
              {mode === '2fa' && 'Verify your identity to continue.'}
            </p>
          </div>

          <form className="auth-form-v2" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="auth-input-group">
                <label>Username</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><User size={18} /></span>
                  <input
                    type="text"
                    placeholder="Username"
                    value={form.username}
                    onChange={e => update('username', e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {mode !== '2fa' && (
              <>
                <div className="auth-input-group">
                  <label>Email Address</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon"><Mail size={18} /></span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Password</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon"><Key size={18} /></span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => update('password', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {mode === '2fa' && (
              <div className="auth-input-group">
                <label>Verification Code</label>
                <p className="auth-2fa-hint">A 2FA code is required for <strong>{tempUser?.email}</strong></p>
                <p className="auth-2fa-hint" style={{fontSize: '11px', color: 'var(--neon-cyan)', marginTop: '4px', opacity: 0.9}}>
                  💡 For testing, use the default PIN <strong>123456</strong> or your custom configured PIN.
                </p>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><Shield size={18} /></span>
                  <input
                    type="text"
                    placeholder="6-digit code"
                    value={form.code}
                    onChange={e => update('code', e.target.value)}
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="auth-error-v2">
                <span className="error-icon"><AlertTriangle size={18} style={{marginRight: 6}} /></span>
                {error}
              </div>
            )}

            <button type="submit" className="auth-btn-v2" disabled={loading}>
              {loading ? (
                <div className="auth-loader" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Get Started'}
                  {mode === '2fa' && 'Verify & Enter'}
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-v2">
            {mode !== '2fa' && (
              <div className="oauth-section">
                <div className="oauth-divider">
                  <div className="oauth-divider-line" />
                  <span className="oauth-divider-text">OR CONTINUE WITH</span>
                  <div className="oauth-divider-line" />
                </div>
                
                <div className="oauth-btns">
                  <button type="button" className="oauth-btn" onClick={() => window.location.href = 'http://localhost:3001/api/auth/google'} title="Google">
                    <img src="https://authjs.dev/img/providers/google.svg" alt="Google" width="20" height="20" />
                  </button>
                  <button type="button" className="oauth-btn" onClick={() => window.location.href = 'http://localhost:3001/api/auth/github'} title="GitHub" style={{ background: '#24292e' }}>
                    <img src="https://authjs.dev/img/providers/github.svg" alt="GitHub" width="20" height="20" style={{ filter: 'invert(1)' }} />
                  </button>
                  <button type="button" className="oauth-btn" onClick={() => window.location.href = 'http://localhost:3001/api/auth/linkedin'} title="LinkedIn" style={{ background: '#0077b5' }}>
                    <img src="https://authjs.dev/img/providers/linkedin.svg" alt="LinkedIn" width="20" height="20" style={{ filter: 'invert(1)' }} />
                  </button>
                  <button type="button" className="oauth-btn" onClick={() => window.location.href = 'http://localhost:3001/api/auth/microsoft'} title="Microsoft">
                    <img src="https://authjs.dev/img/providers/microsoft.svg" alt="Microsoft" width="20" height="20" />
                  </button>
                </div>
              </div>
            )}

            {mode === '2fa' ? (
              <button onClick={switchMode} className="auth-link-v2">Back to Login</button>
            ) : (
              <>
                {mode === 'login' ? "New here?" : "Already a member?"}
                <button onClick={switchMode} className="auth-link-v2">
                  {mode === 'login' ? 'Create an account' : 'Sign in instead'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="auth-visual-side">
          <div className="visual-content">
            <h2>Experience the Future</h2>
            <p>The most powerful all-in-one AI platform — Chat, Code, Images, Videos, Data &amp; more. Built for brilliance.</p>
            <div className="visual-stats">
              <div className="stat-item"><span style={{display: 'flex', alignItems: 'center', marginRight: '10px'}}><Rocket size={20} color="var(--neon-cyan)" /></span> Blazing Fast</div>
              <div className="stat-item"><span style={{display: 'flex', alignItems: 'center', marginRight: '10px'}}><Brain size={20} color="var(--neon-purple)" /></span> Multi-Model AI</div>
              <div className="stat-item"><span style={{display: 'flex', alignItems: 'center', marginRight: '10px'}}><Palette size={20} color="var(--rose)" /></span> Image &amp; Video Gen</div>
              <div className="stat-item"><span style={{display: 'flex', alignItems: 'center', marginRight: '10px'}}><Shield size={20} color="var(--emerald)" /></span> Secure &amp; Private</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
