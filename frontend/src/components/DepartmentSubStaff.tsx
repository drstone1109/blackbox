import React, { useState } from 'react';
import { Users, Plus, ShieldCheck, Eye, EyeOff, UserPlus, X, Check } from 'lucide-react';
import { StaffMember } from '../types';
import * as api from '../api';

interface DepartmentSubStaffProps {
  department: 'procurement' | 'godown' | 'dispatch' | 'khata';
  departmentTitle: string;
  staffList: StaffMember[];
  onReload: () => void;
  currentUser?: StaffMember | null;
}

export default function DepartmentSubStaff({
  department,
  departmentTitle,
  staffList,
  onReload,
  currentUser
}: DepartmentSubStaffProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [roleLevel, setRoleLevel] = useState<'MANAGER' | 'WORKER'>('WORKER');
  const [hideFinancials, setHideFinancials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter staff members assigned to this department
  const deptStaff = staffList.filter(s => {
    if (s.role === 'ADMIN') return true; // Owner is in all departments
    const depts = (s.departments || '').toLowerCase().split(',').map(d => d.trim());
    return depts.includes(department);
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    try {
      await api.addStaff({
        name: name.trim(),
        phone: phone.trim(),
        role: roleLevel === 'MANAGER' ? 'WAREHOUSE' : 'STAFF',
        pin: pin.trim() || '1234',
        departments: department,
        role_level: roleLevel,
        hide_financials: hideFinancials,
        status: 'ACTIVE'
      });
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setPin('1234');
      setHideFinancials(false);
      onReload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register department staff.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRoleLevel = async (staff: StaffMember) => {
    if (!staff.staff_id) return;
    const nextLevel = staff.role_level === 'MANAGER' ? 'WORKER' : 'MANAGER';
    try {
      await api.updateStaffPermissions(
        staff.staff_id,
        nextLevel,
        staff.hide_financials || false,
        staff.departments
      );
      onReload();
    } catch (err: any) {
      alert(`Error updating role: ${err.message}`);
    }
  };

  const handleToggleFinancials = async (staff: StaffMember) => {
    if (!staff.staff_id) return;
    const nextHide = !staff.hide_financials;
    try {
      await api.updateStaffPermissions(
        staff.staff_id,
        staff.role_level || 'WORKER',
        nextHide,
        staff.departments
      );
      onReload();
    } catch (err: any) {
      alert(`Error updating permissions: ${err.message}`);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70">
        <div>
          <div className="flex items-center space-x-2">
            <Users size={18} className="text-zinc-700" />
            <h3 className="font-black text-sm md:text-base text-zinc-900">
              {departmentTitle} — Team & Sub-Staff
            </h3>
            <span className="px-2 py-0.5 bg-zinc-200 text-zinc-800 text-xs font-bold rounded-full">
              {deptStaff.length}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage assigned managers, assistants, and field workers for this module.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition self-start sm:self-auto"
        >
          <UserPlus size={15} />
          <span>+ Add Staff</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-100 text-zinc-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-zinc-200">
              <th className="p-3.5">Name</th>
              <th className="p-3.5">Phone</th>
              <th className="p-3.5">Role Level</th>
              <th className="p-3.5">Financial Visibility</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {deptStaff.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-zinc-400">
                  No dedicated staff assigned to {departmentTitle}. Click "+ Add Staff" to assign one.
                </td>
              </tr>
            ) : (
              deptStaff.map(staff => {
                const isOwner = staff.role === 'ADMIN';
                const isManager = isOwner || staff.role_level === 'MANAGER';
                const isHideFin = Boolean(staff.hide_financials);

                return (
                  <tr key={staff.staff_id || staff.name} className="hover:bg-zinc-50/80 transition">
                    <td className="p-3.5 font-bold text-zinc-900 flex items-center space-x-1.5">
                      <span>{staff.name}</span>
                      {isOwner && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                          Owner
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-zinc-600">{staff.phone}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        isManager
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}>
                        {isManager ? 'Manager' : 'Worker'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isHideFin
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isHideFin ? <EyeOff size={11} className="mr-1" /> : <Eye size={11} className="mr-1" />}
                        {isHideFin ? 'Prices Hidden' : 'Full Visibility'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      {!isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleRoleLevel(staff)}
                            className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 underline"
                          >
                            Set {isManager ? 'Worker' : 'Manager'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleFinancials(staff)}
                            className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 underline ml-2"
                          >
                            {isHideFin ? 'Show Prices' : 'Hide Prices'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* "+ Add Staff" Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus size={18} className="text-zinc-900" />
                <h4 className="font-black text-sm md:text-base text-zinc-900">
                  Add Staff to {departmentTitle}
                </h4>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Permission Level *
                  </label>
                  <select
                    value={roleLevel}
                    onChange={e => setRoleLevel(e.target.value as 'MANAGER' | 'WORKER')}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-zinc-900 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="MANAGER">Manager (Full Access & Approvals)</option>
                    <option value="WORKER">Worker (Restricted View / Scanner Only / Draft Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Access PIN *
                  </label>
                  <input
                    type="password"
                    required
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    maxLength={8}
                    placeholder="1234"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-zinc-900 font-mono text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Checkbox: Hide all prices/financials */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="hide_fin_check"
                  checked={hideFinancials}
                  onChange={e => setHideFinancials(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300"
                />
                <label htmlFor="hide_fin_check" className="cursor-pointer select-none">
                  <span className="font-bold text-zinc-900 block">
                    Hide all prices/financials from this user
                  </span>
                  <span className="text-[11px] text-zinc-500 block leading-tight mt-0.5">
                    User will only see quantities, SKUs, and delivery notes. Cost prices and margins will be masked as ••••.
                  </span>
                </label>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl transition shadow-sm"
                >
                  {isSaving ? 'Registering...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

