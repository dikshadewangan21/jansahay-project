/**
 * 📄 AI & OCR Document Processing Service
 * JanSahay — Optical Character Recognition for Paper Surveys,
 * Physical Complaints, and Field Inspection Forms.
 *
 * Extracts text from uploaded images using Tesseract.js,
 * then parses structured civic problem fields:
 *   - Category (water, electricity, roads, sanitation, health, etc.)
 *   - Title & full description
 *   - Location (Ward & Area matching Raipur presets)
 *   - Affected population count
 *   - Urgency keywords & tags
 */

const { createWorker } = require('tesseract.js');
const logger = require('../config/logger');

const WARD_LOOKUP = [
  { keywords: ['shankar nagar', 'shankar', 'ward 7'],  ward: 'Ward 7',  area: 'Shankar Nagar', lat: 21.2514, lng: 81.6296 },
  { keywords: ['kurud road', 'kurud', 'ward 9'],        ward: 'Ward 9',  area: 'Kurud Road',    lat: 21.2550, lng: 81.6350 },
  { keywords: ['tatiband', 'tatibandh', 'ward 12'],     ward: 'Ward 12', area: 'Tatiband',      lat: 21.2389, lng: 81.6500 },
  { keywords: ['raipur colony', 'ward 15'],             ward: 'Ward 15', area: 'Raipur Colony', lat: 21.2450, lng: 81.6400 },
  { keywords: ['pandri', 'ward 18'],                    ward: 'Ward 18', area: 'Pandri',        lat: 21.2460, lng: 81.6500 },
  { keywords: ['telibandha', 'telibanda', 'ward 19'],   ward: 'Ward 19', area: 'Telibandha',    lat: 21.2520, lng: 81.6580 },
  { keywords: ['kota', 'ward 22'],                      ward: 'Ward 22', area: 'Kota',          lat: 21.2300, lng: 81.6700 },
  { keywords: ['urla', 'industrial', 'ward 3'],         ward: 'Ward 3',  area: 'Urla Industrial Area', lat: 21.2600, lng: 81.6150 },
  { keywords: ['mg road', 'm.g. road', 'ward 5'],       ward: 'Ward 5',  area: 'MG Road',       lat: 21.2490, lng: 81.6320 },
];

const CATEGORY_KEYWORDS = {
  water:          ['water', 'pipe', 'leak', 'tap', 'contamination', 'borewell', 'handpump', 'drinking water', 'drainage', 'tanker', 'pani', 'jal'],
  electricity:    ['electricity', 'power', 'outage', 'wire', 'pole', 'transformer', 'voltage', 'spark', 'bijli', 'current'],
  roads:          ['road', 'pothole', 'street', 'footpath', 'accident', 'traffic', 'repair', 'asphalt', 'sadak', 'gaddha'],
  sanitation:     ['garbage', 'waste', 'dump', 'sewage', 'smell', 'mosquito', 'gutter', 'cleaning', 'kachra', 'safai'],
  health:         ['health', 'hospital', 'doctor', 'dengue', 'malaria', 'fever', 'medicine', 'illness', 'clinic', 'phc', 'aspatal', 'bimari'],
  food:           ['food', 'ration', 'hunger', 'pds', 'starvation', 'meal', 'grain', 'bpl', 'khana', 'anaj'],
  shelter:        ['shelter', 'roof', 'collapse', 'homeless', 'displaced', 'flood', 'demolition', 'tarp', 'makan'],
  infrastructure: ['building', 'bridge', 'structure', 'wall', 'community hall', 'crack', 'drain'],
  air:            ['air', 'smoke', 'pollution', 'dust', 'aqi', 'furnace', 'toxic', 'hawa', 'dhua'],
};

/**
 * Run OCR on an image buffer or file path.
 * @param {string|Buffer} imageSource - local file path or buffer
 * @returns {Promise<object>} extracted text and parsed civic entities
 */
async function processDocumentOcr(imageSource) {
  let rawText = '';
  let confidence = 0;

  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(imageSource);
    rawText = ret.data.text || '';
    confidence = Math.round(ret.data.confidence || 0);
    await worker.terminate();
  } catch (err) {
    logger.error('OCR processing error:', { error: err.message });
    throw new Error(`OCR processing failed: ${err.message}`);
  }

  const cleanText = rawText.trim();
  const parsed = parseCivicEntities(cleanText);

  return {
    success: true,
    confidence,
    rawText: cleanText,
    detected: parsed,
  };
}

/**
 * Intelligent entity extraction from OCR text.
 */
function parseCivicEntities(text) {
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Detect Category
  let detectedCategory = 'infrastructure';
  let maxCatMatches = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let matches = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) matches++;
    }
    if (matches > maxCatMatches) {
      maxCatMatches = matches;
      detectedCategory = cat;
    }
  }

  // 2. Detect Location / Ward
  let detectedLocation = {
    ward: 'Ward 7',
    area: 'Shankar Nagar',
    lat: 21.2514,
    lng: 81.6296,
  };

  for (const item of WARD_LOOKUP) {
    if (item.keywords.some((k) => lower.includes(k))) {
      detectedLocation = {
        ward: item.ward,
        area: item.area,
        lat: item.lat,
        lng: item.lng,
      };
      break;
    }
  }

  // 3. Detect Affected Count
  let affectedCount = 0;
  const numMatch = lower.match(/(\d{1,5})\s*(?:people|residents|families|households|cases|persons|affected)/i) ||
                   lower.match(/(?:affected|count|people|cases)[:\s]*(\d{1,5})/i);
  if (numMatch && numMatch[1]) {
    affectedCount = parseInt(numMatch[1], 10);
  }

  // 4. Generate Title & Description
  // Find a good title line (ignore generic headers like "Survey Form", "JanSahay", "Report")
  const ignorePatterns = /^(survey|form|complaint form|report|date|name|ward|location|jansahay|government)/i;
  const contentLines = lines.filter((l) => !ignorePatterns.test(l) && l.length > 8);

  const titleCandidate = contentLines[0] || lines[0] || `${detectedCategory.toUpperCase()} issue reported in ${detectedLocation.area}`;
  const title = titleCandidate.slice(0, 120);

  const description = lines.join(' ').slice(0, 1500) || `Civic issue regarding ${detectedCategory} documented in paper survey from ${detectedLocation.area}.`;

  // 5. Detect Urgency Tags
  const detectedTags = [];
  const tagKeywords = ['urgent', 'emergency', 'children', 'hospital', 'outbreak', 'danger', 'hazard', 'safety', 'elderly', 'contamination'];
  tagKeywords.forEach((tag) => {
    if (lower.includes(tag)) detectedTags.push(tag);
  });

  return {
    category: detectedCategory,
    title,
    description,
    location: detectedLocation,
    affectedCount: affectedCount || 25,
    tags: detectedTags.length > 0 ? detectedTags : [detectedCategory, 'paper_survey'],
    source: 'paper_survey',
  };
}

module.exports = { processDocumentOcr, parseCivicEntities };
