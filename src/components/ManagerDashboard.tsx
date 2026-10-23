/**
 * LocalBoost AI — Manager Control Dashboard
 * 
 * Strict Multi-Tenant RBAC:
 * - Managers can create business accounts.
 * - Managers can view and manage ONLY businesses created by them.
 * - Managers have 1-click access to the Customer Dashboard Panel for their businesses.
 * - Zero visibility into Super Admin or other managers' business accounts.
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Lock,
  LogOut,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  KeyRound,
  Shield,
  MessageSquare,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  AuthSession,
  Business,
  Profile,
  UserStatus,
  CUSTOMER_FEATURE_CATALOG,
  ALL_CUSTOMER_FEATURE_KEYS,
} from '../types/database';
import {
  getManagerCustomersList,
  createCustomerByManager,
  updateCustomerByManager,
  deleteCustomerByManager,
  accessCustomerPanelByManager,
  ManagerCustomerRow,
} from '../lib/db';

interface ManagerDashboardProps {
  session: AuthSession;
  onOpenCustomerPanel: (customerSession: AuthSession) => void;
  onSignOut: () => void;
  onOpenLiveReview?: (slug: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  session,
  onOpenCustomerPanel,
  onSignOut,
  onOpenLiveReview,
}) => {
  const manager = session.user;
  const [customers, setCustomers] = useState<ManagerCustomerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create Business Modal State
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newBizName, setNewBizName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState('Restaurant & Hospitality');
  const [newGoogleReviewUrl, setNewGoogleReviewUrl] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAllowedFeatures, setNewAllowedFeatures] = useState<string[]>([...ALL_CUSTOMER_FEATURE_KEYS]);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // Created Credentials Success Modal
  const [createdSuccessData, setCreatedSuccessData] = useState<{
    user: Profile;
    business: Business;
    tempPassword?: string;
  } | null>(null);

  // Edit Business Modal State
  const [editModalItem, setEditModalItem] = useState<ManagerCustomerRow | null>(null);
  const [editBizName, setEditBizName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGoogleReviewUrl, setEditGoogleReviewUrl] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editPassword, setEditPassword] = useState('');
  const [editAllowedFeatures, setEditAllowedFeatures] = useState<string[]>([...ALL_CUSTOMER_FEATURE_KEYS]);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteItem, setDeleteItem] = useState<ManagerCustomerRow | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchManagedData = async () => {
    setLoading(true);
    try {
      const list = await getManagerCustomersList(manager.id);
      setCustomers(list);
    } catch (err: any) {
      setNotice({ message: err.message || 'Failed to load managed businesses.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagedData();
  }, [manager.id]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setCreateModalError(null);
    setNewBizName('');
    setNewOwnerName('');
    setNewEmail('');
    setNewPhone('');
    setNewCategory('Restaurant & Hospitality');
    setNewGoogleReviewUrl('');
    setNewAddress('');
    setNewPassword('');
    setNewAllowedFeatures([...ALL_CUSTOMER_FEATURE_KEYS]);
    setCreateModalOpen(true);
  };

  // Handle Create Business
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    const cleanBiz = newBizName.trim();
    const cleanOwner = newOwnerName.trim();
    const cleanMail = newEmail.trim().toLowerCase();

    if (!cleanBiz) {
      setCreateModalError('Business / Store Name enter karna anivarya hai (दुकान/बिज़नेस का नाम आवश्यक है).');
      return;
    }
    if (!cleanOwner) {
      setCreateModalError('Owner Full Name enter karna anivarya hai (मालिक का नाम आवश्यक है).');
      return;
    }
    if (!cleanMail) {
      setCreateModalError('Login Email address enter karna anivarya hai (ईमेल आवश्यक है).');
      return;
    }
    if (!cleanMail.includes('@') || !cleanMail.includes('.')) {
      setCreateModalError('Kripya valid email address dalein (jaise: store@gmail.com).');
      return;
    }

    setCreating(true);
    try {
      const result = await createCustomerByManager({
        managerId: manager.id,
        managerName: manager.full_name,
        managerEmail: manager.email,
        fullName: cleanOwner,
        email: cleanMail,
        password: newPassword.trim() || undefined,
        businessName: cleanBiz,
        phone: newPhone.trim(),
        category: newCategory,
        googleReviewUrl: newGoogleReviewUrl.trim(),
        address: newAddress.trim(),
        allowedFeatures: newAllowedFeatures.length > 0 ? newAllowedFeatures : ['ai_chat'],
      });

      const newRow: ManagerCustomerRow = {
        id: result.business.id,
        user_id: result.user.id,
        business: result.business,
        profile: result.user,
        settings: null,
        password: result.tempPassword,
      };
      setCustomers((prev) => [newRow, ...prev.filter((r) => r.id !== newRow.id)]);

      setCreateModalOpen(false);
      setCreatedSuccessData(result);
      showToast(`Business "${result.business.business_name}" created successfully!`);
      // Reset form
      setNewBizName('');
      setNewOwnerName('');
      setNewEmail('');
      setNewPhone('');
      setNewGoogleReviewUrl('');
      setNewAddress('');
      setNewPassword('');
      await fetchManagedData();
    } catch (err: any) {
      console.error('Error creating business account:', err);
      setCreateModalError(err.message || 'Business account create karne me samasya aayi.');
    } finally {
      setCreating(false);
    }
  };

  // Handle Open Customer Dashboard Panel
  const handleOpenPanel = async (row: ManagerCustomerRow) => {
    try {
      const customerSession = await accessCustomerPanelByManager({
        managerId: manager.id,
        customerId: row.user_id,
        businessId: row.id,
      });
      onOpenCustomerPanel(customerSession);
    } catch (err: any) {
      showToast(err.message || 'Failed to access customer dashboard.', 'error');
    }
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem) return;
    setEditModalError(null);

    setUpdating(true);
    try {
      await updateCustomerByManager({
        managerId: manager.id,
        customerId: editModalItem.user_id,
        businessId: editModalItem.id,
        fullName: editOwnerName.trim(),
        phone: editPhone.trim(),
        password: editPassword.trim() || undefined,
        businessName: editBizName.trim(),
        googleReviewUrl: editGoogleReviewUrl.trim(),
        address: editAddress.trim(),
        category: editCategory,
        status: editStatus,
        allowedFeatures: editAllowedFeatures.length > 0 ? editAllowedFeatures : ['ai_chat'],
      });

      showToast(`Business details updated successfully!`);
      setEditModalItem(null);
      setEditPassword('');
      await fetchManagedData();
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update business details.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteCustomerByManager({
        managerId: manager.id,
        customerId: deleteItem.user_id,
        businessId: deleteItem.id,
      });
      showToast('Business account removed.');
      setDeleteItem(null);
      fetchManagedData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete business.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      c.business.business_name.toLowerCase().includes(q) ||
      (c.profile?.full_name && c.profile.full_name.toLowerCase().includes(q)) ||
      (c.profile?.email && c.profile.email.toLowerCase().includes(q)) ||
      (c.business.phone && c.business.phone.includes(q)) ||
      c.business.unique_slug.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.profile?.status === 'active') ||
      (statusFilter === 'disabled' && c.profile?.status === 'disabled');

    return matchQuery && matchStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-16 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6C3BFF] to-[#8052FF] text-white flex items-center justify-center font-extrabold shadow-md shadow-purple-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-neutral-950">Manager Panel</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#6C3BFF] border border-purple-200">
                  Manager Role
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">{manager.full_name} • {manager.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Business Account</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Notice Toast */}
        {notice && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in shadow-xs ${
              notice.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notice.message}</span>
            </div>
            <button type="button" onClick={() => setNotice(null)} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Overview Stats Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#6C3BFF] border border-purple-100 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">Your Created Businesses</p>
              <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight">{customers.length}</h3>
              <p className="text-[11px] text-purple-600 font-medium">100% Isolated to Your Account</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">Active Live Accounts</p>
              <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                {customers.filter((c) => c.profile?.status === 'active').length}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium">Ready for QR &amp; Chat</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">Manager Security Tier</p>
              <h3 className="text-lg font-bold text-neutral-900">Protected Isolation</h3>
              <p className="text-[11px] text-neutral-500">Cannot view Super Admin accounts</p>
            </div>
          </div>
        </div>

        {/* Business Accounts Header & Filter Bar */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-neutral-900">Your Managed Businesses (आपके बनाए गए कस्टमर्स)</h2>
              <p className="text-xs text-neutral-500">
                You can create, modify, and directly access the full dashboard panel of any business listed below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchManagedData}
                disabled={loading}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business name, owner, email, phone, or slug..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Active ({customers.filter((c) => c.profile?.status === 'active').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('disabled')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'disabled' ? 'bg-white text-rose-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Disabled ({customers.filter((c) => c.profile?.status === 'disabled').length})
              </button>
            </div>
          </div>

          {/* Business Table */}
          {loading ? (
            <div className="py-16 text-center text-xs text-neutral-400">Loading your managed businesses...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6C3BFF] border border-purple-100 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-neutral-800">No Business Accounts Found</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No accounts match your search filter.'
                    : 'You haven’t created any business accounts yet. Click below to add your first customer!'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs shadow-purple-600/30 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Business</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-bold">
                    <th className="py-3 px-3">Business &amp; Slug</th>
                    <th className="py-3 px-3">Owner &amp; Credentials</th>
                    <th className="py-3 px-3">Category &amp; Phone</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredCustomers.map((row) => {
                    const biz = row.business;
                    const prof = row.profile;
                    const isActive = prof?.status === 'active';

                    return (
                      <tr key={biz.id} className="hover:bg-neutral-50/70 transition-colors">
                        {/* Business & Slug */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                            <span>{biz.business_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500">
                            <span className="font-mono text-purple-600 font-semibold">/c/{biz.unique_slug}</span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/?c=${biz.unique_slug}`;
                                copyToClipboard(url, `chat_${biz.id}`);
                              }}
                              className="text-[10px] text-neutral-400 hover:text-purple-600 cursor-pointer flex items-center gap-1"
                              title="Copy Chat Link"
                            >
                              {copiedId === `chat_${biz.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Copy Chat</span>
                            </button>
                          </div>
                        </td>

                        {/* Owner & Credentials */}
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-neutral-800">{prof?.full_name || 'Store Owner'}</div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-neutral-400" />
                            <span>{prof?.email}</span>
                          </div>
                          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                            Password: <span className="text-neutral-700 font-semibold">{row.password || '••••••••'}</span>
                          </div>
                        </td>

                        {/* Category & Phone */}
                        <td className="py-3.5 px-3 text-neutral-600">
                          <div className="font-medium text-neutral-700">{biz.category || 'Retail & Local'}</div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span>{biz.phone || prof?.phone || 'No phone'}</span>
                          </div>
                        </td>

                        {/* Status & Allowed Features */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{isActive ? 'Active' : 'Disabled'}</span>
                            </span>
                            <div>
                              {(() => {
                                const feats = biz.allowed_features || prof?.allowed_features;
                                if (!feats || feats.length === 0 || feats.length >= ALL_CUSTOMER_FEATURE_KEYS.length) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-[#6C3BFF] border border-purple-200">
                                      ✨ All Features
                                    </span>
                                  );
                                }
                                if (feats.length === 1 && feats[0] === 'ai_chat') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      💬 Only AI Chatbot
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    🔒 {feats.length} Features Active
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Open Customer Panel */}
                            <button
                              type="button"
                              onClick={() => handleOpenPanel(row)}
                              className="px-3 py-1.5 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Open this business's full dashboard panel"
                            >
                              <span>Open Panel</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            {/* Edit Business */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditModalItem(row);
                                setEditBizName(biz.business_name || '');
                                setEditOwnerName(prof?.full_name || '');
                                setEditPhone(biz.phone || prof?.phone || '');
                                setEditCategory(biz.category || 'Restaurant & Hospitality');
                                setEditAddress(biz.address || '');
                                setEditGoogleReviewUrl(biz.google_review_url || '');
                                setEditStatus(prof?.status || 'active');
                                setEditPassword('');
                                const currentFeats = biz.allowed_features || prof?.allowed_features;
                                setEditAllowedFeatures(
                                  Array.isArray(currentFeats) && currentFeats.length > 0
                                    ? [...currentFeats]
                                    : [...ALL_CUSTOMER_FEATURE_KEYS]
                                );
                              }}
                              className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Business & Feature Access"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setDeleteItem(row)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Business"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* CREATE BUSINESS MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-neutral-200 shadow-2xl animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Create New Business Account (नया बिज़नेस अकाउंट बनाएं)</h3>
                <p className="text-xs text-neutral-500">This business will be assigned directly under your manager account.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateModalError(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* IN-MODAL ERROR BANNER */}
            {createModalError && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold rounded-2xl flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-bold text-rose-800">Error / समस्या:</p>
                  <p className="text-rose-700 leading-relaxed">{createModalError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalError(null)}
                  className="text-rose-400 hover:text-rose-600 text-sm font-bold"
                >
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleCreateBusiness} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">
                    Business / Store Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBizName}
                    onChange={(e) => {
                      setNewBizName(e.target.value);
                      if (createModalError) setCreateModalError(null);
                    }}
                    placeholder="e.g. Royal Sweets & Bakery"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Business Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  >
                    <option value="Restaurant & Hospitality">Restaurant &amp; Hospitality</option>
                    <option value="Retail & Shopping">Retail &amp; Shopping</option>
                    <option value="Healthcare & Clinic">Healthcare &amp; Clinic</option>
                    <option value="Salon & Spa">Salon &amp; Spa</option>
                    <option value="Automotive & Repairs">Automotive &amp; Repairs</option>
                    <option value="Gym & Fitness">Gym &amp; Fitness</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">
                    Owner Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newOwnerName}
                    onChange={(e) => {
                      setNewOwnerName(e.target.value);
                      if (createModalError) setCreateModalError(null);
                    }}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">
                    Login Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      if (createModalError) setCreateModalError(null);
                    }}
                    placeholder="e.g. store@business.com"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Phone / WhatsApp Number (Optional)</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Initial Password (Optional)</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Google Maps / Review URL (Optional)</label>
                <input
                  type="text"
                  value={newGoogleReviewUrl}
                  onChange={(e) => setNewGoogleReviewUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... ya g.page/..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
                <p className="text-[10px] text-neutral-400">Yahan Google Review ka link dalein (optional).</p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Physical Store Address (Optional)</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Shop 4, Main Market Road, City"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              {/* FEATURE ACCESS CONTROL (फीचर एक्सेस कंट्रोल) */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="font-extrabold text-neutral-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#6C3BFF]" />
                      <span>Feature Access Control (कौन से फीचर्स का एक्सेस देना है?)</span>
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      Customer ko sirf wahi tabs aur features dikhenge jo aap yahan select karenge.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#6C3BFF] bg-white px-2.5 py-0.5 rounded-full border border-purple-200 shrink-0">
                    {newAllowedFeatures.length === 1 && newAllowedFeatures[0] === 'ai_chat'
                      ? '💬 Only AI Chatbot'
                      : `${newAllowedFeatures.length} / ${ALL_CUSTOMER_FEATURE_KEYS.length} Selected`}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewAllowedFeatures([...ALL_CUSTOMER_FEATURE_KEYS])}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border text-center ${
                      newAllowedFeatures.length === ALL_CUSTOMER_FEATURE_KEYS.length
                        ? 'bg-[#6C3BFF] text-white border-[#6C3BFF] shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    ✨ All Features (सभी)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAllowedFeatures(['ai_chat'])}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border text-center ${
                      newAllowedFeatures.length === 1 && newAllowedFeatures[0] === 'ai_chat'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    💬 Only Chatbot (सिर्फ चैटबॉट)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewAllowedFeatures(['dashboard', 'qrcode', 'ai_agent', 'analytics', 'feedback', 'business', 'settings'])
                    }
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border text-center ${
                      newAllowedFeatures.length === 7 &&
                      newAllowedFeatures.includes('qrcode') &&
                      !newAllowedFeatures.includes('ai_chat')
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    ⭐ QR &amp; Reviews Only
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewAllowedFeatures(['ai_chat', 'loyalty', 'scratch_offers', 'whatsapp_marketing', 'birthday'])
                    }
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border text-center ${
                      newAllowedFeatures.length === 5 &&
                      newAllowedFeatures.includes('ai_chat') &&
                      newAllowedFeatures.includes('loyalty')
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    🎁 Chat + Rewards
                  </button>
                </div>

                {/* Individual Feature Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 pt-1">
                  {CUSTOMER_FEATURE_CATALOG.map((feat) => {
                    const checked = newAllowedFeatures.includes(feat.id);
                    return (
                      <label
                        key={feat.id}
                        className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] cursor-pointer transition-all ${
                          checked
                            ? 'bg-white border-purple-300 text-neutral-900 shadow-2xs'
                            : 'bg-white/50 border-neutral-200/70 text-neutral-400 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAllowedFeatures((prev) => Array.from(new Set([...prev, feat.id])));
                            } else {
                              if (newAllowedFeatures.length <= 1) return; // keep at least 1 feature
                              setNewAllowedFeatures((prev) => prev.filter((k) => k !== feat.id));
                            }
                          }}
                          className="mt-0.5 rounded text-[#6C3BFF] focus:ring-[#6C3BFF]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold leading-tight flex items-center gap-1">
                            <span>{feat.label}</span>
                            {feat.id === 'ai_chat' && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-extrabold">
                                Chatbot
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">{feat.hindiLabel}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setCreateModalError(null);
                  }}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creating ? 'Creating Account...' : 'Create Business (बिज़नेस बनाएं)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATED ACCOUNT SUCCESS CREDENTIALS MODAL */}
      {createdSuccessData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-neutral-200 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-neutral-900">Business Account Created! (बिज़नेस बन गया)</h3>
              <p className="text-xs text-neutral-500">
                Aapke manager portfolio me naya customer account successfully create ho gaya hai.
              </p>
            </div>

            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Business Name:</span>
                <span className="font-bold text-neutral-900">{createdSuccessData.business.business_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Customer ID Code:</span>
                <span className="font-mono font-bold text-purple-700">{createdSuccessData.user.unique_customer_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Owner Name:</span>
                <span className="font-semibold text-neutral-800">{createdSuccessData.user.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Login Email:</span>
                <span className="font-mono font-semibold text-neutral-800">{createdSuccessData.user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Password:</span>
                <span className="font-mono font-bold text-purple-700">{createdSuccessData.tempPassword}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Short Chat Link:</span>
                <span className="font-mono text-purple-600">/c/{createdSuccessData.business.unique_slug}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const row: ManagerCustomerRow = {
                    id: createdSuccessData.business.id,
                    user_id: createdSuccessData.user.id,
                    business: createdSuccessData.business,
                    profile: createdSuccessData.user,
                    settings: null,
                    password: createdSuccessData.tempPassword,
                  };
                  setCreatedSuccessData(null);
                  handleOpenPanel(row);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-[#6C3BFF] to-[#8C52FF] hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Customer Panel Now (कस्टमर पैनल खोलें)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const shareText = `Hello ${createdSuccessData.user.full_name}!\nYour ${createdSuccessData.business.business_name} account has been created.\nCustomer Code: ${createdSuccessData.user.unique_customer_code}\nLogin Email: ${createdSuccessData.user.email}\nPassword: ${createdSuccessData.tempPassword}\nLive Review Page: ${window.location.origin}/?c=${createdSuccessData.business.unique_slug}\nLogin URL: ${window.location.origin}/#login`;
                  copyToClipboard(shareText, 'share_all');
                  showToast('Account details copied to clipboard!');
                }}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copiedId === 'share_all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'share_all' ? 'Copied Details!' : 'Copy Credentials for Owner'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="flex-1 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  + Add Another
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedSuccessData(null)}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BUSINESS MODAL */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Edit Business Details</h3>
                <p className="text-xs text-neutral-500">Modify store information and access status.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModalItem(null);
                  setEditModalError(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editModalError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Business Name</label>
                <input
                  type="text"
                  required
                  value={editBizName}
                  onChange={(e) => setEditBizName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Store Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Google Review URL</label>
                <input
                  type="url"
                  value={editGoogleReviewUrl}
                  onChange={(e) => setEditGoogleReviewUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Customer Password (Login Password)</label>
                <input
                  type="text"
                  placeholder="Leave blank to keep unchanged (Min. 6 chars to change)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
                <p className="text-[10px] text-neutral-400">Manager can change any details or reset passwords for their created businesses anytime.</p>
              </div>

              {/* EDIT FEATURE ACCESS CONTROL */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="font-extrabold text-neutral-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#6C3BFF]" />
                      <span>Feature Access Control (फीचर एक्सेस बदलें)</span>
                    </label>
                    <p className="text-[10px] text-neutral-500">
                      Select which modules this customer can see and use in their dashboard.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#6C3BFF] bg-white px-2.5 py-0.5 rounded-full border border-purple-200 shrink-0">
                    {editAllowedFeatures.length === 1 && editAllowedFeatures[0] === 'ai_chat'
                      ? '💬 Only AI Chatbot'
                      : `${editAllowedFeatures.length} / ${ALL_CUSTOMER_FEATURE_KEYS.length} Enabled`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditAllowedFeatures([...ALL_CUSTOMER_FEATURE_KEYS])}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer border text-center ${
                      editAllowedFeatures.length === ALL_CUSTOMER_FEATURE_KEYS.length
                        ? 'bg-[#6C3BFF] text-white border-[#6C3BFF]'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    ✨ All Features
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditAllowedFeatures(['ai_chat'])}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer border text-center ${
                      editAllowedFeatures.length === 1 && editAllowedFeatures[0] === 'ai_chat'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    💬 Only Chatbot
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditAllowedFeatures(['dashboard', 'qrcode', 'ai_agent', 'analytics', 'feedback', 'business', 'settings'])
                    }
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer border text-center ${
                      editAllowedFeatures.length === 7 &&
                      editAllowedFeatures.includes('qrcode') &&
                      !editAllowedFeatures.includes('ai_chat')
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    ⭐ QR &amp; Reviews
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditAllowedFeatures(['ai_chat', 'loyalty', 'scratch_offers', 'whatsapp_marketing', 'birthday'])
                    }
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer border text-center ${
                      editAllowedFeatures.length === 5 &&
                      editAllowedFeatures.includes('ai_chat') &&
                      editAllowedFeatures.includes('loyalty')
                        ? 'bg-amber-500 text-neutral-950 border-amber-500'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    🎁 Chat + Rewards
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1 pt-1">
                  {CUSTOMER_FEATURE_CATALOG.map((feat) => {
                    const checked = editAllowedFeatures.includes(feat.id);
                    return (
                      <label
                        key={feat.id}
                        className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] cursor-pointer transition-all ${
                          checked
                            ? 'bg-white border-purple-300 text-neutral-900'
                            : 'bg-white/50 border-neutral-200/70 text-neutral-400 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditAllowedFeatures((prev) => Array.from(new Set([...prev, feat.id])));
                            } else {
                              if (editAllowedFeatures.length <= 1) return;
                              setEditAllowedFeatures((prev) => prev.filter((k) => k !== feat.id));
                            }
                          }}
                          className="mt-0.5 rounded text-[#6C3BFF] focus:ring-[#6C3BFF]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold leading-tight">{feat.label}</div>
                          <div className="text-[10px] text-neutral-500 truncate">{feat.hindiLabel}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-neutral-200 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-neutral-900">Delete Business Account?</h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to delete <span className="font-bold text-neutral-800">{deleteItem.business.business_name}</span>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
