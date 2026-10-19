/**
 * LocalBoost AI — Customer-Facing Public Live Chat Page (Ultra-Polished Modern UI)
 *
 * Implements:
 * - Stunning glassmorphic header with live store status indicator & verified badge.
 * - Gorgeous animated message streams with interactive action cards.
 * - Fully customizable quick tap chips with instant answers & direct action triggers.
 * - Multi-language switcher (English, हिंदी, ગુજરાતી) with instant UI translation.
 * - 1-Click Action ribbon (WhatsApp, Call, Maps Directions).
 * - 100% Zero External AI inference — operates using local verified business data.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  Sparkles,
  PhoneCall,
  MapPin,
  ExternalLink,
  RotateCcw,
  Check,
  Building2,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Share2,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  SupportedLanguage,
  Business,
  ChatMessage,
  ChatActionOption,
  ChatbotConfig,
  ChatQuickPrompt,
} from '../types/database';
import {
  getDefaultBusinessProfileInfo,
  filterPublicChatbotInfo,
  PublicBusinessChatProfile,
} from '../lib/businessInfoService';
import { answerCustomerQuestion } from '../lib/ruleBasedChatEngine';
import { getBusinessBySlug } from '../lib/db';

interface PublicChatPageProps {
  businessSlug: string;
  onBackToApp?: () => void;
}

const DEFAULT_QUICK_PROMPTS: ChatQuickPrompt[] = [
  {
    id: 'qp_def_hours',
    label: '🕒 Opening Hours',
    question: 'What are your opening hours today?',
    category: 'hours',
    action_type: 'message',
    is_active: true,
  },
  {
    id: 'qp_def_location',
    label: '📍 Location & Address',
    question: 'Where is your shop located?',
    category: 'location',
    action_type: 'message',
    is_active: true,
  },
  {
    id: 'qp_def_products',
    label: '📋 Products & Menu',
    question: 'What products or services do you offer?',
    category: 'product',
    action_type: 'message',
    is_active: true,
  },
  {
    id: 'qp_def_payments',
    label: '💳 Payment Methods',
    question: 'Which payment methods do you accept?',
    category: 'policy',
    action_type: 'message',
    is_active: true,
  },
];

export const PublicChatPage: React.FC<PublicChatPageProps> = ({
  businessSlug,
  onBackToApp,
}) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicBusinessChatProfile | null>(null);
  const [chatConfig, setChatConfig] = useState<ChatbotConfig | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [conversationId, setConversationId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch business by slug
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let biz: Business | null = null;
        let fetchedConfig: ChatbotConfig | null = null;

        // 1. Try server API by-slug (returns safe business + config)
        try {
          const res = await fetch(`/api/business/by-slug/${encodeURIComponent(businessSlug)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.business) {
              biz = data.business;
              if (data.config) fetchedConfig = data.config;
            }
          }
        } catch {}

        // 2. Fallback to local db if server fetch was empty
        if (!biz) {
          biz = await getBusinessBySlug(businessSlug);
        }

        if (biz) {
          setBusiness(biz);
          const fullInfo = getDefaultBusinessProfileInfo(biz);
          const filtered = filterPublicChatbotInfo(fullInfo);
          setPublicProfile(filtered);

          // If config wasn't attached, fetch directly
          if (!fetchedConfig) {
            try {
              const confRes = await fetch(`/api/chat/business/${biz.id}/config`);
              if (confRes.ok) {
                const confData = await confRes.json();
                if (confData.config) fetchedConfig = confData.config;
              }
            } catch {}
          }

          if (fetchedConfig) {
            setChatConfig(fetchedConfig);
          }

          // Generate or retrieve persistent visitor conversation id
          const sessKey = `lb_chat_conv_${biz.id}`;
          let conv = sessionStorage.getItem(sessKey);
          if (!conv) {
            conv = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            sessionStorage.setItem(sessKey, conv);
          }
          setConversationId(conv);

          // Initial Welcome Message
          const customWelcome = fetchedConfig?.welcome_message?.[language];
          const welcome =
            customWelcome ||
            (language === 'hi'
              ? `नमस्ते! ${filtered.business_name} के लाइव असिस्टेंट में आपका स्वागत है। आप हमारे समय, प्रोडक्ट्स, कीमतों या पते के बारे में पूछ सकते हैं। नीचे दिए गए किसी भी बटन पर टैप करें!`
              : language === 'gu'
              ? `નમસ્તે! ${filtered.business_name} ના લાઇવ આસિસ્ટન્ટમાં આપનું સ્વાગત છે. આપ અમારા સમય, પ્રોડક્ટ્સ કે સરનામા વિશે પૂછી શકો છો. નીચે આપેલ કોઈપણ બટન પર ક્લિક કરો!`
              : `Hello! Welcome to ${filtered.business_name}'s live verified assistant. How can we help you today? Feel free to ask or tap any quick option below!`);

          const availablePrompts = (fetchedConfig?.quick_prompts && fetchedConfig.quick_prompts.length > 0)
            ? fetchedConfig.quick_prompts.filter((p) => p.is_active)
            : DEFAULT_QUICK_PROMPTS;

          const initialMsg: ChatMessage = {
            id: `msg_init_${Date.now()}`,
            conversation_id: conv,
            business_id: biz.id,
            sender: 'bot',
            text: welcome,
            intent: 'greeting',
            confidence: 'high',
            suggested_actions: availablePrompts.slice(0, 4).map((p) => ({
              type: p.action_type === 'whatsapp' ? 'whatsapp' : p.action_type === 'call' ? 'call' : 'question',
              label: p.label,
              value: p.action_value || p.question,
            })),
            created_at: new Date().toISOString(),
          };
          setMessages([initialMsg]);
        }
      } catch (err) {
        console.error('Failed to load chat business profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [businessSlug]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Active quick prompts list configured by owner
  const activeQuickPrompts: ChatQuickPrompt[] =
    chatConfig?.quick_prompts && chatConfig.quick_prompts.length > 0
      ? chatConfig.quick_prompts.filter((p) => p.is_active)
      : DEFAULT_QUICK_PROMPTS;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !publicProfile || !business) return;

    setInputText('');

    const userMsg: ChatMessage = {
      id: `msg_usr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      conversation_id: conversationId,
      business_id: business.id,
      sender: 'user',
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Fast, crisp response delay (180ms)
    setTimeout(async () => {
      const result = answerCustomerQuestion(
        text,
        publicProfile,
        language,
        activeQuickPrompts
      );

      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        conversation_id: conversationId,
        business_id: business.id,
        sender: 'bot',
        text: result.replyText,
        intent: result.intent,
        confidence: result.confidence,
        suggested_actions: result.suggestedActions,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);

      // Async sync with server to record conversation in business owner history
      try {
        await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            conversationId,
            userMessage: userMsg,
            botMessage: botMsg,
            language,
          }),
        });
      } catch {}
    }, 180);
  };

  /**
   * Handle Quick Message Click:
   * "jo pic hota hai na ki click hone per Sidha answer de de vah वाला"
   */
  const handleQuickPromptClick = (prompt: ChatQuickPrompt) => {
    if (!publicProfile || !business) return;

    // Direct action buttons
    if (prompt.action_type === 'whatsapp') {
      const waNumber = (business.whatsapp_number || publicProfile.whatsapp || '').replace(/\D/g, '');
      const waUrl = prompt.action_value || (waNumber ? `https://wa.me/${waNumber}` : '');
      if (waUrl) {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        fetch(`/api/chat/business/${business.id}/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'whatsapp', conversationId }),
        }).catch(() => {});
        return;
      }
    }

    if (prompt.action_type === 'call') {
      const phone = business.phone || publicProfile.phone || '';
      if (phone) {
        window.location.href = `tel:${phone}`;
        fetch(`/api/chat/business/${business.id}/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'call', conversationId }),
        }).catch(() => {});
        return;
      }
    }

    if (prompt.action_type === 'maps' && publicProfile.google_maps_url) {
      window.open(publicProfile.google_maps_url, '_blank', 'noopener,noreferrer');
      fetch(`/api/chat/business/${business.id}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'maps', conversationId }),
      }).catch(() => {});
      return;
    }

    // Direct Instant Answer: If businessman set direct_answer, reply immediately!
    if (prompt.direct_answer) {
      const userMsg: ChatMessage = {
        id: `msg_usr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        conversation_id: conversationId,
        business_id: business.id,
        sender: 'user',
        text: prompt.question || prompt.label,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      setTimeout(async () => {
        const actions: ChatActionOption[] = [];
        if (publicProfile.whatsapp && prompt.category === 'contact') {
          actions.push({
            type: 'whatsapp',
            label: '💬 Chat on WhatsApp',
            value: `https://wa.me/${publicProfile.whatsapp.replace(/\D/g, '')}`,
          });
        }
        if (publicProfile.phone && (prompt.category === 'contact' || prompt.category === 'hours')) {
          actions.push({
            type: 'call',
            label: `📞 Call (${publicProfile.phone})`,
            value: `tel:${publicProfile.phone}`,
          });
        }
        if (publicProfile.google_maps_url && (prompt.category === 'location' || prompt.category === 'hours')) {
          actions.push({
            type: 'maps',
            label: '📍 View on Maps',
            value: publicProfile.google_maps_url,
          });
        }

        const botMsg: ChatMessage = {
          id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          conversation_id: conversationId,
          business_id: business.id,
          sender: 'bot',
          text: prompt.direct_answer!,
          intent: `direct_answer_${prompt.id}`,
          confidence: 'high',
          suggested_actions: actions.length > 0 ? actions : undefined,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);

        try {
          await fetch('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: business.id,
              conversationId,
              userMessage: userMsg,
              botMessage: botMsg,
              language,
            }),
          });
        } catch {}
      }, 150);
      return;
    }

    // Default: Send as question to answer engine
    handleSendMessage(prompt.question || prompt.label);
  };

  const handleActionClick = (action: ChatActionOption) => {
    if (action.type === 'question') {
      handleSendMessage(action.value);
    } else if (action.type === 'whatsapp' || action.type === 'maps' || action.type === 'website') {
      window.open(action.value, '_blank', 'noopener,noreferrer');
      if (business) {
        fetch(`/api/chat/business/${business.id}/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: action.type, conversationId }),
        }).catch(() => {});
      }
    } else if (action.type === 'call') {
      window.location.href = action.value;
      if (business) {
        fetch(`/api/chat/business/${business.id}/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'call', conversationId }),
        }).catch(() => {});
      }
    }
  };

  const handleCopyCleanLink = async () => {
    const cleanUrl = `${window.location.origin}/c/${businessSlug}`;
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#6C3BFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 font-medium tracking-wide">Opening verified store chat...</p>
        </div>
      </div>
    );
  }

  if (!business || !publicProfile) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 rounded-3xl border border-neutral-800 p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-800/40">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Business Chat Not Found</h2>
          <p className="text-xs text-neutral-400">
            The short chat link <span className="font-mono text-purple-400">"{businessSlug}"</span> was not found or may have been modified.
          </p>
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const { isOpenNow, todayHoursText } = publicProfile.opening_hours;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center sm:py-4">
      {/* Container Frame */}
      <div className="w-full max-w-lg bg-neutral-900 sm:rounded-3xl border-x sm:border border-neutral-800 flex flex-col h-screen sm:h-[880px] overflow-hidden shadow-2xl relative">
        {/* Top Header (Glassmorphism & Ultra-Clean Modern UI) */}
        <div className="bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-800 text-white p-4 shrink-0 space-y-3 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              {onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {/* Business Avatar / Logo */}
              <div className="relative shrink-0">
                {publicProfile.logo_url ? (
                  <img
                    src={publicProfile.logo_url}
                    alt={publicProfile.business_name}
                    className="w-11 h-11 rounded-2xl object-cover border border-neutral-700 bg-neutral-800 shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6C3BFF] to-[#9B72FF] text-white font-black text-sm flex items-center justify-center shadow-md">
                    {publicProfile.business_name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-neutral-900 ${
                    isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'
                  }`}
                  title={isOpenNow ? 'Store is Open' : 'Store is Closed'}
                />
              </div>

              {/* Name & Category */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold text-white truncate tracking-tight">
                    {publicProfile.business_name}
                  </h1>
                  <span title="Verified Store">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span className="truncate max-w-[130px] font-medium">{publicProfile.category}</span>
                  <span>•</span>
                  <span className={isOpenNow ? 'text-emerald-400 font-semibold' : 'text-neutral-400 font-semibold'}>
                    {isOpenNow ? '🟢 Open Now' : '🔴 Closed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Language Selector & Share */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-neutral-800/90 p-0.5 rounded-xl border border-neutral-700 text-[10px] font-bold shadow-inner">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    language === 'en' ? 'bg-[#6C3BFF] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    language === 'hi' ? 'bg-[#6C3BFF] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  हिन्दी
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('gu')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    language === 'gu' ? 'bg-[#6C3BFF] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ગુજરાતી
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyCleanLink}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer relative"
                title="Copy Chat Link"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Header Action Ribbon: Call, WhatsApp, Directions */}
          <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-800/80">
            {publicProfile.phone && (
              <a
                href={`tel:${publicProfile.phone}`}
                onClick={() => {
                  if (business) {
                    fetch(`/api/chat/business/${business.id}/click`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'call', conversationId }),
                    }).catch(() => {});
                  }
                }}
                className="flex-1 py-1.5 px-2.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-neutral-700/60 shadow-2xs"
              >
                <PhoneCall className="w-3 h-3 text-blue-400" />
                <span>Call Store</span>
              </a>
            )}

            {publicProfile.whatsapp && (
              <a
                href={`https://wa.me/${publicProfile.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (business) {
                    fetch(`/api/chat/business/${business.id}/click`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'whatsapp', conversationId }),
                    }).catch(() => {});
                  }
                }}
                className="flex-1 py-1.5 px-2.5 bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-800/60 shadow-2xs"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </a>
            )}

            {publicProfile.google_maps_url && (
              <a
                href={publicProfile.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (business) {
                    fetch(`/api/chat/business/${business.id}/click`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'maps', conversationId }),
                    }).catch(() => {});
                  }
                }}
                className="flex-1 py-1.5 px-2.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-neutral-700/60 shadow-2xs"
              >
                <MapPin className="w-3 h-3 text-purple-400" />
                <span>Directions</span>
              </a>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-neutral-950 text-xs">
          {/* Trust Banner */}
          <div className="text-center py-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium bg-neutral-900/95 border border-neutral-800 text-neutral-400 shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Verified Store Assistant • Direct instant answers • Zero spam</span>
            </span>
          </div>

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap text-[12.5px] ${
                    isUser
                      ? 'bg-gradient-to-r from-[#6C3BFF] to-[#8052FF] text-white rounded-br-xs font-medium shadow-purple-950/20 shadow-md'
                      : 'bg-neutral-900 text-neutral-100 border border-neutral-800/90 rounded-bl-xs shadow-neutral-950/40 shadow-md'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Attached Interactive Action Buttons */}
                {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-w-[90%]">
                    {msg.suggested_actions.map((act, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleActionClick(act)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          act.type === 'whatsapp'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/80 hover:bg-emerald-900/70 font-bold'
                            : act.type === 'call'
                            ? 'bg-blue-950/70 text-blue-300 border border-blue-700/80 hover:bg-blue-900/70 font-bold'
                            : act.type === 'maps'
                            ? 'bg-purple-950/70 text-purple-300 border border-purple-700/80 hover:bg-purple-900/70 font-bold'
                            : 'bg-neutral-900 text-neutral-200 border border-neutral-800 hover:border-purple-500 hover:bg-neutral-800'
                        }`}
                      >
                        {act.type === 'whatsapp' && <span>💬</span>}
                        {act.type === 'call' && <PhoneCall className="w-3.5 h-3.5 text-blue-400" />}
                        {act.type === 'maps' && <MapPin className="w-3.5 h-3.5 text-purple-400" />}
                        {act.type === 'website' && <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />}
                        {act.type === 'question' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-1.5 text-neutral-400 p-3 bg-neutral-900 w-18 rounded-2xl border border-neutral-800 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#6C3BFF] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#6C3BFF] animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-[#6C3BFF] animate-bounce [animation-delay:0.4s]" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* POPULAR QUICK INQUIRY CHIP RIBBON (Always visible above input) */}
        {activeQuickPrompts.length > 0 && (
          <div className="bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800/90 px-3.5 py-2.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pb-2 px-0.5">
              <span className="flex items-center gap-1.5 font-bold text-neutral-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Tap for Instant Answer (क्विक ऑप्शंस):</span>
              </span>
              <span className="text-[10px] text-neutral-500 font-medium">Swipe →</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {activeQuickPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => handleQuickPromptClick(prompt)}
                  className="px-3.5 py-2 bg-neutral-800/90 hover:bg-neutral-700 active:scale-95 text-neutral-100 rounded-xl text-xs font-semibold border border-neutral-700 whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs group"
                >
                  <span className="group-hover:text-purple-300 transition-colors">{prompt.label}</span>
                  {prompt.direct_answer && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">
                      ⚡ Instant
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 bg-neutral-900 border-t border-neutral-800 space-y-2 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'कुछ भी पूछें (जैसे: समय, कीमत, डिलीवरी, पता)...'
                  : language === 'gu'
                  ? 'કંઈપણ પૂછો (જેમ કે: સમય, કિંમત, સરનામું)...'
                  : 'Ask anything (hours, price, location, delivery)...'
              }
              className="flex-1 px-4 py-3 text-xs bg-neutral-950 border border-neutral-800 rounded-2xl focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#6C3BFF]/30 focus:outline-hidden transition-all text-white placeholder:text-neutral-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-md hover:scale-105 active:scale-95"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>100% Verified Local Store Records</span>
            </span>
            <span className="font-mono text-purple-400 font-semibold">/c/{businessSlug}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
