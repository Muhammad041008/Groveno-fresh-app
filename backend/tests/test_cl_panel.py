"""
CL Panel new endpoints tests (iteration 3):
- GET  /api/cl/me
- PUT  /api/cl/profile   (name/email/bankDetails persistence)
- POST /api/cl/change-password (old wrong -> 400, new < 6 -> 400, valid flow login switch)
- GET  /api/cl/earnings  (summary math + commissionRate + history)
- Regression: /api/cl/auth/login, /api/cl/dashboard, /api/orders/cl-order, /api/cl/orders/:id/deliver
"""
import os
import time
import pytest
import requests


def _base_url():
    env_path = "/app/frontend/.env"
    with open(env_path) as f:
        for line in f:
            if line.strip().startswith("REACT_APP_BACKEND_URL"):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL missing")


BASE_URL = _base_url()
API = f"{BASE_URL}/api"


STATE = {
    "cl_token": None,
    "cl_id": None,
    "cl_code": "CL12345",
    "admin_token": None,
    "customer_token": None,
    "customer_phone": "+919000112233",
    "product_id": None,
    "cl_order_id": None,
    "cl_pw_reverted": False,
}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- Bootstrap ----------------------------------------------------------

class TestBootstrap:
    def test_cl_login(self, s):
        r = s.post(f"{API}/cl/auth/login", json={"email": "cl@groveno.com", "password": "CL@123"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("success") is True
        assert j.get("token")
        STATE["cl_token"] = j["token"]
        STATE["cl_id"] = j["cl"]["_id"]
        STATE["cl_code"] = j["cl"]["clCode"]
        assert STATE["cl_code"] == "CL12345"

    def test_admin_login(self, s):
        r = s.post(f"{API}/admin/auth/login", json={"email": "admin@groveno.com", "password": "Admin@123"})
        assert r.status_code == 200, r.text
        STATE["admin_token"] = r.json()["token"]

    def test_customer_login(self, s):
        r = s.post(f"{API}/auth/send-otp", json={"phone": STATE["customer_phone"]})
        assert r.status_code == 200
        r = s.post(f"{API}/auth/verify-otp", json={"phone": STATE["customer_phone"], "otp": "123456"})
        assert r.status_code == 200, r.text
        STATE["customer_token"] = r.json()["token"]

    def test_get_product(self, s):
        r = s.get(f"{API}/products")
        assert r.status_code == 200
        products = r.json()["products"]
        assert len(products) >= 1
        STATE["product_id"] = products[0]["_id"]


# ---- GET /api/cl/me ------------------------------------------------------

class TestClMe:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['cl_token']}"}

    def test_me_success(self, s):
        r = s.get(f"{API}/cl/me", headers=self._h())
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("success") is True
        assert "cl" in j
        cl = j["cl"]
        assert cl.get("email") == "cl@groveno.com"
        assert cl.get("clCode") == "CL12345"
        # bankDetails should be an object (may be empty by default)
        assert "bankDetails" in cl
        assert isinstance(cl["bankDetails"], dict)
        for k in ("accountHolder", "accountNumber", "ifsc", "bankName"):
            assert k in cl["bankDetails"], f"missing bankDetails.{k}"

    def test_me_no_token(self, s):
        r = s.get(f"{API}/cl/me")
        assert r.status_code == 401

    def test_me_rejects_admin_token(self, s):
        h = {"Authorization": f"Bearer {STATE['admin_token']}"}
        r = s.get(f"{API}/cl/me", headers=h)
        assert r.status_code in (401, 403), r.text

    def test_me_rejects_customer_token(self, s):
        h = {"Authorization": f"Bearer {STATE['customer_token']}"}
        r = s.get(f"{API}/cl/me", headers=h)
        assert r.status_code in (401, 403), r.text


# ---- PUT /api/cl/profile ------------------------------------------------

class TestClUpdateProfile:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['cl_token']}"}

    def test_update_bank_details_persists(self, s):
        payload = {
            "name": "CL Test Owner",
            "email": "cl@groveno.com",
            "bankDetails": {
                "accountHolder": "TEST Holder",
                "accountNumber": "1234567890",
                "ifsc": "TESTIFSC001",
                "bankName": "TEST Bank",
            },
        }
        r = s.put(f"{API}/cl/profile", headers=self._h(), json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["success"] is True
        cl = j["cl"]
        assert cl["name"] == "CL Test Owner"
        assert cl["bankDetails"]["accountHolder"] == "TEST Holder"
        assert cl["bankDetails"]["accountNumber"] == "1234567890"
        assert cl["bankDetails"]["ifsc"] == "TESTIFSC001"
        assert cl["bankDetails"]["bankName"] == "TEST Bank"

        # GET to verify persistence
        r = s.get(f"{API}/cl/me", headers=self._h())
        assert r.status_code == 200
        cl = r.json()["cl"]
        assert cl["name"] == "CL Test Owner"
        assert cl["bankDetails"]["accountHolder"] == "TEST Holder"
        assert cl["bankDetails"]["accountNumber"] == "1234567890"

    def test_partial_bank_update_merges(self, s):
        # Only update ifsc — other fields should remain
        r = s.put(f"{API}/cl/profile", headers=self._h(), json={"bankDetails": {"ifsc": "NEWIFSC999"}})
        assert r.status_code == 200, r.text
        cl = r.json()["cl"]
        assert cl["bankDetails"]["ifsc"] == "NEWIFSC999"
        assert cl["bankDetails"]["accountHolder"] == "TEST Holder"  # unchanged
        assert cl["bankDetails"]["accountNumber"] == "1234567890"   # unchanged

    def test_update_no_token(self, s):
        r = s.put(f"{API}/cl/profile", json={"name": "hacker"})
        assert r.status_code == 401


# ---- POST /api/cl/change-password ---------------------------------------

class TestClChangePassword:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['cl_token']}"}

    def test_wrong_old_password_400(self, s):
        r = s.post(f"{API}/cl/change-password", headers=self._h(),
                   json={"oldPassword": "WrongPass!", "newPassword": "NewPass@123"})
        assert r.status_code == 400, r.text
        assert r.json().get("success") is False

    def test_short_new_password_400(self, s):
        r = s.post(f"{API}/cl/change-password", headers=self._h(),
                   json={"oldPassword": "CL@123", "newPassword": "abc"})
        assert r.status_code == 400, r.text

    def test_missing_fields_400(self, s):
        r = s.post(f"{API}/cl/change-password", headers=self._h(), json={"oldPassword": "CL@123"})
        assert r.status_code == 400

    def test_full_password_change_flow_and_revert(self, s):
        new_pw = "TempPass@2026"
        # Change to new
        r = s.post(f"{API}/cl/change-password", headers=self._h(),
                   json={"oldPassword": "CL@123", "newPassword": new_pw})
        assert r.status_code == 200, r.text

        # OLD password now fails
        r = s.post(f"{API}/cl/auth/login", json={"email": "cl@groveno.com", "password": "CL@123"})
        assert r.status_code == 401, r.text

        # NEW password succeeds
        r = s.post(f"{API}/cl/auth/login", json={"email": "cl@groveno.com", "password": new_pw})
        assert r.status_code == 200, r.text
        new_token = r.json()["token"]

        # Revert back to CL@123 using new token
        h2 = {"Authorization": f"Bearer {new_token}"}
        r = s.post(f"{API}/cl/change-password", headers=h2,
                   json={"oldPassword": new_pw, "newPassword": "CL@123"})
        assert r.status_code == 200, r.text
        STATE["cl_pw_reverted"] = True

        # Verify original credentials work again
        r = s.post(f"{API}/cl/auth/login", json={"email": "cl@groveno.com", "password": "CL@123"})
        assert r.status_code == 200, "Revert to CL@123 failed"
        # Refresh main token
        STATE["cl_token"] = r.json()["token"]


