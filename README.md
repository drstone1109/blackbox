# Blackbox ERP — Adaptive Business Operations Platform (v3.0)

> A high-performance, web-first operations and inventory ERP platform where the **Business Owner has absolute control over visibility**. Features a radically simplified ATM-style Owner screen, a 2-step company login gate, the Blackbox Visibility Engine for granular department access control, dedicated sub-staff role hierarchies, financial masking (`••••`), and Department 4 (Khata / Payments).

---

## 🌟 Key Capabilities

* **Web-First & Zero Extra Costs:** Completely decoupled from third-party messaging APIs; runs 100% locally or on any cloud server with zero recurring messaging fees.
* **The 2-Step Login Gate:**
  * **Step 1 (Company Gate):** Centered card asking only for the `Company Code` (`BLACKBOX-TRADING`, `XYZ-TRADING`, `APEX`).
  * **Step 2 (User Sign In):** Company pill badge, Username/Phone and PIN inputs, massive Login button, and 1-click role logins.
* **ATM-Style Owner's Dashboard:** Ultra-simplified, high-contrast, uncluttered interface designed for non-technical users:
  * **3 Massive Metric Cards:** Today's In (Green `₹`), Today's Out (Red `₹`), Total Godown Value (Blue `₹`).
  * **2x2 Grid of Massive Square Buttons (`h-44 md:h-48`):** 📦 Buy Stock, 🏭 Godown, 🚚 Dispatch, 💸 Khata / Payments.
  * **Full-Width Black Button:** `👥 Manage Team & Permissions`.
* **The Blackbox Visibility Engine:** Master toggle switch: *"Open Blackbox Mode (Everyone sees everything)"*. When OFF, Owner taps chunky department pills (`[📦 Procurement] [🏭 Godown] [🚚 Dispatch] [💸 Khata]`) to grant or revoke access in real time.
* **Department Sub-Staff Tables & Role Hierarchies:** Embedded in all 4 departments with:
  * `Manager (Full Access & Approvals)` vs `Worker (Restricted / Scanner Only)`
  * Checkbox: *"Hide all prices/financials from this user"* (masks costs and margins as `••••`).
* **Department 4: Khata / Payments View:** Cash In, Cash Out, Net Cashflow, Customer Receivables with `Collect Payment`, and Supplier Payables with `Clear Dues`.
* **Barcode Terminal & Fast Action Workstation:** Auto-focus barcode scanner terminal supporting handheld USB scanners and keyboard entry for instant stock IN and OUT execution with audio chimes.
* **One-Click CSV Report Exports:** Instant downloads for complete warehouse inventory valuations and transaction audit logs.
* **Immutable Forensic Ledger:** Every inward and outward transaction is permanently logged with timestamps, quantities, and resulting balances.

---

## 🏗️ System Architecture

```
                    +------------------------------------+
                    |   User / Admin / Warehouse Staff   |
                    |   (Desktop, Tablet, or Mobile Web) |
                    +-----------------+------------------+
                                      |
                                      v (HTTP / REST APIs)
     +---------------------------------------------------------------+
     |              FastAPI Backend Server (Port 8000)               |
     |                                                               |
     |  +---------------------+   +-------------------------------+  |
     |  |   Auth & Security   |   | Notifications & Report Export |  |
     |  +----------+----------+   +---------------+---------------+  |
     |             |                              |                  |
     |             +--------------+---------------+                  |
     |                            |                                  |
     |        +-------------------+--------------------+             |
     |        |                   |                    |             |
     |        v                   v                    v             |
     |  +------------+     +----------------+    +------------+      |
     |  |inventory_db|     | procurement_db |    |dispatch_db |      |
     |  +-----+------+     +-------+--------+    +-----+------+      |
     |        |                    |                   |             |
     |        +--------------------+-------------------+             |
     |                             |                                 |
     |                             v                                 |
     |            +---------------------------------+                |
     |            |   SQLite Database (inventory.db)|                |
     |            |   - products                    |                |
     |            |   - inventory_transactions      |                |
     |            |   - suppliers                   |                |
     |            |   - purchase_orders & po_items  |                |
     |            |   - delivery_challans & dc_items|                |
     |            |   - staff & permissions         |                |
     |            |   - system_settings             |                |
     |            +---------------------------------+                |
     +---------------------------------------------------------------+
```

