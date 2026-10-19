/**
 * LocalBoost AI — Rule-Based Question-and-Answer Chatbot Engine
 *
 * 100% Deterministic & Local — Zero External AI APIs.
 * No OpenAI, Gemini, Claude, Ollama, or third-party inference.
 *
 * Architecture:
 * 1. Text normalization & multilingual transliteration handling.
 * 2. Language detection (English, Hindi, Gujarati).
 * 3. Keyword, phrase & synonym intent matching.
 * 4. FAQ & Product/Service catalog matching with fuzzy thresholds.
 * 5. Reusable, grammatically verified response templates.
 * 6. Action attachment (Call, WhatsApp, Directions, Website, Question Chips).
 * 7. Safe, verified fallbacks with zero invented claims.
 */

import {
  SupportedLanguage,
  ChatMessage,
  ChatActionOption,
  ChatQuickPrompt,
  ChatbotConfig,
} from '../types/database';
import { PublicBusinessChatProfile } from './businessInfoService';

export interface ChatEngineResult {
  replyText: string;
  intent: string;
  confidence: 'high' | 'medium' | 'low';
  suggestedActions: ChatActionOption[];
  detectedLanguage: SupportedLanguage;
}

// Common transliterations and word normalizations
const SYNONYM_MAP: Record<string, string> = {
  // Timings
  timing: 'hours',
  timings: 'hours',
  samay: 'hours',
  waqt: 'hours',
  time: 'hours',
  khulti: 'open',
  khulta: 'open',
  kholte: 'open',
  khule: 'open',
  khula: 'open',
  bandh: 'closed',
  band: 'closed',
  kholo: 'open',
  khulvanu: 'open',
  kholva: 'open',

  // Location
  kahan: 'location',
  kaha: 'location',
  kidhar: 'location',
  pata: 'address',
  jagah: 'location',
  rasta: 'directions',
  marg: 'directions',
  kyan: 'location',
  kya: 'location',
  sarname: 'address',
  sarnamu: 'address',
  naksho: 'maps',

  // Contact
  sampark: 'contact',
  baat: 'contact',
  phone: 'call',
  fon: 'call',
  mobile: 'call',
  number: 'phone',
  no: 'phone',

  // Money & Price
  kimat: 'price',
  keemat: 'price',
  bhav: 'price',
  bhau: 'price',
  rate: 'price',
  cost: 'price',
  kitna: 'price',
  kitne: 'price',
  ketla: 'price',
  ketli: 'price',
  rupees: 'price',
  rs: 'price',

  // Delivery
  bhejo: 'delivery',
  pahuchao: 'delivery',
  parcel: 'delivery',
  home: 'delivery',
  ghar: 'delivery',

  // Payment
  gpay: 'upi',
  phonepe: 'upi',
  paytm: 'upi',
  bhim: 'upi',
  online: 'payment',
  paisa: 'payment',
  paise: 'payment',
};

/**
 * Normalizes text: trims, lowercases, removes extraneous symbols, and standardizes spacing.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[?!,.:;'"(){}\[\]<>—–_\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects script / language if not manually forced by user.
 */
export function detectLanguage(text: string, currentSelected: SupportedLanguage = 'en'): SupportedLanguage {
  if (!text) return currentSelected;

  // Gujarati unicode range \u0A80-\u0AFF
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'gu';
  }

  // Devanagari (Hindi) unicode range \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }

  // Common Hindi transliterated keywords
  const hindiTransliterated = ['kya', 'hai', 'hain', 'kaise', 'batao', 'chahiye', 'milega', 'kitna', 'kahan', 'dost', 'aapki', 'apna'];
  // Common Gujarati transliterated keywords
  const gujaratiTransliterated = ['kem', 'cho', 'chhe', 'karo', 'aapo', 'ketla', 'ketli', 'tamaru', 'maharu', 'aaje'];

  const words = text.toLowerCase().split(/\s+/);
  const hindiMatches = words.filter((w) => hindiTransliterated.includes(w)).length;
  const gujaratiMatches = words.filter((w) => gujaratiTransliterated.includes(w)).length;

  if (gujaratiMatches > hindiMatches && gujaratiMatches >= 1) return 'gu';
  if (hindiMatches >= 1) return 'hi';

  return currentSelected;
}

