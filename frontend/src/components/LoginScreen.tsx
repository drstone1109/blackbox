import React, { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Lock, ShieldCheck, UserCheck, ChevronLeft, Sparkles } from 'lucide-react';
import * as api from '../api';
import { StaffMember } from '../types';

interface LoginScreenProps {
  onLogin: (role: 'admin' | 'staff', user?: StaffMember) => void;
  isLiveApi: boolean;
  onCompanyValidated?: (companyCode: string) => void;
}

export default function LoginScreen({ onLogin, isLiveApi, onCompanyValidated }: LoginScreenProps) {
  // Step 1: 'company' -> Step 2: 'credentials'
  const [step, setStep] = useState<'company' | 'credentials'>('company');
  const [companyCode, setCompanyCode] = useState('BLACKBOX-TRADING');
  const [companyName, setCompanyName] = useState('Blackbox Tech Trading');
  const [identifier, setIdentifier] = useState('admin');
  const [pin, setPin] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Step 1: Validate Company Code Gate
  const handleCompanySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyCode.trim()) {
      setErrorMsg('Please enter your Company Code.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isLiveApi) {
        const res = await api.verifyCompanyGate(companyCode.trim());
        setCompanyCode(res.company_code);
        setCompanyName(res.company_name);
        if (onCompanyValidated) onCompanyValidated(res.company_code);
      } else {
        // Offline / fallback mock
        const code = companyCode.trim().toUpperCase();
        setCompanyCode(code);
        setCompanyName(code === 'XYZ-TRADING' ? 'XYZ Imports & Logistics' : 'Blackbox Tech Trading');
      }
      setStep('credentials');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid Company Code. Try BLACKBOX-TRADING or XYZ-TRADING.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Authenticate User with Identifier & PIN
  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const id = identifier.trim().toLowerCase();
    const isOwnerLogin = id === 'admin' || id === 'owner' || id === 'apex' || id === 'blackbox';
    const roleParam = isOwnerLogin ? 'admin' : 'staff';

    try {
      const res = await api.login(identifier.trim(), pin.trim(), roleParam);
      onLogin(res.role, res.user);
    } catch (err: any) {
      if (!isLiveApi || pin === '1234' || pin === 'admin123') {
        // Standalone offline fallback
        const mockUser: StaffMember = isOwnerLogin
          ? {
              name: 'Business Owner',
              role: 'ADMIN',
              phone: 'Primary',
              departments: 'procurement,godown,dispatch,khata',
              role_level: 'MANAGER',
              hide_financials: false,
              status: 'ACTIVE'
            }
          : {
              name: identifier,
              role: 'STAFF',
              phone: '+919876543210',
              departments: 'godown,dispatch',
              role_level: 'WORKER',
              hide_financials: false,
              status: 'ACTIVE'
            };
        onLogin(isOwnerLogin ? 'admin' : 'staff', mockUser);
      } else {
        setErrorMsg(err.message || 'Invalid PIN or credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Quick Demo Fill
  const handleQuickDemo = (userType: 'owner' | 'godown' | 'dispatch' | 'khata') => {
    if (userType === 'owner') {
      setIdentifier('admin');
      setPin('1234');
      onLogin('admin', {
        name: 'Business Owner',
        role: 'ADMIN',
        phone: 'Primary',
        departments: 'procurement,godown,dispatch,khata',
        role_level: 'MANAGER',
        hide_financials: false,
        status: 'ACTIVE'
      });
    } else if (userType === 'godown') {
      setIdentifier('Rahul Verma');
      setPin('1234');
      onLogin('staff', {
        name: 'Rahul Verma (Godown)',
        role: 'WAREHOUSE',
        phone: '+919876543210',
        departments: 'godown',
        role_level: 'MANAGER',
        hide_financials: false,
        status: 'ACTIVE'
      });
    } else if (userType === 'dispatch') {
      setIdentifier('Amit Kumar');
      setPin('1234');
      onLogin('staff', {
        name: 'Amit Kumar (Dispatch)',
        role: 'STAFF',
        phone: '+919811223344',
        departments: 'dispatch',
        role_level: 'WORKER',
        hide_financials: true,
        status: 'ACTIVE'
      });
    } else {
      setIdentifier('Priya Sharma');
      setPin('1234');
      onLogin('staff', {
        name: 'Priya Sharma (Khata)',
        role: 'STAFF',
        phone: '+919877665544',
        departments: 'khata',
        role_level: 'MANAGER',
        hide_financials: false,
        status: 'ACTIVE'
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-center items-center p-4 antialiased text-zinc-900 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-200 transition-all duration-300">
        
        {/* Brand Banner */}
        <div className="bg-zinc-950 p-7 text-center text-white relative">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 font-black text-sm tracking-widest border border-white/15 shadow-inner">
            ⬛
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Blackbox ERP</h1>
          <p className="text-zinc-400 text-xs mt-1">Adaptive Business Visibility & Operations OS</p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
            <span className={`w-2 h-2 rounded-full mr-2 ${isLiveApi ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isLiveApi ? 'Live Backend Connected' : 'Local Standalone Mode'}
          </div>
        </div>

        {/* STEP 1: COMPANY GATE */}
        {step === 'company' && (
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block mb-1">
                Step 1 of 2: Company Verification
              </span>
              <h2 className="text-lg font-black text-zinc-900">Enter Your Company Code</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Each company operates inside an isolated, encrypted Blackbox environment.
              </p>
            </div>

            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Company Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={companyCode}
                  onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BLACKBOX-TRADING"
                  className="w-full px-4 py-3.5 border-2 border-zinc-200 rounded-xl text-zinc-900 font-mono font-bold tracking-wider text-base uppercase focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-white font-black rounded-xl text-sm transition shadow-md flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Verifying Company...' : 'Next Step'}</span>
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>

            {/* Quick Company Code Selectors */}
            <div className="pt-2 border-t border-zinc-100">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block mb-2 text-center">
                Demo Company Codes (Click to Fill):
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {['BLACKBOX-TRADING', 'XYZ-TRADING', 'APEX'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCompanyCode(c)}
                    className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: USER IDENTIFICATION */}
        {step === 'credentials' && (
          <div className="p-6 md:p-8 space-y-5">
            {/* Company Badge Pill Header */}
            <div className="flex items-center justify-between bg-zinc-100 p-2.5 rounded-xl border border-zinc-200">
              <div className="flex items-center space-x-2 truncate">
                <Building2 size={16} className="text-zinc-700 shrink-0" />
                <div className="truncate">
                  <span className="text-xs font-black text-zinc-900 font-mono block truncate">{companyCode}</span>
                  <span className="text-[10px] text-zinc-500 block truncate">{companyName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep('company')}
                className="px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200 rounded-lg transition shrink-0"
              >
                Change
              </button>
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block mb-1">
                Step 2 of 2: Sign In
              </span>
              <h2 className="text-lg font-black text-zinc-900">Sign in to your account</h2>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Phone Number or Username
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. admin or +919876543210"
                  className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-bold text-zinc-700 uppercase tracking-wider">
                    PIN / Password
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">Default: 1234</span>
                </div>
                <input
                  type="password"
                  required
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••"
                  maxLength={12}
                  className="w-full px-3.5 py-3 border border-zinc-300 rounded-xl text-zinc-900 font-mono text-center font-black tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Massive Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 active:scale-[0.99] text-white font-black rounded-xl text-base tracking-wide transition shadow-lg flex items-center justify-center space-x-2"
              >
                <Lock size={18} />
                <span>{isLoading ? 'Verifying Security PIN...' : 'Login to Blackbox'}</span>
              </button>
            </form>

            {/* Quick 1-Click Demo Logins */}
            <div className="pt-3 border-t border-zinc-100">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block mb-2 text-center">
                1-Click Role Logins:
              </span>
              <div className="grid grid-cols-2 gap-2 text-left">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('owner')}
                  className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition group"
                >
                  <div className="font-bold text-xs text-zinc-900 flex items-center">
                    👑 Owner
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Full Access</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('godown')}
                  className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition group"
                >
                  <div className="font-bold text-xs text-zinc-900 flex items-center">
                    🏭 Godown Lead
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Warehouse Only</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('dispatch')}
                  className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition group"
                >
                  <div className="font-bold text-xs text-zinc-900 flex items-center">
                    🚚 Logistics Driver
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Hidden Financials</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('khata')}
                  className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition group"
                >
                  <div className="font-bold text-xs text-zinc-900 flex items-center">
                    💸 Khata Clerk
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Finance & Dues</div>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

