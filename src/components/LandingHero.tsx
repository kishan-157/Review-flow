import React from 'react';
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
} from 'lucide-react';

interface LandingHeroProps {
  onGetStarted: () => void;
  onPreviewFlow: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onGetStarted,
  onPreviewFlow,
}) => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="pt-12 md:pt-20 px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-[#6C3BFF] rounded-full text-xs font-semibold border border-purple-200/60">
          <Sparkles className="w-3.5 h-3.5" />
          <span>LocalBoost AI · Enterprise Google Review QR Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-neutral-900 tracking-tight text-balance leading-tight">
          Turn Every Customer Experience Into an Opportunity to Improve.
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Empower restaurants, clinics, hotels, and retail stores to convert real customer visits
          into 5-star Google Reviews with local multilingual suggestions and private feedback channels.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Client & Admin Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onPreviewFlow}
            className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Try Live Review Experience</span>
            <ExternalLink className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Value Proposition Highlights */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            100% Policy Compliant (No Gating)
          </span>
          <span className="text-neutral-300">·</span>
          <span className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#6C3BFF]" />
            English, Hindi & Gujarati Templates
          </span>
          <span className="text-neutral-300">·</span>
          <span className="flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-neutral-600" />
            Instant Print Standees
          </span>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">High-Res QR Standees</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Generate tabletop acrylic standees and counter cards configured with your business branding
              and unique review slug.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Multilingual Review Drafts</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customers choose specific categories (Food, Service, Ambience) to generate three distinct
              editable drafts in English, Hindi, or Gujarati.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Private Feedback Channel</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Customers can optionally submit direct private notes to management, helping businesses fix
              issues before public negative reviews occur.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Diagram */}
      <section className="max-w-5xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900">How the Flow Works</h2>
          <p className="text-xs text-neutral-500">
            A seamless 4-step journey designed for fast mobile conversion
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1.5">
            <span className="font-mono text-[#6C3BFF] font-bold text-sm block">01. Scan QR</span>
            <p className="text-neutral-600">Customer scans tabletop standee with smartphone camera.</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1.5">
            <span className="font-mono text-[#6C3BFF] font-bold text-sm block">02. Rate Experience</span>
            <p className="text-neutral-600">Selects star rating (1-5) and highlights memorable categories.</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1.5">
            <span className="font-mono text-[#6C3BFF] font-bold text-sm block">03. Copy Review Draft</span>
            <p className="text-neutral-600">Picks from 3 local drafts in English, Hindi, or Gujarati.</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-1.5">
            <span className="font-mono text-[#6C3BFF] font-bold text-sm block">04. Open Google</span>
            <p className="text-neutral-600">Opens Google review page to paste and publish with 1 tap.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-4xl mx-auto px-6">
        <div className="bg-[#6C3BFF] rounded-3xl p-8 sm:p-12 text-center text-white space-y-4 shadow-xl shadow-purple-500/20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to boost your local Google presence?
          </h2>
          <p className="text-purple-100 text-xs sm:text-sm max-w-lg mx-auto">
            Set up your restaurant or local business QR code in less than 2 minutes. No credit card required.
          </p>
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-white text-[#6C3BFF] hover:bg-neutral-50 rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              Get Started with LocalBoost AI
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