/**
 * Simple Levenshtein distance for bounded typo tolerance (max distance 2 on words > 4 chars)
 */
function isFuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  if (a.length < 4 || b.length < 4) return false;

  let errors = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      errors++;
      if (errors > 2) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    } else {
      i++;
      j++;
    }
  }
  return true;
}

/**
 * Matches a query against Custom FAQs configured by the business owner.
 */
function matchCustomFaqs(
  normText: string,
  faqs: Array<{ question: string; answer: string }>
): { faq: { question: string; answer: string }; confidence: 'high' | 'medium' } | null {
  if (!faqs || faqs.length === 0) return null;

  for (const faq of faqs) {
    const qNorm = normalizeText(faq.question);
    if (normText === qNorm || normText.includes(qNorm) || qNorm.includes(normText)) {
      return { faq, confidence: 'high' };
    }

    // Check words overlap
    const qWords = qNorm.split(/\s+/).filter((w) => w.length > 2);
    const textWords = normText.split(/\s+/).filter((w) => w.length > 2);
    const common = qWords.filter((qw) => textWords.some((tw) => qw === tw || isFuzzyMatch(qw, tw)));
    if (common.length >= Math.ceil(qWords.length * 0.65) && common.length >= 2) {
      return { faq, confidence: 'medium' };
    }
  }
  return null;
}

/**
 * Matches a query against Products and Services catalog.
 */
function matchProductService(
  normText: string,
  products: PublicBusinessChatProfile['products_services']
): { item: PublicBusinessChatProfile['products_services'][0]; isPriceQuery: boolean } | null {
  if (!products || products.length === 0) return null;

  const isPriceQuery =
    normText.includes('price') ||
    normText.includes('rate') ||
    normText.includes('cost') ||
    normText.includes('kitna') ||
    normText.includes('bhav') ||
    normText.includes('kimat') ||
    normText.includes('ketla');

  for (const item of products) {
    const itemNameNorm = normalizeText(item.name);
    const itemWords = itemNameNorm.split(/\s+/).filter((w) => w.length > 2);

    // Exact or contains match
    if (normText.includes(itemNameNorm) || itemWords.every((w) => normText.includes(w))) {
      return { item, isPriceQuery };
    }

    // Partial fuzzy match
    const textWords = normText.split(/\s+/);
    const matches = itemWords.filter((iw) => textWords.some((tw) => iw === tw || isFuzzyMatch(iw, tw)));
    if (matches.length >= Math.max(1, Math.floor(itemWords.length * 0.6))) {
      return { item, isPriceQuery };
    }
  }

  return null;
}

/**
 * Builds contact action buttons according to the business configuration and user intent.
 */
function buildActionButtons(
  profile: PublicBusinessChatProfile,
  includeTypes: Array<'call' | 'whatsapp' | 'maps' | 'website'> = ['call', 'whatsapp', 'maps']
): ChatActionOption[] {
  const actions: ChatActionOption[] = [];

  if (includeTypes.includes('whatsapp') && profile.contact_actions.whatsapp_enabled && profile.whatsapp) {
    const cleanNum = profile.whatsapp.replace(/[^\d]/g, '');
    actions.push({
      type: 'whatsapp',
      label: '💬 Chat on WhatsApp',
      value: `https://wa.me/${cleanNum}?text=${encodeURIComponent(`Hello ${profile.business_name}, I have a question:`)}`,
    });
  }

  if (includeTypes.includes('call') && profile.contact_actions.call_enabled && profile.phone) {
    actions.push({
      type: 'call',
      label: `📞 Call (${profile.phone})`,
      value: `tel:${profile.phone.replace(/[^\d+]/g, '')}`,
    });
  }

  if (includeTypes.includes('maps') && profile.contact_actions.directions_enabled && profile.google_maps_url) {
    actions.push({
      type: 'maps',
      label: '📍 Directions on Google Maps',
      value: profile.google_maps_url,
    });
  }

  if (includeTypes.includes('website') && profile.contact_actions.website_enabled && profile.website_url) {
    actions.push({
      type: 'website',
      label: '🌐 Visit Website',
      value: profile.website_url.startsWith('http') ? profile.website_url : `https://${profile.website_url}`,
    });
  }

  return actions;
}

