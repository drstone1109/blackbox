import os
import sqlite3
from contextlib import contextmanager
from typing import Generator
from config.settings import settings


def get_db_path(db_path: str = None) -> str:
    """Return the configured database path."""
    return db_path or settings.DATABASE_PATH


@contextmanager
def get_db_connection(db_path: str = None) -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager that yields an active SQLite connection with
    Row factory enabled and Foreign Keys enforcement turned ON.
    """
    path = get_db_path(db_path)
    conn = sqlite3.connect(path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: str = None) -> None:
    """
    Initialize SQLite database tables and indexes based on Document 5,
    extended orders subsystem, and ERP Level 0 Redesign Specification v2.0.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. Products Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            item_code VARCHAR(50) PRIMARY KEY,
            item_name VARCHAR(255) NOT NULL,
            category VARCHAR(100) DEFAULT 'General',
            current_qty INTEGER DEFAULT 0,
            min_alert_qty INTEGER DEFAULT 5,
            barcode VARCHAR(100) DEFAULT '',
            supplier_id VARCHAR(50) DEFAULT '',
            cost_price REAL DEFAULT 0.0,
            selling_price REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Migration: Add columns to products if missing from earlier version
        cursor.execute("PRAGMA table_info(products);")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        if "barcode" not in existing_cols:
            cursor.execute("ALTER TABLE products ADD COLUMN barcode VARCHAR(100) DEFAULT '';")
        if "supplier_id" not in existing_cols:
            cursor.execute("ALTER TABLE products ADD COLUMN supplier_id VARCHAR(50) DEFAULT '';")
        if "cost_price" not in existing_cols:
            cursor.execute("ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0.0;")
        if "selling_price" not in existing_cols:
            cursor.execute("ALTER TABLE products ADD COLUMN selling_price REAL DEFAULT 0.0;")

        # 2. Inventory Transactions Table (Immutable audit ledger)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            txn_id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_code VARCHAR(50) NOT NULL,
            txn_type VARCHAR(10) NOT NULL,
            quantity INTEGER NOT NULL,
            resulting_qty INTEGER NOT NULL,
            actor_phone VARCHAR(50) NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(item_code) REFERENCES products(item_code)
        );
        """)

        # 3. Orders Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id VARCHAR(50) PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) DEFAULT '',
            status VARCHAR(50) DEFAULT 'PENDING',
            total_amount REAL DEFAULT 0.0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. Order Items Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id VARCHAR(50) NOT NULL,
            item_code VARCHAR(50) NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL DEFAULT 0.0,
            subtotal REAL DEFAULT 0.0,
            FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
            FOREIGN KEY(item_code) REFERENCES products(item_code)
        );
        """)

        # 5. Suppliers Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS suppliers (
            supplier_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            contact_person VARCHAR(255) DEFAULT '',
            phone VARCHAR(50) DEFAULT '',
            email VARCHAR(255) DEFAULT '',
            address TEXT DEFAULT '',
            payment_terms VARCHAR(100) DEFAULT 'Net 30',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 6. Purchase Orders (Procurement) Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS purchase_orders (
            po_id VARCHAR(50) PRIMARY KEY,
            supplier_id VARCHAR(50) NOT NULL,
            status VARCHAR(30) DEFAULT 'DRAFT',
            expected_date DATE,
            notes TEXT DEFAULT '',
            total_amount REAL DEFAULT 0.0,
            created_by VARCHAR(50) DEFAULT 'Owner',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id)
        );
        """)

        # 7. Purchase Order Line Items
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS po_items (
            po_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            po_id VARCHAR(50) NOT NULL,
            item_code VARCHAR(50) NOT NULL,
            qty_ordered INTEGER NOT NULL,
            qty_received INTEGER DEFAULT 0,
            cost_price REAL DEFAULT 0.0,
            subtotal REAL DEFAULT 0.0,
            FOREIGN KEY(po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
            FOREIGN KEY(item_code) REFERENCES products(item_code)
        );
        """)

        # 8. Delivery Challans (Dispatch / Sales) Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS delivery_challans (
            dc_id VARCHAR(50) PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) DEFAULT '',
            delivery_address TEXT DEFAULT '',
            status VARCHAR(30) DEFAULT 'DRAFT',
            total_amount REAL DEFAULT 0.0,
            total_margin REAL DEFAULT 0.0,
            notes TEXT DEFAULT '',
            created_by VARCHAR(50) DEFAULT 'Owner',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 9. Delivery Challan Line Items
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS dc_items (
            dc_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            dc_id VARCHAR(50) NOT NULL,
            item_code VARCHAR(50) NOT NULL,
            quantity INTEGER NOT NULL,
            cost_price REAL DEFAULT 0.0,
            selling_price REAL DEFAULT 0.0,
            margin_per_unit REAL DEFAULT 0.0,
            subtotal REAL DEFAULT 0.0,
            FOREIGN KEY(dc_id) REFERENCES delivery_challans(dc_id) ON DELETE CASCADE,
            FOREIGN KEY(item_code) REFERENCES products(item_code)
        );
        """)

        # 10. Staff Directory & Access Requests
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS staff (
            staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NOT NULL UNIQUE,
            role VARCHAR(30) DEFAULT 'STAFF',
            pin VARCHAR(50) DEFAULT '1234',
            departments VARCHAR(255) DEFAULT 'godown,dispatch',
            role_level VARCHAR(30) DEFAULT 'WORKER',
            hide_financials INTEGER DEFAULT 0,
            status VARCHAR(30) DEFAULT 'PENDING',
            added_by VARCHAR(50) DEFAULT 'Admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Migration: Add columns to staff if missing from earlier version
        cursor.execute("PRAGMA table_info(staff);")
        existing_staff_cols = {row["name"] for row in cursor.fetchall()}
        if "role" not in existing_staff_cols:
            cursor.execute("ALTER TABLE staff ADD COLUMN role VARCHAR(30) DEFAULT 'STAFF';")
        if "pin" not in existing_staff_cols:
            cursor.execute("ALTER TABLE staff ADD COLUMN pin VARCHAR(50) DEFAULT '1234';")
        if "departments" not in existing_staff_cols:
            cursor.execute("ALTER TABLE staff ADD COLUMN departments VARCHAR(255) DEFAULT 'godown,dispatch';")
        if "role_level" not in existing_staff_cols:
            cursor.execute("ALTER TABLE staff ADD COLUMN role_level VARCHAR(30) DEFAULT 'WORKER';")
        if "hide_financials" not in existing_staff_cols:
            cursor.execute("ALTER TABLE staff ADD COLUMN hide_financials INTEGER DEFAULT 0;")

        # 11. System Settings & Owner Visibility Engine
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT
        );
        """)
        cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('open_blackbox_mode', '1');")
        cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('company_code', 'BLACKBOX-TRADING');")

        # Performance Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_txn_item ON inventory_transactions(item_code);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_txn_timestamp ON inventory_transactions(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_dc_status ON delivery_challans(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_dc_items_dc_id ON dc_items(dc_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_staff_phone ON staff(phone);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);")
