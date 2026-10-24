# Backend Database Schema (SQLite)

For Level 0 generalization, the database requires only two primary tables: one to hold the current state of items, and one to act as an immutable ledger for every movement.

## Table 1: `products`
Stores the master list of items and their current aggregate quantities.

```sql
CREATE TABLE products (
    item_code VARCHAR(50) PRIMARY KEY,     -- e.g., '101', 'SHIRT_L'
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    current_qty INTEGER DEFAULT 0,
    min_alert_qty INTEGER DEFAULT 5,       -- Threshold for low stock alerts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Table 2: `inventory_transactions`
An immutable audit log of every change (In/Out) made to the inventory.

```sql
CREATE TABLE inventory_transactions (
    txn_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code VARCHAR(50) NOT NULL,
    txn_type VARCHAR(10) NOT NULL,         -- 'IN' or 'OUT'
    quantity INTEGER NOT NULL,
    resulting_qty INTEGER NOT NULL,        -- Snapshot of total qty after this txn
    actor_phone VARCHAR(20) NOT NULL,      -- Who made the change (Owner's number)
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_code) REFERENCES products(item_code)
);
```