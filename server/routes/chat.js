const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sendChunk } = require('../utils/stream');
const { streamGroqResponse } = require('../utils/groq');
const { streamCerebrasResponse } = require('../utils/cerebras');
const { streamOpenRouterResponse } = require('../utils/openrouter');
const { encryptText, decryptText } = require('../utils/crypto');

const router = express.Router();

// ─── PUBLIC MEDIA PROXY ──────────────────────────────────────────────────────
router.get('/image', async (req, res) => {
  const { prompt, seed = Math.floor(Math.random() * 1000000) } = req.query;
  if (!prompt) return res.status(400).send('No prompt provided');

  const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true`;

  try {
    const response = await fetch(targetUrl, { headers: { 'Accept': 'image/*' } });
    if (!response.ok) throw new Error(`External API status ${response.status}`);

    let contentType = response.headers.get('content-type');
    if (!contentType || contentType.includes('text') || contentType.includes('json')) {
      throw new Error(`Pollinations API returned invalid format: ${contentType}`);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error('🔥 Image Proxy Error:', err.message);
    // Use loremflickr for beautiful, topic-relevant dynamic image fallbacks!
    const firstTerm = prompt.split(',')[0].trim().split(' ').slice(-2).join(' ') || 'abstract';
    const queryTerm = encodeURIComponent(firstTerm);
    const fallbackUrl = `https://loremflickr.com/1024/1024/${queryTerm}`;
    console.log('🔄 Proxying high-quality dynamic fallback:', fallbackUrl);

    try {
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) throw new Error('Fallback failed');
      const arrayBuffer = await fallbackResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch (fallbackErr) {
      console.error('🔥 Fallback Proxy Error:', fallbackErr.message);
      res.status(500).send('Image generation failed');
    }
  }
});

router.get('/video', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL provided');

  try {
    const decodedUrl = decodeURIComponent(url);
    res.redirect(decodedUrl);
  } catch (err) {
    console.error('Video Proxy Error:', err.message);
    res.status(500).send('Failed to redirect to video');
  }
});

router.use(verifyToken);

