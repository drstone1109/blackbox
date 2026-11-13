import { 
  ProductItem, 
  LogItem, 
  Supplier, 
  PurchaseOrder, 
  DeliveryChallan, 
  StaffMember, 
  OrderItemData, 
  DailyReport, 
  KhataSummary,
  VisibilitySettings,
  CompanyGateResponse,
  OrganizationProfile
} from './types';

const API_BASE = '/api';

// ==========================================
// Products & Stock APIs
// ==========================================

export async function getProducts(category?: string, supplier_id?: string): Promise<ProductItem[]> {
  const params = new URLSearchParams();
  if (category && category !== 'ALL') params.append('category', category);
  if (supplier_id && supplier_id !== 'ALL') params.append('supplier_id', supplier_id);
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/products${q}`);
  if (!res.ok) throw new Error(`Failed to load products: ${res.statusText}`);
  return res.json();
}

export async function addOrUpdateProduct(product: Partial<ProductItem>): Promise<ProductItem> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to save product');
  }
  return res.json();
}

export async function stockIn(
  item_code: string,
  quantity: number,
  actor_phone: string = 'Staff'
): Promise<{ product: ProductItem; transaction: LogItem }> {
  const res = await fetch(`${API_BASE}/inventory/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_code, quantity, actor_phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to execute stock in');
  }
  return res.json();
}

export async function stockOut(
  item_code: string,
  quantity: number,
  actor_phone: string = 'Staff'
): Promise<{ product: ProductItem; transaction: LogItem; is_low_stock: boolean }> {
  const res = await fetch(`${API_BASE}/inventory/stock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_code, quantity, actor_phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to execute stock out');
  }
  return res.json();
}

export async function getTransactions(limit: number = 50): Promise<LogItem[]> {
  const res = await fetch(`${API_BASE}/inventory/transactions?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load transactions: ${res.statusText}`);
  return res.json();
}

export async function getDailyReport(): Promise<DailyReport> {
  const res = await fetch(`${API_BASE}/report`);
  if (!res.ok) throw new Error(`Failed to load daily report: ${res.statusText}`);
  return res.json();
}

// ==========================================
// Suppliers APIs
// ==========================================

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE}/suppliers`);
  if (!res.ok) throw new Error(`Failed to load suppliers: ${res.statusText}`);
  return res.json();
}

export async function addSupplier(payload: {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  notes?: string;
}): Promise<Supplier> {
  const res = await fetch(`${API_BASE}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to save supplier');
  }
  return res.json();
}

export async function deleteSupplier(supplier_id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/suppliers/${encodeURIComponent(supplier_id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to delete supplier');
  }
  return true;
}

// ==========================================
// Buy Stock (Purchase Orders) APIs
// ==========================================

export async function getPurchaseOrders(status?: string, supplier_id?: string): Promise<PurchaseOrder[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (supplier_id && supplier_id !== 'ALL') params.append('supplier_id', supplier_id);
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/purchase-orders${q}`);
  if (!res.ok) throw new Error(`Failed to load purchase orders: ${res.statusText}`);
  return res.json();
}

export async function createPurchaseOrder(payload: {
  supplier_id: string;
  items: Array<{ item_code: string; qty_ordered: number; cost_price: number }>;
  expected_date?: string;
  notes?: string;
  status?: string;
}): Promise<PurchaseOrder> {
  const res = await fetch(`${API_BASE}/purchase-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to create purchase order');
  }
  return res.json();
}

export async function receivePOGoods(
  po_id: string,
  items: Array<{ item_code: string; qty_received: number }>,
  actor: string = 'Owner'
): Promise<{ purchase_order: PurchaseOrder; messages: string[] }> {
  const res = await fetch(`${API_BASE}/purchase-orders/${encodeURIComponent(po_id)}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, actor }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to receive goods');
  }
  return res.json();
}

export async function updatePOStatus(po_id: string, status: string): Promise<PurchaseOrder> {
  const res = await fetch(`${API_BASE}/purchase-orders/${encodeURIComponent(po_id)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update PO status');
  }
  return res.json();
}

// ==========================================
// Dispatch / Sales (Delivery Challans) APIs
// ==========================================

export async function getDeliveryChallans(status?: string): Promise<DeliveryChallan[]> {
  const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/delivery-challans${q}`);
  if (!res.ok) throw new Error(`Failed to load delivery challans: ${res.statusText}`);
  return res.json();
}

export async function createDeliveryChallan(payload: {
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  status?: string;
  notes?: string;
  items: Array<{ item_code: string; quantity: number; selling_price: number }>;
}): Promise<{ delivery_challan: DeliveryChallan; warnings: string[] }> {
  const res = await fetch(`${API_BASE}/delivery-challans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to create delivery challan');
  }
  return res.json();
}

export async function dispatchDeliveryChallan(
  dc_id: string,
  actor_phone: string = 'Owner'
): Promise<{ delivery_challan: DeliveryChallan; messages: string[] }> {
  const res = await fetch(`${API_BASE}/delivery-challans/${encodeURIComponent(dc_id)}/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to dispatch delivery challan');
  }
  return res.json();
}

