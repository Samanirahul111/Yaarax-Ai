/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          Yaarax AI — Full Model Benchmark & Accuracy Test      ║
 * ║   Tests: Gemini 2.5 Pro, Flash, Groq LLaMA, DeepSeek, Qwen  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const fs = require('fs');

// ── ANSI Color Codes ──────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen:'\x1b[42m',
  bgRed:  '\x1b[41m',
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── ALL MODELS TO TEST ────────────────────────────────────────────────────────
const GEMINI_MODELS = [
  { id: 'gemini-2.5-pro-preview-03-25',  provider: 'Google', label: 'Gemini 2.5 Pro Preview'  },
  { id: 'gemini-2.5-flash-preview-04-17',provider: 'Google', label: 'Gemini 2.5 Flash Preview' },
  { id: 'gemini-2.0-flash',              provider: 'Google', label: 'Gemini 2.0 Flash'          },
  { id: 'gemini-2.0-flash-lite',         provider: 'Google', label: 'Gemini 2.0 Flash Lite'     },
];

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile',          provider: 'Groq', label: 'LLaMA 3.3 70B (Versatile)'  },
  { id: 'llama-3.1-8b-instant',             provider: 'Groq', label: 'LLaMA 3.1 8B (Instant)'     },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'Groq', label: 'LLaMA 4 Scout 17B' },
  { id: 'qwen/qwen3-32b',                   provider: 'Groq', label: 'Qwen3 32B'                  },
];

// ── TEST SUITE ────────────────────────────────────────────────────────────────
const TEST_SUITE = [
  // General Knowledge
  {
    category: '🌍 General Knowledge',
    prompt: 'What is the capital of France?',
    keywords: ['paris'],
    maxScore: 10,
  },
  {
    category: '🌍 General Knowledge',
    prompt: 'Who invented the telephone?',
    keywords: ['bell', 'alexander'],
    maxScore: 10,
  },
  {
    category: '🌍 General Knowledge',
    prompt: 'What is the speed of light in km/s? Give only the number.',
    keywords: ['299', '300'],
    maxScore: 10,
  },
  // Math & Reasoning
  {
    category: '🧮 Math & Reasoning',
    prompt: 'A train travels at 60 mph for 2.5 hours. How many miles does it travel? Answer with the number only.',
    keywords: ['150'],
    maxScore: 10,
  },
  {
    category: '🧮 Math & Reasoning',
    prompt: 'What is 17 multiplied by 23? Answer with the number only.',
    keywords: ['391'],
    maxScore: 10,
  },
  {
    category: '🧮 Math & Reasoning',
    prompt: 'If you have 3 apples and give away 2, how many do you have?',
    keywords: ['1', 'one'],
    maxScore: 10,
  },
  // Science
  {
    category: '🔬 Science',
    prompt: 'What is the chemical formula for water?',
    keywords: ['h2o', 'h₂o'],
    maxScore: 10,
  },
  {
    category: '🔬 Science',
    prompt: 'What planet is closest to the Sun?',
    keywords: ['mercury'],
    maxScore: 10,
  },
  {
    category: '🔬 Science',
    prompt: 'What process do plants use to make food from sunlight?',
    keywords: ['photosynthesis'],
    maxScore: 10,
  },
  // Coding
  {
    category: '💻 Coding',
    prompt: 'Write a simple Python function to check if a number is even. Show code only.',
    keywords: ['def', 'return', '%', '== 0', 'even'],
    maxScore: 10,
  },
  {
    category: '💻 Coding',
    prompt: 'What does HTML stand for?',
    keywords: ['hypertext', 'markup', 'language'],
    maxScore: 10,
  },
  // History
  {
    category: '📜 History',
    prompt: 'In which year did World War II end?',
    keywords: ['1945'],
    maxScore: 10,
  },
  {
    category: '📜 History',
    prompt: 'Who was the first person to walk on the Moon?',
    keywords: ['armstrong', 'neil'],
    maxScore: 10,
  },
  // Language & Logic
  {
    category: '🧠 Logic',
    prompt: 'If all cats are animals and all animals need food, do cats need food? Answer yes or no.',
    keywords: ['yes'],
    maxScore: 10,
  },
  {
    category: '🧠 Logic',
    prompt: 'What comes next in the sequence: 2, 4, 8, 16, __?',
    keywords: ['32'],
    maxScore: 10,
  },
];

