import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Smartphone,
  Lock,
  Sparkles,
  ShieldCheck,
  Zap,
  Loader2,
  Share2,
} from 'lucide-react';
import { Business } from '../types/database';
import {
  generateRewardPassDataUrl,
  downloadRewardPassImage,
  copyRewardPassImageToClipboard,
  shareRewardPassOnWhatsApp,
  buildFastRewardWhatsAppMessage,
  getRewardPassUrl,
} from '../lib/rewardCardGenerator';

export interface RewardVoucherShareData {
  id?: string;
  voucherCode: string;
  rewardTitle: string;
  rewardValue?: string;
  customerName: string;
  customerPhone: string;
  expiresAt: string;
  createdAt?: string;
  terms?: string;
  originLabel?: string;
  status?: 'active' | 'redeemed' | 'expired';
}

interface RewardWhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: RewardVoucherShareData | null;
  business: Business;
  bizMarketingPhone: string;
  onOpenBizPhoneModal: () => void;
  initialMode?: 'fast' | 'image' | 'text';
}

export const RewardWhatsAppShareModal: React.FC<RewardWhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  voucher,
  business,
  bizMarketingPhone,
  onOpenBizPhoneModal,
  initialMode = 'fast',
}) => {
  const [activeMode, setActiveMode] = useState<'fast' | 'image' | 'text'>(initialMode);
  const [imageQuality, setImageQuality] = useState<'fast' | 'hd'>('fast');
  const [dispatchChannel, setDispatchChannel] = useState<'app' | 'web'>('app');
  const [preloadedImage, setPreloadedImage] = useState<{ dataUrl: string; blob: Blob; filename: string } | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);

  // Sync initial mode on open
  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
      setShareSuccessNotice(null);
      setCopiedImage(false);
      setCopiedText(false);
    }
  }, [isOpen, initialMode]);

  // Pre-generate pass image with in-memory cache and turbo mode
  useEffect(() => {
    if (!isOpen || !voucher) {
      setPreloadedImage(null);
      return;
    }

    let isMounted = true;
    setIsGeneratingImage(true);

    generateRewardPassDataUrl({
      businessName: business.business_name || 'Store Partner',
      rewardTitle: voucher.rewardTitle,
      rewardValue: voucher.rewardValue || undefined,
      voucherCode: voucher.voucherCode,
      customerName: voucher.customerName,
      customerPhone: voucher.customerPhone,
      expiresAt: voucher.expiresAt,
      createdAt: voucher.createdAt,
      terms: voucher.terms || 'Present this pass at billing counter during checkout to claim your reward.',
      originLabel: voucher.originLabel || '⭐ Verified Customer Reward',
      quality: imageQuality,
    })
      .then((res) => {
        if (isMounted) {
          setPreloadedImage(res);
          setIsGeneratingImage(false);
        }
      })
      .catch((err) => {
        console.error('Error preloading reward image pass:', err);
        if (isMounted) setIsGeneratingImage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, voucher, business, imageQuality]);

  if (!isOpen || !voucher) return null;

  const bName = business.business_name || 'Our Store';
  const expiryFormatted = new Date(voucher.expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const passUrl = getRewardPassUrl(voucher.voucherCode);

  // Fast mode message (with rich digital pass link for instant 1-tap card opening)
  const fastMessage = buildFastRewardWhatsAppMessage({
    businessName: bName,
    voucherCode: voucher.voucherCode,
    rewardTitle: voucher.rewardTitle,
    rewardValue: voucher.rewardValue || undefined,
    customerName: voucher.customerName,
    expiresAt: voucher.expiresAt,
    terms: voucher.terms,
    bizMarketingPhone,
    businessAddress: business.address,
    status: voucher.status,
  });

  const contactLine = bizMarketingPhone
    ? `\n\n🏢 *Official Business Account:* ${bName}\n📱 *Store WhatsApp Account:* ${bizMarketingPhone}${
        business.address ? `\n📍 *Store Address:* ${business.address}` : ''
      }`
    : `\n\n🏢 *Official Business Account:* ${bName}`;

  // Plain text message (without web links)
  const plainTextMessage =
    voucher.status === 'redeemed'
      ? `🧾 *Official Reward Bill Receipt - ${bName}*\n\n` +
        `Hello ${voucher.customerName}! ✨\n` +
        `Your discount voucher *${voucher.voucherCode}* for *"${voucher.rewardTitle}"* has been successfully applied to your bill!\n\n` +
        `Thank you for shopping with us! Visit again soon for more exciting rewards.` +
        contactLine
      : `🌟 *VIP Customer Reward - ${bName}*\n\n` +
        `Hello ${voucher.customerName}! ✨\n` +
        `Congratulations! Here is your official VIP reward pass from *${bName}*:\n\n` +
        `🎟️ *Voucher Code:* ${voucher.voucherCode}\n` +
        `🎁 *Reward:* ${voucher.rewardTitle}${voucher.rewardValue ? ` (${voucher.rewardValue})` : ''}\n` +
        `⏳ *Valid Till:* ${expiryFormatted}\n` +
        `📍 *Terms:* ${voucher.terms || 'Present pass or voucher code at cashier counter during checkout'}\n\n` +
        `Show this pass at our billing counter to claim your discount!` +
        contactLine;

  const getCleanPhone = () => {
    let clean = voucher.customerPhone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = `91${clean}`;
    return clean;
  };

  const getDispatchUrlForText = (text: string) => {
    const clean = getCleanPhone();
    const encoded = encodeURIComponent(text);
    return dispatchChannel === 'web'
      ? `https://web.whatsapp.com/send?phone=${clean}&text=${encoded}`
      : `https://wa.me/${clean}?text=${encoded}`;
  };

  // Handler for sharing actual image
  const handleShareImage = async () => {
    if (!bizMarketingPhone) {
      onOpenBizPhoneModal();
      return;
    }

    setIsSharing(true);
    setShareSuccessNotice(null);

    try {
      const result = await shareRewardPassOnWhatsApp({
        businessName: bName,
        rewardTitle: voucher.rewardTitle,
        rewardValue: voucher.rewardValue || undefined,
        voucherCode: voucher.voucherCode,
        customerName: voucher.customerName,
        customerPhone: voucher.customerPhone,
        expiresAt: voucher.expiresAt,
        createdAt: voucher.createdAt,
        terms: voucher.terms || 'Present this pass at billing counter during checkout to claim your reward.',
        originLabel: voucher.originLabel || '⭐ Verified Customer Reward',
        targetPhone: voucher.customerPhone,
        shareText: fastMessage,
        dispatchMode: dispatchChannel,
        quality: imageQuality,
        preloaded: preloadedImage || undefined,
      });

      if (result.method === 'native_share') {
        if (result.success) {
          setShareSuccessNotice('✅ Shared reward image pass directly via WhatsApp!');
        }
      } else {
        setShareSuccessNotice(
          '✅ Image copied to clipboard! WhatsApp Web opened — press Ctrl+V in the chat to paste and send the image instantly.'
        );
      }
    } catch (err) {
      console.error('Failed to share image:', err);
    } finally {
      setIsSharing(false);
    }
  };

  // Handler for copying image
  const handleCopyImageOnly = async () => {
    const success = await copyRewardPassImageToClipboard(
      {
        businessName: bName,
        rewardTitle: voucher.rewardTitle,
        rewardValue: voucher.rewardValue || undefined,
        voucherCode: voucher.voucherCode,
        customerName: voucher.customerName,
        customerPhone: voucher.customerPhone,
        expiresAt: voucher.expiresAt,
        createdAt: voucher.createdAt,
        terms: voucher.terms || 'Present this pass at billing counter during checkout to claim your reward.',
        originLabel: voucher.originLabel || '⭐ Verified Customer Reward',
        quality: imageQuality,
      },
      preloadedImage || undefined
    );

    if (success) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
      setShareSuccessNotice('📋 Reward pass image copied! Simply press Ctrl+V in WhatsApp chat.');
    } else {
      await handleDownloadOnly();
    }
  };

  // Handler for downloading image
  const handleDownloadOnly = async () => {
    if (preloadedImage) {
      const link = document.createElement('a');
      link.download = preloadedImage.filename;
      link.href = preloadedImage.dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareSuccessNotice('⬇️ VIP Pass PNG downloaded successfully!');
      return;
    }

    await downloadRewardPassImage({
      businessName: bName,
      rewardTitle: voucher.rewardTitle,
      rewardValue: voucher.rewardValue || undefined,
      voucherCode: voucher.voucherCode,
      customerName: voucher.customerName,
      customerPhone: voucher.customerPhone,
      expiresAt: voucher.expiresAt,
      createdAt: voucher.createdAt,
      terms: voucher.terms || 'Present this pass at billing counter during checkout to claim your reward.',
      originLabel: voucher.originLabel || '⭐ Verified Customer Reward',
      quality: imageQuality,
    });
    setShareSuccessNotice('⬇️ VIP Pass downloaded successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-neutral-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Share Customer Reward on WhatsApp</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-emerald-100 font-medium">
                  Customer: <strong className="text-white">{voucher.customerName}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleShareImage}
                  title="Click this number to send image directly to customer's WhatsApp"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Zap className="w-3 h-3 fill-slate-950 text-slate-950" />
                  <span>⚡ Click Number: {voucher.customerPhone} (1-Click Send Image)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="font-mono bg-white/20 text-white font-black px-2.5 py-0.5 rounded-lg border border-white/20">
              Code: {voucher.voucherCode}
            </span>
            <span className="truncate text-emerald-100 max-w-xs">{voucher.rewardTitle}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Format Switcher: 3 Options (Fast Instant vs Image Pass vs Plain Text) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                Choose WhatsApp Send Mode:
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                Fast Option Available
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-neutral-100 rounded-2xl border border-neutral-200">
              {/* Option 1: Fast WhatsApp (Instant 1-Click with Digital Pass Link) */}
              <button
                type="button"
                onClick={() => {
                  setActiveMode('fast');
                  setShareSuccessNotice(null);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeMode === 'fast'
                    ? 'bg-white text-emerald-900 shadow-sm border border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-black">⚡ Fast Option</span>
                </div>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded-full">
                  Instant (0s)
                </span>
              </button>

              {/* Option 2: Image Pass (Turbo PNG) */}
              <button
                type="button"
                onClick={() => {
                  setActiveMode('image');
                  setShareSuccessNotice(null);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeMode === 'image'
                    ? 'bg-white text-emerald-900 shadow-sm border border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>🖼️ Pass Image</span>
                </div>
                <span className="text-[9px] text-neutral-500">PNG Visual Card</span>
              </button>

              {/* Option 3: Plain Text */}
              <button
                type="button"
                onClick={() => {
                  setActiveMode('text');
                  setShareSuccessNotice(null);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeMode === 'text'
                    ? 'bg-white text-emerald-900 shadow-sm border border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  <span>📝 Text Only</span>
                </div>
                <span className="text-[9px] text-neutral-500">Letter Format</span>
              </button>
            </div>
          </div>

          {/* Dispatch Channel Toggle: WhatsApp Web (PC) vs WhatsApp App (Mobile) */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
            <span className="font-semibold text-neutral-600">Counter Target:</span>
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-neutral-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setDispatchChannel('web')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dispatchChannel === 'web'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Use WhatsApp Web on counter PC"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>PC (WhatsApp Web)</span>
              </button>
              <button
                type="button"
                onClick={() => setDispatchChannel('app')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  dispatchChannel === 'app'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Use WhatsApp App on Mobile / Tablet"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile App</span>
              </button>
            </div>
          </div>

          {/* MODE 1: ⚡ FAST WHATSAPP (INSTANT 1-CLICK SEND) */}
          {activeMode === 'fast' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <Zap className="w-5 h-5 text-amber-600 fill-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 space-y-0.5">
                  <p className="font-black flex items-center gap-1.5">
                    ⚡ Fast Option — 1-Click Instant Send (Zero Waiting)
                  </p>
                  <p className="text-amber-900/80 text-[11px] leading-relaxed">
                    Image generation ya upload karne mein samay barbad nahi hota! Customer ko WhatsApp par complete
                    voucher details aur <strong>Official Digital Pass Link</strong> mil jata hai. Link kholte hi unka
                    VIP card aur QR code screen par instant open ho jata hai.
                  </p>
                </div>
              </div>

              {/* Fast Message Preview */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    Instant WhatsApp Preview (With Digital Pass Card Link):
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto Rich Card Preview
                  </span>
                </div>
                <div className="p-3.5 bg-neutral-900 text-neutral-100 rounded-2xl font-mono text-xs whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto border border-neutral-800">
                  {fastMessage}
                </div>
              </div>

              {/* Action Buttons for Fast Mode */}
              <div className="space-y-2">
                {bizMarketingPhone ? (
                  <a
                    href={getDispatchUrlForText(fastMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setShareSuccessNotice('🚀 WhatsApp opened instantly! 0-second fast dispatch.');
                    }}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                    <span>⚡ Send Instant WhatsApp (Fast 1-Click)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenBizPhoneModal}
                    className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-rose-600" />
                    <span>Setup Store Number to Send on WhatsApp</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(fastMessage);
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2500);
                      setShareSuccessNotice('📋 Fast message content copied to clipboard!');
                    }}
                    className="py-2.5 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>

                  <a
                    href={passUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Digital Pass</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: 🖼️ IMAGE PASS (TURBO OPTIMIZED) */}
          {activeMode === 'image' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-2.5 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs">
                <div className="flex items-center gap-2 text-purple-950">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-bold">Actual VIP Pass Image (PNG)</span>
                </div>

                {/* Quality Toggle: Fast Turbo vs Ultra HD */}
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-purple-200 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setImageQuality('fast')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      imageQuality === 'fast'
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    ⚡ Turbo Fast
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageQuality('hd')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      imageQuality === 'hd'
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    🎨 Ultra HD
                  </button>
                </div>
              </div>

              {/* Real-time Image Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-950 flex flex-col items-center justify-center p-3 text-white">
                {isGeneratingImage ? (
                  <div className="py-12 flex flex-col items-center gap-2 text-neutral-300">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs font-semibold">Preparing Instant Pass Image...</span>
                  </div>
                ) : preloadedImage ? (
                  <div className="w-full flex flex-col items-center space-y-1.5">
                    <div className="relative max-h-52 overflow-hidden rounded-xl border border-neutral-700/80 shadow-lg group">
                      <img
                        src={preloadedImage.dataUrl}
                        alt="Reward Pass Preview"
                        className="w-full max-h-52 object-contain mx-auto"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyImageOnly}
                          className="px-3 py-1.5 bg-white text-neutral-900 text-xs font-bold rounded-lg shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5 text-neutral-700" />
                          <span>Copy Image (Ctrl+V)</span>
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {imageQuality === 'fast' ? '⚡ Turbo Compressed PNG (Instant)' : '🎨 Ultra HD 900×1160 Print PNG'}
                    </span>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-neutral-400">Preview not available</div>
                )}
              </div>

              {/* Tip for desktop WhatsApp web */}
              {dispatchChannel === 'web' && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                  <Laptop className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Desktop WhatsApp Web Fast Trick:</strong> Neeche diye <strong>"⚡ Fast Copy Image"</strong>{' '}
                    par click karein aur WhatsApp chat khulte hi <strong>Ctrl + V</strong> daba kar direct send karein!
                  </div>
                </div>
              )}

              {/* Action Buttons for Image */}
              <div className="space-y-2">
                {bizMarketingPhone ? (
                  <button
                    type="button"
                    onClick={handleShareImage}
                    disabled={isSharing || isGeneratingImage}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Image...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 text-emerald-200" />
                        <span>Send Pass Image (WhatsApp)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenBizPhoneModal}
                    className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-rose-600" />
                    <span>Setup Store Number to Send on WhatsApp</span>
                  </button>
                )}

                {/* Instant Actions: Copy & Download */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleCopyImageOnly}
                    disabled={isGeneratingImage}
                    className="py-2.5 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Copy image so you can paste (Ctrl+V) directly into WhatsApp Web chat"
                  >
                    {copiedImage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Image Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-600" />
                        <span>⚡ Fast Copy Image</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadOnly}
                    disabled={isGeneratingImage}
                    className="py-2.5 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: 📝 PLAIN TEXT MODE */}
          {activeMode === 'text' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-2.5">
                <MessageSquare className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-950 space-y-0.5">
                  <p className="font-bold">Standard Text Letter Format</p>
                  <p className="text-neutral-600 text-[11px]">
                    Simple text message without images or web links.
                  </p>
                </div>
              </div>

              {/* Text Message Preview Box */}
              <div className="relative">
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                  Message Preview:
                </label>
                <div className="p-3.5 bg-neutral-900 text-neutral-100 rounded-2xl font-mono text-xs whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto border border-neutral-800">
                  {plainTextMessage}
                </div>
              </div>

              {/* Action Buttons for Text */}
              <div className="space-y-2">
                {bizMarketingPhone ? (
                  <a
                    href={getDispatchUrlForText(plainTextMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setShareSuccessNotice('🚀 WhatsApp opened with text letter!');
                    }}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Phone className="w-4 h-4 text-emerald-200" />
                    <span>Send Plain Text Message (WhatsApp)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenBizPhoneModal}
                    className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-rose-600" />
                    <span>Setup Store Number to Send on WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(plainTextMessage);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2500);
                    setShareSuccessNotice('📋 Text letter copied to clipboard!');
                  }}
                  className="w-full py-2.5 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Copy Plain Text Content</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Feedback & Notice Banner */}
          {shareSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{shareSuccessNotice}</div>
            </div>
          )}

          {/* Store Account Identity Verification Card */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-neutral-900">Sender: {bName}</span>
                {bizMarketingPhone ? (
                  <span className="text-neutral-600 ml-1.5">({bizMarketingPhone})</span>
                ) : (
                  <span className="text-rose-600 font-bold ml-1.5">No business number registered</span>
                )}
              </div>
            </div>

            <span className="text-[10px] text-neutral-500 font-medium">
              🔒 Super Admin number is never used
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
