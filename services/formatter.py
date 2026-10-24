from typing import List, Dict, Any
from models.schemas import Product, InventoryTransaction, Order


def format_stock_check(product: Product) -> str:
    """Format single item stock response according to Document 3 & 4."""
    status_indicator = "⚠️ *Low Stock Alert!*" if product.is_low_stock else "📦"
    return (
        f"{status_indicator} *Item Stock Status*\n"
        f"Item: *{product.item_name}* (```{product.item_code}```)\n"
        f"Current Stock: *{product.current_qty} units*\n"
        f"Category: {product.category}\n"
        f"Min Alert Threshold: {product.min_alert_qty} units"
    )


def format_stock_in(product: Product, added_qty: int, txn: InventoryTransaction = None) -> str:
    """Format stock addition response according to Document 4."""
    txn_ref = f"\nTxn Ref: ```#{txn.txn_id}```" if txn and txn.txn_id else ""
    return (
        f"✅ *Stock Updated Successfully*\n"
        f"Item: *{product.item_name}* (```{product.item_code}```)\n"
        f"Added: *+{added_qty}*\n"
        f"New Total: *{product.current_qty} units*{txn_ref}"
    )


def format_stock_out(product: Product, deducted_qty: int, txn: InventoryTransaction = None, is_low_stock: bool = False) -> str:
    """Format stock deduction response with optional low-stock alert according to Document 4."""
    txn_ref = f"\nTxn Ref: ```#{txn.txn_id}```" if txn and txn.txn_id else ""
    msg = (
        f"📉 *Stock Deducted Successfully*\n"
        f"Item: *{product.item_name}* (```{product.item_code}```)\n"
        f"Deducted: *{deducted_qty}*\n"
        f"New Total: *{product.current_qty} units*{txn_ref}"
    )
    if is_low_stock:
        msg += f"\n\n⚠️ *Low Stock Alert:*\nItem ```{product.item_code}``` is at or below threshold ({product.min_alert_qty} units)!"
    return msg


def format_product_created(product: Product) -> str:
    """Format new product registration."""
    return (
        f"✨ *New Product Registered*\n"
        f"Item: *{product.item_name}* (```{product.item_code}```)\n"
        f"Category: {product.category}\n"
        f"Initial Stock: *{product.current_qty} units*\n"
        f"Alert Threshold: {product.min_alert_qty} units"
    )


def format_report(summary_data: Dict[str, Any]) -> str:
    """Format daily report according to Document 4."""
    all_products: List[Product] = summary_data.get("all_products", [])
    low_stock: List[Product] = summary_data.get("low_stock", [])
    top_moving: List[Dict[str, Any]] = summary_data.get("top_moving", [])

    lines = ["📊 *Daily Inventory Summary*"]

    if all_products:
        for p in all_products:
            lines.append(f"- {p.item_name} (```{p.item_code}```): *{p.current_qty}*")
    else:
        lines.append("- _No products in catalog._")

    if top_moving:
        lines.append("\n🔥 *Today's Top Movers (Sales/Out):*")
        for item in top_moving:
            lines.append(f"- {item['item_name']}: *{item['moved_qty']} units dispatched*")

    if low_stock:
        lines.append("\n⚠️ *Low Stock Alert:*")
        for p in low_stock:
            lines.append(f"- {p.item_name} (```{p.item_code}```): *{p.current_qty} units remaining!*")
    else:
        lines.append("\n✅ *All stock levels healthy!*")

    return "\n".join(lines)


def format_low_stock_list(low_stock_products: List[Product]) -> str:
    """Format dedicated low-stock list."""
    if not low_stock_products:
        return "✅ *Stock Healthy:* No items are currently below minimum alert threshold."

    lines = ["⚠️ *Low Stock Alerts:*"]
    for p in low_stock_products:
        lines.append(f"- *{p.item_name}* (```{p.item_code}```): *{p.current_qty} units* (Min: {p.min_alert_qty})")
    return "\n".join(lines)


def format_catalog(products: List[Product]) -> str:
    """Format full product catalog."""
    if not products:
        return "📦 *Catalog is empty.* Use `ADD <code > <name>` to register items."

    lines = [f"📦 *Product Catalog ({len(products)} Items)*"]
    for p in products:
        flag = " ⚠️" if p.is_low_stock else ""
        lines.append(f"- ```{p.item_code}```: *{p.item_name}* | Qty: *{p.current_qty}*{flag}")
    return "\n".join(lines)


def format_order_created(order: Order, warnings: List[str] = None) -> str:
    """Format order creation confirmation."""
    lines = [
        f"🛒 *Order Created Successfully*",
        f"Order ID: ```{order.order_id}```",
        f"Customer: *{order.customer_name}*",
        f"Status: *{order.status}*",
        f"Items:"
    ]
    for item in order.items:
        lines.append(f"  • ```{item.item_code}``` x *{item.quantity}* @ ${item.unit_price:.2f} = *${item.subtotal:.2f}*")

    lines.append(f"Total Amount: *${order.total_amount:.2f}*")

    if warnings:
        lines.append("")
        for w in warnings:
            lines.append(w)

    return "\n".join(lines)


def format_order_details(order: Order) -> str:
    """Format single order details."""
    lines = [
        f"🛒 *Order Details: ```{order.order_id}```*",
        f"Customer: *{order.customer_name}* ({order.customer_phone or 'N/A'})",
        f"Status: *{order.status}*",
        f"Date: {order.created_at or 'N/A'}",
        f"Line Items:"
    ]
    for item in order.items:
        lines.append(f"  • ```{item.item_code}``` x *{item.quantity}* (${item.subtotal:.2f})")
    lines.append(f"Total: *${order.total_amount:.2f}*")
    return "\n".join(lines)


def format_order_list(orders: List[Order]) -> str:
    """Format list of orders."""
    if not orders:
        return "🛒 *No orders found.*"

    lines = [f"📋 *Recent Orders ({len(orders)})*"]
    for o in orders:
        lines.append(
            f"- ```{o.order_id}``` | *{o.customer_name}* | Status: *{o.status}* | Total: *${o.total_amount:.2f}*"
        )
    return "\n".join(lines)


def format_error(message: str) -> str:
    """Format an error with standard warning emoji according to Document 3 & 4."""
    return f"⚠️ {message}"


def format_help() -> str:
    """WhatsApp Help Menu."""
    return (
        "🤖 *General WhatsApp Inventory ERP Commands*\n\n"
        "📦 *Inventory Management:*\n"
        "• `STOCK <ITEM_CODE>` - Check item quantity\n"
        "• `IN <ITEM_CODE> <QTY>` - Stock in (Procurement)\n"
        "• `OUT <ITEM_CODE> <QTY>` - Stock out (Sale / Dispatch)\n"
        "• `ADD <CODE> <NAME> [QTY] [MIN]` - Register new item\n"
        "• `CATALOG` or `ITEMS` - View all products\n"
        "• `REPORT` - Daily inventory summary\n"
        "• `LOWSTOCK` - List items below alert threshold\n\n"
        "🛒 *Orders Management:*\n"
        "• `ORDER <ITEM_CODE> <QTY> [CUSTOMER]` - Create quick order\n"
        "• `ORDERS` - List recent orders\n"
        "• `ORDER <ORDER_ID>` - View order details\n"
        "• `ORDER STATUS <ORDER_ID> <STATUS>` - Update status\n\n"
        "💡 *Example:* `IN 101 20` or `STOCK 101`"
    )
