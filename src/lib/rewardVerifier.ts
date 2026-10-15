import { LoyaltyCard, ScratchPlay, Business } from '../types/database';
import { getStorage, STORAGE_KEYS, setStorage, getSupabaseClient } from './db';

export interface VerifiedRewardDetails {
  type: 'loyalty' | 'scratch';
  id: string;
  voucher_code: string;
  reward_title: string;
  reward_value?: string;
  customer_name: string;
  customer_phone: string;
  status: 'active' | 'redeemed' | 'expired';
  created_at: string; // KAB MILA (Timestamp)
  expires_at: string;
  redeemed_at?: string;
  redeemed_by?: string;
  // KAISE MILA (Issuance Source)
  source_type: 'google_review' | 'scratch_card' | 'walk_in';
  source_label: string;
  source_description: string;
  business_id: string;
  business_name?: string;
  business_phone?: string;
  business_logo?: string;
  terms_conditions?: string;
}

/**
 * Extracts a clean voucher code if raw input is a URL, QR string, or plain code.
 * Handles:
 * - https://domain.com/?verify=VIP-FOOD-7842
 * - https://domain.com/#verify/VIP-FOOD-7842
 * - LOCALBOOST-VOUCHER:VIP-FOOD-7842:biz_123
 * - Plain: VIP-FOOD-7842
 */
