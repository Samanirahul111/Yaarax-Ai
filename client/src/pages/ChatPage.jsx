import React, { useState, useEffect, useCallback, useRef } from 'react';
import iconLogo from '../assets/icons/yaarax_ai_logo.png';
import { api } from '../api/client';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import SettingsModal from '../components/SettingsModal';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { AnimatedBrandSequence } from '../components/Background3D';
const MODES = {
  auto: { label: '🤖 Auto', id: 'auto' },
  exam: { label: '📝 Exam', id: 'exam' },
  tutor: { label: '🎓 Tutor', id: 'tutor' },
  code: { label: '💻 Code', id: 'code' },
  image: { label: '🎨 Image', id: 'image' },
  video: { label: '🎥 Video', id: 'video' },
};

const QUICK_PROMPTS = [
  { icon: '💻', title: 'Debug Code', desc: 'Fix & explain with examples', prompt: 'Explain the concept of recursion in programming with a simple Python example' },
  { icon: '📚', title: 'Study Plan', desc: '30-day Python learning path', prompt: 'Help me create a 30-day study plan for learning Python from scratch' },
  { icon: '🧮', title: 'Solve Math', desc: 'Step-by-step solution', prompt: 'Solve this step by step: What is the derivative of x³ + 2x² - 5x + 3?' },
  { icon: '📝', title: 'Exam Prep', desc: 'Data structures quick notes', prompt: 'Give me concise exam notes on: Arrays, Linked Lists, Stacks, and Queues' },
];

const CAPABILITY_CHIPS = [
  '🧠 Think Mode', '🔍 Web Search', '🎨 Image Gen', '💻 Code AI',
  '📄 File Analyzer', '🎬 Video Gen', '📅 Assistant',
];

