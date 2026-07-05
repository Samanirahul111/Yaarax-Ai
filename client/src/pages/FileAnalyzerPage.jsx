import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { marked } from 'marked';
import {
  FileText, Image as ImageIcon, Music, BarChart2, Folder, X, Search,
  Copy, CheckCircle2, Lightbulb, Edit3, BrainCircuit, HelpCircle, Bot,
  FileSpreadsheet, FileCode, Upload, Sparkles, RefreshCw, AlertTriangle,
  ChevronDown, ChevronUp
} from 'lucide-react';

// ── Markdown renderer (same config as MessageBubble) ──────────────────────────
marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text) {
  try {
    return marked.parse(text || '');
  } catch (e) {
    return `<pre>${text}</pre>`;
  }
}

// ── File action definitions ────────────────────────────────────────────────────
const FILE_ACTIONS = [
  {
    id: 'explain',
    label: 'Explain',
    icon: <Lightbulb size={14} />,
    color: 'active-cyan',
    prompt: 'Please explain and summarize this document clearly. What is it about? What are the key topics, ideas, and concepts? Provide a structured breakdown with headings.',
  },
  {
    id: 'notes',
    label: 'Study Notes',
    icon: <Edit3 size={14} />,
    color: 'active-violet',
    prompt: 'Generate comprehensive, structured study notes from this document. Use clear headings (##), bullet points, highlight key terms in **bold**, and organize by topic.',
  },
  {
    id: 'quiz',
    label: 'Make Quiz',
    icon: <BrainCircuit size={14} />,
    color: 'active-amber',
    prompt: 'Create 5 multiple-choice questions based on this document. For each question: (1) the question, (2) four options labeled A-D, (3) the correct answer, (4) a brief explanation. Format them clearly with numbered headings.',
  },
  {
    id: 'summary',
    label: 'Summary',
    icon: <Sparkles size={14} />,
    color: 'active-green',
    prompt: 'Write a concise executive summary of this document in 3-5 paragraphs. Cover the main points, key findings, and important takeaways. Then list 5 bullet-point key highlights.',
  },
  {
    id: 'doubt',
    label: 'Ask Question',
    icon: <HelpCircle size={14} />,
    color: 'active-rose',
    prompt: null,
  },
];

// ── File type helpers ──────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function getFileIcon(type, name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type?.includes('pdf'))                                                       return <FileText size={28} style={{ color: '#D9534F' }} />;
  if (type?.startsWith('image/'))                                                  return <ImageIcon size={28} style={{ color: '#F9A826' }} />;
  if (type?.includes('audio'))                                                     return <Music size={28} style={{ color: '#5C8A6B' }} />;
  if (type?.includes('sheet') || type?.includes('excel') || ext === 'xlsx' || ext === 'xls' || ext === 'csv')
                                                                                   return <FileSpreadsheet size={28} style={{ color: '#5C8A6B' }} />;
  if (type?.includes('word') || ext === 'doc' || ext === 'docx')                  return <FileText size={28} style={{ color: '#5D7B9D' }} />;
  if (type?.includes('json') || type?.includes('javascript') || type?.includes('html') || type?.includes('xml'))
                                                                                   return <FileCode size={28} style={{ color: '#E3A857' }} />;
  if (type?.includes('text') || ext === 'txt' || ext === 'md')                    return <FileText size={28} style={{ color: '#FF7E67' }} />;
  return <Folder size={28} style={{ color: '#8b8ba8' }} />;
}

function getFileCategory(type, name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type?.includes('pdf'))                                                        return 'PDF Document';
  if (type?.startsWith('image/'))                                                   return 'Image File';
  if (type?.includes('audio'))                                                      return 'Audio File';
  if (ext === 'xlsx' || ext === 'xls' || type?.includes('sheet') || type?.includes('excel')) return 'Excel Spreadsheet';
  if (ext === 'csv' || type?.includes('csv'))                                       return 'CSV Data';
  if (ext === 'docx' || ext === 'doc' || type?.includes('word'))                   return 'Word Document';
  if (ext === 'json' || type?.includes('json'))                                     return 'JSON File';
  if (ext === 'xml' || type?.includes('xml'))                                       return 'XML File';
  if (ext === 'md')                                                                  return 'Markdown File';
  if (type?.includes('text') || ext === 'txt')                                      return 'Text File';
  if (type?.includes('html'))                                                        return 'HTML File';
  return type || 'Unknown File';
}

