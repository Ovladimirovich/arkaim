"""Telegram adapter stability: thin layer, no forbidden knowledge, error handling."""

import asyncio
import json

import httpx
import pytest

from integrations.telegram.adapter import TelegramAdapter, _exponential_backoff
from integrations.telegram.config import TelegramConfig
from integrations.telegram.normalize import normalize_update
from integrations.telegram.formatter import split_message


# ─── Normalize ──────────────────────────────────────────


class TestNormalize:
    """Normalize MUST produce correct NormalizedRequest from Telegram update."""

    def _update(self, text="hello", chat_id=123, user_id=456, update_id=1):
        return {
            "update_id": update_id,
            "message": {
                "message_id": 10,
                "from": {"id": user_id, "is_bot": False, "first_name": "Test"},
                "chat": {"id": chat_id, "type": "private"},
                "text": text,
            },
        }

    def test_basic_message(self):
        upd = self._update("hello", chat_id=999, user_id=888)
        result = normalize_update(upd)
        assert result is not None
        assert result["messages"] == [{"role": "user", "content": "hello"}]
        assert result["session_id"] == "tg:999"
        assert result["provider"] == ""
        assert result["metadata"]["user_id"] == "tg:888"
        assert result["metadata"]["chat_id"] == 999
        assert result["metadata"]["client_type"] == "telegram"

    def test_callback_query(self):
        upd = {
            "update_id": 5,
            "callback_query": {
                "id": "cb1",
                "from": {"id": 777, "is_bot": False},
                "message": {
                    "message_id": 20,
                    "chat": {"id": 333, "type": "private"},
                    "text": "original",
                },
                "data": "button_pressed",
            },
        }
        result = normalize_update(upd)
        assert result is not None
        assert result["messages"] == [{"role": "user", "content": "original"}]
        assert result["session_id"] == "tg:333"

    def test_empty_message_returns_none(self):
        upd = self._update(text="", chat_id=1, user_id=2)
        result = normalize_update(upd)
        assert result is None

    def test_no_message_returns_none(self):
        result = normalize_update({"update_id": 0})
        assert result is None


# ─── Formatter ──────────────────────────────────────────


class TestFormatter:
    def test_short_message_stays_one_chunk(self):
        assert split_message("hello") == ["hello"]

    def test_long_message_splits(self):
        text = "a" * 5000
        chunks = split_message(text)
        assert all(len(c) <= 4096 for c in chunks)
        assert "".join(chunks) == text

    def test_splits_at_newline_when_possible(self):
        text = "a" * 4000 + "\n" + "b" * 200
        chunks = split_message(text)
        assert len(chunks) == 2
        assert chunks[0] == "a" * 4000
        assert chunks[1] == "b" * 200

    def test_splits_at_space_when_no_newline(self):
        text = "a" * 4000 + " " + "b" * 200
        chunks = split_message(text)
        assert len(chunks) == 2
        assert "b" * 200 in chunks[1]


# ─── Forwarding ─────────────────────────────────────────


class _MockStream:
    """Simulate asyncio.StreamReader/StreamWriter pair with pre-built HTTP response."""

    def __init__(self, http_response: bytes):
        self._data = http_response
        self._pos = 0

    async def read(self, n: int = -1):
        if self._pos >= len(self._data):
            return b""
        chunk = self._data[self._pos:self._pos + n]
        self._pos += len(chunk)
        return chunk

    def write(self, data: bytes):
        pass

    async def drain(self):
        pass

    def close(self):
        pass


def _make_http_response(status: int, body: dict) -> bytes:
    body_bytes = json.dumps(body).encode()
    return (
        f"HTTP/1.1 {status} {'OK' if status < 400 else 'Error'}\r\n"
        f"Content-Type: application/json\r\n"
        f"Content-Length: {len(body_bytes)}\r\n"
        f"\r\n"
    ).encode() + body_bytes


