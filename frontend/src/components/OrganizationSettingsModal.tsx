import React, { useState } from 'react';
import { Building2, X, Check, ShieldCheck, CreditCard, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { OrganizationProfile } from '../types';
import * as api from '../api';

interface OrganizationSettingsModalProps {
  initialProfile: OrganizationProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: OrganizationProfile) => void;
}

export default function OrganizationSettingsModal({
  initialProfile,
  isOpen,
  onClose,
  onSuccess
}: OrganizationSettingsModalProps) {
  const [profile, setProfile] = useState<OrganizationProfile>({ ...initialProfile });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'tax' | 'bank'>('profile');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.company_name.trim()) {
      setErrorMsg('Organization legal name is required.');
      return;
    }
    if (!profile.company_code.trim()) {
      setErrorMsg('Company Gate Code is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const updated = await api.updateOrganizationProfile({
        ...profile,
        company_code: profile.company_code.trim().toUpperCase()
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update organization profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-zinc-950 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg border border-white/10">
              🏢
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">Organization Profile & Business Setup</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Official details rendered on invoices, challans, company login gate, and reports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-5 pt-3 space-x-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            1. Identity & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'tax'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            2. GST & Tax Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'bank'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            3. Banking & Challan UPI
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: IDENTITY & CONTACT */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.company_name}
                    onChange={e => setProfile({ ...profile, company_name: e.target.value })}
                    placeholder="e.g. Apex Tech Trading Pvt Ltd"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl font-bold text-zinc-900 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Printed at the top of every challan</span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Company Gate Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.company_code}
                    onChange={e => setProfile({ ...profile, company_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. APEX-TRADING"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl font-mono font-bold text-zinc-900 uppercase text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Staff use this code to access Step 1 login</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Tagline / Business Description
                </label>
                <input
                  type="text"
                  value={profile.tagline || ''}
                  onChange={e => setProfile({ ...profile, tagline: e.target.value })}
                  placeholder="e.g. Wholesale Electronics, Laptops & IT Hardware"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-medium text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Primary Phone Number
                  </label>
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Support / Official Email
                  </label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    placeholder="contact@yourcompany.com"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Official Registered / Warehouse Address
                </label>
                <textarea
                  rows={2}
                  value={profile.address || ''}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                  placeholder="e.g. Unit 4B, Electronic City Phase 1, Bangalore, Karnataka - 560100"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-zinc-800"
                />
              </div>
            </div>
          )}

          {/* TAB 2: TAX & REGISTRATION */}
          {activeTab === 'tax' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    GSTIN Number (Goods & Services Tax)
                  </label>
                  <input
                    type="text"
                    value={profile.gstin || ''}
                    onChange={e => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl font-mono font-bold text-zinc-900 uppercase"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Appears prominently on challan header</span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Company PAN Number
                  </label>
                  <input
                    type="text"
                    value={profile.pan || ''}
                    onChange={e => setProfile({ ...profile, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl font-mono font-bold text-zinc-900 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Challan Terms & Conditions (Footer)
                </label>
                <textarea
                  rows={3}
                  value={profile.terms_and_conditions || ''}
                  onChange={e => setProfile({ ...profile, terms_and_conditions: e.target.value })}
                  placeholder="1. Goods once dispatched cannot be returned without prior authorization.&#10;2. Subject to local jurisdiction."
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-zinc-800 font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: BANK & UPI */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                💡 Customers scanning or viewing Delivery Challans will see these details for direct wire transfer & instant UPI payments.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={profile.bank_name || ''}
                    onChange={e => setProfile({ ...profile, bank_name: e.target.value })}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-semibold text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={profile.bank_account_no || ''}
                    onChange={e => setProfile({ ...profile, bank_account_no: e.target.value })}
                    placeholder="e.g. 50200012345678"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={profile.bank_ifsc || ''}
                    onChange={e => setProfile({ ...profile, bank_ifsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono font-bold uppercase text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <input
                    type="text"
                    value={profile.upi_id || ''}
                    onChange={e => setProfile({ ...profile, upi_id: e.target.value })}
                    placeholder="e.g. blackbox@hdfcbank"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Changes reflect immediately across all tabs and print layouts.
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl transition shadow-sm flex items-center space-x-1.5"
              >
                <Check size={16} />
                <span>{isSaving ? 'Saving...' : 'Save Organization Details'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

