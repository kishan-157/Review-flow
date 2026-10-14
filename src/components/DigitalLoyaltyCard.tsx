import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Sparkles,
  Gift,
  Check,
  Copy,
  Share2,
  Calendar,
  Clock,
  ShieldCheck,
  Download,
  Store,
  Phone,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react';
import { LoyaltyCard, Business } from '../types/database';

interface DigitalLoyaltyCardProps {
  card: LoyaltyCard;
  business?: Business | null;
  onRedeem?: (cardId: string) => void;
  isStaffView?: boolean;
}

export const DigitalLoyaltyCard: React.FC<DigitalLoyaltyCardProps> = ({
  card,
  business,
  onRedeem,
  isStaffView = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrRendered, setQrRendered] = useState(false);

  // Generate QR verification code for this specific card
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // QR data encodes voucher code and business id for counter scanning
    const qrData = `LOCALBOOST-VOUCHER:${card.voucher_code}:${card.business_id}`;
    QRCode.toCanvas(
      canvas,
      qrData,
      {
        width: 130,
        margin: 1,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      },
      (err) => {
        if (!err) {
          setQrRendered(true);
        }
      }
    );
  }, [card.voucher_code, card.business_id]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(card.voucher_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleShareWhatsApp = () => {
    const bizName = business?.business_name || 'Our Store';
    const bizContact = business?.phone || business?.whatsapp_number;
    const contactLine = bizContact ? `\n\n🏢 *Store:* ${bizName}\n📞 *Contact Store:* ${bizContact}` : `\n\n🏢 *Store:* ${bizName}`;
    const text = `🎁 Here is my VIP Loyalty Card for *${bizName}*!\n\n` +
      `🎟️ *Voucher Code:* ${card.voucher_code}\n` +
      `🎉 *Reward:* ${card.reward_title}\n` +
      `⏳ *Valid Till:* ${new Date(card.expires_at).toLocaleDateString()}\n` +
      `📍 Show this message or code at the counter during billing to claim your reward!` +
      contactLine;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const isExpired = new Date(card.expires_at).getTime() < Date.now();
  const isRedeemed = card.status === 'redeemed';
  const expiresFormatted = new Date(card.expires_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-full max-w-md mx-auto">
      {/* CARD WRAPPER */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1E1B4B] via-[#2E1065] to-[#4C1D95] text-white p-6 shadow-2xl border border-purple-500/30 selection:bg-purple-300 selection:text-neutral-900">
        {/* Holographic glowing orb background effects */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Business Logo + VIP Badge */}
        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-purple-400/20 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/40 border border-purple-300/30 flex items-center justify-center shrink-0 shadow-inner">
              {business?.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.business_name}
                  className="w-8 h-8 rounded-lg object-contain"
                />
              ) : (
                <Store className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-wide truncate max-w-[170px]">
                {business?.business_name || 'LocalBoost Partner'}
              </h3>
              <p className="text-[10px] text-purple-200/80 uppercase tracking-widest font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Verified Google Reviewer
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 text-right">
            {isRedeemed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                <BadgeCheck className="w-3 h-3 text-neutral-400" />
                Redeemed
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-900/80 text-rose-200 border border-rose-700">
                Expired
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400 text-neutral-950 shadow-sm shadow-amber-400/30">
                <Gift className="w-3 h-3" />
                VIP Reward Active
              </span>
            )}
          </div>
        </div>

        {/* Reward Big Value & Title */}
        <div className="relative z-10 mb-5 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-purple-200 tracking-wide uppercase">
                Exclusive Customer Reward
              </p>
              <h4 className="text-xl font-extrabold text-white mt-0.5 leading-snug">
                {card.reward_title}
              </h4>
              <p className="text-xs text-purple-100/90 mt-1.5 leading-relaxed">
                {card.reward_description}
              </p>
            </div>
            {card.reward_value && (
              <div className="shrink-0 bg-linear-to-br from-amber-400 to-amber-500 text-neutral-950 font-black text-sm px-2.5 py-1.5 rounded-xl shadow-md shadow-amber-500/20 border border-amber-300">
                {card.reward_value}
              </div>
            )}
          </div>

          {card.terms_conditions && (
            <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] text-purple-200/80 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">{card.terms_conditions}</span>
            </div>
          )}
        </div>

        {/* Customer & Voucher Code Details */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Customer Info */}
          <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-400/20">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block">
              Issued To
            </span>
            <p className="text-xs font-bold text-white mt-0.5 truncate">
              {card.customer_name || 'Valued Guest'}
            </p>
            <p className="text-[11px] text-purple-200 font-mono mt-0.5">
              {card.customer_phone}
            </p>
          </div>

          {/* Expiry Date */}
          <div className="bg-purple-950/40 rounded-xl p-3 border border-purple-400/20">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block">
              Valid Until
            </span>
            <p className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              {expiresFormatted}
            </p>
            <p className="text-[10px] text-purple-200/80 mt-0.5">
              {isExpired ? 'Offer has expired' : 'Show at billing counter'}
            </p>
          </div>
        </div>

        {/* QR Code and Counter Redemption Section */}
        <div className="relative z-10 bg-white rounded-2xl p-4 text-neutral-900 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* QR Code for Staff Scanner */}
          <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-200 shadow-inner flex flex-col items-center shrink-0">
            <canvas ref={canvasRef} className="rounded-lg w-28 h-28" />
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
              Counter Scan QR
            </span>
          </div>

          {/* Voucher Code Box */}
          <div className="flex-1 w-full text-center sm:text-left space-y-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Unique Voucher Code
              </span>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="font-mono text-lg font-black tracking-wider text-purple-950 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                  {card.voucher_code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 text-neutral-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer border border-neutral-200"
                  title="Copy Voucher Code"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 leading-tight">
              Show this QR or Code to cashier during billing to apply your discount.
            </p>

            {/* Quick Redeem button for Staff / Cashier */}
            {isStaffView && !isRedeemed && !isExpired && onRedeem && (
              <button
                type="button"
                onClick={() => onRedeem(card.id)}
                className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark as Redeemed (Counter)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS (Share, Save to WhatsApp) */}
      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Save to WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleCopyCode}
          className="py-3 px-4 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-2xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          {copiedCode ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
