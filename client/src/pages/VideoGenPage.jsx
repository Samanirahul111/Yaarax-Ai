import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Rocket, Sparkles, Building2, Mountain, PaintBucket, Flower2, Droplets, Gamepad2, Skull, ArrowRight, ArrowLeft, ZoomIn, ZoomOut, ArrowUp, ArrowDown, RefreshCcw, X, Dice5, Video, Search, Zap, CheckCircle2, Clapperboard, Trash2, Play, Pause, Circle, Loader, Download } from 'lucide-react';

const STYLE_PRESETS = [
  { id: 'scifi',      label: <><Rocket size={14} style={{marginRight:4, marginBottom:-2}} /> Sci-Fi Space</>, suffix: 'cinematic space nebula, ultra-realistic sci-fi stars, cosmic' },
  { id: 'cyberpunk',  label: <><Building2 size={14} style={{marginRight:4, marginBottom:-2}} /> Cyberpunk</>,    suffix: 'cyberpunk metropolis at night, neon glowing signs, rainy streets, hovercars' },
  { id: 'nature',     label: <><Mountain size={14} style={{marginRight:4, marginBottom:-2}} /> Nature</>,       suffix: 'majestic mountains, epic waterfall drone shot, lush nature, 8k footage' },
  { id: '3d',         label: <><PaintBucket size={14} style={{marginRight:4, marginBottom:-2}} /> 3D Cartoon</>,   suffix: 'cute 3D Pixar character animation, vibrant colors, clean lighting' },
  { id: 'anime',      label: <><Flower2 size={14} style={{marginRight:4, marginBottom:-2}} /> Anime</>,        suffix: 'aesthetic hand-drawn anime background style, retro aesthetic, studio ghibli cloud' },
  { id: 'abstract',   label: <><Droplets size={14} style={{marginRight:4, marginBottom:-2}} /> Abstract</>,     suffix: 'hypnotic liquid gold fluid simulation, morphing 3D abstract shapes' },
  { id: 'synthwave',  label: <><Gamepad2 size={14} style={{marginRight:4, marginBottom:-2}} /> Synthwave</>,    suffix: 'synthwave retro grid, neon purple highway driving, outrun aesthetic sunset' },
  { id: 'horror',     label: <><Skull size={14} style={{marginRight:4, marginBottom:-2}} /> Dark Horror</>,  suffix: 'spooky dark foggy forest, creepy gothic style, dramatic lighting shadow' },
];

const CAMERA_MOTIONS = [
  { id: 'pan-right',  label: <><ArrowRight size={14} style={{marginRight:4, marginBottom:-2}} /> Pan Right</> },
  { id: 'pan-left',   label: <><ArrowLeft size={14} style={{marginRight:4, marginBottom:-2}} /> Pan Left</> },
  { id: 'zoom-in',    label: <><ZoomIn size={14} style={{marginRight:4, marginBottom:-2}} /> Zoom In</> },
  { id: 'zoom-out',   label: <><ZoomOut size={14} style={{marginRight:4, marginBottom:-2}} /> Zoom Out</> },
  { id: 'tilt-up',    label: <><ArrowUp size={14} style={{marginRight:4, marginBottom:-2}} /> Tilt Up</> },
  { id: 'tilt-down',  label: <><ArrowDown size={14} style={{marginRight:4, marginBottom:-2}} /> Tilt Down</> },
  { id: 'orbit',      label: <><RefreshCcw size={14} style={{marginRight:4, marginBottom:-2}} /> Orbit 360</> },
  { id: 'static',     label: <><X size={14} style={{marginRight:4, marginBottom:-2}} /> Static</> },
];

const RATIOS = [
  { id: 'landscape', label: '16:9 Landscape', ratio: '16/9' },
  { id: 'portrait',  label: '9:16 Portrait',  ratio: '9/16' },
  { id: 'square',    label: '1:1 Square',     ratio: '1/1' },
];

const SURPRISE_PROMPTS = [
  'A futuristic cyberpunk city street under neon lights and flying cars, rainy night',
  'Cinematic drone shot of majestic waterfalls in a lush, ancient deep green forest, 8k',
  'An astronaut standing on the edge of a deep red canyon on Mars looking at a glowing blue Earth, cosmic nebula',
  'Mesmerizing abstract simulation of golden liquid metal flowing and morphing into surreal geometric shapes',
  'Retro synthwave grid landscape at sunset, driving into a massive neon sun with digital wireframes',
  'A cute fluffy 3D monster dancing under colorful rain, Pixar character animation style',
  'Eerie haunted gothic mansion under dark swirling clouds, lightning flashing, cinematic horror atmosphere',
  'Aesthetic anime scenery of cherry blossom trees falling under soft pink sunset clouds',
];

