import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { marked } from 'marked';
import {
  FileText, Briefcase, Star, Search, BrainCircuit, MessageSquare,
  HelpCircle, Copy, CheckCircle2, Bot, Upload, RefreshCw, AlertTriangle,
  ChevronDown, ChevronUp, X
} from 'lucide-react';

// ── Markdown renderer ────────────────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text) {
  try {
    return marked.parse(text || '');
  } catch (e) {
    return `<pre>${text}</pre>`;
  }
}

// ── Action definitions ───────────────────────────────────────────────────────
const RESUME_ACTIONS = [
  {
    id: 'rating',
    label: 'Overall Rating',
    icon: <Star size={14} />,
    color: 'active-cyan',
    prompt: 'Please analyze this resume/CV and provide an overall rating out of 10 based on structure, clarity, and impact. Provide a brief summary of the candidate. Then, provide detailed feedback on its strengths and specific areas for improvement. Format the output with clear headings and bullet points.',
  },
  {
    id: 'ats',
    label: 'ATS Check',
    icon: <Search size={14} />,
    color: 'active-violet',
    prompt: 'Analyze this resume for Applicant Tracking System (ATS) compatibility. Identify if the structure is ATS-friendly, point out any formatting issues that might confuse an ATS, and suggest specific improvements to increase its pass rate.',
  },
  {
    id: 'skills',
    label: 'Skill Analysis',
    icon: <BrainCircuit size={14} />,
    color: 'active-amber',
    prompt: 'Extract all skills mentioned in this resume. Categorize them clearly (e.g., Technical, Soft Skills, Tools/Technologies). Based on the candidate\'s profile, suggest 3-5 relevant missing skills that would be highly beneficial for a typical role matching this profile.',
  },
  {
    id: 'interview',
    label: 'Interview Prep',
    icon: <MessageSquare size={14} />,
    color: 'active-green',
    prompt: 'Based on the experience and skills in this resume, generate 5 challenging and specific interview questions a recruiter or hiring manager might ask this candidate. Provide brief tips on how the candidate should answer each question.',
  },
  {
    id: 'custom',
    label: 'Ask Question',
    icon: <HelpCircle size={14} />,
    color: 'active-rose',
    prompt: null,
  },
];

// ── File type helpers ────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function getFileCategory(type, name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type?.includes('pdf') || ext === 'pdf') return 'PDF Resume';
  if (type?.includes('word') || ext === 'docx' || ext === 'doc') return 'Word Resume';
  if (type?.includes('text') || ext === 'txt') return 'Text Resume';
  return 'Resume File';
}

// ── Simple DOCX text extractor ───────────────────────────────────────────────
async function extractDocxText(arrayBuffer) {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let raw = decoder.decode(uint8);

    const matches = [...raw.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    if (matches.length > 0) {
      return matches.map(m => m[1]).join(' ').trim();
    }

    const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();
    const words = readable.split(/\s+/).filter(w => w.length > 2 && /^[a-zA-Z]/.test(w));
    if (words.length > 30) return words.join(' ');
  } catch (e) {
    console.warn('DOCX extraction failed:', e);
  }
  return null;
}

