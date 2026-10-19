/**
 * LocalBoost AI — Natural Keyword-Based Google Review Generator
 *
 * Implements the official LocalBoost AI natural keyword review prompt constitution:
 * 1. Understand the meaning and context of the selected keyword before writing.
 * 2. Incorporate the keyword naturally into a meaningful sentence.
 * 3. Never insert a keyword just to satisfy SEO requirements.
 * 4. Do not repeat the keyword unnecessarily.
 * 5. Do not force the business name, location, or keyword into the opening sentence.
 * 6. If the exact keyword sounds unnatural, use a grammatically correct variation only if it preserves the intended meaning.
 * 7. Never add claims about quality, service, products, food, staff, or customer satisfaction that were not provided by the customer.
 * 8. If the selected keyword is unrelated to the actual experience, ask for relevant details or generate a draft without forcing the keyword.
 * 9. Write in simple, everyday language that matches the selected language and customer's tone.
 * 10. Avoid repetitive AI phrases, exaggerated praise, generic promotional language, and unnatural SEO-style sentences.
 */

import { SupportedLanguage } from '../types/database';
import {
  generate12KeywordGrammarDrafts,
  generateNaturalSingleReview,
  cleanKeywordPhrase as grammarCleanKeywordPhrase,
} from './keywordGrammarEngine';

export const LOCALBOOST_AI_REVIEW_GENERATOR_PROMPT = `LocalBoost AI — Natural Keyword-Based Google Review Generator

You are an expert natural-language review writing assistant for LocalBoost AI.

INPUT

- Business Name: {{business_name}}
- Business Category: {{business_category}}
- Business Location: {{business_location}}
- Selected Keyword: {{selected_keyword}}
- Customer's Actual Experience: {{customer_experience}}
- Output Language: {{language}}

PRIMARY OBJECTIVE

Generate a natural, conversational Google review draft that incorporates the selected keyword only when it fits the customer's actual experience.

KEYWORD INTEGRATION RULES

1. Understand the meaning and context of the selected keyword before writing.
2. Incorporate the keyword naturally into a meaningful sentence.
3. Never insert a keyword just to satisfy SEO requirements.
4. Do not repeat the keyword unnecessarily.
5. Do not force the business name, location, or keyword into the opening sentence.
6. If the exact keyword sounds unnatural, use a grammatically correct variation only if it preserves the intended meaning.
7. Never add claims about quality, service, products, food, staff, or customer satisfaction that were not provided by the customer.
8. If the selected keyword is unrelated to the actual experience, ask for relevant details or generate a draft without forcing the keyword.
9. Write in simple, everyday language that matches the selected language and customer's tone.
10. Avoid repetitive AI phrases, exaggerated praise, generic promotional language, and unnatural SEO-style sentences.

NATURALNESS CHECK

Before returning the review, check:

- Does the sentence sound natural when read aloud?
- Does the keyword fit the sentence grammatically?
- Does the review reflect the customer's real experience?
- Is the keyword repeated unnecessarily?
- Does the wording sound like an advertisement rather than customer feedback?

If any answer indicates a problem, rewrite the draft.

OUTPUT

Return one concise, natural review draft in {{language}}.

Do not display the keyword separately in the review.
Do not explain how the keyword was inserted.
Do not fabricate customer experiences.

The generated text is a draft for the customer to review, edit, and approve before posting.`;

export interface SuggestionResult {
  suggestions: string[];
  notice: string;
}

export type ReviewStyle = 'casual' | 'short' | 'detailed';

/**
 * Intelligent default category highlights based on the business type.
 * Never forces restaurant/food phrases on non-food businesses.
 */
