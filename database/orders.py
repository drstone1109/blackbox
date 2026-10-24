import uuid
import datetime
import sqlite3
from typing import Optional, List, Dict, Any, Tuple
from database.connection import get_db_connection
from models.schemas import Order, OrderItem
import database.inventory as inventory_db


def generate_order_id() -> str:
    """Generate a clean, professional order ID (e.g., ORD-20261024-A1B2)."""
    today_str = datetime.datetime.now().strftime("%Y%m%d")
    short_hash = uuid.uuid4().hex[:4].upper()
    return f"ORD-{today_str}-{short_hash}"


def create_order(
    customer_name: str,
    items: List[Dict[str, Any]],
    customer_phone: str = "",
    notes: str = None,
    deduct_stock: bool = True,
    actor_phone: str = "SYSTEM",
    order_id: str = None,
    db_path: str = None
) -> Tuple[Order, List[str]]:
    """
    Create a new customer or dispatch order.
    
    items format:
    [
        {"item_code": "101", "quantity": 2, "unit_price": 25.0},
        {"item_code": "505", "quantity": 1, "unit_price": 10.0}
    ]

    If deduct_stock is True, stock_out is executed for each item.
    Returns: (created_order, list_of_warning_messages)
    """
    if not items:
        raise ValueError("Order must contain at least one item.")

    if not order_id:
        order_id = generate_order_id()

    warnings = []
    total_amount = 0.0
    validated_items = []

    # 1. Validate items exist and compute totals
    for item in items:
        item_code = item.get("item_code", "").strip().upper()
        quantity = int(item.get("quantity", 1))
        unit_price = float(item.get("unit_price", 0.0))
        subtotal = round(quantity * unit_price, 2)
        total_amount += subtotal

        product = inventory_db.get_product(item_code, db_path=db_path)
        if not product:
            raise KeyError(f"Cannot order item '{item_code}': Product does not exist.")

        if deduct_stock and product.current_qty < quantity:
            raise ValueError(
                f"Insufficient stock for {product.item_name} ({item_code}). "
                f"Available: {product.current_qty}, Ordered: {quantity}"
            )

        validated_items.append({
            "item_code": item_code,
            "quantity": quantity,
            "unit_price": unit_price,
            "subtotal": subtotal,
            "item_name": product.item_name
        })

    # 2. Insert order record and order items atomically
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO orders (order_id, customer_name, customer_phone, status, total_amount, notes)
            VALUES (?, ?, ?, 'PENDING', ?, ?)
        """, (order_id, customer_name, customer_phone, total_amount, notes))

        for v in validated_items:
            cursor.execute("""
                INSERT INTO order_items (order_id, item_code, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?)
            """, (order_id, v["item_code"], v["quantity"], v["unit_price"], v["subtotal"]))

    # 3. Deduct stock if requested
    if deduct_stock:
        for v in validated_items:
            prod, txn, is_low = inventory_db.stock_out(
                item_code=v["item_code"],
                quantity=v["quantity"],
                actor_phone=f"ORDER:{order_id}",
                db_path=db_path
            )
            if is_low:
                warnings.append(
                    f"⚠️ Low stock alert for {prod.item_name} ({prod.item_code}): only {prod.current_qty} left!"
                )

    created_order = get_order(order_id, db_path=db_path)
    return created_order, warnings


def get_order(order_id: str, db_path: str = None) -> Optional[Order]:
    """Retrieve full order details including line items."""
    order_id = order_id.strip()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,))
        order_row = cursor.fetchone()
        if not order_row:
            return None

        cursor.execute("SELECT * FROM order_items WHERE order_id = ? ORDER BY order_item_id ASC", (order_id,))
        item_rows = cursor.fetchall()
        items = [OrderItem(**dict(r)) for r in item_rows]

        order_dict = dict(order_row)
        order_dict["items"] = items
        return Order(**order_dict)


def list_orders(
    status: str = None,
    customer_phone: str = None,
    limit: int = 20,
    db_path: str = None
) -> List[Order]:
    """List recent orders with optional filtering."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM orders WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status.upper())
        if customer_phone:
            query += " AND customer_phone = ?"
            params.append(customer_phone)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, tuple(params))
        order_rows = cursor.fetchall()

        orders = []
        for o_row in order_rows:
            oid = o_row["order_id"]
            cursor.execute("SELECT * FROM order_items WHERE order_id = ? ORDER BY order_item_id ASC", (oid,))
            item_rows = cursor.fetchall()
            o_dict = dict(o_row)
            o_dict["items"] = [OrderItem(**dict(ir)) for ir in item_rows]
            orders.append(Order(**o_dict))

        return orders


def update_order_status(
    order_id: str,
    new_status: str,
    db_path: str = None
) -> Optional[Order]:
    """Update order status (e.g. PENDING, CONFIRMED, DISPATCHED, COMPLETED, CANCELLED)."""
    valid_statuses = {"PENDING", "CONFIRMED", "DISPATCHED", "COMPLETED", "CANCELLED"}
    new_status = new_status.strip().upper()
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status '{new_status}'. Must be one of: {', '.join(sorted(valid_statuses))}")

    order_id = order_id.strip()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE orders
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
        """, (new_status, order_id))

        if cursor.rowcount == 0:
            return None

    return get_order(order_id, db_path=db_path)


def cancel_order(
    order_id: str,
    restock: bool = True,
    actor_phone: str = "SYSTEM",
    db_path: str = None
) -> Tuple[Optional[Order], str]:
    """
    Cancel an order. If restock is True, restores items back to inventory via stock_in.
    """
    order = get_order(order_id, db_path=db_path)
    if not order:
        return None, "Order not found."

    if order.status == "CANCELLED":
        return order, "Order is already cancelled."

    updated_order = update_order_status(order_id, "CANCELLED", db_path=db_path)

    if restock and order.items:
        for item in order.items:
            try:
                inventory_db.stock_in(
                    item_code=item.item_code,
                    quantity=item.quantity,
                    actor_phone=f"RESTOCK:{order_id}",
                    db_path=db_path
                )
            except Exception:
                pass

    return updated_order, f"Order {order_id} cancelled and stock restocked."
