import React, { useState, useEffect } from 'react';
import iconLogo from '../assets/icons/yaarax_ai_logo.png';
import { api } from '../api/client';
import { User, Palette, Bot, Brain, Shield, Info, LogOut, X, Pencil, Check } from 'lucide-react';

export default function SettingsModal({ theme, onThemeChange, onClose, user, onUpdateUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [keys, setKeys] = useState(() => ({
    replicate: localStorage.getItem('yaarax_replicate_key') || '',
    gemini: localStorage.getItem('yaarax_gemini_key') || '',
    groq: localStorage.getItem('yaarax_groq_key') || '',
    cerebras: localStorage.getItem('yaarax_cerebras_key') || '',
    openrouter: localStorage.getItem('yaarax_openrouter_key') || '',
  }));
  const [savedAPIKeys, setSavedAPIKeys] = useState(false);

  function setKey(provider, value) {
    setKeys(prev => ({...prev, [provider]: value}));
    if (value) localStorage.setItem(`yaarax_${provider}_key`, value);
    else localStorage.removeItem(`yaarax_${provider}_key`);
  }

  function handleSaveAPIKeys() {
    setSavedAPIKeys(true);
    setTimeout(() => setSavedAPIKeys(false), 2000);
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'ai', label: 'AI Engines', icon: <Bot size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'about', label: 'About', icon: <Info size={18} /> },
  ];

  const themes = [
    { id: 'dark',   label: 'Obsidian Night', desc: 'Sleek dark mode with subtle glows', color: '#13131a' },
    { id: 'darker', label: 'Void Black', desc: 'True black for OLED displays', color: '#000000' },
    { id: 'dracula', label: 'Dracula', desc: 'A dark theme for vampires', color: '#282a36' },
    { id: 'ocean', label: 'Deep Ocean', desc: 'Calming blue depths', color: '#051124' },
    { id: 'forest', label: 'Midnight Forest', desc: 'Dark emerald hues', color: '#061a10' },
    { id: 'rose', label: 'Crimson Night', desc: 'Deep ruby and rose', color: '#1a060a' },
  ];


  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card settings-card-premium">
        {/* Sidebar Nav */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">
            <div className="logo-icon-sm" style={{ overflow: 'hidden' }}>
              <img src={iconLogo} alt="Yaarax AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span>Yaarax Settings</span>
          </div>
          <div className="settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="sn-icon">{tab.icon}</span>
                <span className="sn-label">{tab.label}</span>
              </button>
            ))}
          </div>
          <button className="settings-logout" onClick={onLogout}>
            <LogOut size={16} style={{marginRight: '8px'}} /> Sign Out
          </button>
        </div>

        {/* Content Area */}
        <div className="settings-main">
          <div className="settings-main-header">
            <h2>{tabs.find(t => t.id === activeTab).label}</h2>
            <button className="settings-close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="settings-content-scroll">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="settings-section">
                <div className="profile-hero">
                  <div className="profile-avatar-giant">
                    {user.username.charAt(0).toUpperCase()}
                    <div className="avatar-edit-badge"><Pencil size={12} /></div>
                  </div>
                  <div className="profile-meta">
                    <h3>{user.username}</h3>
                    <p>{user.email}</p>
                    <div className="pro-badge-glow">PRO MEMBER</div>
                  </div>
                </div>

                <div className="settings-group">
                  <label>Display Name</label>
                  <input type="text" defaultValue={user.username} className="settings-input" />
                </div>
                <div className="settings-group">
                  <label>Email Address</label>
                  <input type="email" defaultValue={user.email} disabled className="settings-input disabled" />
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <p className="section-desc">Customize the look and feel of your AI assistant.</p>
                <div className="theme-grid-cards">
                  {themes.map(t => (
                    <div 
                      key={t.id} 
                      className={`theme-card ${theme === t.id ? 'active' : ''}`}
                      onClick={() => onThemeChange(t.id)}
                    >
                      <div className="theme-card-preview" style={{background: t.color}}>
                        <div className="preview-bubble ai"></div>
                        <div className="preview-bubble user"></div>
                      </div>
                      <div className="theme-card-info">
                        <h4>{t.label}</h4>
                        <p>{t.desc}</p>
                      </div>
                      {theme === t.id && <div className="theme-check"><Check size={16} /></div>}
                    </div>
                  ))}
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <h4>Glassmorphism Effects</h4>
                    <p>Enable frosted glass and transparency across the UI.</p>
                  </div>
                  <div className="yaarax-toggle active"></div>
                </div>
                <div className="settings-toggle-row">
                  <div>
                    <h4>Animations</h4>
                    <p>Enable smooth transitions and micro-interactions.</p>
                  </div>
                  <div className="yaarax-toggle active"></div>
                </div>
              </div>
            )}

            {/* AI ENGINES TAB */}
            {activeTab === 'ai' && (
              <div className="settings-section">
                <p className="section-desc">Real-time status of integrated AI models.</p>
                <div className="engine-status-list">
                  {[
                    { name: 'Gemini 2.0 Pro', status: 'Online', speed: 'High', type: 'Primary' },
                    { name: 'Cerebras Llama', status: 'Online', speed: 'Ultra', type: 'Turbo' },
                    { name: 'OpenRouter Flash', status: 'Online', speed: 'High', type: 'Free' },
                    { name: 'Groq (Llama 3)', status: 'Online', speed: 'High', type: 'Fallback' },
                    { name: 'Replicate Minimax', status: 'Online', speed: 'Render', type: 'Premium Video' }
                  ].map((engine, i) => (
                    <div key={i} className="engine-item">
                      <div className="engine-main">
                        <div className="engine-dot pulse"></div>
                        <div className="engine-info">
                          <div className="engine-name">{engine.name}</div>
                          <div className="engine-type">{engine.type}</div>
                        </div>
                      </div>
                      <div className="engine-meta">
                        <span className="engine-speed">{engine.speed} Speed</span>
                        <span className="engine-status-tag">{engine.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '30px' }}>
                  <h4>Custom API Keys</h4>
                  <p className="section-desc" style={{ marginBottom: '12px' }}>Add your own API keys to bypass server rate limits. Your keys are saved locally in your browser.</p>
                  
                  <div className="settings-group">
                    <label>Gemini API Key</label>
                    <input type="password" placeholder="AIza..." className="settings-input" value={keys.gemini} onChange={e => setKey('gemini', e.target.value)} />
                  </div>
                  
                  <div className="settings-group">
                    <label>Groq API Key</label>
                    <input type="password" placeholder="gsk_..." className="settings-input" value={keys.groq} onChange={e => setKey('groq', e.target.value)} />
                  </div>
                  
                  <div className="settings-group">
                    <label>Cerebras API Key</label>
                    <input type="password" placeholder="csk-..." className="settings-input" value={keys.cerebras} onChange={e => setKey('cerebras', e.target.value)} />
                  </div>
                  
                  <div className="settings-group">
                    <label>OpenRouter API Key</label>
                    <input type="password" placeholder="sk-or-v1-..." className="settings-input" value={keys.openrouter} onChange={e => setKey('openrouter', e.target.value)} />
                  </div>

                  <div className="settings-group">
                    <label>Replicate API Key (Premium Video)</label>
                    <input type="password" placeholder="r8_..." className="settings-input" value={keys.replicate} onChange={e => setKey('replicate', e.target.value)} />
                  </div>

                  <button 
                    onClick={handleSaveAPIKeys} 
                    className="yaarax-btn-primary" 
                    style={{ marginTop: '10px' }}
                  >
                    {savedAPIKeys ? <><Check size={16} style={{marginRight: '8px'}} /> Saved!</> : 'Save API Keys'}
                  </button>
                </div>
              </div>
            )}


            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <div className="security-card-main">
                  <div className="sc-icon"><Shield size={24} /></div>
                  <div className="sc-info">
                    <h4>Two-Factor Authentication</h4>
                    <p>Current Status: <span className={user.two_factor_enabled ? 'status-on' : 'status-off'}>{user.two_factor_enabled ? 'ENABLED' : 'DISABLED'}</span></p>
                  </div>
                </div>

                <div className="security-actions">
                  <div className="sa-group">
                    <label>Manage 2FA Protection</label>
                    <div className="sa-input-row">
                      <input 
                        type="password" 
                        placeholder="6-digit PIN" 
                        maxLength={6} 
                        id="p-pin"
                        className="settings-input"
                      />
                      <button 
                        className={`sa-btn ${user.two_factor_enabled ? 'sa-disable' : 'sa-enable'}`}
                        onClick={async () => {
                          const pin = document.getElementById('p-pin').value;
                          if (!user.two_factor_enabled && pin.length < 4) return alert('Min 4 digits');
                           try {
                            await api.toggle2FA({ enabled: !user.two_factor_enabled, secret: pin });
                            onUpdateUser({ two_factor_enabled: !user.two_factor_enabled });
                            document.getElementById('p-pin').value = '';
                          } catch (err) { alert(err.message); }
                        }}
                      >
                        {user.two_factor_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="settings-section about-section">
                <div className="about-logo-big" style={{ overflow: 'hidden' }}>
                  <img src={iconLogo} alt="Yaarax AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <h2>Yaarax AI Platform</h2>
                <p className="version-text">Version 2.4.0-premium (Stable)</p>
                

                <div className="about-footer">
                  <p>© 2026 Yaarax AI Technologies. All rights reserved.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
