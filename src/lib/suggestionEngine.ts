/**
 * LocalBoost AI — Human-Centric Review Suggestion Engine
 *
 * Generates natural, authentic, human-sounding customer review drafts
 * that reflect how real happy people write reviews on Google Maps.
 * Supports: English ('en'), Hindi ('hi'), and Gujarati ('gu').
 */

import { SupportedLanguage } from '../types/database';

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
  businessCategory?: string
): SuggestionResult {
  const safeName = businessName?.trim() || 'This place';
  const cleanCategories =
    categories.length > 0
      ? categories
      : customAiKeywords && customAiKeywords.length > 0
      ? customAiKeywords.slice(0, 3)
      : getDefaultCategoriesForCategory(businessCategory).slice(0, 2);

  // 1. If customer business has custom suggestions configured from their prompt or manual input, use them!
  if (rating >= 4 && customAiSuggestions?.positive && customAiSuggestions.positive.length > 0) {
    const validDrafts = customAiSuggestions.positive.map((s) => s.trim()).filter((s) => s.length > 5);
    if (validDrafts.length > 0) {
      // If user selected specific highlights, adapt the first suggestion to include their chosen highlights
      if (categories.length > 0 && validDrafts[0]) {
        const catStr = categories.slice(0, 2).join(' & ');
        const personalized = [...validDrafts];
        return {
          suggestions: personalized,
          notice: `Suggestions crafted for ${safeName}. You can tap to edit any draft before sharing on Google!`,
        };
      }
      return {
        suggestions: validDrafts,
        notice: `Suggestions crafted for ${safeName}. Tap any draft to edit before opening Google Maps.`,
      };
    }
  }

  if (rating === 3 && customAiSuggestions?.neutral && customAiSuggestions.neutral.length > 0) {
    const validDrafts = customAiSuggestions.neutral.map((s) => s.trim()).filter((s) => s.length > 5);
    if (validDrafts.length > 0) {
      return {
        suggestions: validDrafts,
        notice: 'Natural suggestions crafted for this business. You can edit before sharing.',
      };
    }
  }

  // 2. Generate clean, authentic human suggestions tailored to the actual categories and language
  if (language === 'hi') {
    return generateHindiHumanSuggestions(safeName, rating, cleanCategories);
  } else if (language === 'gu') {
    return generateGujaratiHumanSuggestions(safeName, rating, cleanCategories);
  } else {
    return generateEnglishHumanSuggestions(safeName, rating, cleanCategories);
  }
}

// -------------------------------------------------------------
// English Human Suggestion Generator
// -------------------------------------------------------------
function generateEnglishHumanSuggestions(name: string, rating: number, categories: string[]): SuggestionResult {
  const topCat = categories[0] || 'service and team';
  const secondCat = categories[1] || 'attention to detail';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `Honestly loved the experience at ${name}! The team was super polite, welcoming, and the ${topCat.toLowerCase()} was top-tier. Clean space and genuine hospitality. 10/10 would definitely visit again! ⭐`;
    s2 = `Such a wonderful experience at ${name}! Impressed with their ${topCat.toLowerCase()} and ${secondCat.toLowerCase()}. Fast service, polite communication, and great value. Highly recommend! 👍`;
    s3 = `Really pleasant visit to ${name}. Friendly team, spotless cleanliness, and reliable quality throughout. Keep up the awesome work!`;
  } else if (rating === 4) {
    s1 = `Had a very good experience at ${name}. The team was accommodating and the ${topCat.toLowerCase()} was really good. Overall solid experience and will visit again.`;
    s2 = `Nice and dependable place! Loved the ${topCat.toLowerCase()} and courteous staff. Definitely worth visiting. 4/5 stars.`;
    s3 = `Good overall visit to ${name}. Quality was up to mark and the staff made sure everything went smoothly.`;
  } else if (rating === 3) {
    s1 = `Visited ${name} recently. The ${topCat.toLowerCase()} was decent, but there is room to speed up service. Fair experience overall.`;
    s2 = `Average visit. Some parts like the ${topCat.toLowerCase()} were fine, but felt like attention to detail was lacking during peak rush.`;
    s3 = `Good potential here, but needs a bit more consistency in customer service. Hope to see it improve next time.`;
  } else {
    s1 = `Had an underwhelming experience at ${name}. The ${topCat.toLowerCase()} did not meet expectations. Sharing this so management can look into it.`;
    s2 = `Expected better standards from ${name}. Quite disappointed with the service today. Needs significant improvements.`;
    s3 = `Unfortunately not satisfied with today's visit. Hope the management addresses customer feedback seriously.`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'Tap any suggestion to customize your words before opening Google Maps.',
  };
}

