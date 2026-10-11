import React, { useState } from 'react';
import { X, Eye, EyeOff, Shield, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthSession } from '../types/database';
import { signInUser, changeUserPassword } from '../lib/db';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'forgot';
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'forgot'>(initialMode === 'forgot' ? 'forgot' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const session = await signInUser(email, password);
        onSuccess(session);
        onClose();
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your account email address.');
        }
        if (!password || password.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (password !== confirmNewPassword) {
          throw new Error('New password and confirm password do not match.');
        }

        await changeUserPassword(email, undefined, password, false);
        setSuccessNotice('Password successfully reset! Logging you in...');
        
        // Auto-login user with the newly set password
        try {
          const session = await signInUser(email, password);
          setTimeout(() => {
            onSuccess(session);
            onClose();
          }, 800);
        } catch {
          setSuccessNotice('Password updated successfully. Please log in with your new password.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              {mode === 'login' ? 'Business & Admin Login' : 'Reset Password'}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {mode === 'login'
                ? 'Enter your registered email & password to access your dashboard'
                : 'Enter your registered email address to set a new password'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
              />
            </div>

            {mode === 'forgot' ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-neutral-700">
                      New Password (Minimum 6 characters) <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                  />
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-neutral-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessNotice(null);
                    }}
                    className="text-[11px] text-[#6C3BFF] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-md shadow-purple-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>
                {loading
                  ? 'Verifying...'
                  : mode === 'login'
                  ? 'Sign In to Portal'
                  : 'Set New Password & Log In'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Super Admin & Customer Login Credentials Guide */}
          <div className="pt-2">
            {mode === 'login' ? (
              <div className="space-y-2">
                <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-[11px] text-purple-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#6C3BFF]">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Default Login Credentials:</span>
                  </div>
                  <div className="space-y-1.5 text-neutral-700">
                    <div>
                      <span className="font-bold text-neutral-900">👑 Super Admin:</span>
                      <div className="font-mono text-[10px] text-purple-900 mt-0.5">
                        Email: <strong className="text-neutral-900">ladanikishan8@gmail.com</strong> or <strong>admin@localboost.ai</strong>
                        <br />
                        Password: <strong className="text-neutral-900">SuperAdmin2026!</strong>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-purple-200/60">
                      <span className="font-bold text-neutral-900">🏪 Business Customer (Demo):</span>
                      <div className="font-mono text-[10px] text-purple-900 mt-0.5">
                        Email: <strong className="text-neutral-900">cafe@foodbites.com</strong>
                        <br />
                        Password: <strong className="text-neutral-900">DemoPass123!</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 text-center">
                  Enter email and password above to sign in securely.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-neutral-600">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessNotice(null);
                    }}
                    className="font-bold text-[#6C3BFF] hover:underline cursor-pointer"
                  >
                    Back to Log In
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
