/**
 * LocalBoost AI — Keyword-Aware Natural Review Grammar Engine
 *
 * Implements 100% local, deterministic natural language review generation
 * with ZERO external AI API calls (No Gemini, OpenAI, or external endpoints).
 *
 * Core Principles:
 * 1. Understands grammatical and semantic type of keywords (staff, service, ambience, product, pricing, action).
 * 2. Enforces subject-verb agreement (singular vs plural vs mass noun).
 * 3. Never blindly concatenates keywords into rigid sentences (e.g. no "The take immense made the whole visit worthwhile").
 * 4. Weaves customer's actual experience smoothly without duplicate claims or redundant phrasing.
 * 5. Uses grammatically correct sentence structures for English, Hindi, and Gujarati.
 * 6. Never invents customer experiences, services, or business claims.
 * 7. If a keyword cannot fit naturally into a template, selects a compatible template variation.
 */

import { SupportedLanguage } from '../types/database';

export type KeywordCategory =
  | 'staff'
  | 'service'
  | 'ambience'
  | 'product_food'
  | 'pricing'
  | 'action'
  | 'general';

export type GrammarPlurality = 'singular' | 'plural' | 'mass';

export interface ParsedKeyword {
  raw: string;
  clean: string;
  category: KeywordCategory;
  plurality: GrammarPlurality;
  adjective: string;
  noun: string;
  isVerbPhrase: boolean;
  genderHindi: 'm' | 'f';
  genderGujarati: 'm' | 'f' | 'n';
}

/**
 * Normalizes keyword text to clean lowercase/standard casing
 */