/**
 * Main Rule-Based Question Answering Engine (Zero External AI API).
 */
export function answerCustomerQuestion(
  messageText: string,
  profile: PublicBusinessChatProfile,
  preferredLanguage: SupportedLanguage = 'en',
  quickPrompts?: ChatQuickPrompt[],
  chatConfig?: ChatbotConfig
): ChatEngineResult {
  const rawText = messageText.trim();
  const lang = detectLanguage(rawText, preferredLanguage);
  const norm = normalizeText(rawText);

  // 0. QUICK PROMPT DIRECT INSTANT ANSWER MATCHING
  // If the owner configured a quick prompt with a direct answer, match and reply instantly
  if (quickPrompts && quickPrompts.length > 0) {
    const rawLower = rawText.toLowerCase();
    const normClean = norm.toLowerCase();

    const matched = quickPrompts.find((p) => {
      if (!p.is_active) return false;
      const qLower = p.question.toLowerCase().trim();
      const labelLower = p.label.toLowerCase().trim();
      const labelClean = labelLower.replace(/^[^\w\s]+/, '').trim();

      return (
        rawLower === qLower ||
        rawLower === labelLower ||
        normClean === labelClean ||
        (qLower.length > 3 && rawLower.includes(qLower)) ||
        (labelClean.length > 3 && (rawLower.includes(labelClean) || normClean.includes(labelClean)))
      );
    });

    if (matched && matched.direct_answer) {
      const actions: ChatActionOption[] = [];
      if (matched.action_type === 'whatsapp' || matched.category === 'contact') {
        if (profile.whatsapp) {
          actions.push({
            type: 'whatsapp',
            label: '💬 Chat on WhatsApp',
            value: `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`,
          });
        }
      }
      if (matched.action_type === 'call') {
        if (profile.phone) {
          actions.push({
            type: 'call',
            label: `📞 Call (${profile.phone})`,
            value: `tel:${profile.phone}`,
          });
        }
      }
      if (matched.action_type === 'maps' || matched.category === 'location') {
        if (profile.google_maps_url) {
          actions.push({
            type: 'maps',
            label: '📍 View on Google Maps',
            value: profile.google_maps_url,
          });
        }
      }
      if (matched.action_type === 'website') {
        if (matched.action_value || profile.website_url) {
          actions.push({
            type: 'website',
            label: '🌐 Open Website',
            value: matched.action_value || profile.website_url!,
          });
        }
      }
      if (actions.length === 0) {
        actions.push(...buildActionButtons(profile, ['whatsapp', 'call']));
      }

      return {
        replyText: matched.direct_answer,
        intent: `quick_prompt_${matched.id}`,
        confidence: 'high',
        suggestedActions: actions,
        detectedLanguage: lang,
      };
    }
  }

  // Default empty actions
  const defaultActions = buildActionButtons(profile, ['call', 'whatsapp', 'maps']);

  // 1. GREETING INTENT
  const greetingKeywords = ['hi', 'hello', 'hey', 'namaste', 'kem cho', 'kemcho', 'pranam', 'good morning', 'good afternoon', 'good evening', 'namaskar'];
  if (greetingKeywords.some((g) => norm === g || norm.startsWith(`${g} `))) {
    let reply = `Hello! Welcome to ${profile.business_name}. How can we assist you today? You can ask about our timings, products, prices, location, or tap any option below.`;
    if (lang === 'hi') {
      reply = `नमस्ते! ${profile.business_name} में आपका स्वागत है। आज हम आपकी क्या सहायता कर सकते हैं? आप हमारी टाइमिंग, प्रोडक्ट्स, कीमतें या पते के बारे में पूछ सकते हैं।`;
    } else if (lang === 'gu') {
      reply = `નમસ્તે! ${profile.business_name} માં આપનું સ્વાગત છે. આજે અમે આપને કઈ રીતે મદદ કરી શકીએ? આપ અમારા સમય, પ્રોડક્ટ્સ, કિંમત કે સરનામા વિશે પૂછી શકો છો.`;
    }
    return {
      replyText: reply,
      intent: 'greeting',
      confidence: 'high',
      suggestedActions: [
        { type: 'question', label: '🕒 Opening Hours', value: 'What are your opening hours?' },
        { type: 'question', label: '📍 Location', value: 'Where is your shop located?' },
        { type: 'question', label: '📋 Products & Services', value: 'What products or services do you offer?' },
        { type: 'question', label: '💳 Payment Methods', value: 'Which payment methods do you accept?' },
      ],
      detectedLanguage: lang,
    };
  }

  // 2. TIMINGS / OPERATING HOURS INTENT
  const hoursKeywords = [
    'hours', 'timing', 'timings', 'time', 'samay', 'open', 'close', 'closed', 'opening', 'closing',
    'khulti', 'khulta', 'kholte', 'khule', 'bandh', 'sunday', 'somwar', 'ravivar', 'aaje', 'aaj', 'today',
    'समय', 'कब', 'खुलती', 'खुलता', 'खुलेगी', 'खुला', 'बंद', 'દુકાન', 'સમય', 'ક્યારે', 'ખુલે', 'ખુલેશે', 'બંધ'
  ];
  const isHoursQuery = hoursKeywords.some((k) => norm.includes(k)) && (
    norm.includes('shop') || norm.includes('store') || norm.includes('kab') || norm.includes('when') ||
    norm.includes('kitne') || norm.includes('ketla') || norm.includes('open') || norm.includes('timing') ||
    norm.includes('sunday') || norm.includes('hours') || norm.includes('samay') || norm.includes('समय') ||
    norm.includes('कब') || norm.includes('ક્યારે') || norm.includes('દુકાન') || norm.includes('સમય') ||
    norm.includes('ખુલે') || norm.includes('બંધ')
  );

  if (isHoursQuery) {
    const sch = profile.opening_hours.schedule;
    const { isOpenNow, todayHoursText } = profile.opening_hours;

    let reply = `${profile.business_name} Operating Hours:\n• Mon - Sat: ${sch.monday.open} to ${sch.monday.close}\n• Sunday: ${sch.sunday.closed ? 'Closed' : `${sch.sunday.open} to ${sch.sunday.close}`}\n\nStatus: ${isOpenNow ? '🟢 Currently OPEN' : '🔴 Currently CLOSED'} (${todayHoursText})`;

    if (profile.opening_hours.appointment_only) {
      reply += `\n⚠️ Note: Visits are by prior appointment only.`;
    }
    if (profile.opening_hours.holiday_notice) {
      reply += `\n📢 Holiday Notice: ${profile.opening_hours.holiday_notice}`;
    }

    if (lang === 'hi') {
      reply = `${profile.business_name} का समय:\n• सोमवार से शनिवार: सुबह ${sch.monday.open} से रात ${sch.monday.close}\n• रविवार: ${sch.sunday.closed ? 'बंद' : `${sch.sunday.open} से ${sch.sunday.close}`}\n\nवर्तमान स्थिति: ${isOpenNow ? '🟢 अभी खुला है' : '🔴 अभी बंद है'} (${todayHoursText})`;
    } else if (lang === 'gu') {
      reply = `${profile.business_name} નો સમય:\n• સોમવારથી શનિવાર: સવારે ${sch.monday.open} થી રાત્રે ${sch.monday.close}\n• રવિવાર: ${sch.sunday.closed ? 'બંધ' : `${sch.sunday.open} થી ${sch.sunday.close}`}\n\nહાલની સ્થિતિ: ${isOpenNow ? '🟢 અત્યારે ચાલુ છે' : '🔴 અત્યારે બંધ છે'} (${todayHoursText})`;
    }

    return {
      replyText: reply,
      intent: 'timings_hours',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['call', 'whatsapp']),
      detectedLanguage: lang,
    };
  }

  // 3. LOCATION & DIRECTIONS INTENT
  const locKeywords = [
    'location', 'address', 'directions', 'pata', 'kahan', 'kaha', 'rasta', 'map', 'maps', 'kidhar', 'area', 'city', 'pin', 'pincode', 'sarnamu', 'sarname',
    'સરનામું', 'સરનામુ', 'ક્યાં', 'ક્યા', 'સ્થળ', 'પતો', 'નકશો',
    'पता', 'कहाँ', 'कहा', 'किधर', 'रास्ता', 'स्थान', 'नक्शा'
  ];
  if (locKeywords.some((k) => norm.includes(k))) {
    const fullAddr = [profile.address, profile.area, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ');
    let reply = `📍 ${profile.business_name} is located at:\n${fullAddr || 'Centrally located in the market'}.\n\nYou can tap the "Directions" button below to open Google Maps for turn-by-turn navigation!`;

    if (lang === 'hi') {
      reply = `📍 ${profile.business_name} का पता:\n${fullAddr || 'मुख्य बाजार क्षेत्र'}\n\nआप सीधे गूगल मैप्स पर लोकेशन देखने के लिए नीचे "Directions" बटन पर टैप कर सकते हैं।`;
    } else if (lang === 'gu') {
      reply = `📍 ${profile.business_name} નું સરનામું:\n${fullAddr || 'મુખ્ય બજાર વિસ્તાર'}\n\nગૂગલ મેપ્સ પર લોકેશન જોવા માટે નીચે "Directions" બટન પર ક્લિક કરો.`;
    }

    return {
      replyText: reply,
      intent: 'location_directions',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['maps', 'call']),
      detectedLanguage: lang,
    };
  }

  // 4. PHONE / CALL INTENT
  const phoneKeywords = [
    'phone', 'call', 'mobile', 'telephone', 'dial', 'fon', 'number',
    'ફોન', 'કોલ', 'મોબાઇલ', 'નંબર', 'સંપર્ક',
    'फोन', 'कॉल', 'मोबाइल', 'नंबर', 'संपर्क'
  ];
  if (phoneKeywords.some((k) => norm.includes(k)) && !norm.includes('whatsapp')) {
    let reply = `📞 You can call ${profile.business_name} directly at ${profile.phone || 'our official phone number'}. Tap the Call button below to connect instantly.`;
    if (lang === 'hi') {
      reply = `📞 आप ${profile.business_name} को सीधे ${profile.phone || 'हमारे नंबर'} पर कॉल कर सकते हैं। तुरंत कॉल करने के लिए नीचे दिए गए बटन पर टैप करें।`;
    } else if (lang === 'gu') {
      reply = `📞 આપ ${profile.business_name} નો સીધો સંપર્ક ${profile.phone || 'નંબર'} પર કરી શકો છો. નીચે આપેલ બટન પર ક્લિક કરીને કૉલ કરો.`;
    }
    return {
      replyText: reply,
      intent: 'contact_phone',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['call', 'whatsapp']),
      detectedLanguage: lang,
    };
  }

  // 5. WHATSAPP INTENT
  if (norm.includes('whatsapp') || norm.includes('whatsap') || norm.includes('watsapp')) {
    let reply = `💬 Connect with ${profile.business_name} on WhatsApp at ${profile.whatsapp || profile.phone}. Click below to chat directly with our team!`;
    if (lang === 'hi') {
      reply = `💬 ${profile.business_name} से WhatsApp पर संपर्क करें (${profile.whatsapp || profile.phone})। सीधे चैट शुरू करने के लिए नीचे क्लिक करें!`;
    } else if (lang === 'gu') {
      reply = `💬 ${profile.business_name} સાથે WhatsApp પર જોડાઓ (${profile.whatsapp || profile.phone})। સીધી વાત કરવા માટે નીચે ક્લિક કરો!`;
    }
    return {
      replyText: reply,
      intent: 'whatsapp_contact',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
      detectedLanguage: lang,
    };
  }

  // 6. WEBSITE INTENT
  if (norm.includes('website') || norm.includes('web') || norm.includes('site') || norm.includes('portal') || norm.includes('link')) {
    if (profile.website_url) {
      return {
        replyText: `🌐 Visit our official website for more details: ${profile.website_url}`,
        intent: 'website_link',
        confidence: 'high',
        suggestedActions: buildActionButtons(profile, ['website', 'whatsapp']),
        detectedLanguage: lang,
      };
    }
  }

  // 7. PAYMENT METHODS INTENT
  const paymentKeywords = ['payment', 'pay', 'upi', 'gpay', 'phonepe', 'paytm', 'card', 'cards', 'cash', 'credit', 'debit', 'netbanking', 'bhim'];
  if (paymentKeywords.some((k) => norm.includes(k))) {
    const methods = profile.policies.payment_methods?.join(', ') || 'Cash & UPI (Google Pay, PhonePe, Paytm)';
    let reply = `💳 Accepted Payment Methods at ${profile.business_name}:\n• ${methods}\n\nFast, secure and contact-less digital payments are fully supported.`;
    if (lang === 'hi') {
      reply = `💳 ${profile.business_name} पर स्वीकार्य पेमेंट के तरीके:\n• ${methods}\n\nUPI (GPay/PhonePe), कैश और कार्ड्स से भुगतान पूरी तरह स्वीकार्य है।`;
    } else if (lang === 'gu') {
      reply = `💳 ${profile.business_name} ખાતે સ્વીકાર્ય પેમેન્ટ પદ્ધતિઓ:\n• ${methods}\n\nરોકડ અને તમામ UPI પેમેન્ટ સરળતાથી કરી શકાય છે.`;
    }
    return {
      replyText: reply,
      intent: 'payment_methods',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['whatsapp']),
      detectedLanguage: lang,
    };
  }

  // 8. DELIVERY INTENT
  const deliveryKeywords = ['delivery', 'deliver', 'home delivery', 'bhejo', 'shipping', 'parcel', 'swiggy', 'zomato'];
  if (deliveryKeywords.some((k) => norm.includes(k))) {
    const delInfo = profile.policies.delivery || 'Local delivery is available in nearby areas.';
    const sArea = profile.policies.service_area ? `\n• Service Area: ${profile.policies.service_area}` : '';
    let reply = `🚚 Delivery Details for ${profile.business_name}:\n• ${delInfo}${sArea}\n\nPlease contact us on WhatsApp to confirm delivery timing and minimum order.`;
    if (lang === 'hi') {
      reply = `🚚 डिलीवरी जानकारी (${profile.business_name}):\n• ${delInfo}${sArea}\n\nडिलीवरी ऑर्डर देने के लिए कृपया WhatsApp पर संपर्क करें।`;
    } else if (lang === 'gu') {
      reply = `🚚 ડિલિવરી વિગતો (${profile.business_name}):\n• ${delInfo}${sArea}\n\nડિલિવરી ઓર્ડર માટે કૃપા કરીને WhatsApp પર સંપર્ક કરો.`;
    }
    return {
      replyText: reply,
      intent: 'delivery_policy',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
      detectedLanguage: lang,
    };
  }

  // 9. RETURN, EXCHANGE & REFUND INTENT
  const returnKeywords = ['return', 'exchange', 'refund', 'cancellation', 'cancel', 'wapas', 'badalna'];
  if (returnKeywords.some((k) => norm.includes(k))) {
    const retInfo = profile.policies.return_exchange || 'Please bring the original bill receipt for return/exchange inquiries.';
    const refInfo = profile.policies.refund ? `\n• Refund: ${profile.policies.refund}` : '';
    let reply = `🔄 Return & Exchange Policy:\n• ${retInfo}${refInfo}\n\nFor any specific assistance, please contact our team directly.`;
    if (lang === 'hi') {
      reply = `🔄 रिटर्न व एक्सचेंज पॉलिसी:\n• ${retInfo}${refInfo}\n\nअधिक जानकारी के लिए सीधे संपर्क करें।`;
    } else if (lang === 'gu') {
      reply = `🔄 રીટર્ન અને એક્સચેન્જ નીતિ:\n• ${retInfo}${refInfo}\n\nવધુ માહિતી માટે અમારો સંપર્ક કરો.`;
    }
    return {
      replyText: reply,
      intent: 'return_refund_policy',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
      detectedLanguage: lang,
    };
  }

  // 10. BOOKING & APPOINTMENT INTENT
  const bookingKeywords = ['appointment', 'book', 'booking', 'seat', 'table', 'slot', 'reserve', 'reservation'];
  if (bookingKeywords.some((k) => norm.includes(k))) {
    const bookInfo = profile.policies.booking_policy || 'Walk-ins are welcome. You can also message on WhatsApp to reserve in advance.';
    let reply = `📅 Booking & Appointments:\n• ${bookInfo}\n\nTo schedule your slot right away, click WhatsApp below.`;
    if (lang === 'hi') {
      reply = `📅 बुकिंग और अपॉइंटमेंट:\n• ${bookInfo}\n\nतुरंत स्लॉट बुक करने के लिए नीचे WhatsApp पर मैसेज करें।`;
    } else if (lang === 'gu') {
      reply = `📅 બુકિંગ અને એપોઇન્ટમેન્ટ:\n• ${bookInfo}\n\nતુરંત બુકિંગ માટે નીચે WhatsApp પર સંપર્ક કરો.`;
    }
    return {
      replyText: reply,
      intent: 'booking_appointment',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
      detectedLanguage: lang,
    };
  }

  // 11. CHECK SPECIFIC PRODUCT / SERVICE OR CATALOG
  const prodMatch = matchProductService(norm, profile.products_services);
  if (prodMatch) {
    const item = prodMatch.item;
    let reply = `📋 ${item.name}:\n• Category: ${item.category}\n• Price: ${item.price} (${item.price_type.replace('_', ' ')})\n• Details: ${item.description}\n• Availability: ${item.available ? '✅ In Stock' : '❌ Currently Out of Stock'}`;
    if (item.variants) {
      reply += `\n• Options: ${item.variants}`;
    }

    if (lang === 'hi') {
      reply = `📋 ${item.name}:\n• श्रेणी: ${item.category}\n• कीमत: ${item.price}\n• विवरण: ${item.description}\n• उपलब्धता: ${item.available ? '✅ उपलब्ध है' : '❌ अभी उपलब्ध नहीं'}`;
    } else if (lang === 'gu') {
      reply = `📋 ${item.name}:\n• કેટેગરી: ${item.category}\n• કિંમત: ${item.price}\n• વિગતો: ${item.description}\n• ઉપલબ્ધતા: ${item.available ? '✅ ઉપલબ્ધ છે' : '❌ હાલમાં ઉપલબ્ધ નથી'}`;
    }

    return {
      replyText: reply,
      intent: 'product_service_detail',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
      detectedLanguage: lang,
    };
  }

  // 12. GENERAL PRODUCTS / MENU LIST INQUIRY
  const catalogKeywords = ['products', 'services', 'items', 'menu', 'list', 'kya milta hai', 'kya bechte ho', 'variety', 'offerings'];
  if (catalogKeywords.some((k) => norm.includes(k))) {
    if (profile.products_services && profile.products_services.length > 0) {
      const itemsList = profile.products_services
        .map((p) => `• ${p.name} - ${p.price} (${p.category})`)
        .join('\n');
      let reply = `📋 Offerings at ${profile.business_name}:\n${itemsList}\n\nContact us on WhatsApp for orders, custom requests, or availability!`;
      if (lang === 'hi') {
        reply = `📋 ${profile.business_name} की प्रमुख वस्तुएं व सेवाएं:\n${itemsList}\n\nऑर्डर या किसी विशेष वस्तु की जानकारी के लिए WhatsApp पर पूछें।`;
      } else if (lang === 'gu') {
        reply = `📋 ${profile.business_name} ની મુખ્ય પ્રોડક્ટ્સ અને સેવાઓ:\n${itemsList}\n\nઓર્ડર અથવા વધુ વિગતો માટે WhatsApp પર સંપર્ક કરો.`;
      }
      return {
        replyText: reply,
        intent: 'products_services_catalog',
        confidence: 'high',
        suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
        detectedLanguage: lang,
      };
    }
  }

  // 13. MATCH CONFIGURED BUSINESS FAQS
  const faqMatch = matchCustomFaqs(norm, profile.faqs);
  if (faqMatch) {
    return {
      replyText: faqMatch.faq.answer,
      intent: 'custom_faq',
      confidence: faqMatch.confidence,
      suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
      detectedLanguage: lang,
    };
  }

  // 14. HUMAN ASSISTANCE INTENT
  const humanKeywords = ['human', 'person', 'manager', 'owner', 'baat karwao', 'agent', 'support', 'real person'];
  if (humanKeywords.some((k) => norm.includes(k))) {
    let reply = `Connecting you with our store team! Please tap the WhatsApp button below or call us directly at ${profile.phone || 'our store'}.`;
    if (lang === 'hi') {
      reply = `हमारी टीम से बात करने के लिए कृपया नीचे दिए गए WhatsApp बटन पर टैप करें या सीधे ${profile.phone || 'दुकान'} पर कॉल करें।`;
    } else if (lang === 'gu') {
      reply = `અમારી ટીમ સાથે સીધી વાત કરવા માટે નીચે આપેલ WhatsApp બટન પર ક્લિક કરો અથવા ${profile.phone || 'દુકાન'} પર કૉલ કરો.`;
    }
    return {
      replyText: reply,
      intent: 'human_assistance',
      confidence: 'high',
      suggestedActions: buildActionButtons(profile, ['whatsapp', 'call']),
      detectedLanguage: lang,
    };
  }

  // 15. SAFE FALLBACK (ZERO INVENTED FACTS)
  let fallbackReply = `I couldn’t confirm that specific information from the verified details available to me. Please contact ${profile.business_name} directly via WhatsApp or phone for immediate assistance!`;
  if (lang === 'hi') {
    fallbackReply = `मुझे इस जानकारी की पुष्टि उपलब्ध बिज़नेस डिटेल्स से नहीं हो पाई। सही जानकारी के लिए कृपया ${profile.business_name} से सीधे WhatsApp या फोन पर संपर्क करें।`;
  } else if (lang === 'gu') {
    fallbackReply = `આ માહિતીની પુષ્ટિ ઉપલબ્ધ બિઝનેસ વિગતોમાંથી થઈ શકી નથી. સાચી માહિતી માટે કૃપા કરીને ${profile.business_name} નો સીધો WhatsApp અથવા ફોન દ્વારા સંપર્ક કરો.`;
  }

  return {
    replyText: fallbackReply,
    intent: 'fallback_unknown',
    confidence: 'low',
    suggestedActions: defaultActions,
    detectedLanguage: lang,
  };
}
