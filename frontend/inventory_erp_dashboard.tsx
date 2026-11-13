import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Warehouse, 
  Truck, 
  Package, 
  Building2, 
  Users, 
  History, 
  LogOut, 
  Menu, 
  Plus, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowDownToLine, 
  TrendingDown, 
  Printer, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X, 
  ShieldCheck, 
  Clock, 
  BarChart3,
  Layers,
  FileText,
  Bell,
  Scan,
  Volume2,
  VolumeX,
  Download,
  Key,
  Lock,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  CreditCard,
  ShieldAlert
} from 'lucide-react';
import { 
  ProductItem, 
  LogItem, 
  Supplier, 
  PurchaseOrder, 
  DeliveryChallan, 
  StaffMember, 
  DailyReport,
  NotificationItem,
  ScanLookupResult,
  KhataSummary,
  VisibilitySettings,
  OrganizationProfile
} from './src/types';
import * as api from './src/api';
import LoginScreen from './src/components/LoginScreen';
import SimplifiedOwnerDashboard from './src/components/SimplifiedOwnerDashboard';
import TeamAccessControl from './src/components/TeamAccessControl';
import DepartmentSubStaff from './src/components/DepartmentSubStaff';
import KhataView from './src/components/KhataView';
import OrganizationSettingsModal from './src/components/OrganizationSettingsModal';