const RENDERING_STAGES = [
  '🔍 Analysing scene elements from your prompt...',
  '🎨 Decomposing visual layers: background, objects, particles...',
  '⚡ Synthesizing custom canvas drawing code via AI...',
  '🚀 Compiling 60fps animation engine & motion vectors...',
  '🎬 Mounting scene to playback canvas...',
];

// Smart scene-aware fallback visualizer — parses prompt keywords and draws real scene objects
class DefaultVisualizer {
  constructor(canvas, style, prompt = '') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.style = style;
    this.p = (prompt || '').toLowerCase();
    this.w = canvas.width;
    this.h = canvas.height;
    const rng = (n) => Array.from({length: n}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random(),
      r: Math.random() * Math.PI * 2,
    }));
    this.drops = rng(120);   // rain/particles
    this.stars = rng(200);   // stars/fireflies
    this.buildings = Array.from({length: 14}, (_, i) => ({
      x: (canvas.width / 14) * i,
      w: 40 + Math.random() * 50,
      h: 80 + Math.random() * 260,
      win: Array.from({length: 20}, () => Math.random() > 0.4),
    }));
  }

  _sky(time) {
    const ctx = this.ctx; const p = this.p; const w = this.w; const h = this.h;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (p.includes('space') || p.includes('star') || p.includes('galaxy') || p.includes('cosmos') || this.style === 'scifi') {
      g.addColorStop(0, '#000005'); g.addColorStop(1, '#0a003a');
    } else if (p.includes('sunset') || p.includes('sunrise') || p.includes('dusk')) {
      g.addColorStop(0, '#1a0533'); g.addColorStop(0.5, '#ff6a00'); g.addColorStop(1, '#ff9a44');
    } else if (p.includes('night') || p.includes('dark') || p.includes('neon') || p.includes('cyberpunk') || this.style === 'cyberpunk') {
      g.addColorStop(0, '#05000f'); g.addColorStop(1, '#100020');
    } else if (p.includes('ocean') || p.includes('sea') || p.includes('water') || p.includes('wave')) {
      g.addColorStop(0, '#001f3f'); g.addColorStop(0.6, '#0074d9'); g.addColorStop(1, '#00cfcf');
    } else if (p.includes('forest') || p.includes('nature') || p.includes('tree') || this.style === 'nature') {
      g.addColorStop(0, '#003300'); g.addColorStop(1, '#004d1a');
    } else if (p.includes('fire') || p.includes('lava') || p.includes('volcano')) {
      g.addColorStop(0, '#1a0000'); g.addColorStop(1, '#330800');
    } else if (this.style === 'synthwave') {
      g.addColorStop(0, '#0d001a'); g.addColorStop(0.5, '#3d005e'); g.addColorStop(1, '#ff0080');
    } else if (this.style === 'anime') {
      g.addColorStop(0, '#ffb3c6'); g.addColorStop(1, '#ffd6e0');
    } else {
      g.addColorStop(0, '#050510'); g.addColorStop(1, '#0a0a20');
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  _stars(time) {
    const ctx = this.ctx; const p = this.p;
    const isSpace = p.includes('space') || p.includes('star') || p.includes('galaxy') || this.style === 'scifi';
    const isNight = p.includes('night') || p.includes('cyberpunk') || this.style === 'cyberpunk' || this.style === 'synthwave';
    if (!isSpace && !isNight) return;
    for (let s of this.stars) {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + s.r));
      ctx.shadowBlur = isSpace ? 6 : 2;
      ctx.shadowColor = isSpace ? '#8888ff' : '#ffffff';
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y * 0.6, isSpace ? 1.5 + s.s * 2 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (isSpace) {
      // Draw 2 planets
      [{ x: this.w * 0.75, y: this.h * 0.2, r: 50, c: '#3a7bd5' }, { x: this.w * 0.2, y: this.h * 0.15, r: 30, c: '#c0392b' }].forEach(pl => {
        const rg = ctx.createRadialGradient(pl.x - 15, pl.y - 10, 5, pl.x, pl.y, pl.r);
        rg.addColorStop(0, '#ffffff44'); rg.addColorStop(1, pl.c);
        ctx.shadowBlur = 30; ctx.shadowColor = pl.c;
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2); ctx.fill();
        // ring
        ctx.strokeStyle = `${pl.c}88`; ctx.lineWidth = 4; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y, pl.r * 1.7, pl.r * 0.35, -0.3, 0, Math.PI * 2); ctx.stroke();
      });
    }
  }

  _city(time) {
    const ctx = this.ctx; const p = this.p;
    const isCyberpunk = p.includes('city') || p.includes('building') || p.includes('cyberpunk') || p.includes('neon') || p.includes('urban') || this.style === 'cyberpunk';
    if (!isCyberpunk) return;
    const neonColors = ['#ff4081', '#00e5ff', '#76ff03', '#ffea00', '#ff6d00'];
    for (let b of this.buildings) {
      // building body
      const bg = ctx.createLinearGradient(b.x, this.h - b.h, b.x, this.h);
      bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#1C1919');
      ctx.fillStyle = bg; ctx.fillRect(b.x, this.h - b.h, b.w, b.h);
      // windows
      const nc = neonColors[Math.floor(b.x / 80) % neonColors.length];
      b.win.forEach((on, i) => {
        if (!on) return;
        const wx = b.x + 5 + (i % 4) * 10; const wy = this.h - b.h + 15 + Math.floor(i / 4) * 18;
        const flicker = Math.sin(time * 3 + i) > 0.5 ? 1 : 0.6;
        ctx.fillStyle = `rgba(255, 220, 100, ${0.5 * flicker})`; ctx.fillRect(wx, wy, 7, 10);
      });
      // neon sign on top
      ctx.strokeStyle = nc; ctx.lineWidth = 2; ctx.shadowBlur = 15; ctx.shadowColor = nc;
      ctx.strokeRect(b.x + 5, this.h - b.h - 6, b.w - 10, 4);
    }
  }

  _rain(time) {
    const ctx = this.ctx; const p = this.p;
    if (!p.includes('rain') && !p.includes('storm') && !p.includes('drizzle')) return;
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
    for (let d of this.drops) {
      const y = (d.y + time * 300 * (0.5 + d.s)) % this.h;
      const x = d.x + Math.sin(time + d.r) * 10;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 12); ctx.stroke();
    }
  }

  _ocean(time) {
    const ctx = this.ctx; const p = this.p; const w = this.w; const h = this.h;
    if (!p.includes('ocean') && !p.includes('sea') && !p.includes('wave') && !p.includes('water')) return;
    // Draw sun
    const rg = ctx.createRadialGradient(w * 0.5, h * 0.35, 5, w * 0.5, h * 0.35, 70);
    rg.addColorStop(0, '#fff176'); rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.35, 60, 0, Math.PI * 2); ctx.fill();
    // waves
    for (let i = 0; i < 5; i++) {
      const yBase = h * 0.55 + i * 28;
      const alpha = 0.3 + i * 0.1;
      ctx.beginPath(); ctx.moveTo(0, yBase);
      for (let x = 0; x <= w; x += 8) {
        const y = yBase + Math.sin((x * 0.02) + time * 2 + i) * (10 + i * 4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = `rgba(0, 120, 200, ${alpha})`; ctx.fill();
    }
  }

  _forest(time) {
    const ctx = this.ctx; const p = this.p; const w = this.w; const h = this.h;
    if (!p.includes('forest') && !p.includes('tree') && !p.includes('jungle') && this.style !== 'nature') return;
    for (let i = 0; i < 20; i++) {
      const tx = (w / 20) * i; const sway = Math.sin(time + i * 0.7) * 6;
      const th = 120 + (i % 5) * 40; const tw = 30 + (i % 3) * 10;
      ctx.fillStyle = '#1a3a1a'; ctx.fillRect(tx + tw * 0.4, h - th, tw * 0.2, th);
      // canopy
      ctx.fillStyle = `hsl(${120 + (i % 3) * 15}, 50%, ${18 + (i % 4) * 4}%)`;
      ctx.shadowBlur = 8; ctx.shadowColor = '#003300';
      ctx.beginPath(); ctx.moveTo(tx + tw * 0.5 + sway, h - th - 60);
      ctx.lineTo(tx, h - th + 10); ctx.lineTo(tx + tw, h - th + 10); ctx.closePath(); ctx.fill();
    }
    // waterfall if mentioned
    if (p.includes('waterfall') || p.includes('cascade')) {
      ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
      for (let d of this.drops.slice(0, 50)) {
        const fy = (d.y + time * 200) % h;
        ctx.fillRect(w * 0.45 + d.s * 60, fy, 3, 18);
      }
    }
  }

  _fire(time) {
    const ctx = this.ctx; const p = this.p; const w = this.w; const h = this.h;
    if (!p.includes('fire') && !p.includes('flame') && !p.includes('lava') && !p.includes('volcano')) return;
    for (let d of this.drops) {
      const fy = h - (((d.y * 0.5) + time * 120 * (0.5 + d.s)) % (h * 0.6));
      const heat = 1 - ((h - fy) / (h * 0.6));
      const r = 255; const g2 = Math.floor(heat * 200); const alpha = 0.6 * heat;
      ctx.shadowBlur = 20; ctx.shadowColor = '#ff6600';
      ctx.fillStyle = `rgba(${r}, ${g2}, 0, ${alpha})`;
      ctx.beginPath(); ctx.arc(d.x, fy, 3 + d.s * 8, 0, Math.PI * 2); ctx.fill();
    }
  }

  _synthwaveGrid(time) {
    const ctx = this.ctx; const p = this.p; const w = this.w; const h = this.h;
    if (this.style !== 'synthwave' && !p.includes('grid') && !p.includes('synthwave') && !p.includes('retro')) return;
    const vp = { x: w / 2, y: h * 0.45 };
    ctx.strokeStyle = '#ff00ff44'; ctx.lineWidth = 1; ctx.shadowBlur = 8; ctx.shadowColor = '#ff00ff';
    for (let i = 0; i <= 20; i++) {
      const x = (w / 20) * i;
      ctx.beginPath(); ctx.moveTo(vp.x, vp.y); ctx.lineTo(x, h); ctx.stroke();
    }
    const lines = 12;
    for (let i = 0; i < lines; i++) {
      const frac = ((i / lines) + time * 0.15) % 1;
      const y = vp.y + (h - vp.y) * (frac * frac);
      ctx.globalAlpha = frac;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // retro sun
    const sunY = h * 0.44;
    const sg = ctx.createRadialGradient(w / 2, sunY, 0, w / 2, sunY, 80);
    sg.addColorStop(0, '#ffea00'); sg.addColorStop(0.4, '#ff6600'); sg.addColorStop(1, '#ff006688');
    ctx.fillStyle = sg; ctx.shadowBlur = 40; ctx.shadowColor = '#ff6600';
    ctx.beginPath(); ctx.arc(w / 2, sunY, 80, Math.PI, 0); ctx.fill();
  }

  _nebula(time) {
    const ctx = this.ctx; const p = this.p; const w = this.w; const h = this.h;
    if (!p.includes('nebula') && !p.includes('galaxy') && !p.includes('cosmos')) return;
    [[w * 0.3, h * 0.4, '#c040fb'], [w * 0.7, h * 0.3, '#00e5ff'], [w * 0.5, h * 0.6, '#ff4081']].forEach(([nx, ny, nc]) => {
      const pulse = 80 + Math.sin(time + nx) * 20;
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, pulse * 2);
      ng.addColorStop(0, nc + '55'); ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(nx, ny, pulse * 2, 0, Math.PI * 2); ctx.fill();
    });
  }

  render(time) {
    const ctx = this.ctx;
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    this._sky(time);
    this._nebula(time);
    this._stars(time);
    this._synthwaveGrid(time);
    this._city(time);
    this._forest(time);
    this._ocean(time);
    this._fire(time);
    this._rain(time);
  }

  destroy() {}
}

