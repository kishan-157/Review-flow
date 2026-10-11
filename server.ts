import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side health and Supabase Secret Key status check (Zero secret leakage)
app.get('/api/supabase/status', (_req, res) => {
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  const isConfigured = Boolean(secretKey && secretKey.length > 5);

  res.json({
    success: true,
    hasServiceRoleKey: isConfigured,
    keyType: 'Server-Side Private Service Role Key',
    // Never send the full secret key to the frontend
    keyMasked: isConfigured ? `${secretKey.substring(0, 9)}...${secretKey.slice(-4)}` : null,
    secured: true,
    storageLocation: 'Backend Server Environment (.env)',
    message: isConfigured
      ? 'Backend Secret Key safely loaded into server environment. Protected from client exposure.'
      : 'No backend secret key detected.',
  });
});

// API endpoint to craft a complete Business Prompt using Google Link, Website & details
// 100% FREE Built-in Smart Engine - Zero External API, Zero Cost, Zero API Keys
app.post('/api/ai/craft-prompt', async (req, res) => {
  try {
    const {
      googleLink = '',
      websiteUrl = '',
      businessName = '',
      category = 'Local Business',
      location = '',
      highlights = '',
      language = 'en',
    } = req.body;

    const safeName = (businessName || 'Our Business').trim();
    const safeCat = (category || 'Local Business').trim();
    const safeLoc = (location || '').trim();
    const safeHighlights = (highlights || '').trim();
    const safeGoogleLink = (googleLink || '').trim();
    const safeWebsite = (websiteUrl || '').trim();

    // Free lightweight metadata extraction if websiteUrl is a valid http(s) URL
    let siteMeta = '';
    if (safeWebsite && (safeWebsite.startsWith('http://') || safeWebsite.startsWith('https://'))) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const webRes = await fetch(safeWebsite, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartBusinessAgent/1.0)' },
        });
        clearTimeout(timeoutId);
        if (webRes.ok) {
          const html = await webRes.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const title = titleMatch ? titleMatch[1].trim() : '';
          const desc = metaDescMatch ? metaDescMatch[1].trim() : '';
          siteMeta = [title, desc].filter(Boolean).join(' - ');
        }
      } catch (err) {
        // Fetch timed out or failed, continue gracefully
      }
    }

    // 100% Free Built-in Smart Prompt Synthesizer
    const synthesized = buildComprehensivePrompt({
      name: safeName,
      category: safeCat,
      location: safeLoc,
      highlights: safeHighlights,
      siteMeta,
      googleLink: safeGoogleLink,
      website: safeWebsite,
      language,
    });

    return res.json({
      success: true,
      source: 'smart-engine-free',
      craftedPrompt: synthesized.prompt,
      highlights: synthesized.highlights,
      suggestedKeywords: synthesized.keywords,
      siteMetaExtracted: !!siteMeta,
    });
  } catch (error: any) {
    console.error('Failed to craft business prompt:', error);
    res.status(500).json({ error: error.message || 'Internal server error crafting prompt.' });
  }
});