export function parseVoucherCodeFromScan(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // 1. Check for URL query params: ?verify=CODE, &verify=CODE, ?v=CODE
  try {
    if (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('?')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.local/${trimmed}`);
      const v = url.searchParams.get('verify') || url.searchParams.get('v') || url.searchParams.get('code');
      if (v) return v.trim().toUpperCase();

      // Check hash in URL: #verify/CODE
      const hash = url.hash.replace(/^#\/?/, '');
      if (hash.startsWith('verify/')) {
        return hash.replace(/^verify\//, '').trim().toUpperCase();
      }
    }
  } catch {
    // Ignore URL parse failure
  }

  // 2. Check hash string directly: #verify/CODE
  if (trimmed.includes('#verify/')) {
    const after = trimmed.split('#verify/')[1];
    if (after) return after.split(/[\/\?\&]/)[0].trim().toUpperCase();
  }

  // 3. Check legacy QR format: LOCALBOOST-VOUCHER:CODE:BIZ_ID
  if (trimmed.startsWith('LOCALBOOST-VOUCHER:')) {
    const parts = trimmed.split(':');
    if (parts[1]) return parts[1].trim().toUpperCase();
  }

  // 4. Return clean code
  return trimmed.split(/[\/\?\#\&]/)[0].trim().toUpperCase();
}

/**
 * Formats relative time (e.g. "Today (2 hours ago)", "Yesterday", "5 days ago")
 */
export function formatKabMila(timestamp: string): {
  fullDate: string;
  timeStr: string;
  relative: string;
  displaySummary: string;
} {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) {
    return {
      fullDate: 'Unknown date',
      timeStr: '',
      relative: '',
      displaySummary: 'Unknown date',
    };
  }

  const fullDate = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = '';
  if (diffMin < 2) {
    relative = 'Just now (Few moments ago)';
  } else if (diffMin < 60) {
    relative = `${diffMin} mins ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    relative = 'Yesterday';
  } else if (diffDays < 30) {
    relative = `${diffDays} days ago`;
  } else {
    relative = `${Math.floor(diffDays / 30)} month(s) ago`;
  }

  return {
    fullDate,
    timeStr,
    relative,
    displaySummary: `${fullDate} at ${timeStr} (${relative})`,
  };
}

/**
 * Verifies any voucher code across Loyalty Cards and Scratch Plays.
 * Tries server-side API first, falls back to Supabase and LocalStorage.
 */
export async function verifyRewardDetails(
  rawInput: string,
  businessId?: string
): Promise<VerifiedRewardDetails | null> {
  const code = parseVoucherCodeFromScan(rawInput);
  if (!code) return null;

  // 1. Try server-side endpoint first
  try {
    const res = await fetch(`/api/voucher/verify/${encodeURIComponent(code)}${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.details) {
        return data.details as VerifiedRewardDetails;
      }
    }
  } catch {
    // Continue to client fallback
  }

  // 2. Client fallback: Check Loyalty Cards
  const supabase = getSupabaseClient();
  let loyaltyCard: LoyaltyCard | null = null;

  if (supabase) {
    try {
      let query = supabase.from('loyalty_cards').select('*').ilike('voucher_code', code);
      if (businessId) query = query.eq('business_id', businessId);
      const { data } = await query.single();
      if (data) loyaltyCard = data as LoyaltyCard;
    } catch {
      // Fallback
    }
  }

  if (!loyaltyCard) {
    const localCards = getStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, []);
    loyaltyCard = localCards.find(
      (c) => c.voucher_code.trim().toUpperCase() === code && (!businessId || c.business_id === businessId)
    ) || null;
  }

  if (loyaltyCard) {
    const isWalkIn = loyaltyCard.terms_conditions?.toLowerCase().includes('walk-in') || false;
    const isExpired = new Date(loyaltyCard.expires_at).getTime() < Date.now();
    const effectiveStatus: 'active' | 'redeemed' | 'expired' =
      loyaltyCard.status === 'redeemed' ? 'redeemed' : isExpired ? 'expired' : 'active';

    // Fetch business name from storage or demo
    const businesses = getStorage<Business[]>(STORAGE_KEYS.BUSINESSES, []);
    const biz = businesses.find((b) => b.id === loyaltyCard?.business_id);

    return {
      type: 'loyalty',
      id: loyaltyCard.id,
      voucher_code: loyaltyCard.voucher_code,
      reward_title: loyaltyCard.reward_title,
      reward_value: loyaltyCard.reward_value,
      customer_name: loyaltyCard.customer_name,
      customer_phone: loyaltyCard.customer_phone,
      status: effectiveStatus,
      created_at: loyaltyCard.created_at,
      expires_at: loyaltyCard.expires_at,
      redeemed_at: loyaltyCard.redeemed_at,
      redeemed_by: loyaltyCard.redeemed_by,
      source_type: isWalkIn ? 'walk_in' : 'google_review',
      source_label: isWalkIn ? '👤 Walk-in Loyalty Pass' : '⭐️ 5-Star Google Review Verified',
      source_description: isWalkIn
        ? 'Issued manually at store billing counter by cashier staff'
        : 'Earned automatically after submitting verified 5-Star Google Business review',
      business_id: loyaltyCard.business_id,
      business_name: biz?.business_name,
      business_phone: biz?.phone || biz?.whatsapp_number,
      business_logo: biz?.logo_url,
      terms_conditions: loyaltyCard.terms_conditions,
    };
  }

  // 3. Client fallback: Check Scratch Plays
  let scratchPlay: ScratchPlay | null = null;
  if (supabase) {
    try {
      let query = supabase.from('scratch_plays').select('*').ilike('voucher_code', code);
      if (businessId) query = query.eq('business_id', businessId);
      const { data } = await query.single();
      if (data) scratchPlay = data as ScratchPlay;
    } catch {
      // Fallback
    }
  }

  if (!scratchPlay) {
    const localPlays = getStorage<ScratchPlay[]>(STORAGE_KEYS.SCRATCH_PLAYS, []);
    scratchPlay = localPlays.find(
      (p) => p.voucher_code.trim().toUpperCase() === code && (!businessId || p.business_id === businessId)
    ) || null;
  }

  if (scratchPlay) {
    const isExpired = new Date(scratchPlay.expires_at).getTime() < Date.now();
    const effectiveStatus: 'active' | 'redeemed' | 'expired' =
      scratchPlay.status === 'redeemed' ? 'redeemed' : isExpired ? 'expired' : 'active';

    const businesses = getStorage<Business[]>(STORAGE_KEYS.BUSINESSES, []);
    const biz = businesses.find((b) => b.id === scratchPlay?.business_id);

    return {
      type: 'scratch',
      id: scratchPlay.id,
      voucher_code: scratchPlay.voucher_code,
      reward_title: scratchPlay.reward_title,
      reward_value: scratchPlay.reward_value,
      customer_name: scratchPlay.customer_name,
      customer_phone: scratchPlay.customer_phone,
      status: effectiveStatus,
      created_at: scratchPlay.created_at,
      expires_at: scratchPlay.expires_at,
      redeemed_at: scratchPlay.redeemed_at,
      redeemed_by: scratchPlay.redeemed_by,
      source_type: 'scratch_card',
      source_label: '🎉 Scratch & Win Lucky Draw',
      source_description: `Won on Scratch & Win promotional campaign coupon (${scratchPlay.reward_value})`,
      business_id: scratchPlay.business_id,
      business_name: biz?.business_name,
      business_phone: biz?.phone || biz?.whatsapp_number,
      business_logo: biz?.logo_url,
      terms_conditions: scratchPlay.min_purchase_amount || scratchPlay.terms_conditions,
    };
  }

  return null;
}

/**
 * Redeems a verified reward voucher
 */
export async function redeemRewardVoucher(
  details: VerifiedRewardDetails,
  redeemedBy: string = 'Counter Staff'
): Promise<VerifiedRewardDetails> {
  // 1. Try server endpoint
  try {
    const res = await fetch('/api/voucher/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: details.voucher_code,
        type: details.type,
        id: details.id,
        businessId: details.business_id,
        redeemedBy,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.details) {
        return data.details as VerifiedRewardDetails;
      }
    }
  } catch {
    // Continue client update
  }

  // 2. Client fallback update
  const now = new Date().toISOString();
  if (details.type === 'loyalty') {
    const cards = getStorage<LoyaltyCard[]>(STORAGE_KEYS.LOYALTY_CARDS, []);
    const idx = cards.findIndex((c) => c.id === details.id || c.voucher_code.toUpperCase() === details.voucher_code.toUpperCase());
    if (idx !== -1) {
      cards[idx] = {
        ...cards[idx],
        status: 'redeemed',
        redeemed_at: now,
        redeemed_by: redeemedBy,
      };
      setStorage(STORAGE_KEYS.LOYALTY_CARDS, cards);
    }
  } else {
    const plays = getStorage<ScratchPlay[]>(STORAGE_KEYS.SCRATCH_PLAYS, []);
    const idx = plays.findIndex((p) => p.id === details.id || p.voucher_code.toUpperCase() === details.voucher_code.toUpperCase());
    if (idx !== -1) {
      plays[idx] = {
        ...plays[idx],
        status: 'redeemed',
        redeemed_at: now,
        redeemed_by: redeemedBy,
      };
      setStorage(STORAGE_KEYS.SCRATCH_PLAYS, plays);
    }
  }

  return {
    ...details,
    status: 'redeemed',
    redeemed_at: now,
    redeemed_by: redeemedBy,
  };
}
