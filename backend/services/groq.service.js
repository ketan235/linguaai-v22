// services/groq.service.js — Groq provider (LLaMA 3, Mixtral, Gemma)
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Models tried in order — llama3 has the highest free quota on Groq
const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

const SYSTEM_PROMPT = `You are LinguaAI, an expert multilingual assistant and translator. You can:
1. Translate text between any of the world's languages with high accuracy
2. Detect the language of any text automatically
3. Answer questions in any language
4. Analyze and translate documents
5. Help users communicate across language barriers

Always be helpful, accurate, and culturally sensitive. When translating, preserve the original meaning, tone, and nuance.
When asked to translate, provide ONLY the translation unless additional context is explicitly requested.
If the user writes in a non-English language, respond in that same language unless they ask otherwise.`;

// ── Core: try each model until one works ─────────────
async function withFallback(messages, options = {}) {
  let lastErr;
  for (const model of MODELS) {
    try {
      const res = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: options.maxTokens || 2048,
        ...options
      });
      return res.choices[0]?.message?.content || '';
    } catch (err) {
      lastErr = err;
      const msg = err.message || '';
      const status = err.status || err.statusCode || 0;
      const retryable = status === 404 || status === 429 ||
        msg.includes('404') || msg.includes('429') ||
        msg.includes('quota') || msg.includes('rate limit') ||
        msg.includes('model_not_found') || msg.includes('not found');
      if (retryable) {
        console.warn(`⚠️  [${model}] ${msg.slice(0, 80)} — trying next model...`);
        continue;
      }
      throw err;
    }
  }
  const msg = lastErr?.message || '';
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
    throw new Error('Groq API rate limit hit on all models. Please wait ~30 seconds and retry.');
  }
  throw lastErr;
}

// ── Chat with history ──────────────────────────────
export async function chatWithHistory(history = [], userMessage, targetLanguage = null) {
  const systemContent = targetLanguage
    ? `${SYSTEM_PROMPT}\n\nThe user prefers responses in: ${targetLanguage}`
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemContent },
    ...history.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  return withFallback(messages);
}

// ── Translate text ─────────────────────────────────
export async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
  const src = sourceLanguage === 'auto'
    ? 'Detect the source language automatically.'
    : `Source language: ${sourceLanguage}.`;

  const messages = [
    { role: 'system', content: 'You are a professional translator. Return only valid JSON, no markdown, no extra text.' },
    { role: 'user', content: `${src} Translate the following text to ${targetLanguage}.
Return a JSON object with exactly these fields:
{"translation":"the translated text","detectedLanguage":"source language name in English","confidence":"high|medium|low"}

Text: ${text}` }
  ];

  const raw = await withFallback(messages, { maxTokens: 1024, temperature: 0.3 });
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { translation: raw, detectedLanguage: 'Unknown', confidence: 'medium' };
  }
}

// ── Detect language ───────────────────────────────
export async function detectLanguage(text) {
  const messages = [
    { role: 'system', content: 'You detect languages. Return only valid JSON, no markdown.' },
    { role: 'user', content: `Detect the language of this text and return ONLY a JSON object:
{"language":"language name in English","code":"ISO 639-1 code","confidence":"high|medium|low"}

Text: ${text.substring(0, 500)}` }
  ];

  try {
    const raw = await withFallback(messages, { maxTokens: 128, temperature: 0.1 });
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { language: 'Unknown', code: 'unknown', confidence: 'low' };
  }
}

// ── Document translation ──────────────────────────
export async function translateDocumentContent(text, targetLanguage, sourceLanguage = 'auto') {
  const maxChunk = 6000;
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChunk) chunks.push(text.slice(i, i + maxChunk));

  const src = sourceLanguage === 'auto'
    ? 'Detect the source language automatically.'
    : `Source language: ${sourceLanguage}.`;

  const results = [];
  for (const chunk of chunks) {
    const messages = [
      { role: 'system', content: 'You are a professional translator. Return only the translated text, preserving all formatting.' },
      { role: 'user', content: `${src} Translate this text to ${targetLanguage}:\n\n${chunk}` }
    ];
    const out = await withFallback(messages, { maxTokens: 4096, temperature: 0.3 });
    results.push(out);
  }
  return results.join('\n');
}
