import React from 'react';
import { AuthSession } from '../types/database';
import { Star, Shield, ArrowRight, LogOut, LayoutDashboard, QrCode } from 'lucide-react';

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
  const userInitials = session?.user?.full_name
    ? session.user.full_name.substring(0, 2).toUpperCase()
    : 'LB';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 py-3">
        {/* Brand identity: Monogram + Wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="group flex items-center gap-2.5 text-left shrink-0 cursor-pointer focus:outline-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-slate-950 via-slate-900 to-[#6C3BFF] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-base font-extrabold tracking-tight text-slate-950 group-hover:text-[#6C3BFF] transition-colors">
                LocalBoost
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-black tracking-wider uppercase bg-purple-50 text-[#6C3BFF] rounded border border-purple-200/60">
                AI
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5">
              Google Review SaaS
            </span>
          </div>
        </button>

        {/* Central Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100/70 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => onNavigate('landing')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'landing'
                ? 'bg-white text-slate-950 shadow-xs font-bold'
                : 'hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            Product Overview
          </button>

          <button
            onClick={() => onNavigate('preview_review')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'preview_review'
                ? 'bg-white text-[#6C3BFF] shadow-xs font-bold'
                : 'hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Interactive QR Demo</span>
          </button>

          {session?.user.role === 'customer' && (
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-[#6C3BFF] text-white shadow-xs font-bold'
                  : 'hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Merchant Workspace</span>
            </button>
          )}

          {session?.user.role === 'manager' && (
            <button
              onClick={() => onNavigate('manager_dashboard')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'manager_dashboard'
                  ? 'bg-[#6C3BFF] text-white shadow-xs font-bold'
                  : 'hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Manager Portal</span>
            </button>
          )}

          {session?.user.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Admin Portal</span>
            </button>
          )}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3 shrink-0">
          {session ? (
            <div className="flex items-center gap-2.5">
              {/* User Profile Pill */}
              <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-linear-to-tr from-[#6C3BFF] to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {userInitials}
                </div>
                <div className="flex flex-col text-left leading-tight hidden sm:flex">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {session.user.full_name || 'Store Owner'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {session.user.role === 'admin'
                      ? 'Super Admin'
                      : session.user.role === 'manager'
                      ? session.user.unique_customer_code || 'Manager'
                      : session.user.unique_customer_code || 'Merchant'}
                  </span>
                </div>
              </div>

              {/* Quick Workspace Switcher Button */}
              <button
                onClick={() => {
                  if (session.user.role === 'admin') {
                    onNavigate('admin');
                  } else if (session.user.role === 'manager') {
                    onNavigate('manager_dashboard');
                  } else {
                    onNavigate('dashboard');
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-slate-950 hover:bg-[#6C3BFF] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Sign Out */}
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-slate-950 via-slate-900 to-[#6C3BFF] hover:opacity-95 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-purple-500/10"
              >
                <span>Merchant & Admin Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