// Comprehensive Category & Semantic Knowledge Base (100% Free, Zero API Key)
function buildComprehensivePrompt({
  name,
  category,
  location,
  highlights,
  siteMeta,
  googleLink,
  website,
  language,
}: {
  name: string;
  category: string;
  location: string;
  highlights: string;
  siteMeta: string;
  googleLink: string;
  website: string;
  language: string;
}) {
  const locPhrase = location ? `situated at ${location}` : '';
  const specPhrase = highlights ? `Our key specialties and customer favorites include: ${highlights}.` : '';
  const webPhrase = siteMeta ? `Online presence details: "${siteMeta}".` : '';
  const mapPhrase = googleLink ? `Verified Google Profile: ${googleLink}.` : '';

  let categoryDossier = '';
  let defaultKeywords: string[] = [];

  switch (category) {
    case 'Restaurant & Hospitality':
      categoryDossier = 'We take immense pride in serving freshly prepared, authentic cuisine using top-quality ingredients. Our kitchen adheres to the highest hygiene and cleanliness standards. We feature a warm, family-friendly dining ambience with polite and attentive service staff. Orders are prepared quickly with honest pricing, ensuring every guest leaves delighted.';
      defaultKeywords = [
        'Authentic Taste', 'Hygienic Kitchen', 'Courteous Staff', 'Quick Service',
        'Family Dining', 'Fresh Ingredients', 'Great Value', 'Cozy Ambience', 'Must-Try Dish'
      ];
      break;
    case 'Retail & Supermarket':
      categoryDossier = 'We provide an extensive selection of daily groceries, fresh produce, branded household essentials, and FMCG products at unbeatable discounted rates. Our store features organized aisles, transparent barcode billing, speedy checkout, and accommodating staff ready to assist every customer.';
      defaultKeywords = [
        'Fresh Stock', 'Wide Variety', 'Wholesale Rates', 'Fast Billing',
        'Helpful Staff', 'Neat Aisles', 'Great Discounts', 'Hassle-free Shopping'
      ];
      break;
    case 'Healthcare & Clinic':
      categoryDossier = 'We are committed to delivering compassionate, patient-first medical and wellness care. Our facility is equipped with modern, gentle diagnostic equipment, sterilized instruments, punctual appointment schedules, and clear transparent consultations to ensure complete patient comfort.';
      defaultKeywords = [
        'Caring Doctor', 'Clean Clinic', 'Punctual Appointments', 'Gentle Treatment',
        'Modern Equipment', 'Affordable Consultation', 'Polite Nursing Staff', 'Safe & Sterilized'
      ];
      break;
    case 'Salon & Spa':
      categoryDossier = 'We offer personalized luxury grooming, haircut, facial, and therapeutic spa experiences. Our certified stylists utilize sanitized tools, organic and branded products, and customized styling techniques within a serene, relaxing environment designed for rejuvenation.';
      defaultKeywords = [
        'Skilled Stylists', 'Relaxing Ambiance', 'Sterilized Tools', 'Custom Haircut',
        'Premium Products', 'Courteous Hospitality', 'Worth the Money', 'Glowing Results'
      ];
      break;
    case 'Automotive & Garage':
      categoryDossier = 'We deliver reliable vehicle maintenance, mechanical repairs, advanced computer diagnostics, and genuine spare parts. We believe in honest upfront pricing, timely vehicle delivery, and clear communication throughout the repair process.';
      defaultKeywords = [
        'Honest Pricing', 'Genuine Spare Parts', 'Skilled Mechanics', 'Fast Turnaround',
        'Reliable Service', 'Accurate Diagnostics', 'Transparent Billing'
      ];
      break;
    default:
      categoryDossier = 'We are dedicated to providing top-quality services, dependable customer support, transparent and honest pricing, and prompt response times to exceed customer expectations every single day.';
      defaultKeywords = [
        'Excellent Service', 'Courteous Team', 'Fair Pricing', 'Fast Response',
        'Reliable Quality', 'Clean Premises', 'Highly Recommended'
      ];
  }

  // If user provided custom highlights, blend them into extracted keywords
  if (highlights) {
    const customTags = highlights
      .split(/[,;|]+/)
      .map(t => t.trim())
      .filter(t => t.length > 2)
      .slice(0, 4);
    defaultKeywords = Array.from(new Set([...customTags, ...defaultKeywords])).slice(0, 12);
  }

  const prompt = `${name} is a premier ${category} establishment ${locPhrase}. ${categoryDossier} ${specPhrase} ${webPhrase} ${mapPhrase} When customers visit and scan our review QR standee, we want their Google reviews to highlight our quality, courteous team, prompt service, and exceptional overall experience.`.replace(/\s+/g, ' ').trim();

  return {
    prompt,
    highlights: [
      highlights || `Specialized in premium ${category}`,
      location ? `Prime accessibility at ${location}` : 'Centrally located and accessible',
      'Warm hospitality, fair pricing, and clean premises',
    ],
    keywords: defaultKeywords,
  };
}

// API endpoint to process Business Prompt with 100% Free Smart NLP Engine
app.post('/api/ai/analyze-business', async (req, res) => {
  try {
    const { prompt, businessName, category, language = 'en' } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const safePrompt = prompt.trim();
    const safeName = (businessName || 'Our Business').trim();
    const safeCat = (category || 'Local Business').trim();

    // 100% Free Semantic NLP & Keyword Extractor
    const extractedKeywords = extractKeywordsFromPrompt(safePrompt, safeCat);
    const summary = generateSmartSummary(safeName, safeCat, safePrompt);
    const suggestions = generateSmartSuggestions(safeName, extractedKeywords, language);

    return res.json({
      success: true,
      source: 'smart-engine-free',
      keywords: extractedKeywords,
      summary,
      suggestions,
      recommendations: [
        'Place the QR standee right on the billing counter or table tents at eye level.',
        'Train your cashier to invite happy customers: "A quick 10-second review helps our small team grow!"',
        'Mention your top keywords (e.g. signature items and courteous staff) on your Google Business profile posts.'
      ]
    });
  } catch (error: any) {
    console.error('Business analysis failed:', error);
    res.status(500).json({ error: error.message || 'Internal server error processing prompt.' });
  }
});

