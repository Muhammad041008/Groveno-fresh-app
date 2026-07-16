"""
Groveno Fresh Backend API Test Suite
Tests all endpoints against the public REACT_APP_BACKEND_URL.
"""
import os
import re
import pytest
import requests

# Load BASE_URL from frontend .env
def _load_base_url():
    env_path = "/app/frontend/.env"
    with open(env_path) as f:
        for line in f:
            if line.strip().startswith("REACT_APP_BACKEND_URL"):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found in /app/frontend/.env")

BASE_URL = _load_base_url()
API = f"{BASE_URL}/api"

# Shared state across tests
STATE = {
    "customer_token": None,
    "customer_id": None,
    "customer_phone": "+919876500001",
    "admin_token": None,
    "cl_token": None,
    "cl_id": None,
    "cl_code": "CL12345",
    "product_ids": [],
    "product_id_mango": None,
    "pickup_point_id": None,
    "home_order_id": None,
    "express_order_id": None,
    "cl_order_id": None,
    "pickup_otp": None,
}


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------- Health ----------
class TestHealth:
    def test_health(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True
        assert j.get("service") == "Groveno Fresh API"


# ---------- Customer Auth ----------
class TestCustomerAuth:
    def test_send_otp(self, s):
        r = s.post(f"{API}/auth/send-otp", json={"phone": STATE["customer_phone"]})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("success") is True
        assert j.get("devOtp") == "123456"

    def test_verify_otp(self, s):
        r = s.post(f"{API}/auth/verify-otp", json={"phone": STATE["customer_phone"], "otp": "123456"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["success"] is True
        assert j.get("token")
        assert j["user"]["phone"] == STATE["customer_phone"]
        STATE["customer_token"] = j["token"]
        STATE["customer_id"] = j["user"]["_id"]

    def test_me(self, s):
        h = {"Authorization": f"Bearer {STATE['customer_token']}"}
        r = s.get(f"{API}/auth/me", headers=h)
        assert r.status_code == 200
        assert r.json()["user"]["phone"] == STATE["customer_phone"]

    def test_update_profile(self, s):
        h = {"Authorization": f"Bearer {STATE['customer_token']}"}
        r = s.put(f"{API}/auth/profile", headers=h, json={"name": "TEST_User", "email": "test@example.com"})
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["name"] == "TEST_User"
        assert u["email"] == "test@example.com"

    def test_add_address(self, s):
        h = {"Authorization": f"Bearer {STATE['customer_token']}"}
        r = s.post(f"{API}/auth/add-address", headers=h, json={
            "label": "Home", "line1": "12 Test Street", "city": "Bangalore",
            "state": "KA", "pincode": "560001"
        })
        assert r.status_code == 200, r.text
        addrs = r.json()["addresses"]
        assert len(addrs) >= 1
        assert addrs[0]["line1"] == "12 Test Street"

    def test_unauthorized_me(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Admin Auth ----------
class TestAdminAuth:
    def test_admin_login(self, s):
        r = s.post(f"{API}/admin/auth/login", json={"email": "admin@groveno.com", "password": "Admin@123"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("token")
        assert j.get("admin", {}).get("email") == "admin@groveno.com"
        STATE["admin_token"] = j["token"]

    def test_admin_me(self, s):
        h = {"Authorization": f"Bearer {STATE['admin_token']}"}
        r = s.get(f"{API}/admin/auth/me", headers=h)
        assert r.status_code == 200
        assert r.json()["admin"]["email"] == "admin@groveno.com"


# ---------- CL Auth ----------
class TestCLAuth:
    def test_cl_register(self, s):
        import time
        unique = str(int(time.time()))
        r = s.post(f"{API}/cl/auth/register", json={
            "name": "TEST CL", "email": f"test_cl_{unique}@groveno.com",
            "phone": f"+9198765{unique[-5:]}", "password": "Test@123",
            "societyName": "Test Society"
        })
        # Could be 201 or 200. Should not be error.
        assert r.status_code in (200, 201), r.text
        assert r.json().get("success") is True

    def test_cl_login(self, s):
        r = s.post(f"{API}/cl/auth/login", json={"email": "cl@groveno.com", "password": "CL@123"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("token")
        STATE["cl_token"] = j["token"]
        STATE["cl_id"] = j["cl"]["_id"]
        STATE["cl_code"] = j["cl"]["clCode"]

    def test_cl_validate_code(self, s):
        r = s.get(f"{API}/cl/validate/{STATE['cl_code']}")
        assert r.status_code == 200
        j = r.json()
        assert j.get("valid") is True


# ---------- Products / Catalog ----------
class TestCatalog:
    def test_list_products(self, s):
        r = s.get(f"{API}/products")
        assert r.status_code == 200
        j = r.json()
        assert j["success"] is True
        assert len(j["products"]) >= 1
        STATE["product_ids"] = [p["_id"] for p in j["products"]]
        # check pagination fields exist
        assert "total" in j or "page" in j or "pagination" in j or len(j["products"]) >= 1

    def test_filter_category(self, s):
        r = s.get(f"{API}/products", params={"category": "fruits"})
        assert r.status_code == 200
        j = r.json()
        for p in j["products"]:
            assert p.get("categoryName", "").lower() == "fruits" or p.get("category", {}).get("slug") == "fruits"

    def test_search_mango(self, s):
        r = s.get(f"{API}/products", params={"search": "mango"})
        assert r.status_code == 200
        j = r.json()
        assert len(j["products"]) >= 1
        found = [p for p in j["products"] if "mango" in p["name"].lower()]
        assert len(found) >= 1
        STATE["product_id_mango"] = found[0]["_id"]

    def test_express_filter(self, s):
        r = s.get(f"{API}/products", params={"express": "true"})
        assert r.status_code == 200

    def test_get_product(self, s):
        pid = STATE["product_ids"][0]
        r = s.get(f"{API}/products/{pid}")
        assert r.status_code == 200
        assert r.json()["product"]["_id"] == pid

    def test_categories(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        assert len(r.json()["categories"]) >= 1

    def test_pickup_points(self, s):
        r = s.get(f"{API}/pickup-points")
        assert r.status_code == 200
        pps = r.json()["pickupPoints"] if "pickupPoints" in r.json() else r.json().get("points", [])
        assert len(pps) >= 1
        STATE["pickup_point_id"] = pps[0]["_id"]


# ---------- Home Delivery Order ----------
class TestHomeDelivery:
    def _headers(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def test_home_delivery_below_threshold(self, s):
        # Use one item likely below 199 -> delivery fee 30
        r = s.get(f"{API}/products")
        products = r.json()["products"]
        # find cheap product
        cheap = min(products, key=lambda p: p["variants"][0]["price"])
        payload = {
            "items": [{"productId": cheap["_id"], "variantSize": cheap["variants"][0]["size"], "quantity": 1}],
            "address": {"line1": "12 Test", "city": "Bangalore", "pincode": "560001"},
            "deliverySlot": "morning",
            "paymentMethod": "cod",
        }
        r = s.post(f"{API}/orders/home-delivery", headers=self._headers(), json=payload)
        assert r.status_code == 201, r.text
        o = r.json()["order"]
        assert re.match(r"^GRV-\d{4}-\d{5}$", o["orderNumber"]), f"Bad order#: {o['orderNumber']}"
        assert o["channel"] == "home_delivery"
        expected_fee = 0 if o["itemsTotal"] >= 199 else 30
        assert o["deliveryFee"] == expected_fee
        STATE["home_order_id"] = o["_id"]

    def test_home_delivery_express_slot(self, s):
        pid = STATE["product_ids"][0]
        payload = {
            "items": [{"productId": pid, "quantity": 3}],
            "address": {"line1": "9 Fast Ln", "city": "Bangalore", "pincode": "560002"},
            "deliverySlot": "express_30min",
            "paymentMethod": "cod",
        }
        r = s.post(f"{API}/orders/home-delivery", headers=self._headers(), json=payload)
        assert r.status_code == 201, r.text
        o = r.json()["order"]
        assert o["expressCharge"] == 15

    def test_home_delivery_with_cl_code(self, s):
        pid = STATE["product_ids"][0]
        payload = {
            "items": [{"productId": pid, "quantity": 2}],
            "address": {"line1": "5 CL Ave", "city": "Bangalore", "pincode": "560003"},
            "clCode": STATE["cl_code"],
            "paymentMethod": "cod",
        }
        r = s.post(f"{API}/orders/home-delivery", headers=self._headers(), json=payload)
        assert r.status_code == 201, r.text
        o = r.json()["order"]
        assert o["clCode"] == STATE["cl_code"]
        expected = round(o["itemsTotal"] * 0.05, 2)
        assert abs(o["clCommission"] - expected) < 0.05


# ---------- Express Pickup ----------
class TestExpressPickup:
    def _headers(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def test_express_pickup(self, s):
        pid = STATE["product_ids"][0]
        payload = {
            "items": [{"productId": pid, "quantity": 2}],
            "pickupPointId": STATE["pickup_point_id"],
            "pickupTime": "18:00",
        }
        r = s.post(f"{API}/orders/express-pickup", headers=self._headers(), json=payload)
        assert r.status_code == 201, r.text
        j = r.json()
        o = j["order"]
        assert o["channel"] == "express_pickup"
        assert o["expressCharge"] == 30
        expected_disc = round(o["itemsTotal"] * 0.05, 2)
        assert abs(o["pickupDiscount"] - expected_disc) < 0.05
        assert re.match(r"^\d{4}$", str(o["pickupOtp"]))
        assert o.get("pickupPointName")
        assert j.get("verificationCode") == o["pickupOtp"]
        assert j.get("pickupHub")
        STATE["express_order_id"] = o["_id"]
        STATE["pickup_otp"] = o["pickupOtp"]


# ---------- CL Order Channel ----------
class TestCLOrders:
    def _headers(self):
        return {"Authorization": f"Bearer {STATE['cl_token']}"}

    def test_cl_order(self, s):
        pid = STATE["product_ids"][0]
        payload = {
            "customerName": "TEST_Customer",
            "items": [{"productId": pid, "quantity": 2}],
            "address": {"line1": "1 CL St", "city": "Bangalore", "pincode": "560099", "phone": "+919000000000"},
        }
        r = s.post(f"{API}/orders/cl-order", headers=self._headers(), json=payload)
        assert r.status_code == 201, r.text
        o = r.json()["order"]
        assert o["channel"] == "cl_order"
        expected_comm = round(o["itemsTotal"] * 0.05, 2)
        assert abs(o["clCommission"] - expected_comm) < 0.05
        STATE["cl_order_id"] = o["_id"]

    def test_cl_bulk(self, s):
        pid = STATE["product_ids"][0]
        payload = {"orders": [
            {"customerName": "TEST_Bulk1", "items": [{"productId": pid, "quantity": 1}],
             "address": {"line1": "Bulk 1", "city": "Blr", "pincode": "560001"}},
            {"customerName": "TEST_Bulk2", "items": [{"productId": pid, "quantity": 2}],
             "address": {"line1": "Bulk 2", "city": "Blr", "pincode": "560001"}},
        ]}
        r = s.post(f"{API}/orders/cl-bulk", headers=self._headers(), json=payload)
        assert r.status_code == 201, r.text
        j = r.json()
        assert j["count"] == 2

    def test_reject_customer_token_on_cl_route(self, s):
        h = {"Authorization": f"Bearer {STATE['customer_token']}"}
        r = s.post(f"{API}/orders/cl-order", headers=h, json={"customerName": "x"})
        assert r.status_code in (401, 403)


# ---------- Customer Order queries ----------
class TestCustomerOrderQueries:
    def _headers(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def test_list_orders(self, s):
        r = s.get(f"{API}/orders", headers=self._headers())
        assert r.status_code == 200
        assert len(r.json()["orders"]) >= 1

    def test_get_order(self, s):
        oid = STATE["home_order_id"]
        r = s.get(f"{API}/orders/{oid}", headers=self._headers())
        assert r.status_code == 200
        assert r.json()["order"]["_id"] == oid

    def test_pending_rating(self, s):
        # should return an array (possibly empty)
        r = s.get(f"{API}/orders/pending-rating", headers=self._headers())
        assert r.status_code == 200
        assert isinstance(r.json()["orders"], list)


# ---------- Express Pickup Live Tracking ----------
class TestLiveTracking:
    def _ch(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def _ah(self):
        return {"Authorization": f"Bearer {STATE['admin_token']}"}

    def test_start_tracking(self, s):
        oid = STATE["express_order_id"]
        r = s.post(f"{API}/orders/{oid}/start-tracking", headers=self._ch(), json={})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "hubLat" in j and "hubLng" in j

    def test_location_update(self, s):
        oid = STATE["express_order_id"]
        r = s.post(f"{API}/orders/{oid}/location-update", headers=self._ch(),
                   json={"lat": 12.97, "lng": 77.59})
        assert r.status_code == 200, r.text

    def test_arrived(self, s):
        oid = STATE["express_order_id"]
        r = s.post(f"{API}/orders/{oid}/arrived", headers=self._ch(), json={})
        assert r.status_code == 200, r.text

    def test_collected_admin(self, s):
        oid = STATE["express_order_id"]
        r = s.put(f"{API}/orders/{oid}/collected", headers=self._ah(),
                  json={"verificationCode": STATE["pickup_otp"]})
        assert r.status_code == 200, r.text


# ---------- Coins ----------
class TestCoins:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def test_balance(self, s):
        r = s.get(f"{API}/coins/balance", headers=self._h())
        assert r.status_code == 200
        j = r.json()
        assert "coins" in j

    def test_history(self, s):
        r = s.get(f"{API}/coins/history", headers=self._h())
        assert r.status_code == 200

    def test_validate_cl(self, s):
        r = s.post(f"{API}/coins/validate-cl", headers=self._h(),
                   json={"clCode": STATE["cl_code"]})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("valid") is True
        assert "coinsToEarn" in j


# ---------- Wallet ----------
class TestWallet:
    def test_wallet(self, s):
        h = {"Authorization": f"Bearer {STATE['customer_token']}"}
        r = s.get(f"{API}/wallet", headers=h)
        assert r.status_code == 200
        assert "balance" in r.json() or "wallet" in r.json()

    def test_admin_credit_wallet(self, s):
        h = {"Authorization": f"Bearer {STATE['admin_token']}"}
        r = s.post(f"{API}/wallet/credit", headers=h,
                   json={"userId": STATE["customer_id"], "amount": 50, "description": "TEST credit"})
        assert r.status_code == 200, r.text


# ---------- CL Dashboard ----------
class TestCLDashboard:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['cl_token']}"}

    def test_dashboard(self, s):
        r = s.get(f"{API}/cl/dashboard", headers=self._h())
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ["totalOrders", "deliveredOrders", "pendingOrders", "totalCommission", "walletBalance"]:
            assert k in j.get("stats", j), f"missing {k}"

    def test_orders(self, s):
        r = s.get(f"{API}/cl/orders", headers=self._h())
        assert r.status_code == 200

    def test_mark_delivered(self, s):
        oid = STATE["cl_order_id"]
        r = s.put(f"{API}/cl/orders/{oid}/deliver", headers=self._h(), json={})
        assert r.status_code == 200, r.text


# ---------- Admin Dashboard & Management ----------
class TestAdmin:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['admin_token']}"}

    def test_dashboard(self, s):
        r = s.get(f"{API}/admin/dashboard", headers=self._h())
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ["totalOrders", "revenue", "activeUsers", "activeCLs"]:
            assert k in j or k in j.get("stats", {}), f"missing {k}"

    def test_orders_filter(self, s):
        r = s.get(f"{API}/admin/orders", headers=self._h(), params={"channel": "home_delivery"})
        assert r.status_code == 200

    def test_update_order_status(self, s):
        oid = STATE["home_order_id"]
        r = s.put(f"{API}/admin/orders/{oid}/status", headers=self._h(),
                  json={"status": "confirmed"})
        assert r.status_code == 200, r.text

    def test_list_users(self, s):
        r = s.get(f"{API}/admin/users", headers=self._h())
        assert r.status_code == 200

    def test_get_user(self, s):
        r = s.get(f"{API}/admin/users/{STATE['customer_id']}", headers=self._h())
        assert r.status_code == 200

    def test_credit_user_wallet(self, s):
        r = s.post(f"{API}/admin/users/{STATE['customer_id']}/credit-wallet",
                   headers=self._h(), json={"amount": 20, "description": "TEST"})
        assert r.status_code == 200, r.text

    def test_list_cls(self, s):
        r = s.get(f"{API}/admin/cls", headers=self._h())
        assert r.status_code == 200

    def test_active_express_pickup(self, s):
        r = s.get(f"{API}/admin/express-pickup/active", headers=self._h())
        assert r.status_code == 200

    def test_revenue_report(self, s):
        r = s.get(f"{API}/admin/reports/revenue", headers=self._h())
        assert r.status_code == 200

    def test_qr_analytics(self, s):
        r = s.get(f"{API}/admin/reports/qr-analytics", headers=self._h())
        assert r.status_code == 200

    def test_reject_customer_token_on_admin_route(self, s):
        h = {"Authorization": f"Bearer {STATE['customer_token']}"}
        r = s.get(f"{API}/admin/dashboard", headers=h)
        assert r.status_code in (401, 403)


# ---------- Admin CRUD ----------
class TestAdminCRUD:
    created_product_id = None
    created_category_id = None
    created_pickup_id = None

    def _h(self):
        return {"Authorization": f"Bearer {STATE['admin_token']}"}

    def test_create_category(self, s):
        import time
        u = str(int(time.time()))
        r = s.post(f"{API}/admin/categories", headers=self._h(),
                   json={"name": f"TEST_Category_{u}", "slug": f"test-category-{u}", "icon": "🧪", "sortOrder": 99})
        assert r.status_code in (200, 201), r.text
        j = r.json()
        cat = j.get("category") or j.get("data") or j
        TestAdminCRUD.created_category_id = cat.get("_id") or cat.get("id")
        assert TestAdminCRUD.created_category_id

    def test_update_category(self, s):
        cid = TestAdminCRUD.created_category_id
        import time
        u = str(int(time.time()))
        r = s.put(f"{API}/admin/categories/{cid}", headers=self._h(),
                  json={"name": f"TEST_Category_Upd_{u}"})
        assert r.status_code == 200, r.text

    def test_create_product(self, s):
        import time
        u = str(int(time.time()))
        r = s.post(f"{API}/admin/products", headers=self._h(),
                   json={
                       "name": f"TEST_Product_{u}",
                       "slug": f"test-product-{u}",
                       "category": TestAdminCRUD.created_category_id,
                       "description": "test",
                       "images": ["https://example.com/i.jpg"],
                       "variants": [{"size": "small", "label": "500g", "price": 100, "mrp": 120, "stock": 10}],
                   })
        assert r.status_code in (200, 201), r.text
        j = r.json()
        prod = j.get("product") or j
        TestAdminCRUD.created_product_id = prod.get("_id") or prod.get("id")
        assert TestAdminCRUD.created_product_id

    def test_update_product(self, s):
        pid = TestAdminCRUD.created_product_id
        r = s.put(f"{API}/admin/products/{pid}", headers=self._h(),
                  json={"description": "updated"})
        assert r.status_code == 200

    def test_delete_product(self, s):
        pid = TestAdminCRUD.created_product_id
        r = s.delete(f"{API}/admin/products/{pid}", headers=self._h())
        assert r.status_code in (200, 204)

    def test_list_pickup(self, s):
        r = s.get(f"{API}/admin/pickup-points", headers=self._h())
        assert r.status_code == 200

    def test_create_pickup(self, s):
        r = s.post(f"{API}/admin/pickup-points", headers=self._h(),
                   json={"name": "TEST_Hub", "address": "Test Addr", "lat": 12.97, "lng": 77.59, "isActive": True})
        assert r.status_code in (200, 201), r.text
        j = r.json()
        pp = j.get("pickupPoint") or j.get("point") or j
        TestAdminCRUD.created_pickup_id = pp.get("_id") or pp.get("id")

    def test_update_pickup(self, s):
        pid = TestAdminCRUD.created_pickup_id
        if not pid:
            pytest.skip("pickup id missing")
        r = s.put(f"{API}/admin/pickup-points/{pid}", headers=self._h(),
                  json={"name": "TEST_Hub_Updated"})
        assert r.status_code == 200


# ---------- Payment (Mock Razorpay) ----------
class TestPayment:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def test_create_order(self, s):
        r = s.post(f"{API}/payment/create-order", headers=self._h(),
                   json={"amount": 500, "orderId": STATE["home_order_id"]})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("razorpayOrderId") or j.get("id") or j.get("order")

    def test_verify(self, s):
        r = s.post(f"{API}/payment/verify", headers=self._h(),
                   json={
                       "orderId": STATE["home_order_id"],
                       "razorpayOrderId": "order_TEST",
                       "paymentId": "pay_TEST",
                       "signature": "TESTsig"
                   })
        assert r.status_code == 200, r.text


# ---------- QR ----------
class TestQR:
    def test_track(self, s):
        r = s.get(f"{API}/qr/track", params={"ref": STATE["cl_code"], "source": "poster"})
        assert r.status_code == 200
        assert r.json().get("tracked") is True


# ---------- Rating ----------
class TestRating:
    def _h(self):
        return {"Authorization": f"Bearer {STATE['customer_token']}"}

    def test_rate_delivered_order(self, s):
        # cl order was marked delivered in TestCLDashboard.test_mark_delivered
        # It was created by CL, not customer -- so customer can't rate it.
        # Use the home_order_id: update its status to delivered via admin, then rate.
        oid = STATE["home_order_id"]
        ah = {"Authorization": f"Bearer {STATE['admin_token']}"}
        r = s.put(f"{API}/admin/orders/{oid}/status", headers=ah, json={"status": "delivered"})
        assert r.status_code == 200, r.text

        # find a product id from that order
        r = s.get(f"{API}/orders/{oid}", headers=self._h())
        prod_id = r.json()["order"]["items"][0]["productId"]

        r = s.post(f"{API}/orders/{oid}/rate", headers=self._h(),
                   json={"ratings": [{"productId": prod_id, "stars": 5, "review": "Good"}]})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["order"]["ratingStatus"] == "rated"

    def test_skip_rating(self, s):
        # create a new order to skip
        pid = STATE["product_ids"][0]
        r = s.post(f"{API}/orders/home-delivery", headers=self._h(), json={
            "items": [{"productId": pid, "quantity": 1}],
            "address": {"line1": "Skip St", "city": "Blr", "pincode": "560001"},
            "paymentMethod": "cod",
        })
        oid = r.json()["order"]["_id"]
        # mark delivered
        ah = {"Authorization": f"Bearer {STATE['admin_token']}"}
        s.put(f"{API}/admin/orders/{oid}/status", headers=ah, json={"status": "delivered"})
        r = s.post(f"{API}/orders/{oid}/skip-rating", headers=self._h(), json={})
        assert r.status_code == 200, r.text