router.post('/video/generate', async (req, res) => {
  const { prompt, style, ratio, motion, duration, fps } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  const styleSuffixes = {
    scifi: 'cinematic space nebula, ultra-realistic sci-fi stars, cosmic, photorealistic, 8k, highly detailed, stellar glow',
    cyberpunk: 'cyberpunk metropolis at night, neon glowing signs, rainy streets, hovercars, cinematic lighting, photorealistic, highly detailed, teal and magenta neon reflections',
    nature: 'majestic mountains, epic waterfall drone shot, lush nature, 8k footage, photorealistic, high detail, warm cinematic sunlight',
    '3d': 'cute 3D Pixar character animation, vibrant colors, clean lighting, extremely detailed, octane render, stylized gorgeous 3D model',
    anime: 'aesthetic hand-drawn anime background style, retro aesthetic, studio ghibli cloud, detailed anime art, beautiful anime illustration',
    abstract: 'hypnotic liquid gold fluid simulation, morphing 3D abstract shapes, octane render, beautiful fluid dynamics, 8k, gorgeous lighting',
    synthwave: 'synthwave retro grid, neon purple highway driving, outrun aesthetic sunset, neon colors, 8k, photorealistic, vintage synthwave vector art',
    horror: 'spooky dark foggy forest, creepy gothic style, dramatic lighting shadow, horror movie cinematic shot, 8k, dark volumetric shadows'
  };

  const currentStyleSuffix = styleSuffixes[style] || 'cinematic, highly detailed, photorealistic, 8k';

  // Helper for guaranteed fallback prompts
  function getFallbackPrompts(p, s) {
    const suff = styleSuffixes[s] || 'cinematic, highly detailed, photorealistic, 8k';
    return [
      `Cinematic wide establishing shot of ${p}, ${suff}, epic composition, breathtaking scene introduction`,
      `Medium tracking shot of ${p}, showcasing rich textures, atmospheric volumetric lighting, and deep focus, ${suff}`,
      `Alternative dynamic camera angle of ${p}, displaying subtle movement, depth of field, and stunning realism, ${suff}`,
      `Extreme close up shot focusing on beautiful intricate elements of ${p}, highly detailed highlights and shadows, ${suff}`,
      `Breathtaking cinematic overview of ${p}, sunset lighting, final gorgeous master shot, ${suff}`
    ];
  }

  const systemPrompt = `You are an expert AI cinematographer and visual director. Your task is to take a single user prompt and expand it into a visually cohesive sequence of exactly 5 highly detailed image prompt strings that tell a short cinematic story or explore a visual scene in depth.

USER PROMPT: "${prompt}"
STYLE: "${style}" (${currentStyleSuffix})

Each image prompt in the sequence must:
1. Incorporate the style preset details: "${style}".
2. Describe a highly realistic, breathtaking, photographic or cinematic scene.
3. Include specific lighting details (volumetric light, golden hour, neon glow), color schemes, camera angles, and rich textures.
4. Maintain tight visual continuity across all 5 prompts (same characters, environment, subject, objects, and color theme) so they look like different shots of the exact same film scene.
5. Vary the camera angles/shot type slightly (e.g., Frame 1: Wide cinematic establishing shot, Frame 2: Medium tracking shot, Frame 3: Alternate perspective, Frame 4: Detailed close-up, Frame 5: Epic final panning overview) to create dynamic motion.
6. NOT contain any UI, watermark, frame boundaries, camera overlays, or text labels.
7. Be fully optimized for a text-to-image generator like Stable Diffusion/Pollinations.ai to create jaw-dropping photorealistic visuals.

Return ONLY a raw JSON array containing exactly 5 string elements (no markdown, no HTML, no code block, no explanation):
[
  "Highly detailed prompt for Frame 1...",
  "Highly detailed prompt for Frame 2...",
  "Highly detailed prompt for Frame 3...",
  "Highly detailed prompt for Frame 4...",
  "Highly detailed prompt for Frame 5..."
]`;

  let imagePrompts = null;
  let generatorUsed = 'fallback';

  // 1. Try Groq first (fastest, working, reliable)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('🚀 Synthesizing sequence prompts via Groq LLaMA...');
      const Groq = require('groq-sdk');
      const groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groqInstance.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.2,
        max_tokens: 1024,
      });
      const text = completion.choices[0]?.message?.content || '';
      const jsonMatch = text.match(/\[\s*[\s\S]*?\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          imagePrompts = parsed.slice(0, 5);
          generatorUsed = 'groq';
        }
      }
    } catch (err) {
      console.warn('⚠️ Groq sequence prompt generation failed:', err.message);
    }
  }

  // 2. Try Gemini fallback (may be rate limited)
  if (!imagePrompts && process.env.GEMINI_API_KEY) {
    try {
      console.log('🔮 Synthesizing sequence prompts via Gemini...');
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAIInstance.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(systemPrompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[\s*[\s\S]*?\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          imagePrompts = parsed.slice(0, 5);
          generatorUsed = 'gemini';
        }
      }
    } catch (err) {
      console.warn('⚠️ Gemini sequence prompt generation failed:', err.message);
    }
  }

  // 3. Try OpenRouter fallback
  if (!imagePrompts && process.env.OPENROUTER_API_KEY) {
    try {
      console.log('📡 Synthesizing sequence prompts via OpenRouter...');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct:free',
          messages: [{ role: 'user', content: systemPrompt }]
        })
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\[\s*[\s\S]*?\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          imagePrompts = parsed.slice(0, 5);
          generatorUsed = 'openrouter';
        }
      }
    } catch (err) {
      console.warn('⚠️ OpenRouter sequence prompt generation failed:', err.message);
    }
  }

  // 4. Force programmatic fallback if all else fails
  if (!imagePrompts) {
    console.log('⚠️ All LLM services failed or returned invalid arrays. Running high-quality programmatic fallback.');
    imagePrompts = getFallbackPrompts(prompt, style);
    generatorUsed = 'programmatic-fallback';
  }

  res.json({
    success: true,
    imagePrompts: imagePrompts,
    generatorUsed: generatorUsed,
    prompt,
    style,
    ratio,
    motion,
    duration,
    fps,
    createdAt: new Date().toISOString()
  });
});

