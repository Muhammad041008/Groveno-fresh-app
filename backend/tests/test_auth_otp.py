"""Backend OTP auth endpoint tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://delivery-coins.preview.emergentagent.com').rstrip('/')
PHONE = '+919876543210'
OTP = '123456'

class TestOTPAuth:
    """OTP authentication flow tests"""

    def test_send_otp(self):
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": PHONE})
        print(f"send-otp status: {response.status_code}, body: {response.text[:200]}")
        assert response.status_code in [200, 201]

    def test_verify_otp_returns_token_and_user(self):
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={"phone": PHONE, "otp": OTP})
        print(f"verify-otp status: {response.status_code}, body: {response.text[:300]}")
        assert response.status_code in [200, 201]
        data = response.json()
        assert 'token' in data
        assert 'user' in data
        assert isinstance(data['token'], str)
        assert len(data['token']) > 0

    def test_get_me_with_token(self):
        # First get token
        res = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={"phone": PHONE, "otp": OTP})
        assert res.status_code in [200, 201], f"verify-otp failed: {res.text}"
        token = res.json()['token']

        # Now call /me
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        print(f"get-me status: {me_res.status_code}, body: {me_res.text[:300]}")
        assert me_res.status_code == 200
        data = me_res.json()
        user = data.get('user') or data
        assert 'phone' in user or '_id' in user