export async function updateDCStatus(dc_id: string, status: string): Promise<DeliveryChallan> {
  const res = await fetch(`${API_BASE}/delivery-challans/${encodeURIComponent(dc_id)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update challan status');
  }
  return res.json();
}

// ==========================================
// Staff Management APIs
// ==========================================

export async function getStaff(status?: string): Promise<StaffMember[]> {
  const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/staff${q}`);
  if (!res.ok) throw new Error(`Failed to load staff list: ${res.statusText}`);
  return res.json();
}

export async function addStaff(payload: Partial<StaffMember> & { name: string; phone: string }): Promise<StaffMember> {
  const res = await fetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to add staff member');
  }
  return res.json();
}

export async function updateStaffPin(staff_id: number | string, pin: string): Promise<StaffMember> {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(String(staff_id))}/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update staff PIN');
  }
  return res.json();
}

export async function updateStaffDepartments(staff_id: number | string, departments: string): Promise<StaffMember> {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(String(staff_id))}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ departments }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update departments');
  }
  return res.json();
}

export async function updateStaffPermissions(
  staff_id: number | string,
  role_level: string,
  hide_financials: boolean,
  departments?: string
): Promise<StaffMember> {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(String(staff_id))}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_level, hide_financials, departments }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update staff permissions');
  }
  return res.json();
}

// ==========================================
// Web Authentication & Visibility APIs
// ==========================================

export async function verifyCompanyGate(company_code: string): Promise<CompanyGateResponse> {
  const res = await fetch(`${API_BASE}/auth/company-gate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Company code not recognized.');
  }
  return res.json();
}

export async function getVisibilitySettings(): Promise<VisibilitySettings> {
  const res = await fetch(`${API_BASE}/settings/visibility`);
  if (!res.ok) throw new Error('Failed to load visibility settings');
  return res.json();
}

export async function updateVisibilitySettings(open_blackbox_mode: boolean): Promise<VisibilitySettings> {
  const res = await fetch(`${API_BASE}/settings/visibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ open_blackbox_mode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update visibility settings');
  }
  return res.json();
}

export async function getKhataSummary(): Promise<KhataSummary> {
  const res = await fetch(`${API_BASE}/khata/summary`);
  if (!res.ok) throw new Error('Failed to load Khata summary');
  return res.json();
}

export async function login(identifier: string, pin: string, role: string = 'admin'): Promise<{ success: boolean; role: 'admin' | 'staff'; user: any }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, pin, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Login failed. Please check your PIN.');
  }
  return res.json();
}

export async function getNotifications(): Promise<import('./types').NotificationItem[]> {
  const res = await fetch(`${API_BASE}/notifications`);
  if (!res.ok) return [];
  return res.json();
}

// ==========================================
// Barcode Scanner & Fast Action Terminal APIs
// ==========================================

export async function scanLookup(query: string): Promise<import('./types').ScanLookupResult> {
  const res = await fetch(`${API_BASE}/inventory/scan/${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Item '${query}' not found in catalog.`);
  }
  return res.json();
}

export async function quickStockMove(
  query: string,
  quantity: number,
  direction: 'IN' | 'OUT',
  actor: string = 'Terminal',
  notes: string = ''
): Promise<{ success: boolean; product: ProductItem; transaction: LogItem }> {
  const res = await fetch(`${API_BASE}/inventory/quick-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, quantity, direction, actor, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to execute ${direction} movement`);
  }
  return res.json();
}

export const EXPORT_INVENTORY_CSV_URL = `${API_BASE}/reports/inventory-csv`;
export const EXPORT_TRANSACTIONS_CSV_URL = `${API_BASE}/reports/transactions-csv`;

export async function updateStaffStatus(staff_id: number | string, status: string): Promise<StaffMember> {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(String(staff_id))}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update staff status');
  }
  return res.json();
}

export async function getOrders(limit: number = 50): Promise<OrderItemData[]> {
  const res = await fetch(`${API_BASE}/orders?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load orders: ${res.statusText}`);
  return res.json();
}

// ==========================================
// Organization Profile APIs
// ==========================================

export async function getOrganizationProfile(): Promise<OrganizationProfile> {
  const res = await fetch(`${API_BASE}/organization`);
  if (!res.ok) throw new Error('Failed to load organization profile');
  return res.json();
}

export async function updateOrganizationProfile(profile: OrganizationProfile): Promise<OrganizationProfile> {
  const res = await fetch(`${API_BASE}/organization`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update organization profile');
  }
  return res.json();
}

