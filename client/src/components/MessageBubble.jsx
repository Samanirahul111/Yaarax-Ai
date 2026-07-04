import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { AlertTriangle } from 'lucide-react';

// Configure marked once
marked.setOptions({ breaks: true, gfm: true });

// Custom renderer for code blocks
const renderer = new marked.Renderer();

renderer.code = (tokenOrCode, maybeLang) => {
  const isObj = typeof tokenOrCode === 'object' && tokenOrCode !== null;
  const rawCode = isObj ? tokenOrCode.text : tokenOrCode;
  const rawLang = isObj ? tokenOrCode.lang : maybeLang;
  const language = rawLang && hljs.getLanguage(rawLang) ? rawLang : 'plaintext';
  let highlighted = rawCode;
  try { highlighted = hljs.highlight(rawCode, { language }).value; } catch (e) { }
  return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span class="code-lang">${language}</span>
      <button class="code-copy-btn" data-code="${encodeURIComponent(rawCode)}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg> Copy
      </button>
    </div>
    <pre><code class="hljs language-${language}">${highlighted}</code></pre>
  </div>`;
};

renderer.image = ({ href, text }) => {
  return `<div class="media-container">
    <img src="${href}" alt="${text}" style="max-width:100%;border-radius:10px;margin:8px 0;" />
  </div>`;
};

marked.setOptions({ renderer });

function renderMarkdown(text) {
  let html = marked.parse(text || '');

  // 1. Image Generation support [GENERATE_IMAGE: prompt]
  html = html.replace(/\[\s*GENERATE_IMAGE\s*:\s*(.*?)\s*\]/gi, (_, prompt) => {
    // Generate a deterministic hash based on the prompt so the URL is completely stable
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = Math.imul(31, hash) + prompt.charCodeAt(i) | 0;
    }
    const stableSeed = Math.abs(hash);
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const url = `${API_BASE}/api/chat/image?prompt=${encodeURIComponent(prompt.trim())}&seed=${stableSeed}`;
    return `<div class="media-container generated-image">
      <img src="${url}" alt="${prompt}" loading="lazy" />
      <div class="media-label">AI Generated: ${prompt}</div>
    </div>`;
  });

  // 2. Video Generation support [GENERATE_VIDEO: prompt]
  html = html.replace(/\[\s*GENERATE_VIDEO\s*:\s*(.*?)\s*\]/gi, (_, prompt) => {
    return `<div class="media-container generated-video">
      <video src="https://www.w3schools.com/html/mov_bbb.mp4" controls autoplay loop></video>
      <div class="media-label">AI Video: ${prompt} (Preview)</div>
    </div>`;
  });

  // 3. MAP support [MAP_PLACE: place]
  html = html.replace(/\[MAP_PLACE:\s*(.*?)\]/gi, (_, place) => {
    const enc = encodeURIComponent(place.trim());
    return `<div class="map-container">
      <iframe src="https://maps.google.com/maps?q=${enc}&output=embed" width="100%" height="220" style="border:none;" loading="lazy"></iframe>
    </div>`;
  });

  // 4. Hide Memory tags [REMEMBER: k=v]
  html = html.replace(/\[\s*REMEMBER\s*:\s*.*?\s*\]/gi, '');

  return html;
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }) {
  const bubbleRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  function speakText() {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    // Strip markdown for cleaner TTS
    const cleanText = (message.content || '')
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[#*`_>]/g, '')
      .trim()
      .slice(0, 3000);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  useEffect(() => {
    if (!bubbleRef.current) return;
    const btns = bubbleRef.current.querySelectorAll('.code-copy-btn[data-code]');
    btns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const code = decodeURIComponent(btn.dataset.code);
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 2000);
        });
      };
    });
  }, [message.content]);

  // ── TYPING INDICATOR ──────────────────────────────────────────────────────
  if (message.role === 'typing') {
    return (
      <div className="message-row ai-row typing-row">
        <div className="msg-bubble-wrap">
          <div className="typing-dots"><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  // ── ERROR MESSAGE ─────────────────────────────────────────────────────────
  if (message.role === 'error') {
    return (
      <div className="message-row ai-row">
        <div className="msg-bubble-wrap">
          <div className="msg-bubble error-bubble">
            <AlertTriangle className="msg-error-icon" size={16} style={{marginRight: 6, marginBottom: -2}} />
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // ── USER MESSAGE ──────────────────────────────────────────────────────────
  if (message.role === 'user') {
    return (
      <div className="message-row user-row">
        <div className="msg-bubble-wrap">
          <div className="msg-sender">
            You <span className="sender-dot" style={{ background: 'var(--neon-violet)' }}></span>
          </div>
          <div className="msg-bubble user-bubble">{message.content}</div>
          <div className="msg-actions">
            <span className="msg-time">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── AI MESSAGE ────────────────────────────────────────────────────────────
  const grounding = message.grounding;
  const sources = grounding?.groundingChunks?.map(c => c.web).filter(Boolean) || [];

  return (
    <div className="message-row ai-row">
      <div className="msg-bubble-wrap">
        <div className="msg-sender">
          <span className="sender-dot"></span>
          Yaarax AI
        </div>

        {message.thinking && (
          <details className="thinking-block">
            <summary className="thinking-summary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '5px' }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
              </svg>
              Reasoning Chain
            </summary>
            <div className="thinking-content">{message.thinking}</div>
          </details>
        )}

        <div
          ref={bubbleRef}
          className={`msg-bubble ai-bubble ${message.isStreaming ? 'streaming' : ''}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />

        {sources.length > 0 && (
          <div className="grounding-sources">
            <div className="sources-label">Sources</div>
            <div className="sources-list">
              {sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="source-item">
                  <span className="source-index">{i + 1}</span>
                  <span className="source-title">{s.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="msg-actions">
          <button className="action-btn" onClick={() => navigator.clipboard.writeText(message.content)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </button>
          {window.speechSynthesis && (
            <button
              className={`action-btn ${isSpeaking ? 'tts-active' : ''}`}
              onClick={speakText}
              title={isSpeaking ? 'Stop reading' : 'Read aloud'}
            >
              {isSpeaking ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
              {isSpeaking ? 'Stop' : 'Read'}
            </button>
          )}
          <span className="msg-time">{formatTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
