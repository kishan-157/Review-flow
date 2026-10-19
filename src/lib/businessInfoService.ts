/**
 * LocalBoost AI — Business Information & Checklist Service
 *
 * Provides structured business profile management, Business Information Checklist
 * calculation, security allowlisting for public chatbot display, and seamless
 * integration with the existing Prompt Engine.
 *
 * 100% Deterministic & Local — Zero External AI APIs.
 */

import {
  Business,
  BusinessProfileInfo,
  ChecklistFieldStatus,
  ProductServiceItem,
  BusinessFaqItem,
  WeekSchedule,
  DaySchedule,
  SupportedLanguage,
} from '../types/database';

export interface ChecklistItemRow {
  key: string;
  section: 'identity' | 'hours' | 'products' | 'policies' | 'contact' | 'faqs';
  sectionTitle: string;
  label: string;
  value: string;
  status: ChecklistFieldStatus;
  isPublic: boolean;
  required: boolean;
  validationError?: string;
  description: string;
}

export interface PublicBusinessChatProfile {
  business_name: string;
  category: string;
  subcategory?: string;
  short_description?: string;
  detailed_description?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  google_maps_url?: string;
  website_url?: string;
  phone?: string;
  whatsapp?: string;
  public_email?: string;
  owner_name?: string; // only if approved
  languages: SupportedLanguage[];
  logo_url?: string;
  opening_hours: {
    schedule: WeekSchedule;
    appointment_only?: boolean;
    holiday_notice?: string;
    isOpenNow: boolean;
    todayHoursText: string;
  };
  products_services: ProductServiceItem[];
  policies: {
    payment_methods: string[];
    return_exchange?: string;
    cancellation?: string;
    refund?: string;
    delivery?: string;
    service_area?: string;
    booking_policy?: string;
    warranty?: string;
    terms?: string;
  };
  contact_actions: {
    call_enabled: boolean;
    whatsapp_enabled: boolean;
    website_enabled: boolean;
    directions_enabled: boolean;
    custom_cta_label?: string;
    custom_cta_url?: string;
  };
  faqs: Array<{ question: string; answer: string }>;
}

export function createDefaultSchedule(): WeekSchedule {
  const defaultDay: DaySchedule = { open: '09:00', close: '21:00', closed: false };
  return {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { ...defaultDay },
    sunday: { open: '10:00', close: '20:00', closed: false },
  };
}

export function getDefaultCategoryProducts(category?: string): ProductServiceItem[] {
  const now = new Date().toISOString();
  switch (category) {
    case 'Restaurant & Hospitality':
      return [
        {
          id: 'prod_1',
          name: 'Signature Chef Special Platter',
          category: 'Main Course',
          description: 'Freshly prepared signature meal served with house special sides and garnish.',
          price: '₹299',
          price_type: 'fixed',
          variants: 'Full, Half',
          available: true,
          last_updated: now,
        },
        {
          id: 'prod_2',
          name: 'Handcrafted Artisan Beverages',
          category: 'Beverages',
          description: 'Freshly brewed artisan coffees, teas, and specialty iced coolers.',
          price: '₹120',
          price_type: 'starting_from',
          variants: 'Hot, Cold',
          available: true,
          last_updated: now,
        },
      ];
    case 'Salon & Spa':
      return [
        {
          id: 'serv_1',
          name: 'Hair Styling & Organic Treatment',
          category: 'Hair Care',
          description: 'Complete hair styling, gentle wash, scalp massage, and organic care.',
          price: '₹450',
          price_type: 'starting_from',
          variants: 'Men, Women',
          available: true,
          last_updated: now,
        },
        {
          id: 'serv_2',
          name: 'Revitalizing Facial & Skin Therapy',
          category: 'Skin Care',
          description: 'Deep cleansing, gentle exfoliation, and herbal rejuvenation mask.',
          price: '₹799',
          price_type: 'starting_from',
          available: true,
          last_updated: now,
        },
      ];
    case 'Healthcare & Clinic':
      return [
        {
          id: 'serv_1',
          name: 'General Consultation & Health Check',
          category: 'Consultation',
          description: 'Comprehensive physical examination, diagnosis, and prescription.',
          price: '₹400',
          price_type: 'fixed',
          available: true,
          last_updated: now,
        },
      ];
    case 'Retail & Supermarket':
      return [
        {
          id: 'prod_1',
          name: 'Fresh Daily Produce & Essentials',
          category: 'Grocery & Staples',
          description: 'Premium quality daily kitchen essentials, grains, spices, and pulses.',
          price: '₹50',
          price_type: 'starting_from',
          available: true,
          last_updated: now,
        },
      ];
    default:
      return [
        {
          id: 'prod_1',
          name: 'Standard Service / Core Product',
          category: 'General',
          description: 'Our primary, trusted local offering delivered with full quality assurance.',
          price: '₹199',
          price_type: 'starting_from',
          available: true,
          last_updated: now,
        },
      ];
  }
}

