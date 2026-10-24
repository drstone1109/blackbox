# Product Requirements Document (PRD)
**Project:** General WhatsApp Inventory ERP (Level 0)
**Target User:** Solo Owner / Small Shopkeeper managing general physical inventory.
**Environment:** Self-Hosted (Local Linux Machine)

## 1. Objective
Provide a frictionless, chat-based inventory management system. Business owners should be able to add stock, sell stock, and check balances using simple WhatsApp commands without ever opening a spreadsheet or complex web dashboard.

## 2. Core Features (Level 0)
*   **Stock Check:** Quickly retrieve the current quantity of any item.
*   **Stock In (Procurement):** Add new inventory to the database with a single command.
*   **Stock Out (Sales/Dispatch):** Deduct inventory and log the sale/dispatch.
*   **Low Stock Alerts (Automated):** Daily summary of items falling below a minimum threshold.
*   **Audit Logging:** Every addition or deduction is permanently recorded with a timestamp.

## 3. User Roles
*   **Owner (Admin):** Has full read/write access. Identified by their verified WhatsApp phone number. (In Level 0, the Owner is the sole user interacting with the system).

## 4. Success Criteria
*   The owner can execute an inventory update in under 5 seconds via WhatsApp.
*   The system accurately reflects live stock without requiring manual spreadsheet updates.
*   The local Linux server maintains continuous uptime during business hours.