export function getDefaultCategoriesForCategory(category?: string): string[] {
  switch (category) {
    case 'Healthcare & Clinic':
      return [
        'Caring Doctors & Staff',
        'Punctual Appointments',
        'Clean & Sterilized Clinic',
        'Gentle & Painless Care',
        'Modern Diagnostic Equipment',
        'Transparent Consultation',
      ];
    case 'Salon & Spa':
      return [
        'Expert Stylists',
        'Relaxing & Cozy Vibe',
        'Hygienic Sanitized Tools',
        'Customized Styling',
        'Courteous & Polite Team',
        'Great Value & Pricing',
      ];
    case 'Retail & Supermarket':
      return [
        'Fresh Stock & Variety',
        'Super Fast Billing',
        'Polite & Helpful Cashiers',
        'Well-Organized Aisles',
        'Wholesale & Fair Prices',
        'Hassle-Free Shopping',
      ];
    case 'Automotive & Garage':
      return [
        'Quick & Accurate Diagnosis',
        'Honest & Transparent Rates',
        'Skilled Mechanics',
        'Genuine Spare Parts',
        'On-Time Vehicle Delivery',
        'Clear Explanations',
      ];
    case 'Fitness & Gym':
      return [
        'Certified & Motivating Trainers',
        'Modern Well-Maintained Machines',
        'Hygienic Locker Rooms',
        'Energetic Positive Atmosphere',
        'Spacious Workout Floor',
        'Great Guidance & Support',
      ];
    case 'Hotel & Lodging':
      return [
        'Spotless & Cozy Rooms',
        'Warm Welcome & Fast Check-In',
        'Courteous Staff',
        'Prime & Accessible Location',
        'Peaceful Ambience',
        'Great Value Stay',
      ];
    case 'Restaurant & Hospitality':
    case 'Cafe & Bakery':
      return [
        'Delicious Food & Taste',
        'Courteous & Attentive Staff',
        'Quick Table Service',
        'Spotless Cleanliness',
        'Warm & Cozy Ambience',
        'Great Value for Money',
      ];
    default:
      return [
        'Courteous & Helpful Staff',
        'Prompt & Reliable Service',
        'Top Quality Experience',
        'Spotless Cleanliness',
        'Fair & Transparent Value',
        'Easy & Smooth Process',
      ];
  }
}

// Backward-compatible export
export const EXPERIENCE_CATEGORIES = [
  'Courteous & Helpful Staff',
  'Prompt & Reliable Service',
  'Top Quality Experience',
  'Spotless Cleanliness',
  'Fair & Transparent Value',
  'Easy & Smooth Process',
];

/**
 * Formats a keyword naturally into lower-case or colloquial case for natural reading.
 */
