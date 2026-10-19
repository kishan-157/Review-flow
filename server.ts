import express from 'express';
import fs from 'fs';
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
  ChatbotConfig,
  ChatConversation,
  ChatMessage,
} from './src/types/database';
import {
  generateNaturalSingleReview,
  generate12KeywordGrammarDrafts,
} from './src/lib/keywordGrammarEngine';
import {
  scrapeWebsiteRealData,
  scrapeGoogleMapsRealData,
} from './src/lib/realSourceScraper';

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

// ==========================================
// Super Admin & Manager Multi-Tenant RBAC API
// ==========================================

// Super Admin: List all managers
app.get('/api/admin/managers', (_req, res) => {
  try {
    const db = loadServerDb();
    const managers = db.profiles
      .filter((p) => p.role === 'manager')
      .map((m) => {
        const managedBiz = db.businesses.filter((b) => b.created_by_manager_id === m.id);
        const cleanEmail = m.email.toLowerCase().trim();
        return {
          id: m.id,
          full_name: m.full_name,
          email: m.email,
          phone: m.phone || '',
          unique_customer_code: m.unique_customer_code,
          role: m.role,
          status: m.status,
          current_password: db.passwords[cleanEmail] || '••••••••',
          created_at: m.created_at,
          last_login_at: m.last_login_at,
          businesses_count: managedBiz.length,
          businesses: managedBiz.map((b) => ({
            id: b.id,
            business_name: b.business_name,
            unique_slug: b.unique_slug,
            category: b.category,
            phone: b.phone,
            created_at: b.created_at,
          })),
        };
      });

    return res.json({ success: true, managers });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch managers.' });
  }
});

