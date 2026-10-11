import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  Star,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Upload,
  Circle,
  Square,
  Palette,
  Image as ImageIcon,
  Save,
  Trash2,
  Sliders,
} from 'lucide-react';
import { Business, ReviewSettings, QRLogoBorderStyle } from '../types/database';
import { updateReviewSettings } from '../lib/db';

import { getPublicBaseUrl } from '../lib/urlHelper';

interface QRCodeViewProps {
  business: Business;
  settings?: ReviewSettings;
  onPreviewFlow?: () => void;
  onSettingsUpdated?: (updated: ReviewSettings) => void;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  business,
  settings,
  onPreviewFlow,
  onSettingsUpdated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // QR Customization States
  const [showLogo, setShowLogo] = useState<boolean>(settings?.qr_show_logo ?? true);
  const [logoUrl, setLogoUrl] = useState<string>(
    settings?.qr_logo_url || business.logo_url || ''
  );
  const [logoBorderStyle, setLogoBorderStyle] = useState<QRLogoBorderStyle>(
    settings?.qr_logo_border_style || 'circular'
  );
  const [qrColor, setQrColor] = useState<string>(
    settings?.qr_color || '#1F1735'
  );
  const [borderColorType, setBorderColorType] = useState<'white' | 'accent' | 'dark'>('white');

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Compute full review URL (pointing to public shareable domain)
  const baseUrl = getPublicBaseUrl();
  const reviewUrl = `${baseUrl}/#review/${business.unique_slug}`;
  const accentColor = settings?.accent_color || '#6C3BFF';

