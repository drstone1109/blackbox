from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Product(BaseModel):
    """Product model matching the SQLite 'products' schema."""
    item_code: str
    item_name: str
    category: Optional[str] = "General"
    current_qty: int = 0
    min_alert_qty: int = 5
    barcode: Optional[str] = ""
    supplier_id: Optional[str] = ""
    cost_price: float = 0.0
    selling_price: float = 0.0
    created_at: Optional[str] = None

    @property
    def is_low_stock(self) -> bool:
        return self.current_qty <= self.min_alert_qty

    @property
    def margin_pct(self) -> float:
        if self.cost_price > 0:
            return round(((self.selling_price - self.cost_price) / self.cost_price) * 100, 1)
        return 0.0


class InventoryTransaction(BaseModel):
    """Inventory audit log transaction matching 'inventory_transactions' schema."""
    txn_id: Optional[int] = None
    item_code: str
    txn_type: str  # 'IN' or 'OUT'
    quantity: int
    resulting_qty: int
    actor_phone: str
    timestamp: Optional[str] = None


class OrderItem(BaseModel):
    """Line item in an order."""
    order_item_id: Optional[int] = None
    order_id: Optional[str] = None
    item_code: str
    quantity: int
    unit_price: float = 0.0
    subtotal: float = 0.0


class Order(BaseModel):
    """Customer order matching 'orders' schema."""
    order_id: str
    customer_name: str
    customer_phone: Optional[str] = ""
    status: str = "PENDING"  # PENDING, CONFIRMED, DISPATCHED, COMPLETED, CANCELLED
    total_amount: float = 0.0
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    items: List[OrderItem] = Field(default_factory=list)


class OrderCreateRequest(BaseModel):
    """Payload to create a new order."""
    customer_name: str
    customer_phone: Optional[str] = ""
    items: List[Dict[str, Any]]
    notes: Optional[str] = None
    deduct_stock_now: bool = True


# ==============================================================
# Suppliers Schema
# ==============================================================

class Supplier(BaseModel):
    supplier_id: str
    name: str
    contact_person: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    payment_terms: Optional[str] = "Net 30"
    notes: Optional[str] = ""
    created_at: Optional[str] = None
    total_pos: int = 0
    total_spend: float = 0.0


class SupplierCreateRequest(BaseModel):
    name: str
    contact_person: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    payment_terms: Optional[str] = "Net 30"
    notes: Optional[str] = ""


# ==============================================================
# Purchase Orders (Buy Stock / Procurement) Schema
# ==============================================================

class POItem(BaseModel):
    po_item_id: Optional[int] = None
    po_id: Optional[str] = None
    item_code: str
    item_name: Optional[str] = ""
    qty_ordered: int
    qty_received: int = 0
    cost_price: float = 0.0
    subtotal: float = 0.0


class PurchaseOrder(BaseModel):
    po_id: str
    supplier_id: str
    supplier_name: Optional[str] = ""
    status: str = "DRAFT"  # DRAFT, ORDERED, PARTIALLY_RECEIVED, FULLY_RECEIVED
    expected_date: Optional[str] = None
    notes: Optional[str] = ""
    total_amount: float = 0.0
    created_by: str = "Owner"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    items: List[POItem] = Field(default_factory=list)


class POCreateRequest(BaseModel):
    supplier_id: str
    expected_date: Optional[str] = None
    notes: Optional[str] = ""
    status: Optional[str] = "ORDERED"  # Default straight to ORDERED or DRAFT
    items: List[Dict[str, Any]]  # [{item_code, qty_ordered, cost_price}]


class POReceiveRequest(BaseModel):
    items: List[Dict[str, Any]]  # [{item_code, qty_received}]
    actor: str = "Owner"


# ==============================================================
# Delivery Challans (Dispatch / Out Stock) Schema
# ==============================================================

class DCItem(BaseModel):
    dc_item_id: Optional[int] = None
    dc_id: Optional[str] = None
    item_code: str
    item_name: Optional[str] = ""
    quantity: int
    cost_price: float = 0.0
    selling_price: float = 0.0
    margin_per_unit: float = 0.0
    subtotal: float = 0.0


