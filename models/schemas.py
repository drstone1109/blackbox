from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Product(BaseModel):
    """Product model matching the SQLite 'products' schema."""
    item_code: str
    item_name: str
    category: Optional[str] = "General"
    current_qty: int = 0
    min_alert_qty: int = 5
    created_at: Optional[str] = None

    @property
    def is_low_stock(self) -> bool:
        return self.current_qty <= self.min_alert_qty


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
    """Customer or dispatch order matching 'orders' schema."""
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


class ParsedCommand(BaseModel):
    """Result of parsing an incoming WhatsApp message."""
    action: str  # 'STOCK', 'IN', 'OUT', 'REPORT', 'ADD', 'ORDER', 'ORDERS', 'LOWSTOCK', 'HELP', 'UNKNOWN'
    item_code: Optional[str] = None
    quantity: Optional[int] = None
    params: Dict[str, Any] = Field(default_factory=dict)
    raw_text: str = ""
    error: Optional[str] = None


class CommandResult(BaseModel):
    """Result of executing an inventory or order command."""
    success: bool
    formatted_message: str
    data: Optional[Dict[str, Any]] = None
