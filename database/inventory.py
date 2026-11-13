import sqlite3
from typing import Optional, List, Tuple, Dict, Any
from database.connection import get_db_connection
from models.schemas import Product, InventoryTransaction


def add_or_update_product(
    item_code: str,
    item_name: str,
    category: str = "General",
    current_qty: int = 0,
    min_alert_qty: int = 5,
    barcode: str = "",
    supplier_id: str = "",
    cost_price: float = 0.0,
    selling_price: float = 0.0,
    db_path: str = None
) -> Product:
    """
    Register a new product or update its properties.
    Preserves existing stock quantity if product already exists unless current_qty is positive on update.
    """
    item_code = item_code.strip().upper()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE products
                SET item_name = ?, category = ?, min_alert_qty = ?,
                    barcode = COALESCE(NULLIF(?, ''), barcode),
                    supplier_id = COALESCE(NULLIF(?, ''), supplier_id),
                    cost_price = CASE WHEN ? > 0 THEN ? ELSE cost_price END,
                    selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END
                WHERE item_code = ?
            """, (item_name, category, min_alert_qty, barcode, supplier_id, cost_price, cost_price, selling_price, selling_price, item_code))
        else:
            cursor.execute("""
                INSERT INTO products (
                    item_code, item_name, category, current_qty, min_alert_qty,
                    barcode, supplier_id, cost_price, selling_price
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (item_code, item_name, category, current_qty, min_alert_qty, barcode, supplier_id, cost_price, selling_price))

        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        row = cursor.fetchone()
        return Product(**dict(row))


def get_product(item_code_or_barcode: str, db_path: str = None) -> Optional[Product]:
    """Retrieve product details by item code or barcode."""
    lookup = item_code_or_barcode.strip().upper()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        # Look up by item_code first
        cursor.execute("SELECT * FROM products WHERE item_code = ?", (lookup,))
        row = cursor.fetchone()
        if not row:
            # Fallback look up by barcode
            cursor.execute("SELECT * FROM products WHERE barcode = ?", (lookup,))
            row = cursor.fetchone()

        if row:
            return Product(**dict(row))
        return None