export function getDefaultBusinessFaqs(businessName: string, category?: string): BusinessFaqItem[] {
  return [
    {
      id: 'faq_1',
      question: 'What are your shop opening hours and timings?',
      variations: [
        'Shop kab khulti hai?',
        'Opening hours kya hain?',
        'Dukaan kitne baje khulti hai?',
        'દુકાન કેટલા વાગ્યે ખુલે છે?',
        'Timings',
      ],
      answer: `${businessName} is open Monday through Saturday from 9:00 AM to 9:00 PM and Sundays from 10:00 AM to 8:00 PM.`,
      approved_for_public: true,
    },
    {
      id: 'faq_2',
      question: 'Where are you located and how do I get directions?',
      variations: [
        'Where is your shop?',
        'Address kya hai?',
        'Location bhejo',
        'Kahan par hai?',
        'તમારું સરનામું શું છે?',
        'Google maps location',
      ],
      answer: `We are conveniently located in the central market area. You can tap the "Directions" button above to view our live location on Google Maps.`,
      approved_for_public: true,
    },
    {
      id: 'faq_3',
      question: 'Which payment methods do you accept?',
      variations: [
        'Do you accept UPI?',
        'Google Pay chalega?',
        'Paytm accept karte ho?',
        'Card payment available?',
        'Cash only?',
      ],
      answer: `We accept all convenient payment modes including Cash, UPI (Google Pay, PhonePe, Paytm), and Credit/Debit Cards.`,
      approved_for_public: true,
    },
    {
      id: 'faq_4',
      question: 'Do you offer home delivery or shipping?',
      variations: [
        'Home delivery available?',
        'Delivery karte ho?',
        'Ghar par delivery milegi?',
        'Delivery charges kitne hain?',
      ],
      answer: `Yes, local delivery is available for orders within our service area. Please reach out on WhatsApp to check delivery time and minimum order details.`,
      approved_for_public: true,
    },
    {
      id: 'faq_5',
      question: 'How can I contact or message you directly?',
      variations: [
        'Contact number do',
        'Phone number kya hai?',
        'WhatsApp number',
        'Kaise baat karein?',
      ],
      answer: `You can reach out to us directly by tapping the "WhatsApp" or "Call" buttons on this screen for instant assistance.`,
      approved_for_public: true,
    },
  ];
}

/**
 * Initializes or normalizes a complete BusinessProfileInfo from existing business data.
 * Zero duplicate profiles: Reuses business_name, phone, whatsapp_number, address, etc.
 */
