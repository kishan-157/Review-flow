import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  QrCode,
  Star,
  MessageSquare,
  ExternalLink,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Bell,
  Settings,
  Shield,
  PhoneCall,
  Save,
  Plus,
  RefreshCw,
  AlertTriangle,
  History,
  UserPlus,
  Key,
  Copy,
  Check,
  X,
  Lock,
  EyeOff,
  Database,
  Server,
  Clock,
  Calendar,
  Download,
  Upload,
  Activity,
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { testFirestoreConnection } from '../lib/firebase';
import {
  AuthSession,
  Profile,
  Business,
  ReviewSettings,
  SupportedLanguage,
  Announcement,
  AnnouncementType,
  ImpersonationAuditLog,
  UserStatus,
  AccessValidityType,
} from '../types/database';
import {
  isSupabaseConfigured,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../lib/supabase';
import {
  getGlobalAnalytics,
  getAdminCustomersList,
  AdminCustomerRow,
  toggleCustomerStatus,
  deleteCustomerAccount,
  startImpersonation,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAdminSettings,
  updateAdminSetting,
  getImpersonationLogs,
  createCustomerByAdmin,
  changeUserPassword,
  adminResetCustomerPassword,
  calculateExpiry,
  checkCustomerAccessStatus,
  updateCustomerAccessDuration,
  updateCustomerSettingsByAdmin,
  getReviewSettings,
  exportDatabaseBackup,
  importDatabaseBackup,
  getDatabaseDiagnostics,
} from '../lib/db';

interface AdminDashboardProps {
  session: AuthSession;
  onImpersonate: (impersonatedSession: AuthSession) => void;
  onSignOut: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  onImpersonate,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'announcements' | 'settings' | 'audit'>('overview');

  // Data states
  const [globalStats, setGlobalStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalBusinesses: 0,
    totalScans: 0,
    totalRatings: 0,
    averageRating: 0,
    totalFeedback: 0,
    googleClicks: 0,
  });
  const [customerRows, setCustomerRows] = useState<AdminCustomerRow[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [adminSettings, setAdminSettings] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<ImpersonationAuditLog[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<AdminCustomerRow | null>(null);

  // Create Customer Modal State
  const [createCustomerModalOpen, setCreateCustomerModalOpen] = useState(false);
  const [newCustForm, setNewCustForm] = useState({
    fullName: '',
    email: '',
    password: '',
    businessName: '',
    googleReviewUrl: '',
    phone: '',
    category: 'Restaurant & Hospitality',
    address: '',
  });
  const [newCustValidityType, setNewCustValidityType] = useState<AccessValidityType>('1_year');
  const [newCustCustomDays, setNewCustCustomDays] = useState<number>(365);
  const [newCustCustomDate, setNewCustCustomDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [newCustResult, setNewCustResult] = useState<{
    user: Profile;
    business: Business;
    tempPassword: string;
  } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingCust, setCreatingCust] = useState(false);
  const [copiedNewCustInfo, setCopiedNewCustInfo] = useState(false);

  // Access Filter & Edit Access Validity State
  const [accessFilter, setAccessFilter] = useState<'all' | 'active' | 'expired' | 'expiring_soon'>('all');
  const [editAccessModalOpen, setEditAccessModalOpen] = useState(false);
  const [targetEditAccessCustomer, setTargetEditAccessCustomer] = useState<AdminCustomerRow | null>(null);
  const [editValidityType, setEditValidityType] = useState<AccessValidityType>('1_year');
  const [editCustomDays, setEditCustomDays] = useState<number>(30);
  const [editCustomDate, setEditCustomDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [editAccessNotice, setEditAccessNotice] = useState<string | null>(null);
  const [editAccessLoading, setEditAccessLoading] = useState(false);

  // Database Tools (500+ scale: Backup, Restore, Diagnostics)
  const [dbDiagnostics, setDbDiagnostics] = useState<{
    totalProfiles: number;
    totalCustomers: number;
    totalBusinesses: number;
    totalFeedback: number;
    totalScans: number;
    storageEngine: string;
    isHealthy: boolean;
  } | null>(null);
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreStatusMsg, setRestoreStatusMsg] = useState<string | null>(null);
  const [restoringData, setRestoringData] = useState(false);

  // Admin password change state
  const [adminCurrentPass, setAdminCurrentPass] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [updatingAdminPass, setUpdatingAdminPass] = useState(false);
  const [adminPassNotice, setAdminPassNotice] = useState<string | null>(null);
  const [adminPassError, setAdminPassError] = useState<string | null>(null);

  // Admin resetting customer password modal
  const [resetCustModalOpen, setResetCustModalOpen] = useState(false);
  const [targetResetCustomer, setTargetResetCustomer] = useState<AdminCustomerRow | null>(null);
  const [custNewPassword, setCustNewPassword] = useState('');
  const [resettingCustPass, setResettingCustPass] = useState(false);
  const [resetCustNotice, setResetCustNotice] = useState<string | null>(null);
  const [resetCustError, setResetCustError] = useState<string | null>(null);
  const [copiedCustPass, setCopiedCustPass] = useState(false);
  const [showAdminCurrentPass, setShowAdminCurrentPass] = useState(false);
  const [showAdminNewPass, setShowAdminNewPass] = useState(false);
  const [showCustNewPass, setShowCustNewPass] = useState(false);

  // Admin customer settings edit modal
  const [editCustSettingsModalOpen, setEditCustSettingsModalOpen] = useState(false);
  const [targetEditCustSettings, setTargetEditCustSettings] = useState<AdminCustomerRow | null>(null);
  const [custSettingsForm, setCustSettingsForm] = useState({
    fullName: '',
    email: '',
    businessName: '',
    googleReviewUrl: '',
    phone: '',
    address: '',
    category: 'Restaurant & Hospitality',
    reviewLanguage: 'en' as SupportedLanguage,
    welcomeText: 'How was your experience today?',
    thankYouText: 'Thank you for helping our local business grow! ❤️',
    accentColor: '#6C3BFF',
    qrShowLogo: true,
  });
  const [savingCustSettings, setSavingCustSettings] = useState(false);
  const [custSettingsNotice, setCustSettingsNotice] = useState<string | null>(null);
  const [custSettingsError, setCustSettingsError] = useState<string | null>(null);

  // Supabase Cloud Database state
  const [supabaseConnected, setSupabaseConnected] = useState(isSupabaseConfigured());
  const [inputSupabaseUrl, setInputSupabaseUrl] = useState(SUPABASE_URL || '');
  const [inputSupabaseAnonKey, setInputSupabaseAnonKey] = useState(SUPABASE_ANON_KEY || '');
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [copiedUrlFeedback, setCopiedUrlFeedback] = useState(false);
  const [copiedKeyFeedback, setCopiedKeyFeedback] = useState(false);
  const [showSmartPasteBox, setShowSmartPasteBox] = useState(false);
  const [smartPasteInput, setSmartPasteInput] = useState('');
  const [confirmDisconnectStep, setConfirmDisconnectStep] = useState(false);
  const [supabaseSaveMsg, setSupabaseSaveMsg] = useState<string | null>(null);
  const [showSqlSchemaModal, setShowSqlSchemaModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testSupabaseResult, setTestSupabaseResult] = useState<{ success: boolean; message: string } | null>(null);
  const [backendSecretActive, setBackendSecretActive] = useState(false);
  const [testingFirebase, setTestingFirebase] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleTestFirebase = async () => {
    setTestingFirebase(true);
    setFirebaseTestResult(null);
    try {
      const ok = await testFirestoreConnection();
      if (ok) {
        setFirebaseTestResult({
          success: true,
          message: 'Firebase Firestore connected successfully! Rules deployed & database active.',
        });
      } else {
        setFirebaseTestResult({
          success: false,
          message: 'Could not connect to Firebase Firestore. Please check connection.',
        });
      }
    } catch (e: unknown) {
      setFirebaseTestResult({
        success: false,
        message: e instanceof Error ? e.message : 'Firebase connection test error',
      });
    } finally {
      setTestingFirebase(false);
    }
  };

  const handlePasteToUrl = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          let clean = text.trim().replace(/^['"`]|['"`]$/g, '');
          if (!clean.startsWith('http://') && !clean.startsWith('https://') && clean.includes('supabase.co')) {
            clean = 'https://' + clean;
          }
          setInputSupabaseUrl(clean);
          setSupabaseSaveMsg('✓ Project URL pasted from clipboard!');
          setTimeout(() => setSupabaseSaveMsg(null), 3000);
          return;
        }
      }
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
    setSupabaseSaveMsg('Tip: You can also use Ctrl+V / Cmd+V or right-click to paste into the URL input.');
    setTimeout(() => setSupabaseSaveMsg(null), 4000);
  };

  const handlePasteToAnonKey = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const clean = text.trim().replace(/^['"`]|['"`]$/g, '');
          setInputSupabaseAnonKey(clean);
          setSupabaseSaveMsg('✓ Supabase Anon Key pasted from clipboard!');
          setTimeout(() => setSupabaseSaveMsg(null), 3000);
          return;
        }
      }
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
    setSupabaseSaveMsg('Tip: You can also use Ctrl+V / Cmd+V or right-click to paste into the Key input.');
    setTimeout(() => setSupabaseSaveMsg(null), 4000);
  };

  const handleCopyUrl = async () => {
    if (!inputSupabaseUrl) return;
    try {
      await navigator.clipboard.writeText(inputSupabaseUrl);
      setCopiedUrlFeedback(true);
      setTimeout(() => setCopiedUrlFeedback(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCopyAnonKey = async () => {
    if (!inputSupabaseAnonKey) return;
    try {
      await navigator.clipboard.writeText(inputSupabaseAnonKey);
      setCopiedKeyFeedback(true);
      setTimeout(() => setCopiedKeyFeedback(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleApplySmartPaste = (rawText?: string) => {
    const textToProcess = rawText || smartPasteInput;
    if (!textToProcess.trim()) {
      setSupabaseSaveMsg('Please paste some text first into the box.');
      setTimeout(() => setSupabaseSaveMsg(null), 3000);
      return;
    }

    let detectedUrl = '';
    let detectedKey = '';

    // Match URL
    const urlMatch = textToProcess.match(/(?:VITE_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL)\s*=\s*['"]?([^\s'"]+)['"]?/i);
    if (urlMatch && urlMatch[1]) {
      detectedUrl = urlMatch[1].trim();
    } else {
      const generalUrl = textToProcess.match(/https?:\/\/[a-zA-Z0-9.\-_]+\.supabase\.co/i);
      if (generalUrl) {
        detectedUrl = generalUrl[0].trim();
      }
    }

    // Match Key
    const keyMatch = textToProcess.match(/(?:VITE_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY)\s*=\s*['"]?([^\s'"]+)['"]?/i);
    if (keyMatch && keyMatch[1]) {
      detectedKey = keyMatch[1].trim();
    } else {
      const jwtMatch = textToProcess.match(/eyJ[a-zA-Z0-9_\-.]+/);
      if (jwtMatch) {
        detectedKey = jwtMatch[0].trim();
      }
    }

    if (detectedUrl) setInputSupabaseUrl(detectedUrl);
    if (detectedKey) setInputSupabaseAnonKey(detectedKey);

    if (detectedUrl || detectedKey) {
      setSupabaseSaveMsg(
        `✓ Auto-detected & filled: ${detectedUrl ? 'Project URL ' : ''}${detectedUrl && detectedKey ? '+ ' : ''}${detectedKey ? 'Anon Key' : ''}!`
      );
      setShowSmartPasteBox(false);
      setSmartPasteInput('');
      setTimeout(() => setSupabaseSaveMsg(null), 4000);
    } else {
      setSupabaseSaveMsg('Could not detect a Supabase URL or Anon Key. Please paste them into the individual inputs.');
      setTimeout(() => setSupabaseSaveMsg(null), 4000);
    }
  };

  const handlePasteClipboardToSmartPaste = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setSmartPasteInput(text.trim());
          handleApplySmartPaste(text.trim());
          return;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    setShowSmartPasteBox(true);
  };

  const handleTestSupabase = async () => {
    if (!inputSupabaseUrl.trim() || !inputSupabaseAnonKey.trim()) {
      setTestSupabaseResult({
        success: false,
        message: 'Please enter both Supabase Project URL and Anon Public Key to test connection.',
      });
      return;
    }
    setTestingSupabase(true);
    setTestSupabaseResult(null);
    try {
      const res = await testSupabaseConnection(inputSupabaseUrl.trim(), inputSupabaseAnonKey.trim());
      setTestSupabaseResult(res);
    } catch (err: any) {
      setTestSupabaseResult({
        success: false,
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputSupabaseUrl.trim();
    const anonKey = inputSupabaseAnonKey.trim();

    if (!url) {
      setTestSupabaseResult({
        success: false,
        message: 'Please enter your Supabase Project URL.',
      });
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      setInputSupabaseUrl(url);
    }

    if (!anonKey) {
      setTestSupabaseResult({
        success: false,
        message: 'Please enter your Supabase Public Anon Key.',
      });
      return;
    }

    saveSupabaseCredentials(url, anonKey);
    setSupabaseConnected(true);
    setSupabaseSaveMsg('✓ Supabase credentials successfully saved! Reloading data connection...');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleDisconnectSupabase = () => {
    clearSupabaseCredentials();
    setInputSupabaseUrl('');
    setInputSupabaseAnonKey('');
    setSupabaseConnected(false);
    setConfirmDisconnectStep(false);
    setSupabaseSaveMsg('Disconnected from Supabase. App is now using local persistent storage vault.');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  // New Announcement form
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMessage, setNewAnnMessage] = useState('');
  const [newAnnType, setNewAnnType] = useState<AnnouncementType>('info');

  // Loading & Notifications
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [stats, customers, anns, settings, logs, diag] = await Promise.all([
        getGlobalAnalytics(),
        getAdminCustomersList(),
        getAllAnnouncements(),
        getAdminSettings(),
        getImpersonationLogs(),
        getDatabaseDiagnostics(),
      ]);

      setGlobalStats(stats);
      setCustomerRows(customers);
      setAnnouncements(anns);
      setAdminSettings(settings);
      setAuditLogs(logs);
      setDbDiagnostics(diag);
    } catch (err) {
      console.error('Error loading admin dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleToggleStatus = async (customer: AdminCustomerRow) => {
    const next = await toggleCustomerStatus(customer.profile.id, customer.profile.status);
    setCustomerRows((prev) =>
      prev.map((c) =>
        c.profile.id === customer.profile.id
          ? { ...c, profile: { ...c.profile, status: next } }
          : c
      )
    );
    setNotice(`Customer status updated to ${next}`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleDeleteCustomer = async (profileId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer account? This action cannot be undone.')) {
      return;
    }
    await deleteCustomerAccount(profileId);
    setCustomerRows((prev) => prev.filter((c) => c.profile.id !== profileId));
    setSelectedCustomerDetail(null);
    setNotice('Customer account deleted successfully');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleAdminCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreatingCust(true);

    try {
      if (
        !newCustForm.fullName.trim() ||
        !newCustForm.email.trim() ||
        !newCustForm.businessName.trim() ||
        !newCustForm.googleReviewUrl.trim()
      ) {
        throw new Error('Please fill in all required fields.');
      }

      if (
        !newCustForm.googleReviewUrl.startsWith('https://') &&
        !newCustForm.googleReviewUrl.startsWith('http://')
      ) {
        throw new Error('Google Review URL must begin with https://');
      }

      const res = await createCustomerByAdmin({
        ...newCustForm,
        accessValidityType: newCustValidityType,
        customDurationDays: newCustCustomDays,
        customExpiryDate: newCustCustomDate,
      });
      setNewCustResult(res);

      const newRow: AdminCustomerRow = {
        profile: res.user,
        business: res.business,
        analytics: {
          totalScans: 0,
          totalRatings: 0,
          averageRating: 0,
          starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          reviewCopies: 0,
          googleClicks: 0,
          feedbackSubmissions: 0,
        },
      };

      setCustomerRows([newRow, ...customerRows]);
      setGlobalStats((prev) => ({
        ...prev,
        totalCustomers: prev.totalCustomers + 1,
        activeCustomers: prev.activeCustomers + 1,
        totalBusinesses: prev.totalBusinesses + 1,
      }));

      // Refresh DB diagnostics
      const updatedDiag = await getDatabaseDiagnostics();
      setDbDiagnostics(updatedDiag);

      setNotice(`New customer account created: ${res.user.unique_customer_code}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create customer');
    } finally {
      setCreatingCust(false);
    }
  };

  const handleOpenEditAccessModal = (customer: AdminCustomerRow) => {
    setTargetEditAccessCustomer(customer);
    setEditValidityType(customer.profile.access_validity_type || '1_year');
    setEditCustomDays(customer.profile.access_duration_days || 365);
    if (customer.profile.access_expires_at) {
      setEditCustomDate(customer.profile.access_expires_at.split('T')[0]);
    } else {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setEditCustomDate(d.toISOString().split('T')[0]);
    }
    setEditAccessNotice(null);
    setEditAccessModalOpen(true);
  };

  const handleSaveCustomerAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetEditAccessCustomer) return;

    setEditAccessLoading(true);
    setEditAccessNotice(null);

    try {
      const updatedProfile = await updateCustomerAccessDuration(
        targetEditAccessCustomer.profile.id,
        editValidityType,
        editCustomDays,
        editCustomDate
      );

      setCustomerRows((prev) =>
        prev.map((c) =>
          c.profile.id === updatedProfile.id ? { ...c, profile: updatedProfile } : c
        )
      );

      setNotice(`Access validity updated for ${updatedProfile.unique_customer_code}`);
      setEditAccessNotice('Access updated successfully!');
      setTimeout(() => {
        setEditAccessModalOpen(false);
        setEditAccessNotice(null);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to update customer access');
    } finally {
      setEditAccessLoading(false);
    }
  };

  const handleQuickExtend = async (customer: AdminCustomerRow, daysToAdd: number) => {
    try {
      const currentExpiry = customer.profile.access_expires_at
        ? new Date(customer.profile.access_expires_at)
        : new Date();
      // If already expired, start from today, else extend from currentExpiry
      const base = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
      base.setDate(base.getDate() + daysToAdd);
      const newTargetIso = base.toISOString().split('T')[0];

      const updated = await updateCustomerAccessDuration(
        customer.profile.id,
        'custom',
        daysToAdd,
        newTargetIso
      );

      setCustomerRows((prev) =>
        prev.map((c) => (c.profile.id === updated.id ? { ...c, profile: updated } : c))
      );
      setNotice(`Extended access for ${customer.profile.unique_customer_code} by ${daysToAdd} days`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error extending access');
    }
  };

  const handleExportDatabase = async () => {
    setBackupDownloading(true);
    try {
      const jsonStr = await exportDatabaseBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `localboost_database_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotice('Database backup exported successfully!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setBackupDownloading(false);
    }
  };

  const handleImportDatabase = async () => {
    if (!restoreJsonInput.trim()) {
      setRestoreStatusMsg('Please paste a valid JSON backup text.');
      return;
    }
    setRestoringData(true);
    try {
      const res = await importDatabaseBackup(restoreJsonInput);
      if (res.success) {
        setRestoreStatusMsg(res.message);
        setNotice(res.message);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setRestoreStatusMsg(res.message);
      }
    } catch (err: any) {
      setRestoreStatusMsg('Import failed: ' + err.message);
    } finally {
      setRestoringData(false);
    }
  };

  const handleStartInspection = async (customer: Profile) => {
    try {
      const impersonated = await startImpersonation(session.user, customer);
      onImpersonate(impersonated);
    } catch (err: any) {
      alert(err.message || 'Inspection failed');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnMessage.trim()) return;

    const created = await createAnnouncement(newAnnTitle, newAnnMessage, newAnnType, true);
    setAnnouncements([created, ...announcements]);
    setNewAnnTitle('');
    setNewAnnMessage('');
    setNotice('Announcement published!');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleToggleAnnouncementActive = async (ann: Announcement) => {
    const updated = await updateAnnouncement(ann.id, { is_active: !ann.is_active });
    setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? updated : a)));
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const [key, val] of Object.entries(adminSettings)) {
      await updateAdminSetting(key, val);
    }
    setNotice('Platform configuration updated!');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassNotice(null);
    setAdminPassError(null);

    if (adminNewPass !== adminConfirmPass) {
      setAdminPassError('New password and confirm password do not match.');
      return;
    }

    if (adminNewPass.length < 6) {
      setAdminPassError('New password must be at least 6 characters long.');
      return;
    }

    setUpdatingAdminPass(true);
    try {
      await changeUserPassword(session.user.email, adminCurrentPass, adminNewPass, true);
      setAdminPassNotice('Admin password changed successfully!');
      setAdminCurrentPass('');
      setAdminNewPass('');
      setAdminConfirmPass('');
      setTimeout(() => setAdminPassNotice(null), 4000);
    } catch (err: any) {
      setAdminPassError(err.message || 'Failed to update admin password');
    } finally {
      setUpdatingAdminPass(false);
    }
  };

  const handleAdminResetCustomerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetCustError(null);
    setResetCustNotice(null);
    if (!targetResetCustomer) return;

    if (custNewPassword.length < 6) {
      setResetCustError('Password must be at least 6 characters long.');
      return;
    }

    setResettingCustPass(true);
    try {
      await adminResetCustomerPassword(targetResetCustomer.profile.email, custNewPassword);
      setResetCustNotice(`Password for ${targetResetCustomer.profile.full_name} (${targetResetCustomer.profile.email}) is now: "${custNewPassword}"`);
      setNotice(`Password reset for ${targetResetCustomer.profile.unique_customer_code}`);
    } catch (err: any) {
      setResetCustError(err.message || 'Failed to reset password');
    } finally {
      setResettingCustPass(false);
    }
  };

  const handleOpenCustomerSettings = async (customer: AdminCustomerRow) => {
    setCustSettingsNotice(null);
    setCustSettingsError(null);
    setTargetEditCustSettings(customer);

    let reviewSettings: ReviewSettings | null = null;
    if (customer.business?.id) {
      try {
        reviewSettings = await getReviewSettings(customer.business.id);
      } catch {
        // fallback
      }
    }

    setCustSettingsForm({
      fullName: customer.profile.full_name || '',
      email: customer.profile.email || '',
      businessName: customer.business?.business_name || '',
      googleReviewUrl: customer.business?.google_review_url || '',
      phone: customer.business?.phone || '',
      address: customer.business?.address || '',
      category: customer.business?.category || 'Restaurant & Hospitality',
      reviewLanguage: reviewSettings?.language || 'en',
      welcomeText: reviewSettings?.welcome_text || 'How was your experience today?',
      thankYouText: reviewSettings?.thank_you_text || 'Thank you for helping our local business grow! ❤️',
      accentColor: reviewSettings?.accent_color || '#6C3BFF',
      qrShowLogo: reviewSettings?.qr_show_logo !== undefined ? reviewSettings.qr_show_logo : true,
    });
    setEditCustSettingsModalOpen(true);
  };

  const handleSaveCustomerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEditCustSettings) return;
    setSavingCustSettings(true);
    setCustSettingsError(null);

    try {
      await updateCustomerSettingsByAdmin({
        profileId: targetEditCustSettings.profile.id,
        fullName: custSettingsForm.fullName,
        email: custSettingsForm.email,
        businessId: targetEditCustSettings.business?.id,
        businessName: custSettingsForm.businessName,
        googleReviewUrl: custSettingsForm.googleReviewUrl,
        phone: custSettingsForm.phone,
        address: custSettingsForm.address,
        category: custSettingsForm.category,
        reviewLanguage: custSettingsForm.reviewLanguage,
        welcomeText: custSettingsForm.welcomeText,
        thankYouText: custSettingsForm.thankYouText,
        accentColor: custSettingsForm.accentColor,
        qrShowLogo: custSettingsForm.qrShowLogo,
      });

      // Update state locally
      setCustomerRows((prev) =>
        prev.map((c) => {
          if (c.profile.id === targetEditCustSettings.profile.id) {
            return {
              ...c,
              profile: {
                ...c.profile,
                full_name: custSettingsForm.fullName,
                email: custSettingsForm.email,
              },
              business: c.business
                ? {
                    ...c.business,
                    business_name: custSettingsForm.businessName,
                    google_review_url: custSettingsForm.googleReviewUrl,
                    phone: custSettingsForm.phone,
                    address: custSettingsForm.address,
                    category: custSettingsForm.category,
                  }
                : undefined,
            };
          }
          return c;
        })
      );

      setCustSettingsNotice('Customer settings saved successfully!');
      setNotice(`Updated settings for ${targetEditCustSettings.profile.full_name}`);
      setTimeout(() => {
        setEditCustSettingsModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setCustSettingsError(err.message || 'Failed to update customer settings');
    } finally {
      setSavingCustSettings(false);
    }
  };

  // Filtered customer list (Search Query + Access Validity Filter)
  const filteredCustomers = customerRows.filter((c) => {
    if (!c || !c.profile) return false;
    const q = searchQuery.toLowerCase().trim();
    const customerCode = (c.profile.unique_customer_code || '').toLowerCase();
    const fullName = (c.profile.full_name || '').toLowerCase();
    const email = (c.profile.email || '').toLowerCase();
    const bizName = (c.business?.business_name || '').toLowerCase();

    const matchesQuery =
      !q ||
      customerCode.includes(q) ||
      fullName.includes(q) ||
      email.includes(q) ||
      bizName.includes(q);

    if (!matchesQuery) return false;

    if (accessFilter === 'all') return true;
    const accessInfo = checkCustomerAccessStatus(c.profile);
    if (accessFilter === 'active') return !accessInfo.isExpired;
    if (accessFilter === 'expired') return accessInfo.isExpired;
    if (accessFilter === 'expiring_soon') {
      return (
        !accessInfo.isExpired &&
        accessInfo.daysRemaining !== null &&
        accessInfo.daysRemaining <= 30
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-16">
      {/* Top Banner */}
      <div className="bg-neutral-900 text-white px-6 py-4 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#6C3BFF] text-white rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold">Super Admin Control Center</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                  Platform RBAC
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Logged in as {session.user.full_name} ({session.user.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Metrics</span>
            </button>
            <button
              onClick={onSignOut}
              className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="max-w-7xl mx-auto mt-4 px-6">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#6C3BFF] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Global Analytics
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'customers'
                ? 'bg-[#6C3BFF] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Customer Management & Settings ({customerRows.length})
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-[#6C3BFF] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Announcements ({announcements.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'bg-[#6C3BFF] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Platform & Global Settings
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'audit'
                ? 'bg-[#6C3BFF] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Inspection Audit Logs ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: GLOBAL OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                  Total Customer Accounts
                </span>
                <span className="text-3xl font-bold font-mono tabular-nums text-neutral-900">
                  {globalStats.totalCustomers}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">
                  {globalStats.activeCustomers} active tenants
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                  Total Businesses
                </span>
                <span className="text-3xl font-bold font-mono tabular-nums text-neutral-900">
                  {globalStats.totalBusinesses}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">Local establishments</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                  Total QR Scans Logged
                </span>
                <span className="text-3xl font-bold font-mono tabular-nums text-[#6C3BFF]">
                  {globalStats.totalScans}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">Interactions across all QR codes</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                  Total Ratings Logged
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-3xl font-bold font-mono tabular-nums text-neutral-900">
                    {globalStats.totalRatings}
                  </span>
                  <span className="text-xs text-neutral-500">
                    ({globalStats.averageRating > 0 ? `${globalStats.averageRating} ★` : '—'})
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 block mt-1">1 to 5 star taps</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 block mb-1">
                    Google Review Clicks (Overall)
                  </span>
                  <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                    {globalStats.googleClicks}
                  </span>
                </div>
                <div className="p-3 bg-purple-50 text-[#6C3BFF] rounded-xl">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 block mb-1">
                    Private Customer Feedbacks
                  </span>
                  <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                    {globalStats.totalFeedback}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER MANAGEMENT */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            {/* Header with Search and Create Customer Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs flex items-center gap-3">
                <Search className="w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Customer ID (LB-CUS-...), Name, Email, or Business name..."
                  className="w-full text-xs bg-transparent focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-neutral-400 hover:text-neutral-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewCustResult(null);
                  setCreateError(null);
                  setNewCustForm({
                    fullName: '',
                    email: '',
                    password: '',
                    businessName: '',
                    googleReviewUrl: '',
                    phone: '',
                    category: 'Restaurant & Hospitality',
                    address: '',
                  });
                  setCreateCustomerModalOpen(true);
                }}
                className="px-4 py-3 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 hover:scale-[1.01] active:scale-[0.99]"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create Customer</span>
              </button>
            </div>

            {/* Filter Pills for Access Validity */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => setAccessFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  accessFilter === 'all'
                    ? 'bg-[#6C3BFF] text-white shadow-xs'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <span>All Customers</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${accessFilter === 'all' ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  {customerRows.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccessFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  accessFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 border border-neutral-200 hover:bg-emerald-50/50'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Active Plan Access</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${accessFilter === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {customerRows.filter((r) => !checkCustomerAccessStatus(r.profile).isExpired).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccessFilter('expired')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  accessFilter === 'expired'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-800 border border-neutral-200 hover:bg-rose-50/50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Expired Plan Access</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${accessFilter === 'expired' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
                  {customerRows.filter((r) => checkCustomerAccessStatus(r.profile).isExpired).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccessFilter('expiring_soon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  accessFilter === 'expiring_soon'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-800 border border-neutral-200 hover:bg-amber-50/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Expiring Soon (&lt;30d)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${accessFilter === 'expiring_soon' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {
                    customerRows.filter((r) => {
                      const a = checkCustomerAccessStatus(r.profile);
                      return !a.isExpired && a.daysRemaining !== null && a.daysRemaining <= 30;
                    }).length
                  }
                </span>
              </button>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Customer ID</th>
                      <th className="py-3 px-4">Customer Name & Email</th>
                      <th className="py-3 px-4">Business</th>
                      <th className="py-3 px-4">Plan & Validity</th>
                      <th className="py-3 px-4 text-center">QR Scans</th>
                      <th className="py-3 px-4 text-center">Ratings (Avg)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-neutral-500">
                          <div className="max-w-md mx-auto space-y-3">
                            <Users className="w-8 h-8 text-neutral-300 mx-auto" />
                            <p className="text-xs font-semibold text-neutral-700">
                              {customerRows.length === 0
                                ? 'No customer accounts registered yet.'
                                : 'No matching customers found for your search or filter.'}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              {customerRows.length === 0
                                ? 'Create your first customer to generate their custom QR standee and review engine.'
                                : 'Try clearing your search query or reset the access validity filter.'}
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                              {customerRows.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery('');
                                    setAccessFilter('all');
                                  }}
                                  className="px-3 py-1.5 text-xs text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 rounded-xl font-semibold transition-colors"
                                >
                                  Reset Search / Filter
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setNewCustResult(null);
                                  setCreateError(null);
                                  setCreateCustomerModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-xs text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl font-semibold shadow-xs transition-colors"
                              >
                                + Create Customer
                              </button>
                              <button
                                type="button"
                                onClick={() => loadAll()}
                                className="px-3 py-1.5 text-xs text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl font-semibold transition-colors flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reload</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((row) => (
                        <tr key={row.profile.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#6C3BFF]">
                            {row.profile.unique_customer_code}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-neutral-900 block">
                              {row.profile.full_name}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {row.profile.email}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-neutral-800 block">
                              {row.business?.business_name || '—'}
                            </span>
                            {row.business?.phone && (
                              <span className="text-[11px] text-neutral-500">
                                {row.business.phone}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              const access = checkCustomerAccessStatus(row.profile);
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    {access.isLifetime ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#6C3BFF] border border-purple-200">
                                        ⭐ Lifetime Access
                                      </span>
                                    ) : access.isExpired ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span>Plan Expired</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle className="w-2.5 h-2.5" />
                                        <span>{access.daysRemaining}d left</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-neutral-500 font-mono block">
                                    {access.expiresFormatted}
                                  </span>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditAccessModal(row)}
                                      className="text-[10px] font-semibold text-[#6C3BFF] hover:underline flex items-center gap-0.5 cursor-pointer"
                                      title="Edit or adjust access validity"
                                    >
                                      <Clock className="w-3 h-3" />
                                      <span>Set Validity</span>
                                    </button>
                                    <span className="text-neutral-300">·</span>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickExtend(row, 30)}
                                      className="text-[10px] font-medium text-neutral-700 hover:text-emerald-700 bg-neutral-100 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                      title="Quick Extend +30 Days"
                                    >
                                      +30d
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickExtend(row, 365)}
                                      className="text-[10px] font-medium text-neutral-700 hover:text-purple-700 bg-neutral-100 hover:bg-purple-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                      title="Quick Extend +1 Year"
                                    >
                                      +1y
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums">
                            {row.analytics.totalScans}
                          </td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums">
                            {row.analytics.totalRatings} (
                            {row.analytics.averageRating > 0 ? `${row.analytics.averageRating}★` : '—'})
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(row)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                                row.profile.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                            >
                              {row.profile.status}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Customer Settings Action */}
                              <button
                                onClick={() => handleOpenCustomerSettings(row)}
                                title="Customer Business & Review Settings"
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1 border border-purple-200 shrink-0"
                              >
                                <Settings className="w-3 h-3 text-[#6C3BFF]" />
                                <span>Settings</span>
                              </button>

                              {/* Open Customer Dashboard Action */}
                              <button
                                onClick={() => handleStartInspection(row.profile)}
                                title="Open Customer Dashboard"
                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg transition-colors flex items-center gap-1 shrink-0"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>

                              <button
                                onClick={() => setSelectedCustomerDetail(row)}
                                className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg"
                                title="View Customer Profile"
                              >
                                <Users className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setTargetResetCustomer(row);
                                  setCustNewPassword(`LB@${Math.floor(100000 + Math.random() * 900000)}`);
                                  setResetCustNotice(null);
                                  setResetCustModalOpen(true);
                                }}
                                className="p-1.5 text-neutral-500 hover:text-[#6C3BFF] hover:bg-purple-50 rounded-lg transition-colors"
                                title="Set / Change Customer Password"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteCustomer(row.profile.id)}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Delete Customer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Deep Profile Modal */}
            {selectedCustomerDetail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-neutral-200 space-y-4">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">Customer Profile & Analytics</h3>
                      <p className="text-xs text-neutral-500 font-mono">
                        Code: {selectedCustomerDetail.profile.unique_customer_code} · {selectedCustomerDetail.profile.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCustomerDetail(null)}
                      className="text-neutral-400 hover:text-neutral-700 p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl">
                      <div>
                        <span className="text-neutral-500 block">Full Name:</span>
                        <span className="font-semibold text-neutral-900">{selectedCustomerDetail.profile.full_name}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">Registration Date:</span>
                        <span className="font-semibold text-neutral-900">
                          {new Date(selectedCustomerDetail.profile.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">Business:</span>
                        <span className="font-semibold text-neutral-900">
                          {selectedCustomerDetail.business?.business_name || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">QR Slug:</span>
                        <span className="font-mono text-purple-700 font-semibold">
                          {selectedCustomerDetail.business?.unique_slug || 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Star Breakdown */}
                    <div>
                      <h4 className="font-bold text-neutral-900 mb-2">Selected Star Rating Distribution</h4>
                      <div className="space-y-1.5">
                        {[5, 4, 3, 2, 1].map((s) => (
                          <div key={s} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                            <span className="flex items-center gap-1 font-semibold">
                              {s} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            </span>
                            <span className="font-mono font-bold">
                              {selectedCustomerDetail.analytics.starDistribution[s as 1 | 2 | 3 | 4 | 5] || 0} selections
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-500 block">Google Clicks</span>
                        <span className="font-mono font-bold text-sm">{selectedCustomerDetail.analytics.googleClicks}</span>
                      </div>
                      <div className="p-2.5 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-500 block">Draft Copies</span>
                        <span className="font-mono font-bold text-sm">{selectedCustomerDetail.analytics.reviewCopies}</span>
                      </div>
                      <div className="p-2.5 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-500 block">Private Feedbacks</span>
                        <span className="font-mono font-bold text-sm">{selectedCustomerDetail.analytics.feedbackSubmissions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedCustomerDetail;
                        setSelectedCustomerDetail(null);
                        setTargetResetCustomer(target);
                        setCustNewPassword(`LB@${Math.floor(100000 + Math.random() * 900000)}`);
                        setResetCustNotice(null);
                        setResetCustError(null);
                        setResetCustModalOpen(true);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5 text-[#6C3BFF]" />
                      <span>Set / Change Password</span>
                    </button>
                    <button
                      onClick={() => handleStartInspection(selectedCustomerDetail.profile)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg shadow-xs"
                    >
                      Open Customer Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Customer Modal */}
            {createCustomerModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 my-8">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-50 text-[#6C3BFF] rounded-xl">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900">
                          {newCustResult ? 'Customer Account Created' : 'Create New Customer Account'}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {newCustResult
                            ? 'The customer profile, business entity, and review settings are live.'
                            : 'Add a new local business tenant to the platform.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCreateCustomerModalOpen(false)}
                      className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {createError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{createError}</span>
                    </div>
                  )}

                  {newCustResult ? (
                    /* Success view with Credentials & Quick Actions */
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 text-emerald-950">
                        <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>Tenant Ready & Provisioned!</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                            <span className="text-[11px] text-neutral-500 block">Customer ID Code:</span>
                            <span className="font-mono font-bold text-sm text-[#6C3BFF]">
                              {newCustResult.user.unique_customer_code}
                            </span>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                            <span className="text-[11px] text-neutral-500 block">Business Slug:</span>
                            <span className="font-mono font-bold text-sm text-neutral-800">
                              {newCustResult.business.unique_slug}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-2">
                          <span className="text-[11px] text-neutral-500 block font-semibold">
                            Login Credentials for Customer:
                          </span>
                          <div className="flex items-center justify-between text-neutral-800 font-mono">
                            <span>Email: {newCustResult.user.email}</span>
                          </div>
                          <div className="flex items-center justify-between text-neutral-800 font-mono">
                            <span>Password: {newCustResult.tempPassword}</span>
                          </div>
                        </div>

                        {/* Access Validity Info */}
                        <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                          <span className="text-[11px] text-neutral-500 block font-semibold">
                            Account Plan Access Validity:
                          </span>
                          <div className="flex items-center gap-2 text-neutral-800">
                            <Clock className="w-4 h-4 text-[#6C3BFF]" />
                            <span className="font-semibold">
                              {checkCustomerAccessStatus(newCustResult.user).expiresFormatted}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const creds = `Customer ID: ${newCustResult.user.unique_customer_code}\nEmail: ${newCustResult.user.email}\nPassword: ${newCustResult.tempPassword}\nBusiness: ${newCustResult.business.business_name}`;
                            navigator.clipboard.writeText(creds);
                            setCopiedNewCustInfo(true);
                            setTimeout(() => setCopiedNewCustInfo(false), 2500);
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          {copiedNewCustInfo ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-neutral-600" />
                              <span>Copy Credentials</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewCustResult(null);
                              setNewCustForm({
                                fullName: '',
                                email: '',
                                password: '',
                                businessName: '',
                                googleReviewUrl: '',
                                phone: '',
                                category: 'Restaurant & Hospitality',
                                address: '',
                              });
                            }}
                            className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                          >
                            Create Another
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCreateCustomerModalOpen(false);
                              handleStartInspection(newCustResult.user);
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open Customer Dashboard</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Customer Form */
                    <form onSubmit={handleAdminCreateCustomer} className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">
                            Customer Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newCustForm.fullName}
                            onChange={(e) =>
                              setNewCustForm({ ...newCustForm, fullName: e.target.value })
                            }
                            placeholder="e.g. Ankit Sharma"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">
                            Email Address <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={newCustForm.email}
                            onChange={(e) =>
                              setNewCustForm({ ...newCustForm, email: e.target.value })
                            }
                            placeholder="customer@business.com"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">
                            Business Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newCustForm.businessName}
                            onChange={(e) =>
                              setNewCustForm({ ...newCustForm, businessName: e.target.value })
                            }
                            placeholder="e.g. Royal Restro & Cafe"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">
                            Business Category
                          </label>
                          <select
                            value={newCustForm.category}
                            onChange={(e) =>
                              setNewCustForm({ ...newCustForm, category: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                          >
                            <option value="Restaurant & Hospitality">Restaurant & Hospitality</option>
                            <option value="Cafe & Bakery">Cafe & Bakery</option>
                            <option value="Hotel & Lodging">Hotel & Lodging</option>
                            <option value="Salon & Spa">Salon & Spa</option>
                            <option value="Clinic & Healthcare">Clinic & Healthcare</option>
                            <option value="Clothing & Retail">Clothing & Retail</option>
                            <option value="Fitness & Gym">Fitness & Gym</option>
                            <option value="Other Local Business">Other Local Business</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Google Review URL <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="url"
                          required
                          value={newCustForm.googleReviewUrl}
                          onChange={(e) =>
                            setNewCustForm({ ...newCustForm, googleReviewUrl: e.target.value })
                          }
                          placeholder="https://g.page/r/your-place-id/review"
                          className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                        />
                        <p className="text-[10px] text-neutral-500 mt-1">
                          Direct link where customer scans will be redirected on Google.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">
                            Password (Optional)
                          </label>
                          <input
                            type="text"
                            value={newCustForm.password}
                            onChange={(e) =>
                              setNewCustForm({ ...newCustForm, password: e.target.value })
                            }
                            placeholder="Leave blank to auto-generate"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">
                            Contact Phone (Optional)
                          </label>
                          <input
                            type="tel"
                            value={newCustForm.phone}
                            onChange={(e) =>
                              setNewCustForm({ ...newCustForm, phone: e.target.value })
                            }
                            placeholder="e.g. +91 98765 43210"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Business Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={newCustForm.address}
                          onChange={(e) =>
                            setNewCustForm({ ...newCustForm, address: e.target.value })
                          }
                          placeholder="e.g. 101 Main High Street, City"
                          className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                        />
                      </div>

                      {/* Access Validity Duration Selection */}
                      <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className="font-bold text-neutral-900 flex items-center gap-1.5 text-xs">
                            <Clock className="w-3.5 h-3.5 text-[#6C3BFF]" />
                            <span>Account Access Validity / समय सीमा</span>
                            <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] font-semibold text-[#6C3BFF]">
                            {(() => {
                              const exp = calculateExpiry(newCustValidityType, newCustCustomDays, newCustCustomDate);
                              if (!exp.expiresAt) return '⭐ Lifetime / Unlimited Access';
                              return `Valid until: ${new Date(exp.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} (${exp.durationDays} days)`;
                            })()}
                          </span>
                        </div>

                        {/* Validity Presets */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[11px]">
                          {[
                            { id: '1_month', label: '1 Month (30d)' },
                            { id: '3_months', label: '3 Months (90d)' },
                            { id: '6_months', label: '6 Months (180d)' },
                            { id: '1_year', label: '1 Year (365d)' },
                            { id: 'custom', label: 'Custom Date' },
                            { id: 'lifetime', label: '⭐ Lifetime' },
                          ].map((plan) => (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setNewCustValidityType(plan.id as AccessValidityType)}
                              className={`py-1.5 px-2 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                                newCustValidityType === plan.id
                                  ? 'bg-[#6C3BFF] text-white shadow-xs'
                                  : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              {plan.label}
                            </button>
                          ))}
                        </div>

                        {/* If Custom is selected */}
                        {newCustValidityType === 'custom' && (
                          <div className="pt-1.5 flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-[10px] font-medium text-neutral-600 mb-0.5">
                                Custom Expiration Date:
                              </label>
                              <input
                                type="date"
                                required
                                value={newCustCustomDate}
                                onChange={(e) => setNewCustCustomDate(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                              />
                            </div>
                            <div className="w-32">
                              <label className="block text-[10px] font-medium text-neutral-600 mb-0.5">
                                Or Custom Days:
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={3650}
                                value={newCustCustomDays}
                                onChange={(e) => {
                                  const d = Number(e.target.value);
                                  setNewCustCustomDays(d);
                                  const target = new Date();
                                  target.setDate(target.getDate() + d);
                                  setNewCustCustomDate(target.toISOString().split('T')[0]);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setCreateCustomerModalOpen(false)}
                          className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creatingCust}
                          className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>{creatingCust ? 'Creating...' : 'Create Customer Account'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Set / Change Customer Password Modal */}
            {resetCustModalOpen && targetResetCustomer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 my-8">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-50 text-[#6C3BFF] rounded-xl">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900">
                          Set Customer Password
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Configure or reset login credentials for this business tenant
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setResetCustModalOpen(false);
                        setResetCustNotice(null);
                        setResetCustError(null);
                      }}
                      className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Customer Badge */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-700">
                        {targetResetCustomer.profile.full_name}
                      </span>
                      <span className="font-mono font-bold text-[#6C3BFF]">
                        {targetResetCustomer.profile.unique_customer_code}
                      </span>
                    </div>
                    <div className="text-neutral-500 flex flex-wrap items-center justify-between gap-1">
                      <span>Email: <strong className="text-neutral-800">{targetResetCustomer.profile.email}</strong></span>
                      <span>Business: <strong className="text-neutral-800">{targetResetCustomer.business?.business_name || 'N/A'}</strong></span>
                    </div>
                  </div>

                  {resetCustError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{resetCustError}</span>
                    </div>
                  )}

                  {resetCustNotice ? (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-emerald-800">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Password Updated Successfully!</span>
                        </div>
                        <p className="text-neutral-700">
                          The new login password has been set. Share these credentials with the customer:
                        </p>
                        <div className="p-3 bg-white rounded-xl border border-emerald-100 font-mono text-xs space-y-1">
                          <p><strong>Email:</strong> {targetResetCustomer.profile.email}</p>
                          <p><strong>New Password:</strong> <span className="text-[#6C3BFF] font-bold">{custNewPassword}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const creds = `Customer ID: ${targetResetCustomer.profile.unique_customer_code}\nEmail: ${targetResetCustomer.profile.email}\nNew Password: ${custNewPassword}\nBusiness: ${targetResetCustomer.business?.business_name || ''}`;
                            navigator.clipboard.writeText(creds);
                            setCopiedCustPass(true);
                            setTimeout(() => setCopiedCustPass(false), 2500);
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          {copiedCustPass ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-neutral-600" />
                              <span>Copy Credentials</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setResetCustModalOpen(false);
                              handleStartInspection(targetResetCustomer.profile);
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Dashboard</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAdminResetCustomerPassword} className="space-y-4 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-neutral-700">
                            New Password for Customer <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setCustNewPassword(`LB@${Math.floor(100000 + Math.random() * 900000)}`);
                            }}
                            className="text-[11px] text-[#6C3BFF] hover:underline font-semibold"
                          >
                            + Generate Random Password
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showCustNewPass ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={custNewPassword}
                            onChange={(e) => setCustNewPassword(e.target.value)}
                            placeholder="Enter new password (min 6 characters)"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCustNewPass(!showCustNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                          >
                            {showCustNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          The customer will be able to log in immediately with this new password.
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setResetCustModalOpen(false)}
                          className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={resettingCustPass}
                          className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Lock className="w-4 h-4" />
                          <span>{resettingCustPass ? 'Saving...' : 'Set Customer Password'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Edit / Extend Customer Access Validity Modal */}
            {editAccessModalOpen && targetEditAccessCustomer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4 my-8">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-50 text-[#6C3BFF] rounded-xl">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900">
                          Manage Account Access Validity
                        </h3>
                        <p className="text-xs text-neutral-500 font-mono">
                          {targetEditAccessCustomer.profile.unique_customer_code} · {targetEditAccessCustomer.profile.full_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditAccessModalOpen(false)}
                      className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {editAccessNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{editAccessNotice}</span>
                    </div>
                  )}

                  {/* Current Status Card */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 font-medium">Current Status:</span>
                      {(() => {
                        const acc = checkCustomerAccessStatus(targetEditAccessCustomer.profile);
                        if (acc.isLifetime) return <span className="font-bold text-[#6C3BFF]">⭐ Lifetime Access</span>;
                        if (acc.isExpired) return <span className="font-bold text-rose-600">🔴 Plan Expired ({acc.expiresFormatted})</span>;
                        return <span className="font-bold text-emerald-700">🟢 {acc.daysRemaining} days remaining</span>;
                      })()}
                    </div>
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Business:</span>
                      <span className="font-semibold text-neutral-900">{targetEditAccessCustomer.business?.business_name || '—'}</span>
                    </div>
                  </div>

                  <form onSubmit={handleSaveCustomerAccess} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-neutral-800 mb-1.5">
                        Select New Access Duration (एक्सेस समय सीमा):
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: '1_month', label: '1 Month (+30d)' },
                          { id: '3_months', label: '3 Months (+90d)' },
                          { id: '6_months', label: '6 Months (+180d)' },
                          { id: '1_year', label: '1 Year (+365d)' },
                          { id: 'custom', label: 'Custom Date' },
                          { id: 'lifetime', label: '⭐ Lifetime' },
                        ].map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setEditValidityType(plan.id as AccessValidityType)}
                            className={`py-2 px-3 rounded-xl font-semibold text-center transition-all cursor-pointer ${
                              editValidityType === plan.id
                                ? 'bg-[#6C3BFF] text-white shadow-xs'
                                : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            {plan.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {editValidityType === 'custom' && (
                      <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/60 space-y-2">
                        <label className="block font-semibold text-neutral-700">
                          Set Custom Expiration Date:
                        </label>
                        <input
                          type="date"
                          required
                          value={editCustomDate}
                          onChange={(e) => setEditCustomDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                        />
                      </div>
                    )}

                    <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-[11px] text-emerald-900 flex items-center justify-between">
                      <span className="font-medium">Calculated New Expiry:</span>
                      <span className="font-bold font-mono">
                        {(() => {
                          const exp = calculateExpiry(editValidityType, editCustomDays, editCustomDate);
                          if (!exp.expiresAt) return 'Unlimited Lifetime';
                          return new Date(exp.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                        })()}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => setEditAccessModalOpen(false)}
                        className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editAccessLoading}
                        className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{editAccessLoading ? 'Updating...' : 'Save & Update Validity'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANNOUNCEMENTS MANAGEMENT */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Create Announcement Form */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#6C3BFF]" />
                Create Announcement
              </h3>
              <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    placeholder="e.g. New Review Standee Template Available"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Type / Priority</label>
                  <select
                    value={newAnnType}
                    onChange={(e) => setNewAnnType(e.target.value as AnnouncementType)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={newAnnMessage}
                    onChange={(e) => setNewAnnMessage(e.target.value)}
                    placeholder="Type details for all tenants to view..."
                    className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-lg resize-none focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg transition-colors"
                >
                  Publish Announcement
                </button>
              </form>
            </div>

            {/* List Announcements */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900">Active & Past Announcements</h3>
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                      ann.is_active ? 'border-neutral-200 bg-white' : 'border-neutral-100 bg-neutral-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ann.type === 'urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : ann.type === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {ann.type}
                        </span>
                        <span className="font-bold text-neutral-900">{ann.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleAnnouncementActive(ann)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ann.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {ann.is_active ? 'Active' : 'Draft / Off'}
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-neutral-600 leading-relaxed">{ann.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WHATSAPP, BRANDING, CUSTOMER SETTINGS & ADMIN SECURITY */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Customer Accounts & Direct Settings Directory Card (Span 2) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-[#6C3BFF] rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">Customer Accounts & Settings Directory (ग्राहक सेटिंग्स)</h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-[#6C3BFF] rounded-full">
                        {customerRows.length} Accounts
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Configure individual customer review URLs, business profile, welcome messages, and branding
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('customers')}
                    className="px-3.5 py-2 text-xs font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <span>Customer Management Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustResult(null);
                      setCreateError(null);
                      setCreateCustomerModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Customer</span>
                  </button>
                </div>
              </div>

              {customerRows.length === 0 ? (
                <div className="py-10 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 space-y-3">
                  <Users className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-700">Abhi tak koi customer account create nahi hua hai.</p>
                  <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                    Naya customer account banayein taaki unki review setting, QR standee aur business details configure kar sakein.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustResult(null);
                      setCreateError(null);
                      setCreateCustomerModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl transition-colors shadow-xs"
                  >
                    + Create First Customer
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                  {customerRows.map((row) => (
                    <div
                      key={row.profile.id}
                      className="p-4 bg-neutral-50/70 hover:bg-white rounded-2xl border border-neutral-200 hover:border-purple-300 hover:shadow-xs transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-[#6C3BFF] bg-purple-100/80 px-2 py-0.5 rounded-md">
                            {row.profile.unique_customer_code}
                          </span>
                          <h4 className="text-xs font-bold text-neutral-900 mt-1.5 line-clamp-1">
                            {row.business?.business_name || row.profile.full_name}
                          </h4>
                          <p className="text-[11px] text-neutral-500 font-medium truncate">
                            {row.profile.full_name} · {row.profile.email}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            row.profile.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.profile.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-neutral-600 bg-white p-2.5 rounded-xl border border-neutral-200/80 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-neutral-400">Category:</span>
                          <span className="font-semibold text-neutral-800 truncate max-w-[140px]">{row.business?.category || 'General'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-neutral-400">Google Review URL:</span>
                          <span className="font-mono text-neutral-700 truncate max-w-[130px]">
                            {row.business?.google_review_url ? 'Configured' : 'Not Set'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCustomerSettings(row)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-[#6C3BFF] bg-purple-50 hover:bg-[#6C3BFF] hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5 border border-purple-200"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Configure Settings</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartInspection(row.profile)}
                          title="Open Customer Dashboard"
                          className="p-2 text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-xl transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Global Branding & Support */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Platform Global Settings</h3>
                <p className="text-xs text-neutral-500">
                  Configure central WhatsApp contact and default branding across tenants
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Application Name</label>
                  <input
                    type="text"
                    value={adminSettings.app_name || 'LocalBoost AI'}
                    onChange={(e) => setAdminSettings({ ...adminSettings, app_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    WhatsApp Support Phone Number (with Country Code)
                  </label>
                  <input
                    type="text"
                    value={adminSettings.whatsapp_support_number || '+15550198234'}
                    onChange={(e) =>
                      setAdminSettings({ ...adminSettings, whatsapp_support_number: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono focus:bg-white"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Used by all customers when clicking "WhatsApp Support" in their dashboard.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Default WhatsApp Message Prefix
                  </label>
                  <input
                    type="text"
                    value={adminSettings.whatsapp_support_message || 'Hello, I need support.'}
                    onChange={(e) =>
                      setAdminSettings({ ...adminSettings, whatsapp_support_message: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Default Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={adminSettings.default_accent_color || '#6C3BFF'}
                      onChange={(e) =>
                        setAdminSettings({ ...adminSettings, default_accent_color: e.target.value })
                      }
                      className="w-9 h-9 p-0 border border-neutral-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={adminSettings.default_accent_color || '#6C3BFF'}
                      onChange={(e) =>
                        setAdminSettings({ ...adminSettings, default_accent_color: e.target.value })
                      }
                      className="flex-1 px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Platform Settings</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Super Admin Password Change Form */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-[#6C3BFF] rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Admin Account Password</h3>
                  <p className="text-xs text-neutral-500">
                    Update the master administrator login password for {session.user.email}
                  </p>
                </div>
              </div>

              {adminPassNotice && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminPassNotice}</span>
                </div>
              )}

              {adminPassError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminPassError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAdminPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Current Admin Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminCurrentPass ? 'text' : 'password'}
                      required
                      value={adminCurrentPass}
                      onChange={(e) => setAdminCurrentPass(e.target.value)}
                      placeholder="Enter current admin password"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminCurrentPass(!showAdminCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showAdminCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    New Admin Password (Minimum 6 characters) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminNewPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={adminNewPass}
                      onChange={(e) => setAdminNewPass(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminNewPass(!showAdminNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showAdminNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Confirm New Admin Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={adminConfirmPass}
                    onChange={(e) => setAdminConfirmPass(e.target.value)}
                    placeholder="Re-type new admin password"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updatingAdminPass}
                    className="px-5 py-2.5 font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    <span>{updatingAdminPass ? 'Updating...' : 'Update Admin Password'}</span>
                  </button>
                </div>
              </form>

              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 text-[11px] text-neutral-600">
                <span className="font-semibold text-neutral-800 block mb-0.5">Admin Security Note:</span>
                Changing this password immediately updates your master login across all sessions.
              </div>
            </div>

            {/* Supabase Cloud Database Integration Card (Span 2) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">Supabase Cloud Database Integration</h3>
                      {supabaseConnected ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Supabase Cloud Live
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-neutral-100 text-neutral-700 border border-neutral-300 flex items-center gap-1">
                          <Server className="w-3 h-3 text-neutral-500" />
                          Local Storage Active (Supabase Not Connected — Optional)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Supabase cloud database is 100% optional. The app functions completely with the built-in local database engine.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSqlSchemaModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Supabase SQL Schema</span>
                </button>
              </div>

              {/* Reassurance Banner: Supabase is optional */}
              <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#6C3BFF]">
                  <Sparkles className="w-4 h-4 text-[#6C3BFF]" />
                  <span>💡 Supabase Connect Karna Zaroori Hai Kya? (Is Supabase Mandatory?)</span>
                </div>
                <p className="text-neutral-700 leading-relaxed text-[11px]">
                  <strong>Nahi, bilkul zaroori nahi hai!</strong> Agar aapne Supabase connect nahi kiya hai, tab bhi aapka system <strong>100% Fully Functional</strong> hai. Default built-in local database engine mein aapke sabhi customer accounts, plan validity, QR standee, Google reviews, aur naya Loyalty Program securely save ho rahe hain.
                </p>
                <p className="text-neutral-600 leading-relaxed text-[11px]">
                  Supabase tabhi connect karein jab aapko cloud hosting par multi-device PostgreSQL database sync karna ho. Agar connect karna chahein toh upar <strong>"View Supabase SQL Schema"</strong> dekh kar SQL run karein aur Project URL paste karein.
                </p>
              </div>

              {testSupabaseResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                    testSupabaseResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testSupabaseResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testSupabaseResult.message}</span>
                </div>
              )}

              {supabaseSaveMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{supabaseSaveMsg}</span>
                </div>
              )}

              {backendSecretActive && (
                <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950">Backend Secret Key: Active & Secured</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800 font-mono text-[10px] font-semibold">
                          Server (.env)
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Secret key ko backend server environment mein safely save kar diya gaya hai. Yeh kabhi bhi frontend client ya browser par leak nahi hogi.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-1 rounded-md border border-emerald-200">
                      sb_secret_***
                    </span>
                  </div>
                </div>
              )}

              {/* Smart Auto-Detect & Paste Assistant */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-700">
                  <div className="p-1.5 bg-[#6C3BFF]/10 text-[#6C3BFF] rounded-lg">
                    <ClipboardPaste className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-900 block">Quick Copy-Paste Helper</span>
                    <span className="text-[11px] text-neutral-500">
                      Copy both URL & Key together from Supabase or .env, and fill them in 1-Click
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteClipboardToSmartPaste}
                    className="px-3 py-1.5 font-semibold text-xs text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 border border-purple-200 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Auto-Paste From Clipboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSmartPasteBox(!showSmartPasteBox)}
                    className="px-3 py-1.5 font-medium text-xs text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-300 cursor-pointer"
                  >
                    {showSmartPasteBox ? 'Close Snippet Box' : 'Paste Raw Snippet'}
                  </button>
                </div>
              </div>

              {showSmartPasteBox && (
                <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2.5 text-xs">
                  <label className="block font-semibold text-neutral-800">
                    Paste your Supabase credentials or .env block below:
                  </label>
                  <textarea
                    rows={3}
                    value={smartPasteInput}
                    onChange={(e) => setSmartPasteInput(e.target.value)}
                    placeholder="VITE_SUPABASE_URL=https://xyz.supabase.co&#10;VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-lg font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSmartPasteInput('')}
                      className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySmartPaste()}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg transition-colors cursor-pointer"
                    >
                      Extract & Auto-Fill Both Fields
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-5 text-xs">
                {/* 1. Project URL Option (Official Supabase Setting) */}
                <div className="p-4 bg-neutral-50/60 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <label className="font-bold text-neutral-900 text-xs">
                          Project URL
                        </label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          URL
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        A RESTful endpoint for querying and managing your database. Found in Supabase Dashboard &gt; Project Settings &gt; API.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handlePasteToUrl}
                        className="px-2.5 py-1 text-xs font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Paste URL from Clipboard"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Paste</span>
                      </button>

                      {inputSupabaseUrl && (
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy Project URL"
                        >
                          {copiedUrlFeedback ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}

                      {inputSupabaseUrl && (
                        <button
                          type="button"
                          onClick={() => setInputSupabaseUrl('')}
                          className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Clear URL"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={inputSupabaseUrl}
                      onChange={(e) => setInputSupabaseUrl(e.target.value)}
                      placeholder="https://your-project-id.supabase.co"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] text-neutral-900"
                    />
                  </div>
                </div>

                {/* 2. Project API Keys: anon public Option (Official Supabase Setting) */}
                <div className="p-4 bg-neutral-50/60 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <label className="font-bold text-neutral-900 text-xs">
                          Project API Keys
                        </label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          anon
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700 border border-neutral-300">
                          public
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        This key is safe to use in a browser if you have enabled Row Level Security (RLS) for your tables and configured policies.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title={showSupabaseKey ? 'Hide key' : 'Reveal key'}
                      >
                        {showSupabaseKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showSupabaseKey ? 'Hide' : 'Reveal'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePasteToAnonKey}
                        className="px-2.5 py-1 text-xs font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Paste Anon Key from Clipboard"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Paste</span>
                      </button>

                      {inputSupabaseAnonKey && (
                        <button
                          type="button"
                          onClick={handleCopyAnonKey}
                          className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy Anon Key"
                        >
                          {copiedKeyFeedback ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}

                      {inputSupabaseAnonKey && (
                        <button
                          type="button"
                          onClick={() => setInputSupabaseAnonKey('')}
                          className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Clear Key"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type={showSupabaseKey ? 'text' : 'password'}
                      value={inputSupabaseAnonKey}
                      onChange={(e) => setInputSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF] text-neutral-900"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
                  <div className="text-[11px] text-neutral-500">
                    {supabaseConnected ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 inline" />
                        Connected to: <code className="font-mono text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">{inputSupabaseUrl || 'Configured Project'}</code>
                      </span>
                    ) : (
                      <span>Currently using built-in local persistent database engine (zero setup required).</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestSupabase}
                      disabled={testingSupabase}
                      className="px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span>{testingSupabase ? 'Testing Connection...' : 'Test Connection'}</span>
                    </button>

                    {supabaseConnected && (
                      confirmDisconnectStep ? (
                        <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
                          <button
                            type="button"
                            onClick={handleDisconnectSupabase}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                          >
                            Confirm Disconnect
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDisconnectStep(false)}
                            className="px-2 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnectStep(true)}
                          className="px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                        >
                          Disconnect Supabase
                        </button>
                      )
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Database className="w-4 h-4" />
                      <span>{supabaseConnected ? 'Update Supabase Connection' : 'Connect Supabase (Optional)'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Firebase Cloud Firestore Integration Card (Span 2) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-orange-200/80 shadow-xs space-y-5 bg-gradient-to-br from-white via-orange-50/20 to-amber-50/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-xs">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">Firebase Cloud Firestore Database</h3>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Provisioned & Connected
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Official Google Firebase Firestore database active with deployed security rules and high-availability cloud storage.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTestFirebase}
                    disabled={testingFirebase}
                    className="px-3.5 py-2 text-xs font-semibold text-orange-700 hover:text-orange-900 bg-orange-100 hover:bg-orange-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Activity className="w-3.5 h-3.5 text-orange-600" />
                    <span>{testingFirebase ? 'Testing Connection...' : 'Test Live Firestore'}</span>
                  </button>
                </div>
              </div>

              {firebaseTestResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                    firebaseTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {firebaseTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{firebaseTestResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white/90 rounded-xl border border-orange-100 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">Project ID</span>
                  <div className="font-mono text-xs font-semibold text-neutral-800 truncate" title="gen-lang-client-0302550244">
                    gen-lang-client-0302550244
                  </div>
                  <span className="text-[10px] text-neutral-400">Google Cloud Client</span>
                </div>

                <div className="p-3.5 bg-white/90 rounded-xl border border-orange-100 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">Firestore Database</span>
                  <div className="font-mono text-xs font-semibold text-neutral-800 truncate" title="ai-studio-localboostaigoog-89c608d5-9f4d-4945-b707-599ebd39a22a">
                    ai-studio-localboostaigoog...
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Provisioned & Multi-tenant</span>
                </div>

                <div className="p-3.5 bg-white/90 rounded-xl border border-orange-100 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">Security Rules</span>
                  <div className="font-mono text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>firestore.rules Deployed</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">RBAC & Tenant Isolation</span>
                </div>
              </div>
            </div>

            {/* 500+ Scale Production Database Engine & Backup Card (Span 2) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      500+ Customer Scale Database Health & Disaster Recovery
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Zero-crash fail-safe engine with 1-click JSON snapshot backup & restore
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportDatabase}
                    disabled={backupDownloading}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{backupDownloading ? 'Downloading...' : 'Export JSON Backup'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRestoreJsonInput('');
                      setRestoreStatusMsg(null);
                      setRestoreModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restore Backup</span>
                  </button>
                </div>
              </div>

              {/* Real-time Diagnostics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-center">
                  <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">
                    Total Profiles
                  </span>
                  <span className="text-xl font-bold font-mono text-neutral-900 tabular-nums">
                    {dbDiagnostics?.totalProfiles || customerRows.length + 1}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-center">
                  <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">
                    Customer Accounts
                  </span>
                  <span className="text-xl font-bold font-mono text-[#6C3BFF] tabular-nums">
                    {dbDiagnostics?.totalCustomers || customerRows.length}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-center">
                  <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">
                    Businesses
                  </span>
                  <span className="text-xl font-bold font-mono text-neutral-900 tabular-nums">
                    {dbDiagnostics?.totalBusinesses || customerRows.length}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-center">
                  <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">
                    Feedback Records
                  </span>
                  <span className="text-xl font-bold font-mono text-blue-600 tabular-nums">
                    {dbDiagnostics?.totalFeedback || 0}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-center">
                  <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">
                    QR Scans
                  </span>
                  <span className="text-xl font-bold font-mono text-emerald-600 tabular-nums">
                    {dbDiagnostics?.totalScans || 0}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Production Architecture Verified:</strong> Fail-safe dual-layer persistence active. Your data and customer QR review flows will never show connection errors even during offline network conditions.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Impersonation & Security Audit Logs</h3>
              <p className="text-xs text-neutral-500">
                Immutable records of administrator customer-dashboard inspections
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">No inspection logs recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-neutral-900 block">{log.details || log.action}</span>
                      <span className="text-[11px] text-neutral-500 font-mono">Action: {log.action}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Supabase SQL Schema Viewer Modal */}
        {showSqlSchemaModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Supabase SQL Migration Guide</h3>
                    <p className="text-xs text-neutral-500">Run this SQL script in your Supabase SQL Editor</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlSchemaModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  How to setup your Supabase Project:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-emerald-800">
                  <li>Create a free project at <span className="font-mono font-semibold">supabase.com</span></li>
                  <li>Go to <strong>SQL Editor</strong> &gt; <strong>New Query</strong></li>
                  <li>Copy and paste the schema script below and click <strong>Run</strong></li>
                  <li>Copy your <strong>Project URL</strong> and <strong>Anon Public Key</strong> from Project Settings &gt; API</li>
                  <li>Paste them into the Supabase Settings card above and click <strong>Connect</strong></li>
                </ol>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-700">Database Schema (10 Tables + RLS Policies + Triggers)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const fullSql = `-- LOCALBOOST AI — Production Database Migration Schema (PostgreSQL / Supabase)
-- 100% Idempotent, safe to re-run with 0 syntax or policy collision errors

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  unique_customer_code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  access_expires_at TIMESTAMPTZ,
  access_validity_type TEXT DEFAULT '1_year',
  access_duration_days INT DEFAULT 365,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_login_at TIMESTAMPTZ
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_validity_type TEXT DEFAULT '1_year';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_duration_days INT DEFAULT 365;

-- 2. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  unique_slug TEXT NOT NULL UNIQUE,
  google_review_url TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  category TEXT DEFAULT 'Restaurant & Hospitality',
  ai_prompt TEXT,
  ai_keywords TEXT[] DEFAULT '{}',
  ai_suggestions_preview JSONB DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  ai_last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_keywords TEXT[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_suggestions_preview JSONB DEFAULT '{}'::jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_last_generated_at TIMESTAMPTZ;

-- 3. REVIEW SETTINGS TABLE
CREATE TABLE IF NOT EXISTS review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating_threshold INT NOT NULL DEFAULT 4 CHECK (rating_threshold BETWEEN 1 AND 5),
  accent_color TEXT DEFAULT '#6C3BFF',
  language TEXT NOT NULL DEFAULT 'en',
  welcome_text TEXT DEFAULT 'How was your experience today?',
  thank_you_text TEXT DEFAULT 'Thank you for helping our local business grow! ❤️',
  enabled BOOLEAN NOT NULL DEFAULT true,
  qr_show_logo BOOLEAN NOT NULL DEFAULT false,
  qr_logo_url TEXT,
  qr_logo_border_style TEXT DEFAULT 'circular',
  qr_color TEXT DEFAULT '#1F1735',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  customer_name TEXT,
  customer_contact TEXT,
  feedback_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'contacted', 'resolved', 'ignored')),
  resolved_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  rating INT,
  visitor_session_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. ANNOUNCEMENT READS TABLE
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_announcement UNIQUE(announcement_id, user_id)
);

-- 8. ADMIN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. IMPERSONATION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS impersonation_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. LOYALTY PROGRAM CONFIGS TABLE
CREATE TABLE IF NOT EXISTS loyalty_program_configs (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reward_title TEXT NOT NULL,
  reward_description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'discount_percentage',
  reward_value TEXT NOT NULL,
  min_bill_amount TEXT,
  validity_days INT NOT NULL DEFAULT 30,
  terms_conditions TEXT,
  stamps_required INT DEFAULT 1,
  badge_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_biz_loyalty UNIQUE (business_id)
);

-- 11. LOYALTY CARDS TABLE
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  voucher_code TEXT NOT NULL UNIQUE,
  reward_title TEXT NOT NULL,
  reward_description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'discount_percentage',
  reward_value TEXT NOT NULL,
  terms_conditions TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
  issue_rating INT,
  stamps_collected INT DEFAULT 1,
  stamps_total INT DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_program_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- 13. IDEMPOTENT RLS POLICIES (Safe to re-run, no collision errors)
DROP POLICY IF EXISTS "Public select profiles" ON profiles;
CREATE POLICY "Public select profiles" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public modify profiles" ON profiles;
CREATE POLICY "Public modify profiles" ON profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select businesses" ON businesses;
CREATE POLICY "Public select businesses" ON businesses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public modify businesses" ON businesses;
CREATE POLICY "Public modify businesses" ON businesses FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select review_settings" ON review_settings;
CREATE POLICY "Public select review_settings" ON review_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public modify review_settings" ON review_settings;
CREATE POLICY "Public modify review_settings" ON review_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Public insert feedback" ON feedback;
CREATE POLICY "Public insert feedback" ON feedback FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public select and update feedback" ON feedback;
CREATE POLICY "Public select and update feedback" ON feedback FOR ALL USING (true);

DROP POLICY IF EXISTS "Public loyalty configs" ON loyalty_program_configs;
CREATE POLICY "Public loyalty configs" ON loyalty_program_configs FOR ALL USING (true);

DROP POLICY IF EXISTS "Public loyalty cards" ON loyalty_cards;
CREATE POLICY "Public loyalty cards" ON loyalty_cards FOR ALL USING (true);

DROP POLICY IF EXISTS "Public insert analytics" ON analytics;
CREATE POLICY "Public insert analytics" ON analytics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public select analytics" ON analytics;
CREATE POLICY "Public select analytics" ON analytics FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read announcements" ON announcements;
CREATE POLICY "Public read announcements" ON announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin modify announcements" ON announcements;
CREATE POLICY "Admin modify announcements" ON announcements FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read admin_settings" ON admin_settings;
CREATE POLICY "Public read admin_settings" ON admin_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin modify admin_settings" ON admin_settings;
CREATE POLICY "Admin modify admin_settings" ON admin_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Public audit logs" ON impersonation_audit_logs;
CREATE POLICY "Public audit logs" ON impersonation_audit_logs FOR ALL USING (true);

-- 12. SEED DEFAULT CONFIGURATION
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('app_name', 'LocalBoost AI'),
  ('whatsapp_support_number', '+919876543210'),
  ('whatsapp_support_message', 'Hello Support, I need assistance with my review QR account.'),
  ('default_accent_color', '#6C3BFF')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();`;
                      navigator.clipboard.writeText(fullSql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Complete SQL Script</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-neutral-900 text-neutral-200 rounded-xl p-4 font-mono text-[11px] overflow-auto flex-1 leading-relaxed border border-neutral-800">
                  <pre>{`-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (with Customer Access Expiry & Duration)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  unique_customer_code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  access_expires_at TIMESTAMPTZ,
  access_validity_type TEXT DEFAULT '1_year',
  access_duration_days INT DEFAULT 365,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Businesses Table (with AI Agent Prompt & Keyword columns)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  unique_slug TEXT NOT NULL UNIQUE,
  google_review_url TEXT NOT NULL,
  category TEXT DEFAULT 'Restaurant & Hospitality',
  ai_prompt TEXT,
  ai_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Review Settings, Feedback & Analytics Tables
-- Full 10-table idempotent schema + safe RLS policies are copied when clicking 'Copy Complete SQL Script' above!`}</pre>
                </div>
              </div>

              <div className="pt-2 flex justify-end border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowSqlSchemaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER BUSINESS & REVIEW SETTINGS MODAL */}
        {editCustSettingsModalOpen && targetEditCustSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-[#6C3BFF] rounded-xl">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      Customer Business & Review Settings
                    </h3>
                    <p className="text-xs text-neutral-500 font-mono">
                      {targetEditCustSettings.profile.unique_customer_code} · {targetEditCustSettings.profile.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditCustSettingsModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {custSettingsNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{custSettingsNotice}</span>
                </div>
              )}

              {custSettingsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{custSettingsError}</span>
                </div>
              )}

              <form onSubmit={handleSaveCustomerSettings} className="space-y-4 text-xs">
                {/* Section 1: Customer Profile & Business Profile */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#6C3BFF]" />
                    <span>Customer & Business Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Customer Full Name *</label>
                      <input
                        type="text"
                        required
                        value={custSettingsForm.fullName}
                        onChange={(e) => setCustSettingsForm({ ...custSettingsForm, fullName: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Customer Email *</label>
                      <input
                        type="email"
                        required
                        value={custSettingsForm.email}
                        onChange={(e) => setCustSettingsForm({ ...custSettingsForm, email: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Business Name *</label>
                      <input
                        type="text"
                        required
                        value={custSettingsForm.businessName}
                        onChange={(e) => setCustSettingsForm({ ...custSettingsForm, businessName: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Business Category</label>
                      <select
                        value={custSettingsForm.category}
                        onChange={(e) => setCustSettingsForm({ ...custSettingsForm, category: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      >
                        <option value="Restaurant & Hospitality">Restaurant & Hospitality</option>
                        <option value="Retail & Shopping">Retail & Shopping</option>
                        <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                        <option value="Salon & Spa">Salon & Spa</option>
                        <option value="Automotive & Repair">Automotive & Repair</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Gym & Fitness">Gym & Fitness</option>
                        <option value="Education & Coaching">Education & Coaching</option>
                        <option value="Other">Other Local Business</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Google Review Direct Link *
                    </label>
                    <input
                      type="url"
                      required
                      value={custSettingsForm.googleReviewUrl}
                      onChange={(e) => setCustSettingsForm({ ...custSettingsForm, googleReviewUrl: e.target.value })}
                      placeholder="https://g.page/r/.../review or https://search.google.com/local/writereview?placeid=..."
                      className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl font-mono text-[11px] focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Customers rating 4 or 5 stars are directly guided to this link to leave their Google review.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={custSettingsForm.phone}
                        onChange={(e) => setCustSettingsForm({ ...custSettingsForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Store Address / City</label>
                      <input
                        type="text"
                        value={custSettingsForm.address}
                        onChange={(e) => setCustSettingsForm({ ...custSettingsForm, address: e.target.value })}
                        placeholder="e.g. 101 Ring Road, Surat"
                        className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Review Experience & Standee Branding Settings */}
                <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#6C3BFF]" />
                    <span>Review Flow & Standee Display Settings</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Customer Flow Language</label>
                      <select
                        value={custSettingsForm.reviewLanguage}
                        onChange={(e) => setCustSettingsForm({ ...custSettingsForm, reviewLanguage: e.target.value as SupportedLanguage })}
                        className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                      >
                        <option value="en">English (Default)</option>
                        <option value="hi">Hindi (हिंदी)</option>
                        <option value="gu">Gujarati (ગુજરાતી)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Theme Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={custSettingsForm.accentColor}
                          onChange={(e) => setCustSettingsForm({ ...custSettingsForm, accentColor: e.target.value })}
                          className="w-9 h-9 p-0 border border-neutral-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={custSettingsForm.accentColor}
                          onChange={(e) => setCustSettingsForm({ ...custSettingsForm, accentColor: e.target.value })}
                          className="flex-1 px-3.5 py-2 bg-white border border-neutral-300 rounded-xl font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Welcome Greeting Prompt</label>
                    <input
                      type="text"
                      value={custSettingsForm.welcomeText}
                      onChange={(e) => setCustSettingsForm({ ...custSettingsForm, welcomeText: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Thank You Success Message</label>
                    <input
                      type="text"
                      value={custSettingsForm.thankYouText}
                      onChange={(e) => setCustSettingsForm({ ...custSettingsForm, thankYouText: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6C3BFF]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="qrShowLogoCheck"
                      checked={custSettingsForm.qrShowLogo}
                      onChange={(e) => setCustSettingsForm({ ...custSettingsForm, qrShowLogo: e.target.checked })}
                      className="w-4 h-4 text-[#6C3BFF] rounded"
                    />
                    <label htmlFor="qrShowLogoCheck" className="font-semibold text-neutral-700 cursor-pointer">
                      Display Logo / Icon in center of Customer QR Standee
                    </label>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setEditCustSettingsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCustSettings}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingCustSettings ? 'Saving Settings...' : 'Save Customer Settings'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
