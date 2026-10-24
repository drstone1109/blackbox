# General WhatsApp Inventory ERP (Level 0)

> A frictionless, chat-based inventory and orders management ERP for solo shop owners and small businesses. Manage stock, record inward procurement, dispatch outward sales, check balances, and handle customer orders directly through WhatsApp commands—no spreadsheets or complex dashboards required.

---

## 🌟 Key Features

* **Instant Stock Check:** Query real-time quantities of any item in under 2 seconds (`STOCK 101`).
* **Stock In (Procurement):** Add incoming stock with automated ledger logging (`IN 101 20`).
* **Stock Out (Sales/Dispatch):** Deduct sold stock with automatic balance checks and low-stock warnings (`OUT 101 5`).
* **Dedicated Orders Database Subsystem:** Manage customer orders, order line items, order status workflows (`PENDING`, `CONFIRMED`, `DISPATCHED`, `COMPLETED`, `CANCELLED`), and automatic inventory deduction.
* **Immutable Audit Trail:** Every inward and outward transaction is permanently logged with timestamps, quantities, and phone numbers.
* **Low Stock Alerts & Daily Reports:** Instantly generate stock summaries and alert lists (`REPORT` or `LOWSTOCK`).
* **WhatsApp UI/UX Formatting:** Strict adherence to bolding (`*text*`), monospace item codes (` ```code``` `), and semantic emoji indicators (✅, 📉, 📦, ⚠️, 📊, 🛒).
* **Multi-Channel Access:** Interact via Meta WhatsApp Cloud API, Swagger Interactive UI (`/docs`), or direct REST API endpoints.

---

## 🏗️ System Architecture

```
                    +--------------------------------+
                    |  Owner / Customer on WhatsApp  |
                    +---------------+----------------+
                                    |
                                    v (WhatsApp Message)
                    +--------------------------------+
                    |   Meta WhatsApp Cloud API      |
                    +---------------+----------------+
                                    |
                                    v (HTTPS Webhook POST)
                    +--------------------------------+
                    |   Cloudflare Tunnel            |
                    |   (Exposes local port 8000)    |
                    +---------------+----------------+
                                    |
                                    v
     +-------------------------------------------------------------+
     |                  Local FastAPI Server (Port 8000)           |
     |                                                             |
     |  +-----------------------+     +-------------------------+  |
     |  |   whatsapp_service    | <-> |    command_handler      |  |
     |  +-----------------------+     +------------+------------+  |
     |                                             |               |
     |                     +-----------------------+------+        |
     |                     |                              |        |
     |                     v                              v        |
     |            +------------------+          +---------------+  |
     |            |  inventory_db    |          |   orders_db   |  |
     |            +--------+---------+          +-------+-------+  |
     |                     |                            |          |
     |                     +-------------+--------------+          |
     |                                   |                         |
     |                                   v                         |
     |                   +-------------------------------+         |
     |                   |  SQLite Database (Local File) |         |
     |                   |  (products, transactions,     |         |
     |                   |   orders, order_items)        |         |
     |                   +-------------------------------+         |
     +-------------------------------------------------------------+
```

---

## 📁 Modular Directory Structure

Every subsystem is separated into dedicated, decoupled modules:

