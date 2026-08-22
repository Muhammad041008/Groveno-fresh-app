"""
Iteration 10 Backend Tests - Admin CL creation, Products API, OTP flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Admin authentication"""

    def test_admin_login_success(self):
        r = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@groveno.com", "password": "Admin@123"
        })
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        print(f"Admin login OK, token prefix: {data['token'][:20]}...")
        return data['token']

    def test_admin_login_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@groveno.com", "password": "wrong"
        })
        assert r.status_code in [400, 401, 403]
        print(f"Wrong password returns {r.status_code} ✓")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": "admin@groveno.com", "password": "Admin@123"
    })
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestAdminCLCreation:
    """Admin CL creation endpoint tests"""

    def test_create_cl_success(self, admin_headers):
        payload = {
            "name": "TEST_Leader Auto",
            "email": "test_leader_auto@groveno.com",
            "phone": "+919900000001",
            "password": "Leader@123",
            "societyName": "TEST Society"
        }
        r = requests.post(f"{BASE_URL}/api/admin/cls", json=payload, headers=admin_headers)
        print(f"Create CL status: {r.status_code}, body: {r.text[:300]}")
        assert r.status_code in [200, 201]
        data = r.json()
        assert data.get("success") is True
        cl = data.get("cl") or data.get("data") or data
        assert cl is not None
        # CL should be auto-approved
        if isinstance(cl, dict):
            status = cl.get("status")
            print(f"CL status: {status}")
            assert status == "approved", f"Expected 'approved', got '{status}'"
            # Auto-generated clCode
            cl_code = cl.get("clCode")
            assert cl_code is not None and len(cl_code) > 0
            print(f"CL clCode: {cl_code}")

    def test_create_cl_duplicate_email(self, admin_headers):
        """Second request with same email should fail with 409"""
        payload = {
            "name": "TEST_Leader Dup",
            "email": "test_leader_auto@groveno.com",  # same email
            "phone": "+919900000099",
            "password": "Leader@123",
            "societyName": "Some Society"
        }
        r = requests.post(f"{BASE_URL}/api/admin/cls", json=payload, headers=admin_headers)
        print(f"Duplicate email status: {r.status_code}")
        assert r.status_code == 409

    def test_create_cl_missing_fields(self, admin_headers):
        """Missing required fields should return 400"""
        r = requests.post(f"{BASE_URL}/api/admin/cls", json={"name": "Incomplete"}, headers=admin_headers)
        print(f"Missing fields status: {r.status_code}")
        assert r.status_code == 400

    def test_new_cl_can_login(self, admin_headers):
        """Admin-created CL should be able to login immediately"""
        # Create a fresh CL
        payload = {
            "name": "TEST_Loginable CL",
            "email": "test_loginable_cl@groveno.com",
            "phone": "+919900000002",
            "password": "Leader@123",
            "societyName": "Login Society"
        }
        create_r = requests.post(f"{BASE_URL}/api/admin/cls", json=payload, headers=admin_headers)
        if create_r.status_code not in [200, 201]:
            # Maybe already exists from previous run
            print(f"CL creation returned {create_r.status_code}, trying login anyway")
        
        # Try login
        login_r = requests.post(f"{BASE_URL}/api/cl/auth/login", json={
            "email": "test_loginable_cl@groveno.com",
            "password": "Leader@123"
        })
        print(f"New CL login status: {login_r.status_code}, body: {login_r.text[:200]}")
        assert login_r.status_code == 200
        data = login_r.json()
        assert "token" in data

    def test_list_cls(self, admin_headers):
        """GET /api/admin/cls should return list"""
        r = requests.get(f"{BASE_URL}/api/admin/cls", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        print(f"CL list count: {len(data) if isinstance(data, list) else data}")


class TestProductsAPI:
    """Products API - verify images[] and variants[] structure"""

    def test_get_products_has_images_and_variants(self):
        r = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert r.status_code == 200
        data = r.json()
        products = data if isinstance(data, list) else data.get("products", data.get("data", []))
        assert len(products) > 0, "No products returned"
        p = products[0]
        print(f"Product keys: {list(p.keys())}")
        
        # images array should exist
        assert "images" in p, "Product missing 'images' array"
        assert isinstance(p["images"], list)
        assert len(p["images"]) > 0, "Product images array is empty"
        print(f"images[0]: {p['images'][0]}")
        
        # variants array should exist
        assert "variants" in p, "Product missing 'variants' array"
        assert isinstance(p["variants"], list)
        assert len(p["variants"]) > 0, "Product variants array is empty"
        
        # variants[0] should have price > 0
        v0 = p["variants"][0]
        assert "price" in v0, "variants[0] missing price"
        assert v0["price"] > 0, f"variants[0].price is {v0['price']}, expected > 0"
        print(f"variants[0].price: {v0['price']} ✓")
        
        # Top-level price should NOT exist (would cause NaN in mobile)
        if "price" in p:
            print(f"WARNING: top-level 'price' field present: {p['price']}")

    def test_product_images_not_empty(self):
        r = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert r.status_code == 200
        data = r.json()
        products = data if isinstance(data, list) else data.get("products", data.get("data", []))
        for p in products:
            imgs = p.get("images", [])
            assert len(imgs) > 0, f"Product {p.get('name')} has empty images"
        print(f"All {len(products)} products have images ✓")


class TestOTPFlow:
    """OTP authentication - demo credentials"""

    def test_verify_otp_returns_real_jwt(self):
        r = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+911234567890",
            "otp": "1234"
        })
        print(f"verify-otp status: {r.status_code}, body: {r.text[:300]}")
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        token = data["token"]
        assert token != "demo_jwt_groveno_offline", "Token must be real JWT, not demo token"
        assert len(token) > 30, f"Token too short: {token}"
        print(f"Real JWT returned ✓ (len={len(token)})")

    def test_send_otp(self):
        r = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "+911234567890"
        })
        print(f"send-otp status: {r.status_code}, body: {r.text[:200]}")
        assert r.status_code in [200, 201]
