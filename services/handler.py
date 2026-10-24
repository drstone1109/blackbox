import logging
from typing import Tuple, Optional
from config.settings import settings
from services.parser import parse_message
import database.inventory as inventory_db
import database.orders as orders_db
import services.formatter as formatter
from models.schemas import CommandResult

logger = logging.getLogger("command_handler")


def handle_user_command(message_text: str, sender_phone: str, db_path: str = None) -> CommandResult:
    """
    Process an incoming text message from a user/owner and execute the appropriate ERP action.
    """
    # 1. Authorization check
    if not settings.is_authorized(sender_phone):
        logger.warning("Unauthorized access attempt from phone: %s", sender_phone)
        return CommandResult(
            success=False,
            formatted_message=(
                f"⚠️ *Access Denied*\n"
                f"Phone number ```{sender_phone}``` is not authorized to manage inventory."
            )
        )

    # 2. Parse the command
    parsed = parse_message(message_text)

    if parsed.error:
        return CommandResult(
            success=False,
            formatted_message=formatter.format_error(parsed.error)
        )

    action = parsed.action

    try:
        # HELP / MENU
        if action == "HELP":
            return CommandResult(success=True, formatted_message=formatter.format_help())

        # STOCK CHECK
        elif action == "STOCK":
            product = inventory_db.get_product(parsed.item_code, db_path=db_path)
            if not product:
                return CommandResult(
                    success=False,
                    formatted_message=formatter.format_error(
                        f"Item ```{parsed.item_code}``` not found in catalog. Use `ADD {parsed.item_code} <NAME>` to register it."
                    )
                )
            return CommandResult(
                success=True,
                formatted_message=formatter.format_stock_check(product),
                data={"product": product.model_dump()}
            )

        # STOCK IN
        elif action == "IN":
            product, txn = inventory_db.stock_in(
                item_code=parsed.item_code,
                quantity=parsed.quantity,
                actor_phone=sender_phone,
                db_path=db_path
            )
            return CommandResult(
                success=True,
                formatted_message=formatter.format_stock_in(product, parsed.quantity, txn),
                data={"product": product.model_dump(), "transaction": txn.model_dump()}
            )

        # STOCK OUT
        elif action == "OUT":
            product, txn, is_low = inventory_db.stock_out(
                item_code=parsed.item_code,
                quantity=parsed.quantity,
                actor_phone=sender_phone,
                db_path=db_path
            )
            return CommandResult(
                success=True,
                formatted_message=formatter.format_stock_out(product, parsed.quantity, txn, is_low),
                data={"product": product.model_dump(), "transaction": txn.model_dump(), "is_low_stock": is_low}
            )

        # REPORT
        elif action == "REPORT":
            summary = inventory_db.get_daily_summary(db_path=db_path)
            return CommandResult(
                success=True,
                formatted_message=formatter.format_report(summary)
            )

        # LOW STOCK
        elif action == "LOWSTOCK":
            low_items = inventory_db.get_low_stock_products(db_path=db_path)
            return CommandResult(
                success=True,
                formatted_message=formatter.format_low_stock_list(low_items)
            )

        # CATALOG
        elif action == "CATALOG":
            products = inventory_db.list_products(db_path=db_path)
            return CommandResult(
                success=True,
                formatted_message=formatter.format_catalog(products)
            )

        # ADD NEW ITEM
        elif action == "ADD":
            name = parsed.params.get("item_name", "Unnamed Item")
            min_alert = parsed.params.get("min_alert", settings.DEFAULT_MIN_ALERT_QTY)
            prod = inventory_db.add_or_update_product(
                item_code=parsed.item_code,
                item_name=name,
                current_qty=parsed.quantity or 0,
                min_alert_qty=min_alert,
                db_path=db_path
            )
            return CommandResult(
                success=True,
                formatted_message=formatter.format_product_created(prod),
                data={"product": prod.model_dump()}
            )

        # ORDERS LIST
        elif action == "ORDERS":
            orders = orders_db.list_orders(limit=10, db_path=db_path)
            return CommandResult(
                success=True,
                formatted_message=formatter.format_order_list(orders)
            )

        # ORDER LOOKUP
        elif action == "ORDER_GET":
            order_id = parsed.params.get("order_id")
            order = orders_db.get_order(order_id, db_path=db_path)
            if not order:
                return CommandResult(
                    success=False,
                    formatted_message=formatter.format_error(f"Order ```{order_id}``` not found.")
                )
            return CommandResult(
                success=True,
                formatted_message=formatter.format_order_details(order),
                data={"order": order.model_dump()}
            )

        # QUICK ORDER CREATE
        elif action == "ORDER_CREATE":
            customer = parsed.params.get("customer_name", "Walk-in")
            order, warnings = orders_db.create_order(
                customer_name=customer,
                items=[{"item_code": parsed.item_code, "quantity": parsed.quantity}],
                actor_phone=sender_phone,
                deduct_stock=True,
                db_path=db_path
            )
            return CommandResult(
                success=True,
                formatted_message=formatter.format_order_created(order, warnings),
                data={"order": order.model_dump()}
            )

        # ORDER STATUS UPDATE
        elif action == "ORDER_STATUS":
            order_id = parsed.params.get("order_id")
            status = parsed.params.get("status")
            updated = orders_db.update_order_status(order_id, status, db_path=db_path)
            if not updated:
                return CommandResult(
                    success=False,
                    formatted_message=formatter.format_error(f"Order ```{order_id}``` not found.")
                )
            return CommandResult(
                success=True,
                formatted_message=(
                    f"🛒 *Order Status Updated*\n"
                    f"Order ID: ```{updated.order_id}```\n"
                    f"New Status: *{updated.status}*"
                )
            )

        else:
            return CommandResult(
                success=False,
                formatted_message=formatter.format_error("Command not recognized. Type *HELP* for instructions.")
            )

    except KeyError as e:
        return CommandResult(success=False, formatted_message=formatter.format_error(str(e)))
    except ValueError as e:
        return CommandResult(success=False, formatted_message=formatter.format_error(str(e)))
    except Exception as e:
        logger.error("Unexpected error in command handler: %s", e, exc_info=True)
        return CommandResult(
            success=False,
            formatted_message=formatter.format_error(f"Server error processing request: {str(e)}")
        )
