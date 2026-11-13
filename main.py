import csv
import io
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Request, Query, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import PlainTextResponse, JSONResponse, FileResponse
from pydantic import BaseModel

from config import settings
from database import init_db
import database.inventory as inventory_db
import database.orders as orders_db
import database.suppliers as suppliers_db
import database.procurement as procurement_db
import database.dispatch as dispatch_db
import database.staff as staff_db
from models import (
    Product, 
    InventoryTransaction, 
    Order, 
    OrderCreateRequest,
    Supplier, 
    SupplierCreateRequest,
    PurchaseOrder, 
    POCreateRequest, 
    POReceiveRequest,
    DeliveryChallan, 
    DCCreateRequest,
    StaffMember, 
    StaffCreateRequest, 
    StaffStatusRequest,
    StaffPinUpdateRequest,
    StaffDepartmentsUpdateRequest,
    StaffPermissionsUpdateRequest,
    VisibilityModeUpdateRequest,
    CompanyGateRequest,
    KhataSummary,
    LoginRequest,
    NotificationItem,
    QuickStockMovement,
    OrganizationProfile
)

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
    title="Blackbox ERP",
    description="Adaptive business operations and inventory management platform powered by FastAPI & SQLite.",
    version="3.0.0",
    lifespan=lifespan
)

