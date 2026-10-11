import React from 'react';
import { AuthSession } from '../types/database';
interface NavbarProps {
  session: AuthSession | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode?: 'login' | 'forgot') => void;
  onSignOut: () => void;
  onOpenSupabaseConfig?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  currentView,
  onNavigate,
  onOpenAuth,
  onSignOut,
}) => {

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Brand wordmark (Single text element, no subtitle or badges) */}
        <button
          onClick={() => onNavigate('landing')}
          className="text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 hover:text-[#6C3BFF] transition-colors"
        >
          LocalBoost AI
        </button>

        {/* Zone 2: 4-5 clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 ${
              currentView === 'landing' ? 'text-[#6C3BFF] font-semibold' : ''
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => onNavigate('preview_review')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 ${
              currentView === 'preview_review' ? 'text-[#6C3BFF] font-semibold' : ''
            }`}
          >
            QR Review Experience
          </button>

          {session?.user.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 ${
                currentView === 'admin' ? 'text-[#6C3BFF] font-semibold' : ''
              }`}
            >
              Super Admin
            </button>
          )}

          {session?.user.role === 'customer' && (
            <button
              onClick={() => onNavigate('dashboard')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 ${
                currentView === 'dashboard' ? 'text-[#6C3BFF] font-semibold' : ''
              }`}
            >
              My Dashboard
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs text-neutral-500 truncate max-w-[140px]">
                {session.user.full_name}
              </span>
              <button
                onClick={() => {
                  if (session.user.role === 'admin') {
                    onNavigate('admin');
                  } else {
                    onNavigate('dashboard');
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Go to Workspace
              </button>
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                Sign In to Portal
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