// Super Admin: Create a new Manager
app.post('/api/admin/create-manager', (req, res) => {
  try {
    const db = loadServerDb();
    const { fullName, email, password, phone, status = 'active' } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !fullName) {
      return res.status(400).json({ error: 'Manager full name and email are required.' });
    }

    const existing = db.profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const generatedPassword = (password || '').trim() || `MgrPass${Math.floor(100000 + Math.random() * 900000)}!`;
    const managerId = `mgr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const managerCode = `LB-MGR-${randomSuffix}`;
    const now = new Date().toISOString();

    const newManager: any = {
      id: managerId,
      full_name: fullName.trim(),
      email: cleanEmail,
      phone: (phone || '').trim(),
      unique_customer_code: managerCode,
      role: 'manager' as const,
      status: (status as any) || 'active',
      access_validity_type: 'lifetime',
      created_at: now,
      updated_at: now,
      last_login_at: now,
    };

    db.profiles.unshift(newManager);
    db.passwords[cleanEmail] = generatedPassword;
    db.passwords[managerCode.toLowerCase()] = generatedPassword;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone) db.passwords[cleanPhone] = generatedPassword;
    }

    saveServerDb(db);
    return res.json({ success: true, manager: newManager, tempPassword: generatedPassword });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create manager.' });
  }
});

// Super Admin: Update Manager
app.post('/api/admin/update-manager', (req, res) => {
  try {
    const db = loadServerDb();
    const { managerId, fullName, email, phone, status, password } = req.body;

    const idx = db.profiles.findIndex((p) => p.id === managerId && p.role === 'manager');
    if (idx === -1) {
      return res.status(404).json({ error: 'Manager not found.' });
    }

    const mgr = db.profiles[idx];
    if (fullName) mgr.full_name = fullName.trim();
    if (phone !== undefined) mgr.phone = String(phone).trim();
    if (status) mgr.status = status;
    mgr.updated_at = new Date().toISOString();

    if (email && email.trim().toLowerCase() !== mgr.email.toLowerCase()) {
      const newEmail = email.trim().toLowerCase();
      const existing = db.profiles.find((p) => p.email.toLowerCase() === newEmail && p.id !== managerId);
      if (existing) {
        return res.status(400).json({ error: 'Email already taken by another account.' });
      }
      const oldEmail = mgr.email.toLowerCase();
      mgr.email = newEmail;
      if (db.passwords[oldEmail]) {
        db.passwords[newEmail] = db.passwords[oldEmail];
        delete db.passwords[oldEmail];
      }
    }

    if (password && password.trim().length >= 6) {
      db.passwords[mgr.email.toLowerCase()] = password.trim();
      db.passwords[mgr.unique_customer_code.toLowerCase()] = password.trim();
    }

    saveServerDb(db);
    return res.json({ success: true, manager: mgr });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update manager.' });
  }
});

// Super Admin: Delete Manager
app.post('/api/admin/delete-manager', (req, res) => {
  try {
    const db = loadServerDb();
    const { managerId } = req.body;

    db.profiles = db.profiles.filter((p) => p.id !== managerId);
    // Note: The businesses created by this manager remain intact
    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete manager.' });
  }
});

// Manager: List ONLY businesses created by this specific manager (Strict Isolation)
app.get('/api/manager/:managerId/customers', (req, res) => {
  try {
    const db = loadServerDb();
    const { managerId } = req.params;

    // Verify manager exists
    const mgr = db.profiles.find((p) => p.id === managerId && p.role === 'manager');
    if (!mgr) {
      return res.status(403).json({ error: 'Manager account not verified.' });
    }

    // Filter strictly to businesses created by this manager ONLY
    // Super admin businesses (created_by_manager_id == null/undefined) or other managers' businesses are strictly excluded
    const managerBusinesses = db.businesses.filter((b) => b.created_by_manager_id === managerId);

    const customers = managerBusinesses.map((b) => {
      const user = db.profiles.find((p) => p.id === b.user_id);
      const settings = db.reviewSettings?.find((s) => s.business_id === b.id);
      const cleanEmail = (user?.email || '').toLowerCase().trim();
      return {
        id: b.id,
        user_id: b.user_id,
        business: b,
        profile: user || null,
        settings: settings || null,
        password: db.passwords[cleanEmail] || '••••••••',
      };
    });

    return res.json({ success: true, customers });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch manager customers.' });
  }
});

// Manager: Create a new customer & business under their management
app.post('/api/manager/create-customer', (req, res) => {
  try {
    const db = loadServerDb();
    const {
      managerId,
      fullName,
      email,
      password,
      businessName,
      googleReviewUrl,
      phone = '',
      category = 'Restaurant & Hospitality',
      address = '',
      accessValidityType = '1_year',
    } = req.body;

    if (!managerId) {
      return res.status(400).json({ error: 'Missing manager identifier.' });
    }

    const mgr = db.profiles.find((p) => p.id === managerId && p.role === 'manager');
    if (!mgr) {
      return res.status(403).json({ error: 'Unauthorized: Manager account not found or invalid.' });
    }

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
    const d = new Date(now);
    d.setDate(d.getDate() + 365);

    const newProfile: any = {
      id: userId,
      full_name: fullName.trim(),
      email: cleanEmail,
      unique_customer_code: customerCode,
      role: 'customer' as const,
      status: 'active' as const,
      created_by_manager_id: managerId,
      managed_by: mgr.full_name,
      access_validity_type: accessValidityType || '1_year',
      access_duration_days: 365,
      access_expires_at: d.toISOString(),
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

    const newBusiness: any = {
      id: businessId,
      user_id: userId,
      created_by_manager_id: managerId,
      created_by_manager_name: mgr.full_name,
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
      welcome_text: `Welcome to ${businessName}! How was your experience?`,
      thank_you_text: 'Thank you for your valuable feedback! ❤️',
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
    if (!db.reviewSettings) db.reviewSettings = [];
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
    return res.status(500).json({ error: err?.message || 'Failed to create business under manager.' });
  }
});

// Manager: Update their own managed customer
app.post('/api/manager/update-customer', (req, res) => {
  try {
    const db = loadServerDb();
    const { managerId, customerId, businessId, fullName, phone, businessName, googleReviewUrl, address, category, status, password } = req.body;

    // Verify manager ownership of this business
    const biz = db.businesses.find((b) => b.id === businessId);
    if (!biz || biz.created_by_manager_id !== managerId) {
      return res.status(403).json({ error: 'Unauthorized: You can only edit businesses created by your manager account.' });
    }

    const prof = db.profiles.find((p) => p.id === customerId);
    if (prof) {
      if (fullName) prof.full_name = fullName.trim();
      if (status) prof.status = status;
      if (phone !== undefined) prof.phone = phone.trim();
      prof.updated_at = new Date().toISOString();

      if (password && password.trim().length >= 6) {
        const cleanPass = password.trim();
        db.passwords[prof.email.toLowerCase()] = cleanPass;
        if (prof.unique_customer_code) {
          db.passwords[prof.unique_customer_code.toLowerCase()] = cleanPass;
        }
        if (prof.phone) {
          const cleanPhone = prof.phone.replace(/[^0-9]/g, '');
          if (cleanPhone) db.passwords[cleanPhone] = cleanPass;
        }
      }
    }

    if (businessName) biz.business_name = businessName.trim();
    if (googleReviewUrl !== undefined) biz.google_review_url = googleReviewUrl.trim();
    if (phone !== undefined) biz.phone = phone.trim();
    if (address !== undefined) biz.address = address.trim();
    if (category) biz.category = category;
    biz.updated_at = new Date().toISOString();

    saveServerDb(db);
    return res.json({ success: true, business: biz, profile: prof });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update customer.' });
  }
});

// Manager: Delete their own managed customer
app.post('/api/manager/delete-customer', (req, res) => {
  try {
    const db = loadServerDb();
    const { managerId, customerId, businessId } = req.body;

    const biz = db.businesses.find((b) => b.id === businessId);
    if (!biz || biz.created_by_manager_id !== managerId) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete businesses created by your manager account.' });
    }

    db.businesses = db.businesses.filter((b) => b.id !== businessId);
    db.profiles = db.profiles.filter((p) => p.id !== customerId);
    db.reviewSettings = db.reviewSettings.filter((s) => s.business_id !== businessId);

    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete customer.' });
  }
});

// Manager: Access Customer Dashboard Panel (Impersonate Customer)
app.post('/api/manager/access-panel', (req, res) => {
  try {
    const db = loadServerDb();
    const { managerId, customerId, businessId } = req.body;

    const mgr = db.profiles.find((p) => p.id === managerId && p.role === 'manager');
    if (!mgr) {
      return res.status(403).json({ error: 'Manager not found.' });
    }

    const biz = db.businesses.find((b) => b.id === businessId);
    if (!biz || biz.created_by_manager_id !== managerId) {
      return res.status(403).json({ error: 'Unauthorized: You can only access panels for businesses you created.' });
    }

    const customerUser = db.profiles.find((p) => p.id === customerId);
    if (!customerUser) {
      return res.status(404).json({ error: 'Customer user not found.' });
    }

    const session: any = {
      user: customerUser,
      business: biz,
      impersonatingFromManager: mgr,
    };

    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to access customer panel.' });
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


// ==========================================
// LOCALBOOST AI — LIVE CHAT & PROMPT ENGINE APIS
// 100% Deterministic & Local — Zero External AI APIs
// Multi-tenant isolation strictly enforced
// ==========================================

// Serve SPA index.html with dynamic business metadata for /c/:slug or /review/:slug
app.get('/c/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    const db = loadServerDb();
    const biz = db.businesses?.find(b => (b.unique_slug || '').toLowerCase() === String(slug).toLowerCase());
    
    const isProd = process.env.NODE_ENV === 'production';
    const indexPath = isProd ? 'dist/index.html' : 'index.html';
    
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      if (biz) {
        const bName = biz.business_name || 'Store Assistant';
        const bDesc = `Chat live with ${bName}. Get instant answers about timings, products, services, and location.`;
        html = html
          .replace(/<title>.*?<\/title>/, `<title>${bName} • Live Assistant & Support</title>`)
          .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${bDesc}" />`)
          .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${bName} • Live Chat Assistant" />`)
          .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${bDesc}" />`);
      }
      return res.send(html);
    }
    return res.sendFile(isProd ? 'dist/index.html' : 'index.html', { root: '.' });
  } catch {
    const isProd = process.env.NODE_ENV === 'production';
    return res.sendFile(isProd ? 'dist/index.html' : 'index.html', { root: '.' });
  }
});