```text
blackbox/
├── config/                         # Application settings & phone authorization
│   ├── __init__.py
│   └── settings.py
├── database/                       # Database engine, connection manager & tables
│   ├── __init__.py
│   ├── connection.py               # SQLite connection pool & table initializer
│   ├── inventory.py                # Products, stock in/out & immutable audit ledger
│   └── orders.py                   # Orders, order line items, fulfillment & restock
├── models/                         # Data schemas & types
│   ├── __init__.py
│   └── schemas.py                  # Pydantic schemas (Product, Order, Transaction, etc.)
├── services/                       # Core application services & integrations
│   ├── __init__.py
│   ├── parser.py                   # Natural language WhatsApp command parser
│   ├── formatter.py                # WhatsApp UI/UX message formatter & emojis
│   ├── whatsapp.py                 # Meta WhatsApp Cloud API client
│   └── handler.py                  # Central business logic router
├── scripts/                        # Utility & operational scripts
│   ├── __init__.py
│   └── seed_data.py                # Catalog seeder with sample products
├── tests/                          # Test suites
│   ├── __init__.py
│   └── test_system.py              # End-to-end unit and integration test suite
├── docs/                           # Project requirements, TRD, and architecture specs
│   ├── 1_product_requirements_document_prd.md
│   ├── 2_technical_requirements_document_trd.md
│   ├── 3_application_flow_state_machine.md
│   ├── 4_ui_ux_design_scheme.md
│   ├── 5_backend_database_schemas.md
│   └── 6_master_implementation_plan.md
├── secrets/                        # 🔒 PRIVATE SECRETS FOLDER (Ignored by Git, never committed)
│   ├── secrets.env                 # Your real API keys, tokens & phone numbers
│   └── credentials.json.example    # Optional JSON-based secrets template
├── secrets.example/                # Public template directory tracked on GitHub
│   └── secrets.env.example         # Template showing required environment variables
├── main.py                         # Clean FastAPI application entry point
├── requirements.txt                # Python package dependencies
├── .gitignore                      # Git ignore rules (strictly excludes secrets/, .env, *.db)
├── .env.example                    # General configuration template
├── .env                            # Local development environment file
└── README.md                       # Complete documentation and setup manual
```

---

## 🗄️ Database Schemas (SQLite)

The local SQLite database (`inventory.db`) implements four relational tables with foreign keys and indexes:

### 1. `products`
```sql
CREATE TABLE products (
    item_code VARCHAR(50) PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    current_qty INTEGER DEFAULT 0,
    min_alert_qty INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `inventory_transactions` (Immutable Audit Ledger)
```sql
CREATE TABLE inventory_transactions (
    txn_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code VARCHAR(50) NOT NULL,
    txn_type VARCHAR(10) NOT NULL,         -- 'IN' or 'OUT'
    quantity INTEGER NOT NULL,
    resulting_qty INTEGER NOT NULL,        -- Snapshot of total balance after txn
    actor_phone VARCHAR(20) NOT NULL,      -- Sender phone or SYSTEM reference
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_code) REFERENCES products(item_code)
);
```

### 3. `orders` (Orders Database)
```sql
CREATE TABLE orders (
    order_id VARCHAR(50) PRIMARY KEY,      -- e.g. 'ORD-20261024-A1B2'
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) DEFAULT '',
    status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, CONFIRMED, DISPATCHED, COMPLETED, CANCELLED
    total_amount REAL DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `order_items` (Order Line Items)
```sql
CREATE TABLE order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id VARCHAR(50) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL DEFAULT 0.0,
    subtotal REAL DEFAULT 0.0,
    FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY(item_code) REFERENCES products(item_code)
);
```

---

## 🚀 Quickstart Guide

