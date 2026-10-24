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
    db_path: str = None
) -> Product:
    """
    Register a new product or update its name/category/alert threshold.
    Preserves existing stock quantity if product already exists unless specified.
    """
    item_code = item_code.strip().upper()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE products
                SET item_name = ?, category = ?, min_alert_qty = ?
                WHERE item_code = ?
            """, (item_name, category, min_alert_qty, item_code))
        else:
            cursor.execute("""
                INSERT INTO products (item_code, item_name, category, current_qty, min_alert_qty)
                VALUES (?, ?, ?, ?, ?)
            """, (item_code, item_name, category, current_qty, min_alert_qty))

        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        row = cursor.fetchone()
        return Product(**dict(row))


def get_product(item_code: str, db_path: str = None) -> Optional[Product]:
    """Retrieve product details by item code (case-insensitive)."""
    item_code = item_code.strip().upper()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        row = cursor.fetchone()
        if row:
            return Product(**dict(row))
        return None


def list_products(category: str = None, db_path: str = None) -> List[Product]:
    """List all products, optionally filtered by category."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        if category:
            cursor.execute("SELECT * FROM products WHERE category = ? ORDER BY item_code ASC", (category,))
        else:
            cursor.execute("SELECT * FROM products ORDER BY item_code ASC")
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
        updated_product = Product(**dict(cursor.fetchone()))

        cursor.execute("SELECT * FROM inventory_transactions WHERE txn_id = ?", (txn_id,))
        txn = InventoryTransaction(**dict(cursor.fetchone()))

        return updated_product, txn


def stock_out(
    item_code: str,
    quantity: int,
    actor_phone: str,
    db_path: str = None
) -> Tuple[Product, InventoryTransaction, bool]:
    """
    Deduct stock from an item (Sale / Dispatch).
    Validates available quantity, atomically updates stock, and logs an 'OUT' transaction.
    Returns: (updated_product, transaction, is_low_stock_alert)
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
        min_alert_qty = row["min_alert_qty"]

        if current_qty < quantity:
            raise ValueError(
                f"Insufficient stock for '{row['item_name']}' ({item_code}). "
                f"Current: {current_qty}, Requested: {quantity}."
            )

        new_qty = current_qty - quantity

        cursor.execute("UPDATE products SET current_qty = ? WHERE item_code = ?", (new_qty, item_code))

        cursor.execute("""
            INSERT INTO inventory_transactions (item_code, txn_type, quantity, resulting_qty, actor_phone)
            VALUES (?, 'OUT', ?, ?, ?)
        """, (item_code, quantity, new_qty, actor_phone))
        txn_id = cursor.lastrowid

        cursor.execute("SELECT * FROM products WHERE item_code = ?", (item_code,))
        updated_product = Product(**dict(cursor.fetchone()))

        cursor.execute("SELECT * FROM inventory_transactions WHERE txn_id = ?", (txn_id,))
        txn = InventoryTransaction(**dict(cursor.fetchone()))

        is_low_stock = new_qty <= min_alert_qty

        return updated_product, txn, is_low_stock


def get_low_stock_products(db_path: str = None) -> List[Product]:
    """Retrieve all items where current_qty <= min_alert_qty."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM products
            WHERE current_qty <= min_alert_qty
            ORDER BY current_qty ASC
        """)
        rows = cursor.fetchall()
        return [Product(**dict(r)) for r in rows]


def get_recent_transactions(limit: int = 15, item_code: str = None, db_path: str = None) -> List[InventoryTransaction]:
    """Retrieve recent inventory ledger transactions."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        if item_code:
            cursor.execute("""
                SELECT * FROM inventory_transactions
                WHERE item_code = ?
                ORDER BY txn_id DESC LIMIT ?
            """, (item_code.strip().upper(), limit))
        else:
            cursor.execute("""
                SELECT * FROM inventory_transactions
                ORDER BY txn_id DESC LIMIT ?
            """, (limit,))
        rows = cursor.fetchall()
        return [InventoryTransaction(**dict(r)) for r in rows]


def get_daily_summary(db_path: str = None) -> Dict[str, Any]:
    """
    Compile a daily summary:
    - Total catalog item count
    - Total units moved today (IN and OUT)
    - Top moving items today
    - Current low stock alerts
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as total_items FROM products")
        total_items = cursor.fetchone()["total_items"]

        cursor.execute("""
            SELECT 
                txn_type,
                COALESCE(SUM(quantity), 0) as total_qty,
                COUNT(txn_id) as txn_count
            FROM inventory_transactions
            WHERE date(timestamp) = date('now')
            GROUP BY txn_type
        """)
        vol_rows = cursor.fetchall()
        in_qty = 0
        out_qty = 0
        for r in vol_rows:
            if r["txn_type"] == "IN":
                in_qty = r["total_qty"]
            elif r["txn_type"] == "OUT":
                out_qty = r["total_qty"]

        cursor.execute("""
            SELECT 
                p.item_code,
                p.item_name,
                p.current_qty,
                COALESCE(SUM(t.quantity), 0) as moved_qty
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
            "in_qty_today": in_qty,
            "out_qty_today": out_qty,
            "top_moving": top_moving,
            "low_stock": low_stock,
            "all_products": all_products
        }
