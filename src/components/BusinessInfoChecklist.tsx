/**
 * LocalBoost AI — Interactive Business Information Checklist Component
 *
 * Implements Section 4 Checklist Interface:
 * - Filters for All, Complete, Missing, Needs Verification, and Not Applicable.
 * - Field name, current value, status, edit action, save confirmation, validation errors.
 * - "Complete Missing Information" quick action.
 * - "Preview Public Chatbot Information" modal.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Slash,
  Eye,
  Check,
  Edit2,
  X,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Package,
  FileText,
  PhoneCall,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  BusinessProfileInfo,
  ChecklistFieldStatus,
  ProductServiceItem,
  BusinessFaqItem,
} from '../types/database';
import {
  computeChecklistStatus,
  ChecklistItemRow,
  filterPublicChatbotInfo,
  PublicBusinessChatProfile,
  synthesizePromptFromChecklist,
} from '../lib/businessInfoService';

interface BusinessInfoChecklistProps {
  info: BusinessProfileInfo;
  onUpdateInfo: (updated: BusinessProfileInfo) => Promise<void> | void;
  onApplyPromptSync?: (newPrompt: string) => void;
}

export const BusinessInfoChecklist: React.FC<BusinessInfoChecklistProps> = ({
  info,
  onUpdateInfo,
  onApplyPromptSync,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingItem, setEditingItem] = useState<ChecklistItemRow | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const checklist = computeChecklistStatus(info);

  // Filter items
  const filteredItems = checklist.items.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.sectionTitle.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartEdit = (item: ChecklistItemRow) => {
    setEditingItem(item);
    setEditValue(item.value === 'No' ? '' : item.value);
  };

  const handleSaveField = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    const updated: BusinessProfileInfo = JSON.parse(JSON.stringify(info));

    // Update field in appropriate section
    switch (editingItem.key) {
      case 'business_name':
        updated.business_name = editValue.trim() || updated.business_name;
        break;
      case 'category':
        updated.category = editValue.trim() || updated.category;
        break;
      case 'short_description':
        updated.short_description = editValue.trim();
        break;
      case 'address':
        updated.address = editValue.trim();
        break;
      case 'city_pincode': {
        const parts = editValue.split('-').map((s) => s.trim());
        updated.city = parts[0] || '';
        updated.pincode = parts[1] || '';
        break;
      }
      case 'phone':
        updated.phone = editValue.trim();
        break;
      case 'whatsapp':
        updated.whatsapp = editValue.trim();
        break;
      case 'google_maps_url':
        updated.google_maps_url = editValue.trim();
        break;
      case 'website_url':
        updated.website_url = editValue.trim();
        break;
      case 'owner_name':
        updated.owner_name = editValue.trim();
        updated.owner_name_public_approved = true;
        break;
      case 'payment_methods':
        updated.policies.payment_methods = editValue
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case 'delivery_policy':
        updated.policies.delivery = editValue.trim();
        break;
      case 'return_policy':
        updated.policies.return_exchange = editValue.trim();
        break;
      default:
        break;
    }

    // Set field status to complete if value present
    if (!updated.field_status) updated.field_status = {};
    updated.field_status[editingItem.key] = editValue.trim().length > 0 ? 'complete' : 'missing';
    updated.last_verified_at = new Date().toISOString();

    try {
      await onUpdateInfo(updated);
      if (onApplyPromptSync) {
        const newPrompt = synthesizePromptFromChecklist(updated);
        onApplyPromptSync(newPrompt);
      }
      setSaveSuccessMsg(`Saved "${editingItem.label}" successfully!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      setEditingItem(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item: ChecklistItemRow, newStatus: ChecklistFieldStatus) => {
    const updated: BusinessProfileInfo = JSON.parse(JSON.stringify(info));
    if (!updated.field_status) updated.field_status = {};
    updated.field_status[item.key] = newStatus;
    updated.last_verified_at = new Date().toISOString();

    await onUpdateInfo(updated);
    setSaveSuccessMsg(`Marked "${item.label}" as ${newStatus.replace('_', ' ')}.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const getSectionIcon = (section: ChecklistItemRow['section']) => {
    switch (section) {
      case 'identity':
        return <Building2 className="w-4 h-4 text-purple-600" />;
      case 'hours':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'products':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'policies':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'contact':
        return <PhoneCall className="w-4 h-4 text-indigo-600" />;
      case 'faqs':
        return <MessageSquare className="w-4 h-4 text-rose-600" />;
    }
  };

  const publicProfile = filterPublicChatbotInfo(info);

  return (
    <div className="space-y-6">
      {/* Overview Header with Progress */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-[#6C3BFF]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Business Information Checklist</span>
            </div>
            <h3 className="text-lg font-bold text-neutral-900">
              Verified Business Profile & Chatbot Knowledge
            </h3>
            <p className="text-xs text-neutral-500 max-w-xl">
              Complete your business details. The local chatbot answers questions using only verified data stored here.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Public Chatbot Info</span>
            </button>
            {checklist.percentage < 100 && (
              <button
                type="button"
                onClick={() => setFilterStatus('missing')}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Complete Missing Info</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-700">Checklist Completion</span>
            <span className="font-bold text-[#6C3BFF]">
              {checklist.percentage}% ({checklist.completedCount} of {checklist.totalApplicable} Complete)
            </span>
          </div>
          <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6C3BFF] to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${checklist.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Items', count: checklist.items.length },
              {
                id: 'complete',
                label: 'Complete',
                count: checklist.items.filter((i) => i.status === 'complete').length,
              },
              {
                id: 'missing',
                label: 'Missing',
                count: checklist.items.filter((i) => i.status === 'missing').length,
              },
              {
                id: 'needs_verification',
                label: 'Needs Verification',
                count: checklist.items.filter((i) => i.status === 'needs_verification').length,
              },
              {
                id: 'not_applicable',
                label: 'Not Applicable',
                count: checklist.items.filter((i) => i.status === 'not_applicable').length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === tab.id
                    ? 'bg-[#6C3BFF] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filterStatus === tab.id ? 'bg-white/25 text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Checklist Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 font-bold">
                <th className="py-2.5 px-3">Field Name</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-3">Current Value</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Public Access</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                    No items found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.key} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-neutral-900">
                      <div>{item.label}</div>
                      <div className="text-[10px] text-neutral-400 font-normal">{item.description}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-semibold">
                        {getSectionIcon(item.section)}
                        <span>{item.sectionTitle}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-neutral-700 font-medium">
                      {item.value ? (
                        <span title={item.value}>{item.value}</span>
                      ) : (
                        <span className="text-neutral-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.status === 'complete' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Complete</span>
                        </span>
                      )}
                      {item.status === 'missing' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Missing</span>
                        </span>
                      )}
                      {item.status === 'needs_verification' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          <HelpCircle className="w-3 h-3 text-amber-600" />
                          <span>Needs Verification</span>
                        </span>
                      )}
                      {item.status === 'not_applicable' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
                          <Slash className="w-3 h-3 text-neutral-400" />
                          <span>Not Applicable</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.isPublic ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                          Public Allowed
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md font-semibold">
                          Internal Only
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#6C3BFF] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {item.status !== 'not_applicable' && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, 'not_applicable')}
                            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 text-[10px]"
                            title="Mark as Not Applicable"
                          >
                            N/A
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Field Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                {getSectionIcon(editingItem.section)}
                <h4 className="text-sm font-bold text-neutral-900">Edit {editingItem.label}</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">{editingItem.description}</p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">Value</label>
              <textarea
                rows={3}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={`Enter verified ${editingItem.label}...`}
                className="w-full p-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6C3BFF] focus:outline-hidden resize-none"
              />
              <p className="text-[10px] text-neutral-400">
                {editingItem.isPublic
                  ? '🔒 This value will be revealed by the rule-based chatbot when asked by visitors.'
                  : '🔒 Internal field: protected from public customer view.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveField}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#6C3BFF] hover:bg-[#5A2DE2] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Public Chatbot Information Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-neutral-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    Preview: Public Chatbot Knowledge Allowlist
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    This is the exact verified data that visitors can ask about on your public chatbot page.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs text-neutral-700">
              <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl space-y-2">
                <h5 className="font-bold text-[#6C3BFF] text-xs">A. Business Identity (Public)</h5>
                <p>
                  <strong>Name:</strong> {publicProfile.business_name}
                </p>
                <p>
                  <strong>Category:</strong> {publicProfile.category}
                </p>
                <p>
                  <strong>Address:</strong> {publicProfile.address || 'Not specified'}
                </p>
                <p>
                  <strong>Phone:</strong> {publicProfile.phone || 'Not specified'}
                </p>
                <p>
                  <strong>WhatsApp:</strong> {publicProfile.whatsapp || 'Not specified'}
                </p>
                <p>
                  <strong>Owner Name:</strong>{' '}
                  {publicProfile.owner_name ? (
                    publicProfile.owner_name
                  ) : (
                    <span className="text-neutral-400 italic">Protected (Internal Only)</span>
                  )}
                </p>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-2">
                <h5 className="font-bold text-blue-800 text-xs">B. Operating Hours</h5>
                <p>
                  <strong>Current Status:</strong>{' '}
                  {publicProfile.opening_hours.isOpenNow ? '🟢 Currently Open' : '🔴 Currently Closed'}{' '}
                  ({publicProfile.opening_hours.todayHoursText})
                </p>
                <p>
                  <strong>Standard Hours:</strong> Mon-Sat{' '}
                  {publicProfile.opening_hours.schedule.monday.open} to{' '}
                  {publicProfile.opening_hours.schedule.monday.close}
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-2">
                <h5 className="font-bold text-emerald-800 text-xs">C. Products & Services ({publicProfile.products_services.length})</h5>
                <ul className="list-disc pl-4 space-y-1">
                  {publicProfile.products_services.map((p) => (
                    <li key={p.id}>
                      <strong>{p.name}</strong> — {p.price} ({p.category})
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-2">
                <h5 className="font-bold text-amber-800 text-xs">D. Policies & Payments</h5>
                <p>
                  <strong>Payment Modes:</strong> {publicProfile.policies.payment_methods.join(', ')}
                </p>
                <p>
                  <strong>Delivery:</strong> {publicProfile.policies.delivery || 'Standard local'}
                </p>
                <p>
                  <strong>Returns:</strong> {publicProfile.policies.return_exchange || 'Subject to store terms'}
                </p>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                <h5 className="font-bold text-neutral-800 text-xs">Security & Isolation Guarantee</h5>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Private passwords, admin notes, API credentials, and other businesses' data are strictly isolated on the server and will NEVER be revealed to chat visitors under any prompt injection attempt.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-[#6C3BFF] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
