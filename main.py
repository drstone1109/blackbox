import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Request, Query, HTTPException, Response, status
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel

from config import settings
from database import init_db
import database.inventory as inventory_db
import database.orders as orders_db
from models import Product, InventoryTransaction, Order, OrderCreateRequest
import services.whatsapp as whatsapp_service
import services.handler as command_handler

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("erp_app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initializes SQLite database tables on startup."""
    logger.info("Initializing SQLite database at: %s", settings.DATABASE_PATH)
    init_db()
    logger.info("Database schema verified.")
    yield
    logger.info("Shutting down application.")


app = FastAPI(
    title="General WhatsApp Inventory ERP",
    description="A frictionless, chat-based inventory and orders management system powered by FastAPI & SQLite.",
    version="1.0.0",
    lifespan=lifespan
)


# ==============================================================
# Health & Status Endpoints
# ==============================================================

@app.get("/", tags=["System"])
async def root():
    """System health and operational status."""
    return {
        "app": "General WhatsApp Inventory ERP (Level 0)",
        "status": "online",
        "database": settings.DATABASE_PATH,
        "environment": settings.APP_ENV,
        "meta_live_configured": settings.is_live_meta_configured,
        "private_secrets_active": len([f for f in settings.active_secrets_files if "secrets" in f]) > 0,
        "active_sources": settings.active_secrets_files,
        "docs_url": "/docs"
    }


# ==============================================================
# Meta WhatsApp Cloud API Webhook Endpoints
# ==============================================================

@app.get("/webhook", tags=["Webhook"])
async def verify_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Verification challenge handshake for Meta WhatsApp Cloud API Webhook.
    Meta makes a GET request to verify token and expects plain text challenge returned.
    """
    logger.info("Webhook verification request: mode=%s, token=%s", hub_mode, hub_verify_token)
    if hub_mode == "subscribe" and hub_verify_token == settings.VERIFY_TOKEN:
        logger.info("Webhook verification SUCCESSFUL.")
        return PlainTextResponse(content=hub_challenge, status_code=status.HTTP_200_OK)

    logger.warning("Webhook verification FAILED. Expected token: %s", settings.VERIFY_TOKEN)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


@app.post("/webhook", tags=["Webhook"])
async def handle_webhook(request: Request):
    """
    Receives incoming WhatsApp event payloads forwarded from Meta (or Cloudflare tunnel).
    Parses incoming messages, executes ERP commands, and replies back via WhatsApp.
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.error("Failed to parse JSON body: %s", e)
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    # Extract message information
    msg_info = whatsapp_service.extract_message_info(payload)
    if not msg_info or not msg_info.get("message_text"):
        # Could be status update, read receipt, or empty message
        return {"status": "ok", "action": "ignored_non_message_payload"}

    sender_phone = msg_info["sender_phone"]
    message_text = msg_info["message_text"]

    logger.info("Received WhatsApp command from [%s]: %s", sender_phone, message_text)

    # Process command through ERP handler
    result = command_handler.handle_user_command(
        message_text=message_text,
        sender_phone=sender_phone
    )

    # Dispatch reply back to the user on WhatsApp
    send_response = whatsapp_service.send_whatsapp_message(
        to_phone=sender_phone,
        text=result.formatted_message
    )

    return {
        "status": "success",
        "sender": sender_phone,
        "command": message_text,
        "reply": result.formatted_message,
        "whatsapp_send_status": send_response.get("status")
    }


# ==============================================================
# Simulation / Interactive Test API
# ==============================================================

class SimulateMessageRequest(BaseModel):
    sender_phone: str = "+1234567890"
    message_text: str = "STOCK 101"


@app.post("/api/simulate-message", tags=["Simulator"])
async def simulate_message(req: SimulateMessageRequest):
    """
    Simulate sending a WhatsApp command to the bot directly from Swagger UI or curl.
    Returns the bot's formatted reply and raw execution data.
    """
    result = command_handler.handle_user_command(
        message_text=req.message_text,
        sender_phone=req.sender_phone
    )
    return {
        "success": result.success,
        "input_message": req.message_text,
        "sender_phone": req.sender_phone,
        "formatted_reply": result.formatted_message,
        "data": result.data
    }


# ==============================================================
# REST API: Products & Inventory
# ==============================================================

class ProductCreateUpdate(BaseModel):
    item_code: str
    item_name: str
    category: Optional[str] = "General"
    current_qty: int = 0
    min_alert_qty: int = 5


class StockMovementRequest(BaseModel):
    item_code: str
    quantity: int
    actor_phone: str = "API_USER"


@app.get("/api/products", response_model=List[Product], tags=["Products"])
async def list_products(category: Optional[str] = None):
    """Get all registered products."""
    return inventory_db.list_products(category=category)


@app.post("/api/products", response_model=Product, tags=["Products"])
async def add_or_update_product(req: ProductCreateUpdate):
    """Register or update a product."""
    return inventory_db.add_or_update_product(
        item_code=req.item_code,
        item_name=req.item_name,
        category=req.category,
        current_qty=req.current_qty,
        min_alert_qty=req.min_alert_qty
    )


@app.get("/api/products/{item_code}", response_model=Product, tags=["Products"])
async def get_product(item_code: str):
    """Get single product details."""
    prod = inventory_db.get_product(item_code)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod


@app.post("/api/inventory/stock-in", tags=["Inventory Operations"])
async def stock_in_endpoint(req: StockMovementRequest):
    """Add stock (Procurement)."""
    try:
        product, txn = inventory_db.stock_in(
            item_code=req.item_code,
            quantity=req.quantity,
            actor_phone=req.actor_phone
        )
        return {"product": product, "transaction": txn}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/inventory/stock-out", tags=["Inventory Operations"])
async def stock_out_endpoint(req: StockMovementRequest):
    """Deduct stock (Sales / Dispatch)."""
    try:
        product, txn, is_low = inventory_db.stock_out(
            item_code=req.item_code,
            quantity=req.quantity,
            actor_phone=req.actor_phone
        )
        return {"product": product, "transaction": txn, "is_low_stock": is_low}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/inventory/transactions", response_model=List[InventoryTransaction], tags=["Inventory Operations"])
async def list_transactions(limit: int = 20, item_code: Optional[str] = None):
    """Query the immutable audit ledger."""
    return inventory_db.get_recent_transactions(limit=limit, item_code=item_code)


@app.get("/api/report", tags=["Inventory Operations"])
async def get_report():
    """Get daily summary report."""
    return inventory_db.get_daily_summary()


# ==============================================================
# REST API: Orders Subsystem
# ==============================================================

@app.get("/api/orders", response_model=List[Order], tags=["Orders Subsystem"])
async def get_orders(status: Optional[str] = None, limit: int = 20):
    """List recent orders with optional status filter."""
    return orders_db.list_orders(status=status, limit=limit)


@app.post("/api/orders", tags=["Orders Subsystem"])
async def create_new_order(req: OrderCreateRequest):
    """Create a new customer order and optionally deduct inventory."""
    try:
        order, warnings = orders_db.create_order(
            customer_name=req.customer_name,
            customer_phone=req.customer_phone,
            items=req.items,
            notes=req.notes,
            deduct_stock=req.deduct_stock_now,
            actor_phone="API"
        )
        return {"order": order, "warnings": warnings}
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/orders/{order_id}", response_model=Order, tags=["Orders Subsystem"])
async def get_single_order(order_id: str):
    """Get order details by Order ID."""
    order = orders_db.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


class UpdateStatusRequest(BaseModel):
    status: str


@app.post("/api/orders/{order_id}/status", response_model=Order, tags=["Orders Subsystem"])
async def update_order_status_endpoint(order_id: str, req: UpdateStatusRequest):
    """Update order status."""
    try:
        order = orders_db.update_order_status(order_id, req.status)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
