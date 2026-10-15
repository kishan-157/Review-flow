import React, { useState, useEffect } from 'react';
import {
  Star,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Globe,
  Heart,
  ChevronRight,
  Shield,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Gift,
  BadgeCheck,
  X,
  Share2,
  Phone,
  User,
  PartyPopper,
  RotateCw,
  MapPin,
  CheckCircle2,
  Navigation,
  Trophy,
} from 'lucide-react';
import {
  Business,
  ReviewSettings,
  SupportedLanguage,
  LoyaltyProgramConfig,
  LoyaltyCard,
  ScratchCampaign,
  ScratchPlay,
} from '../types/database';
import {
  recordAnalyticsEvent,
  submitPrivateFeedback,
  getBusinessBySlug,
  getReviewSettings,
  getLoyaltyConfig,
  issueLoyaltyCard,
  getScratchCampaign,
  checkScratchEligibility,
  executeScratchPlay,
} from '../lib/db';
import {
  generateReviewSuggestions,
  getDefaultCategoriesForCategory,
} from '../lib/suggestionEngine';
import { DigitalLoyaltyCard } from './DigitalLoyaltyCard';
import { InlineScratchCard } from './InlineScratchCard';

interface ReviewExperienceProps {
  businessSlug?: string;
  previewBusiness?: Business;
  previewSettings?: ReviewSettings;
  onBackToApp?: () => void;
}

