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
    Initialize SQLite database tables and indexes based on Document 5
    and the extended orders management subsystem.
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. Inventory Transactions Table (Immutable audit ledger)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            txn_id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_code VARCHAR(50) NOT NULL,
            txn_type VARCHAR(10) NOT NULL,
            quantity INTEGER NOT NULL,
            resulting_qty INTEGER NOT NULL,
            actor_phone VARCHAR(20) NOT NULL,
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

        # Performance Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_txn_item ON inventory_transactions(item_code);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_txn_timestamp ON inventory_transactions(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);")


if __name__ == "__main__":
    init_db()
    print("Database successfully initialized.")
