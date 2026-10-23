/**
 * LocalBoost AI — Database and Application Types
 */

export type UserRole = 'admin' | 'manager' | 'customer';
export type UserStatus = 'active' | 'disabled';

export type AccessValidityType = '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime' | 'custom';

export type CustomerFeatureKey =
  | 'dashboard'
  | 'qrcode'
  | 'ai_agent'
  | 'ai_chat'
  | 'loyalty'
  | 'scratch_offers'
  | 'whatsapp_marketing'
  | 'birthday'
  | 'analytics'
  | 'feedback'
  | 'business'
  | 'settings'
  | 'announcements'
  | 'security'
  | 'support';

export interface CustomerFeatureDefinition {
  id: CustomerFeatureKey;
  label: string;
  hindiLabel: string;
  description: string;
  category: 'core' | 'rewards' | 'intelligence' | 'store';
  badge?: string;
}

export const CUSTOMER_FEATURE_CATALOG: CustomerFeatureDefinition[] = [
  {
    id: 'ai_chat',
    label: 'AI Business Chatbot',
    hindiLabel: 'AI चैटबॉट (Chatbot)',
    description: '24/7 customer Q&A chatbot, knowledge base & dedicated Chat QR',
    category: 'core',
    badge: 'Popular',
  },
  {
    id: 'qrcode',
    label: 'QR Code & Standees',
    hindiLabel: 'QR कोड और स्टैंडी',
    description: 'Print-ready Google Review QR Standee & table tent templates',
    category: 'core',
  },
  {
    id: 'ai_agent',
    label: 'AI Prompt Engine',
    hindiLabel: 'AI रिव्यू इंजन',
    description: 'Auto-generate 12 custom review drafts & SEO keywords',
    category: 'core',
  },
  {
    id: 'dashboard',
    label: 'Overview & Metrics',
    hindiLabel: 'ओवरव्यू डैशबोर्ड',
    description: 'Main KPI summary, setup checklist & quick actions',
    category: 'core',
  },
  {
    id: 'loyalty',
    label: 'Loyalty & Stamp Cards',
    hindiLabel: 'लॉयल्टी और डिस्काउंट कार्ड',
    description: 'Issue & redeem VIP discount vouchers and stamp cards',
    category: 'rewards',
  },
  {
    id: 'scratch_offers',
    label: 'Scratch & Win Draw',
    hindiLabel: 'स्क्रैच एंड विन गेम',
    description: 'Gamified mystery scratch cards for customers',
    category: 'rewards',
  },
  {
    id: 'whatsapp_marketing',
    label: 'WhatsApp Marketing Hub',
    hindiLabel: 'व्हाट्सएप मार्केटिंग हब',
    description: '1-Click WhatsApp voucher sharing & marketing',
    category: 'rewards',
  },
  {
    id: 'birthday',
    label: 'Birthday Club & Wishes',
    hindiLabel: 'बर्थडे क्लब और विशेज',
    description: 'Automated birthday rewards & WhatsApp greetings',
    category: 'rewards',
  },
  {
    id: 'analytics',
    label: 'Live Traffic & Scans',
    hindiLabel: 'लाइव ट्रैफिक और स्कैन',
    description: 'Daily QR scans, star ratings & Google click conversion',
    category: 'intelligence',
  },
  {
    id: 'feedback',
    label: 'Private Feedback Shield',
    hindiLabel: 'प्राइवेट फीडबैक शील्ड',
    description: 'Intercept 1-3 star negative feedback privately',
    category: 'intelligence',
  },
  {
    id: 'business',
    label: 'Store Profile & GPS',
    hindiLabel: 'स्टोर प्रोफाइल और GPS',
    description: 'Store details, Google review link & GPS verification',
    category: 'store',
  },
  {
    id: 'settings',
    label: 'Review Customizer',
    hindiLabel: 'रिव्यू कस्टमाइज़र',
    description: 'Brand colors, welcome greeting & language settings',
    category: 'store',
  },
  {
    id: 'security',
    label: 'Password & Security',
    hindiLabel: 'पासवर्ड और सुरक्षा',
    description: 'Change login password & security settings',
    category: 'store',
  },
  {
    id: 'support',
    label: 'WhatsApp Support',
    hindiLabel: 'व्हाट्सएप सपोर्ट',
    description: 'Direct help & support contact',
    category: 'store',
  },
];

