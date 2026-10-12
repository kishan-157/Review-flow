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
  if (rating >= 4) {
    if (customAiSuggestions?.positive && customAiSuggestions.positive.length >= 10) {
      const validDrafts = customAiSuggestions.positive.map((s) => s.trim()).filter((s) => s.length > 5);
      if (validDrafts.length >= 10) {
        return {
          suggestions: validDrafts,
          notice: `Suggestions crafted for ${safeName}. Tap any draft to edit before opening Google Maps.`,
        };
      }
    }

    // Generate 12 distinct keyword-driven drafts based on the active keywords or category highlights
    const allKeywords = Array.from(new Set([
      ...(categories || []),
      ...(customAiKeywords || []),
      ...getDefaultCategoriesForCategory(businessCategory),
    ])).filter(k => k && k.trim().length > 1);

    const pool = generate12KeywordDrafts(safeName, allKeywords, language, businessCategory);
    return {
      suggestions: pool,
      notice: `Suggestions crafted for ${safeName}. You can tap to edit any draft before sharing on Google!`,
    };
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

/**
 * Generates 10-12 diverse, authentic, natural review drafts strictly based on the business's keywords.
 * Each draft intelligently weaves in 2-3 keywords across different realistic tones.
 */
export function generate12KeywordDrafts(
  businessName: string,
  keywords: string[] = [],
  language: SupportedLanguage = 'en',
  category?: string
): string[] {
  const name = businessName?.trim() || 'This place';
  const defaultKws = getDefaultCategoriesForCategory(category);
  const activeKws = Array.from(new Set([...(keywords.filter(k => k && k.trim().length > 1)), ...defaultKws]));

  const getKw = (idx: number) => {
    return (activeKws[idx % activeKws.length] || defaultKws[idx % defaultKws.length] || 'Excellent Service').trim();
  };

  if (language === 'hi') {
    return [
      `सच में ${name} में हमारा अनुभव बहुत शानदार रहा! यहाँ की ${getKw(0)} और ${getKw(1)} दोनों वाकई लाजवाब हैं। सबको ज़रूर आने की सलाह दूंगा! ⭐⭐⭐⭐⭐`,
      `${name} की सर्विस और ${getKw(0)} ने दिल जीत लिया! स्टाफ का व्यवहार बहुत विनम्र है और ${getKw(2)} भी बेहतरीन थी। पूरे 5 स्टार! 👍`,
      `पहली बार ${name} विज़िट किया और बहुत अच्छा लगा। लाजवाब ${getKw(1)}, साफ-सुथरा माहौल और ${getKw(3)}। बार-बार आने का मन करेगा!`,
      `एकदम पैसा वसूल अनुभव! ${name} पर ${getKw(2)} और ${getKw(0)} बहुत ही बढ़िया थे। यहाँ की सर्विस हमेशा याद रहेगी। ⭐`,
      `अगर आप बेहतरीन ${getKw(0)} और बढ़िया सेवा ढूंढ रहे हैं, तो ${name} सबसे बेस्ट जगह है। ${getKw(3)} भी बहुत पसंद आया! ✨`,
      `आज ${name} पर बहुत सुखद अनुभव रहा। यहाँ की ${getKw(1)} और ${getKw(2)} वाकई तारीफ के काबिल है। टीम का काम बहुत अच्छा है।`,
      `${name} में सब कुछ बहुत ही व्यवस्थित था। स्टाफ बहुत मददगार है, और ${getKw(3)} के साथ ${getKw(4)} का अनुभव एकदम परफेक्ट रहा। 👍`,
      `शानदार अनुभव! ${name} पर ${getKw(0)} की क्वालिटी बहुत बेहतरीन है और ${getKw(4)} ने हमारा दिल खुश कर दिया। 10/10 रेटिंग! ⭐`,
      `बहुत ही बढ़िया जगह! ${name} का दोस्ताना माहौल, ${getKw(2)} और तुरंत मिलने वाली ${getKw(1)} सच में काबिले तारीफ है।`,
      `${name} कभी निराश नहीं करता! यहाँ की ${getKw(0)} हमेशा की तरह शानदार थी और ${getKw(5)} का भी पूरा ध्यान रखा गया। बहुत-बहुत धन्यवाद! ✨`,
      `हमारे पूरे परिवार को ${name} बहुत पसंद आया। खास तौर पर यहाँ की ${getKw(1)} और ${getKw(3)} ने सबका दिल जीत लिया। जरूर पधारें!`,
      `उत्कृष्ट सेवा और बेहतरीन ${getKw(4)}! ${name} पर आकर बहुत खुशी हुई, ${getKw(2)} भी टॉप-क्लास थी। 5 स्टार अनुभव! ⭐`
    ];
  }

  if (language === 'gu') {
    return [
      `ખરેખર ${name} ખાતે અમારો અનુભવ ખૂબ જ અદ્ભુત રહ્યો! અહીંની ${getKw(0)} અને ${getKw(1)} બંને એકદમ શ્રેષ્ઠ છે. બધાને મુલાકાત લેવાની ભલામણ કરું છું! ⭐⭐⭐⭐⭐`,
      `${name} ની સર્વિસ અને ${getKw(0)} એ દિલ જીતી લીધું! સ્ટાફનો વ્યવહાર ખૂબ જ નમ્ર છે અને ${getKw(2)} પણ ઉત્તમ હતી. પૂરા 5 સ્ટાર! 👍`,
      `પહેલી વાર ${name} ની મુલાકાત લીધી અને ખૂબ મજા આવી. ઉત્તમ ${getKw(1)}, ચોખ્ખું વાતાવરણ અને ${getKw(3)}. વારંવાર આવવાનું મન થશે!`,
      `એકદમ પૈસા વસૂલ અનુભવ! ${name} ખાતે ${getKw(2)} અને ${getKw(0)} બંને ખૂબ જ સારા હતા. અહીંની સર્વિસ હંમેશા યાદ રહેશે. ⭐`,
      `જો તમે શ્રેષ્ઠ ${getKw(0)} અને ઉત્તમ સેવા શોધી રહ્યા હોવ, તો ${name} સૌથી બેસ્ટ જગ્યા છે. ${getKw(3)} પણ ખૂબ ગમ્યું! ✨`,
      `આજે ${name} ખાતે ઘણો સારો અનુભવ રહ્યો. અહીંની ${getKw(1)} અને ${getKw(2)} ખરેખર પ્રશંસનીય છે. ટીમનું કામ ખૂબ સારું છે.`,
      `${name} ખાતે બધું ખૂબ જ વ્યવસ્થિત હતું. સ્ટાફ ખૂબ મદદરૂપ છે, અને ${getKw(3)} સાથે ${getKw(4)} નો અનુભવ એકદમ પરફેક્ટ રહ્યો. 👍`,
      `અદ્ભુત અનુભવ! ${name} પર ${getKw(0)} ની ક્વોલિટી ખૂબ ઉત્તમ છે અને ${getKw(4)} એ અમારું દિલ ખુશ કરી દીધું. 10/10 રેટિંગ! ⭐`,
      `ખૂબ જ સરસ જગ્યા! ${name} નું વાતાવરણ, ${getKw(2)} અને ઝડપી ${getKw(1)} ખરેખર પ્રશંસનીય છે.`,
      `${name} ક્યારેય નિરાશ કરતું નથી! અહીંની ${getKw(0)} હંમેશની જેમ અદ્ભુત હતી અને ${getKw(5)} નું પણ પૂરતું ધ્યાન રાખવામાં આવ્યું. ✨`,
      `અમારા સમગ્ર પરિવારને ${name} ખૂબ ગમ્યું. ખાસ કરીને અહીંની ${getKw(1)} અને નમ્ર ${getKw(3)} એ સૌનું દિલ જીતી લીધું. ફરી જરૂર મુલાકાત લઈશું!`,
      `ઉત્કૃષ્ટ સેવા અને શ્રેષ્ઠ ${getKw(4)}! ${name} ખાતે આવીને ખૂબ આનંદ થયો, ${getKw(2)} પણ ટોપ-ક્લાસ હતી. 5 સ્ટાર રેટિંગ! ⭐`
    ];
  }

  // English 12 Drafts
  return [
    `Honestly loved my experience at ${name}! The ${getKw(0)} and ${getKw(1)} were outstanding. Highly recommend to everyone! ⭐⭐⭐⭐⭐`,
    `Really impressed with ${name}. Special shoutout for their ${getKw(0)} and courteous team. The ${getKw(2)} made the whole visit worthwhile! 👍`,
    `First time visiting ${name} and it exceeded all expectations! Amazing ${getKw(1)}, spotless cleanliness, and great ${getKw(3)}. Will definitely be coming back!`,
    `Top-notch ${getKw(0)} and super friendly staff at ${name}. Loved the ${getKw(2)}. 10/10 experience! ⭐`,
    `Best place in town for ${getKw(0)}! Exceptional ${getKw(3)} and genuine value for money. Keep up the wonderful work ${name}! ✨`,
    `Had a wonderful time at ${name}. What stood out most was their ${getKw(1)} and attention to ${getKw(2)}. Smooth and pleasant from start to finish.`,
    `Such a pleasant experience at ${name}! Wonderful ${getKw(3)} along with ${getKw(4)}. Very welcoming atmosphere and polite service. 👍`,
    `${name} never disappoints! Consistently great ${getKw(0)} and reliable ${getKw(4)}. My go-to recommendation for friends and family. ⭐`,
    `Super fast service and top quality at ${name}. Their ${getKw(2)} is unbeatable, and the ${getKw(1)} makes it a true 5-star experience!`,
    `The quality of ${getKw(0)} at ${name} is truly remarkable. Courteous staff, cozy vibes, and great ${getKw(5)}. Five stars all the way! ✨`,
    `Outstanding hospitality at ${name}! Truly appreciated their ${getKw(1)} and helpful attitude. The ${getKw(3)} was a huge plus. Highly recommended!`,
    `Totally satisfied with my visit to ${name}! From ${getKw(4)} to ${getKw(2)}, everything was handled with utmost care. Deserves 5 stars! ⭐`
  ];
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

  const positive = generate12KeywordDrafts(name, uniqueKeywords, lang, category);
  let neutral: string[] = [];

  if (lang === 'hi') {
    neutral = [
      `${name} पर अनुभव ठीक रहा। ${k1} अच्छा था, पर भीड़ के समय थोड़ा इंतज़ार करना पड़ा।`,
      `${name} की विज़िट अच्छी रही। स्टाफ का व्यवहार मददगार था, सर्विस संतोषजनक है।`
    ];
  } else if (lang === 'gu') {
    neutral = [
      `${name} નો અનુભવ યોગ્ય રહ્યો। ${k1} સંતોષકારક હતું પરંતુ થોડી વધુ ઝડપ જરૂરી છે.`
    ];
  } else {
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
