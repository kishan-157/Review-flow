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
  Smartphone,
  Zap,
  CheckCircle2,
  Gift,
  Award,
  Layers,
  Store,
  Copy,
  Search,
  Check,
  Sliders,
  UserCheck,
  BarChart3,
  Receipt,
  FileText,
  BadgeCheck,
} from 'lucide-react';

interface LandingHeroProps {
  onGetStarted: () => void;
  onPreviewFlow: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onGetStarted,
  onPreviewFlow,
}) => {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'scan' | 'filter' | 'review' | 'loyalty'>('scan');

  return (
    <div className="space-y-24 pb-24 overflow-hidden">
      {/* =========================================================================
          HERO SECTION (LocalBoost AI System Overview)
         ========================================================================= */}
      <section className="relative pt-12 md:pt-20 px-6 max-w-7xl mx-auto">
        {/* Ambient Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-purple-500/10 via-[#6C3BFF]/15 to-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 border border-purple-200/80 rounded-full text-xs font-semibold text-[#6C3BFF]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered Google Review &amp; Customer Growth System</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-900 tracking-tight leading-[1.12]">
              Scan QR Standee = <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C3BFF] via-purple-600 to-indigo-600">
                5-Star Google Reviews
              </span> &amp; Repeat Footfall.
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed">
              Place your customized QR standee on your cash counter or tables. Customers scan with their phone camera, get AI-crafted natural review suggestions in 3 languages, publish to Google in seconds, and unlock VIP loyalty rewards.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                type="button"
                onClick={onGetStarted}
                className="px-7 py-3.5 text-sm font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Client &amp; Admin Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onPreviewFlow}
                className="px-6 py-3.5 text-sm font-bold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all hover:border-neutral-400 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#6C3BFF]" />
                <span>Simulate Live Review Flow</span>
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
                Works on All Smartphone Cameras
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Private Negative Feedback Shield
              </span>
            </div>
          </div>

          {/* Right Column: High-Fidelity Standee Showcase Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-[#6C3BFF]/20 via-purple-400/20 to-transparent rounded-3xl blur-2xl pointer-events-none" />

            {/* Tabletop Standee Representation */}
            <div className="relative w-full max-w-sm bg-neutral-900 text-white rounded-3xl p-6 border border-neutral-700 shadow-2xl space-y-5">
              {/* Top Standee Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">LocalBoost Review Standee</div>
                    <div className="text-[10px] text-neutral-400 font-mono">Dynamic QR · Instant Google Review</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Live Ready</span>
                </div>
              </div>

              {/* QR Standee Center Preview */}
              <div className="bg-gradient-to-b from-neutral-800/90 to-neutral-900 border border-neutral-700/60 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden group">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                    Rate Your Experience
                  </span>
                  <div className="text-sm font-black text-white tracking-wide">
                    SCAN WITH YOUR CAMERA
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Point camera at QR code to review &amp; get VIP rewards
                  </div>
                </div>

                {/* Simulated Standee QR Box */}
                <div className="w-36 h-36 mx-auto bg-white rounded-2xl p-2.5 shadow-lg flex flex-col items-center justify-center relative">
                  <div className="w-full h-full bg-neutral-900 rounded-xl p-2 flex items-center justify-center relative">
                    <QrCode className="w-full h-full text-white" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                        <span className="text-[10px] font-black text-[#6C3BFF]">G</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5 Shimmering Gold Stars */}
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {/* Feature Highlights on Standee */}
              <div className="bg-white text-neutral-900 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF]" />
                    12 AI Review Suggestions
                  </span>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    3 Languages
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
                  <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-emerald-600" />
                    Instant Loyalty Voucher
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Repeat Sales
                  </span>
                </div>
              </div>

              {/* Live Metric Banner */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Zap className="w-3.5 h-3.5" />
                  +350% 5-Star Reviews
                </span>
                <span className="font-mono text-neutral-500">Google Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          EXACT SYSTEM WORKFLOW (How It Works in Reality)
         ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#6C3BFF] uppercase tracking-wider">
            Complete Workflow Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
            How The LocalBoost AI System Works
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            Every step is engineered to maximize authentic positive Google reviews while protecting your reputation and driving repeat visits.
          </p>
        </div>

        {/* 4 Steps Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold text-sm">
                01
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                Table or Counter
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900">1. Customer Scans QR</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customer opens phone camera and scans the tabletop QR standee. No app installation needed; opens instantly on all mobile browsers.
            </p>
            <div className="pt-2 text-[11px] text-neutral-500 font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[#6C3BFF]" />
              <span>Language: English, हिंदी, ગુજરાતી</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold text-sm">
                02
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Smart Star Router
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900">2. Smart Star Rating</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customer taps their star rating. <strong className="text-neutral-900">4 &amp; 5 Stars</strong> unlocks 12 AI review drafts. <strong className="text-rose-700">1–3 Stars</strong> routes to Private Feedback Shield!
            </p>
            <div className="pt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>1-3 Stars Never Go To Google</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold text-sm">
                03
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                1-Click Direct
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900">3. 1-Click Google Review</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customer selects their preferred AI-drafted review, clicks copy, and the system automatically opens their Google Maps review box to paste and publish!
            </p>
            <div className="pt-2 text-[11px] text-purple-700 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF]" />
              <span>12 Keyword-Targeted Drafts</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold text-sm">
                04
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Counter Redemption
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900">4. VIP Reward &amp; Bill Off</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customer instantly receives a digital VIP discount voucher. Cashier easily verifies and redeems it by <strong className="text-neutral-900">Mobile No or Name</strong> at billing!
            </p>
            <div className="pt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mobile / Name Quick Search</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ORIGINAL CORE SYSTEM FEATURES (Detailed Information Breakdown)
         ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#6C3BFF] uppercase tracking-wider">
            Original System Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
            Everything Built Into LocalBoost AI
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            A comprehensive, multi-tenant platform designed specifically for local Indian businesses and cashier operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1: AI Keyword Engine & 12 Drafts */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              AI Keywords &amp; 12 Review Drafts
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Business owners define custom focus keywords (e.g., <em>Courteous Staff, Fast Service, Delicious Food</em>). The AI crafts 12 authentic, human-sounding reviews that naturally weave these keywords into high-ranking Google reviews.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Automatic Suggestion Rotation</span>
              <span className="text-[#6C3BFF] font-bold">12 Drafts</span>
            </div>
          </div>

          {/* Feature 2: Private Feedback Shield */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Private Negative Feedback Shield
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Unhappy customers rating 1, 2, or 3 stars are seamlessly guided to a private manager message form instead of Google Maps. This allows you to resolve grievances privately and keeps negative reviews off the public web.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Protects Google Star Rating</span>
              <span className="text-rose-600 font-bold">100% Private</span>
            </div>
          </div>

          {/* Feature 3: Dynamic QR Standee Generator */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Custom QR Standee &amp; Logo Studio
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Generate tabletop standees featuring your unique business QR code. Upload your business logo (circular or square badge), customize colors, and download print-ready high-resolution PNGs for cash counters and dining tables.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>High Error Correction (Level H)</span>
              <span className="text-blue-600 font-bold">Print Ready</span>
            </div>
          </div>

          {/* Feature 4: Digital Loyalty Rewards & VIP Cards */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Digital Loyalty VIP Rewards
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Incentivize honest reviews by rewarding 5-star reviewers with an instant digital coupon (percentage discount, flat cash off, or free dessert). Customers get a unique voucher code and expiration timer directly on their screen.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Boosts Repeat Visits</span>
              <span className="text-amber-600 font-bold">VIP Vouchers</span>
            </div>
          </div>

          {/* Feature 5: Cashier Counter Verification & Redemption */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Cashier Quick Mobile &amp; Name Search
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Billing staff can search customer vouchers in seconds by typing the customer's <strong className="text-neutral-900">Mobile Number, Name, or Voucher Code</strong>. Real-time autocomplete suggestions allow instant 1-click verification &amp; redemption.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Prevents Duplicate Redemption</span>
              <span className="text-emerald-600 font-bold">1-Click Redeem</span>
            </div>
          </div>

          {/* Feature 6: Multilingual Local Indian Experience */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Trilingual: English, Hindi &amp; Gujarati
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Prominently displayed language switcher placed front-and-center right at the top of the review card. Customers can select English 🇬🇧, हिंदी 🇮🇳, or ગુજરાતી 🇮🇳 and all 12 review suggestions immediately translate into natural regional phrasing.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Culturally Authentic Tone</span>
              <span className="text-indigo-600 font-bold">3 Languages</span>
            </div>
          </div>

          {/* Feature 7: Live Real-Time Analytics */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Daily Scan &amp; Conversion Analytics
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Interactive charts show total QR standee scans, star ratings breakdown, 5-star review conversion percentage, and Google review clicks. Business owners can inspect daily traffic and peak review hours.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Interactive Recharts Graphs</span>
              <span className="text-[#6C3BFF] font-bold">Live Tracking</span>
            </div>
          </div>

          {/* Feature 8: First-Time Setup Checklist */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Interactive Setup Checklist
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              New business onboarding checklist covering Business Profile, Google Review URL, AI Keywords &amp; 12 Drafts, QR Standee generation, Loyalty Program setup, and a Live Test Simulation. Smooth tab jump on click with progress tracking.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Guided 6-Step Setup</span>
              <span className="text-teal-600 font-bold">100% Ready</span>
            </div>
          </div>

          {/* Feature 9: Multi-Tenant Super Admin Control */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Super Admin Multi-Client Control
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Complete administrator panel to register client businesses, generate customer codes (e.g. <em>LB-CUS-XXXX</em>), set validity periods (1 month, 1 year, lifetime), audit feedback logs, and inspect individual client workspaces.
            </p>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Enterprise Ready</span>
              <span className="text-neutral-900 font-bold">Admin Suite</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROLE-BASED WORKSPACE OVERVIEW
         ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="bg-neutral-900 text-white rounded-3xl p-8 sm:p-12 border border-neutral-800 shadow-xl space-y-8">
          <div className="text-left space-y-2 max-w-xl">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Platform Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Built for Owners, Cashiers &amp; Customers
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              Every role has an optimized interface built for fast operation during busy business hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Module 1: Customer Review Page */}
            <div className="p-6 rounded-2xl bg-neutral-800/60 border border-neutral-700 space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Customer Mobile Review Experience</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Clean, mobile-first web app that loads upon scanning the tabletop QR standee. Instant language choice, star ratings, 1-click draft copies, and digital loyalty cards.
              </p>
              <div className="pt-3 border-t border-neutral-700/60 text-xs text-purple-300 font-semibold">
                No app installation required
              </div>
            </div>

            {/* Module 2: Business Owner Dashboard */}
            <div className="p-6 rounded-2xl bg-neutral-800/60 border border-neutral-700 space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Business Owner Control Hub</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Manage business profile, customize QR standees, define 12 keyword review drafts, set up VIP loyalty rules, read private customer feedback, and track daily scan charts.
              </p>
              <div className="pt-3 border-t border-neutral-700/60 text-xs text-emerald-300 font-semibold">
                First-time setup checklist included
              </div>
            </div>

            {/* Module 3: Cashier Counter Verification */}
            <div className="p-6 rounded-2xl bg-neutral-800/60 border border-neutral-700 space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Cashier Counter Redemption Desk</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Dedicated billing counter interface to instantly search and redeem customer VIP discount vouchers by Mobile Number, Customer Name, or Voucher Code in 2 seconds.
              </p>
              <div className="pt-3 border-t border-neutral-700/60 text-xs text-amber-300 font-semibold">
                Real-time autocomplete search
              </div>
            </div>
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
              Sign in to manage your QR standees, AI review keywords, customer loyalty vouchers, and daily scan analytics.
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
              Simulate Live Review Flow
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
