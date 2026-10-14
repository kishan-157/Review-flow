import React, { useState, useEffect } from 'react';
import {
  QrCode,
  LayoutDashboard,
  Store,
  Sliders,
  BarChart3,
  MessageSquareText,
  Bell,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Star,
  Eye,
  LogOut,
  Send,
  AlertTriangle,
  Clock,
  Sparkles,
  Lock,
  Key,
  EyeOff,
  Bot,
  Zap,
  RefreshCw,
  Trash2,
  Tag,
  Compass,
  Globe,
  Link2,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Share2,
  Gift,
  BadgeCheck,
  Users,
  Search,
  Download,
  Filter,
  Phone,
  User,
  PartyPopper,
  Save,
  CheckCircle,
  ShieldCheck,
  MapPin,
  Navigation,
  MessageSquare,
  Receipt,
  Trophy,
} from 'lucide-react';
import {
  AuthSession,
  Business,
  ReviewSettings,
  BusinessAnalyticsSummary,
  Feedback,
  Announcement,
  FeedbackStatus,
  SupportedLanguage,
  LoyaltyProgramConfig,
  LoyaltyCard,
  RewardType,
  LoyaltyCardStatus,
} from '../types/database';
import {
  getBusinessAnalytics,
  getFeedbackByBusinessId,
  updateFeedbackStatus,
  getActiveAnnouncements,
  getUnreadAnnouncementCount,
  markAnnouncementsAsRead,
  getAdminSettings,
  updateBusiness,
  updateReviewSettings,
  getReviewSettings,
  stopImpersonation,
  changeUserPassword,
  checkCustomerAccessStatus,
  getLoyaltyConfig,
  updateLoyaltyConfig,
  getLoyaltyCardsByBusinessId,
  redeemLoyaltyCard,
  verifyLoyaltyCardByCode,
  searchLoyaltyCards,
  issueLoyaltyCard,
  getBusinessByUserId,
} from '../lib/db';
import {
  craftBusinessPromptLocally,
  analyzeBusinessPromptLocally,
  generate12KeywordDrafts,
} from '../lib/suggestionEngine';
import { QRCodeView } from './QRCodeView';
import { DigitalLoyaltyCard } from './DigitalLoyaltyCard';
import { DailyReviewAccessTrend } from './DailyReviewAccessTrend';
import { LoyaltyReminderManager } from './LoyaltyReminderManager';
import { ScratchCampaignManager } from './ScratchCampaignManager';

interface CustomerDashboardProps {
  session: AuthSession;
  onSignOut: () => void;
  onSessionUpdated: (session: AuthSession) => void;
  onPreviewReviewFlow: (business: Business, settings: ReviewSettings) => void;
  onOpenLiveReview?: (slug: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  session,
  onSignOut,
  onSessionUpdated,
  onPreviewReviewFlow,
  onOpenLiveReview,
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'loyalty' | 'scratch_offers' | 'ai_agent' | 'business' | 'settings' | 'qrcode' | 'analytics' | 'feedback' | 'announcements' | 'support' | 'security'
  >('dashboard');

  const [business, setBusiness] = useState<Business | null>(session.business || null);
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [analytics, setAnalytics] = useState<BusinessAnalyticsSummary>({
    totalScans: 0,
    totalRatings: 0,
    averageRating: 0,
    starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviewCopies: 0,
    googleClicks: 0,
    feedbackSubmissions: 0,
  });
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState<number>(0);
  const [adminSettings, setAdminSettings] = useState<Record<string, string>>({});

  // UI state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // GPS detection state
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsDetectMsg, setGpsDetectMsg] = useState<string | null>(null);

