const fs = require('fs');

// --- 1. client/src/components/SettingsModal.jsx ---
let modalPath = 'client/src/components/SettingsModal.jsx';
let modalCode = fs.readFileSync(modalPath, 'utf8');

// Replace state
modalCode = modalCode.replace(
  /const \[replicateKey, setReplicateKey\][\s\S]*?\}\n/,
  `const [keys, setKeys] = useState(() => ({
    replicate: localStorage.getItem('rock_replicate_key') || '',
    gemini: localStorage.getItem('rock_gemini_key') || '',
    groq: localStorage.getItem('rock_groq_key') || '',
    cerebras: localStorage.getItem('rock_cerebras_key') || '',
    openrouter: localStorage.getItem('rock_openrouter_key') || '',
  }));\n\n  function setKey(provider, value) {\n    setKeys(prev => ({...prev, [provider]: value}));\n    if (value) localStorage.setItem(\`rock_\${provider}_key\`, value);\n    else localStorage.removeItem(\`rock_\${provider}_key\`);\n  }\n`
);

// Replace AI tab premium video section with full custom keys section
modalCode = modalCode.replace(
  /<div style={{ marginTop: '30px' }}>[\s\S]*?<\/div>\s*<\/div>\s*\)\}/,
  `<div style={{ marginTop: '30px' }}>
                  <h4>Custom API Keys</h4>
                  <p className="section-desc" style={{ marginBottom: '12px' }}>Override default server keys by providing your own API keys for any provider.</p>
                  
                  <div className="settings-group">
                    <label>Gemini API Key</label>
                    <input type="password" placeholder="AIza..." className="settings-input" value={keys.gemini} onChange={e => setKey('gemini', e.target.value)} />
                  </div>
                  
                  <div className="settings-group">
                    <label>Groq API Key</label>
                    <input type="password" placeholder="gsk_..." className="settings-input" value={keys.groq} onChange={e => setKey('groq', e.target.value)} />
                  </div>
                  
                  <div className="settings-group">
                    <label>Cerebras API Key</label>
                    <input type="password" placeholder="csk-..." className="settings-input" value={keys.cerebras} onChange={e => setKey('cerebras', e.target.value)} />
                  </div>
                  
                  <div className="settings-group">
                    <label>OpenRouter API Key</label>
                    <input type="password" placeholder="sk-or-v1-..." className="settings-input" value={keys.openrouter} onChange={e => setKey('openrouter', e.target.value)} />
                  </div>

                  <div className="settings-group">
                    <label>Replicate API Key (Premium Video)</label>
                    <input type="password" placeholder="r8_..." className="settings-input" value={keys.replicate} onChange={e => setKey('replicate', e.target.value)} />
                  </div>
                </div>
              </div>
            )}`
);

fs.writeFileSync(modalPath, modalCode);


// --- 2. client/src/api/client.js ---
let apiPath = 'client/src/api/client.js';
let apiCode = fs.readFileSync(apiPath, 'utf8');
apiCode = apiCode.replace(
  /function authHeaders\(\) \{\n  return \{\n    'Content-Type': 'application\/json',\n    'Authorization': `Bearer \$\{getToken\(\)\}`,\n  \};\n\}/,
  `function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${getToken()}\`,
    'x-gemini-key': localStorage.getItem('rock_gemini_key') || '',
    'x-groq-key': localStorage.getItem('rock_groq_key') || '',
    'x-openrouter-key': localStorage.getItem('rock_openrouter_key') || '',
    'x-cerebras-key': localStorage.getItem('rock_cerebras_key') || '',
  };
}`
);
fs.writeFileSync(apiPath, apiCode);


// --- 3. server/routes/chat.js ---
let chatPath = 'server/routes/chat.js';
let chatCode = fs.readFileSync(chatPath, 'utf8');

// Inside router.post('/', ...)
// Extract headers at the beginning of the try block
chatCode = chatCode.replace(
  /try \{\n    let geminiSuccess = false;/,
  `try {
    let geminiSuccess = false;
    const customGroqKey = req.headers['x-groq-key'];
    const customCerebrasKey = req.headers['x-cerebras-key'];
    const customOpenRouterKey = req.headers['x-openrouter-key'];
    const customGeminiKey = req.headers['x-gemini-key'];`
);

// Add customKey argument to Cerebras, OpenRouter, Groq
chatCode = chatCode.replace(/streamCerebrasResponse\(\{([\s\S]*?sendChunk,)\s*\}\);/, 'streamCerebrasResponse({$1 customKey: customCerebrasKey });');
chatCode = chatCode.replace(/streamOpenRouterResponse\(\{([\s\S]*?sendChunk,)\s*\}\);/, 'streamOpenRouterResponse({$1 customKey: customOpenRouterKey });');
chatCode = chatCode.replace(/streamGroqResponse\(\{([\s\S]*?sendChunk,)\s*\}\);/g, 'streamGroqResponse({$1 customKey: customGroqKey });');

// Replace genAI instance inside the route if custom key is present
// Find `const model = genAI.getGenerativeModel`
chatCode = chatCode.replace(
  /const model = genAI\.getGenerativeModel/g,
  `const activeGenAI = customGeminiKey ? new GoogleGenerativeAI(customGeminiKey) : genAI;
            const model = activeGenAI.getGenerativeModel`
);

fs.writeFileSync(chatPath, chatCode);


// --- 4. server/utils/groq.js ---
let groqPath = 'server/utils/groq.js';
let groqCode = fs.readFileSync(groqPath, 'utf8');
groqCode = groqCode.replace(/async function streamGroqResponse\(\{\s*res,\s*systemPrompt,\s*history,\s*userMessage,\s*mode,\s*sendChunk\s*\}\) \{/, 
  'async function streamGroqResponse({ res, systemPrompt, history, userMessage, mode, sendChunk, customKey }) {');

groqCode = groqCode.replace(/const stream = await groq\.chat\.completions\.create/g, 
  `const activeKey = customKey || process.env.GROQ_API_KEY;
  if (!activeKey) throw new Error("No Groq API Key provided");
  const activeGroq = new Groq({ apiKey: activeKey });
  
  const stream = await activeGroq.chat.completions.create`);
fs.writeFileSync(groqPath, groqCode);


// --- 5. server/utils/cerebras.js ---
let cerebrasPath = 'server/utils/cerebras.js';
let cerebrasCode = fs.readFileSync(cerebrasPath, 'utf8');
cerebrasCode = cerebrasCode.replace(/async function streamCerebrasResponse\(\{\s*res,\s*systemPrompt,\s*history,\s*userMessage,\s*mode,\s*sendChunk\s*\}\) \{/,
  'async function streamCerebrasResponse({ res, systemPrompt, history, userMessage, mode, sendChunk, customKey }) {');

cerebrasCode = cerebrasCode.replace(/const stream = await client\.chat\.completions\.create/g,
  `const activeKey = customKey || process.env.CEREBRAS_API_KEY;
    if (!activeKey) throw new Error("No Cerebras API Key provided");
    const activeClient = new OpenAI({ apiKey: activeKey, baseURL: "https://api.cerebras.ai/v1" });
    
    const stream = await activeClient.chat.completions.create`);
fs.writeFileSync(cerebrasPath, cerebrasCode);


// --- 6. server/utils/openrouter.js ---
// First need to read it to see how it's structured.
console.log('Done with primary files. Need to check openrouter.');
