const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'server/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      "What is this document?",
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPU0FBAAAAQQgEwCmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKMTUKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1LjI4IDg0MS44OV0vUGFyZW50IDUgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA2IDAgUj4+Pj4vQ29udGVudHMgMiAwIFI+PgplbmRvYmoKCjUgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzQgMCBSXS9Db3VudCAxPj4KZW5kb2JqCgoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyA1IDAgUj4+CmVuZG9iagoKNyAwIG9iago8PC9UeXBlL0luZm8vUHJvZHVjZXIoR29zdHNjcmlwdCkgL0NyZWF0aW9uRGF0ZShEOjIwMjQxMDAxMDAwMDAwWik+PgplbmRvYmoKCjYgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCgp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAyMzEgMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDk5IDAwMDAwIG4gCjAwMDAwMDAxMTYgMDAwMDAgbiAKMDAwMDAwMDI3NiAwMDAwMCBuIAowMDAwMDAwMzkzIDAwMDAwIG4gCjAwMDAwMDAzMDIgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDgvUm9vdCAxIDAgUi9JbmZvIDcgMCBSPj4Kc3RhcnR4cmVmCjQ5NQolJUVPRgo='
        }
      }
    ]);
    console.log(result.response.text());
  } catch (e) {
    console.error('API ERROR:', e);
  }
}

test();
