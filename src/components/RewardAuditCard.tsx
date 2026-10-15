import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  Star,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Phone,
  User,
  Tag,
  Check,
  Copy,
  BadgeCheck,
  Store,
  HelpCircle,
  Download,
} from 'lucide-react';
import { RewardAuditDetails } from '../lib/rewardAudit';
import { downloadRewardPassImage } from '../lib/rewardCardGenerator';

interface RewardAuditCardProps {
  audit: RewardAuditDetails;
  onRedeem?: () => void;
  isRedeeming?: boolean;
  onClose?: () => void;
  showActions?: boolean;
}

export const RewardAuditCard: React.FC<RewardAuditCardProps> = ({
  audit,
  onRedeem,
  isRedeeming = false,
  onClose,
  showActions = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadPass = async () => {
    setIsDownloading(true);
    try {
      await downloadRewardPassImage({
        businessName: audit.business_name || 'Store Offer',
        rewardTitle: audit.reward_title,
        rewardValue: audit.reward_value || undefined,
        voucherCode: audit.voucher_code,
        customerName: audit.customer_name,
        customerPhone: audit.customer_phone,
        expiresAt: audit.expires_at,
        createdAt: audit.created_at,
        terms: audit.terms_conditions || 'Present this pass at billing counter during checkout to claim your reward.',
        rewardType: audit.type === 'scratch' ? 'scratch' : 'loyalty',
        originLabel: audit.kaise_mila_title,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download pass', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(audit.voucher_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden text-neutral-900 animate-in fade-in zoom-in-98 duration-200">
      {/* Top Banner: Verification Status */}
      <div
        className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
          audit.is_redeemed
            ? 'bg-neutral-100 text-neutral-700 border-b border-neutral-200'
            : audit.is_expired
            ? 'bg-rose-50 text-rose-800 border-b border-rose-200'
            : 'bg-emerald-500 text-white shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2">
          {audit.is_redeemed ? (
            <BadgeCheck className="w-4 h-4 text-neutral-500" />
          ) : audit.is_expired ? (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-amber-200" />
          )}
          <span>
            {audit.is_redeemed
              ? 'ALREADY REDEEMED (पहले ही उपयोग हो चुका है)'
              : audit.is_expired
              ? 'OFFER EXPIRED (समय समाप्त)'
              : 'VERIFIED GENUINE REWARD (सत्यापित सक्रिय इनाम)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-black/15 font-bold tracking-wider">
            {audit.voucher_code}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white cursor-pointer ml-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* REWARD TITLE & VALUE */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                {audit.type === 'scratch' ? 'Scratch & Win Coupon' : 'Customer Loyalty Voucher'}
              </span>
              {audit.business_name && (
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Store className="w-3 h-3 text-neutral-400" />
                  {audit.business_name}
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-neutral-900 mt-1 leading-snug">
              {audit.reward_title}
            </h3>
            {audit.reward_description && (
              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                {audit.reward_description}
              </p>
            )}
          </div>

          {audit.reward_value && (
            <div className="shrink-0 px-3 py-1.5 bg-gradient-to-br from-amber-400 to-amber-500 text-neutral-950 font-black text-sm rounded-xl border border-amber-300 shadow-sm shadow-amber-500/20 text-center">
              {audit.reward_value}
            </div>
          )}
        </div>

        {/* KEY SECTION: KAB MILA & KAISE MILA (The user's direct requirement!) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. KAB MILA (WHEN RECEIVED) */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>कब मिला? (When Issued)</span>
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full">
                {audit.kab_mila_relative}
              </span>
            </div>

            <div className="pt-1">
              <p className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{audit.kab_mila_formatted}</span>
              </p>
              <p className="text-[11px] text-blue-800/80 mt-1">
                Issued timestamp registered in local/server database.
              </p>
            </div>
          </div>

          {/* 2. KAISE MILA (HOW EARNED) */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>कैसे मिला? (How Earned)</span>
              </span>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-200/70 px-2 py-0.5 rounded-full">
                Verified Origin
              </span>
            </div>

            <div className="pt-1 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                {audit.kaise_mila_type === 'google_review' ? (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-purple-950">{audit.kaise_mila_title}</span>
                  </div>
                ) : audit.kaise_mila_type === 'scratch_win' ? (
                  <div className="flex items-center gap-1 text-rose-500">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-purple-950">{audit.kaise_mila_title}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-purple-600">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-purple-950">{audit.kaise_mila_title}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-purple-900/80 leading-snug">
                {audit.kaise_mila_desc}
              </p>

              {audit.kaise_mila_stars && (
                <div className="flex items-center gap-1 text-amber-400 pt-0.5">
                  {Array.from({ length: audit.kaise_mila_stars }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                  <span className="text-[10px] text-neutral-600 font-semibold ml-1">
                    (5-Star Customer Rating)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CUSTOMER & EXPOSURE DETAILS */}
        <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-neutral-400" />
              Customer Details
            </span>
            <p className="font-bold text-neutral-900 text-sm">
              {audit.customer_name}
            </p>
            <p className="font-mono text-neutral-600 flex items-center gap-1">
              <Phone className="w-3 h-3 text-neutral-400" />
              {audit.customer_phone}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-neutral-400" />
              Validity & Rules
            </span>
            <p className="text-neutral-700">
              Valid Till: <strong className="text-neutral-900">{audit.expires_at_formatted}</strong>
            </p>
            {audit.min_purchase_amount && (
              <p className="text-[11px] text-neutral-500">
                Min Bill: {audit.min_purchase_amount}
              </p>
            )}
            {audit.terms_conditions && (
              <p className="text-[10px] text-neutral-400 truncate">
                {audit.terms_conditions}
              </p>
            )}
          </div>
        </div>

        {/* AUDIT LOG FOR REDEMPTION (IF PREVIOUSLY USED) */}
        {audit.is_redeemed && (
          <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-300 text-xs text-neutral-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-neutral-800">
              <BadgeCheck className="w-4 h-4 text-neutral-500" />
              <span>Redemption History (कब रिडीम हुआ)</span>
            </div>
            <p className="text-neutral-600">
              This reward was redeemed on <strong>{audit.redeemed_at_formatted || 'Earlier'}</strong> by <strong>{audit.redeemed_by || 'Store Staff'}</strong>.
            </p>
          </div>
        )}

        {/* ACTION BUTTONS (REDEEM, DOWNLOAD PASS, COPY CODE) */}
        {showActions && (
          <div className="pt-2 space-y-2">
            {audit.is_valid && onRedeem && (
              <button
                type="button"
                disabled={isRedeeming}
                onClick={onRedeem}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isRedeeming ? 'Applying Discount...' : 'Apply & Mark Redeemed (बिल में डिस्काउंट लगाएं)'}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPass}
                disabled={isDownloading}
                className="flex-1 py-2.5 px-3 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                title="Download verified digital reward pass image with QR code"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Pass Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>{isDownloading ? 'Saving...' : 'Download Pass (इनाम डाउनलोड करें)'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold border border-neutral-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