// ── SCORING FUNCTION ─────────────────────────────────────────────────────────
function scoreResponse(responseText, keywords) {
  const lower = responseText.toLowerCase();
  const matched = keywords.filter(kw => lower.includes(kw.toLowerCase()));
  const score = Math.round((matched.length / keywords.length) * 100);
  return { score, matched, total: keywords.length };
}

// ── CALL GEMINI (non-streaming for benchmark) ─────────────────────────────────
async function callGemini(modelId, prompt) {
  const start = Date.now();
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: 'You are a precise and accurate AI assistant. Give short, direct answers.',
  });

  const result = await model.generateContent(prompt);
  const text   = result.response.text();
  const ms     = Date.now() - start;
  return { text: text.trim(), ms };
}

// ── CALL GROQ (non-streaming for benchmark) ───────────────────────────────────
async function callGroq(modelId, prompt) {
  const start = Date.now();
  const completion = await groq.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: 'You are a precise and accurate AI assistant. Give short, direct answers.' },
      { role: 'user',   content: prompt },
    ],
    stream: false,
    max_tokens: 512,
    temperature: 0.3,
  });
  const text = completion.choices[0]?.message?.content || '';
  // Strip DeepSeek thinking tags
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const ms = Date.now() - start;
  return { text: cleaned, ms };
}

// ── PRINT HEADER ──────────────────────────────────────────────────────────────
function printHeader() {
  console.log('\n' + C.cyan + C.bold + '╔══════════════════════════════════════════════════════════════════╗' + C.reset);
  console.log(C.cyan + C.bold + '║          🚀 Yaarax AI — FULL MODEL BENCHMARK & ACCURACY TEST       ║' + C.reset);
  console.log(C.cyan + C.bold + '║      Testing: Gemini + Groq Models | ' + TEST_SUITE.length + ' Questions per Model        ║' + C.reset);
  console.log(C.cyan + C.bold + '╚══════════════════════════════════════════════════════════════════╝' + C.reset);
  console.log(C.dim + '  Started at: ' + new Date().toLocaleString() + C.reset);
  console.log(C.dim + '  API Keys: GEMINI=' + (process.env.GEMINI_API_KEY ? '✓ Found' : '✗ Missing') +
              ' | GROQ=' + (process.env.GROQ_API_KEY ? '✓ Found' : '✗ Missing') + C.reset + '\n');
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
function progressBar(current, total, width = 30) {
  const filled = Math.round((current / total) * width);
  const bar    = '█'.repeat(filled) + '░'.repeat(width - filled);
  const pct    = Math.round((current / total) * 100);
  return `[${bar}] ${pct}% (${current}/${total})`;
}

// ── SCORE TO COLOR ────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 80) return C.green + C.bold;
  if (score >= 50) return C.yellow;
  return C.red;
}

