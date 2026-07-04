import React, { useState } from 'react';
import iconLogo from '../assets/icons/yaarax_ai_logo.png';
import { Plus, Search, MessageSquare, Trash2, Settings, LogOut } from 'lucide-react';

export default function Sidebar({
  conversations, activeConvId, isOpen,
  user, onSelect, onNewChat, onDelete,
  onSettings, onLogout, onClose
}) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(iso) {
    const d    = new Date(iso);
    const now  = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return `${diff}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-text">Yaarax AI</span>
        </div>
        <button className="new-chat-btn" onClick={onNewChat} title="New chat">
          <Plus size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search chats…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="sidebar-section-label">Recent</div>
      <div className="conversations-list">
        {filtered.length === 0 ? (
          <div className="empty-convs">
            <div className="empty-convs-icon">{search ? <Search size={24} /> : <MessageSquare size={24} />}</div>
            <div>{search ? 'No matches found' : 'No chats yet.\nStart a conversation!'}</div>
          </div>
        ) : (
          filtered.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeConvId ? 'active' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="conv-icon"><MessageSquare size={16} /></div>
              <div className="conv-meta">
                <div className="conv-title">{conv.title}</div>
                <div className="conv-date">{formatDate(conv.updated_at)}</div>
              </div>
              <button
                className="conv-delete"
                onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-card" onClick={onSettings}>
          <div className="user-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{user.username}</span>
            <span className="user-plan">Yaarax AI Pro ⚡</span>
          </div>
          <button className="settings-btn" title="Settings">
            <Settings size={18} />
          </button>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