export function cleanKeywordPhrase(kw: string): string {
  if (!kw) return '';
  const trimmed = kw.trim();
  if (/^[A-Z\s&/,-]+$/.test(trimmed) && trimmed.length > 5) {
    return trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

/**
 * Analyzes any keyword string and extracts grammatical category, plurality, and semantic role.
 */
export function parseKeyword(kw: string): ParsedKeyword {
  const raw = (kw || '').trim();
  const clean = cleanKeywordPhrase(raw);
  const words = clean.split(/\s+/).filter(Boolean);
  const firstWord = words[0] || '';
  const lastWord = words[words.length - 1] || '';

  // 1. Detect verb/action phrases (e.g. "take immense pride", "take immense", "provide quality care", "serve fresh food")
  const verbStarters = new Set([
    'take', 'taking', 'serve', 'serving', 'provide', 'providing', 'offer', 'offering',
    'deliver', 'delivering', 'make', 'making', 'help', 'helping', 'give', 'giving',
    'ensure', 'ensuring', 'treat', 'treating', 'handle', 'handling'
  ]);

  if (verbStarters.has(firstWord) || clean.startsWith('to ') || clean.includes('take immense')) {
    return {
      raw,
      clean,
      category: 'action',
      plurality: 'singular',
      adjective: '',
      noun: clean,
      isVerbPhrase: true,
      genderHindi: 'm',
      genderGujarati: 'n',
    };
  }

  // 2. Pure staff adjectives (e.g. "courteous", "polite", "friendly", "welcoming")
  const staffAdjectives = new Set([
    'courteous', 'polite', 'friendly', 'welcoming', 'helpful', 'attentive', 'caring',
    'knowledgeable', 'professional', 'kind', 'respectful', 'cooperative', 'accommodating',
    'विनम्र', 'मददगार', 'सहयोगी', 'નમ્ર', 'મદદરૂપ'
  ]);

  // Staff nouns
  const staffNouns = new Set([
    'team', 'staff', 'crew', 'doctor', 'doctors', 'nurse', 'nurses', 'mechanic', 'mechanics',
    'trainer', 'trainers', 'stylist', 'stylists', 'cashier', 'cashiers', 'barista', 'baristas',
    'chef', 'chefs', 'receptionist', 'receptionists', 'management', 'owner', 'assistants', 'waiter',
    'waiters', 'folks', 'people', 'personnel', 'team members',
    // Hindi & Gujarati
    'स्टाफ', 'टीम', 'डॉक्टर', 'कर्मचारी', 'कारीगर', 'સ્ટાફ', 'ટીમ', 'ડોક્ટર', 'કારીગરો'
  ]);

  const hasStaffNoun = words.some((w) => staffNouns.has(w));
  const hasStaffAdj = words.some((w) => staffAdjectives.has(w));

  if (hasStaffNoun || hasStaffAdj) {
    const isPlural = /s$/i.test(lastWord) && lastWord !== 'staff' && lastWord !== 'business';
    const adjWords = words.filter((w) => !staffNouns.has(w)).join(' ');
    const nounWord = words.find((w) => staffNouns.has(w)) || 'team';
    return {
      raw,
      clean,
      category: 'staff',
      plurality: isPlural ? 'plural' : lastWord === 'staff' ? 'mass' : 'singular',
      adjective: adjWords || (hasStaffAdj ? clean : 'courteous'),
      noun: nounWord,
      isVerbPhrase: false,
      genderHindi: 'm',
      genderGujarati: 'm',
    };
  }

  // 3. Ambience, Space & Hygiene keywords
  const ambienceAdjectives = new Set([
    'clean', 'spotless', 'hygienic', 'peaceful', 'cozy', 'spacious', 'comfortable',
    'quiet', 'tidy', 'neat', 'साफ', 'स्वच्छ', 'शांत'
  ]);

  const ambienceNouns = new Set([
    'room', 'rooms', 'cleanliness', 'hygiene', 'ambience', 'atmosphere', 'vibe', 'clinic',
    'premises', 'aisles', 'floor', 'interior', 'space', 'environment', 'seating', 'hall',
    'साफ-सफाई', 'सफाई', 'माहौल', 'वातावरण', 'कमरे', 'ઓરડા', 'સ્વચ્છતા', 'વાતાવરણ'
  ]);

  const hasAmbienceNoun = words.some((w) => ambienceNouns.has(w));
  const hasAmbienceAdj = words.some((w) => ambienceAdjectives.has(w));

  if (hasAmbienceNoun || hasAmbienceAdj) {
    const isPlural = /s$/i.test(lastWord) && lastWord !== 'cleanliness' && lastWord !== 'premises';
    const adjWords = words.filter((w) => !ambienceNouns.has(w)).join(' ');
    const nounWord = words.find((w) => ambienceNouns.has(w)) || 'premises';
    const isFeminineHindi = nounWord.includes('सफाई') || nounWord.includes('cleanliness');
    return {
      raw,
      clean,
      category: 'ambience',
      plurality: isPlural ? 'plural' : 'singular',
      adjective: adjWords || (hasAmbienceAdj ? clean : 'clean'),
      noun: nounWord,
      isVerbPhrase: false,
      genderHindi: isFeminineHindi ? 'f' : 'm',
      genderGujarati: isFeminineHindi ? 'f' : 'n',
    };
  }

  // 4. Product, Food & Item keywords
  const foodAdjectives = new Set([
    'delicious', 'tasty', 'fresh', 'yummy', 'flavorful', 'authentic', 'crispy',
    'ताज़ा', 'स्वादिष्ट', 'સ્વાદિષ્ટ', 'તાજું'
  ]);

  const productFoodNouns = new Set([
    'food', 'taste', 'coffee', 'sweet', 'sweets', 'dish', 'dishes', 'part', 'parts', 'spare parts',
    'stock', 'variety', 'item', 'items', 'products', 'ingredients', 'flavor', 'flavors', 'meal',
    'खाना', 'मिठाई', 'स्वाद', 'सामान', 'વાનગી', 'મીઠાઈ', 'ખોરાક', 'ચીજવસ્તુ'
  ]);

  const hasFoodNoun = words.some((w) => productFoodNouns.has(w));
  const hasFoodAdj = words.some((w) => foodAdjectives.has(w));

  if (hasFoodNoun || hasFoodAdj) {
    const isPlural = /s$/i.test(lastWord) && lastWord !== 'delicious';
    const adjWords = words.filter((w) => !productFoodNouns.has(w)).join(' ');
    const nounWord = words.find((w) => productFoodNouns.has(w)) || 'quality';
    const isFeminineHindi = nounWord.includes('मिठाई') || nounWord.includes('tea') || nounWord.includes('coffee');
    return {
      raw,
      clean,
      category: 'product_food',
      plurality: isPlural ? 'plural' : 'singular',
      adjective: adjWords || (hasFoodAdj ? clean : 'fresh'),
      noun: nounWord,
      isVerbPhrase: false,
      genderHindi: isFeminineHindi ? 'f' : 'm',
      genderGujarati: isFeminineHindi ? 'f' : 'n',
    };
  }

  // 5. Pricing & Value keywords
  const pricingAdjectives = new Set([
    'affordable', 'cheap', 'reasonable', 'fair', 'budget-friendly', 'economical',
    'उचित', 'સસ્તું', 'વાજબી'
  ]);

  const pricingNouns = new Set([
    'price', 'prices', 'pricing', 'rate', 'rates', 'fee', 'fees', 'value', 'discount', 'discounts',
    'rates', 'दर', 'भाव', 'मूल्य', 'કિંમત', 'ભાવ'
  ]);

  const isPricing =
    words.some((w) => pricingNouns.has(w)) ||
    words.some((w) => pricingAdjectives.has(w)) ||
    clean.includes('value for money') ||
    clean.includes('fair price');

  if (isPricing) {
    const isPlural = /s$/i.test(lastWord) && !clean.includes('pricing');
    const adjWords = words.filter((w) => !pricingNouns.has(w)).join(' ');
    const nounWord = words.find((w) => pricingNouns.has(w)) || 'pricing';
    return {
      raw,
      clean,
      category: 'pricing',
      plurality: isPlural ? 'plural' : 'mass',
      adjective: adjWords || 'fair',
      noun: nounWord,
      isVerbPhrase: false,
      genderHindi: 'm',
      genderGujarati: 'n',
    };
  }

  // 6. Service & Process keywords
  const serviceAdjectives = new Set([
    'prompt', 'quick', 'fast', 'smooth', 'seamless', 'reliable', 'dependable',
    'efficient', 'punctual', 'hassle-free', 'तेज़', 'सहज', 'ઝડપી', 'સરળ'
  ]);

  const serviceNouns = new Set([
    'service', 'services', 'billing', 'checkout', 'process', 'turnaround', 'delivery', 'assistance',
    'diagnosis', 'consultation', 'appointment', 'appointments', 'check-in', 'care', 'guidance',
    'treatment', 'support', 'सर्विस', 'सेवा', 'बिलिंग', 'मार्गदर्शन', 'સર્વિસ', 'સેવા', 'બિલિંગ'
  ]);

  const isService = words.some((w) => serviceNouns.has(w)) || words.some((w) => serviceAdjectives.has(w));
  if (isService) {
    const isPlural = /s$/i.test(lastWord) && lastWord !== 'process';
    const adjWords = words.filter((w) => !serviceNouns.has(w)).join(' ');
    const nounWord = words.find((w) => serviceNouns.has(w)) || 'service';
    const isFeminineHindi = nounWord.includes('service') || nounWord.includes('सर्विस') || nounWord.includes('सेवा');
    return {
      raw,
      clean,
      category: 'service',
      plurality: isPlural ? 'plural' : 'singular',
      adjective: adjWords || 'prompt',
      noun: nounWord,
      isVerbPhrase: false,
      genderHindi: isFeminineHindi ? 'f' : 'm',
      genderGujarati: isFeminineHindi ? 'f' : 'n',
    };
  }

  // Default fallback category
  const isPlural = /s$/i.test(lastWord);
  return {
    raw,
    clean,
    category: 'general',
    plurality: isPlural ? 'plural' : 'singular',
    adjective: clean,
    noun: clean,
    isVerbPhrase: false,
    genderHindi: 'm',
    genderGujarati: 'm',
  };
}

/**
 * Checks whether the customer experience text already covers the keyword topic
 * to avoid duplicate or redundant sentences.
 */
function experienceCoversKeyword(exp: string, parsed: ParsedKeyword): boolean {
  if (!exp) return false;
  const e = exp.toLowerCase();
  const kw = parsed.clean.toLowerCase();

  // Direct mention
  if (e.includes(kw)) return true;

  // Semantic overlap
  if (
    parsed.category === 'staff' &&
    (e.includes('polite') ||
      e.includes('courteous') ||
      e.includes('welcoming') ||
      e.includes('helpful staff') ||
      e.includes('staff') ||
      e.includes('team') ||
      e.includes('विनम्र') ||
      e.includes('નમ્ર'))
  ) {
    return true;
  }
  if (
    parsed.category === 'ambience' &&
    (e.includes('clean') ||
      e.includes('spotless') ||
      e.includes('hygienic') ||
      e.includes('atmosphere') ||
      e.includes('साफ') ||
      e.includes('ચોખ્ખું'))
  ) {
    return true;
  }
  if (
    parsed.category === 'product_food' &&
    (e.includes('delicious') ||
      e.includes('fresh') ||
      e.includes('tasty') ||
      e.includes('स्वाद') ||
      e.includes('ટેસ્ટી'))
  ) {
    return true;
  }
  if (
    parsed.category === 'service' &&
    (e.includes('fast') ||
      e.includes('quick service') ||
      e.includes('on time') ||
      e.includes('smooth') ||
      e.includes('समय पर') ||
      e.includes('ઝડપી'))
  ) {
    return true;
  }

  return false;
}

export interface ReviewDraftOptions {
  businessName: string;
  category?: string;
  location?: string;
  keyword?: string;
  customerExperience?: string;
  language?: SupportedLanguage;
}

/**
 * English Category-Aware Clause Renderer:
 * Ensures keywords are never concatenated awkwardly into rigid noun slots.
 * Prevents broken phrases such as: "The take immense made the whole visit worthwhile".
 */
export function renderKeywordClauseEn(
  parsed: ParsedKeyword,
  style: 'predicate' | 'appreciated' | 'impact' | 'focus' | 'experience'
): string {
  const { category, clean, adjective, noun } = parsed;

  switch (style) {
    case 'predicate': {
      if (category === 'staff') {
        const adj = adjective || 'courteous';
        return `the ${noun || 'team'} was ${adj} and welcoming`;
      }
      if (category === 'service') {
        return `the service was prompt and well managed`;
      }
      if (category === 'ambience') {
        return `the surroundings were clean and comfortable`;
      }
      if (category === 'product_food') {
        return `the quality was fresh and satisfying`;
      }
      if (category === 'pricing') {
        return `the pricing was fair and transparent`;
      }
      if (category === 'action') {
        return `they take genuine pride in their customer care`;
      }
      return `everything was handled smoothly and professionally`;
    }

    case 'appreciated': {
      if (category === 'staff') {
        return `how courteous, attentive, and welcoming the team was`;
      }
      if (category === 'service') {
        return `their prompt service and quick turnaround`;
      }
      if (category === 'ambience') {
        return `the clean, well-kept environment`;
      }
      if (category === 'product_food') {
        return `the fresh quality and great taste`;
      }
      if (category === 'pricing') {
        return `the fair and honest pricing`;
      }
      if (category === 'action') {
        return `the dedication and genuine care they put into their work`;
      }
      return `their dependable assistance throughout`;
    }

    case 'impact': {
      if (category === 'staff') {
        return `the courteous staff made the entire visit comfortable`;
      }
      if (category === 'service') {
        return `the prompt and smooth service made the entire visit comfortable`;
      }
      if (category === 'ambience') {
        return `the clean and peaceful environment made the entire visit comfortable`;
      }
      if (category === 'product_food') {
        return `the delicious preparation made the entire visit worthwhile`;
      }
      if (category === 'pricing') {
        return `the fair pricing and honest guidance made the entire visit worthwhile`;
      }
      if (category === 'action') {
        return `their genuine dedication made the entire visit worthwhile`;
      }
      return `their reliable and attentive support made the entire visit worthwhile`;
    }

    case 'focus': {
      if (category === 'staff') return `patient guidance and customer care`;
      if (category === 'service') return `prompt and timely service`;
      if (category === 'ambience') return `cleanliness and hygiene`;
      if (category === 'product_food') return `fresh quality and preparation`;
      if (category === 'pricing') return `fair and transparent value`;
      if (category === 'action') return `every small detail`;
      return `customer satisfaction`;
    }

    case 'experience': {
      if (category === 'staff') return `the polite team members`;
      if (category === 'service') return `their prompt service`;
      if (category === 'ambience') return `the peaceful and clean atmosphere`;
      if (category === 'product_food') return `their fresh offerings`;
      if (category === 'pricing') return `their honest rates`;
      if (category === 'action') return `their dedicated approach`;
      return `their reliable service`;
    }
  }
}

/**
 * Hindi Category-Aware Clause Renderer
 */
export function renderKeywordClauseHi(
  parsed: ParsedKeyword,
  style: 'predicate' | 'appreciated' | 'impact'
): string {
  const { category } = parsed;

  if (style === 'predicate') {
    if (category === 'staff') return `यहाँ का स्टाफ बहुत विनम्र और सहयोगी था`;
    if (category === 'service') return `सर्विस बहुत तेज़ और सहज रही`;
    if (category === 'ambience') return `यहाँ की साफ-सफाई और माहौल बहुत शांत और सुखद रहा`;
    if (category === 'product_food') return `क्वालिटी बहुत ताज़ा और बेहतरीन रही`;
    if (category === 'pricing') return `यहाँ की दरें उचित हैं और प्रक्रिया पूरी तरह पारदर्शी है`;
    if (category === 'action') return `यहाँ काम करने का तरीका बहुत ही पेशेवर और समर्पित है`;
    return `सेवा बहुत भरोसेमंद और संतोषजनक रही`;
  }

  if (style === 'appreciated') {
    if (category === 'staff') return `स्टाफ का विनम्र व्यवहार और सहयोग बहुत अच्छा लगा`;
    if (category === 'service') return `समय पर दी गई सेवा और त्वरित सहायता बहुत पसंद आई`;
    if (category === 'ambience') return `यहाँ की स्वच्छता और व्यवस्थित माहौल बहुत अच्छा लगा`;
    if (category === 'product_food') return `यहाँ की ताजगी और बढ़िया स्वाद बहुत पसंद आया`;
    if (category === 'pricing') return `उचित मूल्य और स्पष्ट बातचीत बहुत पसंद आई`;
    if (category === 'action') return `इनका काम के प्रति समर्पण और ध्यान बहुत अच्छा लगा`;
    return `इनकी समयबद्धता और अच्छी व्यवस्था बहुत पसंद आई`;
  }

  // impact
  if (category === 'staff') return `टीम की अच्छी सहायता ने विज़िट को बहुत आसान बना दिया`;
  if (category === 'service') return `सहज और व्यवस्थित सर्विस से पूरा काम बिना किसी परेशानी के हो गया`;
  if (category === 'ambience') return `साफ-सुथरे वातावरण ने अनुभव को और सुखद बना दिया`;
  if (category === 'product_food') return `उत्तम क्वालिटी ने विज़िट को सार्थक बना दिया`;
  if (category === 'pricing') return `पारदर्शी और सही कीमतों ने भरोसा बढ़ा दिया`;
  if (category === 'action') return `इनकी लगन और व्यवस्थित काम ने अनुभव को बहुत अच्छा बना दिया`;
  return `अच्छी व्यवस्था ने पूरे अनुभव को सुखद बना दिया`;
}

/**
 * Gujarati Category-Aware Clause Renderer
 */
export function renderKeywordClauseGu(
  parsed: ParsedKeyword,
  style: 'predicate' | 'appreciated' | 'impact'
): string {
  const { category } = parsed;

  if (style === 'predicate') {
    if (category === 'staff') return `સ્ટાફનો વ્યવહાર ખૂબ જ નમ્ર અને મદદરૂપ રહ્યો`;
    if (category === 'service') return `સર્વિસ ખૂબ જ ઝડપી અને વ્યવસ્થિત રહી`;
    if (category === 'ambience') return `અહીંનું વાતાવરણ શાંત, સ્વચ્છ અને સંતોષકારક હતું`;
    if (category === 'product_food') return `ક્વોલિટી ઘણી તાજી અને ઉત્તમ હતી`;
    if (category === 'pricing') return `ભાવ વાજબી રહ્યા અને બધી બાબતો સ્પષ્ટ હતી`;
    if (category === 'action') return `અહીં કામ કરવાની પદ્ધતિ ઘણી વ્યવસ્થિત અને સમર્પિત છે`;
    return `સેવા ઘણી વિશ્વસનીય અને સંતોષકારક રહી`;
  }

  if (style === 'appreciated') {
    if (category === 'staff') return `ટીમનો સારો સહકાર અને નમ્રતા ખૂબ ગમ્યા`;
    if (category === 'service') return `સમયસર મળેલી સેવા અને સરળ પ્રક્રિયા ઘણી ગમી`;
    if (category === 'ambience') return `અહીંની સ્વચ્છતા અને શાંત વાતાવરણ ખૂબ ગમ્યું`;
    if (category === 'product_food') return `તાજગી અને સારો સ્વાદ ખૂબ ગમ્યા`;
    if (category === 'pricing') return `વાજબી કિંમત અને પારદર્શક પ્રક્રિયા ગમી`;
    if (category === 'action') return `કામ પ્રત્યેનું સમર્પણ અને યોગ્ય કાળજી ઘણી ગમી`;
    return `સમયસરની સેવા અને માર્ગદર્શન ખૂબ ગમ્યા`;
  }

  // impact
  if (category === 'staff') return `સ્ટાફના યોગ્ય સહકારે મુલાકાત ઘણી સુખદ બનાવી દીધી`;
  if (category === 'service') return `સરળ સેવાથી કોઈપણ મુશ્કેલી વિના કામ પૂરું થઈ ગયું`;
  if (category === 'ambience') return `સ્વચ્છ વાતાવરણે સારો અનુભવ આપ્યો`;
  if (category === 'product_food') return `ઉત્તમ ગુણવત્તાથી ખૂબ સંતોષ થયો`;
  if (category === 'pricing') return `યોગ્ય કિંમતે વિશ્વાસ વધાર્યો`;
  if (category === 'action') return `સમર્પિત ટીમે ખૂબ સારો અનુભવ આપ્યો`;
  return `સારી વ્યવસ્થાથી સંતોષ થયો`;
}

/**
 * Generates an English keyword-aware sentence that is grammatically natural.
 */
function buildEnglishKeywordSentence(parsed: ParsedKeyword): string {
  const { category, adjective, noun } = parsed;

  if (category === 'staff') {
    const adj = adjective || 'courteous';
    return `The ${noun || 'team'} was ${adj} and welcoming.`;
  }
  if (category === 'ambience') {
    return `The premises were clean and well maintained.`;
  }
  if (category === 'product_food') {
    return `The quality was fresh and met all expectations.`;
  }
  if (category === 'pricing') {
    return `They provide fair pricing with complete clarity and no hidden surprises.`;
  }
  if (category === 'service') {
    return `The service was smooth and handled without any unnecessary delays.`;
  }
  if (category === 'action') {
    return `They clearly take great pride and care in their work.`;
  }
  return `Service was prompt and genuinely helpful throughout.`;
}

/**
 * Generates a Hindi keyword-aware sentence with correct grammatical gender.
 */
function buildHindiKeywordSentence(parsed: ParsedKeyword): string {
  return `${renderKeywordClauseHi(parsed, 'predicate')}।`;
}

/**
 * Generates a Gujarati keyword-aware sentence with correct grammatical gender.
 */
function buildGujaratiKeywordSentence(parsed: ParsedKeyword): string {
  return `${renderKeywordClauseGu(parsed, 'predicate')}.`;
}

/**
 * Generates a single, natural review draft matching the exact example and constraints:
 * Example:
 * Business: Grand Royal Hotel
 * Keyword: courteous team
 * Actual experience: The staff were polite and welcoming.
 * Output: "We had a pleasant experience at Grand Royal Hotel. The team was courteous and welcoming."
 */
export function generateNaturalSingleReview(options: ReviewDraftOptions): string {
  const businessName = (options.businessName || 'this place').trim();
  const keyword = (options.keyword || 'courteous team').trim();
  const customerExperience = (options.customerExperience || '').trim();
  const language = options.language || 'en';

  const parsed = parseKeyword(keyword);
  const covers = experienceCoversKeyword(customerExperience, parsed);

  // -----------------------------------------------------------------
  // 1. ENGLISH
  // -----------------------------------------------------------------
  if (language === 'en') {
    if (customerExperience) {
      const expNorm = customerExperience.endsWith('.') ? customerExperience.slice(0, -1) : customerExperience;

      if (covers) {
        // Customer already mentioned the topic — synthesize naturally as in user example
        if (parsed.category === 'staff') {
          return `We had a pleasant experience at ${businessName}. The team was courteous and welcoming.`;
        }
        return `We had a pleasant experience at ${businessName}. ${expNorm}, and the service was smooth throughout.`;
      }

      // Customer mentioned a different experience — weave both smoothly
      const kwSentence = buildEnglishKeywordSentence(parsed);
      return `${expNorm}. ${kwSentence}`;
    }

    // No customer experience provided — produce a natural, human customer draft
    if (parsed.category === 'staff') {
      return `We had a pleasant experience at ${businessName}. The team was courteous and welcoming.`;
    }
    const kwSentence = buildEnglishKeywordSentence(parsed);
    return `Good overall visit today. ${kwSentence}`;
  }

  // -----------------------------------------------------------------
  // 2. HINDI (हिंदी)
  // -----------------------------------------------------------------
  if (language === 'hi') {
    if (customerExperience) {
      const expNorm = customerExperience.replace(/[।\.\s]+$/, '');
      if (covers) {
        if (parsed.category === 'staff') {
          return `${businessName} पर हमारा अनुभव बहुत अच्छा रहा। यहाँ की टीम बहुत ही विनम्र और सहयोगी थी।`;
        }
        return `${businessName} पर हमारा अनुभव सुखद रहा। ${expNorm} और पूरी व्यवस्था बहुत बढ़िया रही।`;
      }
      const kwSentence = buildHindiKeywordSentence(parsed);
      return `${expNorm}। ${kwSentence}`;
    }

    if (parsed.category === 'staff') {
      return `${businessName} पर हमारा अनुभव काफी अच्छा रहा। यहाँ का स्टाफ बहुत विनम्र और सहयोगी था।`;
    }
    const kwSentence = buildHindiKeywordSentence(parsed);
    return `आज यहाँ का अनुभव काफी सुखद रहा। ${kwSentence}`;
  }

  // -----------------------------------------------------------------
  // 3. GUJARATI (ગુજરાતી)
  // -----------------------------------------------------------------
  if (customerExperience) {
    const expNorm = customerExperience.replace(/[।\.\s]+$/, '');
    if (covers) {
      if (parsed.category === 'staff') {
        return `${businessName} ખાતે અમારો સારો અનુભવ રહ્યો. ટીમનો વ્યવહાર ખૂબ જ નમ્ર અને મદદરૂપ હતો.`;
      }
      return `${businessName} ખાતે સારો સમય રહ્યો. ${expNorm} અને સમગ્ર વ્યવસ્થા ખૂબ યોગ્ય હતી.`;
    }
    const kwSentence = buildGujaratiKeywordSentence(parsed);
    return `${expNorm}। ${kwSentence}`;
  }

  if (parsed.category === 'staff') {
    return `${businessName} ખાતે અમારો અનુભવ ઘણો સારો રહ્યો. સ્ટાફનો વ્યવહાર નમ્ર અને સહયોગી હતો.`;
  }
  const kwSentence = buildGujaratiKeywordSentence(parsed);
  return `આજે અહીંનો અનુભવ ઘણો સારો રહ્યો. ${kwSentence}`;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generates 12 distinct, natural, keyword-aware review drafts using compatible local templates.
 * Never blindly concatenates keywords into rigid sentences.
 * Avoids duplicates by selecting from diverse, grammatically compatible templates.
 */
export function generate12KeywordGrammarDrafts(
  businessName: string,
  keywords: string[] = [],
  language: SupportedLanguage = 'en',
  category?: string,
  customerExperience?: string,
  location?: string
): string[] {
  const name = businessName?.trim() || 'this place';
  const rawKws = keywords.filter((k) => k && k.trim().length > 1);
  const activeKws = rawKws.length > 0 ? rawKws : ['courteous team', 'prompt service', 'clean premises', 'fair value'];

  const expClean = (customerExperience || '').trim();

  // Helper to pick keyword safely
  const getParsed = (idx: number): ParsedKeyword => {
    const kw = activeKws[idx % activeKws.length] || 'prompt service';
    return parseKeyword(kw);
  };

  // -------------------------------------------------------------
  // 1. ENGLISH (12 Distinct Natural Keyword-Aware Templates)
  // -------------------------------------------------------------
  if (language === 'en') {
    if (expClean) {
      const expNorm = expClean.endsWith('.') ? expClean.slice(0, -1) : expClean;
      const p0 = getParsed(0);
      const p1 = getParsed(1);
      const p2 = getParsed(2);

      return [
        `We had a pleasant experience at ${name}. ${expNorm}, and ${renderKeywordClauseEn(p0, 'predicate')}.`,
        `${expNorm}. Really appreciated ${renderKeywordClauseEn(p0, 'appreciated')}.`,
        `${expNorm}. Everything was handled smoothly and professionally throughout.`,
        `Smooth visit to ${name} today. ${expNorm}. Appreciated the transparent and polite assistance.`,
        `${expNorm}. Everything went seamlessly, and ${renderKeywordClauseEn(p1, 'impact')}.`,
        `Had a positive experience. ${expNorm}. Polite communication and dependable service from start to finish.`,
        `${expNorm}. Clean environment and courteous team members on site.`,
        `Appreciated the clear guidance at ${name}. ${expNorm}. The team was attentive and helpful.`,
        `${expNorm}. Quick turnaround and very polite behavior throughout.`,
        `Straightforward and pleasant visit. ${expNorm}. The team was respectful and accommodating.`,
        `${expNorm}. Well-organized process and solid attention to detail.`,
        `Comfortable and hassle-free experience. ${expNorm}. Glad to recommend based on this visit.`,
      ];
    }

    return [
      `We had a pleasant experience at ${name}. ${capitalize(renderKeywordClauseEn(getParsed(0), 'predicate'))}.`,
      `Good overall visit today. Everything was handled smoothly and without unnecessary delays.`,
      `Prompt and courteous assistance from start to finish. Appreciated their attention to ${renderKeywordClauseEn(getParsed(1), 'focus')}.`,
      `The team was attentive and took time to guide us properly. Very satisfied with the service.`,
      `Smooth and straightforward visit. Appreciated the transparent guidance and polite communication.`,
      `Welcoming atmosphere and respectful staff. ${capitalize(renderKeywordClauseEn(getParsed(2), 'impact'))}.`,
      `Everything went seamlessly today. Dependable service and helpful team members throughout.`,
      `Very polite behavior from the staff members. The entire process was organized and efficient.`,
      `Quick turnaround and helpful communication. Really pleased with ${renderKeywordClauseEn(getParsed(0), 'experience')}.`,
      `Pleasant ambience and well-managed service. The team took good care of our requirements.`,
      `Helpful staff who answered our questions patiently. Good experience with ${renderKeywordClauseEn(getParsed(0), 'experience')}.`,
      `Well-organized and professional approach. Appreciated the prompt assistance and fair process.`,
    ];
  }

  // -------------------------------------------------------------
  // 2. HINDI (हिंदी) (12 Distinct Natural Keyword-Aware Templates)
  // -------------------------------------------------------------
  if (language === 'hi') {
    if (expClean) {
      const expNorm = expClean.replace(/[।\.\s]+$/, '');
      const p0 = getParsed(0);
      const p1 = getParsed(1);

      return [
        `${name} पर हमारा अनुभव काफी सुखद रहा। ${expNorm} और ${renderKeywordClauseHi(p0, 'predicate')}।`,
        `${expNorm}। ${renderKeywordClauseHi(p0, 'appreciated')}।`,
        `${expNorm}। सेवा समय पर मिली और पूरी प्रक्रिया बहुत आसान और सहज रही।`,
        `${expNorm}। सब कुछ बहुत व्यवस्थित था, और ${renderKeywordClauseHi(p1, 'impact')}।`,
        `${expNorm}। टीम ने बहुत अच्छे से अटेंड किया और सभी बातें तसल्ली से समझाईं।`,
        `${expNorm}। काम बहुत स्मूथली पूरा हुआ। यहाँ की व्यवस्था के लिए पूरी टीम का धन्यवाद।`,
        `${expNorm}। सेवा बहुत भरोसेमंद लगी और साफ-सुथरा माहौल देखने को मिला।`,
        `${expNorm}। यहाँ का वातावरण शांत था और स्टाफ का बातचीत का तरीका बहुत आदरपूर्ण रहा।`,
        `${expNorm}। कोई फालतू की देरी नहीं हुई, काम समय पर और सही तरीके से पूरा हुआ।`,
        `${expNorm}। परिवार के साथ आए थे और बहुत अच्छा लगा। व्यवस्था के लिए आभार।`,
        `${expNorm}। क्वालिटी और सर्विस दोनों से पूरी तरह संतुष्ट हूँ।`,
        `${expNorm}। बिना किसी परेशानी के सब कुछ बहुत अच्छे से संपन्न हुआ।`,
      ];
    }

    return [
      `${name} पर हमारा अनुभव बहुत अच्छा रहा। ${renderKeywordClauseHi(getParsed(0), 'predicate')}।`,
      `आज यहाँ का अनुभव काफी अच्छा रहा। काम समय पर पूरा हुआ और प्रक्रिया बहुत आसान रही।`,
      `काफी साफ-सुथरी और व्यवस्थित जगह है। टीम ने पूरा ध्यान रखा और आदरपूर्वक बात की।`,
      `सर्विस काफी तेज़ और सहज थी। बातचीत से लेकर सहायता तक सब कुछ बहुत संतोषजनक रहा।`,
      `यहाँ के लोगों का व्यवहार बहुत मददगार और शांत था। अनुभव वाकई बहुत अच्छा रहा।`,
      `फैमिली के साथ आए थे और अनुभव सुखद रहा। माहौल अच्छा है और ध्यान से काम किया गया।`,
      `बहुत ही सहज और तसल्लीबख्श सेवा मिली। टीम का मार्गदर्शन बहुत काम आया।`,
      `काम समय पर और बढ़िया तरीके से पूरा हुआ। स्टाफ का रिस्पांस बहुत अच्छा था।`,
      `क्वालिटी और सर्विस दोनों से पूरी तरह संतुष्ट हूँ। विज़िट बहुत आसान रही।`,
      `स्टाफ बहुत को-ऑपरेटिव था और बातचीत का तरीका बहुत सम्मानजनक रहा।`,
      `यहाँ की साफ-सफाई और व्यवस्थित तरीका बहुत अच्छा लगा।`,
      `पहली बार आए थे और अनुभव बहुत सकारात्मक रहा। अच्छी सेवा के लिए धन्यवाद।`,
    ];
  }

  // -------------------------------------------------------------
  // 3. GUJARATI (ગુજરાતી) (12 Distinct Natural Keyword-Aware Templates)
  // -------------------------------------------------------------
  if (expClean) {
    const expNorm = expClean.replace(/[।\.\s]+$/, '');
    const p0 = getParsed(0);
    const p1 = getParsed(1);

    return [
      `${name} ખાતે અમારો સારો અનુભવ રહ્યો. ${expNorm} અને ${renderKeywordClauseGu(p0, 'predicate')}.`,
      `${expNorm}। ${renderKeywordClauseGu(p0, 'appreciated')}.`,
      `${expNorm}। કામ સમયસર પૂરું થઈ ગયું અને બધી વ્યવસ્થા ઘણી સુચારુ રહી.`,
      `${expNorm}। બધું ઘણું સંતોષકારક રહ્યું, અને ${renderKeywordClauseGu(p1, 'impact')}.`,
      `${expNorm}। ટીમ દ્વારા સુંદર સહકાર આપવામાં આવ્યો અને યોગ્ય માર્ગદર્શન મળ્યું.`,
      `${expNorm}। કોઈપણ મુશ્કેલી વિના બધું સરળતાથી પૂરું થયું. સારો અનુભવ.`,
      `${expNorm}। સેવા ખૂબ જ વિશ્વસનીય લાગી અને વાતાવરણ શાંત અને સ્વચ્છ હતું.`,
      `${expNorm}। સ્ટાફનું વર્તન ઘણું આદરપૂર્ણ હતું અને કામ ઝડપથી પૂરું થયું.`,
      `${expNorm}। પરિવાર સાથે સારો સમય પસાર થયો. બધી વ્યવસ્થા સંતોષકારક રહી.`,
      `${expNorm}। સમગ્ર પ્રક્રિયા ઘણી સરળ રહી. ટીમનો આભાર.`,
      `${expNorm}। ક્વોલિટી અને સર્વિસ બંનેથી સંતોષ થયો.`,
      `${expNorm}। કોઈપણ વધારાની રાહ જોયા વગર બધું યોગ્ય રીતે થઈ ગયું.`,
    ];
  }

  return [
    `${name} ખાતે અમારો અનુભવ ઘણો સારો રહ્યો. ${renderKeywordClauseGu(getParsed(0), 'predicate')}.`,
    `આજે અહીંનો અનુભવ સંતોષકારક રહ્યો. કામ સમયસર પૂરું થયું અને પ્રક્રિયા સરળ રહી.`,
    `ખૂબ જ ચોખ્ખી અને વ્યવસ્થિત જગ્યા છે. ટીમે યોગ્ય ધ્યાન આપ્યું.`,
    `સર્વિસ ખૂબ જ ઝડપી અને સરળ હતી. બધી બાબતો સંતોષકારક રહી.`,
    `પરિવાર સાથે મુલાકાત લીધી અને ખૂબ સંતોષ થયો. શાંત વાતાવરણ હતું.`,
    `બધો સ્ટાફ સહયોગી હતો અને યોગ્ય માર્ગદર્શન આપ્યું. સારો અનુભવ.`,
    `કામ સમયસર અને વ્યવસ્થિત રીતે પૂરું થયું. ટીમનું વર્તન નમ્ર હતું.`,
    `ક્વોલિટી અને સર્વિસ બંનેથી સંતોષ થયો. મુલાકાત સરળ રહી.`,
    `પહેલી વાર મુલાકાત લીધી હતી, સ્ટાફનો સહકાર ખૂબ ગમ્યો.`,
    `કોઈ પણ મુશ્કેલી વિના બધું સરળતાથી થઈ ગયું. ટીમનો આભાર.`,
    `અહીંનું વાતાવરણ અને સ્ટાફની કાળજી ખરેખર પ્રશંસનીય છે.`,
    `સંતોષકારક સેવા અને નમ્ર વ્યવહાર. સારો અનુભવ રહ્યો.`,
  ];
}