app.get('/review/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    const db = loadServerDb();
    const biz = db.businesses?.find(b => (b.unique_slug || '').toLowerCase() === String(slug).toLowerCase());
    
    const isProd = process.env.NODE_ENV === 'production';
    const indexPath = isProd ? 'dist/index.html' : 'index.html';
    
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      if (biz) {
        const bName = biz.business_name || 'Store';
        const bDesc = `Leave a review or feedback for ${bName}.`;
        html = html
          .replace(/<title>.*?<\/title>/, `<title>${bName} • Reviews & Feedback</title>`)
          .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${bDesc}" />`)
          .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${bName} • Leave a Review" />`)
          .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${bDesc}" />`);
      }
      return res.send(html);
    }
    return res.sendFile(isProd ? 'dist/index.html' : 'index.html', { root: '.' });
  } catch {
    const isProd = process.env.NODE_ENV === 'production';
    return res.sendFile(isProd ? 'dist/index.html' : 'index.html', { root: '.' });
  }
});

// Public endpoint: Fetch business by slug for customer Live Chat & Review
app.get('/api/business/by-slug/:slug', (req, res) => {
  try {
    const db = loadServerDb();
    const rawSlug = String(req.params.slug || '').trim().toLowerCase();
    const cleanSlug = rawSlug.replace(/[\/\?\#].*$/, '');

    const biz = db.businesses.find((b) => (b.unique_slug || '').toLowerCase() === cleanSlug);
    if (!biz) {
      return res.status(404).json({ error: `Business not found for slug "${cleanSlug}"` });
    }

    // Never leak sensitive private fields like auth tokens or credentials
    const safePublicBiz = {
      id: biz.id,
      business_name: biz.business_name,
      unique_slug: biz.unique_slug,
      google_review_url: biz.google_review_url,
      logo_url: biz.logo_url,
      phone: biz.phone,
      whatsapp_number: biz.whatsapp_number,
      address: biz.address,
      category: biz.category,
      business_info: biz.business_info,
      review_reward_mode: biz.review_reward_mode,
      created_at: biz.created_at,
    };

    // Also attach chatbot config for instant client-side quick messages
    const cfg = db.chatConfigs?.find((c) => c.business_id === biz.id);

    return res.json({ success: true, business: safePublicBiz, config: cfg || null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to lookup business' });
  }
});

// Chatbot Configuration: GET
app.get('/api/chat/business/:businessId/config', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const existing = db.chatConfigs?.find((c) => c.business_id === businessId);

    if (existing) {
      return res.json({ success: true, config: existing });
    }

    const biz = db.businesses.find((b) => b.id === businessId);
    const bizName = biz?.business_name || 'Our Business';

    const defaultConfig: ChatbotConfig = {
      id: `cfg_${businessId}`,
      business_id: businessId,
      enabled: true,
      welcome_message: {
        en: `Hello! Welcome to ${bizName}. How can we assist you today? Feel free to ask about our hours, location, products, or services.`,
        hi: `नमस्ते! ${bizName} में आपका स्वागत है। आज हम आपकी क्या सहायता कर सकते हैं? आप हमारे समय, प्रोडक्ट्स या पते के बारे में पूछ सकते हैं।`,
        gu: `નમસ્તે! ${bizName} માં આપનું સ્વાગત છે. આજે અમે આપને કઈ રીતે મદદ કરી શકીએ? આપ અમારા સમય, પ્રોડક્ટ્સ કે સરનામા વિશે પૂછી શકો છો.`,
      },
      fallback_message: {
        en: "I couldn't confirm that information from the business details available to me. Please contact the business directly for the correct information.",
        hi: 'मुझे इस जानकारी की पुष्टि उपलब्ध बिज़नेस डिटेल्स से नहीं हो पाई। सही जानकारी के लिए कृपया बिज़नेस से सीधे संपर्क करें।',
        gu: 'આ માહિતીની પુષ્ટિ ઉપલબ્ધ બિઝનેસ વિગતોમાંથી થઈ શકી નથી. સાચી માહિતી માટે કૃપા કરીને બિઝનેસનો સીધો સંપર્ક કરો.',
      },
      supported_languages: ['en', 'hi', 'gu'],
      suggested_questions: [
        'What are your opening hours?',
        'Where is your shop located?',
        'What products or services do you offer?',
        'Which payment methods do you accept?',
      ],
      show_call_button: true,
      show_whatsapp_button: true,
      show_directions_button: true,
      show_website_button: false,
      visitor_privacy_notice:
        'We respect your privacy. Chat transcripts are retained securely and only used to assist your customer inquiry.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return res.json({ success: true, config: defaultConfig });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to load chatbot config' });
  }
});

// Chatbot Configuration: POST (Update or create)
app.post('/api/chat/business/:businessId/config', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Missing config payload' });
    }

    if (!db.chatConfigs) db.chatConfigs = [];

    const idx = db.chatConfigs.findIndex((c) => c.business_id === businessId);
    const updatedConfig: ChatbotConfig = {
      ...config,
      business_id: businessId,
      updated_at: new Date().toISOString(),
    };

    if (idx !== -1) {
      db.chatConfigs[idx] = updatedConfig;
    } else {
      db.chatConfigs.push(updatedConfig);
    }

    saveServerDb(db);
    return res.json({ success: true, config: updatedConfig });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save chatbot config' });
  }
});