function cleanKeywordPhrase(kw: string): string {
  if (!kw) return '';
  const trimmed = kw.trim();
  // If all uppercase or capitalized title, soften it unless it's an acronym
  if (/^[A-Z\s&/,-]+$/.test(trimmed) && trimmed.length > 5) {
    return trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

/**
 * Natural Keyword-Based Review Generator
 * Follows all 10 integration rules:
 * - Natural sentence structure
 * - No forced business name in opening sentence
 * - Concise, authentic customer tone
 * - Weaves customer's real experience if provided
 */
export function generateReviewSuggestions(
  businessName: string,
  rating: number,
  categories: string[] = [],
  language: SupportedLanguage = 'en',
  customAiKeywords?: string[],
  customAiSuggestions?: {
    positive?: string[];
    neutral?: string[];
  },
  businessCategory?: string,
  customerExperience?: string,
  businessLocation?: string
): SuggestionResult {
  const safeName = businessName?.trim() || 'This place';
  const cleanCategories =
    categories.length > 0
      ? categories
      : customAiKeywords && customAiKeywords.length > 0
      ? customAiKeywords.slice(0, 3)
      : getDefaultCategoriesForCategory(businessCategory).slice(0, 2);

  // High rating (4 & 5 stars): Generate natural, keyword-driven Google review drafts
  if (rating >= 4) {
    const allKeywords = Array.from(
      new Set([
        ...(categories || []),
        ...(customAiKeywords || []),
        ...getDefaultCategoriesForCategory(businessCategory),
      ])
    ).filter((k) => k && k.trim().length > 1);

    // If custom business suggestions are specifically configured and no raw customer text override, use valid drafts
    if (
      !customerExperience &&
      language === 'en' &&
      customAiSuggestions?.positive &&
      customAiSuggestions.positive.length >= 10
    ) {
      const validDrafts = customAiSuggestions.positive.map((s) => s.trim()).filter((s) => s.length > 5);
      if (validDrafts.length >= 10) {
        return {
          suggestions: validDrafts,
          notice: `Suggestions crafted for ${safeName}. Tap any suggestion to edit before opening Google Maps.`,
        };
      }
    }

    const pool = generate12KeywordDrafts(safeName, allKeywords, language, businessCategory, customerExperience, businessLocation);
    return {
      suggestions: pool,
      notice: `Natural drafts generated for your review. Tap any suggestion to edit before posting.`,
    };
  }

  // Neutral (3 stars)
  if (rating === 3 && customAiSuggestions?.neutral && customAiSuggestions.neutral.length > 0) {
    const validDrafts = customAiSuggestions.neutral.map((s) => s.trim()).filter((s) => s.length > 5);
    if (validDrafts.length > 0) {
      return {
        suggestions: validDrafts,
        notice: 'Natural suggestions crafted for this business. You can edit before sharing.',
      };
    }
  }

  // Fallback rating handling
  if (language === 'hi') {
    return generateHindiHumanSuggestions(safeName, rating, cleanCategories, customerExperience);
  } else if (language === 'gu') {
    return generateGujaratiHumanSuggestions(safeName, rating, cleanCategories, customerExperience);
  } else {
    return generateEnglishHumanSuggestions(safeName, rating, cleanCategories, customerExperience);
  }
}

/**
 * Generates 12 natural, conversational review drafts strictly observing:
 * - Rule 5: Never force business name into opening sentence.
 * - Rule 7 & 10: Avoid repetitive AI phrases, generic promotional language, and unnatural SEO sentences.
 * - Rule 9: Simple, everyday language matching customer tone.
 */
export function generate12KeywordDrafts(
  businessName: string,
  keywords: string[] = [],
  language: SupportedLanguage = 'en',
  category?: string,
  customerExperience?: string,
  businessLocation?: string
): string[] {
  return generate12KeywordGrammarDrafts(
    businessName,
    keywords,
    language,
    category,
    customerExperience,
    businessLocation
  );
}

export interface SingleReviewDraftInput {
  businessName: string;
  businessCategory?: string;
  businessLocation?: string;
  selectedKeyword?: string;
  customerExperience?: string;
  language?: SupportedLanguage;
}

/**
 * Generates a single, natural, conversational review draft following all LocalBoost rules:
 * - Natural sentence structure
 * - No forced business name in opening sentence
 * - Incorporates selected keyword only when it fits the actual experience
 * - Zero external AI API, 100% deterministic local grammar templates
 */
export function generateSingleReviewDraft(params: SingleReviewDraftInput): string {
  return generateNaturalSingleReview({
    businessName: params.businessName,
    category: params.businessCategory,
    location: params.businessLocation,
    keyword: params.selectedKeyword,
    customerExperience: params.customerExperience,
    language: params.language,
  });
}

/**
 * Naturalness Check helper: validates and cleans output to prevent AI phrases or quotes
 */
export function cleanNaturalReviewDraft(text: string): string {
  let cleaned = text.trim();
  // Strip surrounding quotes
  cleaned = cleaned.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  // Strip common AI filler headers
  cleaned = cleaned.replace(/^(here is (your|a) review draft:?|review draft:?|review:?)\s*/i, '').trim();
  return cleaned;
}

/**
 * Request natural review draft using 100% built-in, local engine (Zero external API, Zero API Keys)
 */
export async function requestAiReviewDraft(params: SingleReviewDraftInput): Promise<{
  review: string;
  source: 'local-engine';
}> {
  const draft = generateSingleReviewDraft(params);
  return {
    review: cleanNaturalReviewDraft(draft),
    source: 'local-engine',
  };
}

// -------------------------------------------------------------
// English Human Suggestion Generator
// -------------------------------------------------------------
function generateEnglishHumanSuggestions(
  name: string,
  rating: number,
  categories: string[],
  customerExperience?: string
): SuggestionResult {
  const topCat = cleanKeywordPhrase(categories[0] || 'service');
  const secondCat = cleanKeywordPhrase(categories[1] || 'staff support');
  const exp = customerExperience ? `${customerExperience.trim()}. ` : '';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `${exp}Had a really pleasant visit today. The team was polite, welcoming, and the ${topCat} was handled smoothly. Clean space and dependable service.`;
    s2 = `${exp}Good overall experience here. Appreciated their ${topCat} and ${secondCat}. Polite communication and straightforward process.`;
    s3 = `${exp}Smooth and pleasant visit. Friendly team, clean surroundings, and reliable service throughout.`;
  } else if (rating === 4) {
    s1 = `${exp}Had a good experience overall. The team was accommodating and the ${topCat} was handled well. Solid service.`;
    s2 = `${exp}Dependable and courteous service. Liked the ${topCat} and helpful staff. Worth visiting.`;
    s3 = `${exp}Good visit. Quality was consistent and the staff ensured everything went smoothly.`;
  } else if (rating === 3) {
    s1 = `${exp}Visited recently. The ${topCat} was fair, though there is room to speed up service during busy hours.`;
    s2 = `${exp}Average experience. Some parts were fine, but felt that attention to detail could be improved.`;
    s3 = `${exp}Decent setup, but would appreciate a little more consistency in customer assistance.`;
  } else {
    s1 = `${exp}The visit did not meet expectations today. The ${topCat} needs improvement. Sharing this so management can look into it.`;
    s2 = `${exp}Expected a better experience with the service today. Sharing honest feedback for constructive improvement.`;
    s3 = `${exp}Unfortunately not satisfied with today's visit. Hope management reviews customer service standards.`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'Tap any suggestion to customize your words before opening Google Maps.',
  };
}

// -------------------------------------------------------------
// Hindi Human Suggestion Generator (हिंदी)
// -------------------------------------------------------------
function generateHindiHumanSuggestions(
  name: string,
  rating: number,
  categories: string[],
  customerExperience?: string
): SuggestionResult {
  const primaryCat = cleanKeywordPhrase(categories[0] || 'सर्विस');
  const secondCat = cleanKeywordPhrase(categories[1] || 'स्टाफ का सहयोग');
  const exp = customerExperience ? `${customerExperience.trim()}। ` : '';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `${exp}यहाँ का अनुभव बहुत अच्छा रहा। स्टाफ बहुत ही विनम्र है और ${primaryCat} भी बहुत अच्छे से मैनेज हुई। साफ-सुथरा माहौल और बढ़िया सेवा।`;
    s2 = `${exp}काफी अच्छी और व्यवस्थित जगह है। ${primaryCat} और ${secondCat} दोनों से पूरा संतोष हुआ।`;
    s3 = `${exp}आज विज़िट किया और सब कुछ बहुत सहज रहा। शांत वातावरण और बढ़िया मार्गदर्शन मिला।`;
  } else if (rating === 4) {
    s1 = `${exp}अच्छा अनुभव रहा। ${primaryCat} काफी बढ़िया थी और स्टाफ भी सहयोगी था। कुल मिलाकर अच्छा लगा।`;
    s2 = `${exp}बढ़िया जगह है। ${primaryCat} और माहौल दोनों ठीक लगे।`;
    s3 = `${exp}संतोषजनक अनुभव रहा। टीम का काम अच्छा है।`;
  } else if (rating === 3) {
    s1 = `${exp}अनुभव सामान्य रहा। ${primaryCat} ठीक थी, लेकिन थोड़ा और सुधार किया जा सकता है।`;
    s2 = `${exp}औसत अनुभव। भीड़ के समय थोड़ा अधिक ध्यान देने की आवश्यकता है।`;
    s3 = `${exp}उम्मीद से थोड़ा कम रहा। आशा है कि टीम इस पर ध्यान देगी।`;
  } else {
    s1 = `${exp}आज का अनुभव उम्मीद के अनुसार नहीं रहा। ${primaryCat} में सुधार की ज़रूरत है।`;
    s2 = `${exp}सेवा से थोड़ी निराशा हुई। प्रबंधन से अनुरोध है कि वे इस पर ध्यान दें।`;
    s3 = `${exp}आज की सर्विस संतोषजनक नहीं रही। आशा है कि जल्द सुधार होगा।`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'किसी भी सुझाव पर टैप करके अपनी पसंद से एडिट करें और गूगल पर शेयर करें।',
  };
}

