import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  loadServerDb,
  saveServerDb,
  authenticateUser,
} from './src/server/dbStore';

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json());

// Server health check for mobile and cross-device testing
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'LocalBoost AI Backend Server',
  });
});

// Universal bootstrap data for all devices
app.get('/api/sync/bootstrap', (_req, res) => {
  try {
    const db = loadServerDb();
    return res.json({
      success: true,
      profiles: db.profiles,
      businesses: db.businesses,
      reviewSettings: db.reviewSettings,
      announcements: db.announcements,
      adminSettings: db.adminSettings,
      loyaltyConfigs: db.loyaltyConfigs,
      analyticsEvents: db.analyticsEvents || [],
      feedbacks: db.feedbacks || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Bootstrap failed' });
  }
});

// Universal cross-device login
app.post('/api/auth/login', (req, res) => {
  try {
    const { credential, password } = req.body;
    if (!credential || !password) {
      return res.status(400).json({ error: 'Email, Customer Code, or Phone, and Password are required.' });
    }
    const session = authenticateUser(credential, password);
    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Authentication failed.' });
  }
});

// Admin creates customer - instant global synchronization across all devices
app.post('/api/admin/create-customer', (req, res) => {
  try {
    const db = loadServerDb();
    const {
      fullName,
      email,
      password,
      businessName,
      googleReviewUrl,
      phone = '',
      category = 'Restaurant & Hospitality',
      address = '',
      accessValidityType = '1_year',
      customDurationDays = 365,
      customExpiryDate,
    } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !fullName || !businessName) {
      return res.status(400).json({ error: 'Full name, email, and business name are required.' });
    }

    const existing = db.profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const generatedPassword = (password || '').trim() || `LBPass${Math.floor(100000 + Math.random() * 900000)}!`;
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const customerCode = `LB-CUS-${randomSuffix}`;

    const now = new Date();
    let expiresAt: string | null = null;
    let durationDays = 365;

    if (accessValidityType === '1_month') {
      const d = new Date(now);
      d.setDate(d.getDate() + 30);
      expiresAt = d.toISOString();
      durationDays = 30;
    } else if (accessValidityType === '3_months') {
      const d = new Date(now);
      d.setDate(d.getDate() + 90);
      expiresAt = d.toISOString();
      durationDays = 90;
    } else if (accessValidityType === '6_months') {
      const d = new Date(now);
      d.setDate(d.getDate() + 180);
      expiresAt = d.toISOString();
      durationDays = 180;
    } else if (accessValidityType === 'lifetime') {
      expiresAt = null;
      durationDays = 36500;
    } else if (accessValidityType === 'custom' && customExpiryDate) {
      const target = new Date(customExpiryDate);
      durationDays = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      expiresAt = target.toISOString();
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() + (customDurationDays || 365));
      expiresAt = d.toISOString();
      durationDays = customDurationDays || 365;
    }

    const newProfile = {
      id: userId,
      full_name: fullName.trim(),
      email: cleanEmail,
      unique_customer_code: customerCode,
      role: 'customer' as const,
      status: 'active' as const,
      access_validity_type: accessValidityType,
      access_duration_days: durationDays,
      access_expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      last_login_at: now.toISOString(),
    };

    const businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const slug =
      businessName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 6);

    const newBusiness = {
      id: businessId,
      user_id: userId,
      business_name: businessName.trim(),
      unique_slug: slug,
      google_review_url: (googleReviewUrl || '').trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      category: category || 'Restaurant & Hospitality',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const newSettings = {
      id: `rs_${Date.now()}`,
      business_id: businessId,
      language: 'en' as const,
      welcome_text: 'How was your dining experience with us today?',
      thank_you_text: 'Thank you for supporting our local business! ❤️',
      enabled: true,
      accent_color: '#6C3BFF',
      qr_show_logo: true,
      qr_logo_border_style: 'circular' as const,
      qr_color: '#1F1735',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    db.profiles.unshift(newProfile);
    db.businesses.unshift(newBusiness);
    db.reviewSettings.unshift(newSettings);
    db.passwords[cleanEmail] = generatedPassword;
    db.passwords[customerCode.toLowerCase()] = generatedPassword;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone) db.passwords[cleanPhone] = generatedPassword;
    }

    saveServerDb(db);

    return res.json({
      success: true,
      user: newProfile,
      business: newBusiness,
      tempPassword: generatedPassword,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create customer.' });
  }
});

// Update customer by admin
app.post('/api/admin/update-customer', (req, res) => {
  try {
    const db = loadServerDb();
    const {
      profileId,
      fullName,
      email,
      businessName,
      googleReviewUrl,
      phone,
      status,
      accessValidityType,
      customDurationDays,
      customExpiryDate,
    } = req.body;
    const idx = db.profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    if (fullName) db.profiles[idx].full_name = fullName.trim();
    if (email) db.profiles[idx].email = email.trim().toLowerCase();
    if (status) db.profiles[idx].status = status;
    if (accessValidityType) db.profiles[idx].access_validity_type = accessValidityType;
    if (customDurationDays !== undefined) db.profiles[idx].access_duration_days = customDurationDays;
    if (customExpiryDate !== undefined) db.profiles[idx].access_expires_at = customExpiryDate;
    db.profiles[idx].updated_at = new Date().toISOString();

    const bizIdx = db.businesses.findIndex((b) => b.user_id === profileId);
    if (bizIdx !== -1) {
      if (businessName) db.businesses[bizIdx].business_name = businessName.trim();
      if (googleReviewUrl) db.businesses[bizIdx].google_review_url = googleReviewUrl.trim();
      if (phone !== undefined) db.businesses[bizIdx].phone = phone.trim();
      db.businesses[bizIdx].updated_at = new Date().toISOString();
    }

    saveServerDb(db);
    return res.json({
      success: true,
      profile: db.profiles[idx],
      business: bizIdx !== -1 ? db.businesses[bizIdx] : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update customer.' });
  }
});

// Delete customer by admin
app.post('/api/admin/delete-customer', (req, res) => {
  try {
    const db = loadServerDb();
    const { profileId } = req.body;
    db.profiles = db.profiles.filter((p) => p.id !== profileId);
    const deletedBiz = db.businesses.find((b) => b.user_id === profileId);
    if (deletedBiz) {
      db.businesses = db.businesses.filter((b) => b.id !== deletedBiz.id);
      db.reviewSettings = db.reviewSettings.filter((s) => s.business_id !== deletedBiz.id);
      db.feedbacks = db.feedbacks.filter((f) => f.business_id !== deletedBiz.id);
      db.analyticsEvents = db.analyticsEvents.filter((a) => a.business_id !== deletedBiz.id);
    }
    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete customer.' });
  }
});

// Password change & admin reset
app.post('/api/auth/change-password', (req, res) => {
  try {
    const db = loadServerDb();
    const { email, newPassword, currentPassword, isAdminReset } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (!isAdminReset && currentPassword) {
      const stored = db.passwords[cleanEmail];
      if (stored && stored !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }

    db.passwords[cleanEmail] = newPassword;
    const prof = db.profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (prof) {
      db.passwords[prof.unique_customer_code.toLowerCase()] = newPassword;
    }

    saveServerDb(db);
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update password.' });
  }
});

// Feedback submission
app.post('/api/feedback/submit', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId, rating, feedbackText, customerName, customerPhone } = req.body;
    if (!businessId || !feedbackText) {
      return res.status(400).json({ error: 'Business ID and feedback text are required.' });
    }

    const nowStr = new Date().toISOString();
    const newFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      business_id: businessId,
      rating: Number(rating) || 1,
      feedback_text: feedbackText.trim(),
      customer_name: (customerName || '').trim(),
      customer_contact: (customerPhone || '').trim(),
      status: 'new' as const,
      created_at: nowStr,
      updated_at: nowStr,
    };

    db.feedbacks.unshift(newFeedback);
    saveServerDb(db);
    return res.json({ success: true, feedback: newFeedback });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save feedback.' });
  }
});