export const ALL_CUSTOMER_FEATURE_KEYS: CustomerFeatureKey[] = CUSTOMER_FEATURE_CATALOG.map((f) => f.id);

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  unique_customer_code: string;
  role: UserRole;
  status: UserStatus;
  created_by_manager_id?: string;
  managed_by?: string;
  access_validity_type?: AccessValidityType;
  access_duration_days?: number;
  access_expires_at?: string | null; // ISO timestamp string or null for lifetime
  allowed_features?: string[];
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Business {
  id: string;
  user_id: string;
  created_by_manager_id?: string;
  created_by_manager_name?: string;
  business_name: string;
  unique_slug: string;
  google_review_url: string;
  logo_url?: string;
  phone?: string;
  whatsapp_number?: string;
  address?: string;
  category?: string;
  allowed_features?: string[];
  ai_prompt?: string;
  ai_keywords?: string[];
  ai_suggestions_preview?: {
    positive?: string[];
    neutral?: string[];
    highlights?: string[];
  };
  ai_summary?: string;
  ai_last_generated_at?: string;
  // Free Live GPS Verification (HTML5 device geolocation - 100% Free)
  gps_verification_enabled?: boolean;
  latitude?: number;
  longitude?: number;
  gps_radius_meters?: number; // e.g., 200 (meters)
  // Proactive Review Reward Mode: Guaranteed Loyalty Card vs Scratch & Win Lucky Draw
  review_reward_mode?: ReviewRewardMode;
  // Birthday Club & Celebration Marketing
  birthday_offer_enabled?: boolean;
  birthday_reward_title?: string;
  birthday_reward_value?: string;
  birthday_min_bill_amount?: string;
  birthday_validity_days?: number;
  birthday_wish_template?: string;
  // Comprehensive Business Profile Info for Checklist & Chatbot
  business_info?: BusinessProfileInfo;
  created_at: string;
  updated_at: string;
}

export type ReviewRewardMode = 'loyalty_card' | 'scratch_card';
export type SupportedLanguage = 'en' | 'hi' | 'gu';
export type QRLogoBorderStyle = 'circular' | 'square';

