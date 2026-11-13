# Blackbox ERP — Complete Workflow, Design, & AI Prompts

> **Philosophy:** An adaptive ERP where the **Business Owner has absolute control over visibility**. The Owner can toggle a switch to let all workers see everything (Transparent Blackbox) or restrict them to specific departments. The Owner's interface is radically simple, designed for users with minimal technical experience, functioning more like an ATM screen than a complex dashboard.

---

## 1. Authentication & Routing Workflow

### 1.1 The 2-Step Login Flow
To ensure data isolation and high security, login is strictly separated.

1. **Step 1: Company Gate**
   * **UI:** A clean screen with a single large input for `Company Code` (e.g., `XYZ-TRADING`).
   * **Action:** Validates the company, fetches the company logo, and loads the specific routing rules set by the Owner.
2. **Step 2: User Identification**
   * **UI:** Shows Company Logo. Inputs for `Username/Phone` and `Password/OTP`.
   * **Action:** Authenticates the user and checks their Owner-assigned permissions.

### 1.2 The "Blackbox Visibility Engine" (Owner Controlled)
Instead of automatic user counting, the Owner dictates the routing logic via a simple settings panel.

* **Mode A: "Open Blackbox" (Startup Mode)**
  * The Owner checks a box: *"Allow my team to see everything."*
  * **Result:** All workers, regardless of title, get a unified dashboard. They can see Procurement, Warehouse, Logistics, and Payments. 
* **Mode B: "Restricted Access" (Corporate Mode)**
  * The Owner assigns specific modules to specific workers.
  * **Result:** A Warehouse worker logging in will *only* see the Godown screen. They cannot access Payments or Procurement.

---

## 2. Department Workflows & Hierarchies

### 2.1 The Owner's Dashboard (Ultra-Simplified)
**Target Audience:** Non-technical, less educated, needs bottom-line numbers instantly.
* **UI Design:** No complex tables, no tiny text. Huge touch-friendly areas.
* **Layout:**
  * **Top Metrics (Large text, high contrast):** `Today's Cash In (Green)`, `Today's Cash Out (Red)`, `Total Godown Value (Blue)`.
  * **Center Grid (4 Massive Buttons):**
    1. 📦 **Buy Stock** (Procurement)
    2. 🏭 **Godown** (Warehouse)
    3. 🚚 **Dispatch** (Logistics)
    4. 💸 **Khata** (Payments)
  * **Bottom Controls:** 
    * 👥 **Manage My Team & Permissions** (The access control switch).

### 2.2 Department 1: Procurement (Purchasing)
* **Manager Role:** Manage suppliers, negotiate, create Purchase Orders (POs).
* **Hierarchy:** Can add "Purchasing Assistants" (who can only *draft* POs for the Manager to approve).
* **View:** Supplier Directory, Pending POs, Item Cost History.

### 2.3 Department 2: Warehouse (Godown)
* **Manager Role:** Receive inward goods, audit inventory, manage shelves.
* **Hierarchy:** Can add "Godown Staff" (Access limited to a barcode scanner view for IN/OUT. Financial prices and margins are strictly hidden).
* **View:** Real-time stock levels, Low Stock Alerts, Scanner Terminal.

### 2.4 Department 3: Shipping & Logistics
* **Manager Role:** Generate delivery challans, track shipments.
* **Hierarchy:** Can add "Drivers/Packers" (Access limited to delivery addresses and packing lists. No pricing visible).
* **View:** Orders Ready to Ship, Dispatch queue.

### 2.5 Department 4: Payments & Finance
* **Manager Role:** Track accounts receivable/payable, clear dues.
* **Hierarchy:** Can add "Data Entry Clerks" (Can log receipts, but cannot approve final bank reconciliations).
* **View:** Pending Invoices, Cashflow, Profit Margins.

---

## 3. "Antigravity" Prompts (AI Scaffolding)

*Copy and paste these directly into your AI builder (Cursor, v0, Lovable, etc.) to generate the code block by block.*

### Prompt 1: The 2-Step Login System
```text
[PROMPT: LOGIN SYSTEM]
Build a React/Tailwind 2-step login flow. 
Step 1: A clean, centered card asking ONLY for "Company Code". Use a large, touch-friendly input. When the user clicks "Next", mock a loading state.
Step 2: Transition the card to show the Company Code at the top as a pill badge. Show inputs for "Phone Number" and "PIN/Password", with a massive "Login" button. 
Use a corporate minimal design (zinc, white, neutral tones, rounded-2xl). Manage state using React useState.
```

### Prompt 2: The Owner's Simplified Dashboard
```text
[PROMPT: OWNER DASHBOARD UI]
Build the "Simplified Owner Dashboard" in React and Tailwind. 
Target audience: Non-technical users. It must look like a basic ATM interface—no clutter, huge clickable areas.
Layout:
- Top: 3 massive metric cards side-by-side: "Today's In" (text-green-600), "Today's Out" (text-red-600), "Godown Value" (text-blue-600). Format numbers in Indian Rupees (₹).
- Middle: A 2x2 grid of massive square buttons (h-48) with giant icons. Text: "📦 Buy Stock", "🏭 Godown", "🚚 Dispatch", "💸 Khata / Payments".
- Bottom: A full-width, distinct black button: "👥 Manage Team & Permissions".
Use extremely high contrast and large text (text-2xl or larger).
```

### Prompt 3: The Owner's Permission Engine (The Switch)
```text
[PROMPT: OWNER PERMISSION ENGINE]
Build a React interface for the Owner to manage worker permissions. 
Title: "Team Access Control".
Top section: A massive Toggle Switch labeled "Open Blackbox Mode (Everyone sees everything)". Add a subtitle explaining that turning this off enables strict restricted access.
Bottom section (Only visible if toggle is OFF): A list of workers. Next to each worker's name, render 4 large checkboxes/toggle pills for the departments: [Procurement] [Warehouse] [Logistics] [Payments]. 
The Owner can tap these pills to instantly grant or revoke that worker's access to that specific department. Make the UI chunky and mobile-friendly.
```

### Prompt 4: Department Manager's Sub-Staff Table
```text
[PROMPT: ROLE HIERARCHY MANAGER]
Build a React component for a Department Manager (e.g., Warehouse Manager) to add sub-staff. 
Layout:
- A clean table showing current staff under this specific department. Columns: Name, Phone, Role Level, Actions.
- A "+ Add Staff" modal. 
In the modal, include a dropdown for "Permission Level" with two strict options: 
1. "Manager (Full Access & Approvals)"
2. "Worker (Restricted View / Scanner Only / Draft Only)".
Include checkboxes for "Hide all prices/financials from this user". Make it look clean and corporate.
```