// Analytics record
app.post('/api/analytics/record', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId, eventType, rating, visitorSessionHash } = req.body;
    if (!businessId || !eventType) {
      return res.status(400).json({ error: 'Business ID and event type are required.' });
    }

    const newEv = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      business_id: businessId,
      event_type: eventType,
      rating: rating !== undefined ? Number(rating) : undefined,
      visitor_session_hash: visitorSessionHash || '',
      created_at: new Date().toISOString(),
    };

    db.analyticsEvents.push(newEv);
    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to record analytics.' });
  }
});

// Full client-to-server data reconciliation (keeps everything synced)
app.post('/api/sync/push', (req, res) => {
  try {
    const db = loadServerDb();
    const { profiles = [], businesses = [], passwords = {} } = req.body;

    profiles.forEach((p: any) => {
      if (!db.profiles.some((ep) => ep.id === p.id || ep.email.toLowerCase() === p.email.toLowerCase())) {
        db.profiles.push(p);
      }
    });

    businesses.forEach((b: any) => {
      if (!db.businesses.some((eb) => eb.id === b.id)) {
        db.businesses.push(b);
      }
    });

    Object.entries(passwords).forEach(([k, v]) => {
      if (!db.passwords[k.toLowerCase()] && typeof v === 'string') {
        db.passwords[k.toLowerCase()] = v;
      }
    });

    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Reconciliation failed.' });
  }
});

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
  const kws = keywords.filter(k => k && k.trim().length > 1);
  const getKw = (idx: number) => {
    return (kws[idx % (kws.length || 1)] || 'Quality Service').trim();
  };

  if (language === 'hi') {
    return {
      positive: [
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
      ],
      neutral: [
        `${name} पर अनुभव ठीक रहा। ${getKw(0)} अच्छा था, पर भीड़ के समय थोड़ा इंतज़ार करना पड़ा।`,
        `${name} की विज़िट अच्छी रही। स्टाफ का व्यवहार मददगार था, सर्विस संतोषजनक है।`
      ]
    };
  }

  if (language === 'gu') {
    return {
      positive: [
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
      ],
      neutral: [
        `${name} નો અનુભવ યોગ્ય રહ્યો. ${getKw(0)} સંતોષકારક હતું પરંતુ થોડી વધુ ઝડપ જરૂરી છે.`
      ]
    };
  }

  return {
    positive: [
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
    ],
    neutral: [
      `Decent experience at ${name}. The ${getKw(0)} was good, though service during rush hours has room for improvement.`,
      `Visited ${name} for the first time. The ${getKw(1)} was polite, overall a satisfactory and fair experience.`
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
