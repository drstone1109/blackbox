import shlex
from typing import Optional, List
from models.schemas import ParsedCommand


def parse_message(raw_text: str) -> ParsedCommand:
    """
    Parse incoming WhatsApp raw message into a structured ParsedCommand.
    Enforces format rules from Document 3 & 4 with friendly error feedback.
    """
    if not raw_text or not raw_text.strip():
        return ParsedCommand(
            action="HELP",
            raw_text=raw_text or "",
            error=None
        )

    text = raw_text.strip()
    tokens = text.split()
    cmd = tokens[0].upper()

    # 1. HELP / MENU / ?
    if cmd in ("HELP", "MENU", "?", "START"):
        return ParsedCommand(action="HELP", raw_text=text)

    # 2. STOCK CHECK
    if cmd == "STOCK":
        if len(tokens) < 2:
            return ParsedCommand(
                action="STOCK",
                raw_text=text,
                error="Invalid format. Please use: STOCK <ITEM_CODE>"
            )
        item_code = tokens[1].upper()
        return ParsedCommand(action="STOCK", item_code=item_code, raw_text=text)

    # 3. STOCK IN
    if cmd == "IN":
        if len(tokens) < 3:
            return ParsedCommand(
                action="IN",
                raw_text=text,
                error="Invalid format. Please use: IN <ITEM_CODE> <QUANTITY>"
            )
        item_code = tokens[1].upper()
        try:
            qty = int(tokens[2])
            if qty <= 0:
                return ParsedCommand(
                    action="IN",
                    raw_text=text,
                    error="Quantity must be a positive integer."
                )
        except ValueError:
            return ParsedCommand(
                action="IN",
                raw_text=text,
                error="Invalid format. Please use: IN <ITEM_CODE> <QUANTITY>"
            )

        return ParsedCommand(action="IN", item_code=item_code, quantity=qty, raw_text=text)

    # 4. STOCK OUT
    if cmd == "OUT":
        if len(tokens) < 3:
            return ParsedCommand(
                action="OUT",
                raw_text=text,
                error="Invalid format. Please use: OUT <ITEM_CODE> <QUANTITY>"
            )
        item_code = tokens[1].upper()
        try:
            qty = int(tokens[2])
            if qty <= 0:
                return ParsedCommand(
                    action="OUT",
                    raw_text=text,
                    error="Quantity must be a positive integer."
                )
        except ValueError:
            return ParsedCommand(
                action="OUT",
                raw_text=text,
                error="Invalid format. Please use: OUT <ITEM_CODE> <QUANTITY>"
            )

        return ParsedCommand(action="OUT", item_code=item_code, quantity=qty, raw_text=text)

    # 5. REPORT
    if cmd in ("REPORT", "SUMMARY", "STATS"):
        return ParsedCommand(action="REPORT", raw_text=text)

    # 6. LOW STOCK
    if cmd in ("LOWSTOCK", "LOW", "ALERTS", "ALERT"):
        return ParsedCommand(action="LOWSTOCK", raw_text=text)

    # 7. CATALOG / ITEMS
    if cmd in ("CATALOG", "ITEMS", "PRODUCTS", "LIST"):
        return ParsedCommand(action="CATALOG", raw_text=text)

    # 8. ADD NEW PRODUCT (e.g. ADD 102 "Blue Denim Jeans" 50 10)
    if cmd == "ADD":
        if len(tokens) < 3:
            return ParsedCommand(
                action="ADD",
                raw_text=text,
                error="Invalid format. Please use: ADD <ITEM_CODE> <ITEM_NAME> [QTY] [MIN_ALERT]"
            )
        try:
            parts = shlex.split(text)
        except Exception:
            parts = tokens

        item_code = parts[1].upper()
        item_name = parts[2]
        qty = 0
        min_alert = 5

        if len(parts) >= 4:
            try:
                qty = int(parts[3])
            except ValueError:
                pass
        if len(parts) >= 5:
            try:
                min_alert = int(parts[4])
            except ValueError:
                pass

        return ParsedCommand(
            action="ADD",
            item_code=item_code,
            quantity=qty,
            params={"item_name": item_name, "min_alert": min_alert},
            raw_text=text
        )

    # 9. ORDERS MANAGEMENT
    if cmd in ("ORDERS", "ORDER"):
        if cmd == "ORDERS" or len(tokens) == 1:
            return ParsedCommand(action="ORDERS", raw_text=text)

        sub_cmd = tokens[1].upper()
        if sub_cmd == "STATUS" and len(tokens) >= 4:
            order_id = tokens[2]
            new_status = tokens[3].upper()
            return ParsedCommand(
                action="ORDER_STATUS",
                params={"order_id": order_id, "status": new_status},
                raw_text=text
            )

        if tokens[1].upper().startswith("ORD-") or (len(tokens) == 2 and not tokens[1].isdigit()):
            return ParsedCommand(
                action="ORDER_GET",
                params={"order_id": tokens[1]},
                raw_text=text
            )

        if len(tokens) >= 3:
            item_code = tokens[1].upper()
            try:
                qty = int(tokens[2])
                customer = " ".join(tokens[3:]) if len(tokens) > 3 else "Walk-in Customer"
                return ParsedCommand(
                    action="ORDER_CREATE",
                    item_code=item_code,
                    quantity=qty,
                    params={"customer_name": customer},
                    raw_text=text
                )
            except ValueError:
                pass

        return ParsedCommand(
            action="ORDER",
            raw_text=text,
            error="Invalid order command. Use: ORDER <ITEM_CODE> <QTY> [CUSTOMER] or ORDERS or ORDER <ORDER_ID>"
        )

    return ParsedCommand(
        action="UNKNOWN",
        raw_text=text,
        error=f"Unknown command '{cmd}'. Send *HELP* to see available commands."
    )
