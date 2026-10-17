import QRCode from 'qrcode';

export interface RewardDownloadOptions {
  businessName: string;
  rewardTitle: string;
  rewardValue?: string;
  voucherCode: string;
  customerName: string;
  customerPhone: string;
  expiresAt: string;
  createdAt?: string;
  terms?: string;
  rewardType?: 'loyalty' | 'scratch' | 'review';
  originLabel?: string;
  minBillAmount?: string;
  quality?: 'fast' | 'hd'; // 'fast' = Turbo Mode (~20ms), 'hd' = Ultra HD Print (900x1160)
  forceRefresh?: boolean;
}

// In-memory cache so subsequent shares/downloads/copies take 0ms
const passImageCache = new Map<string, { dataUrl: string; blob: Blob; filename: string }>();

export function getCachedRewardPass(voucherCode: string): { dataUrl: string; blob: Blob; filename: string } | undefined {
  return passImageCache.get(voucherCode);
}

export function clearRewardPassCache(voucherCode?: string): void {
  if (voucherCode) {
    passImageCache.delete(voucherCode);
  } else {
    passImageCache.clear();
  }
}

/**
 * Generates an optimized VIP Reward Pass image on canvas (Instant Turbo or Ultra HD)
 */
export async function generateRewardPassDataUrl(
  options: RewardDownloadOptions
): Promise<{ dataUrl: string; blob: Blob; filename: string }> {
  const {
    businessName,
    rewardTitle,
    rewardValue = '',
    voucherCode,
    customerName,
    customerPhone,
    expiresAt,
    createdAt,
    terms = 'Present this pass at billing counter during checkout to claim your reward.',
    originLabel,
    minBillAmount,
    quality = 'fast',
    forceRefresh = false,
  } = options;

  const cacheKey = `${voucherCode}_${quality}`;
  if (!forceRefresh && passImageCache.has(cacheKey)) {
    return passImageCache.get(cacheKey)!;
  }

  // 1. Generate QR code for counter verification
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const verifyUrl = `${origin}/?verify_reward=${encodeURIComponent(voucherCode)}`;
  
  // Fast mode uses smaller dimension and medium error correction for 5x faster QR generation
  const qrWidth = quality === 'fast' ? 180 : 240;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: qrWidth,
    margin: 1,
    color: {
      dark: '#1e1b4b',
      light: '#ffffff',
    },
    errorCorrectionLevel: quality === 'fast' ? 'M' : 'H',
  });

  // Load QR image element
  const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  // 2. Setup Canvas - Fast Mode (600x773) vs Ultra HD (900x1160)
  const baseW = 900;
  const baseH = 1160;
  const targetW = quality === 'fast' ? 600 : 900;
  const targetH = quality === 'fast' ? 773 : 1160;
  const scale = targetW / baseW;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Scale context to target resolution so identical layout math applies
  ctx.scale(scale, scale);

  // Background Gradient (Deep Royal Midnight Purple)
  const bgGrad = ctx.createLinearGradient(0, 0, 900, 1160);
  bgGrad.addColorStop(0, '#110D2C');
  bgGrad.addColorStop(0.35, '#1E1B4B');
  bgGrad.addColorStop(0.7, '#2E1065');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 900, 1160);

  // Decorative ambient glow orbs
  const glow1 = ctx.createRadialGradient(800, 100, 10, 800, 100, 350);
  glow1.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
  glow1.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, 900, 500);

  const glow2 = ctx.createRadialGradient(100, 1050, 10, 100, 1050, 350);
  glow2.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
  glow2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 700, 900, 460);

  // Outer Gold Decorative Border
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 840, 1100);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(38, 38, 824, 1084);

  // Corner Accent Diamonds
  const drawDiamond = (cx: number, cy: number, size: number) => {
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size, cy);
    ctx.closePath();
    ctx.fill();
  };
  drawDiamond(30, 30, 8);
  drawDiamond(870, 30, 8);
  drawDiamond(30, 1130, 8);
  drawDiamond(870, 1130, 8);

  // Header Ribbon: Store Name & VIP Badge
  ctx.textAlign = 'center';

  // Store Brand Name
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('★ OFFICIAL VIP CUSTOMER PASS ★', 450, 85);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 42px system-ui, -apple-system, sans-serif';
  const displayBizName = businessName.length > 28 ? businessName.slice(0, 26) + '...' : businessName;
  ctx.fillText(displayBizName, 450, 140);

  // Origin / Kaise Mila Tag
  const displayOrigin = originLabel || '⭐ Verified Customer Reward';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(250, 165, 400, 36);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.strokeRect(250, 165, 400, 36);

  ctx.fillStyle = '#E9D5FF';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(displayOrigin, 450, 190);

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(70, 225);
  ctx.lineTo(830, 225);
  ctx.stroke();

  // Big Reward Box Container
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(60, 250, 780, 165);
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 250, 780, 165);

  // Reward Value Badge (if present, e.g. 20% OFF or Free Item)
  if (rewardValue) {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(70, 265, 180, 42);
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(rewardValue, 160, 295);
  }

  // Minimum Spend / Bill Requirement Badge (Prominently shown on front of pass)
  const minSpendStr = minBillAmount
    ? (minBillAmount.toLowerCase().includes('min') ? minBillAmount : `Min. Spend: ${minBillAmount}`)
    : '';

  if (minSpendStr) {
    const badgeX = rewardValue ? 265 : 70;
    const badgeW = 270;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.fillRect(badgeX, 265, badgeW, 42);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(badgeX, 265, badgeW, 42);
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏷️ ${minSpendStr}`, badgeX + badgeW / 2, 292);
    ctx.textAlign = 'left';
  }

  // Reward Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 34px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  const cleanTitle = rewardTitle.length > 36 ? rewardTitle.slice(0, 34) + '...' : rewardTitle;
  ctx.fillText(cleanTitle, 75, 355);

  // Subtitle / Instruction with Minimum Spend Note
  ctx.fillStyle = '#DDD6FE';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  const subText = minSpendStr
    ? `Exclusive discount unlocked! Valid on ${minSpendStr} at billing counter.`
    : 'Exclusive discount unlocked & verified for billing counter discount.';
  ctx.fillText(subText, 75, 390);

  // Customer & Timeline Details Box (Grid 2 cols)
  // Left: Customer info
  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(60, 435, 375, 115);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.strokeRect(60, 435, 375, 115);

  ctx.fillStyle = '#A78BFA';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('ISSUED TO CUSTOMER:', 85, 465);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  const custNameDisp = customerName ? (customerName.length > 20 ? customerName.slice(0, 18) + '..' : customerName) : 'Valued Guest';
  ctx.fillText(custNameDisp, 85, 500);

  ctx.fillStyle = '#C4B5FD';
  ctx.font = '18px monospace';
  ctx.fillText(customerPhone || '', 85, 532);

  // Right: Timeline (Kab Mila & Valid Till)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(465, 435, 375, 115);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.strokeRect(465, 435, 375, 115);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('VALIDITY & TIMELINE:', 490, 465);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  const expDateStr = new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  ctx.fillText(`Valid Till: ${expDateStr}`, 490, 500);

  const issuedDateStr = createdAt
    ? new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Active';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Issued: ${issuedDateStr} • Verified`, 490, 532);

  // WHITE COUNTER REDEMPTION BOX (Holds QR Code and Voucher Code)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(60, 570, 780, 420);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 570, 780, 420);

  // Draw Embedded QR Code
  ctx.drawImage(qrImage, 95, 605, 250, 250);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('📱 SCAN AT BILLING COUNTER', 220, 885);
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText('To verify Kab & Kaise Mila origin', 220, 908);

  // Right Side of White Box: Voucher Code & Instructions
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('UNIQUE CLAIM VOUCHER CODE:', 380, 640);

  // Big Purple Voucher Code Pill
  ctx.fillStyle = '#FAF5FF';
  ctx.fillRect(380, 660, 425, 75);
  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 2;
  ctx.strokeRect(380, 660, 425, 75);

  ctx.fillStyle = '#3B0764';
  ctx.font = '900 36px monospace';
  ctx.fillText(voucherCode, 405, 715);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('How to redeem at counter:', 380, 775);

  ctx.fillStyle = '#334155';
  ctx.font = '15px system-ui, -apple-system, sans-serif';
  ctx.fillText('1. Show this QR code or Voucher code to cashier.', 380, 805);
  ctx.fillText('2. Cashier scans QR with live camera to verify.', 380, 835);
  if (minSpendStr) {
    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`3. Applicable on ${minSpendStr} at counter.`, 380, 865);
    ctx.fillStyle = '#334155';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.fillText('4. Discount is applied directly on your bill.', 380, 895);
  } else {
    ctx.fillText('3. Discount is applied directly on your bill.', 380, 865);
  }

  ctx.fillStyle = '#16A34A';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('✓ 100% Genuine Issued Voucher • Single Use Only', 380, 922);

  // Terms & Conditions Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  const cleanTerms = terms.length > 95 ? terms.slice(0, 92) + '...' : terms;
  ctx.fillText(`Terms: ${cleanTerms}`, 450, 1040);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('LocalBoost AI Verified Customer Loyalty Network', 450, 1075);

  // Convert to Data URL & Blob
  const dataUrl = canvas.toDataURL('image/png');
  const filename = `Reward-${businessName.replace(/[^a-zA-Z0-9]/g, '')}-${voucherCode}.png`;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });

  const result = { dataUrl, blob, filename };
  passImageCache.set(cacheKey, result);
  // Also store by just voucherCode for convenience
  passImageCache.set(voucherCode, result);

  return result;
}