export default function ChatPage({ user, onUpdateUser, onLogout, initialMode = 'auto' }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);
  const [theme, setTheme] = useState(() => localStorage.getItem('yaarax_theme') || 'dark');

  // Sync mode if initialMode changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yaarax_theme', theme);
  }, [theme]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const area = document.getElementById('messagesArea');
    if (area) area.scrollTop = area.scrollHeight;
  }, [messages]);

  async function loadConversations() {
    try {
      const data = await api.getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }

  async function loadConversation(id) {
    setActiveConvId(id);
    setLoadingMsgs(true);
    setSidebarOpen(false);
    try {
      const { messages: msgs } = await api.getMessages(id);
      setMessages(msgs || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function startNewChat() {
    setActiveConvId(null);
    setMessages([]);
    setSidebarOpen(false);
  }

  async function deleteConversation(id) {
    if (!confirm('Delete this conversation?')) return;
    await api.deleteConversation(id);
    if (activeConvId === id) startNewChat();
    setConversations(prev => prev.filter(c => c.id !== id));
  }

  async function clearChat() {
    if (!activeConvId) return;
    if (!confirm('Clear all messages in this conversation?')) return;
    await api.clearMessages(activeConvId);
    setMessages([]);
  }

  const handleSend = useCallback(async (text, files = []) => {
    if ((!text.trim() && files.length === 0) || isGenerating) return;

    setIsGenerating(true);
    let convId = activeConvId;

    if (!convId) {
      try {
        const conv = await api.createConversation({ mode });
        convId = conv.id;
        setActiveConvId(convId);
        setConversations(prev => [conv, ...prev]);
      } catch (err) {
        setIsGenerating(false);
        addErrorMessage('Failed to create conversation: ' + err.message);
        return;
      }
    }

    let displayContent = text;
    if (files.length > 0) {
      displayContent = `[Attached ${files.length} file(s)] ` + text;
    }

    // Optimistically add user message
    const tempUserMsg = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: displayContent,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // AI Message Placeholder
    const aiMsgId = 'ai-' + Date.now();
    const tempAiMsg = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true
    };
    setMessages(prev => [...prev, tempAiMsg]);

    try {
      let fullText = '';
      let groundingResult = null;

      const generator = api.streamMessage({
        conversationId: convId,
        message: text,
        mode,
        files
      });

      for await (const chunk of generator) {
        if (chunk.error) throw new Error(chunk.error);

        if (chunk.text) {
          fullText += chunk.text;
        }
        if (chunk.thinking) {
          // Append thinking content for DeepSeek R1 reasoning
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, thinking: (m.thinking || '') + chunk.thinking } : m
          ));
        }
        if (chunk.grounding) {
          groundingResult = chunk.grounding;
        }
        if (chunk.isFinal && chunk.fullText) {
          fullText = chunk.fullText;
        }

        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: fullText, grounding: groundingResult } : m
        ));
      }

      // Finalize message
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, isStreaming: false } : m
      ));

      loadConversations();

    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
      addErrorMessage(err.message || 'Streaming failed');
    } finally {
      setIsGenerating(false);
    }
  }, [activeConvId, isGenerating, mode]);

  function addErrorMessage(text) {
    setMessages(prev => [...prev, {
      id: 'err-' + Date.now(),
      role: 'error',
      content: text,
      created_at: new Date().toISOString(),
    }]);
  }

  const activeConv = conversations.find(c => c.id === activeConvId);
  const hasMessages = messages.length > 0;

  const MODES_LIST = [
    { id: 'auto', label: '🤖 Auto' },
    { id: 'exam', label: '📝 Exam' },
    { id: 'tutor', label: '🎓 Tutor' },
    { id: 'code', label: '💻 Code' },
    { id: 'think', label: '🧠 Think' },
    { id: 'search', label: '🔍 Search' },
    { id: 'free', label: '🆓 Free' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        isOpen={sidebarOpen}
        user={user}
        onSelect={loadConversation}
        onNewChat={startNewChat}
        onDelete={deleteConversation}
        onSettings={() => setShowSettings(true)}
        onLogout={onLogout}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main Area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-btn" onClick={() => setSidebarOpen(s => !s)} title="Menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="topbar-title">{activeConv ? activeConv.title : '✨ New Chat'}</span>
          </div>
          <div className="topbar-right">
            <div className="mode-badge">{MODES_LIST.find(m => m.id === mode)?.label || '🤖 Auto'}</div>
            {activeConvId && (
              <button className="topbar-action-btn" onClick={clearChat} title="Clear chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            )}
            <button className="topbar-action-btn" onClick={() => setShowSettings(true)} title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Chat Window */}
        <div className="chat-window">
          {!hasMessages && !loadingMsgs ? (
            <div className="welcome-screen">
              <div style={{ width: '100%', height: '350px', marginBottom: '-70px', marginTop: '-40px' }}>
                <Canvas camera={{ position: [0, 0, 3.5], fov: 60 }}>
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
                  <pointLight position={[-10, -10, -10]} intensity={1.5} color="#FF7E67" />
                  <Environment preset="city" />
                  <AnimatedBrandSequence />
                </Canvas>
              </div>
              <h1 className="welcome-title">Hey, {user.username}! 👋</h1>
              <div className="welcome-chips">
                {CAPABILITY_CHIPS.map((chip, i) => (
                  <span key={i} className="welcome-chip">{chip}</span>
                ))}
              </div>
              <div className="quick-prompts">
                {QUICK_PROMPTS.map((q, i) => (
                  <div key={i} className="quick-card" onClick={() => handleSend(q.prompt)}>
                    <div className="quick-card-icon">{q.icon}</div>
                    <div className="quick-card-title">{q.title}</div>
                    <div className="quick-card-desc">{q.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-messages" id="messagesArea">
              {loadingMsgs && (
                <div className="message-row ai-row">
                  <div className="msg-bubble-wrap">
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          )}

          {/* Floating Input */}
          <InputBar
            onSend={handleSend}
            disabled={isGenerating}
            mode={mode}
            onModeChange={setMode}
          />
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setShowSettings(false)}
          user={user}
          onUpdateUser={onUpdateUser}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}



