import React, { useState } from 'react';
import {
  QrCode,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Globe,
  Star,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Heart,
  Smartphone,
  Zap,
  CheckCircle2,
  Gift,
  Award,
  Layers,
  Store,
  UtensilsCrossed,
  Hotel,
  Stethoscope,
  Smile,
  Shield,
  Copy,
} from 'lucide-react';

interface LandingHeroProps {
  onGetStarted: () => void;
  onPreviewFlow: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onGetStarted,
  onPreviewFlow,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<'acrylic' | 'wood' | 'card'>('acrylic');

  return (
    <div className="space-y-24 pb-24 overflow-hidden">
      {/* =========================================================================
          HERO SECTION (Inklude.in Branded Style)
         ========================================================================= */}
      <section className="relative pt-12 md:pt-20 px-6 max-w-7xl mx-auto">
        {/* Ambient Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-purple-500/10 via-[#6C3BFF]/15 to-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 border border-purple-200/80 rounded-full text-xs font-semibold text-[#6C3BFF]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart NFC &amp; Dynamic QR Google Review System</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-900 tracking-tight leading-[1.12]">
              1 Tap on Phone = <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C3BFF] via-purple-600 to-indigo-600">
                Instant 5-Star
              </span> Google Reviews.
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed">
              Place our premium contactless NFC &amp; QR standees on your cash counter or tables. 
              Customers tap their phone to write genuine, human-like reviews in 15 seconds.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                type="button"
                onClick={onGetStarted}
                className="px-7 py-3.5 text-sm font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Client &amp; Admin Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onPreviewFlow}
                className="px-6 py-3.5 text-sm font-bold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all hover:border-neutral-400 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#6C3BFF]" />
                <span>Simulate 1-Tap Customer Review</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-neutral-500 font-medium">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                No App Download Needed
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Works on All iOS &amp; Android
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Private Feedback Shield
              </span>
            </div>
          </div>

          {/* Right Column: High-Fidelity Standee Showcase Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-[#6C3BFF]/20 via-purple-400/20 to-transparent rounded-3xl blur-2xl pointer-events-none" />

            {/* Physical Standee Card Representation */}
            <div className="relative w-full max-w-sm bg-neutral-900 text-white rounded-3xl p-6 border border-neutral-700 shadow-2xl space-y-5">
              {/* Top Standee Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">LocalBoost Smart Standee</div>
                    <div className="text-[10px] text-neutral-400 font-mono">NFC Embedded · Instant Link</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Tap Active</span>
                </div>
              </div>

              {/* NFC Sensor & Google Stars Area */}
              <div className="bg-gradient-to-b from-neutral-800/90 to-neutral-900 border border-neutral-700/60 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden group">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#6C3BFF]/20 border border-[#6C3BFF]/40 flex items-center justify-center text-[#9D7AFF] shadow-inner">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white tracking-wide">
                    TAP YOUR PHONE HERE
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Hold camera or top edge of phone near standee
                  </div>
                </div>

                {/* 5 Shimmering Stars */}
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {/* Dynamic QR Backup */}
              <div className="bg-white text-neutral-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                    Or Scan with Camera
                  </span>
                  <div className="text-xs font-bold text-neutral-900">
                    Direct 1-Second Review
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    Generates natural human drafts
                  </div>
                </div>
                <div className="w-16 h-16 bg-neutral-900 rounded-xl p-1.5 flex items-center justify-center shrink-0">
                  <QrCode className="w-full h-full text-white" />
                </div>
              </div>

              {/* Live Metric Banner */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Zap className="w-3.5 h-3.5" />
                  +350% More 5-Star Reviews
                </span>
                <span className="font-mono text-neutral-500">Google Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS (3 Simple Steps)
         ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#6C3BFF] uppercase tracking-wider">
            Super Simple Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
            How Smart NFC Review Works
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            No typing long business URLs or searching on Google Maps. Customers complete it before walking out!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-neutral-900">1. Customer Taps or Scans</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customer taps their smartphone on the acrylic/wooden NFC counter stand or scans the high-res QR code.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-neutral-900">2. Natural Human Drafts</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              The landing page assists with realistic, conversational review options in English, Hindi, or Gujarati.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-neutral-900">3. Direct 1-Click Publish</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              The draft is copied and customer lands right on your Google Maps review dialog to post and unlock rewards!
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRODUCT TYPES SHOWCASE (Like Inklude.in)
         ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="bg-neutral-900 text-white rounded-3xl p-8 sm:p-12 border border-neutral-800 shadow-xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Hardware Collection
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Choose Your Review Standee Style
              </h2>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-neutral-800 p-1 rounded-xl border border-neutral-700/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedProduct('acrylic')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedProduct === 'acrylic' ? 'bg-[#6C3BFF] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Glossy Acrylic
              </button>
              <button
                type="button"
                onClick={() => setSelectedProduct('wood')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedProduct === 'wood' ? 'bg-[#6C3BFF] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Premium Wood
              </button>
              <button
                type="button"
                onClick={() => setSelectedProduct('card')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedProduct === 'card' ? 'bg-[#6C3BFF] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Staff Pocket Card
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className={`p-6 rounded-2xl border transition-all ${selectedProduct === 'acrylic' ? 'bg-purple-950/30 border-[#6C3BFF]' : 'bg-neutral-800/60 border-neutral-700'}`}>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-4">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Acrylic Table Standee</h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Crystal-clear acrylic with weather-proof UV printing. Perfect for cafe tables, hotel reception desks, and billing counters.
              </p>
              <div className="mt-4 pt-4 border-t border-neutral-700/60 flex items-center justify-between text-xs">
                <span className="text-neutral-400">NFC + High-Res QR</span>
                <span className="text-emerald-400 font-bold">Most Popular</span>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${selectedProduct === 'wood' ? 'bg-purple-950/30 border-[#6C3BFF]' : 'bg-neutral-800/60 border-neutral-700'}`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Handcrafted Wooden Block</h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Natural engraved wood with integrated NFC micro-chip. Loved by fine-dining restaurants, boutique cafes, and luxury spas.
              </p>
              <div className="mt-4 pt-4 border-t border-neutral-700/60 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Natural Teak Finish</span>
                <span className="text-amber-400 font-bold">Luxury Look</span>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${selectedProduct === 'card' ? 'bg-purple-950/30 border-[#6C3BFF]' : 'bg-neutral-800/60 border-neutral-700'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Staff Smart NFC Card</h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Credit-card sized NFC card that fits in waitstaff pockets or lanyard holders. Tap directly on customer phones at the table!
              </p>
              <div className="mt-4 pt-4 border-t border-neutral-700/60 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Pocket Friendly</span>
                <span className="text-purple-400 font-bold">Portable</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          KEY ADVANTAGES & FEATURES
         ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#6C3BFF] uppercase tracking-wider">
            Why Local Businesses Love Us
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
            Engineered for Maximum 5-Star Reviews
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Human-Like Review Suggestions</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customers rarely know what to write. Our engine generates conversational, heartfelt sentences that sound completely authentic and natural.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Private Feedback Shield</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              If an unhappy customer selects 1-3 stars, they are seamlessly guided to a private manager message form. Resolve issues before they reach Google!
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Instant Loyalty Card Rewards</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Reward customers with digital coupon cards immediately upon posting their review, giving them an incentive to return next week.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Live Daily Traffic Analytics</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Track daily taps, peak hours, and customer conversion rates in your dashboard using real-time Recharts interactive graphs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Multilingual: English, Hindi &amp; Gujarati</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Target your local Indian customer base effortlessly with localized phrases that feel personal and culturally native.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">Print-Ready High-Res Standees</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Download CMYK 300 DPI vector PDFs and print your table standees locally in any size with your custom logo and color palette.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BOTTOM CTA SECTION
         ========================================================================= */}
      <section className="max-w-4xl mx-auto px-6 text-center space-y-6">
        <div className="bg-gradient-to-tr from-[#6C3BFF] via-purple-700 to-indigo-700 text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-6 relative overflow-hidden">
          <div className="space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to Turn Every Visitor Into a 5-Star Review?
            </h2>
            <p className="text-sm sm:text-base text-purple-100 max-w-xl mx-auto">
              Sign in to manage your NFC standees, review keywords, customer loyalty, and daily scan analytics.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-[#6C3BFF] bg-white hover:bg-neutral-100 rounded-xl shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
            >
              Client &amp; Admin Sign In
            </button>
            <button
              type="button"
              onClick={onPreviewFlow}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors cursor-pointer"
            >
              Test Live Review Page
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
