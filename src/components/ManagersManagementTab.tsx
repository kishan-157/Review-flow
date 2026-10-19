/**
 * LocalBoost AI — Super Admin Managers Management Tab
 * 
 * Allows Super Admin to:
 * - Create new Managers (Name, Email, Password, Phone, Status).
 * - View all Managers and the businesses each Manager has created.
 * - Edit Manager details and reset passwords.
 * - Toggle Active / Disabled status or delete managers.
 * - 1-Click access or inspect any business created under any manager.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Plus,
  Search,
  Key,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  getAdminManagersList,
  createManagerByAdmin,
  updateManagerByAdmin,
  deleteManagerByAdmin,
  ManagerRow,
} from '../lib/db';
import { AuthSession } from '../types/database';

interface ManagersManagementTabProps {
  onImpersonateBusiness?: (businessId: string) => void;
}

export const ManagersManagementTab: React.FC<ManagersManagementTabProps> = ({
  onImpersonateBusiness,
}) => {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Expanded Manager ID for viewing businesses
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null);

  // Create Manager Modal State
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');

  // Edit Manager Modal State
  const [editManager, setEditManager] = useState<ManagerRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Delete Confirmation State
  const [deleteManagerItem, setDeleteManagerItem] = useState<ManagerRow | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const data = await getAdminManagersList();
      setManagers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load managers list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle Create Manager
  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('Name and Email are required.', 'error');
      return;
    }

    setCreating(true);
    try {
      const result = await createManagerByAdmin({
        fullName: fullName.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        phone: phone.trim() || undefined,
        status,
      });

      showToast(`Manager "${result.manager.full_name}" created successfully!`);
      setCreateModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setStatus('active');
      fetchManagers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create manager.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Handle Update Manager
  const handleUpdateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editManager) return;

    setUpdating(true);
    try {
      await updateManagerByAdmin({
        managerId: editManager.id,
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        status: editStatus,
        password: editPassword.trim() || undefined,
      });

      showToast('Manager details updated.');
      setEditManager(null);
      fetchManagers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update manager.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Handle Delete Manager
  const handleDeleteManager = async () => {
    if (!deleteManagerItem) return;
    setDeleting(true);
    try {
      await deleteManagerByAdmin(deleteManagerItem.id);
      showToast('Manager removed successfully.');
      setDeleteManagerItem(null);
      fetchManagers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete manager.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filter Managers
  const filteredManagers = managers.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      m.unique_customer_code.toLowerCase().includes(q)
    );
  });

  const totalBusinessesUnderManagers = managers.reduce((acc, m) => acc + m.businesses_count, 0);

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#6C3BFF] border border-purple-100 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Managers</p>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{managers.length}</h3>
            <p className="text-[11px] text-purple-600 font-medium">Sub-Admin Accounts</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Businesses Created by Managers</p>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{totalBusinessesUnderManagers}</h3>
            <p className="text-[11px] text-blue-600 font-medium">Across all manager portfolios</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Managers</p>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {managers.filter((m) => m.status === 'active').length}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium">Authorized to manage customers</p>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Manager &amp; Sub-Admin Management (मैनेजर प्रबंधन)</h3>
            <p className="text-xs text-slate-500">
              Create and manage sub-admins. Each manager can create and access businesses, with strict isolation so they can only see their own accounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchManagers}
              disabled={loading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Refresh managers"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Manager</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search managers by name, email, phone, or code..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
          />
        </div>

        {/* Table of Managers */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading managers...</div>
        ) : filteredManagers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6C3BFF] border border-purple-100 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">No Managers Created Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'No managers found matching your search.'
                  : 'Add your first manager account so they can onboard and manage their own local businesses independently.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Manager</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-3">Manager Name &amp; Code</th>
                  <th className="py-3 px-3">Contact &amp; Login</th>
                  <th className="py-3 px-3">Password</th>
                  <th className="py-3 px-3">Managed Businesses</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredManagers.map((mgr) => {
                  const isExpanded = expandedManagerId === mgr.id;
                  const showPass = visiblePasswords[mgr.id];
                  const isActive = mgr.status === 'active';

                  return (
                    <React.Fragment key={mgr.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* Name & Code */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 text-sm">{mgr.full_name}</div>
                          <div className="text-[11px] font-mono text-purple-700 font-semibold mt-0.5">
                            {mgr.unique_customer_code}
                          </div>
                        </td>

                        {/* Contact & Login */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">{mgr.email}</span>
                          </div>
                          {mgr.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{mgr.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Password */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {showPass ? mgr.current_password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(mgr.id)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                              title={showPass ? 'Hide Password' : 'Show Password'}
                            >
                              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(mgr.current_password || '', `pass_${mgr.id}`)}
                              className="text-slate-400 hover:text-purple-600 cursor-pointer p-0.5"
                              title="Copy Password"
                            >
                              {copiedKey === `pass_${mgr.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Managed Businesses Count & Expand */}
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            onClick={() => setExpandedManagerId(isExpanded ? null : mgr.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 transition-colors cursor-pointer"
                          >
                            <Building2 className="w-3.5 h-3.5 text-[#6C3BFF]" />
                            <span>{mgr.businesses_count} Businesses</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
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
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditManager(mgr);
                                setEditFullName(mgr.full_name);
                                setEditEmail(mgr.email);
                                setEditPhone(mgr.phone || '');
                                setEditStatus(mgr.status);
                                setEditPassword('');
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Edit Manager"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteManagerItem(mgr)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Manager"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Drawer: List of Businesses created by this Manager */}
                      {isExpanded && (
                        <tr className="bg-purple-50/40">
                          <td colSpan={6} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#6C3BFF]" />
                                <span>Businesses Created by {mgr.full_name} ({mgr.businesses.length})</span>
                              </h5>
                              <span className="text-[11px] text-slate-500">
                                This manager has exclusive access to these accounts.
                              </span>
                            </div>

                            {mgr.businesses.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">This manager has not created any business accounts yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {mgr.businesses.map((b) => (
                                  <div
                                    key={b.id}
                                    className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1.5"
                                  >
                                    <div className="font-bold text-slate-900 text-xs truncate">{b.business_name}</div>
                                    <div className="text-[11px] text-slate-500 truncate">{b.category || 'Local Business'}</div>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                                      <span className="font-mono text-purple-600">/c/{b.unique_slug}</span>
                                      {onImpersonateBusiness && (
                                        <button
                                          type="button"
                                          onClick={() => onImpersonateBusiness(b.id)}
                                          className="text-[#6C3BFF] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <span>Inspect</span>
                                          <ArrowRight className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MANAGER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Create New Manager</h3>
                <p className="text-xs text-slate-500">Manager can create and manage their own businesses.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Manager Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Vikram Singhania"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Manager Login Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. manager@localboost.ai"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Manager Password (Optional)</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#6C3BFF] hover:bg-[#5A2DE2] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MANAGER MODAL */}
      {editManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Edit Manager Account</h3>
                <p className="text-xs text-slate-500">Update details or reset login password.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditManager(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateManager} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reset Password (leave empty to keep current)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditManager(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
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

      {/* DELETE MANAGER MODAL */}
      {deleteManagerItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Delete Manager Account?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete manager <span className="font-bold text-slate-800">{deleteManagerItem.full_name}</span>?
                Businesses created by this manager will remain safe in the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteManagerItem(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteManager}
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