class DeliveryChallan(BaseModel):
    dc_id: str
    customer_name: str
    customer_phone: Optional[str] = ""
    delivery_address: Optional[str] = ""
    status: str = "DRAFT"  # DRAFT, READY, DISPATCHED, DELIVERED
    total_amount: float = 0.0
    total_margin: float = 0.0
    notes: Optional[str] = ""
    created_by: str = "Owner"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    items: List[DCItem] = Field(default_factory=list)


class DCCreateRequest(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = ""
    delivery_address: Optional[str] = ""
    status: Optional[str] = "READY"  # DRAFT or READY
    notes: Optional[str] = ""
    items: List[Dict[str, Any]]  # [{item_code, quantity, selling_price}]


# ==============================================================
# Staff Management Schema & Roles (v3.0 Blackbox Visibility Engine)
# ==============================================================

class StaffMember(BaseModel):
    staff_id: Optional[int] = None
    name: str
    phone: str
    role: str = "STAFF"  # 'ADMIN', 'WAREHOUSE', 'STAFF'
    pin: Optional[str] = "1234"
    departments: str = "godown,dispatch"  # comma-separated: 'procurement,godown,dispatch,khata'
    role_level: str = "WORKER"  # 'MANAGER', 'WORKER'
    hide_financials: bool = False
    status: str = "PENDING"  # PENDING, ACTIVE, SUSPENDED, REJECTED
    added_by: Optional[str] = "Admin"
    created_at: Optional[str] = None
    txn_count: int = 0


class StaffCreateRequest(BaseModel):
    name: str
    phone: str
    role: Optional[str] = "STAFF"
    pin: Optional[str] = "1234"
    departments: Optional[str] = "godown,dispatch"
    role_level: Optional[str] = "WORKER"
    hide_financials: Optional[bool] = False
    status: Optional[str] = "ACTIVE"


class StaffStatusRequest(BaseModel):
    status: str  # ACTIVE, SUSPENDED, REJECTED


class StaffPinUpdateRequest(BaseModel):
    pin: str


class StaffDepartmentsUpdateRequest(BaseModel):
    departments: str  # e.g. "procurement,godown"


class StaffPermissionsUpdateRequest(BaseModel):
    role_level: str  # 'MANAGER' or 'WORKER'
    hide_financials: bool = False
    departments: Optional[str] = None


class VisibilityModeUpdateRequest(BaseModel):
    open_blackbox_mode: bool


class CompanyGateRequest(BaseModel):
    company_code: str


class KhataSummary(BaseModel):
    today_cash_in: float = 0.0
    cash_in_today: float = 0.0
    today_cash_out: float = 0.0
    cash_out_today: float = 0.0
    total_godown_value: float = 0.0
    godown_value: float = 0.0
    total_receivables: float = 0.0
    total_payables: float = 0.0
    net_cashflow: float = 0.0
    gross_margin: float = 0.0
    pending_pos_count: int = 0
    ready_dcs_count: int = 0


# ==============================================================
# Web Authentication & Notifications Schema
# ==============================================================

class LoginRequest(BaseModel):
    identifier: str  # 'admin', username, or phone number
    pin: str
    role: Optional[str] = "admin"  # "admin" | "staff"


class NotificationItem(BaseModel):
    id: str
    type: str  # 'LOW_STOCK', 'PO_ARRIVAL', 'DC_READY', 'SYSTEM'
    title: str
    message: str
    timestamp: str
    severity: str = "info"  # 'warning', 'info', 'success', 'danger'
    read: bool = False
    link_tab: Optional[str] = None


class QuickStockMovement(BaseModel):
    query: str  # Barcode or item_code
    quantity: int
    direction: str  # 'IN' or 'OUT'
    actor: Optional[str] = "Terminal User"
    notes: Optional[str] = ""


# ==============================================================
# Organization Profile & Business Identity Schema
# ==============================================================

class OrganizationProfile(BaseModel):
    company_name: str = "Blackbox Tech Trading"
    company_code: str = "BLACKBOX-TRADING"
    tagline: Optional[str] = "Adaptive Business Operations OS"
    gstin: Optional[str] = ""
    pan: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    bank_name: Optional[str] = ""
    bank_account_no: Optional[str] = ""
    bank_ifsc: Optional[str] = ""
    upi_id: Optional[str] = ""
    terms_and_conditions: Optional[str] = ""