class TestTelegramForwarding:
    """Forward to Gateway — no provider/core knowledge, proper error handling."""

    def make_config(self):
        return TelegramConfig()

    @pytest.mark.asyncio
    async def test_forward_payload_structure(self, mocker):
        adapter = TelegramAdapter(self.make_config())
        payload = {
            "messages": [{"role": "user", "content": "hi"}],
            "session_id": "tg:1",
            "provider": "",
            "metadata": {"client_type": "telegram"},
        }
        http_resp = _make_http_response(200, {"choices": [{"message": {"content": "Hello!"}}]})
        stream = _MockStream(http_resp)
        mocker.patch("asyncio.open_connection", return_value=(stream, stream))
        result = await adapter._forward_to_gateway(payload)
        assert result == "Hello!"

    @pytest.mark.asyncio
    async def test_forward_gateway_error_in_body(self, mocker):
        adapter = TelegramAdapter(self.make_config())
        http_resp = _make_http_response(200, {"error": "Provider unavailable"})
        stream = _MockStream(http_resp)
        mocker.patch("asyncio.open_connection", return_value=(stream, stream))
        result = await adapter._forward_to_gateway({"messages": []})
        assert "Provider unavailable" in result
        assert result.startswith("\u26a0")

    @pytest.mark.asyncio
    async def test_forward_http_error_raises(self, mocker):
        adapter = TelegramAdapter(self.make_config())
        http_resp = _make_http_response(502, {"error": "bad gateway"})
        stream = _MockStream(http_resp)
        mocker.patch("asyncio.open_connection", return_value=(stream, stream))
        result = await adapter._forward_to_gateway({"messages": []})
        assert "502" in result

    @pytest.mark.asyncio
    async def test_forward_network_error(self, mocker):
        adapter = TelegramAdapter(self.make_config())
        mocker.patch("asyncio.open_connection", side_effect=ConnectionRefusedError("Connection refused"))
        result = await adapter._forward_to_gateway({"messages": []})
        assert "недоступен" in result


# ─── Forbidden knowledge ────────────────────────────────


