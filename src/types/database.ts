/**
 * LocalBoost AI — Database and Application Types
 */

export type UserRole = 'admin' | 'customer';
export type UserStatus = 'active' | 'disabled';

export type AccessValidityType = '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime' | 'custom';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  unique_customer_code: string;
  role: UserRole;
  status: UserStatus;
  access_validity_type?: AccessValidityType;
  access_duration_days?: number;
  access_expires_at?: string | null; // ISO timestamp string or null for lifetime
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Business {
  id: string;
  user_id: string;
  business_name: string;
  unique_slug: string;
  google_review_url: string;
  logo_url?: string;
  phone?: string;
  whatsapp_number?: string;
  address?: string;
  category?: string;
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
  created_at: string;
  updated_at: string;
}

export interface LoyaltyCard {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  voucher_code: string;
  reward_title: string;
  reward_description: string;
  reward_type: RewardType;
  reward_value: string;
  terms_conditions?: string;
  status: LoyaltyCardStatus;
  issue_rating?: number;
  stamps_collected?: number;
  stamps_total?: number;
  expires_at: string;
  redeemed_at?: string;
  redeemed_by?: string;
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

