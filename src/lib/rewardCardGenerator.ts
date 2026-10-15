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
}

/**
 * Generates and downloads a high-resolution, print-ready VIP Reward Pass image (PNG)
 */
export async function downloadRewardPassImage(options: RewardDownloadOptions): Promise<string> {
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
  } = options;

  // 1. Generate QR code for counter verification
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const verifyUrl = `${origin}/?verify_reward=${encodeURIComponent(voucherCode)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 240,
    margin: 1,
    color: {
      dark: '#1e1b4b',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  // Load QR image element
  const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  // 2. Setup High-DPI Canvas (900x1160)
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1160;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

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

  // Reward Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 34px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  const cleanTitle = rewardTitle.length > 36 ? rewardTitle.slice(0, 34) + '...' : rewardTitle;
  ctx.fillText(cleanTitle, 75, 355);

  // Subtitle / Instruction
  ctx.fillStyle = '#DDD6FE';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillText('Exclusive discount unlocked & verified for billing counter discount.', 75, 390);

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
  ctx.fillText('1. Show this QR code or Voucher code to cashier.', 380, 810);
  ctx.fillText('2. Cashier scans QR with live camera to verify.', 380, 840);
  ctx.fillText('3. Discount is applied directly on your bill.', 380, 870);

  ctx.fillStyle = '#16A34A';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('✓ 100% Genuine Issued Voucher • Single Use Only', 380, 915);

  // Terms & Conditions Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  const cleanTerms = terms.length > 95 ? terms.slice(0, 92) + '...' : terms;
  ctx.fillText(`Terms: ${cleanTerms}`, 450, 1040);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('LocalBoost AI Verified Customer Loyalty Network', 450, 1075);

  // Convert to Data URL
  const dataUrl = canvas.toDataURL('image/png');

  // Trigger download
  const filename = `Reward-${businessName.replace(/[^a-zA-Z0-9]/g, '')}-${voucherCode}.png`;
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}
