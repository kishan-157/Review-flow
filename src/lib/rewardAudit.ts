import { LoyaltyCard, ScratchPlay, Business } from '../types/database';
import { getStorage, STORAGE_KEYS, getSupabaseClient } from './db';

export interface RewardAuditDetails {
  voucher_code: string;
  type: 'loyalty' | 'scratch';
  reward_title: string;
  reward_value: string;
  reward_description?: string;
  customer_name: string;
  customer_phone: string;
  business_id: string;
  business_name?: string;
  status: 'active' | 'redeemed' | 'expired';
  created_at: string;
  kab_mila_formatted: string;
  kab_mila_relative: string;
  kaise_mila_type: 'google_review' | 'scratch_win' | 'loyalty_program' | 'pos_direct';
  kaise_mila_title: string;
  kaise_mila_desc: string;
  kaise_mila_stars?: number;
  campaign_name?: string;
  min_purchase_amount?: string;
  terms_conditions?: string;
  expires_at: string;
  expires_at_formatted: string;
  redeemed_at?: string;
  redeemed_at_formatted?: string;
  redeemed_by?: string;
  is_expired: boolean;
  is_redeemed: boolean;
  is_valid: boolean;
  raw_loyalty_card?: LoyaltyCard;
  raw_scratch_play?: ScratchPlay;
}

export function formatRelativeTime(dateString: string): string {
  try {
    const then = new Date(dateString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - then) / 1000);

    if (isNaN(then)) return 'Recently';
    if (diffSec < 60) return 'Just now (Abhi mila)';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago (${diffMin} minute pehle)`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago (${diffHours} ghante pehle)`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday (Kal mila tha)';
    if (diffDays < 30) return `${diffDays} days ago (${diffDays} din pehle)`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString || '';
  }
}

/**
 * Extracts voucher code from raw text, QR scan result, or verification URL
 */
