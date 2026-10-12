import fs from 'fs';
import path from 'path';
import {
  Profile,
  Business,
  ReviewSettings,
  Feedback,
  AnalyticsEvent,
  Announcement,
  AdminSetting,
  LoyaltyProgramConfig,
  AuthSession,
} from '../types/database';

export interface ServerDatabaseData {
  profiles: Profile[];
  businesses: Business[];
  passwords: Record<string, string>; // lowercased email/credential -> password
  reviewSettings: ReviewSettings[];
  feedbacks: Feedback[];
  analyticsEvents: AnalyticsEvent[];
  announcements: Announcement[];
  adminSettings: AdminSetting[];
  loyaltyConfigs: LoyaltyProgramConfig[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'server_db.json');

// Initial seed data
function getInitialData(): ServerDatabaseData {
  const now = new Date().toISOString();

  const superAdmin: Profile = {
    id: 'admin_kishan_1',
    full_name: 'Kishan Ladani',
    email: 'ladanikishan8@gmail.com',
    unique_customer_code: 'LB-ADM-KISHAN',
    role: 'admin',
    status: 'active',
    access_validity_type: 'lifetime',
    created_at: now,
    updated_at: now,
    last_login_at: now,
  };

  const masterAdmin: Profile = {
    id: 'admin_master_1',
    full_name: 'Platform Super Admin',
    email: 'admin@localboost.ai',
    unique_customer_code: 'LB-ADM-MASTER',
    role: 'admin',
    status: 'active',
    access_validity_type: 'lifetime',
    created_at: now,
    updated_at: now,
    last_login_at: now,
  };

  const demoCustomer: Profile = {
    id: 'usr_foodbites_demo',
    full_name: 'Rahul Patel',
    email: 'cafe@foodbites.com',
    unique_customer_code: 'LB-CUS-8F42K9',
    role: 'customer',
    status: 'active',
    access_validity_type: '1_year',
    access_duration_days: 365,
    created_at: now,
    updated_at: now,
    last_login_at: now,
  };

  const amitCustomer: Profile = {
    id: 'usr_1791726816264_4hm5bq',
    full_name: 'Amit Verma',
    email: 'amit.hotel@gmail.com',
    unique_customer_code: 'LB-CUS-EAM670',
    role: 'customer',
    status: 'active',
    access_validity_type: '1_year',
    access_duration_days: 365,
    created_at: now,
    updated_at: now,
    last_login_at: now,
  };

  const demoBusiness: Business = {
    id: 'biz_foodbites_demo',
    user_id: 'usr_foodbites_demo',
    business_name: 'Food Bites Cafe & Grill',
    unique_slug: 'food-bites-demo',
    google_review_url: 'https://g.page/r/sample/review',
    phone: '+1 555-0199',
    address: '142 Market Street, Downtown',
    category: 'Restaurant & Hospitality',
    created_at: now,
    updated_at: now,
  };

  const amitBusiness: Business = {
    id: 'biz_1791726816264_0gsmn7',
    user_id: 'usr_1791726816264_4hm5bq',
    business_name: 'Grand Royal Hotel',
    unique_slug: 'grand-royal-hotel-pugh',
    google_review_url: 'https://maps.google.com/test',
    phone: '',
    address: '',
    category: 'Restaurant & Hospitality',
    created_at: now,
    updated_at: now,
  };

  const demoSettings: ReviewSettings = {
    id: 'rs_foodbites_demo',
    business_id: 'biz_foodbites_demo',
    language: 'en',
    welcome_text: 'How was your dining experience with us today?',
    thank_you_text: 'Thank you for supporting our local business! ❤️',
    enabled: true,
    accent_color: '#6C3BFF',
    qr_show_logo: true,
    qr_logo_border_style: 'circular',
    qr_color: '#1F1735',
    created_at: now,
    updated_at: now,
  };

  const amitSettings: ReviewSettings = {
    id: 'rs_1791726816264',
    business_id: 'biz_1791726816264_0gsmn7',
    language: 'en',
    welcome_text: 'How was your dining experience with us today?',
    thank_you_text: 'Thank you for supporting our local business! ❤️',
    enabled: true,
    accent_color: '#6C3BFF',
    qr_show_logo: true,
    qr_logo_border_style: 'circular',
    qr_color: '#1F1735',
    created_at: now,
    updated_at: now,
  };

  const demoAnnouncement: Announcement = {
    id: 'ann-init-1',
    title: 'Welcome to LocalBoost AI 🚀',
    message: 'Display your Google Review standees at your billing counter to boost your reviews instantly.',
    type: 'info',
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const defaultAdminSettings: AdminSetting[] = [
    { id: 'set-1', setting_key: 'app_name', setting_value: 'LocalBoost AI', updated_at: now },
    { id: 'set-2', setting_key: 'whatsapp_support_number', setting_value: '+15550198234', updated_at: now },
    { id: 'set-3', setting_key: 'whatsapp_support_message', setting_value: 'Hello LocalBoost AI Support, I need assistance with my account.', updated_at: now },
    { id: 'set-4', setting_key: 'default_accent_color', setting_value: '#6C3BFF', updated_at: now },
  ];

  return {
    profiles: [superAdmin, masterAdmin, demoCustomer, amitCustomer],
    businesses: [demoBusiness, amitBusiness],
    passwords: {
      'ladanikishan8@gmail.com': '12345678',
      'admin@localboost.ai': 'SuperAdmin2026!',
      'cafe@foodbites.com': 'DemoPass123!',
      'lb-cus-8f42k9': 'DemoPass123!',
      '+15550199': 'DemoPass123!',
      '15550199': 'DemoPass123!',
      'amit.hotel@gmail.com': 'MySecretPass123!',
      'lb-cus-eam670': 'MySecretPass123!',
      'lbcuseam670': 'MySecretPass123!',
    },
    reviewSettings: [demoSettings, amitSettings],
    feedbacks: [],
    analyticsEvents: [],
    announcements: [demoAnnouncement],
    adminSettings: defaultAdminSettings,
    loyaltyConfigs: [],
  };
}

let cachedDb: ServerDatabaseData | null = null;

export function loadServerDb(): ServerDatabaseData {
  if (cachedDb) return cachedDb;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ServerDatabaseData>;
      const init = getInitialData();

      // Ensure essential admins and demo data always exist
      const profiles = parsed.profiles || init.profiles;
      const passwords = parsed.passwords || init.passwords;

      // Always guarantee ladanikishan8@gmail.com has password 12345678
      passwords['ladanikishan8@gmail.com'] = '12345678';
      let kishanProfile = profiles.find((p) => p.email.toLowerCase() === 'ladanikishan8@gmail.com');
      if (!kishanProfile) {
        kishanProfile = init.profiles[0];
        profiles.unshift(kishanProfile);
      }

      cachedDb = {
        profiles,
        businesses: parsed.businesses || init.businesses,
        passwords,
        reviewSettings: parsed.reviewSettings || init.reviewSettings,
        feedbacks: parsed.feedbacks || [],
        analyticsEvents: parsed.analyticsEvents || [],
        announcements: parsed.announcements || init.announcements,
        adminSettings: parsed.adminSettings || init.adminSettings,
        loyaltyConfigs: parsed.loyaltyConfigs || [],
      };
      return cachedDb;
    }
  } catch (err) {
    console.error('Error reading server database file, initializing default:', err);
  }

