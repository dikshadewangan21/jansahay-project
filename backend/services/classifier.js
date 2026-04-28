/**
 * Complaint Classifier Service
 *
 * Uses a keyword-scoring approach to classify complaint text into categories.
 * Falls back to 'general' if no strong signal is found.
 *
 * Design: each category has a set of keywords with weights.
 * The category with the highest total weight wins.
 * A confidence score (0–1) is returned alongside the label.
 *
 * Can be swapped for an OpenAI call by replacing `classify()` body
 * with the commented-out GPT section below.
 */

const CATEGORY_KEYWORDS = {
  water: {
    keywords: [
      'water', 'pipe', 'leakage', 'leak', 'flood', 'drinking', 'supply',
      'tap', 'contaminated', 'muddy', 'shortage', 'drainage', 'sewage',
      'borewell', 'handpump', 'tanker', 'waterlogging', 'overflowing',
    ],
    weights: { water: 3, pipe: 2, leak: 2, flood: 2, contaminated: 3, sewage: 2 },
  },
  electricity: {
    keywords: [
      'electricity', 'electric', 'power', 'light', 'wire', 'transformer',
      'outage', 'blackout', 'voltage', 'short circuit', 'pole', 'cable',
      'streetlight', 'meter', 'billing', 'shock', 'wires', 'sparks',
    ],
    weights: { electricity: 3, power: 2, outage: 3, blackout: 3, shock: 3 },
  },
  roads: {
    keywords: [
      'road', 'pothole', 'street', 'path', 'bridge', 'footpath', 'pavement',
      'traffic', 'signal', 'accident', 'construction', 'broken', 'damaged',
      'digging', 'repair', 'highway', 'lane', 'gutter', 'culvert',
    ],
    weights: { pothole: 3, road: 2, bridge: 2, accident: 3 },
  },
  sanitation: {
    keywords: [
      'garbage', 'waste', 'trash', 'dirt', 'filth', 'toilet', 'latrine',
      'drain', 'smell', 'stench', 'cleanliness', 'dump', 'littering',
      'mosquito', 'rats', 'rodent', 'insect', 'hygiene', 'open defecation',
      'nala', 'nalah',
    ],
    weights: { garbage: 3, waste: 2, mosquito: 3, rats: 3, toilet: 2 },
  },
  health: {
    keywords: [
      'hospital', 'clinic', 'doctor', 'medicine', 'disease', 'fever',
      'dengue', 'malaria', 'cholera', 'diarrhoea', 'infection', 'outbreak',
      'ambulance', 'emergency', 'patient', 'pregnant', 'child', 'death',
      'dying', 'hospital', 'nurse', 'blood', 'injury',
    ],
    weights: { dengue: 4, cholera: 4, malaria: 4, emergency: 3, outbreak: 4, death: 4 },
  },
  infrastructure: {
    keywords: [
      'building', 'school', 'park', 'wall', 'roof', 'structure', 'collapse',
      'demolish', 'boundary', 'encroachment', 'land', 'plot', 'construction',
      'unsafe', 'maintenance', 'community hall', 'anganwadi',
    ],
    weights: { collapse: 4, unsafe: 3, encroachment: 3 },
  },
  food: {
    keywords: [
      'food', 'hunger', 'starvation', 'ration', 'grain', 'distribution',
      'pds', 'ration card', 'annapoorna', 'mid-day meal', 'nutrition',
      'malnutrition', 'cooked food', 'supply',
    ],
    weights: { starvation: 4, malnutrition: 4, hunger: 3, ration: 2 },
  },
  shelter: {
    keywords: [
      'shelter', 'house', 'home', 'homeless', 'slum', 'eviction', 'flood',
      'displaced', 'relief camp', 'accommodation', 'roof', 'housing',
    ],
    weights: { homeless: 4, eviction: 4, displaced: 4 },
  },
};

/**
 * Classify a complaint text into a category.
 * @param {string} text - complaint title + description
 * @returns {{ category: string, confidence: number, scores: object }}
 */
function classify(text) {
  if (!text || typeof text !== 'string') {
    return { category: 'infrastructure', confidence: 0, scores: {} };
  }

  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [cat, config] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        // Boost score by weight if defined, else +1
        score += config.weights[keyword] || 1;
      }
    }
    scores[cat] = score;
  }

  // Find winning category
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const [topCategory, topScore] = sorted[0];

  if (topScore === 0) {
    return { category: 'infrastructure', confidence: 0, scores };
  }

  // Confidence: ratio of top score vs total score
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? parseFloat((topScore / totalScore).toFixed(2)) : 0;

  return { category: topCategory, confidence, scores };
}

/*
 * ── OpenAI fallback (uncomment and set OPENAI_API_KEY in .env) ──────────────────
 *
 * const { OpenAI } = require('openai');
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *
 * async function classifyWithGPT(text) {
 *   const completion = await openai.chat.completions.create({
 *     model: 'gpt-3.5-turbo',
 *     messages: [{
 *       role: 'system',
 *       content: `You are a civic complaint classifier. Classify the complaint into exactly ONE of:
 *         water, electricity, roads, sanitation, health, infrastructure, food, shelter.
 *         Respond with JSON only: { "category": "<label>", "confidence": <0-1 float> }`,
 *     }, {
 *       role: 'user', content: text,
 *     }],
 *     max_tokens: 50,
 *   });
 *   return JSON.parse(completion.choices[0].message.content);
 * }
 */

module.exports = { classify };