export function extractVoucherCode(input: string): string {
  if (!input) return '';
  let clean = input.trim();

  // URL query parameter ?verify_reward=CODE
  if (clean.includes('verify_reward=')) {
    const match = clean.match(/verify_reward=([^&#\s]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  }

  // URL query parameter ?verify_voucher=CODE
  if (clean.includes('verify_voucher=')) {
    const match = clean.match(/verify_voucher=([^&#\s]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  }

  // URL query parameter ?code=CODE
  if (clean.includes('code=')) {
    const match = clean.match(/[?&]code=([^&#\s]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  }

  // Hash route #verify/CODE
  if (clean.includes('#verify/')) {
    const match = clean.match(/#verify\/([^&#\s?]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  }

  // LocalBoost prefix LOCALBOOST-VOUCHER:CODE:BIZ_ID
  if (clean.startsWith('LOCALBOOST-VOUCHER:')) {
    const parts = clean.split(':');
    if (parts[1]) return parts[1].trim();
  }

  return clean;
}

/**
 * Transforms a LoyaltyCard into a detailed RewardAuditDetails object
 */
export function buildLoyaltyAuditDetails(
  card: LoyaltyCard,
  business?: Business | null
): RewardAuditDetails {
  const isExpired = new Date(card.expires_at).getTime() < Date.now();
  const isRedeemed = card.status === 'redeemed';
  const isValid = !isExpired && !isRedeemed;

  let kaiseMilaType: 'google_review' | 'loyalty_program' | 'pos_direct' = 'loyalty_program';
  let kaiseMilaTitle = '🏆 VIP Customer Loyalty Program';
  let kaiseMilaDesc = 'Customer earned reward via frequent customer loyalty milestone.';
  const stars = card.issue_rating || (card.reward_description?.includes('feedback') ? 5 : undefined);

  if (stars && stars >= 4) {
    kaiseMilaType = 'google_review';
    kaiseMilaTitle = `⭐ ${stars}-Star Google Review Reward`;
    kaiseMilaDesc = `Customer completed a ${stars}-Star verified review on Google Standee.`;
  }

  return {
    voucher_code: card.voucher_code,
    type: 'loyalty',
    reward_title: card.reward_title,
    reward_value: card.reward_value,
    reward_description: card.reward_description,
    customer_name: card.customer_name || 'Valued Guest',
    customer_phone: card.customer_phone,
    business_id: card.business_id,
    business_name: business?.business_name,
    status: isRedeemed ? 'redeemed' : isExpired ? 'expired' : 'active',
    created_at: card.created_at,
    kab_mila_formatted: formatDateTime(card.created_at),
    kab_mila_relative: formatRelativeTime(card.created_at),
    kaise_mila_type: kaiseMilaType,
    kaise_mila_title: kaiseMilaTitle,
    kaise_mila_desc: kaiseMilaDesc,
    kaise_mila_stars: stars,
    min_purchase_amount: undefined,
    terms_conditions: card.terms_conditions || 'Valid at counter during billing.',
    expires_at: card.expires_at,
    expires_at_formatted: formatDateTime(card.expires_at),
    redeemed_at: card.redeemed_at,
    redeemed_at_formatted: formatDateTime(card.redeemed_at),
    redeemed_by: card.redeemed_by,
    is_expired: isExpired,
    is_redeemed: isRedeemed,
    is_valid: isValid,
    raw_loyalty_card: card,
  };
}

/**
 * Transforms a ScratchPlay into a detailed RewardAuditDetails object
 */
export function buildScratchAuditDetails(
  play: ScratchPlay,
  business?: Business | null
): RewardAuditDetails {
  const isExpired = new Date(play.expires_at).getTime() < Date.now();
  const isRedeemed = play.status === 'redeemed';
  const isValid = !isExpired && !isRedeemed;

  return {
    voucher_code: play.voucher_code,
    type: 'scratch',
    reward_title: play.reward_title,
    reward_value: play.reward_value,
    reward_description: undefined,
    customer_name: play.customer_name || 'Valued Guest',
    customer_phone: play.customer_phone,
    business_id: play.business_id,
    business_name: business?.business_name,
    status: isRedeemed ? 'redeemed' : isExpired ? 'expired' : 'active',
    created_at: play.scratched_at || play.created_at,
    kab_mila_formatted: formatDateTime(play.scratched_at || play.created_at),
    kab_mila_relative: formatRelativeTime(play.scratched_at || play.created_at),
    kaise_mila_type: 'scratch_win',
    kaise_mila_title: '🎲 Scratch & Win Lucky Draw Winner',
    kaise_mila_desc: `Customer unlocked and scratched lucky coupon on promotional campaign.`,
    campaign_name: undefined,
    min_purchase_amount: play.min_purchase_amount,
    terms_conditions: play.terms_conditions || 'Valid at counter during billing.',
    expires_at: play.expires_at,
    expires_at_formatted: formatDateTime(play.expires_at),
    redeemed_at: play.redeemed_at,
    redeemed_at_formatted: formatDateTime(play.redeemed_at),
    redeemed_by: play.redeemed_by,
    is_expired: isExpired,
    is_redeemed: isRedeemed,
    is_valid: isValid,
    raw_scratch_play: play,
  };
}

/**
 * Universal lookup to find and audit ANY reward (loyalty or scratch) by voucher code or mobile number
 */
export async function findRewardAuditDetails(
  query: string,
  businessId?: string,
  business?: Business | null
): Promise<RewardAuditDetails | null> {
  const clean = query.trim();
  if (!clean) return null;

  // Extract pure code if a full URL was scanned:
  // e.g. "https://example.com/?verify_reward=VCH-1234" -> "VCH-1234"
  // e.g. "LOCALBOOST-VOUCHER:VCH-1234:biz-abc" -> "VCH-1234"
  let extractedCode = clean;
  if (clean.includes('verify_reward=')) {
    const match = clean.match(/verify_reward=([^&#\s]+)/i);
    if (match?.[1]) extractedCode = decodeURIComponent(match[1]);
  } else if (clean.includes('verify_voucher=')) {
    const match = clean.match(/verify_voucher=([^&#\s]+)/i);
    if (match?.[1]) extractedCode = decodeURIComponent(match[1]);
  } else if (clean.startsWith('LOCALBOOST-VOUCHER:')) {
    const parts = clean.split(':');
    if (parts[1]) extractedCode = parts[1];
  }

  const codeUpper = extractedCode.trim().toUpperCase();
  const digitsOnly = extractedCode.replace(/\D/g, '');

  // 1. Check local storage for Loyalty Cards
  const loyaltyCards = getStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, []);
  const foundCard = loyaltyCards.find((c) => {
    if (businessId && c.business_id !== businessId) return false;
    if (c.voucher_code.trim().toUpperCase() === codeUpper) return true;
    if (digitsOnly.length >= 7 && c.customer_phone.replace(/\D/g, '').endsWith(digitsOnly)) return true;
    return false;
  });

  if (foundCard) {
    return buildLoyaltyAuditDetails(foundCard, business);
  }

  // 2. Check local storage for Scratch Plays
  const scratchPlays = getStorage<ScratchPlay[]>(STORAGE_KEYS.SCRATCH_PLAYS, []);
  const foundPlay = scratchPlays.find((p) => {
    if (businessId && p.business_id !== businessId) return false;
    if (p.voucher_code.trim().toUpperCase() === codeUpper) return true;
    if (digitsOnly.length >= 7 && p.customer_phone.replace(/\D/g, '').endsWith(digitsOnly)) return true;
    return false;
  });

  if (foundPlay) {
    return buildScratchAuditDetails(foundPlay, business);
  }

  // 3. Check Server API endpoint /api/reward/inspect/:code
  try {
    const res = await fetch(`/api/reward/inspect/${encodeURIComponent(codeUpper)}?businessId=${businessId || ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.audit) {
        return data.audit as RewardAuditDetails;
      }
    }
  } catch {
    // ignore
  }

  // 4. Fallback check in Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: sCard } = await supabase
        .from('loyalty_cards')
        .select('*')
        .ilike('voucher_code', codeUpper)
        .maybeSingle();
      if (sCard) {
        return buildLoyaltyAuditDetails(sCard as LoyaltyCard, business);
      }
    } catch {
      // ignore
    }
  }

  return null;
}
