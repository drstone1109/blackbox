# Blackbox ERP — Website Layout & UI Guide (v3.0)

> **Document Type:** Frontend Architecture, Visual Layout & Operational Workflows  
> **System Version:** Blackbox ERP v3.0 Adaptive Enterprise Trading Edition  
> **Philosophy:** Business Owner has absolute control over visibility. The system provides an ultra-simplified ATM-style interface for the owner, with granular department routing and privacy controls for workers.  
> **Design Aesthetic:** Corporate Minimal (Zinc, White, High Contrast Neutral Tones, Rounded-2xl / Rounded-3xl), Indian Rupee (`₹`) Pricing, High-Value Electronics Trading.

---

## 1. High-Level Visual Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                      BLACKBOX ERP v3.0 SHELL                                       |
+-------------------+--------------------------------------------------------------------------------+
| SIDEBAR           | TOP HEADER BAR                                                                 |
| [Expanded: 256px] | Active Tab Title (e.g. "Owner's Operations Screen") [Export CSV] [Sync] [🔔]  |
| [Collapsed: 80px] +--------------------------------------------------------------------------------+
|                   | MAIN SCROLLABLE CONTENT VIEWPORT (`overflow-y-auto`)                           |
| • Brand Header    |                                                                                |
|   "BLACKBOX ERP"  | +----------------------------------------------------------------------------+ |
|   "🏢 COMPANY"    | | VIEW CONTAINER (Filtered via Blackbox Visibility Engine)                   | |
| • API Status Pill | |                                                                            | |
|                   | | 1. Owner's Screen: ATM-Style Cards + 2x2 Massive Action Buttons            | |
| [Workflows]       | | 2. Buy Stock / Procurement: Supplier POs + Inward + Dept Sub-Staff         | |
| • Dashboard       | | 3. Warehouse (Godown): Stock Health, Barcode Scanner + Dept Sub-Staff      | |
| • Buy Stock (PO)  | | 4. Dispatch / Logistics: Ready Challans + Deductions + Dept Sub-Staff      | |
| • Godown          | | 5. Khata / Payments: Cash In/Out, Receivables, Payables + Dept Sub-Staff   | |
| • Dispatch        | | 6. Master Product Catalog (SKU pricing, Barcodes, Financial Masking)       | |
| • Khata / Payments| | 7. Suppliers Directory (Vendor details & total spend)                      | |
|                   | | 8. Team Access Control: Master Switch & 4-Pill Department Matrix           | |
| [System]          | | 9. Immutable Audit Ledger (Physical movements chronological record)        | |
| • Audit Ledger    | | 10. Barcode Terminal (Fast stock movement & audio feedback)                | |
| • Barcode Terminal| +----------------------------------------------------------------------------+ |
| • Access / Logout |                                                                                |
+-------------------+--------------------------------------------------------------------------------+
| (Mobile View Only) Fixed Bottom Nav: [Dashboard] [Buy Stock] [Godown] [Dispatch] [Khata] [Logout]  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Authentication: The 2-Step Login System (Prompt 1)

The login flow is separated into two clean, corporate-minimal steps:

### Step 1: Company Gate
* **UI:** A clean, centered card asking only for the `Company Code`.
* **Input:** Large, touch-friendly uppercase mono input (e.g., `BLACKBOX-TRADING`, `XYZ-TRADING`, `APEX`).
* **Validation:** Verified against `/api/auth/company-gate`.
* **Action:** Loads specific company settings and routing rules.

### Step 2: User Identification
* **UI:** Shows company code at the top as an executive pill badge (`🏢 BLACKBOX-TRADING`) with a "Change" button to return to Step 1.
* **Inputs:**
  * Phone Number or Username
  * Security PIN / Password
* **Action:** Massive high-contrast button: `Login to Blackbox`.
* **1-Click Demo Logins:** Instant shortcuts for:
  * 👑 **Business Owner** (`admin` / PIN: `1234`)
  * 🏭 **Godown Lead** (Warehouse Manager / PIN: `1234`)
  * 🚚 **Logistics Driver** (Worker with hidden financials / PIN: `1234`)
  * 💸 **Khata Clerk** (Finance Assistant / PIN: `1234`)

---

## 3. The Owner's Simplified Dashboard (ATM-Style — Prompt 2)

Designed specifically for non-technical users who require instant bottom-line figures without visual clutter:

### 3.1 Top 3 Massive Metric Cards
1. **Today's In (Sales):** Huge emerald text (`text-emerald-600 font-black text-3xl md:text-4xl`), showing gross sales inflows from dispatched goods in Indian Rupees (`₹`).
2. **Today's Out (Spend):** Huge red text (`text-red-600 font-black text-3xl md:text-4xl`), showing inventory procurement spend.
3. **Total Godown Value:** Huge blue text (`text-blue-600 font-black text-3xl md:text-4xl`), showing real-time total asset value of all warehouse inventory.

### 3.2 Center 2x2 Grid of Massive Square Buttons (`h-44 md:h-48`)
* 📦 **Buy Stock:** Procurement, supplier orders, inward goods receiving.
* 🏭 **Godown:** Warehouse audit, inventory health, barcode scanning.
* 🚚 **Dispatch:** Delivery challans, customer shipping, packing slips.
* 💸 **Khata / Payments:** Receivables, supplier dues, cashflow.

### 3.3 Bottom Control
* **Full-Width Black Button:** `👥 Manage Team & Permissions` — opens the Team Access Control engine directly from anywhere.

---

## 4. The Blackbox Visibility Engine (Prompt 3)

The Business Owner has complete control over what team members can see:

### 4.1 Master Mode Toggle
* **Open Blackbox Mode (Startup Mode):** When ON, all workers see all 4 departments unified.
* **Restricted Access Mode (Corporate Mode):** When OFF, workers are locked strictly to their assigned departments.

### 4.2 4-Pill Department Matrix
When in Restricted Mode, the Owner taps large touch-friendly pills for each worker:
* `[📦 Procurement]`
* `[🏭 Godown]`
* `[🚚 Dispatch]`
* `[💸 Khata]`

Tapping instantly grants or revokes access in real-time (`/api/staff/{id}/departments`).

---

## 5. Department Manager Sub-Staff Tables (Prompt 4)

Each core department features a dedicated Sub-Staff Management section:
* **Table Columns:** Name, Phone, Role Level, Financial Visibility, Actions.
* **+ Add Staff Modal:**
  * **Permission Level Dropdown:**
    1. `Manager (Full Access & Approvals)`
    2. `Worker (Restricted View / Scanner Only / Draft Only)`
  * **Financial Masking Checkbox:** `"Hide all prices/financials from this user"` — when checked, cost prices, selling margins, and cash values appear as `••••`.

---

## 6. Department 4: Khata (Payments & Finance)

* **6 KPI Cards:** Today's In, Today's Out, Net Cashflow, Total Receivables, Total Payables, Godown Value.
* **Customer Receivables Tab:** Delivery Challans pending payment with `Collect Payment` action.
* **Supplier Payables Tab:** Purchase Orders pending dues clearance with `Clear Dues` action.
* **Finance Team Sub-Staff:** Management of accounts clerks and cash handlers.
