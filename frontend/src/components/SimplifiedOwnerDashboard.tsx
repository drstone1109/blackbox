import React from 'react';
import { 
  ShoppingBag, 
  Warehouse, 
  Truck, 
  CreditCard, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { ProductItem, PurchaseOrder, DeliveryChallan, StaffMember, KhataSummary } from '../types';

interface SimplifiedOwnerDashboardProps {
  products: ProductItem[];
  purchaseOrders: PurchaseOrder[];
  deliveryChallans: DeliveryChallan[];
  staffList: StaffMember[];
  khataSummary?: KhataSummary | null;
  hideFinancials?: boolean;
  onNavigate: (tab: any) => void;
  onOpenPermissions: () => void;
}

// Indian Rupee formatting utility
const formatRupees = (amount: number | undefined, hide?: boolean): string => {
  if (hide) return '••••';
  if (amount === undefined || isNaN(amount)) return '₹0.00';
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SimplifiedOwnerDashboard({
  products,
  purchaseOrders,
  deliveryChallans,
  staffList,
  khataSummary,
  hideFinancials = false,
  onNavigate,
  onOpenPermissions,
}: SimplifiedOwnerDashboardProps) {
  // Financial computations fallback if khataSummary not yet loaded
  const godownValue = khataSummary?.godown_value ?? 
    products.reduce((acc, p) => acc + (p.current_qty * (p.cost_price || 0)), 0);

  const cashInToday = khataSummary?.cash_in_today ?? 
    deliveryChallans.filter(d => d.status === 'READY' || d.status === 'DISPATCHED' || d.status === 'DELIVERED')
      .reduce((acc, d) => acc + (d.total_amount || 0), 0);

  const cashOutToday = khataSummary?.cash_out_today ?? 
    purchaseOrders.filter(p => p.status === 'ORDERED' || p.status === 'FULLY_RECEIVED' || p.status === 'PARTIALLY_RECEIVED')
      .reduce((acc, p) => acc + (p.total_amount || 0), 0);

  const lowStockCount = products.filter(p => p.current_qty <= p.min_alert_qty).length;
  const pendingStaffCount = staffList.filter(s => s.status === 'PENDING').length;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Pending Attention Alert if any */}
      {pendingStaffCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-amber-700" size={18} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-amber-950">
                {pendingStaffCount} Staff Access Request{pendingStaffCount > 1 ? 's' : ''} Pending
              </div>
              <div className="text-[11px] sm:text-xs text-amber-800">
                New team members awaiting your authorization.
              </div>
            </div>
          </div>
          <button
            onClick={onOpenPermissions}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shrink-0"
          >
            Review
          </button>
        </div>
      )}

      {/* TOP: 3 CLEAN METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Today's In (Sales) */}
        <div className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-500">
              Today's In (Sales)
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-600 tracking-tight font-mono">
              {formatRupees(cashInToday, hideFinancials)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-500 font-medium mt-1">
              Dispatches & Sales Invoices
            </div>
          </div>
        </div>

        {/* Card 2: Today's Out (Spend) */}
        <div className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-500">
              Today's Out (Spend)
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-600 tracking-tight font-mono">
              {formatRupees(cashOutToday, hideFinancials)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-500 font-medium mt-1">
              Purchase Orders & Inward
            </div>
          </div>
        </div>

        {/* Card 3: Godown Value */}
        <div className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-500">
              Total Godown Value
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
              <Warehouse size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-600 tracking-tight font-mono">
              {formatRupees(godownValue, hideFinancials)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-500 font-medium mt-1">
              {products.length} Active SKUs in Warehouse
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE: 2X2 GRID OF PRIMARY ACTION BUTTONS */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {/* Button 1: Buy Stock */}
        <button
          onClick={() => onNavigate('buy-stock')}
          className="h-32 sm:h-40 md:h-44 bg-white hover:bg-zinc-50/80 active:scale-[0.98] border border-zinc-200/90 hover:border-zinc-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white flex items-center justify-center text-xl sm:text-3xl transition-colors">
              📦
            </div>
            <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-900 hidden sm:inline transition">
              Open →
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-zinc-950 group-hover:text-zinc-900">
              Buy Stock
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 font-medium mt-0.5 line-clamp-1">
              Procurement & Purchase Orders
            </div>
          </div>
        </button>

        {/* Button 2: Godown */}
        <button
          onClick={() => onNavigate('warehouse')}
          className="h-32 sm:h-40 md:h-44 bg-white hover:bg-zinc-50/80 active:scale-[0.98] border border-zinc-200/90 hover:border-zinc-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white flex items-center justify-center text-xl sm:text-3xl transition-colors">
              🏭
            </div>
            {lowStockCount > 0 ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-[10px] sm:text-[11px]">
                {lowStockCount} Low
              </span>
            ) : (
              <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-900 hidden sm:inline transition">
                Open →
              </span>
            )}
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-zinc-950 group-hover:text-zinc-900">
              Godown
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 font-medium mt-0.5 line-clamp-1">
              Stock Audit, Shelves & Barcode
            </div>
          </div>
        </button>

        {/* Button 3: Dispatch */}
        <button
          onClick={() => onNavigate('dispatch')}
          className="h-32 sm:h-40 md:h-44 bg-white hover:bg-zinc-50/80 active:scale-[0.98] border border-zinc-200/90 hover:border-zinc-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white flex items-center justify-center text-xl sm:text-3xl transition-colors">
              🚚
            </div>
            <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-900 hidden sm:inline transition">
              Open →
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-zinc-950 group-hover:text-zinc-900">
              Dispatch
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 font-medium mt-0.5 line-clamp-1">
              Delivery Challans & Shipping Out
            </div>
          </div>
        </button>

        {/* Button 4: Khata / Payments */}
        <button
          onClick={() => onNavigate('khata')}
          className="h-32 sm:h-40 md:h-44 bg-white hover:bg-zinc-50/80 active:scale-[0.98] border border-zinc-200/90 hover:border-zinc-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white flex items-center justify-center text-xl sm:text-3xl transition-colors">
              💸
            </div>
            <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-900 hidden sm:inline transition">
              Open →
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-zinc-950 group-hover:text-zinc-900">
              Khata / Payments
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500 font-medium mt-0.5 line-clamp-1">
              Cashflow, Receivables & Dues
            </div>
          </div>
        </button>
      </div>

      {/* BOTTOM: TEAM & PERMISSIONS FULL-WIDTH BUTTON */}
      <div>
        <button
          onClick={onOpenPermissions}
          className="w-full py-3.5 sm:py-4.5 bg-zinc-950 hover:bg-zinc-800 active:scale-[0.98] text-white rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center space-x-2.5 sm:space-x-3 group"
        >
          <Users size={18} className="text-zinc-400 group-hover:text-white transition" />
          <span className="text-sm sm:text-base font-bold tracking-wide">
            Manage Team Access & Permissions
          </span>
          <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-1 transition" />
        </button>
      </div>
    </div>
  );
}