export interface ReviewSettings {
  id: string;
  business_id: string;
  language: SupportedLanguage;
  welcome_text: string;
  thank_you_text: string;
  enabled: boolean;
  accent_color: string;
  qr_show_logo?: boolean;
  qr_logo_url?: string;
  qr_logo_border_style?: QRLogoBorderStyle;
  qr_color?: string;
  require_gps?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewSuggestion {
  id: string;
  business_id: string;
  rating: number;
  category: string;
  suggestion_text: string;
  language: SupportedLanguage;
  created_at: string;
}

export type AnalyticsEventType =
  | 'qr_scan'
  | 'rating_selected'
  | 'suggestion_generated'
  | 'review_copied'
  | 'google_review_clicked'
  | 'feedback_submitted';

export interface AnalyticsEvent {
  id: string;
  business_id: string;
  event_type: AnalyticsEventType;
  rating?: number | null;
  visitor_session_hash?: string;
  created_at: string;
}

export type FeedbackStatus = 'new' | 'in_progress' | 'resolved';

export interface Feedback {
  id: string;
  business_id: string;
  rating: number;
  feedback_text: string;
  customer_name?: string;
  customer_contact?: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export type AnnouncementType = 'info' | 'warning' | 'success' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface AdminSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

export interface ImpersonationAuditLog {
  id: string;
  admin_id: string;
  target_user_id: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface AuthSession {
  user: Profile;
  business?: Business;
  impersonatingFromAdmin?: Profile;
  impersonatingFromManager?: Profile;
}

export interface BusinessAnalyticsSummary {
  totalScans: number;
  totalRatings: number;
  averageRating: number;
  starDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviewCopies: number;
  googleClicks: number;
  feedbackSubmissions: number;
}

export type RewardType = 'discount_percentage' | 'discount_fixed' | 'free_item' | 'stamp_card' | 'custom';
export type LoyaltyCardStatus = 'active' | 'redeemed' | 'expired';

export interface LoyaltyProgramConfig {
  id: string;
  business_id: string;
  enabled: boolean;
  reward_title: string;
  reward_description: string;
  reward_type: RewardType;
  reward_value: string;
  min_bill_amount?: string;
  validity_days: number;
  terms_conditions: string;
  stamps_required?: number;
  badge_label?: string;
  ask_birthday?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyCard {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_dob?: string; // YYYY-MM-DD
  voucher_code: string;
  reward_title: string;
  reward_description: string;
  reward_type: RewardType;
  reward_value: string;
  min_bill_amount?: string;
  terms_conditions?: string;
  status: LoyaltyCardStatus;
  issue_rating?: number;
  stamps_collected?: number;
  stamps_total?: number;
  expires_at: string;
  redeemed_at?: string;
  redeemed_by?: string;
  redemption_bill_amount?: string;
  redemption_notes?: string;
  created_at: string;
}

export type ReminderStage = '7_days' | '3_days' | 'expiry_day';
export type ReminderStatus = 'PENDING' | 'SENT' | 'STOPPED' | 'CANCELLED';

export interface RewardReminder {
  id: string; // Unique deterministic identifier: `${reward_id}_${stage}`
  reward_id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  voucher_code: string;
  reward_title: string;
  reward_value?: string;
  expires_at: string;
  stage: ReminderStage;
  stage_label: string; // '7 Days Remaining', '3 Days Remaining', 'Expiry Day'
  days_remaining: number;
  status: ReminderStatus; // 'PENDING' | 'SENT' | 'STOPPED' | 'CANCELLED'
  sent_at?: string | null;
  sent_by?: string | null;
  message_template: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderAuditLog {
  id: string;
  reminder_id: string;
  reward_id: string;
  business_id: string;
  stage: ReminderStage;
  previous_status: ReminderStatus;
  new_status: ReminderStatus;
  changed_by: string;
  reason: string;
  action: 'INITIALIZE' | 'CONFIRM_SENT' | 'MANUAL_CORRECTION' | 'CANCELLED' | 'STOPPED';
  created_at: string;
}

// ==============================================================================
// SCRATCH & WIN OFFERS (INDEPENDENT CAMPAIGN & PROMOTIONAL REWARD ENGINE)
// ==============================================================================

export type ScratchCampaignStatus = 'draft' | 'active' | 'paused' | 'expired';

export interface ScratchPrizeItem {
  id: string;
  name: string; // e.g. "Executive Pen 🖊️", "20% OFF", "10% OFF"
  reward_type: RewardType;
  reward_value: string; // e.g. "Free Pen", "20% OFF", "10% OFF"
  probability_weight?: number; // e.g. 1
}

export interface ScratchCampaign {
  id: string;
  business_id: string;
  campaign_name: string;
  description: string;
  reward_type: RewardType;
  reward_value: string;
  reward_headline: string;
  free_item_name?: string;
  min_purchase_amount?: string;
  start_date: string; // ISO date string (YYYY-MM-DD or full ISO)
  expiry_date: string; // ISO date string (YYYY-MM-DD or full ISO)
  validity_days_after_win: number; // e.g. 15 or 30 days
  total_reward_quantity: number; // e.g. 100 total prizes allowed
  rewards_claimed_count: number;
  per_customer_play_limit: number; // e.g. 1 or 2 plays per customer phone
  status: ScratchCampaignStatus;
  terms_conditions?: string;
  // Lucky Draw Mystery Prize Pool (e.g. from pen to 20% discount)
  lucky_draw_enabled?: boolean;
  prize_pool?: ScratchPrizeItem[];
  created_at: string;
  updated_at: string;
}

export type ScratchPlayStatus = 'active' | 'redeemed' | 'expired';

export interface ScratchPlay {
  id: string; // Deterministic or unique play id: `scratch_${campaign_id}_${phone}_${play_index}`
  campaign_id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_dob?: string;
  voucher_code: string; // e.g. WIN-7K9A
  reward_title: string;
  reward_type: RewardType;
  reward_value: string;
  min_purchase_amount?: string;
  terms_conditions?: string;
  status: ScratchPlayStatus;
  scratched_at: string;
  expires_at: string;
  redeemed_at?: string;
  redeemed_by?: string;
  created_at: string;
}

// ============================================================================
// BUSINESS INFORMATION CHECKLIST & LIVE CHAT TYPES (100% Zero External AI)
// ============================================================================

export type ChecklistFieldStatus = 'complete' | 'missing' | 'needs_verification' | 'not_applicable';

export interface DaySchedule {
  open: string; // e.g. "09:00"
  close: string; // e.g. "21:00"
  closed: boolean;
  lunch_start?: string;
  lunch_end?: string;
}

export type WeekSchedule = Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  DaySchedule
>;

export type PriceType = 'fixed' | 'starting_from' | 'range' | 'quotation';

export interface ProductServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  price_type: PriceType;
  variants?: string; // e.g. "Small, Medium, Large" or "Full / Half"
  available: boolean;
  last_updated?: string;
}

export interface BusinessFaqItem {
  id: string;
  question: string;
  variations: string[];
  answer: string;
  approved_for_public: boolean;
}

export interface BusinessProfileInfo {
  // A. Identity
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
  owner_name?: string;
  owner_name_public_approved?: boolean;
  languages: SupportedLanguage[];
  logo_url?: string;