export function getDefaultBusinessProfileInfo(business: Business): BusinessProfileInfo {
  if (business.business_info && business.business_info.business_name) {
    return {
      ...business.business_info,
      business_name: business.business_name,
      category: business.category || business.business_info.category || 'Local Business',
      address: business.address || business.business_info.address || '',
      phone: business.phone || business.business_info.phone || '',
      whatsapp: business.whatsapp_number || business.business_info.whatsapp || business.phone || '',
      google_maps_url: business.google_review_url || business.business_info.google_maps_url || '',
      logo_url: business.logo_url || business.business_info.logo_url || '',
    };
  }

  const name = business.business_name || 'Our Business';
  const cat = business.category || 'Local Business';

  return {
    business_name: name,
    category: cat,
    subcategory: `${cat} Specialists`,
    short_description: `${name} is dedicated to providing high quality ${cat.toLowerCase()} services with warm customer care.`,
    detailed_description: `${name} serves valued customers with verified quality standards, friendly assistance, and transparent pricing. Centrally located with easy parking and convenient payment options.`,
    address: business.address || 'Main Market Road',
    area: 'Central Commercial Hub',
    city: 'City Center',
    state: 'State',
    pincode: '380001',
    google_maps_url: business.google_review_url || '',
    website_url: '',
    phone: business.phone || '+91 98765 43210',
    whatsapp: business.whatsapp_number || business.phone || '+91 98765 43210',
    public_email: '',
    owner_name: '',
    owner_name_public_approved: false,
    languages: ['en', 'hi', 'gu'],
    logo_url: business.logo_url || '',

    opening_hours: {
      schedule: createDefaultSchedule(),
      appointment_only: false,
      holiday_notice: '',
      last_updated: new Date().toISOString(),
    },

    products_services: getDefaultCategoryProducts(cat),

    policies: {
      payment_methods: ['Cash', 'UPI (Google Pay, PhonePe, Paytm)', 'Credit & Debit Cards'],
      return_exchange: 'Items or services may be exchanged or addressed within 2 business days with bill proof.',
      cancellation: 'Appointments or orders can be rescheduled or cancelled 2 hours prior without penalty.',
      refund: 'Eligible refunds processed back to original payment mode or store credit within 2-3 business days.',
      delivery: 'Fast local delivery available within 5 km radius.',
      service_area: 'City Center and surrounding 7 km radius.',
      booking_policy: 'Walk-ins always welcome. Prior appointment recommended during evening rush hours.',
      warranty: 'Standard quality guarantee on all products and authorized services.',
      terms: 'Standard terms of polite service and fair trade apply.',
    },

    contact_actions: {
      call_enabled: true,
      whatsapp_enabled: true,
      website_enabled: false,
      directions_enabled: true,
      custom_cta_label: 'Chat on WhatsApp',
      custom_cta_url: '',
    },

    faqs: getDefaultBusinessFaqs(name, cat),

    field_status: {
      business_name: 'complete',
      category: 'complete',
      short_description: 'complete',
      address: business.address ? 'complete' : 'needs_verification',
      phone: business.phone ? 'complete' : 'needs_verification',
      whatsapp: business.whatsapp_number || business.phone ? 'complete' : 'needs_verification',
      google_maps_url: business.google_review_url ? 'complete' : 'missing',
      opening_hours: 'complete',
      products_services: 'complete',
      payment_methods: 'complete',
      faqs: 'complete',
    },
    last_verified_at: new Date().toISOString(),
  };
}

/**
 * Computes the Business Information Checklist status and completion percentage.
 * Rules:
 * - Calculated strictly from applicable fields only.
 * - Reflects actual saved data.
 */