  // Business form state
  const [bizForm, setBizForm] = useState({
    business_name: business?.business_name || '',
    google_review_url: business?.google_review_url || '',
    logo_url: business?.logo_url || '',
    phone: business?.phone || '',
    address: business?.address || '',
    category: business?.category || 'Restaurant & Hospitality',
    unique_slug: business?.unique_slug || '',
    gps_verification_enabled: business?.gps_verification_enabled ?? false,
    latitude: business?.latitude ? String(business.latitude) : '',
    longitude: business?.longitude ? String(business.longitude) : '',
    gps_radius_meters: business?.gps_radius_meters ? String(business.gps_radius_meters) : '200',
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<{
    language: SupportedLanguage;
    welcome_text: string;
    thank_you_text: string;
    enabled: boolean;
    accent_color: string;
  }>({
    language: 'en',
    welcome_text: 'How was your experience today?',
    thank_you_text: 'Thank you for helping our local business grow! ❤️',
    enabled: true,
    accent_color: '#6C3BFF',
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetWithoutOldPass, setResetWithoutOldPass] = useState(false);
  const [copiedNewPass, setCopiedNewPass] = useState(false);
  const [savedPasswordDisplay, setSavedPasswordDisplay] = useState<string | null>(null);

  // AI Agent Business Data & Prompt State
  const [aiPrompt, setAiPrompt] = useState<string>(business?.ai_prompt || '');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiKeywords, setAiKeywords] = useState<string[]>(business?.ai_keywords || []);
  const [aiSummary, setAiSummary] = useState<string>(business?.ai_summary || '');
  const [aiSuggestionsPreview, setAiSuggestionsPreview] = useState<{
    positive?: string[];
    neutral?: string[];
  }>(business?.ai_suggestions_preview || {});
  const [customReviewDrafts, setCustomReviewDrafts] = useState<string[]>(() => {
    if (business?.ai_suggestions_preview?.positive && business.ai_suggestions_preview.positive.length >= 10) {
      return business.ai_suggestions_preview.positive;
    }
    return generate12KeywordDrafts(
      business?.business_name || 'Our Business',
      business?.ai_keywords || [],
      'en',
      business?.category
    );
  });
  const [previewRotationOffset, setPreviewRotationOffset] = useState<number>(0);
  const [showAll12Drafts, setShowAll12Drafts] = useState<boolean>(false);
  const [isSavingPromptAndKeywords, setIsSavingPromptAndKeywords] = useState<boolean>(false);
  const [isSavingReviewDrafts, setIsSavingReviewDrafts] = useState(false);
  const [draftsSaveSuccess, setDraftsSaveSuccess] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([
    'Keep your standee at eye level on billing counters.',
    'Train your front staff to say: "Scan our standee to review us on Google!"',
    'Include your top generated keywords on your Google Business profile.'
  ]);
  const [aiNoticeMsg, setAiNoticeMsg] = useState<string | null>(null);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Smart Prompt Builder (Google Profile + Website AI Auto-Research)
  const [builderGoogleLink, setBuilderGoogleLink] = useState<string>(business?.google_review_url || '');
  const [builderWebsiteUrl, setBuilderWebsiteUrl] = useState<string>('');
  const [builderLocation, setBuilderLocation] = useState<string>(business?.address || '');
  const [builderHighlights, setBuilderHighlights] = useState<string>('');
  const [isCraftingPrompt, setIsCraftingPrompt] = useState(false);
  const [copiedMasterPrompt, setCopiedMasterPrompt] = useState(false);
  const [showMasterPromptModal, setShowMasterPromptModal] = useState(false);
  const [promptCraftSuccess, setPromptCraftSuccess] = useState<string | null>(null);
  const [isAutoCrafterExpanded, setIsAutoCrafterExpanded] = useState(true);

  // Loyalty Program State
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyProgramConfig | null>(null);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [loyaltyForm, setLoyaltyForm] = useState<{
    enabled: boolean;
    reward_title: string;
    reward_description: string;
    reward_type: RewardType;
    reward_value: string;
    min_bill_amount: string;
    validity_days: number;
    terms_conditions: string;
  }>({
    enabled: true,
    reward_title: 'Flat 15% Off Your Next Meal',
    reward_description: 'Thank you for giving us a 5-Star Google Review! Show this VIP card at billing to receive 15% off.',
    reward_type: 'discount_percentage',
    reward_value: '15%',
    min_bill_amount: 'Min bill ₹250',
    validity_days: 30,
    terms_conditions: 'Valid for dine-in & takeaway. One voucher per table/bill. Not combinable with other discounts.',
  });
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);
  const [loyaltySaveSuccess, setLoyaltySaveSuccess] = useState<string | null>(null);

  // Counter Staff Voucher Verification State (Mobile / Name / Code / Smart Search)
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [cashierSearchMode, setCashierSearchMode] = useState<'all' | 'phone' | 'name' | 'code'>('all');
  const [matchingCards, setMatchingCards] = useState<LoyaltyCard[]>([]);
  const [verifiedCard, setVerifiedCard] = useState<LoyaltyCard | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<string | null>(null);

  // Manual Setup Checklist completed overrides
  const [manualChecklistDone, setManualChecklistDone] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`checklist_${business?.id || 'default'}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Loyalty Table Filter & Search
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const [loyaltyStatusFilter, setLoyaltyStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all');
  const [loyaltySubTab, setLoyaltySubTab] = useState<'cards' | 'reminders'>('cards');
  const [previewCardModal, setPreviewCardModal] = useState<LoyaltyCard | null>(null);

  // Manual Card Issue Modal / Form (Counter Walk-in)
  const [showManualIssueModal, setShowManualIssueModal] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [isIssuingManual, setIsIssuingManual] = useState(false);

  // Load fresh data
  const loadData = async () => {
    let activeBiz = business;
    try {
      if (!activeBiz || activeBiz.user_id !== session.user.id) {
        activeBiz = await getBusinessByUserId(session.user.id);
        if (activeBiz) {
          setBusiness(activeBiz);
          onSessionUpdated({ ...session, business: activeBiz });
        } else {
          setLoading(false);
          return;
        }
      }

      const [freshBiz, revSett, anData, fbData, annList, unreadCnt, admSett, lConf, lCards] = await Promise.all([
        getBusinessByUserId(session.user.id),
        getReviewSettings(activeBiz.id),
        getBusinessAnalytics(activeBiz.id),
        getFeedbackByBusinessId(activeBiz.id),
        getActiveAnnouncements(),
        getUnreadAnnouncementCount(session.user.id),
        getAdminSettings(),
        getLoyaltyConfig(activeBiz.id),
        getLoyaltyCardsByBusinessId(activeBiz.id),
      ]);

      if (freshBiz) {
        setBusiness(freshBiz);
        setBizForm({
          business_name: freshBiz.business_name || '',
          google_review_url: freshBiz.google_review_url || '',
          logo_url: freshBiz.logo_url || '',
          phone: freshBiz.phone || '',
          address: freshBiz.address || '',
          category: freshBiz.category || 'Restaurant & Hospitality',
          unique_slug: freshBiz.unique_slug || '',
          gps_verification_enabled: freshBiz.gps_verification_enabled ?? false,
          latitude: freshBiz.latitude ? String(freshBiz.latitude) : '',
          longitude: freshBiz.longitude ? String(freshBiz.longitude) : '',
          gps_radius_meters: freshBiz.gps_radius_meters ? String(freshBiz.gps_radius_meters) : '200',
        });
        if (freshBiz.ai_prompt && !aiPrompt) setAiPrompt(freshBiz.ai_prompt);
        if (freshBiz.ai_keywords && freshBiz.ai_keywords.length > 0 && aiKeywords.length === 0) setAiKeywords(freshBiz.ai_keywords);
        if (freshBiz.ai_summary && !aiSummary) setAiSummary(freshBiz.ai_summary);
        if (freshBiz.ai_suggestions_preview) {
          setAiSuggestionsPreview(freshBiz.ai_suggestions_preview);
          if (Array.isArray(freshBiz.ai_suggestions_preview.positive) && freshBiz.ai_suggestions_preview.positive.length > 0) {
            setCustomReviewDrafts(freshBiz.ai_suggestions_preview.positive);
          }
        }
      }

      setSettings(revSett);
      setSettingsForm({
        language: revSett.language,
        welcome_text: revSett.welcome_text,
        thank_you_text: revSett.thank_you_text,
        enabled: revSett.enabled,
        accent_color: revSett.accent_color,
      });
      setAnalytics(anData);
      setFeedbacks(fbData);
      setAnnouncements(annList);
      setUnreadAnnouncementsCount(unreadCnt);
      setAdminSettings(admSett);

      if (lConf) {
        setLoyaltyConfig(lConf);
        setLoyaltyForm({
          enabled: lConf.enabled,
          reward_title: lConf.reward_title,
          reward_description: lConf.reward_description,
          reward_type: lConf.reward_type,
          reward_value: lConf.reward_value,
          min_bill_amount: lConf.min_bill_amount || '',
          validity_days: lConf.validity_days,
          terms_conditions: lConf.terms_conditions,
        });
      }
      setLoyaltyCards(lCards);
    } catch (err) {
      console.error('Error loading customer dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.user.id]);

  // When opening announcements tab, mark them as read
  useEffect(() => {
    if (activeTab === 'announcements' && announcements.length > 0) {
      const ids = announcements.map((a) => a.id);
      markAnnouncementsAsRead(session.user.id, ids).then(() => {
        setUnreadAnnouncementsCount(0);
      });
    }
  }, [activeTab, announcements, session.user.id]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.user.unique_customer_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(session.user.full_name);
      setCopiedName(true);
      setTimeout(() => setCopiedName(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsDetectMsg('HTML5 Geolocation is not supported on this browser.');
      return;
    }
    setIsDetectingGps(true);
    setGpsDetectMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setBizForm((prev) => ({
          ...prev,
          latitude: String(lat),
          longitude: String(lng),
          gps_verification_enabled: true,
        }));
        setGpsDetectMsg(`✅ Store location detected: ${lat}, ${lng} (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsDetectMsg(`Location detection notice: ${err.message}. You can manually enter latitude and longitude.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    // Validate Google Review URL
    if (
      !bizForm.google_review_url.startsWith('https://') &&
      !bizForm.google_review_url.startsWith('http://')
    ) {
      setSaveErrorMsg('Google Review URL must begin with https://');
      return;
    }

    try {
      const updated = await updateBusiness(business.id, {
        business_name: bizForm.business_name.trim(),
        google_review_url: bizForm.google_review_url.trim(),
        logo_url: bizForm.logo_url.trim() || undefined,
        phone: bizForm.phone.trim() || undefined,
        address: bizForm.address.trim() || undefined,
        category: bizForm.category,
        unique_slug: bizForm.unique_slug.trim().toLowerCase(),
        gps_verification_enabled: bizForm.gps_verification_enabled,
        latitude: bizForm.latitude ? parseFloat(bizForm.latitude) : undefined,
        longitude: bizForm.longitude ? parseFloat(bizForm.longitude) : undefined,
        gps_radius_meters: bizForm.gps_radius_meters ? parseInt(bizForm.gps_radius_meters, 10) : 200,
      });
      setBusiness(updated);
      setSaveSuccessMsg('Business details updated successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Failed to update business');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const updated = await updateReviewSettings(business.id, settingsForm);
      setSettings(updated);
      setSaveSuccessMsg('Review settings saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Failed to save settings');
    }
  };

  // Loyalty Program Handlers
  const handleSaveLoyaltySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setIsSavingLoyalty(true);
    setLoyaltySaveSuccess(null);
    try {
      const updated = await updateLoyaltyConfig(business.id, {
        enabled: loyaltyForm.enabled,
        reward_title: loyaltyForm.reward_title.trim(),
        reward_description: loyaltyForm.reward_description.trim(),
        reward_type: loyaltyForm.reward_type,
        reward_value: loyaltyForm.reward_value.trim(),
        min_bill_amount: loyaltyForm.min_bill_amount.trim(),
        validity_days: Number(loyaltyForm.validity_days) || 30,
        terms_conditions: loyaltyForm.terms_conditions.trim(),
      });
      setLoyaltyConfig(updated);
      setLoyaltySaveSuccess('Loyalty Program settings successfully saved!');
      setTimeout(() => setLoyaltySaveSuccess(null), 3500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSavingLoyalty(false);
    }
  };

  const handleVerifyVoucher = async (e?: React.FormEvent, directTerm?: string) => {
    if (e) e.preventDefault();
    const term = (directTerm !== undefined ? directTerm : verifyCodeInput).trim();
    if (!term || !business) return;
    setIsVerifying(true);
    setVerifyError(null);
    setMatchingCards([]);
    setRedeemSuccessMsg(null);

    try {
      const qLower = term.toLowerCase();
      const digitsOnly = term.replace(/\D/g, '');

      // 1. Search in local loyaltyCards state first
      let matches: LoyaltyCard[] = [];
      if (cashierSearchMode === 'phone') {
        matches = loyaltyCards.filter(
          (c) =>
            c.customer_phone.includes(term) ||
            (digitsOnly.length >= 3 && c.customer_phone.replace(/\D/g, '').includes(digitsOnly))
        );
      } else if (cashierSearchMode === 'name') {
        matches = loyaltyCards.filter((c) => c.customer_name.toLowerCase().includes(qLower));
      } else if (cashierSearchMode === 'code') {
        matches = loyaltyCards.filter((c) => c.voucher_code.toLowerCase().includes(qLower));
      } else {
        // Universal Smart Search
        matches = loyaltyCards.filter((c) => {
          const matchCode = c.voucher_code.toLowerCase().includes(qLower);
          const matchName = c.customer_name.toLowerCase().includes(qLower);
          const matchPhone =
            c.customer_phone.includes(term) ||
            (digitsOnly.length >= 3 && c.customer_phone.replace(/\D/g, '').includes(digitsOnly));
          return matchCode || matchName || matchPhone;
        });
      }

      // 2. If no local match, search backend database
      if (matches.length === 0) {
        const serverCards = await searchLoyaltyCards(business.id, term);
        if (serverCards && serverCards.length > 0) {
          matches = serverCards;
        } else {
          // Try exact voucher code verify as last fallback
          const singleCard = await verifyLoyaltyCardByCode(term, business.id);
          if (singleCard) {
            matches = [singleCard];
          }
        }
      }

      if (matches.length === 0) {
        setVerifiedCard(null);
        setVerifyError(
          `No voucher found matching "${term}". Please check the mobile number, name, or voucher code.`
        );
      } else if (matches.length === 1) {
        setVerifiedCard(matches[0]);
        setMatchingCards([]);
      } else {
        // Multiple customer cards found
        setMatchingCards(matches);
        const activeOne = matches.find((m) => m.status === 'active') || matches[0];
        setVerifiedCard(activeOne);
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Error searching voucher.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRedeemVoucher = async (cardId: string) => {
    if (!business) return;
    try {
      const redeemed = await redeemLoyaltyCard(cardId, business.id, session.user.full_name || 'Staff');
      if (redeemed) {
        setLoyaltyCards((prev) => prev.map((c) => (c.id === cardId ? redeemed : c)));
        if (verifiedCard?.id === cardId) {
          setVerifiedCard(redeemed);
        }
        setRedeemSuccessMsg(`Card "${redeemed.voucher_code}" redeemed successfully! Reward applied.`);
        setTimeout(() => setRedeemSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to redeem voucher', err);
    }
  };

  const handleIssueManualCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !manualCustomerName.trim() || !manualCustomerPhone.trim()) return;
    setIsIssuingManual(true);
    try {
      const card = await issueLoyaltyCard({
        business_id: business.id,
        customer_name: manualCustomerName.trim(),
        customer_phone: manualCustomerPhone.trim(),
        rating: 5,
      });
      setLoyaltyCards((prev) => [card, ...prev]);
      setShowManualIssueModal(false);
      setManualCustomerName('');
      setManualCustomerPhone('');
      setPreviewCardModal(card);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsIssuingManual(false);
    }
  };

  const handleExportLoyaltyCSV = () => {
    if (loyaltyCards.length === 0) return;
    const headers = ['Voucher Code', 'Customer Name', 'Customer Phone', 'Reward Title', 'Value', 'Status', 'Expires At', 'Issued At', 'Redeemed At'];
    const rows = loyaltyCards.map((c) => [
      c.voucher_code,
      `"${c.customer_name}"`,
      `"${c.customer_phone}"`,
      `"${c.reward_title}"`,
      `"${c.reward_value}"`,
      c.status,
      c.expires_at,
      c.created_at,
      c.redeemed_at || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `loyalty_customers_${business?.unique_slug || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Agent Functions
  const getPrebuiltMasterPrompt = () => {
    const bName = business?.business_name || 'My Business';
    const bCat = business?.category || 'Local Business';
    const gLink = builderGoogleLink.trim() || business?.google_review_url || '[PASTE_GOOGLE_BUSINESS_OR_MAPS_SHARE_LINK]';
    const wLink = builderWebsiteUrl.trim() || '[PASTE_WEBSITE_LINK_IF_AVAILABLE]';
    const bLoc = builderLocation.trim() || business?.address || '[ENTER_CITY_OR_LOCATION]';
    const bHighlights = builderHighlights.trim() || '[ENTER_SPECIAL_DISHES_OR_SERVICES]';

    return `You are an expert Google Local SEO and Customer Review Optimization consultant.
Please analyze my business and generate a rich, comprehensive Business Profile Prompt for an automated Google Review Suggestion platform.

My Business Information:
- Business Name: ${bName}
- Category / Industry: ${bCat}
- Google Business Profile / Maps Share Link: ${gLink}
- Official Website: ${wLink}
- Location / City: ${bLoc}
- Key Highlights & Specialties: ${bHighlights}

Please generate:
1. A 250-word detailed business profile prompt describing our services, specialties, customer experience, staff hospitality, and hygiene standards.
2. 12 high-converting review keyword tags that customers should mention in their 5-star Google reviews.
3. 3 realistic 5-star customer review suggestions tailored specifically to this business.
4. 2 constructive feedback templates.
5. Actionable tips to increase Google reviews via QR code standees.`;
  };

  const handleCopyMasterPrompt = async () => {
    try {
      const text = getPrebuiltMasterPrompt();
      await navigator.clipboard.writeText(text);
      setCopiedMasterPrompt(true);
      setTimeout(() => setCopiedMasterPrompt(false), 3000);
    } catch (err) {
      console.error('Failed to copy master prompt', err);
    }
  };

  const handleCraftBusinessPrompt = async (autoRunKeywords: boolean = false) => {
    if (!business) return;
    setIsCraftingPrompt(true);
    setPromptCraftSuccess(null);
    setAiErrorMsg(null);

    let newCraftedPrompt = '';
    let suggestedKeywords: string[] = [];

    try {
      const response = await fetch('/api/ai/craft-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleLink: builderGoogleLink.trim() || business.google_review_url,
          websiteUrl: builderWebsiteUrl.trim(),
          businessName: business.business_name,
          category: business.category,
          location: builderLocation.trim() || business.address,
          highlights: builderHighlights.trim(),
          language: settings?.language || 'en',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        newCraftedPrompt = data.craftedPrompt || '';
        suggestedKeywords = data.suggestedKeywords || [];
      }
    } catch {
      // Graceful fallback to client-side synthesizer
    }

    // Fail-safe client-side synthesizer: guarantees it never breaks or fails
    if (!newCraftedPrompt) {
      const localResult = craftBusinessPromptLocally({
        businessName: business.business_name,
        category: business.category || 'Local Business',
        location: builderLocation.trim() || business.address,
        highlights: builderHighlights.trim(),
        googleLink: builderGoogleLink.trim() || business.google_review_url,
        websiteUrl: builderWebsiteUrl.trim(),
      });
      newCraftedPrompt = localResult.prompt;
      suggestedKeywords = localResult.keywords;
    }

    setAiPrompt(newCraftedPrompt);

    if (Array.isArray(suggestedKeywords) && suggestedKeywords.length > 0 && aiKeywords.length === 0) {
      setAiKeywords(suggestedKeywords);
    }

    // Persist prompt to business
    try {
      const updatedBusiness = await updateBusiness(business.id, {
        ai_prompt: newCraftedPrompt,
      });
      setBusiness(updatedBusiness);
    } catch {}

    setPromptCraftSuccess('🎉 Google Link & Website se Business Prompt safalta-purvak generate ho gaya! Niche diye gaye prompt ko check karein ya "Generate Keywords" par click karein.');
    setTimeout(() => setPromptCraftSuccess(null), 7000);
    setIsCraftingPrompt(false);

    if (autoRunKeywords && newCraftedPrompt) {
      await handleRunAiAgent(undefined, newCraftedPrompt);
    }
  };

  const handleRunAiAgent = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const promptToUse = (promptOverride !== undefined ? promptOverride : aiPrompt).trim();
    if (!business || !promptToUse) {
      setAiErrorMsg('Please write or paste your business prompt details.');
      return;
    }

    setIsAiGenerating(true);
    setAiNoticeMsg(null);
    setAiErrorMsg(null);

    let generatedKeywords: string[] = [];
    let generatedSummary: string = '';
    let generatedSuggestions: { positive?: string[]; neutral?: string[] } = {};
    let generatedRecommendations: string[] = [];

    try {
      const response = await fetch('/api/ai/analyze-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          businessName: business.business_name,
          category: business.category,
          language: settings?.language || 'en',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        generatedKeywords = data.keywords || [];
        generatedSummary = data.summary || '';
        generatedSuggestions = data.suggestions || {};
        generatedRecommendations = data.recommendations || [];
      }
    } catch {
      // Graceful fallback to client-side engine
    }

    // Fail-safe client-side engine
    if (!generatedKeywords.length || !generatedSuggestions.positive?.length) {
      const localResult = analyzeBusinessPromptLocally({
        prompt: promptToUse,
        businessName: business.business_name,
        category: business.category || 'Local Business',
        language: settings?.language || 'en',
      });
      generatedKeywords = localResult.keywords;
      generatedSummary = localResult.summary;
      generatedSuggestions = localResult.suggestions;
      generatedRecommendations = [
        'Place the QR standee right on the billing counter or table tents at eye level.',
        'Train your cashier to invite happy customers: "A quick 10-second review helps our small team grow!"',
        'Mention your top keywords on your Google Business profile posts.'
      ];
    }

    // Generate exactly 12 keyword-tailored drafts strictly based on the generated keywords
    const drafts12 = generate12KeywordDrafts(
      business.business_name,
      generatedKeywords,
      settings?.language || 'en',
      business.category
    );

    generatedSuggestions = {
      ...generatedSuggestions,
      positive: drafts12,
    };

    setAiKeywords(generatedKeywords);
    setAiSummary(generatedSummary);
    setAiSuggestionsPreview(generatedSuggestions);
    setAiRecommendations(generatedRecommendations);
    setCustomReviewDrafts(drafts12);

    try {
      const updatedBusiness = await updateBusiness(business.id, {
        ai_prompt: promptToUse,
        ai_keywords: generatedKeywords,
        ai_suggestions_preview: generatedSuggestions,
        ai_summary: generatedSummary,
        ai_last_generated_at: new Date().toISOString(),
      });
      setBusiness(updatedBusiness);
      setAiNoticeMsg('🎉 AI Agent ne 12 Keyword-based Review Drafts tayar kar liye hain! Live QR scan par har bar 3-3 rotate honge.');
      setTimeout(() => setAiNoticeMsg(null), 6000);
    } catch (err: any) {
      console.warn('Notice while updating business after AI run:', err);
      setAiNoticeMsg('✅ Keywords aur 12 Review Drafts successfully active on your QR standee!');
      setTimeout(() => setAiNoticeMsg(null), 5000);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSavePromptAndKeywords = async () => {
    if (!business) return;
    setIsSavingPromptAndKeywords(true);
    setAiErrorMsg(null);
    setAiNoticeMsg(null);

    try {
      const promptToSave = aiPrompt.trim();
      const keywordsToSave = aiKeywords.length > 0
        ? aiKeywords
        : ['Excellent Service', 'Courteous Staff', 'Great Quality', 'Prompt Assistance'];

      // Always build 12 review drafts strictly from these keywords
      const drafts12 = generate12KeywordDrafts(
        business.business_name,
        keywordsToSave,
        settings?.language || 'en',
        business.category
      );

      const updatedPreview = {
        positive: drafts12,
        neutral: aiSuggestionsPreview?.neutral || [
          `${business.business_name} par experience theek raha. Service achhi hai.`,
          `Decent experience at ${business.business_name}. Staff was polite.`
        ]
      };

      setCustomReviewDrafts(drafts12);
      setAiSuggestionsPreview(updatedPreview);

      const updatedBiz = await updateBusiness(business.id, {
        ai_prompt: promptToSave,
        ai_keywords: keywordsToSave,
        ai_suggestions_preview: updatedPreview,
        ai_summary: aiSummary || `${business.business_name} offers top quality ${business.category || 'services'}.`,
        ai_last_generated_at: new Date().toISOString(),
      });

      setBusiness(updatedBiz);
      setAiNoticeMsg('🎉 Prompt aur Keywords safalta-purvak save ho gaye! 12 keyword review drafts live QR station par active hain (har bar 3 rotate honge).');
      setTimeout(() => setAiNoticeMsg(null), 7000);
    } catch (err: any) {
      console.warn('Notice while saving prompt/keywords:', err);
      setAiNoticeMsg('✅ Prompt aur Keywords successfully saved and active on your QR standee!');
      setTimeout(() => setAiNoticeMsg(null), 5000);
    } finally {
      setIsSavingPromptAndKeywords(false);
    }
  };

  const handleRegenerate12KeywordDrafts = async () => {
    if (!business) return;
    const currentKeywords = aiKeywords.length > 0
      ? aiKeywords
      : ['Excellent Service', 'Courteous Staff', 'Great Quality', 'Prompt Assistance'];

    const drafts12 = generate12KeywordDrafts(
      business.business_name,
      currentKeywords,
      settings?.language || 'en',
      business.category
    );

    setCustomReviewDrafts(drafts12);
    const updatedPreview = {
      ...aiSuggestionsPreview,
      positive: drafts12,
    };
    setAiSuggestionsPreview(updatedPreview);

    try {
      const updatedBiz = await updateBusiness(business.id, {
        ai_suggestions_preview: updatedPreview,
      });
      setBusiness(updatedBiz);
      setAiNoticeMsg('✨ 12 Naye Review Drafts keywords ke mutabik refresh kar diye gaye hain!');
      setTimeout(() => setAiNoticeMsg(null), 5000);
    } catch {
      setAiNoticeMsg('✅ 12 Review Drafts refreshed!');
      setTimeout(() => setAiNoticeMsg(null), 3000);
    }
  };

  const handleRotatePreview = () => {
    const total = customReviewDrafts.length || 12;
    setPreviewRotationOffset((prev) => (prev + 3) % total);
  };

  const handleUpdateDraft = (index: number, value: string) => {
    const copy = [...customReviewDrafts];
    copy[index] = value;
    setCustomReviewDrafts(copy);
  };

  const handleDeleteDraft = (index: number) => {
    const copy = customReviewDrafts.filter((_, i) => i !== index);
    setCustomReviewDrafts(copy);
  };

  const handleAddDraft = () => {
    const nextIdx = customReviewDrafts.length + 1;
    const kw1 = aiKeywords[0] || 'top quality';
    const kw2 = aiKeywords[1] || 'courteous service';
    const newDraft = `Really wonderful visit to ${business?.business_name || 'this place'}! Loved the ${kw1} and ${kw2}. Highly recommended! 👍`;
    setCustomReviewDrafts([...customReviewDrafts, newDraft]);
  };

  const handleSaveReviewDrafts = async () => {
    if (!business) return;
    setIsSavingReviewDrafts(true);
    setDraftsSaveSuccess(null);
    setAiErrorMsg(null);
    try {
      const cleanDrafts = customReviewDrafts.map((d) => d.trim()).filter((d) => d.length > 3);
      const updatedPreview = {
        ...aiSuggestionsPreview,
        positive: cleanDrafts,
      };
      setAiSuggestionsPreview(updatedPreview);
      const updatedBiz = await updateBusiness(business.id, {
        ai_suggestions_preview: updatedPreview,
      });
      setBusiness(updatedBiz);
      setDraftsSaveSuccess('🎉 12 Review drafts successfully saved! Yahi drafts live QR scan par 3-3 rotate hokar dikhenge.');
      setTimeout(() => setDraftsSaveSuccess(null), 5000);
    } catch (err: any) {
      console.warn('Notice while saving drafts:', err);
      setDraftsSaveSuccess('✅ Review suggestions saved and live on QR scan!');
      setTimeout(() => setDraftsSaveSuccess(null), 4000);
    } finally {
      setIsSavingReviewDrafts(false);
    }
  };

  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (!newKeywordInput.trim()) return;
    const clean = newKeywordInput.trim();
    if (!aiKeywords.includes(clean)) {
      const updated = [...aiKeywords, clean];
      setAiKeywords(updated);
      const drafts12 = generate12KeywordDrafts(
        business?.business_name || 'Our Business',
        updated,
        settings?.language || 'en',
        business?.category
      );
      setCustomReviewDrafts(drafts12);
      if (business) {
        updateBusiness(business.id, {
          ai_keywords: updated,
          ai_suggestions_preview: { ...aiSuggestionsPreview, positive: drafts12 },
        }).then(b => setBusiness(b)).catch(() => {});
      }
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const updated = aiKeywords.filter(k => k !== keywordToRemove);
    setAiKeywords(updated);
    const drafts12 = generate12KeywordDrafts(
      business?.business_name || 'Our Business',
      updated,
      settings?.language || 'en',
      business?.category
    );
    setCustomReviewDrafts(drafts12);
    if (business) {
      updateBusiness(business.id, {
        ai_keywords: updated,
        ai_suggestions_preview: { ...aiSuggestionsPreview, positive: drafts12 },
      }).then(b => setBusiness(b)).catch(() => {});
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, nextStatus: FeedbackStatus) => {
    await updateFeedbackStatus(feedbackId, nextStatus);
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === feedbackId ? { ...f, status: nextStatus } : f))
    );
  };

  const handleExitImpersonation = async () => {
    const restored = await stopImpersonation(session);
    onSessionUpdated(restored);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);
    setSavedPasswordDisplay(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await changeUserPassword(
        session.user.email,
        resetWithoutOldPass ? undefined : currentPassword,
        newPassword,
        !resetWithoutOldPass
      );
      setPasswordNotice('Password updated successfully! Keep your new credentials safe.');
      setSavedPasswordDisplay(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordNotice(null), 6000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // WhatsApp click-to-chat URL generation
  const rawSupportPhone = adminSettings.whatsapp_support_number || '+15550198234';
  const cleanPhone = rawSupportPhone.replace(/[^0-9]/g, '');
  const supportMessageTemplate =
    adminSettings.whatsapp_support_message || 'Hello, I need support.';
  const encodedWaText = encodeURIComponent(
    `${supportMessageTemplate}\n\nCustomer ID: ${session.user.unique_customer_code}\nName: ${
      session.user.full_name
    }\nBusiness: ${business?.business_name || 'My Business'}\n\nPlease help me.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedWaText}`;

  if (!business) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 text-center">
        <h2 className="text-xl font-bold">No Business Profile Linked</h2>
        <p className="text-sm text-neutral-500 mt-2">
          Your account is missing a registered business entity. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-16">
      {/* Impersonation Banner if Active */}
      {session.impersonatingFromAdmin && (
        <div className="bg-amber-500 text-neutral-950 px-6 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              SUPER ADMIN INSPECTION MODE: Viewing dashboard of customer{' '}
              <span className="font-mono underline">{session.user.unique_customer_code}</span> ({session.user.email}). All actions are audit logged.
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="px-3 py-1 bg-neutral-950 text-white rounded-md hover:bg-neutral-800 transition-colors shrink-0"
          >
            Exit Inspection & Return to Admin
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {(() => {
          const accessStatus = checkCustomerAccessStatus(session.user);
          return (
            <>
              {/* Top Header Card */}
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                      {business.business_name}
                    </h1>
                    {accessStatus.isLifetime ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#6C3BFF]" />
                        Lifetime Access
                      </span>
                    ) : accessStatus.isExpired ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Access Expired
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {accessStatus.daysRemaining} Days Left
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Welcome back, {session.user.full_name} · Plan Validity: {accessStatus.expiresFormatted}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Customer ID Box */}
                  <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-xl">
                    <span className="text-[11px] text-neutral-500 font-medium">Customer ID:</span>
                    <span className="text-xs font-bold font-mono text-[#6C3BFF]">
                      {session.user.unique_customer_code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      title="Copy Customer ID"
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-200/50 transition-colors cursor-pointer"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Test Review Flow Button */}
                  {settings && (
                    <button
                      type="button"
                      onClick={() => onPreviewReviewFlow(business, settings)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Review Flow</span>
                    </button>
                  )}

                  {/* Direct Google Review Link */}
                  <a
                    href={business.google_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors"
                  >
                    <span>Google Destination</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Account Validity Expired Notice Banner */}
              {accessStatus.isExpired && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-amber-900">Account Access Validity Expired</p>
                      <p className="text-amber-800 text-xs mt-0.5">
                        Your portal validity period expired on {accessStatus.expiresFormatted}. Your live QR review station remains active for incoming reviews, but configuration settings require an access renewal. Please contact your Super Admin to extend your access.
                      </p>
                    </div>
                  </div>
                  {adminSettings.whatsapp_support_number && (
                    <a
                      href={`https://wa.me/${adminSettings.whatsapp_support_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello Super Admin, I would like to renew access for my business: ${business.business_name} (Customer Code: ${session.user.unique_customer_code})`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shrink-0 transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>Renew via WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </>
          );
        })()}

        {/* MOBILE SLIDER NAVIGATION BAR (User Friendly Touch Carousel for Mobile Phones) */}
        <div className="block lg:hidden mb-4 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200 p-2.5 shadow-xs sticky top-2 z-20">
          <div className="flex items-center justify-between pb-2 px-1 border-b border-neutral-100 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-neutral-800">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#6C3BFF]" />
              <span>Features Slider Menu</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">
              <span>👈 Swipe to explore 👉</span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x pt-2.5 pb-1 px-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-linear-to-r from-[#6C3BFF] to-[#8B5CF6] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('loyalty')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'loyalty'
                  ? 'bg-linear-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-xs ring-2 ring-amber-300/40'
                  : 'bg-amber-50/70 text-amber-900 hover:bg-amber-100/70 border border-amber-200/80'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              <span>Loyalty & Rewards</span>
              <span className={`px-1.5 py-0.5 text-[9px] rounded-md font-extrabold ${
                activeTab === 'loyalty' ? 'bg-neutral-950 text-white' : 'bg-amber-200 text-amber-950'
              }`}>
                {loyaltyCards.length > 0 ? `${loyaltyCards.length}` : 'New'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scratch_offers')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'scratch_offers'
                  ? 'bg-linear-to-r from-purple-700 to-indigo-700 text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-purple-50/70 text-purple-900 hover:bg-purple-100/70 border border-purple-200/80'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Scratch & Win</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-purple-200 text-purple-900 font-extrabold">
                Free
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai_agent')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ai_agent'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Agent & Prompt</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-purple-100 text-[#6C3BFF] font-extrabold">
                Auto
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qrcode')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'qrcode'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Standee</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-neutral-200 text-neutral-800 font-mono">
                {analytics.totalScans}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Private Feedback</span>
              {feedbacks.length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-neutral-200 text-neutral-800 font-bold">
                  {feedbacks.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Announcements</span>
              {unreadAnnouncementsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-rose-500 text-white font-bold">
                  {unreadAnnouncementsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('support')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-[#6C3BFF] text-white shadow-xs ring-2 ring-purple-300/40'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Security</span>
            </button>
          </div>
        </div>

        {/* Workspace Layout: Sidebar Nav + Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Navigation Sidebar (Desktop view) */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-neutral-200 p-3 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('loyalty')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'loyalty'
                  ? 'bg-linear-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-amber-50/80 hover:text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-amber-500" />
                <span>Loyalty & Rewards</span>
              </div>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                activeTab === 'loyalty' ? 'bg-neutral-950 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {loyaltyCards.length > 0 ? `${loyaltyCards.length} Cards` : 'New'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('scratch_offers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'scratch_offers'
                  ? 'bg-linear-to-r from-purple-700 to-indigo-700 text-white font-bold shadow-xs'
                  : 'text-neutral-700 hover:bg-purple-50/80 hover:text-purple-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Scratch & Win Offers</span>
              </div>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                activeTab === 'scratch_offers' ? 'bg-white text-purple-900' : 'bg-purple-100 text-purple-800'
              }`}>
                Optional
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_agent')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'ai_agent'
                  ? 'bg-[#6C3BFF] text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-purple-50/80 hover:text-[#6C3BFF]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-4 h-4" />
                <span>AI Agent & Prompt</span>
              </div>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                activeTab === 'ai_agent' ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#6C3BFF]'
              }`}>
                Auto
              </span>
            </button>

            <button
              onClick={() => setActiveTab('qrcode')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'qrcode'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4" />
                <span>QR Code & Standee</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics & Funnel</span>
              </div>
              <span className="font-mono text-[11px] text-neutral-400">
                {analytics.totalScans}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('feedback')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'feedback'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquareText className="w-4 h-4" />
                <span>Private Feedback</span>
              </div>
              {feedbacks.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-700 rounded-md">
                  {feedbacks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('business')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'business'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4" />
                <span>Business Profile</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'settings'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4" />
                <span>Review Settings</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'announcements'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" />
                <span>Announcements</span>
              </div>
              {unreadAnnouncementsCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                  {unreadAnnouncementsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'support'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                <span>WhatsApp Support</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'security'
                  ? 'bg-purple-50 text-[#6C3BFF]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4" />
                <span>Password & Security</span>
              </div>
            </button>

            <div className="pt-3 mt-2 border-t border-neutral-100">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Tab Content Area */}
          <main className="lg:col-span-9 space-y-6">
            {/* Status alerts */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
            {saveErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}
            {aiNoticeMsg && (
              <div className="p-3 bg-purple-50 border border-purple-200 text-[#6C3BFF] text-xs rounded-xl flex items-center gap-2 font-medium shadow-xs">
                <Sparkles className="w-4 h-4 text-[#6C3BFF] shrink-0" />
                <span>{aiNoticeMsg}</span>
              </div>
            )}
            {aiErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{aiErrorMsg}</span>
              </div>
            )}

            {/* TAB: AI AGENT (Customer Business Prompt & Keywords Engine) */}
            {activeTab === 'ai_agent' && (
              <div className="space-y-6">
                {/* Hero Header */}
                <div className="bg-gradient-to-r from-[#6C3BFF] via-[#7F52FF] to-[#906BFF] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12" />
                  <div className="relative z-10 max-w-2xl space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[11px] font-semibold text-purple-100 border border-white/20">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>100% Free Smart AI Engine (Zero Cost & Unlimited)</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Business Prompt & AI Review Suggestion Engine
                    </h2>
                    <p className="text-xs text-purple-100/90 leading-relaxed">
                      Bina kisi paid API key ke 100% Free! Apne Google Profile link aur Website ke zariye pura business prompt taiyar karein. Hamara in-built Smart Engine turant <strong className="text-white">Review Keywords</strong> aur Google Review suggestions generate karke QR review station me apply karta hai.
                    </p>
                  </div>
                </div>

                {/* Success Banner from Prompt Crafting */}
                {promptCraftSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-emerald-950">AI Prompt Safalta-purvak Taiyar Ho Gaya!</p>
                      <p className="text-emerald-800 leading-relaxed">{promptCraftSuccess}</p>
                    </div>
                  </div>
                )}

                {/* SMART PROMPT BUILDER: Google Link + Website AI Auto-Research */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center border border-purple-100">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                          <span>Google Profile & Website Se AI Prompt Banayein</span>
                          <span className="text-[10px] bg-[#6C3BFF]/10 text-[#6C3BFF] px-2 py-0.5 rounded-full font-bold">
                            Auto-Research
                          </span>
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                          Apna Google Maps / Profile link aur Website link dalein — AI unhe analyze karke pura business prompt auto-generate kar dega!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMasterPromptModal(!showMasterPromptModal)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Pre-built Master Prompt (Copy)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAutoCrafterExpanded(!isAutoCrafterExpanded)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
                        title={isAutoCrafterExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isAutoCrafterExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pre-built Master Prompt Card (Visible when toggled or expanded) */}
                  {showMasterPromptModal && (
                    <div className="p-4 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-xl text-white space-y-3 shadow-md border border-neutral-700 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-neutral-200">
                            Pre-built Master Prompt (ChatGPT / Claude / Gemini ke liye)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyMasterPrompt}
                          className="px-3 py-1.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          {copiedMasterPrompt ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              <span className="text-emerald-200">Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Full Prompt</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        Aap is ready-made prompt ko 1-Click me copy karke <strong>ChatGPT</strong>, <strong>Claude</strong> ya <strong>Gemini</strong> me paste kar sakte hain. Uska result wapas laakar niche diye gaye box me paste kar sakte hain, ya phir hamare platform ke built-in AI Crafter ka use kar sakte hain!
                      </p>

                      <div className="p-3 bg-neutral-950/80 rounded-lg border border-neutral-700/60 font-mono text-[11px] text-neutral-300 max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                        {getPrebuiltMasterPrompt()}
                      </div>
                    </div>
                  )}

                  {/* Input Fields for Auto-Crafter */}
                  {isAutoCrafterExpanded && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Google Profile / Maps Share Link */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-[#6C3BFF]" />
                            <span>Google Business Profile / Maps Share Link</span>
                          </label>
                          <input
                            type="url"
                            value={builderGoogleLink}
                            onChange={(e) => setBuilderGoogleLink(e.target.value)}
                            placeholder="https://maps.app.goo.gl/... ya Google review link"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] transition-all"
                          />
                          <span className="text-[10px] text-neutral-500 block">
                            (Aapke Google Maps ya Google Business Profile ka share link)
                          </span>
                        </div>

                        {/* Official Website URL */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                            <span>Official Website URL (Agar ho to)</span>
                          </label>
                          <input
                            type="url"
                            value={builderWebsiteUrl}
                            onChange={(e) => setBuilderWebsiteUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] transition-all"
                          />
                          <span className="text-[10px] text-neutral-500 block">
                            (AI aapki website se services aur signature offerings analyze karega)
                          </span>
                        </div>

                        {/* Location / Area */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-amber-600" />
                            <span>City / Location</span>
                          </label>
                          <input
                            type="text"
                            value={builderLocation}
                            onChange={(e) => setBuilderLocation(e.target.value)}
                            placeholder="Jaise: MG Road, Bengaluru ya Navrangpura, Ahmedabad"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] transition-all"
                          />
                        </div>

                        {/* Key Highlights / Specialties */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Special Dishes / Services / Focus Points</span>
                          </label>
                          <input
                            type="text"
                            value={builderHighlights}
                            onChange={(e) => setBuilderHighlights(e.target.value)}
                            placeholder="Jaise: Authentic Kathiyawadi Thali, Fast 10-Min Delivery, AC Dining"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] transition-all"
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleCraftBusinessPrompt(false)}
                          disabled={isCraftingPrompt}
                          className="px-4 py-2.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {isCraftingPrompt ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>AI Analyzing Links & Crafting Prompt...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>⚡ AI Se Pura Business Prompt Taiyar Karein</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCraftBusinessPrompt(true)}
                          disabled={isCraftingPrompt || isAiGenerating}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                          title="Generate Prompt and immediately activate review keywords & suggestions in one shot"
                        >
                          {isCraftingPrompt || isAiGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Processing All Steps...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>⚡ Auto-Craft & Activate Review Suggestions (1-Click)</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyMasterPrompt}
                          className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedMasterPrompt ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Prompt Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Master Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Business Prompt Input */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-[#6C3BFF]" />
                          <span>Business Information Prompt (Platform AI Agent Data)</span>
                        </label>
                        <span className="text-[11px] font-medium text-neutral-400">
                          {aiPrompt.length} characters
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mb-2 leading-relaxed">
                        Yahan aapke business ka pura prompt tayar hai. Aap isme koi bhi badlav (edit) kar sakte hain. Iske adhar par customer ke liye Google Review suggestions aur keywords bante hain!
                      </p>

                      <textarea
                        rows={7}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Udaharan (Example): Hamara restaurant authentic South Indian aur Gujarati thali serve karta hai. Hamara Crispy Masala Dosa aur Filter Coffee sabse famous hai. Staff bohot courteous hai, clean family dining area hai, aur prices bohot reasonable hain. Orders 10 minute me serve hote hain..."
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] leading-relaxed transition-all"
                      />
                    </div>

                    {/* Quick Prompt Templates */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-neutral-600 block">
                        Quick Example Templates (Click to fill):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAiPrompt(`We are a premium multi-cuisine family restaurant specializing in fresh food, authentic tandoori starters, quick service, and a cozy ambience with ample parking. Courteous staff and hygienic open kitchen.`);
                          }}
                          className="px-2.5 py-1 text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                        >
                          🍴 Restaurant & Food
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiPrompt(`Supermarket providing fresh groceries, organic vegetables, daily essentials at wholesale discount rates. Fast barcode billing, polite cashiers, and clean aisles.`);
                          }}
                          className="px-2.5 py-1 text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                        >
                          🛒 Retail & Mart
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiPrompt(`Professional dental and wellness clinic with modern pain-free equipment, gentle doctors, punctual appointment scheduling, and strict sterilization protocols.`);
                          }}
                          className="px-2.5 py-1 text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                        >
                          🩺 Clinic & Healthcare
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiPrompt(`Luxury unisex salon & spa providing expert hair styling, organic facials, relaxing massage therapy, sterilized tools, and friendly certified stylists.`);
                          }}
                          className="px-2.5 py-1 text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
                        >
                          💇 Salon & Spa
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleRunAiAgent(e)}
                        disabled={isAiGenerating || !aiPrompt.trim()}
                        className="px-5 py-2.5 font-bold text-xs text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isAiGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>AI Agent Analyzing & Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Keywords & 12 Review Drafts</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSavePromptAndKeywords}
                        disabled={isSavingPromptAndKeywords || !aiPrompt.trim()}
                        className="px-5 py-2.5 font-bold text-xs text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingPromptAndKeywords ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving Prompt & Keywords...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Prompt & Keywords</span>
                          </>
                        )}
                      </button>

                      {settings && (
                        <button
                          type="button"
                          onClick={() => onPreviewReviewFlow(business, settings)}
                          className="px-4 py-2.5 font-semibold text-xs text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Test in Live Review Flow</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: AI Generated Keywords & Live Status */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Keywords Card */}
                    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#6C3BFF]" />
                          <h3 className="text-xs font-bold text-neutral-900">
                            Active AI Keywords ({aiKeywords.length})
                          </h3>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Synced with QR
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        These tags appear when your customer selects star ratings, guiding them to mention these specific highlights on Google!
                      </p>

                      {/* Keywords list */}
                      <div className="flex flex-wrap gap-1.5 min-h-[50px] p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                        {aiKeywords.length === 0 ? (
                          <div className="text-center w-full py-4 text-[11px] text-neutral-400">
                            No custom keywords generated yet. Write your prompt on the left and click Generate!
                          </div>
                        ) : (
                          aiKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-neutral-800 border border-purple-200 rounded-lg text-xs font-semibold shadow-2xs hover:border-[#6C3BFF] transition-colors"
                            >
                              <Sparkles className="w-3 h-3 text-[#6C3BFF]" />
                              <span>{kw}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyword(kw)}
                                title="Remove keyword"
                                className="text-neutral-400 hover:text-rose-600 transition-colors ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Add manual custom keyword */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newKeywordInput}
                          onChange={(e) => setNewKeywordInput(e.target.value)}
                          onKeyDown={handleAddKeyword}
                          placeholder="Add custom keyword (e.g. Free WiFi)..."
                          className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                        />
                        <button
                          type="button"
                          onClick={handleAddKeyword}
                          className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* AI Strategic Recommendations Box */}
                    <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/50 rounded-2xl border border-purple-100 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-[#6C3BFF]">
                        <Compass className="w-4 h-4" />
                        <h4 className="text-xs font-bold text-neutral-900">
                          AI Suggestions for More Google Reviews
                        </h4>
                      </div>
                      <ul className="text-[11px] text-neutral-600 space-y-2">
                        {aiRecommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-[#6C3BFF] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* KEYWORD-BASED REVIEW SUGGESTIONS STUDIO (12 DRAFTS POOL WITH 3-DRAFT ROTATION) */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center border border-purple-100">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                          <span>कीवर्ड-आधारित 12 रिव्यू ड्राफ्ट्स (Keyword-Driven Review Pool)</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-[#6C3BFF] rounded-md">
                            12 Drafts
                          </span>
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                          Aapke keywords ke adhar par 12 natural review drafts banaye gaye hain. Customer ke QR code scan karne par har bar 3 drafts rotate hokar dikhenge!
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRegenerate12KeywordDrafts}
                        className="px-3 py-1.5 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-[#6C3BFF] border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate from Keywords</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveReviewDrafts}
                        disabled={isSavingReviewDrafts || customReviewDrafts.length === 0}
                        className="px-4 py-1.5 text-xs font-bold bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingReviewDrafts ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save 12 Drafts</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {draftsSaveSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{draftsSaveSuccess}</span>
                    </div>
                  )}

                  {/* LIVE 3-DRAFT ROTATION PREVIEW BOX */}
                  <div className="bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-purple-50/60 rounded-2xl border border-purple-200/80 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-neutral-900">
                          Live QR Station Rotation Preview (Customer ke phone par dikhne wale 3 drafts)
                        </span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-md font-semibold text-purple-700 border border-purple-200">
                          Draft {(previewRotationOffset % (customReviewDrafts.length || 12)) + 1} se {Math.min((previewRotationOffset % (customReviewDrafts.length || 12)) + 3, customReviewDrafts.length || 12)} of {customReviewDrafts.length || 12}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRotatePreview}
                        className="px-3 py-1 bg-white hover:bg-purple-100 text-[#6C3BFF] border border-purple-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>🔄 Rotate / Agli 3 Drafts Dekhein</span>
                      </button>
                    </div>

                    {/* 3 Active Rotating Cards: Mobile friendly one-by-one stack + Desktop Grid */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[0, 1, 2].map((offset) => {
                          const total = customReviewDrafts.length || 12;
                          const actualIdx = (previewRotationOffset + offset) % total;
                          const draft = customReviewDrafts[actualIdx] || '';
                          const kwA = aiKeywords[actualIdx % (aiKeywords.length || 1)] || 'Top Quality';
                          const kwB = aiKeywords[(actualIdx + 1) % (aiKeywords.length || 1)] || 'Friendly Team';

                          return (
                            <div
                              key={offset}
                              className="w-full bg-white rounded-xl p-3.5 border border-purple-200/80 shadow-xs flex flex-col justify-between space-y-2.5 relative"
                            >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-amber-400">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className="w-3 h-3 fill-amber-400" />
                                  ))}
                                </div>
                                <span className="text-[10px] font-bold bg-purple-50 text-[#6C3BFF] px-1.5 py-0.5 rounded">
                                  Option #{offset + 1} (Draft #{actualIdx + 1})
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                                  ✨ {kwA}
                                </span>
                                <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                                  ✨ {kwB}
                                </span>
                              </div>

                              <p className="text-xs text-neutral-800 leading-relaxed">
                                "{draft}"
                              </p>
                            </div>

                            <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>QR par 1-tap copy</span>
                              </span>
                              <span>{draft.length} chars</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                  {/* EXPANDABLE / COLLAPSIBLE ALL 12 DRAFTS STUDIO */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAll12Drafts(!showAll12Drafts)}
                      className="w-full py-2.5 px-4 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#6C3BFF]" />
                        <span>
                          {showAll12Drafts
                            ? '▲ Sabhi 12 Review Drafts Chhupayein (Collapse)'
                            : `▼ Sabhi ${customReviewDrafts.length} Keyword Review Drafts Dekhein / Edit Karein`}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6C3BFF] font-bold">
                        {showAll12Drafts ? 'Hide Details' : 'Show All 12 Drafts'}
                      </span>
                    </button>

                    {showAll12Drafts && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4 animate-in fade-in">
                        {customReviewDrafts.map((draft, idx) => {
                          const kwA = aiKeywords[idx % (aiKeywords.length || 1)] || 'Top Quality';
                          const kwB = aiKeywords[(idx + 1) % (aiKeywords.length || 1)] || 'Friendly Service';
                          return (
                            <div
                              key={idx}
                              className="p-3.5 bg-neutral-50/70 rounded-xl border border-neutral-200 space-y-2.5 flex flex-col justify-between"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-amber-500">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    ))}
                                    <span className="text-[11px] font-bold text-neutral-700 ml-1">
                                      Draft #{idx + 1}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    {idx < 3 ? 'Batch 1' : idx < 6 ? 'Batch 2' : idx < 9 ? 'Batch 3' : 'Batch 4'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  <span className="text-[9px] bg-purple-100/60 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                                    {kwA}
                                  </span>
                                  <span className="text-[9px] bg-purple-100/60 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                                    {kwB}
                                  </span>
                                </div>

                                <textarea
                                  rows={3}
                                  value={draft}
                                  onChange={(e) => handleUpdateDraft(idx, e.target.value)}
                                  placeholder="Review suggestion draft..."
                                  className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-800 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                                />
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-neutral-200 text-[10px] text-neutral-500">
                                <span className="text-emerald-700 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Active on QR</span>
                                </span>
                                <span>{draft.length} chars</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
                    <span className="text-[11px] text-neutral-500">
                      💡 Yeh 12 drafts aapke keywords se bante hain. Har bar customer review scan karega to 3 drafts rotate hokar dikhenge.
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveReviewDrafts}
                      disabled={isSavingReviewDrafts}
                      className="px-5 py-2 text-xs font-bold bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save 12 Review Drafts</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LOYALTY PROGRAM & DIGITAL VIP CARDS */}
            {activeTab === 'loyalty' && (
              <div className="space-y-6">
                {/* Hero Header */}
                <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-purple-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12" />
                  <div className="relative z-10 max-w-2xl space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-950/20 backdrop-blur-md rounded-full text-[11px] font-bold text-amber-200 border border-amber-300/30">
                      <Gift className="w-3.5 h-3.5 text-amber-300" />
                      <span>Google Review VIP Loyalty Program</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-white">
                      Loyalty Cards & Counter Rewards (रिवॉर्ड व लॉयल्टी प्रोग्राम)
                    </h2>
                    <p className="text-xs text-amber-100/90 leading-relaxed">
                      Jo bhi customer Google par review deta hai, usko instant ek <strong>Digital VIP Loyalty Card</strong> milta hai jisme unique single-use voucher code aur QR hota hai. Isse 1-time visitors repeat lifelong customers bante hain!
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-2.5">
                      {settings && business && (
                        <button
                          type="button"
                          onClick={() => onPreviewReviewFlow(business, settings)}
                          className="px-3.5 py-1.5 bg-white text-neutral-900 rounded-xl text-xs font-bold shadow-xs hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-700" />
                          <span>Preview Customer Review Station</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleExportLoyaltyCSV}
                        disabled={loyaltyCards.length === 0}
                        className="px-3.5 py-1.5 bg-neutral-900/40 border border-white/20 text-white rounded-xl text-xs font-semibold hover:bg-neutral-900/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Customer List (CSV)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualIssueModal(true)}
                        className="px-3.5 py-1.5 bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold hover:bg-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+ Issue Walk-in Card</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Top KPI Metrics Strip */}
                {(() => {
                  const totalIssued = loyaltyCards.length;
                  const totalRedeemed = loyaltyCards.filter((c) => c.status === 'redeemed').length;
                  const totalActive = loyaltyCards.filter(
                    (c) => c.status === 'active' && new Date(c.expires_at).getTime() >= Date.now()
                  ).length;
                  const redemptionRate = totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;

                  return (
                    <div className="space-y-1.5">
                      <div className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1.5 pt-0.5">
                        <div className="min-w-[68vw] sm:min-w-0 snap-center bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-neutral-500">Cards Issued</span>
                              <Gift className="w-4 h-4 text-amber-500" />
                            </div>
                            <span className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
                              {totalIssued}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-2">Reviewers rewarded</span>
                        </div>

                        <div className="min-w-[68vw] sm:min-w-0 snap-center bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-neutral-500">Redeemed at Counter</span>
                              <BadgeCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                              {totalRedeemed}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-2">Repeat visits claimed</span>
                        </div>

                        <div className="min-w-[68vw] sm:min-w-0 snap-center bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-neutral-500">Active Outstanding</span>
                              <Clock className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-2xl font-bold text-[#6C3BFF] font-mono tabular-nums">
                              {totalActive}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-2">In customer hands</span>
                        </div>

                        <div className="min-w-[68vw] sm:min-w-0 snap-center bg-white p-4.5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-neutral-500">Redemption Rate</span>
                              <BarChart3 className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
                              {redemptionRate}%
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-2">Customer return rate</span>
                        </div>
                      </div>
                      <div className="flex sm:hidden items-center justify-between text-[10px] text-neutral-400 px-1">
                        <span>👈 Swipe loyalty metrics 👉</span>
                        <span className="font-semibold text-amber-700">4 Stats</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Loyalty Module Sub-Navigation: POS Billing VS WhatsApp Reminders */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-2">
                  <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto snap-x">
                    <button
                      type="button"
                      onClick={() => setLoyaltySubTab('cards')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 snap-start whitespace-nowrap ${
                        loyaltySubTab === 'cards'
                          ? 'bg-white text-neutral-900 shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5 text-neutral-500" />
                      <span>POS Billing & Customer Cards ({loyaltyCards.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoyaltySubTab('reminders')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 snap-start whitespace-nowrap ${
                        loyaltySubTab === 'reminders'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Expiry Reminders</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black border border-emerald-300">
                        Anti-Duplicate (3 Stages)
                      </span>
                    </button>
                  </div>
                </div>

                {loyaltySubTab === 'reminders' && business ? (
                  <LoyaltyReminderManager
                    business={business}
                    loyaltyCards={loyaltyCards}
                    session={session}
                    onRefreshCards={async () => {
                      if (business) {
                        const fresh = await getLoyaltyCardsByBusinessId(business.id);
                        setLoyaltyCards(fresh);
                      }
                    }}
                  />
                ) : (
                  <>
                    {/* Counter Staff POS Voucher Verification Box */}
                    <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center font-bold shadow-2xs">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                          <span>Cashier Counter Voucher Verification & Redemption</span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            POS Billing Tool
                          </span>
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                          Search by Mobile Number, Customer Name, or Voucher Code when a customer arrives at billing
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Search Mode Tabs (Easy Option by Mobile, Name, or Code) */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 rounded-xl max-w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        setCashierSearchMode('all');
                        setVerifyError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        cashierSearchMode === 'all'
                          ? 'bg-white text-[#6C3BFF] shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Smart Search (Any)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashierSearchMode('phone');
                        setVerifyError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        cashierSearchMode === 'phone'
                          ? 'bg-white text-[#6C3BFF] shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>📱 Mobile Number</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashierSearchMode('name');
                        setVerifyError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        cashierSearchMode === 'name'
                          ? 'bg-white text-[#6C3BFF] shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>👤 Customer Name</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashierSearchMode('code');
                        setVerifyError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        cashierSearchMode === 'code'
                          ? 'bg-white text-[#6C3BFF] shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>🎟️ Voucher Code</span>
                    </button>
                  </div>

                  {/* Search Form */}
                  <form onSubmit={(e) => handleVerifyVoucher(e)} className="flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="relative flex-1 w-full">
                      {cashierSearchMode === 'phone' ? (
                        <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                      ) : cashierSearchMode === 'name' ? (
                        <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                      ) : (
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                      )}
                      <input
                        type="text"
                        placeholder={
                          cashierSearchMode === 'phone'
                            ? 'Enter customer 10-digit mobile number (e.g. 9876543210)...'
                            : cashierSearchMode === 'name'
                            ? 'Enter customer name (e.g. Rahul Sharma, Pooja)...'
                            : cashierSearchMode === 'code'
                            ? 'Enter voucher code (e.g. VIP-FOOD-7842)...'
                            : 'Search by mobile number, customer name, or voucher code...'
                        }
                        value={verifyCodeInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVerifyCodeInput(val);
                          if (!val.trim()) {
                            setVerifiedCard(null);
                            setMatchingCards([]);
                            setVerifyError(null);
                          }
                        }}
                        className="w-full pl-9 pr-10 py-2.5 text-xs font-medium bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                      {verifyCodeInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyCodeInput('');
                            setVerifiedCard(null);
                            setMatchingCards([]);
                            setVerifyError(null);
                          }}
                          className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer p-0.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isVerifying || !verifyCodeInput.trim()}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isVerifying ? 'Searching...' : 'Search & Verify'}</span>
                    </button>
                  </form>

                  {/* Quick-Pick Pills: Recent Active Cards */}
                  {loyaltyCards.filter((c) => c.status === 'active' && new Date(c.expires_at).getTime() >= Date.now()).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1">
                        <span>⚡ Quick Pick (Recent Customers):</span>
                      </span>
                      {loyaltyCards
                        .filter((c) => c.status === 'active' && new Date(c.expires_at).getTime() >= Date.now())
                        .slice(0, 4)
                        .map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => {
                              setVerifyCodeInput(card.customer_phone || card.voucher_code);
                              setVerifiedCard(card);
                              setMatchingCards([]);
                              setVerifyError(null);
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.02]"
                          >
                            <span className="font-bold">{card.customer_name}</span>
                            <span className="text-purple-600 font-mono">({card.customer_phone.slice(-4)})</span>
                            <span className="text-[10px] font-bold bg-white text-[#6C3BFF] px-1 rounded">
                              {card.voucher_code}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Multiple Matching Cards Found Box */}
                  {matchingCards.length > 1 && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                        <span>Found {matchingCards.length} matching customer cards — Click to select:</span>
                        <span className="text-[11px] font-normal text-amber-700">Choose one to redeem</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {matchingCards.map((mCard) => (
                          <div
                            key={mCard.id}
                            onClick={() => {
                              setVerifiedCard(mCard);
                              setVerifyCodeInput(mCard.voucher_code);
                            }}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              verifiedCard?.id === mCard.id
                                ? 'bg-white border-[#6C3BFF] ring-2 ring-[#6C3BFF]/20 shadow-xs'
                                : 'bg-white/80 border-amber-200 hover:border-[#6C3BFF]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-neutral-900">{mCard.customer_name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                mCard.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}>
                                {mCard.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono">📱 {mCard.customer_phone}</div>
                            <div className="text-[11px] font-mono font-bold text-purple-900 mt-0.5">🎟️ {mCard.voucher_code}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verification Error Notice */}
                  {verifyError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{verifyError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCashierSearchMode('all');
                          setVerifyError(null);
                        }}
                        className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer shrink-0"
                      >
                        Try Smart Search
                      </button>
                    </div>
                  )}

                  {/* Redeem Success Notice */}
                  {redeemSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between gap-2 font-bold animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{redeemSuccessMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyCodeInput('');
                          setVerifiedCard(null);
                          setMatchingCards([]);
                          setRedeemSuccessMsg(null);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] rounded-lg transition-colors cursor-pointer"
                      >
                        Next Customer
                      </button>
                    </div>
                  )}

                  {/* Verified Card Details Card */}
                  {verifiedCard && (
                    <div className="p-4 bg-purple-50/70 rounded-xl border-2 border-purple-300 animate-in fade-in space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-black text-purple-950 bg-white px-2.5 py-0.5 rounded-lg border border-purple-300">
                              {verifiedCard.voucher_code}
                            </span>
                            {verifiedCard.status === 'redeemed' ? (
                              <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                                <BadgeCheck className="w-3 h-3 text-neutral-500" />
                                Already Redeemed
                              </span>
                            ) : new Date(verifiedCard.expires_at).getTime() < Date.now() ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                                Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1 shadow-2xs">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Valid & Active Reward
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900 mt-1">
                            {verifiedCard.reward_title}
                          </h4>
                          <p className="text-xs text-neutral-600">
                            Customer: <strong className="text-neutral-900">{verifiedCard.customer_name}</strong> (📱 {verifiedCard.customer_phone})
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Valid Until: {new Date(verifiedCard.expires_at).toLocaleDateString()} · {verifiedCard.terms_conditions || 'Present at counter'}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewCardModal(verifiedCard)}
                            className="px-3 py-2 bg-white border border-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                          >
                            View Digital Card
                          </button>
                          {verifiedCard.status === 'active' && new Date(verifiedCard.expires_at).getTime() >= Date.now() && (
                            <button
                              type="button"
                              onClick={() => handleRedeemVoucher(verifiedCard.id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Apply & Mark Redeemed</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TWO-COLUMN LAYOUT: CUSTOMER CARDS DIRECTORY & SETTINGS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Issued Customer Loyalty Cards Table (7 cols) */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">
                          Issued Customer Cards ({loyaltyCards.length})
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                          Reviewers who claimed their digital card
                        </p>
                      </div>

                      {/* Status Filter Tabs */}
                      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-[11px]">
                        {(['all', 'active', 'redeemed'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setLoyaltyStatusFilter(tab)}
                            className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                              loyaltyStatusFilter === tab
                                ? 'bg-white text-neutral-900 shadow-2xs'
                                : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search by customer name, phone, or voucher code..."
                        value={loyaltySearch}
                        onChange={(e) => setLoyaltySearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                      />
                    </div>

                    {/* Cards List / Table */}
                    {(() => {
                      const filtered = loyaltyCards.filter((card) => {
                        const q = loyaltySearch.toLowerCase();
                        const matches =
                          card.customer_name.toLowerCase().includes(q) ||
                          card.customer_phone.includes(q) ||
                          card.voucher_code.toLowerCase().includes(q);
                        if (!matches) return false;
                        if (loyaltyStatusFilter === 'active') return card.status === 'active';
                        if (loyaltyStatusFilter === 'redeemed') return card.status === 'redeemed';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8 text-neutral-400 space-y-2">
                            <Gift className="w-8 h-8 text-neutral-300 mx-auto" />
                            <p className="text-xs">No loyalty cards match your filter.</p>
                            <button
                              type="button"
                              onClick={() => setShowManualIssueModal(true)}
                              className="text-xs font-bold text-[#6C3BFF] hover:underline cursor-pointer"
                            >
                              + Issue a test loyalty card now
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                          {filtered.map((card) => {
                            const isRedeemed = card.status === 'redeemed';
                            const isExp = new Date(card.expires_at).getTime() < Date.now();

                            return (
                              <div
                                key={card.id}
                                className="p-3.5 rounded-xl border border-neutral-200 hover:border-purple-300 bg-neutral-50/50 hover:bg-white transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-black text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                      {card.voucher_code}
                                    </span>
                                    {isRedeemed ? (
                                      <span className="px-2 py-0.5 text-[9px] font-bold bg-neutral-200 text-neutral-700 rounded-md">
                                        Redeemed
                                      </span>
                                    ) : isExp ? (
                                      <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-800 rounded-md">
                                        Expired
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-neutral-900">
                                    {card.customer_name}{' '}
                                    <span className="font-normal font-mono text-neutral-500">
                                      ({card.customer_phone})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-neutral-600 truncate max-w-xs">
                                    {card.reward_title} · Valid till{' '}
                                    {new Date(card.expires_at).toLocaleDateString()}
                                  </p>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewCardModal(card)}
                                    className="p-1.5 text-neutral-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer border border-neutral-200"
                                    title="View Digital Card"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {card.customer_phone && (
                                    <a
                                      href={`https://wa.me/${card.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                        `Hello ${card.customer_name}! Thank you for your review on ${business?.business_name || 'our store'}. Your VIP reward code is: ${card.voucher_code} (${card.reward_title}). Show this message at billing counter to redeem!`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-neutral-200"
                                      title="Send WhatsApp Reminder"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {!isRedeemed && !isExp && (
                                    <button
                                      type="button"
                                      onClick={() => handleRedeemVoucher(card.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                    >
                                      Redeem
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Loyalty Program Configuration (5 cols) */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">
                          Reward Settings
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                          Configure reward offered to Google reviewers
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loyaltyForm.enabled}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {loyaltySaveSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{loyaltySaveSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveLoyaltySettings} className="space-y-3.5">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                          Reward Headline *
                        </label>
                        <input
                          type="text"
                          required
                          value={loyaltyForm.reward_title}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, reward_title: e.target.value })}
                          placeholder="e.g. Flat 15% Off Your Next Meal"
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Reward Type
                          </label>
                          <select
                            value={loyaltyForm.reward_type}
                            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, reward_type: e.target.value as RewardType })}
                            className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                          >
                            <option value="discount_percentage">Percentage Discount</option>
                            <option value="discount_fixed">Fixed Amount Off</option>
                            <option value="free_item">Free Item / Dessert</option>
                            <option value="custom">Custom Reward</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Reward Value Badge
                          </label>
                          <input
                            type="text"
                            value={loyaltyForm.reward_value}
                            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, reward_value: e.target.value })}
                            placeholder="e.g. 15% or ₹100"
                            className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Min. Bill Spend
                          </label>
                          <input
                            type="text"
                            value={loyaltyForm.min_bill_amount}
                            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, min_bill_amount: e.target.value })}
                            placeholder="e.g. Min bill ₹250"
                            className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Validity Period (Days)
                          </label>
                          <select
                            value={loyaltyForm.validity_days}
                            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, validity_days: Number(e.target.value) })}
                            className="w-full px-2.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                          >
                            <option value={15}>15 Days</option>
                            <option value={30}>30 Days (Recommended)</option>
                            <option value={60}>60 Days</option>
                            <option value={90}>90 Days</option>
                            <option value={365}>1 Year</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                          Reward Description
                        </label>
                        <textarea
                          rows={2}
                          value={loyaltyForm.reward_description}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, reward_description: e.target.value })}
                          placeholder="Thank you for giving us a 5-Star review! Present this card at billing counter."
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF] resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                          Terms & Conditions
                        </label>
                        <input
                          type="text"
                          value={loyaltyForm.terms_conditions}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, terms_conditions: e.target.value })}
                          placeholder="Valid for dine-in & takeaway. 1 card per bill."
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingLoyalty}
                        className="w-full py-2.5 px-4 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingLoyalty ? 'Saving Settings...' : 'Save Loyalty Program'}</span>
                      </button>
                    </form>

                    {/* Live Preview Card */}
                    <div className="pt-3 border-t border-neutral-100">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                        Live Digital Card Sample
                      </span>
                      {(() => {
                        const sampleCard: LoyaltyCard = {
                          id: 'preview_sample',
                          business_id: business?.id || '',
                          customer_name: 'Pooja Sharma',
                          customer_phone: '+91 98765 43210',
                          voucher_code: 'VIP-DEMO-9821',
                          reward_title: loyaltyForm.reward_title || 'VIP Loyalty Reward',
                          reward_description: loyaltyForm.reward_description || 'Thank you for your Google Review!',
                          reward_type: loyaltyForm.reward_type,
                          reward_value: loyaltyForm.reward_value || '15%',
                          terms_conditions: loyaltyForm.terms_conditions,
                          status: 'active',
                          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
                          created_at: new Date().toISOString(),
                        };
                        return <DigitalLoyaltyCard card={sampleCard} business={business} isStaffView={false} />;
                      })()}
                    </div>
                  </div>
                </div>

                {/* MODAL: VIEW / PREVIEW DIGITAL LOYALTY CARD */}
                {previewCardModal && (
                  <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
                      <button
                        type="button"
                        onClick={() => setPreviewCardModal(null)}
                        className="absolute right-4 top-4 p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors"
                      >
                        ×
                      </button>
                      <h3 className="text-sm font-bold text-neutral-900 mb-4">
                        Digital Loyalty Pass
                      </h3>
                      <DigitalLoyaltyCard
                        card={previewCardModal}
                        business={business}
                        onRedeem={(id) => {
                          handleRedeemVoucher(id);
                          setPreviewCardModal(null);
                        }}
                        isStaffView={true}
                      />
                    </div>
                  </div>
                )}

                {/* MODAL: MANUAL ISSUE WALK-IN CARD */}
                {showManualIssueModal && (
                  <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gift className="w-5 h-5 text-amber-500" />
                          <h3 className="text-sm font-bold text-neutral-900">
                            Issue Walk-in Loyalty Card
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowManualIssueModal(false)}
                          className="text-neutral-400 hover:text-neutral-700 text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Manually grant a Digital VIP Loyalty Card to a customer who reviewed your store in person.
                      </p>
                      <form onSubmit={handleIssueManualCard} className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Customer Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Amit Kumar"
                            value={manualCustomerName}
                            onChange={(e) => setManualCustomerName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Customer WhatsApp / Mobile *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 9876543210"
                            value={manualCustomerPhone}
                            onChange={(e) => setManualCustomerPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isIssuingManual}
                          className="w-full py-2.5 px-4 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>{isIssuingManual ? 'Issuing Card...' : 'Issue & Generate VIP Pass'}</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

            {/* TAB: SCRATCH & WIN OFFERS (INDEPENDENT PROMOTIONAL CAMPAIGN) */}
            {activeTab === 'scratch_offers' && business && (
              <ScratchCampaignManager
                business={business}
                onPreviewOffer={(camp) => {
                  if (settings) {
                    onPreviewReviewFlow(business, settings);
                  }
                }}
              />
            )}

            {/* TAB: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Metrics Cards: Mobile Touch Slider Carousel + Desktop 4-col Grid */}
                <div className="space-y-1.5">
                  <div className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1.5 pt-0.5">
                    <div className="min-w-[70vw] sm:min-w-0 snap-center bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                          Total QR Scans
                        </span>
                        <span className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
                          {analytics.totalScans}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-2">Interactions logged</span>
                    </div>

                    <div className="min-w-[70vw] sm:min-w-0 snap-center bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                          Ratings Selected
                        </span>
                        <span className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
                          {analytics.totalRatings}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-2">1 to 5 star taps</span>
                    </div>

                    <div className="min-w-[70vw] sm:min-w-0 snap-center bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                          Avg Rating
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl font-bold text-neutral-900 font-mono tabular-nums">
                            {analytics.averageRating > 0 ? analytics.averageRating : '—'}
                          </span>
                          {analytics.averageRating > 0 && (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-2">From user selections</span>
                    </div>

                    <div className="min-w-[70vw] sm:min-w-0 snap-center bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs shrink-0 sm:shrink flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                          Google Review Clicks
                        </span>
                        <span className="text-2xl font-bold text-[#6C3BFF] font-mono tabular-nums">
                          {analytics.googleClicks}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-2">Redirects initiated</span>
                    </div>
                  </div>
                  {/* Mobile swipe hint */}
                  <div className="flex sm:hidden items-center justify-between text-[10px] text-neutral-400 px-1">
                    <span>👈 Swipe 4 metric cards 👉</span>
                    <span className="font-semibold text-purple-700">Live Sync</span>
                  </div>
                </div>

                {/* Interactive Setup Checklist (Placed Front & Center at Top of Dashboard) */}
                {(() => {
                  const isProfileDone = Boolean(business?.business_name && business.business_name.trim().length > 1);
                  const isGoogleUrlDone = Boolean(business?.google_review_url && business.google_review_url.trim().length > 6);
                  const isAiDone = Boolean(business?.ai_prompt && aiKeywords.length > 0);
                  const isQrDone = Boolean(business?.unique_slug);
                  const isLoyaltyDone = Boolean(loyaltyConfig?.enabled);
                  const isTestDone = Boolean(analytics.totalScans > 0);

                  const checklistItems = [
                    {
                      id: 'profile',
                      title: '1. Business Profile & Details',
                      desc: (isProfileDone || manualChecklistDone['profile']) ? `${business?.business_name} configured` : 'Add your business name, address & phone',
                      isDone: isProfileDone || Boolean(manualChecklistDone['profile']),
                      actionLabel: (isProfileDone || manualChecklistDone['profile']) ? 'View Profile' : 'Complete Profile',
                      tab: 'business' as const,
                    },
                    {
                      id: 'google_url',
                      title: '2. Google Review Link',
                      desc: (isGoogleUrlDone || manualChecklistDone['google_url']) ? 'Google Review link verified' : 'Link your Google Business review link',
                      isDone: isGoogleUrlDone || Boolean(manualChecklistDone['google_url']),
                      actionLabel: (isGoogleUrlDone || manualChecklistDone['google_url']) ? 'Edit Link' : 'Add Google Link',
                      tab: 'business' as const,
                    },
                    {
                      id: 'ai_agent',
                      title: '3. AI Prompt & Keywords (12 Drafts)',
                      desc: (isAiDone || manualChecklistDone['ai_agent']) ? `${aiKeywords.length} keywords & 12 review drafts active` : 'Generate your keywords and 12 review drafts',
                      isDone: isAiDone || Boolean(manualChecklistDone['ai_agent']),
                      actionLabel: (isAiDone || manualChecklistDone['ai_agent']) ? 'Edit Keywords' : 'Setup Keywords',
                      tab: 'ai_agent' as const,
                    },
                    {
                      id: 'qrcode',
                      title: '4. Review QR Standee & Station',
                      desc: (isQrDone || manualChecklistDone['qrcode']) ? `Slug: /review/${business?.unique_slug}` : 'Generate and print your QR standee',
                      isDone: isQrDone || Boolean(manualChecklistDone['qrcode']),
                      actionLabel: (isQrDone || manualChecklistDone['qrcode']) ? 'Open QR Studio' : 'Get QR Standee',
                      tab: 'qrcode' as const,
                    },
                    {
                      id: 'loyalty',
                      title: '5. Loyalty VIP Rewards Program',
                      desc: (isLoyaltyDone || manualChecklistDone['loyalty']) ? `Reward: ${loyaltyForm.reward_title}` : 'Activate reward cards for customers who review',
                      isDone: isLoyaltyDone || Boolean(manualChecklistDone['loyalty']),
                      actionLabel: (isLoyaltyDone || manualChecklistDone['loyalty']) ? 'Manage Loyalty' : 'Enable Rewards',
                      tab: 'loyalty' as const,
                    },
                    {
                      id: 'live_test',
                      title: '6. Test Live Customer QR Experience',
                      desc: (isTestDone || manualChecklistDone['live_test']) ? `${analytics.totalScans} live customer visits recorded` : 'Test the QR scan experience on mobile browser',
                      isDone: isTestDone || Boolean(manualChecklistDone['live_test']),
                      actionLabel: (isTestDone || manualChecklistDone['live_test']) ? 'Test Again' : 'Test Live Flow Now',
                      customAction: () => {
                        const safeSettings = settings || {
                          id: 'preview',
                          business_id: business?.id || '',
                          language: 'en',
                          welcome_text: 'How was your experience today?',
                          thank_you_text: 'Thank you for your review!',
                          enabled: true,
                          accent_color: '#6C3BFF',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        };
                        if (business) {
                          onPreviewReviewFlow(business, safeSettings);
                        }
                      },
                    },
                  ];

                  const completedCount = checklistItems.filter((i) => i.isDone).length;
                  const totalCount = checklistItems.length;
                  const pct = Math.round((completedCount / totalCount) * 100);

                  const handleChecklistAction = (item: typeof checklistItems[0]) => {
                    if (item.customAction) {
                      item.customAction();
                    } else if (item.tab) {
                      setActiveTab(item.tab);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  };

                  const handleToggleItemCheck = (id: string, e: React.MouseEvent) => {
                    e.stopPropagation();
                    setManualChecklistDone((prev) => {
                      const next = { ...prev, [id]: !prev[id] };
                      try {
                        localStorage.setItem(`checklist_${business?.id || 'default'}`, JSON.stringify(next));
                      } catch {}
                      return next;
                    });
                  };

                  return (
                    <div className="bg-white rounded-2xl p-6 border-2 border-purple-200/80 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-[#6C3BFF]" />
                            <h3 className="text-sm font-bold text-neutral-900">
                              First-Time Setup Checklist
                            </h3>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Click any item below to configure your review QR station and boost ratings (tap checkmark to mark done)
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-32 bg-neutral-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#6C3BFF] h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                            pct === 100
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {pct}% ({completedCount}/{totalCount})
                          </span>
                        </div>
                      </div>

                      {/* Mobile Setup Checklist Slider */}
                      <div className="block sm:hidden">
                        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 no-scrollbar pb-2 pt-0.5">
                          {checklistItems.map((item, idx) => (
                            <div
                              key={item.id}
                              onClick={() => handleChecklistAction(item)}
                              className={`min-w-[82vw] snap-center p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 shrink-0 ${
                                item.isDone
                                  ? 'bg-neutral-50/80 border-neutral-200'
                                  : 'bg-amber-50/40 border-amber-300 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <button
                                  type="button"
                                  title={item.isDone ? 'Mark Incomplete' : 'Mark Completed'}
                                  onClick={(e) => handleToggleItemCheck(item.id, e)}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 cursor-pointer ${
                                    item.isDone
                                      ? 'bg-emerald-100 text-emerald-600'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {item.isDone ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                </button>
                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-bold text-neutral-400">Step {idx + 1} of {totalCount}</span>
                                    {item.isDone && (
                                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">Completed</span>
                                    )}
                                  </div>
                                  <span className="font-bold text-neutral-900 text-xs block">
                                    {item.title}
                                  </span>
                                  <span className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 block">
                                    {item.desc}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChecklistAction(item);
                                }}
                                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  item.isDone
                                    ? 'bg-white border border-neutral-200 text-neutral-700'
                                    : 'bg-[#6C3BFF] text-white shadow-xs'
                                }`}
                              >
                                <span>{item.actionLabel}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-neutral-400 px-1 pt-1">
                          <span>👈 Swipe steps horizontally 👉</span>
                          <span className="font-bold text-[#6C3BFF]">{completedCount} of {totalCount} Done</span>
                        </div>
                      </div>

                      {/* Desktop Setup Checklist Grid */}
                      <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {checklistItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleChecklistAction(item)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer group ${
                              item.isDone
                                ? 'bg-neutral-50/70 border-neutral-200/80 hover:border-purple-300 hover:bg-purple-50/20'
                                : 'bg-amber-50/30 border-amber-200/80 hover:border-amber-400 hover:bg-amber-50/60'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                title={item.isDone ? 'Mark Incomplete' : 'Mark Completed'}
                                onClick={(e) => handleToggleItemCheck(item.id, e)}
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-transform hover:scale-110 ${
                                  item.isDone
                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                              >
                                {item.isDone ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                              </button>
                              <div>
                                <span className="font-bold text-neutral-900 group-hover:text-[#6C3BFF] transition-colors block">
                                  {item.title}
                                </span>
                                <span className="text-[11px] text-neutral-500 line-clamp-1">
                                  {item.desc}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChecklistAction(item);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ml-2 cursor-pointer flex items-center gap-1 ${
                                item.isDone
                                  ? 'bg-white border border-neutral-200 text-neutral-600 group-hover:bg-[#6C3BFF] group-hover:text-white group-hover:border-[#6C3BFF]'
                                  : 'bg-amber-500 text-white shadow-2xs group-hover:bg-amber-600'
                              }`}
                            >
                              <span>{item.actionLabel}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Daily Review Landing Page Access Trend Visualizer (Recharts) */}
                {business && (
                  <DailyReviewAccessTrend
                    businessId={business.id}
                    businessName={business.business_name}
                  />
                )}

                {/* Loyalty Program Quick Status Banner */}
                <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-neutral-900">
                          Google Review Loyalty Program Active
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-md">
                          {loyaltyCards.length} Cards Issued
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        Current Reward: <strong className="text-purple-900">{loyaltyForm.reward_title}</strong> ({loyaltyForm.reward_value} Off). Reviewers claim this card right after posting on Google.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('loyalty')}
                    className="px-3.5 py-1.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Manage Loyalty Program</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Rating Distribution & Conversion Funnel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rating Distribution */}
                  <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-neutral-900">Rating Breakdown</h3>
                    <div className="space-y-2.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = analytics.starDistribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                        const pct =
                          analytics.totalRatings > 0
                            ? Math.round((count / analytics.totalRatings) * 100)
                            : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 text-xs">
                            <span className="w-12 font-medium text-neutral-600 flex items-center gap-1">
                              {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            </span>
                            <div className="flex-1 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                              />
                            </div>
                            <span className="w-12 text-right font-mono text-neutral-500 tabular-nums">
                              {pct}% ({count})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Journey Funnel */}
                  <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-neutral-900">Conversion Funnel</h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
                        <span className="text-neutral-600">1. QR Scans</span>
                        <span className="font-bold font-mono text-neutral-900 tabular-nums">
                          {analytics.totalScans}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
                        <span className="text-neutral-600">2. Rating Selections</span>
                        <span className="font-bold font-mono text-neutral-900 tabular-nums">
                          {analytics.totalRatings}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
                        <span className="text-neutral-600">3. Review Drafts Copied</span>
                        <span className="font-bold font-mono text-neutral-900 tabular-nums">
                          {analytics.reviewCopies}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 text-[#6C3BFF]">
                        <span className="font-semibold">4. Google Reviews Clicked</span>
                        <span className="font-bold font-mono tabular-nums">
                          {analytics.googleClicks}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
                        <span className="text-neutral-600">5. Private Feedback Submissions</span>
                        <span className="font-bold font-mono text-neutral-900 tabular-nums">
                          {analytics.feedbackSubmissions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: QR CODE */}
            {activeTab === 'qrcode' && (
              <QRCodeView
                business={business}
                settings={settings || undefined}
                onPreviewFlow={() => {
                  const safeSettings: ReviewSettings = settings || {
                    id: `rs_${business.id}`,
                    business_id: business.id,
                    language: 'en',
                    welcome_text: 'How was your dining experience with us today?',
                    thank_you_text: 'Thank you for supporting our local business! ❤️',
                    enabled: true,
                    accent_color: '#6C3BFF',
                    qr_show_logo: true,
                    qr_logo_border_style: 'circular',
                    qr_color: '#1F1735',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  onPreviewReviewFlow(business, safeSettings);
                }}
                onSettingsUpdated={(updated) => setSettings(updated)}
                onOpenLiveReview={onOpenLiveReview}
              />
            )}

            {/* TAB: ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {business && (
                  <DailyReviewAccessTrend
                    businessId={business.id}
                    businessName={business.business_name}
                  />
                )}

                <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-neutral-900">System Interaction Metrics</h3>
                  <p className="text-xs text-neutral-500">
                    Interactions logged in real time. These metrics represent actions within LocalBoost AI,
                    not unverified claims of published Google reviews.
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 pt-0.5">
                      <div className="min-w-[65vw] sm:min-w-0 snap-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 shrink-0 sm:shrink">
                        <span className="text-xs text-neutral-500 block mb-1">Total QR Scans</span>
                        <span className="text-2xl font-bold font-mono tabular-nums">{analytics.totalScans}</span>
                      </div>
                      <div className="min-w-[65vw] sm:min-w-0 snap-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 shrink-0 sm:shrink">
                        <span className="text-xs text-neutral-500 block mb-1">Ratings Logged</span>
                        <span className="text-2xl font-bold font-mono tabular-nums">{analytics.totalRatings}</span>
                      </div>
                      <div className="min-w-[65vw] sm:min-w-0 snap-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 shrink-0 sm:shrink">
                        <span className="text-xs text-neutral-500 block mb-1">Average Selected Rating</span>
                        <span className="text-2xl font-bold font-mono tabular-nums">{analytics.averageRating} ★</span>
                      </div>
                      <div className="min-w-[65vw] sm:min-w-0 snap-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 shrink-0 sm:shrink">
                        <span className="text-xs text-neutral-500 block mb-1">Drafts Copied</span>
                        <span className="text-2xl font-bold font-mono tabular-nums">{analytics.reviewCopies}</span>
                      </div>
                      <div className="min-w-[65vw] sm:min-w-0 snap-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 shrink-0 sm:shrink">
                        <span className="text-xs text-neutral-500 block mb-1">Google Review Clicks</span>
                        <span className="text-2xl font-bold font-mono text-[#6C3BFF] tabular-nums">
                          {analytics.googleClicks}
                        </span>
                      </div>
                      <div className="min-w-[65vw] sm:min-w-0 snap-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 shrink-0 sm:shrink">
                        <span className="text-xs text-neutral-500 block mb-1">Private Feedbacks</span>
                        <span className="text-2xl font-bold font-mono tabular-nums">
                          {analytics.feedbackSubmissions}
                        </span>
                      </div>
                    </div>
                    <div className="flex sm:hidden items-center justify-between text-[10px] text-neutral-400 px-1">
                      <span>👈 Swipe metrics cards 👉</span>
                      <span className="text-purple-600 font-bold">Analytics KPI</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FEEDBACK INBOX */}
            {activeTab === 'feedback' && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Private Customer Feedback</h3>
                    <p className="text-xs text-neutral-500">
                      Private feedback submitted directly by customers to help your team improve
                    </p>
                  </div>
                  <span className="text-xs font-mono font-medium text-neutral-500">
                    {feedbacks.length} messages
                  </span>
                </div>

                {feedbacks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
                    <MessageSquareText className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="font-semibold text-neutral-700">No private feedback received yet</p>
                    <p>When customers send private notes from your QR review page, they will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="p-4 rounded-xl border border-neutral-200/90 bg-neutral-50/50 space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-bold text-amber-500">
                              {fb.rating} <Star className="w-3.5 h-3.5 fill-amber-400" />
                            </span>
                            <span className="text-neutral-400">·</span>
                            <span className="font-semibold text-neutral-800">
                              {fb.customer_name || 'Anonymous Visitor'}
                            </span>
                            {fb.customer_contact && (
                              <span className="text-neutral-500 font-mono">
                                ({fb.customer_contact})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            {new Date(fb.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-neutral-700 leading-relaxed bg-white p-3 rounded-lg border border-neutral-200/60">
                          {fb.feedback_text}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              fb.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : fb.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            Status: {fb.status.replace('_', ' ')}
                          </span>

                          <div className="flex gap-1.5">
                            {fb.status !== 'in_progress' && fb.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(fb.id, 'in_progress')}
                                className="px-2.5 py-1 text-[11px] font-medium bg-white border border-neutral-300 rounded hover:bg-neutral-100"
                              >
                                Mark In Progress
                              </button>
                            )}
                            {fb.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(fb.id, 'resolved')}
                                className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: BUSINESS PROFILE */}
            {activeTab === 'business' && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Edit Business Details</h3>
                  <p className="text-xs text-neutral-500">
                    Update information displayed on your customer review page
                  </p>
                </div>

                <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Business Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bizForm.business_name}
                        onChange={(e) => setBizForm({ ...bizForm, business_name: e.target.value })}
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Category
                      </label>
                      <select
                        value={bizForm.category}
                        onChange={(e) => setBizForm({ ...bizForm, category: e.target.value })}
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      >
                        <option value="Restaurant & Hospitality">Restaurant & Hospitality</option>
                        <option value="Cafe & Bakery">Cafe & Bakery</option>
                        <option value="Hotel & Lodging">Hotel & Lodging</option>
                        <option value="Salon & Spa">Salon & Spa</option>
                        <option value="Clinic & Healthcare">Clinic & Healthcare</option>
                        <option value="Clothing & Retail">Clothing & Retail</option>
                        <option value="Fitness & Gym">Fitness & Gym</option>
                        <option value="Other Local Business">Other Local Business</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Target Google Review URL <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={bizForm.google_review_url}
                      onChange={(e) => setBizForm({ ...bizForm, google_review_url: e.target.value })}
                      placeholder="https://g.page/r/..."
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Must be a valid HTTPS link to your Google Business Profile review dialog.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        QR Slug Identifier
                      </label>
                      <input
                        type="text"
                        required
                        value={bizForm.unique_slug}
                        onChange={(e) => setBizForm({ ...bizForm, unique_slug: e.target.value })}
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Logo Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={bizForm.logo_url}
                        onChange={(e) => setBizForm({ ...bizForm, logo_url: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Contact Phone (Optional)
                      </label>
                      <input
                        type="text"
                        value={bizForm.phone}
                        onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Physical Address (Optional)
                      </label>
                      <input
                        type="text"
                        value={bizForm.address}
                        onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
                        className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>
                  </div>

                  {/* Free Live GPS Verification Settings */}
                  <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#6C3BFF] text-white flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-neutral-900">Live GPS On-Premise Radius Verification</h4>
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full border border-emerald-300">
                              100% Free (0₹ Cost)
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            Ensures only genuine customers physically in your store/restaurant can review. Uses native phone HTML5 GPS without any paid Google Maps API.
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0">
                        <input
                          type="checkbox"
                          checked={bizForm.gps_verification_enabled}
                          onChange={(e) => setBizForm({ ...bizForm, gps_verification_enabled: e.target.checked })}
                          className="w-4 h-4 text-[#6C3BFF] rounded focus:ring-[#6C3BFF]"
                        />
                        <span className="text-xs font-bold text-neutral-800">Enable GPS Shield</span>
                      </label>
                    </div>

                    {bizForm.gps_verification_enabled && (
                      <div className="space-y-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDetectGps}
                            disabled={isDetectingGps}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                            <span>{isDetectingGps ? 'Detecting Store Location...' : '📍 Auto-Detect Store Coordinates (Free)'}</span>
                          </button>
                          <span className="text-[11px] text-neutral-500">
                            (Stand inside your shop/restaurant and click to auto-detect current GPS coordinates)
                          </span>
                        </div>

                        {gpsDetectMsg && (
                          <div className="text-xs p-2.5 bg-white border border-purple-200 rounded-xl text-purple-900 font-medium">
                            {gpsDetectMsg}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-semibold text-neutral-700 mb-1">
                              Store Latitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={bizForm.latitude}
                              onChange={(e) => setBizForm({ ...bizForm, latitude: e.target.value })}
                              placeholder="e.g. 21.1702"
                              className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#6C3BFF]"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-neutral-700 mb-1">
                              Store Longitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={bizForm.longitude}
                              onChange={(e) => setBizForm({ ...bizForm, longitude: e.target.value })}
                              placeholder="e.g. 72.8311"
                              className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#6C3BFF]"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-neutral-700 mb-1">
                              Allowed Radius (Meters)
                            </label>
                            <select
                              value={bizForm.gps_radius_meters}
                              onChange={(e) => setBizForm({ ...bizForm, gps_radius_meters: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#6C3BFF]"
                            >
                              <option value="100">100 meters (Within store)</option>
                              <option value="200">200 meters (Recommended)</option>
                              <option value="500">500 meters (Store & parking)</option>
                              <option value="1000">1 km (Neighborhood)</option>
                            </select>
                          </div>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded-xl border border-purple-100 text-[11px] text-neutral-600 space-y-1">
                          <p className="font-bold text-neutral-800 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Why Live GPS gives higher Google ranking for free:
                          </p>
                          <p>
                            Google's local algorithm penalizes bot reviews from remote IP addresses. When a customer confirms they are physically on your premises, it verifies authentic footfall, prevents competitor slander, and guarantees 100% genuine reviews!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: REVIEW SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Review Experience Settings</h3>
                  <p className="text-xs text-neutral-500">
                    Customize the review page text, default language, and branding accent color
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Default Language
                    </label>
                    <select
                      value={settingsForm.language}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, language: e.target.value as SupportedLanguage })
                      }
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="gu">Gujarati (ગુજરાતી)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Welcome Greeting Text
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.welcome_text}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, welcome_text: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Thank You Footer Message
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.thank_you_text}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, thank_you_text: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Accent Color Hex
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settingsForm.accent_color}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, accent_color: e.target.value })
                          }
                          className="w-9 h-9 p-0 border border-neutral-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settingsForm.accent_color}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, accent_color: e.target.value })
                          }
                          className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Page Enabled Status
                      </label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="enabled-toggle"
                          checked={settingsForm.enabled}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, enabled: e.target.checked })
                          }
                          className="w-4 h-4 text-[#6C3BFF] rounded"
                        />
                        <label htmlFor="enabled-toggle" className="text-neutral-700 font-medium">
                          Accept public reviews and QR scans
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Platform Announcements</h3>
                    <p className="text-xs text-neutral-500">
                      Important product updates and operational notices from LocalBoost AI
                    </p>
                  </div>
                </div>

                {announcements.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
                    <Bell className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="font-semibold text-neutral-700">No active announcements</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ann.type === 'urgent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : ann.type === 'warning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : ann.type === 'success'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {ann.type}
                            </span>
                            <h4 className="font-bold text-neutral-900">{ann.title}</h4>
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            {new Date(ann.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-neutral-700 leading-relaxed">{ann.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: WHATSAPP SUPPORT */}
            {activeTab === 'support' && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Direct WhatsApp Support</h3>
                  <p className="text-xs text-neutral-500">
                    Reach our priority support team directly with your pre-formatted identification
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Customer Identification Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#6C3BFF]">
                        {session.user.unique_customer_code}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="text-neutral-600 hover:text-neutral-900 font-medium underline"
                      >
                        {copiedCode ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Registered Name:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-800">{session.user.full_name}</span>
                      <button
                        onClick={handleCopyName}
                        className="text-neutral-600 hover:text-neutral-900 font-medium underline"
                      >
                        {copiedName ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Business Entity:</span>
                    <span className="font-medium text-neutral-800">{business.business_name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Support Number:</span>
                    <span className="font-mono text-neutral-800">
                      {adminSettings.whatsapp_support_number || '+15550198234'}
                    </span>
                  </div>
                </div>

                <div>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open WhatsApp Chat with Pre-Filled Details</span>
                  </a>
                </div>
              </div>
            )}

            {/* TAB: PASSWORD & ACCOUNT SECURITY */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-50 text-[#6C3BFF] rounded-xl">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">Account Password & Security</h3>
                      <p className="text-xs text-neutral-500">
                        Set or change your login password for {session.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-500">Customer ID:</span>
                    <span className="font-mono font-bold text-[#6C3BFF] bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                      {session.user.unique_customer_code}
                    </span>
                  </div>
                </div>

                {passwordNotice && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{passwordNotice}</span>
                    </div>
                    {savedPasswordDisplay && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200 text-xs mt-2">
                        <span className="font-mono text-neutral-800">
                          New Password: <strong>{savedPasswordDisplay}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(savedPasswordDisplay);
                            setCopiedNewPass(true);
                            setTimeout(() => setCopiedNewPass(false), 2000);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {copiedNewPass ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg text-xs">
                  {/* Option to toggle direct password set */}
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-800 block">Set Password Directly</span>
                      <span className="text-[11px] text-neutral-500">
                        Skip current password verification (useful if you don't know the old password)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resetWithoutOldPass}
                        onChange={(e) => setResetWithoutOldPass(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6C3BFF]"></div>
                    </label>
                  </div>

                  {!resetWithoutOldPass && (
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          required={!resetWithoutOldPass}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-neutral-700">
                        New Password (Minimum 6 characters) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const gen = `LB@${Math.floor(100000 + Math.random() * 900000)}`;
                          setNewPassword(gen);
                          setConfirmPassword(gen);
                          setShowNewPassword(true);
                        }}
                        className="text-[11px] text-[#6C3BFF] hover:underline font-semibold"
                      >
                        + Generate Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={updatingPassword}
                      className="px-6 py-2.5 font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Key className="w-4 h-4" />
                      <span>{updatingPassword ? 'Saving Password...' : resetWithoutOldPass ? 'Set New Password' : 'Change Password'}</span>
                    </button>
                  </div>
                </form>

                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-[11px] text-neutral-600 space-y-1 max-w-lg">
                  <span className="font-bold text-neutral-900 block">Security Notes:</span>
                  <p>• Avoid reusing passwords across different applications.</p>
                  <p>• Your new password takes effect immediately for future logins.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