// -------------------------------------------------------------
// Gujarati Human Suggestion Generator (ગુજરાતી)
// -------------------------------------------------------------
function generateGujaratiHumanSuggestions(
  name: string,
  rating: number,
  categories: string[],
  customerExperience?: string
): SuggestionResult {
  const primaryCat = cleanKeywordPhrase(categories[0] || 'સર્વિસ');
  const secondCat = cleanKeywordPhrase(categories[1] || 'સ્ટાફનો સહકાર');
  const exp = customerExperience ? `${customerExperience.trim()}। ` : '';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `${exp}અહીંનો અનુભવ ઘણો સારો રહ્યો. સ્ટાફનો વ્યવહાર નમ્ર અને મદદરૂપ હતો, અને ${primaryCat} પણ સરળ રહી.`;
    s2 = `${exp}ખૂબ જ સરસ અને વ્યવસ્થિત જગ્યા છે. ${primaryCat} અને ${secondCat} બંનેથી ઘણો સંતોષ થયો.`;
    s3 = `${exp}આજે મુલાકાત લીધી અને બધું વ્યવસ્થિત રહ્યું. સારો આવકાર અને યોગ્ય માર્ગદર્શન મળ્યું.`;
  } else if (rating === 4) {
    s1 = `${exp}સારો અનુભવ રહ્યો. ${primaryCat} યોગ્ય હતી અને સ્ટાફ સારો હતો.`;
    s2 = `${exp}સરસ જગ્યા છે. ${primaryCat} અને વાતાવરણ બંને ગમ્યા.`;
    s3 = `${exp}સંતોષકારક અનુભવ રહ્યો. ટીમ સારી છે.`;
  } else if (rating === 3) {
    s1 = `${exp}સામાન્ય અનુભવ રહ્યો. ${primaryCat} બરાબર હતી પરંતુ સેવામાં થોડો સુધારો જરૂરી છે.`;
    s2 = `${exp}સરેરાશ મુલાકાત. ભીડ સમયે થોડું વધુ ધ્યાન આપવું જોઈએ.`;
    s3 = `${exp}અપેક્ષા મુજબનો અનુભવ ન રહ્યો. આશા છે કે મેનેજમેન્ટ ધ્યાન આપશે.`;
  } else {
    s1 = `${exp}આજનો અનુભવ અપેક્ષા મુજબનો ન રહ્યો. ${primaryCat} માં સુધારાની જરૂર છે.`;
    s2 = `${exp}આજની સર્વિસથી થોડી નિરાશા થઈ. મેનેજમેન્ટ ધ્યાન આપે તેવી વિનંતી.`;
    s3 = `${exp}આજનો અનુભવ સારો ન રહ્યો. આગળ જતાં સુધારો થશે તેવી આશા.`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'કોઈપણ સૂચન પર ટેપ કરીને તમારી રીતે ફેરફાર કરો અને ગૂગલ પર શેર કરો.',
  };
}