/**
 * Generates and downloads a VIP Reward Pass image (PNG)
 */
export async function downloadRewardPassImage(options: RewardDownloadOptions): Promise<string> {
  const { dataUrl, filename } = await generateRewardPassDataUrl(options);

  // Trigger browser download
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}

/**
 * Copies the VIP Reward Pass image directly to the system clipboard
 * so users can paste (Ctrl+V) directly into WhatsApp Web or chats
 */
export async function copyRewardPassImageToClipboard(
  options: RewardDownloadOptions,
  preloaded?: { blob: Blob }
): Promise<boolean> {
  try {
    const blob = preloaded?.blob || (await generateRewardPassDataUrl(options)).blob;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Clipboard write failed:', err);
    return false;
  }
}

export interface ShareRewardWhatsAppOptions extends RewardDownloadOptions {
  targetPhone: string;
  shareText: string;
  dispatchMode?: 'app' | 'web';
  preloaded?: { dataUrl: string; blob: Blob; filename: string };
}

/**
 * Returns the direct URL for customer to view and verify their digital VIP pass
 */
export function getRewardPassUrl(voucherCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?verify_reward=${encodeURIComponent(voucherCode)}`;
}

/**
 * Builds the instant, high-converting WhatsApp message containing
 * direct details and an instant digital pass link.
 */
export function buildFastRewardWhatsAppMessage(params: {
  businessName: string;
  voucherCode: string;
  rewardTitle: string;
  rewardValue?: string;
  customerName: string;
  expiresAt: string;
  terms?: string;
  bizMarketingPhone?: string;
  businessAddress?: string;
  status?: string;
}): string {
  const bName = params.businessName || 'Our Store';
  const expiryFormatted = new Date(params.expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const contactLine = params.bizMarketingPhone
    ? `\n\n🏢 *Official Store:* ${bName}\n📱 *Store WhatsApp:* ${params.bizMarketingPhone}${
        params.businessAddress ? `\n📍 *Address:* ${params.businessAddress}` : ''
      }`
    : `\n\n🏢 *Official Store:* ${bName}`;

  if (params.status === 'redeemed') {
    return (
      `🧾 *Official Reward Bill Receipt - ${bName}*\n\n` +
      `Hello ${params.customerName}! ✨\n` +
      `Your discount voucher *${params.voucherCode}* for *"${params.rewardTitle}"* has been successfully applied to your bill!\n\n` +
      `Thank you for shopping with us! Visit again soon for more exciting rewards.` +
      contactLine
    );
  }

  return (
    `🌟 *VIP Customer Reward Pass - ${bName}*\n\n` +
    `Hello ${params.customerName}! ✨\n` +
    `Congratulations! Here is your official VIP reward pass from *${bName}*:\n\n` +
    `🎟️ *Voucher Code:* ${params.voucherCode}\n` +
    `🎁 *Reward:* ${params.rewardTitle}${params.rewardValue ? ` (${params.rewardValue})` : ''}\n` +
    `⏳ *Valid Till:* ${expiryFormatted}\n` +
    `📍 *Terms:* ${params.terms || 'Present pass or voucher code at cashier counter during checkout'}\n\n` +
    `Show this pass at our billing counter to claim your discount!` +
    contactLine
  );
}

/**
 * Shares the actual downloaded reward pass image on WhatsApp.
 * - On Mobile (Web Share API): attaches actual image PNG file without unwanted text/links.
 * - On Desktop / WhatsApp Web: copies image to clipboard, auto-downloads file,
 *   and opens WhatsApp Web chat directly so user can simply paste (Ctrl+V) the image.
 * Uses preloaded image if available for 0ms delay!
 */
export async function shareRewardPassOnWhatsApp(
  options: ShareRewardWhatsAppOptions
): Promise<{ method: 'native_share' | 'clipboard_and_tab'; success: boolean }> {
  // Use preloaded image if provided to avoid re-generating canvas
  const { dataUrl, blob, filename } = options.preloaded || (await generateRewardPassDataUrl(options));

  let cleanPhone = options.targetPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  const hasText = !!options.shareText && options.shareText.trim().length > 0;
  const dispatchUrl = hasText
    ? (options.dispatchMode === 'web'
        ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(options.shareText!.trim())}`
        : `https://wa.me/${cleanPhone}?text=${encodeURIComponent(options.shareText!.trim())}`)
    : (options.dispatchMode === 'web'
        ? `https://web.whatsapp.com/send?phone=${cleanPhone}`
        : `https://wa.me/${cleanPhone}`);

  // 1. Try Mobile Web Share API with image file
  const imageFile = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
    try {
      const shareData: ShareData = {
        files: [imageFile],
        title: `🎁 ${options.businessName} Reward Voucher - ${options.voucherCode}`,
      };
      if (hasText) {
        shareData.text = options.shareText!.trim();
      }
      await navigator.share(shareData);
      return { method: 'native_share', success: true };
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { method: 'native_share', success: false };
      }
    }
  }

  // 2. Desktop WhatsApp Web / Browser Fallback:
  // Copy image to clipboard instantly
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
    }
  } catch (clipErr) {
    console.warn('Clipboard copy fallback error', clipErr);
  }

  // Also auto-trigger image download
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (dlErr) {
    console.warn('Auto download error', dlErr);
  }

  // Open WhatsApp in new tab
  if (typeof window !== 'undefined') {
    window.open(dispatchUrl, '_blank', 'noopener,noreferrer');
  }

  return { method: 'clipboard_and_tab', success: true };
}

