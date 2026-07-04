import React, { useState, useRef, useEffect } from 'react';
import { FileText, Music, Folder, X, Bot, FileEdit, GraduationCap, Code, Brain, Search, Mic } from 'lucide-react';

export default function InputBar({ onSend, disabled, mode, onModeChange }) {
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Init Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setIsMicSupported(true);
    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = 'en-US';
    recog.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setText(transcript);
    };
    recog.onend = () => setIsListening(false);
    recog.onerror = () => setIsListening(false);
    recognitionRef.current = recog;
  }, []);

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [text]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newFiles = await Promise.all(
      files.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: ev.target.result,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    const val = text.trim();
    if (!val && selectedFiles.length === 0) return;
    if (disabled) return;
    onSend(val, selectedFiles);
    setText('');
    setSelectedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  const MODES = [
    { id: 'auto',   label: <><Bot size={14} style={{marginRight:4, marginBottom:-2}} />Auto</> },
    { id: 'exam',   label: <><FileEdit size={14} style={{marginRight:4, marginBottom:-2}} />Exam</> },
    { id: 'tutor',  label: <><GraduationCap size={14} style={{marginRight:4, marginBottom:-2}} />Tutor</> },
    { id: 'code',   label: <><Code size={14} style={{marginRight:4, marginBottom:-2}} />Code</> },
    { id: 'think',  label: <><Brain size={14} style={{marginRight:4, marginBottom:-2}} />Think</> },
    { id: 'search', label: <><Search size={14} style={{marginRight:4, marginBottom:-2}} />Search</> },
  ];

  return (
    <div className="input-section">
      <div className="input-wrapper">
        {/* File Preview Strip */}
        {selectedFiles.length > 0 && (
          <div className="file-previews">
            {selectedFiles.map((file, i) => (
              <div key={i} className="file-preview-item">
                {file.type.startsWith('image/') ? (
                   <img src={file.data} alt="preview" />
                ) : (
                  <div className="file-icon-placeholder">
                    {file.type.includes('pdf') ? <FileText size={24} /> : file.type.includes('audio') ? <Music size={24} /> : <Folder size={24} />}
                  </div>
                )}
                <span className="file-name">{file.name}</span>
                <button className="remove-file" onClick={() => removeFile(i)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        <div className={`input-box ${disabled ? 'generating' : ''}`}>
          <div className="input-row">
            {/* Attach Button */}
            <button
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Attach files (Images, PDFs, Audio)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>

            {/* Mic Button */}
            <button
              className={`attach-btn mic-btn ${isListening ? 'mic-active' : ''} ${!isMicSupported ? 'mic-unsupported' : ''}`}
              onClick={toggleMic}
              disabled={disabled || !isMicSupported}
              title={!isMicSupported ? 'Speech input is not supported on this browser' : isListening ? 'Stop listening' : 'Speak your message (Voice AI)'}
              style={!isMicSupported ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              {isListening ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="9" y="5" width="6" height="14" rx="3"/>
                  <path d="M5 9v3a7 7 0 0014 0V9" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10v2a7 7 0 0014 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="9" y1="22" x2="15" y2="22"/>
                </svg>
              )}
            </button>

            <textarea
              ref={textareaRef}
              id="messageInput"
              placeholder={isListening ? 'Listening…' : disabled ? 'Yaarax AI is thinking…' : 'Ask Yaarax AI anything...'}
              rows={1}
              maxLength={8000}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />

            <button
              className="send-btn-main"
              onClick={submit}
              disabled={(!text.trim() && selectedFiles.length === 0) || disabled}
              title="Send message"
            >
              {disabled ? (
                <div className="streaming-indicator">
                  <span></span><span></span><span></span>
                </div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            multiple
            accept="image/*,application/pdf,audio/*,text/*"
          />
        </div>

        <div className="input-footer">
          <div className="mode-tags">
            {MODES.map(m => (
              <span
                key={m.id}
                className={`mode-tag ${mode === m.id ? 'active' : ''}`}
                onClick={() => onModeChange(m.id)}
              >
                {m.label}
              </span>
            ))}
          </div>
          <span className="input-hint">
            {isListening ? 'Listening… speak now' : 'Shift+Enter for new line • Enter to send'}
          </span>
        </div>
      </div>
    </div>
  );
}
