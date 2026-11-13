import sqlite3
from typing import Optional, List, Dict, Any, Tuple
from database.connection import get_db_connection
from models.schemas import StaffMember


def add_or_update_staff(
    name: str,
    phone: str,
    role: str = "STAFF",
    pin: str = "1234",
    departments: str = "godown,dispatch",
    role_level: str = "WORKER",
    hide_financials: bool = False,
    status: str = "ACTIVE",
    added_by: str = "Admin",
    db_path: str = None
) -> StaffMember:
    """Register or update a staff member with role, PIN, departments, and permissions."""
    clean_phone = phone.strip()
    name = name.strip()
    clean_pin = str(pin).strip() if pin else "1234"
    clean_role = (role or "STAFF").strip().upper()
    clean_depts = (departments or "godown,dispatch").strip()
    clean_role_level = (role_level or "WORKER").strip().upper()
    hide_fin_int = 1 if hide_financials else 0

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM staff WHERE phone = ?", (clean_phone,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE staff
                SET name = ?, role = ?, pin = ?, departments = ?, role_level = ?, hide_financials = ?, status = ?, added_by = ?
                WHERE phone = ?
            """, (name, clean_role, clean_pin, clean_depts, clean_role_level, hide_fin_int, status, added_by, clean_phone))
        else:
            cursor.execute("""
                INSERT INTO staff (name, phone, role, pin, departments, role_level, hide_financials, status, added_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, clean_phone, clean_role, clean_pin, clean_depts, clean_role_level, hide_fin_int, status, added_by))
        conn.commit()

    return get_staff_by_phone(clean_phone, db_path=db_path)


def request_staff_access(name: str, phone: str, db_path: str = None) -> Tuple[StaffMember, bool]:
    """
    Staff sends access request.
    If already registered, returns existing; otherwise creates PENDING record with default PIN '1234'.
    Returns (StaffMember, is_new_request).
    """
    clean_phone = phone.strip()
    name = name.strip() or "Staff Member"

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM staff WHERE phone = ?", (clean_phone,))
        existing = cursor.fetchone()

        if existing:
            is_new = False
        else:
            cursor.execute("""
                INSERT INTO staff (name, phone, role, pin, departments, role_level, hide_financials, status, added_by)
                VALUES (?, ?, 'STAFF', '1234', 'godown,dispatch', 'WORKER', 0, 'PENDING', 'Self Registration')
            """, (name, clean_phone))
            conn.commit()
            is_new = True

    return get_staff_by_phone(clean_phone, db_path=db_path), is_new


def get_staff_by_phone(phone: str, db_path: str = None) -> Optional[StaffMember]:
    """Retrieve staff record by phone number with activity transaction count."""
    clean_phone = phone.strip()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM staff WHERE phone = ?", (clean_phone,))
        row = cursor.fetchone()
        if not row:
            return None

        cursor.execute("""
            SELECT COUNT(*) FROM inventory_transactions
            WHERE actor_phone LIKE ?
        """, (f"%{clean_phone}%",))
        txn_count = cursor.fetchone()[0]

        data = dict(row)
        data["txn_count"] = txn_count
        if not data.get("role"):
            data["role"] = "STAFF"
        if not data.get("pin"):
            data["pin"] = "1234"
        if not data.get("departments"):
            data["departments"] = "godown,dispatch"
        if not data.get("role_level"):
            data["role_level"] = "WORKER"
        data["hide_financials"] = bool(data.get("hide_financials", 0))
        return StaffMember(**data)


def list_staff(status: str = None, department: str = None, db_path: str = None) -> List[StaffMember]:
    """List staff members with transaction counts and optional department filter."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM staff WHERE 1=1"
        params = []
        if status and status != "ALL":
            query += " AND status = ?"
            params.append(status)
        if department and department != "ALL":
            query += " AND departments LIKE ?"
            params.append(f"%{department.lower()}%")
        query += " ORDER BY CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END, created_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for r in rows:
            cursor.execute("""
                SELECT COUNT(*) FROM inventory_transactions
                WHERE actor_phone LIKE ?
            """, (f"%{r['phone']}%",))
            txn_count = cursor.fetchone()[0]
            data = dict(r)
            data["txn_count"] = txn_count
            if not data.get("role"):
                data["role"] = "STAFF"
            if not data.get("pin"):
                data["pin"] = "1234"
            if not data.get("departments"):
                data["departments"] = "godown,dispatch"
            if not data.get("role_level"):
                data["role_level"] = "WORKER"
            data["hide_financials"] = bool(data.get("hide_financials", 0))
            results.append(StaffMember(**data))
        return results


def authenticate_staff(identifier: str, pin: str, db_path: str = None) -> Optional[StaffMember]:
    """
    Authenticate staff or admin by identifier (phone, name, or staff_id) and PIN.
    Returns StaffMember if valid and ACTIVE, otherwise None.
    """
    clean_id = identifier.strip()
    clean_pin = str(pin).strip()

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT phone FROM staff
            WHERE (phone = ? OR LOWER(name) = LOWER(?) OR CAST(staff_id AS TEXT) = ?)
              AND pin = ?
              AND status = 'ACTIVE'
        """, (clean_id, clean_id, clean_id, clean_pin))
        row = cursor.fetchone()
        if not row:
            return None
        return get_staff_by_phone(row["phone"], db_path=db_path)


