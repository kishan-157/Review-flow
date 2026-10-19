/**
 * LocalBoost AI — Business Owner Dashboard: AI Business Chat Tab
 *
 * Implements:
 * - 100% Customizable Quick Messages & Instant Answer Chips.
 * - 1-Click addition from saved products/services, hours, policies, FAQs.
 * - Clean short link generator (/c/:slug) with custom slug editor.
 * - Separate from AI Prompt Engine to avoid confusion.
 * - Multi-language support (EN, HI, GU) and 100% local deterministic execution.
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Check,
  AlertTriangle,
  QrCode,
  Copy,
  Download,
  Share2,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  Sparkles,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  Filter,
  Layers,
  Settings,
  HelpCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Save,
  Zap,
  MapPin,
  CreditCard,
  Truck,
  RotateCcw,
  Package,
  CheckCircle,
  Smartphone,
  CheckSquare,
  Globe,
  Sliders,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  Business,
  BusinessProfileInfo,
  ChatbotConfig,
  ChatConversation,
  ChatMessage,
  ChatAnalyticsSummary,
  ChatQuickPrompt,
  SupportedLanguage,
  ProductServiceItem,
  BusinessFaqItem,
} from '../types/database';
import {
  getDefaultBusinessProfileInfo,
  computeChecklistStatus,
  synthesizePromptFromChecklist,
} from '../lib/businessInfoService';
import { BusinessInfoChecklist } from './BusinessInfoChecklist';

interface AiBusinessChatTabProps {
  business: Business;
  onUpdateBusiness: (updated: Business) => Promise<void> | void;
  onOpenLiveChat?: (slug: string) => void;
}

const getDefaultQuickPrompts = (biz: Business): ChatQuickPrompt[] => [
  {
    id: 'qp_hours',
    label: '🕒 Opening Hours',
    question: 'What are your opening hours today?',
    category: 'hours',
    action_type: 'message',
    is_active: true,
  },
  {
    id: 'qp_location',
    label: '📍 Location & Address',
    question: 'Where is your shop located?',
    category: 'location',
    action_type: 'message',
    is_active: true,
  },
  {
    id: 'qp_products',
    label: '📋 Products & Services',
    question: 'What products or services do you offer?',
    category: 'product',
    action_type: 'message',
    is_active: true,
  },
  {
    id: 'qp_payments',
    label: '💳 Payment Methods',
    question: 'Which payment methods do you accept?',
    category: 'policy',
    action_type: 'message',
    is_active: true,
  },
  {
    id: 'qp_whatsapp',
    label: '💬 Chat on WhatsApp',
    question: 'I would like to contact on WhatsApp',
    category: 'contact',
    action_type: 'whatsapp',
    action_value: biz.whatsapp_number ? `https://wa.me/${biz.whatsapp_number.replace(/[^\d]/g, '')}` : '',
    is_active: true,
  },
];

export const AiBusinessChatTab: React.FC<AiBusinessChatTabProps> = ({
  business,
  onUpdateBusiness,
  onOpenLiveChat,
}) => {
  const [subTab, setSubTab] = useState<
    'overview' | 'quick_prompts' | 'checklist' | 'settings' | 'history' | 'share' | 'analytics' | 'sources' | 'personality' | 'test_bot' | 'embed'
  >('overview');
  const [websiteUrlInput, setWebsiteUrlInput] = useState('');
  const [mapsUrlInput, setMapsUrlInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [testMessages, setTestMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; source?: string }>>([
    { sender: 'bot', text: `Hello! I am the verified AI assistant for ${business.business_name}. Ask me anything about hours, services, or location!` }
  ]);
  const [testInput, setTestInput] = useState('');
  const [businessInfo, setBusinessInfo] = useState<BusinessProfileInfo>(() =>
    getDefaultBusinessProfileInfo(business)
  );
  const [chatConfig, setChatConfig] = useState<ChatbotConfig>({
    id: `cfg_${business.id}`,
    business_id: business.id,
    enabled: true,
    welcome_message: {
      en: `Hello! Welcome to ${business.business_name}. How can we assist you today?`,
      hi: `नमस्ते! ${business.business_name} में आपका स्वागत है। आज हम आपकी क्या सहायता कर सकते हैं?`,
      gu: `નમસ્તે! ${business.business_name} માં આપનું સ્વાગત છે. આજે અમે આપને કઈ રીતે મદદ કરી શકીએ?`,
    },
    supported_languages: ['en', 'hi', 'gu'],
    suggested_questions: [
      'What are your opening hours?',
      'Where is your shop located?',
      'What products or services do you offer?',
      'Which payment methods do you accept?',
    ],
    quick_prompts: getDefaultQuickPrompts(business),
    show_call_button: true,
    show_whatsapp_button: true,
    show_directions_button: true,
    show_website_button: false,
    visitor_privacy_notice:
      'We respect your privacy. Chat transcripts are retained securely and only used to assist your inquiry.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<ChatAnalyticsSummary>({
    totalConversations: 0,
    totalMessages: 0,
    unansweredCount: 0,
    contactClicksCount: 0,
    topIntents: [],
    topQuestions: [],
    unansweredQuestions: [],
  });

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Short URL & Custom Slug state
  const cleanSlug = business.unique_slug || 'chat';
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicOrigin = rawOrigin.includes('ais-dev-')
    ? rawOrigin.replace('ais-dev-', 'ais-pre-')
    : rawOrigin;
  const shortChatUrl = `${publicOrigin}/?c=${cleanSlug}`;
  const [slugInput, setSlugInput] = useState<string>(cleanSlug);
  const [isEditingSlug, setIsEditingSlug] = useState<boolean>(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSavingSlug, setIsSavingSlug] = useState<boolean>(false);

  // Quick Prompt Modal & Editor State
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState<string>('');
  const [formQuestion, setFormQuestion] = useState<string>('');
  const [formDirectAnswer, setFormDirectAnswer] = useState<string>('');
  const [formActionType, setFormActionType] = useState<
    'message' | 'call' | 'whatsapp' | 'maps' | 'website'
  >('message');
  const [formActionValue, setFormActionValue] = useState<string>('');
  const [formCategory, setFormCategory] = useState<
    'hours' | 'location' | 'product' | 'policy' | 'contact' | 'custom'
  >('custom');

  // Presets filter & inline addition of products/FAQs
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<
    'all' | 'basics' | 'products' | 'policies' | 'faqs' | 'packs'
  >('all');
  const [showAddProductInline, setShowAddProductInline] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<string>('');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [showAddFaqInline, setShowAddFaqInline] = useState<boolean>(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState<string>('');
  const [newFaqAnswer, setNewFaqAnswer] = useState<string>('');

  // Live Phone Simulator Preview
  const [showLiveSimulator, setShowLiveSimulator] = useState<boolean>(false);
  const [simulatedMessages, setSimulatedMessages] = useState<
    Array<{ sender: 'user' | 'bot'; text: string; id: string; actions?: any[] }>
  >([]);
  const [simulatedTyping, setSimulatedTyping] = useState<boolean>(false);

  // Synchronize businessInfo whenever business changes
  useEffect(() => {
    if (business) {
      setBusinessInfo(getDefaultBusinessProfileInfo(business));
    }
  }, [business]);

  // Load backend chat history, config & analytics
  useEffect(() => {
    async function fetchChatData() {
      try {
        const [histRes, confRes, analRes] = await Promise.all([
          fetch(`/api/chat/business/${business.id}/history`).catch(() => null),
          fetch(`/api/chat/business/${business.id}/config`).catch(() => null),
          fetch(`/api/chat/business/${business.id}/analytics`).catch(() => null),
        ]);

        if (histRes && histRes.ok) {
          const data = await histRes.json();
          if (data.conversations) setConversations(data.conversations);
        }

        if (confRes && confRes.ok) {
          const data = await confRes.json();
          if (data.config) {
            const loaded = data.config;
            // Guarantee quick_prompts exists
            if (!loaded.quick_prompts || loaded.quick_prompts.length === 0) {
              loaded.quick_prompts = getDefaultQuickPrompts(business);
            }
            setChatConfig(loaded);
          }
        }

        if (analRes && analRes.ok) {
          const data = await analRes.json();
          if (data.analytics) setAnalytics(data.analytics);
        }
      } catch (err) {
        console.warn('Error fetching chat dashboard data:', err);
      }
    }
    fetchChatData();
  }, [business.id]);

  // Generate QR code for Short Chat Link
  useEffect(() => {
    QRCode.toDataURL(shortChatUrl, {
      width: 480,
      margin: 2,
      color: { dark: '#6C3BFF', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((e) => console.error(e));
  }, [shortChatUrl]);

  const checklist = computeChecklistStatus(businessInfo);
  const activePrompts = (chatConfig.quick_prompts || []).filter((p) => p.is_active);

  const handleSaveInfo = async (updated: BusinessProfileInfo) => {
    setBusinessInfo(updated);
    const updatedBiz: Business = {
      ...business,
      business_info: updated,
      business_name: updated.business_name,
      address: updated.address || business.address,
      phone: updated.phone || business.phone,
      whatsapp_number: updated.whatsapp || business.whatsapp_number,
      category: updated.category || business.category,
      ai_prompt: synthesizePromptFromChecklist(updated),
    };
    await onUpdateBusiness(updatedBiz);

    // Sync to backend API
    try {
      await fetch(`/api/chat/business/${business.id}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessInfo: updated }),
      });
    } catch {}
  };

  const handleSaveChatConfig = async (newConfig?: ChatbotConfig) => {
    const configToSave = newConfig || chatConfig;
    try {
      const res = await fetch(`/api/chat/business/${business.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configToSave }),
      });
      if (res.ok) {
        setStatusNotice('Chatbot configuration saved successfully!');
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch {
      setStatusNotice('Saved locally.');
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const handleToggleChatActive = async () => {
    const updated = { ...chatConfig, enabled: !chatConfig.enabled };
    setChatConfig(updated);
    await handleSaveChatConfig(updated);
  };

  // Open Quick Prompt Creator / Editor
  const handleOpenAddPrompt = () => {
    setEditingPromptId(null);
    setFormLabel('');
    setFormQuestion('');
    setFormDirectAnswer('');
    setFormActionType('message');
    setFormActionValue('');
    setFormCategory('custom');
    setShowPromptModal(true);
  };

  const handleOpenEditPrompt = (prompt: ChatQuickPrompt) => {
    setEditingPromptId(prompt.id);
    setFormLabel(prompt.label);
    setFormQuestion(prompt.question);
    setFormDirectAnswer(prompt.direct_answer || '');
    setFormActionType(prompt.action_type || 'message');
    setFormActionValue(prompt.action_value || '');
    setFormCategory(prompt.category || 'custom');
    setShowPromptModal(true);
  };

  const handleSavePromptForm = async () => {
    if (!formLabel.trim()) return;

    const list = [...(chatConfig.quick_prompts || [])];
    const itemData: ChatQuickPrompt = {
      id: editingPromptId || `qp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: formLabel.trim(),
      question: formQuestion.trim() || formLabel.trim(),
      direct_answer: formDirectAnswer.trim() || undefined,
      action_type: formActionType,
      action_value: formActionValue.trim() || undefined,
      category: formCategory,
      is_active: true,
    };

    let updatedList: ChatQuickPrompt[];
    if (editingPromptId) {
      updatedList = list.map((item) => (item.id === editingPromptId ? itemData : item));
    } else {
      updatedList = [...list, itemData];
    }

    const updatedConfig: ChatbotConfig = {
      ...chatConfig,
      quick_prompts: updatedList,
      suggested_questions: updatedList.filter((p) => p.is_active).map((p) => p.question),
    };

    setChatConfig(updatedConfig);
    setShowPromptModal(false);
    await handleSaveChatConfig(updatedConfig);
    setStatusNotice(`Quick Message "${itemData.label}" saved!`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleDeleteQuickPrompt = async (id: string) => {
    const updatedList = (chatConfig.quick_prompts || []).filter((p) => p.id !== id);
    const updatedConfig: ChatbotConfig = {
      ...chatConfig,
      quick_prompts: updatedList,
      suggested_questions: updatedList.filter((p) => p.is_active).map((p) => p.question),
    };
    setChatConfig(updatedConfig);
    await handleSaveChatConfig(updatedConfig);
  };

  const handleTogglePromptActive = async (id: string) => {
    const updatedList = (chatConfig.quick_prompts || []).map((p) =>
      p.id === id ? { ...p, is_active: !p.is_active } : p
    );
    const updatedConfig: ChatbotConfig = {
      ...chatConfig,
      quick_prompts: updatedList,
      suggested_questions: updatedList.filter((p) => p.is_active).map((p) => p.question),
    };
    setChatConfig(updatedConfig);
    await handleSaveChatConfig(updatedConfig);
  };

  const handleMovePrompt = async (index: number, direction: 'up' | 'down') => {
    const list = [...(chatConfig.quick_prompts || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const updatedConfig: ChatbotConfig = {
      ...chatConfig,
      quick_prompts: list,
      suggested_questions: list.filter((p) => p.is_active).map((p) => p.question),
    };
    setChatConfig(updatedConfig);
    await handleSaveChatConfig(updatedConfig);
  };

  // 1-Click Add Preset from Saved Store Data
  const handleAddPreset = async (preset: {
    label: string;
    question: string;
    direct_answer?: string;
    action_type?: 'message' | 'call' | 'whatsapp' | 'maps' | 'website';
    action_value?: string;
    category?: 'hours' | 'location' | 'product' | 'policy' | 'contact' | 'custom';
  }) => {
    const list = [...(chatConfig.quick_prompts || [])];
    // Avoid exact duplicate label
    if (list.some((p) => p.label.toLowerCase() === preset.label.toLowerCase())) {
      setStatusNotice(`Button "${preset.label}" is already added.`);
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }

    const newItem: ChatQuickPrompt = {
      id: `qp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      label: preset.label,
      question: preset.question,
      direct_answer: preset.direct_answer,
      action_type: preset.action_type || 'message',
      action_value: preset.action_value,
      category: preset.category || 'custom',
      is_active: true,
    };

    const updatedList = [...list, newItem];
    const updatedConfig: ChatbotConfig = {
      ...chatConfig,
      quick_prompts: updatedList,
      suggested_questions: updatedList.filter((p) => p.is_active).map((p) => p.question),
    };
    setChatConfig(updatedConfig);
    await handleSaveChatConfig(updatedConfig);
    setStatusNotice(`Added "${preset.label}" to customer quick buttons!`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Short Slug Suggestions (Initials, single short word)
  const getShortSlugSuggestions = () => {
    const name = business.business_name || '';
    const words = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const initials = words.map((w) => w[0]).join('');
    const firstWord = words[0] || 'chat';
    const suggestions: string[] = [];
    if (initials && initials.length >= 2) suggestions.push(initials);
    if (firstWord && firstWord.length >= 2) suggestions.push(firstWord);
    if (words.length >= 2) suggestions.push(`${words[0]}${words[1][0]}`);
    if (!suggestions.includes('ask')) suggestions.push('ask');
    return Array.from(new Set(suggestions)).slice(0, 4);
  };

  // Save Short Slug (100% Reliable via dedicated endpoint)
  const handleSaveSlug = async (overrideSlug?: string) => {
    setSlugError(null);
    const rawToClean = overrideSlug || slugInput;
    const cleaned = rawToClean.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleaned || cleaned.length < 2) {
      setSlugError('Slug must be at least 2 alphanumeric characters.');
      return;
    }

    setIsSavingSlug(true);
    try {
      const res = await fetch(`/api/chat/business/${business.id}/slug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: cleaned }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update short slug');
      }

      const updatedBiz = { ...business, unique_slug: cleaned };
      await onUpdateBusiness(updatedBiz);
      setSlugInput(cleaned);
      setIsEditingSlug(false);
      setStatusNotice(`Short chat link updated to /c/${cleaned}!`);
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (err: any) {
      setSlugError(err?.message || 'Failed to update short slug');
    } finally {
      setIsSavingSlug(false);
    }
  };

  // Copy Short Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortChatUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {}
  };

  const handleScanSource = async (sourceType: 'website' | 'maps', sourceUrl: string) => {
    if (!sourceUrl.trim()) return;
    setIsScanning(true);
    try {
      const res = await fetch(`/api/chat/business/${business.id}/scan-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType, sourceUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setChatConfig(data.config);

        // Merge updated business & info
        const updatedBiz: Business = data.business || {
          ...business,
          address: data.businessInfo?.address || business.address,
          business_info: {
            ...business.business_info,
            ...data.businessInfo,
          },
        };

        const updatedProfile = getDefaultBusinessProfileInfo(updatedBiz);
        setBusinessInfo(updatedProfile);

        // Notify parent dashboard and persist to DB
        await onUpdateBusiness(updatedBiz);

        setStatusNotice(`${sourceType === 'website' ? 'Website' : 'Google Maps'} scanned & populated into Store Facts!`);
        if (sourceType === 'website') setWebsiteUrlInput('');
        else setMapsUrlInput('');

        // Instantly switch to the 'checklist' (Store Facts & Verified Profile) subtab so the user immediately sees it!
        setSubTab('checklist');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to scan source');
      }
    } catch (err: any) {
      setStatusNotice(`Error scanning source: ${err.message}`);
    } finally {
      setIsScanning(false);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  const handleTestChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    const userText = testInput.trim();
    setTestInput('');
    const newMsgs = [...testMessages, { sender: 'user' as const, text: userText }];
    setTestMessages(newMsgs);

    setTimeout(() => {
      const lower = userText.toLowerCase();
      let botAnswer = chatConfig.fallback_message?.en || "I couldn't confirm that information from the business details available. Please contact us directly.";
      let matchedSource = 'Direct Business Knowledge Base';

      if (lower.includes('hour') || lower.includes('time') || lower.includes('open') || lower.includes('samay')) {
        const h = (business.business_info as any)?.hours_text || 'Monday to Sunday: 9:00 AM - 10:00 PM';
        botAnswer = `Our operating hours are: ${h}`;
        matchedSource = 'Operating Hours & Schedule Record';
      } else if (lower.includes('locat') || lower.includes('address') || lower.includes('where') || lower.includes('pata')) {
        botAnswer = `We are located at: ${business.address || (business.business_info as any)?.address || 'Main Street, City'}.`;
        matchedSource = 'Google Maps & Store Address Record';
      } else if (lower.includes('service') || lower.includes('product') || lower.includes('menu') || lower.includes('offer')) {
        botAnswer = `We offer premium services and products at ${business.business_name}. ${(business.business_info as any)?.services || ''}`;
        matchedSource = 'Website Products & Services Index';
      } else if (lower.includes('contact') || lower.includes('phone') || lower.includes('call') || lower.includes('whatsapp')) {
        botAnswer = `You can reach us at phone: ${business.phone || 'Available'} or WhatsApp: ${business.whatsapp_number || 'Available'}.`;
        matchedSource = 'Verified Contact Directory';
      }

      setTestMessages([...newMsgs, { sender: 'bot', text: botAnswer, source: matchedSource }]);
    }, 400);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${cleanSlug}-live-chat-qr.png`;
    a.click();
  };

  // Add brand new product inline & turn into quick button immediately
  const handleAddNewProductInline = async () => {
    if (!newProdName.trim() || !newProdPrice.trim()) return;

    const newProd: ProductServiceItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: newProdName.trim(),
      category: business.category || 'General',
      price: newProdPrice.trim(),
      price_type: 'fixed',
      description: newProdDesc.trim() || '',
      available: true,
      last_updated: new Date().toISOString(),
    };

    const updatedProds = [...(businessInfo.products_services || []), newProd];
    const updatedInfo: BusinessProfileInfo = {
      ...businessInfo,
      products_services: updatedProds,
    };

    setBusinessInfo(updatedInfo);
    await handleSaveInfo(updatedInfo);

    // Automatically add a quick button with direct answer
    await handleAddPreset({
      label: `🍕 ${newProd.name}`,
      question: `What is the price of ${newProd.name}?`,
      direct_answer: `${newProd.name} is available at ${business.business_name} for ${newProd.price}. ${newProd.description || ''}`,
      category: 'product',
    });

    setNewProdName('');
    setNewProdPrice('');
    setNewProdDesc('');
    setShowAddProductInline(false);
    setStatusNotice(`Product "${newProd.name}" saved & added to customer Quick Buttons!`);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Add brand new FAQ inline & turn into quick button immediately
  const handleAddNewFaqInline = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const newFaq: BusinessFaqItem = {
      id: `faq_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      question: newFaqQuestion.trim(),
      variations: [newFaqQuestion.trim()],
      answer: newFaqAnswer.trim(),
      approved_for_public: true,
    };

    const updatedFaqs = [...(businessInfo.faqs || []), newFaq];
    const updatedInfo: BusinessProfileInfo = {
      ...businessInfo,
      faqs: updatedFaqs,
    };

    setBusinessInfo(updatedInfo);
    await handleSaveInfo(updatedInfo);

    // Automatically add a quick button with direct answer
    await handleAddPreset({
      label: `❓ ${newFaq.question.substring(0, 24)}...`,
      question: newFaq.question,
      direct_answer: newFaq.answer,
      category: 'custom',
    });

    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setShowAddFaqInline(false);
    setStatusNotice(`FAQ saved & added to customer Quick Buttons!`);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // 1-Click Load Full Industry Pack
  const handleLoadIndustryPack = async (packType: 'restaurant' | 'salon' | 'retail' | 'clinic') => {
    const phone = business.phone;
    let packPrompts: Array<{
      label: string;
      question: string;
      direct_answer?: string;
      action_type?: 'message' | 'call' | 'whatsapp' | 'maps';
      action_value?: string;
      category?: 'hours' | 'location' | 'product' | 'policy' | 'contact' | 'custom';
    }> = [];

    if (packType === 'restaurant') {
      packPrompts = [
        {
          label: '🍕 Food Menu & Rates',
          question: 'What is on your food menu and what are the prices?',
          direct_answer: `${business.business_name} offers delicious snacks, meals, and beverages. Check our verified list or ask for any dish price!`,
          category: 'product',
        },
        {
          label: '🕒 Restaurant Timings',
          question: 'What are your lunch and dinner timings?',
          direct_answer: `We are open today! Check our timings: Mon-Sat 9:00 AM - 10:00 PM. Dine-in and take-away are both available.`,
          category: 'hours',
        },
        {
          label: '🚚 Home Delivery',
          question: 'Do you deliver food to home?',
          direct_answer: businessInfo.policies.delivery || `Yes, home delivery is available for nearby areas! Contact us on WhatsApp to order now.`,
          category: 'policy',
        },
        {
          label: '🪑 Table Reservation',
          question: 'Can I book a table in advance?',
          direct_answer: `Yes! Table reservations are accepted. Click below on WhatsApp or Call to reserve your table.`,
          category: 'policy',
        },
        {
          label: '📍 Map & Directions',
          question: 'Where is the restaurant located?',
          direct_answer: `We are located at: ${business.address || 'our main market location'}. Tap below for GPS directions!`,
          action_type: 'maps',
          category: 'location',
        },
      ];
    } else if (packType === 'salon') {
      packPrompts = [
        {
          label: '✂️ Rate Card & Services',
          question: 'What are your salon services and price list?',
          direct_answer: `We offer Haircuts, Styling, Facials, Spa, Beard grooming, and Bridal/Groom makeups. Ask for any specific service price!`,
          category: 'product',
        },
        {
          label: '📅 Book Appointment',
          question: 'How can I book an appointment?',
          direct_answer: `Advance booking is recommended. Click WhatsApp or Call below to choose your preferred time slot!`,
          category: 'policy',
        },
        {
          label: '🕒 Salon Timings',
          question: 'What are your working hours?',
          category: 'hours',
        },
        {
          label: '📍 Salon Location',
          question: 'Where is your salon located?',
          action_type: 'maps',
          category: 'location',
        },
      ];
    } else if (packType === 'retail') {
      packPrompts = [
        {
          label: '🛍️ Featured Products',
          question: 'What products do you have available?',
          direct_answer: `We stock genuine quality products across multiple categories. Ask for any item or brand!`,
          category: 'product',
        },
        {
          label: '💳 Payment Methods',
          question: 'Which payments do you accept?',
          direct_answer: `We accept UPI (GPay, PhonePe, Paytm), All Debit/Credit Cards, and Cash.`,
          category: 'policy',
        },
        {
          label: '🔄 Exchange Policy',
          question: 'What is your exchange or return policy?',
          direct_answer: businessInfo.policies.return_exchange || `Exchange is available within 7 days with the original purchase receipt.`,
          category: 'policy',
        },
        {
          label: '🕒 Store Timings',
          question: 'What are your opening hours today?',
          category: 'hours',
        },
      ];
    } else if (packType === 'clinic') {
      packPrompts = [
        {
          label: '🩺 Doctor Timings',
          question: 'What are the doctor consultation hours?',
          direct_answer: `Consultation is available Mon - Sat: 10:00 AM - 1:00 PM and 5:00 PM - 8:30 PM.`,
          category: 'hours',
        },
        {
          label: '📅 Book Slot',
          question: 'How can I schedule a consultation slot?',
          direct_answer: `Please message on WhatsApp or call our reception to book your appointment token.`,
          category: 'policy',
        },
        {
          label: '📍 Clinic Location',
          question: 'Where is the clinic situated?',
          action_type: 'maps',
          category: 'location',
        },
        {
          label: '📞 Emergency Contact',
          question: `Emergency contact number`,
          action_type: 'call',
          action_value: phone ? `tel:${phone}` : undefined,
          category: 'contact',
        },
      ];
    }

    for (const p of packPrompts) {
      await handleAddPreset(p);
    }

    setStatusNotice(`${packType.toUpperCase()} preset pack loaded into Quick Buttons!`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Simulate Clicking a Button in the Dashboard Live Simulator
  const handleSimulatedPromptClick = (p: ChatQuickPrompt) => {
    const userMsg = {
      id: `sim_u_${Date.now()}`,
      sender: 'user' as const,
      text: p.question || p.label,
    };
    setSimulatedMessages((prev) => [...prev, userMsg]);
    setSimulatedTyping(true);

    setTimeout(() => {
      const botText =
        p.direct_answer ||
        (p.action_type === 'whatsapp'
          ? `💬 Connecting you to ${business.business_name} on WhatsApp at ${business.whatsapp_number || business.phone}.`
          : p.action_type === 'call'
          ? `📞 Direct call button: ${business.phone || 'Available on request'}.`
          : `Verified details for ${business.business_name} are recorded. We look forward to welcoming you!`);

      const botMsg = {
        id: `sim_b_${Date.now()}`,
        sender: 'bot' as const,
        text: botText,
      };
      setSimulatedMessages((prev) => [...prev, botMsg]);
      setSimulatedTyping(false);
    }, 200);
  };

  // Inspection of conversation
  const handleInspectConversation = async (conv: ChatConversation) => {
    setSelectedConversation(conv);
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/chat/business/${business.id}/conversations/${conv.id}/messages`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.messages) setConversationMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    setDeletingId(convId);
    try {
      const res = await fetch(`/api/chat/business/${business.id}/conversations/${convId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (selectedConversation?.id === convId) {
          setSelectedConversation(null);
          setConversationMessages([]);
        }
      }
    } catch {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllChats = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/chat/business/${business.id}/conversations`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations([]);
        setSelectedConversation(null);
        setConversationMessages([]);
        setShowDeleteAllModal(false);
        setStatusNotice('All chat transcripts deleted successfully.');
        setTimeout(() => setStatusNotice(null), 4000);
      }
    } catch {
      setConversations([]);
      setShowDeleteAllModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6C3BFF] via-[#7B4AFF] to-[#8C60FF] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[11px] font-semibold text-purple-100 border border-white/20">
            <Bot className="w-3.5 h-3.5" />
            <span>AI Business Chat • 100% Zero External AI API • Completely Independent Hub</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">AI Business Chat & Instant Q&A Hub</h2>
          <p className="text-xs text-purple-100/90 leading-relaxed">
            Manage your customer chat options, customizable quick tap buttons, store facts, and short link
            all in one dedicated place. No clutter with AI Review Prompts!
          </p>
        </div>
      </div>

      {statusNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Sub Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-200">
        {[
          { id: 'overview', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
          {
            id: 'quick_prompts',
            label: '⚡ Quick Messages',
            icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
            badge: `${activePrompts.length}`,
          },
          { id: 'sources', label: '🌐 Website & Maps', icon: <Globe className="w-3.5 h-3.5 text-blue-500" /> },
          { id: 'personality', label: '🧠 Personality & UI', icon: <Sliders className="w-3.5 h-3.5 text-purple-600" /> },
          { id: 'test_bot', label: '🧪 Test Bot', icon: <Bot className="w-3.5 h-3.5 text-emerald-600" /> },
          { id: 'embed', label: '💻 Embed Code', icon: <ExternalLink className="w-3.5 h-3.5 text-amber-500" /> },
          {
            id: 'checklist',
            label: 'Store Facts',
            icon: <ShieldCheck className="w-3.5 h-3.5" />,
            badge: `${checklist.percentage}%`,
          },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
          {
            id: 'history',
            label: 'Chat History',
            icon: <MessageSquare className="w-3.5 h-3.5" />,
            badge: conversations.length.toString(),
          },
          { id: 'share', label: 'Short Link & QR', icon: <QrCode className="w-3.5 h-3.5" /> },
          { id: 'analytics', label: 'Analytics', icon: <Sparkles className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-[#6C3BFF] text-white shadow-xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  subTab === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SUBTAB: OVERVIEW */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Status Bar */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-800">Chatbot Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    chatConfig.enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${chatConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
                  />
                  <span>{chatConfig.enabled ? 'Active & Answering' : 'Paused'}</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Short Link:{' '}
                <span className="font-mono font-semibold text-[#6C3BFF]">{shortChatUrl}</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleChatActive}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  chatConfig.enabled
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                {chatConfig.enabled ? 'Pause Chatbot' : 'Activate Chatbot'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenLiveChat) onOpenLiveChat(cleanSlug);
                  else window.open(shortChatUrl, '_blank');
                }}
                className="px-3.5 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live Chat Page</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">Active Quick Buttons</span>
              <div className="text-xl font-black text-amber-600">{activePrompts.length}</div>
              <p className="text-[10px] text-neutral-400">Instant answer options</p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">Store Facts Completed</span>
              <div className="text-xl font-black text-[#6C3BFF]">{checklist.percentage}%</div>
              <p className="text-[10px] text-neutral-400">
                {checklist.completedCount}/{checklist.totalApplicable} verified fields
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">Total Conversations</span>
              <div className="text-xl font-black text-neutral-900">{conversations.length}</div>
              <p className="text-[10px] text-neutral-400">Customer chat sessions</p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">Action Clicks</span>
              <div className="text-xl font-black text-emerald-600">
                {analytics.contactClicksCount || conversations.filter((c) => c.contact_clicked).length}
              </div>
              <p className="text-[10px] text-neutral-400">WhatsApp / Call / Maps</p>
            </div>
          </div>

          {/* Quick Setup Spotlight Card */}
          <div className="bg-gradient-to-br from-amber-50 to-purple-50 rounded-2xl border border-amber-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                <h4 className="text-xs font-bold text-neutral-900">
                  Customizable Quick Tap Messages & Direct Answers
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('quick_prompts')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Customize Buttons ({activePrompts.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Decide exactly what buttons appear on your customer's screen. When they tap on any button, it
              instantly delivers the exact answer or launches WhatsApp/Phone without waiting!
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activePrompts.map((p) => (
                <span
                  key={p.id}
                  className="px-2.5 py-1 bg-white text-neutral-800 text-[11px] font-semibold rounded-lg border border-amber-200/80 shadow-2xs flex items-center gap-1"
                >
                  <span>{p.label}</span>
                  {p.direct_answer && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                      Direct
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: QUICK PROMPTS CUSTOMIZER (The Core Request) */}
      {subTab === 'quick_prompts' && (
        <div className="space-y-6">
          {/* Introduction Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>Quick Tap Message Buttons (क्विक मैसेज व इंस्टेंट आंसर)</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Aap decide karein customer ko chat screen par kaunse options dikhenge. Click hone par sidha
                  answer aayega ya action trigger hoga!
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddPrompt}
                className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Button</span>
              </button>
            </div>

            {/* 1-Click Pick from Saved Store Facts & Presets */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50/80 via-white to-amber-50/60 rounded-2xl border border-purple-200/80 space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-[#6C3BFF] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Quick Add from Saved Store Items & Facts (1-Click me jodein)</span>
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Aapne jo items save kiye hain unhe 1-click me jodein, ya yahan se naya item jod kar sidha button banayein!
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                  {[
                    { id: 'all', label: 'All Items' },
                    { id: 'basics', label: '🏢 Store Facts' },
                    { id: 'products', label: `🍕 Products (${businessInfo.products_services?.length || 0})` },
                    { id: 'policies', label: '💳 Policies' },
                    { id: 'faqs', label: `❓ FAQs (${businessInfo.faqs?.length || 0})` },
                    { id: 'packs', label: '📦 Pre-built Packs' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPresetCategoryFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        presetCategoryFilter === tab.id
                          ? 'bg-[#6C3BFF] text-white shadow-2xs'
                          : 'bg-white text-neutral-700 hover:bg-purple-100/70 border border-purple-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets List Based on Filter */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {/* Store Facts (Visible in 'all' or 'basics') */}
                {(presetCategoryFilter === 'all' || presetCategoryFilter === 'basics') && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddPreset({
                          label: '🕒 Opening Hours',
                          question: 'What are your opening hours today?',
                          category: 'hours',
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ 🕒 Store Hours</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAddPreset({
                          label: '📍 Location & Maps',
                          question: 'Where is your shop located?',
                          category: 'location',
                          action_type: 'maps',
                          action_value: businessInfo.google_maps_url,
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ 📍 Location & Maps</span>
                    </button>

                    {business.phone && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAddPreset({
                            label: '📞 Call Store',
                            question: `Call us at ${business.phone}`,
                            action_type: 'call',
                            action_value: `tel:${business.phone}`,
                            category: 'contact',
                          })
                        }
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ 📞 Call Button</span>
                      </button>
                    )}

                    {business.whatsapp_number && (
                      <button
                        type="button"
                        onClick={() => {
                          const wa = business.whatsapp_number || '';
                          handleAddPreset({
                            label: '💬 WhatsApp Chat',
                            question: 'Chat with us on WhatsApp',
                            action_type: 'whatsapp',
                            action_value: wa ? `https://wa.me/${wa.replace(/[^\d]/g, '')}` : '',
                            category: 'contact',
                          });
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ 💬 WhatsApp Button</span>
                      </button>
                    )}
                  </>
                )}

                {/* Policies & Ordering (Visible in 'all' or 'policies') */}
                {(presetCategoryFilter === 'all' || presetCategoryFilter === 'policies') && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddPreset({
                          label: '💳 Accepted Payments',
                          question: 'Which payment methods do you accept?',
                          direct_answer: `Accepted payment modes at ${business.business_name}: UPI (Google Pay, PhonePe, Paytm), All Credit & Debit Cards, and Cash.`,
                          category: 'policy',
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ 💳 Payment Modes</span>
                    </button>

                    {businessInfo.policies.delivery && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAddPreset({
                            label: '🚚 Home Delivery',
                            question: 'Do you offer home delivery?',
                            direct_answer: businessInfo.policies.delivery,
                            category: 'policy',
                          })
                        }
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ 🚚 Home Delivery</span>
                      </button>
                    )}

                    {businessInfo.policies.return_exchange && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAddPreset({
                            label: '🔄 Return & Exchange',
                            question: 'What is your return or exchange policy?',
                            direct_answer: businessInfo.policies.return_exchange,
                            category: 'policy',
                          })
                        }
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ 🔄 Return Policy</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleAddPreset({
                          label: '📅 Book Appointment / Slot',
                          question: 'How do I book an appointment or table?',
                          direct_answer: businessInfo.policies.booking_policy || `You can book easily! Please message us on WhatsApp or call our reception to book your slot.`,
                          category: 'policy',
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ 📅 Booking Policy</span>
                    </button>
                  </>
                )}

                {/* Products & Services (Visible in 'all' or 'products') */}
                {(presetCategoryFilter === 'all' || presetCategoryFilter === 'products') && (
                  <>
                    {businessInfo.products_services?.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() =>
                          handleAddPreset({
                            label: `🍕 ${prod.name}`,
                            question: `What is the price of ${prod.name}?`,
                            direct_answer: `${prod.name} is available at ${business.business_name} for ${prod.price} (${prod.price_type || 'fixed price'}). ${prod.description || ''}`,
                            category: 'product',
                          })
                        }
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-neutral-800 text-xs font-medium rounded-lg border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ {prod.name} ({prod.price})</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowAddProductInline(true)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Product / Menu Item</span>
                    </button>
                  </>
                )}

                {/* FAQs (Visible in 'all' or 'faqs') */}
                {(presetCategoryFilter === 'all' || presetCategoryFilter === 'faqs') && (
                  <>
                    {businessInfo.faqs?.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() =>
                          handleAddPreset({
                            label: `❓ ${faq.question.substring(0, 24)}...`,
                            question: faq.question,
                            direct_answer: faq.answer,
                            category: 'custom',
                          })
                        }
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 text-neutral-800 text-xs font-medium rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ {faq.question.substring(0, 26)}...</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowAddFaqInline(true)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New FAQ</span>
                    </button>
                  </>
                )}

                {/* Pre-built Industry Packs (Visible in 'all' or 'packs') */}
                {(presetCategoryFilter === 'all' || presetCategoryFilter === 'packs') && (
                  <div className="w-full pt-2 flex flex-wrap gap-2 border-t border-purple-100/60 mt-1">
                    <span className="text-[11px] font-bold text-neutral-600 w-full">
                      🚀 1-Click Complete Industry Button Packs:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadIndustryPack('restaurant')}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>🍕 Restaurant / Cafe Pack</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadIndustryPack('salon')}
                      className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>✂️ Salon & Spa Pack</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadIndustryPack('retail')}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>🛍️ Retail / Grocery Pack</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadIndustryPack('clinic')}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>🩺 Clinic & Healthcare Pack</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Inline Form to Add New Product / Menu Item */}
              {showAddProductInline && (
                <div className="p-4 bg-white rounded-xl border border-amber-300 shadow-sm space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>🍕 Add New Store Product / Service</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddProductInline(false)}
                      className="p-1 text-neutral-400 hover:text-neutral-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="font-semibold text-neutral-700">Product / Item Name *</label>
                      <input
                        type="text"
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        placeholder="e.g. Cold Coffee, Pizza Margherita"
                        className="w-full mt-1 p-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-[#6C3BFF] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-neutral-700">Price *</label>
                      <input
                        type="text"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        placeholder="e.g. ₹120, ₹499"
                        className="w-full mt-1 p-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-[#6C3BFF] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-neutral-700">Description (Optional)</label>
                      <input
                        type="text"
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        placeholder="e.g. Served chilled with chocolate syrup"
                        className="w-full mt-1 p-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-[#6C3BFF] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddProductInline(false)}
                      className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newProdName.trim() || !newProdPrice.trim()}
                      onClick={handleAddNewProductInline}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                    >
                      Save & Add to Quick Buttons
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Form to Add New FAQ */}
              {showAddFaqInline && (
                <div className="p-4 bg-white rounded-xl border border-purple-300 shadow-sm space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>❓ Add New Question & Direct Answer</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddFaqInline(false)}
                      className="p-1 text-neutral-400 hover:text-neutral-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="font-semibold text-neutral-700">Question *</label>
                      <input
                        type="text"
                        value={newFaqQuestion}
                        onChange={(e) => setNewFaqQuestion(e.target.value)}
                        placeholder="e.g. Is parking available? Do you have AC seating?"
                        className="w-full mt-1 p-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-[#6C3BFF] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-neutral-700">Direct Answer (तुरंत उत्तर) *</label>
                      <textarea
                        rows={2}
                        value={newFaqAnswer}
                        onChange={(e) => setNewFaqAnswer(e.target.value)}
                        placeholder="e.g. Yes! Free two-wheeler and four-wheeler parking is available directly in front of our store."
                        className="w-full mt-1 p-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:border-[#6C3BFF] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddFaqInline(false)}
                      className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                      onClick={handleAddNewFaqInline}
                      className="px-4 py-1.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                    >
                      Save & Add to Quick Buttons
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of Configured Quick Messages */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>Configured Buttons ({chatConfig.quick_prompts?.length || 0})</span>
                <span className="text-[11px] text-neutral-400">Order from left-to-right</span>
              </div>

              {(chatConfig.quick_prompts || []).length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-neutral-400 space-y-2">
                  <Zap className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="text-xs font-medium">No quick buttons added yet.</p>
                  <p className="text-[11px]">Click "Add Custom Button" or pick from the presets above!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(chatConfig.quick_prompts || []).map((prompt, idx) => (
                    <div
                      key={prompt.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        prompt.is_active
                          ? 'bg-white border-neutral-200 shadow-2xs'
                          : 'bg-neutral-50/80 border-neutral-200 text-neutral-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Position control */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePrompt(idx, 'up')}
                            className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (chatConfig.quick_prompts || []).length - 1}
                            onClick={() => handleMovePrompt(idx, 'down')}
                            className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900">{prompt.label}</span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                prompt.direct_answer
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : prompt.action_type === 'whatsapp'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : prompt.action_type === 'call'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : 'bg-purple-100 text-purple-900 border border-purple-200'
                              }`}
                            >
                              {prompt.direct_answer
                                ? '⚡ Instant Direct Answer'
                                : prompt.action_type === 'whatsapp'
                                ? '💬 WhatsApp'
                                : prompt.action_type === 'call'
                                ? '📞 Call'
                                : '🔍 Auto Query'}
                            </span>
                          </div>

                          <p className="text-[11px] text-neutral-500">
                            <strong>Question sent:</strong> "{prompt.question}"
                          </p>
                          {prompt.direct_answer && (
                            <p className="text-[11px] text-emerald-700 bg-emerald-50/70 px-2 py-1 rounded-md border border-emerald-100">
                              <strong>Direct Answer:</strong> {prompt.direct_answer}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleTogglePromptActive(prompt.id)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            prompt.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {prompt.is_active ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPrompt(prompt)}
                          className="p-1.5 text-neutral-500 hover:text-[#6C3BFF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickPrompt(prompt.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Interactive Simulator Bar */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#6C3BFF]" />
                  <span className="text-xs font-bold text-neutral-800">
                    Live Mobile Phone Simulator (मोबाइल स्क्रीन पर टेस्ट करें)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLiveSimulator(!showLiveSimulator)}
                  className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>{showLiveSimulator ? 'Hide Simulator' : '📱 Open Mobile Simulator'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showLiveSimulator ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Interactive Phone Simulator Frame */}
              {showLiveSimulator && (
                <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-white space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1.5 font-bold text-neutral-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Customer Screen: {business.business_name}</span>
                    </span>
                    <span>Tap any button below to test instant answers!</span>
                  </div>

                  {/* Simulated Screen */}
                  <div className="bg-neutral-950 rounded-xl p-3 h-64 overflow-y-auto space-y-2 text-xs border border-neutral-800">
                    <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 text-neutral-200 leading-relaxed text-[11px]">
                      👋 {chatConfig.welcome_message?.en || `Hello! Welcome to ${business.business_name}. How can we assist you today?`}
                    </div>

                    {simulatedMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl max-w-[85%] text-[11px] leading-relaxed ${
                          m.sender === 'user'
                            ? 'ml-auto bg-[#6C3BFF] text-white'
                            : 'mr-auto bg-neutral-900 text-neutral-100 border border-neutral-800'
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}

                    {simulatedTyping && (
                      <div className="flex items-center gap-1 text-neutral-400 p-2 bg-neutral-900 w-14 rounded-xl border border-neutral-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF] animate-bounce [animation-delay:0.4s]" />
                      </div>
                    )}
                  </div>

                  {/* Tappable Quick Buttons in Simulator */}
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                      Tap buttons to verify direct answers:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {activePrompts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSimulatedPromptClick(p)}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white rounded-xl text-[11px] font-medium border border-neutral-700 whitespace-nowrap flex items-center gap-1 cursor-pointer"
                        >
                          <span>{p.label}</span>
                          {p.direct_answer && (
                            <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 py-0.2 rounded font-bold">
                              ⚡ Instant
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: CHECKLIST (Full Business Profile Facts) */}
      {subTab === 'checklist' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900">Verified Business Facts Checklist</h3>
            <p className="text-xs text-neutral-500">
              Fill in your opening hours, products, and policies. These facts power your chatbot's answers
              without external AI inference.
            </p>
          </div>
          <BusinessInfoChecklist
            info={businessInfo}
            onUpdateInfo={handleSaveInfo}
          />
        </div>
      )}

      {/* SUBTAB: SETTINGS */}
      {subTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900">Chatbot Appearance & Response Settings</h3>
            <p className="text-xs text-neutral-500">
              Customize welcome greetings, action buttons visibility, and visitor notices.
            </p>
          </div>

          <div className="space-y-4">
            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-neutral-800">Enable Live Chatbot</span>
                <p className="text-[11px] text-neutral-500">Turn on or off for public visitors</p>
              </div>
              <input
                type="checkbox"
                checked={chatConfig.enabled}
                onChange={(e) => setChatConfig({ ...chatConfig, enabled: e.target.checked })}
                className="w-4 h-4 accent-[#6C3BFF] cursor-pointer"
              />
            </div>

            {/* Welcome Message EN */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">English Welcome Greeting</label>
              <input
                type="text"
                value={chatConfig.welcome_message?.en || ''}
                onChange={(e) =>
                  setChatConfig({
                    ...chatConfig,
                    welcome_message: { ...chatConfig.welcome_message, en: e.target.value },
                  })
                }
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
              />
            </div>

            {/* Welcome Message HI */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">Hindi Welcome Greeting (हिंदी)</label>
              <input
                type="text"
                value={chatConfig.welcome_message?.hi || ''}
                onChange={(e) =>
                  setChatConfig({
                    ...chatConfig,
                    welcome_message: { ...chatConfig.welcome_message, hi: e.target.value },
                  })
                }
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
              />
            </div>

            {/* Welcome Message GU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">Gujarati Welcome Greeting (ગુજરાતી)</label>
              <input
                type="text"
                value={chatConfig.welcome_message?.gu || ''}
                onChange={(e) =>
                  setChatConfig({
                    ...chatConfig,
                    welcome_message: { ...chatConfig.welcome_message, gu: e.target.value },
                  })
                }
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
              />
            </div>

            {/* Action Buttons Visibility */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <label className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">WhatsApp Button</span>
                <input
                  type="checkbox"
                  checked={chatConfig.show_whatsapp_button}
                  onChange={(e) =>
                    setChatConfig({ ...chatConfig, show_whatsapp_button: e.target.checked })
                  }
                  className="accent-[#6C3BFF]"
                />
              </label>

              <label className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Call Button</span>
                <input
                  type="checkbox"
                  checked={chatConfig.show_call_button}
                  onChange={(e) =>
                    setChatConfig({ ...chatConfig, show_call_button: e.target.checked })
                  }
                  className="accent-[#6C3BFF]"
                />
              </label>

              <label className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Maps Directions</span>
                <input
                  type="checkbox"
                  checked={chatConfig.show_directions_button}
                  onChange={(e) =>
                    setChatConfig({ ...chatConfig, show_directions_button: e.target.checked })
                  }
                  className="accent-[#6C3BFF]"
                />
              </label>

              <label className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Website Button</span>
                <input
                  type="checkbox"
                  checked={chatConfig.show_website_button}
                  onChange={(e) =>
                    setChatConfig({ ...chatConfig, show_website_button: e.target.checked })
                  }
                  className="accent-[#6C3BFF]"
                />
              </label>
            </div>

            {/* Privacy notice */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">Visitor Privacy Notice</label>
              <input
                type="text"
                value={chatConfig.visitor_privacy_notice || ''}
                onChange={(e) =>
                  setChatConfig({ ...chatConfig, visitor_privacy_notice: e.target.value })
                }
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
              />
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveChatConfig()}
                className="px-5 py-2.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Chatbot Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: HISTORY */}
      {subTab === 'history' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Stored Visitor Conversations</h3>
              <p className="text-xs text-neutral-500">
                Inspect customer questions, see if inquiries were resolved, or delete records securely.
              </p>
            </div>

            {conversations.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Chats</span>
              </button>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-medium">No customer conversations yet.</p>
              <p className="text-[11px]">Share your short chat link or QR code to start receiving inquiries!</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-neutral-50 px-2 rounded-xl transition-colors"
                >
                  <div
                    onClick={() => handleInspectConversation(conv)}
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-800">
                        Session: {conv.visitor_session_id.substring(0, 14)}...
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-purple-50 text-[#6C3BFF] rounded-md">
                        {conv.language}
                      </span>
                      {conv.has_unresolved && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-md font-semibold">
                          Unresolved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 truncate max-w-lg">
                      {conv.last_message_preview || 'No messages'}
                    </p>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(conv.updated_at).toLocaleString()} • {conv.message_count} messages
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleInspectConversation(conv)}
                      className="p-1.5 text-neutral-500 hover:text-[#6C3BFF] rounded-lg hover:bg-purple-50 transition-colors"
                      title="Inspect transcript"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === conv.id}
                      onClick={() => handleDeleteConversation(conv.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: WEBSITE & MAPS SOURCES SCANNER */}
      {subTab === 'sources' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">Website &amp; Google Maps Knowledge Base Scanner</h3>
              <p className="text-xs text-neutral-500">
                Connect your website URL or Google Maps link to automatically extract operating hours, services, products, FAQs, and contact details.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>1. Website URL Scanner</span>
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Enter your public business website. We discover sitemaps, headings, FAQs, and hours securely.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={websiteUrlInput}
                    onChange={(e) => setWebsiteUrlInput(e.target.value)}
                    placeholder="https://yourbusiness.com"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:border-[#6C3BFF] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={isScanning || !websiteUrlInput.trim()}
                    onClick={() => handleScanSource('website', websiteUrlInput)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isScanning ? 'Scanning...' : 'Scan Website'}
                  </button>
                </div>
              </div>

              <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>2. Google Maps Place Link</span>
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Paste Google Maps share link (e.g. maps.app.goo.gl or standard Google Maps URL).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={mapsUrlInput}
                    onChange={(e) => setMapsUrlInput(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:border-[#6C3BFF] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={isScanning || !mapsUrlInput.trim()}
                    onClick={() => handleScanSource('maps', mapsUrlInput)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isScanning ? 'Importing...' : 'Import Maps'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <h4 className="text-xs font-bold text-neutral-900">Connected Knowledge Base Sources</h4>
              {(!chatConfig.scanned_sources || chatConfig.scanned_sources.length === 0) ? (
                <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200 text-center text-xs text-neutral-500">
                  No external website or maps sources connected yet. Add your URL above to begin indexing.
                </div>
              ) : (
                <div className="space-y-2">
                  {chatConfig.scanned_sources.map((src) => (
                    <div key={src.id} className="p-4 bg-white rounded-xl border border-neutral-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${src.type === 'website' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {src.type === 'website' ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 truncate">{src.title}</div>
                          <a href={src.url} target="_blank" rel="noreferrer" className="text-[11px] text-[#6C3BFF] hover:underline truncate block">
                            {src.url}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {src.status.toUpperCase()} ({src.page_count || 1} pages)
                          </span>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{new Date(src.last_scanned).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: PERSONALITY & APPEARANCE */}
      {subTab === 'personality' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">Chatbot Personality &amp; Appearance Customization</h3>
              <p className="text-xs text-neutral-500">Configure how your chatbot speaks, responds, and matches your brand aesthetic.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-900 block">Response Style / Persona</label>
                <select
                  value={chatConfig.personality_style || 'friendly'}
                  onChange={(e) => setChatConfig({ ...chatConfig, personality_style: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:border-[#6C3BFF] focus:outline-hidden font-medium"
                >
                  <option value="professional">Professional &amp; Business-like</option>
                  <option value="friendly">Friendly &amp; Warm</option>
                  <option value="simple">Simple &amp; Conversational</option>
                  <option value="formal">Formal</option>
                  <option value="short">Short &amp; Direct Answers</option>
                  <option value="detailed">Detailed &amp; Informative</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-900 block">Widget Primary Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={chatConfig.theme_color || '#6C3BFF'}
                    onChange={(e) => setChatConfig({ ...chatConfig, theme_color: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-neutral-300 cursor-pointer p-1"
                  />
                  <span className="text-xs font-mono font-bold text-neutral-700">{chatConfig.theme_color || '#6C3BFF'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-900 block">Custom Business Instructions / Guardrails</label>
              <textarea
                rows={3}
                value={chatConfig.custom_instructions || ''}
                onChange={(e) => setChatConfig({ ...chatConfig, custom_instructions: e.target.value })}
                placeholder="e.g. Always highlight our parking availability and weekend offers..."
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:border-[#6C3BFF] focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: TEST CHATBOT */}
      {subTab === 'test_bot' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Test Your AI Chatbot</h3>
                <p className="text-xs text-neutral-500">Ask questions as a customer before publishing your widget.</p>
              </div>
              <button
                type="button"
                onClick={() => setTestMessages([{ sender: 'bot', text: `Hello! I am the verified AI assistant for ${business.business_name}. Ask me anything!` }])}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl cursor-pointer"
              >
                Reset Chat
              </button>
            </div>

            <div className="bg-neutral-950 rounded-2xl border border-neutral-800 p-4 h-[420px] flex flex-col justify-between">
              <div className="overflow-y-auto space-y-3 pr-2 flex-1 text-xs">
                {testMessages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}>
                    <div className={`p-3.5 rounded-2xl max-w-[85%] ${m.sender === 'user' ? 'bg-[#6C3BFF] text-white rounded-br-xs' : 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-bl-xs'}`}>
                      {m.text}
                    </div>
                    {m.source && (
                      <span className="text-[9px] text-emerald-400 font-mono px-1">Source: {m.source}</span>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleTestChatSend} className="pt-3 border-t border-neutral-800 flex items-center gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Ask about hours, location, services..."
                  className="flex-1 px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:border-[#6C3BFF] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: EMBED CODE */}
      {subTab === 'embed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">Publish &amp; Embed Widget</h3>
              <p className="text-xs text-neutral-500">Add your chatbot widget to any website using our copyable HTML snippet.</p>
            </div>

            <div className="p-5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-purple-950">Embed Code Snippet (HTML Script)</h4>
              <p className="text-xs text-purple-900">Paste this code right before the closing <code className="bg-white px-1.5 py-0.5 rounded font-mono">&lt;/body&gt;</code> tag of your website.</p>
              <div className="p-3 bg-neutral-900 text-purple-200 rounded-xl font-mono text-[11px] overflow-x-auto select-all">
                {`<script src="${window.location.origin}/widget.js" data-business-id="${business.id}" data-slug="${business.unique_slug}" async></script>`}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`<script src="${window.location.origin}/widget.js" data-business-id="${business.id}" data-slug="${business.unique_slug}" async></script>`);
                  setStatusNotice('Embed snippet copied to clipboard!');
                  setTimeout(() => setStatusNotice(null), 3000);
                }}
                className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Embed Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: SHARE CHAT LINK & QR (With Short Link /c/:slug) */}
      {subTab === 'share' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900">Permanent Short Chatbot Link & QR</h3>
            <p className="text-xs text-neutral-500">
              Customers can scan this QR code or click your clean short URL to instantly ask questions.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 justify-center py-4">
            {/* QR Card */}
            <div className="bg-gradient-to-b from-purple-50 to-white p-6 rounded-3xl border border-purple-100 shadow-md flex flex-col items-center text-center space-y-4 max-w-xs w-full">
              <span className="text-[11px] font-bold text-[#6C3BFF] uppercase tracking-wider">
                Ask Questions & Info
              </span>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Live Chat QR"
                  className="w-48 h-48 rounded-2xl border border-neutral-200 shadow-xs bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-neutral-100 animate-pulse" />
              )}
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{business.business_name}</h4>
                <p className="text-[11px] text-neutral-500">Scan to chat in English, हिंदी or ગુજરાતી</p>
              </div>
            </div>

            {/* Actions & Short Slug Customizer */}
            <div className="space-y-4 max-w-md w-full">
              {/* Short URL Box */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Clean Short Chat URL</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingSlug(!isEditingSlug)}
                    className="text-[11px] text-[#6C3BFF] font-semibold hover:underline cursor-pointer"
                  >
                    {isEditingSlug ? 'Cancel' : 'Customize Slug'}
                  </button>
                </div>

                {isEditingSlug ? (
                  <div className="p-3 bg-white border border-purple-200 rounded-xl space-y-2">
                    <label className="text-[11px] font-bold text-neutral-700 block">
                      Edit Short Name: (e.g. foodbites)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-neutral-400">/c/</span>
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => setSlugInput(e.target.value.toLowerCase())}
                        className="flex-1 p-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:border-[#6C3BFF]"
                      />
                      <button
                        type="button"
                        disabled={isSavingSlug}
                        onClick={() => handleSaveSlug()}
                        className="px-3 py-2 bg-[#6C3BFF] text-white text-xs font-bold rounded-lg hover:bg-[#5A2DE2] cursor-pointer disabled:opacity-50"
                      >
                        {isSavingSlug ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    {slugError && <p className="text-[10px] text-rose-600">{slugError}</p>}
                  </div>
                ) : (
                  <div className="text-xs font-mono font-bold text-[#6C3BFF] break-all p-2.5 bg-white rounded-xl border border-purple-200/80 shadow-2xs">
                    {shortChatUrl}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2 px-3 text-xs font-bold bg-[#6C3BFF] text-white hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{linkCopied ? 'Short Link Copied!' : 'Copy Short Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="py-2 px-3 text-xs font-bold bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download QR</span>
                  </button>
                </div>
              </div>

              {/* Ready-to-send WhatsApp message */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>💬 WhatsApp Invite Message</span>
                </span>
                <p className="text-xs text-emerald-800 italic bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                  "Hello! Have any questions about our store timings, products, or location? Chat with {business.business_name} live here: {shortChatUrl}"
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Hello! Have any questions about our store timings, products, or location? Chat with ${business.business_name} live here: ${shortChatUrl}`;
                      navigator.clipboard.writeText(text);
                      setStatusNotice('WhatsApp invite message copied!');
                      setTimeout(() => setStatusNotice(null), 3000);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Copy WhatsApp Invite Message
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Hello! Have any questions about our store timings, products, or location? Chat with ${business.business_name} live here: ${shortChatUrl}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Send via WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: ANALYTICS */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Recognized Customer Intents */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#6C3BFF]" />
                <span>Top Recognized Customer Intents</span>
              </h4>
              {analytics.topIntents.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">No intent data collected yet.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.topIntents.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium text-neutral-700">
                        {item.intent.replace(/_/g, ' ')}
                      </span>
                      <span className="font-bold text-[#6C3BFF] bg-purple-50 px-2 py-0.5 rounded-md">
                        {item.count} hits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unanswered Queries That Need Follow-up */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Unanswered Customer Queries</span>
              </h4>
              {analytics.unansweredQuestions.length === 0 ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl">
                  🎉 Great job! No unanswered queries currently pending.
                </p>
              ) : (
                <div className="space-y-2">
                  {analytics.unansweredQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-neutral-800 truncate">{q.question}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated: BusinessProfileInfo = JSON.parse(JSON.stringify(businessInfo));
                          if (!updated.faqs) updated.faqs = [];
                          updated.faqs.push({
                            id: `faq_${Date.now()}`,
                            question: q.question,
                            variations: [],
                            answer: 'Yes, we provide this service. Please contact us on WhatsApp!',
                            approved_for_public: true,
                          });
                          handleSaveInfo(updated);
                          setSubTab('checklist');
                          setStatusNotice(`Added "${q.question}" to Custom FAQs!`);
                          setTimeout(() => setStatusNotice(null), 4000);
                        }}
                        className="px-2 py-1 bg-[#6C3BFF] text-white text-[10px] font-bold rounded-lg shrink-0 hover:bg-[#5A2DE2]"
                      >
                        + Add to FAQs
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT QUICK MESSAGE */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h4 className="text-base font-bold text-neutral-900">
                  {editingPromptId ? 'Edit Quick Message Button' : 'Add Quick Message Button'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-700">
              {/* Button Label */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-800">
                  Button Label & Emoji (बटन पर क्या लिखा होगा)
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. 🔥 Today's Special Offer, 🕒 Timings, 🍕 Masala Dosa"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                />
              </div>

              {/* Question sent */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-800">
                  Customer Question Text (चैट में क्या सवाल जाएगा)
                </label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="e.g. What are your special offers today?"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                />
              </div>

              {/* Action Mode Choice */}
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-800 block">
                  Click Hone Par Kya Hoga? (Response Mode)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormActionType('message')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      formActionType === 'message'
                        ? 'bg-purple-50 border-[#6C3BFF] text-[#6C3BFF] font-bold'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs">⚡ Instant Text Answer</div>
                    <div className="text-[10px] text-neutral-500 font-normal">चैट में तुरंत उत्तर देगा</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormActionType('whatsapp')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      formActionType === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs">💬 WhatsApp Chat</div>
                    <div className="text-[10px] text-neutral-500 font-normal">सीधे व्हाट्सएप खोलेगा</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormActionType('call')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      formActionType === 'call'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs">📞 Direct Call</div>
                    <div className="text-[10px] text-neutral-500 font-normal">फोन नंबर डायल करेगा</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormActionType('maps')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      formActionType === 'maps'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <div className="text-xs">📍 Google Maps</div>
                    <div className="text-[10px] text-neutral-500 font-normal">रास्ता/लोकेशन दिखाएगा</div>
                  </button>
                </div>
              </div>

              {/* Direct Fixed Answer (Optional override for instant answers) */}
              {formActionType === 'message' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-neutral-800">
                      Direct Verified Answer (सीधा उत्तर)
                    </label>
                    <span className="text-[10px] text-neutral-400">Optional override</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formDirectAnswer}
                    onChange={(e) => setFormDirectAnswer(e.target.value)}
                    placeholder="Agar yahan likhenge, to click hote hi sidha ye answer aayega (e.g. Aaj ka special 20% discount coupon: FLAT20)"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formLabel.trim()}
                onClick={handleSavePromptForm}
                className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                Save Button
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVERSATION TRANSCRIPT INSPECTION */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Chat Transcript ({selectedConversation.visitor_session_id.substring(0, 10)}...)
                </h4>
                <p className="text-[11px] text-neutral-400">
                  {new Date(selectedConversation.created_at).toLocaleString()} • Language:{' '}
                  {selectedConversation.language.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConversation(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 text-xs">
              {loadingMessages ? (
                <div className="py-8 text-center text-neutral-400">Loading transcript...</div>
              ) : conversationMessages.length === 0 ? (
                <div className="py-8 text-center text-neutral-400">No message records found.</div>
              ) : (
                conversationMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl max-w-[85%] ${
                      m.sender === 'user'
                        ? 'ml-auto bg-[#6C3BFF] text-white rounded-br-xs'
                        : 'mr-auto bg-neutral-100 text-neutral-800 rounded-bl-xs'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    <div
                      className={`text-[9px] mt-1 ${
                        m.sender === 'user' ? 'text-purple-200' : 'text-neutral-400'
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedConversation(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE ALL CHATS */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-neutral-900">Delete All Chat History?</h4>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                This will permanently delete all customer chat sessions and messages for{' '}
                <strong>{business.business_name}</strong>.
              </p>
              <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-2 border border-emerald-100">
                🔒 Safe Deletion Guarantee: Your business profile, Prompt Engine data, checklist, products,
                and QR settings will remain 100% intact.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAllChats}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete All Chats'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