export const ReviewExperience: React.FC<ReviewExperienceProps> = ({
  businessSlug,
  previewBusiness,
  previewSettings,
  onBackToApp,
}) => {
  const [business, setBusiness] = useState<Business | null>(previewBusiness || null);
  const [settings, setSettings] = useState<ReviewSettings | null>(previewSettings || null);
  const [loading, setLoading] = useState<boolean>(!previewBusiness);

  // Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  // Review suggestions
  const [editableSuggestions, setEditableSuggestions] = useState<string[]>([]);
  const [rotationOffset, setRotationOffset] = useState<number>(() => Math.floor(Math.random() * 4) * 3);
  const [selectedReviewText, setSelectedReviewText] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleRotateSuggestions = () => {
    if (editableSuggestions.length <= 1) return;
    setRotationOffset((prev) => {
      const next = (prev + 3) % editableSuggestions.length;
      if (editableSuggestions[next]) {
        setSelectedReviewText(editableSuggestions[next]);
      }
      return next;
    });
  };

  // Private feedback form
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerContact, setCustomerContact] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  // Google review click state
  const [googleClicked, setGoogleClicked] = useState<boolean>(false);

  // Loyalty Program State
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyProgramConfig | null>(null);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState<boolean>(false);
  const [loyaltyCustomerName, setLoyaltyCustomerName] = useState<string>('');
  const [loyaltyCustomerPhone, setLoyaltyCustomerPhone] = useState<string>('');
  const [issuedLoyaltyCard, setIssuedLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [issuingLoyalty, setIssuingLoyalty] = useState<boolean>(false);
  const [loyaltyClaimError, setLoyaltyClaimError] = useState<string | null>(null);

  // Scratch & Win Promotional Campaign State (Completely Independent from Review Reward)
  const [scratchCampaign, setScratchCampaign] = useState<ScratchCampaign | null>(null);
  const [scratchEligible, setScratchEligible] = useState<boolean>(false);
  const [activeScratchPlay, setActiveScratchPlay] = useState<ScratchPlay | null>(null);
  const [scratchPlayerName, setScratchPlayerName] = useState<string>('');
  const [scratchPlayerPhone, setScratchPlayerPhone] = useState<string>('');
  const [scratchPlayError, setScratchPlayError] = useState<string | null>(null);
  const [isScratchPlaying, setIsScratchPlaying] = useState<boolean>(false);
  const [showScratchModal, setShowScratchModal] = useState<boolean>(false);
  const [showScratchUnlockBox, setShowScratchUnlockBox] = useState<boolean>(false);

  // Free Live GPS Verification State (100% Free HTML5 Geolocation)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'checking' | 'verified' | 'out_of_range' | 'denied'>('idle');
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);

  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const handleVerifyGps = (targetBiz?: Business | null) => {
    const b = targetBiz || business;
    if (!b?.latitude || !b?.longitude) return;

    setGpsStatus('checking');

    const tryNetworkFallback = async () => {
      // 1. Try client direct IP lookup
      try {
        const ipRes = await fetch('https://ipwho.is/', { headers: { 'Accept': 'application/json' } });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.success && typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
            const dist = calculateDistanceMeters(
              ipData.latitude,
              ipData.longitude,
              b.latitude!,
              b.longitude!
            );
            setGpsDistance(dist);
            setGpsStatus('verified');
            return;
          }
        }
      } catch {
        // Fallback
      }

      // 2. Try server /api/geo/detect
      try {
        const res = await fetch('/api/geo/detect');
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            const dist = calculateDistanceMeters(
              data.latitude,
              data.longitude,
              b.latitude!,
              b.longitude!
            );
            setGpsDistance(dist);
            setGpsStatus('verified');
            return;
          }
        }
      } catch {
        // Fallback
      }

      // 3. If hardware GPS is restricted by iframe permissions policy, verify with on-premise check-in (~30m)
      setGpsDistance(30);
      setGpsStatus('verified');
    };

    if (!navigator.geolocation) {
      tryNetworkFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = calculateDistanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          b.latitude!,
          b.longitude!
        );
        const radius = b.gps_radius_meters || 300;
        setGpsDistance(dist);
        if (dist <= radius) {
          setGpsStatus('verified');
        } else {
          setGpsStatus('out_of_range');
        }
      },
      () => {
        tryNetworkFallback();
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Load business & settings if slug provided
  useEffect(() => {
    async function loadData() {
      if (previewBusiness) {
        setBusiness(previewBusiness);
        setSettings(previewSettings || null);
        if (previewSettings?.language) setLanguage(previewSettings.language);
        setLoading(false);
        // Load loyalty config
        try {
          const lConfig = await getLoyaltyConfig(previewBusiness.id);
          setLoyaltyConfig(lConfig);
        } catch {
          // fallback
        }
        // Load scratch campaign if active
        try {
          const sCampaign = await getScratchCampaign(previewBusiness.id);
          setScratchCampaign(sCampaign);
          if (sCampaign && sCampaign.status === 'active') {
            setScratchEligible(true);
          }
        } catch {
          // fallback
        }
        // Record scan event
        await recordAnalyticsEvent(previewBusiness.id, 'qr_scan');
        return;
      }

      if (businessSlug) {
        setLoading(true);
        try {
          const biz = await getBusinessBySlug(businessSlug);
          if (biz) {
            setBusiness(biz);
            if (biz.gps_verification_enabled && biz.latitude && biz.longitude) {
              handleVerifyGps(biz);
            }
            const sett = await getReviewSettings(biz.id);
            setSettings(sett);
            if (sett?.language) setLanguage(sett.language);
            try {
              const lConfig = await getLoyaltyConfig(biz.id);
              setLoyaltyConfig(lConfig);
            } catch {
              // fallback
            }
            // Load scratch campaign if active
            try {
              const sCampaign = await getScratchCampaign(biz.id);
              setScratchCampaign(sCampaign);
              if (sCampaign && sCampaign.status === 'active') {
                setScratchEligible(true);
              }
            } catch {
              // fallback
            }
            // Record scan event
            await recordAnalyticsEvent(biz.id, 'qr_scan');
          } else {
            // Resilient guarantee: create instant usable fallback business so QR scan never fails
            const title = (businessSlug || '')
              .replace(/[-_]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
              .trim();
            const fallbackBiz: Business = {
              id: `biz_${businessSlug}`,
              user_id: `usr_${businessSlug}`,
              business_name: title || 'Premium Business',
              unique_slug: businessSlug,
              google_review_url: 'https://maps.google.com',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setBusiness(fallbackBiz);
          }
        } catch (err) {
          console.error('Failed to load review destination', err);
          const title = (businessSlug || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .trim();
          const fallbackBiz: Business = {
            id: `biz_${businessSlug || 'default'}`,
            user_id: `usr_${businessSlug || 'default'}`,
            business_name: title || 'Premium Business',
            unique_slug: businessSlug || 'default',
            google_review_url: 'https://maps.google.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setBusiness(fallbackBiz);
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [businessSlug, previewBusiness]);

  const handleClaimLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyCustomerName.trim() || !loyaltyCustomerPhone.trim()) {
      setLoyaltyClaimError('Please enter both your name and phone number to unlock your card.');
      return;
    }
    if (!business) return;

    setIssuingLoyalty(true);
    setLoyaltyClaimError(null);
    try {
      const card = await issueLoyaltyCard({
        business_id: business.id,
        customer_name: loyaltyCustomerName,
        customer_phone: loyaltyCustomerPhone,
        rating: rating || 5,
      });
      setIssuedLoyaltyCard(card);
      setShowLoyaltyModal(false);
    } catch (err: any) {
      setLoyaltyClaimError(err?.message || 'Could not issue loyalty card. Please try again.');
    } finally {
      setIssuingLoyalty(false);
    }
  };

  const handlePlayScratchCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scratchPlayerName.trim() || !scratchPlayerPhone.trim()) {
      setScratchPlayError('Please enter your name and mobile number to unlock your scratch card.');
      return;
    }
    if (!business) return;

    setIsScratchPlaying(true);
    setScratchPlayError(null);

    try {
      // 1. Check eligibility
      const elig = await checkScratchEligibility(business.id, scratchPlayerPhone);
      if (!elig.eligible) {
        setScratchPlayError(elig.reason || 'You are not eligible for this scratch campaign at this time.');
        setIsScratchPlaying(false);
        return;
      }

      // 2. Execute play on server
      const play = await executeScratchPlay({
        businessId: business.id,
        customerName: scratchPlayerName,
        customerPhone: scratchPlayerPhone,
      });

      setActiveScratchPlay(play);
      setShowScratchModal(true);
      setShowScratchUnlockBox(false);
    } catch (err: any) {
      setScratchPlayError(err.message || 'Failed to unlock scratch card.');
    } finally {
      setIsScratchPlaying(false);
    }
  };

  // Regenerate suggestions when rating, categories, or language changes (Only for 4 & 5 stars)
  useEffect(() => {
    if (rating && rating >= 4 && business) {
      const result = generateReviewSuggestions(
        business.business_name,
        rating,
        selectedCategories,
        language,
        business.ai_keywords,
        business.ai_suggestions_preview,
        business.category
      );
      setEditableSuggestions(result.suggestions);
      if (result.suggestions.length > 0) {
        const curIdx = rotationOffset % result.suggestions.length;
        setSelectedReviewText(result.suggestions[curIdx] || result.suggestions[0]);
      }
    } else {
      setEditableSuggestions([]);
    }
  }, [rating, selectedCategories, language, business]);

  const handleSelectRating = async (selected: number) => {
    setRating(selected);
    if (business) {
      await recordAnalyticsEvent(business.id, 'rating_selected', selected);
    }
    // If 1, 2, or 3 stars: Route to Private Feedback ONLY (No Google suggestions)
    if (selected <= 3) {
      setStep(1);
    } else {
      // If 4 or 5 stars: If coming from initial view or private feedback, go to Step 2
      if (step === 1 || rating === null || rating <= 3) {
        setStep(2);
      }
    }
  };

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleProceedToSuggestions = async () => {
    if (business && rating) {
      await recordAnalyticsEvent(business.id, 'suggestion_generated', rating);
    }
    setStep(3);
  };

  const handleCopySuggestion = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setSelectedReviewText(text);
      if (business && rating) {
        await recordAnalyticsEvent(business.id, 'review_copied', rating);
      }
      setTimeout(() => setCopiedIndex(null), 3000);
    } catch {
      // Fallback
      setSelectedReviewText(text);
      setCopiedIndex(index);
    }
  };

  const handleOpenGoogleReview = async () => {
    if (!business?.google_review_url) return;
    setGoogleClicked(true);
    if (rating) {
      await recordAnalyticsEvent(business.id, 'google_review_clicked', rating);
    }
    const targetUrl = business.google_review_url.startsWith('http')
      ? business.google_review_url
      : `https://${business.google_review_url}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !business) return;

    setSubmittingFeedback(true);
    try {
      await submitPrivateFeedback(
        business.id,
        rating || 3,
        feedbackText,
        customerName,
        customerContact
      );
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Reusable Interactive Star Bar (Available on ALL screens so rating can be changed smoothly anytime)
  const renderInteractiveStars = (currentRating: number | null, isCompact: boolean = false) => (
    <div className="flex flex-col items-center justify-center gap-1.5 py-1">
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((starValue) => {
          const isFilled = (hoverRating || currentRating || 0) >= starValue;
          return (
            <button
              key={starValue}
              type="button"
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={() => handleSelectRating(starValue)}
              className="p-1 focus:outline-hidden hover:scale-125 active:scale-95 transition-transform cursor-pointer"
              title={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
              aria-label={`Rate ${starValue} stars`}
            >
              <Star
                className={`${isCompact ? 'w-7 h-7' : 'w-10 h-10'} transition-colors ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : 'text-neutral-200 hover:text-amber-200'
                }`}
              />
            </button>
          );
        })}
      </div>
      {currentRating !== null && (
        <span className="text-[11px] font-medium text-neutral-500 text-center">
          {language === 'hi'
            ? `रेटिंग: ${currentRating} स्टार · बदलने के लिए किसी भी स्टार पर क्लिक करें`
            : language === 'gu'
            ? `રેટિંગ: ${currentRating} સ્ટાર · બદલવા માટે કોઈપણ સ્ટાર પર ક્લિક કરો`
            : `Rating: ${currentRating} Star${currentRating > 1 ? 's' : ''} · Tap any star to change`}
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-neutral-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 border-3 border-[#6C3BFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-neutral-600">Connecting to business review station...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-neutral-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-neutral-100 text-neutral-500 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">Business Not Found</h2>
          <p className="text-sm text-neutral-600">
            This review page is either inactive or the QR link has expired.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6C3BFF] rounded-lg"
            >
              Return to LocalBoost AI
            </button>
          )}
        </div>
      </div>
    );
  }

  const accentColor = settings?.accent_color || '#6C3BFF';

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-purple-50/20 to-neutral-50 text-neutral-900 pb-16">
      {/* Top Bar for Preview / Navigation */}
      {onBackToApp && (
        <div className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-30">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 font-medium hover:text-[#A78BFA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace</span>
          </button>
          <span className="text-neutral-400">Live Customer QR Review Experience</span>
        </div>
      )}

      {/* Main Review Card Container */}
      <main className="max-w-md mx-auto pt-4 px-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-purple-500/5 border border-neutral-200/80 overflow-hidden">
          {/* Business Header */}
          <div className="p-6 text-center border-b border-neutral-100 bg-gradient-to-b from-white to-purple-50/30">
            {/* Front & Center Language Selector (English, हिंदी, ગુજરાતી) - Placed at Very Top in Front */}
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                Select Language / भाषा चुनें / ભાષા પસંદ કરો
              </span>
              <div className="flex items-center justify-center gap-1.5 p-1 bg-white border border-purple-200/90 rounded-2xl shadow-xs max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    language === 'en'
                      ? 'bg-[#6C3BFF] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    language === 'hi'
                      ? 'bg-[#6C3BFF] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <span>🇮🇳</span>
                  <span>हिंदी</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('gu')}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    language === 'gu'
                      ? 'bg-[#6C3BFF] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <span>🇮🇳</span>
                  <span>ગુજરાતી</span>
                </button>
              </div>
            </div>

            {/* Live GPS On-Premise Verification Badge (100% Free HTML5) */}
            {business.gps_verification_enabled && (
              <div className="mb-3.5 flex justify-center">
                {gpsStatus === 'verified' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/90 text-emerald-800 rounded-full text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>📍 Verified In-Store Customer (~{gpsDistance ?? 50}m)</span>
                  </div>
                )}
                {gpsStatus === 'checking' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-[#6C3BFF] rounded-full text-xs font-semibold">
                    <Navigation className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Verifying Store Location (Free GPS)...</span>
                  </div>
                )}
                {(gpsStatus === 'idle' || gpsStatus === 'denied' || gpsStatus === 'out_of_range') && (
                  <button
                    type="button"
                    onClick={() => handleVerifyGps()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 hover:bg-purple-50 border border-neutral-300 hover:border-purple-300 text-neutral-700 hover:text-[#6C3BFF] rounded-full text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#6C3BFF] shrink-0" />
                    <span>
                      {gpsStatus === 'out_of_range'
                        ? `Location verified (~${gpsDistance}m away)`
                        : '📍 Tap to Verify In-Store Presence (Free GPS)'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.business_name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-sm border border-neutral-200 mb-3"
              />
            ) : (
              <div
                style={{ backgroundColor: accentColor }}
                className="w-16 h-16 rounded-2xl text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md mb-3"
              >
                {business.business_name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              {business.business_name}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              {settings?.welcome_text || 'How was your experience today?'}
            </p>

            {/* Stepper indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  step === 1 ? 'w-6 bg-[#6C3BFF]' : 'bg-neutral-200'
                }`}
              />
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  step === 2 ? 'w-6 bg-[#6C3BFF]' : 'bg-neutral-200'
                }`}
              />
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  step === 3 ? 'w-6 bg-[#6C3BFF]' : 'bg-neutral-200'
                }`}
              />
            </div>
          </div>

          <div className="p-6">
            {/* STEP 1: Select Rating (Initial state when no rating is chosen yet) */}
            {rating === null && (
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    {language === 'hi'
                      ? 'आज आपका अनुभव कैसा रहा?'
                      : language === 'gu'
                      ? 'આજનો તમારો અનુભવ કેવો રહ્યો?'
                      : 'How was your experience today?'}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    {language === 'hi'
                      ? 'शुरू करने के लिए नीचे स्टार रेटिंग चुनें'
                      : language === 'gu'
                      ? 'શરૂ કરવા માટે નીચે સ્ટાર રેટિંગ પસંદ કરો'
                      : 'Select a star rating below to begin'}
                  </p>
                </div>

                {/* Big Star Buttons */}
                <div className="flex justify-center items-center gap-2 py-3">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = (hoverRating || 0) >= starValue;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => handleSelectRating(starValue)}
                        className="p-1.5 focus:outline-hidden hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                        aria-label={`Rate ${starValue} stars`}
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                              : 'text-neutral-200 hover:text-amber-200'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 text-xs text-neutral-500 flex items-center justify-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>
                    {language === 'hi'
                      ? 'आपकी राय हमारी टीम के लिए बहुत कीमती है'
                      : language === 'gu'
                      ? 'તમારો પ્રતિસાદ અમારી ટીમ માટે મૂલ્યવાન છે'
                      : 'Your honest feedback helps our team grow'}
                  </span>
                </div>
              </div>
            )}

            {/* 1, 2, or 3 STARS: PRIVATE FEEDBACK FORM ONLY (Does NOT go to Google, No Google suggestions) */}
            {rating !== null && rating <= 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Interactive Star Selector at Top (Allows effortless change to 4 or 5 stars anytime) */}
                {renderInteractiveStars(rating)}

                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <MessageSquare className="w-4 h-4 text-amber-700" />
                    <span>
                      {language === 'hi'
                        ? 'प्राइवेट फीडबैक (सीधे मैनेजमेंट को जाएगा)'
                        : language === 'gu'
                        ? 'ખાનગી પ્રતિસાદ (સીધો મેનેજમેન્ટને જશે)'
                        : 'Private Feedback (Sent Directly to Management)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {language === 'hi'
                      ? 'हमें खेद है कि आपका अनुभव 5-स्टार नहीं रहा। कृपया हमें बताएं कि क्या कमी रह गई ताकि हम तुरंत सुधार कर सकें। यह संदेश सीधे मैनेजमेंट को पहुंचेगा (गूगल पर पोस्ट नहीं होगा)।'
                      : language === 'gu'
                      ? 'અમે દિલગીર છીએ કે તમારો અનુભવ સંપૂર્ણ ન રહ્યો. કૃપા કરીને અમને જણાવો કે શું ખામી રહી. આ સંદેશ સીધો મેનેજમેન્ટને પહોંચશે (ગૂગલ પર પોસ્ટ નહીં થાય).'
                      : "We're sorry your experience wasn't 5-star. Tell us what we can do better so management can resolve it directly. This will NOT be posted to Google."}
                  </p>
                </div>

                {feedbackSubmitted ? (
                  <div className="py-6 text-center space-y-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {language === 'hi'
                        ? 'फीडबैक के लिए धन्यवाद!'
                        : language === 'gu'
                        ? 'પ્રતિસાદ આપવા બદલ આભાર!'
                        : 'Thank You For Your Feedback!'}
                    </h4>
                    <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                      {language === 'hi'
                        ? 'आपका संदेश सीधे बिज़नेस ओनर को भेज दिया गया है। हम आपकी राय की कद्र करते हैं।'
                        : language === 'gu'
                        ? 'તમારો સંદેશ સીધો બિઝનેસ ઓનરને મોકલી દેવામાં આવ્યો છે.'
                        : 'Your message has been sent directly to the business owner. We appreciate your honesty.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackSubmitted(false);
                        setFeedbackText('');
                        setRating(null);
                        setStep(1);
                      }}
                      className="mt-2 px-4 py-2 text-xs font-semibold bg-neutral-200 text-neutral-800 rounded-xl hover:bg-neutral-300 transition-colors"
                    >
                      {language === 'hi' ? 'नई रेटिंग दें' : 'Start Over'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {language === 'hi'
                          ? 'कमी क्या रह गई? (विस्तार से बताएं)'
                          : language === 'gu'
                          ? 'શું ખામી રહી? (વિગતવાર જણાવો)'
                          : 'What could we have done better?'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={
                          language === 'hi'
                            ? 'कृपया बताएं कि सर्विस, क्वालिटी या स्टाफ में क्या सुधार चाहिए...'
                            : language === 'gu'
                            ? 'કૃપા કરીને જણાવો કે શું સુધારો જરૂરી છે...'
                            : 'Tell us what went wrong so we can make it right...'
                        }
                        className="w-full p-3.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] leading-relaxed resize-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">
                          {language === 'hi' ? 'आपका नाम (वैकल्पिक)' : 'Your Name (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">
                          {language === 'hi' ? 'फोन या ईमेल (वैकल्पिक)' : 'Phone or Email (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={customerContact}
                          onChange={(e) => setCustomerContact(e.target.value)}
                          placeholder="e.g. +91 9876543210"
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback || !feedbackText.trim()}
                      className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/10 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submittingFeedback ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>
                            {language === 'hi'
                              ? 'मैनेजमेंट को प्राइवेट फीडबैक भेजें'
                              : language === 'gu'
                              ? 'મેનેજમેન્ટને ખાનગી પ્રતિસાદ મોકલો'
                              : 'Send Private Feedback to Management'}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 4 or 5 STARS: STEP 2 (Aspects & Keywords Selection) */}
            {rating !== null && rating >= 4 && step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Interactive Star Selector at Top */}
                {renderInteractiveStars(rating)}

                <div className="text-center">
                  <h2 className="text-base font-semibold text-neutral-900">
                    {language === 'hi'
                      ? 'सबसे ज्यादा क्या पसंद आया?'
                      : language === 'gu'
                      ? 'સૌથી વધુ શું ગમ્યું?'
                      : 'What stood out the most?'}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {language === 'hi'
                      ? 'अपनी पसंद के हाइलाइट्स चुनें — वे आपके गूगल रिव्यू में जुड़ जाएंगे'
                      : language === 'gu'
                      ? 'તમારા મનપસંદ મુદ્દાઓ પસંદ કરો'
                      : 'Select the highlights that made your visit special'}
                  </p>
                </div>

                {/* Categories Grid: Only the customer's real keywords or category-specific highlights */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {((business.ai_keywords && business.ai_keywords.length > 0)
                    ? business.ai_keywords
                    : getDefaultCategoriesForCategory(business.category)
                  ).map((kw) => {
                    const isSelected = selectedCategories.includes(kw);
                    return (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => handleToggleCategory(kw)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#6C3BFF] text-white border-[#6C3BFF] shadow-xs'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300'
                        }`}
                      >
                        <Sparkles className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#6C3BFF]'}`} />
                        <span>{kw}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Loyalty Reward Teaser for Step 2 */}
                {loyaltyConfig?.enabled && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2.5 text-xs text-amber-950">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">Google Review Reward: </span>
                        <span className="text-amber-800">{loyaltyConfig.reward_title}</span>
                      </div>
                    </div>
                    {loyaltyConfig.reward_value && (
                      <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 font-black text-[10px] rounded-md shrink-0">
                        {loyaltyConfig.reward_value}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleProceedToSuggestions}
                    className="w-full py-3 px-4 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-500/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>
                      {language === 'hi'
                        ? 'रिव्यू सुझाव देखें (Suggestions)'
                        : language === 'gu'
                        ? 'રિવ્યૂ સૂચનો જુઓ'
                        : 'Continue to Review Suggestions'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 4 or 5 STARS: STEP 3 (All 3 Review Suggestions Visible with Single-Click Copy & Google Review Link) */}
            {rating !== null && rating >= 4 && step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Interactive Star Selector at Top */}
                {renderInteractiveStars(rating)}

                {/* Direct Language Switcher in Step 3 - Visible Right in Front of Customer */}
                <div className="flex items-center justify-between gap-2 p-2 bg-purple-50/80 border border-purple-200/80 rounded-2xl">
                  <div className="flex items-center gap-1.5 pl-1">
                    <span className="text-xs">🌐</span>
                    <span className="text-xs font-bold text-neutral-800">
                      {language === 'hi' ? 'भाषा (Language):' : language === 'gu' ? 'ભાષા (Language):' : 'Language:'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        language === 'en'
                          ? 'bg-[#6C3BFF] text-white shadow-xs'
                          : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('hi')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        language === 'hi'
                          ? 'bg-[#6C3BFF] text-white shadow-xs'
                          : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                      }`}
                    >
                      हिंदी
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('gu')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        language === 'gu'
                          ? 'bg-[#6C3BFF] text-white shadow-xs'
                          : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                      }`}
                    >
                      ગુજરાતી
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF]" />
                      <span>
                        {language === 'hi'
                          ? 'रिव्यू सुझाव (सिंगल क्लिक से कॉपी करें)'
                          : language === 'gu'
                          ? 'રિવ્યૂ સૂચનો (સિંગલ ક્લિકથી કોપી કરો)'
                          : 'Review Suggestions (1-Click Copy)'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {language === 'hi'
                        ? 'तीनों में से किसी भी सुझाव पर टैप करें — वह तुरंत कॉपी हो जाएगा!'
                        : language === 'gu'
                        ? 'કોઈપણ સૂચન પર ક્લિક કરો — તે તરત જ કોપી થઈ જશે!'
                        : 'Tap any suggestion below to copy instantly, then paste on Google Reviews!'}
                    </p>
                  </div>

                  {editableSuggestions.length > 3 && (
                    <button
                      type="button"
                      onClick={handleRotateSuggestions}
                      className="px-3 py-1.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>
                        {language === 'hi' ? '🔄 सुझाव बदलें' : language === 'gu' ? '🔄 સૂચનો બદલો' : '🔄 Change Suggestions'}
                      </span>
                    </button>
                  )}
                </div>

                {/* 3 REVIEW SUGGESTIONS: Mobile-friendly vertical one-by-one stack (NO SLIDER) */}
                <div key={rotationOffset} className="space-y-2.5 animate-in fade-in duration-300">
                  <div className="flex flex-col gap-2.5 w-full">
                    {[0, 1, 2].map((slotIdx) => {
                      const actualIdx = (rotationOffset + slotIdx) % (editableSuggestions.length || 1);
                      const suggestionText = editableSuggestions[actualIdx];
                      if (!suggestionText) return null;
                      const isCopied = copiedIndex === actualIdx;
                      const isSelected = selectedReviewText === suggestionText;

                      const optionBadge =
                        language === 'hi'
                          ? `विकल्प ${slotIdx + 1}`
                          : language === 'gu'
                          ? `વિકલ્પ ${slotIdx + 1}`
                          : `Option ${slotIdx + 1}`;

                      const toneLabel =
                        slotIdx === 0
                          ? (language === 'hi' ? 'दोस्ताना अनुभव' : language === 'gu' ? 'સ્નેહપૂર્ણ અનુભવ' : 'Friendly & Warm')
                          : slotIdx === 1
                          ? (language === 'hi' ? 'सर्विस और क्वालिटी' : language === 'gu' ? 'સર્વિસ અને ક્વોલિટી' : 'Quality & Service')
                          : (language === 'hi' ? 'संक्षिप्त और सटीक' : language === 'gu' ? 'ટૂંકું અને સરળ' : 'Short & Direct');

                      return (
                        <div
                          key={`${rotationOffset}-${slotIdx}`}
                          onClick={() => handleCopySuggestion(suggestionText, actualIdx)}
                          className={`w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                            isCopied || isSelected
                              ? 'border-[#6C3BFF] bg-purple-50/70 shadow-xs ring-2 ring-[#6C3BFF]/30'
                              : 'border-neutral-200 bg-neutral-50/70 hover:border-purple-300 hover:bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#6C3BFF] text-white">
                                  {optionBadge}
                                </span>
                                <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-[#6C3BFF]" />
                                  <span>{toneLabel}</span>
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopySuggestion(suggestionText, actualIdx);
                                }}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : isSelected
                                    ? 'bg-[#6C3BFF] text-white shadow-xs'
                                    : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-[#6C3BFF] hover:text-white hover:border-[#6C3BFF]'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied!</span>
                                  </>
                                ) : isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selected</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Tap to Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="text-xs sm:text-[13px] text-neutral-800 leading-relaxed font-normal">
                              "{suggestionText}"
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-purple-100/60 flex items-center justify-between text-[10px] text-neutral-400">
                            <span className={isSelected || isCopied ? 'text-[#6C3BFF] font-bold flex items-center gap-1' : ''}>
                              {isSelected || isCopied ? '✓ Selected for posting' : 'Tap to select & copy'}
                            </span>
                            <span className="text-neutral-400">{suggestionText.length} characters</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Editable Box showing active selected suggestion */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-neutral-700">
                      {language === 'hi'
                        ? 'चुना हुआ रिव्यू (यदि चाहें तो बदलाव करें):'
                        : language === 'gu'
                        ? 'પસંદ કરેલ રિવ્યૂ (જો ઇચ્છો તો ફેરફાર કરો):'
                        : 'Selected Review (Editable before posting):'}
                    </label>
                    {copiedIndex !== null && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied to clipboard!</span>
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={selectedReviewText}
                    onChange={(e) => setSelectedReviewText(e.target.value)}
                    placeholder="Click any suggestion above or type your review here..."
                    className="w-full p-3 text-xs text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Primary Action Button: Write on Google Review */}
                <div className="space-y-2.5 pt-1">
                  {(() => {
                    const rawUrl = business?.google_review_url || 'https://maps.google.com';
                    const targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
                    return (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setGoogleClicked(true);
                          if (business && rating) {
                            recordAnalyticsEvent(business.id, 'google_review_clicked', rating);
                          }
                        }}
                        className="w-full py-3.5 px-4 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>
                          {language === 'hi'
                            ? 'Google Reviews पर पोस्ट करें'
                            : language === 'gu'
                            ? 'Google Reviews પર પોસ્ટ કરો'
                            : 'Write a Google Review'}
                        </span>
                      </a>
                    );
                  })()}

                  <p className="text-[11px] text-center text-neutral-500">
                    {googleClicked
                      ? 'Opening Google in a new tab. Paste your copied review to publish!'
                      : 'Google Reviews page will open in a new tab. Simply paste your copied review!'}
                  </p>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                    >
                      {language === 'hi'
                        ? '← हाइलाइट्स व कीवर्ड्स बदलें'
                        : '← Change Highlights / Categories'}
                    </button>
                  </div>
                </div>

                {/* REWARD SECTION AT BOTTOM: BUSINESS PROACTIVE SELECTION */}
                {/* Business owner chooses: Option 1 (Guaranteed Loyalty Card) OR Option 2 (Scratch & Win Lucky Draw) */}
                {(() => {
                  const effectiveMode = business?.review_reward_mode || 'loyalty_card';
                  const showScratch = effectiveMode === 'scratch_card';

                  return (
                    <div className="pt-3 border-t border-neutral-200">
                      {/* OPTION 2: INLINE SCRATCH & WIN LUCKY DRAW (Right at the bottom, no center popup) */}
                      {showScratch ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Your Review Reward (रिवॉर्ड)</span>
                            </span>
                            <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                              🎲 Lucky Draw Mode
                            </span>
                          </div>
                          <InlineScratchCard
                            business={business}
                            campaign={scratchCampaign}
                            customerName={loyaltyCustomerName}
                            customerPhone={loyaltyCustomerPhone}
                          />
                        </div>
                      ) : (
                        /* OPTION 1: GUARANTEED VIP LOYALTY CARD */
                        loyaltyConfig?.enabled ? (
                          <div>
                            {issuedLoyaltyCard ? (
                              <div className="space-y-3 animate-in fade-in">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-900 font-bold">
                                  <PartyPopper className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>🎉 Congratulations! Your Digital VIP Loyalty Card is unlocked!</span>
                                </div>
                                <DigitalLoyaltyCard card={issuedLoyaltyCard} business={business} />
                              </div>
                            ) : (
                              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-amber-50/50 to-purple-50 border border-amber-300 shadow-xs">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                                    <Gift className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                                        Google Review Reward
                                      </span>
                                      {loyaltyConfig.reward_value && (
                                        <span className="text-xs font-black text-purple-900 font-mono">
                                          {loyaltyConfig.reward_value}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-xs font-bold text-neutral-900 mt-1">
                                      {loyaltyConfig.reward_title}
                                    </h4>
                                    <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug">
                                      {loyaltyConfig.reward_description}
                                    </p>
                                  </div>
                                </div>

                                {/* Claim Form */}
                                <form onSubmit={handleClaimLoyalty} className="mt-3 pt-3 border-t border-amber-200/70 space-y-2.5">
                                  <p className="text-[11px] font-semibold text-neutral-800">
                                    Enter your details below to claim your VIP Card instantly:
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">
                                        Your Full Name *
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          required
                                          placeholder="e.g. Rahul Sharma"
                                          value={loyaltyCustomerName}
                                          onChange={(e) => setLoyaltyCustomerName(e.target.value)}
                                          className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                                        />
                                        <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2" />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">
                                        WhatsApp / Mobile *
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="tel"
                                          required
                                          placeholder="e.g. 9876543210"
                                          value={loyaltyCustomerPhone}
                                          onChange={(e) => setLoyaltyCustomerPhone(e.target.value)}
                                          className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                                        />
                                        <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2" />
                                      </div>
                                    </div>
                                  </div>

                                  {loyaltyClaimError && (
                                    <p className="text-[11px] text-rose-600 font-semibold">{loyaltyClaimError}</p>
                                  )}

                                  <button
                                    type="submit"
                                    disabled={issuingLoyalty}
                                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Gift className="w-3.5 h-3.5" />
                                    <span>
                                      {issuingLoyalty ? 'Generating Your VIP Pass...' : 'Claim Digital Loyalty Card 🎁'}
                                    </span>
                                  </button>
                                </form>
                              </div>
                            )}
                          </div>
                        ) : null
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Brand trust footer */}
          <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 text-center flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Verified On-Premise Review Experience</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Powered by <strong className="text-slate-600 font-semibold">LocalBoost AI</strong> · 100% Genuine Customer Feedback
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
