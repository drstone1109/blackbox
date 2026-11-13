export interface ProductItem {
  item_code: string;
  item_name: string;
  category: string;
  current_qty: number;
  min_alert_qty: number;
  barcode?: string;
  supplier_id?: string;
  cost_price?: number;
  selling_price?: number;
  margin_pct?: number;
  created_at?: string;
  is_low_stock?: boolean;
}

export interface LogItem {
  txn_id: number;
  item_code: string;
  txn_type: 'IN' | 'OUT' | string;
  quantity: number;
  resulting_qty: number;
  actor_phone: string;
  timestamp: string;
}

export interface Supplier {
  supplier_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  notes?: string;
  created_at?: string;
  total_pos?: number;
  total_spend?: number;
}

export interface POItem {
  po_item_id?: number;
  po_id?: string;
  item_code: string;
  item_name?: string;
  qty_ordered: number;
  qty_received: number;
  cost_price: number;
  subtotal: number;
}

export interface PurchaseOrder {
  po_id: string;
  supplier_id: string;
  supplier_name?: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED' | string;
  expected_date?: string;
  notes?: string;
  total_amount: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  items: POItem[];
}

export interface DCItem {
  dc_item_id?: number;
  dc_id?: string;
  item_code: string;
  item_name?: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  margin_per_unit: number;
  subtotal: number;
}

export interface DeliveryChallan {
  dc_id: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  status: 'DRAFT' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | string;
  total_amount: number;
  total_margin: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  items: DCItem[];
}

export interface StaffMember {
  staff_id?: number;
  name: string;
  phone: string;
  role?: 'ADMIN' | 'WAREHOUSE' | 'STAFF' | string;
  pin?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | string;
  added_by?: string;
  created_at?: string;
  txn_count?: number;
  departments?: string;
  role_level?: 'MANAGER' | 'WORKER' | string;
  hide_financials?: boolean;
}

export interface KhataSummary {
  cash_in_today: number;
  cash_out_today: number;
  godown_value: number;
  total_receivables: number;
  total_payables: number;
  pending_invoices_count: number;
  net_cashflow: number;
}

export interface VisibilitySettings {
  open_blackbox_mode: boolean;
  company_code: string;
}

export interface CompanyGateResponse {
  valid: boolean;
  company_code: string;
  company_name: string;
  open_blackbox_mode: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'LOW_STOCK' | 'PO_ARRIVAL' | 'DC_READY' | 'SYSTEM' | string;
  title: string;
  message: string;
  timestamp: string;
  severity: 'warning' | 'info' | 'success' | 'danger' | string;
  read?: boolean;
  link_tab?: string;
}

export interface ScanLookupResult {
  product: ProductItem;
  recent_transactions: LogItem[];
}

export interface OrderLineItem {
  order_item_id?: number;
  order_id?: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
}

export interface OrderItemData {
  order_id: string;
  customer_name: string;
  customer_phone?: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED' | string;
  total_amount: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items?: OrderLineItem[];
}

export interface DailyReport {
  total_items: number;
  total_units?: number;
  in_qty_today: number;
  out_qty_today: number;
  top_moving: Array<{ item_code: string; item_name: string; moved_qty: number; cost_price?: number; selling_price?: number }>;
  low_stock: ProductItem[];
  all_products?: ProductItem[];
}

export interface OrganizationProfile {
  company_name: string;
  company_code: string;
  tagline?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  upi_id?: string;
  terms_and_conditions?: string;
}

