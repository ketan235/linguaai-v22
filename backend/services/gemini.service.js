// services/gemini.service.js — Google Gemini provider
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Models tried in order (flash is free-tier, pro is more capable)
const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.0-pro',
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
async function withFallback(prompt, options = {}) {
  let lastErr;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.system || SYSTEM_PROMPT,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens || 2048,
        },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      const msg = err.message || '';
      const status = err.status || err.statusCode || 0;
      const retryable = status === 404 || status === 429 ||
        msg.includes('404') || msg.includes('429') ||
        msg.includes('quota') || msg.includes('rate limit') ||
        msg.includes('not found') || msg.includes('RESOURCE_EXHAUSTED');
      if (retryable) {
        console.warn(`⚠️  [gemini/${modelName}] ${msg.slice(0, 80)} — trying next model...`);
        continue;
      }
      throw err;
    }
  }
  const msg = lastErr?.message || '';
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('RESOURCE_EXHAUSTED')) {
    throw new Error('Gemini API rate limit hit on all models. Please wait ~30 seconds and retry.');
  }
  throw lastErr;
}

// Build a single prompt string from chat history
function buildChatPrompt(history, userMessage, targetLanguage) {
  const systemContent = targetLanguage
    ? `${SYSTEM_PROMPT}\n\nThe user prefers responses in: ${targetLanguage}`
    : SYSTEM_PROMPT;

  const lines = [];
  for (const m of history.slice(-20)) {
    const role = m.role === 'assistant' ? 'Assistant' : 'User';
    lines.push(`${role}: ${m.content}`);
  }
  lines.push(`User: ${userMessage}`);
  lines.push('Assistant:');

  return { prompt: lines.join('\n\n'), system: systemContent };
}

// ── Chat with history ──────────────────────────────
export async function chatWithHistory(history = [], userMessage, targetLanguage = null) {
  const { prompt, system } = buildChatPrompt(history, userMessage, targetLanguage);
  return withFallback(prompt, { system });
}

// ── Translate text ─────────────────────────────────
export async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
  const src = sourceLanguage === 'auto'
    ? 'Detect the source language automatically.'
    : `Source language: ${sourceLanguage}.`;

  const prompt = `${src} Translate the following text to ${targetLanguage}.
Return a JSON object with exactly these fields:
{"translation":"the translated text","detectedLanguage":"source language name in English","confidence":"high|medium|low"}

Return ONLY the JSON object, no markdown, no extra text.

Text: ${text}`;

  const raw = await withFallback(prompt, {
    system: 'You are a professional translator. Return only valid JSON, no markdown, no extra text.',
    temperature: 0.3,
    maxTokens: 1024,
  });
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { translation: raw, detectedLanguage: 'Unknown', confidence: 'medium' };
  }
}

// ── Detect language ───────────────────────────────
export async function detectLanguage(text) {
  const prompt = `Detect the language of this text and return ONLY a JSON object:
{"language":"language name in English","code":"ISO 639-1 code","confidence":"high|medium|low"}

Text: ${text.substring(0, 500)}`;

  try {
    const raw = await withFallback(prompt, {
      system: 'You detect languages. Return only valid JSON, no markdown.',
      temperature: 0.1,
      maxTokens: 128,
    });
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
    const prompt = `${src} Translate this text to ${targetLanguage}. Return only the translated text, preserving all formatting.\n\n${chunk}`;
    const out = await withFallback(prompt, {
      system: 'You are a professional translator. Return only the translated text, preserving all formatting.',
      temperature: 0.3,
      maxTokens: 4096,
    });
    results.push(out);
  }
  return results.join('\n');
}
