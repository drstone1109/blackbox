import os
import sys
import unittest
from pathlib import Path

# Ensure root directory is on python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient

from config.settings import settings, BASE_DIR
from database.connection import init_db, get_db_connection
import database.inventory as inventory_db
import database.orders as orders_db
from services.parser import parse_message
import services.formatter as formatter
from services.handler import handle_user_command
from main import app

TEST_DB = str(BASE_DIR / "test_inventory.db")


class TestWhatsAppERP(unittest.TestCase):
    """Test suite for WhatsApp Inventory ERP system."""

    def setUp(self):
        """Prepare fresh database before each test."""
        if os.path.exists(TEST_DB):
            try:
                os.remove(TEST_DB)
            except PermissionError:
                pass
        init_db(TEST_DB)

    def tearDown(self):
        """Clean up database after each test."""
        if os.path.exists(TEST_DB):
            try:
                os.remove(TEST_DB)
            except PermissionError:
                pass

    def test_product_crud(self):
        """Test product creation, retrieval, and updates."""
        prod = inventory_db.add_or_update_product(
            item_code="101",
            item_name="White Shirt (L)",
            category="Apparel",
            current_qty=45,
            min_alert_qty=10,
            db_path=TEST_DB
        )
        self.assertEqual(prod.item_code, "101")
        self.assertEqual(prod.item_name, "White Shirt (L)")
        self.assertEqual(prod.current_qty, 45)
        self.assertFalse(prod.is_low_stock)

        fetched = inventory_db.get_product("101", db_path=TEST_DB)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.item_name, "White Shirt (L)")

    def test_stock_in_and_audit_trail(self):
        """Test adding inventory and verifying immutable audit ledger."""
        inventory_db.add_or_update_product(
            item_code="101",
            item_name="White Shirt (L)",
            current_qty=45,
            min_alert_qty=10,
            db_path=TEST_DB
        )

        prod, txn = inventory_db.stock_in(
            item_code="101",
            quantity=20,
            actor_phone="+1234567890",
            db_path=TEST_DB
        )
        self.assertEqual(prod.current_qty, 65)
        self.assertEqual(txn.txn_type, "IN")
        self.assertEqual(txn.quantity, 20)
        self.assertEqual(txn.resulting_qty, 65)
        self.assertEqual(txn.actor_phone, "+1234567890")

        txns = inventory_db.get_recent_transactions(db_path=TEST_DB)
        self.assertEqual(len(txns), 1)
        self.assertEqual(txns[0].resulting_qty, 65)

    def test_stock_out_and_low_stock_alert(self):
        """Test deducting inventory and triggering low-stock alert."""
        inventory_db.add_or_update_product(
            item_code="505",
            item_name="Wireless Mouse",
            current_qty=10,
            min_alert_qty=5,
            db_path=TEST_DB
        )

        prod, txn, is_low = inventory_db.stock_out(
            item_code="505",
            quantity=6,
            actor_phone="+1234567890",
            db_path=TEST_DB
        )
        self.assertEqual(prod.current_qty, 4)
        self.assertEqual(txn.txn_type, "OUT")
        self.assertTrue(is_low)

        with self.assertRaises(ValueError) as ctx:
            inventory_db.stock_out(
                item_code="505",
                quantity=10,
                actor_phone="+1234567890",
                db_path=TEST_DB
            )
        self.assertIn("Insufficient stock", str(ctx.exception))

    def test_orders_database_flow(self):
        """Test orders database creation, item linking, stock deduction, and status updates."""
        inventory_db.add_or_update_product("101", "White Shirt (L)", current_qty=50, db_path=TEST_DB)
        inventory_db.add_or_update_product("505", "Wireless Mouse", current_qty=20, db_path=TEST_DB)

        items = [
            {"item_code": "101", "quantity": 2, "unit_price": 25.0},
            {"item_code": "505", "quantity": 1, "unit_price": 15.0}
        ]

        order, warnings = orders_db.create_order(
            customer_name="Alice Smith",
            customer_phone="+9876543210",
            items=items,
            deduct_stock=True,
            actor_phone="+1234567890",
            db_path=TEST_DB
        )

        self.assertTrue(order.order_id.startswith("ORD-"))
        self.assertEqual(order.customer_name, "Alice Smith")
        self.assertEqual(order.total_amount, 65.0)
        self.assertEqual(len(order.items), 2)

        prod101 = inventory_db.get_product("101", db_path=TEST_DB)
        prod505 = inventory_db.get_product("505", db_path=TEST_DB)
        self.assertEqual(prod101.current_qty, 48)
        self.assertEqual(prod505.current_qty, 19)

        updated_order = orders_db.update_order_status(order.order_id, "CONFIRMED", db_path=TEST_DB)
        self.assertEqual(updated_order.status, "CONFIRMED")

        cancelled_order, msg = orders_db.cancel_order(order.order_id, restock=True, db_path=TEST_DB)
        self.assertEqual(cancelled_order.status, "CANCELLED")
        self.assertEqual(inventory_db.get_product("101", db_path=TEST_DB).current_qty, 50)
        self.assertEqual(inventory_db.get_product("505", db_path=TEST_DB).current_qty, 20)

    def test_command_parser(self):
        """Test command parser for syntax and error handling."""
        cmd = parse_message("STOCK 101")
        self.assertEqual(cmd.action, "STOCK")
        self.assertEqual(cmd.item_code, "101")

        cmd = parse_message("IN 101 20")
        self.assertEqual(cmd.action, "IN")
        self.assertEqual(cmd.item_code, "101")
        self.assertEqual(cmd.quantity, 20)

        cmd = parse_message("OUT 101 5")
        self.assertEqual(cmd.action, "OUT")
        self.assertEqual(cmd.item_code, "101")
        self.assertEqual(cmd.quantity, 5)

        cmd = parse_message("REPORT")
        self.assertEqual(cmd.action, "REPORT")

        err_cmd = parse_message("IN 101 ABC")
        self.assertEqual(err_cmd.error, "Invalid format. Please use: IN <ITEM_CODE> <QUANTITY>")

        err_cmd2 = parse_message("STOCK")
        self.assertEqual(err_cmd2.error, "Invalid format. Please use: STOCK <ITEM_CODE>")

    def test_command_handler_end_to_end(self):
        """Test command handler executing full cycle."""
        inventory_db.add_or_update_product("101", "White Shirt (L)", current_qty=45, db_path=TEST_DB)

        res = handle_user_command("STOCK 101", "+1234567890", db_path=TEST_DB)
        self.assertTrue(res.success)
        self.assertIn("White Shirt (L)", res.formatted_message)
        self.assertIn("45 units", res.formatted_message)

        res_in = handle_user_command("IN 101 20", "+1234567890", db_path=TEST_DB)
        self.assertTrue(res_in.success)
        self.assertIn("65 units", res_in.formatted_message)
        self.assertIn("✅", res_in.formatted_message)

        res_out = handle_user_command("OUT 101 5", "+1234567890", db_path=TEST_DB)
        self.assertTrue(res_out.success)
        self.assertIn("60 units", res_out.formatted_message)
        self.assertIn("📉", res_out.formatted_message)

        res_rep = handle_user_command("REPORT", "+1234567890", db_path=TEST_DB)
        self.assertTrue(res_rep.success)
        self.assertIn("📊", res_rep.formatted_message)

    def test_fastapi_endpoints(self):
        """Test FastAPI webhook verification and message simulation."""
        with TestClient(app) as client:
            resp = client.get(f"/webhook?hub.mode=subscribe&hub.verify_token={settings.VERIFY_TOKEN}&hub.challenge=11223344")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.text, "11223344")

            resp_bad = client.get("/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=11223344")
            self.assertEqual(resp_bad.status_code, 403)

            sim_resp = client.post("/api/simulate-message", json={
                "sender_phone": "+1234567890",
                "message_text": "HELP"
            })
            self.assertEqual(sim_resp.status_code, 200)
            self.assertIn("General WhatsApp Inventory ERP Commands", sim_resp.json()["formatted_reply"])

    def test_secrets_configuration(self):
        """Test private secrets folder detection and owner phone authorization."""
        self.assertIn("+1234567890", settings.OWNER_PHONE_NUMBERS)
        self.assertTrue(settings.is_authorized("+1234567890"))
        self.assertTrue(settings.is_authorized("1234567890"))
        self.assertFalse(settings.is_authorized("+9999999999"))
        self.assertTrue(len(settings.active_secrets_files) > 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
