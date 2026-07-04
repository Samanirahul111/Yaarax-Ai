const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3001", // Optional, for OpenRouter rankings
    "X-Title": "Yaarax AI", // Optional, for OpenRouter rankings
  }
});

/**
 * Streams a response from OpenRouter.
 */
async function streamOpenRouterResponse({ res, systemPrompt, history, userMessage, mode, sendChunk, customKey }) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const activeKey = customKey || process.env.OPENROUTER_API_KEY;
    if (!activeKey) throw new Error("No OpenRouter API Key provided");
    const activeClient = new OpenAI({ 
      apiKey: activeKey, 
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "Yaarax AI"
      }
    });
    
    const freeModels = [
      "google/gemini-2.0-flash-lite-preview-02-05:free",
      "meta-llama/llama-3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "nousresearch/hermes-3-llama-3.1-405b:free",
      "qwen/qwen-vl-plus:free"
    ];

    let fullText = '';
    
    for (const model of freeModels) {
      try {
        console.log(`📡 Trying OpenRouter free model: ${model}`);
        const stream = await activeClient.chat.completions.create({
          model: model,
          messages,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            sendChunk(res, { text: content });
          }
        }
        
        if (fullText) return fullText; // Success!
      } catch (e) {
        console.warn(`⚠ OpenRouter ${model} failed:`, e.message);
        // Continue to the next model in the list
      }
    }
    
    throw new Error('All OpenRouter free models failed');
  } catch (err) {
    console.error('🔥 OpenRouter Error:', err);
    throw err;
  }
}

module.exports = { streamOpenRouterResponse };
