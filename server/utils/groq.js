const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Maps Yaarax AI modes to the best Groq model for the task.
 * All models are FREE on Groq's developer tier.
 */
const GROQ_MODELS = {
  auto:   'llama-3.3-70b-versatile',          // Best general model (ChatGPT 4o level)
  tutor:  'llama-3.3-70b-versatile',          // Great at explanations
  exam:   'llama-3.3-70b-versatile',          // Fast, factual answers
  code:   'llama-3.3-70b-versatile',          // Reliable model for coding tasks
  think:  'deepseek-r1-distill-llama-70b',    // Deep reasoning (Claude Thinking-like)
  search: 'llama-3.3-70b-versatile',          // General (Gemini handles the searching)
};

/**
 * Streams a Groq response and pipes it to the Express response.
 * @param {object} res - Express response object
 * @param {string} systemPrompt - System instruction
 * @param {Array}  history - Chat history array [{role, content}]
 * @param {string} userMessage - Current user message
 * @param {string} mode - Current chat mode
 * @param {function} sendChunk - NDJSON chunk sender
 * @returns {string} - The full AI response text
 */
async function streamGroqResponse({ res, systemPrompt, history, userMessage, mode, sendChunk, customKey }) {
  const modelId = GROQ_MODELS[mode] || GROQ_MODELS.auto;
  console.log(`⚡ Using Groq model: ${modelId} for mode: ${mode}`);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const activeKey = customKey || process.env.GROQ_API_KEY;
  if (!activeKey) throw new Error("No Groq API Key provided");
  const activeGroq = new Groq({ apiKey: activeKey });
  
  const stream = await activeGroq.chat.completions.create({
    model: modelId,
    messages,
    stream: true,
    max_tokens: 4096,
    temperature: mode === 'think' ? 0.6 : 0.7,
  });

  let fullText = '';
  let thinkingText = '';
  let inThinking = false;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (!delta) continue;

    let remaining = delta;

    while (remaining) {
      if (!inThinking) {
        const index = remaining.indexOf('<think>');
        if (index >= 0) {
          // Send text before <think>
          const before = remaining.substring(0, index);
          if (before) {
            fullText += before;
            sendChunk(res, { text: before });
          }
          inThinking = true;
          remaining = remaining.substring(index + 7);
        } else {
          // No <think> tag, entire remaining is normal text
          fullText += remaining;
          sendChunk(res, { text: remaining });
          break;
        }
      } else {
        const index = remaining.indexOf('</think>');
        if (index >= 0) {
          // Extract thinking text before </think>
          const before = remaining.substring(0, index);
          thinkingText += before;
          
          // Send thinking block to frontend
          const cleanedThinking = thinkingText.trim();
          if (cleanedThinking) {
            sendChunk(res, { thinking: cleanedThinking });
          }
          thinkingText = '';
          inThinking = false;
          remaining = remaining.substring(index + 8);
        } else {
          // No </think> tag, entire remaining is thinking text
          thinkingText += remaining;
          break;
        }
      }
    }
  }

  return fullText;
}

module.exports = { streamGroqResponse, GROQ_MODELS };