# Enable CORS for web frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend production build if available
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")
    app.mount("/dashboard", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


# ==============================================================
# Health & Status Endpoints
# ==============================================================

@app.get("/", tags=["System"])
async def root():
    """Serve Blackbox ERP website or system status."""
    index_file = FRONTEND_DIST / "index.html"
    if FRONTEND_DIST.exists() and index_file.exists():
        return FileResponse(str(index_file))
    return {
        "app": "Blackbox ERP",
        "status": "online",
        "database": settings.DATABASE_PATH,
        "environment": settings.APP_ENV,
        "dashboard_url": "/dashboard",
        "docs_url": "/docs"
    }


@app.get("/api/health", tags=["System"])
async def health_check():
    """System health and operational status API."""
    return {
        "app": "Blackbox ERP",
        "status": "online",
        "database": settings.DATABASE_PATH,
        "environment": settings.APP_ENV,
        "private_secrets_active": len([f for f in settings.active_secrets_files if "secrets" in f]) > 0,
        "active_sources": settings.active_secrets_files,
        "dashboard_url": "/",
        "docs_url": "/docs"
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
    barcode: Optional[str] = ""
    supplier_id: Optional[str] = ""
    cost_price: float = 0.0
    selling_price: float = 0.0


class StockMovementRequest(BaseModel):
    item_code: str
    quantity: int
    actor_phone: str = "API_USER"


@app.get("/api/products", response_model=List[Product], tags=["Products"])
async def list_products(category: Optional[str] = None, supplier_id: Optional[str] = None):
    """Get all registered products."""
    return inventory_db.list_products(category=category, supplier_id=supplier_id)


@app.post("/api/products", response_model=Product, tags=["Products"])
async def add_or_update_product(req: ProductCreateUpdate):
    """Register or update a product."""
    return inventory_db.add_or_update_product(
        item_code=req.item_code,
        item_name=req.item_name,
        category=req.category,
        current_qty=req.current_qty,
        min_alert_qty=req.min_alert_qty,
        barcode=req.barcode,
        supplier_id=req.supplier_id,
        cost_price=req.cost_price,
        selling_price=req.selling_price
    )


@app.get("/api/products/{item_code}", response_model=Product, tags=["Products"])
async def get_product(item_code: str):
    """Get single product details by item code or barcode."""
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
async def list_transactions(limit: int = 50, item_code: Optional[str] = None):
    """Query the immutable audit ledger."""
    return inventory_db.get_recent_transactions(limit=limit, item_code=item_code)


@app.get("/api/report", tags=["Inventory Operations"])
async def get_report():
    """Get daily summary report."""
    return inventory_db.get_daily_summary()


# ==============================================================
# REST API: Suppliers Subsystem
# ==============================================================

@app.get("/api/suppliers", response_model=List[Supplier], tags=["Suppliers"])
async def list_suppliers_endpoint():
    """List all registered suppliers with order statistics."""
    return suppliers_db.list_suppliers()


@app.post("/api/suppliers", response_model=Supplier, tags=["Suppliers"])
async def add_supplier_endpoint(req: SupplierCreateRequest):
    """Register a new supplier."""
    try:
        return suppliers_db.add_or_update_supplier(
            name=req.name,
            contact_person=req.contact_person,
            phone=req.phone,
            email=req.email,
            address=req.address,
            payment_terms=req.payment_terms,
            notes=req.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/suppliers/{supplier_id}", response_model=Supplier, tags=["Suppliers"])
async def get_supplier_endpoint(supplier_id: str):
    """Get single supplier details."""
    sup = suppliers_db.get_supplier(supplier_id)
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return sup


@app.delete("/api/suppliers/{supplier_id}", tags=["Suppliers"])
async def delete_supplier_endpoint(supplier_id: str):
    """Delete a supplier if no active purchase orders exist."""
    try:
        success = suppliers_db.delete_supplier(supplier_id)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==============================================================
# REST API: Buy Stock / Procurement (Purchase Orders)
# ==============================================================

@app.get("/api/purchase-orders", response_model=List[PurchaseOrder], tags=["Procurement"])
async def list_purchase_orders_endpoint(status: Optional[str] = None, supplier_id: Optional[str] = None, limit: int = 50):
    """List purchase orders."""
    return procurement_db.list_purchase_orders(status=status, supplier_id=supplier_id, limit=limit)


@app.post("/api/purchase-orders", response_model=PurchaseOrder, tags=["Procurement"])
async def create_purchase_order_endpoint(req: POCreateRequest):
    """Create a new purchase order."""
    try:
        return procurement_db.create_purchase_order(
            supplier_id=req.supplier_id,
            items=req.items,
            expected_date=req.expected_date,
            notes=req.notes,
            status=req.status or "ORDERED"
        )
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/purchase-orders/{po_id}", response_model=PurchaseOrder, tags=["Procurement"])
async def get_purchase_order_endpoint(po_id: str):
    """Get purchase order details with line items."""
    po = procurement_db.get_purchase_order(po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@app.post("/api/purchase-orders/{po_id}/receive", tags=["Procurement"])
async def receive_po_goods_endpoint(po_id: str, req: POReceiveRequest):
    """Receive inward goods against a purchase order (increases warehouse stock)."""
    try:
        updated_po, msgs = procurement_db.receive_po_goods(
            po_id=po_id,
            received_items=req.items,
            actor_phone=req.actor
        )
        return {"purchase_order": updated_po, "messages": msgs}
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))


class StatusUpdateRequest(BaseModel):
    status: str


@app.post("/api/purchase-orders/{po_id}/status", response_model=PurchaseOrder, tags=["Procurement"])
async def update_po_status_endpoint(po_id: str, req: StatusUpdateRequest):
    """Update PO status."""
    try:
        return procurement_db.update_po_status(po_id, req.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==============================================================
# REST API: Dispatch / Sales (Delivery Challans)
# ==============================================================

@app.get("/api/delivery-challans", response_model=List[DeliveryChallan], tags=["Dispatch & Sales"])
async def list_delivery_challans_endpoint(status: Optional[str] = None, limit: int = 50):
    """List delivery challans."""
    return dispatch_db.list_delivery_challans(status=status, limit=limit)


@app.post("/api/delivery-challans", tags=["Dispatch & Sales"])
async def create_delivery_challan_endpoint(req: DCCreateRequest):
    """Create a new delivery challan."""
    try:
        dc, warnings = dispatch_db.create_delivery_challan(
            customer_name=req.customer_name,
            customer_phone=req.customer_phone,
            delivery_address=req.delivery_address,
            status=req.status or "READY",
            notes=req.notes,
            items=req.items
        )
        return {"delivery_challan": dc, "warnings": warnings}
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/delivery-challans/{dc_id}", response_model=DeliveryChallan, tags=["Dispatch & Sales"])
async def get_delivery_challan_endpoint(dc_id: str):
    """Get delivery challan details with line items."""
    dc = dispatch_db.get_delivery_challan(dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    return dc


class DispatchActionRequest(BaseModel):
    actor_phone: str = "Owner"


@app.post("/api/delivery-challans/{dc_id}/dispatch", tags=["Dispatch & Sales"])
async def dispatch_delivery_challan_endpoint(dc_id: str, req: DispatchActionRequest):
    """Mark delivery challan as DISPATCHED (deducts stock and records audit log)."""
    try:
        dc, msgs = dispatch_db.dispatch_delivery_challan(dc_id, actor_phone=req.actor_phone)
        return {"delivery_challan": dc, "messages": msgs}
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/delivery-challans/{dc_id}/status", response_model=DeliveryChallan, tags=["Dispatch & Sales"])
async def update_dc_status_endpoint(dc_id: str, req: StatusUpdateRequest):
    """Update delivery challan status (e.g. DELIVERED, CANCELLED)."""
    try:
        return dispatch_db.update_dc_status(dc_id, req.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==============================================================
# REST API: Staff Management & Roles
# ==============================================================

@app.get("/api/staff", response_model=List[StaffMember], tags=["Staff Management"])
async def list_staff_endpoint(status: Optional[str] = None):
    """List staff directory with activity transaction counts."""
    return staff_db.list_staff(status=status)


@app.post("/api/staff", response_model=StaffMember, tags=["Staff Management"])
async def add_staff_endpoint(req: StaffCreateRequest):
    """Add or register a staff member with role, PIN, departments, and permissions."""
    return staff_db.add_or_update_staff(
        name=req.name,
        phone=req.phone,
        role=req.role or "STAFF",
        pin=req.pin or "1234",
        departments=req.departments or "godown,dispatch",
        role_level=req.role_level or "WORKER",
        hide_financials=req.hide_financials or False,
        status=req.status or "ACTIVE"
    )


@app.post("/api/staff/{staff_id}/status", response_model=Optional[StaffMember], tags=["Staff Management"])
async def update_staff_status_endpoint(staff_id: str, req: StaffStatusRequest):
    """Approve, suspend, or reject a staff member."""
    try:
        return staff_db.update_staff_status(staff_id, req.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/staff/{staff_id}/pin", response_model=Optional[StaffMember], tags=["Staff Management"])
async def update_staff_pin_endpoint(staff_id: int, req: StaffPinUpdateRequest):
    """Update a staff member's access PIN."""
    try:
        return staff_db.update_staff_pin(staff_id, req.pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/staff/{staff_id}/departments", response_model=Optional[StaffMember], tags=["Staff Management"])
async def update_staff_departments_endpoint(staff_id: str, req: StaffDepartmentsUpdateRequest):
    """Owner taps department pills (Procurement, Godown, Dispatch, Khata) to grant/revoke access."""
    return staff_db.update_staff_departments(staff_id, req.departments)


@app.post("/api/staff/{staff_id}/permissions", response_model=Optional[StaffMember], tags=["Staff Management"])
async def update_staff_permissions_endpoint(staff_id: int, req: StaffPermissionsUpdateRequest):
    """Department Manager sets role level (Manager vs Worker) and hide_financials flag."""
    return staff_db.update_staff_permissions(
        staff_id=staff_id,
        role_level=req.role_level,
        hide_financials=req.hide_financials,
        departments=req.departments
    )


# ==============================================================
# REST API: Owner Visibility Engine & Settings
# ==============================================================

@app.get("/api/settings/visibility", tags=["Settings & Visibility"])
async def get_visibility_settings():
    """Get Blackbox Visibility Engine settings (Open Blackbox Mode vs Restricted)."""
    return staff_db.get_system_settings()


@app.post("/api/settings/visibility", tags=["Settings & Visibility"])
async def update_visibility_settings(req: VisibilityModeUpdateRequest):
    """Owner toggles Open Blackbox Mode (everyone sees everything vs restricted access)."""
    val = "1" if req.open_blackbox_mode else "0"
    staff_db.set_system_setting("open_blackbox_mode", val)
    return staff_db.get_system_settings()


# ==============================================================
# REST API: Organization Profile & Settings
# ==============================================================

@app.get("/api/organization", tags=["Organization"])
async def get_organization_endpoint():
    """Retrieve official business organization profile and tax/banking details."""
    return staff_db.get_organization_profile()


@app.put("/api/organization", tags=["Organization"])
async def update_organization_endpoint(profile: OrganizationProfile):
    """Update official business organization profile and tax/banking details."""
    updated = staff_db.update_organization_profile(profile.model_dump())
    return updated


# ==============================================================
# REST API: 2-Step Login & Authentication Gate
# ==============================================================

@app.post("/api/auth/company-gate", tags=["Authentication"])
async def company_gate_endpoint(req: CompanyGateRequest):
    """Step 1 login gate: Validate company code."""
    code = req.company_code.strip().upper()
    org = staff_db.get_organization_profile()
    configured_code = org.get("company_code", "BLACKBOX-TRADING").upper()
    
    if code in (configured_code, "BLACKBOX", "BLACKBOX-TRADING", "XYZ-TRADING", "APEX", "APEX-TRADING"):
        c_name = org.get("company_name", "Blackbox Tech Trading") if code == configured_code else ("XYZ Imports & Logistics" if code == "XYZ-TRADING" else "Apex Trading Co.")
        return {
            "valid": True,
            "company_code": code,
            "company_name": c_name,
            "open_blackbox_mode": staff_db.get_system_settings().get("open_blackbox_mode", True)
        }
    raise HTTPException(status_code=400, detail=f"Invalid company code '{code}'. Try '{configured_code}' or 'BLACKBOX-TRADING'.")



@app.post("/api/auth/login", tags=["Authentication"])
async def login_endpoint(req: LoginRequest):
    """Step 2: Authenticate Admin or Staff using PIN."""
    identifier = req.identifier.strip().lower()
    pin = req.pin.strip()
    
    # Admin Master Login: identifier='admin' or role='admin', pin in ('admin123', '1234', '0000')
    if req.role == "admin" or identifier in ("admin", "owner", "apex", "blackbox"):
        if pin in ("admin123", "1234", "0000"):
            return {
                "success": True,
                "role": "admin",
                "user": {
                    "name": "Business Owner", 
                    "role": "ADMIN", 
                    "phone": "Primary",
                    "departments": "procurement,godown,dispatch,khata",
                    "role_level": "MANAGER",
                    "hide_financials": False
                }
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid Admin PIN. (Default: 1234 or admin123)")

    # Staff Member Login via database
    staff_member = staff_db.authenticate_staff(req.identifier, pin)
    if staff_member:
        return {
            "success": True,
            "role": "staff",
            "user": staff_member.model_dump()
        }

    # Match existing staff by phone or name and check PIN
    staff_list = staff_db.list_staff(status="ACTIVE")
    matched = next((s for s in staff_list if s.phone == req.identifier or s.name.lower() == identifier), None)
    if matched and pin in ("1234", matched.pin):
        return {
            "success": True,
            "role": "staff",
            "user": matched.model_dump()
        }

    raise HTTPException(status_code=401, detail="Invalid PIN or unauthorized staff account.")


# ==============================================================
# REST API: Department 4: Khata & Payments Summary
# ==============================================================

@app.get("/api/khata/summary", response_model=KhataSummary, tags=["Finance & Khata"])
async def get_khata_summary():
    """Department 4 (Khata / Payments): Cash in, cash out, godown value, receivables, payables."""
    products = inventory_db.list_products()
    godown_value = sum(p.current_qty * p.cost_price for p in products)

    dcs = dispatch_db.list_delivery_challans(limit=100)
    pos = procurement_db.list_purchase_orders(limit=100)

    # Cash In: Dispatched / Delivered DCs
    today_in = sum(dc.total_amount for dc in dcs if dc.status in ("DISPATCHED", "DELIVERED"))
    # Cash Out: Received POs
    today_out = sum(po.total_amount for po in pos if po.status == "FULLY_RECEIVED")

    # Receivables: Ready or Draft DCs awaiting customer payment/dispatch
    receivables = sum(dc.total_amount for dc in dcs if dc.status in ("READY", "DRAFT"))
    # Payables: Open POs awaiting payment/completion
    payables = sum(po.total_amount for po in pos if po.status in ("ORDERED", "DRAFT"))

    net_cashflow = today_in - today_out
    total_margin = sum(dc.total_margin for dc in dcs if dc.status in ("DISPATCHED", "DELIVERED"))

    return KhataSummary(
        today_cash_in=today_in,
        cash_in_today=today_in,
        today_cash_out=today_out,
        cash_out_today=today_out,
        total_godown_value=godown_value,
        godown_value=godown_value,
        total_receivables=receivables,
        total_payables=payables,
        net_cashflow=net_cashflow,
        gross_margin=total_margin,
        pending_pos_count=len([p for p in pos if p.status == "ORDERED"]),
        ready_dcs_count=len([d for d in dcs if d.status == "READY"])
    )


# ==============================================================
# REST API: Operational Notifications Center
# ==============================================================

@app.get("/api/notifications", response_model=List[NotificationItem], tags=["Notifications"])
async def get_notifications():
    """Aggregate live operational notifications for the top header bell drawer."""
    notifs = []
    
    # 1. Low stock alerts
    products = inventory_db.list_products()
    low_stock = [p for p in products if p.is_low_stock]
    for p in low_stock:
        notifs.append(NotificationItem(
            id=f"low-{p.item_code}",
            type="LOW_STOCK",
            title=f"Low Stock: {p.item_name}",
            message=f"Only {p.current_qty} units left (threshold: {p.min_alert_qty}). Replenishment required.",
            timestamp="Live Alert",
            severity="danger" if p.current_qty == 0 else "warning",
            link_tab="warehouse"
        ))

    # 2. Open Purchase Orders awaiting inward goods
    pos = procurement_db.list_purchase_orders(status="ORDERED")
    for po in pos[:5]:
        notifs.append(NotificationItem(
            id=f"po-{po.po_id}",
            type="PO_ARRIVAL",
            title=f"Awaiting PO Inward: {po.po_id}",
            message=f"{po.supplier_name or 'Supplier'} - {len(po.items)} line items pending inward check-in.",
            timestamp=po.expected_date or "Pending Arrival",
            severity="info",
            link_tab="buy-stock"
        ))

    # 3. Delivery Challans ready for dispatch
    dcs = dispatch_db.list_delivery_challans(status="READY")
    for dc in dcs[:5]:
        notifs.append(NotificationItem(
            id=f"dc-{dc.dc_id}",
            type="DC_READY",
            title=f"Ready for Dispatch: {dc.dc_id}",
            message=f"Customer: {dc.customer_name} ({len(dc.items)} items). Ready to pack and ship.",
            timestamp="Ready Now",
            severity="info",
            link_tab="dispatch"
        ))

    return notifs


# ==============================================================
# REST API: Barcode Scanner & Fast Action Terminal
# ==============================================================

@app.get("/api/inventory/scan/{query}", tags=["Barcode Terminal"])
async def scan_lookup(query: str):
    """Lookup product details by barcode or item_code for fast terminal actions."""
    clean_q = query.strip()
    prod = inventory_db.get_product(clean_q)
    if not prod:
        raise HTTPException(status_code=404, detail=f"No SKU found matching barcode/code '{clean_q}'.")
    
    txns = inventory_db.get_recent_transactions(item_code=prod.item_code, limit=5)
    return {"product": prod, "recent_transactions": txns}


@app.post("/api/inventory/quick-move", tags=["Barcode Terminal"])
async def quick_stock_move(req: QuickStockMovement):
    """Instant stock movement triggered by barcode scanner terminal."""
    prod = inventory_db.get_product(req.query.strip())
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    direction = req.direction.upper().strip()
    if direction == "IN":
        p, txn = inventory_db.stock_in(
            item_code=prod.item_code,
            quantity=req.quantity,
            actor_phone=f"Terminal: {req.actor}"
        )
        return {"success": True, "product": p, "transaction": txn, "type": "IN"}
    elif direction == "OUT":
        try:
            p, txn, is_low = inventory_db.stock_out(
                item_code=prod.item_code,
                quantity=req.quantity,
                actor_phone=f"Terminal: {req.actor}"
            )
            return {"success": True, "product": p, "transaction": txn, "is_low_stock": is_low, "type": "OUT"}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail=f"Invalid direction '{direction}'. Use 'IN' or 'OUT'.")


# ==============================================================
# REST API: CSV Reports Export
# ==============================================================

@app.get("/api/reports/inventory-csv", tags=["Reports"])
async def export_inventory_csv():
    """Export complete current warehouse inventory to CSV."""
    products = inventory_db.list_products()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Item Code", "Product Name", "Category", "Barcode", 
        "Current Stock", "Min Alert Qty", "Cost Price (INR)", 
        "Selling Price (INR)", "Margin %", "Total Valuation (INR)", "Status"
    ])
    
    for p in products:
        status_str = "OUT OF STOCK" if p.current_qty == 0 else ("LOW STOCK" if p.is_low_stock else "IN STOCK")
        total_val = round(p.current_qty * p.cost_price, 2)
        writer.writerow([
            p.item_code, p.item_name, p.category, p.barcode,
            p.current_qty, p.min_alert_qty, p.cost_price,
            p.selling_price, f"{p.margin_pct}%", total_val, status_str
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=apex_inventory_export.csv"}
    )


@app.get("/api/reports/transactions-csv", tags=["Reports"])
async def export_transactions_csv(limit: int = 200):
    """Export recent inventory transaction audit ledger to CSV."""
    txns = inventory_db.get_recent_transactions(limit=limit)
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Txn ID", "Timestamp", "Item Code", "Type", 
        "Quantity", "Resulting Qty", "Actor / Document Reference"
    ])
    
    for t in txns:
        writer.writerow([
            t.txn_id, t.timestamp, t.item_code, t.txn_type,
            t.quantity, t.resulting_qty, t.actor_phone
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=apex_audit_ledger.csv"}
    )


# ==============================================================
# REST API: Customer Orders Subsystem (Legacy / Web Orders)
# ==============================================================

@app.get("/api/orders", response_model=List[Order], tags=["Orders Subsystem"])
async def get_orders(status: Optional[str] = None, limit: int = 20):
    """List recent orders with optional status filter."""
    return orders_db.list_orders(status=status, limit=limit)


@app.post("/api/orders", tags=["Orders Subsystem"])
async def create_new_order(req: OrderCreateRequest):
    """Create a new customer order."""
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


@app.post("/api/orders/{order_id}/status", response_model=Order, tags=["Orders Subsystem"])
async def update_order_status_endpoint(order_id: str, req: StatusUpdateRequest):
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