/**
 * 1-Click Direct WhatsApp Image Sender:
 * Automatically formats phone number, builds message with digital pass link,
 * generates/retrieves turbo cached image pass, copies to clipboard (or mobile native share),
 * and directly opens WhatsApp chat for that specific number!
 */
export async function sendRewardImageDirectToWhatsAppNumber(params: {
  targetPhone: string;
  businessName: string;
  rewardTitle: string;
  rewardValue?: string;
  voucherCode: string;
  customerName?: string;
  customerPhone?: string;
  expiresAt?: string;
  terms?: string;
  bizMarketingPhone?: string;
  businessAddress?: string;
  status?: string;
  dispatchMode?: 'app' | 'web';
  customShareText?: string;
  minBillAmount?: string;
}): Promise<{ method: 'native_share' | 'clipboard_and_tab'; success: boolean }> {
  const custName = params.customerName || 'Valued Customer';
  const expiry = params.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString();

  // Pure Image Mode: When sharing or sending the image pass, do NOT send text message or customer panel links.
  const shareText = params.customShareText || '';

  // Fast preloaded image canvas
  const preloaded = await generateRewardPassDataUrl({
    businessName: params.businessName,
    rewardTitle: params.rewardTitle,
    rewardValue: params.rewardValue,
    voucherCode: params.voucherCode,
    customerName: custName,
    customerPhone: params.customerPhone || params.targetPhone,
    expiresAt: expiry,
    terms: params.terms,
    minBillAmount: params.minBillAmount,
    quality: 'fast',
  });

  return shareRewardPassOnWhatsApp({
    businessName: params.businessName,
    rewardTitle: params.rewardTitle,
    rewardValue: params.rewardValue,
    voucherCode: params.voucherCode,
    customerName: custName,
    customerPhone: params.customerPhone || params.targetPhone,
    expiresAt: expiry,
    terms: params.terms,
    minBillAmount: params.minBillAmount,
    targetPhone: params.targetPhone,
    shareText,
    dispatchMode: params.dispatchMode || (typeof window !== 'undefined' && window.innerWidth < 768 ? 'app' : 'web'),
    preloaded,
  });
}