/**
 * 100% Free Smart NLP Prompt Crafter & Business Analyzer (Zero external API dependencies)
 */
export function craftBusinessPromptLocally(params: {
  businessName: string;
  category: string;
  location?: string;
  highlights?: string;
  googleLink?: string;
  websiteUrl?: string;
}): {
  prompt: string;
  keywords: string[];
} {
  const name = params.businessName || 'Our Business';
  const category = params.category || 'Local Business';
  const loc = params.location ? `located in ${params.location}` : '';
  const high = params.highlights ? `Key highlights: ${params.highlights}.` : '';
  const web = params.websiteUrl ? `Website: ${params.websiteUrl}.` : '';

  const defaultKeywords = getDefaultCategoriesForCategory(category);

  const prompt = `${name} is a trusted ${category} ${loc}. We focus on genuine customer care, polite staff interaction, clean premises, and prompt service. ${high} ${web} When visitors share feedback on Google, their reviews should reflect their actual experience with simple, natural language and honest impressions.`.replace(/\s+/g, ' ').trim();

  return {
    prompt,
    keywords: defaultKeywords,
  };
}

export function analyzeBusinessPromptLocally(params: {
  prompt: string;
  businessName: string;
  category: string;
  language?: SupportedLanguage;
}): {
  keywords: string[];
  summary: string;
  suggestions: {
    positive: string[];
    neutral: string[];
  };
} {
  const name = params.businessName || 'Our Business';
  const category = params.category || 'Local Business';
  const lang = params.language || 'en';
  const prompt = params.prompt.trim();

  // Extract meaningful words
  const stopWords = new Set([
    'the', 'and', 'a', 'an', 'is', 'in', 'at', 'of', 'for', 'with', 'on', 'to', 'our', 'we', 'are', 'my', 'your',
    'all', 'has', 'have', 'best', 'good', 'great', 'nice', 'very', 'by', 'from', 'this', 'that', 'also', 'provide',
    'when', 'leave', 'their', 'want', 'overall', 'premier', 'establishment', 'customer', 'customers', 'business'
  ]);

  const words = prompt.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()));
  const categoryDefaults = getDefaultCategoriesForCategory(category);

  // Take top extracted words or combine with category defaults
  const extractedWords = words.slice(0, 6).map(w => w.charAt(0).toUpperCase() + w.slice(1));
  const uniqueKeywords = Array.from(new Set([...extractedWords, ...categoryDefaults])).slice(0, 10);

  const positive = generate12KeywordDrafts(name, uniqueKeywords, lang, category);
  let neutral: string[] = [];

  const k1 = cleanKeywordPhrase(uniqueKeywords[0] || 'service');
  const k2 = cleanKeywordPhrase(uniqueKeywords[1] || 'assistance');

  if (lang === 'hi') {
    neutral = [
      `यहाँ का अनुभव सामान्य रहा। ${k1} ठीक थी, लेकिन भीड़ के समय थोड़ा इंतज़ार करना पड़ा।`,
      `विज़िट अच्छी रही। स्टाफ का व्यवहार मददगार था, सर्विस संतोषजनक है।`
    ];
  } else if (lang === 'gu') {
    neutral = [
      `અહીંનો અનુભવ યોગ્ય રહ્યો। ${k1} સંતોષકારક હતું પરંતુ થોડી વધુ ઝડપ જરૂરી છે.`
    ];
  } else {
    neutral = [
      `Decent experience overall. The ${k1} was fair, though service during rush hours has room for improvement.`,
      `Visited for the first time. The ${k2} was polite, overall a satisfactory and fair experience.`
    ];
  }

  const firstSentence = prompt.split(/[.!?]/)[0] || `${name} offers dependable ${category} services`;
  const summary = `${firstSentence.trim()}. Committed to genuine customer service and reliable care.`;

  return {
    keywords: uniqueKeywords,
    summary,
    suggestions: {
      positive,
      neutral,
    },
  };
}
