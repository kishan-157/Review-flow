/**
 * LocalBoost AI — Deterministic & Localized Multilingual Review Suggestion Engine
 *
 * Generates three distinct, honest, editable customer review drafts
 * based strictly on the selected business name, star rating, and chosen categories.
 * Supports: English ('en'), Hindi ('hi'), and Gujarati ('gu').
 * No paid AI APIs required.
 */

import { SupportedLanguage } from '../types/database';

export interface SuggestionResult {
  suggestions: string[];
  notice: string;
}

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
  const safeName = businessName?.trim() || 'This business';
  const cleanCategories = categories.length > 0 ? categories : (customAiKeywords && customAiKeywords.length > 0 ? customAiKeywords.slice(0, 3) : ['Overall Experience']);

  // If customer business has AI-generated suggestions customized from their prompt, blend them in
  if (rating >= 4 && customAiSuggestions?.positive && customAiSuggestions.positive.length > 0) {
    const aiDrafts = customAiSuggestions.positive.slice(0, 3);
    if (aiDrafts.length >= 2) {
      return {
        suggestions: aiDrafts,
        notice: 'Personalized by AI Agent based on business offerings. You can edit before sharing.',
      };
    }
  }

  if (rating === 3 && customAiSuggestions?.neutral && customAiSuggestions.neutral.length > 0) {
    const aiDrafts = customAiSuggestions.neutral.slice(0, 3);
    if (aiDrafts.length >= 1) {
      return {
        suggestions: aiDrafts,
        notice: 'Personalized by AI Agent based on business offerings. You can edit before sharing.',
      };
    }
  }

  if (language === 'hi') {
    return generateHindiSuggestions(safeName, rating, cleanCategories);
  } else if (language === 'gu') {
    return generateGujaratiSuggestions(safeName, rating, cleanCategories);
  } else {
    return generateEnglishSuggestions(safeName, rating, cleanCategories);
  }
}

// -------------------------------------------------------------
// English Suggestion Generator
// -------------------------------------------------------------
function generateEnglishSuggestions(name: string, rating: number, categories: string[]): SuggestionResult {
  const catsJoined = categories.slice(0, 3).join(' and ');
  const primaryCat = categories[0] || 'Overall Experience';

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating >= 4) {
    // Positive review suggestions
    s1 = `Had a great experience at ${name}! I was especially impressed with the ${primaryCat.toLowerCase()} and overall quality. Will definitely visit again.`;
    s2 = `Highly recommend ${name}. The ${catsJoined.toLowerCase()} met our expectations, and the team provided a welcoming atmosphere.`;
    s3 = `Really pleased with my visit to ${name}. The attention given to ${primaryCat.toLowerCase()} was notable and made a positive impression.`;
  } else if (rating === 3) {
    // Balanced review suggestions
    s1 = `Visited ${name} recently. The ${primaryCat.toLowerCase()} was decent, though there is some room for improvement. Fair experience overall.`;
    s2 = `An average experience at ${name}. Some aspects like ${primaryCat.toLowerCase()} were fine, but certain details could be managed better next time.`;
    s3 = `Good potential at ${name}. The ${catsJoined.toLowerCase()} had positives, but streamlining the experience would make a noticeable difference.`;
  } else {
    // Constructive/low rating suggestions
    s1 = `Visited ${name} and felt the ${primaryCat.toLowerCase()} did not meet expectations. Sharing this in hopes the management can address it.`;
    s2 = `Disappointed with my recent experience at ${name}, especially regarding ${catsJoined.toLowerCase()}. Hope to see improvements in the future.`;
    s3 = `Expected a better standard at ${name}. The ${primaryCat.toLowerCase()} needs attention from the team to improve customer satisfaction.`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'You can edit this suggestion to match your actual experience before sharing it.',
  };
}

