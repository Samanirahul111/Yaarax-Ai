const fs = require('fs');

let openrouterPath = 'server/utils/openrouter.js';
let openrouterCode = fs.readFileSync(openrouterPath, 'utf8');

openrouterCode = openrouterCode.replace(/async function streamOpenRouterResponse\(\{\s*res,\s*systemPrompt,\s*history,\s*userMessage,\s*mode,\s*sendChunk\s*\}\) \{/,
  'async function streamOpenRouterResponse({ res, systemPrompt, history, userMessage, mode, sendChunk, customKey }) {');

openrouterCode = openrouterCode.replace(/const stream = await client\.chat\.completions\.create/g,
  `const activeKey = customKey || process.env.OPENROUTER_API_KEY;
    if (!activeKey) throw new Error("No OpenRouter API Key provided");
    const activeClient = new OpenAI({ 
      apiKey: activeKey, 
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "Rock AI"
      }
    });
    
    const stream = await activeClient.chat.completions.create`);

fs.writeFileSync(openrouterPath, openrouterCode);
console.log('OpenRouter updated.');
