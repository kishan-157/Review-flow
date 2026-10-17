import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  loadServerDb,
  saveServerDb,
  authenticateUser,
} from './src/server/dbStore';
import {
  RewardReminder,
  ReminderAuditLog,
  ReminderStage,
  ReminderStatus,
  LoyaltyCard,
  ScratchCampaign,
  ScratchPlay,
} from './src/types/database';

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json());

// Set Permissions-Policy and Feature-Policy to allow geolocation, camera, and mic in browsers and embedded iframes
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(self "*"), camera=(self "*"), microphone=(self "*")');
  res.setHeader('Feature-Policy', 'geolocation *; camera *; microphone *');
  next();
});

// Server health check for mobile and cross-device testing
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'LocalBoost AI Backend Server',
  });
});

// Geocoding and Address Coordinate Lookup (OpenStreetMap Nominatim + Direct Coordinates & Maps Link Parsing)
app.get('/api/geo/lookup', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    // 1. Direct coordinates format: "21.1702, 72.8311" or "21.170245,72.831123"
    const coordMatch = query.match(/([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return res.json({
          success: true,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          displayName: `Exact Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          source: 'direct_coordinates',
        });
      }
    }

    // 2. Google Maps URL with @lat,lng e.g. maps.google.com/.../@21.1702,72.8311
    const mapsAtMatch = query.match(/@([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/);
    if (mapsAtMatch) {
      const lat = parseFloat(mapsAtMatch[1]);
      const lng = parseFloat(mapsAtMatch[2]);
      return res.json({
        success: true,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        displayName: `Google Maps Pin: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        source: 'google_maps_url',
      });
    }

    // 3. Google Maps URL with ?q=lat,lng
    const mapsQMatch = query.match(/[?&]q=([-+]?\d{1,2}\.\d+)[,+]+([-+]?\d{1,3}\.\d+)/);
    if (mapsQMatch) {
      const lat = parseFloat(mapsQMatch[1]);
      const lng = parseFloat(mapsQMatch[2]);
      return res.json({
        success: true,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        displayName: `Google Maps Query: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        source: 'google_maps_url',
      });
    }

    // 4. Free OpenStreetMap Nominatim Geocoding
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const nomRes = await fetch(nomUrl, {
      headers: {
        'User-Agent': 'LocalBoostAI/1.0 (GoogleReviewQRPlatform)',
        'Accept': 'application/json',
      },
    });

    if (nomRes.ok) {
      const data = await nomRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        return res.json({
          success: true,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          displayName: item.display_name,
          source: 'nominatim_geocode',
        });
      }
    }

    // 5. Free Photon Komoot Geocoding fallback (instant OpenStreetMap index)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
      const photonRes = await fetch(photonUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LocalBoostAI/1.0',
        },
      });
      if (photonRes.ok) {
        const pData = await photonRes.json();
        if (pData?.features && pData.features.length > 0) {
          const feat = pData.features[0];
          const [lon, lat] = feat.geometry.coordinates;
          const props = feat.properties || {};
          const label = [props.name, props.city, props.state, props.country].filter(Boolean).join(', ');
          return res.json({
            success: true,
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lon.toFixed(6)),
            displayName: label || query,
            source: 'photon_geocode',
          });
        }
      }
    } catch {
      // Fallback
    }

    return res.status(404).json({
      error: `Could not find coordinates for "${query}". Try entering City and Area (e.g. "Vesu Surat" or "Connaught Place Delhi").`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Geocoding failed' });
  }
});

// Network / IP Geolocation Detection (Fallback when browser GPS is blocked by iframe policy)
app.get('/api/geo/detect', async (req, res) => {
  try {
    const rawIp = req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress || '';
    const ipStr = (Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0]).trim();
    const isPublicIp = ipStr &&
      ipStr !== '::1' &&
      ipStr !== '127.0.0.1' &&
      !ipStr.startsWith('10.') &&
      !ipStr.startsWith('192.168.') &&
      !ipStr.startsWith('172.16.') &&
      !ipStr.startsWith('172.17.') &&
      !ipStr.startsWith('172.18.') &&
      !ipStr.startsWith('172.19.') &&
      !ipStr.startsWith('172.2') &&
      !ipStr.startsWith('172.3');

    // 1. Try ipwho.is
    try {
      const targetUrl = isPublicIp ? `https://ipwho.is/${ipStr}` : 'https://ipwho.is/';
      const ipRes = await fetch(targetUrl, { headers: { 'Accept': 'application/json' } });
      if (ipRes.ok) {
        const data = await ipRes.json();
        if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return res.json({
            success: true,
            latitude: Number(data.latitude.toFixed(6)),
            longitude: Number(data.longitude.toFixed(6)),
            city: data.city || data.region || 'Nearby Area',
            country: data.country || '',
            source: 'ip_geolocation',
          });
        }
      }
    } catch {
      // Fallback
    }

    // 2. Try ip-api.com
    try {
      const ipApiUrl = isPublicIp ? `http://ip-api.com/json/${ipStr}` : 'http://ip-api.com/json/';
      const ipRes2 = await fetch(ipApiUrl);
      if (ipRes2.ok) {
        const data2 = await ipRes2.json();
        if (data2.status === 'success' && typeof data2.lat === 'number' && typeof data2.lon === 'number') {
          return res.json({
            success: true,
            latitude: Number(data2.lat.toFixed(6)),
            longitude: Number(data2.lon.toFixed(6)),
            city: data2.city || data2.regionName || 'Nearby Area',
            country: data2.country || '',
            source: 'ip_geolocation',
          });
        }
      }
    } catch {
      // Fallback
    }

    // 3. Try ipapi.co
    try {
      const ipApiRes = await fetch('https://ipapi.co/json/', { headers: { 'User-Agent': 'LocalBoost/1.0' } });
      if (ipApiRes.ok) {
        const data = await ipApiRes.json();
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return res.json({
            success: true,
            latitude: Number(data.latitude.toFixed(6)),
            longitude: Number(data.longitude.toFixed(6)),
            city: data.city || data.region || 'Nearby Area',
            country: data.country_name || '',
            source: 'ip_geolocation',
          });
        }
      }
    } catch {
      // Fallback
    }

    return res.status(503).json({ error: 'Network location service unavailable. Please search by store address or choose your city.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Network location detection failed' });
  }
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

// Public endpoint to look up business by unique_slug for QR review scanning
app.get('/api/business/by-slug/:slug', (req, res) => {
  try {
    const db = loadServerDb();
    const rawSlug = (req.params.slug || '').trim();
    const cleanSlug = rawSlug.toLowerCase().replace(/[\/\?\#].*$/, '');
    const cleanAlphaNumeric = cleanSlug.replace(/[^a-z0-9]/g, '');

    // 1. Find business by unique_slug, id, or user_id
    let biz = db.businesses.find((b) => {
      const bSlug = (b.unique_slug || '').trim().toLowerCase();
      const bId = (b.id || '').trim().toLowerCase();
      const bUserId = (b.user_id || '').trim().toLowerCase();
      return (
        bSlug === cleanSlug ||
        bId === cleanSlug ||
        bUserId === cleanSlug ||
        (cleanAlphaNumeric && bSlug.replace(/[^a-z0-9]/g, '') === cleanAlphaNumeric)
      );
    });

    // 2. If not found, match by user customer code (e.g. LB-CUS-EAM670 or lbcuseam670)
    if (!biz) {
      const matchedProfile = db.profiles.find((p) => {
        const pCode = (p.unique_customer_code || '').trim().toLowerCase();
        const pEmail = (p.email || '').trim().toLowerCase();
        return (
          pCode === cleanSlug ||
          (cleanAlphaNumeric && pCode.replace(/[^a-z0-9]/g, '') === cleanAlphaNumeric) ||
          pEmail === cleanSlug
        );
      });
      if (matchedProfile) {
        biz = db.businesses.find((b) => b.user_id === matchedProfile.id);
        if (!biz) {
          biz = {
            id: `biz_${matchedProfile.id}`,
            user_id: matchedProfile.id,
            business_name: `${matchedProfile.full_name}'s Business`,
            unique_slug: matchedProfile.unique_customer_code.toLowerCase(),
            google_review_url: 'https://maps.google.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.businesses.push(biz);
          saveServerDb(db);
        }
      }
    }

    // 3. Fuzzy match across all businesses if still not found
    if (!biz && db.businesses.length > 0) {
      const firstWord = cleanSlug.split('-')[0];
      biz = db.businesses.find((b) => {
        const bSlug = (b.unique_slug || '').toLowerCase();
        const bName = (b.business_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          (firstWord.length >= 3 && bSlug.includes(firstWord)) ||
          (cleanAlphaNumeric.length >= 4 && (bName.includes(cleanAlphaNumeric) || cleanAlphaNumeric.includes(bName)))
        );
      });
    }

    // 4. Default fallback to first business or resilient mock
    if (!biz) {
      if (db.businesses.length > 0) {
        biz = db.businesses[0];
      } else {
        biz = {
          id: `biz_${cleanSlug}`,
          user_id: `usr_${cleanSlug}`,
          business_name: cleanSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Local Business',
          unique_slug: cleanSlug,
          google_review_url: 'https://maps.google.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    let settings = db.reviewSettings.find((s) => s.business_id === biz.id);
    if (!settings) {
      settings = {
        id: `rs_${biz.id}`,
        business_id: biz.id,
        language: 'en' as const,
        welcome_text: 'How was your experience with us today?',
        thank_you_text: 'Thank you for supporting our local business! ❤️',
        enabled: true,
        accent_color: '#6C3BFF',
        qr_show_logo: true,
        qr_logo_border_style: 'circular' as const,
        qr_color: '#1F1735',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const loyaltyConfig = db.loyaltyConfigs?.find((l) => l.business_id === biz.id) || null;

    return res.json({
      success: true,
      business: biz,
      settings,
      loyaltyConfig,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// Direct REST APIs for instant cross-session persistence
app.get('/api/businesses/user/:userId', (req, res) => {
  try {
    const db = loadServerDb();
    const { userId } = req.params;
    const userBusinesses = db.businesses.filter((b) => b.user_id === userId);
    const biz =
      userBusinesses.length > 0
        ? userBusinesses.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0]
        : null;
    return res.json({ success: true, business: biz });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch business' });
  }
});

app.get('/api/businesses/:id', (req, res) => {
  try {
    const db = loadServerDb();
    const { id } = req.params;
    const biz = db.businesses.find((b) => b.id === id);
    return res.json({ success: true, business: biz || null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch business' });
  }
});

app.post('/api/businesses/:id', (req, res) => {
  try {
    const db = loadServerDb();
    const { id } = req.params;
    const updates = req.body;
    const idx = db.businesses.findIndex((b) => b.id === id || (updates.user_id && b.user_id === updates.user_id));
    if (idx !== -1) {
      db.businesses[idx] = { ...db.businesses[idx], ...updates, updated_at: new Date().toISOString() };
      saveServerDb(db);
      return res.json({ success: true, business: db.businesses[idx] });
    } else {
      const newBiz = { id, ...updates, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.businesses.push(newBiz);
      saveServerDb(db);
      return res.json({ success: true, business: newBiz });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update business' });
  }
});

app.post('/api/review-settings/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const updates = req.body;
    const idx = db.reviewSettings.findIndex((s) => s.business_id === businessId || (updates.id && s.id === updates.id));
    if (idx !== -1) {
      db.reviewSettings[idx] = { ...db.reviewSettings[idx], ...updates, updated_at: new Date().toISOString() };
      saveServerDb(db);
      return res.json({ success: true, settings: db.reviewSettings[idx] });
    } else {
      const newSettings = {
        id: updates.id || `rs_${businessId}`,
        business_id: businessId,
        ...updates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.reviewSettings.push(newSettings);
      saveServerDb(db);
      return res.json({ success: true, settings: newSettings });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update review settings' });
  }
});

// Loyalty Config endpoints
const handleLoyaltyConfigUpdate = (req: any, res: any) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const updates = req.body;
    if (!Array.isArray(db.loyaltyConfigs)) db.loyaltyConfigs = [];
    const idx = db.loyaltyConfigs.findIndex((l) => l.business_id === businessId || (updates.id && l.id === updates.id));
    if (idx !== -1) {
      db.loyaltyConfigs[idx] = { ...db.loyaltyConfigs[idx], ...updates, updated_at: new Date().toISOString() };
      saveServerDb(db);
      return res.json({ success: true, config: db.loyaltyConfigs[idx] });
    } else {
      const newConfig = {
        id: updates.id || `loyalty_${businessId}`,
        business_id: businessId,
        ...updates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.loyaltyConfigs.push(newConfig);
      saveServerDb(db);
      return res.json({ success: true, config: newConfig });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update loyalty config' });
  }
};

app.post('/api/loyalty-configs/:businessId', handleLoyaltyConfigUpdate);
app.post('/api/loyalty/config/:businessId', handleLoyaltyConfigUpdate);

const handleLoyaltyConfigGet = (req: any, res: any) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const config = (db.loyaltyConfigs || []).find((l) => l.business_id === businessId);
    return res.json({ success: true, config: config || null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch loyalty config' });
  }
};
app.get('/api/loyalty-configs/:businessId', handleLoyaltyConfigGet);
app.get('/api/loyalty/config/:businessId', handleLoyaltyConfigGet);

// Loyalty Cards Endpoints
app.get('/api/loyalty/cards/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const cards = (db.loyaltyCards || []).filter((c) => c.business_id === businessId);
    return res.json({ success: true, cards });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch loyalty cards' });
  }
});

app.post('/api/loyalty/cards', (req, res) => {
  try {
    const db = loadServerDb();
    if (!Array.isArray(db.loyaltyCards)) db.loyaltyCards = [];
    const card = req.body;
    if (!card || !card.id) {
      return res.status(400).json({ error: 'Valid card object with id is required' });
    }
    const idx = db.loyaltyCards.findIndex((c) => c.id === card.id);
    if (idx !== -1) {
      db.loyaltyCards[idx] = { ...db.loyaltyCards[idx], ...card, updated_at: new Date().toISOString() };
    } else {
      db.loyaltyCards.unshift(card);
    }
    saveServerDb(db);
    return res.json({ success: true, card: idx !== -1 ? db.loyaltyCards[idx] : card });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save loyalty card' });
  }
});

app.post('/api/loyalty/cards/:id/redeem', (req, res) => {
  try {
    const db = loadServerDb();
    if (!Array.isArray(db.loyaltyCards)) db.loyaltyCards = [];
    const { id } = req.params;
    const { redeemedBy, billAmount, notes } = req.body;
    const card = db.loyaltyCards.find((c) => c.id === id);
    if (!card) {
      return res.status(404).json({ error: 'Loyalty card not found' });
    }
    card.status = 'redeemed';
    card.redeemed_at = new Date().toISOString();
    card.redeemed_by = redeemedBy || 'Counter Cashier';
    if (billAmount) card.redemption_bill_amount = billAmount;
    if (notes) card.redemption_notes = notes;
    saveServerDb(db);
    return res.json({ success: true, card });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to redeem loyalty card' });
  }
});

// Full client-to-server data reconciliation (keeps everything synced across all mobile devices & logins)
app.post('/api/sync/push', (req, res) => {
  try {
    const db = loadServerDb();
    const {
      profiles = [],
      businesses = [],
      reviewSettings = [],
      loyaltyConfigs = [],
      loyaltyCards = [],
      feedbacks = [],
      passwords = {},
    } = req.body;

    profiles.forEach((p: any) => {
      const idx = db.profiles.findIndex((ep) => ep.id === p.id || ep.email.toLowerCase() === p.email.toLowerCase());
      if (idx !== -1) {
        db.profiles[idx] = { ...db.profiles[idx], ...p };
      } else {
        db.profiles.push(p);
      }
    });

    businesses.forEach((b: any) => {
      const idx = db.businesses.findIndex(
        (eb) =>
          eb.id === b.id ||
          (eb.user_id && b.user_id && eb.user_id === b.user_id) ||
          (eb.unique_slug && b.unique_slug && eb.unique_slug.toLowerCase() === b.unique_slug.toLowerCase())
      );
      if (idx !== -1) {
        db.businesses[idx] = { ...db.businesses[idx], ...b };
      } else {
        db.businesses.push(b);
      }
    });

    if (Array.isArray(reviewSettings)) {
      reviewSettings.forEach((s: any) => {
        const idx = db.reviewSettings.findIndex((es) => es.id === s.id || es.business_id === s.business_id);
        if (idx !== -1) {
          db.reviewSettings[idx] = { ...db.reviewSettings[idx], ...s };
        } else {
          db.reviewSettings.push(s);
        }
      });
    }

    if (Array.isArray(loyaltyConfigs)) {
      loyaltyConfigs.forEach((l: any) => {
        const idx = db.loyaltyConfigs.findIndex((el) => el.id === l.id || el.business_id === l.business_id);
        if (idx !== -1) {
          db.loyaltyConfigs[idx] = { ...db.loyaltyConfigs[idx], ...l };
        } else {
          db.loyaltyConfigs.push(l);
        }
      });
    }

    if (Array.isArray(loyaltyCards)) {
      if (!Array.isArray(db.loyaltyCards)) db.loyaltyCards = [];
      loyaltyCards.forEach((c: any) => {
        const idx = db.loyaltyCards.findIndex((ec) => ec.id === c.id);
        if (idx !== -1) {
          db.loyaltyCards[idx] = { ...db.loyaltyCards[idx], ...c };
        } else {
          db.loyaltyCards.push(c);
        }
      });
    }

    if (Array.isArray(feedbacks)) {
      if (!Array.isArray(db.feedbacks)) db.feedbacks = [];
      feedbacks.forEach((f: any) => {
        const idx = db.feedbacks.findIndex((ef) => ef.id === f.id);
        if (idx !== -1) {
          db.feedbacks[idx] = { ...db.feedbacks[idx], ...f };
        } else {
          db.feedbacks.push(f);
        }
      });
    }

    Object.entries(passwords).forEach(([k, v]) => {
      if (typeof v === 'string' && v) {
        db.passwords[k.toLowerCase()] = v;
      }
    });

    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Reconciliation failed.' });
  }
});

// ============================================================================
// LOYALTY REWARD REMINDER MODULE (TRANSACTIONAL DUPLICATE-PREVENTION & AUDIT)
// ============================================================================

// 1. Sync & Get Reminders for a Business (Enforces 3 stages and unique ID per reward)
app.post('/api/loyalty/reminders/sync/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const { cards = [], businessName = '', businessPhone = '' } = req.body;

    if (!Array.isArray(db.reminders)) db.reminders = [];
    if (!Array.isArray(db.reminderAuditLogs)) db.reminderAuditLogs = [];

    const nowIso = new Date().toISOString();
    const stages: { stage: ReminderStage; label: string; days: number }[] = [
      { stage: '7_days', label: '7 Days Remaining', days: 7 },
      { stage: '3_days', label: '3 Days Remaining', days: 3 },
      { stage: 'expiry_day', label: 'Expiry Day (Today)', days: 0 },
    ];

    const contactSuffix = businessPhone ? ` 📞 Contact ${businessName || 'Store'}: ${businessPhone}` : '';

    cards.forEach((card: LoyaltyCard) => {
      const isClaimed = card.status === 'redeemed';
      const isExpired = new Date(card.expires_at).getTime() < Date.now();
      // Accurate calendar midnight calculation (prevents fractional hours from turning 7 days into 8 or 3 into 4)
      const expiryDate = new Date(card.expires_at);
      const now = new Date();
      const expMidnight = new Date(
        expiryDate.getFullYear(),
        expiryDate.getMonth(),
        expiryDate.getDate()
      ).getTime();
      const nowMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();
      const daysLeft = Math.round((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

      stages.forEach(({ stage, label }) => {
        const uniqueId = `${card.id}_${stage}`;
        const existingIdx = db.reminders.findIndex((r) => r.id === uniqueId);

        let initialStatus: ReminderStatus = 'PENDING';
        if (isClaimed || isExpired) {
          initialStatus = 'STOPPED';
        }

        const msgTemplate =
          stage === '7_days'
            ? `Hello ${card.customer_name}! 🌟 Friendly reminder from ${businessName || 'our store'}: Your VIP Reward "${card.reward_title}" (Code: ${card.voucher_code}) has 7 days remaining before expiry. Visit us soon to redeem!${contactSuffix}`
            : stage === '3_days'
            ? `Hello ${card.customer_name}! ⏰ Urgent reminder from ${businessName || 'our store'}: Only 3 days left to redeem your VIP Reward "${card.reward_title}" (Code: ${card.voucher_code})! Don't miss out, visit us today!${contactSuffix}`
            : `Hello ${card.customer_name}! 🚨 Final Call from ${businessName || 'our store'}: TODAY IS THE LAST DAY to redeem your VIP Reward "${card.reward_title}" (Code: ${card.voucher_code})! Visit us before closing to claim!${contactSuffix}`;

        if (existingIdx === -1) {
          // Database constraint: Unique ID per reward and stage
          const newReminder: RewardReminder = {
            id: uniqueId,
            reward_id: card.id,
            business_id: card.business_id || businessId,
            customer_name: card.customer_name,
            customer_phone: card.customer_phone,
            voucher_code: card.voucher_code,
            reward_title: card.reward_title,
            reward_value: card.reward_value,
            expires_at: card.expires_at,
            stage,
            stage_label: label,
            days_remaining: daysLeft,
            status: initialStatus,
            sent_at: null,
            sent_by: null,
            message_template: msgTemplate,
            created_at: nowIso,
            updated_at: nowIso,
          };
          db.reminders.push(newReminder);
        } else {
          const existing = db.reminders[existingIdx];
          existing.days_remaining = daysLeft;
          existing.customer_name = card.customer_name;
          existing.customer_phone = card.customer_phone;
          existing.message_template = msgTemplate;

          // If reward became claimed or expired, stop future pending reminders
          if ((isClaimed || isExpired) && existing.status === 'PENDING') {
            existing.status = 'STOPPED';
            existing.updated_at = nowIso;
            db.reminderAuditLogs.unshift({
              id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              reminder_id: existing.id,
              reward_id: existing.reward_id,
              business_id: existing.business_id,
              stage: existing.stage,
              previous_status: 'PENDING',
              new_status: 'STOPPED',
              changed_by: 'System (Auto Rule)',
              reason: isClaimed ? 'Reward claimed by customer at counter' : 'Reward expired',
              action: 'STOPPED',
              created_at: nowIso,
            });
          }
        }
      });
    });

    saveServerDb(db);

    const businessReminders = db.reminders.filter((r) => r.business_id === businessId);
    const businessLogs = db.reminderAuditLogs.filter((l) => l.business_id === businessId);

    return res.json({
      success: true,
      reminders: businessReminders,
      auditLogs: businessLogs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to sync reminders' });
  }
});

// 2. Fetch Reminders for a Business
app.get('/api/loyalty/reminders/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const reminders = (db.reminders || []).filter((r) => r.business_id === businessId);
    const auditLogs = (db.reminderAuditLogs || []).filter((l) => l.business_id === businessId);

    return res.json({ success: true, reminders, auditLogs });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to get reminders' });
  }
});

// 3. Confirm WhatsApp Reminder Sent (Strict Server-Side Duplicate Prevention)
app.post('/api/loyalty/reminders/:id/confirm-sent', (req, res) => {
  try {
    const db = loadServerDb();
    const { id } = req.params;
    const { sentBy = 'Business Owner', notes = '' } = req.body;

    if (!Array.isArray(db.reminders)) db.reminders = [];
    if (!Array.isArray(db.reminderAuditLogs)) db.reminderAuditLogs = [];

    const reminder = db.reminders.find((r) => r.id === id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder record not found.' });
    }

    // SERVER-SIDE DUPLICATE CHECK: If already SENT, block duplicate sending
    if (reminder.status === 'SENT') {
      return res.status(409).json({
        error: `Duplicate sending blocked: This reminder was already confirmed as SENT on ${reminder.sent_at} by ${reminder.sent_by}.`,
        alreadySentAt: reminder.sent_at,
        sentBy: reminder.sent_by,
      });
    }

    // Check if reward was claimed or expired
    if (reminder.status === 'STOPPED') {
      return res.status(400).json({
        error: 'Action blocked: Future reminder actions are stopped because the reward was claimed or expired.',
      });
    }

    const nowIso = new Date().toISOString();
    const prevStatus = reminder.status;
    reminder.status = 'SENT';
    reminder.sent_at = nowIso;
    reminder.sent_by = sentBy;
    reminder.updated_at = nowIso;

    const auditLog: ReminderAuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reminder_id: reminder.id,
      reward_id: reminder.reward_id,
      business_id: reminder.business_id,
      stage: reminder.stage,
      previous_status: prevStatus,
      new_status: 'SENT',
      changed_by: sentBy,
      reason: notes || 'WhatsApp reminder message delivery confirmed by business owner',
      action: 'CONFIRM_SENT',
      created_at: nowIso,
    };

    db.reminderAuditLogs.unshift(auditLog);
    saveServerDb(db);

    return res.json({ success: true, reminder, auditLog });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to confirm reminder' });
  }
});

// 4. Manually Correct Status with Mandatory Audit Log
app.post('/api/loyalty/reminders/:id/manual-correction', (req, res) => {
  try {
    const db = loadServerDb();
    const { id } = req.params;
    const { newStatus, changedBy = 'Business Owner', reason = '' } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Audit reason is required for manual status correction.' });
    }

    if (!Array.isArray(db.reminders)) db.reminders = [];
    if (!Array.isArray(db.reminderAuditLogs)) db.reminderAuditLogs = [];

    const reminder = db.reminders.find((r) => r.id === id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder record not found.' });
    }

    const nowIso = new Date().toISOString();
    const prevStatus = reminder.status;
    reminder.status = newStatus;
    reminder.updated_at = nowIso;

    if (newStatus === 'SENT' && !reminder.sent_at) {
      reminder.sent_at = nowIso;
      reminder.sent_by = changedBy;
    } else if (newStatus === 'PENDING') {
      reminder.sent_at = null;
      reminder.sent_by = null;
    }

    const auditLog: ReminderAuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reminder_id: reminder.id,
      reward_id: reminder.reward_id,
      business_id: reminder.business_id,
      stage: reminder.stage,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason: reason.trim(),
      action: 'MANUAL_CORRECTION',
      created_at: nowIso,
    };

    db.reminderAuditLogs.unshift(auditLog);
    saveServerDb(db);

    return res.json({ success: true, reminder, auditLog });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update reminder status' });
  }
});

// 5. Fetch Audit Logs for Business
app.get('/api/loyalty/reminders/:businessId/audit-logs', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const logs = (db.reminderAuditLogs || [])
      .filter((l) => l.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ success: true, auditLogs: logs });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch audit logs' });
  }
});

// ==============================================================================
// SCRATCH & WIN OFFERS MODULE (INDEPENDENT CAMPAIGN & PROMOTIONAL ENGINE)
// ==============================================================================

// Helper to determine campaign active validity
function isCampaignPlayable(campaign: ScratchCampaign): { valid: boolean; reason?: string } {
  if (!campaign) return { valid: false, reason: 'Campaign not found' };
  if (campaign.status !== 'active') return { valid: false, reason: `Campaign is currently ${campaign.status}` };
  const now = Date.now();
  if (campaign.start_date && new Date(campaign.start_date).getTime() > now) {
    return { valid: false, reason: 'Campaign has not started yet' };
  }
  if (campaign.expiry_date && new Date(campaign.expiry_date).getTime() < now) {
    return { valid: false, reason: 'Campaign has expired' };
  }
  if (campaign.total_reward_quantity > 0 && campaign.rewards_claimed_count >= campaign.total_reward_quantity) {
    return { valid: false, reason: 'Campaign prize pool limit reached' };
  }
  return { valid: true };
}

// 1. Get or Create Scratch & Win Campaign for a Business
app.get('/api/scratch/campaign/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    if (!Array.isArray(db.scratchCampaigns)) db.scratchCampaigns = [];

    let campaign = db.scratchCampaigns.find((c) => c.business_id === businessId);
    if (!campaign) {
      const now = new Date();
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);

      campaign = {
        id: `sc_${businessId}`,
        business_id: businessId,
        campaign_name: 'Summer Scratch & Win Fiesta',
        description: 'Scratch and reveal an instant surprise discount or free item on your bill!',
        reward_type: 'discount_percentage',
        reward_value: '20% OFF',
        reward_headline: '🎉 You Won Flat 20% OFF!',
        free_item_name: 'Signature Dessert',
        min_purchase_amount: 'Min. bill ₹299',
        start_date: now.toISOString().split('T')[0],
        expiry_date: exp.toISOString().split('T')[0],
        validity_days_after_win: 15,
        total_reward_quantity: 150,
        rewards_claimed_count: 0,
        per_customer_play_limit: 1,
        status: 'draft', // Disabled by default, business owner controls independently
        terms_conditions: 'Valid on dine-in & takeaway. Show the revealed digital coupon at billing. Single use only.',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      db.scratchCampaigns.push(campaign);
      saveServerDb(db);
    }

    return res.json({ success: true, campaign });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch campaign' });
  }
});

// 2. Save / Update Scratch & Win Campaign Configuration
app.post('/api/scratch/campaign/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const updates = req.body || {};

    if (!Array.isArray(db.scratchCampaigns)) db.scratchCampaigns = [];
    let idx = db.scratchCampaigns.findIndex((c) => c.business_id === businessId);

    const now = new Date().toISOString();
    let updatedCampaign: ScratchCampaign;

    if (idx !== -1) {
      updatedCampaign = {
        ...db.scratchCampaigns[idx],
        ...updates,
        business_id: businessId,
        updated_at: now,
      };
      db.scratchCampaigns[idx] = updatedCampaign;
    } else {
      updatedCampaign = {
        id: `sc_${businessId}`,
        business_id: businessId,
        campaign_name: updates.campaign_name || 'Scratch & Win Special',
        description: updates.description || 'Scratch to win exciting prizes!',
        reward_type: updates.reward_type || 'discount_percentage',
        reward_value: updates.reward_value || '15% OFF',
        reward_headline: updates.reward_headline || '🎉 You Won 15% OFF!',
        free_item_name: updates.free_item_name || '',
        min_purchase_amount: updates.min_purchase_amount || '',
        start_date: updates.start_date || now.split('T')[0],
        expiry_date: updates.expiry_date || now.split('T')[0],
        validity_days_after_win: Number(updates.validity_days_after_win) || 15,
        total_reward_quantity: Number(updates.total_reward_quantity) || 100,
        rewards_claimed_count: 0,
        per_customer_play_limit: Number(updates.per_customer_play_limit) || 1,
        status: updates.status || 'draft',
        terms_conditions: updates.terms_conditions || 'One coupon per customer/bill. Present code at billing.',
        lucky_draw_enabled: updates.lucky_draw_enabled ?? true,
        prize_pool: updates.prize_pool || [
          { id: 'p1', name: 'Branded Executive Pen 🖊️', reward_value: 'Free Pen', reward_type: 'free_item' },
          { id: 'p2', name: '5% Instant Savings 🏷️', reward_value: '5% OFF', reward_type: 'discount_percentage' },
          { id: 'p3', name: '10% Savings Voucher 🎟️', reward_value: '10% OFF', reward_type: 'discount_percentage' },
          { id: 'p4', name: '15% Mega Discount 🎉', reward_value: '15% OFF', reward_type: 'discount_percentage' },
          { id: 'p5', name: '20% Bumper Lucky Winner 🏆', reward_value: '20% OFF', reward_type: 'discount_percentage' },
        ],
        created_at: now,
        updated_at: now,
      };
      db.scratchCampaigns.push(updatedCampaign);
    }

    saveServerDb(db);
    return res.json({ success: true, campaign: updatedCampaign });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save campaign' });
  }
});

// 3. Check Eligibility for Customer (Server-Side Limit & Campaign Verification)
app.get('/api/scratch/eligibility/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const phone = ((req.query.phone as string) || '').trim().replace(/[^0-9]/g, '');

    if (!Array.isArray(db.scratchCampaigns)) db.scratchCampaigns = [];
    if (!Array.isArray(db.scratchPlays)) db.scratchPlays = [];

    const campaign = db.scratchCampaigns.find((c) => c.business_id === businessId);
    if (!campaign) {
      return res.json({ eligible: false, reason: 'No scratch campaign found for this business' });
    }

    const check = isCampaignPlayable(campaign);
    if (!check.valid) {
      return res.json({ eligible: false, reason: check.reason, campaignStatus: campaign.status });
    }

    if (!phone) {
      return res.json({
        eligible: true,
        campaign: {
          id: campaign.id,
          name: campaign.campaign_name,
          description: campaign.description,
          status: campaign.status,
          expiry_date: campaign.expiry_date,
          reward_headline: campaign.reward_headline,
          reward_type: campaign.reward_type,
          reward_value: campaign.reward_value,
        },
      });
    }

    // Check customer plays count
    const customerPlays = db.scratchPlays.filter(
      (p) => p.campaign_id === campaign.id && p.customer_phone.replace(/[^0-9]/g, '') === phone
    );

    const limit = campaign.per_customer_play_limit || 1;
    if (customerPlays.length >= limit) {
      return res.json({
        eligible: false,
        reason: `You have reached the limit of ${limit} play(s) for this promotional campaign.`,
        playsCount: customerPlays.length,
        existingPlays: customerPlays,
      });
    }

    return res.json({
      eligible: true,
      remainingPlays: limit - customerPlays.length,
      campaign,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Eligibility check failed' });
  }
});

// 4. Server-Side Prize Determination & Concurrency-Safe Scratch Play
app.post('/api/scratch/play', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId, customerName, customerPhone, customerEmail, customerDob } = req.body;

    const cleanName = (customerName || '').trim();
    const cleanPhone = (customerPhone || '').trim();
    const cleanDob = (customerDob || '').trim() || undefined;

    if (!businessId || !cleanName || !cleanPhone) {
      return res.status(400).json({ error: 'Business ID, Customer Name, and Customer Phone are required.' });
    }

    if (!Array.isArray(db.scratchCampaigns)) db.scratchCampaigns = [];
    if (!Array.isArray(db.scratchPlays)) db.scratchPlays = [];

    const campaign = db.scratchCampaigns.find((c) => c.business_id === businessId);
    if (!campaign) {
      return res.status(404).json({ error: 'No promotional scratch campaign found.' });
    }

    const check = isCampaignPlayable(campaign);
    if (!check.valid) {
      return res.status(400).json({ error: check.reason });
    }

    // Concurrency-safe play count check
    const normalizedPhone = cleanPhone.replace(/[^0-9]/g, '');
    const previousPlays = db.scratchPlays.filter(
      (p) => p.campaign_id === campaign.id && p.customer_phone.replace(/[^0-9]/g, '') === normalizedPhone
    );

    const limit = campaign.per_customer_play_limit || 1;
    if (previousPlays.length >= limit) {
      return res.status(429).json({
        error: `Play limit reached: You have already played ${previousPlays.length} time(s) for this campaign.`,
        existingPlays: previousPlays,
      });
    }

    // Check pool cap
    if (campaign.total_reward_quantity > 0 && campaign.rewards_claimed_count >= campaign.total_reward_quantity) {
      return res.status(410).json({ error: 'All rewards for this campaign have been claimed.' });
    }

    // SERVER-SIDE PRIZE DETERMINATION (Lucky Draw Prize Pool vs Fixed Offer)
    // Supports multi-tier prizes (e.g. from pen to 20% discount)
    let prizeTitle = campaign.reward_headline;
    let prizeValue = campaign.reward_value;
    let prizeType = campaign.reward_type;

    const prizePool = (Array.isArray(campaign.prize_pool) && campaign.prize_pool.length > 0)
      ? campaign.prize_pool
      : (campaign.lucky_draw_enabled
          ? [
              { id: 'p1', name: 'Branded Executive Pen 🖊️', reward_value: 'Free Pen', reward_type: 'free_item' as const },
              { id: 'p2', name: '5% Instant Savings 🏷️', reward_value: '5% OFF', reward_type: 'discount_percentage' as const },
              { id: 'p3', name: '10% Savings Voucher 🎟️', reward_value: '10% OFF', reward_type: 'discount_percentage' as const },
              { id: 'p4', name: '15% Mega Discount 🎉', reward_value: '15% OFF', reward_type: 'discount_percentage' as const },
              { id: 'p5', name: '20% Bumper Lucky Winner 🏆', reward_value: '20% OFF', reward_type: 'discount_percentage' as const },
            ]
          : null);

    if (prizePool && prizePool.length > 0) {
      // Pick random prize from Lucky Draw pool
      const randomIndex = Math.floor(Math.random() * prizePool.length);
      const chosen = prizePool[randomIndex];
      prizeTitle = chosen.name;
      prizeValue = chosen.reward_value;
      prizeType = chosen.reward_type;
    } else if (campaign.reward_type === 'free_item' && campaign.free_item_name) {
      prizeTitle = `Free ${campaign.free_item_name}`;
      prizeValue = `1 Free ${campaign.free_item_name}`;
    }

    // Generate unique concurrency-safe voucher code: SCR-<HEX>-<RAND>
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let codeRand = '';
    for (let i = 0; i < 4; i++) {
      codeRand += chars[Math.floor(Math.random() * chars.length)];
    }
    const voucherCode = `SCR-${codeRand}`;

    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + (campaign.validity_days_after_win || 15));

    const playId = `scplay_${campaign.id}_${normalizedPhone}_${previousPlays.length + 1}_${Date.now()}`;

    const newPlay: ScratchPlay = {
      id: playId,
      campaign_id: campaign.id,
      business_id: businessId,
      customer_name: cleanName,
      customer_phone: cleanPhone,
      customer_email: customerEmail || undefined,
      customer_dob: cleanDob,
      voucher_code: voucherCode,
      reward_title: prizeTitle,
      reward_type: prizeType,
      reward_value: prizeValue,
      min_purchase_amount: campaign.min_purchase_amount,
      terms_conditions: campaign.terms_conditions,
      status: 'active',
      scratched_at: now.toISOString(),
      expires_at: expiry.toISOString(),
      created_at: now.toISOString(),
    };

    db.scratchPlays.unshift(newPlay);
    campaign.rewards_claimed_count = (campaign.rewards_claimed_count || 0) + 1;
    campaign.updated_at = now.toISOString();

    saveServerDb(db);

    return res.json({
      success: true,
      play: newPlay,
      campaignRemaining: Math.max(0, campaign.total_reward_quantity - campaign.rewards_claimed_count),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to process scratch play' });
  }
});

// 5. List Scratch Plays / Customer Winners for a Business
app.get('/api/scratch/plays/:businessId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    if (!Array.isArray(db.scratchPlays)) db.scratchPlays = [];

    const plays = db.scratchPlays
      .filter((p) => p.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ success: true, plays });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch plays' });
  }
});

// 6. POS Cashier Scratch Voucher Verification & Redemption (Supports Voucher Code, Mobile Number, or Play ID)
app.post('/api/scratch/redeem', (req, res) => {
  try {
    const db = loadServerDb();
    const { code, playId, businessId, redeemedBy = 'Counter Staff' } = req.body;

    if (!code && !playId) {
      return res.status(400).json({ error: 'Voucher code or mobile number is required' });
    }

    if (!Array.isArray(db.scratchPlays)) db.scratchPlays = [];

    const cleanInput = (code || '').trim();
    const cleanUpper = cleanInput.toUpperCase();
    const digitsOnly = cleanInput.replace(/\D/g, '');

    // Search by specific playId, or voucher code, or mobile number
    let play = db.scratchPlays.find((p) => {
      if (businessId && p.business_id !== businessId) return false;
      if (playId && p.id === playId) return true;
      if (cleanUpper && p.voucher_code.toUpperCase() === cleanUpper) return true;
      if (digitsOnly.length >= 7) {
        const phoneDigits = p.customer_phone.replace(/\D/g, '');
        if (phoneDigits === digitsOnly || phoneDigits.endsWith(digitsOnly) || digitsOnly.endsWith(phoneDigits)) {
          return true;
        }
      }
      return false;
    });

    if (!play) {
      return res.status(404).json({ error: `No Scratch & Win coupon found matching "${cleanInput}". Please check the voucher code or mobile number.` });
    }

    if (play.status === 'redeemed') {
      return res.status(409).json({
        error: `Coupon was already redeemed on ${new Date(play.redeemed_at || '').toLocaleString()} by ${play.redeemed_by || 'Staff'}.`,
        play,
      });
    }

    if (new Date(play.expires_at).getTime() < Date.now()) {
      return res.status(410).json({
        error: `Coupon expired on ${new Date(play.expires_at).toLocaleDateString()}. Cannot redeem.`,
        play,
      });
    }

    const now = new Date().toISOString();
    play.status = 'redeemed';
    play.redeemed_at = now;
    play.redeemed_by = redeemedBy;

    saveServerDb(db);

    return res.json({ success: true, message: 'Coupon redeemed successfully!', play });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Redemption failed' });
  }
});

// 7. Universal Reward Inspector Endpoint: "Kab Mila, Kaise Mila" Audit
app.get('/api/reward/inspect/:code', (req, res) => {
  try {
    const db = loadServerDb();
    const rawCode = (req.params.code || '').trim();
    const { businessId } = req.query;

    if (!rawCode) {
      return res.status(400).json({ error: 'Reward code is required' });
    }

    let cleanCode = rawCode;
    if (cleanCode.includes('verify_reward=')) {
      const match = cleanCode.match(/verify_reward=([^&#\s]+)/i);
      if (match?.[1]) cleanCode = decodeURIComponent(match[1]);
    } else if (cleanCode.startsWith('LOCALBOOST-VOUCHER:')) {
      const parts = cleanCode.split(':');
      if (parts[1]) cleanCode = parts[1];
    }

    const cleanUpper = cleanCode.trim().toUpperCase();
    const digitsOnly = cleanCode.replace(/\D/g, '');

    // 1. Search in Loyalty Cards
    if (Array.isArray(db.loyaltyCards)) {
      const card = db.loyaltyCards.find((c) => {
        if (businessId && c.business_id !== businessId) return false;
        if (c.voucher_code.trim().toUpperCase() === cleanUpper) return true;
        if (digitsOnly.length >= 7 && c.customer_phone.replace(/\D/g, '').endsWith(digitsOnly)) return true;
        return false;
      });

      if (card) {
        const biz = db.businesses.find((b) => b.id === card.business_id);
        const isExpired = new Date(card.expires_at).getTime() < Date.now();
        const isRedeemed = card.status === 'redeemed';
        const stars = card.issue_rating || 5;

        const audit = {
          voucher_code: card.voucher_code,
          type: 'loyalty',
          reward_title: card.reward_title,
          reward_value: card.reward_value,
          reward_description: card.reward_description,
          customer_name: card.customer_name || 'Valued Guest',
          customer_phone: card.customer_phone,
          business_id: card.business_id,
          business_name: biz?.business_name,
          status: isRedeemed ? 'redeemed' : isExpired ? 'expired' : 'active',
          created_at: card.created_at,
          kab_mila_formatted: new Date(card.created_at).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          kab_mila_relative: 'Registered on system',
          kaise_mila_type: 'google_review',
          kaise_mila_title: `⭐ ${stars}-Star Google Review Reward`,
          kaise_mila_desc: `Customer submitted verified ${stars}-Star rating via Google Review standee.`,
          kaise_mila_stars: stars,
          terms_conditions: card.terms_conditions || 'Valid at billing counter.',
          expires_at: card.expires_at,
          expires_at_formatted: new Date(card.expires_at).toLocaleDateString(),
          redeemed_at: card.redeemed_at,
          redeemed_at_formatted: card.redeemed_at ? new Date(card.redeemed_at).toLocaleString() : undefined,
          redeemed_by: card.redeemed_by,
          is_expired: isExpired,
          is_redeemed: isRedeemed,
          is_valid: !isExpired && !isRedeemed,
        };

        return res.json({ success: true, audit });
      }
    }

    // 2. Search in Scratch Plays
    if (Array.isArray(db.scratchPlays)) {
      const play = db.scratchPlays.find((p) => {
        if (businessId && p.business_id !== businessId) return false;
        if (p.voucher_code.trim().toUpperCase() === cleanUpper) return true;
        if (digitsOnly.length >= 7 && p.customer_phone.replace(/\D/g, '').endsWith(digitsOnly)) return true;
        return false;
      });

      if (play) {
        const biz = db.businesses.find((b) => b.id === play.business_id);
        const isExpired = new Date(play.expires_at).getTime() < Date.now();
        const isRedeemed = play.status === 'redeemed';

        const audit = {
          voucher_code: play.voucher_code,
          type: 'scratch',
          reward_title: play.reward_title,
          reward_value: play.reward_value,
          customer_name: play.customer_name || 'Valued Guest',
          customer_phone: play.customer_phone,
          business_id: play.business_id,
          business_name: biz?.business_name,
          status: isRedeemed ? 'redeemed' : isExpired ? 'expired' : 'active',
          created_at: play.scratched_at || play.created_at,
          kab_mila_formatted: new Date(play.scratched_at || play.created_at).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          kab_mila_relative: 'Registered on system',
          kaise_mila_type: 'scratch_win',
          kaise_mila_title: '🎲 Scratch & Win Lucky Draw Winner',
          kaise_mila_desc: 'Customer scratched lucky promotional card and won this reward.',
          min_purchase_amount: play.min_purchase_amount,
          terms_conditions: play.terms_conditions || 'Valid at billing counter.',
          expires_at: play.expires_at,
          expires_at_formatted: new Date(play.expires_at).toLocaleDateString(),
          redeemed_at: play.redeemed_at,
          redeemed_at_formatted: play.redeemed_at ? new Date(play.redeemed_at).toLocaleString() : undefined,
          redeemed_by: play.redeemed_by,
          is_expired: isExpired,
          is_redeemed: isRedeemed,
          is_valid: !isExpired && !isRedeemed,
        };

        return res.json({ success: true, audit });
      }
    }

    return res.status(404).json({ error: `No reward found matching code "${rawCode}".` });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Inspection failed' });
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
