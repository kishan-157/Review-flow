import {
  LoyaltyCard,
  RewardReminder,
  ReminderAuditLog,
  ReminderStage,
  ReminderStatus,
} from '../types/database';

const REMINDER_STORAGE_KEY = 'lb_reward_reminders';
const AUDIT_STORAGE_KEY = 'lb_reminder_audit_logs';

export const REMINDER_STAGES: { stage: ReminderStage; label: string; daysTarget: number }[] = [
  { stage: '7_days', label: '7 Days Remaining', daysTarget: 7 },
  { stage: '3_days', label: '3 Days Remaining', daysTarget: 3 },
  { stage: 'expiry_day', label: 'Expiry Day (Today)', daysTarget: 0 },
];

/**
 * Calculates exact calendar days remaining until expiry by comparing calendar midnights.
 * This avoids fractional hour rounding errors (e.g. 7 days + 2 hours becoming 8 days).
 */
export function calculateDaysRemaining(expiresAtIso: string): number {
  const expiryDate = new Date(expiresAtIso);
  const now = new Date();

  // Normalize to local calendar midnight for accurate integer day differences
  const expMidnight = new Date(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate()
  ).getTime();
  const nowMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const diffDays = Math.round((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Checks whether a reminder is active/due for its stage based on days remaining:
 * - '7_days': Due when days remaining is <= 7 (and >= 4). If exactOnly is true: strictly 7 days!
 *             Cards with 8 or more days remaining are STRICTLY EXCLUDED.
 * - '3_days': Due when days remaining is <= 3 (and >= 1). If exactOnly is true: strictly 3 days!
 *             Cards with 4 or more days remaining are STRICTLY EXCLUDED.
 * - 'expiry_day': Due on expiry day (days remaining === 0).
 */
export function isReminderStageEligible(
  stage: ReminderStage,
  daysRemaining: number,
  exactOnly: boolean = true
): boolean {
  if (exactOnly) {
    if (stage === '7_days') return daysRemaining === 7;
    if (stage === '3_days') return daysRemaining === 3;
    if (stage === 'expiry_day') return daysRemaining === 0;
    return false;
  }

  if (stage === '7_days') {
    // Strictly block 8 days or more!
    return daysRemaining <= 7 && daysRemaining >= 4;
  }
  if (stage === '3_days') {
    // Strictly block 4 days or more!
    return daysRemaining <= 3 && daysRemaining >= 1;
  }
  if (stage === 'expiry_day') {
    return daysRemaining === 0 || daysRemaining < 0;
  }
  return false;
}

/**
 * Formats a personalized WhatsApp reminder message based on the stage.
 */
export function buildPersonalizedWhatsAppMessage(
  card: LoyaltyCard,
  stage: ReminderStage,
  businessName: string,
  businessPhone?: string
): string {
  const bName = businessName || 'our store';
  const expiryFormatted = new Date(card.expires_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const contactLine = businessPhone ? `\n\n🏢 *Sent by:* ${bName}\n📞 *Store Contact:* ${businessPhone}` : `\n\n🏢 *Sent by:* ${bName}`;

  if (stage === '7_days') {
    return (
      `Hello ${card.customer_name}! 🌟\n\n` +
      `Friendly reminder from *${bName}*: Your exclusive VIP Reward *"${card.reward_title}"* (Code: *${card.voucher_code}*) has *7 days remaining* before it expires on ${expiryFormatted}.\n\n` +
      `🎁 Reward: ${card.reward_value || card.reward_title}\n` +
      `📍 Show this message or your voucher code at billing counter to claim your discount!` +
      contactLine +
      `\nWe look forward to welcoming you soon! ❤️`
    );
  }

  if (stage === '3_days') {
    return (
      `Hello ${card.customer_name}! ⏰\n\n` +
      `Urgent reminder from *${bName}*: Only *3 days left* to redeem your VIP Reward *"${card.reward_title}"* (Code: *${card.voucher_code}*)!\n\n` +
      `⚠️ Expiry Date: *${expiryFormatted}*\n` +
      `🎁 Reward: ${card.reward_value || card.reward_title}\n\n` +
      `Don't let your reward expire. Visit us today and show your code at the billing counter!` +
      contactLine
    );
  }

  // expiry_day
  return (
    `Hello ${card.customer_name}! 🚨\n\n` +
    `Final Call from *${bName}*: *TODAY IS THE LAST DAY* to redeem your VIP Reward *"${card.reward_title}"* (Code: *${card.voucher_code}*)!\n\n` +
    `⏳ Expiring tonight: *${expiryFormatted}*\n` +
    `🎁 Reward: ${card.reward_value || card.reward_title}\n\n` +
    `Visit us before closing hours today to redeem your bill discount. We are excited to see you!` +
    contactLine
  );
}

/**
 * Creates deterministic reminder records for a reward card across all 3 stages.
 * Unique identifier format: `${card.id}_${stage}` (prevents duplicates).
 */
export function generateRemindersForCard(
  card: LoyaltyCard,
  businessName: string
): RewardReminder[] {
  const nowIso = new Date().toISOString();
  const daysLeft = calculateDaysRemaining(card.expires_at);
  const isClaimed = card.status === 'redeemed';
  const isExpired = new Date(card.expires_at).getTime() < Date.now();

  return REMINDER_STAGES.map(({ stage, label }) => {
    const uniqueId = `${card.id}_${stage}`;

    // Once a reward is claimed or expired, stop future reminder actions
    let initialStatus: ReminderStatus = 'PENDING';
    if (isClaimed || isExpired) {
      initialStatus = 'STOPPED';
    }

    return {
      id: uniqueId,
      reward_id: card.id,
      business_id: card.business_id,
      customer_name: card.customer_name,
      customer_phone: card.customer_phone,
      voucher_code: card.voucher_code,
      reward_title: card.reward_title,
      reward_value: card.reward_value,
      expires_at: card.expires_at,
      stage,
      stage_label: label,
      days_remaining: daysLeft,
      status: initialStatus,
      sent_at: null,
      sent_by: null,
      message_template: buildPersonalizedWhatsAppMessage(card, stage, businessName),
      created_at: nowIso,
      updated_at: nowIso,
    };
  });
}

function getLocalReminders(): RewardReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalReminders(list: RewardReminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function getLocalAuditLogs(): ReminderAuditLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalAuditLogs(list: ReminderAuditLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Synchronizes and retrieves all reminders for a given business.
 * Enforces transactional server-side logic and database constraints.
 */
export async function syncAndGetReminders(
  businessId: string,
  cards: LoyaltyCard[],
  businessName: string,
  businessPhone?: string
): Promise<{ reminders: RewardReminder[]; auditLogs: ReminderAuditLog[] }> {
  // 1. Try server-side endpoint first
  try {
    const res = await fetch(`/api/loyalty/reminders/sync/${encodeURIComponent(businessId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards, businessName, businessPhone }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reminders)) {
        setLocalReminders(data.reminders);
        if (Array.isArray(data.auditLogs)) {
          setLocalAuditLogs(data.auditLogs);
        }
        return {
          reminders: data.reminders,
          auditLogs: data.auditLogs || [],
        };
      }
    }
  } catch (err) {
    console.warn('Server sync notice, using local transaction store:', err);
  }

  // 2. Client-side transactional fallback
  const existingReminders = getLocalReminders();
  const existingLogs = getLocalAuditLogs();

  const reminderMap = new Map<string, RewardReminder>();
  existingReminders.forEach((r) => reminderMap.set(r.id, r));

  const nowIso = new Date().toISOString();

  // For each card, ensure 3 separate reminder records exist
  cards.forEach((card) => {
    const isClaimed = card.status === 'redeemed';
    const isExpired = new Date(card.expires_at).getTime() < Date.now();
    const daysLeft = calculateDaysRemaining(card.expires_at);

    REMINDER_STAGES.forEach(({ stage, label }) => {
      const uniqueId = `${card.id}_${stage}`;
      const existing = reminderMap.get(uniqueId);

      if (!existing) {
        // Create new record with unique constraint ID
        const newReminder: RewardReminder = {
          id: uniqueId,
          reward_id: card.id,
          business_id: card.business_id,
          customer_name: card.customer_name,
          customer_phone: card.customer_phone,
          voucher_code: card.voucher_code,
          reward_title: card.reward_title,
          reward_value: card.reward_value,
          expires_at: card.expires_at,
          stage,
          stage_label: label,
          days_remaining: daysLeft,
          status: isClaimed || isExpired ? 'STOPPED' : 'PENDING',
          sent_at: null,
          sent_by: null,
          message_template: buildPersonalizedWhatsAppMessage(card, stage, businessName, businessPhone),
          created_at: nowIso,
          updated_at: nowIso,
        };
        reminderMap.set(uniqueId, newReminder);
      } else {
        // Update days remaining and auto-stop if card became claimed or expired
        existing.days_remaining = daysLeft;
        existing.customer_name = card.customer_name;
        existing.customer_phone = card.customer_phone;
        existing.message_template = buildPersonalizedWhatsAppMessage(card, stage, businessName, businessPhone);

        if ((isClaimed || isExpired) && existing.status === 'PENDING') {
          existing.status = 'STOPPED';
          existing.updated_at = nowIso;
          existingLogs.unshift({
            id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            reminder_id: existing.id,
            reward_id: existing.reward_id,
            business_id: existing.business_id,
            stage: existing.stage,
            previous_status: 'PENDING',
            new_status: 'STOPPED',
            changed_by: 'System (Auto Rule)',
            reason: isClaimed ? 'Reward claimed by customer at billing counter' : 'Reward expired',
            action: 'STOPPED',
            created_at: nowIso,
          });
        }
      }
    });
  });

  const mergedReminders = Array.from(reminderMap.values()).filter(
    (r) => r.business_id === businessId
  );
  setLocalReminders(mergedReminders);
  setLocalAuditLogs(existingLogs);

  return {
    reminders: mergedReminders,
    auditLogs: existingLogs.filter((l) => l.business_id === businessId),
  };
}

/**
 * Confirms that a WhatsApp reminder was actually sent.
 * Blocks duplicate sends on server and client.
 */
export async function confirmReminderSentApi(
  reminderId: string,
  sentBy: string,
  notes?: string
): Promise<{ success: boolean; reminder: RewardReminder; auditLog: ReminderAuditLog }> {
  // 1. Try Server Endpoint
  try {
    const res = await fetch(`/api/loyalty/reminders/${encodeURIComponent(reminderId)}/confirm-sent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentBy, notes }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reminder) {
        // Update local storage cache
        const local = getLocalReminders();
        const idx = local.findIndex((r) => r.id === reminderId);
        if (idx !== -1) local[idx] = data.reminder;
        else local.push(data.reminder);
        setLocalReminders(local);

        if (data.auditLog) {
          const logs = getLocalAuditLogs();
          logs.unshift(data.auditLog);
          setLocalAuditLogs(logs);
        }

        return {
          success: true,
          reminder: data.reminder,
          auditLog: data.auditLog,
        };
      }
    } else if (res.status === 409) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Duplicate sending blocked: Reminder was already sent.');
    } else if (res.status === 400) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Reward is already claimed or expired.');
    }
  } catch (err: any) {
    if (err?.message?.includes('Duplicate') || err?.message?.includes('claimed')) {
      throw err;
    }
    console.warn('Server endpoint fallback to client transaction:', err);
  }

  // 2. Client-side transactional logic
  const reminders = getLocalReminders();
  const reminder = reminders.find((r) => r.id === reminderId);
  if (!reminder) {
    throw new Error('Reminder record not found.');
  }

  // SERVER / DATABASE CONSTRAINT: If already SENT, block duplicate sending
  if (reminder.status === 'SENT') {
    throw new Error(`Duplicate blocked: This reminder was already marked as SENT on ${reminder.sent_at} by ${reminder.sent_by}.`);
  }

  if (reminder.status === 'STOPPED') {
    throw new Error('Action blocked: Future reminder actions are stopped because the reward was claimed or expired.');
  }

  const nowIso = new Date().toISOString();
  const prevStatus = reminder.status;
  reminder.status = 'SENT';
  reminder.sent_at = nowIso;
  reminder.sent_by = sentBy || 'Business Owner';
  reminder.updated_at = nowIso;
  setLocalReminders(reminders);

  const auditLog: ReminderAuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reminder_id: reminder.id,
    reward_id: reminder.reward_id,
    business_id: reminder.business_id,
    stage: reminder.stage,
    previous_status: prevStatus,
    new_status: 'SENT',
    changed_by: sentBy || 'Business Owner',
    reason: notes || 'WhatsApp reminder message delivery confirmed by business owner',
    action: 'CONFIRM_SENT',
    created_at: nowIso,
  };

  const logs = getLocalAuditLogs();
  logs.unshift(auditLog);
  setLocalAuditLogs(logs);

  return { success: true, reminder, auditLog };
}

/**
 * Manually corrects the reminder status with audit log recording.
 */
export async function manuallyCorrectReminderStatusApi(
  reminderId: string,
  newStatus: ReminderStatus,
  changedBy: string,
  reason: string
): Promise<{ success: boolean; reminder: RewardReminder; auditLog: ReminderAuditLog }> {
  if (!reason.trim()) {
    throw new Error('Audit reason is required to manually correct reminder status.');
  }

  // 1. Try Server Endpoint
  try {
    const res = await fetch(`/api/loyalty/reminders/${encodeURIComponent(reminderId)}/manual-correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStatus, changedBy, reason }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reminder) {
        const local = getLocalReminders();
        const idx = local.findIndex((r) => r.id === reminderId);
        if (idx !== -1) local[idx] = data.reminder;
        setLocalReminders(local);

        if (data.auditLog) {
          const logs = getLocalAuditLogs();
          logs.unshift(data.auditLog);
          setLocalAuditLogs(logs);
        }

        return { success: true, reminder: data.reminder, auditLog: data.auditLog };
      }
    }
  } catch (err) {
    console.warn('Server manual correction notice:', err);
  }

  // 2. Client-side fallback
  const reminders = getLocalReminders();
  const reminder = reminders.find((r) => r.id === reminderId);
  if (!reminder) throw new Error('Reminder record not found.');

  const nowIso = new Date().toISOString();
  const prevStatus = reminder.status;
  reminder.status = newStatus;
  reminder.updated_at = nowIso;

  if (newStatus === 'SENT' && !reminder.sent_at) {
    reminder.sent_at = nowIso;
    reminder.sent_by = changedBy;
  } else if (newStatus === 'PENDING') {
    reminder.sent_at = null;
    reminder.sent_by = null;
  }

  setLocalReminders(reminders);

  const auditLog: ReminderAuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reminder_id: reminder.id,
    reward_id: reminder.reward_id,
    business_id: reminder.business_id,
    stage: reminder.stage,
    previous_status: prevStatus,
    new_status: newStatus,
    changed_by: changedBy,
    reason,
    action: 'MANUAL_CORRECTION',
    created_at: nowIso,
  };

  const logs = getLocalAuditLogs();
  logs.unshift(auditLog);
  setLocalAuditLogs(logs);

  return { success: true, reminder, auditLog };
}
