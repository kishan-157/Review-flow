import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Filter,
  Check,
  Clock,
  AlertTriangle,
  Gift,
  Sparkles,
  Phone,
  User,
  Calendar,
  Tag,
  Search,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { LoyaltyCard, ScratchPlay, Business } from '../types/database';
import { getScratchPlaysByBusiness } from '../lib/db';

export interface ExportCustomerItem {
  id: string;
  voucherCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  rewardTitle: string;
  rewardValue: string;
  minBillAmount: string;
  status: 'active' | 'redeemed' | 'unclaimed_expired';
  isRedeemed: boolean;
  isExpired: boolean;
  isActive: boolean;
  issuedAt: string;
  issuedAtFormatted: string;
  expiresAt: string;
  expiresAtFormatted: string;
  redeemedAt?: string;
  redeemedAtFormatted?: string;
  redeemedBy?: string;
  source: 'Review Reward' | 'Scratch & Win' | 'VIP Loyalty';
}

interface ExportCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  loyaltyCards: LoyaltyCard[];
  initialFilter?: 'all' | 'active' | 'unclaimed_expired' | 'redeemed';
}

export const ExportCustomerModal: React.FC<ExportCustomerModalProps> = ({
  isOpen,
  onClose,
  business,
  loyaltyCards,
  initialFilter = 'all',
}) => {
  const [scratchPlays, setScratchPlays] = useState<ScratchPlay[]>([]);
  const [isLoadingScratch, setIsLoadingScratch] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unclaimed_expired' | 'redeemed'>(
    initialFilter
  );
  const [sourceFilter, setSourceFilter] = useState<'all' | 'loyalty' | 'scratch'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '7_days' | '30_days' | '90_days'>('all');
  const [phoneFormat, setPhoneFormat] = useState<'intl' | 'plain'>('intl'); // +91 vs 10 digits
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  // Fetch scratch plays on modal open so combined customer data is available
  useEffect(() => {
    if (!isOpen || !business?.id) return;
    let isMounted = true;
    setIsLoadingScratch(true);
    getScratchPlaysByBusiness(business.id)
      .then((plays) => {
        if (isMounted) {
          setScratchPlays(plays || []);
          setIsLoadingScratch(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading scratch plays for export:', err);
        if (isMounted) setIsLoadingScratch(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, business?.id]);

  // Sync initialFilter prop if changed
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter, isOpen]);

  // Combine and normalize all customer items
  const allCustomers = useMemo<ExportCustomerItem[]>(() => {
    const now = Date.now();
    const items: ExportCustomerItem[] = [];

    // 1. Map Loyalty Cards
    loyaltyCards.forEach((c) => {
      const expTime = new Date(c.expires_at).getTime();
      const isRedeemed = c.status === 'redeemed';
      const isExpired = !isRedeemed && expTime < now;
      const isActive = !isRedeemed && !isExpired;

      let computedStatus: 'active' | 'redeemed' | 'unclaimed_expired' = 'active';
      if (isRedeemed) computedStatus = 'redeemed';
      else if (isExpired) computedStatus = 'unclaimed_expired';

      items.push({
        id: `loyalty_${c.id}`,
        voucherCode: c.voucher_code,
        customerName: c.customer_name || 'Valued Customer',
        customerPhone: c.customer_phone,
        customerEmail: c.customer_email,
        rewardTitle: c.reward_title,
        rewardValue: c.reward_value,
        minBillAmount: c.min_bill_amount || 'Min bill ₹250',
        status: computedStatus,
        isRedeemed,
        isExpired,
        isActive,
        issuedAt: c.created_at,
        issuedAtFormatted: new Date(c.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        expiresAt: c.expires_at,
        expiresAtFormatted: new Date(c.expires_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        redeemedAt: c.redeemed_at,
        redeemedAtFormatted: c.redeemed_at
          ? new Date(c.redeemed_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : undefined,
        redeemedBy: c.redeemed_by,
        source: c.issue_rating ? 'Review Reward' : 'VIP Loyalty',
      });
    });

    // 2. Map Scratch & Win Plays
    scratchPlays.forEach((p) => {
      if (!p.customer_phone) return;
      const expTime = new Date(p.expires_at).getTime();
      const isRedeemed = p.status === 'redeemed';
      const isExpired = !isRedeemed && expTime < now;
      const isActive = !isRedeemed && !isExpired;

      let computedStatus: 'active' | 'redeemed' | 'unclaimed_expired' = 'active';
      if (isRedeemed) computedStatus = 'redeemed';
      else if (isExpired) computedStatus = 'unclaimed_expired';

      items.push({
        id: `scratch_${p.id}`,
        voucherCode: p.voucher_code,
        customerName: p.customer_name || 'Lucky Winner',
        customerPhone: p.customer_phone,
        customerEmail: p.customer_email,
        rewardTitle: p.reward_title,
        rewardValue: p.reward_value,
        minBillAmount: p.min_purchase_amount || 'Min bill ₹250',
        status: computedStatus,
        isRedeemed,
        isExpired,
        isActive,
        issuedAt: p.scratched_at || p.created_at,
        issuedAtFormatted: new Date(p.scratched_at || p.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        expiresAt: p.expires_at,
        expiresAtFormatted: new Date(p.expires_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        redeemedAt: p.redeemed_at,
        redeemedAtFormatted: p.redeemed_at
          ? new Date(p.redeemed_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : undefined,
        redeemedBy: p.redeemed_by,
        source: 'Scratch & Win',
      });
    });

    // Sort newest first
    return items.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }, [loyaltyCards, scratchPlays]);

  // Aggregate counts for quick export tabs
  const counts = useMemo(() => {
    let active = 0;
    let unclaimedExpired = 0;
    let redeemed = 0;

    allCustomers.forEach((item) => {
      if (item.status === 'active') active++;
      else if (item.status === 'unclaimed_expired') unclaimedExpired++;
      else if (item.status === 'redeemed') redeemed++;
    });

    return {
      all: allCustomers.length,
      active,
      unclaimedExpired,
      redeemed,
    };
  }, [allCustomers]);

  // Filtered dataset based on user selections
  const filteredCustomers = useMemo(() => {
    const now = Date.now();
    return allCustomers.filter((item) => {
      // 1. Status Filter
      if (statusFilter === 'active' && item.status !== 'active') return false;
      if (statusFilter === 'unclaimed_expired' && item.status !== 'unclaimed_expired') return false;
      if (statusFilter === 'redeemed' && item.status !== 'redeemed') return false;

      // 2. Source Filter
      if (sourceFilter === 'loyalty' && item.source === 'Scratch & Win') return false;
      if (sourceFilter === 'scratch' && item.source !== 'Scratch & Win') return false;

      // 3. Time Filter
      if (timeFilter !== 'all') {
        const itemTime = new Date(item.issuedAt).getTime();
        const diffDays = (now - itemTime) / (1000 * 60 * 60 * 24);
        if (timeFilter === '7_days' && diffDays > 7) return false;
        if (timeFilter === '30_days' && diffDays > 30) return false;
        if (timeFilter === '90_days' && diffDays > 90) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.customerName.toLowerCase().includes(q);
        const matchesPhone = item.customerPhone.includes(q);
        const matchesCode = item.voucherCode.toLowerCase().includes(q);
        const matchesReward = item.rewardTitle.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCode && !matchesReward) return false;
      }

      return true;
    });
  }, [allCustomers, statusFilter, sourceFilter, timeFilter, searchQuery]);

  // Format phone number according to selected format
  const formatPhoneNumber = (phone: string, mode: 'intl' | 'plain') => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (mode === 'plain') {
      if (clean.length > 10 && clean.startsWith('91')) {
        return clean.slice(2);
      }
      return clean;
    }
    // intl: +91
    if (clean.length === 10) clean = `91${clean}`;
    if (!clean.startsWith('+')) clean = `+${clean}`;
    return clean;
  };

  // CSV Generator function
  const exportToCSV = (itemsToExport: ExportCustomerItem[], filenameSegment: string) => {
    if (itemsToExport.length === 0) return;

    const headers = [
      'Customer Name',
      'Customer Phone',
      'Voucher Code',
      'Reward Title',
      'Reward Value',
      'Min Bill Amount',
      'Status',
      'Claim Status',
      'Issued Date',
      'Valid Till Date',
      'Redeemed Date',
      'Redeemed By Staff',
      'Campaign Source',
      'Customer Email',
    ];

    const rows = itemsToExport.map((item) => {
      let claimStatusText = 'Active (Unused)';
      if (item.status === 'redeemed') claimStatusText = 'Claimed & Redeemed';
      else if (item.status === 'unclaimed_expired') claimStatusText = 'Unclaimed (Expired / Never Claimed)';

      const phoneFormatted = formatPhoneNumber(item.customerPhone, phoneFormat);

      return [
        `"${item.customerName.replace(/"/g, '""')}"`,
        `"${phoneFormatted}"`,
        `"${item.voucherCode}"`,
        `"${item.rewardTitle.replace(/"/g, '""')}"`,
        `"${item.rewardValue}"`,
        `"${item.minBillAmount}"`,
        `"${item.status === 'active' ? 'Active' : item.status === 'redeemed' ? 'Redeemed' : 'Expired'}"`,
        `"${claimStatusText}"`,
        `"${item.issuedAtFormatted}"`,
        `"${item.expiresAtFormatted}"`,
        `"${item.redeemedAtFormatted || ''}"`,
        `"${item.redeemedBy || ''}"`,
        `"${item.source}"`,
        `"${item.customerEmail || ''}"`,
      ];
    });

    // UTF-8 BOM (\uFEFF) ensures Excel renders Indian currency symbols (₹) and non-ASCII properly
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeStore = (business.business_name || 'store')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `${filenameSegment}_${safeStore}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccessMsg(`✅ Downloaded ${itemsToExport.length} customers (${filenameSegment}) successfully!`);
    setTimeout(() => setDownloadSuccessMsg(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-neutral-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#1E1B4B] via-[#2E1065] to-[#4C1D95] text-white p-5 sm:p-6 shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Customer Audience & CSV Export
                </span>
                {isLoadingScratch && (
                  <span className="text-[10px] text-purple-200 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Syncing all plays...
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                Export Customer List (Filtered CSV)
              </h2>
              <p className="text-xs text-purple-200 mt-0.5">
                Download filtered lists for WhatsApp / SMS campaigns: Active customers, Unclaimed/Expired, or Redeemed.
              </p>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccessMsg && (
          <div className="bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              <span>{downloadSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setDownloadSuccessMsg(null)}
              className="text-white hover:underline text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* SECTION 1: QUICK 1-CLICK DOWNLOAD CARDS FOR TARGET AUDIENCES */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Quick 1-Click Audience Downloads:
              </span>
              <span className="text-[11px] text-neutral-400 font-semibold">
                Total Database: <strong>{counts.all}</strong> Customers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Active Reward Holders */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md">
                      Active Rewards
                    </span>
                    <span className="text-lg font-black text-emerald-950 font-mono">
                      {counts.active}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-emerald-950">Active Reward Customers</h4>
                  <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                    Jinke paas currently valid coupon hai aur unhone abhi claim nahi kiya hai.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const activeItems = allCustomers.filter((i) => i.status === 'active');
                    exportToCSV(activeItems, 'active_reward_customers');
                  }}
                  disabled={counts.active === 0}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Active ({counts.active})</span>
                </button>
              </div>

              {/* Card 2: Unclaimed & Expired Customers (Mila tha par claim nahi kiya) */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 hover:border-amber-400 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md">
                      Mila Par Claim Nahi Kiya
                    </span>
                    <span className="text-lg font-black text-amber-950 font-mono">
                      {counts.unclaimedExpired}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-amber-950">Unclaimed / Expired</h4>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Reward mila tha par counter par redeem nahi kiya aur expire ho gaya. Re-engagement ke liye best!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const unclaimedItems = allCustomers.filter((i) => i.status === 'unclaimed_expired');
                    exportToCSV(unclaimedItems, 'unclaimed_expired_customers');
                  }}
                  disabled={counts.unclaimedExpired === 0}
                  className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Unclaimed ({counts.unclaimedExpired})</span>
                </button>
              </div>

              {/* Card 3: Redeemed / Claimed Customers */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 hover:border-purple-300 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded-md">
                      Claimed & Redeemed
                    </span>
                    <span className="text-lg font-black text-purple-950 font-mono">
                      {counts.redeemed}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-purple-950">Redeemed Customers</h4>
                  <p className="text-[11px] text-purple-800/80 leading-relaxed">
                    Dukaan par aakar coupon successfully apply aur spend karne wale verified customers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const redeemedItems = allCustomers.filter((i) => i.status === 'redeemed');
                    exportToCSV(redeemedItems, 'redeemed_customers');
                  }}
                  disabled={counts.redeemed === 0}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Redeemed ({counts.redeemed})</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: CUSTOM ADVANCED FILTERS */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-neutral-600" />
                Customize Filters & Audience Segment:
              </span>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setSourceFilter('all');
                  setTimeFilter('all');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>

            {/* Filter Tabs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Status Filter Tab */}
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Reward Status:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl font-bold text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="all">🌟 All Statuses ({counts.all})</option>
                  <option value="active">🟢 Active Valid Rewards ({counts.active})</option>
                  <option value="unclaimed_expired">
                    🟡 Unclaimed & Expired ({counts.unclaimedExpired})
                  </option>
                  <option value="redeemed">🟣 Redeemed / Claimed ({counts.redeemed})</option>
                </select>
              </div>

              {/* 2. Source / Campaign Filter */}
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Program Source:
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl font-bold text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="all">All Programs (Loyalty + Scratch)</option>
                  <option value="loyalty">⭐ Google Reviews & Loyalty Cards</option>
                  <option value="scratch">🎲 Scratch & Win Lucky Draw</option>
                </select>
              </div>

              {/* 3. Timeline / Issued Period */}
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Issued Timeline:
                </label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl font-bold text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="all">All Time (Full History)</option>
                  <option value="7_days">Last 7 Days</option>
                  <option value="30_days">Last 30 Days</option>
                  <option value="90_days">Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* Row 2: Live Search & Phone Format Setting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, or voucher code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Phone format for WhatsApp / Excel */}
              <div className="flex items-center justify-between p-1.5 bg-white border border-neutral-200 rounded-xl text-xs px-3">
                <span className="text-[11px] font-bold text-neutral-600">Export Mobile Number As:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-neutral-800">
                    <input
                      type="radio"
                      name="phoneFormat"
                      checked={phoneFormat === 'intl'}
                      onChange={() => setPhoneFormat('intl')}
                      className="text-purple-600 cursor-pointer"
                    />
                    <span>+91 (WhatsApp)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-neutral-800">
                    <input
                      type="radio"
                      name="phoneFormat"
                      checked={phoneFormat === 'plain'}
                      onChange={() => setPhoneFormat('plain')}
                      className="text-purple-600 cursor-pointer"
                    />
                    <span>10-Digits (Excel)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: LIVE PREVIEW OF FILTERED CUSTOMERS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-700">
                  Customer Records to Export:
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                  {filteredCustomers.length} Matching Customers
                </span>
              </div>
              <span className="text-[11px] text-neutral-500">
                Previewing top {Math.min(filteredCustomers.length, 5)} records
              </span>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5">
                <Gift className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-bold text-neutral-700">No customers match this filter combination</p>
                <p className="text-[11px] text-neutral-400">
                  Try switching status or timeline filter to view more results.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-200 text-[11px] font-black text-neutral-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Mobile</th>
                      <th className="py-2.5 px-3">Code & Reward</th>
                      <th className="py-2.5 px-3">Min. Spend</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Issued</th>
                      <th className="py-2.5 px-3">Valid Till</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {filteredCustomers.slice(0, 5).map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-2 px-3 font-bold text-neutral-900 truncate max-w-[140px]">
                          {c.customerName}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-neutral-600">
                          {formatPhoneNumber(c.customerPhone, phoneFormat)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-black bg-purple-50 text-purple-900 px-1.5 py-0.5 rounded border border-purple-200">
                              {c.voucherCode}
                            </span>
                            <span className="text-[11px] text-neutral-800 font-semibold truncate max-w-[150px]">
                              {c.rewardTitle}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[11px] font-bold text-amber-700">
                          {c.minBillAmount}
                        </td>
                        <td className="py-2 px-3">
                          {c.status === 'active' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                              Active
                            </span>
                          ) : c.status === 'unclaimed_expired' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                              Unclaimed & Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-700 rounded-md border border-neutral-200">
                              Redeemed
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-neutral-500">
                          {c.issuedAtFormatted}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-neutral-500">
                          {c.expiresAtFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Primary Export Action */}
        <div className="p-4 sm:p-5 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-600">
            Selected: <strong className="text-neutral-950">{filteredCustomers.length}</strong> of{' '}
            {allCustomers.length} customers
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                let segmentName = 'filtered_customers';
                if (statusFilter === 'active') segmentName = 'active_reward_customers';
                else if (statusFilter === 'unclaimed_expired') segmentName = 'unclaimed_expired_customers';
                else if (statusFilter === 'redeemed') segmentName = 'redeemed_customers';
                else if (statusFilter === 'all') segmentName = 'all_customers';

                exportToCSV(filteredCustomers, segmentName);
              }}
              disabled={filteredCustomers.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Export {filteredCustomers.length} Customers (CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
