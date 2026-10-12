import React, { useState, useEffect } from 'react';
import { AuthSession, Business, ReviewSettings } from './types/database';
import {
  getCurrentSession,
  updateCurrentSession,
  signOutUser,
  getBusinessBySlug,
  getReviewSettings,
  initDefaultData,
} from './lib/db';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { ReviewExperience } from './components/ReviewExperience';
import { CustomerDashboard } from './components/CustomerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentView, setCurrentView] = useState<string>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'forgot'>('login');
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  // Review Experience Preview / Live route state
  const [activeReviewSlug, setActiveReviewSlug] = useState<string | null>(null);
  const [previewBusiness, setPreviewBusiness] = useState<Business | null>(null);
  const [previewSettings, setPreviewSettings] = useState<ReviewSettings | null>(null);

  // Initialize session and check URL route for #review/:slug, /review/:slug, #login, /login
  useEffect(() => {
    initDefaultData();
    const saved = getCurrentSession();
    if (saved) {
      setSession(saved);
      if (saved.user.role === 'admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('dashboard');
      }
    }

    // Comprehensive route checker supporting hash (#review/, #/review/), pathname (/review/), and search params (?review=, ?slug=, ?b=)
    const checkRoute = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search);

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
        // Strip any trailing slashes, hash artifacts, or nested query strings
        const cleanSlug = extractedSlug.split('?')[0].split('&')[0].replace(/\/+$/, '').trim().toLowerCase();
        if (cleanSlug) {
          setActiveReviewSlug(cleanSlug);
          setCurrentView('review');
          return;
        }
      }

      if (hash === '#login' || pathname === '/login' || search.get('view') === 'login') {
        setCurrentView('login');
        return;
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  const handleSignOut = async () => {
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

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-[#6C3BFF] selection:text-white">
      {/* Top Navbar */}
      {currentView !== 'review' && currentView !== 'login' && (
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
            setCurrentView(session ? (session.user.role === 'admin' ? 'admin' : 'dashboard') : 'landing');
          }}
        />
      )}

      {/* VIEW: Interactive Review Flow Preview (with demo or customer data) */}
      {currentView === 'preview_review' && previewBusiness && (
        <ReviewExperience
          previewBusiness={previewBusiness}
          previewSettings={previewSettings || undefined}
          onBackToApp={() => {
            setCurrentView(session ? (session.user.role === 'admin' ? 'admin' : 'dashboard') : 'landing');
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
        />
      )}

      {/* VIEW: Super Admin Control Center */}
      {currentView === 'admin' && session && session.user.role === 'admin' && (
        <AdminDashboard
          session={session}
          onImpersonate={(impersonated) => {
            setSession(impersonated);
            setCurrentView('dashboard');
          }}
          onSignOut={handleSignOut}
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
    </div>
  );
}
