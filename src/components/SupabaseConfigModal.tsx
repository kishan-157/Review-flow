import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, ShieldCheck, AlertCircle, X, ClipboardPaste, Eye, EyeOff } from 'lucide-react';
import {
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
} from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [url, setUrl] = useState(SUPABASE_URL || '');
  const [key, setKey] = useState(SUPABASE_ANON_KEY || '');
  const [showKey, setShowKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showSnippetBox, setShowSnippetBox] = useState(false);
  const [snippetText, setSnippetText] = useState('');
  const [backendSecretActive, setBackendSecretActive] = useState(false);

  useEffect(() => {
    fetch('/api/supabase/status')
      .then(r => r.json())
      .then(data => {
        if (data?.hasServiceRoleKey) {
          setBackendSecretActive(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handlePasteToUrl = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          let clean = text.trim().replace(/^['"`]|['"`]$/g, '');
          if (!clean.startsWith('http://') && !clean.startsWith('https://') && clean.includes('supabase.co')) {
            clean = 'https://' + clean;
          }
          setUrl(clean);
          setStatusMessage('✓ Project URL pasted from clipboard!');
          setTimeout(() => setStatusMessage(null), 3000);
          return;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    setStatusMessage('Tip: Use Ctrl+V / Cmd+V or right-click to paste into the URL input.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handlePasteToKey = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const clean = text.trim().replace(/^['"`]|['"`]$/g, '');
          setKey(clean);
          setStatusMessage('✓ Anon Key pasted from clipboard!');
          setTimeout(() => setStatusMessage(null), 3000);
          return;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    setStatusMessage('Tip: Use Ctrl+V / Cmd+V or right-click to paste into the Key input.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleCopyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCopyKey = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleApplySnippet = (textToProcess?: string) => {
    const raw = textToProcess || snippetText;
    if (!raw.trim()) {
      setStatusMessage('Please paste a snippet into the box.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    let detectedUrl = '';
    let detectedKey = '';

    const urlMatch = raw.match(/(?:VITE_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL)\s*=\s*['"]?([^\s'"]+)['"]?/i);
    if (urlMatch && urlMatch[1]) {
      detectedUrl = urlMatch[1].trim();
    } else {
      const generalUrl = raw.match(/https?:\/\/[a-zA-Z0-9.\-_]+\.supabase\.co/i);
      if (generalUrl) detectedUrl = generalUrl[0].trim();
    }

    const keyMatch = raw.match(/(?:VITE_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY)\s*=\s*['"]?([^\s'"]+)['"]?/i);
    if (keyMatch && keyMatch[1]) {
      detectedKey = keyMatch[1].trim();
    } else {
      const jwtMatch = raw.match(/eyJ[a-zA-Z0-9_\-.]+/);
      if (jwtMatch) detectedKey = jwtMatch[0].trim();
    }

    if (detectedUrl) setUrl(detectedUrl);
    if (detectedKey) setKey(detectedKey);

    if (detectedUrl || detectedKey) {
      setStatusMessage(`✓ Auto-detected & filled: ${detectedUrl ? 'URL ' : ''}${detectedUrl && detectedKey ? '+ ' : ''}${detectedKey ? 'Anon Key' : ''}!`);
      setShowSnippetBox(false);
      setSnippetText('');
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      setStatusMessage('Could not extract credentials. Please paste into individual inputs.');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanUrl = url.trim();
    const cleanKey = key.trim();

    if (!cleanUrl) {
      setStatusMessage('Please provide a Supabase URL.');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
      setUrl(cleanUrl);
    }

    if (!cleanKey || cleanKey.length < 20) {
      setStatusMessage('Please enter a valid Supabase anon public key.');
      return;
    }

    saveSupabaseCredentials(cleanUrl, cleanKey);
    setStatusMessage('✓ Configuration saved! Reconnecting...');
    setTimeout(() => {
      onConfigSaved();
      onClose();
      window.location.reload();
    }, 600);
  };

  const handleReset = () => {
    clearSupabaseCredentials();
    setUrl('');
    setKey('');
    setStatusMessage('Reset to local engine.');
    setTimeout(() => {
      onConfigSaved();
      window.location.reload();
    }, 600);
  };

  const copySqlMigration = () => {
    const sql = `-- Run this in your Supabase SQL Editor:
-- Go to https://supabase.com/dashboard -> Project -> SQL Editor -> New Query
-- Paste the contents of supabase/schema.sql
-- All 10 tables, triggers, and Row Level Security policies will be created automatically.`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Database & Supabase Connection</h3>
              <p className="text-xs text-neutral-500">PostgreSQL persistence, Auth & Row Level Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isConfigured
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            {isConfigured ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                {isConfigured
                  ? 'Connected to Live Supabase Backend'
                  : 'Operating in Local Storage Engine Mode (Supabase Optional)'}
              </p>
              <p className="text-neutral-600 leading-relaxed">
                {isConfigured
                  ? 'All auth, tenant records, reviews, and analytics are synced with your Supabase PostgreSQL instance.'
                  : 'All features (customers, QR codes, analytics, loyalty program) work 100% locally. Supabase connection is completely optional.'}
              </p>
            </div>
          </div>

          {backendSecretActive && (
            <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <span>Backend Secret Key: Active & Protected</span>
                  <span className="px-1.5 py-0.2 bg-emerald-200/60 text-emerald-800 rounded font-mono text-[10px]">
                    .env
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Aapki secret key server environment (.env) mein safely stored hai aur client browser mein kabhi expose nahi hoti.
                </p>
              </div>
            </div>
          )}

          {/* Quick Paste Snippet Toggle */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
            <span className="text-neutral-600 font-medium">Have both URL & Key in .env snippet?</span>
            <button
              type="button"
              onClick={() => setShowSnippetBox(!showSnippetBox)}
              className="px-3 py-1 text-xs font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>{showSnippetBox ? 'Hide Snippet Box' : 'Fast Auto-Fill'}</span>
            </button>
          </div>

          {showSnippetBox && (
            <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2 text-xs">
              <textarea
                rows={3}
                value={snippetText}
                onChange={(e) => setSnippetText(e.target.value)}
                placeholder="Paste VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY snippet here..."
                className="w-full p-2 bg-white border border-neutral-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#6C3BFF]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleApplySnippet()}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg transition-colors cursor-pointer"
                >
                  Auto-Fill Both Fields
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Project URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-700">
                  Project URL <span className="text-neutral-400 font-normal font-mono">(NEXT_PUBLIC_SUPABASE_URL)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePasteToUrl}
                    className="px-2 py-0.5 text-[11px] font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors flex items-center gap-1 cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                  {url && (
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="px-2 py-0.5 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                  {url && (
                    <button
                      type="button"
                      onClick={() => setUrl('')}
                      className="p-0.5 text-neutral-400 hover:text-rose-600 transition-colors"
                      title="Clear URL"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Anon Public Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="block text-xs font-bold text-neutral-700">
                    Project API Keys
                  </label>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    anon public
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="px-2 py-0.5 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                    title={showKey ? 'Hide key' : 'Reveal key'}
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteToKey}
                    className="px-2 py-0.5 text-[11px] font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors flex items-center gap-1 cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                  {key && (
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="px-2 py-0.5 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy key"
                    >
                      {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                  {key && (
                    <button
                      type="button"
                      onClick={() => setKey('')}
                      className="p-0.5 text-neutral-400 hover:text-rose-600 transition-colors"
                      title="Clear key"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] focus:bg-white transition-all font-mono"
              />
              <p className="text-[11px] text-neutral-500">
                Found in Supabase Dashboard → Settings → API → Project API Keys (anon public).
              </p>
            </div>

            {statusMessage && (
              <div className="text-xs font-medium text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                {statusMessage}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                Reset to Local Engine
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </form>

          {/* Migration helper */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
            <div className="flex items-center gap-1.5">
              <span>SQL Schema:</span>
              <span className="font-mono text-neutral-800 font-medium">supabase/schema.sql</span>
            </div>
            <button
              onClick={copySqlMigration}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copied' : 'Copy SQL Guide'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