// ── Client-side file content extractor ───────────────────────────────────────
async function extractFileContent(file) {
  const type = file.type || '';
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (type.includes('pdf') || ext === 'pdf' || type.startsWith('image/')) {
    return { extractedText: null, isNativeFile: true };
  }

  if (type.includes('text') || ext === 'txt' || ext === 'md') {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
    return { extractedText: text.slice(0, 60000), isNativeFile: false };
  }

  if (ext === 'docx' || type.includes('word') || type.includes('wordprocessingml')) {
    try {
      const buf = await file.arrayBuffer();
      const text = await extractDocxText(buf);
      if (text && text.length > 30) {
        return { extractedText: text.slice(0, 60000), isNativeFile: false };
      }
    } catch (e) { /* ignore */ }
    return { extractedText: null, isNativeFile: true };
  }

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

// ── Main Component ───────────────────────────────────────────────────────────
export default function ResumeAnalyzerPage() {
  const [file, setFile]                   = useState(null);
  const [fileData, setFileData]           = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [isNativeFile, setIsNativeFile]   = useState(false);
  const [action, setAction]               = useState('rating');
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
  const [pastedText, setPastedText]       = useState('');
  const [usePasted, setUsePasted]         = useState(false);
  const outputRef                          = useRef(null);
  const fileInputRef                       = useRef(null);

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const resetFile = () => {
    setFile(null);
    setFileData(null);
    setExtractedText(null);
    setIsNativeFile(false);
    setOutput('');
    setConvId(null);
    setUsePasted(false);
    setPastedText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  async function handleFile(f) {
    if (!f) return;
    setProcessing(true);
    setError(null);
    setOutput('');
    setConvId(null);
    setExtractedText(null);
    setIsNativeFile(false);
    setFileData(null);
    setUsePasted(false);

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
    if ((!fileData && !extractedText && (!usePasted || !pastedText.trim())) || loading) return;
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

      const selectedAction = RESUME_ACTIONS.find(a => a.id === action);
      let messageText = action === 'custom'
        ? (customQ.trim() || 'Please analyze this resume.')
        : selectedAction.prompt;

      let filesPayload = [];

      if (usePasted && pastedText.trim()) {
        messageText = `Here is the pasted text of a resume/CV:\n\n---\n${pastedText}\n---\n\n${messageText}`;
        setLoadingStage('Analyzing text content...');
      } else if (extractedText && !isNativeFile) {
        messageText = `I have uploaded a resume/CV file named "${file.name}" (${getFileCategory(file.type, file.name)}).\n\nHere is the complete extracted text:\n\n---\n${extractedText}\n---\n\n${messageText}`;
        setLoadingStage('Analyzing text content...');
      } else if (fileData && isNativeFile) {
        filesPayload = [{ name: file.name, type: file.type, size: file.size, data: fileData }];
        setLoadingStage('Processing resume document...');
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

      setLoadingStage(filesPayload.length > 0 ? 'Processing document with AI...' : 'Generating feedback...');
      for await (const chunk of gen) {
        if (chunk.error) {
          serverError = chunk.error;
          setError(chunk.error);
          break;
        }
        if (chunk.text) {
          fullText += chunk.text;
          setOutput(fullText);
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
    setError(null); setCustomQ(''); setShowExtracted(false); setUsePasted(false); setPastedText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const canAnalyze = (!!file && (!!fileData || !!extractedText)) || (usePasted && !!pastedText.trim());

  return (
    <div className="tool-page file-analyzer-page">
      <div className="tool-page-header">
        <div className="tool-page-icon" style={{
          background: 'linear-gradient(135deg,#5D7B9D,#2dd4bf)',
          boxShadow: '0 0 28px rgba(93, 123, 157,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Briefcase color="white" size={26} />
        </div>
        <div>
          <h1 className="tool-page-title">Resume AI Analyzer</h1>
          <p className="tool-page-sub">Upload your CV/Resume to get expert ratings, ATS optimization, and skill analysis.</p>
        </div>
      </div>

      {!usePasted && !file && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => setUsePasted(true)} 
            style={{ 
              background: 'transparent', border: '1px solid var(--b1)', color: 'var(--t2)',
              padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Or paste resume text instead
          </button>
        </div>
      )}

      {usePasted ? (
        <div style={{ position: 'relative', marginBottom: 20, animation: 'fade-up .4s both' }}>
           <textarea
             placeholder="Paste the full text of your resume or portfolio here..."
             value={pastedText}
             onChange={e => setPastedText(e.target.value)}
             style={{
               width: '100%', height: 200, background: 'var(--bg-card)', border: '1px solid var(--b2)',
               borderRadius: 'var(--r3)', padding: 16, color: 'var(--t1)', fontSize: 14, resize: 'vertical'
             }}
           />
           <button 
             onClick={resetFile}
             style={{
               position: 'absolute', top: 12, right: 12, background: 'rgba(217, 83, 79,.1)', 
               color: 'var(--rose)', border: 'none', borderRadius: 99, padding: 6, cursor: 'pointer'
             }}
           >
             <X size={16} />
           </button>
        </div>
      ) : (
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
            accept="application/pdf,.doc,.docx,.txt"
            onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
          />

          {processing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0' }}>
              <div className="btn-spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'rgba(93, 123, 157,.2)', borderTopColor: 'var(--blue)' }} />
              <span style={{ color: 'var(--t2)', fontSize: 14 }}>Reading resume...</span>
            </div>
          ) : file ? (
            <div className="file-info-card">
              <div className="file-info-icon"><FileText size={28} style={{ color: '#5D7B9D' }} /></div>
              <div className="file-info-meta">
                <div className="file-info-name">{file.name}</div>
                <div className="file-info-size">
                  {formatSize(file.size)} &middot; {getFileCategory(file.type, file.name)}
                  {extractedText && (
                    <span style={{ marginLeft: 8, color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>
                      &#x2713; Text ready
                    </span>
                  )}
                  {isNativeFile && (
                    <span style={{ marginLeft: 8, color: 'var(--cyan)', fontSize: 11, fontWeight: 700 }}>
                      &#x2713; Document ready
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
              <div className="file-drop-title">Drop your resume here</div>
              <div className="file-drop-sub">PDF &middot; DOCX &middot; TXT &mdash; Click to browse</div>
            </>
          )}
        </div>
      )}

      {file && extractedText && !isNativeFile && (
        <div style={{
          background: 'rgba(93, 123, 157,.05)', border: '1px solid rgba(93, 123, 157,.18)',
          borderRadius: 'var(--r3)', marginBottom: 18, overflow: 'hidden',
          animation: 'fade-up .35s var(--smooth) both'
        }}>
          <button
            onClick={() => setShowExtracted(v => !v)}
            style={{
              width: '100%', background: 'none', border: 'none', color: 'var(--blue)',
              padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontWeight: 700, fontSize: 12.5
            }}
          >
            <span>&#x1F4C4; Resume content extracted &mdash; {extractedText.length.toLocaleString()} characters</span>
            {showExtracted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showExtracted && (
            <pre style={{
              padding: '0 16px 14px', fontSize: 12, color: 'var(--t3)',
              maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0,
              borderTop: '1px solid rgba(93, 123, 157,.1)'
            }}>
              {extractedText.slice(0, 2000)}{extractedText.length > 2000 ? '\n...(preview truncated)' : ''}
            </pre>
          )}
        </div>
      )}

      {canAnalyze && (
        <div className="file-action-bar" style={{ animation: 'fade-up .4s both' }}>
          <span className="tool-section-label">Select Analysis Type:</span>
          <div className="file-action-buttons">
            {RESUME_ACTIONS.map(a => (
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

          {action === 'custom' && (
            <input
              className="file-doubt-input"
              placeholder="Ask anything about this resume..."
              value={customQ}
              onChange={e => setCustomQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) analyze(); }}
              autoFocus
            />
          )}

          <button
            className="page-btn-primary btn-cyan"
            style={{ background: 'var(--blue)', boxShadow: '0 8px 24px rgba(93, 123, 157,0.3)' }}
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
                <Briefcase size={18} />
                <span>Analyze Resume</span>
              </>
            )}
          </button>
        </div>
      )}

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
          </div>
          <button
            onClick={() => { setError(null); if (canAnalyze) analyze(); }}
            style={{ background: 'rgba(217, 83, 79,.12)', border: '1px solid rgba(217, 83, 79,.25)', color: 'var(--rose)', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {(output || (loading && !output)) && (
        <div className="file-output-area">
          <div className="file-output-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Bot size={18} style={{ color: 'var(--blue)' }} />
              Resume AI Feedback
              {loading && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <div className="btn-spinner" style={{ width: 13, height: 13, borderWidth: 2, borderColor: 'rgba(93, 123, 157,.2)', borderTopColor: 'var(--blue)' }} />
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
                  {loadingStage || 'Reviewing resume...'}
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
    </div>
  );
}