class TestTelegramForbiddenKnowledge:
    """Adapter MUST NOT import or reference core/providers/skills/memory."""

    _FORBIDDEN_MODULES = {"core", "skills", "memory"}

    def test_adapter_module_no_forbidden_imports(self):
        import importlib
        import sys
        for m in list(sys.modules):
            if any(m.startswith(p) for p in ("gateway", "core", "memory", "observability", "integrations", "skills", "contracts", "cli")):
                del sys.modules[m]
        importlib.invalidate_caches()
        importlib.import_module("integrations.telegram.adapter")
        for m in sys.modules:
            for f in self._FORBIDDEN_MODULES:
                assert not m.startswith(f), f"adapter imports forbidden module: {m}"

    def test_normalize_module_no_forbidden_imports(self):
        import importlib
        import sys
        for m in list(sys.modules):
            if any(m.startswith(p) for p in ("gateway", "core", "memory", "observability", "integrations" if "telegram.normalize" not in m else "", "skills", "contracts", "cli")):
                del sys.modules[m]
        importlib.invalidate_caches()
        importlib.import_module("integrations.telegram.normalize")
        for m in sys.modules:
            for f in self._FORBIDDEN_MODULES:
                assert not m.startswith(f), f"normalize imports forbidden module: {m}"

    def test_formatter_module_no_forbidden_imports(self):
        import importlib
        import sys
        for m in list(sys.modules):
            if any(m.startswith(p) for p in ("gateway", "core", "memory", "observability", "integrations", "skills", "contracts", "cli")):
                del sys.modules[m]
        importlib.invalidate_caches()
        importlib.import_module("integrations.telegram.formatter")
        for m in sys.modules:
            for f in self._FORBIDDEN_MODULES:
                assert not m.startswith(f), f"formatter imports forbidden module: {m}"

    def test_transport_module_no_forbidden_imports(self):
        import importlib
        import sys
        for m in list(sys.modules):
            if any(m.startswith(p) for p in ("gateway", "core", "memory", "observability", "integrations", "skills", "contracts", "cli")):
                del sys.modules[m]
        importlib.invalidate_caches()
        importlib.import_module("integrations.telegram.transport")
        for m in sys.modules:
            for f in self._FORBIDDEN_MODULES:
                assert not m.startswith(f), f"transport imports forbidden module: {m}"

    def test_adapter_source_has_no_provider_names(self):
        import ast
        import pathlib
        source = (pathlib.Path(__file__).resolve().parent.parent / "integrations" / "telegram" / "adapter.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        strings = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                strings.append(node.value)
        forbidden = ["orchestrator", "skill_registry", "memory_store"]
        for s in strings:
            lower = s.lower()
            for f in forbidden:
                assert f not in lower, f"adapter contains forbidden string '{f}' in: {s!r}"


class TestTelegramConfig:
    """Config is minimal — transport settings only."""

    def test_config_has_only_transport_settings(self):
        import ast
        import pathlib
        source = (pathlib.Path(__file__).resolve().parent.parent / "integrations" / "telegram" / "config.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        class_body = next(
            (node.body for node in ast.walk(tree)
             if isinstance(node, ast.ClassDef) and node.name == "TelegramConfig"),
            [],
        )
        keys = []
        for stmt in class_body:
            if isinstance(stmt, ast.Assign):
                for t in stmt.targets:
                    if isinstance(t, ast.Name):
                        keys.append(t.id)
        expected = {"BOT_TOKEN", "GATEWAY_URL", "GATEWAY_API_KEY", "TELEGRAM_PROXY", "POLL_INTERVAL", "MAX_RETRIES", "RETRY_BASE_DELAY", "RETRY_MAX_DELAY", "DEFAULT_PROVIDER"}
        assert set(keys) == expected, f"unexpected config keys: {set(keys) - expected}"


# ─── Backoff ────────────────────────────────────────────


class TestTelegramBackoff:
    def test_attempt_zero_is_base(self):
        assert _exponential_backoff(0) == 2.0

    def test_attempt_one_doubles(self):
        assert _exponential_backoff(1) == 4.0

    def test_attempt_two_doubles_again(self):
        assert _exponential_backoff(2) == 8.0

    def test_respects_max_delay(self):
        assert _exponential_backoff(10, base=2.0, max_delay=30.0) == 30.0

    def test_custom_base(self):
        assert _exponential_backoff(0, base=5.0) == 5.0
        assert _exponential_backoff(1, base=5.0) == 10.0


# ─── Graceful shutdown ──────────────────────────────────


class TestTelegramGracefulShutdown:
    """CancelledError stops poll loop cleanly."""

    def make_config(self):
        return TelegramConfig()

    @pytest.mark.asyncio
    async def test_cancelled_error_stops_run(self, mocker):
        adapter = TelegramAdapter(self.make_config())
        mocker.patch.object(adapter._transport, "get_updates", side_effect=asyncio.CancelledError)
        mocker.patch.object(adapter._transport, "close", mocker.AsyncMock())
        await adapter.run()
        assert adapter._running is False

    @pytest.mark.asyncio
    async def test_close_sets_running_false(self, mocker):
        adapter = TelegramAdapter(self.make_config())
        mocker.patch.object(adapter._transport, "close", mocker.AsyncMock())
        adapter._running = True
        await adapter.close()
        assert adapter._running is False


# ─── Polling resilience ─────────────────────────────────


class TestTelegramPollingResilience:
    """Poll loop survives network errors with backoff."""

    def make_config(self):
        return TelegramConfig()

    @pytest.mark.asyncio
    async def test_request_error_retries_with_backoff(self, mocker):
        adapter = TelegramAdapter(self.make_config())
        mocker.patch.object(adapter._transport, "get_updates", side_effect=httpx.ConnectError("timeout"))
        mocker.patch.object(adapter._transport, "close", mocker.AsyncMock())
        mocker.patch("asyncio.sleep", mocker.AsyncMock())
        adapter._running = True
        task = asyncio.create_task(adapter.run())
        await asyncio.sleep(0.05)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
