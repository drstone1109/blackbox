import os
import sys
import unittest
from pathlib import Path

# Ensure root directory is on python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import HTTPException
from config.settings import settings, BASE_DIR
from database.connection import init_db, get_db_connection
import database.inventory as inventory_db
import database.orders as orders_db
import database.suppliers as suppliers_db
import database.procurement as procurement_db
import database.dispatch as dispatch_db
import database.staff as staff_db
import main as app_module

TEST_DB = str(BASE_DIR / "test_inventory.db")


def run_sync(coro):
    """Executes a synchronous async-def FastAPI handler directly without event loop."""
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value


class TestBlackboxERP(unittest.TestCase):
    """Test suite for Blackbox ERP system."""

    def setUp(self):
        """Prepare fresh database before each test."""
        self._orig_db = settings.DATABASE_PATH
        settings.DATABASE_PATH = TEST_DB
        if os.path.exists(TEST_DB):
            try:
                os.remove(TEST_DB)
            except PermissionError:
                pass
        init_db(TEST_DB)

    def tearDown(self):
        """Clean up database after each test."""
        settings.DATABASE_PATH = self._orig_db
        if os.path.exists(TEST_DB):
            try:
                os.remove(TEST_DB)
            except PermissionError:
                pass

    def test_product_crud(self):
        """Test product creation, retrieval, barcode lookup, and updates."""
        prod = inventory_db.add_or_update_product(
            item_code="MAC-M3-14",
            item_name="MacBook Pro 14 (M3)",
            category="Laptops",
            current_qty=12,
            min_alert_qty=3,
            barcode="8901234567890",
            cost_price=142000.0,
            selling_price=169900.0,
            db_path=TEST_DB
        )
        self.assertEqual(prod.item_code, "MAC-M3-14")
        self.assertEqual(prod.item_name, "MacBook Pro 14 (M3)")
        self.assertEqual(prod.current_qty, 12)
        self.assertEqual(prod.cost_price, 142000.0)
        self.assertEqual(prod.selling_price, 169900.0)
        self.assertFalse(prod.is_low_stock)

        # Lookup by item_code
        fetched = inventory_db.get_product("MAC-M3-14", db_path=TEST_DB)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.barcode, "8901234567890")

        # Lookup by barcode
        fetched_bar = inventory_db.get_product("8901234567890", db_path=TEST_DB)
        self.assertIsNotNone(fetched_bar)
        self.assertEqual(fetched_bar.item_code, "MAC-M3-14")

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

    def test_suppliers_crud(self):
        """Test suppliers directory and spend aggregation."""
        sup = suppliers_db.add_or_update_supplier(
            name="Apple Authorized Distribution India",
            contact_person="Rajesh Kumar",
            phone="+919811002233",
            email="orders@appleindia.com",
            address="Bandra Kurla Complex, Mumbai",
            payment_terms="Net 30",
            notes="Primary OEM distributor",
            db_path=TEST_DB
        )
        self.assertTrue(sup.supplier_id.startswith("SUP-"))
        self.assertEqual(sup.name, "Apple Authorized Distribution India")

        suppliers = suppliers_db.list_suppliers(db_path=TEST_DB)
        self.assertEqual(len(suppliers), 1)

        fetched = suppliers_db.get_supplier(sup.supplier_id, db_path=TEST_DB)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.contact_person, "Rajesh Kumar")

    def test_purchase_order_flow(self):
        """Test PO creation and inward goods receipt into warehouse stock."""
        sup = suppliers_db.add_or_update_supplier(
            name="Lenovo Direct India",
            phone="+919822334455",
            db_path=TEST_DB
        )
        inventory_db.add_or_update_product(
            item_code="THINK-X1",
            item_name="ThinkPad X1 Carbon Gen 12",
            category="Laptops",
            current_qty=5,
            cost_price=168000.0,
            selling_price=198000.0,
            db_path=TEST_DB
        )

        # Create PO for 10 units
        po = procurement_db.create_purchase_order(
            supplier_id=sup.supplier_id,
            items=[{"item_code": "THINK-X1", "qty_ordered": 10, "cost_price": 168000.0}],
            notes="Q4 stock replenishment",
            db_path=TEST_DB
        )
        self.assertTrue(po.po_id.startswith("PO-"))
        self.assertEqual(po.status, "ORDERED")
        self.assertEqual(po.total_amount, 1680000.0)

        # Receive goods into warehouse
        updated_po, msgs = procurement_db.receive_po_goods(
            po_id=po.po_id,
            received_items=[{"item_code": "THINK-X1", "qty_received": 10}],
            actor_phone="+919876543210",
            db_path=TEST_DB
        )
        self.assertEqual(updated_po.status, "FULLY_RECEIVED")

        # Verify warehouse stock increased from 5 to 15
        prod = inventory_db.get_product("THINK-X1", db_path=TEST_DB)
        self.assertEqual(prod.current_qty, 15)

        # Verify audit ledger
        txns = inventory_db.get_recent_transactions(item_code="THINK-X1", db_path=TEST_DB)
        self.assertEqual(len(txns), 1)
        self.assertEqual(txns[0].txn_type, "IN")
        self.assertEqual(txns[0].quantity, 10)
        self.assertIn(po.po_id, txns[0].actor_phone)

    def test_delivery_challan_flow(self):
        """Test Delivery Challan creation, line item validation, and physical dispatch."""
        inventory_db.add_or_update_product(
            item_code="IPAD-AIR-M2",
            item_name="iPad Air 11-inch (M2)",
            category="Tablets",
            current_qty=8,
            selling_price=59900.0,
            db_path=TEST_DB
        )

        # Create Delivery Challan
        dc, warnings = dispatch_db.create_delivery_challan(
            customer_name="NexGen Labs Pvt Ltd",
            customer_phone="+919876511223",
            delivery_address="Tech Park, Bengaluru",
            items=[{"item_code": "IPAD-AIR-M2", "quantity": 3, "selling_price": 59900.0}],
            db_path=TEST_DB
        )
        self.assertTrue(dc.dc_id.startswith("DC-"))
        self.assertEqual(dc.status, "READY")
        self.assertEqual(dc.total_amount, 179700.0)

        # Dispatch Delivery Challan (deducts warehouse inventory)
        dispatched_dc, msgs = dispatch_db.dispatch_delivery_challan(
            dc_id=dc.dc_id,
            actor_phone="Warehouse Dispatch Team",
            db_path=TEST_DB
        )
        self.assertEqual(dispatched_dc.status, "DISPATCHED")

        # Verify stock reduced from 8 to 5
        prod = inventory_db.get_product("IPAD-AIR-M2", db_path=TEST_DB)
        self.assertEqual(prod.current_qty, 5)

        # Verify audit log
        txns = inventory_db.get_recent_transactions(item_code="IPAD-AIR-M2", db_path=TEST_DB)
        self.assertEqual(len(txns), 1)
        self.assertEqual(txns[0].txn_type, "OUT")
        self.assertEqual(txns[0].quantity, 3)
        self.assertIn(dc.dc_id, txns[0].actor_phone)

    def test_staff_management_and_access_request(self):
        """Test staff self-registration, admin approval, and authorization gatekeeping."""
        # Unregistered user requests access
        staff_member, is_new = staff_db.request_staff_access(
            name="Vikram Sethi",
            phone="+919876599999",
            db_path=TEST_DB
        )
        self.assertTrue(is_new)
        self.assertEqual(staff_member.status, "PENDING")
        self.assertEqual(staff_member.name, "Vikram Sethi")

        # Verify inactive staff is not authorized
        self.assertFalse(staff_db.is_staff_authorized("+919876599999", db_path=TEST_DB))

        # Admin approves the staff member
        approved_staff = staff_db.update_staff_status(
            staff_id_or_phone=str(staff_member.staff_id),
            new_status="ACTIVE",
            db_path=TEST_DB
        )
        self.assertEqual(approved_staff.status, "ACTIVE")
        self.assertTrue(staff_db.is_staff_authorized("+919876599999", db_path=TEST_DB))

    def test_fastapi_endpoints_direct(self):
        """Test FastAPI endpoints directly without event loop hangs."""
        # 1. List endpoints
        products = run_sync(app_module.list_products())
        self.assertIsInstance(products, list)

        suppliers = run_sync(app_module.list_suppliers_endpoint())
        self.assertIsInstance(suppliers, list)

        pos = run_sync(app_module.list_purchase_orders_endpoint())
        self.assertIsInstance(pos, list)

        dcs = run_sync(app_module.list_delivery_challans_endpoint())
        self.assertIsInstance(dcs, list)

        staff = run_sync(app_module.list_staff_endpoint())
        self.assertIsInstance(staff, list)

    def test_web_auth_and_roles(self):
        """Test web authentication and PIN login."""
        # 1. Admin login with default PIN
        admin_login = app_module.LoginRequest(identifier="admin", pin="1234", role="admin")
        res_admin = run_sync(app_module.login_endpoint(admin_login))
        self.assertTrue(res_admin["success"])
        self.assertEqual(res_admin["role"], "admin")

        # 2. Staff login with staff PIN
        staff_db.add_or_update_staff(
            name="Karan Johar",
            phone="+919811223344",
            role="STAFF",
            pin="5678",
            status="ACTIVE",
            db_path=TEST_DB
        )
        staff_login = app_module.LoginRequest(identifier="+919811223344", pin="5678", role="staff")
        res_staff = run_sync(app_module.login_endpoint(staff_login))
        self.assertTrue(res_staff["success"])

        # 3. Invalid PIN fails
        bad_login = app_module.LoginRequest(identifier="admin", pin="wrong_pin", role="admin")
        with self.assertRaises(HTTPException) as ctx:
            run_sync(app_module.login_endpoint(bad_login))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_notifications_generation(self):
        """Test live operational notifications generation."""
        inventory_db.add_or_update_product(
            item_code="ALERT-TEST",
            item_name="Low Stock Item",
            current_qty=1,
            min_alert_qty=5,
            db_path=TEST_DB
        )
        notifs = run_sync(app_module.get_notifications())
        self.assertIsInstance(notifs, list)
        self.assertTrue(any(n.type == "LOW_STOCK" for n in notifs))

    def test_barcode_scan_and_terminal_move(self):
        """Test barcode lookup and quick stock movement terminal."""
        inventory_db.add_or_update_product(
            item_code="SCAN-01",
            item_name="Barcode Test Product",
            barcode="778899001122",
            current_qty=10,
            db_path=TEST_DB
        )

        # Lookup by barcode
        lookup_res = run_sync(app_module.scan_lookup("778899001122"))
        self.assertEqual(lookup_res["product"].item_code, "SCAN-01")

        # Fast Move IN
        move_in = app_module.QuickStockMovement(
            query="778899001122",
            quantity=5,
            direction="IN",
            actor="Warehouse Lead"
        )
        res_in = run_sync(app_module.quick_stock_move(move_in))
        self.assertTrue(res_in["success"])
        self.assertEqual(res_in["product"].current_qty, 15)

        # Fast Move OUT
        move_out = app_module.QuickStockMovement(
            query="SCAN-01",
            quantity=2,
            direction="OUT",
            actor="Store Staff"
        )
        res_out = run_sync(app_module.quick_stock_move(move_out))
        self.assertTrue(res_out["success"])
        self.assertEqual(res_out["product"].current_qty, 13)

    def test_csv_reports_export(self):
        """Test CSV report generation for inventory and audit ledger."""
        inv_csv = run_sync(app_module.export_inventory_csv())
        self.assertEqual(inv_csv.media_type, "text/csv")
        self.assertIn("Item Code,Product Name,Category", inv_csv.body.decode())

        txns_csv = run_sync(app_module.export_transactions_csv())
        self.assertEqual(txns_csv.media_type, "text/csv")
        self.assertIn("Txn ID,Timestamp,Item Code", txns_csv.body.decode())

    def test_secrets_configuration(self):
        """Test private secrets folder detection."""
        self.assertTrue(len(settings.active_secrets_files) > 0)

    def test_company_gate_and_step2_login(self):
        """Test Step 1 Company Gate and Step 2 User Authentication with Blackbox permissions."""
        # 1. Step 1 Valid Company Code
        gate_req = app_module.CompanyGateRequest(company_code="BLACKBOX-TRADING")
        gate_res = run_sync(app_module.company_gate_endpoint(gate_req))
        self.assertTrue(gate_res["valid"])
        self.assertEqual(gate_res["company_code"], "BLACKBOX-TRADING")

        # 2. Step 1 Invalid Company Code fails with 400
        bad_gate = app_module.CompanyGateRequest(company_code="NONEXISTENT-COMPANY")
        with self.assertRaises(HTTPException) as ctx:
            run_sync(app_module.company_gate_endpoint(bad_gate))
        self.assertEqual(ctx.exception.status_code, 400)

        # 3. Step 2 Owner Login returns full departments and MANAGER role
        admin_login = app_module.LoginRequest(identifier="admin", pin="1234", role="admin")
        res_admin = run_sync(app_module.login_endpoint(admin_login))
        self.assertTrue(res_admin["success"])
        self.assertEqual(res_admin["user"]["role_level"], "MANAGER")
        self.assertIn("procurement", res_admin["user"]["departments"])
        self.assertFalse(res_admin["user"]["hide_financials"])

    def test_blackbox_visibility_engine(self):
        """Test Blackbox Visibility Engine toggles, department pills, and role permissions."""
        # 1. Fetch system visibility settings
        vis = run_sync(app_module.get_visibility_settings())
        self.assertIn("open_blackbox_mode", vis)

        # 2. Toggle master mode to Restricted (False)
        update_req = app_module.VisibilityModeUpdateRequest(open_blackbox_mode=False)
        updated_vis = run_sync(app_module.update_visibility_settings(update_req))
        self.assertFalse(updated_vis["open_blackbox_mode"])

        # 3. Register worker with specific departments
        worker = staff_db.add_or_update_staff(
            name="Vikram Singh",
            phone="+919811224455",
            role="STAFF",
            pin="1234",
            departments="godown",
            role_level="WORKER",
            hide_financials=True,
            status="ACTIVE",
            db_path=TEST_DB
        )
        self.assertEqual(worker.departments, "godown")
        self.assertTrue(worker.hide_financials)
        self.assertEqual(worker.role_level, "WORKER")

        # 4. Owner grants Dispatch and Khata department pills
        dept_req = app_module.StaffDepartmentsUpdateRequest(departments="godown,dispatch,khata")
        updated_worker = run_sync(app_module.update_staff_departments_endpoint(str(worker.staff_id), dept_req))
        self.assertEqual(updated_worker.departments, "godown,dispatch,khata")

        # 5. Department Manager sets permissions (Promote to Manager and show financials)
        perm_req = app_module.StaffPermissionsUpdateRequest(
            role_level="MANAGER",
            hide_financials=False,
            departments="godown,dispatch,khata"
        )
        promoted = run_sync(app_module.update_staff_permissions_endpoint(worker.staff_id, perm_req))
        self.assertEqual(promoted.role_level, "MANAGER")
        self.assertFalse(promoted.hide_financials)

    def test_khata_summary_and_financials(self):
        """Test Department 4 Khata summary calculations."""
        # Seed test product
        inventory_db.add_or_update_product(
            item_code="KHATA-01",
            item_name="Khata Test Item",
            category="Accessories",
            current_qty=10,
            cost_price=1000.0,
            selling_price=1500.0,
            db_path=TEST_DB
        )

        khata = run_sync(app_module.get_khata_summary())
        self.assertGreaterEqual(khata.godown_value, 10000.0)
        self.assertIsInstance(khata.cash_in_today, float)
        self.assertIsInstance(khata.cash_out_today, float)
        self.assertIsInstance(khata.net_cashflow, float)
        self.assertIsInstance(khata.total_receivables, float)
        self.assertIsInstance(khata.total_payables, float)

    def test_organization_profile_endpoints(self):
        """Test Organization Profile get and update endpoints."""
        profile = run_sync(app_module.get_organization_endpoint())
        self.assertIn("company_name", profile)
        self.assertIn("company_code", profile)

        update_payload = app_module.OrganizationProfile(
            company_name="Apex Electronics Hub Pvt Ltd",
            company_code="APEX-HUB",
            gstin="27ABCDE1234F1Z5",
            address="Nehru Place, New Delhi",
            phone="+919876543210",
            email="info@apexhub.in",
            bank_name="HDFC Bank",
            bank_account_no="50200099998888",
            bank_ifsc="HDFC0001234",
            upi_id="apexhub@hdfcbank"
        )
        updated = run_sync(app_module.update_organization_endpoint(update_payload))
        self.assertEqual(updated["company_name"], "Apex Electronics Hub Pvt Ltd")
        self.assertEqual(updated["company_code"], "APEX-HUB")
        self.assertEqual(updated["gstin"], "27ABCDE1234F1Z5")
        self.assertEqual(updated["bank_account_no"], "50200099998888")

        # Verify company gate validates updated code
        gate_res = run_sync(app_module.company_gate_endpoint(app_module.CompanyGateRequest(company_code="APEX-HUB")))
        self.assertTrue(gate_res["valid"])
        self.assertEqual(gate_res["company_name"], "Apex Electronics Hub Pvt Ltd")


if __name__ == "__main__":
    unittest.main(verbosity=2)
