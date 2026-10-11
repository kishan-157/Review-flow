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

export function generateReviewSuggestions(
  businessName: string,
  rating: number,
  categories: string[] = [],
  language: SupportedLanguage = 'en',
  customAiKeywords?: string[],
  customAiSuggestions?: {
    positive?: string[];
    neutral?: string[];
  }
): SuggestionResult {
  const safeName = businessName?.trim() || 'This place';
  const cleanCategories =
    categories.length > 0
      ? categories
      : customAiKeywords && customAiKeywords.length > 0
      ? customAiKeywords.slice(0, 3)
      : ['Service', 'Ambience'];

  // If customer business has AI-generated suggestions customized from their prompt, blend them in
  if (rating >= 4 && customAiSuggestions?.positive && customAiSuggestions.positive.length > 0) {
    const aiDrafts = customAiSuggestions.positive.slice(0, 3);
    if (aiDrafts.length >= 2) {
      return {
        suggestions: aiDrafts,
        notice: 'Personalized human suggestions crafted for this business. Feel free to edit before sharing!',
      };
    }
  }

  if (rating === 3 && customAiSuggestions?.neutral && customAiSuggestions.neutral.length > 0) {
    const aiDrafts = customAiSuggestions.neutral.slice(0, 3);
    if (aiDrafts.length >= 1) {
      return {
        suggestions: aiDrafts,
        notice: 'Natural suggestions crafted for this business. You can edit before sharing.',
      };
    }
  }

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
  const topCat = categories[0] || 'hospitality';
  const secondCat = categories[1] || 'vibes';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    // 1. Enthusiastic & Warm (Friends / Social Vibe)
    s1 = `Honestly loved the experience at ${name}! The staff was super polite and welcoming, and the ${topCat.toLowerCase()} was absolutely fantastic. Clean atmosphere and great attention to detail. 10/10 would definitely visit again! ⭐`;

    // 2. Value & Quality Focused (Everyday Human)
    s2 = `Such a wonderful spot! Came here today and was thoroughly impressed. The ${topCat.toLowerCase()} and ${secondCat.toLowerCase()} were spot on, quick service, and great value for money. Keep up the awesome work guys 👍`;

    // 3. Short, Crisp & Natural
    s3 = `Really pleasant visit to ${name}. Friendly team, spotless cleanliness, and top-tier service. Highly recommended to everyone!`;
  } else if (rating === 4) {
    s1 = `Had a really good time at ${name}. The team was very accommodating and the ${topCat.toLowerCase()} was great. Just a slight waiting time, but overall a solid experience. Will visit again!`;
    s2 = `Nice and cozy place! Loved the ${topCat.toLowerCase()} and courteous staff. Definitely worth checking out. 4/5 stars.`;
    s3 = `Good overall experience at ${name}. Quality was up to mark and the staff made sure we were comfortable.`;
  } else if (rating === 3) {
    s1 = `Visited ${name} recently. The ${topCat.toLowerCase()} was decent, but there is definitely room to speed up service. Fair experience overall.`;
    s2 = `Average visit. Some parts like the ${topCat.toLowerCase()} were fine, but felt like attention to detail was lacking during rush hours.`;
    s3 = `Good potential here, but needs a bit more consistency in customer service. Hope to see it improve next time.`;
  } else {
    s1 = `Had an underwhelming experience at ${name}. The ${topCat.toLowerCase()} did not meet expectations and service was quite slow. Sharing this in hopes the management looks into it.`;
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

  const categoryTranslations: Record<string, string> = {
    Food: 'खाना और स्वाद',
    Taste: 'स्वाद',
    Service: 'सर्विस और स्टाफ',
    Staff: 'स्टाफ का व्यवहार',
    Ambience: 'माहौल और सिटिंग',
    Cleanliness: 'साफ-सफाई',
    'Value for Money': 'किफायती अनुभव',
    'Waiting Time': 'सर्विस टाइम',
    Price: 'कीमत',
    'Overall Experience': 'समग्र अनुभव',
  };

  const catHi = categoryTranslations[primaryCat] || primaryCat;

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `${name} में हमारा अनुभव सच में बहुत शानदार रहा! यहाँ का स्टाफ बहुत ही विनम्र और मददगार है, और ${catHi} एकदम लाजवाब थी। साफ-सुथरा माहौल और बेहतरीन सर्विस। दोस्तों और परिवार के साथ ज़रूर दोबारा आएंगे! 👍`;
    s2 = `काफी अच्छी जगह है ${name}! यहाँ आकर बहुत खुशी हुई। ${catHi} बहुत बढ़िया थी और सर्विस भी काफी तेज़ थी। पूरे पैसे वसूल, 5 स्टार रेटिंग तो बनती है! ⭐`;
    s3 = `आज ${name} विज़िट किया और सब कुछ बहुत पसंद आया। बहुत ही सुकून भरा माहौल और बढ़िया सेवा। सभी को यहाँ आने की सलाह दूंगा!`;
  } else if (rating === 4) {
    s1 = `${name} में अच्छा अनुभव रहा। ${catHi} काफी बढ़िया थी और स्टाफ भी सहयोगी था। थोड़ा सा इंतज़ार करना पड़ा लेकिन कुल मिलाकर अच्छा लगा।`;
    s2 = `बढ़िया जगह है! ${catHi} और माहौल दोनों अच्छे लगे। ज़रूर दोबारा विज़िट करेंगे।`;
    s3 = `${name} का अनुभव संतोषजनक रहा। टीम का काम अच्छा है, बस थोड़ा और सुधार हो तो यह बेस्ट बन सकता है।`;
  } else if (rating === 3) {
    s1 = `${name} में अनुभव सामान्य रहा। ${catHi} ठीक-ठाक थी, लेकिन सर्विस को थोड़ा और तेज़ करने की ज़रूरत है।`;
    s2 = `औसत अनुभव। कुछ बातें अच्छी थीं, लेकिन भीड़ के समय प्रबंधन में थोड़ा सुधार होना चाहिए।`;
    s3 = `जगह अच्छी है लेकिन उम्मीद से थोड़ा कम रहा। आशा है कि टीम इस पर ध्यान देगी।`;
  } else {
    s1 = `${name} में हमारा अनुभव उम्मीद के मुताबिक नहीं रहा। खास तौर पर ${catHi} में काफी सुधार की ज़रूरत है।`;
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

  const categoryTranslations: Record<string, string> = {
    Food: 'સ્વાદ અને ફૂડ',
    Taste: 'ટેસ્ટ',
    Service: 'સર્વિસ',
    Staff: 'સ્ટાફનો વ્યવહાર',
    Ambience: 'વાતાવરણ',
    Cleanliness: 'ચોખ્ખાઈ',
    'Value for Money': 'પૈસા વસૂલ',
    'Waiting Time': 'રાહ જોવાનો સમય',
    Price: 'ભાવ',
    'Overall Experience': 'એકંદર અનુભવ',
  };

  const catGu = categoryTranslations[primaryCat] || primaryCat;

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating === 5) {
    s1 = `${name} ખાતે અમારો અનુભવ ખરેખર ખૂબ જ અદ્ભુત રહ્યો! સ્ટાફનો વ્યવહાર ખૂબ જ નમ્ર અને મદદરૂપ હતો, અને ${catGu} એકદમ ઉત્તમ હતી. ચોખ્ખું વાતાવરણ અને ઝડપી સર્વિસ. પરિવાર અને મિત્રો સાથે ફરી જરૂર મુલાકાત લઈશું! 👍`;
    s2 = `ખૂબ જ સરસ જગ્યા છે ${name}! ${catGu} બાબતે કોઈ ફરિયાદ નથી, એકદમ પૈસા વસૂલ અનુભવ રહ્યો. 5 સ્ટાર તો બનતા જ છે! ⭐`;
    s3 = `આજે ${name} ની મુલાકાત લીધી અને ખૂબ મજા આવી. ઉત્તમ ગુણવત્તા અને સ્નેહપૂર્ણ આવકાર. બધાને જરૂરથી મુલાકાત લેવાની ભલામણ કરું છું!`;
  } else if (rating === 4) {
    s1 = `${name} ખાતે સારો અનુભવ રહ્યો. ${catGu} સરસ હતી અને સ્ટાફ સારો હતો. થોડો સમય લાગ્યો પરંતુ એકંદરે મજા આવી.`;
    s2 = `સરસ જગ્યા છે! ${catGu} અને વાતાવરણ બંને ગમ્યા. ફરી મુલાકાત લઈશું.`;
    s3 = `${name} નો અનુભવ સંતોષકારક રહ્યો. ટીમ સારી છે, થોડો સુધારો થાય તો શ્રેષ્ઠ બની શકે.`;
  } else if (rating === 3) {
    s1 = `${name} ખાતે સામાન્ય અનુભવ રહ્યો. ${catGu} બરાબર હતી પરંતુ સર્વિસમાં થોડો સુધારો જરૂરી છે.`;
    s2 = `સરેરાશ મુલાકાત. અમુક બાબતો સારી હતી પરંતુ ભીડ સમયે થોડું વધુ ધ્યાન આપવું જોઈએ.`;
    s3 = `અપેક્ષા મુજબનો અનુભવ ન રહ્યો. આશા છે કે મેનેજમેન્ટ ધ્યાન આપશે.`;
  } else {
    s1 = `${name} ખાતે અપેક્ષા મુજબનો અનુભવ ન રહ્યો. ખાસ કરીને ${catGu} માં સુધારાની જરૂર છે.`;
    s2 = `${name} થી વધારે સારી સેવાની આશા હતી. આજની સર્વિસથી થોડી નિરાશા થઈ.`;
    s3 = `આજનો અનુભવ સારો ન રહ્યો. મેનેજમેન્ટ ગ્રાહકોના પ્રતિસાદ પર ધ્યાન આપે તેવી વિનંતી.`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'કોઈપણ સૂચન પર ટેપ કરીને તમારી રીતે ફેરફાર કરો અને ગૂગલ પર શેર કરો.',
  };
}

export const EXPERIENCE_CATEGORIES = [
  'Super Friendly Staff',
  'Delicious Food & Taste',
  'Quick Service',
  'Spotless Cleanliness',
  'Great Value for Money',
  'Warm & Cozy Ambience',
  'Fast Turnaround',
  'Welcoming Vibe',
];
