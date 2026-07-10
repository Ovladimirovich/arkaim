import time

import httpx

from core.config import settings
from core.logging import log
from core.retry import with_retry
from core.providers.base import BaseProvider
from aethon.xray import Event, emit, EventKind, ComponentKind, Severity, start_span, SpanKind, provider_latency

_BASE_URL = "https://api-inference.huggingface.co/models"


class HuggingFaceProvider(BaseProvider):
    def __init__(self):
        self.model = settings.HF_MODEL
        self.base_url = f"{_BASE_URL}/{self.model}"
        self._client = httpx.AsyncClient(timeout=120)
        self._headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}", "Content-Type": "application/json"}

    def _build_payload(self, messages: list[dict]) -> dict:
        prompt = ""
        for m in messages:
            role, content = m["role"], m["content"]
            if role == "system":
                prompt += f"<|system|>\n{content}\n"
            elif role == "user":
                prompt += f"<|user|>\n{content}\n"
            elif role == "assistant":
                prompt += f"<|assistant|>\n{content}\n"
        prompt += "<|assistant|>\n"
        return {"inputs": prompt, "parameters": {"max_new_tokens": 1024, "temperature": 0.7, "do_sample": True}}

    async def chat(self, messages, context=None, trace_id="", xray_headers=None):
        headers = dict(self._headers)
        if xray_headers:
            headers.update(xray_headers)
        payload = self._build_payload(messages)
        t0 = time.time()
        span = start_span(SpanKind.PROVIDER_CALL, "huggingface.chat", trace_id=trace_id)

        async def _do():
            r = await self._client.post(self.base_url, json=payload, headers=headers)
            r.raise_for_status()
            return r.json()

        try:
            data = await with_retry(_do, context="huggingface.chat", trace_id=trace_id)
        except Exception:
            span.end("error")
            latency = time.time() - t0
            provider_latency.observe(latency * 1000)
            emit(Event(time.time(), trace_id, ComponentKind.PROVIDER, EventKind.PROVIDER_FAILED, Severity.ERROR, "huggingface failed", {"latency_ms": latency * 1000}))
            log.error("provider_failed provider=huggingface latency=%.2fs trace_id=%s", time.time() - t0, trace_id)
            raise
        latency = time.time() - t0
        span.end()
        provider_latency.observe(latency * 1000)
        log.info("provider_ok provider=huggingface latency=%.2fs trace_id=%s", latency, trace_id)
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("generated_text", "")
        return str(data)

    async def stream(self, messages, trace_id=""):
        raise NotImplementedError("HuggingFace streaming not supported")

    async def health(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(self.base_url, headers=self._headers)
                r.raise_for_status()
                return {"status": "ok", "provider": "huggingface"}
        except Exception as exc:
            return {"status": "error", "provider": "huggingface", "error": str(exc)}

    async def close(self):
        await self._client.aclose()
