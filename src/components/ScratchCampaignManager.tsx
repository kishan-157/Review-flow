import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trophy,
  Save,
  Check,
  AlertCircle,
  Calendar,
  Layers,
  Users,
  Search,
  CheckCircle,
  BadgeCheck,
  Percent,
  Clock,
  ShieldCheck,
  Eye,
  Filter,
  Phone,
  User,
  Tag,
  Copy,
  Edit3,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Business, ScratchCampaign, ScratchPlay, RewardType, ScratchCampaignStatus } from '../types/database';
import {
  getScratchCampaign,
  updateScratchCampaign,
  getScratchPlaysByBusiness,
  redeemScratchVoucher,
  updateBusiness,
} from '../lib/db';
import { ScratchCardModal } from './ScratchCardModal';

interface ScratchCampaignManagerProps {
  business: Business;
  onPreviewOffer?: (campaign: ScratchCampaign) => void;
  onUpdateBusiness?: (updated: Business) => void;
}

export const ScratchCampaignManager: React.FC<ScratchCampaignManagerProps> = ({
  business,
  onPreviewOffer,
  onUpdateBusiness,
}) => {
  const [campaign, setCampaign] = useState<ScratchCampaign | null>(null);
  const [plays, setPlays] = useState<ScratchPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    campaign_name: string;
    description: string;
    reward_type: RewardType;
    reward_value: string;
    reward_headline: string;
    free_item_name: string;
    min_purchase_amount: string;
    start_date: string;
    expiry_date: string;
    validity_days_after_win: number;
    total_reward_quantity: number;
    per_customer_play_limit: number;
    status: ScratchCampaignStatus;
    terms_conditions: string;
  }>({
    campaign_name: 'Summer Scratch & Win Fiesta',
    description: 'Scratch and reveal an instant surprise discount or free item on your bill!',
    reward_type: 'discount_percentage',
    reward_value: '20% OFF',
    reward_headline: '🎉 You Won Flat 20% OFF!',
    free_item_name: 'Signature Dessert',
    min_purchase_amount: 'Min. bill ₹299',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    validity_days_after_win: 15,
    total_reward_quantity: 150,
    per_customer_play_limit: 1,
    status: 'draft',
    terms_conditions: 'Valid on dine-in & takeaway. Show the revealed digital coupon at billing. Single use only.',
  });

  // Cashier verification state
  const [redeemCode, setRedeemCode] = useState('');
  const [cashierSearchMode, setCashierSearchMode] = useState<'all' | 'phone' | 'name' | 'code'>('all');
  const [matchingPlays, setMatchingPlays] = useState<ScratchPlay[]>([]);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<ScratchPlay | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // Business Owner Separate Phone Configuration state for POS marketing
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [tempPhone, setTempPhone] = useState(business.whatsapp_number || business.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaveNotice, setPhoneSaveNotice] = useState<string | null>(null);
  const [copiedVoucherText, setCopiedVoucherText] = useState<string | null>(null);
  const [whatsappTargetMode, setWhatsappTargetMode] = useState<'app' | 'web'>('app');

  const businessPhone = business.whatsapp_number || business.phone || '';

  const getScratchWhatsAppDispatchUrl = (phone: string, text: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = `91${clean}`;
    const encoded = encodeURIComponent(text);
    return whatsappTargetMode === 'web'
      ? `https://web.whatsapp.com/send?phone=${clean}&text=${encoded}`
      : `https://wa.me/${clean}?text=${encoded}`;
  };

  const handleSaveBusinessPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    setPhoneSaveNotice(null);
    try {
      const clean = tempPhone.trim();
      const updated = await updateBusiness(business.id, {
        phone: clean || undefined,
        whatsapp_number: clean || undefined,
      });
      if (onUpdateBusiness) {
        onUpdateBusiness(updated);
      }
      setPhoneSaveNotice('Business separate number updated successfully!');
      setTimeout(() => {
        setShowPhoneModal(false);
        setPhoneSaveNotice(null);
      }, 1500);
    } catch (err: any) {
      setPhoneSaveNotice(err.message || 'Failed to update business number');
    } finally {
      setSavingPhone(false);
    }
  };

  const buildScratchMarketingMessage = (play: ScratchPlay) => {
    const expiryFormatted = new Date(play.expires_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const contactLine = businessPhone
      ? `\n\n🏢 *Official Business Account:* ${business.business_name}\n📱 *Store WhatsApp Account:* ${businessPhone}${business.address ? `\n📍 *Store Address:* ${business.address}` : ''}`
      : `\n\n🏢 *Official Business Account:* ${business.business_name}`;

    return (
      `🎉 *Scratch & Win Lucky Voucher - ${business.business_name}*\n\n` +
      `Hello ${play.customer_name}! 🌟\n` +
      `Congratulations! You unlocked a lucky prize from *${business.business_name}*:\n\n` +
      `🎟️ *Voucher Code:* ${play.voucher_code}\n` +
      `🎁 *Prize Won:* "${play.reward_title}" (${play.reward_value})\n` +
      `⏳ *Valid Till:* ${expiryFormatted}\n` +
      `📍 *Terms:* ${play.min_purchase_amount || 'Present at cashier counter during billing'}\n\n` +
      `Show this message at our billing counter during your visit to redeem!` +
      contactLine
    );
  };

  const buildScratchReceiptMessage = (play: ScratchPlay) => {
    const contactLine = businessPhone
      ? `\n\n🏢 *Official Store Account:* ${business.business_name}\n📱 *Business WhatsApp Contact:* ${businessPhone}${business.address ? `\n📍 *Store Address:* ${business.address}` : ''}`
      : `\n\n🏢 *${business.business_name}*`;

    return (
      `✅ *Bill Discount Applied at ${business.business_name}*\n\n` +
      `Hello ${play.customer_name}! 🎉\n` +
      `Your Scratch & Win coupon *${play.voucher_code}* (${play.reward_title} - ${play.reward_value}) was successfully redeemed and applied to your bill!\n\n` +
      `Thank you for shopping with *${business.business_name}*. We look forward to serving you again soon!` +
      contactLine
    );
  };

  // Table filter
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all');

  // Preview modal
  const [previewPlay, setPreviewPlay] = useState<ScratchPlay | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const camp = await getScratchCampaign(business.id);
      setCampaign(camp);
      setFormData({
        campaign_name: camp.campaign_name || '',
        description: camp.description || '',
        reward_type: camp.reward_type || 'discount_percentage',
        reward_value: camp.reward_value || '',
        reward_headline: camp.reward_headline || '',
        free_item_name: camp.free_item_name || '',
        min_purchase_amount: camp.min_purchase_amount || '',
        start_date: camp.start_date || new Date().toISOString().split('T')[0],
        expiry_date: camp.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        validity_days_after_win: camp.validity_days_after_win || 15,
        total_reward_quantity: camp.total_reward_quantity || 100,
        per_customer_play_limit: camp.per_customer_play_limit || 1,
        status: camp.status || 'draft',
        terms_conditions: camp.terms_conditions || '',
      });

      const customerPlays = await getScratchPlaysByBusiness(business.id);
      setPlays(customerPlays);
    } catch (err: any) {
      console.error('Failed to load scratch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business) {
      loadData();
    }
  }, [business.id]);

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const updated = await updateScratchCampaign(business.id, {
        campaign_name: formData.campaign_name.trim(),
        description: formData.description.trim(),
        reward_type: formData.reward_type,
        reward_value: formData.reward_value.trim(),
        reward_headline: formData.reward_headline.trim(),
        free_item_name: formData.free_item_name.trim(),
        min_purchase_amount: formData.min_purchase_amount.trim(),
        start_date: formData.start_date,
        expiry_date: formData.expiry_date,
        validity_days_after_win: Number(formData.validity_days_after_win),
        total_reward_quantity: Number(formData.total_reward_quantity),
        per_customer_play_limit: Number(formData.per_customer_play_limit),
        status: formData.status,
        terms_conditions: formData.terms_conditions.trim(),
      });
      setCampaign(updated);
      setSaveSuccess('Scratch & Win Campaign settings updated successfully!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save campaign settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (newStatus: ScratchCampaignStatus) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      const updated = await updateScratchCampaign(business.id, { status: newStatus });
      setCampaign(updated);
      setSaveSuccess(`Campaign status set to: ${newStatus.toUpperCase()}`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch {
      // ignore
    }
  };

  const handleRedeemVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = redeemCode.trim();
    if (!term) return;

    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemSuccess(null);
    setMatchingPlays([]);

    try {
      const qLower = term.toLowerCase();
      const digitsOnly = term.replace(/\D/g, '');

      // Check in local plays array first for matching customers
      let localMatches: ScratchPlay[] = [];
      if (cashierSearchMode === 'phone') {
        localMatches = plays.filter(
          (p) =>
            p.customer_phone.includes(term) ||
            (digitsOnly.length >= 4 && p.customer_phone.replace(/\D/g, '').includes(digitsOnly))
        );
      } else if (cashierSearchMode === 'name') {
        localMatches = plays.filter((p) => p.customer_name.toLowerCase().includes(qLower));
      } else if (cashierSearchMode === 'code') {
        localMatches = plays.filter((p) => p.voucher_code.toLowerCase().includes(qLower));
      } else {
        // Universal Smart Search
        localMatches = plays.filter((p) => {
          const matchCode = p.voucher_code.toLowerCase().includes(qLower);
          const matchName = p.customer_name.toLowerCase().includes(qLower);
          const matchPhone =
            p.customer_phone.includes(term) ||
            (digitsOnly.length >= 4 && p.customer_phone.replace(/\D/g, '').includes(digitsOnly));
          return matchCode || matchName || matchPhone;
        });
      }

      if (localMatches.length > 1) {
        setMatchingPlays(localMatches);
        const activeOne = localMatches.find((m) => m.status === 'active') || localMatches[0];
        setRedeemResult(activeOne);
      } else if (localMatches.length === 1) {
        setRedeemResult(localMatches[0]);
        setMatchingPlays([]);
      } else {
        // Call backend server directly to search and verify
        const redeemed = await redeemScratchVoucher(term, business.id, 'Counter Staff');
        setRedeemResult(redeemed);
        setMatchingPlays([]);
        setRedeemSuccess(`Voucher ${redeemed.voucher_code} successfully applied and marked REDEEMED!`);
        const freshPlays = await getScratchPlaysByBusiness(business.id);
        setPlays(freshPlays);
      }
    } catch (err: any) {
      setRedeemError(err.message || `No Scratch & Win coupon found matching "${term}".`);
      setRedeemResult(null);
    } finally {
      setRedeemLoading(false);
    }
  };

  const filteredPlays = plays.filter((p) => {
    const q = searchFilter.toLowerCase();
    const matchSearch =
      !q ||
      p.customer_name.toLowerCase().includes(q) ||
      p.customer_phone.toLowerCase().includes(q) ||
      p.voucher_code.toLowerCase().includes(q);

    const isExpired = new Date(p.expires_at).getTime() < Date.now();
    let currentStatus = p.status;
    if (currentStatus === 'active' && isExpired) currentStatus = 'expired';

    const matchStatus = statusFilter === 'all' || currentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner with Independent Enable / Disable Status */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-amber-200 border border-amber-300/30 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Independent Promotional Module</span>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                formData.status === 'active'
                  ? 'bg-emerald-500 text-neutral-950'
                  : formData.status === 'paused'
                  ? 'bg-amber-400 text-neutral-950'
                  : 'bg-neutral-800 text-white'
              }`}
            >
              Status: {formData.status}
            </span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Scratch & Win Offers (स्क्रैच कार्ड लॉटरी ऑफर्स)
          </h2>
          <p className="text-xs text-purple-100/90 leading-relaxed">
            Run optional promotional lucky draws independently from your Google Review rewards! Set prize caps, play limits per customer, and redeem verified scratch coupons directly at your cashier counter.
          </p>

          {/* Quick Status Buttons */}
          <div className="pt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleToggleStatus('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                formData.status === 'active'
                  ? 'bg-emerald-400 text-neutral-950 ring-2 ring-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Activate Campaign (Live)</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleStatus('paused')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                formData.status === 'paused'
                  ? 'bg-amber-400 text-neutral-950 ring-2 ring-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pause Campaign</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleStatus('draft')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                formData.status === 'draft'
                  ? 'bg-neutral-900 text-white ring-2 ring-white/30 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <span>Draft (Disabled)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                // Open test scratch card preview
                setPreviewPlay({
                  id: 'preview_demo',
                  campaign_id: campaign?.id || 'demo',
                  business_id: business.id,
                  customer_name: 'Preview Guest',
                  customer_phone: '+91 98765 43210',
                  voucher_code: 'SCR-PREVIEW',
                  reward_title: formData.reward_headline || '🎉 You Won Flat 20% OFF!',
                  reward_type: formData.reward_type,
                  reward_value: formData.reward_value,
                  min_purchase_amount: formData.min_purchase_amount,
                  terms_conditions: formData.terms_conditions,
                  status: 'active',
                  scratched_at: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 15 * 86400000).toISOString(),
                  created_at: new Date().toISOString(),
                });
              }}
              className="px-3.5 py-1.5 bg-white text-neutral-950 rounded-xl text-xs font-bold shadow-xs hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <Eye className="w-3.5 h-3.5 text-[#6C3BFF]" />
              <span>Interactive Scratch Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics: Mobile Touch Slider Carousel + Desktop Grid */}
      <div className="space-y-1.5">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1.5 pt-0.5">
          <div className="min-w-[65vw] sm:min-w-0 snap-center bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs shrink-0 sm:shrink flex flex-col justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Prize Pool Cap
            </span>
            <span className="text-xl font-black text-neutral-900 mt-1 block">
              {formData.total_reward_quantity}
            </span>
            <span className="text-[10px] text-neutral-500 mt-1 block">Max coupons available</span>
          </div>
          <div className="min-w-[65vw] sm:min-w-0 snap-center bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs shrink-0 sm:shrink flex flex-col justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Coupons Revealed
            </span>
            <span className="text-xl font-black text-purple-700 mt-1 block">
              {plays.length}
            </span>
            <span className="text-[10px] text-neutral-500 mt-1 block">By customer plays</span>
          </div>
          <div className="min-w-[65vw] sm:min-w-0 snap-center bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs shrink-0 sm:shrink flex flex-col justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Redeemed at Counter
            </span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">
              {plays.filter((p) => p.status === 'redeemed').length}
            </span>
            <span className="text-[10px] text-neutral-500 mt-1 block">Verified by cashier</span>
          </div>
          <div className="min-w-[65vw] sm:min-w-0 snap-center bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs shrink-0 sm:shrink flex flex-col justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Play Limit / Customer
            </span>
            <span className="text-xl font-black text-amber-700 mt-1 block">
              {formData.per_customer_play_limit} Play
            </span>
            <span className="text-[10px] text-neutral-500 mt-1 block">Duplicate prevention</span>
          </div>
        </div>
        <div className="flex sm:hidden items-center justify-between text-[10px] text-neutral-400 px-1">
          <span>👈 Swipe scratch stats 👉</span>
          <span className="font-semibold text-purple-700">4 Cards</span>
        </div>
      </div>

      {/* CASHIER POS REDEMPTION MODULE (VOUCHER CODE OR MOBILE NUMBER) */}
      <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  Billing Counter POS (Scratch Voucher & Phone Redemption)
                </h3>
                <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  ⚡ Mobile Number Supported
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Customer ka 10-digit mobile number, customer name ya voucher code (SCR-XXXX) daal kar coupon verify aur redeem karein.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            Staff POS Billing Tool
          </span>
        </div>

        {/* DEDICATED SENDER IDENTITY BAR: BUSINESS OWNER SEPARATE NUMBER */}
        {!businessPhone ? (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <Lock className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-rose-950">Customer Messages Strictly Blocked</span>
                  <span className="text-[10px] font-black bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full border border-rose-300">
                    🔒 Business Setup Number Missing
                  </span>
                  <span className="text-[10px] font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-full">
                    Super Admin Blocked
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 mt-1">
                  Jab tak aap apna setup number nahi dalte, tab tak <strong>koi bhi marketing ya receipt message nahi jayega</strong>. Super admin ke number se message bilkul nahi jayega.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempPhone('');
                setShowPhoneModal(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-md shadow-rose-600/20"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>+ Add Setup Number to Unlock</span>
            </button>
          </div>
        ) : (
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex flex-col gap-3 text-xs shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Phone className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-neutral-900 text-sm">
                      Store WhatsApp Account: {business.business_name}
                    </span>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✅ Active Merchant Account
                    </span>
                    <span className="text-[10px] font-bold text-neutral-700 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                      🔒 Super Admin Account Disconnected
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    Registered Store WhatsApp:{' '}
                    <strong className="font-mono text-emerald-950 bg-white px-2 py-0.5 rounded-md border border-emerald-300 text-xs">
                      {businessPhone}
                    </strong>
                    <span className="text-neutral-500 text-[10px] ml-2">
                      (All Scratch vouchers & bill receipts originate exclusively from this business number)
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTempPhone(businessPhone);
                  setShowPhoneModal(true);
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-2xs hover:scale-[1.01]"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>Change Business Account</span>
              </button>
            </div>

            {/* WhatsApp Dispatch Mode for Billing Counter PC vs Mobile */}
            <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-neutral-600 font-semibold">POS Dispatch Channel:</span>
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-amber-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setWhatsappTargetMode('web')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      whatsappTargetMode === 'web'
                        ? 'bg-amber-700 text-white shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                    title="Opens WhatsApp Web (web.whatsapp.com) where your store account is logged in"
                  >
                    💻 WhatsApp Web (Counter PC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsappTargetMode('app')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      whatsappTargetMode === 'app'
                        ? 'bg-amber-700 text-white shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                    title="Direct Click-to-Chat (wa.me) for mobile or WhatsApp App"
                  >
                    📱 WhatsApp App (Mobile)
                  </button>
                </div>
              </div>

              <span className="text-neutral-500 text-[10px]">
                {whatsappTargetMode === 'web'
                  ? '💡 Counter PC par web.whatsapp.com login rakhein taaki counter staff direct business account se bhej sake.'
                  : '💡 Direct wa.me link open hoga.'}
              </span>
            </div>
          </div>
        )}

        {/* Search Mode Selector Tabs - Mobile horizontal swipeable slider */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar snap-x">
          <button
            type="button"
            onClick={() => {
              setCashierSearchMode('all');
              setRedeemError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 snap-start whitespace-nowrap ${
              cashierSearchMode === 'all'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Smart Search (Any)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCashierSearchMode('phone');
              setRedeemError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 snap-start whitespace-nowrap ${
              cashierSearchMode === 'phone'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-amber-600" />
            <span>📱 Mobile Number</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCashierSearchMode('name');
              setRedeemError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 snap-start whitespace-nowrap ${
              cashierSearchMode === 'name'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>👤 Customer Name</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCashierSearchMode('code');
              setRedeemError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 snap-start whitespace-nowrap ${
              cashierSearchMode === 'code'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-amber-600" />
            <span>🎟️ Voucher Code</span>
          </button>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleRedeemVoucherSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            {cashierSearchMode === 'phone' ? (
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            ) : cashierSearchMode === 'name' ? (
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            ) : cashierSearchMode === 'code' ? (
              <Tag className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            ) : (
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            )}
            <input
              type="text"
              value={redeemCode}
              onChange={(e) => {
                const val = e.target.value;
                setRedeemCode(val);
                setRedeemError(null);
                setRedeemSuccess(null);
                if (!val.trim()) {
                  setMatchingPlays([]);
                  setRedeemResult(null);
                }
              }}
              placeholder={
                cashierSearchMode === 'phone'
                  ? 'Enter customer 10-digit mobile number (e.g. 9876543210)...'
                  : cashierSearchMode === 'name'
                  ? 'Enter customer name (e.g. Rahul, Pooja)...'
                  : cashierSearchMode === 'code'
                  ? 'Enter voucher code (e.g. SCR-7K9A)...'
                  : 'Search by mobile number, customer name, or voucher code...'
              }
              className="w-full pl-9 pr-10 py-2.5 text-xs font-medium bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            {redeemCode && (
              <button
                type="button"
                onClick={() => {
                  setRedeemCode('');
                  setRedeemResult(null);
                  setMatchingPlays([]);
                  setRedeemError(null);
                }}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer p-0.5"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={redeemLoading || !redeemCode.trim()}
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{redeemLoading ? 'Searching...' : 'Search & Verify'}</span>
          </button>
        </form>

        {/* Quick Pick: Recent Active Scratch Winners */}
        {plays.filter((p) => p.status === 'active' && new Date(p.expires_at).getTime() >= Date.now()).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1">
              <span>⚡ Quick Pick (Recent Winners):</span>
            </span>
            {plays
              .filter((p) => p.status === 'active' && new Date(p.expires_at).getTime() >= Date.now())
              .slice(0, 4)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setRedeemCode(p.customer_phone || p.voucher_code);
                    setRedeemResult(p);
                    setMatchingPlays([]);
                    setRedeemError(null);
                  }}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.02]"
                >
                  <span className="font-bold">{p.customer_name}</span>
                  <span className="text-amber-700 font-mono">({p.customer_phone.slice(-4)})</span>
                  <span className="text-[10px] font-bold bg-white text-amber-900 px-1 rounded border border-amber-300">
                    {p.voucher_code}
                  </span>
                </button>
              ))}
          </div>
        )}

        {/* Multiple Matching Plays Found */}
        {matchingPlays.length > 1 && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
              <span>Found {matchingPlays.length} coupons for this customer — Select one to redeem:</span>
              <span className="text-[11px] font-normal text-amber-700">Choose one</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {matchingPlays.map((mPlay) => (
                <div
                  key={mPlay.id}
                  onClick={() => {
                    setRedeemResult(mPlay);
                    setRedeemCode(mPlay.voucher_code);
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    redeemResult?.id === mPlay.id
                      ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white/80 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-neutral-900">{mPlay.customer_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      mPlay.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {mPlay.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">📱 {mPlay.customer_phone}</div>
                  <div className="text-[11px] font-mono font-bold text-purple-900 mt-0.5">🎟️ {mPlay.voucher_code} ({mPlay.reward_value})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification / Search Error */}
        {redeemError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center justify-between gap-2 font-bold animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{redeemError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCashierSearchMode('all');
                setRedeemError(null);
              }}
              className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer shrink-0"
            >
              Try Smart Search
            </button>
          </div>
        )}

        {/* Redeem Success */}
        {redeemSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between gap-2 font-bold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{redeemSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRedeemCode('');
                setRedeemResult(null);
                setMatchingPlays([]);
                setRedeemSuccess(null);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] rounded-lg transition-colors cursor-pointer"
            >
              Next Customer
            </button>
          </div>
        )}

        {/* Verified Coupon Details Box & Action Buttons */}
        {redeemResult && (
          <div className="p-4 bg-amber-50/70 rounded-xl border-2 border-amber-300 animate-in fade-in space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-amber-950 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {redeemResult.voucher_code}
                  </span>
                  {redeemResult.status === 'redeemed' ? (
                    <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3 text-neutral-500" />
                      Already Redeemed
                    </span>
                  ) : new Date(redeemResult.expires_at).getTime() < Date.now() ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                      Expired
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1 shadow-2xs">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Valid & Active Scratch Offer
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mt-1">
                  {redeemResult.reward_title} ({redeemResult.reward_value})
                </h4>
                <p className="text-xs text-neutral-600">
                  Customer: <strong className="text-neutral-900">{redeemResult.customer_name}</strong> (📱 {redeemResult.customer_phone})
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Valid Until: {new Date(redeemResult.expires_at).toLocaleDateString()} · {redeemResult.min_purchase_amount || 'Present at counter'}
                </p>
              </div>

              <div className="shrink-0 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPlay(redeemResult)}
                  className="px-3 py-2 bg-white border border-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  View Digital Card
                </button>

                {/* WhatsApp Marketing Message to Customer - STRICTLY LOCKED UNTIL SETUP NUMBER IS ENTERED */}
                {redeemResult.customer_phone && (
                  businessPhone ? (
                    <a
                      href={getScratchWhatsAppDispatchUrl(
                        redeemResult.customer_phone,
                        redeemResult.status === 'redeemed'
                          ? buildScratchReceiptMessage(redeemResult)
                          : buildScratchMarketingMessage(redeemResult)
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                      title={`Send WhatsApp from Store Account: ${business.business_name} (${businessPhone})`}
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{redeemResult.status === 'redeemed' ? 'Send Bill Receipt (WhatsApp)' : 'Send Voucher (WhatsApp)'}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempPhone('');
                        setShowPhoneModal(true);
                      }}
                      className="px-3 py-2 text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                      title="Setup number missing! Pehle setup number add karein. Super admin number se message nahi jayega."
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>🔒 Setup Number to Send WhatsApp</span>
                    </button>
                  )
                )}

                {/* Copy SMS / Text fallback - LOCKED IF NO BUSINESS PHONE */}
                <button
                  type="button"
                  onClick={() => {
                    if (!businessPhone) {
                      setTempPhone('');
                      setShowPhoneModal(true);
                      return;
                    }
                    const text = redeemResult.status === 'redeemed'
                      ? buildScratchReceiptMessage(redeemResult)
                      : buildScratchMarketingMessage(redeemResult);
                    navigator.clipboard.writeText(text);
                    setCopiedVoucherText(redeemResult.id);
                    setTimeout(() => setCopiedVoucherText(null), 2500);
                  }}
                  className={`px-3 py-2 border rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                    !businessPhone
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
                  title={!businessPhone ? "Setup business number required" : "Copy message to clipboard"}
                >
                  {copiedVoucherText === redeemResult.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : !businessPhone ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Setup Number to Copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Copy SMS</span>
                    </>
                  )}
                </button>

                {/* Apply & Mark Redeemed Button */}
                {redeemResult.status === 'active' && new Date(redeemResult.expires_at).getTime() >= Date.now() && (
                  <button
                    type="button"
                    onClick={async () => {
                      setRedeemLoading(true);
                      try {
                        const redeemed = await redeemScratchVoucher(redeemResult.voucher_code, business.id, 'Counter Staff', redeemResult.id);
                        setRedeemResult(redeemed);
                        setRedeemSuccess(`Coupon ${redeemed.voucher_code} marked REDEEMED! Reward applied to bill.`);
                        const freshPlays = await getScratchPlaysByBusiness(business.id);
                        setPlays(freshPlays);
                      } catch (err: any) {
                        setRedeemError(err.message || 'Redemption failed.');
                      } finally {
                        setRedeemLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply & Mark Redeemed</span>
                  </button>
                )}
              </div>
            </div>

            {/* Warning when business setup number is missing */}
            {!businessPhone && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Customer Message Blocked:</strong> Setup number missing! Jab tak setup number add nahi hota, tab tak koi message nahi jayega. Super Admin number is strictly blocked.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTempPhone('');
                    setShowPhoneModal(true);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                >
                  + Add Setup Number Now
                </button>
              </div>
            )}

            {/* Business Separate Sender Note */}
            <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-900">
              <span className="flex items-center gap-1">
                {businessPhone ? (
                  <span>📱 <strong>Sender Identity:</strong> Messages dispatched with business contact: <strong>{businessPhone}</strong></span>
                ) : (
                  <span className="text-rose-700 font-bold">🔒 Messages blocked until business setup number is configured</span>
                )}
              </span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                🔒 Super Admin number is NOT used
              </span>
            </div>
          </div>
        )}
      </div>

      {/* TWO COLUMN WORKSPACE: SETTINGS FORM & PLAYED VOUCHERS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scratch Campaign Configuration (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Campaign Configuration
              </h3>
              <p className="text-[11px] text-neutral-500">
                Rules, rewards, and play limitations
              </p>
            </div>
            <span className="text-[11px] font-bold text-neutral-500">
              ID: {campaign?.id || 'new'}
            </span>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveCampaign} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={formData.campaign_name}
                onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                placeholder="e.g. Festive Scratch & Win"
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                Campaign Description / Teaser *
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Scratch and win instant discounts on your meal!"
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Reward Type *
                </label>
                <select
                  value={formData.reward_type}
                  onChange={(e) => setFormData({ ...formData, reward_type: e.target.value as RewardType })}
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                >
                  <option value="discount_percentage">Percentage Discount</option>
                  <option value="discount_fixed">Fixed Amount Off</option>
                  <option value="free_item">Free Item / Dessert</option>
                  <option value="custom">Custom Reward</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Prize Value Badge *
                </label>
                <input
                  type="text"
                  required
                  value={formData.reward_value}
                  onChange={(e) => setFormData({ ...formData, reward_value: e.target.value })}
                  placeholder="e.g. 20% OFF or ₹150 OFF"
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                />
              </div>
            </div>

            {formData.reward_type === 'free_item' && (
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Free Item / Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.free_item_name}
                  onChange={(e) => setFormData({ ...formData, free_item_name: e.target.value })}
                  placeholder="e.g. Chocolate Brownie with Ice Cream"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                Winning Card Headline (What winner sees) *
              </label>
              <input
                type="text"
                required
                value={formData.reward_headline}
                onChange={(e) => setFormData({ ...formData, reward_headline: e.target.value })}
                placeholder="e.g. 🎉 You Won Flat 20% OFF!"
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Minimum Purchase Amount
                </label>
                <input
                  type="text"
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                  placeholder="e.g. Min. bill ₹299"
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Coupon Validity (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={formData.validity_days_after_win}
                  onChange={(e) => setFormData({ ...formData, validity_days_after_win: parseInt(e.target.value) || 15 })}
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Total Prize Pool Quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={formData.total_reward_quantity}
                  onChange={(e) => setFormData({ ...formData, total_reward_quantity: parseInt(e.target.value) || 100 })}
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                />
                <span className="text-[10px] text-neutral-400">Total winners allowed</span>
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Play Limit / Customer *
                </label>
                <select
                  value={formData.per_customer_play_limit}
                  onChange={(e) => setFormData({ ...formData, per_customer_play_limit: parseInt(e.target.value) || 1 })}
                  className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                >
                  <option value={1}>1 Play per Customer</option>
                  <option value={2}>2 Plays per Customer</option>
                  <option value={3}>3 Plays per Customer</option>
                </select>
                <span className="text-[10px] text-neutral-400">Enforced by phone #</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                Campaign Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ScratchCampaignStatus })}
                className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF] font-semibold"
              >
                <option value="draft">Draft (Disabled / Not visible to customers)</option>
                <option value="active">Active (Live & playable)</option>
                <option value="paused">Paused (Temporarily on hold)</option>
                <option value="expired">Expired (Closed)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={formData.terms_conditions}
                onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                placeholder="e.g. Valid on dine-in only. Present code at billing."
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Campaign Settings'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Customer Scratch Plays & Redemption Audit (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Customer Scratch Vouchers ({plays.length})
              </h3>
              <p className="text-[11px] text-neutral-500">
                Prizes determined and claimed by customers
              </p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-[11px]">
              {(['all', 'active', 'redeemed', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by customer name, phone, or voucher code..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Customer Plays Table / List */}
          {filteredPlays.length === 0 ? (
            <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              <Trophy className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-700">No Scratch Vouchers Yet</p>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto mt-1">
                When you activate this campaign, customers can scratch cards to reveal promotional coupons.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredPlays.map((play) => {
                const isExpired = new Date(play.expires_at).getTime() < Date.now();
                const isRedeemed = play.status === 'redeemed';

                return (
                  <div
                    key={play.id}
                    className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl hover:bg-neutral-100/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">{play.customer_name}</span>
                        <span className="text-neutral-500 font-mono text-[11px]">{play.customer_phone}</span>
                        {isRedeemed ? (
                          <span className="px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded text-[9px] font-bold">
                            REDEEMED
                          </span>
                        ) : isExpired ? (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded text-[9px] font-bold">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600 text-[11px]">
                        <span>Prize: <strong className="text-purple-700">{play.reward_title}</strong></span>
                        <span>·</span>
                        <span className="font-mono font-bold text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                          {play.voucher_code}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block">
                        Won on {new Date(play.created_at).toLocaleDateString()} · Valid until {new Date(play.expires_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setPreviewPlay(play)}
                        className="px-2.5 py-1.5 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-[11px] font-bold cursor-pointer"
                        title="View Scratch Card"
                      >
                        View Card
                      </button>
                      {play.customer_phone && (
                        businessPhone ? (
                          <a
                            href={getScratchWhatsAppDispatchUrl(
                              play.customer_phone,
                              isRedeemed ? buildScratchReceiptMessage(play) : buildScratchMarketingMessage(play)
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-neutral-200"
                            title={`Send WhatsApp from Store Account: ${business.business_name} (${businessPhone})`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempPhone('');
                              setShowPhoneModal(true);
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                            title="Setup business number required. Super admin number is blocked."
                          >
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        )
                      )}
                      {!isRedeemed && !isExpired && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await redeemScratchVoucher(play.voucher_code, business.id, 'Counter Staff', play.id);
                              loadData();
                            } catch (e: any) {
                              alert(e.message);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs cursor-pointer"
                        >
                          Redeem
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Business Phone / WhatsApp Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Phone className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Connect Business Owner WhatsApp Account
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Official store marketing account for {business.business_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>🔒 Official Merchant Account Connection</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Scratch & Win POS counter se customer ko bheje jane wale sabhi WhatsApp & SMS vouchers aur receipts <strong>aapke is business WhatsApp account</strong> se dispatch honge. <strong>Super Admin ka account kabhi bhi use nahi hoga.</strong>
              </p>
            </div>

            {phoneSaveNotice && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                phoneSaveNotice.includes('success')
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}>
                {phoneSaveNotice}
              </div>
            )}

            <form onSubmit={handleSaveBusinessPhone} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Business Owner WhatsApp Number (Store Account) *
                </label>
                <input
                  type="text"
                  required
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210 or 9876543210"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Aapki dukaan / business ka apna WhatsApp number (e.g. +91 9876543210)
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPhone}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {savingPhone ? 'Saving...' : 'Connect Business WhatsApp Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Modal Preview */}
      {previewPlay && (
        <ScratchCardModal
          play={previewPlay}
          business={business}
          onClose={() => setPreviewPlay(null)}
        />
      )}
    </div>
  );
};
