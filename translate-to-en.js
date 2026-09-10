'use strict';
/**
 * translate-to-en.js — adapta um roteiro PT-BR pra um Short nativo em inglês
 * (LLM via OpenRouter). Usado tanto pelo sync manual (sync-br-to-en.js) quanto
 * pelo pipeline automático do painel (auto-agent.js → publica nos 2 canais).
 */
const axios = require('axios');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4-5';

async function adaptToEnglish({ title, description, roteiro }) {
  const prompt = `You adapt Brazilian Portuguese YouTube Shorts into native English Shorts.

Return only valid JSON:
{
  "title": "English title, max 80 chars, include #Shorts",
  "script": "spoken English narration, 45-75 words, punchy, native, no URL",
  "hook": "screen hook, max 5 words",
  "description": "English YouTube description with 3-5 hashtags",
  "tags": ["8-12 English tags"],
  "hashtags": ["#Shorts","#Science","#NeuralUpdate"],
  "topic": "short topic for music selection"
}

BR YouTube title: ${title}
BR description: ${description || ''}
BR narration: ${roteiro}`;

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY ausente — não dá pra traduzir automaticamente.');
  }
  const res = await axios.post(OPENROUTER_URL, {
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://neural-update.com.br',
      'X-Title': 'Neural Update English Sync',
    },
    timeout: 60000,
  });
  const text = res.data.choices[0].message.content;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM não devolveu JSON.');
  return JSON.parse(match[0]);
}

module.exports = { adaptToEnglish };