// Helper functions for 100% Free Keyword Extraction
function extractKeywordsFromPrompt(prompt: string, category: string): string[] {
  const commonWords = new Set([
    'the', 'and', 'a', 'an', 'is', 'in', 'at', 'of', 'for', 'with', 'on', 'to', 'our', 'we', 'are', 'my', 'your',
    'all', 'has', 'have', 'best', 'good', 'great', 'nice', 'very', 'by', 'from', 'this', 'that', 'also', 'provide',
    'providing', 'serve', 'serving', 'special', 'here', 'which', 'who', 'customer', 'customers', 'business', 'shop',
    'store', 'center', 'when', 'leave', 'their', 'want', 'overall', 'delivering', 'premier', 'establishment'
  ]);

  // Clean words
  const cleanTokens = prompt
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !commonWords.has(w.toLowerCase()));

  // Extract multi-word patterns and capital phrases if any
  const capitalizedOrImportant: string[] = [];
  const words = prompt.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[^\w]/g, '');
    const w2 = words[i+1].replace(/[^\w]/g, '');
    if (w1.length > 2 && w2.length > 2 && !commonWords.has(w1.toLowerCase()) && !commonWords.has(w2.toLowerCase())) {
      capitalizedOrImportant.push(`${w1} ${w2}`);
    }
  }

  // Category defaults
  const baseDefaults: Record<string, string[]> = {
    'Restaurant & Hospitality': ['Delicious Food', 'Warm Hospitality', 'Quick Service', 'Cozy Ambiance', 'Fresh Ingredients', 'Clean Dining Area', 'Affordable Prices'],
    'Retail & Supermarket': ['Wide Variety', 'Fair Pricing', 'Polite Staff', 'Fast Checkout', 'Fresh Stock', 'Organized Aisles', 'Great Discounts'],
    'Healthcare & Clinic': ['Caring Doctor', 'Hygiene Standards', 'Punctual Appointments', 'Gentle Care', 'Modern Equipment', 'Affordable Fees'],
    'Salon & Spa': ['Skilled Stylists', 'Relaxing Ambience', 'Hygienic Tools', 'Custom Styling', 'Premium Products', 'Courteous Staff'],
    'Automotive & Garage': ['Honest Pricing', 'Quick Diagnosis', 'Reliable Mechanics', 'Genuine Spare Parts', 'Timely Delivery'],
  };

  const catDefaults = baseDefaults[category] || ['Friendly Staff', 'Fast Service', 'High Quality', 'Value for Money', 'Clean Space'];
  
  const uniqueFound = Array.from(new Set([
    ...capitalizedOrImportant.slice(0, 5),
    ...cleanTokens.slice(0, 6).map(w => w.charAt(0).toUpperCase() + w.slice(1)),
    ...catDefaults
  ])).filter(k => k.length >= 3);

  return uniqueFound.slice(0, 14);
}

function generateSmartSummary(name: string, category: string, prompt: string): string {
  const shortSnippet = prompt.split(/[.!?]/)[0] || `${name} offers top quality ${category} services`;
  return `${shortSnippet.trim()}. Known for great customer care, quality, and dependable service.`;
}

function generateSmartSuggestions(name: string, keywords: string[], language: string = 'en') {
  const k1 = keywords[0] || 'Quality Service';
  const k2 = keywords[1] || 'Friendly Staff';
  const k3 = keywords[2] || 'Great Value';

  if (language === 'hi') {
    return {
      positive: [
        `${name} पर बहुत ही शानदार अनुभव रहा! यहाँ की ${k1} और ${k2} वाकई बहुत बढ़िया है।`,
        `${name} की सर्विस और ${k1} ने दिल जीत लिया। स्टाफ बहुत विनम्र है और माहौल भी बहुत सुखद है।`,
        `अगर आप बेहतरीन ${k1} और किफायती दाम ढूंढ रहे हैं, तो ${name} सबसे बेस्ट जगह है। 5 स्टार!`
      ],
      neutral: [
        `${name} पर अनुभव ठीक रहा। ${k1} अच्छा था, पर भीड़ के समय थोड़ा इंतज़ार करना पड़ा।`,
        `${name} की विज़िट अच्छी रही। स्टाफ का व्यवहार मददगार था, सर्विस संतोषजनक है।`
      ]
    };
  }

  if (language === 'gu') {
    return {
      positive: [
        `${name} ખાતે અમારો અનુભવ ખૂબ જ ઉત્તમ રહ્યો! ખાસ કરીને ${k1} અને ${k2} ખરેખર પ્રશંસનીય છે.`,
        `${name} ની મુલાકાત પૈસા વસૂલ રહી. અહીં ${k3} અને સ્ટાફનો સહકાર ઘણો સારો હતો.`,
        `${name} ની સર્વિસ અને ${k1} મને ખૂબ ગમી. ભવિષ્યમાં પણ ફરી મુલાકાત લઈશું!`
      ],
      neutral: [
        `${name} નો અનુભવ યોગ્ય રહ્યો. ${k1} સંતોષકારક હતું પરંતુ થોડી વધુ ઝડપ જરૂરી છે.`
      ]
    };
  }

  return {
    positive: [
      `Had a wonderful experience at ${name}! The ${k1} and ${k2} exceeded expectations. Highly recommend!`,
      `Really impressed by ${name}. Their attention to ${k1} along with ${k3} made my visit truly memorable.`,
      `Outstanding hospitality and service at ${name}. The ${k2} made us feel right at home. 5 stars well deserved!`
    ],
    neutral: [
      `Decent experience at ${name}. The ${k1} was good, though service during rush hours has room for improvement.`,
      `Visited ${name} for the first time. The ${k2} was polite, overall a satisfactory and fair experience.`
    ]
  };
}

// Mount Vite middleware in development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