export function computeChecklistStatus(info: BusinessProfileInfo): {
  totalApplicable: number;
  completedCount: number;
  percentage: number;
  items: ChecklistItemRow[];
} {
  const items: ChecklistItemRow[] = [];

  // Helper
  const addItem = (
    key: string,
    section: ChecklistItemRow['section'],
    sectionTitle: string,
    label: string,
    rawVal: string | boolean | undefined | any[],
    required: boolean,
    isPublic: boolean,
    description: string,
    customValidator?: () => { status: ChecklistFieldStatus; error?: string }
  ) => {
    const configuredStatus = info.field_status?.[key];
    let valStr = '';
    let status: ChecklistFieldStatus = 'missing';
    let error: string | undefined = undefined;

    if (Array.isArray(rawVal)) {
      valStr = rawVal.length > 0 ? `${rawVal.length} item(s) configured` : '';
    } else if (typeof rawVal === 'boolean') {
      valStr = rawVal ? 'Yes' : 'No';
    } else {
      valStr = (rawVal || '').toString().trim();
    }

    if (customValidator) {
      const res = customValidator();
      status = res.status;
      error = res.error;
    } else if (valStr.length > 0) {
      status = configuredStatus || 'complete';
    } else {
      status = required ? 'missing' : 'not_applicable';
    }

    // Override with manual 'not_applicable' or 'needs_verification' if owner specified
    if (configuredStatus === 'not_applicable') {
      status = 'not_applicable';
    } else if (configuredStatus === 'needs_verification') {
      status = 'needs_verification';
    }

    items.push({
      key,
      section,
      sectionTitle,
      label,
      value: valStr,
      status,
      isPublic,
      required,
      validationError: error,
      description,
    });
  };

  // Section A: Business Identity
  addItem(
    'business_name',
    'identity',
    'Business Identity',
    'Business Name',
    info.business_name,
    true,
    true,
    'Official registered or trade name displayed to customers.'
  );
  addItem(
    'category',
    'identity',
    'Business Identity',
    'Category & Subcategory',
    `${info.category || ''}${info.subcategory ? ` / ${info.subcategory}` : ''}`,
    true,
    true,
    'Industry classification used for category-aware responses.'
  );
  addItem(
    'short_description',
    'identity',
    'Business Identity',
    'Short Description',
    info.short_description,
    true,
    true,
    '1-2 sentence overview shown in chat header.'
  );
  addItem(
    'address',
    'identity',
    'Business Identity',
    'Full Address & Location',
    info.address,
    true,
    true,
    'Physical store or clinic address for visitor directions.'
  );
  addItem(
    'city_pincode',
    'identity',
    'Business Identity',
    'City & PIN Code',
    [info.city, info.pincode].filter(Boolean).join(' - '),
    true,
    true,
    'Local area and postal code.'
  );
  addItem(
    'phone',
    'identity',
    'Business Identity',
    'Public Contact Phone',
    info.phone,
    true,
    true,
    'Telephone number for tap-to-call button.'
  );
  addItem(
    'whatsapp',
    'identity',
    'Business Identity',
    'WhatsApp Number',
    info.whatsapp,
    true,
    true,
    'WhatsApp Business click-to-chat number.'
  );
  addItem(
    'google_maps_url',
    'identity',
    'Business Identity',
    'Google Maps Location Link',
    info.google_maps_url,
    false,
    true,
    'Used for instant 1-tap navigation.'
  );
  addItem(
    'website_url',
    'identity',
    'Business Identity',
    'Official Website',
    info.website_url,
    false,
    true,
    'Link to product catalog or main site.'
  );
  addItem(
    'owner_name',
    'identity',
    'Business Identity',
    'Owner / Manager Name',
    info.owner_name_public_approved ? info.owner_name : '',
    false,
    Boolean(info.owner_name_public_approved),
    'Owner identity. Only visible if approved for public display.'
  );

  // Section B: Opening Hours
  const hasHours = info.opening_hours?.schedule && Object.keys(info.opening_hours.schedule).length >= 7;
  addItem(
    'opening_hours',
    'hours',
    'Operating Hours',
    'Weekly Hours (Mon-Sun)',
    hasHours ? 'Mon-Sun timings saved' : '',
    true,
    true,
    'Operating timings for each day. Prevents guessing when shop is open.'
  );
  addItem(
    'appointment_policy',
    'hours',
    'Operating Hours',
    'Walk-in vs Appointment',
    info.opening_hours?.appointment_only ? 'Appointment Only' : 'Walk-in Welcome',
    false,
    true,
    'Informs visitors whether prior appointment is required.'
  );

  // Section C: Products & Services
  addItem(
    'products_services',
    'products',
    'Products & Services',
    'Products / Service Catalog',
    info.products_services,
    true,
    true,
    'List of items, prices, and descriptions the chatbot answers questions about.'
  );

  // Section D: Policies
  addItem(
    'payment_methods',
    'policies',
    'Business Policies',
    'Accepted Payment Methods',
    info.policies?.payment_methods?.join(', '),
    true,
    true,
    'Cash, UPI, Debit/Credit Card options.'
  );
  addItem(
    'delivery_policy',
    'policies',
    'Business Policies',
    'Delivery & Service Area',
    info.policies?.delivery,
    false,
    true,
    'Delivery radius, home delivery terms, and fees.'
  );
  addItem(
    'return_policy',
    'policies',
    'Business Policies',
    'Return & Exchange Policy',
    info.policies?.return_exchange,
    false,
    true,
    'Conditions and timelines for returns or exchanges.'
  );

  // Section E: Contact & Actions
  addItem(
    'contact_actions',
    'contact',
    'Customer Actions',
    'Action Buttons (Call, WhatsApp, Maps)',
    info.contact_actions?.call_enabled || info.contact_actions?.whatsapp_enabled ? 'Configured' : '',
    true,
    true,
    'Buttons shown on chat header and response bubbles.'
  );

  // Section F: Common FAQs
  addItem(
    'faqs',
    'faqs',
    'Custom FAQs',
    'Frequently Asked Questions',
    info.faqs?.filter((f) => f.approved_for_public),
    true,
    true,
    'Custom Q&As with question variations.'
  );

  // Calculate percentages
  const applicableItems = items.filter((i) => i.status !== 'not_applicable');
  const completedItems = applicableItems.filter((i) => i.status === 'complete');
  const totalApplicable = applicableItems.length;
  const completedCount = completedItems.length;
  const percentage = totalApplicable > 0 ? Math.round((completedCount / totalApplicable) * 100) : 100;

  return {
    totalApplicable,
    completedCount,
    percentage,
    items,
  };
}

/**
 * Evaluates whether the business is open right now based on verified operating hours.
 * Never assumes open unless trustworthy data is saved.
 */
export function calculateCurrentOpenStatus(schedule?: WeekSchedule): {
  isOpenNow: boolean;
  todayHoursText: string;
} {
  if (!schedule) {
    return { isOpenNow: false, todayHoursText: 'Hours not configured' };
  }

  const days: Array<'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  const now = new Date();
  const dayKey = days[now.getDay()];
  const todaySchedule = schedule[dayKey];

  if (!todaySchedule || todaySchedule.closed) {
    return { isOpenNow: false, todayHoursText: 'Closed Today' };
  }

  const openTime = todaySchedule.open || '09:00';
  const closeTime = todaySchedule.close || '21:00';

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  const todayHoursText = `Today: ${openTime} - ${closeTime}`;

  return { isOpenNow: isOpen, todayHoursText };
}

