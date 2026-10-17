import React, { useState, useMemo } from 'react';
import {
  Cake,
  Sparkles,
  Gift,
  Calendar,
  Send,
  Copy,
  Check,
  Phone,
  User,
  PartyPopper,
  Download,
  Filter,
  Save,
  Clock,
  Tag,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Business, LoyaltyCard, ScratchPlay } from '../types/database';
import { issueLoyaltyCard, updateLoyaltyConfig, getLoyaltyConfig, getScratchPlaysByBusiness } from '../lib/db';
import { sendRewardImageDirectToWhatsAppNumber } from '../lib/rewardCardGenerator';

interface BirthdayCustomer {
  id: string;
  customerName: string;
  customerPhone: string;
  customerDob: string; // YYYY-MM-DD or MM-DD
  dobFormatted: string;
  dobDay: number;
  dobMonth: number;
  isToday: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
  daysUntilBirthday: number;
  source: string;
  voucherCode?: string;
  loyaltyCardId?: string;
}

interface BirthdayClubSectionProps {
  business: Business;
  loyaltyCards: LoyaltyCard[];
  scratchPlays?: ScratchPlay[];
  bizMarketingPhone?: string;
  onRefreshCards?: () => void;
  onOpenExportModal?: (filter: 'all' | 'active' | 'unclaimed_expired' | 'redeemed' | 'birthday_today' | 'birthday_month') => void;
  onUpdateBusiness?: (updated: Business) => void;
}

