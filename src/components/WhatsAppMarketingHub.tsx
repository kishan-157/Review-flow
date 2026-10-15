import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Zap,
  Image as ImageIcon,
  Phone,
  Search,
  Filter,
  Check,
  Copy,
  ExternalLink,
  Download,
  Gift,
  Trophy,
  Sparkles,
  Lock,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Laptop,
  Users,
  Tag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Business, LoyaltyCard } from '../types/database';
import { ScratchPlay } from '../types/database';
import {
  RewardDownloadOptions,
  sendRewardImageDirectToWhatsAppNumber,
  getRewardPassUrl,
  buildFastRewardWhatsAppMessage,
} from '../lib/rewardCardGenerator';
import { getScratchPlaysByBusiness } from '../lib/db';
import { calculateDaysRemaining } from '../lib/reminderService';

interface WhatsAppMarketingHubProps {
  business: Business;
  loyaltyCards: LoyaltyCard[];
  bizMarketingPhone: string;
  onOpenBizPhoneModal: () => void;
  onOpenShareModal: (voucher: any, mode: 'fast' | 'image' | 'text') => void;
  onNavigateToReminders?: () => void;
}

export const WhatsAppMarketingHub: React.FC<WhatsAppMarketingHubProps> = ({
  business,
  loyaltyCards,
  bizMarketingPhone,
  onOpenBizPhoneModal,
  onOpenShareModal,
  onNavigateToReminders,
}) => {
  // Scratch plays state
  const [scratchPlays, setScratchPlays] = useState<ScratchPlay[]>([]);
  const [loadingPlays, setLoadingPlays] = useState<boolean>(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'loyalty' | 'scratch'>('all');

  // Direct 1-Click Dispatch Tool State
  const [manualPhone, setManualPhone] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [selectedRewardPreset, setSelectedRewardPreset] = useState<string>('festive_20');
  const [customRewardTitle, setCustomRewardTitle] = useState('Festive VIP Pass: Flat 20% OFF');
  const [customVoucherCode, setCustomVoucherCode] = useState(() => `MKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [lastDispatchedNotice, setLastDispatchedNotice] = useState<{
    phone: string;
    customer: string;
    method: string;
  } | null>(null);

  // Load scratch plays on mount
  useEffect(() => {
    let isMounted = true;
    const fetchScratch = async () => {
      if (!business?.id) return;
      try {
        setLoadingPlays(true);
        const data = await getScratchPlaysByBusiness(business.id);
        if (isMounted) setScratchPlays(data || []);
      } catch (err) {
        console.error('Failed to load scratch plays for WhatsApp marketing', err);
      } finally {
        if (isMounted) setLoadingPlays(false);
      }
    };
    fetchScratch();
    return () => {
      isMounted = false;
    };
  }, [business?.id]);

  // Real-time calculation of strictly 7 days, 3 days, and today remaining cards
  const reminderCounts = useMemo(() => {
    let sevenDays = 0;
    let threeDays = 0;
    let today = 0;

    loyaltyCards.forEach((c) => {
      if (c.status === 'active') {
        const days = calculateDaysRemaining(c.expires_at);
        if (days === 7) sevenDays++;
        if (days === 3) threeDays++;
        if (days === 0) today++;
      }
    });

    return { sevenDays, threeDays, today };
  }, [loyaltyCards]);

  // Combined rewards list from loyalty cards and scratch plays
  const combinedRewards = useMemo(() => {
    const list: Array<{
      id: string;
      source: 'loyalty' | 'scratch';
      customerName: string;
      customerPhone: string;
      voucherCode: string;
      rewardTitle: string;
      rewardValue?: string;
      expiresAt: string;
      createdAt: string;
      status: 'active' | 'redeemed';
      terms?: string;
    }> = [];

    // Loyalty cards with completed stamps or rewards
    // Loyalty cards with completed stamps or rewards
    loyaltyCards.forEach((card) => {
      if (card.customer_phone) {
        const collected = card.stamps_collected || 0;
        const total = card.stamps_total || 6;
        list.push({
          id: `loyalty_${card.id}`,
          source: 'loyalty',
          customerName: card.customer_name || 'Loyal Member',
          customerPhone: card.customer_phone,
          voucherCode: card.voucher_code || `LOY-${card.id.substring(0, 6).toUpperCase()}`,
          rewardTitle: card.reward_title || 'Stamp Loyalty Reward Pass',
          rewardValue: card.reward_value || (collected >= total ? 'Completed Reward' : `${collected}/${total} Stamps`),
          expiresAt: card.expires_at || new Date(Date.now() + 30 * 86400000).toISOString(),
          createdAt: card.created_at || new Date().toISOString(),
          status: card.status === 'redeemed' ? 'redeemed' : 'active',
          terms: card.terms_conditions || 'Show this pass at billing counter to claim loyalty stamp or redemption.',
        });
      }
    });

    // Scratch plays
    scratchPlays.forEach((play) => {
      if (play.customer_phone) {
        list.push({
          id: `scratch_${play.id}`,
          source: 'scratch',
          customerName: play.customer_name || 'Lucky Player',
          customerPhone: play.customer_phone,
          voucherCode: play.voucher_code || `SCR-${play.id.substring(0, 6).toUpperCase()}`,
          rewardTitle: play.reward_title || 'Scratch & Win Discount Coupon',
          rewardValue: play.reward_value,
          expiresAt: play.expires_at || new Date(Date.now() + 15 * 86400000).toISOString(),
          createdAt: play.scratched_at || play.created_at || new Date().toISOString(),
          status: play.status === 'redeemed' ? 'redeemed' : 'active',
          terms: play.terms_conditions || 'Valid for single use during checkout at cashier counter.',
        });
      }
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loyaltyCards, scratchPlays]);

  // Filtered rewards
  const filteredRewards = useMemo(() => {
    return combinedRewards.filter((item) => {
      if (activeFilter === 'loyalty' && item.source !== 'loyalty') return false;
      if (activeFilter === 'scratch' && item.source !== 'scratch') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.customerName.toLowerCase().includes(q);
        const matchPhone = item.customerPhone.toLowerCase().includes(q);
        const matchCode = item.voucherCode.toLowerCase().includes(q);
        const matchReward = item.rewardTitle.toLowerCase().includes(q);
        return matchName || matchPhone || matchCode || matchReward;
      }
      return true;
    });
  }, [combinedRewards, activeFilter, searchQuery]);

  // 1-Click Direct WhatsApp Image Sender
  const handleDirect1ClickSend = async (reward: {
    customerPhone: string;
    customerName: string;
    voucherCode: string;
    rewardTitle: string;
    rewardValue?: string;
    expiresAt: string;
    status: string;
    terms?: string;
  }) => {
    if (!bizMarketingPhone) {
      onOpenBizPhoneModal();
      return;
    }

    try {
      setIsSendingDirect(true);
      const res = await sendRewardImageDirectToWhatsAppNumber({
        targetPhone: reward.customerPhone,
        businessName: business.business_name,
        rewardTitle: reward.rewardTitle,
        rewardValue: reward.rewardValue,
        voucherCode: reward.voucherCode,
        customerName: reward.customerName,
        customerPhone: reward.customerPhone,
        expiresAt: reward.expiresAt,
        terms: reward.terms,
        bizMarketingPhone,
        businessAddress: business.address,
        status: reward.status,
      });

      setLastDispatchedNotice({
        phone: reward.customerPhone,
        customer: reward.customerName,
        method: res.method === 'native_share' ? 'Mobile Share' : 'WhatsApp Web & Clipboard',
      });
    } catch (err: any) {
      console.error('Direct WhatsApp send failed', err);
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Preset campaigns
  const marketingPresets = [
    {
      id: 'festive_20',
      title: 'Festive VIP Pass: Flat 20% OFF',
      tag: 'Festival Special',
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'welcome_150',
      title: 'VIP Welcome Voucher: ₹150 OFF',
      tag: 'New Customer',
      color: 'from-purple-600 to-indigo-700',
    },
    {
      id: 'free_dessert',
      title: 'Complimentary Signature Item / Dessert',
      tag: 'Free Treat',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'weekend_special',
      title: 'Weekend Rush Hour: Buy 1 Get 1 (50% OFF)',
      tag: 'Weekend Rush',
      color: 'from-rose-500 to-pink-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Official Store Marketing Sender Badge */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-600/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-black flex items-center gap-1.5 uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 fill-emerald-300 text-emerald-300" />
                1-Click Direct WhatsApp Image Marketing
              </span>
              <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-bold">
                ⚡ 0-Second Delay
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              WhatsApp Marketing Hub (व्हाट्सएप मार्केटिंग)
            </h1>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Customer ke phone number par <strong>sirf ek click</strong> karte hi actual HD voucher image aur digital pass WhatsApp par dispatch ho jata hai. Koi manual save ya download ka intezar nahi!
            </p>
          </div>

          {/* Business Sender Contact Status */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 shrink-0 space-y-2">
            <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>Store WhatsApp Sender Number</span>
            </div>
            {bizMarketingPhone ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-base font-black text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{bizMarketingPhone}</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenBizPhoneModal}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Edit Sender Number</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs text-rose-300 font-bold block">
                  ⚠️ Store WhatsApp number not configured!
                </span>
                <button
                  type="button"
                  onClick={onOpenBizPhoneModal}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Setup Store Number</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Notice when sent */}
        {lastDispatchedNotice && (
          <div className="mt-4 p-3.5 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-100 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                ⚡ WhatsApp chat launched for <strong>{lastDispatchedNotice.customer}</strong> ({lastDispatchedNotice.phone})!
                Chat box mein <strong>Ctrl + V</strong> dabayein — Pass image clipboard mein copy ho chuki hai!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastDispatchedNotice(null)}
              className="text-white/60 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: INSTANT 1-CLICK DIRECT DISPATCHER TOOL */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <Send className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                1-Click Direct WhatsApp Image Sender (डायरेक्ट नंबर पर इमेज भेजें)
              </h2>
              <p className="text-xs text-slate-500">
                Kisi bhi customer ka number dalein aur <strong>[1-Click Send Image]</strong> dabayein — WhatsApp par direct HD image voucher dispatch hoga.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-black">
            ⚡ 1-Click Fast Mode
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Inputs & Template Selector */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Customer Phone Number *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    className="w-full pl-12 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Customer Name (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Campaign Preset Buttons */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">
                Select Promotional Reward Voucher to Send:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {marketingPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedRewardPreset(preset.id);
                      setCustomRewardTitle(preset.title);
                      setCustomVoucherCode(`MKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedRewardPreset === preset.id
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {preset.tag}
                      </span>
                      <span className="text-xs font-black text-slate-900 block mt-0.5">
                        {preset.title}
                      </span>
                    </div>
                    {selectedRewardPreset === preset.id && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Voucher Code & Expiry Preview */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400">Generated Code:</span>
                <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">
                  {customVoucherCode}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setCustomVoucherCode(`MKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)}
                className="text-[11px] text-[#6C3BFF] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New Code</span>
              </button>
            </div>

            {/* BIG 1-CLICK DISPATCH BUTTON */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={!manualPhone || manualPhone.length < 10 || isSendingDirect}
                onClick={() => {
                  handleDirect1ClickSend({
                    customerPhone: manualPhone,
                    customerName: manualCustomerName || 'Valued Customer',
                    voucherCode: customVoucherCode,
                    rewardTitle: customRewardTitle,
                    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
                    status: 'active',
                    terms: 'Present this digital pass at cashier counter to redeem discount.',
                  });
                }}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
                  !manualPhone || manualPhone.length < 10 || isSendingDirect
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300 animate-pulse" />
                <span>
                  {isSendingDirect
                    ? '⚡ Dispatching Image...'
                    : `⚡ 1-Click Send Image to ${manualPhone ? `+91 ${manualPhone}` : 'Customer Number'}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span className="flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span>Desktop: Auto-copied to clipboard</span>
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mobile: Direct file attachment</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Preview: Live Digital VIP Card Simulation */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Live Pass Image Card</span>
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                Official Digital Voucher
              </span>
            </div>

            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-inner space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-emerald-100">
                  {business.business_name}
                </span>
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-bold">
                  VIP PASS
                </span>
              </div>
              <h3 className="text-base font-black leading-snug">
                {customRewardTitle}
              </h3>
              <p className="text-[11px] text-emerald-100">
                For: {manualCustomerName || 'Valued Customer'} · {manualPhone ? `+91 ${manualPhone}` : '+91 XXXXX XXXXX'}
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Voucher Code</span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {customVoucherCode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Validity</span>
                <span className="font-medium text-slate-200">30 Days</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 bg-black/40 p-3 rounded-xl border border-white/5">
              <span className="text-slate-300 font-bold block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verification Protected:</span>
              </span>
              <p className="leading-relaxed">
                Jab WhatsApp khulega, message ke sath official verification QR link bhi hoga jisse customer turant phone par apna visual card khol sakte hain.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ALL CUSTOMER PASSES & REWARDS (WITH 1-CLICK NUMBER DISPATCH) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Customer Rewards Directory (कस्टमर नंबर पर 1-क्लिक इमेज भेजें)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                {filteredRewards.length} Customer Passes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kisi bhi customer ke <strong>phone number par click kijiye</strong> ya <strong>[⚡ 1-Click Send Image]</strong> dabayein — WhatsApp par turant image pass dispatch ho jayegi.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({combinedRewards.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('loyalty')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'loyalty'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gift className="w-3 h-3" />
              <span>Loyalty Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('scratch')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'scratch'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>Scratch Rewards</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone number, voucher code or reward title..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Customers Table with 1-Click Interactive Numbers */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Phone Number (1-Click Send)</th>
                <th className="py-3 px-4">Voucher & Reward</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Instant WhatsApp Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRewards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <p className="font-semibold text-sm">Koi customer reward nahi mila</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Upar diye gaye direct dispatcher se kisi bhi phone number par turant voucher image bhej sakte hain.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{reward.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Issued: {new Date(reward.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>

                    {/* Interactive Clickable Phone Number */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleDirect1ClickSend(reward)}
                        title="Click to send actual voucher image to this number on WhatsApp"
                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl border border-emerald-200/90 hover:border-emerald-600 transition-all cursor-pointer shadow-2xs font-mono font-bold"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white shrink-0" />
                        <span>{reward.customerPhone}</span>
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500 group-hover:text-amber-300 group-hover:fill-amber-300" />
                      </button>
                      <span className="block text-[10px] text-emerald-700/80 font-medium mt-0.5">
                        👆 Click number to send image
                      </span>
                    </td>

                    {/* Voucher Details */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs">
                        {reward.rewardTitle}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px]">
                        <span className="font-bold text-slate-700">{reward.voucherCode}</span>
                        {reward.status === 'redeemed' ? (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-bold">
                            Redeemed
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            Active Pass
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4">
                      {reward.source === 'loyalty' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                          <Gift className="w-3 h-3 text-amber-600" />
                          <span>Loyalty Stamp</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-bold">
                          <Trophy className="w-3 h-3 text-amber-500" />
                          <span>Scratch & Win</span>
                        </span>
                      )}
                    </td>

                    {/* Instant WhatsApp Action Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click Direct Image Send */}
                        <button
                          type="button"
                          onClick={() => handleDirect1ClickSend(reward)}
                          title="1-Click Direct WhatsApp Image Send to this customer"
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 text-xs"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span>1-Click Image</span>
                        </button>

                        {/* Open Full Share Modal */}
                        <button
                          type="button"
                          onClick={() => {
                            onOpenShareModal(
                              {
                                customerName: reward.customerName,
                                customerPhone: reward.customerPhone,
                                voucherCode: reward.voucherCode,
                                rewardTitle: reward.rewardTitle,
                                rewardValue: reward.rewardValue,
                                expiresAt: reward.expiresAt,
                                terms: reward.terms,
                                status: reward.status,
                              },
                              'image'
                            );
                          }}
                          title="Open Pass Image Modal"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 text-purple-600" />
                        </button>

                        {/* Text Only */}
                        <button
                          type="button"
                          onClick={() => {
                            onOpenShareModal(
                              {
                                customerName: reward.customerName,
                                customerPhone: reward.customerPhone,
                                voucherCode: reward.voucherCode,
                                rewardTitle: reward.rewardTitle,
                                rewardValue: reward.rewardValue,
                                expiresAt: reward.expiresAt,
                                terms: reward.terms,
                                status: reward.status,
                              },
                              'text'
                            );
                          }}
                          title="Open Text SMS/Letter Format"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: HOW 1-CLICK IMAGE DISPATCH WORKS EXPLANATION CARD */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black">
              1-Click Image Send Kaise Kaam Karta Hai? (Step-by-Step Guide)
            </h3>
            <p className="text-xs text-slate-400">
              WhatsApp web restrictions ke bavajood 100% automated aur fast delivery system.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-black text-white">Click On Customer Number</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Table ya POS screen par kisi bhi customer ke phone number ya <strong>[1-Click Image]</strong> button par click kijiye.
            </p>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-400 text-neutral-950 font-black text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-black text-white">Image Auto-Copied & Downloaded</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              System turant in-memory cache se HD digital pass render karta hai, clipboard me copy karta hai aur file download kar deta hai.
            </p>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-teal-400 text-neutral-950 font-black text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-black text-white">WhatsApp Chat Opens Instantly</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Usi customer ka chat window open ho jata hai pre-filled verification details ke sath. Bas <strong>Ctrl + V</strong> karke image send kar dijiye!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
