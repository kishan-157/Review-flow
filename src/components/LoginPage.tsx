import React, { useState } from 'react';
import {
  Shield,
  Star,
  QrCode,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Lock,
  Mail,
  Zap,
  ArrowLeft,
  Smartphone,
  ChevronRight,
  Check,
  Building,
} from 'lucide-react';
import { AuthSession } from '../types/database';
import { signInUser, changeUserPassword } from '../lib/db';

interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
  onBack: () => void;
  initialMode?: 'login' | 'forgot';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onBack,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'forgot'>(initialMode);
  const [selectedRoleHint, setSelectedRoleHint] = useState<'all' | 'admin' | 'customer'>('all');
  
  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Demo Autofill Helper
  const handleQuickFill = (demoEmail: string, demoPass: string, role: 'admin' | 'customer') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setSelectedRoleHint(role);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        setLoadingStep('Verifying credentials...');
        const session = await signInUser(email, password);
        setLoadingStep('Securing tenant session...');
        setSuccessMsg(`Welcome back, ${session.user.full_name || session.user.email}!`);
        
        setTimeout(() => {
          onSuccess(session);
        }, 600);
      } else {
        // Reset password flow
        if (!email.trim()) {
          throw new Error('Please enter your registered account email.');
        }
        if (!password || password.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('New password and confirmation password do not match.');
        }

        setLoadingStep('Updating secure account key...');
        await changeUserPassword(email, undefined, password, false);
        setLoadingStep('Finalizing password change...');
        setSuccessMsg('Password updated successfully! Logging you in automatically...');

        try {
          const session = await signInUser(email, password);
          setTimeout(() => {
            onSuccess(session);
          }, 800);
        } catch {
          setSuccessMsg('Password changed. Please sign in with your new password.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0E091E] text-white flex flex-col justify-between selection:bg-[#6C3BFF] selection:text-white relative overflow-hidden">
      {/* Dynamic Animated Ambient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-[#6C3BFF]/25 to-purple-800/10 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-indigo-700/20 via-[#6C3BFF]/15 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[30vw] h-[30vw] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 px-6 sm:px-10 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition-all backdrop-blur-md cursor-pointer hover:border-white/20"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6C3BFF] to-violet-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white font-mono">
            LocalBoost <span className="text-[#9D7AFF]">AI</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Platform 100% Live & Secure</span>
        </div>
      </header>

      {/* Main Split Screen Container */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Branded Showcase & Interactive Visual Standee */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-8 py-4">
            
            {/* Header Badge & Title */}
            <div className="space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[#A688FF] text-xs font-semibold backdrop-blur-md shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#B299FF]" />
                <span>Next-Gen Local Business Reputation Engine</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
                Empower Your Store with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9D7AFF] via-purple-300 to-indigo-200">
                  5-Star Google Reviews
                </span> & Smart Standees
              </h1>

              <p className="text-sm sm:text-base text-neutral-300/90 max-w-xl leading-relaxed">
                Log in to control your live NFC stands, analyze customer reviews in real-time, generate multilingual AI review drafts, and manage customer loyalty rewards.
              </p>
            </div>

            {/* Interactive Showcase Standee Card (Pure CSS High-Fidelity Artwork) */}
            <div className="relative group max-w-lg">
              {/* Outer Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#6C3BFF] via-purple-500 to-indigo-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-700 pointer-events-none" />

              {/* Standee Body */}
              <div className="relative bg-[#150F2C]/90 border border-purple-400/30 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl space-y-6">
                
                {/* Standee Top: Brand & NFC icon */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#6C3BFF]/30 border border-[#6C3BFF]/50 flex items-center justify-center text-[#9D7AFF]">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white tracking-wide">Food Bites Cafe &amp; Grill</span>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">Google Verified Business · 1-Tap NFC Active</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-purple-300 font-mono">
                    <Smartphone className="w-3 h-3 text-[#A688FF]" />
                    <span>NFC Tap &amp; Scan</span>
                  </div>
                </div>

                {/* Standee Center: Golden Stars & Customer Experience preview */}
                <div className="bg-gradient-to-b from-purple-900/30 to-black/40 border border-white/10 rounded-2xl p-5 text-center space-y-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-300/80 block">
                    How was your experience today?
                  </span>

                  {/* 5 Shimmering Golden Stars with micro-animations */}
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((starIndex) => (
                      <div
                        key={starIndex}
                        className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 hover:scale-110 hover:bg-amber-400/20 transition-transform cursor-pointer shadow-sm shadow-amber-500/20"
                      >
                        <Star className="w-5 h-5 fill-amber-400" />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>98.6% of Customers Leave a 5-Star Rating</span>
                  </div>
                </div>

                {/* Floating Metrics Highlights */}
                <div className="grid grid-cols-3 gap-3 text-left">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-neutral-400 block font-medium">Scans / Month</span>
                    <span className="text-base font-bold text-white font-mono">+1,420</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-neutral-400 block font-medium">Avg. Rating</span>
                    <span className="text-base font-bold text-amber-300 font-mono">4.9 ★</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-neutral-400 block font-medium">Loyalty Cards</span>
                    <span className="text-base font-bold text-[#A688FF] font-mono">380+</span>
                  </div>
                </div>

              </div>

              {/* Floating Decorative Badges */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-emerald-300/40 flex items-center gap-1.5 animate-bounce">
                <Zap className="w-3 h-3 fill-white" />
                <span>Zero Fake Data · 100% Real Reviews</span>
              </div>
            </div>

            {/* Trust Quote */}
            <div className="flex items-center gap-3 text-xs text-neutral-400 border-t border-white/10 pt-4 max-w-lg">
              <div className="flex -space-x-2 shrink-0">
                <div className="w-7 h-7 rounded-full bg-purple-600 border-2 border-[#0E091E] flex items-center justify-center text-[10px] font-bold text-white">KL</div>
                <div className="w-7 h-7 rounded-full bg-indigo-600 border-2 border-[#0E091E] flex items-center justify-center text-[10px] font-bold text-white">RP</div>
                <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-[#0E091E] flex items-center justify-center text-[10px] font-bold text-white">PS</div>
              </div>
              <p className="leading-tight">
                Trusted by 500+ local establishments across India with multi-tenant RBAC security.
              </p>
            </div>

          </div>

          {/* RIGHT COLUMN: Branded Authentication Card */}
          <div className="lg:col-span-5 w-full">
            <div className="relative">
              {/* Outer Ambient Glow */}
              <div className="absolute -inset-1 bg-gradient-to-b from-[#6C3BFF]/40 via-purple-600/20 to-transparent rounded-3xl blur-xl pointer-events-none" />

              {/* Form Card */}
              <div className="relative bg-[#171032]/95 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
                
                {/* Card Title & Mode Indicator */}
                <div className="text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A688FF]">
                      {mode === 'login' ? 'Authentication Gateway' : 'Security Recovery'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-neutral-300">
                      RBAC v2.4
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    {mode === 'login' ? 'Sign In to Portal' : 'Reset Your Password'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    {mode === 'login'
                      ? 'Access your customer standee controls or Super Admin management'
                      : 'Provide your account email to establish a new login password'}
                  </p>
                </div>

                {/* Quick 1-Click Demo Fill Selector (For seamless testing) */}
                {mode === 'login' && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Quick Demo Autofill (1-Click Login):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickFill('admin@localboost.ai', 'SuperAdmin2026!', 'admin')}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center justify-between ${
                          selectedRoleHint === 'admin'
                            ? 'bg-[#6C3BFF] text-white border-purple-400 shadow-xs'
                            : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                        }`}
                      >
                        <span className="truncate">🛡️ Super Admin</span>
                        {selectedRoleHint === 'admin' && <Check className="w-3 h-3 text-white shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickFill('cafe@foodbites.com', 'DemoPass123!', 'customer')}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center justify-between ${
                          selectedRoleHint === 'customer'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                            : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                        }`}
                      >
                        <span className="truncate">☕ Demo Customer</span>
                        {selectedRoleHint === 'customer' && <Check className="w-3 h-3 text-white shrink-0" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback Alerts */}
                {errorMsg && (
                  <div className="p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-xs text-rose-200 flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Form Elements */}
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Account Email Address <span className="text-[#A688FF]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. admin@localboost.ai or cafe@foodbites.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#6C3BFF]/30 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-neutral-300">
                        {mode === 'login' ? 'Account Password' : 'New Strong Password'} <span className="text-[#A688FF]">*</span>
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot');
                            setErrorMsg(null);
                            setSuccessMsg(null);
                          }}
                          className="text-[11px] font-semibold text-[#A688FF] hover:text-white transition-colors cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/15 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#6C3BFF]/30 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (only in forgot mode) */}
                  {mode === 'forgot' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Confirm New Password <span className="text-[#A688FF]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/15 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#6C3BFF]/30 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button with Animated States */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-[#6C3BFF] via-[#7B4DFF] to-violet-600 hover:from-[#5A2DE2] hover:to-[#6C3BFF] text-white text-xs font-bold rounded-2xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>{loadingStep || 'Authenticating...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Reset Password & Login'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  </div>
                </form>

                {/* Mode Switcher Toggle */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
                  {mode === 'login' ? (
                    <>
                      <span>Don&apos;t have an account yet?</span>
                      <span className="text-[11px] text-[#A688FF] font-semibold">
                        Contact Super Admin
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs font-semibold text-[#A688FF] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 px-6 py-6 border-t border-white/10 text-center text-xs text-neutral-400 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#A688FF]" />
          <span>LocalBoost AI · Enterprise Multi-Tenant &amp; QR Standee Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-neutral-400">
          <span>Encrypted Session</span>
          <span>•</span>
          <span>Role-Based Access (RBAC)</span>
          <span>•</span>
          <span>Cloud &amp; Local Persistence</span>
        </div>
      </footer>
    </div>
  );
};