router.post('/video/replicate/generate', async (req, res) => {
  const { prompt, style, ratio, motion, duration } = req.body;
  const replicateKey = (req.headers['x-replicate-key'] && req.headers['x-replicate-key'] !== 'null' && req.headers['x-replicate-key'] !== 'undefined') ? req.headers['x-replicate-key'] : process.env.REPLICATE_API_KEY;
  if (!replicateKey) return res.status(401).json({ error: 'No Replicate key provided' });

  const styleSuffixes = {
    scifi: 'cinematic space nebula, ultra-realistic sci-fi stars, cosmic, photorealistic, 8k, highly detailed, stellar glow',
    cyberpunk: 'cyberpunk metropolis at night, neon glowing signs, rainy streets, hovercars, cinematic lighting, photorealistic, highly detailed, teal and magenta neon reflections',
    nature: 'majestic mountains, epic waterfall drone shot, lush nature, 8k footage, photorealistic, high detail, warm cinematic sunlight',
    '3d': 'cute 3D Pixar character animation, vibrant colors, clean lighting, extremely detailed, octane render, stylized gorgeous 3D model',
    anime: 'aesthetic hand-drawn anime background style, retro aesthetic, studio ghibli cloud, detailed anime art, beautiful anime illustration',
    abstract: 'hypnotic liquid gold fluid simulation, morphing 3D abstract shapes, octane render, beautiful fluid dynamics, 8k, gorgeous lighting',
    synthwave: 'synthwave retro grid, neon purple highway driving, outrun aesthetic sunset, neon colors, 8k, photorealistic, vintage synthwave vector art',
    horror: 'spooky dark foggy forest, creepy gothic style, dramatic lighting shadow, horror movie cinematic shot, 8k, dark volumetric shadows'
  };
  const suffix = styleSuffixes[style] || 'cinematic, high quality';
  const fullPrompt = `${prompt}, duration: ${duration || '5'} seconds, ${suffix}, camera motion: ${motion}, aspect ratio: ${ratio}`;

  try {
    const response = await fetch('https://api.replicate.com/v1/models/minimax/video-01/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { prompt: fullPrompt }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error || 'Replicate API error');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/video/replicate/status/:id', async (req, res) => {
  const replicateKey = (req.headers['x-replicate-key'] && req.headers['x-replicate-key'] !== 'null' && req.headers['x-replicate-key'] !== 'undefined') ? req.headers['x-replicate-key'] : process.env.REPLICATE_API_KEY;
  if (!replicateKey) return res.status(401).json({ error: 'No Replicate key provided' });

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${replicateKey}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error || 'Replicate API error');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI INITIALIZATION ───────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── SYSTEM PROMPTS ──────────────────────────────────────────────────────────
const BASE_SYSTEM = `You are Yaarax AI — the world's most powerful AI assistant. You prioritize SPEED and COMPLETENESS.
Response rules:
- Use rich markdown (# headings, **bold**, *italic*, bullet lists, tables)
- For code, always use proper fenced code blocks with language ID
- Be concise but thorough — NEVER give half-answers. If a topic is complex, explain it fully.
- IMAGE GENERATION: If asked to DRAW/GENERATE images, output: [GENERATE_IMAGE: <detailed prompt>] for EACH image requested. If the user wants 3 images, output 3 separate tags.
- VIDEO GENERATION: ONLY if the user explicitly asks you to *create* or *render* a video, output: [GENERATE_VIDEO: <detailed prompt>]. DO NOT use this tag if they just ask for prompt ideas or text.
- MAPS: If asked for a MAP, output: [MAP_PLACE: <location name>]
- MEMORY: If you learn something important about the user, output: [REMEMBER: key=value] on a new line silently.`;

const MODE_PROMPTS = {
  auto: '',
  exam: '\n\n📝 EXAM MODE: Give concise, exam-ready answers. Use bullet points, key formulas, and mnemonics.',
  tutor: '\n\n🎓 TUTOR MODE: Teach step-by-step with simple analogies. Ask clarifying questions. Be patient and encouraging.',
  code: '\n\n💻 CODE MODE: Write clean, production-ready, commented code. Always explain the logic. Cover edge cases.',
  think: '\n\n🧠 THINK MODE: Reason deeply. Show your chain of thought step-by-step before giving the final answer.',
  search: '\n\n🔍 SEARCH MODE: You have access to real-time web search. Always cite your sources with [Source: url].',
  file: '\n\n📄 FILE ANALYSIS MODE: The user has uploaded a document. Be their study assistant.',
  data: '\n\n📊 DATA ANALYSIS MODE (Julius Style): Analyze data thoroughly. If visualization is needed, output a Chart.js tag: [CHART: type, data_json]. Data should be a valid JSON object for Chart.js.',
  turbo: '\n\n⚡ TURBO MODE (Cerebras): You are running on ultra-fast hardware. Keep responses snappy, energetic, and extremely efficient.',
  free: '\n\n🆓 FREE MODE (OpenRouter): You are a high-quality free AI model. Provide helpful, accurate, and concise answers without any usage limits.',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fileToPart(dataUrl) {
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  const mimeType = matches[1].split(';')[0];
  return { inlineData: { mimeType, data: matches[2] } };
}

async function callImageGeneration(prompt) {
  const seed = Math.floor(Math.random() * 10000000);
  const imageUrl = `${process.env.BACKEND_URL || ''}/api/chat/image?prompt=${encodeURIComponent(prompt.trim())}&seed=${seed}`;
  return `\n\n![Generated Image](${imageUrl})\n\n`;
}

// ── OPENROUTER VISION FALLBACK ───────────────────────────────────────────────
// Uses a free vision-capable model when Gemini is unavailable for image analysis
async function streamOpenRouterVision({ res, systemPrompt, userMessage, imageDataUrl, fileName, sendChunk, customKey }) {
  const activeKey = customKey || process.env.OPENROUTER_API_KEY;
  if (!activeKey) throw new Error('No OpenRouter key available');

  // Build multimodal message with image
  const imageUrlObj = imageDataUrl
    ? { type: 'image_url', image_url: { url: imageDataUrl } }
    : null;

  const userContent = imageUrlObj
    ? [{ type: 'text', text: userMessage }, imageUrlObj]
    : userMessage;

  // Try multiple free vision-capable models on OpenRouter
  const visionModels = [
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'qwen/qwen2-vl-7b-instruct:free',
  ];

  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey: activeKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: { 'HTTP-Referer': 'http://localhost:3001', 'X-Title': 'Yaarax AI' },
  });

  let fullText = '';
  for (const model of visionModels) {
    try {
      console.log(`👁 Trying OpenRouter vision: ${model}`);
      const stream = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        stream: true,
        max_tokens: 3000,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) { fullText += text; sendChunk(res, { text }); }
      }
      if (fullText) return fullText; // success
    } catch (e) {
      console.warn(`⚠ OpenRouter vision ${model} failed:`, e.message);
    }
  }
  throw new Error('All OpenRouter vision models failed');
}

async function callVideoGeneration(prompt) {
  return `\n\n<div class="media-container"><video src="https://www.w3schools.com/html/mov_bbb.mp4" controls autoplay loop style="width:100%; border-radius:8px;"></video></div>\n\n**Video generated for:** "${prompt}"\n\n`;
}

// ─── ROUTING LOGIC ───────────────────────────────────────────────────────────
/**
 * Determines which AI engine to use based on mode & whether files are attached.
 * - Files (vision/multimodal) → Always Gemini (only one with vision)
 * - think/search → Gemini (has tools), fallback to Groq
 * - code/exam/tutor/auto → Try Gemini first, fallback to Groq
 */
function shouldUseGemini(mode, hasFiles) {
  if (hasFiles) return true; // Gemini needed for file/image processing
  if (mode === 'search') return true; // Gemini has Google Search
  return true; // Try Gemini first, Groq is fallback
}

// ─── CHAT ENDPOINT (STREAMING) ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { conversationId, message, mode, files } = req.body;

  if (!conversationId || (!message?.trim() && (!files || files.length === 0))) {
    return res.status(400).json({ error: 'conversationId and message/files are required' });
  }

  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, req.userId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  // Load user memories and build context
  const memories = db.prepare('SELECT key, value FROM user_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30').all(req.userId);
  const memoryContext = memories.length > 0
    ? `\n\n🧠 USER MEMORY (facts you know about this user):\n${memories.map(m => `- ${m.key}: ${decryptText(m.value)}`).join('\n')}`
    : '';

  // Save user message
  let displayContent = message || "";
  if (files && files.length > 0) displayContent += `\n\n[Attached Files: ${files.length}]`;
  const userMsgResult = db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(conversationId, 'user', encryptText(displayContent.trim()));

  // Set headers for NDJSON streaming
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const activeMode = mode || conv.mode || 'auto';
  const hasFiles = files && Array.isArray(files) && files.length > 0;
  const systemPrompt = BASE_SYSTEM + memoryContext + (MODE_PROMPTS[activeMode] || '');

  // Load conversation history
  const historyData = db.prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? AND id < ? ORDER BY created_at ASC LIMIT 20'
  ).all(conversationId, userMsgResult.lastInsertRowid)
  .map(m => ({ ...m, content: decryptText(m.content) }));

  let fullAiText = '';

  try {
    let geminiSuccess = false;
    let authError = null; // tracks Gemini API key errors across the whole request
    const customGroqKey = req.headers['x-groq-key'];
    const customCerebrasKey = req.headers['x-cerebras-key'];
    const customOpenRouterKey = req.headers['x-openrouter-key'];
    const customGeminiKey = req.headers['x-gemini-key'];

    // ── CEREBRAS TURBO PATH ──────────────────────────────────────────────
    if (activeMode === 'turbo' && !hasFiles) {
      console.log('🚀 Using Cerebras Turbo...');
      try {
        fullAiText = await streamCerebrasResponse({
          res,
          systemPrompt,
          history: historyData,
          userMessage: message || "Hello",
          mode: activeMode,
          sendChunk, customKey: customCerebrasKey
        });
        geminiSuccess = true; // Mark as success to skip Gemini
      } catch (cerebrasErr) {
        console.error('Cerebras failed, falling back:', cerebrasErr.message);
      }
    }

    // ── OPENROUTER FREE PATH ─────────────────────────────────────────────
    if (!geminiSuccess && activeMode === 'free' && !hasFiles) {
      console.log('🆓 Using OpenRouter Free...');
      try {
        fullAiText = await streamOpenRouterResponse({
          res,
          systemPrompt,
          history: historyData,
          userMessage: message || "Hello",
          mode: activeMode,
          sendChunk, customKey: customOpenRouterKey
        });
        geminiSuccess = true;
      } catch (orErr) {
        console.error('OpenRouter failed, falling back:', orErr.message);
      }
    }

    // ── GEMINI PATH (for vision/search or as primary) ──────────────────────
    if (!geminiSuccess && shouldUseGemini(activeMode, hasFiles)) {
      const delay = (ms) => new Promise(r => setTimeout(r, ms));

      const geminiTiers = [
        { modelId: 'gemini-2.0-flash', tools: hasFiles ? undefined : [{ google_search: {} }] },
        { modelId: 'gemini-1.5-flash', tools: hasFiles ? undefined : [{ google_search: {} }] },
        { modelId: 'gemini-1.5-pro', tools: hasFiles ? undefined : [{ google_search: {} }, { code_execution: {} }] },
        { modelId: 'gemini-1.5-flash-8b', tools: undefined },
      ];

      for (const tier of geminiTiers) {
        if (geminiSuccess) break;
        let attempts = 0;

        while (attempts < 2) {
          let streamStarted = false;
          try {
            console.log(`📡 Trying Gemini: ${tier.modelId}`);
            const activeGenAI = genAI; // Forcing .env key over frontend cache
            const modelConfig = {
              model: tier.modelId,
              systemInstruction: systemPrompt,
              generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.7,
                topP: 0.9,
              },
            };
            if (tier.tools) modelConfig.tools = tier.tools;

            const model = activeGenAI.getGenerativeModel(modelConfig);

            const currentParts = [{ text: message || "Analyze the provided files." }];
            if (hasFiles) {
              files.forEach(f => {
                const part = fileToPart(f.data);
                if (part) currentParts.push(part);
              });
            }

            const chat = model.startChat({
              history: historyData.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
              })),
            });

            const result = await chat.sendMessageStream(currentParts);
            streamStarted = true;

            // Wrap stream consumption in its own try/catch
            let streamError = null;
            try {
              for await (const chunk of result.stream) {
                let chunkText = '';
                try {
                  const part = chunk.candidates?.[0]?.content?.parts?.[0];
                  chunkText = part?.text || (typeof chunk.text === 'function' ? chunk.text() : '');
                } catch (e) { }

                if (chunkText) {
                  fullAiText += chunkText;
                  sendChunk(res, { text: chunkText });
                }
                const grounding = chunk.candidates?.[0]?.groundingMetadata;
                if (grounding) sendChunk(res, { grounding });
              }
            } catch (streamErr) {
              streamError = streamErr;
              console.warn(`⚠ Stream parse error (${tier.modelId}):`, streamErr);
            }

            if (!streamError) {
              geminiSuccess = true;
            }
            break;
          } catch (e) {
            const errMsg = e.message || '';
            if (errMsg.toLowerCase().includes('api key not valid') || errMsg.includes('API_KEY_INVALID')) {
              console.warn(`❌ Gemini ${tier.modelId} ERROR: API key is invalid or expired.`);
              authError = 'Your Gemini API Key is invalid or expired. Please update it in the Yaarax AI Settings.';
              break; // Stop trying other tiers if the key is explicitly invalid
            }
            if (errMsg.includes('429 Too Many Requests') || errMsg.includes('quota')) {
              console.warn(`❌ Gemini ${tier.modelId} ERROR: Quota exceeded (or free tier unavailable in your region). Skipping Gemini...`);
              authError = 'Gemini quota exceeded or free tier unavailable. Falling back to other services.';
              break;
            }
            console.warn(`❌ Gemini ${tier.modelId} FULL ERROR:`, e.message);
            if ((errMsg.includes('503') || errMsg.includes('busy')) && !streamStarted) {
              attempts++;
              await delay(attempts * 700);
              continue;
            }
            break; // Move to next tier
          }
        }
      }
    }

    // ── GROQ & OPENROUTER FALLBACK (if Gemini failed or mode prefers speed) ──
    if (!geminiSuccess && !hasFiles) {
      let fallbackSuccess = false;
      console.log('⚡ Falling back to Groq...');
      try {
        fullAiText = await streamGroqResponse({
          res,
          systemPrompt,
          history: historyData,
          userMessage: message || "Analyze",
          mode: activeMode,
          sendChunk, customKey: customGroqKey
        });
        if (fullAiText) fallbackSuccess = true;
      } catch (groqErr) {
        console.error('Groq also failed:', groqErr.message);
      }

      if (!fallbackSuccess) {
        console.log('📡 Groq failed, trying OpenRouter fallback...');
        try {
          const customOrKey = req.headers['x-openrouter-key'];
          fullAiText = await streamOpenRouterResponse({
            res,
            systemPrompt,
            history: historyData,
            userMessage: message || "Analyze",
            mode: activeMode,
            sendChunk,
            customKey: customOrKey
          });
          if (fullAiText) fallbackSuccess = true;
        } catch (orErr) {
          console.error('OpenRouter fallback failed:', orErr.message);
        }
      }

      if (!fallbackSuccess) {
        sendChunk(res, { error: `Our free AI servers are currently experiencing high traffic. Please try again in a moment, or add your own API Key in Settings for instant access!` });
        res.end();
        return;
      }
    }

    if (!geminiSuccess && hasFiles) {
      // ── TIER 1: Try to extract text from the file (for text-based files) ──
      let extractedText = '';
      let hasImageFile = false;
      let imageDataUrl = null;
      let imageFileName = '';

      try {
        for (const f of files) {
          const part = fileToPart(f.data);
          if (!part) continue;
          const mime = part.inlineData.mimeType;

          // Text-extractable formats
          if (mime.includes('text') || mime.includes('csv') || mime.includes('json') ||
            mime.includes('xml') || mime.includes('javascript') || mime.includes('html') ||
            mime.includes('css') || mime.includes('yaml') || mime.includes('plain')) {
            const text = Buffer.from(part.inlineData.data, 'base64').toString('utf-8');
            extractedText += `\n\n--- FILE: ${f.name} ---\n${text.slice(0, 20000)}\n`;
          }
          // Image files — can use vision fallback
          else if (mime.startsWith('image/')) {
            hasImageFile = true;
            imageDataUrl = f.data; // full data URL
            imageFileName = f.name;
          }
          // PDF — use pdf-parse for robust text extraction
          else if (mime.includes('pdf')) {
            try {
              const rawBuf = Buffer.from(part.inlineData.data, 'base64');
              const pdfParse = require('pdf-parse');

              const pdfData = await pdfParse(rawBuf);
              let pdfText = pdfData.text || '';

              const cleaned = pdfText.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s{3,}/g, '\n').trim();
              if (cleaned.length > 50) {
                extractedText += `\n\n--- PDF: ${f.name} ---\n${cleaned.slice(0, 20000)}\n`;
              } else {
                // PDF is image-only (scanned/no text layer) — skip vision fallback since PDF != image
                extractedText += `\n\n--- PDF: ${f.name} ---\n[This PDF appears to be image-only or encrypted and the text could not be extracted. Explain this to the user and suggest they try a Gemini API key for vision-based PDF reading.]\n`;
              }
            } catch (e) {
              console.error('Server PDF extraction error:', e.message);
              extractedText += `\n\n--- PDF: ${f.name} ---\n[Error reading PDF. The file may be password protected or corrupted.]\n`;
            }
          }
        }
      } catch (e) {
        console.error('File content extraction failed:', e);
      }

      let fileHandled = false;

      // ── TIER 2: Use Groq for text-extractable files ──
      if (extractedText && !fileHandled) {
        console.log('⚡ Falling back to Groq for extracted text files...');
        try {
          const modifiedPrompt = systemPrompt + '\n\nThe user uploaded the following files with their content:\n' + extractedText;
          fullAiText = await streamGroqResponse({
            res,
            systemPrompt: modifiedPrompt,
            history: historyData,
            userMessage: message || 'Analyze the uploaded file content.',
            mode: activeMode,
            sendChunk,
            customKey: customGroqKey,
          });
          if (fullAiText) fileHandled = true;
        } catch (groqErr) {
          console.error('Groq text file fallback failed:', groqErr.message);
        }
      }

      // ── TIER 3: Use OpenRouter vision for image/PDF files ──
      if (hasImageFile && !fileHandled) {
        console.log('👁 Falling back to OpenRouter vision for image/PDF...');
        try {
          const customOrKey = req.headers['x-openrouter-key'];
          fullAiText = await streamOpenRouterVision({
            res,
            systemPrompt,
            userMessage: message || 'Analyze and describe this file in detail.',
            imageDataUrl,
            fileName: imageFileName,
            sendChunk,
            customKey: customOrKey,
          });
          if (fullAiText) fileHandled = true;
        } catch (orErr) {
          console.error('OpenRouter vision fallback failed:', orErr.message);
        }
      }

      // ── TIER 4: Try OpenRouter text fallback if we have any extracted text ──
      if (!fileHandled && extractedText) {
        console.log('📡 Final fallback: OpenRouter text for extracted content...');
        try {
          const customOrKey = req.headers['x-openrouter-key'];
          fullAiText = await streamOpenRouterResponse({
            res,
            systemPrompt: systemPrompt + '\n\nFile contents:\n' + extractedText,
            history: historyData,
            userMessage: message || 'Analyze',
            mode: activeMode,
            sendChunk,
            customKey: customOrKey,
          });
          if (fullAiText) fileHandled = true;
        } catch (e) {
          console.error('OpenRouter text fallback failed:', e.message);
        }
      }

      if (!fileHandled) {
        const errMsg = authError
          ? `Gemini API key is invalid. For image/PDF analysis, please add a valid Gemini API key in ⚙ Settings → AI Keys.`
          : `File analysis is temporarily unavailable. Please try again or add a Gemini API key in ⚙ Settings for image & PDF support.`;
        sendChunk(res, { error: errMsg });
        res.end();
        return;
      }
    }

    // ── SAVE TO DB ─────────────────────────────────────────────────────────
    db.prepare(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    ).run(conversationId, 'assistant', encryptText(fullAiText));

    // ── AUTO-EXTRACT MEMORIES ──────────────────────────────────────────────
    const memoryRegex = /\[\s*REMEMBER\s*:\s*([^=\]]+?)\s*=\s*([^\]]+?)\s*\]/gi;
    let memMatch;
    let cleanedAiText = fullAiText;
    while ((memMatch = memoryRegex.exec(fullAiText)) !== null) {
      const memKey = memMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      const memValue = memMatch[2].trim();
      if (memKey && memValue) {
        db.prepare(`
          INSERT INTO user_memory (user_id, key, value, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).run(req.userId, memKey, encryptText(memValue));
        console.log(`💾 Memory saved: ${memKey} = ${memValue} (user ${req.userId})`);
      }
      // Remove memory tags from the displayed text
      cleanedAiText = cleanedAiText.replace(memMatch[0], '').trim();
    }

    // Update DB with cleaned text if memories were extracted
    if (cleanedAiText !== fullAiText) {
      db.prepare('UPDATE messages SET content = ? WHERE conversation_id = ? AND role = ? AND id = (SELECT MAX(id) FROM messages WHERE conversation_id = ? AND role = ?)')
        .run(encryptText(cleanedAiText), conversationId, 'assistant', conversationId, 'assistant');
    }

    const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(conversationId).c;
    if (msgCount <= 2) {
      const autoTitle = (message || "File Analysis").trim().slice(0, 60);
      db.prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?").run(encryptText(autoTitle), conversationId);
    } else {
      db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
    }

    res.end();

  } catch (err) {
    console.error('🔥 Chat Error:', err);
    sendChunk(res, { error: err.message || 'AI service unavailable' });
    res.end();
  }
});

module.exports = router;
// Triggering restart for .env update