export const BirthdayClubSection: React.FC<BirthdayClubSectionProps> = ({
  business,
  loyaltyCards,
  scratchPlays = [],
  bizMarketingPhone,
  onRefreshCards,
  onOpenExportModal,
  onUpdateBusiness,
}) => {
  // Config state for Birthday Gift Offer
  const [offerTitle, setOfferTitle] = useState(
    business.birthday_reward_title || '🎂 Special Birthday Gift — Flat 20% OFF'
  );
  const [offerValue, setOfferValue] = useState(business.birthday_reward_value || '20% OFF');
  const [minSpend, setMinSpend] = useState(business.birthday_min_bill_amount || 'Min bill ₹250');
  const [validityDays, setValidityDays] = useState<number>(business.birthday_validity_days || 15);
  const [wishTemplate, setWishTemplate] = useState(
    business.birthday_wish_template ||
      `🎉 Happy Birthday {customer_name}! 🎂✨\n\nWarmest wishes from *{store_name}*! To celebrate your special day, we have unlocked an exclusive VIP Birthday Gift for you:\n\n🎁 *{reward_title}* ({reward_value})\n🎟️ *Voucher Code:* {voucher_code}\n🏷️ *Requirement:* {min_bill}\n⏳ *Valid Till:* {expires_at}\n\nPresent this code at our billing counter during checkout to enjoy your birthday treat! Have a fantastic day! 🍰🎈`
  );

  const [askBirthdayEnabled, setAskBirthdayEnabled] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active filter tab in the section
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'this_month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Status for sending / copying
  const [sendingCustomerId, setSendingCustomerId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [loadedScratchPlays, setLoadedScratchPlays] = useState<ScratchPlay[]>(scratchPlays);

  // Load initial ask_birthday toggle from loyalty config
  React.useEffect(() => {
    getLoyaltyConfig(business.id).then((c) => {
      if (c && typeof c.ask_birthday === 'boolean') {
        setAskBirthdayEnabled(c.ask_birthday);
      }
    });
  }, [business.id]);

  // Also fetch scratch plays if not already provided
  React.useEffect(() => {
    if (scratchPlays.length > 0) {
      setLoadedScratchPlays(scratchPlays);
    } else {
      getScratchPlaysByBusiness(business.id)
        .then((plays) => {
          if (plays && plays.length > 0) setLoadedScratchPlays(plays);
        })
        .catch(() => {});
    }
  }, [business.id, scratchPlays]);

  // Extract and calculate birthday info for all customers
  const birthdayCustomers = useMemo<BirthdayCustomer[]>(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate(); // 1-31

    const map = new Map<string, BirthdayCustomer>();

    // 1. Process Loyalty Cards
    loyaltyCards.forEach((c) => {
      const dobStr = c.customer_dob;
      if (!dobStr || !c.customer_phone) return;

      const parts = dobStr.split('-');
      if (parts.length < 2) return;

      // Handle both YYYY-MM-DD and MM-DD
      const m = parts.length === 3 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
      const d = parts.length === 3 ? parseInt(parts[2], 10) : parseInt(parts[1], 10);
      if (isNaN(m) || isNaN(d)) return;

      const isToday = m === currentMonth && d === currentDay;
      const isThisMonth = m === currentMonth;

      // Calculate days until birthday this year or next year
      let bdayThisYear = new Date(today.getFullYear(), m - 1, d);
      if (bdayThisYear.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
        bdayThisYear = new Date(today.getFullYear() + 1, m - 1, d);
      }
      const diffMs = bdayThisYear.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isThisWeek = diffDays >= 0 && diffDays <= 7;

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const dobFormatted = `${d} ${monthNames[m - 1]}`;

      const key = `${c.customer_phone.trim()}`;
      if (!map.has(key)) {
        map.set(key, {
          id: c.id,
          customerName: c.customer_name || 'Valued Customer',
          customerPhone: c.customer_phone,
          customerDob: dobStr,
          dobFormatted,
          dobDay: d,
          dobMonth: m,
          isToday,
          isThisWeek,
          isThisMonth,
          daysUntilBirthday: diffDays,
          source: c.issue_rating ? 'Google Review' : 'Loyalty Card',
          voucherCode: c.voucher_code,
          loyaltyCardId: c.id,
        });
      }
    });

    // 2. Process Scratch Plays if any have dob
    loadedScratchPlays.forEach((p) => {
      const dobStr = p.customer_dob;
      if (!dobStr || !p.customer_phone) return;

      const key = `${p.customer_phone.trim()}`;
      if (map.has(key)) return;

      const parts = dobStr.split('-');
      if (parts.length < 2) return;
      const m = parts.length === 3 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
      const d = parts.length === 3 ? parseInt(parts[2], 10) : parseInt(parts[1], 10);
      if (isNaN(m) || isNaN(d)) return;

      const isToday = m === currentMonth && d === currentDay;
      const isThisMonth = m === currentMonth;

      let bdayThisYear = new Date(today.getFullYear(), m - 1, d);
      if (bdayThisYear.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
        bdayThisYear = new Date(today.getFullYear() + 1, m - 1, d);
      }
      const diffMs = bdayThisYear.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isThisWeek = diffDays >= 0 && diffDays <= 7;

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const dobFormatted = `${d} ${monthNames[m - 1]}`;

      map.set(key, {
        id: `scratch_${p.id}`,
        customerName: p.customer_name || 'Lucky Player',
        customerPhone: p.customer_phone,
        customerDob: dobStr,
        dobFormatted,
        dobDay: d,
        dobMonth: m,
        isToday,
        isThisWeek,
        isThisMonth,
        daysUntilBirthday: diffDays,
        source: 'Scratch & Win',
        voucherCode: p.voucher_code,
      });
    });

    return Array.from(map.values()).sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  }, [loyaltyCards, loadedScratchPlays]);

  // Aggregate counts
  const counts = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let thisMonthCount = 0;

    birthdayCustomers.forEach((c) => {
      if (c.isToday) todayCount++;
      if (c.isThisWeek) upcomingCount++;
      if (c.isThisMonth) thisMonthCount++;
    });

    return {
      today: todayCount,
      upcoming: upcomingCount,
      thisMonth: thisMonthCount,
      total: birthdayCustomers.length,
    };
  }, [birthdayCustomers]);

  // Filtered customer list based on current active tab and search query
  const filteredList = useMemo(() => {
    return birthdayCustomers.filter((c) => {
      if (activeTab === 'today' && !c.isToday) return false;
      if (activeTab === 'upcoming' && !c.isThisWeek) return false;
      if (activeTab === 'this_month' && !c.isThisMonth) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.customerName.toLowerCase().includes(q);
        const matchesPhone = c.customerPhone.includes(q);
        const matchesDob = c.dobFormatted.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesDob) return false;
      }

      return true;
    });
  }, [birthdayCustomers, activeTab, searchQuery]);

  // Save Birthday Offer settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      // 1. Update Loyalty Config for ask_birthday toggle
      await updateLoyaltyConfig(business.id, {
        ask_birthday: askBirthdayEnabled,
      });

      // 2. Update Business record
      const updatedBusiness: Business = {
        ...business,
        birthday_offer_enabled: true,
        birthday_reward_title: offerTitle.trim(),
        birthday_reward_value: offerValue.trim(),
        birthday_min_bill_amount: minSpend.trim(),
        birthday_validity_days: validityDays,
        birthday_wish_template: wishTemplate.trim(),
      };

      if (onUpdateBusiness) {
        onUpdateBusiness(updatedBusiness);
      }

      setSaveSuccessMsg('✅ Birthday Club offer settings saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to save birthday settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Build personalized WhatsApp Birthday Wish text
  const buildWishText = (customer: BirthdayCustomer, voucherCode: string, expiryStr: string) => {
    const store = business.business_name || 'Our Store';
    return wishTemplate
      .replace(/{customer_name}/g, customer.customerName)
      .replace(/{store_name}/g, store)
      .replace(/{reward_title}/g, offerTitle)
      .replace(/{reward_value}/g, offerValue)
      .replace(/{voucher_code}/g, voucherCode)
      .replace(/{min_bill}/g, minSpend)
      .replace(/{expires_at}/g, expiryStr);
  };

  // Send Birthday Gift on WhatsApp
  const handleSendBirthdayGift = async (customer: BirthdayCustomer) => {
    setSendingCustomerId(customer.id);
    try {
      // 1. Issue a brand new, verified VIP Birthday Card
      const card = await issueLoyaltyCard({
        business_id: business.id,
        customer_name: customer.customerName,
        customer_phone: customer.customerPhone,
        customer_dob: customer.customerDob,
        reward_title: offerTitle,
        reward_value: offerValue,
        min_bill_amount: minSpend,
        validity_days: validityDays,
        terms_conditions: `Valid for 1-time redemption on your birthday celebration. ${minSpend}.`,
      });

      if (onRefreshCards) {
        onRefreshCards();
      }

      const expiryStr = new Date(card.expires_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // 2. Build pyara sa birthday greeting text
      const wishText = buildWishText(customer, card.voucher_code, expiryStr);

      // 3. Directly open WhatsApp for customer with preloaded birthday gift pass image and message!
      await sendRewardImageDirectToWhatsAppNumber({
        targetPhone: customer.customerPhone,
        businessName: business.business_name,
        rewardTitle: card.reward_title,
        rewardValue: card.reward_value,
        voucherCode: card.voucher_code,
        customerName: card.customer_name,
        customerPhone: card.customer_phone,
        expiresAt: card.expires_at,
        terms: card.terms_conditions,
        bizMarketingPhone: bizMarketingPhone,
        businessAddress: business.address,
        minBillAmount: minSpend,
        customShareText: wishText,
      });

      setActionSuccessNotice(`🎉 Birthday wish & voucher sent to ${customer.customerName}!`);
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to send birthday gift:', err);
    } finally {
      setSendingCustomerId(null);
    }
  };

  // Copy Birthday Wish to Clipboard
  const handleCopyWish = async (customer: BirthdayCustomer) => {
    const dummyExpiry = new Date();
    dummyExpiry.setDate(dummyExpiry.getDate() + validityDays);
    const expiryStr = dummyExpiry.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const text = buildWishText(customer, customer.voucherCode || 'BIRTHDAY-VIP', expiryStr);

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(customer.id);
      setTimeout(() => setCopiedId(null), 2500);
      setActionSuccessNotice('📋 Birthday wish copied to clipboard!');
      setTimeout(() => setActionSuccessNotice(null), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER: FESTIVE HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-600 via-purple-700 to-indigo-900 text-white p-6 sm:p-8 shadow-xl border border-pink-400/30">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pink-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-pink-100 border border-white/20 backdrop-blur-xs">
              <Cake className="w-4 h-4 text-amber-300" />
              <span>Customer Birthday Club & VIP Celebration Marketing</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Birthday Marketing & Automated Wishes 🎂
            </h2>
            <p className="text-xs sm:text-sm text-pink-100/90 leading-relaxed">
              Review dete waqt customer ki <strong>Date of Birth (DOB)</strong> capture karein aur unke Birthday par
              special gift offer & pyara sa WhatsApp wish bhejkar repeat customer banayein!
            </p>
          </div>

          {/* Quick Action: Export Birthday List */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {onOpenExportModal && (
              <button
                type="button"
                onClick={() => onOpenExportModal('birthday_today')}
                className="px-4 py-2.5 bg-white text-slate-950 font-black rounded-xl text-xs shadow-md hover:bg-pink-50 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-4 h-4 text-pink-600" />
                <span>Export Birthday List (CSV)</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 KPI METRICS STRIP */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Metric 1: Today's Birthday */}
          <div
            onClick={() => setActiveTab('today')}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
              activeTab === 'today'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                🎂 Today's Birthdays
              </span>
              <PartyPopper className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono">{counts.today}</div>
            <span className="text-[10px] opacity-80">
              {counts.today > 0 ? 'Send Wish Today!' : 'No birthdays today'}
            </span>
          </div>

          {/* Metric 2: Upcoming in 7 Days */}
          <div
            onClick={() => setActiveTab('upcoming')}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
              activeTab === 'upcoming'
                ? 'bg-pink-400 text-slate-950 border-pink-300 shadow-md font-bold'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                🎁 Upcoming (7 Days)
              </span>
              <Gift className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono">{counts.upcoming}</div>
            <span className="text-[10px] opacity-80">Next 7 days</span>
          </div>

          {/* Metric 3: This Month */}
          <div
            onClick={() => setActiveTab('this_month')}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
              activeTab === 'this_month'
                ? 'bg-purple-400 text-slate-950 border-purple-300 shadow-md font-bold'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                📅 This Month
              </span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono">{counts.thisMonth}</div>
            <span className="text-[10px] opacity-80">Current Month</span>
          </div>

          {/* Metric 4: Total Birthdays Captured */}
          <div
            onClick={() => setActiveTab('all')}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
              activeTab === 'all'
                ? 'bg-indigo-400 text-slate-950 border-indigo-300 shadow-md font-bold'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                👥 Total Captured
              </span>
              <User className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black font-mono">{counts.total}</div>
            <span className="text-[10px] opacity-80">Birthday Profiles</span>
          </div>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {actionSuccessNotice && (
        <div className="bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessNotice(null)}
            className="text-white hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* GRID: 2 COLUMNS (LEFT = BIRTHDAY CUSTOMERS LIST, RIGHT = BIRTHDAY GIFT OFFER CONFIGURATOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: BIRTHDAY CUSTOMERS DIRECTORY (2 COLS WIDE) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
            {/* Top Toolbar: Tabs + Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('today')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'today'
                      ? 'bg-white text-pink-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Cake className="w-3.5 h-3.5 text-pink-600" />
                  <span>Today ({counts.today})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'upcoming'
                      ? 'bg-white text-purple-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5 text-purple-600" />
                  <span>Next 7 Days ({counts.upcoming})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('this_month')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'this_month'
                      ? 'bg-white text-indigo-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>This Month ({counts.thisMonth})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All ({counts.total})
                </button>
              </div>

              {/* Live Search */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>

            {/* CUSTOMER CARDS LIST */}
            {filteredList.length === 0 ? (
              <div className="py-12 text-center bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <Cake className="w-10 h-10 text-neutral-300 mx-auto" />
                <h4 className="text-sm font-bold text-neutral-800">No Customers in this Category</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {counts.total === 0
                    ? 'Jab customer Google review dene ke baad card claim karega, tab unka Birthday record yahan automatic jud jayega.'
                    : 'Aap upar diye tabs se "All" ya "This Month" select karke baaki customers dekh sakte hain.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map((customer) => {
                  const isSending = sendingCustomerId === customer.id;
                  const isCopied = copiedId === customer.id;

                  return (
                    <div
                      key={customer.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        customer.isToday
                          ? 'bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50 border-pink-300 shadow-sm'
                          : 'bg-white border-neutral-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-neutral-900">
                            {customer.customerName}
                          </span>
                          {customer.isToday ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500 text-white shadow-xs animate-pulse flex items-center gap-1">
                              <PartyPopper className="w-3 h-3" />
                              🎉 Birthday Today!
                            </span>
                          ) : customer.daysUntilBirthday <= 7 ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              ⏳ in {customer.daysUntilBirthday} days
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-700">
                              🎂 {customer.dobFormatted}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                          <span className="font-mono text-neutral-800 flex items-center gap-1 font-semibold">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {customer.customerPhone}
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span className="flex items-center gap-1 text-purple-700 font-medium">
                            <Calendar className="w-3 h-3" />
                            DOB: <strong>{customer.dobFormatted}</strong>
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-[11px] text-neutral-500">{customer.source}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        {/* Copy Wish Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyWish(customer)}
                          className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-neutral-200"
                          title="Copy Birthday Greeting Message"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Send WhatsApp Birthday Wish & Voucher Gift Button */}
                        <button
                          type="button"
                          onClick={() => handleSendBirthdayGift(customer)}
                          disabled={isSending}
                          className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                            customer.isToday
                              ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-700 hover:from-pink-700 hover:to-indigo-800 text-white shadow-pink-500/20'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {isSending
                              ? 'Generating & Opening...'
                              : customer.isToday
                              ? '🎉 Send Birthday Wish & Gift'
                              : 'Send Advance Wish'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BIRTHDAY GIFT OFFER & WISH CONFIGURATOR */}
        <div className="space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-purple-600" />
                <span>Birthday Offer Configurator</span>
              </h3>
              <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-md">
                Customizable
              </span>
            </div>

            {saveSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold animate-in fade-in">
                {saveSuccessMsg}
              </div>
            )}

            {/* Toggle: Ask Birthday during review reward claim */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ask Customer Birthday</span>
                </label>
                <p className="text-[10px] text-neutral-500 leading-tight">
                  Customer se review ke baad Date of Birth mangega.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={askBirthdayEnabled}
                  onChange={(e) => setAskBirthdayEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Offer Title */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Birthday Gift Headline / Title
              </label>
              <input
                type="text"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="e.g. 🎉 Special Birthday Gift — Flat 25% OFF"
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-600 font-semibold"
              />
            </div>

            {/* Reward Value & Min Spend */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Gift Value / Discount
                </label>
                <input
                  type="text"
                  value={offerValue}
                  onChange={(e) => setOfferValue(e.target.value)}
                  placeholder="e.g. 20% OFF or Free Gift"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-600 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Min. Spend Required
                </label>
                <input
                  type="text"
                  value={minSpend}
                  onChange={(e) => setMinSpend(e.target.value)}
                  placeholder="e.g. Min bill ₹250"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-600 font-semibold"
                />
              </div>
            </div>

            {/* Validity Days */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Birthday Coupon Validity
              </label>
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-600 font-semibold cursor-pointer"
              >
                <option value={7}>7 Days (Recommended for Birthday Week)</option>
                <option value={15}>15 Days</option>
                <option value={30}>30 Days (Entire Birthday Month)</option>
              </select>
            </div>

            {/* WhatsApp Birthday Wish Template */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700">
                  Pyara Sa WhatsApp Wish Template
                </label>
                <span className="text-[10px] text-neutral-400">Variables auto-filled</span>
              </div>
              <textarea
                rows={6}
                value={wishTemplate}
                onChange={(e) => setWishTemplate(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-600 font-sans leading-relaxed"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Supported tags: {'{customer_name}'}, {'{store_name}'}, {'{reward_title}'}, {'{voucher_code}'}, {'{min_bill}'}, {'{expires_at}'}
              </p>
            </div>

            {/* Save Settings Button */}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingSettings ? 'Saving Settings...' : 'Save Birthday Club Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