def update_staff_status(staff_id_or_phone: str, new_status: str, db_path: str = None) -> Optional[StaffMember]:
    """Approve, suspend, or reject a staff member."""
    valid_statuses = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status '{new_status}'. Allowed: {valid_statuses}")

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        if str(staff_id_or_phone).isdigit():
            cursor.execute("UPDATE staff SET status = ? WHERE staff_id = ?", (new_status, int(staff_id_or_phone)))
            cursor.execute("SELECT phone FROM staff WHERE staff_id = ?", (int(staff_id_or_phone),))
        else:
            cursor.execute("UPDATE staff SET status = ? WHERE phone = ?", (new_status, str(staff_id_or_phone)))
            cursor.execute("SELECT phone FROM staff WHERE phone = ?", (str(staff_id_or_phone),))

        row = cursor.fetchone()
        conn.commit()
        if not row:
            return None
        target_phone = row["phone"]

    return get_staff_by_phone(target_phone, db_path=db_path)


def update_staff_departments(staff_id_or_phone: str, departments: str, db_path: str = None) -> Optional[StaffMember]:
    """
    Update worker's department access permissions.
    Used by the Owner's Permission Engine to grant/revoke department pills.
    """
    clean_depts = departments.strip().lower()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        if str(staff_id_or_phone).isdigit():
            cursor.execute("UPDATE staff SET departments = ? WHERE staff_id = ?", (clean_depts, int(staff_id_or_phone)))
            cursor.execute("SELECT phone FROM staff WHERE staff_id = ?", (int(staff_id_or_phone),))
        else:
            cursor.execute("UPDATE staff SET departments = ? WHERE phone = ?", (clean_depts, str(staff_id_or_phone)))
            cursor.execute("SELECT phone FROM staff WHERE phone = ?", (str(staff_id_or_phone),))
        row = cursor.fetchone()
        conn.commit()
        if not row:
            return None
        target_phone = row["phone"]

    return get_staff_by_phone(target_phone, db_path=db_path)


def update_staff_permissions(
    staff_id: int,
    role_level: str,
    hide_financials: bool,
    departments: Optional[str] = None,
    db_path: str = None
) -> Optional[StaffMember]:
    """Update role level (MANAGER vs WORKER) and hide_financials flag."""
    clean_level = role_level.strip().upper()
    hide_fin_int = 1 if hide_financials else 0
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        if departments is not None:
            cursor.execute("""
                UPDATE staff
                SET role_level = ?, hide_financials = ?, departments = ?
                WHERE staff_id = ?
            """, (clean_level, hide_fin_int, departments.strip().lower(), int(staff_id)))
        else:
            cursor.execute("""
                UPDATE staff
                SET role_level = ?, hide_financials = ?
                WHERE staff_id = ?
            """, (clean_level, hide_fin_int, int(staff_id)))
        cursor.execute("SELECT phone FROM staff WHERE staff_id = ?", (int(staff_id),))
        row = cursor.fetchone()
        conn.commit()
        if not row:
            return None
        return get_staff_by_phone(row["phone"], db_path=db_path)


def update_staff_pin(staff_id: int, new_pin: str, db_path: str = None) -> Optional[StaffMember]:
    """Update a staff member's access PIN."""
    clean_pin = str(new_pin).strip()
    if len(clean_pin) < 4:
        raise ValueError("PIN must be at least 4 digits.")

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE staff SET pin = ? WHERE staff_id = ?", (clean_pin, int(staff_id)))
        cursor.execute("SELECT phone FROM staff WHERE staff_id = ?", (int(staff_id),))
        row = cursor.fetchone()
        conn.commit()
        if not row:
            return None
        return get_staff_by_phone(row["phone"], db_path=db_path)


def is_staff_authorized(phone: str, db_path: str = None) -> bool:
    """Check if a phone number belongs to an ACTIVE staff member."""
    clean_phone = phone.strip()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM staff WHERE phone = ?", (clean_phone,))
        row = cursor.fetchone()
        if row and row["status"] == "ACTIVE":
            return True
        return False


# ==============================================================
# System Settings (Owner Visibility Engine)
# ==============================================================

def get_system_settings(db_path: str = None) -> Dict[str, Any]:
    """Fetch global ERP settings including Open Blackbox Mode and Company Code."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM system_settings")
        rows = cursor.fetchall()
        settings_map = {r["key"]: r["value"] for r in rows}
        return {
            "open_blackbox_mode": settings_map.get("open_blackbox_mode", "1") == "1",
            "company_code": settings_map.get("company_code", "BLACKBOX-TRADING")
        }


def set_system_setting(key: str, value: str, db_path: str = None) -> None:
    """Update a system setting key/value."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO system_settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (key, str(value)))
        conn.commit()


def get_organization_profile(db_path: str = None) -> Dict[str, Any]:
    """Fetch complete business organization profile and tax/banking details."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM system_settings")
        rows = cursor.fetchall()
        m = {r["key"]: r["value"] for r in rows}
        return {
            "company_name": m.get("company_name", "Blackbox Tech Trading"),
            "company_code": m.get("company_code", "BLACKBOX-TRADING"),
            "tagline": m.get("tagline", "Adaptive Business Operations OS"),
            "gstin": m.get("gstin", ""),
            "pan": m.get("pan", ""),
            "address": m.get("address", ""),
            "phone": m.get("phone", ""),
            "email": m.get("email", ""),
            "bank_name": m.get("bank_name", ""),
            "bank_account_no": m.get("bank_account_no", ""),
            "bank_ifsc": m.get("bank_ifsc", ""),
            "upi_id": m.get("upi_id", ""),
            "terms_and_conditions": m.get("terms_and_conditions", "1. Goods once sold will be accepted back only in original packed condition.\\n2. Subject to local jurisdiction.")
        }


def update_organization_profile(data: Dict[str, Any], db_path: str = None) -> Dict[str, Any]:
    """Update organization settings in system_settings."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        for k, v in data.items():
            if v is not None:
                cursor.execute("""
                    INSERT INTO system_settings (key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """, (k, str(v)))
        conn.commit()
    return get_organization_profile(db_path)

