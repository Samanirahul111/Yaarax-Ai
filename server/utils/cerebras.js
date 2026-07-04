const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: "https://api.cerebras.ai/v1",
});

/**
 * Streams a response from Cerebras.
 */
async function streamCerebrasResponse({ res, systemPrompt, history, userMessage, mode, sendChunk, customKey }) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const activeKey = customKey || process.env.CEREBRAS_API_KEY;
    if (!activeKey) throw new Error("No Cerebras API Key provided");
    const activeClient = new OpenAI({ apiKey: activeKey, baseURL: "https://api.cerebras.ai/v1" });
    
    const stream = await activeClient.chat.completions.create({
      model: "llama3.1-8b", // Default fast model for Cerebras
      messages,
      stream: true,
      temperature: 0.7,
      max_completion_tokens: 4096,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        sendChunk(res, { text: content });
      }
    }

    return fullText;
  } catch (err) {
    console.error('🔥 Cerebras Error:', err);
    throw err;
  }
}

module.exports = { streamCerebrasResponse };
