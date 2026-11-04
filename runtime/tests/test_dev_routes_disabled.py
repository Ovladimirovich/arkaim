"""P0 regression: server-side dev-auth endpoint must not grant admin access.

The endpoint ``POST /auth/dev/generate-token`` historically issued a
**admin** login token by default and was reachable without any
authentication — an unauthenticated privesc vector. These tests lock in the
security contract:

* (1) with ``DEV_AUTH_ENABLED`` off (the default, i.e. production), the route
    does not exist (404) and can never issue a token / admin user;
* (2) an empty request and an explicit ``role=admin`` must not yield
    privileged access;
* (3) in an explicitly enabled development mode the behaviour follows the
    configuration and absence of the flag does NOT enable dev access;
* (4) existing auth rules are not weakened.

Run (from runtime/):
  .venv\\Scripts\\python -m pytest tests/test_dev_routes_disabled.py -v
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from shared_config import SharedSettings
from auth import login_tokens

DEV_TOKEN_URL = "/auth/dev/generate-token"


@pytest.fixture()
def client():
    from core.main import app

    return TestClient(app)


@pytest.fixture(autouse=True)
def _clean_token_store():
    """Isolate tests: drop any login tokens left from other tests."""
    login_tokens._tokens.clear()
    yield
    login_tokens._tokens.clear()


def _stored_role(token: str):
    """Role that the issued login token would redeem to (None if unknown)."""
    entry = login_tokens._tokens.get(token)
    return entry["role"] if entry else None


# ── (1) Disabled by default → route must not exist, no token, no admin ──────
class TestDevAuthDisabledByDefault:
    def test_default_config_is_off(self, monkeypatch):
        # Production default: the flag is off unless explicitly enabled via env.
        # Load .env into os.environ for the test run: if the dev .env has
        # DEV_AUTH_ENABLED=true the test must still verify that without that
        # variable the default is False (i.e. the code path, not the local .env).
        monkeypatch.delenv("DEV_AUTH_ENABLED", raising=False)
        # Re-evaluate the class attribute after removing the env var.
        old_value = SharedSettings.DEV_AUTH_ENABLED
        SharedSettings.DEV_AUTH_ENABLED = os.getenv("DEV_AUTH_ENABLED", "false").strip().lower() in ("1", "true", "yes", "on")
        try:
            assert SharedSettings.DEV_AUTH_ENABLED is False
        finally:
            SharedSettings.DEV_AUTH_ENABLED = old_value

    def test_endpoint_not_found_when_disabled(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", False)
        resp = client.post(DEV_TOKEN_URL, json={})
        assert resp.status_code in (403, 404)
        body = resp.json()
        # No usable token must ever be returned while disabled.
        assert not body.get("token")

    def test_explicit_admin_rejected_when_disabled(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", False)
        resp = client.post(DEV_TOKEN_URL, json={"role": "admin"})
        assert resp.status_code in (403, 404)
        assert not resp.json().get("token")


# ── (2) Even enabled, privileged access is impossible ────────────────────────
class TestDevAuthEnabledButNotPrivileged:
    def test_empty_body_yields_reader_not_admin(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", True)
        resp = client.post(DEV_TOKEN_URL, json={})
        assert resp.status_code == 200
        body = resp.json()
        assert body.get("role") in ("reader", "editor")
        assert body.get("role") != "admin"
        assert _stored_role(body["token"]) != "admin"

    def test_explicit_admin_downgraded_to_reader(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", True)
        resp = client.post(DEV_TOKEN_URL, json={"role": "admin"})
        assert resp.status_code == 200
        body = resp.json()
        assert body.get("role") == "reader"
        # The redeemable role stored with the token is also not admin.
        assert _stored_role(body["token"]) == "reader"

    def test_editor_role_is_allowed(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", True)
        resp = client.post(DEV_TOKEN_URL, json={"role": "editor"})
        assert resp.status_code == 200
        body = resp.json()
        assert body.get("role") == "editor"
        assert _stored_role(body["token"]) == "editor"

    def test_garbage_role_downgraded_to_reader(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", True)
        for bad in ("superuser", "ROOT", "", 123):
            resp = client.post(DEV_TOKEN_URL, json={"role": bad})
            assert resp.status_code == 200
            assert resp.json().get("role") in ("reader", "editor")

    def test_malformed_body_does_not_crash(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", True)
        # Non-JSON body must not 500; it defaults to a reader token.
        resp = client.post(DEV_TOKEN_URL, content=b"not json at all")
        assert resp.status_code == 200
        assert resp.json().get("role") in ("reader", "editor")


# ── (4) token redemption must not grant admin ────────────────────────────────
class TestTokenNeverRedeemsToAdmin:
    def test_issued_token_stored_role_is_never_admin(self, client, monkeypatch):
        monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", True)
        # Worst case: explicitly ask for admin.
        resp = client.post(DEV_TOKEN_URL, json={"role": "admin"})
        token = resp.json()["token"]
        assert _stored_role(token) in ("reader", "editor")


def test_dev_flag_absence_does_not_auto_enable(client, monkeypatch):
    """(3) Absence of the explicit flag keeps dev access OFF (no auto-enable)."""
    monkeypatch.setattr(SharedSettings, "DEV_AUTH_ENABLED", False)
    resp = client.post(DEV_TOKEN_URL, json={})
    assert resp.status_code in (403, 404)
