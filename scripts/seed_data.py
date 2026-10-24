"""
Seed initial sample inventory items to match scenarios described in:
- 1_product_requirements_document_prd.md
- 3_application_flow_state_machine.md
- 4_ui_ux_design_scheme.md
"""
import sys
from pathlib import Path

# Ensure root directory is on python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from database.connection import init_db
import database.inventory as inventory_db


def seed():
    print("Initializing database...")
    init_db()

    sample_products = [
        {
            "item_code": "101",
            "item_name": "White Shirt (L)",
            "category": "Apparel",
            "current_qty": 45,
            "min_alert_qty": 10
        },
        {
            "item_code": "505",
            "item_name": "Wireless Mouse",
            "category": "Electronics",
            "current_qty": 24,
            "min_alert_qty": 5
        },
        {
            "item_code": "HDMI_2M",
            "item_name": "HDMI Cable (2 Meter)",
            "category": "Electronics",
            "current_qty": 12,
            "min_alert_qty": 5
        },
        {
            "item_code": "USBC_HUB",
            "item_name": "USB-C Hub (7-in-1)",
            "category": "Electronics",
            "current_qty": 3,
            "min_alert_qty": 5
        },
        {
            "item_code": "SHIRT_M",
            "item_name": "Blue Casual Shirt (M)",
            "category": "Apparel",
            "current_qty": 30,
            "min_alert_qty": 8
        }
    ]

    print("Seeding sample items into SQLite...")
    for p in sample_products:
        prod = inventory_db.add_or_update_product(
            item_code=p["item_code"],
            item_name=p["item_name"],
            category=p["category"],
            current_qty=p["current_qty"],
            min_alert_qty=p["min_alert_qty"]
        )
        print(f"  [OK] [{prod.item_code}] {prod.item_name} -> Stock: {prod.current_qty}")

    print("\nInitial seeding completed successfully!")


if __name__ == "__main__":
    seed()
