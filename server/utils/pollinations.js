const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: "none",
  baseURL: "https://text.pollinations.ai/openai"
});

/**
 * Streams a completely free, keyless response from Pollinations.ai
 */
async function streamPollinationsResponse({ res, systemPrompt, history, userMessage, sendChunk }) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    let fullText = '';
    console.log(`📡 Trying Pollinations fallback (free tier, no key required)...`);
    
    const stream = await client.chat.completions.create({
      model: 'openai',
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
    
    throw new Error('Pollinations stream returned empty');
  } catch (err) {
    console.error('🔥 Pollinations Error:', err);
    throw err;
  }
}

module.exports = { streamPollinationsResponse };
