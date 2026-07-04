import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Palette, Cuboid, Gamepad2, Droplet, Building2, PenTool, Square, RectangleHorizontal, RectangleVertical, Sparkles, Trash2, Download, X } from 'lucide-react';

const STYLE_PRESETS = [
  { id: 'realistic',  label: <><Camera size={14} style={{marginRight:4, marginBottom:-2}} /> Realistic</>,  suffix: 'photorealistic, 8k, hyperdetailed, DSLR' },
  { id: 'anime',      label: <><ImageIcon size={14} style={{marginRight:4, marginBottom:-2}} /> Anime</>,       suffix: 'anime style, studio ghibli, vibrant colors' },
  { id: 'oil',        label: <><Palette size={14} style={{marginRight:4, marginBottom:-2}} /> Oil Paint</>,   suffix: 'oil painting, impressionist, textured brushwork' },
  { id: '3d',         label: <><Cuboid size={14} style={{marginRight:4, marginBottom:-2}} /> 3D Render</>,   suffix: '3D render, octane, cinematic lighting, hyperreal' },
  { id: 'pixel',      label: <><Gamepad2 size={14} style={{marginRight:4, marginBottom:-2}} /> Pixel Art</>,   suffix: 'pixel art, 16-bit retro game style' },
  { id: 'watercolor', label: <><Droplet size={14} style={{marginRight:4, marginBottom:-2}} /> Watercolor</>,  suffix: 'watercolor, soft edges, artistic wash' },
  { id: 'cyberpunk',  label: <><Building2 size={14} style={{marginRight:4, marginBottom:-2}} /> Cyberpunk</>,   suffix: 'cyberpunk, neon lights, futuristic dark city' },
  { id: 'sketch',     label: <><PenTool size={14} style={{marginRight:4, marginBottom:-2}} /> Sketch</>,      suffix: 'pencil sketch, detailed linework, black and white' },
];

const RATIOS = [
  { id: 'square',    label: <><Square size={14} style={{marginRight:4, marginBottom:-2}} /> 1:1</>,   w: 1024, h: 1024 },
  { id: 'landscape', label: <><RectangleHorizontal size={14} style={{marginRight:4, marginBottom:-2}} /> 16:9</>,  w: 1280, h: 720  },
  { id: 'portrait',  label: <><RectangleVertical size={14} style={{marginRight:4, marginBottom:-2}} /> 9:16</>,  w: 720,  h: 1280 },
];