// Currency formatter utility (INR) with optional privacy masking
const formatINR = (val: number | undefined, hideFinancials?: boolean): string => {
  if (hideFinancials) return '••••';
  if (val === undefined || isNaN(val)) return '₹0.00';
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export type UserRole = 'admin' | 'staff' | null;
export type ActiveTab = 'dashboard' | 'buy-stock' | 'warehouse' | 'dispatch' | 'khata' | 'terminal' | 'catalog' | 'suppliers' | 'staff' | 'logs';

export default function App() {
  // App & Navigation State
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
    open_blackbox_mode: true,
    company_code: 'BLACKBOX-TRADING'
  });
  const [khataSummary, setKhataSummary] = useState<KhataSummary | null>(null);
  const [isTeamPermissionsModalOpen, setIsTeamPermissionsModalOpen] = useState<boolean>(false);
  const [companyCode, setCompanyCode] = useState<string>('BLACKBOX-TRADING');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile>({
    company_name: 'Blackbox Tech Trading',
    company_code: 'BLACKBOX-TRADING',
    tagline: 'Adaptive Business Operations OS',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    upi_id: '',
    terms_and_conditions: ''
  });
  const [isOrgModalOpen, setIsOrgModalOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // In-app Toast Feedback State
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ id: Date.now(), message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Core Data States
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);

  // Status & Modals
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeChallanForPrint, setActiveChallanForPrint] = useState<DeliveryChallan | null>(null);

  // Fetch all live data
  const loadAllData = useCallback(async (silent = false) => {
    setIsLoading(true);
    try {
      const [prods, sups, pos, dcs, stf, lg, rep, notifs, vis, khata, org] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getPurchaseOrders().catch(() => []),
        api.getDeliveryChallans().catch(() => []),
        api.getStaff().catch(() => []),
        api.getTransactions(50).catch(() => []),
        api.getDailyReport().catch(() => null),
        api.getNotifications().catch(() => []),
        api.getVisibilitySettings().catch(() => ({ open_blackbox_mode: true, company_code: 'BLACKBOX-TRADING' })),
        api.getKhataSummary().catch(() => null),
        api.getOrganizationProfile().catch(() => null),
      ]);

      if (prods && prods.length > 0) {
        setProducts(prods);
        setIsLiveApi(true);
      }
      if (sups) setSuppliers(sups);
      if (pos) setPurchaseOrders(pos);
      if (dcs) setDeliveryChallans(dcs);
      if (stf) setStaffList(stf);
      if (lg) setLogs(lg);
      if (rep) setDailyReport(rep);
      if (notifs) setNotifications(notifs);
      if (vis) {
        setVisibilitySettings(vis);
        if (vis.company_code) setCompanyCode(vis.company_code);
      }
      if (khata) setKhataSummary(khata);
      if (org) {
        setOrgProfile(org);
        if (org.company_code) setCompanyCode(org.company_code);
      }
      if (!silent) {
        triggerToast('System data updated', 'info');
      }
    } catch {
      setIsLiveApi(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData(true);
  }, [loadAllData]);

  // Auth Handlers
  const handleLogin = (role: 'admin' | 'staff', user?: StaffMember) => {
    setUserRole(role);
    setCurrentUser(user || {
      name: role === 'admin' ? 'Business Owner' : 'Store Staff',
      role: role.toUpperCase(),
      phone: 'Primary',
      departments: 'procurement,godown,dispatch,khata',
      role_level: role === 'admin' ? 'MANAGER' : 'WORKER',
      hide_financials: false,
      status: 'ACTIVE'
    });
    setActiveTab('dashboard');
    triggerToast(`Welcome back, ${user ? user.name : 'Business Owner'}!`, 'success');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      setUserRole(null);
      setCurrentUser(null);
      setIsMobileDrawerOpen(false);
    }
  };

  // Blackbox Visibility Engine Routing Logic
  const canAccess = (tab: ActiveTab): boolean => {
    if (userRole === 'admin') return true;
    if (visibilitySettings.open_blackbox_mode) return true;
    if (tab === 'dashboard' || tab === 'logs') return true;

    const userDepts = (currentUser?.departments || '').toLowerCase().split(',').map(d => d.trim());
    if (tab === 'buy-stock' || tab === 'suppliers') return userDepts.includes('procurement');
    if (tab === 'warehouse' || tab === 'terminal' || tab === 'catalog') return userDepts.includes('godown');
    if (tab === 'dispatch') return userDepts.includes('dispatch');
    if (tab === 'khata') return userDepts.includes('khata');
    if (tab === 'staff') return currentUser?.role_level === 'MANAGER';
    return false;
  };

  if (!userRole) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        isLiveApi={isLiveApi} 
        onCompanyValidated={(c) => setCompanyCode(c)}
      />
    );
  }

  // Pending counts for badges
  const pendingStaffCount = staffList.filter(s => s.status === 'PENDING').length;
  const pendingPOCount = purchaseOrders.filter(p => p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED').length;
  const pendingDCCount = deliveryChallans.filter(d => d.status === 'READY').length;
  const lowStockCount = products.filter(p => p.current_qty <= p.min_alert_qty).length;

  const navigateToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  // Tab titles dictionary
  const TAB_CONFIG: Record<ActiveTab, { title: string; shortTitle: string; icon: React.ReactNode }> = {
    dashboard: {
      title: userRole === 'admin' ? "Owner's Operations Dashboard" : 'Operations Dashboard',
      shortTitle: 'Dashboard',
      icon: <LayoutDashboard size={18} />
    },
    'buy-stock': {
      title: 'Buy Stock & Inward Procurement',
      shortTitle: 'Buy Stock',
      icon: <ShoppingBag size={18} />
    },
    warehouse: {
      title: 'Warehouse Stock & Inventory',
      shortTitle: 'Warehouse',
      icon: <Warehouse size={18} />
    },
    dispatch: {
      title: 'Dispatch & Delivery Challans',
      shortTitle: 'Dispatch',
      icon: <Truck size={18} />
    },
    khata: {
      title: 'Department 4: Payments & Finance (Khata)',
      shortTitle: 'Khata',
      icon: <CreditCard size={18} />
    },
    terminal: {
      title: 'Barcode Scanner & Fast Action Terminal',
      shortTitle: 'Scanner',
      icon: <Scan size={18} />
    },
    catalog: {
      title: 'Product Master & Barcodes',
      shortTitle: 'Catalog',
      icon: <Package size={18} />
    },
    suppliers: {
      title: 'Suppliers & Vendors',
      shortTitle: 'Suppliers',
      icon: <Building2 size={18} />
    },
    staff: {
      title: 'Team Access Control & Permissions',
      shortTitle: 'Team',
      icon: <Users size={18} />
    },
    logs: {
      title: 'Immutable Audit Ledger',
      shortTitle: 'Audit Logs',
      icon: <History size={18} />
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans antialiased overflow-hidden select-none">
      {/* FLOATING TOAST FEEDBACK NOTIFICATION */}
      {toast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className={`p-3.5 rounded-2xl shadow-xl border flex items-center justify-between space-x-3 ${
            toast.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' :
            toast.type === 'info' ? 'bg-zinc-900 text-white border-zinc-800' :
            'bg-zinc-950 text-white border-zinc-800'
          }`}>
            <div className="flex items-center space-x-2.5 text-xs font-semibold">
              {toast.type === 'error' ? (
                <AlertTriangle size={17} className="text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-zinc-400 hover:text-white p-1 text-xs">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE SIDEBAR (DESKTOP) */}
      <aside 
        className={`bg-white border-r border-zinc-200 flex flex-col hidden md:flex transition-all duration-300 ease-in-out shrink-0 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200">
          {!isSidebarCollapsed ? (
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black text-xs shrink-0 tracking-wider shadow-sm">
                ⬛
              </div>
              <div className="truncate">
                <span className="font-black text-zinc-900 text-sm tracking-tight block uppercase">Blackbox ERP</span>
                <span className="text-[10px] text-zinc-500 font-mono font-bold block truncate">🏢 {companyCode}</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black text-[10px] shadow-sm">
                ⬛
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="px-3 pt-3 pb-1">
          <div 
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'px-3 py-1.5'} rounded-xl text-xs font-semibold ${
              isLiveApi ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-amber-50 text-amber-700 border border-amber-200/80'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveApi ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'} ${isSidebarCollapsed ? '' : 'mr-2'}`} />
            {!isSidebarCollapsed && (
              <span className="truncate">{isLiveApi ? 'FastAPI Online' : 'Local Standalone'}</span>
            )}
          </div>
        </div>

        {/* Navigation Items (Filtered by Blackbox Visibility Engine) */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            isCollapsed={isSidebarCollapsed}
          />

          <div className={`pt-2 pb-1 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3">Workflows</span>
          </div>

          {canAccess('buy-stock') && (
            <NavItem 
              icon={<ShoppingBag size={18} />} 
              label="Buy Stock (PO)" 
              isActive={activeTab === 'buy-stock'} 
              onClick={() => setActiveTab('buy-stock')} 
              badge={pendingPOCount}
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccess('warehouse') && (
            <NavItem 
              icon={<Warehouse size={18} />} 
              label="Warehouse" 
              isActive={activeTab === 'warehouse'} 
              onClick={() => setActiveTab('warehouse')} 
              badge={lowStockCount > 0 ? lowStockCount : undefined}
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccess('dispatch') && (
            <NavItem 
              icon={<Truck size={18} />} 
              label="Dispatch / Sales" 
              isActive={activeTab === 'dispatch'} 
              onClick={() => setActiveTab('dispatch')} 
              badge={pendingDCCount}
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccess('khata') && (
            <NavItem 
              icon={<CreditCard size={18} />} 
              label="Khata / Payments" 
              isActive={activeTab === 'khata'} 
              onClick={() => setActiveTab('khata')} 
              isCollapsed={isSidebarCollapsed}
            />
          )}

          <div className={`pt-2 pb-1 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3">Master Data</span>
          </div>

          {canAccess('catalog') && (
            <NavItem 
              icon={<Package size={18} />} 
              label="Products Catalog" 
              isActive={activeTab === 'catalog'} 
              onClick={() => setActiveTab('catalog')} 
              badge={products.length}
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccess('suppliers') && (
            <NavItem 
              icon={<Building2 size={18} />} 
              label="Suppliers" 
              isActive={activeTab === 'suppliers'} 
              onClick={() => setActiveTab('suppliers')} 
              badge={suppliers.length}
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccess('staff') && (
            <NavItem 
              icon={<Users size={18} />} 
              label="Team Permissions" 
              isActive={activeTab === 'staff'} 
              onClick={() => setActiveTab('staff')} 
              badge={pendingStaffCount}
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {userRole === 'admin' && (
            <NavItem 
              icon={<Building2 size={18} />} 
              label="Organization Profile" 
              isActive={false} 
              onClick={() => setIsOrgModalOpen(true)} 
              isCollapsed={isSidebarCollapsed}
            />
          )}

          <div className={`pt-2 pb-1 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3">System & Tools</span>
          </div>

          {canAccess('terminal') && (
            <NavItem 
              icon={<Scan size={18} />} 
              label="Barcode Terminal" 
              isActive={activeTab === 'terminal'} 
              onClick={() => setActiveTab('terminal')} 
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccess('logs') && (
            <NavItem 
              icon={<History size={18} />} 
              label="Audit Ledger" 
              isActive={activeTab === 'logs'} 
              onClick={() => setActiveTab('logs')} 
              isCollapsed={isSidebarCollapsed}
            />
          )}
        </nav>

        {/* User Role Footer */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50/50">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs text-zinc-500 font-medium">Access:</span>
              <span className="text-xs font-bold capitalize bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded-md flex items-center">
                <ShieldCheck size={13} className="mr-1" />
                {currentUser?.role_level || userRole}
              </span>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <ShieldCheck size={16} className="text-zinc-500" />
            </div>
          )}
          <button 
            onClick={handleLogout}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} w-full px-3 py-2 text-xs font-bold text-red-600 rounded-xl hover:bg-red-50 transition`}
            title="Sign out"
          >
            <LogOut size={16} className={isSidebarCollapsed ? '' : 'mr-2'} />
            {!isSidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* MOBILE SLIDE-OVER DRAWER (FULL MENU) */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 bg-zinc-950 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-sm">
                    ⬛
                  </div>
                  <div>
                    <span className="font-black text-sm uppercase tracking-tight block">Blackbox ERP</span>
                    <span className="text-[10px] text-zinc-400 font-mono block">🏢 {companyCode}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User badge */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 truncate max-w-[140px]">
                  {currentUser?.name || userRole}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-black uppercase tracking-wider text-white">
                  {currentUser?.role_level || userRole}
                </span>
              </div>
            </div>

            {/* Scrollable Navigation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 pt-1 pb-1">
                Core Operations
              </div>
              <MobileDrawerItem 
                icon={<LayoutDashboard size={18} />} 
                label="Dashboard" 
                isActive={activeTab === 'dashboard'} 
                onClick={() => navigateToTab('dashboard')} 
              />
              {canAccess('buy-stock') && (
                <MobileDrawerItem 
                  icon={<ShoppingBag size={18} />} 
                  label="Buy Stock (PO)" 
                  isActive={activeTab === 'buy-stock'} 
                  onClick={() => navigateToTab('buy-stock')} 
                  badge={pendingPOCount}
                />
              )}
              {canAccess('warehouse') && (
                <MobileDrawerItem 
                  icon={<Warehouse size={18} />} 
                  label="Warehouse Stock" 
                  isActive={activeTab === 'warehouse'} 
                  onClick={() => navigateToTab('warehouse')} 
                  badge={lowStockCount > 0 ? lowStockCount : undefined}
                />
              )}
              {canAccess('dispatch') && (
                <MobileDrawerItem 
                  icon={<Truck size={18} />} 
                  label="Dispatch / Sales" 
                  isActive={activeTab === 'dispatch'} 
                  onClick={() => navigateToTab('dispatch')} 
                  badge={pendingDCCount}
                />
              )}
              {canAccess('khata') && (
                <MobileDrawerItem 
                  icon={<CreditCard size={18} />} 
                  label="Khata / Payments" 
                  isActive={activeTab === 'khata'} 
                  onClick={() => navigateToTab('khata')} 
                />
              )}

              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 pt-3 pb-1">
                Master Records
              </div>
              {canAccess('catalog') && (
                <MobileDrawerItem 
                  icon={<Package size={18} />} 
                  label="Products Catalog" 
                  isActive={activeTab === 'catalog'} 
                  onClick={() => navigateToTab('catalog')} 
                  badge={products.length}
                />
              )}
              {canAccess('suppliers') && (
                <MobileDrawerItem 
                  icon={<Building2 size={18} />} 
                  label="Suppliers" 
                  isActive={activeTab === 'suppliers'} 
                  onClick={() => navigateToTab('suppliers')} 
                  badge={suppliers.length}
                />
              )}
              {canAccess('staff') && (
                <MobileDrawerItem 
                  icon={<Users size={18} />} 
                  label="Team Permissions" 
                  isActive={activeTab === 'staff'} 
                  onClick={() => navigateToTab('staff')} 
                  badge={pendingStaffCount}
                />
              )}

              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 pt-3 pb-1">
                Tools & Reports
              </div>
              {canAccess('terminal') && (
                <MobileDrawerItem 
                  icon={<Scan size={18} />} 
                  label="Barcode Scanner" 
                  isActive={activeTab === 'terminal'} 
                  onClick={() => navigateToTab('terminal')} 
                />
              )}
              {canAccess('logs') && (
                <MobileDrawerItem 
                  icon={<History size={18} />} 
                  label="Audit Ledger" 
                  isActive={activeTab === 'logs'} 
                  onClick={() => navigateToTab('logs')} 
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-200 bg-zinc-50 space-y-2">
              <a
                href="/api/reports/inventory-csv"
                download="apex_inventory_export.csv"
                className="w-full flex items-center justify-center px-3 py-2 text-xs font-bold text-zinc-700 bg-white rounded-xl border border-zinc-300 shadow-xs"
              >
                <Download size={15} className="mr-2 text-zinc-500" />
                Export CSV Report
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition"
              >
                <LogOut size={15} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-40 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {/* Tab 1: Dashboard */}
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition ${
            activeTab === 'dashboard' ? 'text-zinc-950 font-black bg-zinc-100' : 'text-zinc-500 font-semibold'
          }`}
        >
          <LayoutDashboard size={19} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Tab 2: Buy Stock */}
        {canAccess('buy-stock') && (
          <button 
            onClick={() => setActiveTab('buy-stock')} 
            className={`relative flex flex-col items-center justify-center px-3 py-1 rounded-xl transition ${
              activeTab === 'buy-stock' ? 'text-zinc-950 font-black bg-zinc-100' : 'text-zinc-500 font-semibold'
            }`}
          >
            <ShoppingBag size={19} />
            <span className="text-[10px] mt-0.5">Buy</span>
            {pendingPOCount > 0 && (
              <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>
        )}

        {/* Tab 3: Warehouse Stock */}
        {canAccess('warehouse') && (
          <button 
            onClick={() => setActiveTab('warehouse')} 
            className={`relative flex flex-col items-center justify-center px-3 py-1 rounded-xl transition ${
              activeTab === 'warehouse' ? 'text-zinc-950 font-black bg-zinc-100' : 'text-zinc-500 font-semibold'
            }`}
          >
            <Warehouse size={19} />
            <span className="text-[10px] mt-0.5">Stock</span>
            {lowStockCount > 0 && (
              <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-red-600" />
            )}
          </button>
        )}

        {/* Tab 4: Dispatch */}
        {canAccess('dispatch') && (
          <button 
            onClick={() => setActiveTab('dispatch')} 
            className={`relative flex flex-col items-center justify-center px-3 py-1 rounded-xl transition ${
              activeTab === 'dispatch' ? 'text-zinc-950 font-black bg-zinc-100' : 'text-zinc-500 font-semibold'
            }`}
          >
            <Truck size={19} />
            <span className="text-[10px] mt-0.5">Dispatch</span>
            {pendingDCCount > 0 && (
              <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-amber-600" />
            )}
          </button>
        )}

        {/* Tab 5: More (Menu Trigger) */}
        <button 
          onClick={() => setIsMobileDrawerOpen(true)} 
          className="relative flex flex-col items-center justify-center px-3 py-1 rounded-xl text-zinc-600 hover:text-zinc-950 transition font-semibold"
        >
          <Menu size={19} />
          <span className="text-[10px] mt-0.5">More</span>
          {pendingStaffCount > 0 && (
            <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-red-600 animate-ping" />
          )}
        </button>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-14 sm:h-16 bg-white border-b border-zinc-200/80 flex items-center justify-between px-3.5 sm:px-6 md:px-8 shrink-0">
          {/* Header Left */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 truncate">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl text-zinc-700 hover:bg-zinc-100 transition"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center space-x-2 truncate">
              <span className="hidden sm:inline-block text-zinc-700">
                {TAB_CONFIG[activeTab]?.icon}
              </span>
              <h1 className="text-sm sm:text-lg font-black text-zinc-900 truncate">
                <span className="md:hidden">{TAB_CONFIG[activeTab]?.shortTitle}</span>
                <span className="hidden md:inline">{TAB_CONFIG[activeTab]?.title}</span>
              </h1>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Quick Barcode Scanner Shortcut */}
            <button
              onClick={() => setActiveTab('terminal')}
              title="Open Barcode Scanner Terminal"
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition flex items-center"
            >
              <Scan size={16} className="sm:mr-1.5 text-zinc-700" />
              <span className="hidden sm:inline">Scanner</span>
            </button>

            {/* Export CSV Shortcut (Hidden on tiny mobile) */}
            <a
              href="/api/reports/inventory-csv"
              download="apex_inventory_export.csv"
              title="Export Full Inventory as CSV"
              className="hidden sm:flex items-center px-3 py-1.5 text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-100 rounded-xl border border-zinc-300 transition shadow-xs"
            >
              <Download size={14} className="mr-1.5 text-zinc-500" />
              Export
            </a>

            {/* Sync Button */}
            <button
              onClick={() => loadAllData(false)}
              disabled={isLoading}
              title="Sync with live database"
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition flex items-center"
            >
              <RefreshCw size={14} className={`${isLoading ? 'animate-spin text-zinc-900' : 'text-zinc-600'} sm:mr-1.5`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* In-App Notification Bell & Badge */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`relative p-2 rounded-xl transition border ${
                  isNotificationOpen ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                }`}
                title="Operational Notifications"
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Bell size={16} className="text-zinc-900" />
                      <span className="font-bold text-zinc-900 text-xs uppercase tracking-wider">Operational Alerts</span>
                      <span className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notifications.length} Active
                      </span>
                    </div>
                    <button 
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-zinc-400 hover:text-zinc-700 p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-400">
                        <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                        All operations smooth! No active alerts.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id}
                          onClick={() => {
                            if (n.link_tab) setActiveTab(n.link_tab as ActiveTab);
                            setIsNotificationOpen(false);
                          }}
                          className="p-3 hover:bg-zinc-50 cursor-pointer transition text-left"
                        >
                          <div className="flex items-start justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              n.severity === 'danger' ? 'bg-red-100 text-red-700' :
                              n.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {n.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-zinc-400">{n.timestamp}</span>
                          </div>
                          <h5 className="font-bold text-zinc-900 text-xs mt-1">{n.title}</h5>
                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center text-xs">
                    <a
                      href="/api/reports/inventory-csv"
                      download="apex_daily_summary.csv"
                      className="text-[11px] font-bold text-zinc-700 hover:text-zinc-900 flex items-center"
                    >
                      <FileText size={13} className="mr-1" /> Download Report (CSV)
                    </a>
                    <button 
                      onClick={() => setNotifications([])} 
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-auto p-3.5 sm:p-5 md:p-8 pb-28 md:pb-8">
          {/* Blackbox Visibility Restriction Guard */}
          {!canAccess(activeTab) ? (
            <div className="max-w-md mx-auto my-12 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-3xl">
                🔒
              </div>
              <h3 className="text-xl font-black text-zinc-950 mb-2">Access Restricted by Owner</h3>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                This department is protected under Blackbox Visibility settings. Your Business Owner has restricted access for this account.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-black text-xs shadow-md transition"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="space-y-6 sm:space-y-8">
                  {/* Simplified Owner Dashboard (ATM Style 3 metrics + 4 large buttons) */}
                  <SimplifiedOwnerDashboard 
                    products={products}
                    purchaseOrders={purchaseOrders}
                    deliveryChallans={deliveryChallans}
                    staffList={staffList}
                    khataSummary={khataSummary}
                    hideFinancials={currentUser?.hide_financials}
                    onNavigate={setActiveTab}
                    onOpenPermissions={() => setIsTeamPermissionsModalOpen(true)}
                  />

                  {/* Operational Breakdown */}
                  <div className="pt-4 border-t border-zinc-200">
                    <DashboardView 
                      products={products}
                      purchaseOrders={purchaseOrders}
                      deliveryChallans={deliveryChallans}
                      staffList={staffList}
                      logs={logs}
                      onNavigate={setActiveTab}
                      onReload={() => loadAllData(false)}
                      currentUser={currentUser}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'buy-stock' && (
                <div className="space-y-6">
                  <BuyStockView 
                    suppliers={suppliers}
                    products={products}
                    purchaseOrders={purchaseOrders}
                    onReload={() => loadAllData(false)}
                  />
                  <DepartmentSubStaff 
                    department="procurement"
                    departmentTitle="Buy Stock (Procurement)"
                    staffList={staffList}
                    onReload={() => loadAllData(false)}
                    currentUser={currentUser}
                  />
                </div>
              )}

              {activeTab === 'warehouse' && (
                <div className="space-y-6">
                  <WarehouseView 
                    products={products}
                    suppliers={suppliers}
                    onReload={() => loadAllData(false)}
                    currentUser={currentUser}
                  />
                  <DepartmentSubStaff 
                    department="godown"
                    departmentTitle="Warehouse (Godown)"
                    staffList={staffList}
                    onReload={() => loadAllData(false)}
                    currentUser={currentUser}
                  />
                </div>
              )}

              {activeTab === 'dispatch' && (
                <div className="space-y-6">
                  <DispatchView 
                    products={products}
                    deliveryChallans={deliveryChallans}
                    onReload={() => loadAllData(false)}
                    onPrintChallan={setActiveChallanForPrint}
                    currentUser={currentUser}
                  />
                  <DepartmentSubStaff 
                    department="dispatch"
                    departmentTitle="Shipping & Logistics (Dispatch)"
                    staffList={staffList}
                    onReload={() => loadAllData(false)}
                    currentUser={currentUser}
                  />
                </div>
              )}

              {activeTab === 'khata' && (
                <KhataView 
                  purchaseOrders={purchaseOrders}
                  deliveryChallans={deliveryChallans}
                  staffList={staffList}
                  khataSummary={khataSummary}
                  hideFinancials={currentUser?.hide_financials}
                  currentUser={currentUser}
                  onReload={() => loadAllData(false)}
                />
              )}

              {activeTab === 'catalog' && (
                <CatalogView 
                  products={products}
                  suppliers={suppliers}
                  onReload={() => loadAllData(false)}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'suppliers' && (
                <SuppliersView 
                  suppliers={suppliers}
                  purchaseOrders={purchaseOrders}
                  onReload={() => loadAllData(false)}
                />
              )}

              {activeTab === 'staff' && (
                <div className="space-y-6">
                  <TeamAccessControl 
                    staffList={staffList}
                    visibilitySettings={visibilitySettings}
                    onReload={() => loadAllData(false)}
                  />
                  <StaffView 
                    staffList={staffList}
                    onReload={() => loadAllData(false)}
                  />
                </div>
              )}

              {activeTab === 'logs' && (
                <LogsView logs={logs} />
              )}

              {activeTab === 'terminal' && (
                <BarcodeTerminalView 
                  products={products}
                  currentUser={currentUser}
                  onReload={() => loadAllData(false)}
                />
              )}
            </>
          )}
        </div>
      </main>

            {/* ORGANISATION PROFILE & SETTINGS MODAL */}
      {isOrgModalOpen && (
        <OrganizationSettingsModal 
          initialProfile={orgProfile}
          isOpen={isOrgModalOpen}
          onClose={() => setIsOrgModalOpen(false)}
          onSuccess={(updated) => {
            setOrgProfile(updated);
            setCompanyCode(updated.company_code);
            triggerToast('Organization profile updated successfully!', 'success');
          }}
        />
      )}

      {/* PRINT-READY DELIVERY CHALLAN MODAL */}
      {activeChallanForPrint && (
        <PrintChallanModal 
          challan={activeChallanForPrint} 
          orgProfile={orgProfile}
          onClose={() => setActiveChallanForPrint(null)} 
        />
      )}

      {/* PROMPT 3: OWNER PERMISSIONS ENGINE MODAL */}
      {isTeamPermissionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <TeamAccessControl 
            staffList={staffList}
            visibilitySettings={visibilitySettings}
            onReload={() => loadAllData(false)}
            onClose={() => setIsTeamPermissionsModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ==========================================
// NAVIGATION ITEMS
// ==========================================

function NavItem({ 
  icon, 
  label, 
  isActive, 
  onClick, 
  badge, 
  isCollapsed 
}: { 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
  badge?: number; 
  isCollapsed?: boolean; 
}) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
        isActive 
          ? 'bg-zinc-950 text-white shadow-xs' 
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      <div className="flex items-center">
        <span className={isCollapsed ? '' : 'mr-3'}>{icon}</span>
        {!isCollapsed && <span className="truncate">{label}</span>}
      </div>
      {!isCollapsed && typeof badge === 'number' && badge > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          isActive ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileDrawerItem({
  icon,
  label,
  isActive,
  onClick,
  badge
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
        isActive
          ? 'bg-zinc-950 text-white shadow-xs'
          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
      }`}
    >
      <div className="flex items-center space-x-3">
        <span className={isActive ? 'text-white' : 'text-zinc-500'}>{icon}</span>
        <span>{label}</span>
      </div>
      {typeof badge === 'number' && badge > 0 && (
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
          isActive ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-800'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ==========================================
// 1. DASHBOARD VIEW (STREAMLINED OPERATIONAL PULSE)
// ==========================================

function DashboardView({
  products,
  purchaseOrders,
  deliveryChallans,
  staffList,
  logs,
  onNavigate,
  onReload,
  currentUser
}: {
  products: ProductItem[];
  purchaseOrders: PurchaseOrder[];
  deliveryChallans: DeliveryChallan[];
  staffList: StaffMember[];
  logs: LogItem[];
  onNavigate: (tab: ActiveTab) => void;
  onReload: () => void;
  currentUser?: StaffMember | null;
}) {
  const totalStockUnits = products.reduce((acc, p) => acc + (p.current_qty || 0), 0);
  const lowStockItems = products.filter(p => p.current_qty <= p.min_alert_qty);
  const pendingPOs = purchaseOrders.filter(p => p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED');
  const pendingDCs = deliveryChallans.filter(d => d.status === 'READY');

  // Total valuation
  const totalInventoryValuation = products.reduce((acc, p) => acc + (p.current_qty * (p.cost_price || 0)), 0);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto">
      {/* 5 KPI STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard title="Total SKUs" value={products.length} sub="Catalog Items" icon={<Package size={17} />} />
        <StatCard title="Total Stock Units" value={totalStockUnits} sub={formatINR(totalInventoryValuation, currentUser?.hide_financials)} icon={<Warehouse size={17} />} />
        <StatCard title="Low Stock Alerts" value={lowStockItems.length} sub="Need procurement" alert={lowStockItems.length > 0} icon={<AlertTriangle size={17} />} />
        <StatCard title="Open POs" value={pendingPOs.length} sub="Inward pipeline" icon={<ShoppingBag size={17} />} />
        <StatCard title="Pending Dispatches" value={pendingDCs.length} sub="Ready for delivery" icon={<Truck size={17} />} />
      </div>

      {/* TWO COLUMN GRID: FAST MOVERS & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Top Products & Margins (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-zinc-200/80 flex justify-between items-center bg-zinc-50/50">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">Key Products & Margins</h3>
                <p className="text-xs text-zinc-500">Fast movers and pricing overview</p>
              </div>
              <button 
                onClick={() => onNavigate('catalog')}
                className="text-xs font-bold text-zinc-900 hover:underline flex items-center"
              >
                Catalog <ChevronRight size={14} className="ml-0.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Selling</th>
                    <th className="p-3 text-center">Margin</th>
                    <th className="p-3 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.slice(0, 5).map(p => {
                    const margin = p.margin_pct || 0;
                    return (
                      <tr key={p.item_code} className="hover:bg-zinc-50/80 transition">
                        <td className="p-3">
                          <div className="font-semibold text-zinc-900 truncate max-w-[140px] sm:max-w-none">{p.item_name}</div>
                          <div className="font-mono text-zinc-400 text-[10px]">{p.item_code}</div>
                        </td>
                        <td className="p-3 text-zinc-600">
                          <span className="bg-zinc-100 px-2 py-0.5 rounded-md text-[10px] font-medium">{p.category}</span>
                        </td>
                        <td className="p-3 text-right font-mono text-zinc-600">{formatINR(p.cost_price, currentUser?.hide_financials)}</td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-900">{formatINR(p.selling_price, currentUser?.hide_financials)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            margin >= 20 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            margin >= 10 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-bold ${p.current_qty <= p.min_alert_qty ? 'text-red-600' : 'text-zinc-900'}`}>
                            {p.current_qty}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts & Recent Ledger (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Low Stock Thresholds */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center">
                <AlertTriangle size={15} className="text-amber-600 mr-1.5" />
                Low Stock Thresholds
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                lowStockItems.length > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {lowStockItems.length} Alert{lowStockItems.length === 1 ? '' : 's'}
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-xs">
                <CheckCircle2 size={24} className="mx-auto mb-1.5 text-emerald-500 opacity-70" />
                All warehouse items healthy above threshold.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {lowStockItems.map(p => (
                  <div key={p.item_code} className="p-2.5 bg-red-50/50 border border-red-100 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-zinc-900 truncate max-w-[130px]">{p.item_name}</div>
                      <div className="font-mono text-zinc-500 text-[10px]">{p.item_code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600 text-xs">{p.current_qty} left</div>
                      <button 
                        onClick={() => onNavigate('buy-stock')}
                        className="text-[10px] font-bold text-zinc-900 underline mt-0.5 hover:text-zinc-700"
                      >
                        Order PO →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Ledger Snippet */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center">
                <History size={15} className="text-zinc-500 mr-1.5" />
                Recent Audit Trail
              </h3>
              <button onClick={() => onNavigate('logs')} className="text-xs font-bold text-zinc-600 hover:text-zinc-900">
                View all →
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {logs.slice(0, 4).map(lg => (
                <div key={lg.txn_id} className="p-2.5 rounded-xl border border-zinc-100 text-xs flex justify-between items-center hover:bg-zinc-50 transition">
                  <div>
                    <div className="font-semibold text-zinc-900">{lg.item_code}</div>
                    <div className="text-[10px] text-zinc-400">{lg.timestamp}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      lg.txn_type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {lg.txn_type === 'IN' ? '+' : '-'}{lg.quantity}
                    </span>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Bal: {lg.resulting_qty}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  sub, 
  icon, 
  alert 
}: { 
  title: string; 
  value: string | number; 
  sub?: string; 
  icon: React.ReactNode; 
  alert?: boolean; 
}) {
  return (
    <div className={`p-4 rounded-2xl border bg-white shadow-xs transition-all ${
      alert ? 'border-red-200 bg-red-50/20' : 'border-zinc-200/80 hover:border-zinc-300'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{title}</span>
        <span className={`p-1.5 rounded-lg ${alert ? 'text-red-600 bg-red-50' : 'text-zinc-500 bg-zinc-100'}`}>
          {icon}
        </span>
      </div>
      <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${alert ? 'text-red-600' : 'text-zinc-950'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">{sub}</div>}
    </div>
  );
}

// ==========================================
// 2. BUY STOCK VIEW (PURCHASE ORDERS & GOODS RECEIPT)
// ==========================================

function BuyStockView({
  suppliers,
  products,
  purchaseOrders,
  onReload
}: {
  suppliers: Supplier[];
  products: ProductItem[];
  purchaseOrders: PurchaseOrder[];
  onReload: () => void;
}) {
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.supplier_id || '');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Line items state
  const [lines, setLines] = useState<Array<{ item_code: string; qty: number; cost_price: number }>>([
    { item_code: products[0]?.item_code || '', qty: 5, cost_price: products[0]?.cost_price || 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receiving goods modal
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receiveInputs, setReceiveInputs] = useState<Record<string, number>>({});

  const addLine = () => {
    setLines([...lines, { item_code: products[0]?.item_code || '', qty: 1, cost_price: products[0]?.cost_price || 0 }]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleProductSelect = (idx: number, code: string) => {
    const prod = products.find(p => p.item_code === code);
    const updated = [...lines];
    updated[idx].item_code = code;
    if (prod && prod.cost_price) {
      updated[idx].cost_price = prod.cost_price;
    }
    setLines(updated);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert("Please select a supplier.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.createPurchaseOrder({
        supplier_id: supplierId,
        items: lines.map(l => ({ item_code: l.item_code, qty_ordered: Number(l.qty), cost_price: Number(l.cost_price) })),
        expected_date: expectedDate || undefined,
        notes: notes || undefined,
        status: 'ORDERED'
      });
      alert("✅ Purchase Order created successfully!");
      setNotes('');
      onReload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setReceivingPO(po);
    const initial: Record<string, number> = {};
    po.items.forEach(it => {
      const remaining = it.qty_ordered - it.qty_received;
      initial[it.item_code] = remaining > 0 ? remaining : 0;
    });
    setReceiveInputs(initial);
  };

  const handleExecuteReceive = async () => {
    if (!receivingPO) return;
    try {
      const itemsToReceive = Object.entries(receiveInputs)
        .filter(([_, qty]) => qty > 0)
        .map(([code, qty]) => ({ item_code: code, qty_received: qty }));

      if (itemsToReceive.length === 0) {
        alert("Enter positive received quantities for at least one item.");
        return;
      }

      await api.receivePOGoods(receivingPO.po_id, itemsToReceive);
      alert(`✅ Goods received! Warehouse stock updated.`);
      setReceivingPO(null);
      onReload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const totalPOCalculated = lines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.cost_price || 0)), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CREATE PO FORM (5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Create Inward Purchase Order</h3>
            <p className="text-xs text-gray-500">Order inventory from verified suppliers.</p>
          </div>

          <form onSubmit={handleCreatePO} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Supplier *</label>
              <select 
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              >
                <option value="">-- Select Vendor --</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.name} ({s.payment_terms})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Delivery Date</label>
              <input 
                type="date" 
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-700">Order Line Items</label>
                <button 
                  type="button" 
                  onClick={addLine}
                  className="text-xs font-bold text-gray-900 hover:underline flex items-center"
                >
                  <Plus size={13} className="mr-0.5" /> Add Row
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {lines.map((ln, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <select 
                        value={ln.item_code}
                        onChange={e => handleProductSelect(idx, e.target.value)}
                        className="flex-1 mr-2 px-2 py-1.5 border border-gray-300 rounded bg-white text-xs font-mono"
                      >
                        {products.map(p => (
                          <option key={p.item_code} value={p.item_code}>{p.item_code} - {p.item_name}</option>
                        ))}
                      </select>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(idx)} className="text-red-500 font-bold px-1">✕</button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-500">Qty:</span>
                        <input 
                          type="number" 
                          min="1"
                          value={ln.qty}
                          onChange={e => {
                            const copy = [...lines];
                            copy[idx].qty = parseInt(e.target.value, 10) || 1;
                            setLines(copy);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500">Cost (₹):</span>
                        <input 
                          type="number" 
                          step="0.01"
                          value={ln.cost_price}
                          onChange={e => {
                            const copy = [...lines];
                            copy[idx].cost_price = parseFloat(e.target.value) || 0;
                            setLines(copy);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Terms</label>
              <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Standard warranty applies, gate pass required."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-500 block">Total PO Value:</span>
                <span className="text-base font-bold text-gray-900 font-mono">{formatINR(totalPOCalculated)}</span>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Issue Purchase Order'}
              </button>
            </div>
          </form>
        </div>

        {/* PO HISTORY & GOODS RECEIPT LIST (7 COLS) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Purchase Orders Pipeline</h3>
              <p className="text-xs text-gray-500">Click "Receive Goods" when physical units arrive at warehouse.</p>
            </div>
            <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
              {purchaseOrders.length} Orders
            </span>
          </div>

          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
            {purchaseOrders.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No purchase orders created yet.
              </div>
            ) : (
              purchaseOrders.map(po => {
                const canReceive = po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED';
                return (
                  <div key={po.po_id} className="py-4 hover:bg-gray-50/60 transition p-2 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                          {po.po_id}
                        </span>
                        <span className="font-bold text-gray-900 text-xs">{po.supplier_name || po.supplier_id}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          po.status === 'FULLY_RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                          po.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-100 text-amber-800' :
                          po.status === 'ORDERED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {po.status}
                        </span>
                        <span className="font-bold text-xs font-mono text-gray-900">{formatINR(po.total_amount)}</span>
                      </div>
                    </div>

                    {/* PO Items */}
                    <div className="bg-gray-50 rounded-lg p-2.5 text-xs mb-2 border border-gray-200/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {po.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="font-mono text-gray-700">{it.item_code} ({it.item_name})</span>
                            <span className="text-gray-600 font-semibold">
                              Recv: {it.qty_received} / {it.qty_ordered}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-500">
                      <span>Expected: {po.expected_date || 'ASAP'}</span>
                      {canReceive && (
                        <button 
                          onClick={() => openReceiveModal(po)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center transition"
                        >
                          <ArrowDownToLine size={13} className="mr-1" />
                          Receive Inward Goods
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RECEIVE GOODS MODAL */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Goods Inward Checklist</h3>
                <p className="text-xs text-gray-500">PO: {receivingPO.po_id}</p>
              </div>
              <button onClick={() => setReceivingPO(null)} className="text-gray-400 hover:text-gray-700 text-sm font-bold">✕</button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-600">Enter physical quantities inspected and unloaded into warehouse:</p>
              {receivingPO.items.map(it => {
                const rem = it.qty_ordered - it.qty_received;
                return (
                  <div key={it.item_code} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-xs">{it.item_name || it.item_code}</div>
                      <div className="text-[10px] text-gray-500 font-mono">Ordered: {it.qty_ordered} | Already Recv: {it.qty_received}</div>
                    </div>
                    <div className="w-24">
                      <span className="text-[10px] text-gray-500 block">This Batch:</span>
                      <input 
                        type="number"
                        min="0"
                        max={rem}
                        value={receiveInputs[it.item_code] || 0}
                        onChange={e => setReceiveInputs({ ...receiveInputs, [it.item_code]: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-2">
              <button 
                onClick={() => setReceivingPO(null)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleExecuteReceive}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                Confirm Stock Inward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. WAREHOUSE VIEW
// ==========================================

function WarehouseView({
  products,
  suppliers,
  onReload,
  currentUser
}: {
  products: ProductItem[];
  suppliers: Supplier[];
  onReload: () => void;
  currentUser?: StaffMember | null;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Stock Adjustment Form
  const [adjustCode, setAdjustCode] = useState(products[0]?.item_code || '');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const categories = Array.from(new Set(products.map(p => p.category || 'General')));

  const filtered = products.filter(p => {
    const matchSearch = p.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.barcode && p.barcode.includes(searchTerm));
    const matchCat = catFilter === 'ALL' || p.category === catFilter;
    const isLow = p.current_qty <= p.min_alert_qty;
    const isOut = p.current_qty === 0;

    let matchStatus = true;
    if (statusFilter === 'IN_STOCK') matchStatus = p.current_qty > p.min_alert_qty;
    if (statusFilter === 'LOW_STOCK') matchStatus = isLow && !isOut;
    if (statusFilter === 'OUT_OF_STOCK') matchStatus = isOut;

    return matchSearch && matchCat && matchStatus;
  });

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) return;

    setIsAdjusting(true);
    try {
      if (adjustType === 'IN') {
        await api.stockIn(adjustCode, qty, 'Warehouse Manager');
      } else {
        await api.stockOut(adjustCode, qty, 'Warehouse Manager');
      }
      alert(`✅ Stock adjusted for ${adjustCode}: ${adjustType} ${qty}`);
      setAdjustQty('');
      onReload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Controls & Adjustment Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Summary Banner (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Warehouse Physical Stock</h3>
                <p className="text-xs text-gray-500">Real-time balances across electronics inventory</p>
              </div>
              <div className="flex space-x-2">
                <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded">
                  {products.length} Products
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="relative">
                <Search size={14} className="text-gray-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Barcode or item name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <select 
                value={catFilter} 
                onChange={e => setCatFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock (Healthy)</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Correction / Adjustment Terminal (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2 flex items-center">
            <BarChart3 size={15} className="mr-1.5 text-gray-500" />
            Stock Adjustment Tool
          </h4>
          <form onSubmit={handleStockAdjustment} className="space-y-3">
            <select 
              value={adjustCode}
              onChange={e => setAdjustCode(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono bg-white"
            >
              {products.map(p => (
                <option key={p.item_code} value={p.item_code}>{p.item_code} ({p.current_qty} avail)</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select 
                value={adjustType}
                onChange={e => setAdjustType(e.target.value as 'IN' | 'OUT')}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-bold"
              >
                <option value="IN">+ Add (Inward)</option>
                <option value="OUT">- Deduct (Damage/Loss)</option>
              </select>
              <input 
                type="number"
                min="1"
                required
                placeholder="Units"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>

            <button 
              type="submit"
              disabled={isAdjusting}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              {isAdjusting ? 'Applying...' : 'Apply Adjustment'}
            </button>
          </form>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <th className="p-3">Barcode / Code</th>
                <th className="p-3">Item Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Cost Price</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-center">Margin</th>
                <th className="p-3 text-right">Current Stock</th>
                <th className="p-3 text-center">Health Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => {
                const ratio = Math.min(100, Math.round((p.current_qty / (p.min_alert_qty * 2 || 10)) * 100));
                const isLow = p.current_qty <= p.min_alert_qty;
                return (
                  <tr key={p.item_code} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-mono font-bold text-gray-900">{p.item_code}</div>
                      {p.barcode && <div className="font-mono text-gray-400 text-[10px]">{p.barcode}</div>}
                    </td>
                    <td className="p-3 font-semibold text-gray-900">{p.item_name}</td>
                    <td className="p-3 text-gray-600">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px]">{p.category}</span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-600">{formatINR(p.cost_price, currentUser?.hide_financials)}</td>
                    <td className="p-3 text-right font-mono font-bold text-gray-900">{formatINR(p.selling_price, currentUser?.hide_financials)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                        (p.margin_pct || 0) >= 20 ? 'bg-emerald-100 text-emerald-800' :
                        (p.margin_pct || 0) >= 10 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.margin_pct}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-bold text-sm ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
                        {p.current_qty} units
                      </span>
                      <div className="text-[10px] text-gray-400">Min: {p.min_alert_qty}</div>
                    </td>
                    <td className="p-3">
                      <div className="w-24 mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${ratio}%` }} 
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. DISPATCH VIEW (DELIVERY CHALLANS & SALES)
// ==========================================

function DispatchView({
  products,
  deliveryChallans,
  onReload,
  onPrintChallan,
  currentUser
}: {
  products: ProductItem[];
  deliveryChallans: DeliveryChallan[];
  onReload: () => void;
  onPrintChallan: (dc: DeliveryChallan) => void;
  currentUser?: StaffMember | null;
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ item_code: string; qty: number; selling_price: number }>>([
    { item_code: products[0]?.item_code || '', qty: 1, selling_price: products[0]?.selling_price || 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addLine = () => {
    setLines([...lines, { item_code: products[0]?.item_code || '', qty: 1, selling_price: products[0]?.selling_price || 0 }]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleProductSelect = (idx: number, code: string) => {
    const prod = products.find(p => p.item_code === code);
    const copy = [...lines];
    copy[idx].item_code = code;
    if (prod && prod.selling_price) {
      copy[idx].selling_price = prod.selling_price;
    }
    setLines(copy);
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Customer name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createDeliveryChallan({
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: address,
        status: 'READY',
        notes: notes,
        items: lines.map(l => ({ item_code: l.item_code, quantity: Number(l.qty), selling_price: Number(l.selling_price) }))
      });

      if (res.warnings && res.warnings.length > 0) {
        alert(`Challan Created with warnings:\n${res.warnings.join('\n')}`);
      } else {
        alert("✅ Delivery Challan created!");
      }
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setNotes('');
      onReload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchAction = async (dcId: string) => {
    if (!confirm(`Confirm physical dispatch for challan ${dcId}? Stock will be deducted from warehouse.`)) return;

    try {
      const res = await api.dispatchDeliveryChallan(dcId, 'Owner');
      alert(`✅ Challan dispatched successfully!\n${res.messages.join('\n')}`);
      onReload();
    } catch (err: any) {
      alert(`Dispatch Error: ${err.message}`);
    }
  };

  const totalCalculated = lines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.selling_price || 0)), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CREATE CHALLAN FORM (5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Issue Delivery Challan</h3>
            <p className="text-xs text-gray-500">Pick laptops/tablets from shelf and prepare dispatch.</p>
          </div>

          <form onSubmit={handleCreateChallan} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Customer / Client Name *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Infosys Corp / Tech Retailers"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                <input 
                  type="text" 
                  placeholder="+919876543210"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dispatch Notes</label>
                <input 
                  type="text" 
                  placeholder="Gate pass # / PO ref"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Shipping / Delivery Address</label>
              <textarea 
                rows={2}
                placeholder="Delivery address..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            {/* Line items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-700">Dispatch Items</label>
                <button type="button" onClick={addLine} className="text-xs font-bold text-gray-900 flex items-center hover:underline">
                  <Plus size={13} className="mr-0.5" /> Add Row
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {lines.map((ln, idx) => (
                  <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <select 
                        value={ln.item_code}
                        onChange={e => handleProductSelect(idx, e.target.value)}
                        className="flex-1 mr-2 px-2 py-1.5 border border-gray-300 rounded bg-white text-xs font-mono"
                      >
                        {products.map(p => (
                          <option key={p.item_code} value={p.item_code}>
                            {p.item_code} ({p.current_qty} in stock)
                          </option>
                        ))}
                      </select>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(idx)} className="text-red-500 font-bold px-1">✕</button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-500">Qty:</span>
                        <input 
                          type="number"
                          min="1"
                          value={ln.qty}
                          onChange={e => {
                            const copy = [...lines];
                            copy[idx].qty = parseInt(e.target.value, 10) || 1;
                            setLines(copy);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500">Price (₹):</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={ln.selling_price}
                          onChange={e => {
                            const copy = [...lines];
                            copy[idx].selling_price = parseFloat(e.target.value) || 0;
                            setLines(copy);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-500 block">Total Invoice:</span>
                <span className="text-base font-bold text-gray-900 font-mono">{formatINR(totalCalculated)}</span>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Challan'}
              </button>
            </div>
          </form>
        </div>

        {/* CHALLANS LIST (7 COLS) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Delivery Challans & Dispatch Register</h3>
              <p className="text-xs text-gray-500">Review readiness, print packing slip, and confirm dispatch.</p>
            </div>
            <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
              {deliveryChallans.length} Challans
            </span>
          </div>

          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
            {deliveryChallans.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No delivery challans issued yet.
              </div>
            ) : (
              deliveryChallans.map(dc => {
                const canDispatch = dc.status === 'READY' || dc.status === 'DRAFT';
                return (
                  <div key={dc.dc_id} className="py-4 hover:bg-gray-50/60 transition p-2 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                          {dc.dc_id}
                        </span>
                        <span className="font-bold text-gray-900 text-xs">{dc.customer_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          dc.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-800' :
                          dc.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {dc.status}
                        </span>
                        <span className="font-bold text-xs font-mono text-gray-900">{formatINR(dc.total_amount)}</span>
                      </div>
                    </div>

                    {/* DC Items list */}
                    <div className="bg-gray-50 rounded-lg p-2.5 text-xs mb-2 border border-gray-200/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        {dc.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="font-mono text-gray-700">{it.item_code} × {it.quantity}</span>
                            <span className="font-mono text-gray-600 font-semibold">{formatINR(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <div className="text-gray-500 truncate max-w-xs">{dc.delivery_address || 'Walk-in Delivery'}</div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => onPrintChallan(dc)}
                          className="px-2.5 py-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-semibold text-xs flex items-center transition border border-gray-300"
                        >
                          <Printer size={13} className="mr-1" />
                          Slip
                        </button>
                        {canDispatch && (
                          <button 
                            onClick={() => handleDispatchAction(dc.dc_id)}
                            className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded font-bold text-xs flex items-center transition"
                          >
                            <Truck size={13} className="mr-1" />
                            Dispatch Stock
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. CATALOG VIEW
// ==========================================

function CatalogView({
  products,
  suppliers,
  onReload,
  currentUser
}: {
  products: ProductItem[];
  suppliers: Supplier[];
  onReload: () => void;
  currentUser?: StaffMember | null;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Product Master & Barcode Directory</h3>
          <p className="text-xs text-gray-500">Configure prices, alert levels, and primary distributors</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition"
        >
          <Plus size={15} className="mr-1.5" />
          Add Product
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <th className="p-3">Item Code</th>
                <th className="p-3">Barcode</th>
                <th className="p-3">Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Cost (₹)</th>
                <th className="p-3 text-right">Selling (₹)</th>
                <th className="p-3 text-center">Margin</th>
                <th className="p-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.item_code} className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold text-gray-900">{p.item_code}</td>
                  <td className="p-3 font-mono text-gray-500 text-[11px]">{p.barcode || '—'}</td>
                  <td className="p-3 font-semibold text-gray-900">{p.item_name}</td>
                  <td className="p-3 text-gray-600">{p.category}</td>
                  <td className="p-3 text-right font-mono text-gray-600">{formatINR(p.cost_price, currentUser?.hide_financials)}</td>
                  <td className="p-3 text-right font-mono font-bold text-gray-900">{formatINR(p.selling_price, currentUser?.hide_financials)}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-gray-100 text-gray-800">
                      {p.margin_pct}%
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900">{p.current_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddProductModal 
          isOpen={isModalOpen} 
          suppliers={suppliers} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={onReload} 
        />
      )}
    </div>
  );
}

// ==========================================
// 6. SUPPLIERS VIEW
// ==========================================

function SuppliersView({
  suppliers,
  purchaseOrders,
  onReload
}: {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onReload: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Authorized Suppliers & Vendors</h3>
          <p className="text-xs text-gray-500">Track distributors, credit terms, and purchase histories</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition"
        >
          <Plus size={15} className="mr-1.5" />
          Add Supplier
        </button>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {suppliers.map(sup => (
          <div 
            key={sup.supplier_id}
            onClick={() => setSelectedSupplier(sup)}
            className="bg-white border border-gray-200 hover:border-gray-900 rounded-xl p-5 shadow-xs cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-gray-400 font-bold">{sup.supplier_id}</span>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {sup.payment_terms || 'Net 30'}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">{sup.name}</h4>
              <p className="text-xs text-gray-500 mb-3">{sup.contact_person || 'Commercial Desk'}</p>

              <div className="space-y-1 text-xs text-gray-600 mb-4">
                <div className="truncate font-mono">{sup.phone || 'No phone'}</div>
                <div className="truncate">{sup.email || 'No email'}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block">Total Spend:</span>
                <span className="font-bold font-mono text-gray-900">{formatINR(sup.total_spend || 0)}</span>
              </div>
              <span className="text-xs font-bold text-gray-900 flex items-center">
                History <ChevronRight size={13} className="ml-0.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Detail Side Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white h-full max-w-lg w-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
                <div>
                  <span className="font-mono text-xs text-gray-400 font-bold">{selectedSupplier.supplier_id}</span>
                  <h3 className="font-bold text-gray-900 text-base">{selectedSupplier.name}</h3>
                </div>
                <button onClick={() => setSelectedSupplier(null)} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
              </div>

              <div className="space-y-3 text-xs mb-6">
                <div><span className="text-gray-400">Contact:</span> <span className="font-semibold">{selectedSupplier.contact_person}</span></div>
                <div><span className="text-gray-400">Phone:</span> <span className="font-mono font-semibold">{selectedSupplier.phone}</span></div>
                <div><span className="text-gray-400">Email:</span> <span className="font-mono">{selectedSupplier.email}</span></div>
                <div><span className="text-gray-400">Terms:</span> <span className="font-semibold">{selectedSupplier.payment_terms}</span></div>
                <div><span className="text-gray-400">Address:</span> <p className="mt-1 text-gray-600">{selectedSupplier.address || '—'}</p></div>
              </div>

              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">Purchase Orders Placed</h4>
              <div className="space-y-2">
                {purchaseOrders.filter(p => p.supplier_id === selectedSupplier.supplier_id).map(po => (
                  <div key={po.po_id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-gray-900">{po.po_id}</div>
                      <div className="text-[10px] text-gray-400">{po.created_at}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-gray-900">{formatINR(po.total_amount)}</div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-800">{po.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button 
                onClick={() => setSelectedSupplier(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-xs"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddSupplierModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={onReload} 
        />
      )}
    </div>
  );
}

// ==========================================
// 7. STAFF VIEW (TEAM ACCESS & ROLES)
// ==========================================

function StaffView({
  staffList,
  onReload
}: {
  staffList: StaffMember[];
  onReload: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pendingStaff = staffList.filter(s => s.status === 'PENDING');
  const activeStaff = staffList.filter(s => s.status !== 'PENDING');

  const handleUpdateStatus = async (staffId: number | undefined, newStatus: string) => {
    if (!staffId) return;
    try {
      await api.updateStaffStatus(staffId, newStatus);
      alert(`Staff status updated to ${newStatus}`);
      onReload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Team Members & Access Roles</h3>
          <p className="text-xs text-gray-500">Manage employee permissions, roles, and PIN-protected web authorization.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition"
        >
          <Plus size={15} className="mr-1.5" />
          Add Staff
        </button>
      </div>

      {/* PENDING APPROVAL QUEUE */}
      {pendingStaff.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h4 className="font-bold text-amber-900 text-sm mb-3 flex items-center">
            <Clock size={16} className="mr-2 text-amber-600" />
            Pending Staff Access Requests ({pendingStaff.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingStaff.map(stf => (
              <div key={stf.staff_id} className="bg-white p-3.5 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-gray-900">{stf.name}</div>
                  <div className="font-mono text-gray-500 text-[11px]">{stf.phone}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Source: {stf.added_by}</div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleUpdateStatus(stf.staff_id, 'ACTIVE')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center"
                  >
                    <Check size={12} className="mr-1" /> Approve
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(stf.staff_id, 'REJECTED')}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-red-600 rounded font-bold text-xs"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE STAFF TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <th className="p-3">Team Member</th>
                <th className="p-3">Role</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Access PIN</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Activity</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeStaff.map(stf => (
                <tr key={stf.staff_id} className="hover:bg-gray-50">
                  <td className="p-3 font-semibold text-gray-900">{stf.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-800">
                      {stf.role || 'STAFF'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-gray-700">{stf.phone}</td>
                  <td className="p-3 font-mono text-gray-500">•••• ({stf.pin || '1234'})</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      stf.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {stf.status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-gray-800">{stf.txn_count || 0}</td>
                  <td className="p-3 text-right">
                    {stf.status === 'ACTIVE' ? (
                      <button 
                        onClick={() => handleUpdateStatus(stf.staff_id, 'SUSPENDED')}
                        className="text-red-600 hover:underline font-semibold"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(stf.staff_id, 'ACTIVE')}
                        className="text-emerald-600 hover:underline font-semibold"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddStaffModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={onReload} 
        />
      )}
    </div>
  );
}

// ==========================================
// 8. LOGS / AUDIT LEDGER VIEW
// ==========================================

function LogsView({ logs }: { logs: LogItem[] }) {
  return (
    <div className="max-w-7xl mx-auto bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Immutable Transaction Ledger</h3>
          <p className="text-xs text-gray-500">Every inward & outward physical movement permanently recorded</p>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href="/api/reports/transactions-csv"
            download="apex_audit_ledger.csv"
            className="flex items-center px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-semibold shadow-xs"
            title="Download CSV of Audit Ledger"
          >
            <Download size={13} className="mr-1 text-gray-500" />
            Export Ledger CSV
          </a>
          <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
            {logs.length} Entries
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
              <th className="p-3">Txn #</th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Actor / Reference</th>
              <th className="p-3">Item Code</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Resulting Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map(lg => {
              const isIN = lg.txn_type === 'IN';
              return (
                <tr key={lg.txn_id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-gray-400">#{String(lg.txn_id).padStart(4, '0')}</td>
                  <td className="p-3 text-gray-600 font-mono">{lg.timestamp}</td>
                  <td className="p-3 font-semibold text-gray-800">{lg.actor_phone}</td>
                  <td className="p-3 font-mono font-bold text-gray-900">{lg.item_code}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isIN ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {isIN ? '+ IN' : '- OUT'}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-bold ${isIN ? 'text-emerald-700' : 'text-orange-700'}`}>
                    {lg.quantity}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-gray-800">{lg.resulting_qty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 9. BARCODE TERMINAL VIEW
// ==========================================

function BarcodeTerminalView({
  products,
  currentUser,
  onReload
}: {
  products: ProductItem[];
  currentUser: StaffMember | null;
  onReload: () => void;
}) {
  const [scanQuery, setScanQuery] = useState('');
  const [scannedProduct, setScannedProduct] = useState<ProductItem | null>(null);
  const [recentMovements, setRecentMovements] = useState<Array<{
    id: string;
    item_code: string;
    item_name: string;
    direction: 'IN' | 'OUT';
    qty: number;
    resulting_qty: number;
    time: string;
  }>>([]);
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [direction, setDirection] = useState<'IN' | 'OUT'>('OUT');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio feedback synthesis using Web Audio API
  const playChime = useCallback((type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio safe fallback
    }
  }, [soundEnabled]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [scannedProduct]);

  const handleScanSubmit = (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const q = (directCode || scanQuery).trim();
    if (!q) return;

    const cleanQ = q.toUpperCase();
    const found = products.find(p => p.item_code.toUpperCase() === cleanQ || (p.barcode && p.barcode.toUpperCase() === cleanQ));
    if (found) {
      setScannedProduct(found);
      setFeedbackMsg({ text: `Found: ${found.item_name} (${found.current_qty} units in warehouse)`, type: 'success' });
      playChime('success');
    } else {
      setFeedbackMsg({ text: `No product matching '${q}' found in catalog.`, type: 'error' });
      playChime('error');
    }
    setScanQuery('');
  };

  const handleExecuteMove = async () => {
    if (!scannedProduct) return;
    if (qtyInput <= 0) {
      alert("Quantity must be at least 1.");
      return;
    }

    if (direction === 'OUT' && qtyInput > scannedProduct.current_qty) {
      setFeedbackMsg({ text: `Insufficient stock! Requested ${qtyInput}, but only ${scannedProduct.current_qty} available.`, type: 'error' });
      playChime('error');
      return;
    }

    setIsProcessing(true);
    try {
      const actorName = currentUser?.name || 'Terminal User';
      const res = await api.quickStockMove(scannedProduct.item_code, qtyInput, direction, actorName, notes);
      
      playChime('success');
      setFeedbackMsg({
        text: `✅ ${direction === 'IN' ? 'Stock Added +' : 'Stock Dispatched -'}${qtyInput} ${scannedProduct.item_name}. New Balance: ${res.product.current_qty}`,
        type: 'success'
      });

      setScannedProduct(res.product);

      setRecentMovements(prev => [{
        id: Date.now().toString(),
        item_code: res.product.item_code,
        item_name: res.product.item_name,
        direction,
        qty: qtyInput,
        resulting_qty: res.product.current_qty,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }, ...prev]);

      onReload();
    } catch (err: any) {
      playChime('error');
      setFeedbackMsg({ text: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center">
              <Scan size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Barcode Scanner & Fast Action Terminal</h2>
              <p className="text-xs text-gray-500">Auto-detects USB barcode scanners and keyboard entry for instant IN/OUT stock execution.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              soundEnabled ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}
            title="Toggle scanner audio feedback"
          >
            {soundEnabled ? <Volume2 size={15} className="mr-1.5 text-emerald-600" /> : <VolumeX size={15} className="mr-1.5" />}
            {soundEnabled ? 'Chime ON' : 'Chime Muted'}
          </button>

          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
            Scanner Ready
          </span>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barcode Search & Fast Adjustment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scanner Input Box */}
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-5 shadow-sm">
            <form onSubmit={e => handleScanSubmit(e)} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Scan Barcode / Enter Item Code (Press Enter):
              </label>
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={scanQuery}
                  onChange={e => setScanQuery(e.target.value)}
                  placeholder="Scan or type barcode (e.g. 194253991201 or MAC-M3-14)..."
                  className="w-full pl-11 pr-24 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <Scan size={20} className="absolute left-3.5 text-gray-500" />
                <button
                  type="submit"
                  className="absolute right-2 px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-lg transition"
                >
                  Lookup
                </button>
              </div>
            </form>

            {/* Quick Demo Scan Chips */}
            <div className="mt-3.5 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500 mr-1">Quick Select:</span>
              {products.slice(0, 5).map(p => (
                <button
                  key={p.item_code}
                  onClick={() => handleScanSubmit(undefined, p.item_code)}
                  className="text-[11px] font-mono px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md border border-gray-200 transition"
                >
                  {p.item_code}
                </button>
              ))}
            </div>

            {/* Feedback Alert Bar */}
            {feedbackMsg && (
              <div className={`mt-3.5 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
              }`}>
                <span>{feedbackMsg.text}</span>
                <button onClick={() => setFeedbackMsg(null)} className="text-gray-400 hover:text-gray-700 ml-2">✕</button>
              </div>
            )}
          </div>

          {/* Active Product Card & Movement Executor */}
          {scannedProduct ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800">
                    {scannedProduct.category}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-1">{scannedProduct.item_name}</h3>
                  <div className="text-xs text-gray-500 font-mono flex items-center space-x-3 mt-1">
                    <span>SKU: <strong className="text-gray-900">{scannedProduct.item_code}</strong></span>
                    {scannedProduct.barcode && <span>EAN: {scannedProduct.barcode}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-gray-500 uppercase font-semibold block">Warehouse Stock</span>
                  <span className={`text-2xl font-black font-mono ${
                    scannedProduct.current_qty <= (scannedProduct.min_alert_qty || 5) ? 'text-amber-600' : 'text-gray-900'
                  }`}>
                    {scannedProduct.current_qty} <span className="text-xs font-normal text-gray-500">units</span>
                  </span>
                </div>
              </div>

              {/* Pricing & Margins Pill Grid */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[11px]">Cost Price</span>
                  <span className="font-mono font-bold text-gray-900">{formatINR(scannedProduct.cost_price)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Selling Price</span>
                  <span className="font-mono font-bold text-gray-900">{formatINR(scannedProduct.selling_price)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Gross Margin</span>
                  <span className="font-bold text-emerald-700">+{scannedProduct.margin_pct}%</span>
                </div>
              </div>

              {/* Fast Movement Execution Form */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Execute Fast Movement:</span>
                  <div className="flex rounded-lg bg-gray-100 p-0.5 border border-gray-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDirection('OUT')}
                      className={`px-3 py-1 rounded-md transition ${
                        direction === 'OUT' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      - Stock OUT (Sales)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('IN')}
                      className={`px-3 py-1 rounded-md transition ${
                        direction === 'IN' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      + Stock IN (Restock)
                    </button>
                  </div>
                </div>

                {/* Quantity Chips */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Preset Quantities:</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 5, 10, 25].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQtyInput(q)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition border ${
                          qtyInput === q ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {direction === 'IN' ? `+${q}` : `-${q}`}
                      </button>
                    ))}
                    <div className="flex items-center space-x-1.5 ml-auto">
                      <span className="text-xs text-gray-500">Custom:</span>
                      <input
                        type="number"
                        min="1"
                        value={qtyInput}
                        onChange={e => setQtyInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Reference notes (e.g. Counter sale, shipment receipt, sample)..."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  onClick={handleExecuteMove}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-xs transition flex items-center justify-center ${
                    direction === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <Zap size={15} className="mr-2" />
                  {isProcessing ? 'Processing Transaction...' : `Confirm ${direction === 'IN' ? 'Stock Inward (+)' : 'Stock Outward (-)'} for ${qtyInput} Units`}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-400">
              <Package size={36} className="mx-auto text-gray-300 mb-2" />
              <h4 className="font-bold text-gray-700 text-sm">No SKU Active</h4>
              <p className="text-xs text-gray-500 mt-1">Scan a physical barcode or pick a SKU above to execute stock adjustments.</p>
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Session Activity Log (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs h-full flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-gray-900" />
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Terminal Session Activity</h4>
              </div>
              <span className="text-[11px] font-mono text-gray-500">{recentMovements.length} logged</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[350px] max-h-[550px] mt-2">
              {recentMovements.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <Clock size={28} className="text-gray-300 mb-2" />
                  <span className="text-xs">No movements logged in this session yet.</span>
                </div>
              ) : (
                recentMovements.map(m => (
                  <div key={m.id} className="py-3 flex items-start justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${m.direction === 'IN' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {m.item_name}
                      </div>
                      <div className="text-[11px] font-mono text-gray-500">{m.item_code}</div>
                      <div className="text-[10px] text-gray-400">New Warehouse Balance: <strong className="text-gray-700">{m.resulting_qty}</strong></div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        m.direction === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {m.direction === 'IN' ? `+${m.qty}` : `-${m.qty}`}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-1">{m.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintChallanModal({ 
  challan, 
  orgProfile,
  onClose 
}: { 
  challan: DeliveryChallan; 
  orgProfile?: OrganizationProfile;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-zinc-200 print:m-0 print:p-0 print:shadow-none print:border-none my-6">
        {/* Organisation & Challan Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-zinc-300 pb-4 mb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight uppercase">
              {orgProfile?.company_name || 'BLACKBOX TECH TRADING'}
            </h1>
            {orgProfile?.tagline && (
              <p className="text-xs text-zinc-500 font-medium">{orgProfile.tagline}</p>
            )}
            {orgProfile?.gstin && (
              <p className="text-xs font-mono font-bold text-zinc-800 mt-1">GSTIN: {orgProfile.gstin}</p>
            )}
            {orgProfile?.address && (
              <p className="text-[11px] text-zinc-600 max-w-xs leading-relaxed mt-0.5">{orgProfile.address}</p>
            )}
            {(orgProfile?.phone || orgProfile?.email) && (
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                {[orgProfile.phone, orgProfile.email].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>
          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-200 w-full sm:w-auto">
            <span className="inline-block px-3 py-1 bg-zinc-950 text-white font-black text-xs uppercase tracking-wider rounded-lg mb-1">
              Delivery Challan
            </span>
            <div className="text-xs text-zinc-600 font-mono font-bold mt-1">Ref: {challan.dc_id}</div>
            <div className="text-xs text-zinc-500">{challan.created_at || 'Date: Today'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-gray-50 p-4 rounded-lg">
          <div>
            <span className="font-bold text-gray-700 block">Deliver To:</span>
            <div className="font-semibold text-gray-900 text-sm">{challan.customer_name}</div>
            <div className="text-gray-600 font-mono">{challan.customer_phone}</div>
            <div className="text-gray-600 mt-1">{challan.delivery_address || 'Customer Handover'}</div>
          </div>
          <div className="text-right">
            <span className="font-bold text-gray-700 block">Challan Status:</span>
            <span className="font-bold uppercase text-gray-900">{challan.status}</span>
            <div className="text-gray-500 mt-1">Notes: {challan.notes || 'Goods dispatched in good order.'}</div>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 uppercase text-[11px]">
              <th className="p-2">Item Code / Description</th>
              <th className="p-2 text-center">Quantity</th>
              <th className="p-2 text-right">Unit Price (₹)</th>
              <th className="p-2 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {challan.items.map((it, idx) => (
              <tr key={idx}>
                <td className="p-2">
                  <div className="font-bold text-gray-900">{it.item_name || it.item_code}</div>
                  <div className="font-mono text-gray-500 text-[10px]">{it.item_code}</div>
                </td>
                <td className="p-2 text-center font-bold text-gray-900">{it.quantity}</td>
                <td className="p-2 text-right font-mono">{formatINR(it.selling_price)}</td>
                <td className="p-2 text-right font-mono font-bold">{formatINR(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Value */}
        <div className="flex justify-between items-center border-t border-zinc-300 pt-3 text-xs mb-4">
          <span className="text-xs font-bold text-zinc-700">Total Challan / Invoice Value:</span>
          <span className="text-xl font-black font-mono text-zinc-950">{formatINR(challan.total_amount)}</span>
        </div>

        {/* Bank & Payment Info for direct transfer */}
        {(orgProfile?.bank_account_no || orgProfile?.upi_id) && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs mb-4">
            <span className="font-bold text-zinc-800 block text-[11px] uppercase tracking-wider mb-1">Bank & Payment Details:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-zinc-700 font-mono">
              {orgProfile.bank_name && <div>Bank: <strong>{orgProfile.bank_name}</strong></div>}
              {orgProfile.bank_account_no && <div>A/C: <strong>{orgProfile.bank_account_no}</strong></div>}
              {orgProfile.bank_ifsc && <div>IFSC: <strong>{orgProfile.bank_ifsc}</strong></div>}
              {orgProfile.upi_id && <div>UPI: <strong>{orgProfile.upi_id}</strong></div>}
            </div>
          </div>
        )}

        {/* Terms & Signatures */}
        <div className="border-t border-zinc-200 pt-3 text-xs mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-0.5">Terms & Conditions:</span>
            <p className="text-[10px] text-zinc-500 whitespace-pre-line leading-relaxed">
              {orgProfile?.terms_and_conditions || '1. Goods dispatched in good order.\n2. Subject to local jurisdiction.'}
            </p>
          </div>
          <div className="flex flex-col justify-end text-right">
            <div className="text-[10px] font-bold text-zinc-700">For {orgProfile?.company_name || 'BLACKBOX ERP'}</div>
            <div className="mt-8 text-[11px] text-zinc-500 font-semibold border-t border-zinc-300 pt-1 inline-block self-end">
              Authorized Signatory & Stamp
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 print:hidden">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
            Close
          </button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold flex items-center"
          >
            <Printer size={14} className="mr-1.5" /> Print Challan
          </button>
        </div>
      </div>
    </div>
  );
}

function AddProductModal({ 
  isOpen, 
  suppliers, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  suppliers: Supplier[]; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [cat, setCat] = useState('Laptops');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.supplier_id || '');
  const [cost, setCost] = useState('');
  const [selling, setSelling] = useState('');
  const [qty, setQty] = useState('0');
  const [alertQty, setAlertQty] = useState('5');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.addOrUpdateProduct({
        item_code: code.trim().toUpperCase(),
        item_name: name.trim(),
        category: cat,
        barcode: barcode.trim(),
        supplier_id: supplierId,
        cost_price: parseFloat(cost) || 0,
        selling_price: parseFloat(selling) || 0,
        current_qty: parseInt(qty, 10) || 0,
        min_alert_qty: parseInt(alertQty, 10) || 5
      });
      alert("✅ Product saved successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-sm">Add New Product</h3>
          <button onClick={onClose} className="text-gray-400 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Item Code (SKU) *</label>
              <input required value={code} onChange={e => setCode(e.target.value)} placeholder="MAC-M3-14" className="w-full px-2.5 py-1.5 border rounded uppercase font-mono" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Barcode</label>
              <input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Scanner input" className="w-full px-2.5 py-1.5 border rounded font-mono" />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Product Description *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. MacBook Pro 14 M3" className="w-full px-2.5 py-1.5 border rounded" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Category</label>
              <input value={cat} onChange={e => setCat(e.target.value)} placeholder="Laptops, Tablets" className="w-full px-2.5 py-1.5 border rounded" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Primary Supplier</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full px-2 py-1.5 border rounded bg-white">
                <option value="">-- None --</option>
                {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Cost Price (₹)</label>
              <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="142000" className="w-full px-2.5 py-1.5 border rounded font-mono" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Selling Price (₹)</label>
              <input type="number" step="0.01" value={selling} onChange={e => setSelling(e.target.value)} placeholder="169900" className="w-full px-2.5 py-1.5 border rounded font-mono font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Initial Qty</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-2.5 py-1.5 border rounded font-mono" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Min Alert Threshold</label>
              <input type="number" value={alertQty} onChange={e => setAlertQty(e.target.value)} className="w-full px-2.5 py-1.5 border rounded font-mono" />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-1.5 bg-gray-900 text-white rounded font-bold">
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddSupplierModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState('Net 30');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.addSupplier({
        name,
        contact_person: contact,
        phone,
        email,
        payment_terms: terms,
        address
      });
      alert("✅ Supplier added!");
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-gray-200">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Add Supplier / Vendor</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Vendor / Company Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Apple India Wholesale" className="w-full px-2.5 py-1.5 border rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Contact Person</label>
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Vikram Malhotra" className="w-full px-2.5 py-1.5 border rounded" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Payment Terms</label>
              <input value={terms} onChange={e => setTerms(e.target.value)} placeholder="Net 30, COD" className="w-full px-2.5 py-1.5 border rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." className="w-full px-2.5 py-1.5 border rounded font-mono" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="orders@..." className="w-full px-2.5 py-1.5 border rounded font-mono" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Address</label>
            <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Warehouse address..." className="w-full px-2.5 py-1.5 border rounded" />
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-1.5 bg-gray-900 text-white rounded font-bold">
              {isSaving ? 'Saving...' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddStaffModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('STAFF');
  const [pin, setPin] = useState('1234');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.addStaff({ name, phone, role, pin, status: 'ACTIVE' });
      alert("✅ Team member registered successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-gray-200">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Add Team Member</h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Full Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Verma" className="w-full px-2.5 py-1.5 border rounded" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Phone Number *</label>
            <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+919876543210" className="w-full px-2.5 py-1.5 border rounded font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-2 py-1.5 border rounded bg-white font-semibold">
                <option value="STAFF">Store Staff</option>
                <option value="WAREHOUSE">Warehouse Lead</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Access PIN</label>
              <input required value={pin} onChange={e => setPin(e.target.value)} placeholder="1234" maxLength={6} className="w-full px-2.5 py-1.5 border rounded font-mono text-center font-bold" />
            </div>
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-1.5 bg-gray-900 text-white rounded font-bold">
              {isSaving ? 'Registering...' : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