  // B. Opening Hours
  opening_hours: {
    schedule: WeekSchedule;
    appointment_only?: boolean;
    holiday_notice?: string;
    last_updated?: string;
  };

  // C. Products and Services
  products_services: ProductServiceItem[];

  // D. Policies
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

  // E. Customer Contact & Actions
  contact_actions: {
    call_enabled: boolean;
    whatsapp_enabled: boolean;
    website_enabled: boolean;
    directions_enabled: boolean;
    custom_cta_label?: string;
    custom_cta_url?: string;
  };

  // F. Common FAQs
  faqs: BusinessFaqItem[];

  // G. Checklist Field Status Map & Verification Date
  field_status: Record<string, ChecklistFieldStatus>;
  last_verified_at?: string;
}

export interface ChatQuickPrompt {
  id: string;
  label: string; // Button text displayed to customer, e.g. "🕒 Opening Hours", "📍 Location"
  question: string; // Question text sent into chat
  direct_answer?: string; // Optional instant answer to reply immediately
  category?: 'hours' | 'location' | 'product' | 'policy' | 'contact' | 'custom';
  action_type?: 'message' | 'call' | 'whatsapp' | 'maps' | 'website';
  action_value?: string;
  is_active: boolean;
}

export interface ChatbotConfig {
  id: string;
  business_id: string;
  enabled: boolean;
  welcome_message?: {
    en?: string;
    hi?: string;
    gu?: string;
  };
  fallback_message?: {
    en?: string;
    hi?: string;
    gu?: string;
  };
  supported_languages: SupportedLanguage[];
  suggested_questions: string[];
  quick_prompts?: ChatQuickPrompt[];
  custom_short_slug?: string;
  show_call_button: boolean;
  show_whatsapp_button: boolean;
  show_directions_button: boolean;
  show_website_button: boolean;
  visitor_privacy_notice?: string;
  personality_style?: 'professional' | 'friendly' | 'simple' | 'formal' | 'short' | 'detailed';
  custom_instructions?: string;
  theme_color?: string;
  widget_position?: 'bottom-right' | 'bottom-left';
  widget_size?: 'compact' | 'normal' | 'expanded';
  appearance_mode?: 'dark' | 'light';
  header_title?: string;
  input_placeholder?: string;
  scanned_sources?: Array<{
    id: string;
    type: 'website' | 'maps';
    url: string;
    title: string;
    status: 'scanned' | 'error' | 'pending';
    page_count?: number;
    last_scanned: string;
    conflict_warning?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  business_id: string;
  visitor_session_id: string;
  language: SupportedLanguage;
  message_count: number;
  last_message_preview: string;
  has_unresolved: boolean;
  contact_clicked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatActionOption {
  type: 'call' | 'whatsapp' | 'maps' | 'website' | 'question';
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  business_id: string;
  sender: 'user' | 'bot';
  text: string;
  intent?: string;
  confidence?: 'high' | 'medium' | 'low';
  suggested_actions?: ChatActionOption[];
  created_at: string;
}

export interface ChatAnalyticsSummary {
  totalConversations: number;
  totalMessages: number;
  unansweredCount: number;
  contactClicksCount: number;
  topIntents: Array<{ intent: string; count: number }>;
  topQuestions: Array<{ question: string; count: number }>;
  unansweredQuestions: Array<{ question: string; count: number; lastAsked: string }>;
}