// ── RUN A SINGLE MODEL BENCHMARK ─────────────────────────────────────────────
async function benchmarkModel(modelInfo, provider) {
  const results     = [];
  let totalScore    = 0;
  let totalMs       = 0;
  let successCount  = 0;
  let failCount     = 0;

  console.log('\n' + C.bold + C.bgBlue + C.white +
    ` 🤖 Testing: ${modelInfo.label} (${modelInfo.id}) ` + C.reset);
  console.log(C.dim + '─'.repeat(68) + C.reset);

  for (let i = 0; i < TEST_SUITE.length; i++) {
    const test = TEST_SUITE[i];

    let responseText = '';
    let ms = 0;
    let error = null;

    try {
      let res;
      if (provider === 'Google') {
        res = await callGemini(modelInfo.id, test.prompt);
      } else {
        res = await callGroq(modelInfo.id, test.prompt);
      }
      responseText = res.text;
      ms           = res.ms;
      successCount++;
    } catch (err) {
      error = err.message?.slice(0, 80) || 'Unknown error';
      failCount++;
    }

    const { score, matched } = scoreResponse(responseText, test.keywords);
    totalScore += score;
    totalMs    += ms;

    const statusIcon  = error ? C.red + 'X' : (score === 100 ? C.green + 'OK' : C.yellow + '~');
    const scoreStr    = scoreColor(score) + score + '%' + C.reset;

    console.log(
      `  ${statusIcon}${C.reset} Q${String(i+1).padStart(2)} ${C.dim}[${String(ms).padStart(4)}ms]${C.reset} ` +
      `${test.category.padEnd(24)} ${scoreStr} ` +
      (error ? C.red + 'ERR: ' + error.slice(0,40) + C.reset : C.dim + responseText.slice(0, 55).replace(/\n/g, ' ') + C.reset)
    );

    results.push({
      category:     test.category,
      prompt:       test.prompt,
      responseText: responseText.slice(0, 300),
      score,
      ms,
      error,
      matched,
      keywords:     test.keywords,
    });

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  const avgScore = Math.round(totalScore / TEST_SUITE.length);
  const avgMs    = Math.round(totalMs    / Math.max(successCount, 1));
  const availability = Math.round((successCount / TEST_SUITE.length) * 100);

  console.log(C.dim + '─'.repeat(68) + C.reset);
  console.log(
    C.bold + `  📊 RESULT: ` +
    scoreColor(avgScore) + `${avgScore}% Accuracy` + C.reset + C.bold +
    ` | ⏱ ${avgMs}ms avg | ` +
    C.green + `${availability}% Availability` + C.reset
  );

  return {
    model:        modelInfo.label,
    modelId:      modelInfo.id,
    provider:     modelInfo.provider,
    avgScore,
    avgMs,
    availability,
    successCount,
    failCount,
    totalTests:   TEST_SUITE.length,
    results,
  };
}

// ── PRINT FINAL LEADERBOARD ───────────────────────────────────────────────────
function printLeaderboard(allResults) {
  console.log('\n\n' + C.cyan + C.bold + '╔══════════════════════════════════════════════════════════════════╗' + C.reset);
  console.log(C.cyan  + C.bold + '║               🏆  FINAL LEADERBOARD — ALL MODELS                  ║' + C.reset);
  console.log(C.cyan  + C.bold + '╚══════════════════════════════════════════════════════════════════╝' + C.reset);

  // Sort by avgScore descending
  const sorted = [...allResults].sort((a, b) => b.avgScore - a.avgScore || a.avgMs - b.avgMs);

  const medals = ['🥇', '🥈', '🥉', '4️⃣ ', '5️⃣ ', '6️⃣ ', '7️⃣ ', '8️⃣ ', '9️⃣ '];

  console.log('\n  ' + C.bold +
    'Rank  Model'.padEnd(38) +
    'Accuracy'.padEnd(12) +
    'Avg Speed'.padEnd(12) +
    'Avail'.padEnd(8) +
    'Provider' +
    C.reset
  );
  console.log('  ' + C.dim + '─'.repeat(80) + C.reset);

  sorted.forEach((r, i) => {
    const rank  = medals[i] || `${i+1}.  `;
    const name  = r.model.slice(0, 30).padEnd(32);
    const score = scoreColor(r.avgScore) + `${r.avgScore}%`.padEnd(10) + C.reset;
    const speed = C.cyan + `${r.avgMs}ms`.padEnd(12) + C.reset;
    const avail = (r.availability >= 80 ? C.green : C.red) + `${r.availability}%`.padEnd(8) + C.reset;
    const prov  = r.provider === 'Google' ? C.blue + r.provider + C.reset : C.magenta + r.provider + C.reset;
    console.log(`  ${rank}  ${name} ${score}  ${speed}${avail}${prov}`);
  });

  console.log('\n' + C.dim + '─'.repeat(82) + C.reset);

  // Best model
  const best = sorted[0];
  console.log(`\n  ${C.green}${C.bold}🏆 BEST MODEL: ${best.model}${C.reset}`);
  console.log(`     • Accuracy:     ${scoreColor(best.avgScore)}${best.avgScore}%${C.reset}`);
  console.log(`     • Avg Speed:    ${C.cyan}${best.avgMs}ms${C.reset}`);
  console.log(`     • Availability: ${C.green}${best.availability}%${C.reset}`);
  console.log(`     • Provider:     ${best.provider}\n`);

  // Category breakdown
  console.log('\n' + C.bold + '  📂 ACCURACY BY CATEGORY (Best Model: ' + best.model + ')' + C.reset);
  console.log('  ' + C.dim + '─'.repeat(60) + C.reset);

  const categories = [...new Set(TEST_SUITE.map(t => t.category))];
  categories.forEach(cat => {
    const catResults = best.results.filter(r => r.category === cat);
    const catAvg     = Math.round(catResults.reduce((s, r) => s + r.score, 0) / catResults.length);
    const bar        = '█'.repeat(Math.floor(catAvg / 5)) + '░'.repeat(20 - Math.floor(catAvg / 5));
    console.log(`  ${cat.padEnd(28)} ${scoreColor(catAvg)}${bar} ${catAvg}%${C.reset}`);
  });
}

// ── SAVE JSON REPORT ─────────────────────────────────────────────────────────
function saveReport(allResults) {
  const report = {
    timestamp:   new Date().toISOString(),
    totalModels: allResults.length,
    totalTests:  TEST_SUITE.length,
    summary: allResults.map(r => ({
      rank:         allResults.sort((a,b) => b.avgScore - a.avgScore).indexOf(r) + 1,
      model:        r.model,
      modelId:      r.modelId,
      provider:     r.provider,
      accuracyPct:  r.avgScore,
      avgSpeedMs:   r.avgMs,
      availability: r.availability,
      passedTests:  r.successCount,
      failedTests:  r.failCount,
    })),
    detailed: allResults,
  };

  const outputPath = __dirname + '/benchmark_results.json';
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return outputPath;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  printHeader();

  if (!process.env.GEMINI_API_KEY || !process.env.GROQ_API_KEY) {
    console.error(C.red + '✗ ERROR: Missing API keys in .env file!' + C.reset);
    process.exit(1);
  }

  const allResults = [];
  const totalModels = GEMINI_MODELS.length + GROQ_MODELS.length;

  console.log(C.bold + `📋 Plan: Testing ${totalModels} models × ${TEST_SUITE.length} questions = ${totalModels * TEST_SUITE.length} total API calls\n` + C.reset);
  console.log(C.yellow + '⚠  This will take a few minutes. Please wait...' + C.reset);

  // ── Test all Gemini models ─────────────────────────────────────────────────
  console.log('\n' + C.blue + C.bold + '━━━━━━━━━━━━━━━ GOOGLE GEMINI MODELS ━━━━━━━━━━━━━━━━━━━━━━━━━━' + C.reset);
  for (const model of GEMINI_MODELS) {
    try {
      const result = await benchmarkModel(model, 'Google');
      allResults.push(result);
    } catch (err) {
      console.error(C.red + `  ✗ Failed to benchmark ${model.label}: ${err.message}` + C.reset);
      allResults.push({
        model: model.label, modelId: model.id, provider: 'Google',
        avgScore: 0, avgMs: 0, availability: 0,
        successCount: 0, failCount: TEST_SUITE.length,
        totalTests: TEST_SUITE.length, results: [],
        fatalError: err.message,
      });
    }
  }

  // ── Test all Groq models ───────────────────────────────────────────────────
  console.log('\n' + C.magenta + C.bold + '━━━━━━━━━━━━━━━━━ GROQ MODELS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + C.reset);
  for (const model of GROQ_MODELS) {
    try {
      const result = await benchmarkModel(model, 'Groq');
      allResults.push(result);
    } catch (err) {
      console.error(C.red + `  ✗ Failed to benchmark ${model.label}: ${err.message}` + C.reset);
      allResults.push({
        model: model.label, modelId: model.id, provider: 'Groq',
        avgScore: 0, avgMs: 0, availability: 0,
        successCount: 0, failCount: TEST_SUITE.length,
        totalTests: TEST_SUITE.length, results: [],
        fatalError: err.message,
      });
    }
  }

  // ── Final Report ───────────────────────────────────────────────────────────
  printLeaderboard(allResults);

  const outputPath = saveReport(allResults);
  console.log(`\n  ${C.green}✅ Full report saved to: ${outputPath}${C.reset}`);
  console.log(C.dim + '  ' + new Date().toLocaleString() + C.reset + '\n');
}

main().catch(err => {
  console.error(C.red + '\n🔥 Fatal Error: ' + err.message + C.reset);
  process.exit(1);
});
