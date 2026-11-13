import uuid
import datetime
import sqlite3
from typing import Optional, List, Dict, Any, Tuple
from database.connection import get_db_connection
from models.schemas import PurchaseOrder, POItem
import database.inventory as inventory_db


def generate_po_id() -> str:
    """Generate a clean purchase order identifier (e.g., PO-20261104-A1B2)."""
    today_str = datetime.datetime.now().strftime("%Y%m%d")
    short_hash = uuid.uuid4().hex[:4].upper()
    return f"PO-{today_str}-{short_hash}"


def create_purchase_order(
    supplier_id: str,
    items: List[Dict[str, Any]],
    expected_date: str = None,
    notes: str = "",
    status: str = "ORDERED",
    created_by: str = "Owner",
    po_id: str = None,
    db_path: str = None
) -> PurchaseOrder:
    """Create a new Purchase Order for procurement."""
    if not items:
        raise ValueError("Purchase order must contain at least one line item.")

    if not po_id:
        po_id = generate_po_id()

    total_amount = 0.0
    validated_items = []

    for it in items:
        item_code = it.get("item_code", "").strip().upper()
        qty = int(it.get("qty_ordered", 1))
        cost_price = float(it.get("cost_price", 0.0))
        if qty <= 0:
            raise ValueError(f"Invalid quantity {qty} for item {item_code}.")
        subtotal = round(qty * cost_price, 2)
        total_amount += subtotal

        prod = inventory_db.get_product(item_code, db_path=db_path)
        item_name = prod.item_name if prod else item_code

        validated_items.append({
            "item_code": item_code,
            "item_name": item_name,
            "qty_ordered": qty,
            "qty_received": 0,
            "cost_price": cost_price,
            "subtotal": subtotal
        })

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO purchase_orders (
                po_id, supplier_id, status, expected_date, notes,
                total_amount, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (po_id, supplier_id, status, expected_date, notes, total_amount, created_by))

        for it in validated_items:
            cursor.execute("""
                INSERT INTO po_items (
                    po_id, item_code, qty_ordered, qty_received, cost_price, subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?)
            """, (po_id, it["item_code"], it["qty_ordered"], 0, it["cost_price"], it["subtotal"]))

    return get_purchase_order(po_id, db_path=db_path)


def get_purchase_order(po_id: str, db_path: str = None) -> Optional[PurchaseOrder]:
    """Retrieve full purchase order with supplier name and line items."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            WHERE po.po_id = ?
        """, (po_id,))
        row = cursor.fetchone()
        if not row:
            return None

        cursor.execute("""
            SELECT poi.*, p.item_name
            FROM po_items poi
            LEFT JOIN products p ON poi.item_code = p.item_code
            WHERE poi.po_id = ?
        """, (po_id,))
        items_rows = cursor.fetchall()

        po_dict = dict(row)
        po_dict["items"] = [POItem(**dict(r)) for r in items_rows]
        return PurchaseOrder(**po_dict)


def list_purchase_orders(
    status: str = None,
    supplier_id: str = None,
    limit: int = 50,
    db_path: str = None
) -> List[PurchaseOrder]:
    """List purchase orders with optional filtering."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        query = """
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            WHERE 1=1
        """
        params = []
        if status and status != "ALL":
            query += " AND po.status = ?"
            params.append(status)
        if supplier_id and supplier_id != "ALL":
            query += " AND po.supplier_id = ?"
            params.append(supplier_id)
        query += " ORDER BY po.created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for r in rows:
            cursor.execute("""
                SELECT poi.*, p.item_name
                FROM po_items poi
                LEFT JOIN products p ON poi.item_code = p.item_code
                WHERE poi.po_id = ?
            """, (r["po_id"],))
            items = [POItem(**dict(ir)) for ir in cursor.fetchall()]
            data = dict(r)
            data["items"] = items
            results.append(PurchaseOrder(**data))
        return results


def receive_po_goods(
    po_id: str,
    received_items: List[Dict[str, Any]],
    actor_phone: str = "Admin",
    db_path: str = None
) -> Tuple[PurchaseOrder, List[str]]:
    """
    Receive inward goods against a purchase order.
    Atomically updates po_items.qty_received, increases warehouse stock (stock_in),
    and updates PO status to PARTIALLY_RECEIVED or FULLY_RECEIVED.
    """
    po = get_purchase_order(po_id, db_path=db_path)
    if not po:
        raise KeyError(f"Purchase order {po_id} not found.")

    if po.status in ["FULLY_RECEIVED", "CANCELLED"]:
        raise ValueError(f"Cannot receive goods for PO with status {po.status}.")

    messages = []
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        for rec in received_items:
            item_code = rec.get("item_code", "").strip().upper()
            qty = int(rec.get("qty_received", 0))
            if qty <= 0:
                continue

            # Update po_items table
            cursor.execute("""
                UPDATE po_items
                SET qty_received = qty_received + ?
                WHERE po_id = ? AND item_code = ?
            """, (qty, po_id, item_code))

            # Atomically increment stock in warehouse
            cursor.execute("""
                UPDATE products
                SET current_qty = current_qty + ?
                WHERE item_code = ?
            """, (qty, item_code))

            # Record audit log
            cursor.execute("SELECT current_qty FROM products WHERE item_code = ?", (item_code,))
            new_qty = cursor.fetchone()["current_qty"]
            cursor.execute("""
                INSERT INTO inventory_transactions (item_code, txn_type, quantity, resulting_qty, actor_phone)
                VALUES (?, 'IN', ?, ?, ?)
            """, (item_code, qty, new_qty, f"{actor_phone} (PO:{po_id})"))

            messages.append(f"Received +{qty} of {item_code} (Warehouse Total: {new_qty})")

        # Determine new status based on whether all items are fully received
        cursor.execute("SELECT qty_ordered, qty_received FROM po_items WHERE po_id = ?", (po_id,))
        item_stats = cursor.fetchall()
        all_done = all(r["qty_received"] >= r["qty_ordered"] for r in item_stats)
        any_done = any(r["qty_received"] > 0 for r in item_stats)

        new_status = "FULLY_RECEIVED" if all_done else ("PARTIALLY_RECEIVED" if any_done else po.status)
        cursor.execute("""
            UPDATE purchase_orders
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE po_id = ?
        """, (new_status, po_id))

    return get_purchase_order(po_id, db_path=db_path), messages


def update_po_status(po_id: str, new_status: str, db_path: str = None) -> PurchaseOrder:
    """Update purchase order status."""
    valid_statuses = ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CANCELLED"]
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status '{new_status}'. Must be one of {valid_statuses}")

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE purchase_orders
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE po_id = ?
        """, (new_status, po_id))

    return get_purchase_order(po_id, db_path=db_path)

