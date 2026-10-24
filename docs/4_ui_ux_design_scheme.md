# UI/UX Design Scheme (WhatsApp Interface)

For Level 0, the "UI" consists entirely of structured WhatsApp text messages. The UX relies on clear formatting, whitespace, and consistent emoji usage for rapid visual processing.

## 1. Text Formatting Rules
*   **Bold Text (`*text*`):** Used for Item Names, Quantities, and totals to make numbers stand out.
*   **Monospace (` ```text``` `):** Used for Item Codes or Transaction IDs to prevent reading errors.
*   **Lists:** Used for the `REPORT` command to keep data scannable.

## 2. Emoji Semantic System
Emojis act as visual status indicators:
*   ✅ **Green Check:** Successful addition/inward movement.
*   📉 **Chart Down:** Successful deduction/outward movement.
*   📦 **Box:** General stock query response.
*   ⚠️ **Warning:** Invalid command syntax, item not found, or stock running low.
*   📊 **Chart:** Daily report or analytics.

## 3. Example Interface (Chat View)

**[Owner]** `IN 505 10`
**[Bot]** 
✅ *Stock Updated Successfully*
Item: *Wireless Mouse* (```505```)
Added: *+10*
New Total: *34 units*

**[Owner]** `REPORT`
**[Bot]**
📊 *Daily Inventory Summary*
- Wireless Mouse: *34*
- HDMI Cable: *12*
⚠️ *Low Stock Alert:*
- USB-C Hub: *3 units remaining!*