require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function run() {
  try {
    const models = genAI.listModels();
    for await (const m of models) {
      if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
        console.log(m.name);
      }
    }
  } catch(e) { console.error('ERR:', e.message); }
}
run();