# ---- GET /api/cl/earnings -----------------------------------------------

class TestClEarnings:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['cl_token']}"}

    def test_earnings_structure(self, s):
        r = s.get(f"{API}/cl/earnings", headers=self._h())
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["success"] is True
        assert j["commissionRate"] == 0.05
        assert isinstance(j["history"], list)
        summary = j["summary"]
        for k in ("allTime", "thisMonth", "thisWeek", "today", "walletBalance", "totalOrders"):
            assert k in summary, f"summary missing {k}"

    def test_earnings_alltime_equals_totalcommission(self, s):
        r_me = s.get(f"{API}/cl/me", headers=self._h())
        cl = r_me.json()["cl"]
        expected_all_time = cl.get("totalCommission", 0)
        expected_wallet = cl.get("walletBalance", 0)

        r = s.get(f"{API}/cl/earnings", headers=self._h())
        s_data = r.json()["summary"]
        assert abs(s_data["allTime"] - expected_all_time) < 0.01, \
            f"summary.allTime {s_data['allTime']} != cl.totalCommission {expected_all_time}"
        assert abs(s_data["walletBalance"] - expected_wallet) < 0.01

    def test_earnings_no_token(self, s):
        r = s.get(f"{API}/cl/earnings")
        assert r.status_code == 401


