"""
Groveno Fresh - Referral System + SSE Streams tests (iteration 2)
Tests against public REACT_APP_BACKEND_URL.
"""
import os
import re
import time
import json
import threading
import pytest
import requests

def _load_base_url():
    env_path = "/app/frontend/.env"
    with open(env_path) as f:
        for line in f:
            if line.strip().startswith("REACT_APP_BACKEND_URL"):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_base_url()
API = f"{BASE_URL}/api"


def _new_customer(session, phone):
    r = session.post(f"{API}/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    r = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert r.status_code == 200, r.text
    j = r.json()
    return j["token"], j["user"]["_id"]


def _admin_login(session):
    r = session.post(f"{API}/admin/auth/login", json={"email": "admin@groveno.com", "password": "Admin@123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    return _admin_login(s)


# ============ REFERRAL SYSTEM ============
class TestReferralBasics:
    STATE = {}

    def test_get_my_referral_code(self, s):
        # A: new user - generates code on GET /referral/me
        phone_a = f"+9199001{int(time.time()) % 100000:05d}"
        token_a, uid_a = _new_customer(s, phone_a)
        TestReferralBasics.STATE["token_a"] = token_a
        TestReferralBasics.STATE["uid_a"] = uid_a
        TestReferralBasics.STATE["phone_a"] = phone_a

        r = s.get(f"{API}/referral/me", headers={"Authorization": f"Bearer {token_a}"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["success"] is True
        assert re.match(r"^GRV[A-Z0-9]{4}$", j["referralCode"]), f"bad code: {j['referralCode']}"
        assert "shareUrl" in j and j["shareUrl"]
        assert j["referralCoinsPerFriend"] == 10
        assert "stats" in j and "referredFriends" in j["stats"]
        TestReferralBasics.STATE["code_a"] = j["referralCode"]

    def test_referral_code_stable_on_second_call(self, s):
        token = TestReferralBasics.STATE["token_a"]
        r = s.get(f"{API}/referral/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["referralCode"] == TestReferralBasics.STATE["code_a"]

    def test_apply_missing_code(self, s):
        token = TestReferralBasics.STATE["token_a"]
        r = s.post(f"{API}/referral/apply", headers={"Authorization": f"Bearer {token}"}, json={})
        assert r.status_code == 400

    def test_cannot_apply_own_code(self, s):
        token = TestReferralBasics.STATE["token_a"]
        code = TestReferralBasics.STATE["code_a"]
        r = s.post(f"{API}/referral/apply", headers={"Authorization": f"Bearer {token}"},
                   json={"referralCode": code})
        assert r.status_code == 400, r.text
        assert "own" in r.json().get("message", "").lower()

    def test_invalid_code_rejected(self, s):
        # B: another new user
        phone_b = f"+9199002{int(time.time()) % 100000:05d}"
        token_b, uid_b = _new_customer(s, phone_b)
        TestReferralBasics.STATE["token_b"] = token_b
        TestReferralBasics.STATE["uid_b"] = uid_b

        r = s.post(f"{API}/referral/apply", headers={"Authorization": f"Bearer {token_b}"},
                   json={"referralCode": "GRVXXXX"})
        assert r.status_code == 400
        assert "invalid" in r.json().get("message", "").lower()

    def test_apply_valid_code(self, s):
        token_b = TestReferralBasics.STATE["token_b"]
        code_a = TestReferralBasics.STATE["code_a"]
        r = s.post(f"{API}/referral/apply", headers={"Authorization": f"Bearer {token_b}"},
                   json={"referralCode": code_a})
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True

    def test_cannot_apply_twice(self, s):
        token_b = TestReferralBasics.STATE["token_b"]
        code_a = TestReferralBasics.STATE["code_a"]
        r = s.post(f"{API}/referral/apply", headers={"Authorization": f"Bearer {token_b}"},
                   json={"referralCode": code_a})
        assert r.status_code == 400

    def test_referrer_stats_updated(self, s, admin_token):
        # Verify referrer sees +1 friend
        token_a = TestReferralBasics.STATE["token_a"]
        r = s.get(f"{API}/referral/me", headers={"Authorization": f"Bearer {token_a}"})
        assert r.status_code == 200
        j = r.json()
        assert j["stats"]["referredFriends"] >= 1


class TestReferralRewardFlow:
    """B places first order → A gets 10 coins. B places 2nd → A NOT credited again."""

    def _get_baseline_coins(self, s, admin_token, user_id):
        r = s.get(f"{API}/admin/users/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, r.text
        j = r.json()
        # Response could be { user: {...}, ... } or with wallet
        user = j.get("user") or j
        return user.get("coins", 0)

    def _place_home_order(self, s, token, product_id):
        payload = {
            "items": [{"productId": product_id, "quantity": 1}],
            "address": {"line1": "Ref St", "city": "Bangalore", "pincode": "560001"},
            "paymentMethod": "cod",
        }
        r = s.post(f"{API}/orders/home-delivery",
                   headers={"Authorization": f"Bearer {token}"}, json=payload)
        assert r.status_code == 201, r.text
        return r.json()["order"]

    def test_reward_flow_end_to_end(self, s, admin_token):
        # Fresh referrer A and referred B (to ensure firstOrderPlaced flag is clean)
        ts = int(time.time())
        phone_a = f"+9199010{ts % 100000:05d}"
        phone_b = f"+9199011{ts % 100000:05d}"

        token_a, uid_a = _new_customer(s, phone_a)
        token_b, uid_b = _new_customer(s, phone_b)

        # Get A referral code
        r = s.get(f"{API}/referral/me", headers={"Authorization": f"Bearer {token_a}"})
        code_a = r.json()["referralCode"]

        # B applies A's code
        r = s.post(f"{API}/referral/apply", headers={"Authorization": f"Bearer {token_b}"},
                   json={"referralCode": code_a})
        assert r.status_code == 200, r.text

        # Baseline coins for A
        coins_before = self._get_baseline_coins(s, admin_token, uid_a)

        # Pick a product
        prods = s.get(f"{API}/products").json()["products"]
        pid = prods[0]["_id"]

        # B places first order
        order1 = self._place_home_order(s, token_b, pid)
        # small delay for async credit (though it's awaited in-line)
        time.sleep(0.5)

        coins_after1 = self._get_baseline_coins(s, admin_token, uid_a)
        assert coins_after1 == coins_before + 10, (
            f"Expected +10 coins for referrer A. before={coins_before} after={coins_after1}"
        )

        # Referral stats should reflect reward
        r = s.get(f"{API}/referral/me", headers={"Authorization": f"Bearer {token_a}"})
        j = r.json()
        assert j["stats"]["rewardsGiven"] >= 1
        assert j["stats"]["coinsEarned"] >= 10

        # CoinTransaction with source='referral' and expiresAt ~90 days
        r = s.get(f"{API}/coins/history", headers={"Authorization": f"Bearer {token_a}"})
        assert r.status_code == 200
        history = r.json().get("transactions") or r.json().get("history") or r.json().get("coinTransactions") or []
        ref_txn = [t for t in history if t.get("source") == "referral"]
        assert len(ref_txn) >= 1, f"No referral CoinTransaction found. history: {history}"
        txn = ref_txn[0]
        assert txn.get("amount") == 10
        assert txn.get("type") == "earn"
        exp = txn.get("expiresAt")
        assert exp, "expiresAt missing on referral CoinTransaction"
        # Parse and check ~90 days from now
        from datetime import datetime, timezone
        exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        delta_days = (exp_dt - datetime.now(timezone.utc)).days
        assert 85 <= delta_days <= 92, f"expiresAt not ~90 days out (got {delta_days})"

        # B places second order
        order2 = self._place_home_order(s, token_b, pid)
        time.sleep(0.5)

        coins_after2 = self._get_baseline_coins(s, admin_token, uid_a)
        assert coins_after2 == coins_after1, (
            f"Referrer credited again on 2nd order! before2={coins_after1} after2={coins_after2}"
        )

    def test_cannot_apply_after_first_order(self, s):
        # New B places order first, then tries to apply -> reject
        ts = int(time.time()) + 1
        phone_a = f"+9199020{ts % 100000:05d}"
        phone_b = f"+9199021{ts % 100000:05d}"
        token_a, _ = _new_customer(s, phone_a)
        token_b, _ = _new_customer(s, phone_b)

        r = s.get(f"{API}/referral/me", headers={"Authorization": f"Bearer {token_a}"})
        code_a = r.json()["referralCode"]

        prods = s.get(f"{API}/products").json()["products"]
        pid = prods[0]["_id"]
        p = {
            "items": [{"productId": pid, "quantity": 1}],
            "address": {"line1": "X", "city": "Blr", "pincode": "560001"},
            "paymentMethod": "cod",
        }
        r = s.post(f"{API}/orders/home-delivery",
                   headers={"Authorization": f"Bearer {token_b}"}, json=p)
        assert r.status_code == 201

        # Now try applying referral
        r = s.post(f"{API}/referral/apply",
                   headers={"Authorization": f"Bearer {token_b}"},
                   json={"referralCode": code_a})
        assert r.status_code == 400
        assert "first order" in r.json().get("message", "").lower()


# ============ SSE STREAMS ============
def _read_sse_events(url, timeout=6, max_events=5):
    """Consume the SSE stream; return list of (event, data) parsed."""
    events = []
    ct = ""
    status = None
    try:
        with requests.get(url, stream=True, timeout=(5, timeout)) as r:
            status = r.status_code
            if r.status_code != 200:
                return {"status": r.status_code, "content_type": r.headers.get("Content-Type", ""), "events": []}
            ct = r.headers.get("Content-Type", "")
            cur_event = None
            data_buf = []
            deadline = time.time() + timeout
            try:
                for line in r.iter_lines(decode_unicode=True):
                    if time.time() > deadline:
                        break
                    if line is None:
                        continue
                    if line == "":
                        if cur_event and data_buf:
                            try:
                                payload = json.loads("\n".join(data_buf))
                            except Exception:
                                payload = "\n".join(data_buf)
                            events.append((cur_event, payload))
                            if len(events) >= max_events:
                                break
                        cur_event = None
                        data_buf = []
                        continue
                    if line.startswith(":"):
                        continue
                    if line.startswith("event:"):
                        cur_event = line[6:].strip()
                    elif line.startswith("data:"):
                        data_buf.append(line[5:].lstrip())
            except (requests.exceptions.ReadTimeout,
                    requests.exceptions.ConnectionError,
                    Exception):
                pass  # Timeout / disconnect is expected; return what we captured
    except Exception:
        pass
    return {"status": status or 200, "content_type": ct or "text/event-stream", "events": events}


class TestSSEUnauthorized:
    def test_customer_stream_no_token(self, s):
        r = s.get(f"{API}/stream/orders/000000000000000000000000/stream", timeout=5)
        assert r.status_code == 401, r.text

    def test_customer_stream_bad_token(self, s):
        r = s.get(f"{API}/stream/orders/000000000000000000000000/stream?token=bogus", timeout=5)
        assert r.status_code == 401

    def test_admin_stream_no_token(self, s):
        r = s.get(f"{API}/stream/admin/express-pickup/stream", timeout=5)
        assert r.status_code == 401

    def test_admin_stream_wrong_token(self, s):
        # Use admin URL with a customer JWT
        ts = int(time.time())
        phone = f"+9199030{ts % 100000:05d}"
        tok, _ = _new_customer(s, phone)
        r = s.get(f"{API}/stream/admin/express-pickup/stream?token={tok}", timeout=5)
        assert r.status_code == 401


class TestSSECustomerAndAdminEvents:
    def test_customer_order_stream_snapshot_and_location(self, s, admin_token):
        # Create fresh customer + express pickup order
        ts = int(time.time())
        phone = f"+9199040{ts % 100000:05d}"
        token, uid = _new_customer(s, phone)

        # Get pickup point
        pps = s.get(f"{API}/pickup-points").json()
        points = pps.get("pickupPoints") or pps.get("points") or []
        assert points, "No pickup points seeded"
        pp_id = points[0]["_id"]

        prods = s.get(f"{API}/products").json()["products"]
        pid = prods[0]["_id"]

        r = s.post(f"{API}/orders/express-pickup",
                   headers={"Authorization": f"Bearer {token}"},
                   json={
                       "items": [{"productId": pid, "quantity": 1}],
                       "pickupPointId": pp_id,
                       "pickupTime": "18:00",
                   })
        assert r.status_code == 201, r.text
        order_id = r.json()["order"]["_id"]

        # Open SSE customer stream in background
        url_c = f"{API}/stream/orders/{order_id}/stream?token={token}"
        url_a = f"{API}/stream/admin/express-pickup/stream?token={admin_token}"

        result_c = {}
        result_a = {}

        def _run_c():
            result_c.update(_read_sse_events(url_c, timeout=8, max_events=3))
        def _run_a():
            result_a.update(_read_sse_events(url_a, timeout=8, max_events=3))

        t_c = threading.Thread(target=_run_c, daemon=True)
        t_a = threading.Thread(target=_run_a, daemon=True)
        t_c.start()
        t_a.start()

        # Give the streams a moment to connect & receive snapshot
        time.sleep(2)

        # Trigger location update
        r = s.post(f"{API}/orders/{order_id}/location-update",
                   headers={"Authorization": f"Bearer {token}"},
                   json={"lat": 12.97, "lng": 77.59})
        assert r.status_code == 200, r.text

        t_c.join(timeout=10)
        t_a.join(timeout=10)

        # Assertions on customer stream
        assert result_c.get("status") == 200, f"customer stream status: {result_c}"
        assert "text/event-stream" in (result_c.get("content_type") or "")
        events_c = result_c.get("events", [])
        event_names_c = [e[0] for e in events_c]
        assert "snapshot" in event_names_c, f"No snapshot event on customer stream. Got: {event_names_c}"
        # snapshot payload should contain the order
        snap_c = next(p for (e, p) in events_c if e == "snapshot")
        assert isinstance(snap_c, dict) and snap_c.get("order", {}).get("_id") == order_id

        assert "location" in event_names_c, f"No location event on customer stream. Got: {event_names_c}"
        loc = next(p for (e, p) in events_c if e == "location")
        assert loc.get("orderId") == order_id
        assert "lat" in loc and "lng" in loc and "distanceToHub" in loc and "ts" in loc

        # Assertions on admin stream
        assert result_a.get("status") == 200, f"admin stream status: {result_a}"
        events_a = result_a.get("events", [])
        event_names_a = [e[0] for e in events_a]
        assert "snapshot" in event_names_a, f"No snapshot on admin stream. Got: {event_names_a}"
        snap_a = next(p for (e, p) in events_a if e == "snapshot")
        assert isinstance(snap_a, dict) and "orders" in snap_a
        assert "location" in event_names_a, f"No location event on admin stream. Got: {event_names_a}"
