import React, { useState } from 'react';
import { api } from '../api/client';
import { marked } from 'marked';

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Swift', 'Kotlin', 'Ruby', 'SQL'];

const ACTIONS = [
  { id: 'debug',    label: '🐛 Debug',    color: 'active-rose' },
  { id: 'explain',  label: '📖 Explain',  color: 'active-cyan' },
  { id: 'optimize', label: '⚡ Optimize', color: 'active-amber' },
  { id: 'convert',  label: '🔄 Convert',  color: 'active-violet' },
  { id: 'test',     label: '🧪 Tests',    color: 'active-green' },
  { id: 'document', label: '📝 Docs',     color: 'active-cyan' },
];

const ACTION_PROMPTS = {
  debug:    'Debug this code. Find all bugs, errors, and issues. Explain each problem clearly and provide the fixed code:',
  explain:  'First, provide the exact expected output of this code if it were executed (show it in a code block). Then, explain this code step by step in simple terms:',
  optimize: 'Optimize this code for performance and readability. Explain each improvement:',
  test:     'Generate comprehensive unit tests covering edge cases and normal scenarios:',
  document: 'Add detailed docstrings, comments, and documentation following best practices:',
};

export default function CodePage({ user }) {
  const [code, setCode]           = useState('');
  const [language, setLanguage]   = useState('Python');
  const [targetLang, setTargetLang] = useState('JavaScript');
  const [action, setAction]       = useState('debug');
  const [output, setOutput]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [convId, setConvId]       = useState(null);
  const [copied, setCopied]       = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  async function runAction() {
    if (!code.trim() || loading) return;
    setLoading(true);
    try {
      let cid = convId;
      if (!cid) {
        const conv = await api.createConversation({ mode: 'code' });
        cid = conv.id; setConvId(cid);
      }
      const promptText = action === 'convert'
        ? `Convert this ${language} code to ${targetLang}. Provide clean, idiomatic code with explanations:\n\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``
        : `${ACTION_PROMPTS[action]}\n\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``;
      setOutput('');
      let fullText = '';
      const gen = api.streamMessage({ conversationId: cid, message: promptText, mode: 'code', files: [] });
      for await (const chunk of gen) {
        if (chunk.text) { fullText += chunk.text; setOutput(fullText); }
        if (chunk.isFinal && chunk.fullText) setOutput(chunk.fullText);
      }
    } catch (err) {
      setOutput('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function clearAll() { setCode(''); setOutput(''); setConvId(null); }

  const activeAction = ACTIONS.find(a => a.id === action);

  const getPreviewHtml = () => {
    if (!code) return '<!-- Write code to see preview -->';
    if (language === 'HTML') return code;
    
    if (language === 'JavaScript' || language === 'TypeScript') {
      const hasReact = code.includes('import React') || code.includes('export default') || code.includes('useState') || code.includes('className=');
      if (hasReact) {
        const cleanCode = code
          .replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '')
          .replace(/export\s+default\s+function\s+([a-zA-Z0-9_]+)/g, 'function $1');
          
        const match = code.match(/export\s+default\s+(?:function\s+)?([a-zA-Z0-9_]+)/);
        const compName = match ? match[1] : (code.includes('function App') ? 'App' : '');
        
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <style>body { font-family: sans-serif; padding: 20px; margin: 0; color: #333; }</style>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/babel">
              const { useState, useEffect, useMemo, useCallback, useRef } = React;
              ${cleanCode}
              
              ${compName ? `
              const root = ReactDOM.createRoot(document.getElementById('root'));
              root.render(<${compName} />);
              ` : `
              // Try to find any function that looks like a component and render it
              const compMatch = ${JSON.stringify(cleanCode)}.match(/function\\s+([A-Z][a-zA-Z0-9_]+)/);
              if (compMatch) {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                const Comp = eval(compMatch[1]);
                root.render(<Comp />);
              }
              `}
            </script>
          </body>
          </html>
        `;
      }
      return `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:20px;}</style></head><body><script>${code}</script></body></html>`;
    }
    return code;
  };

  return (
    <div className="tool-page code-page">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-icon" style={{ background: 'linear-gradient(135deg,#5C8A6B,#FF7E67)', boxShadow: '0 0 28px rgba(92, 138, 107,.3)' }}>💻</div>
        <div>
          <h1 className="tool-page-title">Code AI</h1>
          <p className="tool-page-sub">Debug, explain, optimize, convert &amp; test — all with AI</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="code-toolbar" style={{ animation: 'fade-up .5s .05s both' }}>
        <div className="code-lang-group">
          <label>Language</label>
          <select className="page-select" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        {action === 'convert' && (
          <div className="code-lang-group">
            <label>Convert To</label>
            <select className="page-select" value={targetLang} onChange={e => setTargetLang(e.target.value)}>
              {LANGUAGES.filter(l => l !== language).map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        )}
        <div className="code-actions-wrap">
          {ACTIONS.map(a => (
            <button
              key={a.id}
              className={`pill-tag ${action === a.id ? a.color : ''}`}
              onClick={() => setAction(a.id)}
            >{a.label}</button>
          ))}
        </div>
        <button className="icon-btn" onClick={clearAll} title="Clear all" style={{ color: 'var(--rose)' }}>🗑️</button>
      </div>

      {/* Split Pane */}
      <div className="code-split" style={{ animation: 'fade-up .5s .1s both' }}>
        {/* Editor */}
        <div className="code-pane editor-pane">
          <div className="code-pane-header">
            <span style={{ color: 'var(--t2)', fontWeight: 700 }}>📝 Your Code</span>
            <span className="code-pane-lang">{language}</span>
          </div>
          <textarea
            className="code-editor-textarea"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={`# Paste your ${language} code here...\n# Then pick an action and click Run AI`}
            spellCheck={false}
          />
          <div style={{ padding: '0 14px 14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="code-run-btn" onClick={runAction} disabled={!code.trim() || loading}>
              {loading
                ? <><div className="btn-spinner" style={{ borderTopColor: '#000' }} /><span>Processing...</span></>
                : <><span>▶</span><span>Run {activeAction?.label || 'AI'}</span></>}
            </button>
          </div>
        </div>

        {/* Output & Preview */}
        <div className="code-pane output-pane">
          <div className="code-pane-header" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card-h)', padding: '4px', borderRadius: '8px', border: '1px solid var(--b1)' }}>
              <button 
                onClick={() => setActiveTab('analysis')}
                style={{ 
                  background: activeTab === 'analysis' ? 'rgba(255, 126, 103,0.1)' : 'transparent', 
                  border: 'none', 
                  color: activeTab === 'analysis' ? 'var(--cyan)' : 'var(--t3)', 
                  fontWeight: 700, cursor: 'pointer', padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
              >🤖 AI Analysis</button>
              {(language === 'HTML' || language === 'JavaScript' || language === 'CSS') && (
                <button 
                  onClick={() => setActiveTab('preview')}
                  style={{ 
                    background: activeTab === 'preview' ? 'rgba(92, 138, 107,0.1)' : 'transparent', 
                    border: 'none', 
                    color: activeTab === 'preview' ? 'var(--green)' : 'var(--t3)', 
                    fontWeight: 700, cursor: 'pointer', padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
                    transition: 'all 0.2s'
                  }}
                >👁️ Live Preview</button>
              )}
            </div>
            {output && activeTab === 'analysis' && (
              <button className="code-copy-small-btn" onClick={copyOutput} style={{ marginLeft: 'auto' }}>
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            )}
          </div>
          <div className="code-output-area">
            {activeTab === 'preview' ? (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
                <iframe 
                  srcDoc={getPreviewHtml()} 
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Live Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <>
                {loading && !output && (
                  <div className="code-output-loading">
                    <div className="typing-dots"><span /><span /><span /></div>
                    <p style={{ fontSize: 13, color: 'var(--t3)' }}>Yaarax AI is analyzing your code...</p>
                  </div>
                )}
                {output ? (
                  <div 
                    className="file-md-output" 
                    style={{ padding: '0 8px' }}
                    dangerouslySetInnerHTML={{ __html: marked.parse(output) }} 
                  />
                ) : !loading ? (
                  <div className="code-output-empty">
                    <span>🤖</span>
                    <p>Select an action above and click <strong style={{ color: 'var(--green)' }}>Run AI</strong></p>
                    <p style={{ fontSize: 12, color: 'var(--t3)' }}>Supports debugging, explaining, optimizing, converting &amp; testing</p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