def list_products(category: str = None, supplier_id: str = None, db_path: str = None) -> List[Product]:
    """List all products, optionally filtered by category or supplier."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM products WHERE 1=1"
        params = []
        if category and category != "ALL":
            query += " AND category = ?"
            params.append(category)
        if supplier_id and supplier_id != "ALL":
            query += " AND supplier_id = ?"
            params.append(supplier_id)
        query += " ORDER BY item_code ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [Product(**dict(r)) for r in rows]


def stock_in(
    item_code: str,
    quantity: int,
    actor_phone: str,
    db_path: str = None
) -> Tuple[Product, InventoryTransaction]:
    """
    Add stock to an item (Procurement / Restock).
    Atomically updates products.current_qty and writes an 'IN' record to inventory_transactions.
    """
    if quantity <= 0:
        raise ValueError("Quantity to add must be greater than zero.")

    item_code = item_code.strip().upper()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        row = cursor.fetchone()
        if not row:
            raise KeyError(f"Product '{item_code}' not found in database.")

        current_qty = row["current_qty"]
        new_qty = current_qty + quantity

        cursor.execute("UPDATE products SET current_qty = ? WHERE item_code = ?", (new_qty, item_code))
        cursor.execute("""
            INSERT INTO inventory_transactions (item_code, txn_type, quantity, resulting_qty, actor_phone)
            VALUES (?, 'IN', ?, ?, ?)
        """, (item_code, quantity, new_qty, actor_phone))

        txn_id = cursor.lastrowid
        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        updated_prod = Product(**dict(cursor.fetchone()))

        cursor.execute("SELECT * FROM inventory_transactions WHERE txn_id = ?", (txn_id,))
        txn = InventoryTransaction(**dict(cursor.fetchone()))

        return updated_prod, txn


def stock_out(
    item_code: str,
    quantity: int,
    actor_phone: str,
    db_path: str = None
) -> Tuple[Product, InventoryTransaction, bool]:
    """
    Deduct stock from an item (Sale / Dispatch).
    Validates balance, updates products.current_qty, and records 'OUT' in ledger.
    """
    if quantity <= 0:
        raise ValueError("Quantity to deduct must be greater than zero.")

    item_code = item_code.strip().upper()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        row = cursor.fetchone()
        if not row:
            raise KeyError(f"Product '{item_code}' not found in database.")

        current_qty = row["current_qty"]
        min_alert = row["min_alert_qty"]

        if current_qty < quantity:
            raise ValueError(
                f"Insufficient stock for {row['item_name']} ({item_code}). "
                f"Requested: {quantity}, Available: {current_qty}."
            )

        new_qty = current_qty - quantity
        cursor.execute("UPDATE products SET current_qty = ? WHERE item_code = ?", (new_qty, item_code))
        cursor.execute("""
            INSERT INTO inventory_transactions (item_code, txn_type, quantity, resulting_qty, actor_phone)
            VALUES (?, 'OUT', ?, ?, ?)
        """, (item_code, quantity, new_qty, actor_phone))

        txn_id = cursor.lastrowid
        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        updated_prod = Product(**dict(cursor.fetchone()))

        cursor.execute("SELECT * FROM inventory_transactions WHERE txn_id = ?", (txn_id,))
        txn = InventoryTransaction(**dict(cursor.fetchone()))

        is_low_stock = new_qty <= min_alert
        return updated_prod, txn, is_low_stock


def get_recent_transactions(limit: int = 50, item_code: str = None, db_path: str = None) -> List[InventoryTransaction]:
    """Query recent transactions from the immutable ledger."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        if item_code:
            cursor.execute("""
                SELECT * FROM inventory_transactions
                WHERE item_code = ?
                ORDER BY timestamp DESC, txn_id DESC
                LIMIT ?
            """, (item_code.strip().upper(), limit))
        else:
            cursor.execute("""
                SELECT * FROM inventory_transactions
                ORDER BY timestamp DESC, txn_id DESC
                LIMIT ?
            """, (limit,))
        return [InventoryTransaction(**dict(r)) for r in cursor.fetchall()]


def get_daily_summary(db_path: str = None) -> Dict[str, Any]:
    """Retrieve consolidated daily summary and metrics."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*), COALESCE(SUM(current_qty), 0) FROM products")
        total_items, total_units = cursor.fetchone()

        cursor.execute("""
            SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions
            WHERE txn_type = 'IN' AND date(timestamp) = date('now')
        """)
        in_qty = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COALESCE(SUM(quantity), 0) FROM inventory_transactions
            WHERE txn_type = 'OUT' AND date(timestamp) = date('now')
        """)
        out_qty = cursor.fetchone()[0]

        cursor.execute("""
            SELECT 
                p.item_code, 
                p.item_name, 
                COALESCE(SUM(t.quantity), 0) as moved_qty,
                p.cost_price,
                p.selling_price
            FROM inventory_transactions t
            JOIN products p ON t.item_code = p.item_code
            WHERE t.txn_type = 'OUT' AND date(t.timestamp) = date('now')
            GROUP BY p.item_code
            ORDER BY moved_qty DESC
            LIMIT 5
        """)
        top_moving = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
            SELECT * FROM products
            WHERE current_qty <= min_alert_qty
            ORDER BY current_qty ASC
        """)
        low_stock = [Product(**dict(r)) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM products ORDER BY item_name ASC")
        all_products = [Product(**dict(r)) for r in cursor.fetchall()]

        return {
            "total_items": total_items,
            "total_units": total_units,
            "in_qty_today": in_qty,
            "out_qty_today": out_qty,
            "top_moving": top_moving,
            "low_stock": low_stock,
            "all_products": all_products
        }
