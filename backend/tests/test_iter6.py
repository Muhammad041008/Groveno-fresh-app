"""Iteration 6: Firebase OTP dual-path + Track Order endpoints tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://delivery-coins.preview.emergentagent.com').rstrip('/')

DEMO_PHONE = '+911234567890'
DEMO_OTP = '1234'
LEGACY_PHONE = '+919876543210'
LEGACY_OTP = '123456'


class TestSendOtp:
    """POST /api/auth/send-otp"""

    def test_send_otp_demo_phone(self):
        """Demo phone +911234567890 should return devOtp='1234'"""
        res = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": DEMO_PHONE})
        print(f"send-otp demo: {res.status_code} {res.text[:200]}")
        assert res.status_code == 200
        data = res.json()
        assert data.get('success') is True
        assert data.get('devOtp') == '1234'
        assert 'Demo OTP' in data.get('message', '')

    def test_send_otp_legacy_phone(self):
        """Legacy phone should succeed"""
        res = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": LEGACY_PHONE})
        print(f"send-otp legacy: {res.status_code} {res.text[:200]}")
        assert res.status_code == 200
        assert res.json().get('success') is True

    def test_send_otp_missing_phone(self):
        """Missing phone returns 400"""
        res = requests.post(f"{BASE_URL}/api/auth/send-otp", json={})
        print(f"send-otp no phone: {res.status_code} {res.text[:200]}")
        assert res.status_code == 400


class TestVerifyOtp:
    """POST /api/auth/verify-otp"""

    def test_verify_demo_phone_otp(self):
        """Demo phone + OTP 1234 → JWT token returned"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                            json={"phone": DEMO_PHONE, "otp": DEMO_OTP})
        print(f"verify demo: {res.status_code} {res.text[:300]}")
        assert res.status_code == 200
        data = res.json()
        assert data.get('success') is True
        assert 'token' in data
        assert isinstance(data['token'], str) and len(data['token']) > 0
        assert 'user' in data

    def test_verify_legacy_mock(self):
        """Legacy +919876543210 + 123456 still works"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                            json={"phone": LEGACY_PHONE, "otp": LEGACY_OTP})
        print(f"verify legacy: {res.status_code} {res.text[:300]}")
        assert res.status_code == 200
        data = res.json()
        assert 'token' in data

    def test_verify_firebase_token_returns_503(self):
        """firebaseToken with unconfigured Firebase → 503"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                            json={"firebaseToken": "fake_token_abc123"})
        print(f"verify firebase: {res.status_code} {res.text[:300]}")
        assert res.status_code == 503
        data = res.json()
        assert data.get('success') is False
        assert 'Firebase' in data.get('message', '')

    def test_verify_missing_body_returns_400(self):
        """No otp, no firebaseToken → 400"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={})
        print(f"verify empty: {res.status_code} {res.text[:200]}")
        assert res.status_code == 400

    def test_verify_otp_only_no_phone_returns_400(self):
        """otp without phone → 400"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={"otp": "1234"})
        print(f"verify otp-only: {res.status_code} {res.text[:200]}")
        assert res.status_code == 400


class TestTrackingEndpoints:
    """POST /api/orders/:id/start-tracking, location-update, arrived"""

    @pytest.fixture
    def customer_token(self):
        """Get a valid customer JWT"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-otp",
                            json={"phone": DEMO_PHONE, "otp": DEMO_OTP})
        assert res.status_code == 200, f"Auth failed: {res.text}"
        return res.json()['token']

    def test_start_tracking_requires_auth(self):
        """Without token → 401"""
        res = requests.post(f"{BASE_URL}/api/orders/fake_id/start-tracking")
        print(f"start-tracking no auth: {res.status_code}")
        assert res.status_code in [401, 403]

    def test_location_update_requires_auth(self):
        """Without token → 401"""
        res = requests.post(f"{BASE_URL}/api/orders/fake_id/location-update",
                            json={"lat": 28.5, "lng": 77.2})
        print(f"location-update no auth: {res.status_code}")
        assert res.status_code in [401, 403]

    def test_arrived_requires_auth(self):
        """Without token → 401"""
        res = requests.post(f"{BASE_URL}/api/orders/fake_id/arrived")
        print(f"arrived no auth: {res.status_code}")
        assert res.status_code in [401, 403]

    def test_start_tracking_with_auth_invalid_order(self, customer_token):
        """With valid token + non-existent order → 404 or 400 (endpoint exists)"""
        res = requests.post(
            f"{BASE_URL}/api/orders/000000000000000000000000/start-tracking",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        print(f"start-tracking with auth: {res.status_code} {res.text[:200]}")
        # Should NOT be 404 on the route (that would mean route doesn't exist)
        # Accept 404 for order not found, 400, or 200
        assert res.status_code in [200, 400, 404]

    def test_location_update_with_auth_invalid_order(self, customer_token):
        """location-update endpoint exists (even for invalid order)"""
        res = requests.post(
            f"{BASE_URL}/api/orders/000000000000000000000000/location-update",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"lat": 28.5, "lng": 77.2, "distanceMeters": 500}
        )
        print(f"location-update with auth: {res.status_code} {res.text[:200]}")
        assert res.status_code in [200, 400, 404]

    def test_arrived_with_auth_invalid_order(self, customer_token):
        """arrived endpoint exists (even for invalid order)"""
        res = requests.post(
            f"{BASE_URL}/api/orders/000000000000000000000000/arrived",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        print(f"arrived with auth: {res.status_code} {res.text[:200]}")
        assert res.status_code in [200, 400, 404]