### Step 1: Clone & Prepare Python Environment
```bash
# Navigate to the project directory
cd blackbox

# Create and activate a virtual environment
python -m venv venv

# On Linux / macOS:
source venv/bin/activate
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Seed Sample Catalog Data
Populate the database with sample inventory items (White Shirt, Wireless Mouse, HDMI Cable, USB-C Hub):
```bash
python scripts/seed_data.py
```

### Step 3: Run the Test Suite
Ensure all components, database operations, parser commands, and webhook endpoints pass:
```bash
python tests/test_system.py
```

### Step 4: Start the Local FastAPI Server
```bash
python main.py
```
Or with Uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Once started, open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to access the interactive Swagger API documentation and simulator.

---

## 💬 WhatsApp Command Reference

| Command | Example | Description |
| :--- | :--- | :--- |
| `STOCK <CODE>` | `STOCK 101` | Returns the current quantity, category, and alert threshold. |
| `IN <CODE> <QTY>` | `IN 101 20` | Adds inventory, increments total, and logs an immutable `IN` record. |
| `OUT <CODE> <QTY>` | `OUT 101 5` | Deducts stock, logs an `OUT` record, and triggers low-stock alerts if below minimum. |
| `ADD <CODE> <NAME> [QTY] [MIN]` | `ADD 202 "Sneakers" 15 3` | Registers a new product into the catalog. |
| `CATALOG` or `ITEMS` | `CATALOG` | Lists all items in the inventory with current balances. |
| `REPORT` | `REPORT` | Daily summary of all stock, today's top moving items, and low stock warnings. |
| `LOWSTOCK` | `LOWSTOCK` | Displays all items currently at or below their alert threshold. |
| `ORDER <CODE> <QTY> [CUSTOMER]` | `ORDER 505 2 Alice` | Creates a quick order, deducts stock, and returns order ID. |
| `ORDERS` | `ORDERS` | Lists the 10 most recent customer orders with statuses. |
| `ORDER <ORDER_ID>` | `ORDER ORD-20261024-A1B2` | Displays complete order details and line items. |
| `ORDER STATUS <ID> <STATUS>` | `ORDER STATUS ORD-20261024-A1B2 DISPATCHED` | Updates order status (`CONFIRMED`, `DISPATCHED`, `COMPLETED`, `CANCELLED`). |
| `HELP` | `HELP` | Shows command cheat sheet and formatting examples. |

---

## 🎨 UI/UX WhatsApp Formatting Examples

### 1. Stock Check (`STOCK 101`)
```text
📦 *Item Stock Status*
Item: *White Shirt (L)* (```101```)
Current Stock: *45 units*
Category: Apparel
Min Alert Threshold: 10 units
```

### 2. Stock In (`IN 505 10`)
```text
✅ *Stock Updated Successfully*
Item: *Wireless Mouse* (```505```)
Added: *+10*
New Total: *34 units*
Txn Ref: ```#1```
```

### 3. Stock Out with Low Stock Warning (`OUT 505 31`)
```text
📉 *Stock Deducted Successfully*
Item: *Wireless Mouse* (```505```)
Deducted: *31*
New Total: *3 units*
Txn Ref: ```#2```

⚠️ *Low Stock Alert:*
Item ```505``` is at or below threshold (5 units)!
```

### 4. Daily Report (`REPORT`)
```text
📊 *Daily Inventory Summary*
- White Shirt (L) (```101```): *45*
- Wireless Mouse (```505```): *3*
- HDMI Cable (2 Meter) (```HDMI_2M```): *12*
- USB-C Hub (7-in-1) (```USBC_HUB```): *3*

🔥 *Today's Top Movers (Sales/Out):*
- Wireless Mouse: *31 units dispatched*

⚠️ *Low Stock Alert:*
- Wireless Mouse (```505```): *3 units remaining!*
- USB-C Hub (7-in-1) (```USBC_HUB```): *3 units remaining!*
```

---

## 🌐 Connecting Meta WhatsApp Cloud API

### 1. Set Up Cloudflare Tunnel
Expose your local port 8000 to a public HTTPS URL without router port forwarding:
```bash
# On Linux:
sudo apt install cloudflared
cloudflared tunnel --url http://localhost:8000

# On Windows:
# Download cloudflared.exe from Cloudflare, then run:
.\cloudflared.exe tunnel --url http://localhost:8000
```
Note the generated URL (e.g., `https://random-words.trycloudflare.com`).

### 2. Configure Meta Developer Portal
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create or open your WhatsApp App and navigate to **WhatsApp > API Setup**.
3. Note your **Temporary Access Token** and **Phone Number ID**.
4. In your project `.env` file, set:
   ```env
   WHATSAPP_TOKEN=your_meta_access_token
   PHONE_NUMBER_ID=your_phone_number_id
   VERIFY_TOKEN=blackbox_inventory_token_2026
   OWNER_PHONE_NUMBERS=+YOUR_PHONE_NUMBER
   ```