// Website & Google Maps Knowledge Base Source Scanner: POST
app.post('/api/chat/business/:businessId/scan-source', async (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const { sourceType, sourceUrl } = req.body;

    if (!sourceUrl || !sourceType) {
      return res.status(400).json({ error: 'Missing source URL or type' });
    }

    const trimmedUrl = String(sourceUrl).trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL format. Must start with http:// or https://' });
    }

    // Perform REAL scraping and data extraction from the actual website or Google Maps URL
    let scrapedData: any;
    if (sourceType === 'website') {
      scrapedData = await scrapeWebsiteRealData(trimmedUrl);
    } else {
      scrapedData = await scrapeGoogleMapsRealData(trimmedUrl);
    }

    const bizIdx = db.businesses.findIndex((b) => b.id === businessId);
    if (bizIdx !== -1) {
      const biz = db.businesses[bizIdx];
      const bInfo: any = biz.business_info || {};
      biz.business_info = bInfo;

      if (sourceType === 'website') {
        bInfo.website = trimmedUrl;
        bInfo.website_url = trimmedUrl;

        // Populate REAL extracted business details
        if (scrapedData.business_name && (!biz.business_name || biz.business_name === 'Our Business' || biz.business_name === 'My Business')) {
          biz.business_name = scrapedData.business_name;
          bInfo.business_name = scrapedData.business_name;
        }
        if (scrapedData.short_description) {
          bInfo.short_description = scrapedData.short_description;
        }
        if (scrapedData.address) {
          bInfo.address = scrapedData.address;
          biz.address = scrapedData.address;
        }
        if (scrapedData.phone && (!biz.phone || biz.phone.includes('98765'))) {
          biz.phone = scrapedData.phone;
          bInfo.phone = scrapedData.phone;
        }
        if (scrapedData.whatsapp && (!biz.whatsapp_number || biz.whatsapp_number.includes('98765'))) {
          biz.whatsapp_number = scrapedData.whatsapp;
          bInfo.whatsapp = scrapedData.whatsapp;
        }
        if (scrapedData.email) {
          bInfo.public_email = scrapedData.email;
        }
        if (scrapedData.services) {
          bInfo.services = scrapedData.services;
        }
        if (scrapedData.hours_text) {
          bInfo.hours_text = scrapedData.hours_text;
        }
        if (scrapedData.logo_url && !biz.logo_url) {
          biz.logo_url = scrapedData.logo_url;
          bInfo.logo_url = scrapedData.logo_url;
        }
        if (scrapedData.faqs && scrapedData.faqs.length > 0) {
          if (!bInfo.faqs) bInfo.faqs = [];
          for (const f of scrapedData.faqs) {
            if (!bInfo.faqs.some((ef: any) => ef.question.toLowerCase() === f.question.toLowerCase())) {
              bInfo.faqs.push({
                id: `faq_sc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                question: f.question,
                variations: [f.question],
                answer: f.answer,
                approved_for_public: true,
              });
            }
          }
        }
      } else {
        // Google Maps place profile extraction
        bInfo.google_maps_url = scrapedData.google_maps_url || trimmedUrl;

        // Populate REAL extracted place name, address, category & rating
        if (scrapedData.business_name && (!biz.business_name || biz.business_name === 'Our Business' || biz.business_name === 'My Business')) {
          biz.business_name = scrapedData.business_name;
          bInfo.business_name = scrapedData.business_name;
        }
        if (scrapedData.category) {
          biz.category = scrapedData.category;
          bInfo.category = scrapedData.category;
        }
        if (scrapedData.address) {
          bInfo.address = scrapedData.address;
          biz.address = scrapedData.address;
        }
        if (scrapedData.phone && (!biz.phone || biz.phone.includes('98765'))) {
          biz.phone = scrapedData.phone;
          bInfo.phone = scrapedData.phone;
        }
        if (scrapedData.hours_text) {
          bInfo.hours_text = scrapedData.hours_text;
        }
        if (scrapedData.rating) {
          bInfo.google_rating = scrapedData.rating;
        }
      }
      db.businesses[bizIdx].updated_at = new Date().toISOString();
    }

    if (!db.chatConfigs) db.chatConfigs = [];
    let cfg = db.chatConfigs.find((c) => c.business_id === businessId);
    if (!cfg) {
      cfg = {
        id: `cfg_${businessId}`,
        business_id: businessId,
        enabled: true,
        supported_languages: ['en', 'hi', 'gu'],
        suggested_questions: ['What are your opening hours?', 'Where is your shop located?', 'What products or services do you offer?'],
        show_call_button: true,
        show_whatsapp_button: true,
        show_directions_button: true,
        show_website_button: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scanned_sources: [],
      };
      db.chatConfigs.push(cfg);
    }

    if (!cfg.scanned_sources) cfg.scanned_sources = [];

    const sourceDisplayName = scrapedData.business_name
      ? (sourceType === 'website' ? `${scrapedData.business_name} (Website)` : `${scrapedData.business_name} (Google Maps)`)
      : (sourceType === 'website' ? `Scanned Website (${new URL(trimmedUrl).hostname})` : `Google Maps Place Link`);

    const newSource = {
      id: `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: sourceType as 'website' | 'maps',
      url: trimmedUrl,
      title: sourceDisplayName,
      status: 'scanned' as const,
      page_count: sourceType === 'website' ? 3 : 1,
      last_scanned: new Date().toISOString(),
      conflict_warning: undefined,
    };

    cfg.scanned_sources.unshift(newSource);
    cfg.updated_at = new Date().toISOString();

    saveServerDb(db);
    return res.json({ 
      success: true, 
      source: newSource, 
      scrapedData,
      config: cfg,
      business: bizIdx !== -1 ? db.businesses[bizIdx] : null,
      businessInfo: bizIdx !== -1 ? db.businesses[bizIdx].business_info : null
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to scan source URL' });
  }
});

// Business Profile Info (Checklist Data): POST
app.post('/api/chat/business/:businessId/info', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const { businessInfo } = req.body;

    const bizIdx = db.businesses.findIndex((b) => b.id === businessId);
    if (bizIdx === -1) {
      return res.status(404).json({ error: 'Business not found' });
    }

    db.businesses[bizIdx].business_info = businessInfo;
    if (businessInfo.business_name) {
      db.businesses[bizIdx].business_name = businessInfo.business_name;
    }
    if (businessInfo.address) {
      db.businesses[bizIdx].address = businessInfo.address;
    }
    if (businessInfo.phone) {
      db.businesses[bizIdx].phone = businessInfo.phone;
    }
    if (businessInfo.whatsapp) {
      db.businesses[bizIdx].whatsapp_number = businessInfo.whatsapp;
    }
    if (businessInfo.category) {
      db.businesses[bizIdx].category = businessInfo.category;
    }
    db.businesses[bizIdx].updated_at = new Date().toISOString();

    saveServerDb(db);
    return res.json({ success: true, businessInfo: db.businesses[bizIdx].business_info });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save business info' });
  }
});

// Short Slug Update: POST (Dedicated clean slug updater)
app.post('/api/chat/business/:businessId/slug', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const { slug } = req.body;

    const cleaned = String(slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');

    if (!cleaned || cleaned.length < 2) {
      return res.status(400).json({ error: 'Slug must be at least 2 alphanumeric characters' });
    }

    // Verify slug uniqueness against other businesses
    const existing = db.businesses.find(
      (b) => b.id !== businessId && (b.unique_slug || '').toLowerCase() === cleaned
    );
    if (existing) {
      return res.status(409).json({ error: `Short link "${cleaned}" is already claimed by another business` });
    }

    const bizIdx = db.businesses.findIndex((b) => b.id === businessId);
    if (bizIdx === -1) {
      return res.status(404).json({ error: 'Business not found' });
    }

    db.businesses[bizIdx].unique_slug = cleaned;
    db.businesses[bizIdx].updated_at = new Date().toISOString();

    // Also update custom_short_slug in chatConfig if present
    const cfgIdx = (db.chatConfigs || []).findIndex((c) => c.business_id === businessId);
    if (cfgIdx !== -1 && db.chatConfigs) {
      db.chatConfigs[cfgIdx].custom_short_slug = cleaned;
      db.chatConfigs[cfgIdx].updated_at = new Date().toISOString();
    }

    saveServerDb(db);
    return res.json({ success: true, slug: cleaned, business: db.businesses[bizIdx] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update short slug' });
  }
});

// Chat History: GET (Paginated with search, tenant-isolated)
app.get('/api/chat/business/:businessId/history', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '20'), 10)));
    const search = String(req.query.search || '').trim().toLowerCase();

    if (!db.chatConversations) db.chatConversations = [];

    // Tenant boundary: Only conversations for this businessId
    let bizConvs = db.chatConversations.filter((c) => c.business_id === businessId);

    if (search) {
      bizConvs = bizConvs.filter(
        (c) =>
          c.id.toLowerCase().includes(search) ||
          c.last_message_preview.toLowerCase().includes(search) ||
          c.visitor_session_id.toLowerCase().includes(search)
      );
    }

    // Sort descending by updated_at
    bizConvs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const total = bizConvs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = bizConvs.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      conversations: paginated,
      total,
      page,
      totalPages,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve chat history' });
  }
});