// -------------------------------------------------------------
// Hindi Suggestion Generator (हिंदी)
// -------------------------------------------------------------
function generateHindiSuggestions(name: string, rating: number, categories: string[]): SuggestionResult {
  const primaryCat = categories[0] || 'Overall Experience';

  const categoryTranslations: Record<string, string> = {
    Food: 'भोजन',
    Taste: 'स्वाद',
    Service: 'सेवा',
    Staff: 'स्टाफ का व्यवहार',
    Ambience: 'माहौल',
    Cleanliness: 'साफ-सफाई',
    'Value for Money': 'किफायती अनुभव',
    'Waiting Time': 'प्रतीक्षा समय',
    Price: 'कीमत',
    'Overall Experience': 'समग्र अनुभव',
  };

  const catHi = categoryTranslations[primaryCat] || primaryCat;

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating >= 4) {
    s1 = `${name} में हमारा अनुभव बहुत अच्छा रहा। विशेष रूप से ${catHi} काफी प्रशंसनीय थी। हम दोबारा ज़रूर आएंगे।`;
    s2 = `${name} की मैं सराहना करता हूँ। यहाँ ${catHi} और माहौल दोनों ही बहुत संतोषजनक रहे।`;
    s3 = `${name} में बिताया गया समय सुखद रहा। टीम का ध्यान ${catHi} पर साफ दिखता है।`;
  } else if (rating === 3) {
    s1 = `${name} में मेरा अनुभव सामान्य रहा। ${catHi} ठीक था, लेकिन इसमें और सुधार की गुंजाइश है।`;
    s2 = `${name} में कुछ बातें अच्छी थीं जैसे ${catHi}, परंतु कुछ पहलुओं पर थोड़ा और ध्यान देने की आवश्यकता है।`;
    s3 = `${name} का अनुभव औसत रहा। यदि ${catHi} में थोड़ा सुधार हो तो अनुभव और बेहतर हो सकता है।`;
  } else {
    s1 = `${name} में मेरा अनुभव उम्मीद के मुताबिक नहीं रहा। विशेष तौर पर ${catHi} में सुधार की काफी आवश्यकता है।`;
    s2 = `${name} से हमें बेहतर सेवा की आशा थी। ${catHi} को लेकर थोड़ी निराशा हुई, आशा है प्रबंधन इस पर ध्यान देगा।`;
    s3 = `${name} का स्तर और बेहतर होना चाहिए। ${catHi} को लेकर मेरा अनुभव संतोषजनक नहीं रहा।`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'साझा करने से पहले आप इस सुझाव को अपने वास्तविक अनुभव के अनुसार बदल सकते हैं।',
  };
}

// -------------------------------------------------------------
// Gujarati Suggestion Generator (ગુજરાતી)
// -------------------------------------------------------------
function generateGujaratiSuggestions(name: string, rating: number, categories: string[]): SuggestionResult {
  const primaryCat = categories[0] || 'Overall Experience';

  const categoryTranslations: Record<string, string> = {
    Food: 'ખોરાક/ફૂડ',
    Taste: 'સ્વાદ',
    Service: 'સર્વિસ',
    Staff: 'સ્ટાફનો વ્યવહાર',
    Ambience: 'વાતાવરણ',
    Cleanliness: 'સ્વચ્છતા',
    'Value for Money': 'પૈસા વસૂલ',
    'Waiting Time': 'રાહ જોવાનો સમય',
    Price: 'ભાવ',
    'Overall Experience': 'એકંદર અનુભવ',
  };

  const catGu = categoryTranslations[primaryCat] || primaryCat;

  let s1 = '';
  let s2 = '';
  let s3 = '';

  if (rating >= 4) {
    s1 = `${name} ખાતે અમારો અનુભવ ખૂબ જ સરસ રહ્યો. ખાસ કરીને ${catGu} ઘણી સારી હતી. ફરી જરૂર મુલાકાત લઈશું.`;
    s2 = `${name} ની મુલાકાત સંતોષકારક રહી. અહીં ${catGu} અને ટીમનો અભિગમ ખૂબ સારો હતો.`;
    s3 = `${name} ખૂબ પસંદ આવ્યું. ${catGu} ની ગુણવત્તા ખરેખર પ્રશંસનીય હતી.`;
  } else if (rating === 3) {
    s1 = `${name} ખાતે મારો અનુભવ સામાન્ય રહ્યો. ${catGu} યોગ્ય હતું, પણ હજુ સુધારો થઈ શકે તેમ છે.`;
    s2 = `${name} માં અમુક બાબતો સારી હતી, પરંતુ ${catGu} બાબતે થોડી વધુ કાળજી રાખવાની જરૂર છે.`;
    s3 = `${name} નો એકંદર અનુભવ સારો હતો પરંતુ અપેક્ષા કરતા થોડો ઓછો રહ્યો.`;
  } else {
    s1 = `${name} ખાતે મારો અનુભવ અપેક્ષા મુજબ રહ્યો નહીં. ખાસ કરીને ${catGu} માં સુધારાની તાતી જરૂર છે.`;
    s2 = `${name} થી વધારે સારી અપેક્ષા હતી. ${catGu} બાબતે નિરાશા થઈ, આશા છે કે મેનેજમેન્ટ ધ્યાન આપશે.`;
    s3 = `${name} નું સ્તર વધુ સારું હોવું જોઈએ. ગ્રાહક સેવા અને ${catGu} પર સુધારો જરૂરી છે.`;
  }

  return {
    suggestions: [s1, s2, s3],
    notice: 'શેર કરતા પહેલાં તમે તમારા વાસ્તવિક અનુભવ મુજબ આ લખાણમાં સુધારો કરી શકો છો.',
  };
}

export const EXPERIENCE_CATEGORIES = [
  'Food',
  'Taste',
  'Service',
  'Staff',
  'Ambience',
  'Cleanliness',
  'Value for Money',
  'Waiting Time',
  'Price',
  'Overall Experience',
];