class SlideshowVisualizer {
  constructor(canvas, imagePrompts, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.imagePrompts = imagePrompts || [];
    this.images = [];
    this.loadedCount = 0;
    this.motion = options.motion || 'zoom-in';
    this.duration = options.duration || 5;
    this.seeds = options.seeds || Array.from({length: 5}, () => Math.floor(Math.random() * 1000000));
    this.onFrameLoaded = options.onFrameLoaded || (() => {});

    this.preloadImages();
  }

  preloadImages() {
    if (this.imagePrompts.length === 0) return;
    this.imagePrompts.forEach((prompt, index) => {
      const img = new Image();
      const seed = this.seeds[index] || (12345 + index);
      img.src = `/api/chat/image?prompt=${encodeURIComponent(prompt)}&seed=${seed}`;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.loadedCount++;
        this.onFrameLoaded(this.loadedCount, this.imagePrompts.length);
      };
      img.onerror = () => {
        console.warn(`Failed to load image frame ${index + 1}`);
        this.loadedCount++;
        this.onFrameLoaded(this.loadedCount, this.imagePrompts.length);
      };
      this.images[index] = img;
    });
  }

  render(time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, w, h);

    if (this.images.length === 0 || this.loadedCount < this.images.length) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Preloading visual scenes... (${this.loadedCount}/${this.imagePrompts.length})`, w / 2, h / 2);
      return;
    }

    const numImages = this.images.length;
    const imgDuration = this.duration / numImages;
    
    const t = Math.max(0, Math.min(time, this.duration - 0.001));
    const index = Math.floor(t / imgDuration);
    const nextIndex = (index + 1) % numImages;
    
    const frameProgress = (t % imgDuration) / imgDuration;

    const transitionSec = Math.min(1.2, imgDuration * 0.4);
    const timeLeft = imgDuration - (t % imgDuration);
    const isTransitioning = timeLeft < transitionSec && numImages > 1;
    const transitionProgress = isTransitioning ? (transitionSec - timeLeft) / transitionSec : 0;

    const drawImageWithMotion = (img, indexVal, progressVal, opacity) => {
      if (!img || !img.complete || img.naturalWidth === 0) return;
      ctx.save();
      ctx.globalAlpha = opacity;

      let scale = 1.0;
      let dx = 0;
      let dy = 0;

      const motionProg = progressVal; 

      switch (this.motion) {
        case 'zoom-in':
          scale = 1.0 + (0.16 * motionProg);
          break;
        case 'zoom-out':
          scale = 1.16 - (0.16 * motionProg);
          break;
        case 'pan-right':
          dx = -60 * (1 - motionProg);
          break;
        case 'pan-left':
          dx = -60 * motionProg;
          break;
        case 'tilt-up':
          dy = -50 * motionProg;
          break;
        case 'tilt-down':
          dy = -50 * (1 - motionProg);
          break;
        case 'orbit':
          scale = 1.08 + (0.06 * Math.sin(motionProg * Math.PI));
          dx = 20 * Math.sin(motionProg * Math.PI * 2);
          dy = 20 * Math.cos(motionProg * Math.PI * 2);
          break;
        case 'static':
        default:
          scale = 1.02;
          break;
      }

      const imgW = img.width || 1024;
      const imgH = img.height || 1024;
      const imgRatio = imgW / imgH;
      const canvasRatio = w / h;
      
      let drawW, drawH;
      if (imgRatio > canvasRatio) {
        drawH = h;
        drawW = h * imgRatio;
      } else {
        drawW = w;
        drawH = w / imgRatio;
      }

      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(dx, dy);
      
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };

    if (isTransitioning) {
      drawImageWithMotion(this.images[index], index, frameProgress, 1 - transitionProgress);
      const nextFrameProgress = (transitionProgress * transitionSec) / imgDuration;
      drawImageWithMotion(this.images[nextIndex], nextIndex, nextFrameProgress, transitionProgress);
    } else {
      drawImageWithMotion(this.images[index], index, frameProgress, 1.0);
    }

    this.drawCinematicOverlays();
  }

  drawCinematicOverlays() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const vignette = ctx.createRadialGradient(w/2, h/2, h/2 * 0.8, w/2, h/2, w/2 * 1.25);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    if (w > h) {
      const barHeight = Math.floor(h * 0.07);
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, w, barHeight);
      ctx.fillRect(0, h - barHeight, w, barHeight);
    }
  }

  destroy() {
    this.images.forEach(img => {
      img.onload = null;
      img.onerror = null;
    });
    this.images = [];
  }
}


export default function VideoGenPage() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('none');
  const [motion, setMotion] = useState('none');
  const [ratio, setRatio] = useState('landscape');
  const [duration, setDuration] = useState('5');
  const [fps, setFps] = useState('30');

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [gallery, setGallery] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yaarax_video_gallery_v2') || '[]'); } catch { return []; }
  });
  const [lightbox, setLightbox] = useState(null);

  // Video loop states
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [recording, setRecording] = useState(false);

  const canvasRef = useRef(null);
  const visualizerRef = useRef(null);
  const requestRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeOffsetRef = useRef(0);

  // Surprise Prompt generator
  function handleSurpriseMe() {
    const idx = Math.floor(Math.random() * SURPRISE_PROMPTS.length);
    setPrompt(SURPRISE_PROMPTS[idx]);
  }

  // Effect to load and initialize visualizer
  useEffect(() => {
    if (!currentVideo || !canvasRef.current) return;

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (visualizerRef.current && typeof visualizerRef.current.destroy === 'function') {
      visualizerRef.current.destroy();
    }

    const canvas = canvasRef.current;
    if (currentVideo.ratio === 'landscape') {
      canvas.width = 1280;
      canvas.height = 720;
    } else if (currentVideo.ratio === 'portrait') {
      canvas.width = 720;
      canvas.height = 1280;
    } else {
      canvas.width = 960;
      canvas.height = 960;
    }

    if (currentVideo.imagePrompts && currentVideo.imagePrompts.length > 0) {
      visualizerRef.current = new SlideshowVisualizer(canvas, currentVideo.imagePrompts, {
        motion: currentVideo.motion,
        duration: parseFloat(currentVideo.duration) || 5,
        seeds: currentVideo.seeds || [],
      });
    } else {
      try {
        // Dynamic instantiation of visual class
        const creatorFn = new Function(`${currentVideo.code}\nreturn CanvasVisualizer;`);
        const VisualizerClass = creatorFn();
        visualizerRef.current = new VisualizerClass(canvas);
      } catch (err) {
        console.error('Failed to parse dynamic visualizer, loading standard fallback:', err);
        visualizerRef.current = new DefaultVisualizer(canvas, currentVideo.style, currentVideo.prompt);
      }
    }

    startTimeRef.current = null;
    timeOffsetRef.current = 0;
    setCurrentTimeState(0);
    setIsPlaying(true);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (visualizerRef.current && typeof visualizerRef.current.destroy === 'function') {
        visualizerRef.current.destroy();
      }
    };
  }, [currentVideo]);

  // Main high-resolution render loop
  useEffect(() => {
    if (!isPlaying || !visualizerRef.current || !currentVideo || recording) return;

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - (timeOffsetRef.current * 1000);
      }

      const elapsedSeconds = (timestamp - startTimeRef.current) / 1000;
      const maxDur = parseInt(currentVideo.duration) || 5;

      if (elapsedSeconds >= maxDur) {
        startTimeRef.current = timestamp;
        setCurrentTimeState(0);
        timeOffsetRef.current = 0;
      } else {
        setCurrentTimeState(elapsedSeconds);
        timeOffsetRef.current = elapsedSeconds;
      }

      try {
        visualizerRef.current.render(elapsedSeconds);
      } catch (err) {
        console.error('Render error:', err);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, currentVideo, recording]);

  // Pipeline execution
  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    
    let parsedDuration = '5';
    const match = prompt.match(/(\d+)\s*(?:sec|second|s\b)/i);
    if (match) parsedDuration = match[1];
    setDuration(parsedDuration);

    setProgress(0);
    setCurrentStage(RENDERING_STAGES[0]);

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.floor(Math.random() * 8) + 2;
        if (next >= 85) {
          clearInterval(interval);
          return 85;
        }
        const stageIdx = Math.min(Math.floor(next / 20), RENDERING_STAGES.length - 1);
        setCurrentStage(RENDERING_STAGES[stageIdx]);
        return next;
      });
    }, 200);

    try {
      const replicateKey = localStorage.getItem('yaarax_replicate_key');

      setProgress(10);
        setCurrentStage('🚀 Sending prompt to Replicate Minimax (video-01)...');
        
        const initRes = await api.generateReplicateVideo({
          prompt: prompt.trim(), style, ratio, motion, duration: parsedDuration
        }, replicateKey);
        
        let predictionId = initRes.id;
        let predictionStatus = initRes.status;
        let finalUrl = null;

        // Poll Replicate API
        while (predictionStatus !== 'succeeded' && predictionStatus !== 'failed' && predictionStatus !== 'canceled') {
          await new Promise(r => setTimeout(r, 4000));
          const pollRes = await api.pollReplicateVideo(predictionId, replicateKey);
          predictionStatus = pollRes.status;
          
          setProgress(prev => {
            const next = prev + Math.floor(Math.random() * 5);
            return next > 95 ? 95 : next;
          });
          setCurrentStage(`⏳ Generating video... (Status: ${predictionStatus})`);

          if (predictionStatus === 'succeeded') {
            finalUrl = pollRes.output; 
            if (Array.isArray(finalUrl)) finalUrl = finalUrl[0];
          }
        }

        clearInterval(interval);
        if (predictionStatus !== 'succeeded' || !finalUrl) {
          throw new Error(`Video generation failed with status: ${predictionStatus}`);
        }

        setProgress(100);
        setCurrentStage('🎬 Video generation complete!');

        setTimeout(() => {
          const item = {
            id: Date.now(),
            prompt: prompt.trim(),
            style, motion, ratio, duration: parsedDuration, fps,
            videoUrl: finalUrl,
            createdAt: new Date().toISOString(),
          };

          const newGallery = [item, ...gallery].slice(0, 20);
          setGallery(newGallery);
          localStorage.setItem('yaarax_video_gallery_v2', JSON.stringify(newGallery));
          setCurrentVideo(item);
          setLoading(false);
        }, 600);

      } catch (err) {
      clearInterval(interval);
      setLoading(false);
      alert(err.message || 'Failed to synthesize video engine.');
    }
  }

  function deleteFromGallery(id) {
    const updated = gallery.filter(g => g.id !== id);
    setGallery(updated);
    localStorage.setItem('yaarax_video_gallery_v2', JSON.stringify(updated));
    if (currentVideo?.id === id) {
      setCurrentVideo(null);
    }
  }

  // Playback handlers
  function togglePlay() {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      startTimeRef.current = null;
    }
  }

  function handleSeek(e) {
    const time = parseFloat(e.target.value);
    setCurrentTimeState(time);
    timeOffsetRef.current = time;
    if (startTimeRef.current) {
      startTimeRef.current = performance.now() - (time * 1000);
    }
    if (visualizerRef.current) {
      try {
        visualizerRef.current.render(time);
      } catch (err) {
        console.error('Scrub render error:', err);
      }
    }
  }

  // HTML5 MediaRecorder Video Exporter
  async function downloadVideo(videoItem) {
    if (!canvasRef.current || !visualizerRef.current || recording) return;

    if (visualizerRef.current.loadedCount !== undefined && 
        visualizerRef.current.loadedCount < visualizerRef.current.images.length) {
      alert("Please wait for all visual frames to finish preloading before exporting.");
      return;
    }

    setRecording(true);
    setIsPlaying(false);

    const canvas = canvasRef.current;
    const fpsVal = parseInt(videoItem.fps) || 30;
    const durationSec = parseInt(videoItem.duration) || 5;

    // Capture Canvas Media Stream
    const stream = canvas.captureStream(fpsVal);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9' 
      : 'video/webm';
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6000000
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yaarax-ai-${videoItem.prompt.slice(0, 20).replace(/\s+/g, '-')}.webm`;
      a.click();
      setRecording(false);
      setIsPlaying(true);
    };

    mediaRecorder.start();

    // Frame-by-frame pristine record render (guarantees zero dropped frames)
    let recordTime = 0;
    const totalFrames = fpsVal * durationSec;
    let currentFrame = 0;

    const recordInterval = setInterval(() => {
      if (currentFrame >= totalFrames) {
        clearInterval(recordInterval);
        mediaRecorder.stop();
      } else {
        recordTime = currentFrame / fpsVal;
        try {
          visualizerRef.current.render(recordTime);
        } catch (err) {
          console.error(err);
        }
        currentFrame++;
      }
    }, 1000 / fpsVal);
  }

  function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  return (
    <div className="tool-page video-gen-page">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-icon" style={{background:'linear-gradient(135deg,#ff4081,#c040fb)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Video color="white" size={28} /></div>
        <div>
          <h1 className="tool-page-title">AI Video Generator</h1>
          <p className="tool-page-sub">Synthesize breathtaking, cinematic high-fidelity procedural video scenes via Gemini</p>
        </div>
      </div>

      <div className="vid-layout-grid">
        {/* Left Side: Setup Control Panel */}
        <div className="vid-control-column">
          <div className="vid-gen-panel">
            {/* Prompt input */}
            <div className="vid-gen-prompt-wrap">
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <label className="tool-section-label" style={{margin:0}}>Describe your scene</label>
                <button className="vid-action-btn-small" onClick={handleSurpriseMe}><Dice5 size={14} style={{marginRight:4, marginBottom:-2}} /> Surprise Me</button>
              </div>
              <textarea
                className="vid-gen-prompt"
                placeholder="A magical neon grid highway flowing towards a retro digital wireframe sunset..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate(); }}
              />
            </div>


            {/* Generate Trigger */}
            <button
              className="vid-generate-btn"
              onClick={generate}
              disabled={!prompt.trim() || loading}
            >
              {loading ? (
                <><div className="vid-gen-spinner"/><span>Compiling Visual Vectors…</span></>
              ) : (
                <><span><Sparkles size={18} style={{marginRight: 6, marginBottom: -4}} /></span><span>Synthesize Video Loop</span></>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Active Player / Renderer Simulator */}
        <div className="vid-preview-column">
          {loading ? (
            <div className="vid-render-console">
              <div className="vid-render-console-glow" />
              <div className="console-title"><Sparkles size={14} style={{marginRight: 4, marginBottom: -2}} /> GEMINI NEURAL RENDER ENGINE</div>
              
              <div className="progress-ring-container">
                <div className="progress-ring-text">
                  <div className="progress-pct">{progress}%</div>
                  <div className="progress-sub">compiling</div>
                </div>
                <svg width="120" height="120">
                  <circle className="progress-ring-bg" cx="60" cy="60" r="52" strokeWidth="6" fill="transparent" />
                  <circle
                    className="progress-ring-bar"
                    cx="60" cy="60" r="52" strokeWidth="6" fill="transparent"
                    strokeDasharray={326.7}
                    strokeDashoffset={326.7 - (326.7 * progress) / 100}
                  />
                </svg>
              </div>

              <div className="render-console-stage">
                <div className="render-active-badge">PIPELINE COMPILER</div>
                <div className="render-stage-text">{currentStage}</div>
              </div>

              <div className="render-console-metrics">
                <div className="metric-box">
                  <span className="m-label">RESOLUTION</span>
                  <span className="m-val">{ratio === 'landscape' ? '1280x720' : ratio === 'portrait' ? '720x1280' : '960x960'}</span>
                </div>
                <div className="metric-box">
                  <span className="m-label">FRAMERATE</span>
                  <span className="m-val">{fps} FPS</span>
                </div>
                <div className="metric-box">
                  <span className="m-label">DURATION</span>
                  <span className="m-val">{duration} SEC</span>
                </div>
              </div>
            </div>
          ) : currentVideo ? (
            <div className="vid-player-panel">
              <span className="tool-section-label">Active Scene Playback</span>
              <div className="vid-player-container" style={{ aspectRatio: RATIOS.find(r=>r.id===currentVideo.ratio)?.ratio || '16/9' }}>
                
                {currentVideo.videoUrl ? (
                  <video 
                    src={currentVideo.videoUrl} 
                    className="vid-player-element" 
                    controls 
                    autoPlay 
                    loop 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} 
                  />
                ) : (
                  <>
                    <canvas ref={canvasRef} className="vid-player-element" />
                    <div className="vid-player-overlay">
                      <div className="vid-player-top">
                      </div>

                      <div className="vid-player-bottom">
                        <div className="vid-progress-wrapper" style={{ '--progress-pct': `${(currentTimeState / (parseInt(currentVideo.duration) || 5)) * 100}%` }}>
                          <input
                            type="range"
                            className="vid-progress-slider"
                            min="0"
                            max={parseInt(currentVideo.duration) || 5}
                            step="0.01"
                            value={currentTimeState}
                            onChange={handleSeek}
                          />
                        </div>

                        <div className="vid-controls-bar">
                          <div className="ctrl-left">
                            <button className="ctrl-btn" onClick={togglePlay} disabled={recording}>
                              {recording ? <Circle size={18} fill="var(--rose)" color="var(--rose)" /> : isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <span className="vid-time-stamp">
                              {formatTime(currentTimeState)} / {formatTime(parseInt(currentVideo.duration) || 5)}
                            </span>
                          </div>

                          <div className="ctrl-right">
                            <button className="ctrl-btn" onClick={() => downloadVideo(currentVideo)} disabled={recording} title="Export Video File">
                              {recording ? <Loader size={18} className="spin" /> : <Download size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="vid-player-prompt-info">
                <span className="vid-prompt-label">Prompt:</span>
                <p className="vid-prompt-text">"{currentVideo.prompt}"</p>
              </div>
            </div>
          ) : (
            <div className="vid-player-idle">
              <div className="idle-logo"><Clapperboard size={48} style={{opacity:0.3}} /></div>
              <div className="idle-title">Render Sandbox Ready</div>
              <p className="idle-sub">Enter a creative prompt, choose a cinematic style, and hit synthesize to compile a gorgeous Gemini generative fluid animation loop.</p>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <div className="vid-gallery-section">
          <div className="vid-gallery-header">
            <span className="tool-section-label">Your Video Archives ({gallery.length})</span>
            <button className="vid-clear-btn" onClick={() => { setGallery([]); localStorage.removeItem('yaarax_video_gallery_v2'); setCurrentVideo(null); }}>Delete All Scenes</button>
          </div>
          
          <div className="vid-gallery-grid">
            {gallery.map(item => (
              <div key={item.id} className="vid-gallery-item" onClick={() => setCurrentVideo(item)}>
                <div className="vid-thumb-container">
                  {item.videoUrl ? (
                    <video
                      src={item.videoUrl}
                      className="vid-thumb-image"
                      style={{width:'100%', height:'100%', objectFit:'cover'}}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : item.imagePrompts && item.imagePrompts.length > 0 ? (
                    <img
                      src={`/api/chat/image?prompt=${encodeURIComponent(item.imagePrompts[0])}&seed=${item.seeds?.[0] || 123}`}
                      alt="Thumbnail"
                      className="vid-thumb-image"
                      style={{width:'100%', height:'100%', objectFit:'cover'}}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)'}}>
                      <span style={{fontSize:'36px', opacity:0.3}}><Sparkles size={36} /></span>
                    </div>
                  )}
                  <div className="vid-gallery-item-glow" />
                  <div className="vid-gallery-play-btn"><Play fill="white" color="white" size={24} /></div>
                </div>

                <div className="vid-gallery-overlay">
                  <div className="vid-gallery-prompt">{item.prompt}</div>
                  <div className="vid-gallery-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setCurrentVideo(item); setTimeout(() => alert('Scene loaded! Please use the large Export button below the video player to download it.'), 100); }} title="Load to Download"><Download size={16} color="white" /></button>
                    <button onClick={() => deleteFromGallery(item.id)} title="Delete"><Trash2 size={16} color="white" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