// ── Simple DOCX text extractor ────────────────────────────────────────────────
async function extractDocxText(arrayBuffer) {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let raw = decoder.decode(uint8);

    // Extract text between XML word text tags
    const matches = [...raw.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    if (matches.length > 0) {
      return matches.map(m => m[1]).join(' ').trim();
    }

    // Fallback: grab readable ASCII text
    const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();
    const words = readable.split(/\s+/).filter(w => w.length > 2 && /^[a-zA-Z]/.test(w));
    if (words.length > 30) return words.join(' ');
  } catch (e) {
    console.warn('DOCX extraction failed:', e);
  }
  return null;
}

// ── Client-side file content extractor ────────────────────────────────────────
async function extractFileContent(file) {
  const type = file.type || '';
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  // PDFs, Images, & Audio — these require proper server-side or native AI vision handling
  if (type.includes('pdf') || ext === 'pdf' || type.startsWith('image/') || type.includes('audio')) {
    return { extractedText: null, isNativeFile: true };
  }

  // Text-based files
  const textExts = ['txt','md','csv','json','xml','js','ts','jsx','tsx','py','java',
                    'cpp','c','h','cs','go','rb','php','sql','sh','bash','yaml','yml',
                    'toml','ini','log','env','html','css','scss','sass','less','vue','svelte'];
  if (
    type.includes('text') || type.includes('json') || type.includes('xml') ||
    type.includes('csv') || type.includes('javascript') || type.includes('html') ||
    type.includes('css') || textExts.includes(ext)
  ) {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
    return { extractedText: text.slice(0, 60000), isNativeFile: false };
  }

  // Word documents
  if (ext === 'docx' || type.includes('word') || type.includes('wordprocessingml')) {
    try {
      const buf = await file.arrayBuffer();
      const text = await extractDocxText(buf);
      if (text && text.length > 30) {
        return { extractedText: text.slice(0, 60000), isNativeFile: false };
      }
    } catch (e) { /* ignore */ }
    // Fallback to native Gemini
    return { extractedText: null, isNativeFile: true };
  }

  // Excel files
  if (ext === 'xlsx' || ext === 'xls' || type.includes('sheet') || type.includes('excel')) {
    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const content = e.target.result || '';
          const readable = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          resolve(readable);
        };
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      });
      if (text.length > 50) {
        return { extractedText: `[Excel: ${file.name}]\n\nContent:\n${text.slice(0, 30000)}`, isNativeFile: false };
      }
    } catch (e) { /* ignore */ }
    return { extractedText: null, isNativeFile: true };
  }

  // Last resort: try reading as text
  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
    if (text.trim().length > 20) {
      return { extractedText: text.slice(0, 60000), isNativeFile: false };
    }
  } catch (e) { /* ignore */ }

  return { extractedText: null, isNativeFile: true };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FileAnalyzerPage() {
  const [file, setFile]                   = useState(null);
  const [fileData, setFileData]           = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [isNativeFile, setIsNativeFile]   = useState(false);
  const [action, setAction]               = useState('explain');
  const [customQ, setCustomQ]             = useState('');
  const [output, setOutput]               = useState('');
  const [loading, setLoading]             = useState(false);
  const [loadingStage, setLoadingStage]   = useState('');
  const [convId, setConvId]               = useState(null);
  const [dragging, setDragging]           = useState(false);
  const [copied, setCopied]               = useState(false);
  const [error, setError]                 = useState(null);
  const [processing, setProcessing]       = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const outputRef                          = useRef(null);
  const fileInputRef                       = useRef(null);

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);



  async function handleFile(f) {
    if (!f) return;
    setProcessing(true);
    setError(null);
    setOutput('');
    setConvId(null);
    setExtractedText(null);
    setIsNativeFile(false);
    setFileData(null);

    try {
      const { extractedText: text, isNativeFile: native } = await extractFileContent(f);

      let dataUrl = null;
      if (native || !text) {
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      }

      setFile({ name: f.name, type: f.type, size: f.size });
      setFileData(dataUrl);
      setExtractedText(text);
      setIsNativeFile(native);
    } catch (err) {
      setError('Failed to read file: ' + err.message);
    } finally {
      setProcessing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function analyze() {
    if ((!fileData && !extractedText) || loading) return;
    setLoading(true);
    setError(null);
    setOutput('');

    try {
      let cid = convId;
      if (!cid) {
        setLoadingStage('Initializing session...');
        const conv = await api.createConversation({ mode: 'file' });
        cid = conv.id;
        setConvId(cid);
      }

      const selectedAction = FILE_ACTIONS.find(a => a.id === action);
      let messageText = action === 'doubt'
        ? (customQ.trim() || 'What can you tell me about this document?')
        : selectedAction.prompt;

      let filesPayload = [];

      if (extractedText && !isNativeFile) {
        // Inject file content directly into the prompt
        messageText = `I have uploaded a file named "${file.name}" (${getFileCategory(file.type, file.name)}).\n\nHere is the complete content:\n\n---\n${extractedText}\n---\n\n${messageText}`;
        setLoadingStage('Analyzing text content...');
      } else if (fileData && isNativeFile) {
        filesPayload = [{ name: file.name, type: file.type, size: file.size, data: fileData }];
        setLoadingStage('Processing with AI vision...');
      } else {
        setLoadingStage('Analyzing...');
      }

      let fullText = '';
      let serverError = null;

      const gen = api.streamMessage({
        conversationId: cid,
        message: messageText,
        mode: 'file',
        files: filesPayload.length > 0 ? filesPayload : undefined,
      });

      setLoadingStage(filesPayload.length > 0 ? 'Processing file with AI...' : 'Generating response...');
      for await (const chunk of gen) {
        if (chunk.error) {
          serverError = chunk.error;
          setError(chunk.error);
          break;
        }
        if (chunk.text) {
          fullText += chunk.text;
          setOutput(fullText);
          // Clear loading stage once we start getting real output
          if (loadingStage) setLoadingStage('');
        }
        if (chunk.isFinal && chunk.fullText) {
          setOutput(chunk.fullText);
          fullText = chunk.fullText;
        }
      }

      if (!fullText && !serverError) {
        setError('No response received. The AI service may be busy — please try again in a moment.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetFile() {
    setFile(null); setFileData(null); setExtractedText(null);
    setIsNativeFile(false); setOutput(''); setConvId(null);
    setError(null); setCustomQ(''); setShowExtracted(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const canAnalyze = !!file && (!!fileData || !!extractedText);

  return (
    <div className="tool-page file-analyzer-page">

      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-icon" style={{
          background: 'linear-gradient(135deg,#E3A857,#D9534F)',
          boxShadow: '0 0 28px rgba(227, 168, 87,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <FileText color="white" size={26} />
        </div>
        <div>
          <h1 className="tool-page-title">File Analyzer</h1>
          <p className="tool-page-sub">Upload any file — AI explains, summarizes, quizzes & answers your questions</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`file-drop-zone ${dragging ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && !processing && fileInputRef.current?.click()}
        style={{ animation: 'fade-up .5s .05s both' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          accept="image/*,application/pdf,audio/*,text/*,.doc,.docx,.csv,.xlsx,.xls,.json,.xml,.md,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.html,.css,.sql,.yaml,.yml,.log"
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
        />

        {processing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0' }}>
            <div className="btn-spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'rgba(227, 168, 87,.2)', borderTopColor: 'var(--amber)' }} />
            <span style={{ color: 'var(--t2)', fontSize: 14 }}>Reading file...</span>
          </div>
        ) : file ? (
          <div className="file-info-card">
            <div className="file-info-icon">{getFileIcon(file.type, file.name)}</div>
            <div className="file-info-meta">
              <div className="file-info-name">{file.name}</div>
              <div className="file-info-size">
                {formatSize(file.size)} &middot; {getFileCategory(file.type, file.name)}
                {extractedText && (
                  <span style={{ marginLeft: 8, color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>
                    &#x2713; Text extracted ({extractedText.length.toLocaleString()} chars)
                  </span>
                )}
                {isNativeFile && (
                  <span style={{ marginLeft: 8, color: 'var(--cyan)', fontSize: 11, fontWeight: 700 }}>
                    &#x2713; AI Vision ready
                  </span>
                )}
              </div>
            </div>
            <button className="file-remove-btn" onClick={e => { e.stopPropagation(); resetFile(); }} title="Remove file">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="file-drop-icon"><Upload size={48} style={{ opacity: 0.4 }} /></div>
            <div className="file-drop-title">Drop your file here</div>
            <div className="file-drop-sub">PDF &middot; Images &middot; Audio &middot; CSV &middot; Excel &middot; JSON &middot; Word &middot; Code &mdash; Click to browse</div>
          </>
        )}
      </div>

      {/* Extracted text preview */}
      {file && extractedText && !isNativeFile && (
        <div style={{
          background: 'rgba(92, 138, 107,.05)', border: '1px solid rgba(92, 138, 107,.18)',
          borderRadius: 'var(--r3)', marginBottom: 18, overflow: 'hidden',
          animation: 'fade-up .35s var(--smooth) both'
        }}>
          <button
            onClick={() => setShowExtracted(v => !v)}
            style={{
              width: '100%', background: 'none', border: 'none', color: 'var(--green)',
              padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontWeight: 700, fontSize: 12.5
            }}
          >
            <span>&#x1F4C4; File content extracted &mdash; {extractedText.length.toLocaleString()} characters ready for AI</span>
            {showExtracted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showExtracted && (
            <pre style={{
              padding: '0 16px 14px', fontSize: 12, color: 'var(--t3)',
              maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0,
              borderTop: '1px solid rgba(92, 138, 107,.1)'
            }}>
              {extractedText.slice(0, 2000)}{extractedText.length > 2000 ? '\n...(preview truncated)' : ''}
            </pre>
          )}
        </div>
      )}

      {/* Action Bar */}
      {canAnalyze && (
        <div className="file-action-bar" style={{ animation: 'fade-up .4s both' }}>
          <span className="tool-section-label">What do you want to do?</span>
          <div className="file-action-buttons">
            {FILE_ACTIONS.map(a => (
              <button
                key={a.id}
                className={`pill-tag ${action === a.id ? a.color : ''}`}
                onClick={() => setAction(a.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>

          {action === 'doubt' && (
            <input
              className="file-doubt-input"
              placeholder="Type your question about the file..."
              value={customQ}
              onChange={e => setCustomQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) analyze(); }}
              autoFocus
            />
          )}

          <button
            className="page-btn-primary btn-amber"
            onClick={analyze}
            disabled={loading || !canAnalyze}
          >
            {loading ? (
              <>
                <div className="btn-spinner" style={{ borderTopColor: '#000' }} />
                <span>{loadingStage || 'Analyzing...'}</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>Analyze File</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(217, 83, 79,.08)', border: '1px solid rgba(217, 83, 79,.22)',
          borderRadius: 'var(--r3)', padding: '14px 18px', marginBottom: 18,
          animation: 'fade-up .3s both'
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--rose)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--rose)', fontSize: 13.5, marginBottom: 4 }}>Analysis Failed</div>
            <div style={{ color: 'var(--t2)', fontSize: 13 }}>{error}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t3)' }}>
              Tip: Ensure your Gemini or Groq API key is configured in Settings. For Word/Excel files, the file must not be password-protected.
            </div>
          </div>
          <button
            onClick={() => { setError(null); if (canAnalyze) analyze(); }}
            style={{ background: 'rgba(217, 83, 79,.12)', border: '1px solid rgba(217, 83, 79,.25)', color: 'var(--rose)', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Output Area */}
      {(output || (loading && !output)) && (
        <div className="file-output-area">
          <div className="file-output-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Bot size={18} style={{ color: 'var(--amber)' }} />
              AI Analysis
              {loading && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <div className="btn-spinner" style={{ width: 13, height: 13, borderWidth: 2, borderColor: 'rgba(227, 168, 87,.2)', borderTopColor: 'var(--amber)' }} />
                  <span style={{ color: 'var(--t3)', fontSize: 12, fontWeight: 400 }}>{loadingStage}</span>
                </span>
              )}
            </span>
            {output && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="code-copy-small-btn" onClick={copyOutput}>
                  {copied
                    ? <><CheckCircle2 size={13} style={{ marginRight: 4, marginBottom: -2, color: 'var(--green)' }} />Copied!</>
                    : <><Copy size={13} style={{ marginRight: 4, marginBottom: -2 }} />Copy</>
                  }
                </button>
                <button
                  className="code-copy-small-btn"
                  onClick={() => { setOutput(''); setConvId(null); setTimeout(analyze, 100); }}
                  title="Re-analyze"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="file-output-content" ref={outputRef} style={{ minHeight: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            {loading && !output && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
                <div className="typing-dots"><span /><span /><span /></div>
                <div style={{ color: 'var(--t3)', fontSize: 13, marginTop: 6 }}>
                  {loadingStage || 'Analyzing your file...'}
                </div>
              </div>
            )}
            {output && (
              <div
                className="file-md-output"
                style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--t1)' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(output) }}
              />
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!file && !output && !processing && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '40px 20px', color: 'var(--t3)', gap: 20, textAlign: 'center',
          animation: 'fade-up .6s .2s both'
        }}>
          <div style={{ display: 'flex', gap: 24, opacity: .22 }}>
            <FileText size={52} />
            <FileSpreadsheet size={52} />
            <ImageIcon size={52} />
            <Music size={52} />
          </div>
          <div style={{ maxWidth: 500 }}>
            <p style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--t2)', marginBottom: 12 }}>Supports all major file formats</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
              {['PDF','Images (JPG/PNG)','Audio (MP3)','Word (.docx)','Excel (.xlsx)','CSV','JSON','Code files (.py, .js...)','Markdown','Text files'].map(t => (
                <span key={t} style={{ background: 'var(--bg-card)', border: '1px solid var(--b1)', borderRadius: 99, padding: '4px 12px', color: 'var(--t3)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
