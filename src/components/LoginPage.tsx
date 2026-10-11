import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyMobileLink = () => {
    const url = window.location.origin + '#login';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const session = await signInUser(email, password);
        setSuccessMsg(`Welcome, ${session.user.full_name || session.user.email}!`);
        setTimeout(() => {
          onSuccess(session);
        }, 500);
      } else {
        // Forgot / Reset password mode
        if (!email.trim()) {
          throw new Error('Please enter your account email.');
        }
        if (!password || password.length < 6) {
          throw new Error('New password must be at least 6 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        await changeUserPassword(email, undefined, password, false);
        setSuccessMsg('Password updated successfully! Logging you in...');
        try {
          const session = await signInUser(email, password);
          setTimeout(() => {
            onSuccess(session);
          }, 600);
        } catch {
          setSuccessMsg('Password updated. Please sign in with your new password.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col justify-between selection:bg-[#6C3BFF] selection:text-white relative">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Simple Header */}
      <header className="relative z-10 px-6 py-6 max-w-5xl mx-auto w-full flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#6C3BFF] flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-mono">
            LocalBoost <span className="text-[#9D7AFF]">AI</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyMobileLink}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors cursor-pointer"
          title="Dusre mobile mein kholne ke liye ye link copy karke send karein"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Link Copied!</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Dusre Mobile Ka Link</span>
              <span className="sm:hidden">Share Link</span>
            </>
          )}
        </button>
      </header>

      {/* Main Centered Login Card */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8 my-auto">
        <div className="bg-neutral-800/80 border border-neutral-700/80 backdrop-blur-xl rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[#9D7AFF] flex items-center justify-center mx-auto shadow-xs">
              {mode === 'login' ? <Lock className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {mode === 'login' ? 'Sign In to Your Account' : 'Reset Your Password'}
            </h1>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              {mode === 'login'
                ? 'Super Admin ya Customer: Apne Email ya Customer ID aur Password se sign in karein.'
                : 'Enter your account email and create a new password to regain access'}
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Credential Field */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-neutral-300 block">
                {mode === 'login' ? 'Email, Customer ID, or Phone' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'name@example.com or LB-CUS-...' : 'name@example.com'}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#6C3BFF] focus:ring-1 focus:ring-[#6C3BFF] transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 block">
                  {mode === 'login' ? 'Password' : 'New Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? '••••••••' : 'At least 6 characters'}
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-900/90 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#6C3BFF] focus:ring-1 focus:ring-[#6C3BFF] transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (only in reset mode) */}
            {mode === 'forgot' && (
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#6C3BFF] focus:ring-1 focus:ring-[#6C3BFF] transition-all font-sans"
                  />
                </div>
              </div>
            )}

            {/* Remember Me checkbox (in login mode) */}
            {mode === 'login' && (
              <div className="flex items-center gap-2 pt-1 text-left">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 text-[#6C3BFF] focus:ring-[#6C3BFF] focus:ring-offset-0 bg-neutral-900"
                />
                <label htmlFor="remember" className="text-xs text-neutral-400 cursor-pointer">
                  Remember this device for 30 days
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#6C3BFF] hover:bg-[#5A2DE2] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Reset Password & Sign In'
              )}
            </button>
          </form>

          {/* Toggle Back to Login from Forgot Password */}
          {mode === 'forgot' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          )}

          {/* Customer sign-in reference note */}
          {mode === 'login' && (
            <div className="pt-1 text-center">
              <p className="text-[11px] text-neutral-400 leading-relaxed px-2">
                💡 <span className="text-purple-300 font-medium">Customer:</span> Admin dwara banaye gaye <span className="text-white">Email</span> ya <span className="text-[#9D7AFF]">Customer ID</span> aur Password se direct login karein.
              </p>
            </div>
          )}

          {/* Security badge */}
          <div className="pt-2 border-t border-neutral-700/60 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-End Encrypted Session</span>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-neutral-600">
        LocalBoost AI · Smart NFC &amp; Dynamic QR Review Platform
      </footer>
    </div>
  );
};
