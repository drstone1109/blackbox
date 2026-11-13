"""
Seed realistic electronics trading data:
Laptops, Tablets, High-Value Peripherals, Suppliers, Purchase Orders, Delivery Challans, and Staff.
"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from database.connection import init_db
import database.inventory as inventory_db
import database.suppliers as suppliers_db
import database.procurement as procurement_db
import database.dispatch as dispatch_db
import database.staff as staff_db


def seed():
    print("Initializing SQLite tables...")
    init_db()

    # 1. Suppliers
    print("Seeding Suppliers...")
    suppliers_db.add_or_update_supplier(
        name="Apple India Authorized Wholesaler",
        contact_person="Vikram Malhotra",
        phone="+919811223344",
        email="orders@apple-wholesale.in",
        address="Bandra Kurla Complex, Mumbai, Maharashtra 400051",
        payment_terms="Net 15",
        notes="Primary distributor for MacBooks and iPads",
        supplier_id="SUP-APPLE"
    )

    suppliers_db.add_or_update_supplier(
        name="Lenovo Commercial Direct",
        contact_person="Ananya Rao",
        phone="+919822334455",
        email="enterprise@lenovosupply.in",
        address="Electronic City Phase 1, Bengaluru, Karnataka 560100",
        payment_terms="Net 30",
        notes="ThinkPad and IdeaPad enterprise supplier",
        supplier_id="SUP-LENOVO"
    )

    suppliers_db.add_or_update_supplier(
        name="Samsung B2B Electronics Corp",
        contact_person="Rajesh Sharma",
        phone="+919833445566",
        email="distrib@samsung-b2b.in",
        address="DLF Cyber City, Gurugram, Haryana 122002",
        payment_terms="Advance 50%",
        notes="Galaxy Tab S9 series distributor",
        supplier_id="SUP-SAMSUNG"
    )

    # 2. High-Value Electronics Products
    print("Seeding High-Value Products...")
    sample_products = [
        {
            "item_code": "MAC-M3-14",
            "item_name": "Apple MacBook Pro 14\" (M3, 16GB, 512GB)",
            "category": "Laptops",
            "current_qty": 18,
            "min_alert_qty": 5,
            "barcode": "194253782910",
            "supplier_id": "SUP-APPLE",
            "cost_price": 142000.0,
            "selling_price": 169900.0
        },
        {
            "item_code": "IPAD-AIR-M2",
            "item_name": "Apple iPad Air 11\" M2 (Wi-Fi, 128GB)",
            "category": "Tablets",
            "current_qty": 24,
            "min_alert_qty": 8,
            "barcode": "194253891024",
            "supplier_id": "SUP-APPLE",
            "cost_price": 51000.0,
            "selling_price": 59900.0
        },
        {
            "item_code": "THINK-X1-GEN11",
            "item_name": "Lenovo ThinkPad X1 Carbon Gen 11 (i7, 32GB, 1TB)",
            "category": "Laptops",
            "current_qty": 12,
            "min_alert_qty": 4,
            "barcode": "195892301923",
            "supplier_id": "SUP-LENOVO",
            "cost_price": 138000.0,
            "selling_price": 165000.0
        },
        {
            "item_code": "SAM-TAB-S9",
            "item_name": "Samsung Galaxy Tab S9 Ultra (12GB, 256GB with S-Pen)",
            "category": "Tablets",
            "current_qty": 3,
            "min_alert_qty": 5,
            "barcode": "880609458291",
            "supplier_id": "SUP-SAMSUNG",
            "cost_price": 89000.0,
            "selling_price": 108999.0
        },
        {
            "item_code": "DELL-XPS-15",
            "item_name": "Dell XPS 15 9530 (i9 13th Gen, RTX 4060, 32GB)",
            "category": "Laptops",
            "current_qty": 7,
            "min_alert_qty": 3,
            "barcode": "884116410291",
            "supplier_id": "SUP-LENOVO",
            "cost_price": 178000.0,
            "selling_price": 215000.0
        },
        {
            "item_code": "APL-PCL-USB",
            "item_name": "Apple Pencil Pro",
            "category": "Accessories",
            "current_qty": 35,
            "min_alert_qty": 10,
            "barcode": "194253991201",
            "supplier_id": "SUP-APPLE",
            "cost_price": 9500.0,
            "selling_price": 11900.0
        }
    ]

    for p in sample_products:
        prod = inventory_db.add_or_update_product(**p)
        print(f" -> Product: {prod.item_code} | {prod.item_name} | Margin: {prod.margin_pct}%")

    # 3. Staff Members
    print("Seeding Staff Members...")
    staff_db.add_or_update_staff(
        name="Rahul Verma (Store Manager)",
        phone="+919876543210",
        role="ADMIN",
        pin="1234",
        status="ACTIVE",
        added_by="Owner"
    )
    staff_db.add_or_update_staff(
        name="Priya Nair (Dispatch Lead)",
        phone="+919876543211",
        role="WAREHOUSE",
        pin="1234",
        status="ACTIVE",
        added_by="Owner"
    )
    staff_db.add_or_update_staff(
        name="Amit Patel (Associate)",
        phone="+919876543212",
        role="STAFF",
        pin="1234",
        status="PENDING",
        added_by="System"
    )

    # 4. Purchase Order (Procurement)
    print("Seeding Purchase Orders...")
    try:
        po = procurement_db.get_purchase_order("PO-20261104-APP1")
        if not po:
            po = procurement_db.create_purchase_order(
                supplier_id="SUP-APPLE",
                items=[
                    {"item_code": "MAC-M3-14", "qty_ordered": 5, "cost_price": 142000.0},
                    {"item_code": "IPAD-AIR-M2", "qty_ordered": 10, "cost_price": 51000.0}
                ],
                expected_date="2026-11-10",
                notes="High-demand festive stock inward shipment",
                status="ORDERED",
                po_id="PO-20261104-APP1"
            )
        print(f" -> PO ready: {po.po_id} for Rs.{po.total_amount:,.2f}")
    except Exception as e:
        print(f" -> PO seeding note: {e}")

    # 5. Delivery Challan (Sales / Dispatch)
    print("Seeding Delivery Challans...")
    try:
        dc = dispatch_db.get_delivery_challan("DC-20261104-INF1")
        if not dc:
            dc, warnings = dispatch_db.create_delivery_challan(
                customer_name="Infosys BPO Solutions Pvt Ltd",
                customer_phone="+919899001122",
                delivery_address="Plot 44, Electronic City, Bengaluru",
                status="READY",
                notes="Commercial supply invoice #INV-8821. Gate pass required.",
                items=[
                    {"item_code": "MAC-M3-14", "quantity": 2, "selling_price": 169900.0},
                    {"item_code": "THINK-X1-GEN11", "quantity": 1, "selling_price": 165000.0}
                ],
                dc_id="DC-20261104-INF1"
            )
        print(f" -> Challan ready: {dc.dc_id} for Rs.{dc.total_amount:,.2f}")
    except Exception as e:
        print(f" -> Challan seeding note: {e}")

    print("\n[SUCCESS] Seeding complete! Database successfully loaded with high-value laptops/tablets.")


if __name__ == "__main__":
    seed()
