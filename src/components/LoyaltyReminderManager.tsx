import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Shield,
  ShieldAlert,
  History,
  Edit3,
  Calendar,
  Gift,
  Phone,
  Copy,
  Check,
  X,
  User,
  ArrowRight,
  Info,
  Ban,
} from 'lucide-react';
import {
  LoyaltyCard,
  RewardReminder,
  ReminderAuditLog,
  ReminderStage,
  ReminderStatus,
  Business,
  AuthSession,
} from '../types/database';
import {
  syncAndGetReminders,
  confirmReminderSentApi,
  manuallyCorrectReminderStatusApi,
} from '../lib/reminderService';

interface LoyaltyReminderManagerProps {
  business: Business;
  loyaltyCards: LoyaltyCard[];
  session: AuthSession;
  onRefreshCards?: () => void;
}

export const LoyaltyReminderManager: React.FC<LoyaltyReminderManagerProps> = ({
  business,
  loyaltyCards,
  session,
  onRefreshCards,
}) => {
  const [reminders, setReminders] = useState<RewardReminder[]>([]);
  const [auditLogs, setAuditLogs] = useState<ReminderAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | ReminderStage>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReminderStatus>('all');

  // Confirmation Flow Modal state
  const [activeConfirmReminder, setActiveConfirmReminder] = useState<RewardReminder | null>(null);
  const [isConfirmingSend, setIsConfirmingSend] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [hasWindowRefocused, setHasWindowRefocused] = useState(false);

  // Manual Status Correction Modal state
  const [activeCorrectionReminder, setActiveCorrectionReminder] = useState<RewardReminder | null>(null);
  const [correctionNewStatus, setCorrectionNewStatus] = useState<ReminderStatus>('SENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // View All Audit Logs Modal state
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);

  // Success / error banners
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

  // Load and sync reminders
  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const result = await syncAndGetReminders(
        business.id,
        loyaltyCards,
        business.business_name
      );
      setReminders(result.reminders);
      setAuditLogs(result.auditLogs);
    } catch (err: any) {
      console.error('Failed to load reminders:', err);
      setActionError(err?.message || 'Failed to sync reminders.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [business.id, business.business_name, loyaltyCards]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Window focus listener for return-to-dashboard confirmation flow
  useEffect(() => {
    const handleFocus = () => {
      if (activeConfirmReminder) {
        setHasWindowRefocused(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeConfirmReminder]);

  // Trigger WhatsApp link and open confirmation dialog
  const handleOpenWhatsAppReminder = (reminder: RewardReminder) => {
    if (reminder.status === 'SENT') {
      setActionError(`Reminder for stage "${reminder.stage_label}" has already been sent! Duplicate sending is blocked.`);
      return;
    }

    if (reminder.status === 'STOPPED') {
      setActionError('Cannot send reminder: Reward has already been claimed or expired.');
      return;
    }

    // Clean phone number (e.g. +91 9876543210 -> 919876543210)
    let cleanPhone = reminder.customer_phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`; // Standard Indian default prefix if 10 digits
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminder.message_template)}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    // DO NOT automatically mark as sent! Open confirmation modal instead.
    setHasWindowRefocused(false);
    setConfirmNotes('');
    setActiveConfirmReminder(reminder);
  };

  // Confirm that message was sent
  const handleConfirmMessageSent = async () => {
    if (!activeConfirmReminder) return;

    setIsConfirmingSend(true);
    setActionError(null);
    try {
      const userIdentifier = session.user.email || session.user.full_name || 'Business Owner';
      const result = await confirmReminderSentApi(
        activeConfirmReminder.id,
        userIdentifier,
        confirmNotes.trim() || undefined
      );

      // Update state locally
      setReminders((prev) =>
        prev.map((r) => (r.id === activeConfirmReminder.id ? result.reminder : r))
      );
      setAuditLogs((prev) => [result.auditLog, ...prev]);

      setActionSuccess(
        `Reminder for ${activeConfirmReminder.customer_name} (${activeConfirmReminder.stage_label}) marked as SENT. Duplicate sending is now blocked.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
      setActiveConfirmReminder(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to confirm reminder send.');
    } finally {
      setIsConfirmingSend(false);
    }
  };

  // Submit manual status correction
  const handleManualCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCorrectionReminder) return;

    if (!correctionReason.trim()) {
      setActionError('Audit reason is required for status correction.');
      return;
    }

    setIsSubmittingCorrection(true);
    setActionError(null);
    try {
      const userIdentifier = session.user.email || session.user.full_name || 'Business Owner';
      const result = await manuallyCorrectReminderStatusApi(
        activeCorrectionReminder.id,
        correctionNewStatus,
        userIdentifier,
        correctionReason.trim()
      );

      setReminders((prev) =>
        prev.map((r) => (r.id === activeCorrectionReminder.id ? result.reminder : r))
      );
      setAuditLogs((prev) => [result.auditLog, ...prev]);

      setActionSuccess(`Reminder status updated to ${correctionNewStatus} with audit entry.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setActiveCorrectionReminder(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update reminder status.');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setTimeout(() => setCopiedVoucher(null), 2000);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = reminders.length;
    const pending = reminders.filter((r) => r.status === 'PENDING').length;
    const sent = reminders.filter((r) => r.status === 'SENT').length;
    const stopped = reminders.filter((r) => r.status === 'STOPPED').length;
    return { total, pending, sent, stopped };
  }, [reminders]);

  // Filtered reminders list
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      // Stage filter
      if (stageFilter !== 'all' && r.stage !== stageFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.customer_name.toLowerCase().includes(q) ||
          r.customer_phone.includes(q) ||
          r.voucher_code.toLowerCase().includes(q) ||
          r.reward_title.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [reminders, stageFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Module Header & Duplicate Prevention Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-purple-50 p-5 rounded-2xl border border-emerald-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-neutral-900">
                  Loyalty Reward Expiry Reminders
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  Anti-Duplicate Engine
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-0.5">
                Multi-stage WhatsApp reminders at <strong>7 days</strong>, <strong>3 days</strong>, and <strong>expiry day</strong>. Every stage is guarded with server duplicate-prevention and two-step confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAuditLogsModal(true)}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-neutral-500" />
              <span>Audit Trail ({auditLogs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSyncing(true);
                loadReminders();
                if (onRefreshCards) onRefreshCards();
              }}
              disabled={isSyncing}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Reminders'}</span>
            </button>
          </div>
        </div>

        {/* 3 Stages Workflow Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-emerald-200/60 text-xs">
          <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-100 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0">
              7d
            </span>
            <div>
              <span className="font-bold text-neutral-900 block text-[11px]">7 Days Remaining</span>
              <span className="text-[10px] text-neutral-500">Gentle friendly reminder to visit</span>
            </div>
          </div>

          <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-100 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-[11px] shrink-0">
              3d
            </span>
            <div>
              <span className="font-bold text-neutral-900 block text-[11px]">3 Days Remaining</span>
              <span className="text-[10px] text-neutral-500">Urgent reminder before expiration</span>
            </div>
          </div>

          <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-100 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[11px] shrink-0">
              0d
            </span>
            <div>
              <span className="font-bold text-neutral-900 block text-[11px]">Expiry Day (Final Call)</span>
              <span className="text-[10px] text-neutral-500">Last chance today to claim discount</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between gap-2 font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between gap-2 font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500 block">Total Reminders</span>
          <span className="text-xl font-black text-neutral-900">{metrics.total}</span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Across all issued vouchers</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 block">Pending To Send</span>
          <span className="text-xl font-black text-amber-700">{metrics.pending}</span>
          <span className="text-[10px] text-amber-600/80 block mt-0.5">Ready for WhatsApp dispatch</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 block">Confirmed Sent</span>
          <span className="text-xl font-black text-emerald-700">{metrics.sent}</span>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5">Duplicate locked & verified</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500 block">Auto-Stopped</span>
          <span className="text-xl font-black text-neutral-700">{metrics.stopped}</span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Voucher claimed or expired</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or voucher code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Stage filter dropdown */}
            <div className="flex items-center gap-1.5 bg-neutral-100 px-2 py-1 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Stage:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as any)}
                className="bg-transparent text-neutral-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Stages</option>
                <option value="7_days">7 Days Remaining</option>
                <option value="3_days">3 Days Remaining</option>
                <option value="expiry_day">Expiry Day (Today)</option>
              </select>
            </div>

            {/* Status filter dropdown */}
            <div className="flex items-center gap-1.5 bg-neutral-100 px-2 py-1 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-neutral-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="STOPPED">Stopped (Claimed/Expired)</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reminders List Table / Card View */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#6C3BFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500">Syncing and verifying reminder stages...</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Gift className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-neutral-800">No Reminders Match Filter</h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {loyaltyCards.length === 0
              ? 'No loyalty reward cards have been issued yet. When customers claim rewards, reminders are automatically scheduled.'
              : 'Try adjusting your search query, reminder stage, or status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => {
            const isSent = reminder.status === 'SENT';
            const isStopped = reminder.status === 'STOPPED';
            const isPending = reminder.status === 'PENDING';
            const isCancelled = reminder.status === 'CANCELLED';

            // Stage pill styling
            const stageBadge =
              reminder.stage === '7_days'
                ? { bg: 'bg-blue-50 text-blue-800 border-blue-200', text: '7 Days Left' }
                : reminder.stage === '3_days'
                ? { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: '3 Days Left' }
                : { bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'Expiry Day (Today)' };

            return (
              <div
                key={reminder.id}
                className={`p-4 bg-white rounded-2xl border transition-all ${
                  isSent
                    ? 'border-emerald-200/90 bg-emerald-50/10'
                    : isStopped
                    ? 'border-neutral-200/80 bg-neutral-50/50 opacity-80'
                    : 'border-neutral-200 hover:border-purple-300 shadow-2xs'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Customer & Reward Information */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Unique deterministic record ID badge */}
                      <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {reminder.voucher_code}
                      </span>

                      {/* Stage Badge */}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${stageBadge.bg}`}
                      >
                        {reminder.stage_label}
                      </span>

                      {/* Status Badge */}
                      {isSent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          SENT
                        </span>
                      ) : isStopped ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-md flex items-center gap-1">
                          <Ban className="w-3 h-3 text-neutral-500" />
                          STOPPED (Claimed / Expired)
                        </span>
                      ) : isCancelled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                          CANCELLED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PENDING
                        </span>
                      )}

                      <span className="text-[10px] text-neutral-400 font-mono">
                        ID: {reminder.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900">
                        {reminder.customer_name}
                      </span>
                      <span className="text-xs font-mono text-neutral-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        {reminder.customer_phone}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Reward: <strong>{reminder.reward_title}</strong>
                        {reminder.reward_value ? ` (${reminder.reward_value})` : ''}
                      </span>
                      <span>·</span>
                      <span>
                        Expiry: {new Date(reminder.expires_at).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span className="text-neutral-500">
                        {reminder.days_remaining > 0
                          ? `⏳ ${reminder.days_remaining} days remaining`
                          : reminder.days_remaining === 0
                          ? '🚨 Expiring Today'
                          : '⚠️ Expired'}
                      </span>
                    </div>

                    {/* Sent Metadata info if sent */}
                    {isSent && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-2 mt-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Confirmed sent on{' '}
                          <strong>
                            {reminder.sent_at
                              ? new Date(reminder.sent_at).toLocaleString()
                              : 'Earlier'}
                          </strong>{' '}
                          by <strong>{reminder.sent_by || 'Owner'}</strong>. Duplicate sending is blocked.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                    {/* Copy voucher code */}
                    <button
                      type="button"
                      onClick={() => handleCopyCode(reminder.voucher_code)}
                      className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer border border-neutral-200"
                      title="Copy Voucher Code"
                    >
                      {copiedVoucher === reminder.voucher_code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Manual Status Correction / Audit History */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCorrectionReminder(reminder);
                        setCorrectionNewStatus(reminder.status === 'SENT' ? 'PENDING' : 'SENT');
                        setCorrectionReason('');
                      }}
                      className="p-2 text-neutral-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer border border-neutral-200"
                      title="Manually Correct Status with Audit Log"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* WhatsApp Action Button */}
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppReminder(reminder)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send WhatsApp Reminder</span>
                      </button>
                    ) : isSent ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 bg-neutral-100 text-neutral-400 border border-neutral-200 rounded-xl text-xs font-bold cursor-not-allowed flex items-center gap-1.5"
                        title="Already sent and confirmed. Duplicate sending is blocked."
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sent & Locked</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 bg-neutral-100 text-neutral-400 border border-neutral-200 rounded-xl text-xs font-medium cursor-not-allowed flex items-center gap-1.5"
                        title="Reward is already claimed or expired. Future reminder actions are stopped."
                      >
                        <Ban className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Stopped (Claimed / Expired)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL: TWO-STEP "CONFIRM MESSAGE SENT" DIALOG
          (Strict Requirement: Opening WhatsApp does NOT mark as sent)
         ========================================================================= */}
      {activeConfirmReminder && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setActiveConfirmReminder(null)}
              className="absolute right-4 top-4 p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Confirm WhatsApp Message Sent
                </h3>
                <p className="text-xs text-neutral-500">
                  Recipient: <strong>{activeConfirmReminder.customer_name}</strong> ({activeConfirmReminder.customer_phone})
                </p>
              </div>
            </div>

            {/* Window Refocus Banner (Return-to-dashboard prompt) */}
            {hasWindowRefocused && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2 animate-in fade-in">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Welcome back from WhatsApp! Please confirm below if you sent the message.
                </span>
              </div>
            )}

            {/* Explanation box */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Opening WhatsApp does not automatically mark message as sent</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                WhatsApp was opened in a new tab with the personalized message prefilled. Did you click the send button in WhatsApp to deliver it to the customer?
              </p>
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-700 block">
                Prefilled Message Preview:
              </label>
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
                {activeConfirmReminder.message_template}
              </div>
            </div>

            {/* Notes / Sender Identity */}
            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                Sender / Audit Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Sent via WhatsApp Business counter device"
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  // Keep reminder as PENDING
                  setActiveConfirmReminder(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel / Keep Pending
              </button>

              <button
                type="button"
                disabled={isConfirmingSend}
                onClick={handleConfirmMessageSent}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isConfirmingSend ? 'Verifying...' : 'Confirm Message Sent'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: MANUAL STATUS CORRECTION & AUDIT LOG ENTRY
         ========================================================================= */}
      {activeCorrectionReminder && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setActiveCorrectionReminder(null)}
              className="absolute right-4 top-4 p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#6C3BFF] flex items-center justify-center shrink-0">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Manual Status Correction
                </h3>
                <p className="text-xs text-neutral-500">
                  Target: <strong>{activeCorrectionReminder.customer_name}</strong> ({activeCorrectionReminder.stage_label})
                </p>
              </div>
            </div>

            <form onSubmit={handleManualCorrectionSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Current Status
                </label>
                <div className="p-2.5 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-800">
                  {activeCorrectionReminder.status}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  New Status *
                </label>
                <select
                  value={correctionNewStatus}
                  onChange={(e) => setCorrectionNewStatus(e.target.value as ReminderStatus)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF]"
                >
                  <option value="SENT">SENT (Mark as sent and lock)</option>
                  <option value="PENDING">PENDING (Re-open send button)</option>
                  <option value="CANCELLED">CANCELLED (Do not send)</option>
                  <option value="STOPPED">STOPPED (Claimed / Expired)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Audit Reason * (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Sent via SMS/call instead, customer requested cancel, or marked sent accidentally"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#6C3BFF] resize-none"
                />
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCorrectionReminder(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection || !correctionReason.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCorrection ? 'Saving...' : 'Save & Record Audit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: AUDIT TRAIL VIEWER
         ========================================================================= */}
      {showAuditLogsModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowAuditLogsModal(false)}
              className="absolute right-4 top-4 p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#6C3BFF] flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Reminder Audit Trail Log
                </h3>
                <p className="text-xs text-neutral-500">
                  Complete history of reminder dispatches and manual status corrections
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  No reminder audit records recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-900">
                        Action: <span className="text-[#6C3BFF]">{log.action}</span>
                      </span>
                      <span className="text-neutral-500 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-700">
                      <span>Status changed:</span>
                      <span className="font-bold px-1.5 py-0.5 bg-neutral-200 rounded text-[10px]">
                        {log.previous_status}
                      </span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                      <span className="font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px]">
                        {log.new_status}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-600">
                      Reason / Notes: <em>{log.reason}</em>
                    </p>

                    <div className="text-[10px] text-neutral-400 font-mono">
                      By: {log.changed_by} · Reminder ID: {log.reminder_id}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 text-right">
              <button
                type="button"
                onClick={() => setShowAuditLogsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
