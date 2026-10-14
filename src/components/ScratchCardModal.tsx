import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, Trophy, Gift, Check, Clock, ShieldCheck, Tag, ShoppingBag, Percent, Phone } from 'lucide-react';
import { ScratchPlay, Business } from '../types/database';

interface ScratchCardModalProps {
  play: ScratchPlay;
  business: Business;
  onClose: () => void;
}

export const ScratchCardModal: React.FC<ScratchCardModalProps> = ({ play, business, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const width = canvas.width;
    const height = canvas.height;

    // Draw shimmering metallic scratch overlay
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#94A3B8');
    gradient.addColorStop(0.2, '#CBD5E1');
    gradient.addColorStop(0.5, '#64748B');
    gradient.addColorStop(0.8, '#CBD5E1');
    gradient.addColorStop(1, '#94A3B8');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative coin pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < width; i += 24) {
      for (let j = 0; j < height; j += 24) {
        ctx.beginPath();
        ctx.arc(i + 12, j + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Overlay text
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH HERE TO REVEAL ✨', width / 2, height / 2 - 12);

    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Use your finger or mouse', width / 2, height / 2 + 14);
  }, []);

  const calculateScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let transparentPixels = 0;
    const totalPixels = width * height;

    // Check alpha values
    for (let i = 3; i < data.length; i += 16) { // sample every 4th pixel
      if (data[i] === 0) {
        transparentPixels += 4;
      }
    }

    const pct = Math.min(100, Math.round((transparentPixels / totalPixels) * 100));
    setScratchPercent(pct);
    if (pct >= 40 && !isScratched) {
      setIsScratched(true);
      // Reveal fully
      ctx.clearRect(0, 0, width, height);
    }
    return pct;
  };

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    calculateScratchPercentage();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) {
      setIsDrawing(true);
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(play.voucher_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-neutral-100 flex flex-col">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 p-4 text-white text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-full text-[11px] font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Scratch & Win Lucky Draw</span>
          </div>
          <h3 className="text-base font-black tracking-tight mt-1">{business.business_name}</h3>
          <p className="text-[11px] text-white/80">Exclusive Promotional Customer Offer</p>
        </div>

        {/* Card Body */}
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          <div className="relative w-[280px] h-[160px] rounded-2xl overflow-hidden shadow-inner border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 via-white to-purple-50 flex flex-col items-center justify-center p-4 select-none">
            {/* The Hidden Prize (Always underneath) */}
            <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
              <div className="w-10 h-10 mx-auto rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center shadow-md font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                🎉 Congratulations Winner!
              </span>
              <h4 className="text-base font-black text-neutral-900 leading-tight">
                {play.reward_title}
              </h4>
              <p className="text-xs font-bold text-[#6C3BFF]">
                {play.reward_value}
              </p>
              {play.min_purchase_amount && (
                <p className="text-[10px] text-neutral-500">
                  {play.min_purchase_amount}
                </p>
              )}
            </div>

            {/* The Scratchable Canvas Overlay */}
            {!isScratched && (
              <canvas
                ref={canvasRef}
                width={280}
                height={160}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none rounded-2xl z-10 transition-opacity"
              />
            )}
          </div>

          {/* Quick Reveal button for accessibility */}
          {!isScratched && (
            <button
              type="button"
              onClick={() => {
                setIsScratched(true);
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
              }}
              className="text-[11px] text-[#6C3BFF] font-bold hover:underline cursor-pointer"
            >
              Scratch Card Stiff? Click here to instant reveal
            </button>
          )}

          {/* Post Reveal Voucher Details */}
          {isScratched && (
            <div className="w-full space-y-3 animate-in fade-in duration-300">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Your Claim Code (Show at Billing Counter)
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl font-black text-purple-900 tracking-wider bg-white px-4 py-1.5 rounded-xl border border-purple-300 shadow-xs">
                    {play.voucher_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="Copy voucher code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                </div>
                {copiedCode && (
                  <p className="text-[11px] text-emerald-700 font-bold">Code copied to clipboard!</p>
                )}
              </div>

              {/* Direct WhatsApp Share & Save */}
              {play.customer_phone && (
                <a
                  href={`https://wa.me/${play.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `🎉 Congratulations ${play.customer_name}! You won "${play.reward_title}" (${play.reward_value}) at ${business?.business_name || 'our store'}! Your Scratch & Win coupon code is: ${play.voucher_code}. Show this message or code at billing counter to claim! Valid till: ${new Date(play.expires_at).toLocaleDateString()}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Send Voucher to WhatsApp</span>
                </a>
              )}

              <div className="text-[11px] text-neutral-600 space-y-1 text-left bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Issued to:</span>
                  <strong className="text-neutral-800">{play.customer_name} ({play.customer_phone})</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Expires on:</span>
                  <strong className="text-rose-600">{new Date(play.expires_at).toLocaleDateString()}</strong>
                </div>
                {play.terms_conditions && (
                  <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-200">
                    {play.terms_conditions}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
          <span className="text-[10px] text-neutral-400">
            {isScratched ? 'Coupon activated' : 'Scratch to reveal prize'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {isScratched ? 'Done & Close' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