/**
 * Filters verified business info into a secure public profile.
 * Server-side allowlist: Strips unapproved owner details, internal notes, passwords.
 */
export function filterPublicChatbotInfo(info: BusinessProfileInfo): PublicBusinessChatProfile {
  const { isOpenNow, todayHoursText } = calculateCurrentOpenStatus(info.opening_hours?.schedule);

  return {
    business_name: info.business_name,
    category: info.category,
    subcategory: info.subcategory,
    short_description: info.short_description,
    detailed_description: info.detailed_description,
    address: info.address,
    area: info.area,
    city: info.city,
    state: info.state,
    pincode: info.pincode,
    google_maps_url: info.google_maps_url,
    website_url: info.website_url,
    phone: info.phone,
    whatsapp: info.whatsapp,
    public_email: info.public_email,
    owner_name: info.owner_name_public_approved ? info.owner_name : undefined,
    languages: info.languages || ['en', 'hi', 'gu'],
    logo_url: info.logo_url,
    opening_hours: {
      schedule: info.opening_hours?.schedule || createDefaultSchedule(),
      appointment_only: info.opening_hours?.appointment_only,
      holiday_notice: info.opening_hours?.holiday_notice,
      isOpenNow,
      todayHoursText,
    },
    products_services: (info.products_services || []).filter((p) => p.available !== false),
    policies: {
      payment_methods: info.policies?.payment_methods || ['Cash', 'UPI'],
      return_exchange: info.policies?.return_exchange,
      cancellation: info.policies?.cancellation,
      refund: info.policies?.refund,
      delivery: info.policies?.delivery,
      service_area: info.policies?.service_area,
      booking_policy: info.policies?.booking_policy,
      warranty: info.policies?.warranty,
      terms: info.policies?.terms,
    },
    contact_actions: {
      call_enabled: info.contact_actions?.call_enabled !== false,
      whatsapp_enabled: info.contact_actions?.whatsapp_enabled !== false,
      website_enabled: Boolean(info.contact_actions?.website_enabled && info.website_url),
      directions_enabled: Boolean(info.contact_actions?.directions_enabled !== false && info.google_maps_url),
      custom_cta_label: info.contact_actions?.custom_cta_label,
      custom_cta_url: info.contact_actions?.custom_cta_url,
    },
    faqs: (info.faqs || [])
      .filter((f) => f.approved_for_public !== false)
      .map((f) => ({ question: f.question, answer: f.answer })),
  };
}

/**
 * Synthesizes a structured business prompt for the Prompt Engine based on the Checklist data.
 * Keeps Prompt Engine fully compatible and rich without manual retyping!
 */
export function synthesizePromptFromChecklist(info: BusinessProfileInfo): string {
  const parts: string[] = [];

  parts.push(`Business Name: ${info.business_name}`);
  parts.push(`Category: ${info.category}${info.subcategory ? ` (${info.subcategory})` : ''}`);

  if (info.short_description) {
    parts.push(`Overview: ${info.short_description}`);
  }

  const loc = [info.address, info.area, info.city, info.pincode].filter(Boolean).join(', ');
  if (loc) {
    parts.push(`Location: ${loc}`);
  }

  if (info.phone || info.whatsapp) {
    parts.push(`Contact: Phone: ${info.phone || 'N/A'}, WhatsApp: ${info.whatsapp || 'N/A'}`);
  }

  if (info.opening_hours?.schedule) {
    const sch = info.opening_hours.schedule;
    parts.push(`Timings: Mon-Sat ${sch.monday.open} to ${sch.monday.close}, Sun ${sch.sunday.closed ? 'Closed' : `${sch.sunday.open} to ${sch.sunday.close}`}`);
  }

  if (info.products_services?.length > 0) {
    const prodList = info.products_services
      .map((p) => `${p.name} (${p.price})`)
      .join(', ');
    parts.push(`Key Offerings: ${prodList}`);
  }

  if (info.policies?.payment_methods?.length > 0) {
    parts.push(`Payments: ${info.policies.payment_methods.join(', ')}`);
  }

  if (info.policies?.delivery) {
    parts.push(`Delivery: ${info.policies.delivery}`);
  }

  return parts.join(' | ');
}
