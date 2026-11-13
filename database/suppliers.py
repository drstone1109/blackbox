import uuid
import sqlite3
from typing import Optional, List, Dict, Any
from database.connection import get_db_connection
from models.schemas import Supplier, SupplierCreateRequest


def generate_supplier_id() -> str:
    """Generate a clean, professional supplier ID (e.g., SUP-1001)."""
    short_hash = uuid.uuid4().hex[:4].upper()
    return f"SUP-{short_hash}"


def add_or_update_supplier(
    name: str,
    contact_person: str = "",
    phone: str = "",
    email: str = "",
    address: str = "",
    payment_terms: str = "Net 30",
    notes: str = "",
    supplier_id: str = None,
    db_path: str = None
) -> Supplier:
    """Create or update a supplier."""
    if not name or not name.strip():
        raise ValueError("Supplier name cannot be empty.")

    name = name.strip()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        if supplier_id:
            cursor.execute("SELECT supplier_id FROM suppliers WHERE supplier_id = ?", (supplier_id,))
            if cursor.fetchone():
                cursor.execute("""
                    UPDATE suppliers
                    SET name = ?, contact_person = ?, phone = ?, email = ?,
                        address = ?, payment_terms = ?, notes = ?
                    WHERE supplier_id = ?
                """, (name, contact_person, phone, email, address, payment_terms, notes, supplier_id))
            else:
                cursor.execute("""
                    INSERT INTO suppliers (
                        supplier_id, name, contact_person, phone, email,
                        address, payment_terms, notes
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (supplier_id, name, contact_person, phone, email, address, payment_terms, notes))
        else:
            supplier_id = generate_supplier_id()
            cursor.execute("""
                INSERT INTO suppliers (
                    supplier_id, name, contact_person, phone, email,
                    address, payment_terms, notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (supplier_id, name, contact_person, phone, email, address, payment_terms, notes))

    return get_supplier(supplier_id, db_path=db_path)


def get_supplier(supplier_id: str, db_path: str = None) -> Optional[Supplier]:
    """Retrieve supplier details with order statistics."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM suppliers WHERE supplier_id = ?", (supplier_id,))
        row = cursor.fetchone()
        if not row:
            return None

        # Calculate total POs and total spend
        cursor.execute("""
            SELECT COUNT(*), COALESCE(SUM(total_amount), 0.0)
            FROM purchase_orders
            WHERE supplier_id = ? AND status != 'CANCELLED'
        """, (supplier_id,))
        total_pos, total_spend = cursor.fetchone()

        data = dict(row)
        data["total_pos"] = total_pos
        data["total_spend"] = total_spend
        return Supplier(**data)


def list_suppliers(db_path: str = None) -> List[Supplier]:
    """List all registered suppliers with purchase order metrics."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                s.*,
                COALESCE(COUNT(po.po_id), 0) as total_pos,
                COALESCE(SUM(CASE WHEN po.status != 'CANCELLED' THEN po.total_amount ELSE 0 END), 0.0) as total_spend
            FROM suppliers s
            LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id
            GROUP BY s.supplier_id
            ORDER BY s.name ASC
        """)
        rows = cursor.fetchall()
        return [Supplier(**dict(r)) for r in rows]


def delete_supplier(supplier_id: str, db_path: str = None) -> bool:
    """Delete a supplier if no active purchase orders exist."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = ?", (supplier_id,))
        if cursor.fetchone()[0] > 0:
            raise ValueError("Cannot delete supplier with active purchase orders.")
        cursor.execute("DELETE FROM suppliers WHERE supplier_id = ?", (supplier_id,))
        return cursor.rowcount > 0
