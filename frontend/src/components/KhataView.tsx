import React, { useState } from 'react';
import { 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  Users,
  Search,
  Filter
} from 'lucide-react';
import { PurchaseOrder, DeliveryChallan, StaffMember, KhataSummary } from '../types';
import DepartmentSubStaff from './DepartmentSubStaff';
import * as api from '../api';

interface KhataViewProps {
  purchaseOrders: PurchaseOrder[];
  deliveryChallans: DeliveryChallan[];
  staffList: StaffMember[];
  khataSummary?: KhataSummary | null;
  hideFinancials?: boolean;
  currentUser?: StaffMember | null;
  onReload: () => void;
}

const formatRupees = (amount: number | undefined, hide?: boolean): string => {
  if (hide) return '••••';
  if (amount === undefined || isNaN(amount)) return '₹0.00';
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function KhataView({
  purchaseOrders,
  deliveryChallans,
  staffList,
  khataSummary,
  hideFinancials = false,
  currentUser,
  onReload
}: KhataViewProps) {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Fallbacks if khataSummary is pending
  const cashInToday = khataSummary?.cash_in_today ?? 
    deliveryChallans.filter(d => d.status === 'READY' || d.status === 'DISPATCHED' || d.status === 'DELIVERED')
      .reduce((acc, d) => acc + (d.total_amount || 0), 0);

  const cashOutToday = khataSummary?.cash_out_today ?? 
    purchaseOrders.filter(p => p.status === 'ORDERED' || p.status === 'FULLY_RECEIVED' || p.status === 'PARTIALLY_RECEIVED')
      .reduce((acc, p) => acc + (p.total_amount || 0), 0);

  const netCashflow = khataSummary?.net_cashflow ?? (cashInToday - cashOutToday);
  const totalReceivables = khataSummary?.total_receivables ?? 
    deliveryChallans.filter(d => d.status !== 'DELIVERED' && d.status !== 'CANCELLED')
      .reduce((acc, d) => acc + (d.total_amount || 0), 0);

  const totalPayables = khataSummary?.total_payables ?? 
    purchaseOrders.filter(p => p.status !== 'FULLY_RECEIVED' && p.status !== 'CANCELLED')
      .reduce((acc, p) => acc + (p.total_amount || 0), 0);

  // Pending items
  const pendingCustomerBills = deliveryChallans.filter(d => {
    const matchSearch = d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.dc_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const pendingSupplierBills = purchaseOrders.filter(p => {
    const matchSearch = (p.supplier_name || p.supplier_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.po_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Action: Mark delivery challan as settled/delivered
  const handleSettleChallan = async (dcId: string) => {
    setIsProcessing(dcId);
    try {
      await api.updateDCStatus(dcId, 'DELIVERED');
      alert(`✅ Challan ${dcId} marked as settled and cleared!`);
      onReload();
    } catch (err: any) {
      alert(`Error settling challan: ${err.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  // Action: Mark PO as cleared
  const handleClearPO = async (poId: string) => {
    setIsProcessing(poId);
    try {
      await api.updatePOStatus(poId, 'FULLY_RECEIVED');
      alert(`✅ Purchase Order ${poId} marked as settled and cleared!`);
      onReload();
    } catch (err: any) {
      alert(`Error settling PO: ${err.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* 6 Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-1">
            Today's In
          </span>
          <div className="text-xl font-black text-emerald-600 font-mono">
            {formatRupees(cashInToday, hideFinancials)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Sales Inflows</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 block mb-1">
            Today's Out
          </span>
          <div className="text-xl font-black text-red-600 font-mono">
            {formatRupees(cashOutToday, hideFinancials)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">PO Spend</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-700 block mb-1">
            Net Cashflow
          </span>
          <div className={`text-xl font-black font-mono ${netCashflow >= 0 ? 'text-zinc-900' : 'text-red-600'}`}>
            {formatRupees(netCashflow, hideFinancials)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">In minus Out</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block mb-1">
            Receivables
          </span>
          <div className="text-xl font-black text-blue-600 font-mono">
            {formatRupees(totalReceivables, hideFinancials)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Customer Dues</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block mb-1">
            Payables
          </span>
          <div className="text-xl font-black text-amber-600 font-mono">
            {formatRupees(totalPayables, hideFinancials)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Supplier Dues</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block mb-1">
            Godown Value
          </span>
          <div className="text-xl font-black text-indigo-600 font-mono">
            {formatRupees(khataSummary?.godown_value, hideFinancials)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Stock Assets</span>
        </div>
      </div>

      {/* Main Khata Invoices & Ledger View */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Tab & Search Bar */}
        <div className="p-4 md:p-5 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/70">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('receivables')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'receivables'
                  ? 'bg-zinc-950 text-white shadow-sm'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
              }`}
            >
              Customer Receivables ({pendingCustomerBills.length})
            </button>
            <button
              onClick={() => setActiveTab('payables')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'payables'
                  ? 'bg-zinc-950 text-white shadow-sm'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
              }`}
            >
              Supplier Payables ({pendingSupplierBills.length})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by customer, PO or DC..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Tab 1: Customer Receivables Table */}
        {activeTab === 'receivables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 text-zinc-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                  <th className="p-3.5">Challan #</th>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Invoice Amount</th>
                  <th className="p-3.5 text-right">Est. Margin</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingCustomerBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      No delivery challans or invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  pendingCustomerBills.map(dc => {
                    const isSettled = dc.status === 'DELIVERED';
                    return (
                      <tr key={dc.dc_id} className="hover:bg-zinc-50/80 transition">
                        <td className="p-3.5 font-mono font-bold text-zinc-900">{dc.dc_id}</td>
                        <td className="p-3.5 font-bold text-zinc-900">{dc.customer_name}</td>
                        <td className="p-3.5 font-mono text-zinc-500">{dc.created_at?.slice(0, 10)}</td>
                        <td className="p-3.5 text-right font-mono font-extrabold text-zinc-900">
                          {formatRupees(dc.total_amount, hideFinancials)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-semibold text-emerald-700">
                          {formatRupees(dc.total_margin, hideFinancials)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : dc.status === 'DISPATCHED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {dc.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {!isSettled ? (
                            <button
                              disabled={isProcessing === dc.dc_id}
                              onClick={() => handleSettleChallan(dc.dc_id)}
                              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                            >
                              {isProcessing === dc.dc_id ? 'Settling...' : 'Collect Payment'}
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold text-xs flex items-center justify-end">
                              <CheckCircle2 size={13} className="mr-1" /> Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Supplier Payables Table */}
        {activeTab === 'payables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 text-zinc-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-zinc-200">
                  <th className="p-3.5">PO #</th>
                  <th className="p-3.5">Supplier / Vendor</th>
                  <th className="p-3.5">Order Date</th>
                  <th className="p-3.5 text-right">PO Total</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingSupplierBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-400">
                      No purchase orders or payable dues recorded yet.
                    </td>
                  </tr>
                ) : (
                  pendingSupplierBills.map(po => {
                    const isCleared = po.status === 'FULLY_RECEIVED';
                    return (
                      <tr key={po.po_id} className="hover:bg-zinc-50/80 transition">
                        <td className="p-3.5 font-mono font-bold text-zinc-900">{po.po_id}</td>
                        <td className="p-3.5 font-bold text-zinc-900">{po.supplier_name || po.supplier_id}</td>
                        <td className="p-3.5 font-mono text-zinc-500">{po.created_at?.slice(0, 10)}</td>
                        <td className="p-3.5 text-right font-mono font-extrabold text-zinc-900">
                          {formatRupees(po.total_amount, hideFinancials)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isCleared
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {!isCleared ? (
                            <button
                              disabled={isProcessing === po.po_id}
                              onClick={() => handleClearPO(po.po_id)}
                              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                            >
                              {isProcessing === po.po_id ? 'Clearing...' : 'Clear Dues'}
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold text-xs flex items-center justify-end">
                              <CheckCircle2 size={13} className="mr-1" /> Cleared
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DEPARTMENT 4 SUB-STAFF TABLE (PROMPT 4) */}
      <DepartmentSubStaff 
        department="khata"
        departmentTitle="Payments & Finance (Khata)"
        staffList={staffList}
        onReload={onReload}
        currentUser={currentUser}
      />
    </div>
  );
}

