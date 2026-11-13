import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { StaffMember, VisibilitySettings } from '../types';
import * as api from '../api';

interface TeamAccessControlProps {
  staffList: StaffMember[];
  visibilitySettings: VisibilitySettings;
  onReload: () => void;
  onClose?: () => void;
}

const DEPARTMENTS = [
  { key: 'procurement', label: 'Procurement', icon: '📦' },
  { key: 'godown', label: 'Godown', icon: '🏭' },
  { key: 'dispatch', label: 'Dispatch', icon: '🚚' },
  { key: 'khata', label: 'Khata', icon: '💸' },
];

export default function TeamAccessControl({
  staffList,
  visibilitySettings,
  onReload,
  onClose
}: TeamAccessControlProps) {
  const [openMode, setOpenMode] = useState<boolean>(visibilitySettings.open_blackbox_mode);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [updatingStaffId, setUpdatingStaffId] = useState<number | null>(null);

  // Toggle Master Switch
  const handleToggleMasterMode = async () => {
    const nextMode = !openMode;
    setIsUpdatingMode(true);
    try {
      await api.updateVisibilitySettings(nextMode);
      setOpenMode(nextMode);
      onReload();
    } catch (err: any) {
      alert(`Failed to update mode: ${err.message}`);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  // Toggle specific department for a worker
  const handleToggleDepartment = async (staff: StaffMember, deptKey: string) => {
    if (!staff.staff_id) return;
    setUpdatingStaffId(staff.staff_id);

    const currentDepts = (staff.departments || '')
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);

    let updatedDepts: string[];
    if (currentDepts.includes(deptKey)) {
      updatedDepts = currentDepts.filter(d => d !== deptKey);
    } else {
      updatedDepts = [...currentDepts, deptKey];
    }

    try {
      await api.updateStaffDepartments(staff.staff_id, updatedDepts.join(','));
      onReload();
    } catch (err: any) {
      alert(`Error updating department: ${err.message}`);
    } finally {
      setUpdatingStaffId(null);
    }
  };

  // Toggle financial masking for a worker
  const handleToggleFinancials = async (staff: StaffMember) => {
    if (!staff.staff_id) return;
    setUpdatingStaffId(staff.staff_id);
    const newHide = !staff.hide_financials;
    try {
      await api.updateStaffPermissions(
        staff.staff_id,
        staff.role_level || 'WORKER',
        newHide,
        staff.departments
      );
      onReload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingStaffId(null);
    }
  };

  // Toggle role level between MANAGER and WORKER
  const handleToggleRoleLevel = async (staff: StaffMember) => {
    if (!staff.staff_id) return;
    setUpdatingStaffId(staff.staff_id);
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
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingStaffId(null);
    }
  };

  // Non-owner active staff members
  const workers = staffList.filter(s => s.role !== 'ADMIN' && s.status !== 'REJECTED');

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="bg-zinc-950 p-6 md:p-8 text-white flex justify-between items-start">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-xs font-mono font-bold text-zinc-300 mb-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Blackbox Visibility Engine</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Team Access Control</h2>
          <p className="text-zinc-400 text-xs md:text-sm mt-1">
            Dictate operational visibility and module permissions across your business.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-zinc-300 hover:text-white transition"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* TOP SECTION: THE MASTER SWITCH */}
        <div className={`p-6 rounded-2xl border-2 transition-all ${
          openMode 
            ? 'bg-emerald-50/70 border-emerald-300' 
            : 'bg-zinc-50 border-zinc-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xl">
                  {openMode ? '🔓' : '🔒'}
                </span>
                <span className="text-lg md:text-xl font-black text-zinc-950">
                  Open Blackbox Mode (Everyone sees everything)
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-600 max-w-xl leading-relaxed">
                {openMode ? (
                  <span className="font-semibold text-emerald-800">
                    Active (Startup Mode): All team members share unified, unrestricted visibility across Procurement, Godown, Dispatch, and Khata.
                  </span>
                ) : (
                  <span className="font-semibold text-zinc-700">
                    Restricted Access (Corporate Mode): Department gates are strictly enforced. Workers only see modules explicitly granted below.
                  </span>
                )}
              </p>
            </div>

            {/* Massive Toggle Switch Button */}
            <button
              type="button"
              onClick={handleToggleMasterMode}
              disabled={isUpdatingMode}
              className={`relative inline-flex h-11 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                openMode ? 'bg-emerald-600' : 'bg-zinc-400'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-10 w-10 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center font-bold text-xs ${
                  openMode ? 'translate-x-9 text-emerald-700' : 'translate-x-0 text-zinc-500'
                }`}
              >
                {openMode ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* BOTTOM SECTION: WORKERS LIST & DEPARTMENT PILLS */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
            <div>
              <h3 className="text-base font-black text-zinc-900">
                Staff Department Permissions
              </h3>
              <p className="text-xs text-zinc-500">
                {openMode ? (
                  <span className="text-amber-700 font-semibold flex items-center mt-0.5">
                    <AlertCircle size={14} className="mr-1" />
                    Master switch is ON. Individual department pills will take effect when switched to Restricted Mode.
                  </span>
                ) : (
                  <span>
                    Tap the department pills below to instantly grant or revoke access in real-time.
                  </span>
                )}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded-lg">
              {workers.length} Team Members
            </span>
          </div>

          {workers.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl">
              No staff members registered yet. Add team members from the Department Manager table.
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map(staff => {
                const assignedDepts = (staff.departments || '')
                  .split(',')
                  .map(d => d.trim().toLowerCase())
                  .filter(Boolean);

                const isManager = staff.role_level === 'MANAGER';
                const isHideFin = Boolean(staff.hide_financials);
                const isUpdating = updatingStaffId === staff.staff_id;

                return (
                  <div
                    key={staff.staff_id}
                    className="p-4 md:p-5 rounded-2xl border border-zinc-200 bg-zinc-50/50 hover:bg-white hover:border-zinc-400 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Worker Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm md:text-base text-zinc-900">
                          {staff.name}
                        </span>
                        {/* Role Level Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleRoleLevel(staff)}
                          title="Click to toggle Manager vs Worker"
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
                            isManager 
                              ? 'bg-zinc-900 text-white' 
                              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                          }`}
                        >
                          {isManager ? 'Manager' : 'Worker'}
                        </button>

                        {/* Financial Visibility Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleFinancials(staff)}
                          title="Click to toggle price/financial visibility"
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center space-x-1 transition ${
                            isHideFin
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isHideFin ? <EyeOff size={11} className="mr-0.5" /> : <Eye size={11} className="mr-0.5" />}
                          <span>{isHideFin ? 'Prices Hidden' : 'Prices Visible'}</span>
                        </button>
                      </div>

                      <div className="text-xs font-mono text-zinc-500">
                        {staff.phone} • PIN: {staff.pin || '1234'}
                      </div>
                    </div>

                    {/* Department Access Pills */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {DEPARTMENTS.map(dept => {
                        const isGranted = assignedDepts.includes(dept.key);
                        return (
                          <button
                            key={dept.key}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleDepartment(staff, dept.key)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-xs active:scale-95 ${
                              isGranted
                                ? 'bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800'
                                : 'bg-white text-zinc-400 border-2 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700'
                            }`}
                          >
                            <span>{dept.icon}</span>
                            <span>{dept.label}</span>
                            {isGranted && <Check size={13} className="text-emerald-400 ml-1 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-zinc-100 border-t border-zinc-200 flex justify-end">
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