---

## 📁 Modular Directory Structure

```text
blackbox/
├── config/                         # Application settings & environment loader
│   ├── __init__.py
│   └── settings.py
├── database/                       # Database engine, connection manager & tables
│   ├── __init__.py
│   ├── connection.py               # SQLite connection pool, schema & migrations
│   ├── inventory.py                # Products, stock in/out & immutable audit ledger
│   ├── procurement.py              # Purchase Orders (Buy Stock) & inward goods receiving
│   ├── dispatch.py                 # Delivery Challans (Out Stock) & physical dispatch
│   ├── suppliers.py                # Suppliers directory & aggregate spend tracking
│   ├── staff.py                    # Staff directory, roles, departments & permissions
│   └── orders.py                   # Customer orders & fulfillment
├── models/                         # Data schemas & types
│   ├── __init__.py
│   └── schemas.py                  # Pydantic schemas (PO, DC, Supplier, Staff, Khata)
├── scripts/                        # Utility & operational scripts
│   ├── __init__.py
│   └── seed_data.py                # Electronics catalog seeder (MacBooks, ThinkPads, iPads)
├── tests/                          # Test suites
│   ├── __init__.py
│   └── test_system.py              # Full unit test suite (16 test cases, 100% pass)
├── docs_frontend/                  # Frontend specifications & guides
│   └── WEBSITE_LAYOUT.md           # Authoritative Blackbox ERP layout & UI specification
├── frontend/                       # Vite + React + TypeScript ERP Web Dashboard
│   ├── dist/                       # Compiled production web bundle
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginScreen.tsx              # 2-Step Login System (Prompt 1)
│   │   │   ├── SimplifiedOwnerDashboard.tsx # ATM-Style Owner Dashboard (Prompt 2)
│   │   │   ├── TeamAccessControl.tsx        # Blackbox Visibility Engine (Prompt 3)
│   │   │   ├── DepartmentSubStaff.tsx       # Sub-Staff Table & Modal (Prompt 4)
│   │   │   └── KhataView.tsx                # Department 4: Payments & Finance
│   │   ├── api.ts                  # Typed REST API client
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── App.tsx                 # App wrapper
│   │   └── main.tsx                # React DOM root
│   ├── inventory_erp_dashboard.tsx # Main dashboard coordinator & navigation
│   └── package.json
├── main.py                         # Clean FastAPI application entry point
├── requirements.txt                # Python package dependencies
└── README.md                       # Complete documentation and setup manual
```

---

## 🚀 Quickstart Guide

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Seed Catalog & Demo Staff
```bash
python scripts/seed_data.py
```

### Step 3: Run the Test Suite
```bash
python -m unittest tests/test_system.py
```

### Step 4: Run the Web Dashboard

#### Production Mode (Single Port 8000)
Serve both the compiled frontend and backend REST APIs directly:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
* **Main Website:** Open **`http://localhost:8000/`** (or `http://localhost:8000/dashboard`).
* **API Documentation:** Open **`http://localhost:8000/docs`** for interactive Swagger docs.
* **Health Check:** Open **`http://localhost:8000/api/health`**.

---

## 🔐 Demo Credentials

1. **Company Gate (Step 1):** `BLACKBOX-TRADING` *(or `XYZ-TRADING`, `APEX`)*
2. **Step 2 Logins:**
   * 👑 **Business Owner:** ID: `admin` | PIN: `1234`
   * 🏭 **Godown Lead:** ID: `Rahul Verma` | PIN: `1234`
   * 🚚 **Dispatch Driver:** ID: `Amit Kumar` | PIN: `1234`
   * 💸 **Khata Clerk:** ID: `Priya Sharma` | PIN: `1234`
   *(Or click the 1-click role buttons on screen)*