5. Navigate to **WhatsApp > Configuration > Webhook**:
   - **Callback URL:** `https://random-words.trycloudflare.com/webhook`
   - **Verify Token:** `blackbox_inventory_token_2026` (must match `VERIFY_TOKEN` in `.env`)
   - Click **Verify and Save**.
6. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.

### 3. Send Your First Message!
From your WhatsApp phone, send a message to the test phone number provided in the Meta portal:
```
STOCK 101
```
You will receive the formatted instant reply on WhatsApp!

---

## 🧪 Local Testing Without Live Meta Credentials

The application includes a built-in interactive simulator and mock engine. You can test without needing live Meta API keys:

1. **Via Swagger UI:** Navigate to `http://localhost:8000/docs` and test `POST /api/simulate-message`.
2. **Via cURL:**
   ```bash
   curl -X POST "http://localhost:8000/api/simulate-message" \
        -H "Content-Type: application/json" \
        -d '{"sender_phone": "+1234567890", "message_text": "IN 101 5"}'
   ```
3. Outbound WhatsApp messages will be logged directly to the server terminal in clean formatted blocks.

---

---

## 🔒 Private Secrets & Credentials Folder (`secrets/`)

To prevent your WhatsApp API keys, tokens, and personal phone numbers from ever leaking or getting committed to GitHub, the application includes a dedicated **`secrets/`** directory pattern.

### 🛡️ Why it is 100% Safe:
1. The **`secrets/`** folder is explicitly declared in [.gitignore](file:///c:/Users/akshi/OneDrive/Desktop/WORK/Python/blackbox/.gitignore).
2. Git completely ignores everything inside `secrets/`. Running `git add .` or `git commit` will **never** stage or upload files in this directory.

### 📝 How to Add Your Phone Number and API Keys:

You can add your credentials in either `.env` format or `JSON` format inside `secrets/`:

#### Option A: `secrets/secrets.env` (Recommended)
Edit the pre-created file at `secrets/secrets.env`:
```env
# Meta WhatsApp Cloud API Credentials
WHATSAPP_TOKEN=EAAG...YOUR_REAL_META_ACCESS_TOKEN
PHONE_NUMBER_ID=123456789012345
META_API_VERSION=v21.0

# Your custom secret webhook verification token
VERIFY_TOKEN=my_secure_custom_webhook_secret_2026

# Authorized Phone Numbers (comma-separated with country code)
OWNER_PHONE_NUMBERS=+1234567890,+919876543210
```

#### Option B: `secrets/credentials.json` (JSON Format)
Alternatively, create `secrets/credentials.json`:
```json
{
  "whatsapp_token": "EAAG...YOUR_ACCESS_TOKEN",
  "phone_number_id": "123456789012345",
  "verify_token": "my_secure_custom_webhook_secret_2026",
  "owner_phone_numbers": [
    "+1234567890",
    "+919876543210"
  ]
}
```

### ⚙️ How Priority & Loading Works:
When the app launches, [config.py](file:///c:/Users/akshi/OneDrive/Desktop/WORK/Python/blackbox/config.py) checks and merges settings in this priority order:
1. **System Environment Variables** (Highest)
2. **`secrets/secrets.env` / `secrets/credentials.json`** (Overrides defaults)
3. **`.env`** (Default fallback values)

---

## 🔒 Security & Authorization

* **Owner Phone Verification:** Only phone numbers listed in `OWNER_PHONE_NUMBERS` (in `secrets/secrets.env` or `secrets/credentials.json`) are permitted to query stock or execute transactions. Unauthorized senders receive an `⚠️ Access Denied` message.
* **Git Leak Protection:** `secrets/`, `credentials/`, `private/`, and `.env` are strictly blocked in `.gitignore`.
* **Local Data Storage:** The SQLite database remains strictly on the local machine; business data never leaves the server.
* **Webhook Challenge Verification:** Meta's webhook challenge handshake prevents unauthorized third-party callbacks.