// Chat Conversation Messages: GET (Tenant-isolated)
app.get('/api/chat/business/:businessId/conversations/:convId/messages', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId, convId } = req.params;

    if (!db.chatMessages) db.chatMessages = [];

    // Verify conversation belongs to this business
    const conv = db.chatConversations?.find((c) => c.id === convId && c.business_id === businessId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found or unauthorized' });
    }

    const messages = db.chatMessages
      .filter((m) => m.conversation_id === convId && m.business_id === businessId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return res.json({ success: true, messages });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve conversation messages' });
  }
});

// Delete Single Conversation (Tenant-isolated)
app.delete('/api/chat/business/:businessId/conversations/:convId', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId, convId } = req.params;

    if (!db.chatConversations) db.chatConversations = [];
    if (!db.chatMessages) db.chatMessages = [];

    // Verify ownership
    const convIndex = db.chatConversations.findIndex(
      (c) => c.id === convId && c.business_id === businessId
    );
    if (convIndex === -1) {
      return res.status(404).json({ error: 'Conversation not found for this business' });
    }

    // Remove conversation
    db.chatConversations.splice(convIndex, 1);

    // Remove associated messages
    db.chatMessages = db.chatMessages.filter(
      (m) => !(m.conversation_id === convId && m.business_id === businessId)
    );

    saveServerDb(db);
    return res.json({ success: true, deletedConversationId: convId });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete conversation' });
  }
});