  // Helper to draw logo onto a given QR canvas
  const drawCenterLogo = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      imgElement: HTMLImageElement | null
    ) => {
      if (!showLogo) return;

      const cx = width / 2;
      const cy = height / 2;
      // Logo badge covers roughly 22-25% of QR width
      const badgeSize = Math.round(width * 0.24);
      const innerSize = Math.round(badgeSize * 0.82);

      let strokeColor = '#FFFFFF';
      if (borderColorType === 'accent') strokeColor = accentColor;
      else if (borderColorType === 'dark') strokeColor = qrColor;

      ctx.save();

      if (logoBorderStyle === 'circular') {
        const radius = badgeSize / 2;

        // 1. Draw solid white background circle to block QR modules cleanly
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // 2. Draw outer border stroke
        ctx.lineWidth = Math.max(3, Math.round(width * 0.012));
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // 3. Clip inner circular region for logo
        ctx.beginPath();
        ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
        ctx.clip();

        if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
          ctx.drawImage(
            imgElement,
            cx - innerSize / 2,
            cy - innerSize / 2,
            innerSize,
            innerSize
          );
        } else {
          // Render monogram fallback
          ctx.fillStyle = accentColor;
          ctx.fillRect(cx - innerSize / 2, cy - innerSize / 2, innerSize, innerSize);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.round(innerSize * 0.44)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(business.business_name.substring(0, 2).toUpperCase(), cx, cy);
        }
      } else {
        // Square border with rounded corners
        const cornerRadius = Math.round(badgeSize * 0.22);
        const halfBadge = badgeSize / 2;

        // 1. Draw solid white background rounded rect
        ctx.beginPath();
        ctx.roundRect(cx - halfBadge, cy - halfBadge, badgeSize, badgeSize, [cornerRadius]);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // 2. Draw outer border stroke
        ctx.lineWidth = Math.max(3, Math.round(width * 0.012));
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // 3. Clip inner rounded rect region for logo
        const innerRadius = Math.max(4, cornerRadius - 2);
        const halfInner = innerSize / 2;
        ctx.beginPath();
        ctx.roundRect(cx - halfInner, cy - halfInner, innerSize, innerSize, [innerRadius]);
        ctx.clip();

        if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
          ctx.drawImage(
            imgElement,
            cx - halfInner,
            cy - halfInner,
            innerSize,
            innerSize
          );
        } else {
          // Render monogram fallback
          ctx.fillStyle = accentColor;
          ctx.fillRect(cx - halfInner, cy - halfInner, innerSize, innerSize);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.round(innerSize * 0.44)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(business.business_name.substring(0, 2).toUpperCase(), cx, cy);
        }
      }

      ctx.restore();
    },
    [showLogo, logoBorderStyle, borderColorType, accentColor, qrColor, business.business_name]
  );

  // Render on-screen live preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMounted = true;

    // First generate the base QR code with High Error Correction ('H')
    QRCode.toCanvas(
      canvas,
      reviewUrl,
      {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: qrColor,
          light: '#FFFFFF',
        },
      },
      (error) => {
        if (error) {
          console.error('QR code generation error', error);
          return;
        }
        if (!isMounted) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (showLogo) {
          if (logoUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (isMounted) {
                drawCenterLogo(ctx, canvas.width, canvas.height, img);
              }
            };
            img.onerror = () => {
              if (isMounted) {
                // Draw fallback monogram if image fails CORS or loading
                drawCenterLogo(ctx, canvas.width, canvas.height, null);
              }
            };
            img.src = logoUrl;
          } else {
            // Draw default business monogram badge
            drawCenterLogo(ctx, canvas.width, canvas.height, null);
          }
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [reviewUrl, qrColor, showLogo, logoUrl, logoBorderStyle, borderColorType, drawCenterLogo]);

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please choose a valid image file (PNG, JPG, SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Image size exceeds 2MB limit. Please select a smaller logo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogoUrl(dataUrl);
        setShowLogo(true);
      }
    };
    reader.onerror = () => {
      setLogoUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSaveCustomization = async () => {
    setIsSaving(true);
    try {
      const updated = await updateReviewSettings(business.id, {
        qr_show_logo: showLogo,
        qr_logo_url: logoUrl,
        qr_logo_border_style: logoBorderStyle,
        qr_color: qrColor,
      });
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save QR settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  // High-Resolution Standee PNG Download (1000x1350px)
  const handleDownloadPng = async () => {
    setIsGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1350);
      bgGrad.addColorStop(0, '#FFFFFF');
      bgGrad.addColorStop(1, '#F8F6FF');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1000, 1350);

      // Top decorative banner
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 0, 1000, 180);

      // Top headline
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RATE YOUR EXPERIENCE', 500, 95);

      ctx.fillStyle = '#E9D5FF';
      ctx.font = '24px sans-serif';
      ctx.fillText('Google Review & Verified Feedback', 500, 140);

      // Business name
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 52px sans-serif';
      ctx.fillText(business.business_name, 500, 270);

      // Stars graphic
      ctx.fillStyle = '#F59E0B';
      ctx.font = '40px sans-serif';
      ctx.fillText('★ ★ ★ ★ ★', 500, 330);

      // Subtitle
      ctx.fillStyle = '#64748B';
      ctx.font = '24px sans-serif';
      ctx.fillText(settings?.welcome_text || 'How was your experience today?', 500, 390);

      // QR Code container white card
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(225, 450, 550, 550, [24]);
      ctx.fill();
      ctx.stroke();

      // Render high-res base QR with High Error Correction
      const qrDataUrl = await QRCode.toDataURL(reviewUrl, {
        width: 480,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: qrColor,
          light: '#FFFFFF',
        },
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
      });

      // Draw QR image at centered position
      ctx.drawImage(qrImg, 260, 485, 480, 480);

      // Draw Center Logo on Standee if enabled
      if (showLogo) {
        const qrCanvas = document.createElement('canvas');
        qrCanvas.width = 480;
        qrCanvas.height = 480;
        const qrCtx = qrCanvas.getContext('2d');
        if (qrCtx) {
          qrCtx.drawImage(qrImg, 0, 0);

          if (logoUrl) {
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            await new Promise((resolve) => {
              logoImg.onload = () => {
                drawCenterLogo(qrCtx, 480, 480, logoImg);
                resolve(null);
              };
              logoImg.onerror = () => {
                drawCenterLogo(qrCtx, 480, 480, null);
                resolve(null);
              };
              logoImg.src = logoUrl;
            });
          } else {
            drawCenterLogo(qrCtx, 480, 480, null);
          }

          ctx.drawImage(qrCanvas, 260, 485, 480, 480);
        }
      }

      // Bottom instructions
      ctx.fillStyle = '#1E1B4B';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('Scan with your smartphone camera', 500, 1070);

      ctx.fillStyle = '#64748B';
      ctx.font = '22px sans-serif';
      ctx.fillText('Tap the link to share your rating & draft review in seconds', 500, 1115);

      // Footer branding
      ctx.fillStyle = '#94A3B8';
      ctx.font = '18px sans-serif';
      ctx.fillText('Powered by LocalBoost AI · Safe & Independent Feedback', 500, 1260);

      // Trigger download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${business.unique_slug}-google-review-qr-standee.png`;
      downloadLink.href = pngUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Failed to download QR code', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">QR Code & Table Standee</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Embed your custom logo in the center of the QR code with circular or square styling
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors shadow-xs"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-neutral-500" />
                <span>Copy Review URL</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadPng}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Rendering...' : 'Download Standee PNG'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Tabletop Standee Preview */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-purple-500/10 border border-neutral-200/90 overflow-hidden">
            {/* Header banner */}
            <div
              style={{ backgroundColor: accentColor }}
              className="px-6 py-4 text-center text-white space-y-0.5"
            >
              <span className="text-[11px] font-semibold tracking-wider uppercase opacity-90">
                Rate Your Experience
              </span>
              <p className="text-xs text-purple-100">Google Review & Customer Feedback</p>
            </div>

            {/* Standee Body */}
            <div className="p-8 text-center space-y-5">
              <div>
                <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">
                  {business.business_name}
                </h3>
                <div className="flex justify-center items-center gap-1 text-amber-400 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  {settings?.welcome_text || 'How was your experience today?'}
                </p>
              </div>

              {/* QR Container Canvas */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl inline-block shadow-inner relative">
                <canvas ref={canvasRef} className="rounded-lg mx-auto" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-800 flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#6C3BFF]" />
                  Scan with your phone camera
                </p>
                <p className="text-[11px] text-neutral-500">
                  Select rating · Get personalized drafts · Publish in seconds
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-center gap-2 text-[10px] text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Level H Error Correction · 100% Reliable Camera Scan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code Customization Panel */}
        <div className="lg:col-span-6 space-y-5">
          {/* Customization Card */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-[#6C3BFF] rounded-lg">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">QR Code Customization Panel</h3>
                  <p className="text-[11px] text-neutral-500">Center Logo and Border Style Controls</p>
                </div>
              </div>

              {/* Logo Embedding Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Embed Center Logo</span>
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="w-4 h-4 text-[#6C3BFF] rounded focus:ring-[#6C3BFF]"
                />
              </label>
            </div>

            {/* Customization Controls */}
            {showLogo && (
              <div className="space-y-4">
                {/* 1. Logo Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-800">
                    1. Logo Source
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#6C3BFF]" />
                      <span>Upload Logo File</span>
                    </button>

                    {business.logo_url && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl(business.logo_url || '')}
                        className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Use Profile Logo</span>
                      </button>
                    )}

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remove custom logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {logoUploadError && (
                    <p className="text-[11px] text-rose-600 font-medium">{logoUploadError}</p>
                  )}

                  <div className="pt-1">
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                  </div>
                </div>

                {/* 2. Logo Border Style (Circular vs Square) */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-neutral-800">
                    2. Logo Border Style
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Circular Option */}
                    <button
                      type="button"
                      onClick={() => setLogoBorderStyle('circular')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        logoBorderStyle === 'circular'
                          ? 'border-[#6C3BFF] bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                          logoBorderStyle === 'circular'
                            ? 'bg-[#6C3BFF] text-white border-[#6C3BFF]'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}
                      >
                        <Circle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">
                          Circular Border
                        </span>
                        <span className="text-[11px] text-neutral-500 leading-tight block mt-0.5">
                          Rounded circular frame with white isolation badge
                        </span>
                      </div>
                    </button>

                    {/* Square Option */}
                    <button
                      type="button"
                      onClick={() => setLogoBorderStyle('square')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        logoBorderStyle === 'square'
                          ? 'border-[#6C3BFF] bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          logoBorderStyle === 'square'
                            ? 'bg-[#6C3BFF] text-white border-[#6C3BFF]'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}
                      >
                        <Square className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">
                          Square Border
                        </span>
                        <span className="text-[11px] text-neutral-500 leading-tight block mt-0.5">
                          Rounded square frame with modern edge profile
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Border Stroke Accent Color */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-neutral-800">
                    3. Logo Frame Border Color
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBorderColorType('white')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        borderColorType === 'white'
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      Crisp White Border
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorderColorType('accent')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        borderColorType === 'accent'
                          ? 'bg-[#6C3BFF] text-white border-[#6C3BFF]'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      Accent Color ({accentColor})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorderColorType('dark')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        borderColorType === 'dark'
                          ? 'bg-neutral-800 text-white border-neutral-800'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      QR Match Color
                    </button>
                  </div>
                </div>

                {/* 4. QR Code Module Color */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-neutral-800">
                    4. QR Code Module Color
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { label: 'Deep Navy', color: '#1F1735' },
                      { label: 'Brand Purple', color: '#6C3BFF' },
                      { label: 'Classic Black', color: '#000000' },
                      { label: 'Slate Dark', color: '#0F172A' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setQrColor(c.color)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          qrColor === c.color
                            ? 'border-[#6C3BFF] bg-purple-50 text-[#6C3BFF] font-bold'
                            : 'border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: c.color }}
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Customization Button */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              {saveSuccess ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  QR styling preferences saved!
                </span>
              ) : (
                <span className="text-[11px] text-neutral-400">
                  Settings apply to standees and downloads
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save QR Customization'}</span>
              </button>
            </div>
          </div>

          {/* QR Destination Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">QR Destination Details</h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-neutral-500 block mb-1">Direct Review Landing URL:</span>
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-[11px] text-neutral-800 break-all select-all">
                  {reviewUrl}
                </div>
              </div>

              <div>
                <span className="text-neutral-500 block mb-1">Target Google Review URL:</span>
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-[11px] text-neutral-800 break-all">
                  {business.google_review_url}
                </div>
              </div>

              <div>
                <span className="text-neutral-500 block mb-1">Unique QR Slug:</span>
                <div className="inline-block px-2.5 py-1 bg-purple-50 text-[#6C3BFF] font-semibold rounded-md font-mono text-xs">
                  {business.unique_slug}
                </div>
              </div>
            </div>

            {onPreviewFlow && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onPreviewFlow}
                  className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Test Live Review Flow in Browser</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
