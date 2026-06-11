const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';

/**
 * Envoie un prompt à Groq et retourne le texte de réponse
 */
const ask = async (prompt) => {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  });
  return completion.choices[0].message.content;
};

/**
 * Envoie un prompt et parse la réponse en JSON
 */
const askJSON = async (prompt, opts = {}) => {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 4096,
    response_format: { type: 'json_object' }, // Force JSON
  });
  const text = completion.choices[0].message.content;
  return JSON.parse(text);
};

module.exports = { ask, askJSON };