# ---- Regression: CL flow ------------------------------------------------

class TestClRegression:
    def _clh(self):
        return {"Authorization": f"Bearer {STATE['cl_token']}"}

    def _cuh(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def test_cl_dashboard(self, s):
        r = s.get(f"{API}/cl/dashboard", headers=self._clh())
        assert r.status_code == 200, r.text
        j = r.json()
        stats = j.get("stats", j)
        for k in ("totalOrders", "deliveredOrders", "pendingOrders", "totalCommission", "walletBalance"):
            assert k in stats, f"missing {k}"
        assert "recentOrders" in j
        # qrScans may be under cl or stats
        assert ("qrScans" in stats) or ("qrScans" in j.get("cl", {}))

    def test_place_cl_order_and_deliver_credits_commission(self, s):
        # Snapshot
        r_before = s.get(f"{API}/cl/earnings", headers=self._clh()).json()["summary"]
        wallet_before = r_before["walletBalance"]
        all_time_before = r_before["allTime"]

        # Create a fresh CL order
        payload = {
            "customerName": "TEST_Iter3_Customer",
            "items": [{"productId": STATE["product_id"], "quantity": 2}],
            "address": {"line1": "Iter3 St", "city": "Bangalore", "pincode": "560100",
                        "phone": "+919111222333"},
        }
        r = s.post(f"{API}/orders/cl-order", headers=self._clh(), json=payload)
        assert r.status_code == 201, r.text
        order = r.json()["order"]
        STATE["cl_order_id"] = order["_id"]
        expected_comm = round(order["itemsTotal"] * 0.05, 2)
        assert abs(order["clCommission"] - expected_comm) < 0.05

        # Deliver
        r = s.put(f"{API}/cl/orders/{order['_id']}/deliver", headers=self._clh(), json={})
        assert r.status_code == 200, r.text
        delivered = r.json()["order"]
        assert delivered["status"] == "delivered"

        # Earnings after
        r_after = s.get(f"{API}/cl/earnings", headers=self._clh()).json()["summary"]
        assert r_after["walletBalance"] >= wallet_before + order["clCommission"] - 0.05
        assert r_after["allTime"] >= all_time_before + order["clCommission"] - 0.05
        # Delivered today so today >= this commission
        assert r_after["today"] >= order["clCommission"] - 0.05

    def test_earnings_history_includes_new_order(self, s):
        r = s.get(f"{API}/cl/earnings", headers=self._clh())
        j = r.json()
        oid = STATE["cl_order_id"]
        found = any(h.get("_id") == oid or h.get("id") == oid for h in j["history"])
        assert found, "Newly delivered CL order not in earnings history"

    def test_double_deliver_idempotent(self, s):
        # Marking already-delivered again shouldn't double-credit
        r_before = s.get(f"{API}/cl/earnings", headers=self._clh()).json()["summary"]
        r = s.put(f"{API}/cl/orders/{STATE['cl_order_id']}/deliver",
                  headers=self._clh(), json={})
        assert r.status_code == 200, r.text
        r_after = s.get(f"{API}/cl/earnings", headers=self._clh()).json()["summary"]
        assert abs(r_after["allTime"] - r_before["allTime"]) < 0.01, "Commission double-credited on re-deliver"


# ---- Final safety net ---------------------------------------------------

def test_final_password_still_default():
    """Ultimate sanity check: cl@groveno.com / CL@123 must still work."""
    r = requests.post(f"{API}/cl/auth/login",
                      json={"email": "cl@groveno.com", "password": "CL@123"})
    assert r.status_code == 200, "CL@123 must be restored at end of test suite!"
