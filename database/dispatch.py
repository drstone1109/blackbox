import uuid
import datetime
import sqlite3
from typing import Optional, List, Dict, Any, Tuple
from database.connection import get_db_connection
from models.schemas import DeliveryChallan, DCItem
import database.inventory as inventory_db


def generate_dc_id() -> str:
    """Generate a clean delivery challan identifier (e.g., DC-20261104-X9Y8)."""
    today_str = datetime.datetime.now().strftime("%Y%m%d")
    short_hash = uuid.uuid4().hex[:4].upper()
    return f"DC-{today_str}-{short_hash}"


def create_delivery_challan(
    customer_name: str,
    items: List[Dict[str, Any]],
    customer_phone: str = "",
    delivery_address: str = "",
    status: str = "READY",
    notes: str = "",
    created_by: str = "Owner",
    dc_id: str = None,
    db_path: str = None
) -> Tuple[DeliveryChallan, List[str]]:
    """Create a new Delivery Challan."""
    if not items:
        raise ValueError("Delivery challan must contain at least one line item.")

    if not customer_name or not customer_name.strip():
        raise ValueError("Customer name is required.")

    if not dc_id:
        dc_id = generate_dc_id()

    total_amount = 0.0
    total_margin = 0.0
    validated_items = []
    warnings = []

    for it in items:
        item_code = it.get("item_code", "").strip().upper()
        qty = int(it.get("quantity", 1))
        if qty <= 0:
            raise ValueError(f"Quantity must be positive for item {item_code}.")

        prod = inventory_db.get_product(item_code, db_path=db_path)
        if not prod:
            raise KeyError(f"Product '{item_code}' not found.")

        cost_price = prod.cost_price
        selling_price = float(it.get("selling_price", prod.selling_price))
        subtotal = round(qty * selling_price, 2)
        margin_per_unit = round(selling_price - cost_price, 2)
        total_margin += round(margin_per_unit * qty, 2)
        total_amount += subtotal

        if prod.current_qty < qty:
            warnings.append(
                f"Low/Insufficient stock for {prod.item_name} ({item_code}): "
                f"Warehouse has {prod.current_qty}, Challan requests {qty}."
            )

        validated_items.append({
            "item_code": item_code,
            "item_name": prod.item_name,
            "quantity": qty,
            "cost_price": cost_price,
            "selling_price": selling_price,
            "margin_per_unit": margin_per_unit,
            "subtotal": subtotal
        })

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO delivery_challans (
                dc_id, customer_name, customer_phone, delivery_address,
                status, total_amount, total_margin, notes, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (dc_id, customer_name.strip(), customer_phone, delivery_address, status, total_amount, total_margin, notes, created_by))

        for it in validated_items:
            cursor.execute("""
                INSERT INTO dc_items (
                    dc_id, item_code, quantity, cost_price, selling_price, margin_per_unit, subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (dc_id, it["item_code"], it["quantity"], it["cost_price"], it["selling_price"], it["margin_per_unit"], it["subtotal"]))

    return get_delivery_challan(dc_id, db_path=db_path), warnings


def get_delivery_challan(dc_id: str, db_path: str = None) -> Optional[DeliveryChallan]:
    """Retrieve delivery challan with line items."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM delivery_challans WHERE dc_id = ?", (dc_id,))
        row = cursor.fetchone()
        if not row:
            return None

        cursor.execute("""
            SELECT dci.*, p.item_name
            FROM dc_items dci
            LEFT JOIN products p ON dci.item_code = p.item_code
            WHERE dci.dc_id = ?
        """, (dc_id,))
        items_rows = cursor.fetchall()

        dc_dict = dict(row)
        dc_dict["items"] = [DCItem(**dict(r)) for r in items_rows]
        return DeliveryChallan(**dc_dict)


def list_delivery_challans(status: str = None, limit: int = 50, db_path: str = None) -> List[DeliveryChallan]:
    """List delivery challans with optional status filtering."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM delivery_challans WHERE 1=1"
        params = []
        if status and status != "ALL":
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for r in rows:
            cursor.execute("""
                SELECT dci.*, p.item_name
                FROM dc_items dci
                LEFT JOIN products p ON dci.item_code = p.item_code
                WHERE dci.dc_id = ?
            """, (r["dc_id"],))
            items = [DCItem(**dict(ir)) for ir in cursor.fetchall()]
            data = dict(r)
            data["items"] = items
            results.append(DeliveryChallan(**data))
        return results


def dispatch_delivery_challan(
    dc_id: str,
    actor_phone: str = "Admin",
    db_path: str = None
) -> Tuple[DeliveryChallan, List[str]]:
    """
    Execute physical dispatch of a delivery challan.
    Deducts stock from products, logs 'OUT' transactions in audit ledger,
    and transitions status to 'DISPATCHED'.
    """
    dc = get_delivery_challan(dc_id, db_path=db_path)
    if not dc:
        raise KeyError(f"Delivery challan {dc_id} not found.")

    if dc.status == "DISPATCHED" or dc.status == "DELIVERED":
        raise ValueError(f"Challan {dc_id} is already dispatched.")

    # Validate stock before deducting anything
    for it in dc.items:
        prod = inventory_db.get_product(it.item_code, db_path=db_path)
        if not prod or prod.current_qty < it.quantity:
            avail = prod.current_qty if prod else 0
            raise ValueError(
                f"Cannot dispatch: Insufficient stock for {it.item_code}. "
                f"Available: {avail}, Required: {it.quantity}."
            )

    messages = []
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        for it in dc.items:
            cursor.execute("""
                UPDATE products
                SET current_qty = current_qty - ?
                WHERE item_code = ?
            """, (it.quantity, it.item_code))

            cursor.execute("SELECT current_qty, min_alert_qty FROM products WHERE item_code = ?", (it.item_code,))
            row = cursor.fetchone()
            new_qty = row["current_qty"]
            min_alert = row["min_alert_qty"]

            cursor.execute("""
                INSERT INTO inventory_transactions (item_code, txn_type, quantity, resulting_qty, actor_phone)
                VALUES (?, 'OUT', ?, ?, ?)
            """, (it.item_code, it.quantity, new_qty, f"{actor_phone} (DC:{dc_id})"))

            msg = f"Dispatched -{it.quantity} units of {it.item_code}. New Balance: {new_qty}"
            if new_qty <= min_alert:
                msg += " ⚠️ LOW STOCK WARNING!"
            messages.append(msg)

        cursor.execute("""
            UPDATE delivery_challans
            SET status = 'DISPATCHED', updated_at = CURRENT_TIMESTAMP
            WHERE dc_id = ?
        """, (dc_id,))

    return get_delivery_challan(dc_id, db_path=db_path), messages


def update_dc_status(dc_id: str, new_status: str, db_path: str = None) -> DeliveryChallan:
    """Update delivery challan status (e.g. DELIVERED, CANCELLED)."""
    valid = ["DRAFT", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"]
    if new_status not in valid:
        raise ValueError(f"Invalid status '{new_status}'. Allowed: {valid}")

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE delivery_challans
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE dc_id = ?
        """, (new_status, dc_id))

    return get_delivery_challan(dc_id, db_path=db_path)

