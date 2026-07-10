"""Gateway runtime behavior tests: proxy resilience, circuit breaker, degraded responses."""

import json

import pytest


def _http_response(status: int, body: dict | None = None) -> bytes:
    body_bytes = json.dumps(body or {}).encode()
    return (
        f"HTTP/1.1 {status} {'OK' if status < 400 else 'Error'}\r\n"
        f"Content-Type: application/json\r\n"
        f"Content-Length: {len(body_bytes)}\r\n"
        f"Connection: close\r\n"
        f"\r\n"
    ).encode() + body_bytes


class _MockStream:
    def __init__(self, responses: list[bytes] | None = None, exception: Exception | None = None):
        self._responses = responses or []
        self._exception = exception
        self._idx = 0

    async def read(self, n: int = 4096):
        if self._exception:
            raise self._exception
        if self._idx >= len(self._responses):
            return b""
        chunk = self._responses[self._idx][:n]
        self._responses[self._idx] = self._responses[self._idx][n:]
        if not self._responses[self._idx]:
            self._idx += 1
        return chunk

    def write(self, data: bytes):
        pass

    async def drain(self):
        pass

    def close(self):
        pass

    def __await__(self):
        async def _():
            return (self, self)
        return _().__await__()


@pytest.fixture(autouse=True)
def reset_circuit():
    from gateway import proxy
    proxy._CORE_FAILURES = 0
    proxy._CORE_BLOCKED_UNTIL = 0.0


def _mock_tcp(mocker, *, response: bytes | None = None, exception: Exception | None = None, responses: list[bytes] | None = None):
    """Mock asyncio.open_connection for proxy tests.

    When responses list is given, each call returns the next response.
    """
    if responses:
        streams = [_MockStream(responses=[r]) for r in responses]
        side_effect = [(s, s) for s in streams]
        mocker.patch("asyncio.open_connection", side_effect=side_effect)
    elif response:
        stream = _MockStream(responses=[response])
        mocker.patch("asyncio.open_connection", return_value=(stream, stream))
    else:
        stream = _MockStream(exception=exception or Exception("mock_error"))
        mocker.patch("asyncio.open_connection", return_value=(stream, stream))


class TestProxyChat:

    @pytest.mark.asyncio
    async def test_proxy_chat_success(self, mocker):
        resp = _http_response(200, {"id": "abc", "choices": []})
        _mock_tcp(mocker, response=resp)

        from gateway.proxy import proxy_chat
        result = await proxy_chat({"messages": []}, trace_id="t1")
        assert result["id"] == "abc"

    @pytest.mark.asyncio
    async def test_proxy_chat_unavailable_core(self, mocker):
        _mock_tcp(mocker, exception=ConnectionRefusedError("core down"))

        from gateway.proxy import proxy_chat
        result = await proxy_chat({"messages": []}, trace_id="t1")
        assert result["error"] == "core_unavailable"
        assert result["trace_id"] == "t1"

    @pytest.mark.asyncio
    async def test_proxy_chat_circuit_open_blocks(self, mocker):
        from gateway.proxy import proxy_chat
        with mocker.patch("gateway.proxy._circuit_open", return_value=True):
            result = await proxy_chat({"messages": []}, trace_id="t1")
        assert result["error"] == "core_unavailable"

    @pytest.mark.asyncio
    async def test_proxy_chat_retry_then_succeed(self, mocker):
        fail = _http_response(500, {})
        ok = _http_response(200, {"id": "abc", "choices": []})
        _mock_tcp(mocker, responses=[fail, fail, ok])

        from gateway.proxy import proxy_chat
        result = await proxy_chat({"messages": []}, trace_id="t1")
        assert result["id"] == "abc"

    @pytest.mark.asyncio
    async def test_proxy_chat_retry_exhausted(self, mocker):
        _mock_tcp(mocker, exception=ConnectionRefusedError("still down"))

        import gateway.proxy
        result = await gateway.proxy.proxy_chat({"messages": []}, trace_id="t1")
        assert result["error"] == "core_unavailable"
        assert gateway.proxy._CORE_FAILURES >= 1

    @pytest.mark.asyncio
    async def test_proxy_chat_client_error_no_retry(self, mocker):
        resp = _http_response(400, {"error": "bad request"})
        _mock_tcp(mocker, response=resp)

        from gateway.proxy import proxy_chat
        result = await proxy_chat({"messages": []}, trace_id="t1")
        assert "core_error_400" in result["error"]


class TestProxyStream:

    @pytest.mark.asyncio
    async def test_proxy_stream_success(self, mocker):
        body = (
            'data: {"choices":[{"delta":{"content":"hello"}}]}\n'
            'data: {"choices":[{"delta":{"content":" world"}}]}\n'
        )
        resp = (
            b"HTTP/1.1 200 OK\r\n"
            b"Content-Type: text/event-stream\r\n"
            b"Content-Length: " + str(len(body.encode())).encode() + b"\r\n"
            b"\r\n"
            + body.encode()
        )
        _mock_tcp(mocker, response=resp)

        from gateway.proxy import proxy_stream
        tokens = [t async for t in proxy_stream({"messages": []}, trace_id="t1")]
        assert any("hello" in t for t in tokens)
        assert any("[DONE]" in t for t in tokens)

    @pytest.mark.asyncio
    async def test_proxy_stream_circuit_open(self, mocker):
        from gateway.proxy import proxy_stream
        with mocker.patch("gateway.proxy._circuit_open", return_value=True):
            tokens = [t async for t in proxy_stream({"messages": []}, trace_id="t1")]
        full = "".join(tokens)
        assert "core_unavailable" in full
        assert "[DONE]" in full


class TestProxyHealth:

    @pytest.mark.asyncio
    async def test_health_ok(self, mocker):
        resp = _http_response(200, {"status": "ok", "core": True})
        _mock_tcp(mocker, response=resp)

        from gateway.proxy import proxy_health
        result = await proxy_health()
        assert result["status"] == "ok"
        assert result["core"] is True

    @pytest.mark.asyncio
    async def test_health_unreachable(self, mocker):
        _mock_tcp(mocker, exception=ConnectionRefusedError("no core"))

        from gateway.proxy import proxy_health
        result = await proxy_health()
        assert result["status"] == "degraded"
        assert result["core"] is False