export default function ImageGenPage() {
  const [prompt, setPrompt]   = useState('');
  const [style, setStyle]     = useState('realistic');
  const [ratio, setRatio]     = useState('square');
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yaarax_img_gallery') || '[]'); } catch { return []; }
  });
  const [lightbox, setLightbox] = useState(null);

  async function generate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    const selectedStyle = STYLE_PRESETS.find(s => s.id === style);
    const fullPrompt = `${prompt.trim()}, ${selectedStyle?.suffix || ''}`;
    const seed = Math.floor(Math.random() * 10000000);
    const imgUrl = `/api/chat/image?prompt=${encodeURIComponent(fullPrompt)}&seed=${seed}`;
    const img = new Image();
    img.onload = () => {
      const item = { id: Date.now(), prompt: prompt.trim(), style, url: imgUrl, seed, createdAt: new Date().toISOString() };
      const newGallery = [item, ...gallery].slice(0, 30);
      setGallery(newGallery);
      localStorage.setItem('yaarax_img_gallery', JSON.stringify(newGallery));
      setLoading(false);
    };
    img.onerror = () => setLoading(false);
    img.src = imgUrl;
  }

  function deleteFromGallery(id) {
    const updated = gallery.filter(g => g.id !== id);
    setGallery(updated);
    localStorage.setItem('yaarax_img_gallery', JSON.stringify(updated));
  }

  async function downloadImage(url, prompt) {
    const a = document.createElement('a');
    a.href = url; a.download = `yaarax-ai-${prompt.slice(0, 30).replace(/\s+/g, '-')}.jpg`;
    a.target = '_blank'; a.click();
  }

  return (
    <div className="tool-page image-gen-page">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-icon" style={{ background: 'linear-gradient(135deg,#F9A826,#FF7E67)', boxShadow: '0 0 28px rgba(249, 168, 38,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Palette color="white" size={28} /></div>
        <div>
          <h1 className="tool-page-title">Image Generator</h1>
          <p className="tool-page-sub">Transform ideas into stunning visuals — powered by AI</p>
        </div>
      </div>

      {/* Generator Panel */}
      <div className="page-panel" style={{ animation: 'fade-up .5s .05s both' }}>
        {/* Prompt */}
        <div className="img-gen-prompt-wrap">
          <span className="tool-section-label">Describe your image</span>
          <textarea
            className="page-textarea"
            placeholder="A futuristic city at golden hour with neon reflections on wet streets, cinematic..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate(); }}
          />
        </div>

        {/* Style */}
        <span className="tool-section-label">Art Style</span>
        <div className="img-style-grid" style={{ marginBottom: 20 }}>
          {STYLE_PRESETS.map(s => (
            <button
              key={s.id}
              className={`pill-tag ${style === s.id ? 'active-violet' : ''}`}
              onClick={() => setStyle(s.id)}
            >{s.label}</button>
          ))}
        </div>

        {/* Ratio */}
        <span className="tool-section-label">Aspect Ratio</span>
        <div className="img-ratio-row">
          {RATIOS.map(r => (
            <button
              key={r.id}
              className={`img-ratio-btn ${ratio === r.id ? 'active' : ''}`}
              onClick={() => setRatio(r.id)}
            >{r.label}</button>
          ))}
        </div>

        {/* Generate */}
        <button
          className="page-btn-primary btn-cyan"
          onClick={generate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? <><div className="btn-spinner" style={{ borderTopColor: '#000' }} /><span>Generating magic...</span></> : <><span><Sparkles size={18} style={{marginRight: 6, marginBottom: -4}} /></span><span>Generate Image</span></>}
        </button>
      </div>

      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="img-gallery-section">
          <div className="img-gallery-header">
            <span className="tool-section-label" style={{ margin: 0 }}>Gallery · {gallery.length} images</span>
            <button className="img-clear-btn" onClick={() => { setGallery([]); localStorage.removeItem('yaarax_img_gallery'); }}>
              <Trash2 size={13} style={{marginRight: 4, marginBottom:-2}}/> Clear all
            </button>
          </div>
          <div className="img-gallery-grid">
            {gallery.map(item => (
              <div key={item.id} className="img-gallery-item" onClick={() => setLightbox(item)}>
                <img src={item.url} alt={item.prompt} loading="lazy" />
                <div className="img-gallery-overlay">
                  <div className="img-gallery-prompt">{item.prompt}</div>
                  <div className="img-gallery-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => downloadImage(item.url, item.prompt)} title="Download"><Download size={16} color="white" /></button>
                    <button onClick={() => deleteFromGallery(item.id)} title="Delete"><Trash2 size={16} color="white" /></button>
                  </div>
                </div>
                <div className="img-style-tag">{STYLE_PRESETS.find(s => s.id === item.style)?.label || item.style}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {gallery.length === 0 && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: 'var(--t3)', gap: 10, textAlign: 'center' }}>
          <ImageIcon size={48} style={{ opacity: .3 }} />
          <p style={{ fontSize: 15 }}>Your generated images will appear here</p>
          <p style={{ fontSize: 13 }}>Start by describing an image above</p>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="img-lightbox" onClick={() => setLightbox(null)}>
          <div className="img-lightbox-inner" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.prompt} />
            <div className="img-lightbox-info">
              <p>{lightbox.prompt}</p>
              <div className="img-lightbox-actions">
                <button className="img-lb-btn" onClick={() => downloadImage(lightbox.url, lightbox.prompt)}><Download size={14} style={{marginRight:4, marginBottom:-2}}/> Download</button>
                <button className="img-lb-btn" onClick={() => setLightbox(null)}><X size={14} style={{marginRight:4, marginBottom:-2}}/> Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
