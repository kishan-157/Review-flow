import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Sparkles,
  Trophy,
  Gift,
  Check,
  Clock,
  ShieldCheck,
  Tag,
  Phone,
  User,
  Download,
  PartyPopper,
  Flame,
  ArrowRight,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import { ScratchCampaign, ScratchPlay, Business } from '../types/database';
import { checkScratchEligibility, executeScratchPlay } from '../lib/db';
import { downloadRewardPassImage, shareRewardPassOnWhatsApp } from '../lib/rewardCardGenerator';

interface InlineScratchCardProps {
  business: Business;
  campaign?: ScratchCampaign | null;
  customerName?: string;
  customerPhone?: string;
  onRewardUnlocked?: (play: ScratchPlay) => void;
  className?: string;
}

export const InlineScratchCard: React.FC<InlineScratchCardProps> = ({
  business,
  campaign,
  customerName: initialName = '',
  customerPhone: initialPhone = '',
  onRewardUnlocked,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Customer input state
  const [name, setName] = useState<string>(initialName);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Play & Scratch state
  const [activePlay, setActivePlay] = useState<ScratchPlay | null>(null);
  const [isScratched, setIsScratched] = useState<boolean>(false);
  const [scratchPercent, setScratchPercent] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Sync initial inputs
  useEffect(() => {
    if (initialName && !name) setName(initialName);
    if (initialPhone && !phone) setPhone(initialPhone);
  }, [initialName, initialPhone]);

  // Handle Play / Unlock
  const handleUnlockScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setUnlockError('Please enter your full name and mobile number.');
      return;
    }

    setIsUnlocking(true);
    setUnlockError(null);

    try {
      // 1. Check eligibility
      const elig = await checkScratchEligibility(business.id, phone);
      if (!elig.eligible) {
        setUnlockError(elig.reason || 'You have already played or are not eligible for this scratch card at this time.');
        setIsUnlocking(false);
        return;
      }

      // 2. Authoritative Server-side play
      const play = await executeScratchPlay({
        businessId: business.id,
        customerName: name.trim(),
        customerPhone: phone.trim(),
      });

      setActivePlay(play);
      setIsScratched(false);
      setScratchPercent(0);
      if (onRewardUnlocked) onRewardUnlocked(play);
    } catch (err: any) {
      setUnlockError(err?.message || 'Failed to unlock scratch card. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Canvas Scratching Setup
  useEffect(() => {
    if (!activePlay || isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset canvas and draw attractive scratch foil
    ctx.globalCompositeOperation = 'source-over';

    // Rich metallic gold/purple scratch gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#B45309');
    grad.addColorStop(0.25, '#F59E0B');
    grad.addColorStop(0.5, '#FDE68A');
    grad.addColorStop(0.75, '#D97706');
    grad.addColorStop(1, '#78350F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative pattern lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = -width; i < width * 2; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }

    // Top foil border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // Text on scratch foil
    ctx.fillStyle = '#78350F';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪙 LUCKY DRAW FOIL 🪙', width / 2, height / 2 - 18);

    ctx.fillStyle = '#1E1B4B';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('SCRATCH WITH FINGER', width / 2, height / 2 + 6);

    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('उंगली से घिसकर इनाम खोलें ✨', width / 2, height / 2 + 25);
  }, [activePlay, isScratched]);

  // Scratch Drawing Handlers
  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    // Check scratched percentage every few moves
    calculateScratchPercent();
  };

  const calculateScratchPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparentCount = 0;
      const totalPixels = pixels.length / 4;

      // Sample every 8th pixel for speed
      for (let i = 3; i < pixels.length; i += 32) {
        if (pixels[i] === 0) transparentCount++;
      }

      const percent = Math.min(100, Math.round((transparentCount / (totalPixels / 8)) * 100));
      setScratchPercent(percent);

      if (percent >= 45 && !isScratched) {
        setIsScratched(true);
      }
    } catch {
      // ignore
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      setIsDrawing(true);
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || e.touches.length === 0) return;
    scratch(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => setIsDrawing(false);

  // Render QR code when scratched
  useEffect(() => {
    if (!isScratched || !activePlay || !qrCanvasRef.current) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const qrData = `${origin}/?verify_reward=${encodeURIComponent(activePlay.voucher_code)}`;
    QRCode.toCanvas(
      qrCanvasRef.current,
      qrData,
      {
        width: 100,
        margin: 1,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      },
      (err) => {
        if (err) console.error('QR error in InlineScratchCard:', err);
      }
    );
  }, [isScratched, activePlay]);

  // Copy code
  const handleCopyCode = async () => {
    if (!activePlay) return;
    try {
      await navigator.clipboard.writeText(activePlay.voucher_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  // Download pass
  const handleDownloadPass = async () => {
    if (!activePlay) return;
    setIsDownloading(true);
    try {
      await downloadRewardPassImage({
        businessName: business.business_name || 'Store Partner',
        rewardTitle: activePlay.reward_title,
        rewardValue: activePlay.reward_value,
        voucherCode: activePlay.voucher_code,
        customerName: activePlay.customer_name,
        customerPhone: activePlay.customer_phone,
        expiresAt: activePlay.expires_at,
        createdAt: activePlay.scratched_at || activePlay.created_at,
        terms: activePlay.terms_conditions || 'Present this pass at billing counter to redeem.',
        rewardType: 'scratch',
        originLabel: '🎲 Scratch & Win Lucky Draw',
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download scratch pass:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const [isSharingImage, setIsSharingImage] = useState(false);

  const getShareText = () => {
    if (!activePlay) return '';
    return `🎉 Congratulations ${activePlay.customer_name}! You won "${activePlay.reward_title}" (${activePlay.reward_value}) in the Lucky Draw at ${business?.business_name || 'our store'}! Your coupon code is: ${activePlay.voucher_code}. Show this message or code at billing counter to claim! Valid till: ${new Date(activePlay.expires_at).toLocaleDateString()}.\n\n🏢 Store: ${business?.business_name || 'Our Store'}${business?.phone || business?.whatsapp_number ? `\n📞 Store Contact: ${business.whatsapp_number || business.phone}` : ''}`;
  };

  const handleSharePassImage = async () => {
    if (!activePlay || !activePlay.customer_phone) return;
    setIsSharingImage(true);
    try {
      await shareRewardPassOnWhatsApp({
        businessName: business.business_name || 'Store Partner',
        rewardTitle: activePlay.reward_title,
        rewardValue: activePlay.reward_value,
        voucherCode: activePlay.voucher_code,
        customerName: activePlay.customer_name,
        customerPhone: activePlay.customer_phone,
        expiresAt: activePlay.expires_at,
        createdAt: activePlay.scratched_at || activePlay.created_at,
        terms: activePlay.terms_conditions || 'Present this pass at billing counter to redeem.',
        originLabel: '🎲 Scratch & Win Lucky Draw',
        targetPhone: activePlay.customer_phone,
        shareText: '', // Pure image only - no text message and no customer panel link
      });
    } catch (err) {
      console.error('Failed to share pass image on WhatsApp:', err);
    } finally {
      setIsSharingImage(false);
    }
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-purple-50/50 to-amber-50 border-2 border-amber-300 shadow-md ${className}`}>
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center font-black shadow-xs shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-700" />
                <span>Scratch & Win Lucky Draw</span>
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                लकी ड्रॉ
              </span>
            </div>
            <h4 className="text-xs font-black text-neutral-900 mt-1">
              {campaign?.lucky_draw_enabled
                ? (campaign?.reward_headline || 'पेन से लेकर 20% डिस्काउंट तक कुछ भी खुल सकता है! 🎁')
                : (campaign?.reward_headline || 'Scratch to reveal your special reward! 🎁')}
            </h4>
            {campaign?.lucky_draw_enabled && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[10px] text-neutral-500 font-bold">Possible Prizes:</span>
                {(campaign?.prize_pool && campaign.prize_pool.length > 0
                  ? campaign.prize_pool
                  : [
                      { id: '1', name: 'Executive Pen 🖊️' },
                      { id: '2', name: '5% OFF' },
                      { id: '3', name: '10% OFF' },
                      { id: '4', name: '15% OFF' },
                      { id: '5', name: '20% OFF' },
                    ]
                )
                  .slice(0, 5)
                  .map((p) => (
                    <span
                      key={p.id}
                      className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300 shadow-2xs"
                    >
                      {p.name}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATE 1: UNLOCK / CLAIM FORM */}
      {!activePlay && (
        <form onSubmit={handleUnlockScratch} className="mt-3.5 space-y-3">
          <p className="text-[11px] font-semibold text-neutral-700">
            Enter your details below to unlock your scratch card instantly:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-1">
                Your Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
                <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-1">
                WhatsApp / Mobile Number *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
                <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {unlockError && (
            <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
              {unlockError}
            </p>
          )}

          <button
            type="submit"
            disabled={isUnlocking}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
            <span>{isUnlocking ? 'Unlocking Lucky Card...' : 'Unlock Lucky Draw Scratch Card 🎁'}</span>
          </button>
        </form>
      )}

      {/* STATE 2: ACTIVE SCRATCH CANVAS INLINE */}
      {activePlay && !isScratched && (
        <div className="mt-3.5 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-950 flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Rub below to reveal your prize:</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              {scratchPercent}% Scratched
            </span>
          </div>

          {/* Interactive Scratch Area */}
          <div className="relative w-full max-w-sm mx-auto h-44 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg select-none touch-none">
            {/* The Mystery Prize Revealed Underneath */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] via-[#2E1065] to-[#4C1D95] text-white flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center mb-1.5 animate-bounce">
                <PartyPopper className="w-6 h-6 text-amber-300" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                🎉 Lucky Draw Winner!
              </span>
              <h3 className="text-lg font-black text-white mt-0.5 leading-tight">
                {activePlay.reward_title}
              </h3>
              <p className="text-xs font-bold text-amber-200 mt-0.5">
                {activePlay.reward_value}
              </p>
            </div>

            {/* Canvas Overlay for scratching */}
            <canvas
              ref={canvasRef}
              width={380}
              height={176}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="absolute inset-0 w-full h-full cursor-pointer z-10"
            />
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsScratched(true)}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
            >
              Skip / Auto-reveal Prize →
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: SCRATCHED & WON (COMPLETE REVEAL INLINE AT BOTTOM) */}
      {activePlay && isScratched && (
        <div className="mt-3.5 space-y-3.5 animate-in fade-in duration-300">
          {/* Winner Banner */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-amber-300 shrink-0">
                <PartyPopper className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                  🎉 Congratulations Winner!
                </span>
                <h4 className="text-sm font-black text-white leading-tight">
                  {activePlay.reward_title}
                </h4>
                <p className="text-[11px] text-emerald-100 font-medium">
                  {activePlay.reward_value} · Valid till {new Date(activePlay.expires_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Single-Use Voucher Code & Scannable QR Box */}
          <div className="p-3 bg-white border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="bg-neutral-50 p-1.5 rounded-xl border border-neutral-200 shrink-0">
                <canvas ref={qrCanvasRef} className="rounded-lg w-20 h-20" />
              </div>
              <div className="text-left space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  🎟️ Single-Use Voucher Code
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-base font-black text-purple-950 bg-neutral-100 px-2.5 py-0.5 rounded-lg border border-purple-300">
                    {activePlay.voucher_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 text-neutral-600 hover:text-purple-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer transition-colors"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Show this QR or code at cashier billing counter to redeem.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Download Pass & WhatsApp */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleDownloadPass}
              disabled={isDownloading}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              title="Download reward pass with verification QR code as image"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Pass Saved! (इनाम सेव हुआ)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>{isDownloading ? 'Saving...' : 'Download Pass (इनाम डाउनलोड करें)'}</span>
                </>
              )}
            </button>

            {activePlay.customer_phone && (
              <div className="flex flex-1 flex-wrap gap-1.5">
                {/* Send Actual Pass Image */}
                <button
                  type="button"
                  onClick={handleSharePassImage}
                  disabled={isSharingImage}
                  className="flex-1 min-w-[130px] py-2.5 px-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  title="Send actual downloaded reward pass image on WhatsApp"
                >
                  <ImageIcon className="w-4 h-4 text-amber-200" />
                  <span>{isSharingImage ? 'Sending...' : 'Pass Image (WhatsApp)'}</span>
                </button>

                {/* Send Text */}
                <a
                  href={`https://wa.me/${activePlay.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(getShareText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Send text message on WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Text</span>
                </a>
              </div>
            )}
          </div>

          {/* Audit Breakdown (Kab Mila & Kaise Mila) */}
          <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-[11px] text-neutral-600 space-y-1">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <span className="text-neutral-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-600" />
                <strong>कब मिला:</strong>
              </span>
              <span className="font-mono font-bold text-neutral-900">
                {new Date(activePlay.scratched_at || activePlay.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <span className="text-neutral-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <strong>कैसे मिला:</strong>
              </span>
              <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                🎲 Scratch & Win Lucky Draw
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Issued to:</span>
              <strong className="text-neutral-800">{activePlay.customer_name} ({activePlay.customer_phone})</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
