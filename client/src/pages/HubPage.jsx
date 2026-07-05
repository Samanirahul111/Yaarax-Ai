import React, { useState } from 'react';
import ChatPage from './ChatPage';
import ImageGenPage from './ImageGenPage';
import VideoGenPage from './VideoGenPage';
import CodePage from './CodePage';
import FileAnalyzerPage from './FileAnalyzerPage';
import ResumeAnalyzerPage from './ResumeAnalyzerPage';
import AssistantPage from './AssistantPage';


import { MessageSquare, Image as ImageIcon, Video, FolderSearch, Code2, BarChart2, Bot, Gem, LogOut, Briefcase } from 'lucide-react';

const NAV = [
  { id: 'chat', icon: <MessageSquare size={24} />, label: 'Chat AI', glow: 'rgba(255, 126, 103,.22)', active: 'rgba(255, 126, 103,.1)', border: 'rgba(255, 126, 103,.25)', text: '#FF7E67' },
  { id: 'image', icon: <ImageIcon size={24} />, label: 'Image Generator', glow: 'rgba(249, 168, 38,.22)', active: 'rgba(249, 168, 38,.1)', border: 'rgba(249, 168, 38,.25)', text: '#F9A826' },
  { id: 'video', icon: <Video size={24} />, label: 'Video Generator', glow: 'rgba(217, 83, 79,.22)', active: 'rgba(217, 83, 79,.1)', border: 'rgba(217, 83, 79,.25)', text: '#D9534F' },
  { id: 'file', icon: <FolderSearch size={24} />, label: 'File Analyzer', glow: 'rgba(227, 168, 87,.22)', active: 'rgba(227, 168, 87,.1)', border: 'rgba(227, 168, 87,.25)', text: '#E3A857' },
  { id: 'resume', icon: <Briefcase size={24} />, label: 'Resume AI', glow: 'rgba(93, 123, 157,.22)', active: 'rgba(93, 123, 157,.1)', border: 'rgba(93, 123, 157,.25)', text: '#5D7B9D' },
  { id: 'code', icon: <Code2 size={24} />, label: 'Code AI', glow: 'rgba(92, 138, 107,.22)', active: 'rgba(92, 138, 107,.1)', border: 'rgba(92, 138, 107,.25)', text: '#5C8A6B' },

  { id: 'assistant', icon: <Bot size={24} />, label: 'Assistant', glow: 'rgba(249, 168, 38,.22)', active: 'rgba(249, 168, 38,.1)', border: 'rgba(249, 168, 38,.25)', text: '#F9A826' },
];

export default function HubPage({ user, onUpdateUser, onLogout, theme, onThemeChange }) {
  const [active, setActive] = useState('chat');
  const [tooltip, setTooltip] = useState(null);

  function renderPage() {
    switch (active) {
      case 'chat': return <ChatPage user={user} onUpdateUser={onUpdateUser} onLogout={onLogout} theme={theme} onThemeChange={onThemeChange} />;
      case 'image': return <ImageGenPage user={user} />;
      case 'video': return <VideoGenPage />;
      case 'file': return <FileAnalyzerPage user={user} />;
      case 'resume': return <ResumeAnalyzerPage user={user} />;
      case 'code': return <CodePage user={user} />;

      case 'assistant': return <AssistantPage user={user} />;
      default: return <ChatPage user={user} onUpdateUser={onUpdateUser} onLogout={onLogout} theme={theme} onThemeChange={onThemeChange} />;
    }
  }

  return (
    <div className="hub-layout">
      {/* Side Dock */}
      <nav className="hub-dock">
        <div className="hub-dock-logo">
          <div className="hub-dock-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, fontSize: "20px", background: "linear-gradient(135deg, #FF7E67, #F9A826)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px" }}>YX</span>
          </div>
        </div>

        <div className="hub-dock-nav">
          {NAV.map(item => {
            const isActive = active === item.id;
            return (
              <div
                key={item.id}
                className={`hub-dock-item${isActive ? ' active' : ''}`}
                style={isActive ? {
                  background: item.active,
                  borderColor: item.border,
                  color: item.text,
                  boxShadow: `0 0 20px ${item.glow}`,
                } : {}}
                onClick={() => setActive(item.id)}
                onMouseEnter={() => setTooltip(item.id)}
                onMouseLeave={() => setTooltip(null)}
              >
                <span className="hub-dock-icon">{item.icon}</span>
                {tooltip === item.id && (
                  <div className="hub-dock-tooltip">{item.label}</div>
                )}
                {isActive && (
                  <div style={{
                    position: 'absolute', right: '-8px', top: '25%', height: '50%',
                    width: '3px', background: item.text, borderRadius: '99px',
                    boxShadow: `0 0 8px ${item.text}`,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        <div className="hub-dock-footer">
          <div
            className="hub-dock-item"
            style={{ color: 'var(--rose)' }}
            onClick={onLogout}
            onMouseEnter={() => setTooltip('logout')}
            onMouseLeave={() => setTooltip(null)}
            title="Sign out"
          >
            <span className="hub-dock-icon"><LogOut size={24} /></span>
            {tooltip === 'logout' && <div className="hub-dock-tooltip">Sign Out</div>}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="hub-content">
        {renderPage()}
      </div>
    </div>
  );
}