// -------------------------------------------------------------
// Hindi Human Suggestion Generator (हिंदी)
// -------------------------------------------------------------
function generateHindiHumanSuggestions(name: string, rating: number, categories: string[]): SuggestionResult {
  const primaryCat = categories[0] || 'सर्विस';
  const secondCat = categories[1] || 'स्टाफ का व्यवहार';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `${name} में हमारा अनुभव सच में बहुत शानदार रहा! यहाँ का स्टाफ बहुत ही विनम्र और मददगार है, और ${primaryCat} एकदम लाजवाब थी। साफ-सुथरा माहौल और बेहतरीन सर्विस। ज़रूर दोबारा आएंगे! 👍`;
    s2 = `काफी बढ़िया जगह है ${name}! यहाँ आकर बहुत खुशी हुई। ${primaryCat} और ${secondCat} दोनों बहुत अच्छे थे। पूरे पैसे वसूल, 5 स्टार रेटिंग तो बनती है! ⭐`;
    s3 = `आज ${name} विज़िट किया और सब कुछ बहुत पसंद आया। बहुत ही सुकून भरा माहौल और बढ़िया सेवा। सभी को यहाँ आने की सलाह दूंगा!`;
  } else if (rating === 4) {
    s1 = `${name} में अच्छा अनुभव रहा। ${primaryCat} काफी बढ़िया थी और स्टाफ भी सहयोगी था। कुल मिलाकर बहुत अच्छा लगा।`;
    s2 = `बढ़िया जगह है! ${primaryCat} और माहौल दोनों अच्छे लगे। ज़रूर दोबारा विज़िट करेंगे।`;
    s3 = `${name} का अनुभव संतोषजनक रहा। टीम का काम अच्छा है, बस थोड़ा और सुधार हो तो यह बेस्ट बन सकता है।`;
  } else if (rating === 3) {
    s1 = `${name} में अनुभव सामान्य रहा। ${primaryCat} ठीक-ठाक थी, लेकिन सर्विस को थोड़ा और तेज़ करने की ज़रूरत है।`;
    s2 = `औसत अनुभव। कुछ बातें अच्छी थीं, लेकिन भीड़ के समय प्रबंधन में थोड़ा सुधार होना चाहिए।`;
    s3 = `जगह अच्छी है लेकिन उम्मीद से थोड़ा कम रहा। आशा है कि टीम इस पर ध्यान देगी।`;
  } else {
    s1 = `${name} में हमारा अनुभव उम्मीद के मुताबिक नहीं रहा। खास तौर पर ${primaryCat} में सुधार की ज़रूरत है।`;
    s2 = `${name} से हमें बेहतर सेवा की आशा थी। आज की सर्विस से थोड़ी निराशा हुई।`;
    s3 = `दुर्भाग्य से आज का अनुभव अच्छा नहीं रहा। प्रबंधन से अनुरोध है कि वे इस पर ध्यान दें।`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'किसी भी सुझाव पर टैप करके अपनी पसंद से एडिट करें और गूगल पर शेयर करें।',
  };
}