  cachedDb = getInitialData();
  saveServerDb(cachedDb);
  return cachedDb;
}

export function saveServerDb(data: ServerDatabaseData): void {
  cachedDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server database file:', err);
  }
}

export function findUserByCredential(credential: string): Profile | null {
  const db = loadServerDb();
  const clean = credential.trim().toLowerCase();
  const cleanNumeric = clean.replace(/[^0-9]/g, '');
  const cleanAlphaNumeric = clean.replace(/[^a-z0-9]/g, '');

  return (
    db.profiles.find((p) => {
      // Direct trimmed email match
      if (p.email.trim().toLowerCase() === clean) return true;
      // Direct customer code match
      if (p.unique_customer_code.trim().toLowerCase() === clean) return true;
      // Normalized alphanumeric code match (e.g. without hyphens or different case)
      const pCodeAlpha = p.unique_customer_code.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (pCodeAlpha && cleanAlphaNumeric && (pCodeAlpha === cleanAlphaNumeric || cleanAlphaNumeric.endsWith(pCodeAlpha))) {
        return true;
      }
      // Match phone from connected business or id
      const biz = db.businesses.find((b) => b.user_id === p.id);
      if (biz?.phone) {
        const bizClean = biz.phone.toLowerCase().replace(/[^0-9]/g, '');
        if (bizClean && cleanNumeric && (bizClean === cleanNumeric || bizClean.endsWith(cleanNumeric) || cleanNumeric.endsWith(bizClean))) {
          return true;
        }
      }
      // Match by business slug if customer types their slug
      if (biz?.unique_slug && biz.unique_slug.toLowerCase() === clean) {
        return true;
      }
      return false;
    }) || null
  );
}

export function authenticateUser(credentialInput: string, passwordInput: string): AuthSession {
  const db = loadServerDb();
  const cleanCred = credentialInput.trim().toLowerCase();
  const rawPass = passwordInput || '';
  const cleanPass = rawPass.trim();
  const user = findUserByCredential(cleanCred);

  if (!user) {
    throw new Error('Account not found. Please verify your Email, Customer ID, or Phone number.');
  }

  if (user.status === 'disabled') {
    throw new Error('This account has been disabled by the administrator.');
  }

  // Password validation
  const userEmail = user.email.toLowerCase().trim();
  const userCode = user.unique_customer_code.toLowerCase().trim();
  const userCodeAlpha = userCode.replace(/[^a-z0-9]/g, '');

  // Special hardcoded admin credentials guarantee
  if (userEmail === 'ladanikishan8@gmail.com' && (rawPass === '12345678' || cleanPass === '12345678')) {
    db.passwords[userEmail] = '12345678';
  } else {
    const validPassword =
      db.passwords[userEmail] ||
      db.passwords[userCode] ||
      db.passwords[userCodeAlpha] ||
      (userEmail === 'cafe@foodbites.com' ? 'DemoPass123!' : null) ||
      (userEmail === 'amit.hotel@gmail.com' ? 'MySecretPass123!' : null);

    if (validPassword) {
      const match =
        validPassword === rawPass ||
        validPassword === cleanPass ||
        validPassword.trim() === cleanPass;
      if (!match) {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }
    }
  }

  user.last_login_at = new Date().toISOString();
  saveServerDb(db);

  let business = db.businesses.find((b) => b.user_id === user.id);
  // Guarantee business profile exists for customer
  if (!business && user.role === 'customer') {
    business = {
      id: `biz_${user.id}`,
      user_id: user.id,
      business_name: user.full_name ? `${user.full_name}'s Business` : 'My Business',
      unique_slug: `biz-${user.id.substring(4, 12)}`,
      google_review_url: 'https://maps.google.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.businesses.push(business);
    saveServerDb(db);
  }

  return { user, business };
}
