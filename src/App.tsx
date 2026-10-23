import React, { useState, useEffect } from 'react';
import { AuthSession, Business, ReviewSettings } from './types/database';
import {
  getCurrentSession,
  updateCurrentSession,
  signOutUser,
  getBusinessBySlug,
  getReviewSettings,
  initDefaultData,
  syncWithServer,
} from './lib/db';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { ReviewExperience } from './components/ReviewExperience';
import { CustomerDashboard } from './components/CustomerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { RewardVerifyModal } from './components/RewardVerifyModal';
import { PublicChatPage } from './components/PublicChatPage';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentView, setCurrentView] = useState<string>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'forgot'>('login');
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [verifyVoucherCode, setVerifyVoucherCode] = useState<string | null>(null);

  // Live Chat Route state (Customer-facing live chat)
  const [activeChatSlug, setActiveChatSlug] = useState<string | null>(null);

  // Review Experience Preview / Live route state
  const [activeReviewSlug, setActiveReviewSlug] = useState<string | null>(null);
  const [previewBusiness, setPreviewBusiness] = useState<Business | null>(null);
  const [previewSettings, setPreviewSettings] = useState<ReviewSettings | null>(null);

  // Initialize session and check URL route for #review/:slug, /review/:slug, #login, /login
  useEffect(() => {
    initDefaultData();
    syncWithServer().catch(() => {});

    // Comprehensive route checker supporting hash (#review/, #chat/), pathname (/review/, /chat/), and search params
    const checkRoute = (): boolean => {
      const hash = window.location.hash;
      const pathname = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search);

      // 0. Check Short & Standard Live Chat routes: /c/slug, #c/slug, ?c=slug, /chat/slug, #chat/slug
      let extractedChatSlug: string | null = null;
      if (hash) {
        const cleanHash = hash.replace(/^#\/?/, '');
        if (cleanHash.startsWith('c/')) {
          extractedChatSlug = cleanHash.replace(/^c\//, '');
        } else if (cleanHash.startsWith('c=')) {
          extractedChatSlug = cleanHash.replace(/^c=/, '');
        } else if (cleanHash.startsWith('chat/')) {
          extractedChatSlug = cleanHash.replace(/^chat\//, '');
        } else if (cleanHash.startsWith('chat=')) {
          extractedChatSlug = cleanHash.replace(/^chat=/, '');
        }
      }
      if (!extractedChatSlug && pathname.startsWith('/c/')) {
        extractedChatSlug = pathname.replace(/^\/c\//, '');
      }
      if (!extractedChatSlug && pathname.startsWith('/chat/')) {
        extractedChatSlug = pathname.replace(/^\/chat\//, '');
      }
      if (!extractedChatSlug) {
        extractedChatSlug = search.get('c') || search.get('chat') || null;
      }
      if (extractedChatSlug) {
        const cleanSlug = extractedChatSlug.split('?')[0].split('&')[0].replace(/\/+$/, '').trim().toLowerCase();
        if (cleanSlug) {
          setActiveChatSlug(cleanSlug);
          setCurrentView('chat');
          return true;
        }
      }

      let extractedSlug: string | null = null;

      // 1. Check hash: #review/slug, #/review/slug, #review=slug
      if (hash) {
        const cleanHash = hash.replace(/^#\/?/, '');
        if (cleanHash.startsWith('review/')) {
          extractedSlug = cleanHash.replace(/^review\//, '');
        } else if (cleanHash.startsWith('review=')) {
          extractedSlug = cleanHash.replace(/^review=/, '');
        }
      }

      // 2. Check pathname: /review/slug
      if (!extractedSlug && pathname.startsWith('/review/')) {
        extractedSlug = pathname.replace(/^\/review\//, '');
      }

      // 3. Check search params: ?review=slug, ?slug=slug, ?b=slug
      if (!extractedSlug) {
        extractedSlug = search.get('review') || search.get('slug') || search.get('b') || null;
      }

      if (extractedSlug) {
        const cleanSlug = extractedSlug.split('?')[0].split('&')[0].replace(/\/+$/, '').trim().toLowerCase();
        if (cleanSlug) {
          setActiveReviewSlug(cleanSlug);
          setCurrentView('review');
          return true;
        }
      }

      // Check for QR reward inspection parameter
      const verifyCode = search.get('verify_reward') || search.get('verify_voucher') || (hash.startsWith('#verify/') ? hash.replace(/^#verify\//, '') : null);
      if (verifyCode) {
        setVerifyVoucherCode(verifyCode.trim());
      }

      if (hash === '#login' || pathname === '/login' || search.get('view') === 'login') {
        setCurrentView('login');
        return true;
      }

      return false;
    };

    const hasRoute = checkRoute();
    if (!hasRoute) {
      const saved = getCurrentSession();
      if (saved) {
        setSession(saved);
        if (saved.user.role === 'admin') {
          setCurrentView('admin');
        } else if (saved.user.role === 'manager') {
          setCurrentView('manager_dashboard');
        } else {
          setCurrentView('dashboard');
        }
      }
    }

    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  const handleSignOut = async () => {
    // If manager is currently viewing a customer panel, return to manager dashboard
    if (session?.impersonatingFromManager) {
      const managerSession: AuthSession = {
        user: session.impersonatingFromManager,
        business: undefined,
      };
      setSession(managerSession);
      updateCurrentSession(managerSession);
      setCurrentView('manager_dashboard');
      return;
    }
    // If admin is currently impersonating, return to admin dashboard
    if (session?.impersonatingFromAdmin) {
      const adminSession: AuthSession = {
        user: session.impersonatingFromAdmin,
        business: undefined,
      };
      setSession(adminSession);
      updateCurrentSession(adminSession);
      setCurrentView('admin');
      return;
    }

    await signOutUser();
    setSession(null);
    setCurrentView('landing');
    window.location.hash = '';
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
  };

  const handleAuthSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    updateCurrentSession(newSession);
    if (window.location.hash === '#login') {
      window.location.hash = '';
    }
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
    if (newSession.user.role === 'admin') {
      setCurrentView('admin');
    } else if (newSession.user.role === 'manager') {
      setCurrentView('manager_dashboard');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handlePreviewFlow = (biz?: Business, sett?: ReviewSettings) => {
    if (biz && sett) {
      setPreviewBusiness(biz);
      setPreviewSettings(sett);
    } else {
      // Default demo business
      const demoBiz: Business = {
        id: 'biz_demo_default',
        user_id: 'usr_demo',
        business_name: 'Food Bites Cafe & Grill',
        unique_slug: 'food-bites-demo',
        google_review_url: 'https://g.page/r/sample/review',
        category: 'Restaurant & Hospitality',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const demoSett: ReviewSettings = {
        id: 'rs_demo',
        business_id: 'biz_demo_default',
        language: 'en',
        welcome_text: 'How was your dining experience with us today?',
        thank_you_text: 'Thank you for supporting our local business! ❤️',
        enabled: true,
        accent_color: '#6C3BFF',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPreviewBusiness(demoBiz);
      setPreviewSettings(demoSett);
    }
    setCurrentView('preview_review');
  };

  const handleOpenLiveReview = (slug: string) => {
    const cleanSlug = slug.trim().toLowerCase().replace(/[\/\?\#].*$/, '');
    setActiveReviewSlug(cleanSlug);
    window.location.hash = `#review/${cleanSlug}`;
    setCurrentView('review');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-[#6C3BFF] selection:text-white">
      {/* Top Navbar */}
      {currentView !== 'review' && currentView !== 'login' && currentView !== 'chat' && (
        <Navbar
          session={session}
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'preview_review') {
              handlePreviewFlow();
            } else if (view === 'login') {
              window.location.hash = '#login';
              setCurrentView('login');
            } else {
              window.location.hash = '';
              setCurrentView(view);
            }
          }}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode || 'login');
            window.location.hash = '#login';
            setCurrentView('login');
          }}
          onSignOut={handleSignOut}
          onOpenSupabaseConfig={() => setSupabaseModalOpen(true)}
        />
      )}

      {/* VIEW: Customer-Facing Public Live Chat */}
      {currentView === 'chat' && activeChatSlug && (
        <PublicChatPage
          businessSlug={activeChatSlug}
          onBackToApp={() => {
            setActiveChatSlug(null);
            window.location.hash = '';
            if (window.location.search.includes('chat')) {
              window.history.replaceState(null, '', window.location.pathname || '/');
            }
            setCurrentView(
              session
                ? session.user.role === 'admin'
                  ? 'admin'
                  : session.user.role === 'manager'
                  ? 'manager_dashboard'
                  : 'dashboard'
                : 'landing'
            );
          }}
        />
      )}

      {/* VIEW: Branded Dedicated Login Page */}
      {currentView === 'login' && (
        <LoginPage
          onSuccess={handleAuthSuccess}
          onBack={() => {
            window.location.hash = '';
            setCurrentView('landing');
          }}
          initialMode={authModalMode}
        />
      )}

      {/* VIEW: Direct Public QR Scan Page */}
      {currentView === 'review' && activeReviewSlug && (
        <ReviewExperience
          businessSlug={activeReviewSlug}
          onBackToApp={() => {
            setActiveReviewSlug(null);
            window.location.hash = '';
            if (window.location.search.includes('review') || window.location.search.includes('slug')) {
              window.history.replaceState(null, '', window.location.pathname || '/');
            }
            setCurrentView(
              session
                ? session.user.role === 'admin'
                  ? 'admin'
                  : session.user.role === 'manager'
                  ? 'manager_dashboard'
                  : 'dashboard'
                : 'landing'
            );
          }}
        />
      )}

      {/* VIEW: Interactive Review Flow Preview (with demo or customer data) */}
      {currentView === 'preview_review' && previewBusiness && (
        <ReviewExperience
          previewBusiness={previewBusiness}
          previewSettings={previewSettings || undefined}
          onBackToApp={() => {
            setCurrentView(
              session
                ? session.user.role === 'admin'
                  ? 'admin'
                  : session.user.role === 'manager'
                  ? 'manager_dashboard'
                  : 'dashboard'
                : 'landing'
            );
          }}
        />
      )}

      {/* VIEW: Landing Page */}
      {currentView === 'landing' && (
        <LandingHero
          onGetStarted={() => {
            setAuthModalMode('login');
            window.location.hash = '#login';
            setCurrentView('login');
          }}
          onPreviewFlow={() => handlePreviewFlow()}
        />
      )}

      {/* VIEW: Customer Dashboard */}
      {currentView === 'dashboard' && session && session.user.role === 'customer' && (
        <CustomerDashboard
          session={session}
          onSignOut={handleSignOut}
          onSessionUpdated={(updated) => setSession(updated)}
          onPreviewReviewFlow={(b, s) => handlePreviewFlow(b, s)}
          onOpenLiveReview={handleOpenLiveReview}
        />
      )}

      {/* VIEW: Manager Control Dashboard */}
      {(currentView === 'manager_dashboard' || (currentView === 'dashboard' && session?.user.role === 'manager')) &&
        session &&
        session.user.role === 'manager' && (
          <ManagerDashboard
            session={session}
            onOpenCustomerPanel={(customerSession) => {
              setSession(customerSession);
              updateCurrentSession(customerSession);
              setCurrentView('dashboard');
            }}
            onSignOut={handleSignOut}
            onOpenLiveReview={handleOpenLiveReview}
          />
        )}

      {/* VIEW: Super Admin Control Center */}
      {currentView === 'admin' && session && session.user.role === 'admin' && (
        <AdminDashboard
          session={session}
          onImpersonate={(impersonated) => {
            setSession(impersonated);
            updateCurrentSession(impersonated);
            setCurrentView('dashboard');
          }}
          onSignOut={handleSignOut}
          onOpenLiveReview={handleOpenLiveReview}
        />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <SupabaseConfigModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onConfigSaved={() => {
          // Refreshed
        }}
      />

      {/* QR Reward Verification Modal (Triggered by phone camera QR scan) */}
      {verifyVoucherCode && (
        <RewardVerifyModal
          voucherCode={verifyVoucherCode}
          session={session}
          onClose={() => {
            setVerifyVoucherCode(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('verify_reward');
            url.searchParams.delete('verify_voucher');
            if (window.location.hash.startsWith('#verify/')) {
              window.location.hash = '';
            }
            window.history.replaceState(null, '', url.pathname + url.search + url.hash);
          }}
          onGoToDashboard={() => {
            if (session?.user?.role === 'customer') {
              setCurrentView('dashboard');
            } else if (session?.user?.role === 'manager') {
              setCurrentView('manager_dashboard');
            } else if (session?.user?.role === 'admin') {
              setCurrentView('admin');
            }
          }}
        />
      )}
    </div>
  );
}