// -------------------------------------------------------------
// Gujarati Human Suggestion Generator (ગુજરાતી)
// -------------------------------------------------------------
function generateGujaratiHumanSuggestions(name: string, rating: number, categories: string[]): SuggestionResult {
  const primaryCat = categories[0] || 'સર્વિસ';
  const secondCat = categories[1] || 'સ્ટાફનો વ્યવહાર';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `${name} ખાતે અમારો અનુભવ ખરેખર ખૂબ જ અદ્ભુત રહ્યો! સ્ટાફનો વ્યવહાર ખૂબ જ નમ્ર અને મદદરૂપ હતો, અને ${primaryCat} એકદમ ઉત્તમ હતી. ચોખ્ખું વાતાવરણ અને ઝડપી સર્વિસ. ફરી જરૂર મુલાકાત લઈશું! 👍`;
    s2 = `ખૂબ જ સરસ જગ્યા છે ${name}! ${primaryCat} અને ${secondCat} બંને ખૂબ સારા હતા. એકદમ પૈસા વસૂલ અનુભવ રહ્યો. 5 સ્ટાર તો બનતા જ છે! ⭐`;
    s3 = `આજે ${name} ની મુલાકાત લીધી અને ખૂબ મજા આવી. ઉત્તમ ગુણવત્તા અને સ્નેહપૂર્ણ આવકાર. બધાને જરૂરથી મુલાકાત લેવાની ભલામણ કરું છું!`;
  } else if (rating === 4) {
    s1 = `${name} ખાતે સારો અનુભવ રહ્યો. ${primaryCat} સરસ હતી અને સ્ટાફ સારો હતો. એકંદરે મજા આવી.`;
    s2 = `સરસ જગ્યા છે! ${primaryCat} અને વાતાવરણ બંને ગમ્યા. ફરી મુલાકાત લઈશું.`;
    s3 = `${name} નો અનુભવ સંતોષકારક રહ્યો. ટીમ સારી છે, થોડો સુધારો થાય તો શ્રેષ્ઠ બની શકે.`;
  } else if (rating === 3) {
    s1 = `${name} ખાતે સામાન્ય અનુભવ રહ્યો. ${primaryCat} બરાબર હતી પરંતુ સર્વિસમાં થોડો સુધારો જરૂરી છે.`;
    s2 = `સરેરાશ મુલાકાત. અમુક બાબતો સારી હતી પરંતુ ભીડ સમયે થોડું વધુ ધ્યાન આપવું જોઈએ.`;
    s3 = `અપેક્ષા મુજબનો અનુભવ ન રહ્યો. આશા છે કે મેનેજમેન્ટ ધ્યાન આપશે.`;
  } else {
    s1 = `${name} ખાતે અપેક્ષા મુજબનો અનુભવ ન રહ્યો. ખાસ કરીને ${primaryCat} માં સુધારાની જરૂર છે.`;
    s2 = `${name} થી વધારે સારી સેવાની આશા હતી. આજની સર્વિસથી થોડી નિરાશા થઈ.`;
    s3 = `આજનો અનુભવ સારો ન રહ્યો. મેનેજમેન્ટ ગ્રાહકોના પ્રતિસાદ પર ધ્યાન આપે તેવી વિનંતી.`;
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
  const high = params.highlights ? `Key highlights include: ${params.highlights}.` : '';
  const web = params.websiteUrl ? `Official website: ${params.websiteUrl}.` : '';

  const defaultKeywords = getDefaultCategoriesForCategory(category);

  const prompt = `${name} is a premier ${category} ${loc}. We are committed to providing top-notch quality, courteous and respectful customer service, a clean and professional environment, and fair pricing. ${high} ${web} When customers visit and scan our Google review standee, their reviews should reflect our warm hospitality, quick assistance, reliable solutions, and exceptional overall experience.`.replace(/\s+/g, ' ').trim();

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

  const k1 = uniqueKeywords[0] || 'Quality Service';
  const k2 = uniqueKeywords[1] || 'Courteous Staff';
  const k3 = uniqueKeywords[2] || 'Great Value';

  let positive: string[] = [];
  let neutral: string[] = [];

  if (lang === 'hi') {
    positive = [
      `${name} में बहुत ही शानदार अनुभव रहा! यहाँ की ${k1} और ${k2} वाकई बहुत बढ़िया है।`,
      `${name} की सर्विस और ${k1} ने दिल जीत लिया। स्टाफ बहुत विनम्र है और माहौल भी सुखद है।`,
      `अगर आप बेहतरीन ${k1} और ${k3} ढूंढ रहे हैं, तो ${name} सबसे बेस्ट जगह है। 5 स्टार!`
    ];
    neutral = [
      `${name} पर अनुभव ठीक रहा। ${k1} अच्छा था, पर भीड़ के समय थोड़ा इंतज़ार करना पड़ा।`,
      `${name} की विज़िट अच्छी रही। स्टाफ का व्यवहार मददगार था, सर्विस संतोषजनक है।`
    ];
  } else if (lang === 'gu') {
    positive = [
      `${name} ખાતે અમારો અનુભવ ખૂબ જ ઉત્તમ રહ્યો! ખાસ કરીને ${k1} અને ${k2} ખરેખર પ્રશંસનીય છે.`,
      `${name} ની મુલાકાત પૈસા વસૂલ રહી. અહીં ${k3} અને સ્ટાફનો સહકાર ઘણો સારો હતો.`,
      `${name} ની સર્વિસ અને ${k1} મને ખૂબ ગમી. ભવિષ્યમાં પણ ફરી મુલાકાત લઈશું!`
    ];
    neutral = [
      `${name} નો અનુભવ યોગ્ય રહ્યો. ${k1} સંતોષકારક હતું પરંતુ થોડી વધુ ઝડપ જરૂરી છે.`
    ];
  } else {
    positive = [
      `Had a wonderful experience at ${name}! The ${k1} and ${k2} exceeded expectations. Highly recommend!`,
      `Really impressed by ${name}. Their attention to ${k1} along with ${k3} made my visit truly memorable.`,
      `Outstanding hospitality and service at ${name}. The ${k2} made us feel right at home. 5 stars well deserved!`
    ];
    neutral = [
      `Decent experience at ${name}. The ${k1} was good, though service during rush hours has room for improvement.`,
      `Visited ${name} for the first time. The ${k2} was polite, overall a satisfactory and fair experience.`
    ];
  }

  const firstSentence = prompt.split(/[.!?]/)[0] || `${name} offers top quality ${category} services`;
  const summary = `${firstSentence.trim()}. Known for great customer care, quality, and dependable service.`;

  return {
    keywords: uniqueKeywords,
    summary,
    suggestions: {
      positive,
      neutral,
    },
  };
}