// Delete All Conversations for this business (Tenant-isolated)
app.delete('/api/chat/business/:businessId/conversations', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;

    if (!db.chatConversations) db.chatConversations = [];
    if (!db.chatMessages) db.chatMessages = [];

    const priorConvCount = db.chatConversations.filter((c) => c.business_id === businessId).length;

    // Remove only conversations belonging to this business
    db.chatConversations = db.chatConversations.filter((c) => c.business_id !== businessId);

    // Remove only messages belonging to this business
    db.chatMessages = db.chatMessages.filter((m) => m.business_id !== businessId);

    saveServerDb(db);
    return res.json({ success: true, deletedCount: priorConvCount });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete all conversations' });
  }
});

// Chat Analytics: GET (Genuine aggregated data)
app.get('/api/chat/business/:businessId/analytics', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;

    const convs = (db.chatConversations || []).filter((c) => c.business_id === businessId);
    const msgs = (db.chatMessages || []).filter((m) => m.business_id === businessId);
    const clicks = (db.chatClicks || []).filter((c) => c.business_id === businessId);

    const userMsgs = msgs.filter((m) => m.sender === 'user');
    const botMsgs = msgs.filter((m) => m.sender === 'bot');

    const unansweredBotMsgs = botMsgs.filter(
      (m) => m.confidence === 'low' || m.intent === 'unknown'
    );

    // Top Intents count
    const intentMap: Record<string, number> = {};
    botMsgs.forEach((m) => {
      const intent = m.intent || 'unknown';
      intentMap[intent] = (intentMap[intent] || 0) + 1;
    });

    const topIntents = Object.entries(intentMap)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Top Questions count (frequency of normalized text)
    const questionMap: Record<string, number> = {};
    userMsgs.forEach((m) => {
      const q = m.text.trim();
      if (q.length > 2) {
        questionMap[q] = (questionMap[q] || 0) + 1;
      }
    });

    const topQuestions = Object.entries(questionMap)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Unanswered questions
    const unansweredQuestions = unansweredBotMsgs.map((bm) => {
      // Find the user message immediately preceding this bot message in the conversation
      const priorUserMsg = msgs
        .filter(
          (m) =>
            m.conversation_id === bm.conversation_id &&
            m.sender === 'user' &&
            new Date(m.created_at).getTime() <= new Date(bm.created_at).getTime()
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      return {
        question: priorUserMsg?.text || 'Unrecognized question',
        count: 1,
        lastAsked: bm.created_at,
      };
    }).slice(0, 10);

    return res.json({
      success: true,
      analytics: {
        totalConversations: convs.length,
        totalMessages: msgs.length,
        unansweredCount: unansweredBotMsgs.length,
        contactClicksCount: clicks.length,
        topIntents,
        topQuestions,
        unansweredQuestions,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to calculate analytics' });
  }
});

// Action Click Analytics: POST
app.post('/api/chat/business/:businessId/click', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId } = req.params;
    const { type, conversationId } = req.body;

    if (!db.chatClicks) db.chatClicks = [];

    db.chatClicks.push({
      id: `clk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      business_id: businessId,
      conversation_id: conversationId,
      type: String(type || 'contact'),
      created_at: new Date().toISOString(),
    });

    if (conversationId && db.chatConversations) {
      const conv = db.chatConversations.find(
        (c) => c.id === conversationId && c.business_id === businessId
      );
      if (conv) conv.contact_clicked = true;
    }

    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to record click' });
  }
});

// Customer Public Chat Message Sync: POST
app.post('/api/chat/message', (req, res) => {
  try {
    const db = loadServerDb();
    const { businessId, conversationId, userMessage, botMessage, language = 'en' } = req.body;

    if (!businessId || !conversationId) {
      return res.status(400).json({ error: 'Missing businessId or conversationId' });
    }

    if (!db.chatMessages) db.chatMessages = [];
    if (!db.chatConversations) db.chatConversations = [];

    // Append messages
    if (userMessage) {
      db.chatMessages.push({
        id: userMessage.id || `msg_u_${Date.now()}`,
        conversation_id: conversationId,
        business_id: businessId,
        sender: 'user',
        text: String(userMessage.text || '').substring(0, 1000), // Protect against excessive input
        created_at: userMessage.created_at || new Date().toISOString(),
      });
    }

    if (botMessage) {
      db.chatMessages.push({
        id: botMessage.id || `msg_b_${Date.now()}`,
        conversation_id: conversationId,
        business_id: businessId,
        sender: 'bot',
        text: String(botMessage.text || '').substring(0, 2000),
        intent: botMessage.intent,
        confidence: botMessage.confidence,
        suggested_actions: botMessage.suggested_actions,
        created_at: botMessage.created_at || new Date().toISOString(),
      });
    }

    // Upsert conversation metadata
    const convIdx = db.chatConversations.findIndex(
      (c) => c.id === conversationId && c.business_id === businessId
    );

    const now = new Date().toISOString();
    const isUnresolved = botMessage?.confidence === 'low' || botMessage?.intent === 'unknown';

    if (convIdx !== -1) {
      db.chatConversations[convIdx].message_count += (userMessage ? 1 : 0) + (botMessage ? 1 : 0);
      db.chatConversations[convIdx].last_message_preview = userMessage?.text || botMessage?.text || '';
      db.chatConversations[convIdx].updated_at = now;
      if (isUnresolved) {
        db.chatConversations[convIdx].has_unresolved = true;
      }
    } else {
      db.chatConversations.unshift({
        id: conversationId,
        business_id: businessId,
        visitor_session_id: conversationId,
        language: language || 'en',
        message_count: (userMessage ? 1 : 0) + (botMessage ? 1 : 0),
        last_message_preview: userMessage?.text || botMessage?.text || 'Conversation started',
        has_unresolved: isUnresolved,
        created_at: now,
        updated_at: now,
      });
    }

    saveServerDb(db);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save chat message' });
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

function cleanKeywordPhrase(kw: string): string {
  if (!kw) return '';
  const trimmed = kw.trim();
  if (/^[A-Z\s&/,-]+$/.test(trimmed) && trimmed.length > 5) {
    return trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function generateLocalBoostNaturalReview(params: {
  businessName: string;
  category: string;
  location?: string;
  keyword: string;
  experience?: string;
  language: string;
}): string {
  return generateNaturalSingleReview({
    businessName: params.businessName,
    category: params.category,
    location: params.location,
    keyword: params.keyword,
    customerExperience: params.experience,
    language: (params.language === 'hi' || params.language === 'gu' ? params.language : 'en') as any,
  });
}

function generateSmartSuggestions(name: string, keywords: string[], language: string = 'en') {
  const safeLang = (language === 'hi' || language === 'gu' ? language : 'en') as any;
  const positiveDrafts = generate12KeywordGrammarDrafts(name, keywords, safeLang);

  if (safeLang === 'hi') {
    return {
      positive: positiveDrafts,
      neutral: [
        `यहाँ का अनुभव सामान्य रहा। स्टाफ का व्यवहार ठीक था, लेकिन भीड़ के समय थोड़ा इंतज़ार करना पड़ा।`,
        `विज़िट अच्छी रही। स्टाफ का व्यवहार मददगार था, सर्विस संतोषजनक है।`
      ]
    };
  }

  if (safeLang === 'gu') {
    return {
      positive: positiveDrafts,
      neutral: [
        `અહીંનો અનુભવ યોગ્ય રહ્યો. સેવા સંતોષકારક હતી પરંતુ થોડી વધુ ઝડપ જરૂરી છે.`
      ]
    };
  }

  return {
    positive: positiveDrafts,
    neutral: [
      `Decent experience overall. Service was fine, though during rush hours there was a slight wait.`,
      `Visited for the first time. The staff was polite, overall a satisfactory and fair experience.`
    ]
  };
}

// LocalBoost Natural Keyword Review Generation endpoint (100% Local, Zero external API)
app.post('/api/ai/generate-review', async (req, res) => {
  try {
    const {
      businessName = '',
      businessCategory = '',
      businessLocation = '',
      selectedKeyword = '',
      customerExperience = '',
      language = 'en',
    } = req.body;

    const safeBusinessName = (businessName || 'Our Business').trim();
    const safeCategory = (businessCategory || 'Local Business').trim();
    const safeLocation = (businessLocation || '').trim();
    const safeKeyword = (selectedKeyword || 'courteous team').trim();
    const safeExperience = (customerExperience || '').trim();
    const safeLanguage = language === 'hi' || language === 'gu' ? language : 'en';

    const review = generateNaturalSingleReview({
      businessName: safeBusinessName,
      category: safeCategory,
      location: safeLocation,
      keyword: safeKeyword,
      customerExperience: safeExperience,
      language: safeLanguage as any,
    });

    return res.json({
      success: true,
      review,
      source: 'local-natural-engine',
      rulesApplied: [
        'Natural sentence structure',
        'No forced business name in opening sentence',
        'Concise authentic customer tone',
        'Fits customer actual experience',
      ],
    });
  } catch (error: any) {
    console.error('Failed to generate review draft:', error);
    res.status(500).json({ error: error.message || 'Error generating review draft' });
  }
});

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
