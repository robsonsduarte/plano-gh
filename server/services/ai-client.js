import OpenAI from 'openai';
import Groq from 'groq-sdk';

/**
 * Unified AI client with automatic fallback: OpenAI → Groq.
 * Both use the same chat.completions.create() API shape.
 */

let openaiClient = null;
let groqClient = null;

function getOpenAI() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getGroq() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// Model mapping
const MODELS = {
  openai: { text: 'gpt-4o-mini', vision: 'gpt-4o-mini' },
  groq: { text: 'llama-3.3-70b-versatile', vision: 'llama-3.2-90b-vision-preview' }
};

/**
 * Send a chat completion request with automatic fallback.
 * Tries OpenAI first; if it fails (no key, rate limit, error), falls back to Groq.
 * @param {object} opts - { messages, temperature, max_tokens, needsVision }
 * @returns {{ text: string, provider: string }}
 */
export async function chatCompletion({ messages, temperature = 0.3, max_tokens = 1000, needsVision = false }) {
  // Try OpenAI first
  const oai = getOpenAI();
  if (oai) {
    try {
      const model = needsVision ? MODELS.openai.vision : MODELS.openai.text;
      const response = await oai.chat.completions.create({
        model, messages, temperature, max_tokens
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (text) return { text, provider: 'openai' };
    } catch (err) {
      process.stderr.write(`OpenAI error (falling back to Groq): ${err.message}\n`);
    }
  }

  // Fallback to Groq
  const groq = getGroq();
  if (groq) {
    try {
      const model = needsVision ? MODELS.groq.vision : MODELS.groq.text;
      // Groq vision doesn't support image_url in the same way for all models
      // For text-only, works identically
      const response = await groq.chat.completions.create({
        model, messages, temperature, max_tokens
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (text) return { text, provider: 'groq' };
    } catch (err) {
      process.stderr.write(`Groq error: ${err.message}\n`);
    }
  }

  return { text: null, provider: null };
}

/**
 * Check which providers are available.
 */
export function availableProviders() {
  const providers = [];
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.GROQ_API_KEY) providers.push('groq');
  return providers;
}
