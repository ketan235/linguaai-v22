// services/ai.service.js — unified AI provider router
// Selects between Groq and Gemini based on the `provider` parameter.
// Falls back to whichever key is configured if neither is explicitly chosen.

import * as groq   from './groq.service.js';
import * as gemini from './gemini.service.js';

export const PROVIDERS = {
  groq:   'groq',
  gemini: 'gemini',
};

function getDefaultProvider() {
  const hasGroq   = process.env.GROQ_API_KEY   && process.env.GROQ_API_KEY   !== 'your_groq_api_key_here';
  const hasGemini = process.env.GEMINI_API_KEY  && process.env.GEMINI_API_KEY  !== 'your_gemini_api_key_here';
  if (hasGroq)   return PROVIDERS.groq;
  if (hasGemini) return PROVIDERS.gemini;
  return PROVIDERS.groq; // will surface a clear API-key error downstream
}

function resolveProvider(requested) {
  const p = (requested || '').toLowerCase();
  if (p === PROVIDERS.gemini) return PROVIDERS.gemini;
  if (p === PROVIDERS.groq)   return PROVIDERS.groq;
  return getDefaultProvider();
}

function getService(provider) {
  return provider === PROVIDERS.gemini ? gemini : groq;
}

// ── Chat ──────────────────────────────────────────
export async function chatWithHistory(history, userMessage, targetLanguage, provider) {
  const p = resolveProvider(provider);
  return getService(p).chatWithHistory(history, userMessage, targetLanguage);
}

// ── Translate ─────────────────────────────────────
export async function translateText(text, targetLanguage, sourceLanguage, provider) {
  const p = resolveProvider(provider);
  return getService(p).translateText(text, targetLanguage, sourceLanguage);
}

// ── Detect language ───────────────────────────────
export async function detectLanguage(text, provider) {
  const p = resolveProvider(provider);
  return getService(p).detectLanguage(text);
}

// ── Document translation ──────────────────────────
export async function translateDocumentContent(text, targetLanguage, sourceLanguage, provider) {
  const p = resolveProvider(provider);
  return getService(p).translateDocumentContent(text, targetLanguage, sourceLanguage);
}

export { getDefaultProvider, resolveProvider };
