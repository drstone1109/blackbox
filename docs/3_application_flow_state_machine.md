# Application Flow (WhatsApp Level 0)

Because this is a generalized Level 0 tracker, we use a simple **Command-Response Flow** rather than a complex multi-stage baton pass.

## 1. Core Command Flows

**Flow 1: Checking Stock**
*   **Owner Sends:** `STOCK 101` (or `STOCK SHIRT_L`)
*   **Bot Looks up:** Queries SQLite for item `101`.
*   **Bot Replies:** `📦 Item: White Shirt (L) | Current Stock: 45 units.`

**Flow 2: Adding Inventory (Stock In)**
*   **Owner Sends:** `IN 101 20` (Add 20 units to item 101)
*   **Bot Action:** Adds 20 to the `current_qty` in SQLite. Writes an `IN` record to the transaction log.
*   **Bot Replies:** `✅ Added 20 units to White Shirt (L). New Total: 65 units.`

**Flow 3: Deducting Inventory (Stock Out / Sale)**
*   **Owner Sends:** `OUT 101 5` (Deduct 5 units from item 101)
*   **Bot Action:** Deducts 5 from `current_qty`. Writes an `OUT` record to the transaction log.
*   **Bot Replies:** `📉 Deducted 5 units from White Shirt (L). New Total: 60 units.`

**Flow 4: Daily Summary**
*   **Owner Sends:** `REPORT`
*   **Bot Replies:** A summarized list of the top moving items today and any items where `current_qty < minimum_qty`.

## 2. Error Handling Flow
*   **Owner Sends:** `IN 101 ABC` (Invalid number)
*   **Bot Replies:** `⚠️ Invalid format. Please use: IN <ITEM_CODE> <QUANTITY>`